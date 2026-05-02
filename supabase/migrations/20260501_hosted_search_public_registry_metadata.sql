create table if not exists public.icon_search_public_registry_metadata (
  icon_id text primary key references public.icon_catalog(icon_id) on delete cascade,
  label text,
  purpose text,
  category text,
  semantic_tags text[] not null default '{}'::text[],
  synonyms text[] not null default '{}'::text[],
  use_when text,
  avoid_when text,
  depicts text,
  job_category text,
  secondary_categories text[] not null default '{}'::text[],
  taxonomy_rank integer,
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(label, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(array_to_string(synonyms, ' '), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(array_to_string(semantic_tags, ' '), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(depicts, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(purpose, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(use_when, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(category, '')), 'D')
    || setweight(to_tsvector('simple', coalesce(job_category, '')), 'D')
    || setweight(to_tsvector('simple', coalesce(array_to_string(secondary_categories, ' '), '')), 'D')
  ) stored,
  avoid_document tsvector generated always as (
    to_tsvector('simple', coalesce(avoid_when, ''))
  ) stored,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists icon_search_public_registry_metadata_search_idx
  on public.icon_search_public_registry_metadata using gin (search_document);

create index if not exists icon_search_public_registry_metadata_avoid_idx
  on public.icon_search_public_registry_metadata using gin (avoid_document);

create index if not exists icon_search_public_registry_metadata_category_idx
  on public.icon_search_public_registry_metadata (category, job_category);

alter table public.icon_search_public_registry_metadata enable row level security;

revoke all on table public.icon_search_public_registry_metadata from public;

grant select, insert, update, delete on table public.icon_search_public_registry_metadata to service_role;
