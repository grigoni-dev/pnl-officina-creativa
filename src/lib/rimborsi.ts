import { rimborsa } from './sumup';
import { supabaseServizio } from './supabase';

/**
 * Refunds an order's tickets and booking fees on SumUp (never the membership
 * fee, if the order included one) and voids the tickets. Free bookings are
 * just voided. A claim on rimborsato_at stops a double click refunding twice.
 */
export async function rimborsaOrdine(ordineId: string): Promise<'rimborsato' | 'annullato'> {
  const sb = supabaseServizio();
  const { data: preso, error } = await sb
    .from('ordini')
    .update({ rimborsato_at: new Date().toISOString() })
    .eq('id', ordineId).eq('stato', 'confermato').is('rimborsato_at', null)
    .select('id, importo_cent, prevendita_cent, transazione_id');
  if (error) throw error;
  const o = preso?.[0];
  if (!o) throw new Error('Ordine già rimborsato, annullato o non pagato');

  const importo = o.importo_cent + (o.prevendita_cent ?? 0);
  const paga = importo > 0 && !!o.transazione_id;
  try {
    if (paga) await rimborsa(o.transazione_id, importo);
  } catch (err) {
    await sb.from('ordini').update({ rimborsato_at: null }).eq('id', o.id);
    throw err;
  }
  const { error: e2 } = await sb.rpc('annulla_ordine', { p_ordine: o.id, p_rimborsato: paga });
  if (e2) throw e2;
  return paga ? 'rimborsato' : 'annullato';
}
