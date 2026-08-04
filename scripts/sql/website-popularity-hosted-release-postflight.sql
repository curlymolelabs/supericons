\set ON_ERROR_STOP on

do $$
declare
  v_outline jsonb;
  v_solid jsonb;
begin
  select public.si_get_website_popular_icons('outline') into v_outline;
  select public.si_get_website_popular_icons('solid') into v_solid;

  if v_outline ->> 'status' <> 'fresh'
    or jsonb_array_length(v_outline -> 'icon_refs') <> 50 then
    raise exception 'Outline public response is not fresh with 50 refs';
  end if;

  if v_solid ->> 'status' <> 'fresh'
    or jsonb_array_length(v_solid -> 'icon_refs') < 6
    or jsonb_array_length(v_solid -> 'icon_refs') > 50 then
    raise exception 'Solid public response is not fresh or bounded';
  end if;

  if not exists (
    select 1
    from cron.job
    where jobname = 'si-refresh-website-icon-popularity-daily'
      and schedule = '20 0 * * *'
      and command = 'select public.si_refresh_website_icon_popularity();'
      and active
  ) then
    raise exception 'Daily popularity schedule is missing or incorrect';
  end if;
end
$$;

select jsonb_build_object(
  'status', 'pass',
  'outline', public.si_get_website_popular_icons('outline'),
  'solid', public.si_get_website_popular_icons('solid')
) as website_popularity_release_postflight;
