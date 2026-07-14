\set ON_ERROR_STOP on
\echo 'Running Material hosted seed preflight'

do $material_seed_preflight$
begin
  if to_regclass('public.material_icon_assets') is null then
    raise exception 'Required table public.material_icon_assets is missing';
  end if;

  if (select count(*) from public.material_icon_assets) <> 0 then
    raise exception 'material_icon_assets is not empty. Do not start a from-scratch seed.';
  end if;

  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260714220000'
  ) or not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260714223000'
  ) then
    raise exception 'Material migration history is incomplete';
  end if;

  if has_table_privilege('anon', 'public.material_icon_assets', 'SELECT')
     or has_table_privilege('authenticated', 'public.material_icon_assets', 'SELECT') then
    raise exception 'A public API role can read material_icon_assets';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'material-icons'
      and public = false
  ) then
    raise exception 'The private material-icons bucket is missing or public';
  end if;

  if exists (
    with expected_objects as (
      select
        'materialsymbolsoutlined/'
        || regexp_replace(icon_id, '^material:', '')
        || preset.path_suffix as name
      from public.icon_catalog
      cross join (values
        ('/fill-0/wght-300/grad-0/opsz-24.svg'),
        ('/fill-1/wght-400/grad-0/opsz-24.svg')
      ) preset(path_suffix)
      where icon_id like 'material:%'
    )
    select 1
    from storage.objects stored
    left join expected_objects expected on expected.name = stored.name
    where stored.bucket_id = 'material-icons'
      and stored.name like 'materialsymbolsoutlined/%'
      and expected.name is null
  ) then
    raise exception 'The Material bucket prefix contains an object outside the two fixed preset paths. Stop before overwriting or deleting anything.';
  end if;
end
$material_seed_preflight$;

select
  count(*) as existing_material_objects,
  count(*) filter (where name ~ '/fill-0/wght-300/grad-0/opsz-24\.svg$') as existing_outline_objects,
  count(*) filter (where name ~ '/fill-1/wght-400/grad-0/opsz-24\.svg$') as existing_solid_objects,
  'material_assets_hosted_seed_preflight_ok' as result
from storage.objects
where bucket_id = 'material-icons'
  and name like 'materialsymbolsoutlined/%';
