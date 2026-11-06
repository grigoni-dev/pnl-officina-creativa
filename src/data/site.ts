import type { ImageMetadata } from 'astro';
import folla from '../assets/photos/folla.jpg';
import credits from './photo-credits.json';

/**
 * Contatti. CLIENT SLOT: sostituire con email e profili reali dell'associazione.
 * Finché un valore è null il sito non lo mostra.
 */
export const contatti = {
  email: 'ciao@pnl-officinacreativa.example',
  emailProvvisoria: true,
  instagram: null as string | null,
  facebook: null as string | null,
  tiktok: null as string | null,
};

export const quota = { importo: 5, valuta: '€' };

/** Prossimo evento. CLIENT SLOT: null finché non c'è un evento annunciato. */
export const prossimoEvento: null | {
  titolo: string;
  data: string; // ISO
  luogo: string;
  href?: string;
} = null;

/** Lo slogan dell'associazione. */
export const slogan = 'In un mondo che ci obbliga all’eccellenza, fare schifo è un gesto rivoluzionario.';

/** `credito` collega una foto provvisoria alla sua licenza in photo-credits.json. */
export type Foto = { src: ImageMetadata | string; alt: string; width?: number; height?: number; credito?: string; posizione?: string };

export const fotoHero: Foto = {
  src: folla,
  alt: 'Ragazze e ragazzi sotto il palco che applaudono e fanno il cuore con le mani',
  credito: 'folla',
  posizione: '58% 40%',
};

export const crediti = credits;
