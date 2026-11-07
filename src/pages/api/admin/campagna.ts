import type { APIRoute } from 'astro';
import { componi, caricaEvento, creaCampagna, destinatari, inviaProssimoLotto, inviaProva, socioDiProva, type Bozza } from '../../../lib/campagne';
import { emailValida } from '../../../lib/contatti';
import { indirizzoSito } from '../../../lib/sito';
import { json, soloAdmin } from '../../../lib/staff';
import { NonConfigurato } from '../../../lib/supabase';

export const prerender = false;

/**
 * Member emails, from /admin → Comunicazioni. One endpoint, one `azione`:
 *   conteggio · anteprima · prova (to one address) · crea · invia (next lot of 100)
 * Admins only.
 */
export const POST: APIRoute = async ({ request, url }) => {
  const chi = await soloAdmin(request);
  if (chi instanceof Response) return chi;
  const b = await request.json().catch(() => ({}));
  const sito = indirizzoSito(url);
  const bozza: Bozza = {
    oggetto: String(b.oggetto ?? '').trim().slice(0, 150),
    testo: String(b.testo ?? '').trim().slice(0, 10000),
    eventoId: typeof b.evento_id === 'string' && b.evento_id ? b.evento_id : null,
  };
  const serveTesto = ['anteprima', 'prova', 'crea'].includes(b.azione);
  if (serveTesto && (!bozza.oggetto || !bozza.testo)) return json({ errore: 'Servono oggetto e testo' }, 400);

  try {
    switch (b.azione) {
      case 'conteggio': {
        const d = await destinatari();
        return json({ destinatari: d.validi.length, senzaEmail: d.senzaEmail, disiscritti: d.disiscritti });
      }
      case 'anteprima': {
        const e = await caricaEvento(bozza.eventoId);
        return json({ html: componi(bozza, e, socioDiProva(), sito).html });
      }
      case 'prova': {
        const a = String(b.email ?? '').trim().toLowerCase();
        if (!emailValida(a)) return json({ errore: 'Email per la prova non valida' }, 400);
        await inviaProva(bozza, a, sito);
        return json({ ok: true });
      }
      case 'crea':
        return json(await creaCampagna(bozza, chi));
      case 'invia':
        if (typeof b.campagna_id !== 'string') return json({ errore: 'campagna_id mancante' }, 400);
        return json(await inviaProssimoLotto(b.campagna_id, sito));
      default:
        return json({ errore: 'azione sconosciuta' }, 400);
    }
  } catch (err) {
    console.error('campagna', b.azione, err);
    const msg = err instanceof NonConfigurato ? 'Le email non sono ancora configurate (Resend).'
      : /quota|limit|429/i.test(String(err)) ? 'Limite di invio di Resend raggiunto per oggi: riprendi domani da qui, l’invio riparte da chi manca.'
      : err instanceof Error ? err.message : 'errore';
    return json({ errore: msg }, 500);
  }
};
