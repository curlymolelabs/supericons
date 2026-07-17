do $$
declare
  worker_column_count integer;
  constraint_count integer;
  index_count integer;
begin
  select count(*) into worker_column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'search_request_audit'
    and column_name in (
      'worker_state',
      'worker_request_ordinal',
      'module_age_ms_at_handler_entry'
    );
  if worker_column_count <> 3 then
    raise exception 'Expected three worker evidence columns, found %', worker_column_count;
  end if;

  select count(*) into constraint_count
  from pg_constraint
  where conrelid = 'public.search_request_audit'::regclass
    and conname in (
      'search_request_audit_worker_state_valid',
      'search_request_audit_worker_ordinal_valid',
      'search_request_audit_module_age_valid'
    )
    and convalidated;
  if constraint_count <> 3 then
    raise exception 'Expected three validated worker evidence constraints, found %', constraint_count;
  end if;

  select count(*) into index_count
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'search_request_audit_beta_worker_created_at_idx',
      'mcp_usage_events_beta_tool_created_at_idx'
    );
  if index_count <> 2 then
    raise exception 'Expected two beta evidence indexes, found %', index_count;
  end if;

  if to_regprocedure(
    'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'
  ) is null then
    raise exception 'Latency-aware MCP outcome logger is missing';
  end if;
end $$;

begin;

select public.si_log_mcp_search_outcome_v2(
  'hosted postflight settings',
  3,
  'lucide',
  'strict',
  'results',
  'search_icons',
  repeat('a', 64),
  null,
  'high',
  'deterministic-v2-beta',
  '0.4.19-beta.0',
  125,
  timezone('utc', now())
);

do $$
begin
  if not exists (
    select 1
    from public.mcp_usage_events
    where query_norm = 'hosted postflight settings'
      and tool_name = 'search_icons'
      and beta_cohort = 'deterministic-v2-beta'
      and latency_ms = 125
  ) then
    raise exception 'Latency-aware MCP outcome row was not written as expected';
  end if;
end $$;

rollback;

select 'tool_latency_postflight_ok' as result;
