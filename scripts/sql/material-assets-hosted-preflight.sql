\set ON_ERROR_STOP on
\echo 'Running Material asset migration preflight'

do $material_assets_preflight$
begin
  if to_regclass('public.icon_catalog') is null then
    raise exception 'Required table public.icon_catalog is missing';
  end if;

  if to_regclass('public.search_request_audit') is null then
    raise exception 'Required table public.search_request_audit is missing';
  end if;

  if to_regclass('public.mcp_usage_events') is null then
    raise exception 'Required table public.mcp_usage_events is missing';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'Required service_role is missing';
  end if;

  if to_regclass('public.material_icon_assets') is not null then
    raise exception 'material_icon_assets already exists. Stop and inspect before continuing.';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('search_request_audit', 'mcp_usage_events')
      and column_name = 'error_code'
  ) then
    raise exception 'An error_code column already exists. Stop and inspect before continuing.';
  end if;
end
$material_assets_preflight$;

select 'material_assets_preflight_ok' as result;
