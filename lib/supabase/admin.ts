import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Admin client with service role key — bypasses RLS
// Use for: public reads, payment operations, dashboard stats
// Singleton pattern — one instance for the server lifetime

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getAdminClient() {
  if (adminClient) return adminClient;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
