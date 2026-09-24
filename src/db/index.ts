import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const dbDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.resolve(dbDir, "cnm.db");

let _sqlite: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!_sqlite) {
    _sqlite = new DatabaseSync(dbPath);
    _sqlite.exec("PRAGMA journal_mode = WAL;");
    _sqlite.exec("PRAGMA busy_timeout = 5000;");
    _sqlite.exec("PRAGMA foreign_keys = ON;");
  }
  return _sqlite;
}

export const sqlite = new Proxy({} as DatabaseSync, {
  get(_target, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

/**
 * Executes a function inside an atomic SQLite transaction
 */
export function runInTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN TRANSACTION;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    return result;
  } catch (err) {
    db.exec("ROLLBACK;");
    throw err;
  }
}
