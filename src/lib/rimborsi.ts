import { getStripe } from './stripe';
import { supabaseServizio } from './supabase';

/**
 * Refunds the tickets of an order on Stripe (never the membership fee, if the
 * order included one) and voids them. Free bookings are just voided.
 */
export async function rimborsaOrdine(ordineId: string): Promise<'rimborsato' | 'annullato'> {
  const sb = supabaseServizio();
  const { data: o, error } = await sb.from('ordini').select('id, stato, importo_cent, stripe_payment_intent').eq('id', ordineId).single();
  if (error) throw error;
  if (o.stato !== 'confermato') throw new Error(`L’ordine è ${o.stato}: niente da rimborsare`);

  const paga = o.importo_cent > 0 && o.stripe_payment_intent;
  if (paga) {
    await getStripe().refunds.create(
      { payment_intent: o.stripe_payment_intent, amount: o.importo_cent, reason: 'requested_by_customer', metadata: { ordine_id: o.id } },
      { idempotencyKey: `rimborso-${o.id}` },
    );
  }
  const { error: e2 } = await sb.rpc('annulla_ordine', { p_ordine: o.id, p_rimborsato: !!paga });
  if (e2) throw e2;
  return paga ? 'rimborsato' : 'annullato';
}
