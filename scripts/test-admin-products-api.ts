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

async function test() {
  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  const sql = postgres(connectionString!, { max: 1 });

  try {
    // 1. Check active products
    const active = await sql`
      SELECT id, name, category_id, is_available, is_archived
      FROM products
      WHERE is_archived = false
      ORDER BY category_id, name
    `;
    console.log(`Active (non-archived) products in DB: ${active.length} (Expected: 74)`);

    // 2. Check archived products
    const archived = await sql`
      SELECT id, name, category_id, is_available, is_archived
      FROM products
      WHERE is_archived = true
      ORDER BY category_id, name
    `;
    console.log(`Archived products in DB: ${archived.length} (Expected: 16)`);
    archived.forEach(p => console.log(`   - [Archived] ${p.id}: ${p.name}`));

    // 3. Check categories
    const cats = await sql`
      SELECT id, name, is_active, is_archived
      FROM categories
      ORDER BY display_order
    `;
    const activeCats = cats.filter(c => c.is_active && !c.is_archived);
    const archCats = cats.filter(c => c.is_archived);
    console.log(`Active Categories in DB: ${activeCats.length} (Expected: 14)`);
    console.log(`Archived Categories in DB: ${archCats.length} (Expected: 4)`);
    archCats.forEach(c => console.log(`   - [Archived Cat] ${c.id}: ${c.name}`));

  } finally {
    await sql.end();
  }
}

test().catch(console.error);
