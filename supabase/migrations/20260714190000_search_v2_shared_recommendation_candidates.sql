-- Search v2 shared recommendation candidate retrieval.
--
-- Rollback plan, written before the schema change:
-- 1. Stop isolated recommendation measurement callers from using si_search_icon_candidates_v4.
-- 2. Drop only public.si_search_icon_candidates_v4(jsonb, text, integer).
-- 3. Keep v2, v3, all catalog data, and all production functions unchanged.
--
-- Backward compatibility:
-- - This function is additive and service-role only.
-- - No table, index, or existing function changes.
-- - Callers must preserve logical-query and variant provenance.

create or replace function public.si_search_icon_candidates_v4(
  p_query_groups jsonb,
  p_library text default null,
  p_limit integer default 60
)
returns table (
  logical_query_index integer,
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
      input.logical_query_index,
      nullif(trim(regexp_replace(coalesce(input.query_variant, ''), '\s+', ' ', 'g')), '') as query_variant,
      input.query_variant_rank
    from jsonb_to_recordset(coalesce(p_query_groups, '[]'::jsonb)) as input(
      logical_query_index integer,
      query_variant text,
      query_variant_rank integer
    )
    where input.logical_query_index >= 0
      and input.query_variant_rank >= 0
  ),
  prepared_queries as (
    select
      logical_query_index,
      query_variant,
      query_variant_rank,
      websearch_to_tsquery('simple', query_variant) as query_ts
    from query_inputs
    where query_variant is not null
  ),
  candidate_ids as (
    select
      q.logical_query_index,
      q.query_variant,
      q.query_variant_rank,
      q.query_ts,
      c.icon_id
    from prepared_queries q
    join public.icon_catalog c
      on c.search_document @@ q.query_ts
    where p_library is null or c.source_library = p_library

    union

    select
      q.logical_query_index,
      q.query_variant,
      q.query_variant_rank,
      q.query_ts,
      m.icon_id
    from prepared_queries q
    join public.icon_search_private_manifest m
      on coalesce(array_to_string(m.semantic_aliases, ' '), '') ilike '%' || q.query_variant || '%'
      or coalesce(array_to_string(m.use_cases, ' '), '') ilike '%' || q.query_variant || '%'

    union

    select
      q.logical_query_index,
      q.query_variant,
      q.query_variant_rank,
      q.query_ts,
      r.icon_id
    from prepared_queries q
    join public.icon_search_public_registry_metadata r
      on r.search_document @@ q.query_ts
  ),
  scored_candidates as (
    select
      q.logical_query_index,
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
    from candidate_ids q
    join public.icon_catalog c
      on c.icon_id = q.icon_id
    left join public.icon_search_private_manifest m
      on m.icon_id = c.icon_id
    left join public.icon_search_public_registry_metadata r
      on r.icon_id = c.icon_id
    where p_library is null or c.source_library = p_library
  ),
  ranked_candidates as (
    select
      scored_candidates.*,
      row_number() over (
        partition by logical_query_index, query_variant_rank
        order by lexical_rank desc, name asc, icon_id asc
      ) as candidate_rank
    from scored_candidates
  )
  select
    ranked_candidates.logical_query_index,
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
  order by logical_query_index asc, query_variant_rank asc, candidate_rank asc;
$$;

revoke all on function public.si_search_icon_candidates_v4(jsonb, text, integer) from public;

grant execute on function public.si_search_icon_candidates_v4(jsonb, text, integer) to service_role;

comment on function public.si_search_icon_candidates_v4(jsonb, text, integer) is
  'Isolated recommendation candidate search for multiple logical queries with ordered variant provenance.';
