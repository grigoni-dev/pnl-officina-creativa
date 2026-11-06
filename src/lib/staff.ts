import { supabaseServizio } from './supabase';

/**
 * For admin API endpoints called from /admin: checks the Supabase session token
 * sent as `Authorization: Bearer <jwt>` and that the user is an admin.
 * Returns the user id, or a Response to send back as is.
 */
export async function soloAdmin(request: Request): Promise<string | Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response('non autenticato', { status: 401 });
  const sb = supabaseServizio();
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return new Response('sessione non valida', { status: 401 });
  const { data: s } = await sb.from('staff').select('ruolo').eq('user_id', data.user.id).maybeSingle();
  if (s?.ruolo !== 'admin') return new Response('non autorizzato', { status: 403 });
  return data.user.id;
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
