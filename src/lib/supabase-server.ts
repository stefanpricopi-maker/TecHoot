import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase pentru **server** (Server Actions, Route Handlers, RSC fără leak către client).
 *
 * Folosește `SUPABASE_SERVICE_ROLE_KEY` dacă e setată (recomandat pentru inserări/updates când RLS
 * restricționează `anon`). Altfel cade pe cheia anon — funcționează doar dacă politicile RLS
 * permit operația.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Lipsește NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const key = serviceRoleKey ?? anonKey;

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
