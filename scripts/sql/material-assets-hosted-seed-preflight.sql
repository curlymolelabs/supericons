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

  if (
    select count(*)
    from storage.objects
    where bucket_id = 'material-icons'
      and name like 'materialsymbolsoutlined/%'
  ) <> 0 then
    raise exception 'The Material bucket prefix is not empty. Do not overwrite or delete objects under this packet.';
  end if;
end
$material_seed_preflight$;

select 'material_assets_hosted_seed_preflight_ok' as result;
