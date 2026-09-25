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
  console.log("Connecting to Supabase PostgreSQL...");
  const sql = postgres(connectionString!, { max: 1 });

  try {
    console.log("Creating promotion tables in PostgreSQL...");

    await sql`
      CREATE TABLE IF NOT EXISTS promotions (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        short_description TEXT,
        image_url TEXT NOT NULL,
        cloudinary_public_id TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        starts_at TIMESTAMP WITH TIME ZONE,
        ends_at TIMESTAMP WITH TIME ZONE,
        promotion_type TEXT NOT NULL DEFAULT 'bundle',
        fixed_price_pkr INTEGER NOT NULL,
        badge_text TEXT,
        terms_text TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id TEXT PRIMARY KEY,
        promotion_id TEXT NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
        rule_type TEXT NOT NULL,
        min_selections INTEGER NOT NULL DEFAULT 1,
        max_selections INTEGER NOT NULL DEFAULT 1,
        required BOOLEAN NOT NULL DEFAULT true,
        rule_label TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS promotion_rule_options (
        id TEXT PRIMARY KEY,
        promotion_rule_id TEXT NOT NULL REFERENCES promotion_rules(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
        product_variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
        modifier_id TEXT REFERENCES product_modifiers(id) ON DELETE SET NULL,
        option_title TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        price_adjustment_pkr INTEGER NOT NULL DEFAULT 0,
        display_order INTEGER NOT NULL DEFAULT 0,
        is_available BOOLEAN NOT NULL DEFAULT true
      );
    `;

    // Create Indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_promotions_slug ON promotions(slug);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(is_active);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promotion_rules_promo_id ON promotion_rules(promotion_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_promo_rule_options_rule_id ON promotion_rule_options(promotion_rule_id);`;

    console.log("Tables created successfully. Now seeding promotions...");

    // Clear existing promotions to ensure fresh idempotency
    await sql`DELETE FROM promotions;`;

    // ==========================================
    // PROMOTION 1: PIZZA TREAT (2,999 PKR)
    // ==========================================
    const promo1Id = "promo_pizza_treat";
    await sql`
      INSERT INTO promotions (
        id, slug, title, short_description, image_url, cloudinary_public_id,
        display_order, is_active, promotion_type, fixed_price_pkr, badge_text, terms_text
      ) VALUES (
        ${promo1Id},
        'pizza-treat',
        'Pizza Treat Feast',
        'Tray Pizza + 6 Pcs Oven Baked Wings + Regular Fries with Dip + 1.5L Soft Drink',
        'https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_1_fthixm',
        'promotion_1_fthixm',
        1,
        true,
        'bundle',
        2999,
        'ONLY 2999',
        'Valid for Dine-in, Takeaway, and Delivery. Extra dips and stuffed crust available at menu prices.'
      );
    `;

    // Rule 1: Choose Tray Pizza Flavor
    const p1r1Id = "p1_rule_tray_pizza";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p1r1Id}, ${promo1Id}, 'product_choice', 1, 1, true, 'Choose Tray Pizza Flavor', 1);
    `;
    const pizzaFlavors = [
      { id: "prod_flaming_tikka_pizza", name: "Flaming Tikka Tray Pizza" },
      { id: "prod_behari_kebab_pizza", name: "Behari Kebab Tray Pizza" },
      { id: "prod_hot_pepperoni_pizza", name: "Hot Pepperoni Tray Pizza" },
      { id: "prod_creamy_alfredo_pizza", name: "Creamy Alfredo Tray Pizza" },
      { id: "prod_secret_cnm_pizza", name: "Secret CNM Tray Pizza" },
      { id: "prod_chicken_tikka_pizza", name: "Chicken Tikka Supreme Tray Pizza" },
      { id: "prod_fajita_sicilian_pizza", name: "Chicken Fajita Sicilian Tray Pizza" },
    ];
    for (let i = 0; i < pizzaFlavors.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${p1r1Id}_opt_${i}`}, ${p1r1Id}, ${pizzaFlavors[i].id}, ${pizzaFlavors[i].name}, 1, 0, ${i + 1});
      `;
    }

    // Rule 2: Baked Wings (Fixed Included)
    const p1r2Id = "p1_rule_baked_wings";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p1r2Id}, ${promo1Id}, 'fixed_item', 1, 1, true, 'Included: Oven Baked Wings (6 Pcs)', 2);
    `;
    await sql`
      INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, product_variant_id, option_title, quantity, price_adjustment_pkr, display_order)
      VALUES (${`${p1r2Id}_opt_0`}, ${p1r2Id}, 'prod_oven_baked_wings', 'var_prod_oven_baked_wings_6_pcs_oven_baked_wings', '6 Pcs Oven Baked Wings', 1, 0, 1);
    `;

    // Rule 3: Fries (Fixed Included)
    const p1r3Id = "p1_rule_fries";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p1r3Id}, ${promo1Id}, 'fixed_item', 1, 1, true, 'Included: Regular Fries with Dip', 3);
    `;
    await sql`
      INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, option_title, quantity, price_adjustment_pkr, display_order)
      VALUES (${`${p1r3Id}_opt_0`}, ${p1r3Id}, 'prod_regular_fries', 'Regular Fries with Dip', 1, 0, 1);
    `;

    // Rule 4: 1.5L Drink Selection
    const p1r4Id = "p1_rule_drink";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p1r4Id}, ${promo1Id}, 'product_choice', 1, 1, true, 'Choose 1.5L Soft Drink', 4);
    `;
    const drinks15L = [
      { name: "Coca-Cola (1.5L)" },
      { name: "Sprite (1.5L)" },
      { name: "Fanta (1.5L)" },
    ];
    for (let i = 0; i < drinks15L.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, product_variant_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${p1r4Id}_opt_${i}`}, ${p1r4Id}, 'prod_soda_woda', 'var_prod_soda_woda_large_bottle_1_5l_', ${drinks15L[i].name}, 1, 0, ${i + 1});
      `;
    }

    // ==========================================
    // PROMOTION 2: YOUR WALLET LOVES THIS DEAL (1,290 PKR Base / 1,850 PKR Large)
    // ==========================================
    const promo2Id = "promo_wallet_deal";
    await sql`
      INSERT INTO promotions (
        id, slug, title, short_description, image_url, cloudinary_public_id,
        display_order, is_active, promotion_type, fixed_price_pkr, badge_text, terms_text
      ) VALUES (
        ${promo2Id},
        'wallet-deal',
        'Your Wallet Loves This Deal',
        'Deal 1: 1 Medium & 1 Ltr Drink (Rs.1290) | Deal 2: 1 Large & 1 Ltr Drink (Rs.1850)',
        'https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_2_ofnzlq',
        'promotion_2_ofnzlq',
        2,
        true,
        'tiered',
        1290,
        'FROM 1290',
        'Deal 1 includes 1 Medium Pizza + 1L Drink for 1,290 PKR. Deal 2 includes 1 Large Pizza + 1L Drink for 1,850 PKR.'
      );
    `;

    // Rule 1: Choose Deal Tier
    const p2r1Id = "p2_rule_tier";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p2r1Id}, ${promo2Id}, 'tier_choice', 1, 1, true, 'Choose Deal Tier', 1);
    `;
    await sql`
      INSERT INTO promotion_rule_options (id, promotion_rule_id, option_title, quantity, price_adjustment_pkr, display_order)
      VALUES (${`${p2r1Id}_opt_med`}, ${p2r1Id}, 'Deal 1: 1 Medium Pizza & 1 Ltr Drink (Rs. 1,290)', 1, 0, 1);
    `;
    await sql`
      INSERT INTO promotion_rule_options (id, promotion_rule_id, option_title, quantity, price_adjustment_pkr, display_order)
      VALUES (${`${p2r1Id}_opt_large`}, ${p2r1Id}, 'Deal 2: 1 Large Pizza & 1 Ltr Drink (Rs. 1,850)', 1, 560, 2);
    `;

    // Rule 2: Choose Pizza Flavor
    const p2r2Id = "p2_rule_flavor";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p2r2Id}, ${promo2Id}, 'product_choice', 1, 1, true, 'Choose Pizza Flavor', 2);
    `;
    const pizzaPicks = [
      { id: "prod_flaming_tikka_pizza", name: "Flaming Tikka Pizza" },
      { id: "prod_behari_kebab_pizza", name: "Behari Kebab Pizza" },
      { id: "prod_hot_pepperoni_pizza", name: "Hot Pepperoni Pizza" },
      { id: "prod_creamy_alfredo_pizza", name: "Creamy Alfredo Pizza" },
      { id: "prod_secret_cnm_pizza", name: "Secret CNM Pizza" },
      { id: "prod_chicken_tikka_pizza", name: "Chicken Tikka Supreme Pizza" },
      { id: "prod_fajita_sicilian_pizza", name: "Chicken Fajita Sicilian Pizza" },
      { id: "prod_cheese_lover_pizza", name: "Four-Cheese Lover Pizza" },
    ];
    for (let i = 0; i < pizzaPicks.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${p2r2Id}_opt_${i}`}, ${p2r2Id}, ${pizzaPicks[i].id}, ${pizzaPicks[i].name}, 1, 0, ${i + 1});
      `;
    }

    // Rule 3: Choose 1L Drink
    const p2r3Id = "p2_rule_drink";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p2r3Id}, ${promo2Id}, 'product_choice', 1, 1, true, 'Choose 1 Liter Drink', 3);
    `;
    const drinks1L = [
      { name: "Pepsi (1 Liter)" },
      { name: "7Up (1 Liter)" },
      { name: "Mirinda (1 Liter)" },
    ];
    for (let i = 0; i < drinks1L.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${p2r3Id}_opt_${i}`}, ${p2r3Id}, 'prod_soda_woda', ${drinks1L[i].name}, 1, 0, ${i + 1});
      `;
    }

    // ==========================================
    // PROMOTION 3: OOPS! THINGS JUST GOT CHEESIER! (990 PKR - Medium Pizza Launch Offer)
    // ==========================================
    const promo3Id = "promo_cheesier_launch";
    await sql`
      INSERT INTO promotions (
        id, slug, title, short_description, image_url, cloudinary_public_id,
        display_order, is_active, promotion_type, fixed_price_pkr, badge_text, terms_text
      ) VALUES (
        ${promo3Id},
        'cheesier-medium-pizza-launch',
        '1 Medium Pizza Launch Offer',
        'Oops! Things Just Got Cheesier! Get 1 Medium Pizza for only Rs. 990.',
        'https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_3_pkzoe9',
        'promotion_3_pkzoe9',
        3,
        true,
        'single',
        990,
        'LAUNCH Rs. 990',
        'Exclusive Launch Offer valid for Medium (10 inch) Pizza only. Small and Large sizes not applicable.'
      );
    `;

    // Rule 1: Choose Medium Pizza Flavor (Strictly locked to Medium)
    const p3r1Id = "p3_rule_medium_pizza";
    await sql`
      INSERT INTO promotion_rules (id, promotion_id, rule_type, min_selections, max_selections, required, rule_label, display_order)
      VALUES (${p3r1Id}, ${promo3Id}, 'product_choice', 1, 1, true, 'Choose Medium (10 inch) Pizza Flavor', 1);
    `;
    const mediumVariants = [
      { prodId: "prod_flaming_tikka_pizza", varId: "var_prod_flaming_tikka_pizza_medium_10_inch_", title: "Flaming Tikka (Medium 10\")" },
      { prodId: "prod_behari_kebab_pizza", varId: "var_prod_behari_kebab_pizza_medium_10_inch_", title: "Behari Kebab (Medium 10\")" },
      { prodId: "prod_hot_pepperoni_pizza", varId: "var_prod_hot_pepperoni_pizza_medium_10_inch_", title: "Hot Pepperoni (Medium 10\")" },
      { prodId: "prod_creamy_alfredo_pizza", varId: "var_prod_creamy_alfredo_pizza_medium_10_inch_", title: "Creamy Alfredo (Medium 10\")" },
      { prodId: "prod_secret_cnm_pizza", varId: "var_prod_secret_cnm_pizza_medium_10_inch_", title: "Secret CNM (Medium 10\")" },
      { prodId: "prod_chicken_tikka_pizza", varId: "var_tikka_med", title: "Chicken Tikka Supreme (Medium 10\")" },
      { prodId: "prod_fajita_sicilian_pizza", varId: "var_fajita_med", title: "Chicken Fajita Sicilian (Medium 10\")" },
      { prodId: "prod_cheese_lover_pizza", varId: "var_cheese_med", title: "Cheesy Four-Cheese Lover (Medium 10\")" },
    ];
    for (let i = 0; i < mediumVariants.length; i++) {
      await sql`
        INSERT INTO promotion_rule_options (id, promotion_rule_id, product_id, product_variant_id, option_title, quantity, price_adjustment_pkr, display_order)
        VALUES (${`${p3r1Id}_opt_${i}`}, ${p3r1Id}, ${mediumVariants[i].prodId}, ${mediumVariants[i].varId}, ${mediumVariants[i].title}, 1, 0, ${i + 1});
      `;
    }

    // ==========================================
    // PROMOTION 4: OOPS! BUY 1 GET 1 PIZZA FREE (1,499 PKR)
    // FLAG: [NEEDS_CONFIRMATION: Pizza size not specified on image] -> is_active = false
    // ==========================================
    const promo4Id = "promo_bogo_pizza";
    await sql`
      INSERT INTO promotions (
        id, slug, title, short_description, image_url, cloudinary_public_id,
        display_order, is_active, promotion_type, fixed_price_pkr, badge_text, terms_text
      ) VALUES (
        ${promo4Id},
        'bogo-pizza-deal',
        'Buy 1 Get 1 Pizza Free',
        'Oops! Buy 1 Get 1 Pizza Free for Rs. 1499 [NEEDS_CONFIRMATION: Pizza Size]',
        'https://res.cloudinary.com/duo55lhwh/image/upload/c_limit,w_1200,f_auto,q_auto/promotion_4_z7vq6y',
        'promotion_4_z7vq6y',
        4,
        false,
        'bundle',
        1499,
        'BOGO 1499',
        '[NEEDS_CONFIRMATION] Stored in database but kept inactive until store owner confirms pizza size (Small, Medium, or Large).'
      );
    `;

    console.log("Seeding completed successfully!");

    const finalPromos = await sql`SELECT id, slug, title, fixed_price_pkr, is_active FROM promotions ORDER BY display_order`;
    console.log("Current database promotions:", finalPromos);

  } catch (err) {
    console.error("Migration/Seeding Error:", err);
  } finally {
    await sql.end();
  }
}

main();
