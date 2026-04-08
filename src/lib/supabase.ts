import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase cu cheia **anon** (publică). Folosit din Server Actions și client atâta timp cât
 * politicile RLS permit operațiile necesare (sau folosești cheia service role într-un client separat).
 */
export function createSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Lipsește NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY. Adaugă-le în .env.local.",
    );
  }

  // In browser we must reuse a single client, otherwise auth storage can get multiple
  // GoTrueClient instances (Supabase warns about undefined behavior).
  if (typeof window !== "undefined") {
    const g = globalThis as unknown as {
      __kahootLiveSupabaseClient?: SupabaseClient;
    };
    if (!g.__kahootLiveSupabaseClient) {
      g.__kahootLiveSupabaseClient = createClient(url, anonKey);
    }
    return g.__kahootLiveSupabaseClient;
  }

  // On server, return a fresh client (request-safe).
  return createClient(url, anonKey);
}

/** Server-only Supabase client cu service role (operații privilegiate). */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY (server-only).",
    );
  }
  if (typeof window !== "undefined") {
    throw new Error("createSupabaseAdminClient() nu trebuie folosit pe client.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
