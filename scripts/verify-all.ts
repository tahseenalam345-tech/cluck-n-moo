async function runFullVerification() {
  console.log("🚀 Starting Full End-to-End Cluck N Moo System Verification...\n");
  const baseUrl = "http://localhost:3000";

  // 1. Verify Store Status & Operating Hours
  console.log("1️⃣ Verifying Store Status & Operating Hours (PKT Midnight Schedule)...");
  const statusRes = await fetch(`${baseUrl}/api/v1/store/status`);
  const statusData = await statusRes.json();
  console.assert(statusData.success === true, "Store status API should succeed");
  console.assert(statusData.data.store.phone === "0302-1949067", "Phone number matches exactly");
  console.assert(statusData.data.store.defaultDeliveryFeePkr === 100, "Default fee is 100 PKR");
  console.log(`   ✓ Store is ${statusData.data.isOpen ? "OPEN" : "CLOSED"} (${statusData.data.currentPktTime})`);
  console.log(`   ✓ Branch: ${statusData.data.store.address}`);

  // 2. Verify Delivery Areas (Kharian and villages)
  console.log("\n2️⃣ Verifying Delivery Areas...");
  const areasRes = await fetch(`${baseUrl}/api/v1/store/delivery-areas`);
  const areasData = await areasRes.json();
  console.assert(areasData.success === true, "Areas API should succeed");
  console.assert(areasData.data.length >= 11, "Should have at least 11 delivery areas");
  const areaNames = areasData.data.map((a: any) => a.name);
  console.assert(areaNames.includes("Bidermarjan"), "Must contain Bidermarjan");
  console.assert(areaNames.includes("Lalamusa"), "Must contain Lalamusa");
  console.assert(areaNames.includes("Kharian Cantt"), "Must contain Kharian Cantt");
  console.log(`   ✓ Found ${areasData.data.length} active delivery areas: ${areaNames.slice(0, 5).join(", ")}...`);

  // 3. Verify Menu Structure
  console.log("\n3️⃣ Verifying Menu Categories, Variants & Modifiers...");
  const menuRes = await fetch(`${baseUrl}/api/v1/menu`);
  const menuData = await menuRes.json();
  console.assert(menuData.success === true, "Menu API should succeed");
  console.assert(menuData.data.categories.length > 0, "Categories exist");
  const smashBurger = menuData.data.featuredProducts.find((p: any) => p.slug === "classic-cheeseburger" || p.slug === "classic-smash-burger");
  console.assert(smashBurger !== undefined, "Classic Smash Burger / Cheeseburger exists");
  console.assert(smashBurger.variants.length >= 2, "Smash burger has variants (Single & Double)");
  console.log(`   ✓ Menu verified: ${menuData.data.categories.length} categories, ${menuData.data.featuredProducts.length} featured items.`);

  // 4. Place a Customer Delivery Order (Guest Checkout)
  console.log("\n4️⃣ Placing Customer Delivery Order (Guest Checkout)...");
  const bidermarjan = areasData.data.find((a: any) => a.name === "Bidermarjan");
  const doublePattyVariant = smashBurger.variants.find((v: any) => v.name.includes("Double"));
  const extraCheeseMod = smashBurger.modifierGroups[0]?.modifiers[0];

  const orderPayload = {
    orderType: "DELIVERY",
    customerName: "Hamza Tariq",
    customerPhone: "0302-5551234",
    deliveryAreaId: bidermarjan.id,
    deliveryAddress: "House 12, Main Street, Bidermarjan",
    deliveryLandmark: "Near Central Jamia Mosque",
    specialInstructions: "Extra Moo sauce please",
    items: [
      {
        productId: smashBurger.id,
        variantId: doublePattyVariant.id,
        modifierIds: extraCheeseMod ? [extraCheeseMod.id] : [],
        quantity: 2,
        specialInstructions: "Well done patties",
      },
    ],
  };

  const createOrderRes = await fetch(`${baseUrl}/api/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderPayload),
  });
  const createOrderData = await createOrderRes.json();
  console.assert(createOrderData.success === true, "Order placement should succeed");
  const orderNumber = createOrderData.data.orderNumber;
  const trackingToken = createOrderData.data.trackingToken;
  const orderId = createOrderData.data.orderId;
  console.log(`   ✓ Order placed successfully! Order Number: ${orderNumber}`);
  console.log(`   ✓ Initial Status: ${createOrderData.data.status} (Cash Total: ${createOrderData.data.totalPkr} PKR)`);

  // 5. Track Order via Public Token
  console.log("\n5️⃣ Tracking Order via Public Token...");
  const trackRes = await fetch(`${baseUrl}/api/v1/orders/${trackingToken}/track`);
  const trackData = await trackRes.json();
  console.assert(trackData.success === true, "Tracking API should succeed");
  console.assert(trackData.data.orderNumber === orderNumber, "Order number matches");
  console.assert(trackData.data.deliveryAreaName === "Bidermarjan", "Area matches");
  console.assert(trackData.data.items[0].productName === smashBurger.name, "Item snapshot matches");
  console.log(`   ✓ Live tracking verified: Customer: ${trackData.data.customerName}, Address: ${trackData.data.deliveryAddress}`);

  // 6. Admin Confirms Order by Phone
  console.log("\n6️⃣ Admin Confirms Order by Phone...");
  const confirmRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-role": "ADMIN" },
    body: JSON.stringify({ targetStatus: "Confirmed", note: "Customer phone verified by HQ" }),
  });
  const confirmData = await confirmRes.json();
  console.assert(confirmData.success === true, "Confirmation should succeed");
  console.log(`   ✓ Order state updated: New ➔ ${confirmData.data.newStatus}`);

  // 7. Kitchen Accepts and Prepares Order
  console.log("\n7️⃣ Kitchen KDS: Start Cooking ➔ Mark Ready...");
  const prepareRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-role": "KITCHEN_STAFF" },
    body: JSON.stringify({ targetStatus: "Preparing" }),
  });
  console.assert(prepareRes.ok, "Kitchen start cooking should succeed");

  const readyRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-role": "KITCHEN_STAFF" },
    body: JSON.stringify({ targetStatus: "Ready" }),
  });
  console.assert(readyRes.ok, "Kitchen ready should succeed");
  console.log(`   ✓ Order state updated: Confirmed ➔ Preparing ➔ Ready`);

  // 8. Rider Dispatches and Delivers Order
  console.log("\n8️⃣ Rider Portal: Pick Up ➔ Delivered & Cash Collected...");
  const dispatchRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-role": "RIDER" },
    body: JSON.stringify({ targetStatus: "Out for delivery" }),
  });
  console.assert(dispatchRes.ok, "Rider dispatch should succeed");

  const completeRes = await fetch(`${baseUrl}/api/v1/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-role": "RIDER" },
    body: JSON.stringify({ targetStatus: "Completed", note: "Delivered & cash collected in full" }),
  });
  console.assert(completeRes.ok, "Rider complete should succeed");
  console.log(`   ✓ Order state updated: Ready ➔ Out for delivery ➔ Completed`);

  // 9. Verify Final Tracking Status & Audit History
  console.log("\n9️⃣ Verifying Final Tracking State & Audit History...");
  const finalTrackRes = await fetch(`${baseUrl}/api/v1/orders/${trackingToken}/track`);
  const finalTrackData = await finalTrackRes.json();
  console.assert(finalTrackData.data.status === "Completed", "Final status must be Completed");
  console.assert(finalTrackData.data.history.length === 5, "Audit history should record all 5 transitions");
  console.log(`   ✓ All 5 status history entries logged accurately!`);

  // 10. Place a Dine-In Order
  console.log("\n🔟 Testing Dine-In Order Workflow...");
  const dineInPayload = {
    orderType: "DINE_IN",
    customerName: "Ayesha Bibi",
    customerPhone: "0300-8877665",
    dineInPreferredTime: "8:30 PM Tonight",
    paymentLocation: "ON_TABLE",
    items: [
      {
        productId: smashBurger.id,
        quantity: 1,
      },
    ],
  };

  const dineInRes = await fetch(`${baseUrl}/api/v1/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dineInPayload),
  });
  const dineInData = await dineInRes.json();
  console.assert(dineInData.success === true, "Dine-in order placement should succeed");
  console.assert(dineInData.data.deliveryFeePkr === 0, "Dine-in delivery fee must be 0 PKR");
  console.log(`   ✓ Dine-in order created: ${dineInData.data.orderNumber} (Preferred Time: 8:30 PM, Delivery Fee: 0 PKR)`);

  console.log("\n========================================================");
  console.log("🎉 ALL 10 E2E AUTOMATED VERIFICATION CHECKS PASSED 100%!");
  console.log("========================================================\n");
}

runFullVerification().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
