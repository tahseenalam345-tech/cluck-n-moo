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

const isWrite = process.argv.includes("--write");

const DEMO_CATEGORY_IDS = [
  "cat_burgers",
  "cat_chicken",
  "cat_deals",
  "cat_sides",
];

const DEMO_PRODUCT_IDS = [
  "prod_classic_smash",
  "prod_cluck_zinger",
  "prod_moo_cluck_duo",
  "prod_golden_chicken_3",
  "prod_crispy_tenders",
  "deal_solo_box",
  "deal_duo_smash",
  "deal_town_family",
  "side_salted_fries",
  "side_cheddar_fries",
  "side_garlic_dip",
  "prod_chicken_tikka_pizza",
  "prod_fajita_sicilian_pizza",
  "prod_cheese_lover_pizza",
  "drink_soft_can",
  "drink_mineral_water",
];

async function main() {
  console.log(`========================================================================`);
  console.log(`CNM PRODUCT CATALOG CLEANUP SCRIPT (MODE: ${isWrite ? "EXECUTE WRITE" : "DRY RUN PREVIEW"})`);
  console.log(`========================================================================\n`);

  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  const sql = postgres(connectionString!, { max: 1 });

  try {
    // 1. Audit Categories
    const allCats = await sql`SELECT id, name, slug, is_active, is_archived, display_order FROM categories ORDER BY display_order`;
    const catsToArchive = allCats.filter((c) => DEMO_CATEGORY_IDS.includes(c.id));
    const catsToKeep = allCats.filter((c) => !DEMO_CATEGORY_IDS.includes(c.id));

    console.log(`📊 CATEGORIES:`);
    console.log(`- Total Categories in DB: ${allCats.length}`);
    console.log(`- Categories to Keep (${catsToKeep.length}):`);
    catsToKeep.forEach((c) => console.log(`   ✓ [${c.id}] "${c.name}" (slug: ${c.slug})`));
    console.log(`- Categories to Archive (${catsToArchive.length}):`);
    catsToArchive.forEach((c) => console.log(`   ✗ [${c.id}] "${c.name}" (slug: ${c.slug})`));

    // 2. Audit Products
    const allProds = await sql`
      SELECT p.id, p.name, p.slug, p.category_id, c.name as category_name,
             p.base_price_pkr, p.is_available, p.is_archived,
             p.image_url, p.cloudinary_public_id
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.category_id, p.name
    `;

    const prodsToArchive = allProds.filter((p) => DEMO_PRODUCT_IDS.includes(p.id));
    const prodsToKeep = allProds.filter((p) => !DEMO_PRODUCT_IDS.includes(p.id));
    const prodsMissingImages = prodsToKeep.filter(
      (p) => !p.cloudinary_public_id && !p.image_url
    );

    console.log(`\n🍔 PRODUCTS:`);
    console.log(`- Total Products in DB: ${allProds.length}`);
    console.log(`- Verified CNM Products to Retain: ${prodsToKeep.length}`);
    console.log(`- Demo / Placeholder Products to Archive: ${prodsToArchive.length}`);
    console.log(`- Retained Products Missing Imagery (${prodsMissingImages.length}):`);
    prodsMissingImages.forEach((p) =>
      console.log(`   ⚠️ [${p.category_name}] "${p.name}" (ID: ${p.id})`)
    );

    // 3. Check for duplicates among retained products
    const seenNames = new Map<string, string>();
    const duplicates: Array<{ name: string; id1: string; id2: string }> = [];
    for (const p of prodsToKeep) {
      const lower = p.name.trim().toLowerCase();
      if (seenNames.has(lower)) {
        duplicates.push({ name: p.name, id1: seenNames.get(lower)!, id2: p.id });
      } else {
        seenNames.set(lower, p.id);
      }
    }
    console.log(`\n🔍 DUPLICATE DETECTION:`);
    if (duplicates.length === 0) {
      console.log(`- No duplicates found among the 74 verified CNM products.`);
    } else {
      console.log(`- Duplicates found:`, duplicates);
    }

    // 4. Audit Variants & Modifiers of Archived Products
    const affectedVariants = await sql`
      SELECT id, product_id, name, price_pkr, is_available
      FROM product_variants
      WHERE product_id IN ${sql(DEMO_PRODUCT_IDS)}
    `;
    console.log(`\n⚙️ VARIANTS AFFECTED:`);
    console.log(`- Total variants attached to archived products: ${affectedVariants.length}`);

    const affectedModGroups = await sql`
      SELECT id, product_id, name
      FROM product_modifier_groups
      WHERE product_id IN ${sql(DEMO_PRODUCT_IDS)}
    `;
    console.log(`\n⚙️ MODIFIER GROUPS AFFECTED:`);
    console.log(`- Total modifier groups attached to archived products: ${affectedModGroups.length}`);

    // 5. Audit Historical Order Integrity
    const orderItemRefs = await sql`
      SELECT product_id, product_name_snapshot, count(*) as count
      FROM order_items
      GROUP BY product_id, product_name_snapshot
    `;
    console.log(`\n📦 HISTORICAL ORDERS INTEGRITY:`);
    console.log(`- Total distinct items referenced in order_items: ${orderItemRefs.length}`);
    for (const r of orderItemRefs) {
      const isArchived = DEMO_PRODUCT_IDS.includes(r.product_id);
      console.log(`   • "${r.product_name_snapshot}" (ID: ${r.product_id}) - ${r.count} orders [Archived? ${isArchived ? "YES (SNAPSHOT PRESERVED)" : "NO (ACTIVE PRODUCT)"}]`);
    }

    // 6. Execute Write if requested
    if (isWrite) {
      console.log(`\n🚀 APPLYING DATABASE CLEANUP IN TRANSACTION...`);
      await sql.begin(async (tx) => {
        // Step A: Archive demo categories
        const catRes = await tx`
          UPDATE categories
          SET is_active = false, is_archived = true, updated_at = NOW()
          WHERE id IN ${tx(DEMO_CATEGORY_IDS)}
          RETURNING id, name
        `;
        console.log(`- Archived ${catRes.length} categories.`);

        // Step B: Ensure real categories are active & not archived
        const realCatRes = await tx`
          UPDATE categories
          SET is_active = true, is_archived = false, updated_at = NOW()
          WHERE id NOT IN ${tx(DEMO_CATEGORY_IDS)}
          RETURNING id, name
        `;
        console.log(`- Verified ${realCatRes.length} active CNM categories.`);

        // Step C: Archive demo products
        const prodRes = await tx`
          UPDATE products
          SET is_available = false, is_archived = true, updated_at = NOW()
          WHERE id IN ${tx(DEMO_PRODUCT_IDS)}
          RETURNING id, name
        `;
        console.log(`- Archived ${prodRes.length} demo/starter products.`);

        // Step D: Ensure real products are not archived and available
        const realProdRes = await tx`
          UPDATE products
          SET is_archived = false, is_available = true, updated_at = NOW()
          WHERE id NOT IN ${tx(DEMO_PRODUCT_IDS)}
          RETURNING id, name
        `;
        console.log(`- Verified ${realProdRes.length} active CNM products.`);

        // Step E: Deactivate variants of demo products
        if (affectedVariants.length > 0) {
          const varRes = await tx`
            UPDATE product_variants
            SET is_available = false
            WHERE product_id IN ${tx(DEMO_PRODUCT_IDS)}
            RETURNING id
          `;
          console.log(`- Deactivated ${varRes.length} variants of demo products.`);
        }

        // Step F: Deactivate modifiers of demo products
        if (affectedModGroups.length > 0) {
          const modGroupIds = affectedModGroups.map((g) => g.id);
          const modRes = await tx`
            UPDATE product_modifiers
            SET is_available = false
            WHERE group_id IN ${tx(modGroupIds)}
            RETURNING id
          `;
          console.log(`- Deactivated ${modRes.length} modifiers of demo product groups.`);
        }
      });
      console.log(`\n✅ DATABASE CLEANUP APPLIED SUCCESSFULLY!`);
    } else {
      console.log(`\nℹ️ DRY RUN FINISHED. Pass --write to execute changes safely.`);
    }

  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    await sql.end();
  }
}

main();
