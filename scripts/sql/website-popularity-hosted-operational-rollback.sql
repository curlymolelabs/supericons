\set ON_ERROR_STOP on

do $$
declare
  v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'si-refresh-website-icon-popularity-daily';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;
end
$$;

revoke execute on function public.si_get_website_popular_icons(text)
  from anon, authenticated;

select jsonb_build_object(
  'status', 'rolled_back',
  'schedule_removed', not exists (
    select 1
    from cron.job
    where jobname = 'si-refresh-website-icon-popularity-daily'
  ),
  'public_rpc_disabled', not has_function_privilege(
    'anon',
    'public.si_get_website_popular_icons(text)',
    'execute'
  )
) as website_popularity_operational_rollback;
