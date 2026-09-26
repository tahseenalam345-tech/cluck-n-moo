import { getPostgresDb } from "../src/db/postgres/client";
import { profiles, orders } from "../src/db/postgres/schema";
import { getSupabaseAdmin } from "../src/lib/supabase/admin";
import { eq, not, sql, and } from "drizzle-orm";
import { updateOrderStatusInPostgres } from "../src/db/postgres/repositories/orderRepository";
import { getOpsOrders } from "../src/db/postgres/repositories/orderRepository";
import { AuthenticatedUserSession } from "../src/lib/authGuard";

async function runVerification() {
  console.log("================================================================================");
  console.log("CLUCK N MOO (CNM) — STAFF & RIDER PERSISTENCE PRODUCTION VERIFICATION TEST");
  console.log("================================================================================");

  const db = getPostgresDb();
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Record initial real staff count
  console.log("\n[STEP 1] Recording initial staff list from PostgreSQL & Supabase Auth...");
  const initialStaff = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
      isActive: profiles.isActive,
      activeOrdersAssigned: sql<number>`(
        SELECT count(*) 
        FROM orders 
        WHERE orders.assigned_rider_id = "profiles"."id" 
          AND orders.status IN ('Out for delivery', 'Ready')
      )`,
    })
    .from(profiles)
    .where(not(eq(profiles.role, "CUSTOMER")));

  console.log(`Initial real staff profiles in database: ${initialStaff.length}`);
  for (const s of initialStaff) {
    console.log(`  - [${s.role}] ${s.fullName} <${s.email}> (ID: ${s.id}, In-Flight: ${s.activeOrdersAssigned})`);
  }

  // 2. Create Kitchen Staff Test A and Rider Test A
  console.log("\n[STEP 2] Creating Kitchen Staff Test A and Rider Test A via production Auth + DB flow...");
  const ts = Date.now();
  const kitchenEmail = `test_kitchen_${ts}@clucknmoo.com`;
  const kitchenName = `Chef Test A ${ts.toString().slice(-4)}`;
  const kitchenPass = "ChefPass123!";

  const riderEmail = `test_rider_${ts}@clucknmoo.com`;
  const riderName = `Rider Test A ${ts.toString().slice(-4)}`;
  const riderPass = "RiderPass123!";
  const riderPhone = `0300${ts.toString().slice(-7)}`;

  // Create Kitchen Staff in Auth
  const { data: kAuthData, error: kAuthErr } = await supabaseAdmin.auth.admin.createUser({
    email: kitchenEmail,
    password: kitchenPass,
    email_confirm: true,
    user_metadata: { full_name: kitchenName, role: "KITCHEN_STAFF" },
    app_metadata: { role: "KITCHEN_STAFF" },
  });
  if (kAuthErr || !kAuthData.user) {
    throw new Error(`Failed to create Kitchen Staff in Auth: ${kAuthErr?.message}`);
  }
  const kitchenUserId = kAuthData.user.id;

  // Insert or update Kitchen Staff Profile
  await db
    .insert(profiles)
    .values({
      id: kitchenUserId,
      email: kitchenEmail,
      fullName: kitchenName,
      role: "KITCHEN_STAFF",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: kitchenEmail,
        fullName: kitchenName,
        role: "KITCHEN_STAFF",
        isActive: true,
        updatedAt: new Date(),
      },
    });
  console.log(`✓ Kitchen Staff Test A created: ${kitchenName} (ID: ${kitchenUserId})`);

  // Create Rider in Auth
  const { data: rAuthData, error: rAuthErr } = await supabaseAdmin.auth.admin.createUser({
    email: riderEmail,
    password: riderPass,
    email_confirm: true,
    user_metadata: { full_name: riderName, role: "RIDER", phone: riderPhone },
    app_metadata: { role: "RIDER" },
  });
  if (rAuthErr || !rAuthData.user) {
    throw new Error(`Failed to create Rider in Auth: ${rAuthErr?.message}`);
  }
  const riderUserId = rAuthData.user.id;

  // Insert or update Rider Profile
  await db
    .insert(profiles)
    .values({
      id: riderUserId,
      email: riderEmail,
      fullName: riderName,
      phone: riderPhone,
      role: "RIDER",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        email: riderEmail,
        fullName: riderName,
        phone: riderPhone,
        role: "RIDER",
        isActive: true,
        updatedAt: new Date(),
      },
    });
  console.log(`✓ Rider Test A created: ${riderName} (ID: ${riderUserId}, Phone: ${riderPhone})`);

  // 3. Verify in Supabase Production (Auth user exists, profile exists, linkage matches)
  console.log("\n[STEP 3] Verifying Auth & DB linkage...");
  const kCheck = await db.select().from(profiles).where(eq(profiles.id, kitchenUserId)).limit(1);
  const rCheck = await db.select().from(profiles).where(eq(profiles.id, riderUserId)).limit(1);

  if (kCheck.length === 0 || kCheck[0].email !== kitchenEmail || kCheck[0].role !== "KITCHEN_STAFF") {
    throw new Error("Kitchen Staff profile verification failed in database!");
  }
  if (rCheck.length === 0 || rCheck[0].email !== riderEmail || rCheck[0].role !== "RIDER") {
    throw new Error("Rider profile verification failed in database!");
  }
  console.log("✓ Both Auth users correctly linked to profiles table with exact UUIDs and roles.");

  // 4. Simulate Page Refresh (Execute GET /api/v1/admin/staff query)
  console.log("\n[STEP 4] Simulating page refresh by re-querying GET /api/v1/admin/staff...");
  const refreshedStaff = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
      isActive: profiles.isActive,
      activeOrdersAssigned: sql<number>`(
        SELECT count(*) 
        FROM orders 
        WHERE orders.assigned_rider_id = "profiles"."id" 
          AND orders.status IN ('Out for delivery', 'Ready')
      )`,
    })
    .from(profiles)
    .where(not(eq(profiles.role, "CUSTOMER")));

  console.log(`Total staff returned after refresh: ${refreshedStaff.length} (Expected: ${initialStaff.length + 2})`);
  const foundKitchen = refreshedStaff.find((s) => s.id === kitchenUserId);
  const foundRider = refreshedStaff.find((s) => s.id === riderUserId);

  if (!foundKitchen) throw new Error("Kitchen Staff Test A disappeared after refresh!");
  if (!foundRider) throw new Error("Rider Test A disappeared after refresh!");
  console.log("✓ PERSISTENCE CONFIRMED: Both Kitchen Staff and Rider persisted across simulated refresh!");

  // 5. Verify Rider Assignment Dropdown Query
  console.log("\n[STEP 5] Querying active riders for Assign Rider Dropdown...");
  const activeRidersForDropdown = refreshedStaff.filter((s) => s.role === "RIDER" && s.isActive);
  console.log(`Active riders available for assignment: ${activeRidersForDropdown.length}`);
  for (const r of activeRidersForDropdown) {
    console.log(`  - Rider: "${r.fullName}" | Phone: ${r.phone} | In-flight: ${r.activeOrdersAssigned}`);
  }
  const riderInDropdown = activeRidersForDropdown.find((r) => r.id === riderUserId);
  if (!riderInDropdown) {
    throw new Error(`Rider Test A "${riderName}" did not appear in active riders dropdown query!`);
  }
  console.log(`✓ SUCCESS: Newly created rider "${riderInDropdown.fullName}" is present in dropdown query!`);

  // 6. Test Rider Assignment on a Delivery Order
  console.log("\n[STEP 6] Testing assignment of Rider Test A to an existing delivery order...");
  const deliveryOrders = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status })
    .from(orders)
    .where(eq(orders.orderType, "DELIVERY"))
    .limit(1);

  if (deliveryOrders.length > 0) {
    const testOrder = deliveryOrders[0];
    console.log(`Targeting delivery order: #${testOrder.orderNumber} (ID: ${testOrder.id}, Current Status: ${testOrder.status})`);

    const origStatus = testOrder.status;
    const adminSession: AuthenticatedUserSession = {
      userId: "24489837-d0cd-4e34-90fa-116583ee57fc",
      email: "tahseenalam345@gmail.com",
      phone: null,
      fullName: "Tahseen Alam (Admin)",
      role: "ADMIN",
    };

    // Transition order to Ready and assign rider
    await db
      .update(orders)
      .set({ status: "Ready", assignedRiderId: riderUserId })
      .where(eq(orders.id, testOrder.id));

    console.log(`✓ Order #${testOrder.orderNumber} successfully set to 'Ready' and assigned to rider "${riderName}"!`);

    // Verify order in database
    const verifyOrder = await db.select({ status: orders.status, assignedRiderId: orders.assignedRiderId }).from(orders).where(eq(orders.id, testOrder.id));
    if (verifyOrder[0].assignedRiderId !== riderUserId) {
      throw new Error("Assigned rider ID did not persist in database!");
    }
    console.log(`✓ Verified in PostgreSQL: status = '${verifyOrder[0].status}', assigned_rider_id = '${verifyOrder[0].assignedRiderId}'.`);

    // Verify in getOpsOrders (powers admin view)
    const opsOrders = await getOpsOrders(adminSession);
    const opsOrderMatch = opsOrders.find((o) => o.id === testOrder.id);
    if (!opsOrderMatch || opsOrderMatch.assignedRiderName !== riderName) {
      throw new Error(`Ops order view did not show assigned rider name! Got: ${opsOrderMatch?.assignedRiderName}`);
    }
    console.log(`✓ Ops order list displays assigned rider: "${opsOrderMatch.assignedRiderName}".`);

    // Verify Rider view (only sees their own runs when Ready or Out for delivery)
    const riderSession: AuthenticatedUserSession = {
      userId: riderUserId,
      email: riderEmail,
      phone: riderPhone,
      fullName: riderName,
      role: "RIDER",
    };
    const riderOpsOrders = await getOpsOrders(riderSession);
    const riderAssignedRuns = riderOpsOrders.filter((o) => o.assignedRiderId === riderUserId);
    console.log(`Rider Test A sees ${riderAssignedRuns.length} run(s) assigned to them.`);
    if (riderAssignedRuns.length === 0) {
      throw new Error("Rider Test A cannot see the order assigned to them in their ops queue!");
    }
    console.log(`✓ SUCCESS: Rider Test A correctly sees order #${testOrder.orderNumber} with customer address "${riderAssignedRuns[0].deliveryAddress}".`);

    // Restore order status and unassign order before cleanup
    await db.update(orders).set({ status: origStatus as any, assignedRiderId: null }).where(eq(orders.id, testOrder.id));
    console.log(`✓ Restored original order #${testOrder.orderNumber} status to '${origStatus}'.`);
  } else {
    console.log("ℹ️ No delivery orders found in database to assign, skipping assignment step.");
  }

  // 7. Cleanup Test Staff Records Safely
  console.log("\n[STEP 7] Cleaning up test staff records (preserving all real staff)...");
  await db.delete(profiles).where(eq(profiles.id, kitchenUserId));
  await db.delete(profiles).where(eq(profiles.id, riderUserId));
  await supabaseAdmin.auth.admin.deleteUser(kitchenUserId);
  await supabaseAdmin.auth.admin.deleteUser(riderUserId);
  console.log("✓ Test records cleaned up successfully.");

  const finalStaff = await db
    .select({ count: sql<number>`count(*)` })
    .from(profiles)
    .where(not(eq(profiles.role, "CUSTOMER")));
  console.log(`Final persistent real staff profiles in database: ${finalStaff[0].count}`);

  console.log("\n================================================================================");
  console.log("ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================");
  process.exit(0);
}

runVerification().catch((err) => {
  console.error("\n❌ VERIFICATION TEST FAILED:", err);
  process.exit(1);
});
