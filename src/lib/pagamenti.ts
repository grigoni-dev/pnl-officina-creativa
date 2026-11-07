import { completaOrdine, scadiOrdine } from './ordini';
import { attivaSocio } from './soci';
import { type Checkout, leggiRiferimento, transazioneDi } from './sumup';

/**
 * Acts on a checkout read back from SumUp (never on what the browser or the
 * webhook claims). PAID → activate the member or confirm the tickets.
 */
/** `daPagina`: called by a thank-you page, where a failed email must not hide what was paid for. */
export async function completaPagamento(c: Checkout, sito: string, daPagina = false) {
  if (c.status !== 'PAID') return null;
  const r = leggiRiferimento(c.checkout_reference);
  if (!r) throw new Error(`Checkout ${c.id}: riferimento sconosciuto ${c.checkout_reference}`);
  const tid = transazioneDi(c);
  if (r.tipo === 'o') return { ordineId: await completaOrdine(r.id, c.id, tid, sito, !daPagina) };
  return { tessera: await attivaSocio(r.id, c.id, tid, sito, !daPagina) };
}

/** EXPIRED: the 30 minutes ran out unpaid; free the seats of a ticket order. */
export async function pagamentoScaduto(c: Checkout) {
  const r = leggiRiferimento(c.checkout_reference);
  if (c.status === 'EXPIRED' && r?.tipo === 'o') await scadiOrdine(r.id);
}
