import { quota } from '../data/site';
import { emailValida, normEmail, normTel, socioDaContatto, telefonoValido } from './contatti';
import { emailTessera, inviaEmail } from './email';
import { creaCheckout } from './sumup';
import { supabaseServizio } from './supabase';

/* ---------------------------------------------------------------------------
 * Libro soci: fields and validation (used by /tesseramento and, prefixed,
 * by the ticket form when someone joins and buys in one go)
 * ------------------------------------------------------------------------- */

/** What the association keeps for each member (LOGICHE.md §1). */
export const CAMPI = ['nome', 'cognome', 'data_nascita', 'email', 'telefono'] as const;
export type Campo = (typeof CAMPI)[number];
export type DatiSocio = Record<Campo, string>;
export type Errori = Partial<Record<string, string>>;
export type ModuloSocio = { dati: DatiSocio; privacy: boolean; statuto: boolean };

const ETA_MINIMA = 18;

const etaAl = (nascita: Date, oggi = new Date()) => {
  let e = oggi.getFullYear() - nascita.getFullYear();
  const m = oggi.getMonth() - nascita.getMonth();
  if (m < 0 || (m === 0 && oggi.getDate() < nascita.getDate())) e--;
  return e;
};

export const vuoto = (): DatiSocio => Object.fromEntries(CAMPI.map((c) => [c, ''])) as DatiSocio;

/** Reads the member fields; `p` is the name prefix used when the form is embedded in another one. */
export function leggiModulo(form: FormData, p = ''): ModuloSocio {
  const dati = Object.fromEntries(
    CAMPI.map((c) => [c, String(form.get(p + c) ?? '').trim().replace(/\s+/g, ' ')]),
  ) as DatiSocio;
  dati.email = normEmail(dati.email);
  return { dati, privacy: form.get(p + 'privacy') === 'si', statuto: form.get(p + 'statuto') === 'si' };
}

/** Errors keyed by field name (with the same prefix). */
export function valida({ dati, privacy, statuto }: ModuloSocio, p = ''): Errori {
  const e: Errori = {};
  for (const c of CAMPI) if (!dati[c]) e[p + c] = 'Campo obbligatorio';
  for (const c of CAMPI) if (dati[c].length > 120) e[p + c] = 'Troppo lungo';

  if (dati.data_nascita && !e[p + 'data_nascita']) {
    const d = new Date(`${dati.data_nascita}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d.getFullYear() < 1900) e[p + 'data_nascita'] = 'Data non valida';
    else if (etaAl(d) < ETA_MINIMA) e[p + 'data_nascita'] = 'L’iscrizione online è riservata ai maggiorenni: scrivici e ti diciamo come fare';
  }
  if (dati.email && !emailValida(dati.email)) e[p + 'email'] = 'Email non valida';
  if (dati.telefono && !telefonoValido(dati.telefono)) e[p + 'telefono'] = 'Numero non valido';
  if (!privacy) e[p + 'privacy'] = 'Serve il consenso per registrare i tuoi dati nel libro soci';
  if (!statuto) e[p + 'statuto'] = 'Serve accettare lo statuto per diventare socio';
  return e;
}

/* ---------------------------------------------------------------------------
 * Saving a pending member
 * ------------------------------------------------------------------------- */

export class GiaSocio extends Error {}

/**
 * Saves the member as `in_attesa`, or refreshes an earlier unfinished signup
 * with the same email. Throws GiaSocio if the email or phone already belong
 * to an active member.
 */
export async function salvaSocioInAttesa(dati: DatiSocio): Promise<string> {
  const sb = supabaseServizio();

  // Separate parameterised lookups: never splice user input into a PostgREST filter string.
  const [perEmail, perTel] = await Promise.all([socioDaContatto(dati.email), socioDaContatto(normTel(dati.telefono))]);
  if (perEmail || perTel) throw new GiaSocio();

  const riga = {
    ...dati,
    data_nascita: dati.data_nascita || null,
    stato: 'in_attesa',
    origine: 'online',
    consenso_privacy_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: esistente, error: e1 } = await sb
    .from('soci').select('id').eq('stato', 'in_attesa').eq('origine', 'online').eq('email', dati.email)
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (e1) throw e1;
  if (esistente) {
    const { error } = await sb.from('soci').update(riga).eq('id', esistente.id);
    if (error) throw error;
    return esistente.id;
  }
  const { data, error } = await sb.from('soci').insert(riga).select('id').single();
  if (error) throw error;
  return data.id;
}

/** Signup only (no ticket): saves the member, opens a SumUp checkout and returns the payment page. */
export async function avviaIscrizione(dati: DatiSocio, sito: string): Promise<string> {
  const id = await salvaSocioInAttesa(dati);
  const c = await creaCheckout({ tipo: 't', id, importoCent: quota.importo * 100, descrizione: `Quota associativa PNL Officina Creativa · ${dati.nome} ${dati.cognome}`, sito });
  await supabaseServizio().from('soci').update({ checkout_id: c.id }).eq('id', id);
  return `/pagamento/${c.id}`;
}

/* ---------------------------------------------------------------------------
 * Activation + welcome email. Called from the webhook and the thank-you
 * pages, whichever comes first; both paths are idempotent.
 * ------------------------------------------------------------------------- */

export type Tessera = { id: string; numero: number; nome: string; cognome: string; email: string; pagato_at: string };

/**
 * `rilanciaEmail`: the webhook wants a failed email to throw (SumUp retries later);
 * the thank-you page doesn't (the member has paid and must see the card anyway).
 */
export async function attivaSocio(socioId: string, checkoutId: string, transazioneId: string | null, sito: string, rilanciaEmail = true): Promise<Tessera | null> {
  const sb = supabaseServizio();
  const { error } = await sb.rpc('attiva_socio', { p_socio: socioId, p_checkout: checkoutId, p_transazione: transazioneId });
  if (error) throw error;

  const { data: socio, error: e2 } = await sb
    .from('soci')
    .select('id, numero, nome, cognome, email, stato, pagato_at, email_inviata_at')
    .eq('id', socioId)
    .single();
  if (e2) throw e2;
  if (socio.stato !== 'attivo') return null;

  if (!socio.email_inviata_at && socio.email) {
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
        if (rilanciaEmail) throw err; // the webhook answers 500 and SumUp retries
        console.error('email tessera', socio.id, err);
      }
    }
  }
  return socio as Tessera;
}
