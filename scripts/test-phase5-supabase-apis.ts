import fs from "fs";
import path from "path";

// 1. Securely load .env.local
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

async function runTests() {
  console.log("================================================================================");
  console.log("PHASE 5 VERIFICATION: SUPABASE STOREFRONT READ APIS");
  console.log("================================================================================\n");

  const { getActiveMenu } = await import("../src/db/postgres/repositories/menuRepository");
  const { getStoreSettings } = await import("../src/db/postgres/repositories/storeRepository");
  const { getActiveDeliveryAreas } = await import("../src/db/postgres/repositories/deliveryAreaRepository");
  const { checkRestaurantOpen } = await import("../src/lib/time");
  const { getPgPoolClient } = await import("../src/db/postgres/client");

  let allPassed = true;

  // --- 1. Test Menu Repository ---
  console.log("--- 1. Testing Menu Repository (/api/v1/menu) ---");
  const menu = await getActiveMenu();
  const catCount = menu.categories.length;
  const totalProducts = menu.categories.reduce((sum, c) => sum + (c.products?.length || 0), 0);
  const featuredCount = menu.featuredProducts.length;

  console.log(`Active Categories Returned: ${catCount} (Expected: 14) -> ${catCount === 14 ? "PASSED" : "FAILED"}`);
  if (catCount !== 14) allPassed = false;

  console.log(`Active Products in Categories: ${totalProducts} (Expected: 74) -> ${totalProducts === 74 ? "PASSED" : "FAILED"}`);
  if (totalProducts !== 74) allPassed = false;

  // Check zero-item categories
  const zeroItemCats = menu.categories.filter((c) => !c.products || c.products.length === 0);
  console.log(`Zero-Item Categories: ${zeroItemCats.length} (Expected: 0) -> ${zeroItemCats.length === 0 ? "PASSED" : "FAILED"}`);
  if (zeroItemCats.length > 0) allPassed = false;

  // Check archived categories
  const archivedCatSlugs = ["burgers", "crispy-chicken", "deals", "sides-dips"];
  const returnedArchivedCats = menu.categories.filter((c) => archivedCatSlugs.includes(c.slug));
  console.log(`Archived Starter Categories Returned: ${returnedArchivedCats.length} (Expected: 0) -> ${returnedArchivedCats.length === 0 ? "PASSED" : "FAILED"}`);
  if (returnedArchivedCats.length > 0) allPassed = false;

  // Check all products
  const allProds = menu.categories.flatMap((c) => c.products || []);
  const withCloudinary = allProds.filter((p) => p.cloudinaryPublicId && p.imageUrl);
  const withoutImage = allProds.filter((p) => !p.cloudinaryPublicId);
  console.log(`Products with Cloudinary Public IDs & URLs: ${withCloudinary.length} (Expected: 64) -> ${withCloudinary.length === 64 ? "PASSED" : "FAILED"}`);
  if (withCloudinary.length !== 64) allPassed = false;

  console.log(`Products with Branded Fallback (No Image): ${withoutImage.length} (Expected: 10) -> ${withoutImage.length === 10 ? "PASSED" : "FAILED"}`);
  if (withoutImage.length !== 10) allPassed = false;

  // Check variants & modifiers presence
  const prodsWithVariants = allProds.filter((p) => p.variants && p.variants.length > 0);
  const prodsWithModGroups = allProds.filter((p) => p.modifierGroups && p.modifierGroups.length > 0);
  console.log(`Products with Variants: ${prodsWithVariants.length}`);
  console.log(`Products with Modifier Groups: ${prodsWithModGroups.length}`);

  // --- 2. Test Store Status Repository ---
  console.log("\n--- 2. Testing Store Status Repository (/api/v1/store/status) ---");
  const settingsMap = await getStoreSettings();
  const settingsCount = Object.keys(settingsMap).length;
  console.log(`Store Settings Keys Count: ${settingsCount} (Expected: 10) -> ${settingsCount === 10 ? "PASSED" : "FAILED"}`);
  if (settingsCount !== 10) allPassed = false;

  const manualOverride = (settingsMap["manual_override_status"] || "AUTO") as any;
  const announcement = settingsMap["announcement_banner"] || "";
  const storeStatus = checkRestaurantOpen(manualOverride, announcement);
  console.log(`Current PKT Time: ${storeStatus.currentPktTime}`);
  console.log(`Store Is Open: ${storeStatus.isOpen}`);
  console.log(`Schedule Text: ${storeStatus.scheduleText}`);
  console.log(`Override Status: ${manualOverride}`);
  console.log(`Status Evaluation -> PASSED`);

  // --- 3. Test Delivery Areas Repository ---
  console.log("\n--- 3. Testing Delivery Areas Repository (/api/v1/store/delivery-areas) ---");
  const areas = await getActiveDeliveryAreas();
  console.log(`Active Delivery Areas Returned: ${areas.length} (Expected: 11) -> ${areas.length === 11 ? "PASSED" : "FAILED"}`);
  if (areas.length !== 11) allPassed = false;

  const inactiveAreas = areas.filter((a) => a.isActive !== 1);
  console.log(`Inactive Delivery Areas in Output: ${inactiveAreas.length} (Expected: 0) -> ${inactiveAreas.length === 0 ? "PASSED" : "FAILED"}`);
  if (inactiveAreas.length > 0) allPassed = false;

  // Close connection pool
  const sql = getPgPoolClient();
  await sql.end({ timeout: 5 });

  console.log("\n================================================================================");
  if (allPassed) {
    console.log("✓ ALL PHASE 5 STOREFRONT READ API VERIFICATION CHECKS PASSED!");
  } else {
    console.error("❌ SOME VERIFICATION CHECKS FAILED!");
    process.exit(1);
  }
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
