import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { STRIPE_WEBHOOK_SECRET } from 'astro:env/server';
import { completaPagamento, pagamentoScaduto } from '../../lib/pagamenti';
import { indirizzoSito } from '../../lib/sito';
import { getStripe } from '../../lib/stripe';

export const prerender = false;

/**
 * Stripe → here. Paid Checkouts activate the member and/or confirm the tickets
 * and send the emails; expired ones free the seats. Any error answers 500 so
 * Stripe retries; every step is idempotent.
 * Events to enable: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.expired.
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

  try {
    if (evento.type === 'checkout.session.completed' || evento.type === 'checkout.session.async_payment_succeeded') {
      await completaPagamento(evento.data.object, indirizzoSito(url));
    } else if (evento.type === 'checkout.session.expired') {
      await pagamentoScaduto(evento.data.object);
    }
  } catch (err) {
    console.error('webhook', evento.type, evento.id, err);
    return new Response('errore', { status: 500 });
  }
  return new Response('ok');
};
