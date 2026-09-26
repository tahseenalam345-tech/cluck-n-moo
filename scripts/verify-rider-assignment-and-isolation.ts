import * as fs from "fs";
import * as path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

async function testRiderIsolation() {
  const { getOpsOrders, updateOrderStatusInPostgres } = await import("../src/db/postgres/repositories/orderRepository");
  const { db } = await import("../src/db/postgres/client");
  const { orders } = await import("../src/db/postgres/schema");
  const { eq } = await import("drizzle-orm");

  console.log("=== STEP 1: FETCH ORDERS AS ADMIN ===");
  const adminStaff = { role: "ADMIN" as const, userId: "24489837-d0cd-4e34-90fa-116583ee57fc" };
  const allOrders = await getOpsOrders(adminStaff);
  console.log(`Total orders visible to Admin: ${allOrders.length}`);

  if (allOrders.length === 0) {
    console.log("No orders found in database to test assignment. Skipping assignment test.");
    return;
  }

  const testOrder = allOrders[0];
  console.log(`Selected order for test: ${testOrder.orderNumber} (ID: ${testOrder.id})`);

  const rider1Id = "5e99dca8-04da-4181-97aa-5a8d6694de56"; // Lead Delivery Rider
  const rider2Id = "2500f9a6-3f04-4067-822b-f941ad0442c0"; // bhu

  console.log(`\n=== STEP 2: ASSIGN ORDER TO RIDER 1 (${rider1Id}) ===`);
  const originalRiderId = testOrder.assignedRiderId;
  const originalStatus = testOrder.status;

  const updateRes = await updateOrderStatusInPostgres(testOrder.id, testOrder.status as any, adminStaff, {
    assignedRiderId: rider1Id,
  });
  console.log("updateOrderStatusInPostgres result:", updateRes);

  // Verify DB state
  const updatedOrderRows = await db.select().from(orders).where(eq(orders.id, testOrder.id));
  const updatedRow = updatedOrderRows[0];
  console.log("DB assigned_rider_id:", updatedRow.assignedRiderId);
  if (updatedRow.assignedRiderId !== rider1Id) {
    throw new Error(`Expected assigned_rider_id to be ${rider1Id}, got ${updatedRow.assignedRiderId}`);
  }

  console.log("\n=== STEP 3: VERIFY RIDER 1 SEES THE ASSIGNED ORDER ===");
  const rider1Orders = await getOpsOrders({ role: "RIDER", userId: rider1Id });
  const rider1HasOrder = rider1Orders.some((o) => o.id === testOrder.id);
  console.log(`Rider 1 sees assigned order: ${rider1HasOrder} (Total visible: ${rider1Orders.length})`);
  if (!rider1HasOrder) {
    throw new Error("Rider 1 cannot see their assigned order!");
  }

  console.log("\n=== STEP 4: VERIFY RIDER 2 DOES NOT SEE RIDER 1's ORDER (ISOLATION) ===");
  const rider2Orders = await getOpsOrders({ role: "RIDER", userId: rider2Id });
  const rider2HasOrder = rider2Orders.some((o) => o.id === testOrder.id);
  console.log(`Rider 2 sees Rider 1's order: ${rider2HasOrder} (Expected: false, Total visible: ${rider2Orders.length})`);
  if (rider2HasOrder) {
    throw new Error("SECURITY FAILURE: Rider 2 can see Rider 1's assigned order!");
  }
  console.log("SUCCESS: Rider order isolation is strictly enforced!");

  console.log("\n=== STEP 5: RESTORE ORIGINAL ORDER STATE ===");
  await db
    .update(orders)
    .set({
      assignedRiderId: originalRiderId,
      status: originalStatus as any,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, testOrder.id));
  console.log("Order state restored.");
}

testRiderIsolation().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
