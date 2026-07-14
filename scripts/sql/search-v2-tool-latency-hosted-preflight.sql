do $$
declare
  existing_object_count integer;
begin
  if to_regclass('public.search_request_audit') is null then
    raise exception 'Required search_request_audit table is missing';
  end if;
  if to_regclass('public.mcp_usage_events') is null then
    raise exception 'Required mcp_usage_events table is missing';
  end if;
  if to_regprocedure('public.si_log_mcp_search_outcome(text,integer,text,text,text,text,text,text,text,text,text,timestamptz)') is null then
    raise exception 'Existing MCP outcome logger is missing';
  end if;

  select
    (select count(*) from information_schema.columns
      where table_schema = 'public'
        and table_name = 'search_request_audit'
        and column_name in (
          'worker_state',
          'worker_request_ordinal',
          'module_age_ms_at_handler_entry'
        ))
    + case when to_regprocedure(
        'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'
      ) is null then 0 else 1 end
    + (select count(*) from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'search_request_audit_beta_worker_created_at_idx',
          'mcp_usage_events_beta_tool_created_at_idx'
        ))
  into existing_object_count;

  if existing_object_count <> 0 then
    raise exception 'Tool-latency migration objects already exist or require reconciliation';
  end if;
end $$;

select 'tool_latency_preflight_ok' as result;
