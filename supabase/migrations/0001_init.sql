-- PNL Officina Creativa: schema iniziale.
-- Da eseguire una volta nel SQL Editor di Supabase (o con `supabase db push`).


-- ---------------------------------------------------------------------------
-- Admin: gli utenti di Supabase Auth che possono usare /admin.
-- Un admin si aggiunge così (dopo averlo creato in Authentication > Users):
--   insert into admins (user_id) select id from auth.users where email = 'nome@esempio.it';
-- ---------------------------------------------------------------------------
create table admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;

create function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create policy "admin legge admin" on admins for select using (is_admin());

-- ---------------------------------------------------------------------------
-- Soci (libro soci). Nessun accesso dal browser se non per gli admin, in lettura.
-- Il sito scrive con la service role key, solo lato server.
-- ---------------------------------------------------------------------------
create sequence soci_numero_seq start 1;

create table soci (
  id uuid primary key default gen_random_uuid(),
  numero integer unique,                       -- assegnato quando la quota è pagata
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'attivo', 'receduto')),
  nome text not null,
  cognome text not null,
  data_nascita date not null,
  luogo_nascita text not null,
  codice_fiscale text not null,
  indirizzo text not null,
  cap text not null,
  comune text not null,
  provincia text not null,
  email text not null,
  telefono text,
  consenso_privacy_at timestamptz not null,
  stripe_session_id text,
  stripe_payment_intent text,
  pagato_at timestamptz,
  email_inviata_at timestamptz,
  receduto_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index soci_codice_fiscale_key on soci (upper(codice_fiscale));
create index soci_stato_idx on soci (stato);

alter table soci enable row level security;
create policy "admin legge soci" on soci for select using (is_admin());

-- Attiva un socio dopo il pagamento. Idempotente: se è già attivo non restituisce
-- nulla, così chi chiama sa di non dover rifare nulla.
create function attiva_socio(p_socio uuid, p_session text, p_payment_intent text)
returns setof soci
language sql security definer set search_path = public as $$
  update soci
     set stato = 'attivo',
         numero = coalesce(numero, nextval('soci_numero_seq')),
         stripe_session_id = p_session,
         stripe_payment_intent = p_payment_intent,
         pagato_at = now(),
         receduto_at = null,
         updated_at = now()
   where id = p_socio and stato = 'in_attesa'
  returning *;
$$;
revoke execute on function attiva_socio(uuid, text, text) from public, anon, authenticated;

-- Recesso, registrato da un admin dal pannello.
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

-- ---------------------------------------------------------------------------
-- Limite di richieste per gli endpoint pubblici (verifica tessera, iscrizione).
-- ---------------------------------------------------------------------------
create table limiti (
  chiave text not null,
  at timestamptz not null default now()
);
create index limiti_chiave_at_idx on limiti (chiave, at);
alter table limiti enable row level security; -- nessuna policy: solo service role

-- true se la richiesta è consentita (e la registra), false se il limite è superato.
create function consuma_limite(p_chiave text, p_max integer, p_finestra_secondi integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from limiti where at < now() - interval '1 day';
  select count(*) into n from limiti
   where chiave = p_chiave and at > now() - make_interval(secs => p_finestra_secondi);
  if n >= p_max then return false; end if;
  insert into limiti (chiave) values (p_chiave);
  return true;
end $$;
revoke execute on function consuma_limite(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Album e foto. Il pubblico vede solo gli album pubblicati.
-- ---------------------------------------------------------------------------
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
  path text not null,          -- foto grande, nel bucket "album"
  thumb_path text not null,    -- miniatura
  width integer not null,
  height integer not null,
  thumb_width integer not null,
  thumb_height integer not null,
  ordine integer not null default 0,
  alt text,
  created_at timestamptz not null default now()
);
create index foto_album_ordine_idx on foto (album_id, ordine);

alter table album add constraint album_copertina_fk
  foreign key (copertina_id) references foto on delete set null;

alter table album enable row level security;
alter table foto enable row level security;

create policy "pubblico legge album pubblicati" on album for select
  using (pubblicato or is_admin());
create policy "admin scrive album" on album for all
  using (is_admin()) with check (is_admin());

create policy "pubblico legge foto pubblicate" on foto for select
  using (is_admin() or exists (select 1 from album a where a.id = album_id and a.pubblicato));
create policy "admin scrive foto" on foto for all
  using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- Storage: bucket pubblico "album"; solo gli admin caricano e cancellano.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('album', 'album', true, 10485760, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "admin carica foto" on storage.objects for insert to authenticated
  with check (bucket_id = 'album' and public.is_admin());
create policy "admin aggiorna foto" on storage.objects for update to authenticated
  using (bucket_id = 'album' and public.is_admin());
create policy "admin cancella foto" on storage.objects for delete to authenticated
  using (bucket_id = 'album' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Pulizia notturna (pg_cron): iscrizioni mai pagate dopo 90 giorni, come dice
-- l'informativa privacy, e il registro del limite di richieste.
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('pulizia-notturna', '0 3 * * *', $$
  delete from public.soci where stato = 'in_attesa' and updated_at < now() - interval '90 days';
  delete from public.limiti where at < now() - interval '1 day';
$$);
