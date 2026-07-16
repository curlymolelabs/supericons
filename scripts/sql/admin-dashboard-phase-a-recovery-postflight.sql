begin read only;

do $$
declare
  column_count integer;
  constraint_count integer;
  index_count integer;
begin
  select count(*) into column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'mcp_usage_events'
    and column_name in ('query_origin', 'requested_limit', 'client_ip_public');
  if column_count <> 3 then
    raise exception 'Phase A column count mismatch: %', column_count;
  end if;

  select count(*) into constraint_count
  from pg_constraint
  where conrelid = 'public.mcp_usage_events'::regclass
    and conname in (
      'mcp_usage_events_query_origin_valid',
      'mcp_usage_events_requested_limit_valid'
    )
    and convalidated;
  if constraint_count <> 2 then
    raise exception 'Phase A validated constraint count mismatch: %', constraint_count;
  end if;

  if to_regclass('public.admin_rollup_overview') is null
     or to_regclass('public.admin_rollup_queries') is null then
    raise exception 'A Phase A rollup table is missing';
  end if;

  select count(*) into index_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'mcp_usage_events_admin_window_idx',
      'search_request_audit_admin_window_idx',
      'admin_rollup_overview_filters_idx',
      'admin_rollup_queries_filters_idx',
      'admin_rollup_queries_attention_idx'
    );
  if index_count <> 5 then
    raise exception 'Phase A index count mismatch: %', index_count;
  end if;

  if exists (
    select 1 from pg_class
    where oid in (
      'public.admin_rollup_overview'::regclass,
      'public.admin_rollup_queries'::regclass
    )
      and not relrowsecurity
  ) then
    raise exception 'A Phase A rollup table does not have row level security enabled';
  end if;

  if has_table_privilege('anon', 'public.admin_rollup_overview', 'select')
     or has_table_privilege('anon', 'public.admin_rollup_queries', 'select')
     or has_table_privilege('authenticated', 'public.admin_rollup_overview', 'select')
     or has_table_privilege('authenticated', 'public.admin_rollup_queries', 'select') then
    raise exception 'A public application role can read a Phase A rollup table';
  end if;

  if not has_table_privilege('service_role', 'public.admin_rollup_overview', 'select,insert,update,delete')
     or not has_table_privilege('service_role', 'public.admin_rollup_queries', 'select,insert,update,delete') then
    raise exception 'The service role lacks required Phase A rollup privileges';
  end if;
end $$;

select json_build_object(
  'status', 'ok',
  'migration_version', '20260716040000',
  'columns', 3,
  'validated_constraints', 2,
  'private_rollup_tables', 2,
  'indexes', 5,
  'overview_rows', (select count(*) from public.admin_rollup_overview),
  'query_rows', (select count(*) from public.admin_rollup_queries)
) as postflight;

rollback;
