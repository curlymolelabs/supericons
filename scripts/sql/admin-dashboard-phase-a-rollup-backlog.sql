begin read only;

with telemetry_days as (
  select distinct (created_at at time zone 'UTC')::date as day
  from public.search_request_audit
  where source <> 'trap'
    and query_norm is not null
    and created_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
  union
  select distinct (created_at at time zone 'UTC')::date as day
  from public.mcp_usage_events
  where event_type = 'search_outcome'
    and query_norm is not null
    and created_at < date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'
),
overview_days as (
  select distinct day from public.admin_rollup_overview
),
query_days as (
  select distinct day from public.admin_rollup_queries
),
complete_days as (
  select day from overview_days
  intersect
  select day from query_days
),
pending_days as (
  select day from telemetry_days
  except
  select day from complete_days
),
latest_complete as (
  select max(day) as day from complete_days
)
select json_build_object(
  'telemetry_day_count', (select count(*) from telemetry_days),
  'overview_day_count', (select count(*) from overview_days),
  'query_day_count', (select count(*) from query_days),
  'complete_rollup_day_count', (select count(*) from complete_days),
  'pending_day_count', (select count(*) from pending_days),
  'earliest_pending_day', (select min(day) from pending_days),
  'latest_pending_day', (select max(day) from pending_days),
  'latest_complete_day', (select day from latest_complete),
  'pending_on_or_before_latest_complete_day', (
    select count(*)
    from pending_days
    where day <= (select day from latest_complete)
  ),
  'overview_only_day_count', (
    select count(*) from (select day from overview_days except select day from query_days) rows
  ),
  'query_only_day_count', (
    select count(*) from (select day from query_days except select day from overview_days) rows
  )
);

rollback;
