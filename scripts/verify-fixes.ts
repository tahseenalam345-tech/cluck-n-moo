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

async function runTests() {
  console.log("=== STARTING COMPREHENSIVE VERIFICATION SUITE ===\n");
  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  const sql = postgres(connectionString!, { max: 2 });

  let testProductId: string | null = null;
  let testStaffId: string | null = null;

  try {
    // 1. Check existing categories
    const categories = await sql`SELECT id, name, slug FROM categories WHERE is_archived = false ORDER BY display_order ASC LIMIT 3`;
    console.log(`✓ Fetched ${categories.length} active categories. Target: ${categories[0].name} (${categories[0].id})`);
    const testCatId = categories[0].id;

    // Test 1: Add product using only Name + Category + Base Price (All optional fields blank)
    console.log("\n[TEST 1 & 3 & 4 & 5 & 6] Add Product using ONLY Name, Category, Base Price (no image, no variants, no modifiers, no description):");
    const testProdName = `Automated Test Item ${Date.now().toString().slice(-4)}`;
    const testSlug = `test-item-${Date.now().toString().slice(-4)}`;
    testProductId = `prod_test_${Date.now().toString().slice(-6)}`;

    const insertResult = await sql`
      INSERT INTO products (
        id, category_id, name, slug, description, image_url, cloudinary_public_id,
        image_alt_text, base_price_pkr, is_featured, is_available, is_archived, display_order, tags
      ) VALUES (
        ${testProductId}, ${testCatId}, ${testProdName}, ${testSlug}, null, null, null,
        ${testProdName}, 750, false, true, false, 99, '{}'
      )
      RETURNING id, name, slug, category_id, base_price_pkr, image_url, is_available, is_featured
    `;
    console.log("✓ Inserted minimal product successfully without error:", insertResult[0]);
    if (!insertResult[0].name) throw new Error("Inserted product missing name!");

    // Test 2: Edit existing product with no image and save
    console.log("\n[TEST 2] Edit existing product with no image and save:");
    const updatedPrice = 850;
    const updateResult1 = await sql`
      UPDATE products
      SET base_price_pkr = ${updatedPrice}, description = 'Updated description without image', updated_at = NOW()
      WHERE id = ${testProductId}
      RETURNING id, name, base_price_pkr, image_url, is_featured
    `;
    console.log("✓ Updated product (no image) returned complete object:", updateResult1[0]);
    if (updateResult1[0].base_price_pkr !== 850) throw new Error("Price update failed!");

    // Test 3: Edit existing product, replace image, and save
    console.log("\n[TEST 3] Edit existing product, attach image, and save:");
    const mockCloudinaryId = `cnm/menu/test_${Date.now()}`;
    const mockImageUrl = `https://res.cloudinary.com/test/image/upload/v1/${mockCloudinaryId}.jpg`;
    const updateResult2 = await sql`
      UPDATE products
      SET image_url = ${mockImageUrl}, cloudinary_public_id = ${mockCloudinaryId}, updated_at = NOW()
      WHERE id = ${testProductId}
      RETURNING id, name, base_price_pkr, image_url, cloudinary_public_id, is_featured
    `;
    console.log("✓ Updated product with image returned complete object:", updateResult2[0]);
    if (updateResult2[0].image_url !== mockImageUrl) throw new Error("Image replacement update failed!");

    // Test 4: Popular Picks Toggle & Filtering
    console.log("\n[TEST 4 & 9 & 10 & 11] Popular Picks Toggle & Query Verification:");
    // Mark as Popular Pick
    await sql`
      UPDATE products SET is_featured = true, updated_at = NOW() WHERE id = ${testProductId}
    `;
    const popularPicksAfterMark = await sql`
      SELECT id, name, is_featured, is_available
      FROM products
      WHERE is_featured = true AND is_available = true AND is_archived = false
      ORDER BY display_order ASC
      LIMIT 6
    `;
    console.log(`✓ Products currently queryable as Popular Picks (limit 6): ${popularPicksAfterMark.length}`);
    const foundOurProduct = popularPicksAfterMark.some((p) => p.id === testProductId);
    console.log(`✓ Our marked product is present in Popular Picks: ${foundOurProduct}`);
    if (!foundOurProduct) throw new Error("Popular product did not appear in query!");

    // Unmark product from Popular Pick
    await sql`
      UPDATE products SET is_featured = false, updated_at = NOW() WHERE id = ${testProductId}
    `;
    const popularPicksAfterUnmark = await sql`
      SELECT id, name, is_featured, is_available
      FROM products
      WHERE is_featured = true AND is_available = true AND is_archived = false
    `;
    const stillFound = popularPicksAfterUnmark.some((p) => p.id === testProductId);
    console.log(`✓ After unmarking, product is absent from Popular Picks: ${!stillFound}`);
    if (stillFound) throw new Error("Product still marked as popular after unmark!");

    // Test 5: Staff Member Creation & Profile Query
    console.log("\n[TEST 5 & 8] Create Staff Member in Auth & PostgreSQL Profiles:");
    const supabaseAdmin = getSupabaseAdmin();
    const testStaffEmail = `test_staff_${Date.now().toString().slice(-4)}@clucknmoo.com`;
    const testStaffName = `Chef Tester ${Date.now().toString().slice(-4)}`;

    const { data: authCreated, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: testStaffEmail,
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: {
        full_name: testStaffName,
        role: "KITCHEN_STAFF",
      },
    });

    if (authErr || !authCreated.user) {
      throw new Error(`Failed to create test auth user: ${authErr?.message}`);
    }

    testStaffId = authCreated.user.id;
    console.log(`✓ Supabase Auth user created successfully with ID: ${testStaffId}`);

    // Insert profile
    const testPhone = `03${Date.now().toString().slice(-9)}`;
    const insertedProfile = await sql`
      INSERT INTO profiles (id, email, full_name, phone, role, is_active)
      VALUES (${testStaffId}::uuid, ${testStaffEmail}, ${testStaffName}, ${testPhone}, 'KITCHEN_STAFF', true)
      ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, is_active = true
      RETURNING *
    `;
    console.log(`✓ Profile inserted into PostgreSQL:`, insertedProfile[0]);

    // Query non-customer profiles
    const staffQuery = await sql`
      SELECT id, full_name, email, phone, role, is_active
      FROM profiles
      WHERE role::text != 'CUSTOMER' AND id = ${testStaffId}::uuid
    `;
    console.log(`✓ Staff query result for new member:`, staffQuery[0]);
    if (staffQuery.length === 0 || staffQuery[0].email !== testStaffEmail) {
      throw new Error("Created staff was not found in staff query!");
    }

    console.log("\n=== ALL AUTOMATED TESTS PASSED SUCCESSFULLY! ===");
  } catch (err) {
    console.error("❌ TEST FAILED:", err);
    process.exit(1);
  } finally {
    // Cleanup test artifacts
    if (testProductId) {
      console.log(`\nCleaning up test product ${testProductId}...`);
      await sql`DELETE FROM products WHERE id = ${testProductId}`;
    }
    if (testStaffId) {
      console.log(`Cleaning up test staff member ${testStaffId}...`);
      await sql`DELETE FROM profiles WHERE id = ${testStaffId}`;
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.deleteUser(testStaffId);
    }
    await sql.end();
    console.log("Database connection closed.");
  }
}

runTests();
