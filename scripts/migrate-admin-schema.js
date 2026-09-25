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

async function runMigration() {
  const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL_DIRECT;
  console.log('Connecting to PostgreSQL...');
  const sql = postgres(connectionString, { max: 1 });

  try {
    console.log('Applying Admin Control Center schema enhancements...');

    // 1. Extend products
    await sql`
      ALTER TABLE products 
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_products_archived ON products(is_archived);`;
    console.log('✓ Products table enhanced with is_archived, updated_at, tags');

    // 2. Extend categories
    await sql`
      ALTER TABLE categories 
        ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS image_url TEXT;
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_archived ON categories(is_archived);`;
    console.log('✓ Categories table enhanced with is_archived, updated_at, image_url');

    // 3. Create audit_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        user_email TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);`;
    console.log('✓ audit_logs table created');

    // 4. Create media_assets table
    await sql`
      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        public_id TEXT NOT NULL UNIQUE,
        secure_url TEXT NOT NULL,
        folder TEXT NOT NULL DEFAULT 'cnm/menu',
        format TEXT,
        width INTEGER,
        height INTEGER,
        bytes INTEGER,
        alt_text TEXT,
        uploaded_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_assets_folder ON media_assets(folder);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_media_assets_created ON media_assets(created_at DESC);`;
    console.log('✓ media_assets table created');

    // 5. Populate media_assets with existing product Cloudinary images if not already populated
    const existingImages = await sql`
      SELECT cloudinary_public_id, image_url, image_alt_text
      FROM products
      WHERE cloudinary_public_id IS NOT NULL AND cloudinary_public_id != '';
    `;

    for (const img of existingImages) {
      const id = `med_${img.cloudinary_public_id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await sql`
        INSERT INTO media_assets (id, public_id, secure_url, folder, alt_text)
        VALUES (${id}, ${img.cloudinary_public_id}, ${img.image_url || ''}, 'cnm/menu', ${img.image_alt_text || ''})
        ON CONFLICT (public_id) DO NOTHING;
      `;
    }
    console.log(`✓ Synchronized ${existingImages.length} existing food images into media_assets library`);

    console.log('Migration completed successfully!');
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);
