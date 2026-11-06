import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { STRIPE_WEBHOOK_SECRET } from 'astro:env/server';
import { completaPagamento, getStripe } from '../../lib/soci';
import { indirizzoSito } from '../../lib/sito';

export const prerender = false;

/**
 * Stripe → here when a Checkout is paid (also for delayed methods that settle
 * later). Activates the member and sends the card. Any error answers 500 so
 * Stripe retries; activation and email are idempotent.
 */
export const POST: APIRoute = async ({ request, url }) => {
  if (!STRIPE_WEBHOOK_SECRET) return new Response('webhook non configurato', { status: 500 });
  const firma = request.headers.get('stripe-signature');
  if (!firma) return new Response('firma mancante', { status: 400 });

  let evento: Stripe.Event;
  try {
    evento = await getStripe().webhooks.constructEventAsync(await request.text(), firma, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('webhook firma', err);
    return new Response('firma non valida', { status: 400 });
  }

  if (evento.type === 'checkout.session.completed' || evento.type === 'checkout.session.async_payment_succeeded') {
    try {
      await completaPagamento(evento.data.object, indirizzoSito(url));
    } catch (err) {
      console.error('webhook attivazione', evento.id, err);
      return new Response('errore', { status: 500 });
    }
  }
  return new Response('ok');
};
