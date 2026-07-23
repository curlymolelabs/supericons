-- Non-destructive rollback for final search outcome telemetry.
--
-- This rollback disables the new readers and writers without deleting evidence.
-- The additive tables and linkage columns stay in place so a rollback cannot
-- strand or erase production records.

begin;

update public.search_telemetry_settings
set
  dashboard_source = 'legacy',
  web_ingestion_enabled = false,
  updated_at = timezone('utc', now())
where setting_id = 'active';

drop trigger if exists capture_mcp_search_final_outcome
  on public.mcp_usage_events;

commit;
