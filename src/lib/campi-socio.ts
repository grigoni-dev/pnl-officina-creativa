import type { DefCampo } from '../components/Campo.astro';

/**
 * The member form's fields, grouped. `p` prefixes the input names when the
 * form is embedded in the ticket form (s_…). `soloLibro` drops name and
 * contacts, which the ticket form already asks for the buyer.
 */
export function gruppiSocio(p = '', soloLibro = false): { titolo: string; campi: DefCampo[] }[] {
  const g = [
    { titolo: 'Chi sei', campi: [
      ...(soloLibro ? [] : [
        { nome: 'nome', label: 'Nome', auto: 'given-name' },
        { nome: 'cognome', label: 'Cognome', auto: 'family-name' },
      ]),
      { nome: 'data_nascita', label: 'Data di nascita', type: 'date', auto: 'bday' },
      { nome: 'luogo_nascita', label: 'Luogo di nascita' },
      { nome: 'codice_fiscale', label: 'Codice fiscale', cols: 6, auto: 'off', max: 16, maiuscolo: true },
    ] },
    { titolo: 'Dove abiti', campi: [
      { nome: 'indirizzo', label: 'Via e numero civico', cols: 6, auto: 'street-address' },
      { nome: 'comune', label: 'Comune', auto: 'address-level2', cols: 2 },
      { nome: 'cap', label: 'CAP', mode: 'numeric', auto: 'postal-code', cols: 2, half: true, max: 5 },
      { nome: 'provincia', label: 'Provincia', auto: 'address-level1', cols: 2, half: true, hint: 'Sigla, es. TV', max: 2, maiuscolo: true },
    ] },
    ...(soloLibro ? [] : [{ titolo: 'Come ti contattiamo', campi: [
      { nome: 'email', label: 'Email', type: 'email', auto: 'email', mode: 'email', hint: 'Qui arriva la tessera' },
      { nome: 'telefono', label: 'Telefono', type: 'tel', auto: 'tel', mode: 'tel', hint: 'Con email o telefono ti riconosciamo come socio' },
    ] }]),
  ] as { titolo: string; campi: DefCampo[] }[];
  return g.map((x) => ({ ...x, campi: x.campi.map((c) => ({ ...c, nome: p + c.nome })) }));
}
