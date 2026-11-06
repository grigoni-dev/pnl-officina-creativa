import type { Foto } from '../data/site';
import { supabasePubblico, urlFoto } from './supabase';

/**
 * Event albums, read from Supabase (tables `album` and `foto`, bucket `album`).
 * Albums are created and filled from /admin; only published ones are visible here.
 */

export type FotoAlbum = {
  id: string;
  alt: string;
  thumb: string;
  thumbWidth: number;
  thumbHeight: number;
  grande: string;
  width: number;
  height: number;
};

export type Album = {
  id: string;
  slug: string;
  titolo: string;
  data: Date;
  luogo: string | null;
  descrizione: string | null;
  copertina: Foto | null;
  nFoto: number;
};

type RigaFoto = {
  id: string; path: string; thumb_path: string; width: number; height: number;
  thumb_width: number; thumb_height: number; alt: string | null;
};

type RigaAlbum = {
  id: string; slug: string; titolo: string; data: string; luogo: string | null; descrizione: string | null;
  copertina: Pick<RigaFoto, 'thumb_path' | 'thumb_width' | 'thumb_height' | 'alt'> | null;
  foto: { count: number }[];
};

const COLONNE =
  'id, slug, titolo, data, luogo, descrizione, ' +
  'copertina:foto!album_copertina_fk(thumb_path, thumb_width, thumb_height, alt), ' +
  'foto:foto!foto_album_id_fkey(count)';

const toAlbum = (r: RigaAlbum): Album => ({
  id: r.id,
  slug: r.slug,
  titolo: r.titolo,
  data: new Date(`${r.data}T12:00:00`),
  luogo: r.luogo,
  descrizione: r.descrizione,
  nFoto: r.foto[0]?.count ?? 0,
  copertina: r.copertina
    ? {
        src: urlFoto(r.copertina.thumb_path),
        width: r.copertina.thumb_width,
        height: r.copertina.thumb_height,
        alt: r.copertina.alt ?? `Copertina dell’album ${r.titolo}`,
      }
    : null,
});

/** Published albums, newest first. Empty if Supabase isn't configured or is unreachable. */
export async function elencoAlbum(limite?: number): Promise<Album[]> {
  const sb = supabasePubblico();
  if (!sb) return [];
  let q = sb.from('album').select(COLONNE).eq('pubblicato', true).order('data', { ascending: false });
  if (limite) q = q.limit(limite);
  const { data, error } = await q;
  if (error) {
    console.error('elencoAlbum', error);
    return [];
  }
  return (data as unknown as RigaAlbum[]).map(toAlbum);
}

/** One published album with all its photos, or null. */
export async function albumConFoto(slug: string): Promise<{ album: Album; foto: FotoAlbum[] } | null> {
  const sb = supabasePubblico();
  if (!sb) return null;
  const { data, error } = await sb
    .from('album')
    .select(COLONNE)
    .eq('pubblicato', true)
    .eq('slug', slug)
    .maybeSingle();
  if (error) console.error('albumConFoto', error);
  if (!data) return null;
  const album = toAlbum(data as unknown as RigaAlbum);

  const { data: righe, error: e2 } = await sb
    .from('foto')
    .select('id, path, thumb_path, width, height, thumb_width, thumb_height, alt')
    .eq('album_id', album.id)
    .order('ordine')
    .order('created_at');
  if (e2) console.error('albumConFoto foto', e2);
  const tutte = (righe ?? []) as RigaFoto[];
  const foto = tutte.map((f, i) => ({
    id: f.id,
    alt: f.alt ?? `Foto ${i + 1} di ${tutte.length}, ${album.titolo}`,
    thumb: urlFoto(f.thumb_path),
    thumbWidth: f.thumb_width,
    thumbHeight: f.thumb_height,
    grande: urlFoto(f.path),
    width: f.width,
    height: f.height,
  }));
  return { album, foto };
}

/** Albums before and after this one, for the pager on the album page. */
export async function vicini(album: Album) {
  const sb = supabasePubblico();
  if (!sb) return { piuRecente: null, precedente: null };
  const giorno = album.data.toISOString().slice(0, 10);
  const [dopo, prima] = await Promise.all([
    sb.from('album').select('slug, titolo').eq('pubblicato', true).gt('data', giorno).order('data').limit(1).maybeSingle(),
    sb.from('album').select('slug, titolo').eq('pubblicato', true).lt('data', giorno).order('data', { ascending: false }).limit(1).maybeSingle(),
  ]);
  return { piuRecente: dopo.data, precedente: prima.data };
}

export const dataAlbum = (a: Pick<Album, 'data'>) =>
  a.data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Rome' });

export const contaFoto = (n: number) => (n === 1 ? '1 foto' : `${n} foto`);
