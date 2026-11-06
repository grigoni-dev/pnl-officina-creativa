import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from 'astro:env/server';
import { quota } from '../data/site';
import { emailTessera, inviaEmail } from './email';
import { NonConfigurato, supabaseServizio } from './supabase';

/* ---------------------------------------------------------------------------
 * Form fields and validation
 * ------------------------------------------------------------------------- */

export const CAMPI = [
  'nome', 'cognome', 'data_nascita', 'luogo_nascita', 'codice_fiscale',
  'indirizzo', 'cap', 'comune', 'provincia', 'email', 'telefono',
] as const;
export type Campo = (typeof CAMPI)[number];
export type DatiSocio = Record<Campo, string>;
export type Errori = Partial<Record<Campo | 'privacy' | 'statuto' | 'generale', string>>;

const ETA_MINIMA = 18;

/** Italian codice fiscale: format and check character. Omocodia letters are accepted. */
export function codiceFiscaleValido(cf: string): boolean {
  const s = cf.toUpperCase();
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(s)) return false;
  const dispari = [1, 0, 5, 7, 9, 13, 15, 17, 19, 21, 2, 4, 18, 20, 11, 3, 6, 8, 12, 14, 16, 10, 22, 25, 24, 23];
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = s.charCodeAt(i);
    const v = c >= 48 && c <= 57 ? c - 48 : c - 65; // digits map like A..J
    somma += i % 2 === 0 ? dispari[v] : v;
  }
  return String.fromCharCode(65 + (somma % 26)) === s[15];
}

const etaAl = (nascita: Date, oggi = new Date()) => {
  let e = oggi.getFullYear() - nascita.getFullYear();
  const m = oggi.getMonth() - nascita.getMonth();
  if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) e--;
  return e;
};

export function leggiModulo(form: FormData): { dati: DatiSocio; privacy: boolean; statuto: boolean } {
  const dati = Object.fromEntries(
    CAMPI.map((c) => [c, String(form.get(c) ?? '').trim().replace(/\s+/g, ' ')]),
  ) as DatiSocio;
  dati.codice_fiscale = dati.codice_fiscale.replace(/\s/g, '').toUpperCase();
  dati.provincia = dati.provincia.toUpperCase();
  dati.email = dati.email.toLowerCase();
  return { dati, privacy: form.get('privacy') === 'si', statuto: form.get('statuto') === 'si' };
}

export function valida({ dati, privacy, statuto }: ReturnType<typeof leggiModulo>): Errori {
  const e: Errori = {};
  const obbligatori: Campo[] = ['nome', 'cognome', 'data_nascita', 'luogo_nascita', 'codice_fiscale', 'indirizzo', 'cap', 'comune', 'provincia', 'email'];
  for (const c of obbligatori) if (!dati[c]) e[c] = 'Campo obbligatorio';
  for (const c of CAMPI) if (dati[c].length > 120) e[c] = 'Troppo lungo';

  if (dati.data_nascita && !e.data_nascita) {
    const d = new Date(`${dati.data_nascita}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900) e.data_nascita = 'Data non valida';
    else if (etaAl(d) < ETA_MINIMA) e.data_nascita = `L’iscrizione online è riservata ai maggiorenni: scrivici e ti diciamo come fare`;
  }
  if (dati.codice_fiscale && !e.codice_fiscale && !codiceFiscaleValido(dati.codice_fiscale)) e.codice_fiscale = 'Codice fiscale non valido: controlla le lettere e i numeri';
  if (dati.cap && !/^\d{5}$/.test(dati.cap)) e.cap = 'Il CAP ha 5 cifre';
  if (dati.provincia && !/^[A-Z]{2}$/.test(dati.provincia)) e.provincia = 'Sigla di 2 lettere, per esempio TV';
  if (dati.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dati.email)) e.email = 'Email non valida';
  if (dati.telefono && !/^\+?[\d\s./-]{6,20}$/.test(dati.telefono)) e.telefono = 'Numero non valido';
  if (!privacy) e.privacy = 'Serve il consenso per registrare i tuoi dati nel libro soci';
  if (!statuto) e.statuto = 'Serve accettare lo statuto per diventare socio';
  return e;
}

/* ---------------------------------------------------------------------------
 * Signup: pending member + Stripe Checkout
 * ------------------------------------------------------------------------- */

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!STRIPE_SECRET_KEY) throw new NonConfigurato('Stripe (STRIPE_SECRET_KEY)');
  return (stripe ??= new Stripe(STRIPE_SECRET_KEY));
}

export class GiaSocio extends Error {}

/**
 * Saves the member as `in_attesa` (or refreshes an earlier unfinished signup
 * with the same codice fiscale) and returns the Stripe Checkout URL.
 */
export async function avviaIscrizione(dati: DatiSocio, sito: string): Promise<string> {
  const sb = supabaseServizio();
  const riga = { ...dati, telefono: dati.telefono || null, consenso_privacy_at: new Date().toISOString(), updated_at: new Date().toISOString() };

  const { data: esistente, error: e1 } = await sb
    .from('soci')
    .select('id, stato')
    .eq('codice_fiscale', dati.codice_fiscale)
    .maybeSingle();
  if (e1) throw e1;
  if (esistente?.stato === 'attivo') throw new GiaSocio();

  let id: string;
  if (esistente) {
    const { error } = await sb.from('soci').update({ ...riga, stato: 'in_attesa' }).eq('id', esistente.id);
    if (error) throw error;
    id = esistente.id;
  } else {
    const { data, error } = await sb.from('soci').insert(riga).select('id').single();
    if (error) throw error;
    id = data.id;
  }

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    locale: 'it',
    customer_email: dati.email,
    client_reference_id: id,
    metadata: { socio_id: id },
    payment_intent_data: { description: `Quota associativa · ${dati.nome} ${dati.cognome}`, metadata: { socio_id: id } },
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'eur',
        unit_amount: quota.importo * 100,
        product_data: { name: 'Quota associativa PNL Officina Creativa', description: 'Una volta sola, valida fino al recesso' },
      },
    }],
    success_url: `${sito}/tesseramento/grazie?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${sito}/tesseramento?annullato=1`,
  });

  await sb.from('soci').update({ stripe_session_id: session.id }).eq('id', id);
  return session.url!;
}

/* ---------------------------------------------------------------------------
 * Activation: called by the Stripe webhook and by the thank-you page,
 * whichever comes first. Both paths are idempotent.
 * ------------------------------------------------------------------------- */

export type Tessera = { numero: number; nome: string; cognome: string; email: string; pagato_at: string };

export async function completaPagamento(session: Stripe.Checkout.Session, sito: string): Promise<Tessera | null> {
  if (session.payment_status !== 'paid') return null;
  const socioId = session.metadata?.socio_id ?? session.client_reference_id;
  if (!socioId) throw new Error(`Sessione ${session.id} senza socio_id`);
  const sb = supabaseServizio();

  const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null;
  const { error } = await sb.rpc('attiva_socio', { p_socio: socioId, p_session: session.id, p_payment_intent: pi });
  if (error) throw error;

  const { data: socio, error: e2 } = await sb
    .from('soci')
    .select('id, numero, nome, cognome, email, stato, pagato_at, email_inviata_at')
    .eq('id', socioId)
    .single();
  if (e2) throw e2;
  if (socio.stato !== 'attivo') return null;

  if (!socio.email_inviata_at) {
    // Claim the send first, so the webhook and the thank-you page never both send it.
    const { data: preso } = await sb
      .from('soci')
      .update({ email_inviata_at: new Date().toISOString() })
      .eq('id', socio.id)
      .is('email_inviata_at', null)
      .select('id');
    if (preso?.length) {
      try {
        const m = emailTessera({ nome: socio.nome, cognome: socio.cognome, numero: socio.numero, data: new Date(socio.pagato_at), sito });
        await inviaEmail({ to: socio.email, ...m });
      } catch (err) {
        await sb.from('soci').update({ email_inviata_at: null }).eq('id', socio.id);
        throw err; // the webhook answers 500 and Stripe retries
      }
    }
  }
  return socio as Tessera;
}
