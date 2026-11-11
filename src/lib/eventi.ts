import type { Foto } from '../data/site';
import { supabasePubblico } from './supabase';
import { PUBLIC_SUPABASE_URL } from 'astro:env/client';

/** Upcoming events, read from Supabase (table `eventi`, bucket `locandine`). See LOGICHE.md §2. */

export type Evento = {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
  locandina: Foto | null;
  inizio: Date;
  fine: Date;
  luogoNome: string;
  luogoIndirizzo: string | null;
  accesso: 'pubblico' | 'soci';
  ingresso: 'libero' | 'pagamento';
  prezzoCent: number | null;
  /** optional booking fee per ticket (diritto di prevendita), 0 if none */
  prevenditaCent: number;
  prenotazione: boolean;
  posti: number | null;
  maxPerOrdine: number;
  venditeFinoA: Date;
  stato: 'pubblicato' | 'annullato';
  albumSlug: string | null;
  postiRimasti: number | null;
  /** tickets sold on another site: the button links there instead of to our form */
  bigliettiUrl: string | null;
};

const COLONNE =
  'id, slug, titolo, descrizione, locandina_path, locandina_width, locandina_height, inizio, fine, ' +
  'luogo_nome, luogo_indirizzo, accesso, ingresso, prezzo_cent, prevendita_cent, prenotazione, posti, max_per_ordine, ' +
  'vendite_fino_a, stato, biglietti_url, album:album(slug, pubblicato)';

type Riga = Record<string, any>;

const urlLocandina = (path: string) => `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/locandine/${path}`;

async function toEvento(r: Riga): Promise<Evento> {
  const inizio = new Date(r.inizio);
  let postiRimasti: number | null = null;
  if (r.posti && !r.biglietti_url) {
    const { data } = await supabasePubblico()!.rpc('posti_occupati', { p_evento: r.id });
    postiRimasti = Math.max(0, r.posti - (Number(data) || 0));
  }
  return {
    id: r.id,
    slug: r.slug,
    titolo: r.titolo,
    descrizione: r.descrizione,
    locandina: r.locandina_path
      ? { src: urlLocandina(r.locandina_path), width: r.locandina_width, height: r.locandina_height, alt: `Locandina di ${r.titolo}` }
      : null,
    inizio,
    fine: new Date(r.fine),
    luogoNome: r.luogo_nome,
    luogoIndirizzo: r.luogo_indirizzo,
    accesso: r.accesso,
    ingresso: r.ingresso,
    prezzoCent: r.prezzo_cent,
    prevenditaCent: r.ingresso === 'pagamento' ? r.prevendita_cent ?? 0 : 0,
    prenotazione: r.prenotazione,
    posti: r.posti,
    maxPerOrdine: r.max_per_ordine,
    venditeFinoA: r.vendite_fino_a ? new Date(r.vendite_fino_a) : inizio,
    stato: r.stato,
    albumSlug: r.album?.pubblicato ? r.album.slug : null,
    postiRimasti,
    bigliettiUrl: r.biglietti_url ?? null,
  };
}

/** Published (or cancelled) events that haven't ended yet, soonest first. */
export async function prossimiEventi(demo: string | null = null): Promise<Evento[]> {
  const sb = supabasePubblico();
  if (!sb) return import.meta.env.DEV ? (await import('./demo-eventi')).eventiDemo(demo) : [];
  const { data, error } = await sb
    .from('eventi')
    .select(COLONNE)
    .in('stato', ['pubblicato', 'annullato'])
    .gt('fine', new Date().toISOString())
    .order('inizio');
  if (error) {
    console.error('prossimiEventi', error);
    return [];
  }
  return Promise.all((data as Riga[]).map(toEvento));
}

/** Events that took place (published, already ended), most recent first. Cancelled ones are left out. */
export async function eventiPassati(): Promise<Evento[]> {
  const sb = supabasePubblico();
  if (!sb) return [];
  const { data, error } = await sb
    .from('eventi')
    .select(COLONNE)
    .eq('stato', 'pubblicato')
    .lte('fine', new Date().toISOString())
    .order('inizio', { ascending: false });
  if (error) {
    console.error('eventiPassati', error);
    return [];
  }
  return Promise.all((data as Riga[]).map((r) => toEvento({ ...r, posti: null })));
}

/** One published or cancelled event, past or future. */
export async function eventoDaSlug(slug: string): Promise<Evento | null> {
  const sb = supabasePubblico();
  if (!sb) return import.meta.env.DEV ? (await import('./demo-eventi')).eventiDemo(null).find((e) => e.slug === slug) ?? null : null;
  const { data, error } = await sb.from('eventi').select(COLONNE).in('stato', ['pubblicato', 'annullato']).eq('slug', slug).maybeSingle();
  if (error) console.error('eventoDaSlug', error);
  return data ? toEvento(data as Riga) : null;
}

/* ---------------------------------------------------------------------------
 * What the button says (LOGICHE.md §2)
 * ------------------------------------------------------------------------- */

export type Vendita = 'aperta' | 'esaurito' | 'chiusa' | 'annullato' | 'solo-info' | 'concluso';

export function statoVendita(e: Evento, ora = new Date()): Vendita {
  if (e.stato === 'annullato') return 'annullato';
  if (ora >= e.fine) return 'concluso';
  // On an external site, seats and closing time are that site's business.
  if (e.bigliettiUrl) return 'aperta';
  if (e.ingresso === 'libero' && !e.prenotazione) return 'solo-info';
  if (ora >= e.venditeFinoA) return 'chiusa';
  if (e.postiRimasti === 0) return 'esaurito';
  return 'aperta';
}

export const etichettaBottone = (e: Evento) =>
  e.ingresso === 'pagamento' ? `Compra il biglietto · ${euro(e.prezzoCent!)}` : 'Prenota';

/** Where the button goes: our form, or the external ticket site. */
export const linkBiglietti = (e: Evento) => e.bigliettiUrl ?? `/eventi/${e.slug}/biglietti`;

/** "evients.com" from the external link, for the note under the button. */
export const sitoBiglietti = (e: Evento) => {
  if (!e.bigliettiUrl) return null;
  try { return new URL(e.bigliettiUrl).hostname.replace(/^www\./, ''); } catch { return null; }
};

/* ---------------------------------------------------------------------------
 * Formatting, always in Italian time
 * ------------------------------------------------------------------------- */

const TZ = 'Europe/Rome';
export const euro = (cent: number) =>
  `${(cent / 100).toLocaleString('it-IT', { minimumFractionDigits: cent % 100 ? 2 : 0, maximumFractionDigits: 2 })} €`;
/** "Domenica 15 novembre": only the first letter capitalised, as Italian wants. */
export const giornoEvento = (d: Date) => {
  const s = d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const giornoBreve = (d: Date) =>
  d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', timeZone: TZ });
export const anno = (d: Date) => d.toLocaleDateString('it-IT', { year: 'numeric', timeZone: TZ });
export const ora = (d: Date) => d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const orario = (e: Pick<Evento, 'inizio' | 'fine'>) => `${ora(e.inizio)}–${ora(e.fine)}`;
export const mappa = (e: Pick<Evento, 'luogoNome' | 'luogoIndirizzo'>) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.luogoNome, e.luogoIndirizzo].filter(Boolean).join(', '))}`;
export const etichettaIngresso = (e: Evento) => (e.ingresso === 'libero' ? 'Ingresso libero' : euro(e.prezzoCent!));
export const etichettaAccesso = (e: Evento) => (e.accesso === 'soci' ? 'Solo soci' : 'Aperto a tutti');
