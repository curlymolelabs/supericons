\set ON_ERROR_STOP on

begin;

do $$
declare
  request_function regprocedure := to_regprocedure(
    'public.si_log_icon_request(text,text,text,text,integer,text,text,text,text)'
  );
begin
  if request_function is null then
    raise exception 'The icon request function is already absent';
  end if;

  if md5(pg_get_functiondef(request_function)) <> '89f2e6bb7ebd589ae21194592d4905ca' then
    raise exception 'Refusing rollback because the icon request function changed';
  end if;
end $$;

revoke all on function public.si_log_icon_request(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

drop function public.si_log_icon_request(
  text,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
);

commit;

-- Keep the expanded constraints and migration history. Recorded icon_request
-- rows remain truthful and readable for investigation after callers roll back.
