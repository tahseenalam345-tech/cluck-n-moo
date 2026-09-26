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
    console.log("=== 1. CATEGORIES ===");
    const categories = await sql`
      SELECT c.id, c.name, c.slug, c.is_active, c.is_archived, c.display_order,
             COUNT(p.id) as product_count,
             COUNT(CASE WHEN p.is_available = true AND (p.is_archived IS NULL OR p.is_archived = false) THEN 1 END) as active_product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id, c.name, c.slug, c.is_active, c.is_archived, c.display_order
      ORDER BY c.display_order ASC, c.name ASC
    `;
    fs.writeFileSync("categories-audit.json", JSON.stringify(categories, null, 2));
    console.log(`Saved ${categories.length} categories to categories-audit.json`);

    const products = await sql`
      SELECT p.id, p.name, p.slug, p.category_id, c.name as category_name,
             p.base_price_pkr, p.is_available, p.is_archived,
             p.image_url IS NOT NULL as has_image,
             p.cloudinary_public_id, p.image_url
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY c.display_order ASC, p.category_id, p.display_order ASC, p.name ASC
    `;
    fs.writeFileSync("products-audit.json", JSON.stringify(products, null, 2));
    console.log(`Saved ${products.length} products to products-audit.json`);


    console.log("\n=== 4. HISTORICAL ORDERS ITEM REFERENCES ===");
    const orderItems = await sql`
      SELECT DISTINCT product_id, product_name_snapshot, COUNT(*) as order_count
      FROM order_items
      GROUP BY product_id, product_name_snapshot
    `;
    console.log(`Order items reference ${orderItems.length} distinct products:`);
    console.table(orderItems);

    console.log("\n=== 5. PROMOTIONS & DEALS ===");
    const promotions = await sql`
      SELECT id, title, discount_type, is_active, display_order, cloudinary_public_id
      FROM promotions
      ORDER BY display_order ASC
    `;
    console.table(promotions);

    console.log("\n=== 6. MODIFIER GROUPS & MODIFIERS ===");
    const modGroups = await sql`
      SELECT g.id, g.name, g.product_id, p.name as product_name, COUNT(m.id) as mod_count
      FROM product_modifier_groups g
      LEFT JOIN products p ON p.id = g.product_id
      LEFT JOIN product_modifiers m ON m.group_id = g.id
      GROUP BY g.id, g.name, g.product_id, p.name
      ORDER BY g.name
    `;
    console.table(modGroups);

  } catch (err) {
    console.error("Audit error:", err);
  } finally {
    await sql.end();
  }
}

main();
