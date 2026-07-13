\set ON_ERROR_STOP on
\echo 'Running batched candidate RPC postflight'

do $roundtrip_gate_a$
declare
  v_query text;
  v_library text;
  v_variant_rank integer;
begin
  if to_regprocedure('public.si_search_icon_candidates_v2(text,text,integer)') is null then
    raise exception 'Lightweight candidate RPC was removed';
  end if;

  if to_regprocedure('public.si_search_icon_candidates_v3(text[],text,integer)') is null then
    raise exception 'Batched candidate RPC was not created';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.si_search_icon_candidates_v3(text[],text,integer)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute the batched RPC';
  end if;

  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) permission
    where p.oid = 'public.si_search_icon_candidates_v3(text[],text,integer)'::regprocedure
      and permission.grantee = 0
      and permission.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC can execute the batched RPC';
  end if;

  for v_query, v_library, v_variant_rank in
    values
      ('settings'::text, null::text, 0),
      ('hello'::text, null::text, 1),
      ('cog'::text, null::text, 2),
      ('respond'::text, null::text, 3)
  loop
    if exists (
      (
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates_v2(v_query, v_library, 40)
        except all
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates_v3(array['settings', 'hello', 'cog', 'respond'], v_library, 40)
        where query_variant_rank = v_variant_rank
          and query_variant = v_query
      )
      union all
      (
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates_v3(array['settings', 'hello', 'cog', 'respond'], v_library, 40)
        where query_variant_rank = v_variant_rank
          and query_variant = v_query
        except all
        select icon_id, name, source_library, style, icon_type, lexical_rank, registry_rank, avoid_rank
        from public.si_search_icon_candidates_v2(v_query, v_library, 40)
      )
    ) then
      raise exception 'Lightweight and batched RPC results differ for query %', v_query;
    end if;
  end loop;

  if exists (
    select 1
    from public.si_search_icon_candidates_v3(array['cog', 'cog'], null, 40)
    where query_variant_rank not in (0, 1)
       or query_variant <> 'cog'
  ) then
    raise exception 'Batched RPC returned invalid duplicate-query provenance';
  end if;
end
$roundtrip_gate_a$;

select 'batched_candidates_postflight_ok' as result;
