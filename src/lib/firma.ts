import { createHmac, timingSafeEqual } from 'node:crypto';
import { LINK_SECRET, SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

/**
 * Personal links in emails carry the member id plus an HMAC, so they can't be
 * forged or edited to point at someone else. `scopo` keeps link types apart:
 * an unsubscribe token can't be used to prefill a ticket form, and vice versa.
 */
const chiave = () => {
  const k = LINK_SECRET || SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error('LINK_SECRET mancante');
  return k;
};
const mac = (scopo: string, id: string) =>
  createHmac('sha256', chiave()).update(`${scopo}:${id}`).digest('base64url').slice(0, 22);

export const firma = (scopo: 'biglietti' | 'disiscrivi', id: string) => `${id}.${mac(scopo, id)}`;

export function verifica(scopo: 'biglietti' | 'disiscrivi', token: string): string | null {
  const m = token.match(/^([0-9a-f-]{36})\.([A-Za-z0-9_-]{22})$/);
  if (!m) return null;
  const atteso = Buffer.from(mac(scopo, m[1]));
  const dato = Buffer.from(m[2]);
  return atteso.length === dato.length && timingSafeEqual(atteso, dato) ? m[1] : null;
}
