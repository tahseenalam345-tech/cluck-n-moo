import { sqlite } from "../index";

export function migrateCustomDealFields(): void {
  // Check orders table columns
  const orderColumns = sqlite.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  const colNames = new Set(orderColumns.map((c) => c.name));

  if (!colNames.has("discount_pkr")) {
    sqlite.exec("ALTER TABLE orders ADD COLUMN discount_pkr INTEGER NOT NULL DEFAULT 0;");
    console.log("Migration: Added discount_pkr to orders table");
  }

  if (!colNames.has("discount_rate")) {
    sqlite.exec("ALTER TABLE orders ADD COLUMN discount_rate REAL NOT NULL DEFAULT 0;");
    console.log("Migration: Added discount_rate to orders table");
  }

  if (!colNames.has("discount_type")) {
    sqlite.exec("ALTER TABLE orders ADD COLUMN discount_type TEXT DEFAULT NULL;");
    console.log("Migration: Added discount_type to orders table");
  }

  if (!colNames.has("custom_deal_subtotal_pkr")) {
    sqlite.exec("ALTER TABLE orders ADD COLUMN custom_deal_subtotal_pkr INTEGER NOT NULL DEFAULT 0;");
    console.log("Migration: Added custom_deal_subtotal_pkr to orders table");
  }

  // Check order_items table columns
  const itemColumns = sqlite.prepare("PRAGMA table_info(order_items)").all() as Array<{ name: string }>;
  const itemColNames = new Set(itemColumns.map((c) => c.name));

  if (!itemColNames.has("custom_deal_id")) {
    sqlite.exec("ALTER TABLE order_items ADD COLUMN custom_deal_id TEXT DEFAULT NULL;");
    console.log("Migration: Added custom_deal_id to order_items table");
  }
}

// Auto-run if executed directly
if (require.main === module) {
  migrateCustomDealFields();
}
