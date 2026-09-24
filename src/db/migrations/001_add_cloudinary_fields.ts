import { getDb } from "../index";

/**
 * Idempotent migration to add Cloudinary asset tracking columns to products table.
 */
export function migrateCloudinaryFields() {
  const db = getDb();
  const columns = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
  const existingColNames = new Set(columns.map((c) => c.name));

  const neededColumns = [
    { name: "cloudinary_public_id", type: "TEXT" },
    { name: "image_alt_text", type: "TEXT" },
    { name: "image_status", type: "TEXT DEFAULT 'PENDING'" },
  ];

  let addedCount = 0;
  for (const col of neededColumns) {
    if (!existingColNames.has(col.name)) {
      db.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type};`);
      addedCount++;
    }
  }

  return { addedCount, totalColumns: existingColNames.size + addedCount };
}
