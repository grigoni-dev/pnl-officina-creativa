-- Soci aggiunti a mano dal pannello e comunicazioni via email ai soci.
-- Si può rieseguire.

-- ---------------------------------------------------------------------------
-- Soci aggiunti a mano (origine 'manuale'): come gli importati, il consenso è
-- raccolto fuori dal sito.
-- ---------------------------------------------------------------------------
alter table soci drop constraint if exists soci_origine_check;
alter table soci add constraint soci_origine_check check (origine in ('online', 'import', 'manuale'));
alter table soci drop constraint if exists soci_online_completi;
alter table soci add constraint soci_online_completi
  check (origine in ('import', 'manuale') or (consenso_privacy_at is not null and email is not null and telefono is not null));

create or replace function aggiungi_socio(p_nome text, p_cognome text, p_data_nascita date, p_email text, p_telefono text, p_note text)
returns soci
language plpgsql security definer set search_path = public as $$
declare
  r soci;
  em text := norm_email(p_email);
  tel text := norm_tel(p_telefono);
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  if coalesce(btrim(p_nome), '') = '' or coalesce(btrim(p_cognome), '') = '' then raise exception 'manca nome o cognome'; end if;
  if em is null and tel is null then raise exception 'serve email o telefono'; end if;
  if exists (select 1 from soci where stato <> 'in_attesa' and ((em is not null and email = em) or (tel is not null and telefono = tel))) then
    raise exception 'gia_presente';
  end if;
  insert into soci (numero, stato, origine, nome, cognome, data_nascita, email, telefono, note, iscritto_at)
  values (nextval('soci_numero_seq'), 'attivo', 'manuale', btrim(p_nome), btrim(p_cognome), p_data_nascita, em, tel,
          nullif(btrim(p_note), ''), now())
  returning * into r;
  return r;
end $$;
revoke execute on function aggiungi_socio(text, text, date, text, text, text) from public, anon;
grant execute on function aggiungi_socio(text, text, date, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Comunicazioni: chi non vuole più riceverle si disiscrive dal link nell'email.
-- ---------------------------------------------------------------------------
alter table soci add column if not exists comunicazioni boolean not null default true;
alter table soci add column if not exists disiscritto_at timestamptz;

create table if not exists campagne (
  id uuid primary key default gen_random_uuid(),
  oggetto text not null,
  testo text not null,
  evento_id uuid references eventi on delete set null,
  creata_da uuid references auth.users on delete set null,
  destinatari integer not null default 0,
  inviati integer not null default 0,
  falliti integer not null default 0,
  created_at timestamptz not null default now(),
  completata_at timestamptz
);

-- Una riga per socio raggiunto: l'invio a lotti riparte da chi manca, senza doppioni.
create table if not exists campagna_invii (
  campagna_id uuid not null references campagne on delete cascade,
  socio_id uuid not null references soci on delete cascade,
  esito text not null default 'ok' check (esito in ('ok', 'errore')),
  inviato_at timestamptz not null default now(),
  primary key (campagna_id, socio_id)
);

alter table campagne enable row level security;
alter table campagna_invii enable row level security;
drop policy if exists "admin legge campagne" on campagne;
create policy "admin legge campagne" on campagne for select using (is_admin());
drop policy if exists "admin legge invii" on campagna_invii;
create policy "admin legge invii" on campagna_invii for select using (is_admin());
