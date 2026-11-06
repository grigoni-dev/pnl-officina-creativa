import { supabaseServizio } from './supabase';

/** Same rules as norm_email / norm_tel in the database. */
export const normEmail = (e: string) => e.trim().toLowerCase();

export function normTel(t: string): string {
  let s = t.trim().replace(/[^0-9+]/g, '');
  if (!s) return '';
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  if (!s.startsWith('+')) s = `+39${s}`;
  return s;
}

export const emailValida = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export const telefonoValido = (t: string) => /^\+?[\d\s./-]{6,20}$/.test(t.trim());

/** An email or a phone number, as typed by someone identifying a member. */
export const contattoValido = (c: string) => (c.includes('@') ? emailValida(c.trim()) : telefonoValido(c));

/** The active member matching this email or phone, or null. */
export async function socioDaContatto(contatto: string): Promise<string | null> {
  if (!contattoValido(contatto)) return null;
  const { data, error } = await supabaseServizio().rpc('socio_attivo_da_contatto', { p_contatto: contatto.trim() });
  if (error) throw error;
  return (data as string | null) ?? null;
}
