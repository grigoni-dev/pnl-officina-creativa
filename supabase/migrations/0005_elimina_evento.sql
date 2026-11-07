-- Eliminare un evento dal pannello. Si può rieseguire.
-- Solo se non ha mai venduto: gli ordini pagati (anche se poi rimborsati o
-- annullati) sono registrazioni contabili e restano. In quel caso l'evento si
-- annulla o si rimette in bozza.
-- Restituisce il percorso della locandina, che il pannello cancella dallo storage.

create or replace function elimina_evento(p_evento uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  e eventi;
begin
  if not is_admin() then raise exception 'non autorizzato'; end if;
  select * into e from eventi where id = p_evento for update;
  if e.id is null then raise exception 'evento inesistente'; end if;
  if exists (select 1 from ordini where evento_id = e.id and stato in ('confermato', 'rimborsato', 'annullato')) then
    raise exception 'ha_vendite';
  end if;
  -- ordini mai pagati (scaduti o abbandonati): si possono togliere
  delete from biglietti where evento_id = e.id;
  delete from ordini where evento_id = e.id;
  delete from eventi where id = e.id;
  return e.locandina_path;
end $$;
revoke execute on function elimina_evento(uuid) from public, anon;
grant execute on function elimina_evento(uuid) to authenticated;
