-- Non-destructive rollback for the final-outcome history and field repair.
--
-- The nullable latency column and corrected historical coverage flags remain.
-- Older code ignores the additive column, while restoring false coverage flags
-- would make historical evidence less truthful.

begin;

update public.search_telemetry_settings
set
  dashboard_source = 'legacy',
  updated_at = timezone('utc', now())
where setting_id = 'active';

commit;
