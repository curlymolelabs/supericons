-- Expands icon_scores beyond copy_count_30d so the default browse grid and
-- admin overview can rank icons by actual usage signals: copies, downloads,
-- favorites, and recent momentum.

alter table public.icon_scores
  add column if not exists download_count_30d integer not null default 0,
  add column if not exists favorite_count_30d integer not null default 0,
  add column if not exists popularity_score_30d double precision not null default 0,
  add column if not exists trending_score_7d double precision not null default 0;

create index if not exists icon_scores_popularity_score_idx
  on public.icon_scores (popularity_score_30d desc, trending_score_7d desc, calculated_at desc);

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
  recent7 as (
    select *
    from recent
    where created_at >= timezone('utc', now()) - interval '7 days'
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
  download_counts as (
    select icon_id, count(*)::integer as download_count_30d
    from recent
    where signal_type = 'copy'
      and evidence_text like 'download:%'
    group by icon_id
  ),
  favorite_counts as (
    select icon_id, count(*)::integer as favorite_count_30d
    from recent
    where signal_type = 'favorite'
    group by icon_id
  ),
  copy_counts_7d as (
    select icon_id, count(*)::integer as copy_count_7d
    from recent7
    where signal_type = 'copy'
    group by icon_id
  ),
  download_counts_7d as (
    select icon_id, count(*)::integer as download_count_7d
    from recent7
    where signal_type = 'copy'
      and evidence_text like 'download:%'
    group by icon_id
  ),
  favorite_counts_7d as (
    select icon_id, count(*)::integer as favorite_count_7d
    from recent7
    where signal_type = 'favorite'
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
    download_count_30d,
    favorite_count_30d,
    popularity_score_30d,
    trending_score_7d,
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
    coalesce(download_counts.download_count_30d, 0) as download_count_30d,
    coalesce(favorite_counts.favorite_count_30d, 0) as favorite_count_30d,
    round(
      coalesce(copy_counts.copy_count_30d, 0)::numeric
      + (coalesce(download_counts.download_count_30d, 0)::numeric * 1.5)
      + (coalesce(favorite_counts.favorite_count_30d, 0)::numeric * 0.75),
      4
    )::double precision as popularity_score_30d,
    round(
      coalesce(copy_counts_7d.copy_count_7d, 0)::numeric
      + (coalesce(download_counts_7d.download_count_7d, 0)::numeric * 1.5)
      + (coalesce(favorite_counts_7d.favorite_count_7d, 0)::numeric * 0.75),
      4
    )::double precision as trending_score_7d,
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
  left join download_counts on download_counts.icon_id = icon_set.icon_id
  left join favorite_counts on favorite_counts.icon_id = icon_set.icon_id
  left join copy_counts_7d on copy_counts_7d.icon_id = icon_set.icon_id
  left join download_counts_7d on download_counts_7d.icon_id = icon_set.icon_id
  left join favorite_counts_7d on favorite_counts_7d.icon_id = icon_set.icon_id
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
      download_count_30d,
      favorite_count_30d,
      popularity_score_30d,
      trending_score_7d,
      retention_rate,
      mcp_acceptance_rate
    from public.icon_scores
    order by popularity_score_30d desc, trending_score_7d desc, copy_count_30d desc, icon_id asc
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
          'download_count_30d', download_count_30d,
          'favorite_count_30d', favorite_count_30d,
          'popularity_score_30d', popularity_score_30d,
          'trending_score_7d', trending_score_7d,
          'retention_rate', retention_rate,
          'mcp_acceptance_rate', mcp_acceptance_rate
        )
        order by popularity_score_30d desc, trending_score_7d desc, copy_count_30d desc, icon_id asc
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

select public.si_rebuild_icon_scores();
