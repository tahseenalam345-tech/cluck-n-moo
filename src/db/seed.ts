import { sqlite } from "./index";
import { INITIAL_DELIVERY_AREAS, BRAND } from "../lib/constants";

export async function runSeed() {
  console.log("🌱 Seeding Cluck N Moo (CNM) database...");

  // Create tables if they don't exist yet
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS delivery_areas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      delivery_fee_pkr INTEGER NOT NULL DEFAULT 100,
      estimated_delivery_mins INTEGER NOT NULL DEFAULT 40,
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      image_url TEXT,
      base_price_pkr INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_variants (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_pkr INTEGER NOT NULL,
      is_available INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_modifier_groups (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      min_selection INTEGER NOT NULL DEFAULT 0,
      max_selection INTEGER NOT NULL DEFAULT 1,
      is_required INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS product_modifiers (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL REFERENCES product_modifier_groups(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price_pkr INTEGER NOT NULL DEFAULT 0,
      is_available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'CUSTOMER',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      delivery_area_id TEXT REFERENCES delivery_areas(id),
      address_line TEXT NOT NULL,
      landmark TEXT,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL UNIQUE,
      tracking_token TEXT NOT NULL UNIQUE,
      user_id TEXT REFERENCES users(id),
      order_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'New',
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      payment_status TEXT NOT NULL DEFAULT 'PENDING',
      payment_location TEXT,
      customer_name_snapshot TEXT NOT NULL,
      customer_phone_snapshot TEXT NOT NULL,
      customer_email_snapshot TEXT,
      delivery_area_name_snapshot TEXT,
      delivery_address_snapshot TEXT,
      delivery_landmark_snapshot TEXT,
      dine_in_preferred_time TEXT,
      special_instructions TEXT,
      subtotal_pkr INTEGER NOT NULL,
      delivery_fee_pkr INTEGER NOT NULL DEFAULT 0,
      total_pkr INTEGER NOT NULL,
      assigned_rider_id TEXT REFERENCES users(id),
      confirmed_by_staff_id TEXT REFERENCES users(id),
      cancellation_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      product_name_snapshot TEXT NOT NULL,
      variant_name_snapshot TEXT,
      unit_price_snapshot_pkr INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      line_total_pkr INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_item_modifiers (
      id TEXT PRIMARY KEY,
      order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
      modifier_id TEXT REFERENCES product_modifiers(id),
      modifier_name_snapshot TEXT NOT NULL,
      price_snapshot_pkr INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS order_status_history (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by_user_id TEXT,
      note TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restaurant_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restaurant_schedules (
      id TEXT PRIMARY KEY,
      day_of_week INTEGER NOT NULL,
      open_time TEXT NOT NULL DEFAULT '12:01',
      close_time TEXT NOT NULL DEFAULT '02:00',
      is_closed INTEGER NOT NULL DEFAULT 0
    );
  `);

  const now = new Date().toISOString();

  // 1. Seed Restaurant Settings
  const settingsData = [
    { key: "restaurant_name", value: BRAND.name },
    { key: "short_name", value: BRAND.shortName },
    { key: "tagline", value: BRAND.tagline },
    { key: "phone", value: BRAND.branch.phone },
    { key: "address", value: BRAND.branch.address },
    { key: "lat", value: BRAND.branch.coordinates.lat.toString() },
    { key: "lng", value: BRAND.branch.coordinates.lng.toString() },
    { key: "default_delivery_fee", value: BRAND.defaults.deliveryFeePkr.toString() },
    { key: "manual_override_status", value: "AUTO" }, // AUTO | FORCE_OPEN | FORCE_CLOSED
    { key: "announcement_banner", value: "" },
  ];

  for (const item of settingsData) {
    sqlite
      .prepare(
        `INSERT INTO restaurant_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(item.key, item.value, now);
  }

  // 2. Seed Restaurant Daily Schedules (0 = Sunday .. 6 = Saturday)
  for (let day = 0; day <= 6; day++) {
    const scheduleId = `sched_day_${day}`;
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO restaurant_schedules (id, day_of_week, open_time, close_time, is_closed)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(scheduleId, day, "12:01", "02:00", 0);
  }

  // 3. Seed Initial Delivery Areas
  INITIAL_DELIVERY_AREAS.forEach((areaName, index) => {
    const slug = areaName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const id = `area_${slug}`;
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO delivery_areas (id, name, slug, delivery_fee_pkr, estimated_delivery_mins, is_active, display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, areaName, slug, 100, 40, 1, index, now, now);
  });

  // 4. Seed Default Users (Admin, Staff, Rider)
  sqlite
    .prepare(
      `INSERT OR IGNORE INTO users (id, phone, email, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run("usr_admin", "0302-1949067", "admin@clucknmoo.pk", "cnm_admin_secret", "CNM Admin (HQ)", "ADMIN", 1, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO users (id, phone, email, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run("usr_kitchen", "0302-1949068", "kitchen@clucknmoo.pk", "cnm_kitchen_pin", "Kitchen Line Staff", "KITCHEN_STAFF", 1, now);

  sqlite
    .prepare(
      `INSERT OR IGNORE INTO users (id, phone, email, password_hash, full_name, role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run("usr_rider_1", "0300-9876543", "rider1@clucknmoo.pk", "cnm_rider_pin", "Tariq Mahmood (Rider 1)", "RIDER", 1, now);

  // 5. Seed Menu Categories
  const categorySeeds = [
    { id: "cat_burgers", name: "Smash & Zinger Burgers", slug: "burgers", order: 0 },
    { id: "cat_chicken", name: "Crispy Chicken & Tenders", slug: "crispy-chicken", order: 1 },
    { id: "cat_pizzas", name: "Artisan Oven Pizzas", slug: "pizzas", order: 2 },
    { id: "cat_deals", name: "Exclusive Value Deals", slug: "deals", order: 3 },
    { id: "cat_sides", name: "Fries & Signature Dips", slug: "sides-dips", order: 4 },
    { id: "cat_drinks", name: "Chilled Beverages", slug: "beverages", order: 5 },
  ];

  for (const cat of categorySeeds) {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO categories (id, name, slug, display_order, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(cat.id, cat.name, cat.slug, cat.order, 1, now);
  }

  // 6. Seed Foundational Menu Items
  const productSeeds = [
    // Burgers
    {
      id: "prod_classic_smash",
      catId: "cat_burgers",
      name: "The Classic Smash Burger",
      slug: "classic-smash-burger",
      description: "100% pure seasoned beef patty smashed crisp, melted cheddar, crunchy dill pickles, diced onions & house Moo sauce on toasted brioche.",
      basePrice: 550,
      featured: 1,
      order: 0,
      variants: [
        { id: "var_smash_single", name: "Single Patty", price: 550 },
        { id: "var_smash_double", name: "Double Patty & Double Cheese", price: 750 },
      ],
      modifiers: {
        group: { id: "mod_grp_smash", name: "Add Extras", min: 0, max: 2 },
        items: [
          { id: "mod_extra_cheese", name: "Extra Cheddar Slice", price: 80 },
          { id: "mod_jalapeno", name: "Spicy Jalapeños", price: 50 },
        ],
      },
    },
    {
      id: "prod_cluck_zinger",
      catId: "cat_burgers",
      name: "Crispy Cluck Zinger",
      slug: "crispy-cluck-zinger",
      description: "Tender whole chicken breast double hand-breaded in CNM spicy batter, shredded iceberg, and secret spicy garlic mayo.",
      basePrice: 480,
      featured: 1,
      order: 1,
      variants: [
        { id: "var_zinger_reg", name: "Regular Crunch", price: 480 },
        { id: "var_zinger_mega", name: "Mega Fillet + Cheese", price: 650 },
      ],
      modifiers: {
        group: { id: "mod_grp_zinger", name: "Sauce & Extras", min: 0, max: 2 },
        items: [
          { id: "mod_zinger_cheese", name: "Melted Cheese Slice", price: 80 },
          { id: "mod_zinger_garlic_dip", name: "Side Garlic Mayo Dip", price: 70 },
        ],
      },
    },
    {
      id: "prod_moo_cluck_duo",
      catId: "cat_burgers",
      name: "Moo & Cluck Duo Monster",
      slug: "moo-cluck-duo-monster",
      description: "The ultimate showdown: crisp smash beef patty stacked together with golden crispy fried chicken fillet, double cheese & duo sauces.",
      basePrice: 980,
      featured: 1,
      order: 2,
    },

    // Chicken & Tenders
    {
      id: "prod_golden_chicken_3",
      catId: "cat_chicken",
      name: "Golden Fried Chicken (3 Pcs)",
      slug: "golden-fried-chicken-3pcs",
      description: "3 pieces of freshly marinated, juicy chicken pressure-fried to a golden crunch with our secret 11-spice rub.",
      basePrice: 650,
      featured: 0,
      order: 0,
    },
    {
      id: "prod_crispy_tenders",
      catId: "cat_chicken",
      name: "Crispy Chicken Tenders (4 Pcs)",
      slug: "crispy-chicken-tenders-4pcs",
      description: "Pure tenderloin strips, hand-battered and served hot with choice of house dipping sauce.",
      basePrice: 520,
      featured: 1,
      order: 1,
    },

    // Artisan Pizzas
    {
      id: "prod_chicken_tikka_pizza",
      catId: "cat_pizzas",
      name: "Chicken Tikka Supreme Pizza",
      slug: "chicken-tikka-supreme-pizza",
      description: "Spicy Pakistani chicken tikka chunks, mozzarella cheese, onions, capsicum, and signature herb pizza sauce.",
      basePrice: 850,
      featured: 1,
      order: 0,
      variants: [
        { id: "var_tikka_small", name: "Small (7 inch)", price: 850 },
        { id: "var_tikka_med", name: "Medium (10 inch)", price: 1350 },
        { id: "var_tikka_large", name: "Large (13 inch)", price: 1850 },
      ],
      modifiers: {
        group: { id: "mod_grp_pizza_tikka", name: "Crust Choice", min: 0, max: 1 },
        items: [
          { id: "mod_cheese_burst", name: "Stuffed Cheese Burst Crust", price: 200 },
          { id: "mod_kabab_crust", name: "Spicy Kabab Crust", price: 250 },
        ],
      },
    },
    {
      id: "prod_fajita_sicilian_pizza",
      catId: "cat_pizzas",
      name: "Chicken Fajita Sicilian Pizza",
      slug: "chicken-fajita-sicilian-pizza",
      description: "Tender Mexican fajita chicken strips, sweet green peppers, olives, mushrooms, melted mozzarella, and oregano sprinkle.",
      basePrice: 850,
      featured: 1,
      order: 1,
      variants: [
        { id: "var_fajita_small", name: "Small (7 inch)", price: 850 },
        { id: "var_fajita_med", name: "Medium (10 inch)", price: 1350 },
        { id: "var_fajita_large", name: "Large (13 inch)", price: 1850 },
      ],
    },
    {
      id: "prod_cheese_lover_pizza",
      catId: "cat_pizzas",
      name: "Cheesy Four-Cheese Lover",
      slug: "cheesy-four-cheese-lover-pizza",
      description: "Overflowing with golden mozzarella, aged cheddar, parmesan dust, and rich herb tomato sauce.",
      basePrice: 790,
      featured: 0,
      order: 2,
      variants: [
        { id: "var_cheese_small", name: "Small (7 inch)", price: 790 },
        { id: "var_cheese_med", name: "Medium (10 inch)", price: 1250 },
        { id: "var_cheese_large", name: "Large (13 inch)", price: 1750 },
      ],
    },


    // Exclusive Deals
    {
      id: "deal_solo_box",
      catId: "cat_deals",
      name: "CNM Solo Box Deal",
      slug: "cnm-solo-box-deal",
      description: "1 Crispy Cluck Zinger + 1 Pc Golden Fried Chicken + Regular Salted Fries + 345ml Chilled Drink.",
      basePrice: 890,
      featured: 1,
      order: 0,
    },
    {
      id: "deal_duo_smash",
      catId: "cat_deals",
      name: "Duo Smash Feast",
      slug: "duo-smash-feast",
      description: "2 Classic Smash Burgers + 1 Large Crinkle Fries + 2 Chilled Drinks (345ml).",
      basePrice: 1450,
      featured: 1,
      order: 1,
    },
    {
      id: "deal_town_family",
      catId: "cat_deals",
      name: "Juiciest in Town Family Feast",
      slug: "town-family-feast",
      description: "4 Burgers (2 Smash + 2 Cluck Zingers) + 4 Pcs Golden Fried Chicken + 2 Large Fries + 1.5 Liter Drink.",
      basePrice: 2850,
      featured: 1,
      order: 2,
    },

    // Sides & Dips
    {
      id: "side_salted_fries",
      catId: "cat_sides",
      name: "Classic Golden Fries",
      slug: "classic-golden-fries",
      description: "Crispy, hot, salted golden fries made fresh per order.",
      basePrice: 250,
      featured: 0,
      order: 0,
    },
    {
      id: "side_cheddar_fries",
      catId: "cat_sides",
      name: "Melted Cheese & Jalapeno Loaded Fries",
      slug: "cheddar-jalapeno-loaded-fries",
      description: "Crinkle cut fries drenched in hot liquid cheddar cheese sauce and fiery sliced jalapeños.",
      basePrice: 420,
      featured: 1,
      order: 1,
    },
    {
      id: "side_garlic_dip",
      catId: "cat_sides",
      name: "Signature Garlic Mayo Dip",
      slug: "signature-garlic-mayo-dip",
      description: "House-crafted creamy garlic herb dipping sauce.",
      basePrice: 70,
      featured: 0,
      order: 2,
    },

    // Beverages
    {
      id: "drink_soft_can",
      catId: "cat_drinks",
      name: "Chilled Soft Drink (345ml)",
      slug: "chilled-soft-drink-345ml",
      description: "Choice of Pepsi, 7Up, Mirinda, or Mountain Dew.",
      basePrice: 120,
      featured: 0,
      order: 0,
    },
    {
      id: "drink_mineral_water",
      catId: "cat_drinks",
      name: "Mineral Water (500ml)",
      slug: "mineral-water-500ml",
      description: "Pure chilled drinking water.",
      basePrice: 70,
      featured: 0,
      order: 1,
    },
  ];

  for (const p of productSeeds) {
    sqlite
      .prepare(
        `INSERT OR IGNORE INTO products (id, category_id, name, slug, description, image_url, base_price_pkr, is_featured, is_available, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(p.id, p.catId, p.name, p.slug, p.description, "", p.basePrice, p.featured, 1, p.order, now);

    if (p.variants) {
      p.variants.forEach((v, idx) => {
        sqlite
          .prepare(
            `INSERT OR IGNORE INTO product_variants (id, product_id, name, price_pkr, is_available, display_order)
             VALUES (?, ?, ?, ?, ?, ?)`
          )
          .run(v.id, p.id, v.name, v.price, 1, idx);
      });
    }

    if (p.modifiers) {
      const grp = p.modifiers.group;
      sqlite
        .prepare(
          `INSERT OR IGNORE INTO product_modifier_groups (id, product_id, name, min_selection, max_selection, is_required)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(grp.id, p.id, grp.name, grp.min, grp.max, 0);

      p.modifiers.items.forEach((m) => {
        sqlite
          .prepare(
            `INSERT OR IGNORE INTO product_modifiers (id, group_id, name, price_pkr, is_available)
             VALUES (?, ?, ?, ?, ?)`
          )
          .run(m.id, grp.id, m.name, m.price, 1);
      });
    }
  }

  console.log("✅ Cluck N Moo database seed completed successfully!");
}

if (require.main === module) {
  runSeed().catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
}
