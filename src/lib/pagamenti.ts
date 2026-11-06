import type Stripe from 'stripe';
import { completaOrdine, scadiOrdine } from './ordini';
import { attivaSocio } from './soci';

/** Routes a paid Checkout to the right flow, by the `tipo` we put in its metadata. */
export async function completaPagamento(session: Stripe.Checkout.Session, sito: string) {
  if (session.payment_status !== 'paid') return null;
  if (session.metadata?.tipo === 'ordine') return { ordineId: await completaOrdine(session, sito) };
  const socioId = session.metadata?.socio_id ?? session.client_reference_id;
  if (!socioId) throw new Error(`Sessione ${session.id} senza socio_id`);
  return { tessera: await attivaSocio(socioId, session, sito) };
}

export async function pagamentoScaduto(session: Stripe.Checkout.Session) {
  if (session.metadata?.tipo === 'ordine') await scadiOrdine(session);
}
