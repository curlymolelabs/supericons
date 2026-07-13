\set ON_ERROR_STOP on
\echo 'Running lightweight candidate RPC preflight'

do $latency_gate_a$
declare
  v_catalog_count bigint;
begin
  if to_regclass('public.icon_catalog') is null then
    raise exception 'Required table public.icon_catalog is missing';
  end if;

  if to_regclass('public.icon_search_private_manifest') is null then
    raise exception 'Required table public.icon_search_private_manifest is missing';
  end if;

  if to_regclass('public.icon_search_public_registry_metadata') is null then
    raise exception 'Required table public.icon_search_public_registry_metadata is missing';
  end if;

  if to_regprocedure('public.si_search_icon_candidates(text,text,integer)') is null then
    raise exception 'Existing production candidate RPC is missing';
  end if;

  if to_regprocedure('public.si_search_icon_candidates_v2(text,text,integer)') is not null then
    raise exception 'Lightweight candidate RPC already exists. Stop and inspect before continuing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.icon_catalog'::regclass
      and contype = 'p'
      and pg_get_constraintdef(oid) = 'PRIMARY KEY (icon_id)'
  ) then
    raise exception 'icon_catalog.icon_id primary key is missing';
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'Required service_role is missing';
  end if;

  select count(*) into v_catalog_count from public.icon_catalog;
  if v_catalog_count = 0 then
    raise exception 'icon_catalog is empty';
  end if;
end
$latency_gate_a$;

select 'lightweight_candidates_preflight_ok' as result;
