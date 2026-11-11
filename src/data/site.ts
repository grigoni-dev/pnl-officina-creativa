import type { ImageMetadata } from 'astro';
import folla from '../assets/photos/folla.jpg';
import credits from './photo-credits.json';

/**
 * Contatti. CLIENT SLOT: sostituire con email e profili reali dell'associazione.
 * Finché un valore è null il sito non lo mostra.
 */
export const contatti = {
  email: 'pnl.officinacreativa@gmail.com',
  emailProvvisoria: false,
  instagram: 'https://www.instagram.com/pnl.officinacreativa' as string | null,
  facebook: 'https://www.facebook.com/pnl.officinacreativa' as string | null,
  tiktok: null as string | null,
};

/** Dati dell'associazione (titolare del trattamento, footer). */
export const associazione = {
  denominazione: 'Associazione musicale PNL Officina Creativa',
  sede: 'Via Gaia Da Camino 3, 31046 Oderzo (TV)', // dallo statuto, art. 1 (confermata)
  cf: '94167550261',
  piva: '05543420268',
  pec: 'pnl.officinacreativa@pec.it',
};

export const quota = { importo: 5, valuta: '€' };

/** La pagina con lo statuto (il PDF originale, se pubblicato, va in public/statuto.pdf). */
export const statuto = '/statuto';

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
  alt: 'Un chitarrista canta al microfono sul palco di un evento PNL, sotto le luci viola, con la batteria alle spalle',
  posizione: '50% 12%',
};

export const crediti = credits;
