import type { APIRoute } from 'astro';
import { emailTessera, inviaEmail } from '../../../lib/email';
import { indirizzoSito } from '../../../lib/sito';
import { json, soloAdmin } from '../../../lib/staff';
import { supabaseServizio } from '../../../lib/supabase';

export const prerender = false;

/** POST {socio_id}: sends the welcome email with the card to a member added by hand. Admins only. */
export const POST: APIRoute = async ({ request, url }) => {
  const chi = await soloAdmin(request);
  if (chi instanceof Response) return chi;
  const { socio_id } = await request.json().catch(() => ({}));
  if (typeof socio_id !== 'string') return json({ errore: 'socio_id mancante' }, 400);
  const sb = supabaseServizio();
  const { data: s, error } = await sb.from('soci').select('id, numero, nome, cognome, email, stato, iscritto_at').eq('id', socio_id).maybeSingle();
  if (error || !s) return json({ errore: 'Socio non trovato' }, 404);
  if (s.stato !== 'attivo' || !s.email) return json({ errore: 'Il socio non è attivo o non ha un’email' }, 400);
  try {
    const m = emailTessera({ nome: s.nome, cognome: s.cognome, numero: s.numero, data: new Date(s.iscritto_at), sito: indirizzoSito(url) });
    await inviaEmail({ to: s.email, ...m });
    await sb.from('soci').update({ email_inviata_at: new Date().toISOString() }).eq('id', s.id);
    return json({ ok: true });
  } catch (err) {
    console.error('benvenuto', socio_id, err);
    return json({ errore: err instanceof Error ? err.message : 'errore' }, 500);
  }
};
