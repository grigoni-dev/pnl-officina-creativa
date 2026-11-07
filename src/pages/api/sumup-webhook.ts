import type { APIRoute } from 'astro';
import { completaPagamento, pagamentoScaduto } from '../../lib/pagamenti';
import { indirizzoSito } from '../../lib/sito';
import { ErroreSumUp, idCheckoutValido, leggiCheckout, leggiRiferimento } from '../../lib/sumup';

export const prerender = false;

/**
 * SumUp → here on every checkout status change: {"event_type":"CHECKOUT_STATUS_CHANGED","id":"…"}.
 * The call isn't signed, so it is only a nudge: we read the checkout back
 * from SumUp and act on that. Errors answer 500 and SumUp retries (1m, 5m, 20m, 2h);
 * every step is idempotent.
 */
export const POST: APIRoute = async ({ request, url }) => {
  const evento = await request.json().catch(() => null);
  const id = typeof evento?.id === 'string' ? evento.id : '';
  if (evento?.event_type !== 'CHECKOUT_STATUS_CHANGED' || !idCheckoutValido(id)) return new Response(null, { status: 204 });

  try {
    const c = await leggiCheckout(id);
    if (!leggiRiferimento(c.checkout_reference)) return new Response(null, { status: 204 }); // not one of ours
    if (c.status === 'PAID') await completaPagamento(c, indirizzoSito(url));
    else if (c.status === 'EXPIRED') await pagamentoScaduto(c);
  } catch (err) {
    // A checkout SumUp doesn't know: nothing to do, and nothing worth retrying.
    if (err instanceof ErroreSumUp && err.status === 404) return new Response(null, { status: 204 });
    console.error('sumup-webhook', id, err);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 204 });
};
