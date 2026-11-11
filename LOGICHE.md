# Logiche del sito

Cosa fa il sito. Confermato il 6 novembre 2026.

## 1. Soci

**Chi è socio.** Un socio ha uno stato: *richiesta* (ha chiesto di aderire, aspetta l'approvazione), *attivo* o *receduto*. La tessera vale finché non chiede il recesso.

**Come lo riconosciamo.** Dall'**email** o dal **telefono** usati all'iscrizione, non dal numero di tessera. Il numero di tessera esiste comunque (serve per il libro soci) e viene scritto nell'email di benvenuto.
- Il telefono diventa **obbligatorio** all'iscrizione.
- Email e telefono si confrontano in forma normalizzata:
  - email in minuscolo;
  - telefono senza spazi, con il prefisso +39 aggiunto se manca.

**Soci che esistono già.** Dal pannello admin si carica la vostra lista in CSV. Ogni persona diventa socio *attivo* e riceve un numero di tessera progressivo. Di default non le mandiamo nessuna email.
- La lista ha le colonne **Data/Ora, Email, Nome, Cognome, Telefono**. Si carica il file Excel (.xlsx) o un CSV esportato da Excel. *Data/Ora* diventa la data d'iscrizione.
- Se alla lista mancano dei dati, nel pannello il socio ha il bollino **"manca: …"** con quello che manca (data di nascita, email, telefono), così si sa cosa chiedergli. Il filtro *Solo con dati mancanti* li mostra tutti.
- Senza la colonna della data d'iscrizione (o se una data non si legge), la data d'iscrizione è il momento dell'import. Senza telefono il socio si riconosce solo dall'email.
- Si può caricare anche il CSV che il pannello esporta ("Scarica libro soci"): legge anche la data di nascita e la data d'iscrizione; le righe con stato diverso da *attivo* (receduti) non vengono importate. I numeri di tessera si riassegnano sempre, in ordine di iscrizione.
- Se una riga ha la stessa email o lo stesso telefono di un socio già presente (attivo o receduto), viene saltata. A fine import il riepilogo elenca ogni riga saltata con il nome e il socio con cui coincide.
- Se una persona importata aveva una richiesta in attesa, la richiesta si chiude da sola.

**Richiesta di adesione** (11 novembre). Lo statuto vuole che l'ammissione sia decisa dall'associazione, quindi online non ci si iscrive: si **chiede** di aderire.
- `/tesseramento` chiede **nome, cognome, data di nascita, email e telefono** (online solo maggiorenni), lo statuto e il consenso privacy. Niente pagamento online.
- Se l'email o il telefono sono già di un socio attivo, il sito risponde "risulti già socio" (come la verifica tessera). Se c'è già una richiesta con gli stessi contatti, risponde che la state valutando.
- Chi invia riceve un'email di conferma (se Resend è attivo) e vede la pagina "Richiesta inviata".
- Nel pannello, Soci → **Richieste da approvare** (il numero compare anche accanto a "Soci"):
  - **Approva**: diventa socio attivo con il numero successivo, la quota risulta pagata (si paga fuori dal sito, 5 €) e riceve l'email di benvenuto con la tessera;
  - **Rifiuta**: la richiesta e i dati vengono cancellati.
- Le richieste senza risposta si cancellano da sole dopo 180 giorni.

**Aggiungi socio a mano.** Se email o telefono sono già di un socio, il pannello dice chi è (nome e numero di tessera).

**Eliminare un socio.** Dal pannello (Soci → *Elimina* sulla riga) si cancella chi è stato inserito per errore o per prova. Il numero di tessera non viene riusato. Chi lascia l'associazione non si elimina: si registra il recesso, che lo tiene nel libro soci.

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
| Biglietti su un sito esterno | Lo stesso bottone, che apre il link esterno in una nuova scheda |

**Biglietti su un sito esterno.** Nel pannello, per ogni evento, *Biglietti*: **sul nostro sito** (il modulo qui sotto) oppure **su un sito esterno**, con il link. Con il sito esterno il bottone porta lì (anche il link nelle email ai soci), e posti, massimo per ordine e chiusura delle vendite li gestisce quel sito.

**Pagina eventi.** `/eventi` mostra prima i **prossimi** (quelli non ancora finiti) e sotto i **passati**, dal più recente, in una griglia compatta con locandina, data, titolo e il link alle foto se c'è un album collegato. Gli eventi annullati non compaiono tra i passati.

**Eliminare un evento.** Dal pannello si elimina un evento solo se non ha mai venduto biglietti: bozze, prove, eventi con soli pagamenti abbandonati. Se ha biglietti pagati, anche rimborsati, resta come registrazione contabile: lo si annulla (con rimborso a tutti) o lo si rimette in bozza per toglierlo dal sito.

## 3. Biglietti

**Acquisto** (`/eventi/<nome>/biglietti`):
1. Chi compra mette i suoi dati: nome, cognome, email e telefono.
2. Sceglie quanti biglietti, fino al massimo per ordine. **Ogni biglietto è nominativo**: nome e cognome di chi entra.
3. **Se l'evento è riservato ai soci**, per ogni biglietto serve anche l'email o il telefono di quella persona, e il sito controlla che sia socia attiva. Se non lo è, il sito lo dice e rimanda alla richiesta di adesione: tessera e biglietti restano separati, il biglietto si compra dopo l'approvazione.
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

## 4bis. Soci aggiunti a mano e comunicazioni

**Aggiungi socio.** Dal pannello (Soci → *Aggiungi socio*): nome, cognome, email e/o telefono, data di nascita facoltativa, note. Diventa subito attivo con il numero successivo; se ha l'email può ricevere l'email di benvenuto con la tessera.

**Comunicazioni.** Dal pannello (*Comunicazioni*): oggetto, testo e, se si vuole, un evento da annunciare. Si vedono l'anteprima e si manda una prova a sé stessi, poi si invia a tutti i soci attivi con l'email.
- Se c'è un evento, l'email mostra la scheda con la locandina e il bottone **"Prendi il biglietto"**: il link è personale e apre il modulo già compilato con i dati del socio.
- In fondo a ogni email c'è il link per **non ricevere più comunicazioni** (anche "un clic" dai programmi di posta). Chi si disiscrive resta socio e riceve ancora le email di tessera e biglietti.
- L'invio va a lotti di 100. Se si interrompe (per esempio per il limite giornaliero di Resend), si riprende da chi manca, senza doppioni.

## 5. Cose da verificare con il commercialista

Non blocca lo sviluppo, ma va chiarito prima di vendere:
- **Biglietti a pagamento a chi non è socio:** per un'associazione culturale vendere biglietti a chi non è socio è in genere **attività commerciale** (IVA, certificazione dei corrispettivi, eventuale SIAE per la musica). Per gli eventi riservati ai soci la quota d'ingresso può rientrare nelle attività istituzionali.
- **Commissioni di SumUp:** 2,5% per pagamento online, a carico dell'associazione (o coperte in parte dal diritto di prevendita).

## 6. Decisioni

- Nessun prezzo ridotto per i soci: un evento ha un solo prezzo.
