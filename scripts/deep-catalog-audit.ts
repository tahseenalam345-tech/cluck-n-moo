import postgres from "postgres";
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

async function main() {
  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  const sql = postgres(connectionString!, { max: 1 });

  try {
    console.log("=== 1. VARIANTS LINKED TO DEMO PRODUCTS ===");
    const demoProductIds = [
      'prod_classic_smash', 'prod_cluck_zinger', 'prod_moo_cluck_duo',
      'prod_golden_chicken_3', 'prod_crispy_tenders',
      'deal_solo_box', 'deal_duo_smash', 'deal_town_family',
      'side_salted_fries', 'side_cheddar_fries', 'side_garlic_dip',
      'prod_chicken_tikka_pizza', 'prod_fajita_sicilian_pizza', 'prod_cheese_lover_pizza',
      'drink_soft_can', 'drink_mineral_water'
    ];

    const demoVariants = await sql`
      SELECT v.id, v.product_id, v.name, v.price_pkr, v.is_available, p.name as product_name
      FROM product_variants v
      JOIN products p ON p.id = v.product_id
      WHERE v.product_id IN ${sql(demoProductIds)}
    `;
    console.log(`Variants for demo products (${demoVariants.length}):`);
    console.table(demoVariants);

    console.log("\n=== 2. MODIFIER GROUPS LINKED TO DEMO PRODUCTS ===");
    const demoModGroups = await sql`
      SELECT g.id, g.product_id, g.name, p.name as product_name
      FROM product_modifier_groups g
      JOIN products p ON p.id = g.product_id
      WHERE g.product_id IN ${sql(demoProductIds)}
    `;
    console.log(`Modifier groups for demo products (${demoModGroups.length}):`);
    console.table(demoModGroups);

    console.log("\n=== 3. ALL PROMOTIONS ===");
    const promos = await sql`
      SELECT id, title, is_active, display_order, cloudinary_public_id, image_url
      FROM promotions
      ORDER BY display_order ASC
    `;
    console.table(promos);

    console.log("\n=== 5. RETENTION CHECK: MISSING IMAGES AMONG REAL 74 PRODUCTS ===");
    const missingImg = await sql`
      SELECT id, name, slug, category_id, base_price_pkr, image_url, cloudinary_public_id
      FROM products
      WHERE id NOT IN ${sql(demoProductIds)}
        AND (image_url IS NULL OR image_url = '' OR cloudinary_public_id IS NULL OR cloudinary_public_id = '')
      ORDER BY category_id, name
    `;
    console.log(`Real products missing images (${missingImg.length}):`);
    console.table(missingImg);

  } catch (err) {
    console.error("Deep audit error:", err);
  } finally {
    await sql.end();
  }
}

main();
