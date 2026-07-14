\set ON_ERROR_STOP on
\echo 'Running Material hosted seed postflight'

do $material_seed_postflight$
declare
  v_table_count integer;
  v_outline_count integer;
  v_solid_count integer;
  v_icon_count integer;
  v_storage_count integer;
  v_missing_object_count integer;
  v_unexpected_object_count integer;
begin
  select count(*),
         count(*) filter (where variant = 'outline'),
         count(*) filter (where variant = 'solid'),
         count(distinct icon_id)
  into v_table_count, v_outline_count, v_solid_count, v_icon_count
  from public.material_icon_assets;

  if v_table_count <> 8524
     or v_outline_count <> 4262
     or v_solid_count <> 4262
     or v_icon_count <> 4262 then
    raise exception 'Unexpected Material table counts: total %, outline %, solid %, icons %',
      v_table_count, v_outline_count, v_solid_count, v_icon_count;
  end if;

  if exists (
    select 1
    from public.material_icon_assets
    where source_revision <> '30f8fddd293b1f0189896dc4aaecdfaba1d37ae0'
      or license <> 'Apache-2.0'
      or axes <> case variant
        when 'outline' then '{"fill":0,"wght":300,"grad":0,"opsz":24,"snapped":false}'::jsonb
        when 'solid' then '{"fill":1,"wght":400,"grad":0,"opsz":24,"snapped":false}'::jsonb
        else '{}'::jsonb
      end
  ) then
    raise exception 'A Material row does not match the pinned revision, license, or preset axes';
  end if;

  if not exists (
    select 1
    from storage.buckets
    where id = 'material-icons'
      and public = false
  ) then
    raise exception 'The material-icons bucket is missing or public after seed';
  end if;

  select count(*)
  into v_storage_count
  from storage.objects
  where bucket_id = 'material-icons'
    and name like 'materialsymbolsoutlined/%';

  if v_storage_count <> 8524 then
    raise exception 'Unexpected Material storage object count: %', v_storage_count;
  end if;

  with expected_objects as (
    select
      'materialsymbolsoutlined/'
      || regexp_replace(icon_id, '^material:', '')
      || '/fill-' || (axes ->> 'fill')
      || '/wght-' || (axes ->> 'wght')
      || '/' || case (axes ->> 'grad')
        when '-25' then 'grad-neg25'
        else 'grad-' || (axes ->> 'grad')
      end
      || '/opsz-' || (axes ->> 'opsz') || '.svg' as name
    from public.material_icon_assets
  )
  select count(*)
  into v_missing_object_count
  from expected_objects expected
  left join storage.objects stored
    on stored.bucket_id = 'material-icons'
   and stored.name = expected.name
  where stored.id is null;

  if v_missing_object_count <> 0 then
    raise exception 'Material table rows missing matching storage objects: %', v_missing_object_count;
  end if;

  with expected_objects as (
    select
      'materialsymbolsoutlined/'
      || regexp_replace(icon_id, '^material:', '')
      || '/fill-' || (axes ->> 'fill')
      || '/wght-' || (axes ->> 'wght')
      || '/' || case (axes ->> 'grad')
        when '-25' then 'grad-neg25'
        else 'grad-' || (axes ->> 'grad')
      end
      || '/opsz-' || (axes ->> 'opsz') || '.svg' as name
    from public.material_icon_assets
  )
  select count(*)
  into v_unexpected_object_count
  from storage.objects stored
  left join expected_objects expected on expected.name = stored.name
  where stored.bucket_id = 'material-icons'
    and stored.name like 'materialsymbolsoutlined/%'
    and expected.name is null;

  if v_unexpected_object_count <> 0 then
    raise exception 'Unexpected objects exist under the Material storage prefix: %', v_unexpected_object_count;
  end if;
end
$material_seed_postflight$;

select
  (select count(*) from public.material_icon_assets) as table_rows,
  (select count(*) from public.material_icon_assets where variant = 'outline') as outline_rows,
  (select count(*) from public.material_icon_assets where variant = 'solid') as solid_rows,
  (select count(*) from storage.objects where bucket_id = 'material-icons' and name like 'materialsymbolsoutlined/%') as storage_objects,
  'material_assets_hosted_seed_postflight_ok' as result;
