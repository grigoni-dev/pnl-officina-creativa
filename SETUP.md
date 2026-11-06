# Messa online

Il sito gira su **Vercel**. I dati (soci, album, foto) stanno su **Supabase**, i pagamenti passano da **Stripe** e le email partono con **Resend**. Il codice è pronto: servono gli account e le chiavi, in quest'ordine. Ogni chiave va poi in Vercel come variabile d'ambiente (elenco completo in `.env.example`).

## 1. Supabase (database, foto, login admin)

1. Crea un progetto su supabase.com, **regione Europa** (Francoforte) per il GDPR. Annota la password del database.
2. **SQL Editor** → incolla tutto `supabase/migrations/0001_init.sql` → *Run*. Crea:
   - le tabelle soci, album, foto e admins;
   - le regole di accesso;
   - il bucket `album` per le foto;
   - la pulizia notturna.
3. **Authentication → Sign In / Providers → Email**: disattiva *Allow new users to sign up*. Gli admin li crei tu.
4. **Authentication → Users → Add user**: email e password di ogni volontario che userà `/admin`, con *Auto Confirm* attivo. Poi, nel SQL Editor:
   ```sql
   insert into admins (user_id) select id from auth.users where email = 'nome@esempio.it';
   ```
5. **Project Settings → API**: copia
   - *Project URL* → `PUBLIC_SUPABASE_URL`
   - *anon public* → `PUBLIC_SUPABASE_ANON_KEY`
   - *service_role* (segreta, mai nel browser) → `SUPABASE_SERVICE_ROLE_KEY`

Il piano gratuito ha 1 GB di spazio per le foto. Il pannello le ridimensiona prima di caricarle (circa 300 KB l'una più la miniatura), quindi ci stanno circa 3.000 foto. Va considerato anche che il piano gratuito mette in pausa i progetti inattivi dopo una settimana senza visite.

## 2. Stripe (quota da 5 €)

1. Crea l'account dell'associazione su stripe.com. Finché non è attivato, lavori in **modalità test**.
2. **Developers → API keys**: *Secret key* → `STRIPE_SECRET_KEY` (`sk_test_…` per le prove, `sk_live_…` dopo).
3. **Settings → Payment methods**: lascia attive le carte, Apple Pay e Google Pay; se vuoi, attiva anche PayPal. Checkout mostra da solo i metodi attivi, senza toccare il codice.
4. **Developers → Webhooks → Add endpoint**:
   - URL: `https://<dominio>/api/stripe-webhook`
   - eventi: `checkout.session.completed` e `checkout.session.async_payment_succeeded`
   - *Signing secret* → `STRIPE_WEBHOOK_SECRET`

   Il webhook di test e quello live sono separati: quando passi al live crei di nuovo l'endpoint e aggiorni le due chiavi.

## 3. Resend (email con la tessera)

1. Account su resend.com → **API Keys** → `RESEND_API_KEY`.
2. Finché non c'è un dominio lascia `EMAIL_FROM=PNL Officina Creativa <onboarding@resend.dev>`. **Attenzione:** così Resend consegna solo all'email del proprietario dell'account Resend. Va bene per le prove, non per i soci veri.
3. Quando avete il dominio: **Domains → Add domain**, aggiungi i record DNS che Resend indica e poi imposta `EMAIL_FROM=PNL Officina Creativa <tessera@vostrodominio.it>` e `EMAIL_REPLY_TO` sull'indirizzo che leggete davvero.

## 4. Vercel (il sito)

1. Metti il progetto su GitHub (repository privato va benissimo).
2. Su vercel.com → *Add New → Project* → importa il repository. Vercel riconosce Astro da solo.
3. **Settings → Environment Variables**: inserisci tutte le variabili di `.env.example`, compresa `SITE_URL=https://<dominio>` e una stringa casuale in `RATE_LIMIT_SALT`.
4. *Deploy*. Poi **Settings → Domains** per collegare il dominio, quando c'è.

Il piano Hobby di Vercel è gratuito ma pensato per uso non commerciale. Per un'associazione non profit di solito va bene, ma conviene leggere i termini.

## 5. Prova completa (in modalità test)

1. Vai su `/admin`, entra, crea un album, trascina qualche foto, spunta *Pubblicato* e salva. Entro un minuto l'album compare in home e su `/eventi`.
2. Vai su `/tesseramento` e compila con dati veri ma un'email tua. Paga con la carta di prova `4242 4242 4242 4242`, una scadenza futura qualsiasi e un CVC qualsiasi.
3. Torni su "Benvenuto" con il numero di tessera. L'email arriva, all'account Resend finché non c'è il dominio.
4. Su `/verifica?numero=1` risulta *Attiva*. In `/admin` → Soci compare il socio, e puoi provare *Registra recesso*.

## Sviluppo in locale

```sh
cp .env.example .env   # e riempi i valori
npm run dev
# in un altro terminale, per ricevere i webhook di Stripe in locale:
stripe listen --forward-to localhost:4321/api/stripe-webhook
```

Senza chiavi il sito funziona lo stesso. Gli album risultano vuoti, il tesseramento risponde "non ancora attivo" e `/admin` dice che Supabase non è collegato.
