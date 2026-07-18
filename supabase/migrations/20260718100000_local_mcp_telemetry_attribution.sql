-- Correct local npm MCP telemetry attribution.
--
-- Rollback plan, written before the migration:
-- 1. Stop future package builds from sending local_mcp and production.
-- 2. Drop the two normalization triggers and their trigger functions.
-- 3. Restore si_log_mcp_search_outcome_v2 from migration 20260714180000.
-- 4. Do not reverse the historical row corrections automatically. They replace
--    incorrect venue and environment labels with the verified client entry point.
--
-- Backward compatibility:
-- - The existing si_log_mcp_search_outcome_v2 signature is unchanged.
-- - The published 0.4.19 beta package can use the corrected RPC without an update.
-- - Hosted search and remote MCP writers keep their existing contracts.
-- - No table, column, constraint, or index is added or removed.

create or replace function public.si_normalize_local_mcp_search_audit_attribution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(trim(coalesce(new.channel, ''))) = 'local_mcp'
     and lower(trim(coalesce(new.client_family, ''))) = 'mcp_stdio' then
    new.environment := 'production';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_local_mcp_search_audit_attribution
  on public.search_request_audit;

create trigger normalize_local_mcp_search_audit_attribution
before insert or update of channel, environment, client_family
on public.search_request_audit
for each row
execute function public.si_normalize_local_mcp_search_audit_attribution();

create or replace function public.si_normalize_local_mcp_icon_evidence_attribution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if lower(trim(coalesce(new.signal_type, ''))) = 'mcp_call'
     and lower(trim(coalesce(new.ui_surface, ''))) = 'mcp' then
    new.ui_surface := 'local_mcp';
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_local_mcp_icon_evidence_attribution
  on public.icon_evidence;

create trigger normalize_local_mcp_icon_evidence_attribution
before insert or update of signal_type, ui_surface
on public.icon_evidence
for each row
execute function public.si_normalize_local_mcp_icon_evidence_attribution();

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
  if v_confidence_label is not null
     and v_confidence_label not in ('low', 'medium', 'high') then
    raise exception 'unsupported confidence_label' using errcode = '22023';
  end if;
  if v_latency_ms is not null and v_latency_ms < 0 then
    raise exception 'latency_ms must be nonnegative' using errcode = '22023';
  end if;

  -- Hosted fallback search already writes one search_request_audit row.
  -- Keep the tool-level row for eligible local-first search and recommendation.
  if v_tool_name = 'search_icons' and v_beta_cohort is null then
    return null;
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
    'local_mcp',
    'production',
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
) is 'Public-safe local MCP tool outcome logger with client-entry attribution and tool latency.';

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

update public.mcp_usage_events
set
  channel = 'local_mcp',
  environment = 'production'
where event_type = 'search_outcome'
  and client_family = 'mcp_stdio'
  and channel = 'hosted_mcp';

update public.search_request_audit
set environment = 'production'
where channel = 'local_mcp'
  and client_family = 'mcp_stdio'
  and environment in ('local', 'preview');

update public.icon_evidence
set ui_surface = 'local_mcp'
where signal_type = 'mcp_call'
  and ui_surface = 'mcp';
