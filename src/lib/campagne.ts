import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { emailValida } from './contatti';
import { esc, inviaEmail, inviaLotto } from './email';
import { euro, giornoEvento, orario } from './eventi';
import { firma } from './firma';
import { supabaseServizio } from './supabase';

/**
 * Emails to all members (announcements, events). Sent in lots of 100 through
 * Resend's batch API; every member reached is recorded in campagna_invii, so
 * a send interrupted by a quota or an error resumes from whoever is missing.
 */

export type Bozza = { oggetto: string; testo: string; eventoId: string | null };
type EventoMail = {
  id: string; slug: string; titolo: string; inizio: string; fine: string; luogo_nome: string; luogo_indirizzo: string | null;
  accesso: string; ingresso: string; prezzo_cent: number | null; prevendita_cent: number; prenotazione: boolean;
  locandina_path: string | null; stato: string;
};
type Destinatario = { id: string; nome: string; email: string };

const LOTTO = 100;
const NESSUNO = '00000000-0000-0000-0000-000000000000';

export async function caricaEvento(id: string | null): Promise<EventoMail | null> {
  if (!id) return null;
  const { data, error } = await supabaseServizio()
    .from('eventi')
    .select('id, slug, titolo, inizio, fine, luogo_nome, luogo_indirizzo, accesso, ingresso, prezzo_cent, prevendita_cent, prenotazione, locandina_path, stato')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as EventoMail | null;
}

/** Active members with a valid email who haven't unsubscribed. */
export async function destinatari(): Promise<{ validi: Destinatario[]; senzaEmail: number; disiscritti: number }> {
  const sb = supabaseServizio();
  const tutti: { id: string; nome: string; email: string | null; comunicazioni: boolean }[] = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await sb.from('soci').select('id, nome, email, comunicazioni').eq('stato', 'attivo').order('numero').range(da, da + 999);
    if (error) throw error;
    tutti.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return {
    validi: tutti.filter((s) => s.comunicazioni && s.email && emailValida(s.email)).map((s) => ({ id: s.id, nome: s.nome, email: s.email! })),
    senzaEmail: tutti.filter((s) => !s.email || !emailValida(s.email)).length,
    disiscritti: tutti.filter((s) => !s.comunicazioni && s.email).length,
  };
}

/* ---------------------------------------------------------------------------
 * The email
 * ------------------------------------------------------------------------- */

const paragrafi = (t: string) =>
  t.trim().split(/\n{2,}/).map((p) => esc(p.trim()).replace(/\n/g, '<br>'));

function bottone(e: EventoMail, socioId: string, sito: string) {
  const pagina = `${sito}/eventi/${e.slug}`;
  const vendita = e.stato === 'pubblicato' && (e.ingresso === 'pagamento' || e.prenotazione);
  if (!vendita) return { etichetta: 'Tutti i dettagli', url: pagina };
  return {
    etichetta: e.ingresso === 'pagamento' ? 'Prendi il biglietto' : 'Prenota il posto',
    url: `${pagina}/biglietti${socioId === NESSUNO ? '' : `?s=${firma('biglietti', socioId)}`}`,
  };
}

export function componi(b: Bozza, e: EventoMail | null, d: { id: string; nome: string }, sito: string) {
  const disiscrivi = `${sito}/disiscriviti?t=${d.id === NESSUNO ? '' : firma('disiscrivi', d.id)}`;
  const saluto = `Ciao ${d.nome},`;
  const corpo = paragrafi(b.testo);
  const btn = e ? bottone(e, d.id, sito) : null;
  const inizio = e ? new Date(e.inizio) : null;
  const quando = e ? `${giornoEvento(inizio!)}, ${orario({ inizio: inizio!, fine: new Date(e.fine) })}` : '';
  const prezzo = e ? (e.ingresso === 'libero' ? 'Ingresso libero' : `${euro(e.prezzo_cent!)}${e.prevendita_cent ? ` + ${euro(e.prevendita_cent)} di prevendita` : ''}`) : '';
  const accesso = e ? (e.accesso === 'soci' ? 'Solo soci' : 'Aperto a tutti') : '';
  const locandina = e?.locandina_path ? `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/locandine/${e.locandina_path}` : null;

  const text = [
    saluto, '',
    ...b.testo.trim().split(/\n{2,}/).flatMap((p) => [p.trim(), '']),
    ...(e ? [e.titolo, quando, [e.luogo_nome, e.luogo_indirizzo].filter(Boolean).join(', '), `${prezzo} · ${accesso}`, '', `${btn!.etichetta}: ${btn!.url}`, ''] : []),
    'PNL Officina Creativa', '',
    `Non vuoi più ricevere queste email? ${disiscrivi}`,
  ].join('\n');

  const schedaEvento = e ? `
<tr><td style="padding-top:24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid #3255a4;background:#ffffff">
  ${locandina ? `<tr><td><img src="${locandina}" width="554" alt="Locandina di ${esc(e.titolo)}" style="display:block;width:100%;height:auto"></td></tr>` : ''}
  <tr><td style="padding:18px 20px">
    <div style="font-size:24px;font-weight:900;line-height:1.1;color:#3255a4">${esc(e.titolo)}</div>
    <div style="font-size:15px;font-weight:700;padding-top:10px;color:#3255a4">${esc(quando)}<br>${esc([e.luogo_nome, e.luogo_indirizzo].filter(Boolean).join(', '))}</div>
    <div style="font-size:13px;font-weight:800;letter-spacing:1px;padding-top:10px;color:#321871">${esc(prezzo.toUpperCase())} · ${esc(accesso.toUpperCase())}</div>
    <div style="padding-top:18px"><a href="${btn!.url}" style="display:inline-block;background:#3255a4;color:#ffe14d;font-weight:800;font-size:17px;text-decoration:none;padding:14px 24px;border-bottom:5px solid #ff48b0">${esc(btn!.etichetta)}</a></div>
  </td></tr>
  </table>
</td></tr>` : '';

  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#ffe14d;font-family:Arial,Helvetica,sans-serif;color:#3255a4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffe14d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="font-size:28px;font-weight:900;letter-spacing:-1px;padding-bottom:22px">PNL <span style="font-size:12px;letter-spacing:1px;font-weight:700">OFFICINA CREATIVA</span></td></tr>
<tr><td style="font-size:17px;line-height:1.55">${esc(saluto)}</td></tr>
${corpo.map((p) => `<tr><td style="font-size:17px;line-height:1.55;padding-top:14px">${p}</td></tr>`).join('')}
${schedaEvento}
<tr><td style="font-size:12px;line-height:1.5;padding-top:32px;color:#3255a4">Ricevi questa email perché sei socio di PNL Officina Creativa.<br><a href="${disiscrivi}" style="color:#3255a4">Non voglio più ricevere queste email</a></td></tr>
</table></td></tr></table></body></html>`;

  const headers = d.id === NESSUNO ? undefined : { 'List-Unsubscribe': `<${disiscrivi}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
  return { subject: b.oggetto, html, text, headers };
}

/** Preview and test send use a placeholder member: links don't prefill anything. */
export const socioDiProva = (nome = 'Nome') => ({ id: NESSUNO, nome });

export async function inviaProva(b: Bozza, a: string, sito: string) {
  const e = await caricaEvento(b.eventoId);
  const m = componi(b, e, socioDiProva(), sito);
  await inviaEmail({ to: a, ...m, subject: `[Prova] ${m.subject}` });
}

/* ---------------------------------------------------------------------------
 * Campaigns
 * ------------------------------------------------------------------------- */

export async function creaCampagna(b: Bozza, autore: string) {
  const { validi } = await destinatari();
  const { data, error } = await supabaseServizio()
    .from('campagne')
    .insert({ oggetto: b.oggetto, testo: b.testo, evento_id: b.eventoId, creata_da: autore, destinatari: validi.length })
    .select('id, destinatari')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Sends the next lot (up to 100) of a campaign. If Resend refuses (quota,
 * outage) nothing is recorded and the same lot goes out on the next call.
 */
export async function inviaProssimoLotto(campagnaId: string, sito: string): Promise<{ inviati: number; restanti: number }> {
  const sb = supabaseServizio();
  const { data: c, error } = await sb.from('campagne').select('*').eq('id', campagnaId).single();
  if (error) throw error;

  const fatti = new Set<string>();
  for (let da = 0; ; da += 1000) {
    const { data, error: e2 } = await sb.from('campagna_invii').select('socio_id').eq('campagna_id', campagnaId).range(da, da + 999);
    if (e2) throw e2;
    (data ?? []).forEach((r) => fatti.add(r.socio_id));
    if (!data || data.length < 1000) break;
  }
  const { validi } = await destinatari();
  const mancanti = validi.filter((d) => !fatti.has(d.id));
  const lotto = mancanti.slice(0, LOTTO);

  if (lotto.length) {
    const e = await caricaEvento(c.evento_id);
    const bozza = { oggetto: c.oggetto, testo: c.testo, eventoId: c.evento_id };
    await inviaLotto(lotto.map((d) => ({ to: d.email, ...componi(bozza, e, d, sito) })));
    const { error: e3 } = await sb.from('campagna_invii').upsert(lotto.map((d) => ({ campagna_id: campagnaId, socio_id: d.id, esito: 'ok' })), { ignoreDuplicates: true });
    if (e3) throw e3;
  }
  const restanti = mancanti.length - lotto.length;
  await sb.from('campagne').update({
    inviati: fatti.size + lotto.length,
    destinatari: fatti.size + mancanti.length,
    ...(restanti === 0 ? { completata_at: new Date().toISOString() } : {}),
  }).eq('id', campagnaId);
  return { inviati: lotto.length, restanti };
}
