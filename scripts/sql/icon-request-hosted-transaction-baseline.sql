\set ON_ERROR_STOP on

create temporary table icon_request_migration_baseline
on commit drop
as
select
  (select count(*) from public.icon_evidence) as evidence_rows,
  (
    select md5(coalesce(string_agg(id::text, ',' order by id::text), ''))
    from public.icon_evidence
  ) as evidence_id_md5,
  md5(pg_get_functiondef(
    'public.si_log_icon_evidence(text,text,uuid,text,text,integer,integer,text,text,text,text,integer,boolean,double precision,text,text,text,timestamptz,integer,text)'::regprocedure
  )) as evidence_function_md5,
  md5(coalesce(c.relacl::text, '')) as evidence_table_acl_md5,
  c.relrowsecurity as evidence_table_rls
from pg_class c
where c.oid = 'public.icon_evidence'::regclass;

do $$
begin
  if (select count(*) from icon_request_migration_baseline) <> 1 then
    raise exception 'Could not capture one icon evidence baseline row';
  end if;

  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260727120000'
  ) then
    raise exception 'Migration 20260727120000 became recorded before SQL execution';
  end if;
end $$;
