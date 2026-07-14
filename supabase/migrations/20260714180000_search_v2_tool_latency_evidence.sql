-- Search v2 tool-scoped beta latency evidence.
--
-- Rollback plan, written before the schema change:
-- 1. Stop the prerelease package from calling si_log_mcp_search_outcome_v2.
-- 2. Disable or delete the isolated beta function.
-- 3. Drop si_log_mcp_search_outcome_v2 and the two indexes created here.
-- 4. Leave the nullable worker columns in place while any beta function may write them.
-- 5. Remove the constraints and nullable columns only in a later migration after compatibility is verified.
--
-- Backward compatibility:
-- - Existing search_request_audit rows need no backfill.
-- - Existing MCP clients keep using si_log_mcp_search_outcome.
-- - The v2 RPC is additive and writes to the existing latency_ms column.
-- - Existing production functions do not need the new worker columns.

alter table if exists public.search_request_audit
  add column if not exists worker_state text,
  add column if not exists worker_request_ordinal integer,
  add column if not exists module_age_ms_at_handler_entry integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_worker_state_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_worker_state_valid
      check (worker_state is null or worker_state in ('first_request', 'reused_worker'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_worker_ordinal_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_worker_ordinal_valid
      check (worker_request_ordinal is null or worker_request_ordinal > 0)
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_module_age_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_module_age_valid
      check (module_age_ms_at_handler_entry is null or module_age_ms_at_handler_entry >= 0)
      not valid;
  end if;
end $$;

alter table public.search_request_audit validate constraint search_request_audit_worker_state_valid;
alter table public.search_request_audit validate constraint search_request_audit_worker_ordinal_valid;
alter table public.search_request_audit validate constraint search_request_audit_module_age_valid;

create index if not exists search_request_audit_beta_worker_created_at_idx
  on public.search_request_audit (beta_cohort, worker_state, created_at desc)
  where beta_cohort is not null and worker_state is not null;

create index if not exists mcp_usage_events_beta_tool_created_at_idx
  on public.mcp_usage_events (beta_cohort, tool_name, created_at desc)
  where beta_cohort is not null and tool_name is not null;

create or replace function public.si_log_mcp_search_outcome_v2(
  p_query_norm text,
  p_result_count integer,
  p_library_filter text,
  p_library_mode text,
  p_search_outcome text,
  p_tool_name text,
  p_session_hash text,
  p_locale text default null,
  p_confidence_label text default null,
  p_beta_cohort text default null,
  p_mcp_server_version text default null,
  p_latency_ms integer default null,
  p_created_at timestamptz default timezone('utc', now())
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query_norm text := left(trim(coalesce(p_query_norm, '')), 500);
  v_result_count integer := p_result_count;
  v_library_filter text := nullif(left(trim(coalesce(p_library_filter, '')), 80), '');
  v_library_mode text := lower(trim(coalesce(p_library_mode, '')));
  v_search_outcome text := lower(trim(coalesce(p_search_outcome, '')));
  v_tool_name text := lower(trim(coalesce(p_tool_name, '')));
  v_session_hash text := lower(trim(coalesce(p_session_hash, '')));
  v_locale text := nullif(left(trim(coalesce(p_locale, '')), 32), '');
  v_confidence_label text := nullif(lower(trim(coalesce(p_confidence_label, ''))), '');
  v_beta_cohort text := nullif(left(lower(trim(coalesce(p_beta_cohort, ''))), 80), '');
  v_mcp_server_version text := nullif(left(trim(coalesce(p_mcp_server_version, '')), 40), '');
  v_latency_ms integer := p_latency_ms;
  v_inserted_id bigint;
begin
  if v_query_norm = '' then
    raise exception 'query is required' using errcode = '22023';
  end if;
  if v_result_count is null or v_result_count < 0 then
    raise exception 'result_count must be nonnegative' using errcode = '22023';
  end if;
  if v_library_mode not in ('strict', 'prefer', 'all') then
    raise exception 'unsupported library_mode' using errcode = '22023';
  end if;
  if v_search_outcome not in ('results', 'clarification', 'zero', 'error') then
    raise exception 'unsupported search_outcome' using errcode = '22023';
  end if;
  if v_tool_name not in ('search_icons', 'recommend_icons') then
    raise exception 'unsupported tool_name' using errcode = '22023';
  end if;
  if v_session_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'session_hash must be a sha256 value' using errcode = '22023';
  end if;
  if v_confidence_label is not null and v_confidence_label not in ('low', 'medium', 'high') then
    raise exception 'unsupported confidence_label' using errcode = '22023';
  end if;
  if v_latency_ms is not null and v_latency_ms < 0 then
    raise exception 'latency_ms must be nonnegative' using errcode = '22023';
  end if;

  insert into public.mcp_usage_events (
    event_type,
    channel,
    environment,
    client_family,
    tool_name,
    query_norm,
    library_filter,
    library_mode,
    result_count,
    search_outcome,
    confidence_label,
    beta_cohort,
    status,
    latency_ms,
    locale,
    session_hash,
    mcp_server_version,
    created_at
  ) values (
    'search_outcome',
    'hosted_mcp',
    case when v_beta_cohort is null then 'production' else 'preview' end,
    'mcp_stdio',
    v_tool_name,
    v_query_norm,
    v_library_filter,
    v_library_mode,
    v_result_count,
    v_search_outcome,
    v_confidence_label,
    v_beta_cohort,
    case when v_search_outcome = 'error' then 'error' else 'ok' end,
    v_latency_ms,
    v_locale,
    v_session_hash,
    v_mcp_server_version,
    coalesce(p_created_at, timezone('utc', now()))
  ) returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

comment on function public.si_log_mcp_search_outcome_v2(
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  timestamptz
) is 'Public-safe MCP search outcome logger with end-to-end tool latency for tool-scoped beta measurement.';

revoke all on function public.si_log_mcp_search_outcome_v2(
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  timestamptz
) from public;

grant execute on function public.si_log_mcp_search_outcome_v2(
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  timestamptz
) to anon, authenticated, service_role;

comment on column public.search_request_audit.worker_state is
  'Public-safe first-request or reused-worker label generated inside one function worker.';
comment on column public.search_request_audit.worker_request_ordinal is
  'Request order within one function worker process.';
comment on column public.search_request_audit.module_age_ms_at_handler_entry is
  'Elapsed module lifetime at handler entry. This is not module-load duration.';
