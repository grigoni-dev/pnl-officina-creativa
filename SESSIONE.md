# Dove siamo rimasti (6 novembre 2026)

## Fatto
- PRODUCT.md: il contesto del prodotto (tessera da 5 € pagata una volta, stato attivo/receduto, sito in italiano).
- Mondo visivo "Fanzine Riso", scelto sulla pagina di decisione. Il contratto di direzione è in `.impeccable/surfaces/src-pages-index-astro.md`.
- Home page in Astro (`src/pages/index.astro`), approvata dal revisore finale.
- DESIGN.md e `.impeccable/design.json` descrivono il sistema.
- `/tesseramento`, `/verifica` e `/privacy` esistono solo come pagine "in arrivo".
- **Home semplificata** (richiesta del cliente: "troppo piena di cose inutili", Oderzo non va citato). Una sezione per ogni voce del menu:
  - hero con lo slogan "In un mondo che ci obbliga all'eccellenza, *fare schifo* è un gesto rivoluzionario." (in `site.ts`, "fare schifo" evidenziato in rosa) e una foto;
  - Chi siamo: "Siamo un gruppo di persone creative a cui piace divertirsi. E far divertire.";
  - Album: gli ultimi 3;
  - Tessera: la card con il nome che si stampa mentre lo scrivi, e la verifica;
  - Contatti: l'email.
  Tolti la sezione Oderzo e ogni riferimento a Oderzo (anche la foto della piazza), la lista delle attività, i tre passaggi del tesseramento e il blocco sponsor.
- **Album al posto della galleria:** un album per evento con tutte le sue foto.
  - `/eventi` raccoglie tutti gli album, dal più recente.
  - `/eventi/<cartella>` mostra tutte le foto a colori, con un visore a schermo intero (frecce, swipe, download).
  - In home compaiono gli ultimi 3 album.
  - Dati: una cartella per album in `src/album/`; istruzioni in testa a `src/data/album.ts`.
  - Gli album `segnaposto-1/2/3` sono provvisori, con foto stock.

## Portale, eventi e biglietti (6–7 novembre)
Le regole del sito sono in **`LOGICHE.md`** (confermate dal cliente). In breve:
- **Soci:** si riconoscono da email o telefono, non dal numero di tessera. Il telefono è obbligatorio. La lista esistente (Data/Ora, Email, Nome, Cognome, Telefono) si importa da `/admin` → Soci; chi viene importato è segnato "manca la data di nascita".
- **Dati del socio** (7 novembre): solo nome, cognome, data di nascita, email, telefono. Tolti codice fiscale, luogo di nascita e indirizzo; la migrazione `0002` adegua un database creato prima.
- **Foto pulite** (7 novembre): niente più retinatura riso né grana sopra le immagini. **Iscrizione + biglietto** con una sola spunta: usa i dati dell'acquirente; la data di nascita si chiede dopo.
- **Nota tecnica:** dopo l'aggiornamento ad Astro 7 il server di sviluppo va riavviato. `astro dev` ora gira in background: si controlla con `npx astro dev status` e si ferma con `npx astro dev stop`.
- **Eventi** (`/eventi`, `/eventi/<slug>`, sezione in home):
  - ognuno ha locandina, data, orari, luogo, accesso pubblico o solo soci, ingresso libero o a pagamento, posti, massimo per ordine;
  - li gestisce `/admin` → Eventi, dove ci sono anche rimborsi, annullo dell'evento e lista nomi in CSV.
- **Biglietti** (`/eventi/<slug>/biglietti`):
  - sono nominativi, con un QR per ognuno per email e la pagina `/biglietto/<codice>`;
  - negli eventi solo soci ogni biglietto richiede l'email o il telefono di un socio, e chi non è socio paga tessera e biglietto insieme;
  - i posti restano bloccati 35 minuti mentre si paga;
  - le prenotazioni gratuite sono confermate subito.
- **Ingresso** (`/admin/ingresso`): scanner QR dal telefono (jsQR) più ricerca per nome. C'è il ruolo `ingresso`, che vede solo lo scanner.
- **Album:** spostati su `/album`.
- **Codice:**
  - `src/lib/` contiene `soci`, `ordini`, `eventi`, `pagamenti`, `rimborsi`, `contatti`, `email`, `stripe`;
  - le API admin sono in `src/pages/api/admin/`;
  - il pannello è in `src/pages/admin/`.
- **Astro aggiornato alla 7.4.2:** la 5 aveva vulnerabilità critiche. Node 22 su Vercel.
- **Verifiche fatte:**
  - 35 prove SQL su PGlite: posti, doppioni, scanner, ruoli, import, RLS;
  - webhook con eventi firmati;
  - QR generato e riletto;
  - moduli e pagine via HTTP, screenshot desktop e mobile con eventi demo (solo in `npm run dev`).

  **Non provato:** il giro completo con Supabase, Stripe e Resend veri. Vedi `SETUP.md`, sezione 5.

## Da fare
1. Creare gli account e mettere online seguendo `SETUP.md`.
2. Dominio, per le email (Resend) e per il sito.
3. Completare e far verificare l'informativa privacy; confermare la regola "solo maggiorenni" con lo statuto.
4. Sentire il commercialista sui biglietti venduti a chi non è socio (IVA, corrispettivi, SIAE).

## Materiale che manca dal cliente
- Il logo (ora c'è un wordmark di solo testo).
- Altre foto degli eventi: quella della home è vostra (Tommaso Tadiello); la vecchia foto stock resta in `folla_2.jpg`, non usata.
- Gli album veri: per ogni evento una cartella in `src/album/` con le foto e un `album.json` (titolo, data, luogo). Poi vanno cancellate le cartelle `segnaposto-*`.
- Il permesso di pubblicare le foto degli eventi privati: chi c'era sa di essere online? Va valutato se servono album non indicizzati o protetti.
- L'email vera (ora è `.example`, con il timbro "Indirizzo provvisorio").
- I link Instagram, Facebook e TikTok, e il prossimo evento.

## Note tecniche
- Avvio: `npm run dev`. Build: `npm run build`.
- Album: le foto escono in ordine di nome file; la copertina si sceglie con `"copertina"` in `album.json`.
- Le foto si stampano in automatico come riso a due lastre (`src/components/Print.astro` e i filtri SVG in `src/layouts/Base.astro`). Basta sostituire i file in `src/assets/photos/`.
- Piccole cose rimaste da sistemare:
  - il segnaposto del nome sulla tessera è a basso contrasto;
  - alcune dimensioni di testo piccole stanno fuori dalla scala tipografica;
  - l'altezza dell'header (79px) è scritta a mano nell'hero e nel menu.
