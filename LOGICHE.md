# Logiche del sito

Cosa fa il sito. Confermato il 6 novembre 2026.

## 1. Soci

**Chi è socio.** Un socio ha uno stato: *in attesa* (ha compilato ma non ha pagato), *attivo* o *receduto*. La tessera vale finché non chiede il recesso.

**Come lo riconosciamo.** Dall'**email** o dal **telefono** usati all'iscrizione, non dal numero di tessera. Il numero di tessera esiste comunque (serve per il libro soci) e viene scritto nell'email di benvenuto.
- Il telefono diventa **obbligatorio** all'iscrizione.
- Email e telefono si confrontano in forma normalizzata:
  - email in minuscolo;
  - telefono senza spazi, con il prefisso +39 aggiunto se manca.

**Soci che esistono già.** Dal pannello admin si carica la vostra lista in CSV. Ogni persona diventa socio *attivo* e riceve un numero di tessera progressivo. Di default non le mandiamo nessuna email.
- La lista ha le colonne **Data/Ora, Email, Nome, Cognome, Telefono**. Si carica il file Excel (.xlsx) o un CSV esportato da Excel. *Data/Ora* diventa la data d'iscrizione.
- Alla lista manca la data di nascita: chi viene importato è segnato **"manca la data di nascita"**, così si sa a chi chiederla.
- Se una riga ha la stessa email o lo stesso telefono di un socio già presente, viene saltata e segnalata.

**Iscrizione online.** Si chiedono solo **nome, cognome, data di nascita, email e telefono** (online solo maggiorenni), si pagano 5 € con SumUp e arriva l'email con la tessera.

**Verifica tessera** (`/verifica`). Si inserisce email o telefono e il sito risponde solo *attiva* o *non trovata*. Non mostra mai nomi né altri dati. Il limite è di 20 richieste ogni 10 minuti per connessione.
- Da sapere: chi conosce l'email o il telefono di qualcuno può scoprire se quella persona è socia. Per un'associazione culturale è un rischio basso, ma va detto anche nell'informativa.

## 2. Eventi

**Dove compaiono.** Una sezione **"Prossimi eventi"** in home, subito dopo l'apertura, più la pagina `/eventi`. Gli album delle foto passano a `/album`. Il menu diventa: Chi siamo · Eventi · Album · Tessera · Contatti.
- Se non ci sono eventi in programma, la sezione in home sparisce e su `/eventi` compare "Nessun evento in programma".
- Se ce n'è uno solo, occupa tutto lo spazio, come una locandina.

**Cosa ha ogni evento** (si crea e si modifica da `/admin`):
- titolo e **locandina** (immagine caricata dal pannello);
- **data**, **ora di inizio** e **ora di fine** (anche dopo mezzanotte);
- **luogo**: nome e indirizzo, con link a Google Maps;
- **descrizione**;
- **accesso**: *pubblico* oppure *riservato ai soci*;
- **ingresso**: *libero* oppure *a pagamento*, con il **prezzo**. Per l'ingresso libero si sceglie anche se serve la **prenotazione** o se è solo informativo;
- **diritto di prevendita** (facoltativo, solo eventi a pagamento): importo fisso per biglietto, uguale per qualunque carta;
- **posti disponibili** (facoltativo). Quando finiscono, il bottone diventa "Esaurito";
- **massimo di biglietti per ordine** (proposta: 6);
- **vendita aperta fino a** (di default l'inizio dell'evento);
- **stato**: bozza, pubblicato o annullato. Un evento annullato resta visibile con la scritta "Annullato";
- **album collegato**: dopo l'evento, la sua pagina rimanda all'album delle foto.

**Pagina dell'evento** (`/eventi/<nome>`). Mostra la locandina grande, tutti i dettagli qui sopra ben visibili (data, orari, luogo, pubblico o soci, libero o prezzo) e il bottone, che cambia a seconda del caso:

| Caso | Bottone |
|---|---|
| A pagamento | "Compra il biglietto · 10 €" |
| Libero con prenotazione | "Prenota" |
| Libero senza prenotazione | nessun bottone, solo i dettagli |
| Posti finiti | "Esaurito" (disattivato) |
| Vendita chiusa / evento passato | "Vendite chiuse" |

## 3. Biglietti

**Acquisto** (`/eventi/<nome>/biglietti`):
1. Chi compra mette i suoi dati: nome, cognome, email e telefono.
2. Sceglie quanti biglietti, fino al massimo per ordine. **Ogni biglietto è nominativo**: nome e cognome di chi entra.
3. **Se l'evento è riservato ai soci**, per ogni biglietto serve anche l'email o il telefono di quella persona, e il sito controlla che sia socia attiva.
   - **Se chi compra non è socio**, basta una spunta, "Mi iscrivo adesso": diventa socio con i dati che ha già scritto (nome, cognome, email, telefono) e paga **tessera + biglietto insieme**, con un solo pagamento. La data di nascita gli verrà chiesta dopo: nel pannello risulta "manca la data di nascita".
   - Gli amici per cui compra devono già essere soci. Se uno non lo è, il sito lo dice e quel biglietto non si può comprare.
4. Pagamento con SumUp, come per la tessera: il modulo carta compare in una pagina del sito (Apple Pay e Google Pay quando SumUp li attiva). Se l'evento ha un **diritto di prevendita**, si aggiunge a ogni biglietto ed è mostrato prima di pagare. Per le prenotazioni gratuite non c'è nessun pagamento: si conferma e basta.
5. Arriva un'email con **un QR per ogni biglietto**. Ogni QR è anche una pagina `/biglietto/<codice>` che si può mostrare dal telefono.

**Posti contati senza vendere più del dovuto.** Quando qualcuno va a pagare, i suoi posti restano bloccati per 30 minuti. Se non paga, si liberano da soli.

**All'ingresso** (`/admin/ingresso`). Un volontario apre la pagina dal telefono e inquadra i QR. Lo schermo risponde in grande:
- ✅ **Valido**, con il nome della persona: il biglietto viene segnato come usato;
- ⚠️ **Già usato**, con l'ora del primo ingresso;
- ❌ **Non valido o di un altro evento**.

C'è anche la ricerca per nome, se il QR non si legge. I volontari dell'ingresso hanno un account di tipo **"ingresso"**: vedono solo lo scanner, non i dati dei soci.

**Annullamenti e rimborsi.** Dal pannello si annulla un biglietto (il QR smette di valere). Il rimborso si fa con un clic dal pannello, che lo esegue su SumUp (biglietti e prevendita; la quota della tessera resta). Se si annulla un evento, il pannello permette di rimborsare tutti i biglietti in un colpo.

## 4. Pannello admin

Ci sono due tipi di account:
- **admin**: eventi, biglietti e ingressi, album, soci (con l'import), rimborsi;
- **ingresso**: solo lo scanner.

## 5. Cose da verificare con il commercialista

Non blocca lo sviluppo, ma va chiarito prima di vendere:
- **Biglietti a pagamento a chi non è socio:** per un'associazione culturale vendere biglietti a chi non è socio è in genere **attività commerciale** (IVA, certificazione dei corrispettivi, eventuale SIAE per la musica). Per gli eventi riservati ai soci la quota d'ingresso può rientrare nelle attività istituzionali.
- **Commissioni di SumUp:** 2,5% per pagamento online, a carico dell'associazione (o coperte in parte dal diritto di prevendita).

## 6. Decisioni

- Nessun prezzo ridotto per i soci: un evento ha un solo prezzo.
