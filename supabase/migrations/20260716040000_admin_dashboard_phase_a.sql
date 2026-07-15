-- Admin dashboard Phase A data contract.
--
-- Rollback plan, written before the schema change:
-- 1. Stop the hosted MCP writer and roll it back to the pinned pre-Phase A revision.
-- 2. Roll the admin API back to its pinned pre-Phase A function revision.
-- 3. Leave this additive schema in place during a code rollback.
-- 4. Use the paired down migration only after no released writer or reader uses it.
-- 5. Never restore anon or authenticated access to the private rollup tables.

alter table if exists public.mcp_usage_events
  add column if not exists query_origin text,
  add column if not exists requested_limit integer,
  add column if not exists client_ip_public boolean;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mcp_usage_events_query_origin_valid'
      and conrelid = 'public.mcp_usage_events'::regclass
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_query_origin_valid
      check (
        query_origin is null
        or query_origin in ('agent_query', 'recommend_variant', 'icon_lookup', 'legacy_unknown')
      )
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'mcp_usage_events_requested_limit_valid'
      and conrelid = 'public.mcp_usage_events'::regclass
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_requested_limit_valid
      check (requested_limit is null or requested_limit between 1 and 100)
      not valid;
  end if;
end $$;

alter table public.mcp_usage_events
  validate constraint mcp_usage_events_query_origin_valid;
alter table public.mcp_usage_events
  validate constraint mcp_usage_events_requested_limit_valid;

create index if not exists mcp_usage_events_admin_window_idx
  on public.mcp_usage_events (
    environment,
    channel,
    query_origin,
    tool_name,
    created_at desc
  );

create index if not exists search_request_audit_admin_window_idx
  on public.search_request_audit (
    environment,
    channel,
    tool_name,
    created_at desc
  );

-- table-access: private public.admin_rollup_overview
create table if not exists public.admin_rollup_overview (
  day date not null,
  channel text not null,
  environment text not null,
  query_origin text not null,
  attempt_count bigint not null default 0,
  success_count bigint not null default 0,
  true_zero_count bigint not null default 0,
  low_result_count bigint not null default 0,
  low_result_eligible_count bigint not null default 0,
  approximate_low_result_count bigint not null default 0,
  error_count bigint not null default 0,
  clarification_count bigint not null default 0,
  partial_recommendation_count bigint not null default 0,
  defect_count bigint not null default 0,
  client_days bigint not null default 0,
  refreshed_at timestamptz not null default timezone('utc', now()),
  primary key (day, channel, environment, query_origin),
  constraint admin_rollup_overview_origin_valid check (
    query_origin in ('agent_query', 'recommend_variant', 'icon_lookup', 'legacy_unknown')
  ),
  constraint admin_rollup_overview_counts_nonnegative check (
    attempt_count >= 0
    and success_count >= 0
    and true_zero_count >= 0
    and low_result_count >= 0
    and low_result_eligible_count >= 0
    and approximate_low_result_count >= 0
    and error_count >= 0
    and clarification_count >= 0
    and partial_recommendation_count >= 0
    and defect_count >= 0
    and client_days >= 0
  )
);

-- table-access: private public.admin_rollup_queries
create table if not exists public.admin_rollup_queries (
  day date not null,
  query_norm text not null,
  library_filter text not null default 'all',
  query_origin text not null,
  channel text not null,
  environment text not null,
  tool_name text not null,
  attempt_count bigint not null default 0,
  success_count bigint not null default 0,
  true_zero_count bigint not null default 0,
  low_result_count bigint not null default 0,
  low_result_eligible_count bigint not null default 0,
  approximate_low_result_count bigint not null default 0,
  error_count bigint not null default 0,
  clarification_count bigint not null default 0,
  partial_recommendation_count bigint not null default 0,
  defect_count bigint not null default 0,
  client_days bigint not null default 0,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  refreshed_at timestamptz not null default timezone('utc', now()),
  primary key (
    day,
    query_norm,
    library_filter,
    query_origin,
    channel,
    environment,
    tool_name
  ),
  constraint admin_rollup_queries_query_nonempty check (char_length(trim(query_norm)) > 0),
  constraint admin_rollup_queries_library_nonempty check (char_length(trim(library_filter)) > 0),
  constraint admin_rollup_queries_origin_valid check (
    query_origin in ('agent_query', 'recommend_variant', 'icon_lookup', 'legacy_unknown')
  ),
  constraint admin_rollup_queries_seen_order_valid check (first_seen <= last_seen),
  constraint admin_rollup_queries_counts_nonnegative check (
    attempt_count >= 0
    and success_count >= 0
    and true_zero_count >= 0
    and low_result_count >= 0
    and low_result_eligible_count >= 0
    and approximate_low_result_count >= 0
    and error_count >= 0
    and clarification_count >= 0
    and partial_recommendation_count >= 0
    and defect_count >= 0
    and client_days >= 0
  )
);

create index if not exists admin_rollup_overview_filters_idx
  on public.admin_rollup_overview (
    environment,
    channel,
    query_origin,
    day desc
  );

create index if not exists admin_rollup_queries_filters_idx
  on public.admin_rollup_queries (
    environment,
    channel,
    query_origin,
    tool_name,
    day desc
  );

create index if not exists admin_rollup_queries_attention_idx
  on public.admin_rollup_queries (
    true_zero_count desc,
    low_result_count desc,
    last_seen desc
  )
  where true_zero_count > 0 or low_result_count > 0;

alter table public.admin_rollup_overview enable row level security;
alter table public.admin_rollup_queries enable row level security;

revoke all on table public.admin_rollup_overview from public;
revoke all on table public.admin_rollup_queries from public;
revoke all on table public.admin_rollup_overview from anon, authenticated;
revoke all on table public.admin_rollup_queries from anon, authenticated;

grant select, insert, update, delete on table public.admin_rollup_overview to service_role;
grant select, insert, update, delete on table public.admin_rollup_queries to service_role;

comment on column public.mcp_usage_events.query_origin is
  'Caller intent class used to separate direct agent queries from generated variants and exact lookups.';
comment on column public.mcp_usage_events.requested_limit is
  'Resolved caller result limit. For recommendations this is the number of requested slots.';
comment on column public.mcp_usage_events.client_ip_public is
  'True when the request carried a valid public client IP before hashing. Raw IP values are not stored.';
comment on table public.admin_rollup_overview is
  'Private completed-UTC-day KPI totals for the admin dashboard.';
comment on table public.admin_rollup_queries is
  'Private completed-UTC-day per-query totals for the admin gap worklist.';

