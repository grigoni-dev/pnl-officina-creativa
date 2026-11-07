import { SUMUP_API_KEY, SUMUP_API_URL, SUMUP_MERCHANT_CODE } from 'astro:env/server';
import { NonConfigurato } from './supabase';

/**
 * SumUp online payments, over its REST API (developer.sumup.com).
 *
 * Flow: the server creates a checkout → /pagamento/<id> shows SumUp's card
 * widget → SumUp calls /api/sumup-webhook on every status change and the
 * buyer lands on the thank-you page. Neither is trusted as is: both re-read
 * the checkout from SumUp and act only on status PAID.
 */

export type Checkout = {
  id: string;
  checkout_reference: string;
  amount: number;
  currency: string;
  description?: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  valid_until?: string | null;
  transaction_id?: string;
  transactions?: { id: string; status: string; amount: number }[];
};

const base = () => (SUMUP_API_URL || 'https://api.sumup.com').replace(/\/$/, '');

async function chiama<T>(metodo: string, path: string, body?: unknown): Promise<T> {
  if (!SUMUP_API_KEY || !SUMUP_MERCHANT_CODE) throw new NonConfigurato('SumUp (SUMUP_API_KEY, SUMUP_MERCHANT_CODE)');
  const res = await fetch(`${base()}${path}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${SUMUP_API_KEY}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const testo = await res.text();
  if (!res.ok) throw new Error(`SumUp ${metodo} ${path} → ${res.status}: ${testo.slice(0, 300)}`);
  return (testo ? JSON.parse(testo) : {}) as T;
}

/** What a checkout pays for: a membership (t) or a ticket order (o), and the row id. */
export type Tipo = 't' | 'o';
export const riferimento = (tipo: Tipo, id: string) => `${tipo}_${id}_${Date.now().toString(36)}`; // ≤ 64 chars, unique per attempt
export function leggiRiferimento(ref: string): { tipo: Tipo; id: string } | null {
  const m = ref.match(/^([to])_([0-9a-f-]{36})_[0-9a-z]+$/);
  return m ? { tipo: m[1] as Tipo, id: m[2] } : null;
}

/** Checkouts last 30 minutes; seats are held for 35 in the database. */
export async function creaCheckout(p: { tipo: Tipo; id: string; importoCent: number; descrizione: string; sito: string }): Promise<Checkout> {
  return chiama<Checkout>('POST', '/v0.1/checkouts', {
    checkout_reference: riferimento(p.tipo, p.id),
    amount: p.importoCent / 100,
    currency: 'EUR',
    merchant_code: SUMUP_MERCHANT_CODE,
    description: p.descrizione.slice(0, 250),
    return_url: `${p.sito}/api/sumup-webhook`,
    valid_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}

export const leggiCheckout = (id: string) => chiama<Checkout>('GET', `/v0.1/checkouts/${encodeURIComponent(id)}`);

/** Closes an unpaid checkout (the buyer went back). Errors are ignored: it may be paid or gone already. */
export const disattivaCheckout = (id: string) => chiama('DELETE', `/v0.1/checkouts/${encodeURIComponent(id)}`).catch(() => {});

/** The successful transaction behind a paid checkout: refunds need its id. */
export const transazioneDi = (c: Checkout) =>
  c.transactions?.find((t) => t.status === 'SUCCESSFUL')?.id ?? c.transaction_id ?? null;

/** Refunds (part of) a transaction, in cents. */
export const rimborsa = (transazioneId: string, importoCent: number) =>
  chiama('POST', `/v1.0/merchants/${encodeURIComponent(SUMUP_MERCHANT_CODE!)}/payments/${encodeURIComponent(transazioneId)}/refunds`, { amount: importoCent / 100 });

export const idCheckoutValido = (id: string) => /^[0-9a-zA-Z-]{8,64}$/.test(id);
