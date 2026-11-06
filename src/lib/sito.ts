import { SITE_URL } from 'astro:env/server';

/** Public origin of the site: SITE_URL if set, otherwise the request's own origin. */
export const indirizzoSito = (url: URL) => (SITE_URL || url.origin).replace(/\/$/, '');

/** Cache public pages at Vercel's edge for a minute, then serve stale while refreshing. */
export const cachePubblica = (headers: Headers) =>
  headers.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=600');
