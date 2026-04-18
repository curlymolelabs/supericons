create or replace function public.si_search_icon_candidates(
  p_query text,
  p_library text default null,
  p_limit integer default 60
)
returns table (
  icon_id text,
  name text,
  source_library text,
  style text,
  icon_type text,
  lexical_rank double precision
)
language sql
security definer
set search_path = public
as $$
  with q as (
    select nullif(trim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g')), '') as query_text
  )
  select
    c.icon_id,
    c.name,
    c.source_library,
    c.style,
    c.icon_type,
    (
      coalesce(ts_rank_cd(c.search_document, websearch_to_tsquery('simple', q.query_text)), 0)::double precision
      + case
        when coalesce(array_to_string(m.semantic_aliases, ' '), '') ilike '%' || q.query_text || '%'
          then 1.75
        else 0
      end
      + case
        when coalesce(array_to_string(m.use_cases, ' '), '') ilike '%' || q.query_text || '%'
          then 0.75
        else 0
      end
    ) as lexical_rank
  from public.icon_catalog c
  left join public.icon_search_private_manifest m
    on m.icon_id = c.icon_id
  cross join q
  where q.query_text is not null
    and (p_library is null or c.source_library = p_library)
    and (
      c.search_document @@ websearch_to_tsquery('simple', q.query_text)
      or coalesce(array_to_string(m.semantic_aliases, ' '), '') ilike '%' || q.query_text || '%'
      or coalesce(array_to_string(m.use_cases, ' '), '') ilike '%' || q.query_text || '%'
    )
  order by lexical_rank desc, c.name asc
  limit greatest(20, least(coalesce(p_limit, 60), 200));
$$;

revoke all on function public.si_search_icon_candidates(text, text, integer) from public;

grant execute on function public.si_search_icon_candidates(text, text, integer) to service_role;
