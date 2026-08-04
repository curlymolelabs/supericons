\set ON_ERROR_STOP on

create temp table website_popularity_release_baseline (
  object_name text primary key,
  object_fingerprint text not null
);

insert into website_popularity_release_baseline (
  object_name,
  object_fingerprint
)
select
  'icon_scores',
  coalesce(md5(string_agg(row_text, E'\n' order by row_text)), md5(''))
from (
  select to_jsonb(scores)::text as row_text
  from public.icon_scores as scores
) as rows
union all
select
  'icon_search_private_features',
  coalesce(md5(string_agg(row_text, E'\n' order by row_text)), md5(''))
from (
  select to_jsonb(features)::text as row_text
  from public.icon_search_private_features as features
) as rows
union all
select
  'si_rebuild_icon_scores',
  md5(pg_get_functiondef('public.si_rebuild_icon_scores()'::regprocedure));
