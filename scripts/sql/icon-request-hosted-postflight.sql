\set ON_ERROR_STOP on

do $$
declare
  request_function regprocedure := to_regprocedure(
    'public.si_log_icon_request(text,text,text,text,integer,text,text,text,text)'
  );
  request_function_md5 text;
  request_security_definer boolean;
  request_settings text[];
  signal_constraint_md5 text;
  collection_constraint_md5 text;
  current_rows bigint;
  current_id_md5 text;
  current_evidence_function_md5 text;
  current_table_acl_md5 text;
  current_table_rls boolean;
begin
  if request_function is null then
    raise exception 'The icon request function is missing after migration';
  end if;

  select
    md5(pg_get_functiondef(p.oid)),
    p.prosecdef,
    p.proconfig
  into
    request_function_md5,
    request_security_definer,
    request_settings
  from pg_proc p
  where p.oid = request_function;

  if request_function_md5 is distinct from '89f2e6bb7ebd589ae21194592d4905ca' then
    raise exception 'Unexpected icon request function fingerprint: %', request_function_md5;
  end if;

  if request_security_definer is not true then
    raise exception 'The icon request function is not security definer';
  end if;

  if request_settings is null or not ('search_path=public' = any(request_settings)) then
    raise exception 'The icon request function does not pin search_path to public';
  end if;

  if not has_function_privilege('anon', request_function, 'execute')
    or not has_function_privilege('authenticated', request_function, 'execute')
    or not has_function_privilege('service_role', request_function, 'execute') then
    raise exception 'A required application role cannot execute the icon request function';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid = request_function
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC can execute the icon request function';
  end if;

  select md5(pg_get_constraintdef(oid, true))
  into signal_constraint_md5
  from pg_constraint
  where conrelid = 'public.icon_evidence'::regclass
    and conname = 'icon_evidence_signal_type_valid'
    and convalidated;

  if signal_constraint_md5 is distinct from 'fbf51c87920804ae9c6595b2531efe53' then
    raise exception 'Unexpected migrated signal constraint fingerprint: %',
      signal_constraint_md5;
  end if;

  select md5(pg_get_constraintdef(oid, true))
  into collection_constraint_md5
  from pg_constraint
  where conrelid = 'public.icon_evidence'::regclass
    and conname = 'icon_evidence_icon_or_collection_required'
    and convalidated;

  if collection_constraint_md5 is distinct from '91acb369b675395c80deab9bf7fd50bb' then
    raise exception 'Unexpected migrated icon requirement constraint fingerprint: %',
      collection_constraint_md5;
  end if;

  select
    count(*),
    md5(coalesce(string_agg(id::text, ',' order by id::text), ''))
  into current_rows, current_id_md5
  from public.icon_evidence;

  select md5(pg_get_functiondef(
    'public.si_log_icon_evidence(text,text,uuid,text,text,integer,integer,text,text,text,text,integer,boolean,double precision,text,text,text,timestamptz,integer,text)'::regprocedure
  ))
  into current_evidence_function_md5;

  select
    md5(coalesce(c.relacl::text, '')),
    c.relrowsecurity
  into current_table_acl_md5, current_table_rls
  from pg_class c
  where c.oid = 'public.icon_evidence'::regclass;

  if current_rows <> (select evidence_rows from icon_request_migration_baseline)
    or current_id_md5 is distinct from (
      select evidence_id_md5 from icon_request_migration_baseline
    ) then
    raise exception 'Existing icon evidence rows changed during migration';
  end if;

  if current_evidence_function_md5 is distinct from (
    select evidence_function_md5 from icon_request_migration_baseline
  ) then
    raise exception 'The existing evidence function changed during migration';
  end if;

  if current_table_acl_md5 is distinct from (
    select evidence_table_acl_md5 from icon_request_migration_baseline
  ) or current_table_rls is distinct from (
    select evidence_table_rls from icon_request_migration_baseline
  ) then
    raise exception 'The icon evidence table access controls changed during migration';
  end if;

  if exists (
    select 1
    from public.icon_evidence
    where signal_type = 'icon_request'
  ) then
    raise exception 'The migration unexpectedly created icon request rows';
  end if;

  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260727120000'
  ) then
    raise exception 'Migration history changed before the guarded history step';
  end if;
end $$;

select json_build_object(
  'status', 'ok',
  'migration_version', '20260727120000',
  'request_function_md5', '89f2e6bb7ebd589ae21194592d4905ca',
  'signal_constraint_md5', 'fbf51c87920804ae9c6595b2531efe53',
  'icon_requirement_constraint_md5', '91acb369b675395c80deab9bf7fd50bb',
  'existing_rows_preserved', true,
  'existing_evidence_function_preserved', true,
  'table_access_preserved', true,
  'synthetic_rows_created', 0
) as postflight;
