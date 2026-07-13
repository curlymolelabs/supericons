-- Rollback plan:
-- 1. Stop isolated measurement callers from using si_search_icon_candidates_v3.
-- 2. Drop only public.si_search_icon_candidates_v3(text[], text, integer).
-- 3. Keep the existing candidate functions and all catalog data unchanged.

create or replace function public.si_search_icon_candidates_v3(
  p_queries text[],
  p_library text default null,
  p_limit integer default 60
)
returns table (
  query_variant text,
  query_variant_rank integer,
  icon_id text,
  name text,
  source_library text,
  style text,
  icon_type text,
  lexical_rank double precision,
  registry_rank double precision,
  avoid_rank double precision
)
language sql
security definer
set search_path = public
as $$
  with query_inputs as (
    select
      nullif(trim(regexp_replace(coalesce(input.raw_query, ''), '\s+', ' ', 'g')), '') as query_variant,
      (input.ordinality - 1)::integer as query_variant_rank
    from unnest(coalesce(p_queries, array[]::text[])) with ordinality as input(raw_query, ordinality)
  ),
  prepared_queries as (
    select
      query_variant,
      query_variant_rank,
      websearch_to_tsquery('simple', query_variant) as query_ts
    from query_inputs
    where query_variant is not null
  ),
  scored_candidates as (
    select
      q.query_variant,
      q.query_variant_rank,
      c.icon_id,
      c.name,
      c.source_library,
      c.style,
      c.icon_type,
      (
        coalesce(ts_rank_cd(c.search_document, q.query_ts), 0)::double precision
        + case
          when coalesce(array_to_string(m.semantic_aliases, ' '), '') ilike '%' || q.query_variant || '%'
            then 1.75
          else 0
        end
        + case
          when coalesce(array_to_string(m.use_cases, ' '), '') ilike '%' || q.query_variant || '%'
            then 0.75
          else 0
        end
        + (coalesce(ts_rank_cd(r.search_document, q.query_ts), 0)::double precision * 1.25)
      ) as lexical_rank,
      coalesce(ts_rank_cd(r.search_document, q.query_ts), 0)::double precision as registry_rank,
      coalesce(ts_rank_cd(r.avoid_document, q.query_ts), 0)::double precision as avoid_rank
    from prepared_queries q
    cross join public.icon_catalog c
    left join public.icon_search_private_manifest m
      on m.icon_id = c.icon_id
    left join public.icon_search_public_registry_metadata r
      on r.icon_id = c.icon_id
    where (p_library is null or c.source_library = p_library)
      and (
        c.search_document @@ q.query_ts
        or coalesce(array_to_string(m.semantic_aliases, ' '), '') ilike '%' || q.query_variant || '%'
        or coalesce(array_to_string(m.use_cases, ' '), '') ilike '%' || q.query_variant || '%'
        or r.search_document @@ q.query_ts
      )
  ),
  ranked_candidates as (
    select
      scored_candidates.*,
      row_number() over (
        partition by query_variant_rank
        order by lexical_rank desc, name asc
      ) as candidate_rank
    from scored_candidates
  )
  select
    ranked_candidates.query_variant,
    ranked_candidates.query_variant_rank,
    ranked_candidates.icon_id,
    ranked_candidates.name,
    ranked_candidates.source_library,
    ranked_candidates.style,
    ranked_candidates.icon_type,
    ranked_candidates.lexical_rank,
    ranked_candidates.registry_rank,
    ranked_candidates.avoid_rank
  from ranked_candidates
  where candidate_rank <= greatest(20, least(coalesce(p_limit, 60), 200))
  order by query_variant_rank asc, candidate_rank asc;
$$;

revoke all on function public.si_search_icon_candidates_v3(text[], text, integer) from public;

grant execute on function public.si_search_icon_candidates_v3(text[], text, integer) to service_role;

comment on function public.si_search_icon_candidates_v3(text[], text, integer) is
  'Isolated measurement candidate search for an ordered array of query variants.';
