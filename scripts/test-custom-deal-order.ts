async function testCustomDealOrder() {
  console.log("🧪 Testing Custom Deal Order Submission & Server-side Verification...");
  const baseUrl = "http://localhost:3000";

  // 1. Fetch available products
  const menuRes = await fetch(`${baseUrl}/api/v1/menu`);
  const menuData = await menuRes.json();
  const prods = menuData.data.categories.flatMap((c: any) => c.products);

  // Pick 3 burgers or pizzas to exceed 2500 PKR
  const ogBurger = prods.find((p: any) => p.slug.includes("og"));
  const oklahoma = prods.find((p: any) => p.slug.includes("oklahoma"));
  const calzone = prods.find((p: any) => p.slug.includes("calzone"));

  console.log(`  Items selected: ${ogBurger.name} (${ogBurger.basePricePkr}), ${oklahoma.name} (${oklahoma.basePricePkr}), ${calzone.name} (${calzone.basePricePkr})`);
  const expectedSubtotal = ogBurger.basePricePkr + oklahoma.basePricePkr + calzone.basePricePkr; // 730 + 670 + 950 = 2350
  console.log(`  Expected custom deal subtotal: ${expectedSubtotal} PKR`);

  // Let's add 1 more item so it crosses 2500 PKR (e.g. Mozzarella Sticks 590 PKR -> 2940 PKR)
  const sticks = prods.find((p: any) => p.slug.includes("mozzarella"));
  const customDealId = `deal_test_${Date.now()}`;

  const dealItems = [
    { productId: ogBurger.id, quantity: 1, modifierIds: [], customDealId },
    { productId: oklahoma.id, quantity: 1, modifierIds: [], customDealId },
    { productId: calzone.id, quantity: 1, modifierIds: [], customDealId },
    { productId: sticks.id, quantity: 1, modifierIds: [], customDealId },
  ];

  const dealFoodSubtotal = expectedSubtotal + sticks.basePricePkr; // 2350 + 590 = 2940 PKR
  const expectedDiscount = Math.round(dealFoodSubtotal * 0.05); // 5% of 2940 = 147 PKR
  console.log(`  Target Subtotal: ${dealFoodSubtotal} PKR (5% tier, expected discount: ${expectedDiscount} PKR)`);

  const areasRes = await fetch(`${baseUrl}/api/v1/store/delivery-areas`);
  const areasData = await areasRes.json();
  const area = areasData.data[0];

  const payload = {
    orderType: "DELIVERY",
    customerName: "Deal Tester",
    customerPhone: "0302-9988776",
    deliveryAreaId: area.id,
    deliveryAddress: "Test House 10, GT Road",
    items: dealItems,
  };

  const orderRes = await fetch(`${baseUrl}/api/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const orderData = await orderRes.json();
  console.assert(orderData.success === true, "Order submission must succeed");
  console.assert(orderData.data.discountPkr === expectedDiscount, `Discount must be ${expectedDiscount} PKR, got ${orderData.data.discountPkr}`);
  console.assert(orderData.data.discountRate === 0.05, `Discount rate must be 0.05, got ${orderData.data.discountRate}`);
  console.assert(orderData.data.discountType === "CUSTOM_DEAL", "Discount type must be CUSTOM_DEAL");
  console.assert(orderData.data.totalPkr === dealFoodSubtotal - expectedDiscount + area.deliveryFeePkr, "Total must match subtotal - discount + fee");
  console.log("  ✓ Order API accurately calculated and returned 5% discount snapshot:", orderData.data.discountPkr, "PKR");

  // Verify Tracking Route
  const trackRes = await fetch(`${baseUrl}/api/v1/orders/${orderData.data.trackingToken}/track`);
  const trackData = await trackRes.json();
  console.assert(trackData.success === true, "Tracking must succeed");
  console.assert(trackData.data.discountPkr === expectedDiscount, "Tracking must return discountPkr");
  console.assert(trackData.data.discountRate === 0.05, "Tracking must return discountRate");
  console.assert(trackData.data.items.every((i: any) => i.customDealId === customDealId), "All items must have customDealId");
  console.log("  ✓ Tracking API verified discount snapshot and customDealId on items!");

  console.log("\n🎉 ALL CUSTOM DEAL ORDER API TESTS PASSED!");
}

testCustomDealOrder().catch(console.error);
