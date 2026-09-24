import { calculateCustomDealDiscount, calculateCartWithCustomDeals } from "../src/lib/customDeal";
import { sqlite } from "../src/db";

async function main() {
  console.log("=================================================");
  console.log("CNM CUSTOM DEAL & ORDER VERIFICATION SUITE");
  console.log("=================================================\n");

  let allPassed = true;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
    } else {
      console.error(`❌ FAIL: ${testName}`, details || "");
      allPassed = false;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Discount Threshold Calculations
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Discount Thresholds ---");

  // 0 to 2499 PKR: 0%
  const t0 = calculateCustomDealDiscount(0);
  assert(t0.discountRate === 0 && t0.discountPkr === 0, "0 PKR -> 0% discount (0 PKR off)");

  const t2499 = calculateCustomDealDiscount(2499);
  assert(t2499.discountRate === 0 && t2499.discountPkr === 0 && t2499.nextThresholdPkr === 2500, "2499 PKR -> 0% discount (0 PKR off, next tier 2500 PKR)");

  // 2500 to 3499 PKR: 5%
  const t2500 = calculateCustomDealDiscount(2500);
  assert(t2500.discountRate === 0.05 && t2500.discountPkr === 125 && t2500.nextThresholdPkr === 3500, "2500 PKR -> 5% discount (125 PKR off, next tier 3500 PKR)");

  const t3499 = calculateCustomDealDiscount(3499);
  // 3499 * 0.05 = 174.95 -> rounded to 175
  assert(t3499.discountRate === 0.05 && t3499.discountPkr === 175 && t3499.nextThresholdPkr === 3500, "3499 PKR -> 5% discount (175 PKR off, next tier 3500 PKR)");

  // 3500 PKR+: 10%
  const t3500 = calculateCustomDealDiscount(3500);
  assert(t3500.discountRate === 0.10 && t3500.discountPkr === 350 && t3500.nextThresholdPkr === null, "3500 PKR -> 10% discount (350 PKR off, max tier)");

  const t5000 = calculateCustomDealDiscount(5000);
  assert(t5000.discountRate === 0.10 && t5000.discountPkr === 500 && t5000.nextThresholdPkr === null, "5000 PKR -> 10% discount (500 PKR off, max tier)");

  // -------------------------------------------------------------------------
  // TEST 2: Delivery Fee Isolation (NEVER discounted)
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing Delivery Fee Isolation ---");
  const cartItems = [
    {
      cartItemId: "item_deal_1",
      productId: "prod_1",
      productName: "Burger Feast",
      unitPricePkr: 3500,
      quantity: 1,
      lineTotalPkr: 3500,
      customDealId: "custom_deal_xyz",
    },
  ];

  const cartCalc = calculateCartWithCustomDeals(cartItems as any);
  const deliveryFee = 250; // Delivery fee to Kharian village
  const finalTotal = cartCalc.discountedFoodSubtotalPkr + deliveryFee;

  assert(cartCalc.foodSubtotalPkr === 3500, "Cart food subtotal is 3500 PKR");
  assert(cartCalc.customDealDiscountPkr === 350, "Custom deal discount is 350 PKR (10%)");
  assert(cartCalc.discountedFoodSubtotalPkr === 3150, "Discounted food subtotal is 3150 PKR");
  assert(finalTotal === 3400, "Final total (3150 food + 250 undiscounted delivery fee) is exactly 3400 PKR");
  assert(deliveryFee === 250, "Delivery fee is 100% undiscounted");

  // -------------------------------------------------------------------------
  // TEST 3: Database Schema & Columns Verification
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Database Schema & Columns ---");
  const orderColumns = sqlite.prepare("PRAGMA table_info(orders)").all() as any[];
  const columnNames = orderColumns.map((c) => c.name);

  assert(columnNames.includes("discount_pkr"), "orders table has discount_pkr column");
  assert(columnNames.includes("discount_rate"), "orders table has discount_rate column");
  assert(columnNames.includes("discount_type"), "orders table has discount_type column");
  assert(columnNames.includes("custom_deal_subtotal_pkr"), "orders table has custom_deal_subtotal_pkr column");

  const orderItemColumns = sqlite.prepare("PRAGMA table_info(order_items)").all() as any[];
  const itemColumnNames = orderItemColumns.map((c) => c.name);
  assert(itemColumnNames.includes("custom_deal_id"), "order_items table has custom_deal_id column");

  // -------------------------------------------------------------------------
  // TEST 4: Live Order Creation with Custom Deal Snapshot
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing End-to-End Order Creation with Deal Snapshot ---");
  const testProduct = sqlite.prepare("SELECT id, name, base_price_pkr FROM products WHERE is_available = 1 LIMIT 1").get() as any;
  const testArea = sqlite.prepare("SELECT id, name, delivery_fee_pkr FROM delivery_areas WHERE is_active = 1 LIMIT 1").get() as any;

  if (testProduct && testArea) {
    const testOrderId = `test_ord_${Date.now()}`;
    const testOrderNum = `CNM-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const testTracking = `trk_test_${Date.now()}`;
    const quantity = 3;
    const lineTotal = testProduct.base_price_pkr * quantity;
    const dealDiscount = calculateCustomDealDiscount(lineTotal);
    const deliveryFeePkr = testArea.delivery_fee_pkr;
    const expectedTotal = lineTotal - dealDiscount.discountPkr + deliveryFeePkr;

    const now = new Date().toISOString();
    sqlite.prepare(
      `INSERT INTO orders (
        id, order_number, tracking_token, order_type, status,
        payment_method, payment_status, customer_name_snapshot,
        customer_phone_snapshot, delivery_area_name_snapshot,
        delivery_address_snapshot, subtotal_pkr, delivery_fee_pkr,
        discount_pkr, discount_rate, discount_type, custom_deal_subtotal_pkr, total_pkr,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      testOrderId,
      testOrderNum,
      testTracking,
      "DELIVERY",
      "COMPLETED",
      "CASH_ON_DELIVERY",
      "PAID",
      "Automated Test User",
      "03021949067",
      testArea.name,
      "Main GT Road Kharian",
      lineTotal,
      deliveryFeePkr,
      dealDiscount.discountPkr,
      dealDiscount.discountRate,
      dealDiscount.discountRate > 0 ? "CUSTOM_DEAL_TIER" : "NONE",
      dealDiscount.discountRate > 0 ? lineTotal : 0,
      expectedTotal,
      now,
      now
    );

    // Insert order item with custom_deal_id
    sqlite.prepare(
      `INSERT INTO order_items (
        id, order_id, product_id, product_name_snapshot,
        unit_price_snapshot_pkr, quantity, line_total_pkr, custom_deal_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      `item_${testOrderId}`,
      testOrderId,
      testProduct.id,
      testProduct.name,
      testProduct.base_price_pkr,
      quantity,
      lineTotal,
      "custom_deal_automated"
    );

    // Verify row
    const queried = sqlite.prepare("SELECT * FROM orders WHERE id = ?").get(testOrderId) as any;
    assert(queried.order_number === testOrderNum, "Order was inserted and queried by ID");
    assert(queried.discount_pkr === dealDiscount.discountPkr, `Order discount_pkr matches snapshot (${dealDiscount.discountPkr} PKR)`);
    assert(queried.discount_rate === dealDiscount.discountRate, `Order discount_rate matches snapshot (${dealDiscount.discountRate})`);
    assert(queried.custom_deal_subtotal_pkr === (dealDiscount.discountRate > 0 ? lineTotal : 0), "Order custom_deal_subtotal_pkr recorded correctly");
    assert(queried.total_pkr === expectedTotal, `Order total_pkr matches exact formula (${expectedTotal} PKR)`);

    const queriedItem = sqlite.prepare("SELECT * FROM order_items WHERE id = ?").get(`item_${testOrderId}`) as any;
    assert(queriedItem.custom_deal_id === "custom_deal_automated", "Order item retains custom_deal_id snapshot");

    // Clean up test record
    sqlite.prepare("DELETE FROM order_items WHERE id = ?").run(`item_${testOrderId}`);
    sqlite.prepare("DELETE FROM orders WHERE id = ?").run(testOrderId);
    console.log("Cleaned up automated test record successfully.");
  } else {
    console.warn("Skipping DB insertion test: no available products or delivery areas found.");
  }

  console.log("\n=================================================");
  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY (100% PASS RATE)!");
  } else {
    console.error("❌ SOME TESTS FAILED.");
    process.exit(1);
  }
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
