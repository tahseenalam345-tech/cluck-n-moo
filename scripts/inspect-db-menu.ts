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
    const groups = await sql`
      SELECT id, name, product_id, min_selection, max_selection, is_required
      FROM product_modifier_groups
      ORDER BY product_id, name
    `;
    console.log(`TOTAL MODIFIER GROUPS: ${groups.length}`);
    for (const g of groups) {
      console.log(`Group: ${g.id} (${g.name}) for product ${g.product_id} [req: ${g.is_required}, min: ${g.min_selection}, max: ${g.max_selection}]`);
    }

    const mods = await sql`
      SELECT m.id, m.name, m.price_pkr, m.group_id
      FROM product_modifiers m
      ORDER BY m.group_id, m.price_pkr
    `;
    console.log(`\nTOTAL MODIFIERS: ${mods.length}`);
    for (const m of mods) {
      console.log(`  [${m.group_id}] ${m.id} -> ${m.name} (+${m.price_pkr} PKR)`);
    }

  } catch (err) {
    console.error("DB error:", err);
  } finally {
    await sql.end();
  }
}

main();
