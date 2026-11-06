import type { DefCampo } from '../components/Campo.astro';

/**
 * The member form's fields, grouped. `p` prefixes the input names.
 */
export function gruppiSocio(p = ''): { titolo: string; campi: DefCampo[] }[] {
  const g = [
    { titolo: 'Chi sei', campi: [
      { nome: 'nome', label: 'Nome', auto: 'given-name' },
      { nome: 'cognome', label: 'Cognome', auto: 'family-name' },
      { nome: 'data_nascita', label: 'Data di nascita', type: 'date', auto: 'bday' },
    ] },
    { titolo: 'Come ti contattiamo', campi: [
      { nome: 'email', label: 'Email', type: 'email', auto: 'email', mode: 'email', hint: 'Qui arriva la tessera' },
      { nome: 'telefono', label: 'Telefono', type: 'tel', auto: 'tel', mode: 'tel', hint: 'Con email o telefono ti riconosciamo come socio' },
    ] },
  ] as { titolo: string; campi: DefCampo[] }[];
  return g.map((x) => ({ ...x, campi: x.campi.map((c) => ({ ...c, nome: p + c.nome })) }));
}
