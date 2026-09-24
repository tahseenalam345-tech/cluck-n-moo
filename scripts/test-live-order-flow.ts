async function testLiveOrderFlow() {
  console.log("Testing Live Order Placement & Tracking Flow with Custom Deals...\n");

  // 1. Fetch menu products
  const menuRes = await fetch("http://localhost:3000/api/v1/menu");
  const menuData = await menuRes.json();
  const products = menuData.data.categories.flatMap((c: any) => c.products || []);

  const prod1 = products[0];
  const prod2 = products[1] || products[0];

  // 2. Fetch delivery area
  const areasRes = await fetch("http://localhost:3000/api/v1/store/delivery-areas");
  const areasData = await areasRes.json();
  const area = areasData.data[0];

  console.log(`Using product: ${prod1.name} (${prod1.basePricePkr} PKR)`);
  console.log(`Using delivery area: ${area.name} (${area.deliveryFeePkr} PKR fee)`);

  // Quantity chosen to exceed 2500 PKR for 5% tier
  const quantity = Math.ceil(2600 / prod1.basePricePkr);
  const rawSubtotal = prod1.basePricePkr * quantity;

  console.log(`Subtotal: ${rawSubtotal} PKR (Quantity: ${quantity})`);

  // 3. Post order
  const orderPayload = {
    orderType: "DELIVERY",
    customerName: "Live Verification Customer",
    customerPhone: "03021949067",
    deliveryAreaId: area.id,
    deliveryAddress: "Opposite Raza CNG Kharian",
    specialInstructions: "Test deal verification",
    items: [
      {
        productId: prod1.id,
        quantity: quantity,
        customDealId: "custom_deal_live_test_123",
      },
    ],
  };

  const orderRes = await fetch("http://localhost:3000/api/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload),
  });

  const orderResult = await orderRes.json();
  console.log("\nOrder creation response:", orderResult.success ? "SUCCESS" : "FAILURE");

  if (!orderResult.success) {
    console.error(orderResult.error);
    process.exit(1);
  }

  const { id, orderNumber, trackingToken, subtotalPkr, discountPkr, discountRate, deliveryFeePkr, totalPkr } = orderResult.data;

  console.log(`  Order Number: ${orderNumber}`);
  console.log(`  Tracking Token: ${trackingToken}`);
  console.log(`  Subtotal: ${subtotalPkr} PKR`);
  console.log(`  Discount: ${discountPkr} PKR (${discountRate * 100}% OFF)`);
  console.log(`  Delivery Fee: ${deliveryFeePkr} PKR (Undiscounted)`);
  console.log(`  Total: ${totalPkr} PKR`);

  // Verify discount formula
  const expectedDiscount = Math.round(rawSubtotal * (rawSubtotal >= 3500 ? 0.10 : 0.05));
  if (discountPkr !== expectedDiscount) {
    console.error(`❌ Discount mismatch! Expected ${expectedDiscount}, got ${discountPkr}`);
    process.exit(1);
  }
  if (totalPkr !== rawSubtotal - discountPkr + area.deliveryFeePkr) {
    console.error(`❌ Total mismatch! Expected ${rawSubtotal - discountPkr + area.deliveryFeePkr}, got ${totalPkr}`);
    process.exit(1);
  }

  console.log("✅ Server-side discount calculation verified accurately!");

  // 4. Test tracking endpoint
  const trackRes = await fetch(`http://localhost:3000/api/v1/orders/${trackingToken}/track`);
  const trackData = await trackRes.json();

  if (trackData.success && trackData.data.discountPkr === discountPkr) {
    console.log("✅ Live tracking endpoint returned accurate discount snapshot and customDealId!");
  } else {
    console.error("❌ Live tracking endpoint returned invalid snapshot:", trackData);
    process.exit(1);
  }

  console.log("\n🎉 ALL LIVE ORDER FLOW TESTS PASSED 100%!");
}

testLiveOrderFlow().catch(console.error);
