# Messa online

Il sito gira su **Vercel**. I dati (soci, album, foto) stanno su **Supabase**, i pagamenti passano da **SumUp** e le email partono con **Resend**. Il codice è pronto: servono gli account e le chiavi, in quest'ordine. Ogni chiave va poi in Vercel come variabile d'ambiente (elenco completo in `.env.example`).

## 1. Supabase (database, foto, login admin)

1. Crea un progetto su supabase.com, **regione Europa** (Francoforte) per il GDPR. Annota la password del database.
2. **SQL Editor** → incolla tutto `supabase/migrations/0001_init.sql` → *Run*. Poi fai lo stesso, in ordine, con tutte le altre migrazioni della cartella: `0002_libro_soci_ridotto.sql`, `0003_sumup.sql`, `0004_soci_manuali_comunicazioni.sql`, `0005_elimina_evento.sql`, `0006_richieste_biglietti_esterni.sql`. Si possono rieseguire senza problemi. Insieme creano:
   - le tabelle di soci, eventi, ordini, biglietti, album, foto e staff;
   - le regole di accesso;
   - i bucket `album` e `locandine`;
   - la pulizia notturna.
3. **Authentication → Sign In / Providers → Email**: disattiva *Allow new users to sign up*. Gli admin li crei tu.
4. **Authentication → Users → Add user**: email e password di ogni volontario, con *Auto Confirm* attivo. Poi, nel SQL Editor, gli dai un ruolo:
   ```sql
   -- tutto il pannello: eventi, biglietti, rimborsi, album, soci
   insert into staff (user_id, ruolo) select id, 'admin' from auth.users where email = 'nome@esempio.it';
   -- solo lo scanner all'ingresso (/admin/ingresso), senza accesso ai dati dei soci
   insert into staff (user_id, ruolo) select id, 'ingresso' from auth.users where email = 'porta@esempio.it';
   ```
5. **Project Settings → API**: copia
   - *Project URL* → `PUBLIC_SUPABASE_URL`
   - *anon public* → `PUBLIC_SUPABASE_ANON_KEY`
   - *service_role* (segreta, mai nel browser) → `SUPABASE_SERVICE_ROLE_KEY`

Il piano gratuito ha 1 GB di spazio per le foto. Il pannello le ridimensiona prima di caricarle (circa 300 KB l'una più la miniatura), quindi ci stanno circa 3.000 foto. Va considerato anche che il piano gratuito mette in pausa i progetti inattivi dopo una settimana senza visite.

## Gestire chi accede al pannello

Il pannello è su `/admin`. Gli account si creano solo da Supabase: le registrazioni libere sono chiuse.

Ci sono due ruoli:
- **admin**: tutto il pannello (eventi, biglietti, rimborsi, album, soci, comunicazioni);
- **ingresso**: solo lo scanner dei biglietti (`/admin/ingresso`), senza accesso ai dati dei soci.

**Aggiungere una persona**
1. Supabase → **Authentication → Users → Add user → Create new user**: email e password, spunta **Auto Confirm User**, *Create user*.
2. Supabase → **SQL Editor → New query**, con l'email giusta:
   ```sql
   -- accesso completo
   insert into staff (user_id, ruolo)
   select id, 'admin' from auth.users where email = 'nome@esempio.it';

   -- solo ingresso
   insert into staff (user_id, ruolo)
   select id, 'ingresso' from auth.users where email = 'nome@esempio.it';
   ```
   Deve rispondere "1 row". Se dice "0 rows", l'email non corrisponde all'account creato.
3. La persona entra da `https://<dominio>/admin` con la sua email e password. Chi ha il ruolo *ingresso* finisce direttamente sullo scanner.

**Vedere chi ha accesso**
```sql
select u.email, s.ruolo from staff s join auth.users u on u.id = s.user_id;
```

**Cambiare ruolo**
```sql
update staff set ruolo = 'ingresso'
where user_id = (select id from auth.users where email = 'nome@esempio.it');
```

**Togliere l'accesso**: elimina l'utente da **Authentication → Users** (sparisce anche dallo staff).

**Password dimenticata**: in **Authentication → Users**, sull'utente, imposta una password nuova e comunicagliela. "Send password recovery" manda un'email solo se in Supabase è configurato l'invio email.

## 2. SumUp (biglietti)

I pagamenti online passano da SumUp: commissione del 2,5% per pagamento, senza costi fissi.

1. **Pagamenti online attivi.** Su me.sumup.com controlla che l'account dell'associazione possa accettare pagamenti online. Se non è attivo, si chiede a SumUp.
2. **Account di prova (sandbox).** Per le prove crea un esercente di prova: me.sumup.com → Impostazioni → Per sviluppatori → *Sandbox*, oppure dal menu dell'account. Con quello i pagamenti sono finti.
3. **Chiave API.** me.sumup.com → Impostazioni → Per sviluppatori → Toolkit → *Chiavi API* → *Crea*. La chiave (`sup_sk_…`) si vede una volta sola: copiala subito in `SUMUP_API_KEY`. Servono chiavi diverse per l'esercente di prova e per quello vero.
4. **Codice esercente.** `SUMUP_MERCHANT_CODE` è il codice breve dell'esercente (tipo `MH4H92C7`). Lo trovi nel profilo dell'account su me.sumup.com; se non lo trovi, scrivi a SumUp.
5. **Notifiche.** Non si configurano a mano: ogni pagamento dice a SumUp di avvisare `https://<dominio>/api/sumup-webhook`. In locale le notifiche non arrivano, perché SumUp non raggiunge il computer, ma non serve: al ritorno dal pagamento la pagina di conferma rilegge il pagamento da SumUp e completa tutto.
6. **Apple Pay e Google Pay.** Si chiedono a SumUp. Per Apple Pay va registrato il dominio del sito: me.sumup.com → Impostazioni → Per sviluppatori → *Payment wallets*. Quando sono attivi compaiono da soli nel modulo di pagamento.

Carte di prova (con l'esercente sandbox), con qualsiasi scadenza futura e qualsiasi CVV:
- pagamento riuscito: `4200 0000 0000 0091` (Visa) o `5200 0000 0000 0007` (Mastercard);
- con la verifica 3D Secure: `4200 0000 0000 0042`.

Attenzione: in sandbox gli importi di **11,00 €** e di **42,01 / 42,76 / 42,91 €** falliscono sempre apposta. Per le prove usate altri prezzi.

**Diritto di prevendita.** È facoltativo, per ogni evento a pagamento: un importo fisso per biglietto, uguale qualunque carta si usi, mostrato prima del pagamento. Un sovrapprezzo legato al metodo di pagamento, invece, è vietato (art. 62 del Codice del consumo).

## 3. Resend (email con la tessera)

1. Account su resend.com → **API Keys** → `RESEND_API_KEY`.
2. Finché non c'è un dominio lascia `EMAIL_FROM=PNL Officina Creativa <onboarding@resend.dev>`. **Attenzione:** così Resend consegna solo all'email del proprietario dell'account Resend. Va bene per le prove, non per i soci veri.
3. Quando avete il dominio: **Domains → Add domain**, aggiungi i record DNS che Resend indica e poi imposta `EMAIL_FROM=PNL Officina Creativa <tessera@vostrodominio.it>` e `EMAIL_REPLY_TO` sull'indirizzo che leggete davvero.

**Comunicazioni ai soci.** Il piano gratuito di Resend manda al massimo **100 email al giorno** (3.000 al mese). Per scrivere a tutti i soci in una volta serve il piano **Pro** (20 $ al mese, 50.000 email, senza limite giornaliero). Con il piano gratuito l'invio si ferma a 100 e dal pannello si riprende il giorno dopo, da chi manca.

## 4. Vercel (il sito)

1. Metti il progetto su GitHub (repository privato va benissimo).
2. Su vercel.com → *Add New → Project* → importa il repository. Vercel riconosce Astro da solo.
3. **Settings → Environment Variables**: inserisci tutte le variabili di `.env.example`, compresa `SITE_URL=https://<dominio>` e una stringa casuale in `RATE_LIMIT_SALT`.
4. *Deploy*. Poi **Settings → Domains** per collegare il dominio, quando c'è.

Il piano Hobby di Vercel è gratuito ma pensato per uso non commerciale. Per un'associazione non profit di solito va bene, ma conviene leggere i termini.

## 5. Prova completa (in modalità test)

Carta di prova SumUp: `4200 0000 0000 0091`, una scadenza futura qualsiasi, un CVV qualsiasi (non usare importi da 11 €). Le email arrivano all'account Resend finché non c'è il dominio.

1. **Soci esistenti:** in `/admin` → Soci → *Importa lista* scegli il file Excel con le colonne Data/Ora, Email, Nome, Cognome, Telefono. Controlla l'anteprima e importa.
2. **Tessera:** su `/tesseramento` iscriviti con un'email tua e paga. Arrivi su "Benvenuto" e ricevi l'email. Su `/verifica`, con la stessa email o lo stesso telefono, risulta *Attiva*.
3. **Evento:** in `/admin` → Eventi → *Nuovo evento*. Compila, salva, carica la locandina e premi *Salva e pubblica*. Entro un minuto compare in home e su `/eventi`.
4. **Biglietti:** compra due biglietti. Per un evento solo soci, il secondo va intestato a un socio importato, usando la sua email. Ti arriva l'email con due QR.
5. **Iscrizione + biglietto:** con un'email nuova, su un evento solo soci, spunta "Mi iscrivo adesso": paghi tessera e biglietto insieme.
6. **Ingresso:** dal telefono apri `/admin/ingresso` e inquadra un QR dell'email: deve dire *Valido* con il nome. Inquadralo di nuovo: *Già usato*.
7. **Rimborso:** in `/admin` → l'evento → *Rimborsa* su un ordine. Su SumUp compare il rimborso e il QR non vale più.

## Sviluppo in locale

```sh
cp .env.example .env   # e riempi i valori
npm run dev
```

Senza chiavi il sito funziona lo stesso: gli album risultano vuoti, tesseramento e biglietti rispondono "non ancora attivo" e `/admin` dice che Supabase non è collegato. In sviluppo (`npm run dev`) compaiono due **eventi dimostrativi**, per lavorare sulla grafica: `?demo=uno` ne mostra uno solo, `?demo=nessuno` nessuno. Nel sito pubblicato non ci sono.
