\set ON_ERROR_STOP on
\echo 'Running batched candidate RPC preflight'

do $roundtrip_gate_a$
begin
  if to_regclass('public.icon_catalog') is null then
    raise exception 'Required table public.icon_catalog is missing';
  end if;

  if to_regprocedure('public.si_search_icon_candidates_v2(text,text,integer)') is null then
    raise exception 'Required lightweight candidate RPC is missing';
  end if;

  if to_regprocedure('public.si_search_icon_candidates_v3(text[],text,integer)') is not null then
    raise exception 'Batched candidate RPC already exists. Stop and inspect before continuing.';
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
end
$roundtrip_gate_a$;

select 'batched_candidates_preflight_ok' as result;
