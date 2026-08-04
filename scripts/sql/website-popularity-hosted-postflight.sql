\set ON_ERROR_STOP on

do $$
declare
  v_current text;
  v_expected text;
  v_name text;
begin
  foreach v_name in array array[
    'icon_scores',
    'icon_search_private_features',
    'si_rebuild_icon_scores'
  ] loop
    select object_fingerprint
    into v_expected
    from website_popularity_release_baseline
    where object_name = v_name;

    if v_name = 'icon_scores' then
      select coalesce(
        md5(string_agg(row_text, E'\n' order by row_text)),
        md5('')
      )
      into v_current
      from (
        select to_jsonb(scores)::text as row_text
        from public.icon_scores as scores
      ) as rows;
    elsif v_name = 'icon_search_private_features' then
      select coalesce(
        md5(string_agg(row_text, E'\n' order by row_text)),
        md5('')
      )
      into v_current
      from (
        select to_jsonb(features)::text as row_text
        from public.icon_search_private_features as features
      ) as rows;
    else
      select md5(pg_get_functiondef(
        'public.si_rebuild_icon_scores()'::regprocedure
      )) into v_current;
    end if;

    if v_current is distinct from v_expected then
      raise exception 'Protected object changed: %', v_name;
    end if;
  end loop;

  if not has_function_privilege(
    'anon',
    'public.si_get_website_popular_icons(text)',
    'execute'
  ) or not has_function_privilege(
    'authenticated',
    'public.si_get_website_popular_icons(text)',
    'execute'
  ) then
    raise exception 'Bounded public RPC grants are incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.si_refresh_website_icon_popularity()',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.si_refresh_website_icon_popularity()',
    'execute'
  ) or has_function_privilege(
    'anon',
    'public.si_replace_website_icon_grid_availability(jsonb,integer,integer,text,text,timestamp with time zone,timestamp with time zone)',
    'execute'
  ) then
    raise exception 'Private writer function grants are too broad';
  end if;

  if has_table_privilege(
    'anon',
    'public.website_icon_popularity_scores',
    'select'
  ) or has_table_privilege(
    'authenticated',
    'public.website_icon_popularity_scores',
    'select'
  ) then
    raise exception 'Private score rows are publicly readable';
  end if;
end
$$;

select jsonb_build_object(
  'status', 'pass',
  'private_tables', 5,
  'bounded_public_rpc', true,
  'protected_objects_unchanged', true
) as website_popularity_postflight;
