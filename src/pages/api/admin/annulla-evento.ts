import type { APIRoute } from 'astro';
import { rimborsaOrdine } from '../../../lib/rimborsi';
import { json, soloAdmin } from '../../../lib/staff';
import { supabaseServizio } from '../../../lib/supabase';

export const prerender = false;

/** POST {evento_id}: marks the event cancelled and refunds every confirmed order. Admins only. */
export const POST: APIRoute = async ({ request }) => {
  const chi = await soloAdmin(request);
  if (chi instanceof Response) return chi;
  const { evento_id } = await request.json().catch(() => ({}));
  if (typeof evento_id !== 'string') return json({ errore: 'evento_id mancante' }, 400);

  const sb = supabaseServizio();
  const { error } = await sb.from('eventi').update({ stato: 'annullato' }).eq('id', evento_id);
  if (error) return json({ errore: error.message }, 500);

  const { data: ordini } = await sb.from('ordini').select('id').eq('evento_id', evento_id).eq('stato', 'confermato');
  const esiti = { rimborsati: 0, annullati: 0, falliti: [] as string[] };
  for (const o of ordini ?? []) {
    try {
      (await rimborsaOrdine(o.id)) === 'rimborsato' ? esiti.rimborsati++ : esiti.annullati++;
    } catch (err) {
      console.error('annulla-evento', o.id, err);
      esiti.falliti.push(o.id);
    }
  }
  return json(esiti);
};
