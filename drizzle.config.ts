import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/postgres/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL_POOLER || "",
  },
});
