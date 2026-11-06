import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

const opts = { auth: { persistSession: false, autoRefreshToken: false } };

let anon: SupabaseClient | null = null;
let service: SupabaseClient | null = null;

/** Public reads (albums), subject to RLS. Null when Supabase isn't configured yet. */
export function supabasePubblico(): SupabaseClient | null {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) return null;
  return (anon ??= createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, opts));
}

/** Server-only client with the service role: members, rate limits. Never send it to the browser. */
export function supabaseServizio(): SupabaseClient {
  if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new NonConfigurato('Supabase (PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }
  return (service ??= createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, opts));
}

export const urlFoto = (path: string) => `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/album/${path}`;

/** A service the site needs isn't configured (missing env vars). */
export class NonConfigurato extends Error {
  constructor(cosa: string) {
    super(`Servizio non configurato: ${cosa}`);
    this.name = 'NonConfigurato';
  }
}
