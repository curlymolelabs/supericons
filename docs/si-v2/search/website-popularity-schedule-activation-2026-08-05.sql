-- Run this manually only after the website popularity release checks pass.
-- This file is intentionally outside supabase/migrations so a normal
-- database migration cannot activate the schedule early.
--
-- Rollback plan:
-- 1. Find the job named si-refresh-website-icon-popularity-daily.
-- 2. Call cron.unschedule for its job ID.
-- 3. Leave the refresh and public read functions available for investigation.

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
    where jobname = 'si-refresh-website-icon-popularity-daily';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'si-refresh-website-icon-popularity-daily',
      '20 0 * * *',
      $job$select public.si_refresh_website_icon_popularity();$job$
    );
  else
    raise notice
      'pg_cron schema not found; schedule website popularity manually.';
  end if;
exception
  when undefined_table or undefined_function then
    raise notice
      'pg_cron is unavailable; schedule website popularity manually.';
end
$$;
