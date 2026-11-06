import { EMAIL_FROM, EMAIL_REPLY_TO, RESEND_API_KEY } from 'astro:env/server';
import { NonConfigurato } from './supabase';

type Messaggio = { to: string; subject: string; html: string; text: string };

/** Sends one email through Resend's HTTP API. Throws on failure so callers can retry. */
export async function inviaEmail(m: Messaggio): Promise<void> {
  if (!RESEND_API_KEY) throw new NonConfigurato('Resend (RESEND_API_KEY)');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(EMAIL_REPLY_TO ? { reply_to: EMAIL_REPLY_TO } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The welcome email: the membership card, in the site's two inks. */
export function emailTessera(p: { nome: string; cognome: string; numero: number; data: Date; sito: string }) {
  const n = String(p.numero).padStart(4, '0');
  const quando = p.data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });
  const verifica = `${p.sito}/verifica`;
  const subject = `Benvenuto in PNL Officina Creativa · Tessera N° ${n}`;
  const text = [
    `Ciao ${p.nome},`,
    '',
    `la tua quota è arrivata: sei socio di PNL Officina Creativa.`,
    '',
    `Tessera N° ${n}`,
    `Intestata a: ${p.nome} ${p.cognome}`,
    `Attiva dal: ${quando}`,
    '',
    'La tessera vale finché non chiedi il recesso: niente rinnovi annuali.',
    `Per controllarne lo stato (con questa email o il tuo telefono): ${verifica}`,
    '',
    'A presto,',
    'PNL Officina Creativa',
  ].join('\n');

  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#ffe14d;font-family:Arial,Helvetica,sans-serif;color:#3255a4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffe14d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#3255a4;padding-bottom:24px">PNL <span style="font-size:12px;letter-spacing:1px;font-weight:700">OFFICINA CREATIVA</span></td></tr>
<tr><td style="font-size:17px;line-height:1.5;padding-bottom:24px">Ciao ${esc(p.nome)},<br>la tua quota è arrivata: sei socio di PNL Officina Creativa.</td></tr>
<tr><td style="border:3px solid #3255a4;background:#ffe14d;padding:20px 22px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr><td style="font-size:12px;font-weight:700;letter-spacing:1px;border-bottom:3px solid #3255a4;padding-bottom:10px">TESSERA SOCIO N° ${n}</td>
      <td align="right" style="font-size:12px;font-weight:700;letter-spacing:1px;border-bottom:3px solid #3255a4;padding-bottom:10px">UNA VOLTA SOLA</td></tr>
  <tr><td colspan="2" style="font-size:26px;font-weight:900;color:#3255a4;padding:16px 0 4px">${esc(p.nome)} ${esc(p.cognome)}</td></tr>
  <tr><td colspan="2" style="font-size:13px;font-weight:700;letter-spacing:1px">ATTIVA DAL ${esc(quando.toUpperCase())}</td></tr>
  </table>
</td></tr>
<tr><td style="font-size:15px;line-height:1.5;padding-top:24px">La tessera vale finché non chiedi il recesso: niente rinnovi annuali.</td></tr>
<tr><td style="padding-top:20px"><a href="${verifica}" style="display:inline-block;background:#3255a4;color:#ffe14d;font-weight:800;text-decoration:none;padding:14px 22px;border-bottom:5px solid #ff48b0">Verifica la tessera</a></td></tr>
<tr><td style="font-size:13px;padding-top:32px;color:#3255a4">PNL Officina Creativa · Associazione culturale non profit</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}

/** Tickets email: one block per ticket, each with its QR (served by /api/qr/<codice>). */
export function emailBiglietti(
  o: {
    evento: { titolo: string; inizio: string; fine: string; luogo_nome: string; luogo_indirizzo: string | null };
    biglietti: { codice: string; nome: string; cognome: string; stato: string }[];
  },
  sito: string,
) {
  const tz = { timeZone: 'Europe/Rome' } as const;
  const inizio = new Date(o.evento.inizio), fine = new Date(o.evento.fine);
  const giorno = inizio.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', ...tz });
  const orario = `${inizio.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', ...tz })}–${fine.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', ...tz })}`;
  const luogo = [o.evento.luogo_nome, o.evento.luogo_indirizzo].filter(Boolean).join(', ');
  const validi = o.biglietti.filter((b) => b.stato === 'valido');
  const n = validi.length;
  const subject = `${n === 1 ? 'Il tuo biglietto' : `I tuoi ${n} biglietti`} · ${o.evento.titolo}`;

  const text = [
    `${o.evento.titolo}`,
    `${giorno}, ${orario}`,
    luogo,
    '',
    'Mostra il QR all’ingresso, dal telefono o stampato. Ogni biglietto vale per una persona e una volta sola.',
    '',
    ...validi.map((b) => `${b.nome} ${b.cognome}: ${sito}/biglietto/${b.codice}`),
    '',
    'A presto,',
    'PNL Officina Creativa',
  ].join('\n');

  const blocchi = validi.map((b) => `
<tr><td style="padding-top:16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid #3255a4;background:#ffffff">
  <tr><td style="padding:16px 18px" valign="top">
    <div style="font-size:12px;font-weight:700;letter-spacing:1px">BIGLIETTO</div>
    <div style="font-size:22px;font-weight:900;padding:6px 0 10px">${esc(b.nome)} ${esc(b.cognome)}</div>
    <a href="${sito}/biglietto/${b.codice}" style="color:#3255a4;font-weight:700;font-size:13px">Apri il biglietto sul telefono</a>
  </td>
  <td width="150" style="padding:12px" valign="middle"><img src="${sito}/api/qr/${b.codice}" width="140" height="140" alt="QR del biglietto di ${esc(b.nome)}" style="display:block"></td></tr>
  </table>
</td></tr>`).join('');

  const html = `<!doctype html><html lang="it"><body style="margin:0;background:#ffe14d;font-family:Arial,Helvetica,sans-serif;color:#3255a4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffe14d"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="font-size:28px;font-weight:900;letter-spacing:-1px;padding-bottom:20px">PNL <span style="font-size:12px;letter-spacing:1px;font-weight:700">OFFICINA CREATIVA</span></td></tr>
<tr><td style="font-size:30px;font-weight:900;line-height:1.05;letter-spacing:-1px">${esc(o.evento.titolo)}</td></tr>
<tr><td style="font-size:16px;font-weight:700;padding-top:10px">${esc(giorno)} · ${esc(orario)}<br>${esc(luogo)}</td></tr>
<tr><td style="font-size:15px;line-height:1.5;padding-top:16px">Mostra il QR all’ingresso, dal telefono o stampato. Ogni biglietto vale per una persona e una volta sola.</td></tr>
${blocchi}
<tr><td style="font-size:13px;padding-top:28px">PNL Officina Creativa · Associazione culturale non profit</td></tr>
</table></td></tr></table></body></html>`;

  return { subject, html, text };
}
