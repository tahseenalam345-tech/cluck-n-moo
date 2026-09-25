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
    console.log('Creating special_schedules table for holiday and event hours...');

    await sql`
      CREATE TABLE IF NOT EXISTS special_schedules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_closed_all_day BOOLEAN NOT NULL DEFAULT false,
        open_time TEXT NOT NULL DEFAULT '12:01',
        close_time TEXT NOT NULL DEFAULT '02:00',
        note TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_special_schedules_dates ON special_schedules(start_date, end_date);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_special_schedules_active ON special_schedules(is_active);`;

    console.log('✓ special_schedules table and indexes created successfully!');
  } finally {
    await sql.end();
  }
}

runMigration().catch(console.error);
