begin read only;

set local statement_timeout = '3000ms';

do $health$
declare
  started_at timestamptz;
  elapsed_ms numeric;
  matched_rows bigint;
begin
  started_at := clock_timestamp();
  select count(*) into matched_rows
  from (
    select created_at
    from public.mcp_usage_events
    where environment = 'production'
      and channel = 'hosted_mcp'
      and query_origin = 'agent_query'
      and tool_name = 'search_icons'
    order by created_at desc
    limit 1
  ) recent_mcp_usage;
  elapsed_ms := round((extract(epoch from clock_timestamp() - started_at) * 1000)::numeric, 1);
  raise notice 'PHASE_A_HEALTH|recent_mcp_usage|%|%|1000', elapsed_ms, matched_rows;
  if elapsed_ms > 1000 then
    raise exception 'recent_mcp_usage exceeded 1000 ms: %', elapsed_ms;
  end if;

  started_at := clock_timestamp();
  select count(*) into matched_rows
  from (
    select created_at
    from public.search_request_audit
    where environment = 'production'
      and channel = 'hosted_mcp'
      and tool_name = 'search_icons'
    order by created_at desc
    limit 1
  ) recent_search_audit;
  elapsed_ms := round((extract(epoch from clock_timestamp() - started_at) * 1000)::numeric, 1);
  raise notice 'PHASE_A_HEALTH|recent_search_audit|%|%|1000', elapsed_ms, matched_rows;
  if elapsed_ms > 1000 then
    raise exception 'recent_search_audit exceeded 1000 ms: %', elapsed_ms;
  end if;

  started_at := clock_timestamp();
  select count(*) into matched_rows
  from (
    select day
    from public.admin_rollup_overview
    where environment = 'production'
      and channel = 'hosted_mcp'
      and query_origin = 'agent_query'
    order by day desc
    limit 1
  ) latest_rollup_overview;
  elapsed_ms := round((extract(epoch from clock_timestamp() - started_at) * 1000)::numeric, 1);
  raise notice 'PHASE_A_HEALTH|latest_rollup_overview|%|%|1000', elapsed_ms, matched_rows;
  if elapsed_ms > 1000 then
    raise exception 'latest_rollup_overview exceeded 1000 ms: %', elapsed_ms;
  end if;

  started_at := clock_timestamp();
  select
    (
      select count(*)
      from public.mcp_usage_events
      where environment = 'production'
        and channel = 'hosted_mcp'
        and query_origin = 'agent_query'
        and tool_name = 'search_icons'
        and created_at >= now() - interval '15 minutes'
    )
    +
    (
      select count(*)
      from public.search_request_audit
      where environment = 'production'
        and channel = 'hosted_mcp'
        and tool_name = 'search_icons'
        and created_at >= now() - interval '15 minutes'
    )
  into matched_rows;
  elapsed_ms := round((extract(epoch from clock_timestamp() - started_at) * 1000)::numeric, 1);
  raise notice 'PHASE_A_HEALTH|recent_telemetry_window|%|%|2000', elapsed_ms, matched_rows;
  if elapsed_ms > 2000 then
    raise exception 'recent_telemetry_window exceeded 2000 ms: %', elapsed_ms;
  end if;
end
$health$;

rollback;
