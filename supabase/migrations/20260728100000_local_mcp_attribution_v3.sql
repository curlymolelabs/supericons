-- Local MCP attribution v3.
--
-- Rollback plan, written before implementation:
-- 1. Roll the npm package back to the last published v2-only version.
-- 2. Delete or roll back the local-mcp-telemetry Edge Function.
-- 3. Run the matching down migration to revoke and remove the v3 ingest RPC,
--    retention schedule, and final-outcome enrichment trigger.
-- 4. Keep the nullable columns and existing rows. Older writers ignore them,
--    and keeping them avoids a destructive rollback.
-- 5. Keep si_log_mcp_search_outcome_v2 unchanged for older packages.
--
-- Backward compatibility:
-- - The v2 RPC signature and behavior are unchanged.
-- - Existing rows remain valid because every new column is nullable.
-- - Search behavior, results, ranking, routing, tools, and allowances are not
--   read or changed by this migration.

begin;

do $$
begin
  if to_regprocedure(
    'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'
  ) is null then
    raise exception 'Required Local MCP v2 telemetry RPC is missing';
  end if;
end;
$$;

alter table public.mcp_usage_events
  add column if not exists install_hash text,
  add column if not exists install_key_version integer,
  add column if not exists client_version text,
  add column if not exists os_platform text,
  add column if not exists episode_id uuid,
  add column if not exists attempt_id uuid,
  add column if not exists recovery_chain_id uuid;

alter table public.search_final_outcomes
  add column if not exists install_hash text,
  add column if not exists install_key_version integer,
  add column if not exists client_version text,
  add column if not exists os_platform text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mcp_usage_events'::regclass
      and conname = 'mcp_usage_events_install_hash_valid'
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_install_hash_valid
      check (install_hash is null or install_hash ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mcp_usage_events'::regclass
      and conname = 'mcp_usage_events_install_key_pair_valid'
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_install_key_pair_valid
      check (
        (install_hash is null and install_key_version is null)
        or (install_hash is not null and install_key_version between 1 and 999)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mcp_usage_events'::regclass
      and conname = 'mcp_usage_events_client_version_valid'
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_client_version_valid
      check (client_version is null or char_length(client_version) between 1 and 40);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.mcp_usage_events'::regclass
      and conname = 'mcp_usage_events_os_platform_valid'
  ) then
    alter table public.mcp_usage_events
      add constraint mcp_usage_events_os_platform_valid
      check (os_platform is null or os_platform in ('win32', 'darwin', 'linux', 'other'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.search_final_outcomes'::regclass
      and conname = 'search_final_outcomes_install_hash_valid'
  ) then
    alter table public.search_final_outcomes
      add constraint search_final_outcomes_install_hash_valid
      check (install_hash is null or install_hash ~ '^[a-f0-9]{64}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.search_final_outcomes'::regclass
      and conname = 'search_final_outcomes_install_key_pair_valid'
  ) then
    alter table public.search_final_outcomes
      add constraint search_final_outcomes_install_key_pair_valid
      check (
        (install_hash is null and install_key_version is null)
        or (install_hash is not null and install_key_version between 1 and 999)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.search_final_outcomes'::regclass
      and conname = 'search_final_outcomes_client_version_valid'
  ) then
    alter table public.search_final_outcomes
      add constraint search_final_outcomes_client_version_valid
      check (client_version is null or char_length(client_version) between 1 and 40);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.search_final_outcomes'::regclass
      and conname = 'search_final_outcomes_os_platform_valid'
  ) then
    alter table public.search_final_outcomes
      add constraint search_final_outcomes_os_platform_valid
      check (os_platform is null or os_platform in ('win32', 'darwin', 'linux', 'other'));
  end if;
end;
$$;

create unique index if not exists mcp_usage_events_episode_id_unique
  on public.mcp_usage_events (episode_id)
  where episode_id is not null;

create unique index if not exists mcp_usage_events_attempt_id_unique
  on public.mcp_usage_events (attempt_id)
  where attempt_id is not null;

create index if not exists mcp_usage_events_install_created_at_idx
  on public.mcp_usage_events (install_hash, created_at desc)
  where channel = 'local_mcp' and install_hash is not null;

create index if not exists search_final_outcomes_install_completed_at_idx
  on public.search_final_outcomes (install_hash, completed_at desc)
  where channel = 'local_mcp' and install_hash is not null;

create or replace function public.si_ingest_local_mcp_search_outcome_v3(
  p_install_hash text,
  p_install_key_version integer,
  p_episode_id uuid,
  p_attempt_id uuid,
  p_recovery_chain_id uuid,
  p_query_norm text,
  p_result_count integer,
  p_library_filter text,
  p_library_mode text,
  p_search_outcome text,
  p_tool_name text,
  p_locale text default null,
  p_confidence_label text default null,
  p_beta_cohort text default null,
  p_mcp_server_version text default null,
  p_latency_ms integer default null,
  p_client_family text default null,
  p_client_version text default null,
  p_os_platform text default null,
  p_country_code text default null,
  p_geo_source text default null,
  p_session_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_install_hash text := lower(trim(coalesce(p_install_hash, '')));
  v_query_norm text := left(trim(coalesce(p_query_norm, '')), 500);
  v_library_filter text := nullif(left(trim(coalesce(p_library_filter, '')), 80), '');
  v_library_mode text := lower(trim(coalesce(p_library_mode, '')));
  v_search_outcome text := lower(trim(coalesce(p_search_outcome, '')));
  v_tool_name text := lower(trim(coalesce(p_tool_name, '')));
  v_locale text := nullif(left(trim(coalesce(p_locale, '')), 32), '');
  v_confidence_label text := nullif(lower(trim(coalesce(p_confidence_label, ''))), '');
  v_beta_cohort text := nullif(left(lower(trim(coalesce(p_beta_cohort, ''))), 80), '');
  v_server_version text := nullif(left(trim(coalesce(p_mcp_server_version, '')), 40), '');
  v_client_family text := nullif(left(lower(trim(coalesce(p_client_family, ''))), 64), '');
  v_client_version text := nullif(left(trim(coalesce(p_client_version, '')), 40), '');
  v_os_platform text := lower(trim(coalesce(p_os_platform, '')));
  v_country_code text := nullif(upper(trim(coalesce(p_country_code, ''))), '');
  v_geo_source text := nullif(left(lower(trim(coalesce(p_geo_source, ''))), 64), '');
  v_session_hash text := nullif(lower(trim(coalesce(p_session_hash, ''))), '');
  v_existing_id bigint;
  v_inserted_id bigint;
begin
  if v_install_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'install_hash must be a keyed sha256 value' using errcode = '22023';
  end if;
  if p_install_key_version is null or p_install_key_version not between 1 and 999 then
    raise exception 'install_key_version is outside the supported range' using errcode = '22023';
  end if;
  if p_episode_id is null or p_attempt_id is null or p_recovery_chain_id is null then
    raise exception 'episode, attempt, and recovery chain identities are required' using errcode = '22023';
  end if;
  if v_query_norm = '' then
    raise exception 'query is required' using errcode = '22023';
  end if;
  if p_result_count is null or p_result_count < 0 or p_result_count > 100000 then
    raise exception 'result_count is outside the supported range' using errcode = '22023';
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
  if v_confidence_label is not null
     and v_confidence_label not in ('low', 'medium', 'high') then
    raise exception 'unsupported confidence_label' using errcode = '22023';
  end if;
  if p_latency_ms is not null and (p_latency_ms < 0 or p_latency_ms > 600000) then
    raise exception 'latency_ms is outside the supported range' using errcode = '22023';
  end if;
  if v_client_family is null or v_client_family !~ '^[a-z0-9][a-z0-9._-]{0,63}$' then
    raise exception 'client_family is invalid' using errcode = '22023';
  end if;
  if v_os_platform not in ('win32', 'darwin', 'linux', 'other') then
    raise exception 'os_platform is invalid' using errcode = '22023';
  end if;
  if v_country_code is not null
     and (
       v_country_code !~ '^[A-Z]{2}$'
       or v_country_code in ('XX', 'ZZ', 'T1')
     ) then
    raise exception 'country_code is invalid' using errcode = '22023';
  end if;
  if (v_country_code is null) <> (v_geo_source is null) then
    raise exception 'country_code and geo_source must be recorded together' using errcode = '22023';
  end if;
  if v_session_hash is not null and v_session_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'session_hash must be a sha256 value' using errcode = '22023';
  end if;

  select id
  into v_existing_id
  from public.mcp_usage_events
  where episode_id = p_episode_id;

  if v_existing_id is not null then
    return jsonb_build_object('accepted', true, 'duplicate', true);
  end if;

  insert into public.mcp_usage_events (
    event_id,
    request_id,
    dedupe_key,
    event_type,
    channel,
    environment,
    client_family,
    client_version,
    os_platform,
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
    country_code,
    geo_source,
    locale,
    session_hash,
    install_hash,
    install_key_version,
    mcp_server_version,
    episode_id,
    attempt_id,
    recovery_chain_id,
    created_at,
    metadata
  ) values (
    p_episode_id::text,
    p_episode_id::text,
    'local_v3:' || p_episode_id::text,
    'search_outcome',
    'local_mcp',
    'production',
    v_client_family,
    v_client_version,
    v_os_platform,
    v_tool_name,
    v_query_norm,
    v_library_filter,
    v_library_mode,
    p_result_count,
    v_search_outcome,
    v_confidence_label,
    v_beta_cohort,
    case when v_search_outcome = 'error' then 'error' else 'ok' end,
    p_latency_ms,
    v_country_code,
    v_geo_source,
    v_locale,
    v_session_hash,
    v_install_hash,
    p_install_key_version,
    v_server_version,
    p_episode_id,
    p_attempt_id,
    p_recovery_chain_id,
    timezone('utc', now()),
    jsonb_build_object(
      'contract_version', 3,
      'episode_id', p_episode_id,
      'attempt_id', p_attempt_id,
      'recovery_chain_id', p_recovery_chain_id,
      'query_origin', 'user'
    )
  )
  on conflict do nothing
  returning id into v_inserted_id;

  if v_inserted_id is null then
    return jsonb_build_object('accepted', true, 'duplicate', true);
  end if;

  return jsonb_build_object('accepted', true, 'duplicate', false);
end;
$$;

revoke all on function public.si_ingest_local_mcp_search_outcome_v3(
  text,
  integer,
  uuid,
  uuid,
  uuid,
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
  integer,
  text,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.si_ingest_local_mcp_search_outcome_v3(
  text,
  integer,
  uuid,
  uuid,
  uuid,
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
  integer,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;

create or replace function public.si_enrich_local_mcp_final_attribution_v3()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.channel <> 'local_mcp'
     or new.event_type <> 'search_outcome'
     or new.episode_id is null then
    return new;
  end if;

  update public.search_final_outcomes
  set
    install_hash = new.install_hash,
    install_key_version = new.install_key_version,
    client_version = new.client_version,
    os_platform = new.os_platform
  where source_event_id = 'mcp_usage_events:' || new.id::text
    and channel = 'local_mcp';

  return new;
end;
$$;

drop trigger if exists zz_enrich_local_mcp_final_attribution_v3
  on public.mcp_usage_events;

create trigger zz_enrich_local_mcp_final_attribution_v3
after insert on public.mcp_usage_events
for each row
execute function public.si_enrich_local_mcp_final_attribution_v3();

create or replace function public.si_prune_local_mcp_attribution_v3()
returns table (
  usage_rows_reduced integer,
  final_rows_reduced integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage_rows integer;
  v_final_rows integer;
begin
  update public.mcp_usage_events
  set
    install_hash = null,
    install_key_version = null
  where channel = 'local_mcp'
    and install_hash is not null
    and created_at < timezone('utc', now()) - interval '90 days';
  get diagnostics v_usage_rows = row_count;

  update public.search_final_outcomes
  set
    install_hash = null,
    install_key_version = null
  where channel = 'local_mcp'
    and install_hash is not null
    and completed_at < timezone('utc', now()) - interval '90 days';
  get diagnostics v_final_rows = row_count;

  return query select v_usage_rows, v_final_rows;
end;
$$;

revoke all on function public.si_enrich_local_mcp_final_attribution_v3()
  from public, anon, authenticated;
revoke all on function public.si_prune_local_mcp_attribution_v3()
  from public, anon, authenticated;
grant execute on function public.si_prune_local_mcp_attribution_v3()
  to service_role;

do $$
declare
  v_job_id bigint;
begin
  if exists (
    select 1
    from pg_namespace
    where nspname = 'cron'
  ) then
    select jobid
    into v_job_id
    from cron.job
    where jobname = 'si-prune-local-mcp-attribution-v3-daily';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'si-prune-local-mcp-attribution-v3-daily',
      '17 2 * * *',
      $job$select public.si_prune_local_mcp_attribution_v3();$job$
    );
  else
    raise notice 'pg_cron schema not found; schedule Local MCP attribution retention manually.';
  end if;
exception
  when undefined_table or undefined_function then
    raise notice 'pg_cron is unavailable; schedule Local MCP attribution retention manually.';
end;
$$;

comment on function public.si_ingest_local_mcp_search_outcome_v3(
  text,
  integer,
  uuid,
  uuid,
  uuid,
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
  integer,
  text,
  text,
  text,
  text,
  text,
  text
) is
  'Service-role Local MCP v3 ingestion. Receives only a server-keyed installation hash.';
comment on column public.mcp_usage_events.install_hash is
  'Server-keyed installation hash. The raw installation UUID is never stored.';
comment on column public.search_final_outcomes.install_hash is
  'Server-keyed installation hash retained for at most 90 days.';

commit;
