-- Restore the prior MCP final-outcome trigger classification.
--
-- Corrected historical controlled_test rows remain unchanged. Reverting those
-- exact source-backed corrections would knowingly make the evidence false.

begin;

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

comment on function public.si_capture_mcp_search_final_outcome() is
  'Copies eligible MCP outcomes into the final ledger.';

commit;
