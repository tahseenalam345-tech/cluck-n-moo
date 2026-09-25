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

async function activatePromo4() {
  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  console.log("Connecting to Supabase PostgreSQL...");
  const sql = postgres(connectionString!, { max: 1 });

  try {
    const promo4Rows = await sql`
      SELECT id FROM promotions WHERE slug = 'bogo-pizza-deal' LIMIT 1;
    `;
    if (promo4Rows.length === 0) {
      throw new Error("Promotion 4 (bogo-pizza-deal) not found in DB!");
    }
    const promo4Id = promo4Rows[0].id;
    console.log(`Found Promotion 4 with ID: ${promo4Id}. Activating now...`);

    // 1. Update promotion to is_active = true
    await sql`
      UPDATE promotions
      SET 
        is_active = true,
        title = 'Buy 1 Get 1 Pizza Free',
        short_description = 'Oops! Buy 1 Get 1 Pizza Free for Rs. 1499. Choose any 2 delicious pizzas!',
        badge_text = 'BOGO 1499',
        terms_text = 'Buy 1 Get 1 Pizza Free for Rs. 1499. Valid for dine-in, takeaway, and delivery.',
        updated_at = NOW()
      WHERE id = ${promo4Id};
    `;

    // 2. Clear old rules if any
    await sql`DELETE FROM promotion_rule_options WHERE promotion_rule_id LIKE 'p4_%';`;
    await sql`DELETE FROM promotion_rules WHERE promotion_id = ${promo4Id};`;

    // 3. Define pizza flavor variants
    const pizzaVariants = [
      { prodId: "prod_flaming_tikka_pizza", varId: "var_prod_flaming_tikka_pizza_medium_10_inch_", title: "Flaming Tikka (Medium 10\")" },
      { prodId: "prod_behari_kebab_pizza", varId: "var_prod_behari_kebab_pizza_medium_10_inch_", title: "Behari Kebab (Medium 10\")" },
      { prodId: "prod_hot_pepperoni_pizza", varId: "var_prod_hot_pepperoni_pizza_medium_10_inch_", title: "Hot Pepperoni (Medium 10\")" },
      { prodId: "prod_creamy_alfredo_pizza", varId: "var_prod_creamy_alfredo_pizza_medium_10_inch_", title: "Creamy Alfredo (Medium 10\")" },
      { prodId: "prod_secret_cnm_pizza", varId: "var_prod_secret_cnm_pizza_medium_10_inch_", title: "Secret CNM (Medium 10\")" },
      { prodId: "prod_chicken_tikka_pizza", varId: "var_tikka_med", title: "Chicken Tikka Supreme (Medium 10\")" },
      { prodId: "prod_fajita_sicilian_pizza", varId: "var_fajita_med", title: "Chicken Fajita Sicilian (Medium 10\")" },
      { prodId: "prod_cheese_lover_pizza", varId: "var_cheese_med", title: "Cheesy Four-Cheese Lover (Medium 10\")" },
    ];

    // Rule 1: Choose 1st Pizza Flavor
    const r1Id = "p4_rule_pizza_1";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${r1Id}, ${promo4Id}, 'product_choice', 1, 1, true, 'Choose 1st Pizza Flavor', 1);
    `;
    for (let i = 0; i < pizzaVariants.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, product_variant_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${r1Id}_opt_${i}`}, ${r1Id}, ${pizzaVariants[i].prodId}, ${pizzaVariants[i].varId}, ${pizzaVariants[i].title}, 1, 0, ${i + 1});
      `;
    }

    // Rule 2: Choose 2nd (Free) Pizza Flavor
    const r2Id = "p4_rule_pizza_2";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${r2Id}, ${promo4Id}, 'product_choice', 1, 1, true, 'Choose 2nd (Free) Pizza Flavor', 2);
    `;
    for (let i = 0; i < pizzaVariants.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, product_variant_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${r2Id}_opt_${i}`}, ${r2Id}, ${pizzaVariants[i].prodId}, ${pizzaVariants[i].varId}, ${pizzaVariants[i].title}, 1, 0, ${i + 1});
      `;
    }

    console.log("Promotion 4 activated successfully with 2 pizza flavor choice rules!");

    // Verify
    const activePromos = await sql`
      SELECT id, slug, title, fixed_price_pkr, is_active FROM promotions WHERE is_active = true ORDER BY display_order;
    `;
    console.log(`Total active promotions now: ${activePromos.length}`);
    activePromos.forEach((p) => console.log(`  - [${p.slug}] ${p.title} (Rs. ${p.fixed_price_pkr})`));
  } finally {
    await sql.end();
  }
}

activatePromo4()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to activate promotion 4:", err);
    process.exit(1);
  });
