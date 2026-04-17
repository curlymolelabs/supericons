-- Supericons P0.01: icon intelligence foundation
-- Tables:
--   icon_metadata  -> editorial classification / taxonomy source of truth
--   icon_evidence  -> raw behavioral, agent, and editorial evidence
--   icon_scores    -> 30-day aggregate belief per icon

create table if not exists public.icon_metadata (
  icon_id text primary key,
  source_library text not null,
  job_category text,
  secondary_categories text[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_metadata_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_metadata_source_library_nonempty check (char_length(trim(source_library)) > 0)
);

create table if not exists public.icon_evidence (
  id uuid primary key default gen_random_uuid(),
  signal_type text not null,
  icon_id text,
  batch_id uuid,
  collection_id text,
  search_query text,
  result_position integer,
  time_to_copy_ms integer,
  ui_surface text,
  domain text,
  job_category text,
  replaced_with text,
  retained_days integer,
  agent_converged boolean,
  confidence double precision,
  evidence_text text,
  context_url text,
  session_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint icon_evidence_signal_type_valid check (
    signal_type in (
      'copy',
      'replace',
      'kit_download',
      'mcp_call',
      'editorial',
      'favorite',
      'collection',
      'social_gallery'
    )
  ),
  constraint icon_evidence_result_position_positive check (result_position is null or result_position > 0),
  constraint icon_evidence_time_to_copy_nonnegative check (time_to_copy_ms is null or time_to_copy_ms >= 0),
  constraint icon_evidence_retained_days_nonnegative check (retained_days is null or retained_days >= 0),
  constraint icon_evidence_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1)),
  constraint icon_evidence_session_hash_nonempty check (char_length(trim(session_hash)) > 0),
  constraint icon_evidence_icon_or_collection_required check (
    icon_id is not null
    or signal_type in ('kit_download', 'collection', 'social_gallery')
  )
);

create table if not exists public.icon_scores (
  icon_id text primary key,
  copy_count_30d integer not null default 0,
  retention_rate double precision,
  top_search_queries jsonb not null default '[]'::jsonb,
  top_ui_surfaces jsonb not null default '{}'::jsonb,
  top_domains jsonb not null default '{}'::jsonb,
  avg_result_position double precision,
  mcp_acceptance_rate double precision,
  calculated_at timestamptz not null default timezone('utc', now()),
  constraint icon_scores_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_scores_copy_count_nonnegative check (copy_count_30d >= 0),
  constraint icon_scores_retention_rate_range check (
    retention_rate is null or (retention_rate >= 0 and retention_rate <= 1)
  ),
  constraint icon_scores_mcp_acceptance_rate_range check (
    mcp_acceptance_rate is null or (mcp_acceptance_rate >= 0 and mcp_acceptance_rate <= 1)
  )
);

create index if not exists icon_metadata_job_category_idx
  on public.icon_metadata (job_category);

create index if not exists icon_metadata_source_library_idx
  on public.icon_metadata (source_library);

create index if not exists icon_evidence_created_at_idx
  on public.icon_evidence (created_at desc);

create index if not exists icon_evidence_signal_type_created_at_idx
  on public.icon_evidence (signal_type, created_at desc);

create index if not exists icon_evidence_icon_id_created_at_idx
  on public.icon_evidence (icon_id, created_at desc)
  where icon_id is not null;

create index if not exists icon_evidence_session_hash_created_at_idx
  on public.icon_evidence (session_hash, created_at desc);

create index if not exists icon_evidence_batch_id_idx
  on public.icon_evidence (batch_id)
  where batch_id is not null;

create index if not exists icon_evidence_collection_id_idx
  on public.icon_evidence (collection_id)
  where collection_id is not null;

create index if not exists icon_scores_copy_count_idx
  on public.icon_scores (copy_count_30d desc, calculated_at desc);

alter table public.icon_metadata enable row level security;
alter table public.icon_evidence enable row level security;
alter table public.icon_scores enable row level security;

revoke all on table public.icon_metadata from public;
revoke all on table public.icon_evidence from public;
revoke all on table public.icon_scores from public;

grant select on table public.icon_metadata to anon, authenticated, service_role;
grant select on table public.icon_scores to anon, authenticated, service_role;
grant select, insert, update, delete on table public.icon_metadata to service_role;
grant select, insert, update, delete on table public.icon_evidence to service_role;
grant select, insert, update, delete on table public.icon_scores to service_role;

create policy "icon_metadata_public_read"
  on public.icon_metadata
  for select
  using (true);

create policy "icon_scores_public_read"
  on public.icon_scores
  for select
  using (true);

create or replace function public.si_log_icon_evidence(
  p_signal_type text,
  p_icon_id text default null,
  p_batch_id uuid default null,
  p_collection_id text default null,
  p_search_query text default null,
  p_result_position integer default null,
  p_time_to_copy_ms integer default null,
  p_ui_surface text default null,
  p_domain text default null,
  p_job_category text default null,
  p_replaced_with text default null,
  p_retained_days integer default null,
  p_agent_converged boolean default null,
  p_confidence double precision default null,
  p_evidence_text text default null,
  p_context_url text default null,
  p_session_hash text default null,
  p_created_at timestamptz default timezone('utc', now())
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signal_type text := trim(coalesce(p_signal_type, ''));
  v_icon_id text := nullif(trim(coalesce(p_icon_id, '')), '');
  v_collection_id text := nullif(trim(coalesce(p_collection_id, '')), '');
  v_search_query text := nullif(trim(coalesce(p_search_query, '')), '');
  v_ui_surface text := nullif(trim(coalesce(p_ui_surface, '')), '');
  v_domain text := nullif(trim(coalesce(p_domain, '')), '');
  v_job_category text := nullif(trim(coalesce(p_job_category, '')), '');
  v_replaced_with text := nullif(trim(coalesce(p_replaced_with, '')), '');
  v_evidence_text text := nullif(trim(coalesce(p_evidence_text, '')), '');
  v_context_url text := nullif(trim(coalesce(p_context_url, '')), '');
  v_session_hash text := trim(coalesce(p_session_hash, ''));
  v_inserted_id uuid;
begin
  if v_signal_type = '' then
    raise exception 'signal_type is required' using errcode = '22023';
  end if;

  if v_signal_type not in (
    'copy',
    'replace',
    'kit_download',
    'mcp_call',
    'editorial',
    'favorite',
    'collection',
    'social_gallery'
  ) then
    raise exception 'Unsupported signal_type: %', v_signal_type using errcode = '22023';
  end if;

  if v_session_hash = '' then
    raise exception 'session_hash is required' using errcode = '22023';
  end if;

  if v_job_category is null and v_icon_id is not null then
    select im.job_category
    into v_job_category
    from public.icon_metadata im
    where im.icon_id = v_icon_id
    limit 1;
  end if;

  insert into public.icon_evidence (
    signal_type,
    icon_id,
    batch_id,
    collection_id,
    search_query,
    result_position,
    time_to_copy_ms,
    ui_surface,
    domain,
    job_category,
    replaced_with,
    retained_days,
    agent_converged,
    confidence,
    evidence_text,
    context_url,
    session_hash,
    created_at
  )
  values (
    v_signal_type,
    v_icon_id,
    p_batch_id,
    v_collection_id,
    v_search_query,
    p_result_position,
    p_time_to_copy_ms,
    v_ui_surface,
    v_domain,
    v_job_category,
    v_replaced_with,
    p_retained_days,
    p_agent_converged,
    p_confidence,
    v_evidence_text,
    v_context_url,
    v_session_hash,
    coalesce(p_created_at, timezone('utc', now()))
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

comment on function public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz
) is 'Public-safe RPC used by the web app and MCP to insert a single icon evidence event.';

create or replace function public.si_mark_superseded_mcp_batches(
  p_session_hash text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_hash text := trim(coalesce(p_session_hash, ''));
  v_updated integer := 0;
begin
  if v_session_hash = '' then
    return 0;
  end if;

  with updated as (
    update public.icon_evidence
    set agent_converged = false
    where signal_type = 'mcp_call'
      and agent_converged is null
      and session_hash = v_session_hash
    returning 1
  )
  select count(*)::integer into v_updated from updated;

  return v_updated;
end;
$$;

create or replace function public.si_mark_latest_mcp_batches_converged()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  with open_batches as (
    select
      session_hash,
      batch_id,
      max(created_at) as batch_created_at
    from public.icon_evidence
    where signal_type = 'mcp_call'
      and agent_converged is null
      and batch_id is not null
    group by session_hash, batch_id
  ),
  stale_latest as (
    select ob.batch_id
    from open_batches ob
    where ob.batch_created_at < timezone('utc', now()) - interval '60 minutes'
      and not exists (
        select 1
        from public.icon_evidence newer
        where newer.signal_type = 'mcp_call'
          and newer.session_hash = ob.session_hash
          and newer.created_at > ob.batch_created_at
      )
  ),
  updated as (
    update public.icon_evidence ie
    set agent_converged = true
    where ie.signal_type = 'mcp_call'
      and ie.agent_converged is null
      and ie.batch_id in (select batch_id from stale_latest)
    returning 1
  )
  select count(*)::integer into v_updated from updated;

  return v_updated;
end;
$$;

create or replace function public.si_rebuild_icon_scores()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  truncate table public.icon_scores;

  with recent as (
    select *
    from public.icon_evidence
    where created_at >= timezone('utc', now()) - interval '30 days'
      and icon_id is not null
  ),
  icon_set as (
    select distinct icon_id
    from recent
  ),
  copy_counts as (
    select icon_id, count(*)::integer as copy_count_30d
    from recent
    where signal_type = 'copy'
    group by icon_id
  ),
  replace_counts as (
    select icon_id, count(*)::integer as replace_count
    from recent
    where signal_type = 'replace'
    group by icon_id
  ),
  ranked_queries as (
    select
      icon_id,
      search_query,
      count(*)::integer as query_count,
      row_number() over (
        partition by icon_id
        order by count(*) desc, search_query asc
      ) as rn
    from recent
    where search_query is not null
    group by icon_id, search_query
  ),
  top_queries as (
    select
      icon_id,
      jsonb_agg(
        jsonb_build_object('q', search_query, 'count', query_count)
        order by query_count desc, search_query asc
      ) as top_search_queries
    from ranked_queries
    where rn <= 5
    group by icon_id
  ),
  surface_counts as (
    select icon_id, ui_surface, count(*)::integer as surface_count
    from recent
    where ui_surface is not null
    group by icon_id, ui_surface
  ),
  surface_ranked as (
    select
      icon_id,
      ui_surface,
      surface_count,
      sum(surface_count) over (partition by icon_id) as total_count,
      row_number() over (
        partition by icon_id
        order by surface_count desc, ui_surface asc
      ) as rn
    from surface_counts
  ),
  top_surfaces as (
    select
      icon_id,
      jsonb_object_agg(
        ui_surface,
        round((surface_count::numeric / nullif(total_count, 0)), 4)
      ) as top_ui_surfaces
    from surface_ranked
    where rn <= 5
    group by icon_id
  ),
  domain_counts as (
    select icon_id, domain, count(*)::integer as domain_count
    from recent
    where domain is not null
    group by icon_id, domain
  ),
  domain_ranked as (
    select
      icon_id,
      domain,
      domain_count,
      sum(domain_count) over (partition by icon_id) as total_count,
      row_number() over (
        partition by icon_id
        order by domain_count desc, domain asc
      ) as rn
    from domain_counts
  ),
  top_domains as (
    select
      icon_id,
      jsonb_object_agg(
        domain,
        round((domain_count::numeric / nullif(total_count, 0)), 4)
      ) as top_domains
    from domain_ranked
    where rn <= 5
    group by icon_id
  ),
  result_positions as (
    select icon_id, avg(result_position::double precision) as avg_result_position
    from recent
    where result_position is not null
    group by icon_id
  ),
  mcp_acceptance as (
    select
      icon_id,
      avg(case when agent_converged then 1.0 else 0.0 end) as mcp_acceptance_rate
    from recent
    where signal_type = 'mcp_call'
      and agent_converged is not null
    group by icon_id
  )
  insert into public.icon_scores (
    icon_id,
    copy_count_30d,
    retention_rate,
    top_search_queries,
    top_ui_surfaces,
    top_domains,
    avg_result_position,
    mcp_acceptance_rate,
    calculated_at
  )
  select
    icon_set.icon_id,
    coalesce(copy_counts.copy_count_30d, 0) as copy_count_30d,
    case
      when coalesce(copy_counts.copy_count_30d, 0) > 0 then
        round(
          greatest(
            0,
            1 - (coalesce(replace_counts.replace_count, 0)::numeric / copy_counts.copy_count_30d::numeric)
          ),
          4
        )::double precision
      else null
    end as retention_rate,
    coalesce(top_queries.top_search_queries, '[]'::jsonb) as top_search_queries,
    coalesce(top_surfaces.top_ui_surfaces, '{}'::jsonb) as top_ui_surfaces,
    coalesce(top_domains.top_domains, '{}'::jsonb) as top_domains,
    result_positions.avg_result_position,
    mcp_acceptance.mcp_acceptance_rate,
    timezone('utc', now()) as calculated_at
  from icon_set
  left join copy_counts on copy_counts.icon_id = icon_set.icon_id
  left join replace_counts on replace_counts.icon_id = icon_set.icon_id
  left join top_queries on top_queries.icon_id = icon_set.icon_id
  left join top_surfaces on top_surfaces.icon_id = icon_set.icon_id
  left join top_domains on top_domains.icon_id = icon_set.icon_id
  left join result_positions on result_positions.icon_id = icon_set.icon_id
  left join mcp_acceptance on mcp_acceptance.icon_id = icon_set.icon_id;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.si_get_intelligence_overview(
  p_days integer default 30
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select timezone('utc', now()) - make_interval(days => greatest(coalesce(p_days, 30), 1)) as since
  ),
  top_job_categories as (
    select
      job_category,
      count(*)::integer as event_count
    from public.icon_evidence, bounds
    where created_at >= bounds.since
      and job_category is not null
    group by job_category
    order by event_count desc, job_category asc
    limit 6
  ),
  top_replaced_icons as (
    select
      icon_id,
      count(*)::integer as replace_count
    from public.icon_evidence, bounds
    where created_at >= bounds.since
      and signal_type = 'replace'
      and icon_id is not null
    group by icon_id
    order by replace_count desc, icon_id asc
    limit 6
  ),
  recent_evidence as (
    select
      signal_type,
      icon_id,
      search_query,
      job_category,
      evidence_text,
      created_at
    from public.icon_evidence
    order by created_at desc
    limit 12
  ),
  top_icons as (
    select
      icon_id,
      copy_count_30d,
      retention_rate,
      mcp_acceptance_rate
    from public.icon_scores
    order by copy_count_30d desc, icon_id asc
    limit 8
  )
  select jsonb_build_object(
    'total_evidence_rows', (select count(*) from public.icon_evidence),
    'copy_events_30d', (
      select count(*)
      from public.icon_evidence, bounds
      where created_at >= bounds.since
        and signal_type = 'copy'
    ),
    'favorite_events_30d', (
      select count(*)
      from public.icon_evidence, bounds
      where created_at >= bounds.since
        and signal_type = 'favorite'
    ),
    'kit_downloads_30d', (
      select count(*)
      from public.icon_evidence, bounds
      where created_at >= bounds.since
        and signal_type = 'kit_download'
    ),
    'mcp_batches_30d', (
      select count(distinct batch_id)
      from public.icon_evidence, bounds
      where created_at >= bounds.since
        and signal_type = 'mcp_call'
        and batch_id is not null
    ),
    'top_job_categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'job_category', job_category,
          'count', event_count
        )
        order by event_count desc, job_category asc
      )
      from top_job_categories
    ), '[]'::jsonb),
    'top_icons', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'icon_id', icon_id,
          'copy_count_30d', copy_count_30d,
          'retention_rate', retention_rate,
          'mcp_acceptance_rate', mcp_acceptance_rate
        )
        order by copy_count_30d desc, icon_id asc
      )
      from top_icons
    ), '[]'::jsonb),
    'top_replaced_icons', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'icon_id', icon_id,
          'replace_count', replace_count
        )
        order by replace_count desc, icon_id asc
      )
      from top_replaced_icons
    ), '[]'::jsonb),
    'recent_evidence', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'signal_type', signal_type,
          'icon_id', icon_id,
          'search_query', search_query,
          'job_category', job_category,
          'evidence_text', evidence_text,
          'created_at', created_at
        )
        order by created_at desc
      )
      from recent_evidence
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz
) from public;

revoke all on function public.si_mark_superseded_mcp_batches(text) from public;
revoke all on function public.si_mark_latest_mcp_batches_converged() from public;
revoke all on function public.si_rebuild_icon_scores() from public;
revoke all on function public.si_get_intelligence_overview(integer) from public;

grant execute on function public.si_log_icon_evidence(
  text,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  text,
  text,
  text,
  text,
  integer,
  boolean,
  double precision,
  text,
  text,
  text,
  timestamptz
) to anon, authenticated, service_role;

grant execute on function public.si_mark_superseded_mcp_batches(text) to anon, authenticated, service_role;
grant execute on function public.si_mark_latest_mcp_batches_converged() to service_role;
grant execute on function public.si_rebuild_icon_scores() to service_role;
grant execute on function public.si_get_intelligence_overview(integer) to service_role;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'icon_stats'
  ) and not exists (
    select 1 from public.icon_evidence limit 1
  ) then
    insert into public.icon_evidence (
      signal_type,
      icon_id,
      evidence_text,
      session_hash,
      created_at
    )
    select
      'copy',
      trim(coalesce(lib, '')) || ':' || trim(coalesce(icon_id, '')),
      concat_ws(':', 'legacy', nullif(action, ''), nullif(format, '')),
      'legacy-icon-stats',
      coalesce(created_at, timezone('utc', now()))
    from public.icon_stats
    where coalesce(lib, '') <> ''
      and coalesce(icon_id, '') <> ''
      and coalesce(action, 'copy') in ('copy', 'download');
  end if;
exception
  when undefined_column then
    raise notice 'Skipping icon_stats backfill because expected legacy columns were not found.';
end $$;

select public.si_rebuild_icon_scores();

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
    where jobname = 'si-rebuild-icon-scores-daily';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'si-rebuild-icon-scores-daily',
      '5 0 * * *',
      $job$select public.si_rebuild_icon_scores();$job$
    );

    select jobid
    into v_job_id
    from cron.job
    where jobname = 'si-mark-mcp-batches-converged';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'si-mark-mcp-batches-converged',
      '*/15 * * * *',
      $job$select public.si_mark_latest_mcp_batches_converged();$job$
    );
  else
    raise notice 'pg_cron schema not found; schedule icon intelligence jobs manually.';
  end if;
exception
  when undefined_table or undefined_function then
    raise notice 'pg_cron is unavailable in this environment; schedule icon intelligence jobs manually.';
end $$;
