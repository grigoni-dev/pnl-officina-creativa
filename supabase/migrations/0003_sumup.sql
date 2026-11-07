-- Pagamenti con SumUp invece di Stripe: le colonne dei pagamenti prendono nomi
-- neutri e le funzioni che le scrivono vengono ricreate. In più il diritto di
-- prevendita facoltativo per evento. Si può rieseguire.

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'soci' and column_name = 'stripe_session_id') then
    alter table public.soci rename column stripe_session_id to checkout_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'soci' and column_name = 'stripe_payment_intent') then
    alter table public.soci rename column stripe_payment_intent to transazione_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ordini' and column_name = 'stripe_session_id') then
    alter table public.ordini rename column stripe_session_id to checkout_id;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ordini' and column_name = 'stripe_payment_intent') then
    alter table public.ordini rename column stripe_payment_intent to transazione_id;
  end if;
  if exists (select 1 from pg_constraint where conname = 'ordini_stripe_session_id_key') then
    alter table public.ordini rename constraint ordini_stripe_session_id_key to ordini_checkout_id_key;
  end if;
end $$;

-- I nomi dei parametri cambiano: le funzioni vanno tolte e ricreate.
drop function if exists attiva_socio(uuid, text, text);
create function attiva_socio(p_socio uuid, p_checkout text, p_transazione text)
returns setof soci
language sql security definer set search_path = public as $$
  update soci
     set stato = 'attivo',
         numero = coalesce(numero, nextval('soci_numero_seq')),
         checkout_id = p_checkout,
         transazione_id = p_transazione,
         pagato_at = now(),
         iscritto_at = now(),
         receduto_at = null,
         updated_at = now()
   where id = p_socio and stato = 'in_attesa'
  returning *;
$$;
revoke execute on function attiva_socio(uuid, text, text) from public, anon, authenticated;

drop function if exists conferma_ordine(uuid, text, text);
create function conferma_ordine(p_ordine uuid, p_checkout text, p_transazione text)
returns setof ordini
language plpgsql security definer set search_path = public as $$
declare o ordini;
begin
  update ordini set stato = 'confermato', confermato_at = now(),
                    checkout_id = coalesce(p_checkout, checkout_id),
                    transazione_id = coalesce(p_transazione, transazione_id)
   where id = p_ordine and stato in ('in_attesa', 'scaduto')
  returning * into o;
  if o.id is null then return; end if;
  update biglietti set stato = 'valido' where ordine_id = o.id and stato = 'in_attesa';
  return next o;
end $$;
revoke execute on function conferma_ordine(uuid, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Diritto di prevendita facoltativo: un importo fisso per biglietto, solo per
-- gli eventi a pagamento, uguale per tutti i metodi di pagamento (non è un
-- sovrapprezzo sul metodo, vietato dall'art. 62 del Codice del consumo).
-- ---------------------------------------------------------------------------
alter table eventi add column if not exists prevendita_cent integer not null default 0;
alter table eventi drop constraint if exists eventi_prevendita_check;
alter table eventi add constraint eventi_prevendita_check check (prevendita_cent >= 0);
alter table ordini add column if not exists prevendita_cent integer not null default 0;

create or replace function crea_ordine(p_evento uuid, p_acquirente jsonb, p_biglietti jsonb, p_socio_nuovo uuid, p_quota_cent integer)
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
  insert into ordini (evento_id, nome, cognome, email, telefono, n_biglietti, importo_cent, prevendita_cent, quota_cent, socio_nuovo_id, stato, confermato_at)
  values (e.id, p_acquirente->>'nome', p_acquirente->>'cognome', norm_email(p_acquirente->>'email'), norm_tel(p_acquirente->>'telefono'),
          n, case when e.ingresso = 'pagamento' then e.prezzo_cent * n else 0 end,
          case when e.ingresso = 'pagamento' then e.prevendita_cent * n else 0 end,
          coalesce(p_quota_cent, 0), p_socio_nuovo,
          case when gratis then 'confermato' else 'in_attesa' end, case when gratis then now() end)
  returning * into o;

  insert into biglietti (ordine_id, evento_id, nome, cognome, socio_id, stato)
  select o.id, e.id, btrim(x->>'nome'), btrim(x->>'cognome'), (x->>'socio_id')::uuid,
         case when gratis then 'valido' else 'in_attesa' end
    from jsonb_array_elements(p_biglietti) x;
  return o;
end $$;
revoke execute on function crea_ordine(uuid, jsonb, jsonb, uuid, integer) from public, anon, authenticated;
