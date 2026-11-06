import type { APIRoute } from 'astro';
import { rimborsaOrdine } from '../../../lib/rimborsi';
import { json, soloAdmin } from '../../../lib/staff';

export const prerender = false;

/** POST {ordine_id}: refunds and voids one order. Admins only. */
export const POST: APIRoute = async ({ request }) => {
  const chi = await soloAdmin(request);
  if (chi instanceof Response) return chi;
  const { ordine_id } = await request.json().catch(() => ({}));
  if (typeof ordine_id !== 'string') return json({ errore: 'ordine_id mancante' }, 400);
  try {
    return json({ esito: await rimborsaOrdine(ordine_id) });
  } catch (err) {
    console.error('rimborso', ordine_id, err);
    return json({ errore: err instanceof Error ? err.message : 'errore' }, 500);
  }
};
