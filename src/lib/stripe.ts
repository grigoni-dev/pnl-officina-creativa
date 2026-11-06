import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from 'astro:env/server';
import { NonConfigurato } from './supabase';

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new NonConfigurato('Stripe (STRIPE_SECRET_KEY)');
  return (stripe ??= new Stripe(STRIPE_SECRET_KEY));
}

/** Checkout sessions expire after 30 minutes (Stripe's minimum); seats are held for 35 in the database. */
export const scadenzaCheckout = () => Math.floor(Date.now() / 1000) + 30 * 60;

export const paymentIntentId = (s: Stripe.Checkout.Session) =>
  typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null;
