import { createClient } from "@supabase/supabase-js";

/**
 * Server-only guard: This client holds master administrative permissions.
 * It must NEVER be called or bundled into client-side browser code.
 */
if (typeof window !== "undefined") {
  throw new Error("Security Error: Supabase Admin client cannot be imported into client-side code.");
}

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const rawKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!rawUrl || !rawKey) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in environment variables."
      );
    }

    const supabaseUrl = rawUrl.trim().replace(/^['"]|['"]$/g, "");
    const serviceRoleKey = rawKey.trim().replace(/^['"]|['"]$/g, "");

    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}
