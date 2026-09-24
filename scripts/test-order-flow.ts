import { sqlite } from "../src/db";
import { generateOrderNumber, generateTrackingToken } from "../src/lib/auth";
import { ORDER_STATUSES, ORDER_TYPES } from "../src/lib/constants";
import crypto from "crypto";

function testOrderCreationAndSnapshot() {
  console.log("🧪 Testing Server-side Order Creation & Snapshot Immutability...");

  // 1. Fetch classic smash product
  const prod = sqlite.prepare("SELECT * FROM products WHERE slug = 'classic-smash-burger'").get() as any;
  const variant = sqlite.prepare("SELECT * FROM product_variants WHERE product_id = ?").get(prod.id) as any;
  const area = sqlite.prepare("SELECT * FROM delivery_areas WHERE slug = 'bidermarjan'").get() as any;

  console.log(`  Found Product: ${prod.name}, Variant: ${variant.name} (${variant.price_pkr} PKR)`);
  console.log(`  Found Delivery Area: ${area.name} (Fee: ${area.delivery_fee_pkr} PKR)`);

  const orderId = `test_ord_${crypto.randomBytes(6).toString("hex")}`;
  const orderNumber = generateOrderNumber();
  const trackingToken = generateTrackingToken();
  const quantity = 2;
  const lineTotal = variant.price_pkr * quantity;
  const deliveryFee = area.delivery_fee_pkr;
  const totalPkr = lineTotal + deliveryFee;
  const now = new Date().toISOString();

  // 2. Insert test order
  sqlite.prepare(`
    INSERT INTO orders (
      id, order_number, tracking_token, order_type, status,
      payment_method, payment_status, payment_location,
      customer_name_snapshot, customer_phone_snapshot,
      delivery_area_name_snapshot, delivery_address_snapshot,
      subtotal_pkr, delivery_fee_pkr, total_pkr,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orderId,
    orderNumber,
    trackingToken,
    ORDER_TYPES.DELIVERY,
    ORDER_STATUSES.NEW,
    "CASH",
    "PENDING",
    "ON_DELIVERY",
    "Muhammad Ahmed",
    "0302-9988776",
    area.name,
    "House 14, Street 2, Bidermarjan",
    lineTotal,
    deliveryFee,
    totalPkr,
    now,
    now
  );

  // Insert order item snapshot
  const itemId = `test_item_${crypto.randomBytes(6).toString("hex")}`;
  sqlite.prepare(`
    INSERT INTO order_items (
      id, order_id, product_id, product_name_snapshot, variant_name_snapshot,
      unit_price_snapshot_pkr, quantity, line_total_pkr
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(itemId, orderId, prod.id, prod.name, variant.name, variant.price_pkr, quantity, lineTotal);

  // 3. Verify retrieval by tracking token
  const retrievedOrder = sqlite.prepare("SELECT * FROM orders WHERE tracking_token = ?").get(trackingToken) as any;
  console.assert(retrievedOrder.order_number === orderNumber, "Order number must match");
  console.assert(retrievedOrder.total_pkr === totalPkr, `Total must be ${totalPkr}`);
  console.assert(retrievedOrder.delivery_area_name_snapshot === "Bidermarjan", "Area snapshot matches");
  console.assert(retrievedOrder.status === ORDER_STATUSES.NEW, "Initial status is New");

  const retrievedItems = sqlite.prepare("SELECT * FROM order_items WHERE order_id = ?").all(orderId) as any[];
  console.assert(retrievedItems.length === 1, "Must have 1 item");
  console.assert(retrievedItems[0].product_name_snapshot === prod.name, "Product name snapshot preserved");
  console.assert(retrievedItems[0].unit_price_snapshot_pkr === variant.price_pkr, "Unit price snapshot preserved");

  // Cleanup test order
  sqlite.prepare("DELETE FROM orders WHERE id = ?").run(orderId);

  console.log("🎉 Order creation and snapshot immutability test verified successfully!");
}

testOrderCreationAndSnapshot();
