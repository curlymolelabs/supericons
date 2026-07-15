-- Destructive rollback for Admin dashboard Phase A.
-- Run only after the hosted MCP writer and admin API reader have both been rolled back.

drop table if exists public.admin_rollup_queries;
drop table if exists public.admin_rollup_overview;

drop index if exists public.search_request_audit_admin_window_idx;
drop index if exists public.mcp_usage_events_admin_window_idx;

alter table if exists public.mcp_usage_events
  drop constraint if exists mcp_usage_events_requested_limit_valid,
  drop constraint if exists mcp_usage_events_query_origin_valid,
  drop column if exists client_ip_public,
  drop column if exists requested_limit,
  drop column if exists query_origin;

