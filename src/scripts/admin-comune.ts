import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';

/** Shared bits of the /admin pages (browser side). Everything is protected by RLS. */

export const configurato = !!(PUBLIC_SUPABASE_URL && PUBLIC_SUPABASE_ANON_KEY);
export const sb: SupabaseClient = configurato
  ? createClient(PUBLIC_SUPABASE_URL!, PUBLIC_SUPABASE_ANON_KEY!)
  : (null as unknown as SupabaseClient);

export const urlPubblico = (bucket: string, path: string) => `${PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

export const $ = <T extends Element = HTMLElement>(s: string, root: ParentNode = document) => root.querySelector<T>(s)!;
export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function msg(t: string, errore = false) {
  const m = document.querySelector<HTMLElement>('.adm-msg');
  if (!m) return;
  m.textContent = t;
  m.classList.toggle('is-errore', errore);
  if (t) setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 7000);
}

export function fallito(e: { message?: string } | null, cosa: string) {
  if (!e) return false;
  console.error(cosa, e);
  msg(`${cosa}: ${e.message ?? 'errore'}`, true);
  return true;
}

export type Ruolo = 'admin' | 'ingresso' | null;

/** The signed-in user's role, or null if not signed in / not staff (and signs them out). */
export async function ruolo(): Promise<Ruolo> {
  const { data } = await sb.auth.getSession();
  if (!data.session) return null;
  const { data: s } = await sb.from('staff').select('ruolo').eq('user_id', data.session.user.id).maybeSingle();
  if (!s) {
    msg('Questo account non è abilitato. Chiedi a un admin di aggiungerti.', true);
    await sb.auth.signOut();
    return null;
  }
  return s.ruolo as Ruolo;
}

export async function login(form: HTMLFormElement) {
  const f = new FormData(form);
  const { error } = await sb.auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) });
  if (error) msg('Email o password sbagliate.', true);
  return !error;
}

/** Calls an admin API endpoint with the current session token. */
export async function api<T = any>(path: string, body: unknown): Promise<T> {
  const { data } = await sb.auth.getSession();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.errore ?? `errore ${res.status}`);
  return json;
}

/** Resize in the browser before uploading; webp where the browser can encode it, else jpeg. */
export async function ridimensiona(img: ImageBitmap, lato: number, qualita: number) {
  const s = Math.min(1, lato / Math.max(img.width, img.height));
  const w = Math.round(img.width * s), h = Math.round(img.height * s);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  let blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', qualita));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', qualita + 0.05));
  if (!blob) throw new Error('conversione non riuscita');
  return { blob, w, h, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' };
}

export const slugDa = (titolo: string, data: string) =>
  `${data.slice(0, 7)}-${titolo}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export const giorno = (d: string | null) => (d ? new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Rome' }) : '');
export const euro = (cent: number) => `${(cent / 100).toLocaleString('it-IT', { minimumFractionDigits: cent % 100 ? 2 : 0 })} €`;

export function scaricaCsv(nome: string, colonne: string[], righe: Record<string, unknown>[]) {
  const cella = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [colonne.join(';'), ...righe.map((r) => colonne.map((c) => cella(r[c])).join(';'))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = nome;
  a.click();
  URL.revokeObjectURL(a.href);
}
