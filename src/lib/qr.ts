import QRCode from 'qrcode';

/** Inline SVG QR for a ticket page: it encodes the ticket's own URL. */
export const qrSvg = (url: string) =>
  QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c2f5e', light: '#ffffff' } });
