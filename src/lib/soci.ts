import { emailValida, normEmail, normTel, socioDaContatto, telefonoValido } from './contatti';
import { emailRichiesta, emailTessera, inviaEmail } from './email';
import { supabaseServizio } from './supabase';

/* ---------------------------------------------------------------------------
 * Libro soci: fields and validation (used by /tesseramento)
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
 * Membership request (LOGICHE.md §1): the site only collects it, the
 * association approves it from the panel. The fee is paid outside the site.
 * ------------------------------------------------------------------------- */

/** The email or phone already belong to an active member. */
export class GiaSocio extends Error {}
/** A request with the same email or phone is already waiting for approval. */
export class RichiestaInCorso extends Error {}

/** Saves the request as `in_attesa`. Throws GiaSocio or RichiestaInCorso. */
export async function inviaRichiesta(dati: DatiSocio, sito: string): Promise<void> {
  const sb = supabaseServizio();
  const tel = normTel(dati.telefono);

  // Separate parameterised lookups: never splice user input into a PostgREST filter string.
  const [perEmail, perTel] = await Promise.all([socioDaContatto(dati.email), socioDaContatto(tel)]);
  if (perEmail || perTel) throw new GiaSocio();

  const [r1, r2] = await Promise.all([
    sb.from('soci').select('id').eq('stato', 'in_attesa').eq('email', dati.email).limit(1),
    sb.from('soci').select('id').eq('stato', 'in_attesa').eq('telefono', tel).limit(1),
  ]);
  if (r1.error) throw r1.error;
  if (r2.error) throw r2.error;
  if (r1.data.length || r2.data.length) throw new RichiestaInCorso();

  const ora = new Date().toISOString();
  const { error } = await sb.from('soci').insert({
    ...dati,
    data_nascita: dati.data_nascita || null,
    stato: 'in_attesa',
    origine: 'online',
    consenso_privacy_at: ora,
    updated_at: ora,
  });
  if (error) throw error;

  // A receipt, if email is set up; the request is saved either way.
  try {
    await inviaEmail({ to: dati.email, ...emailRichiesta({ nome: dati.nome, sito }) });
  } catch (err) {
    console.error('email richiesta', err);
  }
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
