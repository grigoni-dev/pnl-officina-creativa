import folla from '../assets/photos/folla.jpg';
import type { Evento } from './eventi';

/**
 * Demo events for local development only (npm run dev without Supabase), so the
 * pages can be designed and checked. Never used in a production build.
 * ?demo=uno shows a single event, ?demo=nessuno none.
 */
export function eventiDemo(modo: string | null): Evento[] {
  if (modo === 'nessuno') return [];
  const g = (giorni: number, ora: number) => { const d = new Date(); d.setDate(d.getDate() + giorni); d.setHours(ora, 0, 0, 0); return d; };
  const base = {
    descrizione: 'Una serata nostra, come piace a noi.\n\nDJ set dalle 22, bar aperto tutta la sera, e la solita gente che conosci.',
    luogoIndirizzo: 'Via dell’Esempio 12, 31046 Oderzo TV',
    maxPerOrdine: 6, stato: 'pubblicato' as const, albumSlug: null, prenotazione: false,
  };
  const lista: Evento[] = [
    { ...base, id: 'demo-1', slug: 'demo-festa', titolo: 'Festa d’inverno (demo)', locandina: { src: folla.src, width: folla.width, height: folla.height, alt: 'Locandina' },
      inizio: g(9, 21), fine: g(10, 2), venditeFinoA: g(9, 21), luogoNome: 'Capannone Esempio', accesso: 'soci', ingresso: 'pagamento', prezzoCent: 1000, posti: 150, postiRimasti: 12 },
    { ...base, id: 'demo-2', slug: 'demo-aperitivo', titolo: 'Aperitivo di primavera (demo)', locandina: null,
      inizio: g(30, 18), fine: g(30, 21), venditeFinoA: g(30, 18), luogoNome: 'Giardino Esempio', accesso: 'pubblico', ingresso: 'libero', prezzoCent: null, prenotazione: true, posti: null, postiRimasti: null },
  ];
  return modo === 'uno' ? lista.slice(0, 1) : lista;
}
