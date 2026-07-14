\set ON_ERROR_STOP on
\echo 'Running Material private-role recovery preflight'

do $material_private_roles_preflight$
begin
  if to_regclass('public.material_icon_assets') is null then
    raise exception 'Required table public.material_icon_assets is missing';
  end if;

  if (select count(*) from public.material_icon_assets) <> 0 then
    raise exception 'material_icon_assets is not empty. Stop before changing privileges.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.material_icon_assets'::regclass
      and relrowsecurity
  ) then
    raise exception 'Row level security is not enabled on material_icon_assets';
  end if;

  if not has_table_privilege('anon', 'public.material_icon_assets', 'SELECT')
     and not has_table_privilege('authenticated', 'public.material_icon_assets', 'SELECT') then
    raise exception 'The production privilege mismatch is not present. Stop and inspect before recovery.';
  end if;
end
$material_private_roles_preflight$;

select 'material_private_roles_recovery_preflight_ok' as result;
