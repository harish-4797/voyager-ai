/**
 * Supabase client (auth + Postgres). Cloud mode is enabled only when both env vars are set;
 * otherwise the app runs in local mode with browser storage.
 *
 * The anon/publishable key is designed to be public — Row Level Security in
 * supabase/schema.sql is what keeps each user's data private.
 */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloud = Boolean(url && key);

export const supabase = isCloud
  ? createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

/** Current access token (for calling our own /api routes), or null when signed out / local mode. */
export async function getAccessToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
