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
    const p = await sql`
      SELECT p.id, p.name, p.category_id, c.name as category_name,
             p.is_featured, p.is_available, p.is_archived, p.display_order
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_featured = true
      ORDER BY c.display_order ASC, p.display_order ASC
    `;
    console.log(`TOTAL PRODUCTS MARKED is_featured = true: ${p.length}`);
    console.table(p);
  } finally {
    await sql.end();
  }
}

main();
