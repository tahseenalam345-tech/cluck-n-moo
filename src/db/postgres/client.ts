import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Server-only guard: Ensure this database layer is never executed in the client browser.
 */
if (typeof window !== "undefined") {
  throw new Error("Security Error: Database client cannot be imported into client-side code.");
}

let _poolSql: postgres.Sql | null = null;
let _directSql: postgres.Sql | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a connection to the Supabase Transaction Pooler (Port 6543)
 * Optimized for serverless Next.js API routes and Server Components.
 */
export function getPgPoolClient(): postgres.Sql {
  if (!_poolSql) {
    const connectionString = process.env.DATABASE_URL_POOLER || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL_POOLER is missing in environment variables.");
    }

    _poolSql = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false, // Required for Transaction Pooler (PgBouncer)
    });
  }
  return _poolSql;
}

/**
 * Returns a direct connection to Supabase PostgreSQL (Port 5432)
 * Reserved for DDL migrations and controlled data transfer scripts.
 */
export function getPgDirectClient(): postgres.Sql {
  if (!_directSql) {
    const connectionString = process.env.DATABASE_URL_DIRECT || process.env.DIRECT_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL_DIRECT is missing in environment variables.");
    }

    _directSql = postgres(connectionString, {
      max: 2,
      idle_timeout: 10,
      connect_timeout: 15,
      prepare: true, // Direct connection supports prepared statements
    });
  }
  return _directSql;
}

/**
 * Lazy-initialized Drizzle ORM instance over the Transaction Pooler
 */
export function getDrizzleDb() {
  if (!_db) {
    const client = getPgPoolClient();
    _db = drizzle(client, { schema });
  }
  return _db;
}

export function getPostgresDb() {
  return getDrizzleDb();
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDrizzleDb();
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

