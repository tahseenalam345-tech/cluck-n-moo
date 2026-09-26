import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";
import { getSupabaseAdmin } from "../src/lib/supabase/admin";

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

async function run() {
  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  const sql = postgres(connectionString!, { max: 1 });
  const supabaseAdmin = getSupabaseAdmin();

  console.log("=== STEP 1: VERIFY INITIAL STAFF COUNT ===");
  const initialProfiles = await sql`
    SELECT id, full_name, email, role, is_active FROM profiles WHERE role != 'CUSTOMER'
  `;
  const initialCount = initialProfiles.length;
  console.log(`Initial non-customer staff count: ${initialCount}`);

  const testEmail = `test_rider_${Date.now()}@clucknmoo.com`;
  const testName = "Test Verification Rider";
  const testPhone = "+92300" + Math.floor(1000000 + Math.random() * 9000000);
  let createdUserId: string | null = null;

  try {
    console.log("\n=== STEP 2: CREATE NEW RIDER VIA SUPABASE AUTH & PROFILES ===");
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: {
        full_name: testName,
        role: "RIDER",
        phone: testPhone,
      },
      app_metadata: {
        role: "RIDER",
      },
    });

    if (authError || !authData?.user) {
      throw new Error(`Auth user creation failed: ${authError?.message}`);
    }

    createdUserId = authData.user.id;
    console.log(`Created Auth user: ${createdUserId} (${testEmail})`);

    // Ensure profile exists with RIDER role
    await sql`
      INSERT INTO profiles (id, full_name, email, phone, role, is_active, updated_at)
      VALUES (${createdUserId}, ${testName}, ${testEmail}, ${testPhone}, 'RIDER', true, NOW())
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'RIDER',
        phone = EXCLUDED.phone,
        is_active = true,
        updated_at = NOW()
    `;

    console.log("\n=== STEP 3: CONFIRM PREVIOUS STAFF PERSISTED (NO OVERWRITE) ===");
    const afterProfiles = await sql`
      SELECT id, full_name, email, role, is_active FROM profiles WHERE role != 'CUSTOMER'
    `;
    console.log(`New staff count: ${afterProfiles.length} (Expected: ${initialCount + 1})`);
    if (afterProfiles.length !== initialCount + 1) {
      throw new Error(`Staff count mismatch! Expected ${initialCount + 1}, got ${afterProfiles.length}`);
    }

    // Verify all initial staff still exist with exact same IDs
    for (const init of initialProfiles) {
      const match = afterProfiles.find((p) => p.id === init.id);
      if (!match) {
        throw new Error(`CRITICAL: Previous staff member ${init.full_name} (${init.id}) was lost!`);
      }
      if (match.role !== init.role) {
        throw new Error(`CRITICAL: Previous staff member ${init.full_name} role changed from ${init.role} to ${match.role}!`);
      }
    }
    console.log("SUCCESS: All previous staff members remain completely intact with correct roles!");

    console.log("\n=== STEP 4: VERIFY ACTIVE RIDERS QUERY FOR ASSIGNMENT ===");
    const activeRiders = await sql`
      SELECT p.id, p.full_name, p.phone, p.email,
        (SELECT COUNT(*)::int FROM orders o WHERE o.assigned_rider_id = p.id AND o.status NOT IN ('Completed', 'Cancelled')) as active_deliveries
      FROM profiles p
      WHERE p.role = 'RIDER' AND p.is_active = true
    `;
    console.log(`Active riders available for assignment: ${activeRiders.length}`);
    console.table(activeRiders);

    const foundTestRider = activeRiders.find((r) => r.id === createdUserId);
    if (!foundTestRider) {
      throw new Error("Created rider did not appear in active riders query!");
    }
    console.log(`SUCCESS: Test Rider correctly listed with name: "${foundTestRider.full_name}"!`);

  } finally {
    if (createdUserId) {
      console.log("\n=== CLEANUP: DELETING TEST RIDER ===");
      await sql`DELETE FROM profiles WHERE id = ${createdUserId}`;
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);
      console.log(`Cleaned up test rider ${createdUserId}`);
    }
    await sql.end();
  }

  console.log("\n=== ALL DATABASE AND PROFILE INTEGRITY CHECKS PASSED ===");
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
