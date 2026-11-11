-- Adesione su richiesta, biglietti su un sito esterno, import più chiaro.
-- Si può rieseguire.

-- ===========================================================================
-- Biglietti su un sito esterno: se c'è il link, il bottone dell'evento porta lì
-- invece che al modulo del sito.
-- ===========================================================================
alter table eventi add column if not exists biglietti_url text;
alter table eventi drop constraint if exists eventi_biglietti_url_check;
alter table eventi add constraint eventi_biglietti_url_check
  check (biglietti_url is null or biglietti_url ~ '^https?://[^\s]+$');

-- ===========================================================================
-- Adesione su richiesta (statuto: l'ammissione la decide l'associazione).
-- Chi compila /tesseramento resta "in_attesa" finché un admin non approva.
-- La quota si paga fuori dal sito: approvare vuol dire anche "quota ricevuta".
-- ===========================================================================

-- Il socio già presente (attivo o receduto) con questa email o questo telefono.
create or replace function socio_con_contatti(p_email text, p_telefono text)
returns soci
language sql stable security definer set search_path = public as $$
  select * from soci
   where stato <> 'in_attesa'
     and ((norm_email(p_email) is not null and email = norm_email(p_email))
       or (norm_tel(p_telefono) is not null and telefono = norm_tel(p_telefono)))
   order by (stato = 'attivo') desc, numero
   limit 1;
$$;
revoke execute on function socio_con_contatti(text, text) from public, anon, authenticated;

create or replace function approva_richiesta(p_socio uuid)
returns soci
language plpgsql security definer set search_path = public as $$
declare
  r soci;
  gia soci;
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  select * into r from soci where id = p_socio and stato = 'in_attesa' for update;
  if not found then raise exception 'richiesta_non_trovata'; end if;
  select * into gia from soci where stato = 'attivo' and id <> r.id
     and ((r.email is not null and email = r.email) or (r.telefono is not null and telefono = r.telefono))
   limit 1;
  if found then raise exception 'gia_presente:%:% %', gia.numero, gia.nome, gia.cognome; end if;
  update soci
     set stato = 'attivo',
         numero = coalesce(numero, nextval('soci_numero_seq')),
         iscritto_at = now(),
         pagato_at = now(),
         receduto_at = null,
         updated_at = now()
   where id = r.id
  returning * into r;
  return r;
end $$;
revoke execute on function approva_richiesta(uuid) from public, anon;
grant execute on function approva_richiesta(uuid) to authenticated;

-- Una richiesta rifiutata si cancella: non teniamo dati di chi non è socio.
create or replace function rifiuta_richiesta(p_socio uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  delete from soci where id = p_socio and stato = 'in_attesa'
     and not exists (select 1 from ordini where socio_nuovo_id = p_socio);
  if not found then raise exception 'richiesta_non_trovata'; end if;
end $$;
revoke execute on function rifiuta_richiesta(uuid) from public, anon;
grant execute on function rifiuta_richiesta(uuid) to authenticated;

-- ===========================================================================
-- Aggiungi socio a mano: se c'è già, dice chi è.
-- ===========================================================================
create or replace function aggiungi_socio(p_nome text, p_cognome text, p_data_nascita date, p_email text, p_telefono text, p_note text)
returns soci
language plpgsql security definer set search_path = public as $$
declare
  r soci;
  gia soci;
  em text := norm_email(p_email);
  tel text := norm_tel(p_telefono);
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  if coalesce(btrim(p_nome), '') = '' or coalesce(btrim(p_cognome), '') = '' then raise exception 'manca nome o cognome'; end if;
  if em is null and tel is null then raise exception 'serve email o telefono'; end if;
  gia := socio_con_contatti(em, tel);
  if gia.id is not null then raise exception 'gia_presente:%:% %', gia.numero, gia.nome, gia.cognome; end if;
  insert into soci (numero, stato, origine, nome, cognome, data_nascita, email, telefono, note, iscritto_at)
  values (nextval('soci_numero_seq'), 'attivo', 'manuale', btrim(p_nome), btrim(p_cognome), p_data_nascita, em, tel,
          nullif(btrim(p_note), ''), now())
  returning * into r;
  return r;
end $$;
revoke execute on function aggiungi_socio(text, text, date, text, text, text) from public, anon;
grant execute on function aggiungi_socio(text, text, date, text, text, text) to authenticated;

-- ===========================================================================
-- Import. Ogni riga:
--   {"nome", "cognome", "email", "telefono", "iscritto_at", "data_nascita"}
-- (data_nascita facoltativa: c'è nel CSV esportato dal pannello).
-- I numeri di tessera si assegnano sempre in ordine di iscrizione.
-- Le richieste in attesa non bloccano l'import: se la persona entra dalla
-- lista, la sua richiesta si chiude da sola.
-- Restituisce {importati, saltati: [{riga, motivo}]}.
-- ===========================================================================
create or replace function importa_soci(p_righe jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  r jsonb;
  i integer := 0;
  n integer := 0;
  saltati jsonb := '[]'::jsonb;
  em text; tel text; nascita date;
  gia soci;
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  for r in select * from jsonb_array_elements(p_righe) loop
    i := i + 1;
    em := norm_email(r->>'email');
    tel := norm_tel(r->>'telefono');
    begin
      nascita := nullif(btrim(r->>'data_nascita'), '')::date;
    exception when others then
      nascita := null;
    end;
    if coalesce(btrim(r->>'nome'), '') = '' or coalesce(btrim(r->>'cognome'), '') = '' then
      saltati := saltati || jsonb_build_object('riga', i, 'motivo', 'manca nome o cognome');
      continue;
    end if;
    if em is null and tel is null then
      saltati := saltati || jsonb_build_object('riga', i, 'motivo', 'manca sia email sia telefono');
      continue;
    end if;
    gia := socio_con_contatti(em, tel);
    if gia.id is not null then
      saltati := saltati || jsonb_build_object('riga', i, 'motivo',
        format('già presente: %s %s, tessera N° %s%s (%s)', gia.nome, gia.cognome, gia.numero,
               case when gia.stato = 'receduto' then ', receduto' else '' end,
               case when em is not null and gia.email = em then 'stessa email' else 'stesso telefono' end));
      continue;
    end if;
    delete from soci where stato = 'in_attesa'
       and ((em is not null and email = em) or (tel is not null and telefono = tel))
       and not exists (select 1 from ordini o where o.socio_nuovo_id = soci.id);
    insert into soci (numero, stato, origine, nome, cognome, email, telefono, data_nascita, iscritto_at)
    values (nextval('soci_numero_seq'), 'attivo', 'import', btrim(r->>'nome'), btrim(r->>'cognome'), em, tel, nascita,
            coalesce((r->>'iscritto_at')::timestamptz, now()));
    n := n + 1;
  end loop;
  return jsonb_build_object('importati', n, 'saltati', saltati);
end $$;
revoke execute on function importa_soci(jsonb) from public, anon;
grant execute on function importa_soci(jsonb) to authenticated;

-- ===========================================================================
-- Pulizia notturna: le richieste di adesione restano finché non le approvate
-- o rifiutate, ma non oltre 180 giorni senza risposta (come dice l'informativa).
-- Il resto non cambia.
-- ===========================================================================
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('pulizia-notturna', '0 3 * * *', $job$
      delete from public.ordini where stato in ('in_attesa', 'scaduto') and created_at < now() - interval '30 days';
      delete from public.soci where stato = 'in_attesa' and created_at < now() - interval '180 days'
        and not exists (select 1 from public.ordini o where o.socio_nuovo_id = soci.id);
      delete from public.limiti where at < now() - interval '1 day';
    $job$);
  end if;
end $$;
