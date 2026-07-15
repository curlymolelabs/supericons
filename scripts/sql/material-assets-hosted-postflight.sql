\set ON_ERROR_STOP on
\echo 'Running Material asset migration postflight'

do $material_assets_postflight$
declare
  v_constraint_count integer;
begin
  if to_regclass('public.material_icon_assets') is null then
    raise exception 'material_icon_assets was not created';
  end if;

  if (select count(*) from public.material_icon_assets) <> 0 then
    raise exception 'material_icon_assets was not empty after migration';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.material_icon_assets'::regclass
      and relrowsecurity
  ) then
    raise exception 'Row level security is not enabled on material_icon_assets';
  end if;

  if not has_table_privilege('service_role', 'public.material_icon_assets', 'SELECT, INSERT, UPDATE, DELETE') then
    raise exception 'service_role lacks required material_icon_assets privileges';
  end if;

  if has_table_privilege('anon', 'public.material_icon_assets', 'SELECT')
     or has_table_privilege('authenticated', 'public.material_icon_assets', 'SELECT')
     or exists (
       select 1
       from pg_class relation
       cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) permission
       where relation.oid = 'public.material_icon_assets'::regclass
         and permission.grantee = 0
         and permission.privilege_type = 'SELECT'
     ) then
    raise exception 'A public role can read material_icon_assets';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_icon_assets'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (icon_id, variant)'
  ) then
    raise exception 'material_icon_assets primary key is missing or changed';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.material_icon_assets'::regclass
      and contype = 'f'
      and confrelid = 'public.icon_catalog'::regclass
  ) then
    raise exception 'material_icon_assets foreign key to icon_catalog is missing';
  end if;

  select count(*)
  into v_constraint_count
  from pg_constraint
  where conrelid = 'public.material_icon_assets'::regclass
    and conname in (
      'material_icon_assets_icon_id_valid',
      'material_icon_assets_variant_valid',
      'material_icon_assets_svg_nonempty',
      'material_icon_assets_axes_object',
      'material_icon_assets_source_repo_nonempty',
      'material_icon_assets_source_revision_valid',
      'material_icon_assets_checksum_valid',
      'material_icon_assets_license_nonempty'
    )
    and convalidated;
  if v_constraint_count <> 8 then
    raise exception 'Material asset validation constraints are incomplete';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'search_request_audit'
      and column_name = 'error_code'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mcp_usage_events'
      and column_name = 'error_code'
  ) then
    raise exception 'Required error_code columns are missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.search_request_audit'::regclass
      and conname = 'search_request_audit_error_code_valid'
      and convalidated
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mcp_usage_events'::regclass
      and conname = 'mcp_usage_events_error_code_valid'
      and convalidated
  ) then
    raise exception 'Required error_code constraints are missing or unvalidated';
  end if;

  if to_regclass('public.material_icon_assets_variant_revision_idx') is null
     or to_regclass('public.search_request_audit_error_code_created_at_idx') is null
     or to_regclass('public.mcp_usage_events_error_code_created_at_idx') is null then
    raise exception 'A required Material support index is missing';
  end if;
end
$material_assets_postflight$;

select 'material_assets_postflight_ok' as result;
