\set ON_ERROR_STOP on

do $$
begin
  if to_regclass('public.icon_evidence') is null
    or to_regclass('public.mcp_usage_events') is null then
    raise exception 'Required take sources are missing';
  end if;

  if to_regclass('public.icon_scores') is null
    or to_regclass('public.icon_search_private_features') is null
    or to_regprocedure('public.si_rebuild_icon_scores()') is null then
    raise exception 'Protected ranking objects are missing';
  end if;

  if to_regclass('public.website_icon_popularity_snapshots') is not null
    or to_regclass('public.website_icon_popularity_scores') is not null
    or to_regclass('public.website_icon_grid_availability') is not null
    or to_regclass('public.website_icon_grid_availability_state') is not null
    or to_regclass('public.website_icon_popularity_refresh_state') is not null
    or to_regprocedure(
      'public.si_replace_website_icon_grid_availability(jsonb,integer,integer,text,text,timestamp with time zone,timestamp with time zone)'
    ) is not null
    or to_regprocedure('public.si_refresh_website_icon_popularity()') is not null
    or to_regprocedure('public.si_get_website_popular_icons(text)') is not null then
    raise exception 'Website popularity objects already exist';
  end if;

  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260805120000'
  ) then
    raise exception 'Migration 20260805120000 is already recorded';
  end if;

  if to_regnamespace('cron') is null
    or to_regprocedure('cron.schedule(text,text,text)') is null
    or to_regprocedure('cron.unschedule(bigint)') is null then
    raise exception 'Required pg_cron functions are unavailable';
  end if;
end
$$;

select jsonb_build_object(
  'status', 'pass',
  'database', current_database(),
  'icon_evidence_rows', (select count(*) from public.icon_evidence),
  'hosted_usage_rows', (select count(*) from public.mcp_usage_events),
  'existing_icon_score_rows', (select count(*) from public.icon_scores),
  'existing_private_feature_rows', (
    select count(*) from public.icon_search_private_features
  )
) as website_popularity_preflight;
