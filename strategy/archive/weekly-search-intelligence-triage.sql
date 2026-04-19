-- Supericons Weekly Search Intelligence Triage
-- Run this in Supabase SQL Editor once per week.

-- 1) High-demand, low-result web queries in last 7 days.
select
  query_norm,
  count(*) as attempts,
  round(avg(result_count)::numeric, 2) as avg_results,
  min(result_count) as min_results,
  max(result_count) as max_results,
  max(created_at) as last_seen_at
from public.search_request_audit
where source = 'web'
  and status = 'ok'
  and created_at >= now() - interval '7 days'
group by query_norm
having count(*) >= 3
   and avg(result_count) < 8
order by attempts desc, avg_results asc, query_norm asc
limit 100;

-- 2) Zero-result query backlog in last 7 days (web + mcp).
select
  query_norm,
  source,
  count(*) as attempts,
  max(created_at) as last_seen_at
from public.search_request_audit
where status = 'ok'
  and result_count = 0
  and created_at >= now() - interval '7 days'
group by query_norm, source
order by attempts desc, last_seen_at desc
limit 100;

-- 3) Hosted-search health snapshot in last 7 days.
with base as (
  select
    source,
    status,
    latency_ms
  from public.search_request_audit
  where created_at >= now() - interval '7 days'
)
select
  source,
  count(*) as requests,
  count(*) filter (where status = 'ok') as ok_requests,
  count(*) filter (where status <> 'ok') as non_ok_requests,
  round(avg(latency_ms)::numeric, 2) as avg_latency_ms,
  percentile_disc(0.95) within group (order by latency_ms) as p95_latency_ms
from base
group by source
order by requests desc, source asc;

-- 4) MCP adoption view in last 7 days.
select
  query_norm,
  count(*) as mcp_attempts,
  round(avg(result_count)::numeric, 2) as avg_results,
  max(created_at) as last_seen_at
from public.search_request_audit
where source = 'mcp'
  and status = 'ok'
  and created_at >= now() - interval '7 days'
group by query_norm
order by mcp_attempts desc, avg_results asc, query_norm asc
limit 100;
