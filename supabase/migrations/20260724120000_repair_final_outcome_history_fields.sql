-- Preserve latency in final search outcomes and correct false reference coverage.
--
-- Rollback plan, written before implementation:
-- 1. Set search_telemetry_settings.dashboard_source to legacy before reverting the admin API.
-- 2. Keep the nullable latency_ms column and copied values because older writers ignore them.
-- 3. Keep historical returned_icon_refs_recorded corrections because restoring a false claim would corrupt evidence.
-- 4. The MCP trigger may keep copying latency during an API rollback because this is additive and does not affect search.
-- 5. Use the matching rollback file to return the dashboard source to legacy without deleting evidence.
--
-- Backward compatibility:
-- - Existing writers do not need to send a new field.
-- - Existing rows remain valid because latency_ms is nullable.
-- - Search responses, ranking, allowance accounting, and public tool contracts are unchanged.

begin;

alter table public.search_final_outcomes
  add column if not exists latency_ms integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.search_final_outcomes'::regclass
      and conname = 'search_final_outcomes_latency_ms_valid'
  ) then
    alter table public.search_final_outcomes
      add constraint search_final_outcomes_latency_ms_valid
      check (latency_ms is null or latency_ms >= 0);
  end if;
end;
$$;

update public.search_final_outcomes as final
set latency_ms = usage.latency_ms
from public.mcp_usage_events as usage
where final.source_event_id = 'mcp_usage_events:' || usage.id::text
  and final.latency_ms is null
  and usage.latency_ms is not null;

update public.mcp_usage_events
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{returned_icon_refs_recorded}',
  'false'::jsonb,
  true
)
where event_type = 'search_outcome'
  and tool_name = 'recommend_icons'
  and coalesce(result_count, 0) > 0
  and case
    when jsonb_typeof(metadata -> 'returned_icon_refs') = 'array'
      then jsonb_array_length(metadata -> 'returned_icon_refs')
    else 0
  end = 0
  and lower(coalesce(metadata ->> 'returned_icon_refs_recorded', 'false')) = 'true';

update public.search_final_outcomes
set metadata = jsonb_set(
  coalesce(metadata, '{}'::jsonb),
  '{returned_icon_refs_recorded}',
  'false'::jsonb,
  true
)
where tool_name = 'recommend_icons'
  and final_match_count > 0
  and case
    when jsonb_typeof(metadata -> 'returned_icon_refs') = 'array'
      then jsonb_array_length(metadata -> 'returned_icon_refs')
    else 0
  end = 0
  and lower(coalesce(metadata ->> 'returned_icon_refs_recorded', 'false')) = 'true';

create or replace function public.si_capture_mcp_search_final_outcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_episode_id uuid;
  v_final_outcome text;
  v_traffic_class text;
  v_query text;
  v_diagnostic_attempt_count integer;
begin
  if new.event_type <> 'search_outcome'
     or new.tool_name not in ('search_icons', 'recommend_icons')
     or new.channel not in ('hosted_mcp', 'local_mcp') then
    return new;
  end if;

  if new.status = 'error' or new.search_outcome = 'error' then
    v_final_outcome := 'error';
  elsif coalesce(new.result_count, 0) > 0 or new.search_outcome = 'results' then
    v_final_outcome := 'success';
  elsif new.search_outcome = 'zero' then
    v_final_outcome := 'zero';
  else
    return new;
  end if;

  v_query := left(trim(coalesce(new.query_norm, '')), 500);
  if v_query = '' then
    return new;
  end if;

  v_episode_id := coalesce(
    public.si_try_uuid(new.metadata ->> 'episode_id'),
    public.si_try_uuid(new.event_id),
    gen_random_uuid()
  );
  select count(*)::integer
  into v_diagnostic_attempt_count
  from public.search_request_audit
  where episode_id = v_episode_id;

  v_traffic_class := lower(trim(coalesce(new.metadata ->> 'traffic_class', '')));
  if v_traffic_class not in (
    'controlled_test',
    'preview',
    'local',
    'named_cohort',
    'unclassified_live'
  ) then
    v_traffic_class := case
      when new.environment = 'test' then 'controlled_test'
      when new.environment = 'preview' then 'preview'
      when new.environment = 'local' then 'local'
      else 'unclassified_live'
    end;
  end if;

  insert into public.search_final_outcomes (
    contract_version,
    episode_id,
    recovery_chain_id,
    source_event_id,
    channel,
    query,
    environment,
    traffic_class,
    client_family,
    tool_name,
    library_filter,
    library_mode,
    locale,
    final_match_count,
    final_outcome,
    settlement_state,
    search_execution,
    server_build,
    diagnostic_attempt_count,
    legacy_identity_quality,
    source_version,
    anonymous_client_hash,
    user_id,
    is_registered,
    client_ip_public,
    country_code,
    geo_source,
    latency_ms,
    completed_at,
    metadata
  ) values (
    1,
    v_episode_id,
    public.si_try_uuid(new.metadata ->> 'recovery_chain_id'),
    'mcp_usage_events:' || new.id::text,
    case
      when new.channel = 'local_mcp' then 'local_mcp'
      else 'hosted_mcp'
    end,
    v_query,
    case
      when new.environment in ('production', 'preview', 'local', 'test', 'legacy')
        then new.environment
      else 'production'
    end,
    v_traffic_class,
    coalesce(nullif(trim(new.client_family), ''), 'unknown'),
    new.tool_name,
    new.library_filter,
    new.library_mode,
    new.locale,
    case when v_final_outcome = 'success' then greatest(coalesce(new.result_count, 0), 1) else 0 end,
    v_final_outcome,
    case when v_final_outcome = 'error' then 'failed' else 'completed' end,
    nullif(trim(coalesce(new.metadata ->> 'search_execution', '')), ''),
    nullif(trim(coalesce(new.metadata ->> 'server_build', '')), ''),
    v_diagnostic_attempt_count,
    case
      when public.si_try_uuid(new.metadata ->> 'episode_id') is not null
        or public.si_try_uuid(new.event_id) is not null
        then 'exact'
      else 'legacy_best_effort'
    end,
    new.mcp_server_version,
    coalesce(new.anonymous_client_hash, new.session_hash),
    new.user_id,
    new.is_registered,
    coalesce(new.client_ip_public, false),
    new.country_code,
    new.geo_source,
    new.latency_ms,
    new.created_at,
    jsonb_build_object(
      'source_table', 'mcp_usage_events',
      'source_row_id', new.id,
      'query_origin', new.query_origin,
      'requested_limit', new.requested_limit,
      'returned_icon_refs', new.metadata -> 'returned_icon_refs',
      'returned_icon_refs_recorded',
      lower(coalesce(new.metadata ->> 'returned_icon_refs_recorded', 'false')) = 'true'
    )
  )
  on conflict do nothing;

  return new;
end;
$$;

comment on column public.search_final_outcomes.latency_ms is
  'End-to-end tool latency copied from the linked MCP usage outcome when available.';

commit;
