-- PNL Officina Creativa: schema iniziale.
-- Da eseguire una volta nel SQL Editor di Supabase (o con `supabase db push`).
-- Le logiche sono descritte in LOGICHE.md.

-- ===========================================================================
-- Staff: gli utenti di Supabase Auth che usano /admin.
--   admin    → tutto il pannello
--   ingresso → solo lo scanner dei biglietti
-- Si aggiungono così (dopo averli creati in Authentication > Users):
--   insert into staff (user_id, ruolo) select id, 'admin' from auth.users where email = 'nome@esempio.it';
-- ===========================================================================
create table staff (
  user_id uuid primary key references auth.users on delete cascade,
  ruolo text not null check (ruolo in ('admin', 'ingresso')),
  created_at timestamptz not null default now()
);
alter table staff enable row level security;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and ruolo = 'admin');
$$;
create function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

create policy "staff legge il proprio ruolo" on staff for select using (user_id = auth.uid() or is_admin());

-- ===========================================================================
-- Contatti normalizzati: è da email e telefono che si riconosce un socio.
-- ===========================================================================
create function norm_email(e text) returns text
language sql immutable as $$ select nullif(lower(btrim(e)), '') $$;

-- "347 123 4567" → "+393471234567"; "0039..." → "+39..."; vuoto → null
create function norm_tel(t text) returns text
language plpgsql immutable as $$
declare s text;
begin
  if t is null then return null; end if;
  s := regexp_replace(btrim(t), '[^0-9+]', '', 'g');
  if s = '' then return null; end if;
  if left(s, 2) = '00' then s := '+' || substr(s, 3); end if;
  if left(s, 1) <> '+' then s := '+39' || s; end if;
  return s;
end $$;

-- ===========================================================================
-- Soci (libro soci). Dal browser li legge solo un admin; il sito scrive lato
-- server con la service role key.
-- ===========================================================================
create sequence soci_numero_seq start 1;

create table soci (
  id uuid primary key default gen_random_uuid(),
  numero integer unique,                       -- assegnato quando il socio diventa attivo
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'attivo', 'receduto')),
  origine text not null default 'online' check (origine in ('online', 'import')),
  nome text not null,
  cognome text not null,
  email text,
  telefono text,
  -- dati del libro soci: obbligatori online, possono mancare per i soci importati
  data_nascita date,
  luogo_nascita text,
  codice_fiscale text,
  indirizzo text,
  cap text,
  comune text,
  provincia text,
  dati_completi boolean generated always as (
    codice_fiscale is not null and data_nascita is not null and luogo_nascita is not null
    and indirizzo is not null and cap is not null and comune is not null and provincia is not null
  ) stored,
  consenso_privacy_at timestamptz,
  iscritto_at timestamptz not null default now(),
  stripe_session_id text,
  stripe_payment_intent text,
  pagato_at timestamptz,
  email_inviata_at timestamptz,
  receduto_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is not null or telefono is not null),
  check (origine = 'import' or (dati_completi and consenso_privacy_at is not null and email is not null and telefono is not null))
);
create unique index soci_codice_fiscale_key on soci (upper(codice_fiscale)) where codice_fiscale is not null;
create index soci_email_idx on soci (email);
create index soci_telefono_idx on soci (telefono);
create index soci_stato_idx on soci (stato);

create function soci_normalizza() returns trigger
language plpgsql as $$
begin
  new.email := norm_email(new.email);
  new.telefono := norm_tel(new.telefono);
  new.codice_fiscale := nullif(upper(btrim(new.codice_fiscale)), '');
  return new;
end $$;
create trigger soci_normalizza before insert or update on soci
  for each row execute function soci_normalizza();

alter table soci enable row level security;
create policy "admin legge soci" on soci for select using (is_admin());

-- Il socio attivo che corrisponde a un'email o a un telefono (null se nessuno).
create function socio_attivo_da_contatto(p_contatto text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from soci
   where stato = 'attivo'
     and (email = norm_email(p_contatto) or telefono = norm_tel(p_contatto))
   order by numero
   limit 1;
$$;
revoke execute on function socio_attivo_da_contatto(text) from public, anon, authenticated;

-- Attiva un socio dopo il pagamento. Idempotente: se è già attivo non restituisce nulla.
create function attiva_socio(p_socio uuid, p_session text, p_payment_intent text)
returns setof soci
language sql security definer set search_path = public as $$
  update soci
     set stato = 'attivo',
         numero = coalesce(numero, nextval('soci_numero_seq')),
         stripe_session_id = p_session,
         stripe_payment_intent = p_payment_intent,
         pagato_at = now(),
         iscritto_at = now(),
         receduto_at = null,
         updated_at = now()
   where id = p_socio and stato = 'in_attesa'
  returning *;
$$;
revoke execute on function attiva_socio(uuid, text, text) from public, anon, authenticated;

create function registra_recesso(p_socio uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  update soci set stato = 'receduto', receduto_at = now(), updated_at = now()
   where id = p_socio and stato = 'attivo';
end $$;
revoke execute on function registra_recesso(uuid) from public, anon;
grant execute on function registra_recesso(uuid) to authenticated;

-- Import della lista soci esistente (dal pannello). Ogni riga:
--   {"nome", "cognome", "email", "telefono", "iscritto_at"}
-- Le righe arrivano già in ordine di iscrizione, così i numeri di tessera seguono la data.
-- Salta chi ha email o telefono già presenti. Restituisce {importati, saltati: [{riga, motivo}]}.
create function importa_soci(p_righe jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  i integer := 0;
  n integer := 0;
  saltati jsonb := '[]'::jsonb;
  em text; tel text;
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  for r in select * from jsonb_array_elements(p_righe) loop
    i := i + 1;
    em := norm_email(r->>'email');
    tel := norm_tel(r->>'telefono');
    if coalesce(btrim(r->>'nome'), '') = '' or coalesce(btrim(r->>'cognome'), '') = '' then
      saltati := saltati || jsonb_build_object('riga', i, 'motivo', 'manca nome o cognome');
    elsif em is null and tel is null then
      saltati := saltati || jsonb_build_object('riga', i, 'motivo', 'manca sia email sia telefono');
    elsif exists (select 1 from soci where (em is not null and email = em) or (tel is not null and telefono = tel)) then
      saltati := saltati || jsonb_build_object('riga', i, 'motivo', 'email o telefono già presenti');
    else
      insert into soci (numero, stato, origine, nome, cognome, email, telefono, iscritto_at)
      values (nextval('soci_numero_seq'), 'attivo', 'import', btrim(r->>'nome'), btrim(r->>'cognome'), em, tel,
              coalesce((r->>'iscritto_at')::timestamptz, now()));
      n := n + 1;
    end if;
  end loop;
  return jsonb_build_object('importati', n, 'saltati', saltati);
end $$;
revoke execute on function importa_soci(jsonb) from public, anon;
grant execute on function importa_soci(jsonb) to authenticated;

-- ===========================================================================
-- Limite di richieste per gli endpoint pubblici.
-- ===========================================================================
create table limiti (
  chiave text not null,
  at timestamptz not null default now()
);
create index limiti_chiave_at_idx on limiti (chiave, at);
alter table limiti enable row level security; -- nessuna policy: solo service role

create function consuma_limite(p_chiave text, p_max integer, p_finestra_secondi integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  select count(*) into n from limiti
   where chiave = p_chiave and at > now() - make_interval(secs => p_finestra_secondi);
  if n >= p_max then return false; end if;
  insert into limiti (chiave) values (p_chiave);
  return true;
end $$;
revoke execute on function consuma_limite(text, integer, integer) from public, anon, authenticated;

-- ===========================================================================
-- Album e foto degli eventi passati. Il pubblico vede solo gli album pubblicati.
-- ===========================================================================
create table album (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titolo text not null,
  data date not null,
  luogo text,
  descrizione text,
  copertina_id uuid,
  pubblicato boolean not null default false,
  created_at timestamptz not null default now()
);

create table foto (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references album on delete cascade,
  path text not null,
  thumb_path text not null,
  width integer not null,
  height integer not null,
  thumb_width integer not null,
  thumb_height integer not null,
  ordine integer not null default 0,
  alt text,
  created_at timestamptz not null default now()
);
create index foto_album_ordine_idx on foto (album_id, ordine);
alter table album add constraint album_copertina_fk foreign key (copertina_id) references foto on delete set null;

alter table album enable row level security;
alter table foto enable row level security;
create policy "pubblico legge album pubblicati" on album for select using (pubblicato or is_admin());
create policy "admin scrive album" on album for all using (is_admin()) with check (is_admin());
create policy "pubblico legge foto pubblicate" on foto for select
  using (is_admin() or exists (select 1 from album a where a.id = album_id and a.pubblicato));
create policy "admin scrive foto" on foto for all using (is_admin()) with check (is_admin());

-- ===========================================================================
-- Eventi
-- ===========================================================================
create table eventi (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  titolo text not null,
  descrizione text,
  locandina_path text,
  locandina_width integer,
  locandina_height integer,
  data date not null,
  ora_inizio time not null,
  ora_fine time not null,
  inizio timestamptz,                 -- calcolati dal trigger, ora italiana
  fine timestamptz,
  luogo_nome text not null,
  luogo_indirizzo text,
  accesso text not null default 'pubblico' check (accesso in ('pubblico', 'soci')),
  ingresso text not null default 'pagamento' check (ingresso in ('libero', 'pagamento')),
  prezzo_cent integer check (prezzo_cent is null or prezzo_cent >= 50),   -- Stripe: minimo 0,50 €
  prenotazione boolean not null default false,  -- solo per l'ingresso libero
  posti integer check (posti is null or posti > 0),
  max_per_ordine integer not null default 6 check (max_per_ordine between 1 and 20),
  vendite_fino_a timestamptz,         -- se vuoto: fino all'inizio dell'evento
  stato text not null default 'bozza' check (stato in ('bozza', 'pubblicato', 'annullato')),
  album_id uuid references album on delete set null,
  created_at timestamptz not null default now(),
  check (ingresso = 'libero' or prezzo_cent is not null)
);
create index eventi_inizio_idx on eventi (inizio);

create function eventi_orari() returns trigger
language plpgsql as $$
begin
  new.inizio := (new.data + new.ora_inizio) at time zone 'Europe/Rome';
  new.fine := (new.data + new.ora_fine + case when new.ora_fine <= new.ora_inizio then interval '1 day' else interval '0' end)
              at time zone 'Europe/Rome';
  if new.ingresso = 'libero' then new.prezzo_cent := null; end if;
  return new;
end $$;
create trigger eventi_orari before insert or update on eventi
  for each row execute function eventi_orari();

alter table eventi enable row level security;
create policy "pubblico legge eventi pubblicati" on eventi for select
  using (stato in ('pubblicato', 'annullato') or is_staff());
create policy "admin scrive eventi" on eventi for all using (is_admin()) with check (is_admin());

-- ===========================================================================
-- Ordini e biglietti
-- ===========================================================================
create table ordini (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventi on delete restrict,
  nome text not null,
  cognome text not null,
  email text not null,
  telefono text not null,
  n_biglietti integer not null check (n_biglietti > 0),
  importo_cent integer not null default 0,      -- biglietti
  quota_cent integer not null default 0,        -- tessera, se l'ordine la include
  socio_nuovo_id uuid references soci on delete set null,
  stato text not null default 'in_attesa'
    check (stato in ('in_attesa', 'confermato', 'scaduto', 'annullato', 'rimborsato')),
  stripe_session_id text unique,
  stripe_payment_intent text,
  scade_at timestamptz not null default now() + interval '35 minutes',
  confermato_at timestamptz,
  email_inviata_at timestamptz,
  rimborsato_at timestamptz,
  created_at timestamptz not null default now()
);
create index ordini_evento_idx on ordini (evento_id, stato);

create table biglietti (
  id uuid primary key default gen_random_uuid(),
  ordine_id uuid not null references ordini on delete cascade,
  evento_id uuid not null references eventi on delete restrict,
  nome text not null,
  cognome text not null,
  socio_id uuid references soci on delete set null,
  codice text not null unique default replace(gen_random_uuid()::text, '-', ''),
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'valido', 'usato', 'annullato')),
  usato_at timestamptz,
  usato_da uuid,
  created_at timestamptz not null default now()
);
create index biglietti_evento_idx on biglietti (evento_id, stato);
create index biglietti_ordine_idx on biglietti (ordine_id);

alter table ordini enable row level security;
alter table biglietti enable row level security;
create policy "admin legge ordini" on ordini for select using (is_admin());
create policy "admin legge biglietti" on biglietti for select using (is_admin());

-- Posti occupati: biglietti validi o usati, più quelli in un pagamento ancora aperto.
create function posti_occupati(p_evento uuid) returns integer
language sql stable security definer set search_path = public as $$
  select count(*)::integer
    from biglietti b join ordini o on o.id = b.ordine_id
   where b.evento_id = p_evento
     and (b.stato in ('valido', 'usato') or (b.stato = 'in_attesa' and o.stato = 'in_attesa' and o.scade_at > now()));
$$;
grant execute on function posti_occupati(uuid) to anon, authenticated;

-- Crea un ordine controllando, sotto lock, vendita aperta, quantità, posti e
-- biglietti doppi per lo stesso socio.
--   p_acquirente: {"nome","cognome","email","telefono"}
--   p_biglietti:  [{"nome","cognome","socio_id"?}]
-- Errori (nel messaggio): vendite_chiuse, quantita, esaurito, gia_biglietto:<indice>
-- Un ordine gratuito senza tessera è confermato subito.
create function crea_ordine(p_evento uuid, p_acquirente jsonb, p_biglietti jsonb, p_socio_nuovo uuid, p_quota_cent integer)
returns ordini
language plpgsql security definer set search_path = public as $$
declare
  e eventi;
  n integer := jsonb_array_length(p_biglietti);
  o ordini;
  b jsonb;
  i integer := 0;
  gratis boolean;
begin
  select * into e from eventi where id = p_evento for update;
  if e.id is null or e.stato <> 'pubblicato' or now() >= coalesce(e.vendite_fino_a, e.inizio)
     or (e.ingresso = 'libero' and not e.prenotazione) then
    raise exception 'vendite_chiuse';
  end if;
  if n < 1 or n > e.max_per_ordine then raise exception 'quantita'; end if;
  if e.posti is not null and posti_occupati(e.id) + n > e.posti then raise exception 'esaurito'; end if;

  for b in select * from jsonb_array_elements(p_biglietti) loop
    i := i + 1;
    if b->>'socio_id' is not null and exists (
      select 1 from biglietti x join ordini y on y.id = x.ordine_id
       where x.evento_id = e.id and x.socio_id = (b->>'socio_id')::uuid
         and (x.stato in ('valido', 'usato') or (x.stato = 'in_attesa' and y.stato = 'in_attesa' and y.scade_at > now()))
    ) then
      raise exception 'gia_biglietto:%', i;
    end if;
  end loop;

  gratis := (e.ingresso = 'libero' and coalesce(p_quota_cent, 0) = 0);
  insert into ordini (evento_id, nome, cognome, email, telefono, n_biglietti, importo_cent, quota_cent, socio_nuovo_id, stato, confermato_at)
  values (e.id, p_acquirente->>'nome', p_acquirente->>'cognome', norm_email(p_acquirente->>'email'), norm_tel(p_acquirente->>'telefono'),
          n, case when e.ingresso = 'pagamento' then e.prezzo_cent * n else 0 end, coalesce(p_quota_cent, 0), p_socio_nuovo,
          case when gratis then 'confermato' else 'in_attesa' end, case when gratis then now() end)
  returning * into o;

  insert into biglietti (ordine_id, evento_id, nome, cognome, socio_id, stato)
  select o.id, e.id, btrim(x->>'nome'), btrim(x->>'cognome'), (x->>'socio_id')::uuid,
         case when gratis then 'valido' else 'in_attesa' end
    from jsonb_array_elements(p_biglietti) x;
  return o;
end $$;
revoke execute on function crea_ordine(uuid, jsonb, jsonb, uuid, integer) from public, anon, authenticated;

-- Conferma un ordine pagato. Idempotente: se è già confermato non restituisce nulla.
create function conferma_ordine(p_ordine uuid, p_session text, p_payment_intent text)
returns setof ordini
language plpgsql security definer set search_path = public as $$
declare o ordini;
begin
  update ordini set stato = 'confermato', confermato_at = now(),
                    stripe_session_id = coalesce(p_session, stripe_session_id),
                    stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent)
   where id = p_ordine and stato in ('in_attesa', 'scaduto')
  returning * into o;
  if o.id is null then return; end if;
  update biglietti set stato = 'valido' where ordine_id = o.id and stato = 'in_attesa';
  return next o;
end $$;
revoke execute on function conferma_ordine(uuid, text, text) from public, anon, authenticated;

-- Annulla un ordine (dopo un rimborso, o un evento annullato): i biglietti smettono di valere.
create function annulla_ordine(p_ordine uuid, p_rimborsato boolean)
returns void
language sql security definer set search_path = public as $$
  update biglietti set stato = 'annullato' where ordine_id = p_ordine and stato <> 'usato';
  update ordini set stato = case when p_rimborsato then 'rimborsato' else 'annullato' end,
                    rimborsato_at = case when p_rimborsato then now() end
   where id = p_ordine;
$$;
revoke execute on function annulla_ordine(uuid, boolean) from public, anon, authenticated;

-- Annulla un singolo biglietto dal pannello (senza rimborso).
create function annulla_biglietto(p_biglietto uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  update biglietti set stato = 'annullato' where id = p_biglietto and stato in ('valido', 'in_attesa');
end $$;
revoke execute on function annulla_biglietto(uuid) from public, anon;
grant execute on function annulla_biglietto(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ingresso: lo scanner. Segna il biglietto come usato in modo atomico.
-- Esiti: valido, gia_usato, non_valido, altro_evento, inesistente
-- ---------------------------------------------------------------------------
create function ingresso(p_evento uuid, p_codice text default null, p_biglietto uuid default null)
returns table (esito text, nome text, cognome text, usato_at timestamptz, altro_evento text)
language plpgsql security definer set search_path = public as $$
declare b biglietti;
begin
  if not is_staff() then raise exception 'non autorizzato'; end if;
  select * into b from biglietti x
   where (p_codice is not null and x.codice = lower(btrim(p_codice))) or (p_biglietto is not null and x.id = p_biglietto);
  if b.id is null then
    return query select 'inesistente'::text, null::text, null::text, null::timestamptz, null::text; return;
  end if;
  if b.evento_id <> p_evento then
    return query select 'altro_evento'::text, b.nome, b.cognome, null::timestamptz, (select titolo from eventi where id = b.evento_id); return;
  end if;
  if b.stato = 'usato' then
    return query select 'gia_usato'::text, b.nome, b.cognome, b.usato_at, null::text; return;
  end if;
  if b.stato <> 'valido' then
    return query select 'non_valido'::text, b.nome, b.cognome, null::timestamptz, null::text; return;
  end if;
  update biglietti x set stato = 'usato', usato_at = now(), usato_da = auth.uid()
   where x.id = b.id and x.stato = 'valido';
  if not found then  -- usato un istante fa da un altro scanner
    return query select 'gia_usato'::text, b.nome, b.cognome, now(), null::text; return;
  end if;
  return query select 'valido'::text, b.nome, b.cognome, now(), null::text;
end $$;
revoke execute on function ingresso(uuid, text, uuid) from public, anon;
grant execute on function ingresso(uuid, text, uuid) to authenticated;

-- Ricerca per nome all'ingresso (se il QR non si legge). Solo i campi necessari.
create function cerca_biglietti(p_evento uuid, p_testo text)
returns table (id uuid, nome text, cognome text, stato text, usato_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'non autorizzato'; end if;
  return query
    select b.id, b.nome, b.cognome, b.stato, b.usato_at from biglietti b
     where b.evento_id = p_evento and b.stato in ('valido', 'usato')
       and (b.nome || ' ' || b.cognome) ilike '%' || btrim(p_testo) || '%'
     order by b.cognome, b.nome
     limit 30;
end $$;
revoke execute on function cerca_biglietti(uuid, text) from public, anon;
grant execute on function cerca_biglietti(uuid, text) to authenticated;

-- Conteggi per lo scanner: entrati / validi.
create function conteggio_ingressi(p_evento uuid)
returns table (entrati integer, totale integer)
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'non autorizzato'; end if;
  return query select count(*) filter (where stato = 'usato')::integer, count(*)::integer
                 from biglietti where evento_id = p_evento and stato in ('valido', 'usato');
end $$;
revoke execute on function conteggio_ingressi(uuid) from public, anon;
grant execute on function conteggio_ingressi(uuid) to authenticated;

-- ===========================================================================
-- Storage: foto degli album e locandine, pubbliche in lettura, scritte dagli admin.
-- ===========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album', 'album', true, 10485760, array['image/webp', 'image/jpeg']),
       ('locandine', 'locandine', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "admin carica immagini" on storage.objects for insert to authenticated
  with check (bucket_id in ('album', 'locandine') and public.is_admin());
create policy "admin aggiorna immagini" on storage.objects for update to authenticated
  using (bucket_id in ('album', 'locandine') and public.is_admin());
create policy "admin cancella immagini" on storage.objects for delete to authenticated
  using (bucket_id in ('album', 'locandine') and public.is_admin());

-- ===========================================================================
-- Pulizia notturna (pg_cron): iscrizioni mai pagate dopo 90 giorni (come dice
-- l'informativa), ordini mai pagati dopo 30 giorni, registro dei limiti.
-- ===========================================================================
create extension if not exists pg_cron;
select cron.schedule('pulizia-notturna', '0 3 * * *', $$
  delete from public.ordini where stato in ('in_attesa', 'scaduto') and created_at < now() - interval '30 days';
  delete from public.soci where stato = 'in_attesa' and updated_at < now() - interval '90 days'
    and not exists (select 1 from public.ordini o where o.socio_nuovo_id = soci.id);
  delete from public.limiti where at < now() - interval '1 day';
$$);
