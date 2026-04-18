create or replace function public.si_refresh_icon_search_private_features()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_upserted integer := 0;
begin
  insert into public.icon_search_private_features (
    icon_id,
    popularity_score,
    behavioral_score,
    editorial_score,
    replace_risk_score,
    manual_boost,
    manual_penalty,
    updated_at
  )
  select
    s.icon_id,
    coalesce(s.popularity_score_30d, 0),
    coalesce(s.copy_count_30d, 0)
      + (coalesce(s.download_count_30d, 0) * 0.5)
      + (coalesce(s.favorite_count_30d, 0) * 0.25),
    case
      when coalesce(s.mcp_acceptance_rate, 0) >= 0.75 then 2
      when coalesce(s.mcp_acceptance_rate, 0) >= 0.5 then 1
      else 0
    end,
    case
      when s.retention_rate is null then 0
      else greatest(0, 1 - s.retention_rate)
    end,
    0,
    0,
    timezone('utc', now())
  from public.icon_scores s
  inner join public.icon_catalog c
    on c.icon_id = s.icon_id
  on conflict (icon_id) do update
  set
    popularity_score = excluded.popularity_score,
    behavioral_score = excluded.behavioral_score,
    editorial_score = excluded.editorial_score,
    replace_risk_score = excluded.replace_risk_score,
    updated_at = excluded.updated_at;

  get diagnostics v_upserted = row_count;
  return v_upserted;
end;
$$;

revoke all on function public.si_refresh_icon_search_private_features() from public;
grant execute on function public.si_refresh_icon_search_private_features() to service_role;

select public.si_refresh_icon_search_private_features();

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
    where jobname = 'si-refresh-icon-search-private-features-daily';

    if v_job_id is not null then
      perform cron.unschedule(v_job_id);
    end if;

    perform cron.schedule(
      'si-refresh-icon-search-private-features-daily',
      '10 0 * * *',
      $job$select public.si_refresh_icon_search_private_features();$job$
    );
  else
    raise notice 'pg_cron schema not found; schedule hosted search feature refresh manually.';
  end if;
exception
  when undefined_table or undefined_function then
    raise notice 'pg_cron is unavailable in this environment; schedule hosted search feature refresh manually.';
end $$;
