import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";
import { getSupabaseAdmin } from "../src/lib/supabase/admin";

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
  const sql = postgres(connectionString!, { max: 1 });

  try {
    console.log("=== 1. DATABASE PROFILES ===");
    const dbProfiles = await sql`
      SELECT id, full_name, email, phone, role, is_active, created_at
      FROM profiles
    `;
    console.log(`Total profiles in DB: ${dbProfiles.length}`);
    console.table(dbProfiles);

    console.log("\n=== 2. SUPABASE AUTH USERS ===");
    const supabaseAdmin = getSupabaseAdmin();
    const { data: authUsers, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
      console.error("Auth listUsers error:", error);
    } else {
      console.log(`Total Auth Users: ${authUsers.users.length}`);
      for (const u of authUsers.users) {
        console.log(`- User ID: ${u.id} | Email: ${u.email} | Role meta: ${u.user_metadata?.role} | Created: ${u.created_at}`);
      }
    }

  } catch (err) {
    console.error("Staff inspect error:", err);
  } finally {
    await sql.end();
  }
}

main();
