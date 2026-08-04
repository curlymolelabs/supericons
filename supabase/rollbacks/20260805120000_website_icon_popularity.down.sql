begin;

do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    select jobid into v_job_id
    from cron.job
    where jobname = 'si-refresh-website-icon-popularity-daily';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;
  end if;
exception
  when undefined_table or undefined_function then
    null;
end
$$;

revoke all on function public.si_get_website_popular_icons(text)
  from public, anon, authenticated, service_role;
revoke all on function public.si_refresh_website_icon_popularity()
  from public, anon, authenticated, service_role;
revoke all on function public.si_replace_website_icon_grid_availability(
  jsonb,
  integer,
  integer,
  text,
  text,
  timestamptz,
  timestamptz
) from public, anon, authenticated, service_role;

drop function if exists public.si_get_website_popular_icons(text);
drop function if exists public.si_refresh_website_icon_popularity();
drop function if exists public.si_replace_website_icon_grid_availability(
  jsonb,
  integer,
  integer,
  text,
  text,
  timestamptz,
  timestamptz
);

drop table if exists public.website_icon_popularity_refresh_state;
drop table if exists public.website_icon_grid_availability_state;
drop table if exists public.website_icon_grid_availability;
drop table if exists public.website_icon_popularity_scores;
drop table if exists public.website_icon_popularity_snapshots;

commit;
