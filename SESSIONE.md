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

## Portale (fatto il 6 novembre, sera)
- **Stack:** Astro con adapter Vercel. Le pagine con dati vivi girano lato server con cache CDN di 60 secondi; le altre restano statiche.
- **Supabase:** lo schema è in `supabase/migrations/0001_init.sql`. Contiene:
  - le tabelle soci, album, foto e admins;
  - le regole RLS;
  - le funzioni `attiva_socio` (idempotente), `registra_recesso` e `consuma_limite`;
  - il bucket `album`;
  - la pulizia notturna con pg_cron.
- **Tesseramento** (`/tesseramento`):
  1. il modulo libro soci (maggiorenni; codice fiscale verificato) salva il socio "in attesa";
  2. si paga su Stripe Checkout;
  3. il webhook `/api/stripe-webhook` o la pagina `/tesseramento/grazie`, chi arriva prima, attivano il socio, assegnano il numero e mandano l'email con Resend (`src/lib/email.ts`).
- **Verifica** (`/verifica?numero=N`): risponde solo attiva, receduta o non trovata, con un massimo di 20 richieste ogni 10 minuti.
- **Admin** (`/admin`): login Supabase. Album: crea, modifica, pubblica, carica foto con trascinamento (ridimensionate nel browser), sceglie la copertina, elimina. Soci: elenco, ricerca, recesso, export CSV del libro soci.
- **Album pubblici:** letti da Supabase. Le vecchie cartelle `src/album` e le foto segnaposto degli album sono state tolte.
- **Privacy:** `/privacy` è una bozza da completare (sede, codice fiscale) e da far verificare.
- **Verifiche fatte:**
  - migrazione e logica SQL (incluse le RLS) provate su PGlite;
  - webhook provato con eventi firmati;
  - pagine e modulo provati senza servizi collegati.

  **Non provato:** il giro completo con Supabase, Stripe e Resend veri, perché gli account non esistono ancora. Vedi `SETUP.md`, sezione 5.

## Da fare
1. Creare gli account e mettere online seguendo `SETUP.md`.
2. Dominio, per le email (Resend) e per il sito.
3. Completare e far verificare l'informativa privacy; confermare i campi del libro soci e la regola "solo maggiorenni" con lo statuto.

## Materiale che manca dal cliente
- Il logo (ora c'è un wordmark di solo testo).
- Le foto degli eventi: quelle attuali sono provvisorie, da Wikimedia, e portano il timbro "Foto provvisoria".
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
