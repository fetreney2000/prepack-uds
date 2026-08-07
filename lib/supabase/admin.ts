// Admin/service-role Supabase client — for Server Actions & Route Handlers
// that need to bypass RLS (matching the original app's no-RLS reality).
// Uses the service_role key. NEVER import this into client components.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}