\set ON_ERROR_STOP on
\echo 'Running lightweight candidate RPC postflight'

do $latency_gate_a$
declare
  v_existing_result text;
  v_lightweight_result text;
  v_query text;
  v_library text;
  v_nonempty_cases integer := 0;
begin
  if to_regprocedure('public.si_search_icon_candidates(text,text,integer)') is null then
    raise exception 'Existing production candidate RPC was removed';
  end if;

  if to_regprocedure('public.si_search_icon_candidates_v2(text,text,integer)') is null then
    raise exception 'Lightweight candidate RPC was not created';
  end if;

  select lower(pg_get_function_result('public.si_search_icon_candidates(text,text,integer)'::regprocedure))
  into v_existing_result;

  select lower(pg_get_function_result('public.si_search_icon_candidates_v2(text,text,integer)'::regprocedure))
  into v_lightweight_result;

  if v_existing_result not like '%svg text%' then
    raise exception 'Existing production RPC no longer returns SVG';
  end if;

  if v_lightweight_result like '%svg text%' then
    raise exception 'Lightweight RPC unexpectedly returns SVG';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.si_search_icon_candidates_v2(text,text,integer)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute the lightweight RPC';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) permission
    where p.oid = 'public.si_search_icon_candidates_v2(text,text,integer)'::regprocedure
      and permission.grantee = 0
      and permission.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC can execute the lightweight RPC';
  end if;

  for v_query, v_library in
    values
      ('settings'::text, null::text),
      ('hello'::text, null::text),
      ('cog'::text, 'bootstrap'::text),
      ('respond'::text, 'phosphor'::text)
  loop
    if exists (
      select 1
      from public.si_search_icon_candidates(v_query, v_library, 40)
    ) then
      v_nonempty_cases := v_nonempty_cases + 1;
    end if;

    if exists (
      (
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates(v_query, v_library, 40)
        except all
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates_v2(v_query, v_library, 40)
      )
      union all
      (
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates_v2(v_query, v_library, 40)
        except all
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates(v_query, v_library, 40)
      )
    ) then
      raise exception 'Old and lightweight RPC results differ for query % and library %',
        v_query,
        coalesce(v_library, '(all)');
    end if;
  end loop;

  if v_nonempty_cases = 0 then
    raise exception 'All fixed postflight queries returned zero rows';
  end if;
end
$latency_gate_a$;

select 'lightweight_candidates_postflight_ok' as result;
