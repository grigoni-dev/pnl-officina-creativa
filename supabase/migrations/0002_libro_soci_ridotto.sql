-- Libro soci ridotto: nome, cognome, data di nascita, email, telefono.
-- Si può rieseguire senza problemi.
-- Serve solo se avevi già eseguito una versione di 0001 con codice fiscale e
-- indirizzo; su un database creato con lo 0001 attuale non cambia nulla.

do $$
declare c record;
begin
  -- i vincoli che usano dati_completi vanno tolti prima di ricrearla
  for c in select conname from pg_constraint
            where conrelid = 'public.soci'::regclass and contype = 'c'
              and pg_get_constraintdef(oid) like '%dati_completi%'
  loop
    execute format('alter table public.soci drop constraint %I', c.conname);
  end loop;
end $$;

drop index if exists soci_codice_fiscale_key;
alter table soci drop column if exists dati_completi;
alter table soci
  drop column if exists luogo_nascita,
  drop column if exists codice_fiscale,
  drop column if exists indirizzo,
  drop column if exists cap,
  drop column if exists comune,
  drop column if exists provincia;

alter table soci add column dati_completi boolean
  generated always as (data_nascita is not null and email is not null and telefono is not null) stored;
alter table soci drop constraint if exists soci_online_completi;
alter table soci add constraint soci_online_completi
  check (origine = 'import' or (consenso_privacy_at is not null and email is not null and telefono is not null));

create or replace function soci_normalizza() returns trigger
language plpgsql as $$
begin
  new.email := norm_email(new.email);
  new.telefono := norm_tel(new.telefono);
  return new;
end $$;
