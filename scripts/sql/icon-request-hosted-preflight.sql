\set ON_ERROR_STOP on

begin transaction read only;

do $$
declare
  signal_constraint_md5 text;
  collection_constraint_md5 text;
  evidence_rpc_md5 text;
begin
  if to_regclass('public.icon_evidence') is null then
    raise exception 'Required table public.icon_evidence is missing';
  end if;

  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260727120000'
  ) then
    raise exception 'Migration 20260727120000 is already recorded as applied';
  end if;

  if to_regprocedure(
    'public.si_log_icon_request(text,text,text,text,integer,text,text,text,text)'
  ) is not null then
    raise exception 'The icon request function already exists';
  end if;

  select md5(pg_get_constraintdef(oid, true))
  into signal_constraint_md5
  from pg_constraint
  where conrelid = 'public.icon_evidence'::regclass
    and conname = 'icon_evidence_signal_type_valid';

  if signal_constraint_md5 is distinct from 'a3f2d83f6c70db8e3e80d905c00d4d7a' then
    raise exception 'Unexpected signal constraint fingerprint: %', signal_constraint_md5;
  end if;

  select md5(pg_get_constraintdef(oid, true))
  into collection_constraint_md5
  from pg_constraint
  where conrelid = 'public.icon_evidence'::regclass
    and conname = 'icon_evidence_icon_or_collection_required';

  if collection_constraint_md5 is distinct from '58ac2ddc4a3876ac70bb532385056ce5' then
    raise exception 'Unexpected icon requirement constraint fingerprint: %',
      collection_constraint_md5;
  end if;

  select md5(pg_get_functiondef(
    'public.si_log_icon_evidence(text,text,uuid,text,text,integer,integer,text,text,text,text,integer,boolean,double precision,text,text,text,timestamptz,integer,text)'::regprocedure
  ))
  into evidence_rpc_md5;

  if evidence_rpc_md5 is distinct from 'd9845ddd8cca7b18bd1919bde49af90a' then
    raise exception 'Unexpected existing evidence function fingerprint: %', evidence_rpc_md5;
  end if;
end $$;

select json_build_object(
  'status', 'ok',
  'migration_version', '20260727120000',
  'migration_recorded', false,
  'request_function_present', false,
  'signal_constraint_md5', 'a3f2d83f6c70db8e3e80d905c00d4d7a',
  'icon_requirement_constraint_md5', '58ac2ddc4a3876ac70bb532385056ce5',
  'evidence_function_md5', 'd9845ddd8cca7b18bd1919bde49af90a',
  'evidence_rows', (select count(*) from public.icon_evidence),
  'evidence_id_md5', (
    select md5(coalesce(string_agg(id::text, ',' order by id::text), ''))
    from public.icon_evidence
  )
) as preflight;

commit;
