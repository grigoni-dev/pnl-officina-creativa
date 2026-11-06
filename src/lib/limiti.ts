import { RATE_LIMIT_SALT } from 'astro:env/server';
import { supabaseServizio } from './supabase';

/** Who's asking, without storing the IP: a salted hash of it. */
export async function impronta(request: Request, clientAddress?: string): Promise<string> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'sconosciuto';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${RATE_LIMIT_SALT}:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** true if this request is within the limit (and counts it). Fails open if the check itself errors. */
export async function entroIlLimite(chiave: string, max: number, finestraSecondi: number): Promise<boolean> {
  const { data, error } = await supabaseServizio().rpc('consuma_limite', {
    p_chiave: chiave,
    p_max: max,
    p_finestra_secondi: finestraSecondi,
  });
  if (error) {
    console.error('consuma_limite', error);
    return true;
  }
  return data === true;
}
