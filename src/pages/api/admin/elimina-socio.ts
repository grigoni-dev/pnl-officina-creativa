import type { APIRoute } from 'astro';
import { json, soloAdmin } from '../../../lib/staff';
import { supabaseServizio } from '../../../lib/supabase';

export const prerender = false;

/**
 * POST {socio_id}: deletes a member entered by mistake (a test, a duplicate).
 * Not for someone leaving the association: that is "Registra recesso", which
 * keeps the record in the libro soci. Admins only.
 * Tickets keep their holder's name; their link to the member is cleared.
 */
export const POST: APIRoute = async ({ request }) => {
  const chi = await soloAdmin(request);
  if (chi instanceof Response) return chi;
  const { socio_id } = await request.json().catch(() => ({}));
  if (typeof socio_id !== 'string' || !/^[0-9a-f-]{36}$/.test(socio_id)) return json({ errore: 'socio_id mancante' }, 400);
  const { data, error } = await supabaseServizio().from('soci').delete().eq('id', socio_id).select('id, nome, cognome');
  if (error) {
    console.error('elimina socio', socio_id, error);
    return json({ errore: error.message }, 500);
  }
  if (!data?.length) return json({ errore: 'Socio non trovato' }, 404);
  return json({ ok: true });
};
