-- Patch the overview RPC for projects that already ran
-- 20260416_icon_intelligence_foundation.sql before kit_downloads_30d
-- was added to the payload.

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
