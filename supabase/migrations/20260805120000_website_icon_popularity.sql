-- Website-only icon popularity storage and bounded delivery.
--
-- Rollback plan:
-- 1. Deploy the website with the popularity fetch disabled.
-- 2. Remove the separate daily schedule if it has been activated.
-- 3. Revoke execute on si_get_website_popular_icons.
-- 4. Keep the private tables and last snapshot for investigation.
-- 5. Drop only these new functions and tables in a later cleanup migration.
--
-- Backward compatibility:
-- - Every table and function in this migration is additive.
-- - Existing icon_scores, search, evidence, recommendation, and MCP objects
--   are not changed.
-- - A website deployed before this migration keeps its current behavior.
-- - A website deployed after this migration fails safely when no fresh
--   snapshot or matching availability data exists.

begin;

-- table-access: private public.website_icon_popularity_snapshots
create table public.website_icon_popularity_snapshots (
  id bigint generated always as identity primary key,
  window_start timestamptz not null,
  window_end timestamptz not null,
  calculated_at timestamptz not null,
  total_scored_icons integer not null default 0,
  total_qualifying_icons integer not null default 0,
  created_at timestamptz not null default now(),
  constraint website_icon_popularity_snapshots_window_valid
    check (window_start < window_end),
  constraint website_icon_popularity_snapshots_scored_nonnegative
    check (total_scored_icons >= 0),
  constraint website_icon_popularity_snapshots_qualifying_nonnegative
    check (
      total_qualifying_icons >= 0
      and total_qualifying_icons <= total_scored_icons
    )
);

-- table-access: private public.website_icon_popularity_scores
create table public.website_icon_popularity_scores (
  snapshot_id bigint not null
    references public.website_icon_popularity_snapshots(id)
    on delete cascade,
  icon_ref text not null,
  active_days_30d smallint not null,
  active_days_7d smallint not null,
  global_rank integer not null,
  primary key (snapshot_id, icon_ref),
  constraint website_icon_popularity_scores_ref_valid
    check (
      icon_ref = lower(trim(icon_ref))
      and icon_ref ~ '^[a-z0-9][a-z0-9_-]*:[^[:space:]:]+$'
    ),
  constraint website_icon_popularity_scores_days_valid
    check (
      active_days_30d between 1 and 30
      and active_days_7d between 0 and 7
      and active_days_7d <= active_days_30d
    ),
  constraint website_icon_popularity_scores_rank_positive
    check (global_rank > 0)
);

create unique index website_icon_popularity_scores_snapshot_rank_idx
  on public.website_icon_popularity_scores (snapshot_id, global_rank);

create index website_icon_popularity_scores_qualifying_idx
  on public.website_icon_popularity_scores (
    snapshot_id,
    global_rank
  )
  where active_days_30d >= 3;

-- table-access: private public.website_icon_grid_availability
create table public.website_icon_grid_availability (
  icon_ref text primary key,
  outline_available boolean not null,
  solid_available boolean not null,
  updated_at timestamptz not null default now(),
  constraint website_icon_grid_availability_ref_valid
    check (
      icon_ref = lower(trim(icon_ref))
      and icon_ref ~ '^[a-z0-9][a-z0-9_-]*:[^[:space:]:]+$'
    ),
  constraint website_icon_grid_availability_present
    check (outline_available or solid_available)
);

create index website_icon_grid_availability_outline_idx
  on public.website_icon_grid_availability (icon_ref)
  where outline_available;

create index website_icon_grid_availability_solid_idx
  on public.website_icon_grid_availability (icon_ref)
  where solid_available;

-- table-access: private public.website_icon_grid_availability_state
create table public.website_icon_grid_availability_state (
  singleton_key text primary key default 'active',
  outline_ref_count integer not null,
  solid_ref_count integer not null,
  outline_refs_sha256 text not null,
  solid_refs_sha256 text not null,
  outline_source_generated_at timestamptz not null,
  solid_source_generated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint website_icon_grid_availability_state_singleton
    check (singleton_key = 'active'),
  constraint website_icon_grid_availability_state_counts
    check (outline_ref_count > 0 and solid_ref_count > 0),
  constraint website_icon_grid_availability_state_outline_hash
    check (outline_refs_sha256 ~ '^[a-f0-9]{64}$'),
  constraint website_icon_grid_availability_state_solid_hash
    check (solid_refs_sha256 ~ '^[a-f0-9]{64}$')
);

-- table-access: private public.website_icon_popularity_refresh_state
create table public.website_icon_popularity_refresh_state (
  singleton_key text primary key default 'active',
  active_snapshot_id bigint
    references public.website_icon_popularity_snapshots(id)
    on delete restrict,
  last_attempt_at timestamptz,
  last_attempt_status text not null default 'never',
  last_error_code text,
  updated_at timestamptz not null default now(),
  constraint website_icon_popularity_refresh_state_singleton
    check (singleton_key = 'active'),
  constraint website_icon_popularity_refresh_state_status
    check (last_attempt_status in ('never', 'running', 'success', 'failed')),
  constraint website_icon_popularity_refresh_state_error
    check (
      (last_attempt_status = 'failed' and last_error_code is not null)
      or (last_attempt_status <> 'failed' and last_error_code is null)
    )
);

insert into public.website_icon_popularity_refresh_state (
  singleton_key,
  active_snapshot_id,
  last_attempt_at,
  last_attempt_status,
  last_error_code
) values (
  'active',
  null,
  null,
  'never',
  null
);

alter table public.website_icon_popularity_snapshots enable row level security;
alter table public.website_icon_popularity_scores enable row level security;
alter table public.website_icon_grid_availability enable row level security;
alter table public.website_icon_grid_availability_state enable row level security;
alter table public.website_icon_popularity_refresh_state enable row level security;

revoke all on table public.website_icon_popularity_snapshots from public;
revoke all on table public.website_icon_popularity_scores from public;
revoke all on table public.website_icon_grid_availability from public;
revoke all on table public.website_icon_grid_availability_state from public;
revoke all on table public.website_icon_popularity_refresh_state from public;

revoke all on table public.website_icon_popularity_snapshots from anon, authenticated;
revoke all on table public.website_icon_popularity_scores from anon, authenticated;
revoke all on table public.website_icon_grid_availability from anon, authenticated;
revoke all on table public.website_icon_grid_availability_state from anon, authenticated;
revoke all on table public.website_icon_popularity_refresh_state from anon, authenticated;

grant select, insert, update, delete
  on table public.website_icon_popularity_snapshots
  to service_role;
grant select, insert, update, delete
  on table public.website_icon_popularity_scores
  to service_role;
grant select, insert, update, delete
  on table public.website_icon_grid_availability
  to service_role;
grant select, insert, update, delete
  on table public.website_icon_grid_availability_state
  to service_role;
grant select, insert, update, delete
  on table public.website_icon_popularity_refresh_state
  to service_role;

revoke all on sequence public.website_icon_popularity_snapshots_id_seq
  from public, anon, authenticated;
grant usage, select
  on sequence public.website_icon_popularity_snapshots_id_seq
  to service_role;

create or replace function public.si_replace_website_icon_grid_availability(
  p_rows jsonb,
  p_outline_ref_count integer,
  p_solid_ref_count integer,
  p_outline_refs_sha256 text,
  p_solid_refs_sha256 text,
  p_outline_source_generated_at timestamptz,
  p_solid_source_generated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_input_count integer;
  v_distinct_count integer;
  v_invalid_count integer;
  v_outline_count integer;
  v_solid_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'availability rows must be an array'
      using errcode = '22023';
  end if;

  if p_outline_ref_count is null or p_outline_ref_count <= 0
    or p_solid_ref_count is null or p_solid_ref_count <= 0 then
    raise exception 'availability counts must be positive'
      using errcode = '22023';
  end if;

  if lower(trim(coalesce(p_outline_refs_sha256, '')))
      !~ '^[a-f0-9]{64}$'
    or lower(trim(coalesce(p_solid_refs_sha256, '')))
      !~ '^[a-f0-9]{64}$' then
    raise exception 'availability hashes must be sha256 values'
      using errcode = '22023';
  end if;

  if p_outline_source_generated_at is null
    or p_solid_source_generated_at is null then
    raise exception 'availability source timestamps are required'
      using errcode = '22023';
  end if;

  select
    count(*)::integer,
    count(distinct lower(trim(rows.icon_ref)))::integer,
    count(*) filter (
      where rows.icon_ref is null
        or lower(trim(rows.icon_ref))
          !~ '^[a-z0-9][a-z0-9_-]*:[^[:space:]:]+$'
        or rows.outline_available is null
        or rows.solid_available is null
        or not (rows.outline_available or rows.solid_available)
    )::integer,
    count(*) filter (where rows.outline_available)::integer,
    count(*) filter (where rows.solid_available)::integer
  into
    v_input_count,
    v_distinct_count,
    v_invalid_count,
    v_outline_count,
    v_solid_count
  from jsonb_to_recordset(p_rows) as rows(
    icon_ref text,
    outline_available boolean,
    solid_available boolean
  );

  if v_input_count = 0
    or v_input_count <> v_distinct_count
    or v_invalid_count <> 0 then
    raise exception 'availability rows are empty, duplicated, or invalid'
      using errcode = '22023';
  end if;

  if v_outline_count <> p_outline_ref_count
    or v_solid_count <> p_solid_ref_count then
    raise exception 'availability counts do not match the supplied rows'
      using errcode = '22023';
  end if;

  truncate table public.website_icon_grid_availability;

  insert into public.website_icon_grid_availability (
    icon_ref,
    outline_available,
    solid_available,
    updated_at
  )
  select
    lower(trim(rows.icon_ref)),
    rows.outline_available,
    rows.solid_available,
    now()
  from jsonb_to_recordset(p_rows) as rows(
    icon_ref text,
    outline_available boolean,
    solid_available boolean
  );

  insert into public.website_icon_grid_availability_state (
    singleton_key,
    outline_ref_count,
    solid_ref_count,
    outline_refs_sha256,
    solid_refs_sha256,
    outline_source_generated_at,
    solid_source_generated_at,
    updated_at
  ) values (
    'active',
    p_outline_ref_count,
    p_solid_ref_count,
    lower(trim(p_outline_refs_sha256)),
    lower(trim(p_solid_refs_sha256)),
    p_outline_source_generated_at,
    p_solid_source_generated_at,
    now()
  )
  on conflict (singleton_key) do update
  set
    outline_ref_count = excluded.outline_ref_count,
    solid_ref_count = excluded.solid_ref_count,
    outline_refs_sha256 = excluded.outline_refs_sha256,
    solid_refs_sha256 = excluded.solid_refs_sha256,
    outline_source_generated_at = excluded.outline_source_generated_at,
    solid_source_generated_at = excluded.solid_source_generated_at,
    updated_at = excluded.updated_at;

  return jsonb_build_object(
    'status', 'ok',
    'row_count', v_input_count,
    'outline_ref_count', v_outline_count,
    'solid_ref_count', v_solid_count
  );
end;
$$;

create or replace function public.si_refresh_website_icon_popularity()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_cutoff timestamptz := now();
  v_window_start timestamptz := (
    date_trunc('day', v_cutoff at time zone 'UTC')
    - interval '29 days'
  ) at time zone 'UTC';
  v_recent_start timestamptz := (
    date_trunc('day', v_cutoff at time zone 'UTC')
    - interval '6 days'
  ) at time zone 'UTC';
  v_snapshot_id bigint;
  v_scored_count integer := 0;
  v_qualifying_count integer := 0;
begin
  update public.website_icon_popularity_refresh_state
  set
    last_attempt_at = v_cutoff,
    last_attempt_status = 'running',
    last_error_code = null,
    updated_at = v_cutoff
  where singleton_key = 'active';

  begin
    insert into public.website_icon_popularity_snapshots (
      window_start,
      window_end,
      calculated_at,
      total_scored_icons,
      total_qualifying_icons
    ) values (
      v_window_start,
      v_cutoff,
      v_cutoff,
      0,
      0
    )
    returning id into v_snapshot_id;

    with
    hosted_source as (
      select
        usage.created_at,
        lower(trim(coalesce(
          nullif(trim(
            usage.metadata -> 'returned_icon_refs' ->> 0
          ), ''),
          case
            when nullif(trim(usage.library_filter), '') is not null
              and nullif(trim(usage.query_norm), '') is not null
              then trim(usage.library_filter)
                || ':'
                || trim(usage.query_norm)
            else null
          end
        ))) as icon_ref
      from public.mcp_usage_events as usage
      where usage.created_at >= v_window_start
        and usage.created_at < v_cutoff
        and usage.channel = 'hosted_mcp'
        and usage.environment in ('production', 'legacy')
        and usage.tool_name = 'get_icon'
        and usage.event_type = 'tool_call'
        and usage.status = 'ok'
        and usage.result_count = 1
        and coalesce(
          usage.metadata ->> 'traffic_class',
          'unclassified_live'
        ) not in ('controlled_test', 'preview', 'local')
        and coalesce(usage.beta_cohort, '') not like 'controlled-run:%'
        and coalesce(usage.beta_cohort, '') not like '%:founder_controlled%'
        and coalesce(usage.beta_cohort, '') not like '%:controlled_%'
    ),
    web_source as (
      select
        evidence.created_at,
        lower(trim(evidence.icon_id)) as icon_ref
      from public.icon_evidence as evidence
      where evidence.created_at >= v_window_start
        and evidence.created_at < v_cutoff
        and evidence.signal_type = 'copy'
        and evidence.icon_id is not null
        and lower(trim(evidence.domain)) in (
          'supericons.dev',
          'www.supericons.dev'
        )
    ),
    confirmed_source as (
      select hosted_source.created_at, hosted_source.icon_ref
      from hosted_source
      union all
      select web_source.created_at, web_source.icon_ref
      from web_source
    ),
    scored as (
      select
        source.icon_ref,
        count(distinct (
          source.created_at at time zone 'UTC'
        )::date)::smallint as active_days_30d,
        count(distinct (
          source.created_at at time zone 'UTC'
        )::date) filter (
          where source.created_at >= v_recent_start
        )::smallint as active_days_7d
      from confirmed_source as source
      where source.icon_ref
        ~ '^[a-z0-9][a-z0-9_-]*:[^[:space:]:]+$'
      group by source.icon_ref
    ),
    ranked as (
      select
        scored.icon_ref,
        scored.active_days_30d,
        scored.active_days_7d,
        row_number() over (
          order by
            scored.active_days_30d desc,
            scored.active_days_7d desc,
            scored.icon_ref asc
        )::integer as global_rank
      from scored
    )
    insert into public.website_icon_popularity_scores (
      snapshot_id,
      icon_ref,
      active_days_30d,
      active_days_7d,
      global_rank
    )
    select
      v_snapshot_id,
      ranked.icon_ref,
      ranked.active_days_30d,
      ranked.active_days_7d,
      ranked.global_rank
    from ranked;

    get diagnostics v_scored_count = row_count;

    select count(*)::integer
    into v_qualifying_count
    from public.website_icon_popularity_scores as scores
    where scores.snapshot_id = v_snapshot_id
      and scores.active_days_30d >= 3;

    update public.website_icon_popularity_snapshots
    set
      total_scored_icons = v_scored_count,
      total_qualifying_icons = v_qualifying_count
    where id = v_snapshot_id;

    update public.website_icon_popularity_refresh_state
    set
      active_snapshot_id = v_snapshot_id,
      last_attempt_at = v_cutoff,
      last_attempt_status = 'success',
      last_error_code = null,
      updated_at = now()
    where singleton_key = 'active';

    delete from public.website_icon_popularity_snapshots as snapshots
    where snapshots.created_at < v_cutoff - interval '90 days'
      and snapshots.id <> v_snapshot_id;

    return jsonb_build_object(
      'status', 'success',
      'snapshot_id', v_snapshot_id,
      'calculated_at', v_cutoff,
      'scored_icons', v_scored_count,
      'qualifying_icons', v_qualifying_count
    );
  exception
    when others then
      update public.website_icon_popularity_refresh_state
      set
        last_attempt_at = v_cutoff,
        last_attempt_status = 'failed',
        last_error_code = 'refresh_error',
        updated_at = now()
      where singleton_key = 'active';

      return jsonb_build_object(
        'status', 'failed',
        'calculated_at', v_cutoff,
        'error_code', 'refresh_error'
      );
  end;
end;
$$;

create or replace function public.si_get_website_popular_icons(
  p_style text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_refresh public.website_icon_popularity_refresh_state%rowtype;
  v_snapshot public.website_icon_popularity_snapshots%rowtype;
  v_availability public.website_icon_grid_availability_state%rowtype;
  v_actual_outline_count integer;
  v_actual_solid_count integer;
  v_refs jsonb := '[]'::jsonb;
  v_ref_count integer := 0;
  v_stale_after timestamptz;
begin
  if p_style is null or p_style not in ('outline', 'solid') then
    raise exception 'style must be outline or solid'
      using errcode = '22023';
  end if;

  select *
  into v_refresh
  from public.website_icon_popularity_refresh_state
  where singleton_key = 'active';

  if not found or v_refresh.active_snapshot_id is null then
    return jsonb_build_object(
      'status', 'failed',
      'calculated_at', null,
      'stale_after', null,
      'icon_refs', '[]'::jsonb
    );
  end if;

  select *
  into v_snapshot
  from public.website_icon_popularity_snapshots
  where id = v_refresh.active_snapshot_id;

  if not found then
    return jsonb_build_object(
      'status', 'failed',
      'calculated_at', null,
      'stale_after', null,
      'icon_refs', '[]'::jsonb
    );
  end if;

  v_stale_after := v_snapshot.calculated_at + interval '48 hours';

  if v_refresh.last_attempt_status <> 'success' then
    return jsonb_build_object(
      'status', 'failed',
      'calculated_at', v_snapshot.calculated_at,
      'stale_after', v_stale_after,
      'icon_refs', '[]'::jsonb
    );
  end if;

  if now() >= v_stale_after then
    return jsonb_build_object(
      'status', 'stale',
      'calculated_at', v_snapshot.calculated_at,
      'stale_after', v_stale_after,
      'icon_refs', '[]'::jsonb
    );
  end if;

  select *
  into v_availability
  from public.website_icon_grid_availability_state
  where singleton_key = 'active';

  if not found then
    return jsonb_build_object(
      'status', 'failed',
      'calculated_at', v_snapshot.calculated_at,
      'stale_after', v_stale_after,
      'icon_refs', '[]'::jsonb
    );
  end if;

  select
    count(*) filter (where outline_available)::integer,
    count(*) filter (where solid_available)::integer
  into v_actual_outline_count, v_actual_solid_count
  from public.website_icon_grid_availability;

  if v_actual_outline_count <> v_availability.outline_ref_count
    or v_actual_solid_count <> v_availability.solid_ref_count then
    return jsonb_build_object(
      'status', 'failed',
      'calculated_at', v_snapshot.calculated_at,
      'stale_after', v_stale_after,
      'icon_refs', '[]'::jsonb
    );
  end if;

  select
    count(*)::integer,
    coalesce(
      jsonb_agg(selected.icon_ref order by selected.global_rank),
      '[]'::jsonb
    )
  into v_ref_count, v_refs
  from (
    select scores.icon_ref, scores.global_rank
    from public.website_icon_popularity_scores as scores
    inner join public.website_icon_grid_availability as availability
      on availability.icon_ref = scores.icon_ref
    where scores.snapshot_id = v_snapshot.id
      and scores.active_days_30d >= 3
      and (
        (p_style = 'outline' and availability.outline_available)
        or (p_style = 'solid' and availability.solid_available)
      )
    order by scores.global_rank
    limit 50
  ) as selected;

  if v_ref_count < 6 then
    return jsonb_build_object(
      'status', 'insufficient_evidence',
      'calculated_at', v_snapshot.calculated_at,
      'stale_after', v_stale_after,
      'icon_refs', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'status', 'fresh',
    'calculated_at', v_snapshot.calculated_at,
    'stale_after', v_stale_after,
    'icon_refs', v_refs
  );
end;
$$;

revoke all on function public.si_replace_website_icon_grid_availability(
  jsonb,
  integer,
  integer,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated;

revoke all on function public.si_refresh_website_icon_popularity()
  from public, anon, authenticated;

revoke all on function public.si_get_website_popular_icons(text)
  from public;

grant execute on function public.si_replace_website_icon_grid_availability(
  jsonb,
  integer,
  integer,
  text,
  text,
  timestamptz,
  timestamptz
) to service_role;

grant execute on function public.si_refresh_website_icon_popularity()
  to service_role;

grant execute on function public.si_get_website_popular_icons(text)
  to anon, authenticated, service_role;

comment on table public.website_icon_popularity_scores is
  'Private website-only active-day ranking. Never used by MCP or search.';

comment on function public.si_get_website_popular_icons(text) is
  'Returns a bounded website-only popularity prefix with freshness status.';

commit;
