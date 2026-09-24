import { getDb } from "../src/db";

const db = getDb();
const categories = db.prepare("SELECT * FROM categories ORDER BY display_order ASC").all() as any[];
const products = db.prepare("SELECT id, category_id, name, slug, is_available FROM products ORDER BY display_order ASC").all() as any[];

console.log("================================================================================");
console.log(`📊 DATABASE CATEGORIES AUDIT (${categories.length} Categories Total)`);
console.log("================================================================================\n");

for (const c of categories) {
  const prods = products.filter((p) => p.category_id === c.id);
  const activeProds = prods.filter((p) => p.is_available === 1);
  const archivedProds = prods.filter((p) => p.is_available === 0);

  let statusType = "OFFICIAL";
  if (["cat_burgers", "cat_chicken", "cat_deals", "cat_sides"].includes(c.id)) {
    statusType = "STARTER_DEMO";
  } else if (activeProds.length === 0) {
    statusType = "EMPTY";
  }

  console.log(`[${statusType}] Category ID: ${c.id}`);
  console.log(`   Name: "${c.name}", Slug: "${c.slug}", Active in DB: ${c.is_active}, Order: ${c.display_order}`);
  console.log(`   Active Products (${activeProds.length}): ${activeProds.map((p) => p.name).join(", ") || "(NONE)"}`);
  if (archivedProds.length > 0) {
    console.log(`   Archived Products (${archivedProds.length}): ${archivedProds.map((p) => p.name).join(", ")}`);
  }
  console.log("");
}
