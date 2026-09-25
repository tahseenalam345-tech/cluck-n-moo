const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
}

async function auditDb() {
  const sql = postgres(process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT, { max: 1 });
  try {
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log('Public tables:', tables.map(t => t.table_name));

    // Get columns for products
    const prodCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'products'
      ORDER BY ordinal_position;
    `;
    console.log('\nProducts columns:', prodCols);

    // Get columns for categories
    const catCols = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'categories'
      ORDER BY ordinal_position;
    `;
    console.log('\nCategories columns:', catCols);

    // Get deal categories and products
    const dealCats = await sql`
      SELECT id, name, slug FROM categories 
      WHERE slug LIKE '%deal%' OR name ILIKE '%deal%';
    `;
    console.log('\nDeal categories:', dealCats);

    if (dealCats.length > 0) {
      const dealProds = await sql`
        SELECT id, name, category_id, base_price_pkr, is_available 
        FROM products 
        WHERE category_id IN ${sql(dealCats.map(c => c.id))};
      `;
      console.log(`\nDeal products (${dealProds.length}):`, dealProds.slice(0, 10));
    }

    // Get staff profiles
    const staff = await sql`
      SELECT id, full_name, email, phone, role, is_active FROM profiles WHERE role != 'CUSTOMER';
    `;
    console.log('\nStaff profiles:', staff);
  } finally {
    await sql.end();
  }
}

auditDb().catch(console.error);
