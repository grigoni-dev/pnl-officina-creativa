import { quota } from '../data/site';
import { contattoValido, emailValida, normEmail, socioDaContatto, telefonoValido } from './contatti';
import { emailBiglietti, inviaEmail } from './email';
import type { Evento } from './eventi';
import { attivaSocio, salvaSocioInAttesa, GiaSocio, type ModuloSocio } from './soci';
import { creaCheckout, disattivaCheckout } from './sumup';
import { supabaseServizio } from './supabase';

/**
 * Buying tickets (LOGICHE.md §3). The form posts:
 *   a_nome, a_cognome, a_email, a_telefono   buyer
 *   quantita                                 1..max
 *   per_me=si                                ticket 1 is the buyer's
 *   b{i}_nome, b{i}_cognome, b{i}_contatto   each ticket (contatto: members-only events)
 *   iscriviti=si                             buyer joins in the same payment, with the details above (members-only events)
 *   privacy=si
 */

export type Acquirente = { nome: string; cognome: string; email: string; telefono: string };
export type RigaBiglietto = { nome: string; cognome: string; contatto: string };
export type ModuloOrdine = {
  acquirente: Acquirente;
  quantita: number;
  perMe: boolean;
  biglietti: RigaBiglietto[];
  iscriviti: boolean;
  socio: ModuloSocio;
  privacy: boolean;
};
export type Errori = Partial<Record<string, string>>;

export function leggiOrdine(form: FormData, max: number): ModuloOrdine {
  const s = (k: string) => String(form.get(k) ?? '').trim().replace(/\s+/g, ' ');
  const acquirente = { nome: s('a_nome'), cognome: s('a_cognome'), email: normEmail(s('a_email')), telefono: s('a_telefono') };
  const quantita = Math.min(max, Math.max(1, Number(form.get('quantita')) || 1));
  const perMe = form.get('per_me') === 'si';
  const biglietti = Array.from({ length: quantita }, (_, i) => ({ nome: s(`b${i}_nome`), cognome: s(`b${i}_cognome`), contatto: s(`b${i}_contatto`) }));
  if (perMe) biglietti[0] = { nome: acquirente.nome, cognome: acquirente.cognome, contatto: acquirente.email };
  const iscriviti = form.get('iscriviti') === 'si';
  const privacy = form.get('privacy') === 'si';
  // Joining from here takes just the tick: the buyer's details become the member's,
  // the tick accepts the statute, the privacy consent below covers the member register.
  // The date of birth stays empty and is asked later (the member shows as "manca la data di nascita").
  const socio: ModuloSocio = {
    dati: { nome: acquirente.nome, cognome: acquirente.cognome, data_nascita: '', email: acquirente.email, telefono: acquirente.telefono },
    statuto: iscriviti,
    privacy,
  };
  return { acquirente, quantita, perMe, biglietti, iscriviti, socio, privacy };
}

export function validaOrdine(m: ModuloOrdine, e: Evento): Errori {
  const err: Errori = {};
  const a = m.acquirente;
  if (!a.nome) err.a_nome = 'Campo obbligatorio';
  if (!a.cognome) err.a_cognome = 'Campo obbligatorio';
  if (!emailValida(a.email)) err.a_email = a.email ? 'Email non valida' : 'Campo obbligatorio';
  if (!telefonoValido(a.telefono)) err.a_telefono = a.telefono ? 'Numero non valido' : 'Campo obbligatorio';
  m.biglietti.forEach((b, i) => {
    if (i === 0 && m.perMe) return;
    if (!b.nome) err[`b${i}_nome`] = 'Campo obbligatorio';
    if (!b.cognome) err[`b${i}_cognome`] = 'Campo obbligatorio';
    if (e.accesso === 'soci' && !contattoValido(b.contatto)) err[`b${i}_contatto`] = b.contatto ? 'Email o telefono non valido' : 'Serve l’email o il telefono con cui è iscritto';
  });
  if (!m.privacy) err.privacy = 'Serve il consenso per usare i dati dei biglietti';
  return err;
}

export class ErroreOrdine extends Error {
  constructor(public errori: Errori) {
    super('ordine non valido');
  }
}

export type Esito = { tipo: 'pagamento'; url: string } | { tipo: 'confermato'; ordineId: string };

/** Checks members, holds the seats and returns where to go next: the payment page, or straight to the tickets. */
export async function creaOrdine(m: ModuloOrdine, e: Evento, sito: string): Promise<Esito> {
  const sb = supabaseServizio();
  const socioIds: (string | null)[] = m.biglietti.map(() => null);
  let socioNuovo: string | null = null;

  if (e.accesso === 'soci') {
    const err: Errori = {};
    for (const [i, b] of m.biglietti.entries()) {
      if (i === 0 && m.perMe) {
        socioIds[0] = (await socioDaContatto(m.acquirente.email)) ?? (await socioDaContatto(m.acquirente.telefono));
        if (!socioIds[0]) {
          if (!m.iscriviti) {
            err.non_socio = 'Non risulti socio con questa email o questo telefono. Spunta “Mi iscrivo adesso” qui sotto: paghi tessera e biglietto insieme, con i dati che hai già scritto.';
          } else {
            try {
              socioNuovo = await salvaSocioInAttesa(m.socio.dati);
              socioIds[0] = socioNuovo;
            } catch (x) {
              if (!(x instanceof GiaSocio)) throw x;
              err.non_socio = 'Con questa email o questo telefono risulti già socio, ma non risulta attivo: scrivici e sistemiamo.';
            }
          }
        }
      } else {
        socioIds[i] = await socioDaContatto(b.contatto);
        if (!socioIds[i]) err[`b${i}_contatto`] = `${b.nome || 'Questa persona'} non risulta socia con questo contatto. Per questo evento servono biglietti a nome di soci.`;
      }
    }
    const visti = new Map<string, number>();
    socioIds.forEach((id, i) => {
      if (!id) return;
      if (visti.has(id)) err[`b${i}_contatto`] = 'Questo socio ha già un biglietto in questo ordine';
      visti.set(id, i);
    });
    if (Object.keys(err).length) throw new ErroreOrdine(err);
  }

  const quotaCent = socioNuovo ? quota.importo * 100 : 0;
  const { data: ordine, error } = await sb.rpc('crea_ordine', {
    p_evento: e.id,
    p_acquirente: m.acquirente,
    p_biglietti: m.biglietti.map((b, i) => ({ nome: b.nome, cognome: b.cognome, socio_id: socioIds[i] })),
    p_socio_nuovo: socioNuovo,
    p_quota_cent: quotaCent,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('esaurito')) throw new ErroreOrdine({ generale: e.postiRimasti ? `Restano solo ${e.postiRimasti} posti: riduci la quantità.` : 'Posti esauriti.' });
    if (msg.includes('vendite_chiuse')) throw new ErroreOrdine({ generale: 'Le vendite per questo evento sono chiuse.' });
    if (msg.includes('quantita')) throw new ErroreOrdine({ generale: `Puoi prendere al massimo ${e.maxPerOrdine} biglietti per ordine.` });
    const doppio = msg.match(/gia_biglietto:(\d+)/);
    if (doppio) {
      const i = Number(doppio[1]) - 1;
      throw new ErroreOrdine({ [i === 0 && m.perMe ? 'generale' : `b${i}_contatto`]: `${m.biglietti[i].nome} ha già un biglietto per questo evento.` });
    }
    throw error;
  }

  if (ordine.stato === 'confermato') {
    // The booking exists either way; a failed email must not look like a failed booking.
    await inviaBigliettiUnaVolta(ordine.id, sito).catch((err) => console.error('email prenotazione', ordine.id, err));
    return { tipo: 'confermato', ordineId: ordine.id };
  }

  const totale = ordine.importo_cent + (ordine.prevendita_cent ?? 0) + ordine.quota_cent;
  const descrizione = `${e.titolo} · ${m.quantita} bigliett${m.quantita === 1 ? 'o' : 'i'}${quotaCent ? ' + tessera' : ''}`;
  const c = await creaCheckout({ tipo: 'o', id: ordine.id, importoCent: totale, descrizione, sito });
  await sb.from('ordini').update({ checkout_id: c.id }).eq('id', ordine.id);
  return { tipo: 'pagamento', url: `/pagamento/${c.id}` };
}

/* ---------------------------------------------------------------------------
 * After payment (webhook or thank-you page, whichever first; idempotent)
 * ------------------------------------------------------------------------- */

export async function completaOrdine(ordineId: string, checkoutId: string, transazioneId: string | null, sito: string, rilanciaEmail = true): Promise<string> {
  const sb = supabaseServizio();
  const { data: o, error: e0 } = await sb.from('ordini').select('socio_nuovo_id').eq('id', ordineId).single();
  if (e0) throw e0;
  if (o.socio_nuovo_id) await attivaSocio(o.socio_nuovo_id, checkoutId, transazioneId, sito, rilanciaEmail);
  const { error } = await sb.rpc('conferma_ordine', { p_ordine: ordineId, p_checkout: checkoutId, p_transazione: transazioneId });
  if (error) throw error;
  await inviaBigliettiUnaVolta(ordineId, sito).catch((err) => {
    if (rilanciaEmail) throw err;
    console.error('email biglietti', ordineId, err);
  });
  return ordineId;
}

/** The checkout expired unpaid: release the seats now instead of waiting for scade_at. */
export async function scadiOrdine(ordineId: string) {
  const { error } = await supabaseServizio().from('ordini').update({ stato: 'scaduto' }).eq('id', ordineId).eq('stato', 'in_attesa');
  if (error) throw error;
}

/** The buyer went back from the payment page: close that checkout and free the seats now. */
export async function annullaCheckout(ordineId: string) {
  if (!/^[0-9a-f-]{36}$/.test(ordineId)) return;
  const sb = supabaseServizio();
  const { data } = await sb.from('ordini').update({ stato: 'scaduto' }).eq('id', ordineId).eq('stato', 'in_attesa').select('checkout_id');
  const id = data?.[0]?.checkout_id;
  if (id) await disattivaCheckout(id);
}

export type OrdineCompleto = {
  id: string;
  stato: string;
  email: string;
  evento: { titolo: string; slug: string; inizio: string; fine: string; luogo_nome: string; luogo_indirizzo: string | null };
  biglietti: { codice: string; nome: string; cognome: string; stato: string }[];
};

export async function leggiOrdineCompleto(id: string): Promise<OrdineCompleto | null> {
  const { data, error } = await supabaseServizio()
    .from('ordini')
    .select('id, stato, email, email_inviata_at, evento:eventi(titolo, slug, inizio, fine, luogo_nome, luogo_indirizzo), biglietti(codice, nome, cognome, stato, created_at)')
    .eq('id', id)
    .order('created_at', { referencedTable: 'biglietti' })
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrdineCompleto | null;
}

async function inviaBigliettiUnaVolta(ordineId: string, sito: string) {
  const sb = supabaseServizio();
  const o = await leggiOrdineCompleto(ordineId);
  if (!o || o.stato !== 'confermato') return;
  const { data: preso } = await sb.from('ordini').update({ email_inviata_at: new Date().toISOString() }).eq('id', ordineId).is('email_inviata_at', null).select('id');
  if (!preso?.length) return;
  try {
    await inviaEmail({ to: o.email, ...emailBiglietti(o, sito) });
  } catch (err) {
    await sb.from('ordini').update({ email_inviata_at: null }).eq('id', ordineId);
    throw err;
  }
}
