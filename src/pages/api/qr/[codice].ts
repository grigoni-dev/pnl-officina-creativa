import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { indirizzoSito } from '../../../lib/sito';

export const prerender = false;

/**
 * The QR image of a ticket, for the email. It encodes the ticket's page URL;
 * the scanner reads the code out of it. Reveals nothing the code doesn't.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const codice = (params.codice ?? '').replace(/\.png$/, '');
  if (!/^[0-9a-f]{32}$/.test(codice)) return new Response(null, { status: 404 });
  const png = await QRCode.toBuffer(`${indirizzoSito(url)}/biglietto/${codice}`, {
    type: 'png', width: 420, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#1c2f5e', light: '#ffffff' },
  });
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
