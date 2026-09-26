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
    console.log("=== PRE-RESET POPULAR PICKS REPORT ===");
    const currentPopular = await sql`
      SELECT p.id, p.name, p.category_id, c.name as category_name, p.display_order
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_featured = true
      ORDER BY c.display_order ASC, p.display_order ASC
    `;

    console.log(`Found ${currentPopular.length} products currently marked as popular/featured:`);
    for (const item of currentPopular) {
      console.log(`- [${item.id}] ${item.name} (${item.category_name || "No Category"})`);
    }

    console.log("\nResetting all products to is_featured = false...");
    const result = await sql`
      UPDATE products
      SET is_featured = false, updated_at = NOW()
      WHERE is_featured = true
      RETURNING id
    `;

    console.log(`Successfully reset ${result.length} products to is_featured = false.`);

    const remaining = await sql`
      SELECT count(*) as cnt FROM products WHERE is_featured = true
    `;
    console.log(`Remaining popular products in database: ${remaining[0].cnt}`);
  } catch (err) {
    console.error("Error resetting popular picks:", err);
  } finally {
    await sql.end();
  }
}

main();
