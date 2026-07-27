\set ON_ERROR_STOP on

begin transaction read only;

do $$
begin
  if (
    select count(*)
    from supabase_migrations.schema_migrations
    where version = '20260727120000'
  ) <> 1 then
    raise exception 'Migration 20260727120000 is not recorded exactly once';
  end if;

  if md5(pg_get_functiondef(
    'public.si_log_icon_request(text,text,text,text,integer,text,text,text,text)'::regprocedure
  )) <> '89f2e6bb7ebd589ae21194592d4905ca' then
    raise exception 'The icon request function changed after history recording';
  end if;
end $$;

select json_build_object(
  'status', 'ok',
  'migration_version', '20260727120000',
  'history_rows', 1,
  'request_function_md5', '89f2e6bb7ebd589ae21194592d4905ca'
) as history_postflight;

commit;
