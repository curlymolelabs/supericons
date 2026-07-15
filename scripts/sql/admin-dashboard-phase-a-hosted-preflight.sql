do $$
begin
  if to_regclass('public.mcp_usage_events') is null then
    raise exception 'Required table public.mcp_usage_events is missing';
  end if;
  if to_regclass('public.search_request_audit') is null then
    raise exception 'Required table public.search_request_audit is missing';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mcp_usage_events'
      and column_name in ('query_origin', 'requested_limit', 'client_ip_public')
  ) then
    raise exception 'A Phase A mcp_usage_events column already exists';
  end if;
  if to_regclass('public.admin_rollup_overview') is not null
     or to_regclass('public.admin_rollup_queries') is not null then
    raise exception 'A Phase A rollup table already exists';
  end if;
  if exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname in (
        'mcp_usage_events_admin_window_idx',
        'search_request_audit_admin_window_idx',
        'admin_rollup_overview_filters_idx',
        'admin_rollup_queries_filters_idx',
        'admin_rollup_queries_attention_idx'
      )
  ) then
    raise exception 'A Phase A index already exists';
  end if;
  if exists (
    select 1 from supabase_migrations.schema_migrations
    where version = '20260716040000'
  ) then
    raise exception 'Migration 20260716040000 is already recorded as applied';
  end if;
end $$;

select json_build_object(
  'status', 'ok',
  'migration_version', '20260716040000',
  'base_tables_present', true,
  'phase_a_objects_absent', true
) as preflight;
