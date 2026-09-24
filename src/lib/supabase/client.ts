import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a browser-safe Supabase client for client components.
 * Only public variables (NEXT_PUBLIC_*) are accessed here.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
