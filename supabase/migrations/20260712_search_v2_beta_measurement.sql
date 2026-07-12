-- Deterministic search v2 beta measurement fields.
--
-- Rollback plan, written before the schema change:
-- 1. Stop beta package traffic and disable the isolated beta function.
-- 2. Stop calls to si_log_mcp_search_outcome.
-- 3. Drop si_log_mcp_search_outcome and the two beta cohort indexes.
-- 4. Leave the nullable columns in place until no released prerelease writes them.
-- 5. Drop the constraints and columns only in a later migration after compatibility is verified.
--
-- Backward compatibility:
-- - All new columns are nullable and have no backfill.
-- - Existing search writers and readers continue to work.
-- - The new RPC is additive and does not replace si_log_icon_evidence.

alter table if exists public.search_request_audit
  add column if not exists library_mode text,
  add column if not exists search_outcome text,
  add column if not exists confidence_label text,
  add column if not exists beta_cohort text;

alter table if exists public.mcp_usage_events
  add column if not exists library_mode text,
  add column if not exists search_outcome text,
  add column if not exists confidence_label text,
  add column if not exists beta_cohort text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_library_mode_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_library_mode_valid
      check (library_mode is null or library_mode in ('strict', 'prefer', 'all'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_outcome_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_outcome_valid
      check (search_outcome is null or search_outcome in ('results', 'clarification', 'zero', 'error'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'search_request_audit_confidence_label_valid'
      and conrelid = 'public.search_request_audit'::regclass
  ) then
    alter table public.search_request_audit
      add constraint search_request_audit_confidence_label_valid
      check (confidence_label is null or confidence_label in ('low', 'medium', 'high'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'mcp_usage_events_library_mode_valid'
      and conrelid = 'public.mcp_usage_events'::regclass
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_library_mode_valid
      check (library_mode is null or library_mode in ('strict', 'prefer', 'all'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'mcp_usage_events_outcome_valid'
      and conrelid = 'public.mcp_usage_events'::regclass
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_outcome_valid
      check (search_outcome is null or search_outcome in ('results', 'clarification', 'zero', 'error'))
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'mcp_usage_events_confidence_label_valid'
      and conrelid = 'public.mcp_usage_events'::regclass
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_confidence_label_valid
      check (confidence_label is null or confidence_label in ('low', 'medium', 'high'))
      not valid;
  end if;
end $$;

alter table public.search_request_audit validate constraint search_request_audit_library_mode_valid;
alter table public.search_request_audit validate constraint search_request_audit_outcome_valid;
alter table public.search_request_audit validate constraint search_request_audit_confidence_label_valid;
alter table public.mcp_usage_events validate constraint mcp_usage_events_library_mode_valid;
alter table public.mcp_usage_events validate constraint mcp_usage_events_outcome_valid;
alter table public.mcp_usage_events validate constraint mcp_usage_events_confidence_label_valid;

create index if not exists search_request_audit_beta_cohort_created_at_idx
  on public.search_request_audit (beta_cohort, created_at desc)
  where beta_cohort is not null;

create index if not exists mcp_usage_events_beta_cohort_created_at_idx
  on public.mcp_usage_events (beta_cohort, created_at desc)
  where beta_cohort is not null;

create or replace function public.si_log_mcp_search_outcome(
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
    v_locale,
    v_session_hash,
    v_mcp_server_version,
    coalesce(p_created_at, timezone('utc', now()))
  ) returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

comment on function public.si_log_mcp_search_outcome(
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
  timestamptz
) is 'Public-safe MCP search outcome logger for deterministic beta measurement.';

revoke all on function public.si_log_mcp_search_outcome(
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
  timestamptz
) from public;

grant execute on function public.si_log_mcp_search_outcome(
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
  timestamptz
) to anon, authenticated, service_role;

comment on column public.search_request_audit.search_outcome is
  'Public outcome label that distinguishes results, clarification, zero, and error.';
comment on column public.mcp_usage_events.search_outcome is
  'Final MCP tool outcome label that distinguishes clarification from a true zero result.';
comment on column public.search_request_audit.beta_cohort is
  'Bounded beta cohort identifier, when the request came through an isolated beta route.';
comment on column public.mcp_usage_events.beta_cohort is
  'Bounded beta cohort identifier supplied by an approved prerelease package.';
