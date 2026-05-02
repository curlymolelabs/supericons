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
  search_document tsvector not null default ''::tsvector,
  avoid_document tsvector not null default ''::tsvector,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.si_refresh_icon_search_public_registry_metadata_documents()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.search_document :=
    setweight(to_tsvector('simple', coalesce(new.label, '')), 'A')
    || setweight(to_tsvector('simple', coalesce(array_to_string(new.synonyms, ' '), '')), 'A')
    || setweight(to_tsvector('simple', coalesce(array_to_string(new.semantic_tags, ' '), '')), 'B')
    || setweight(to_tsvector('simple', coalesce(new.depicts, '')), 'B')
    || setweight(to_tsvector('simple', coalesce(new.purpose, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(new.use_when, '')), 'C')
    || setweight(to_tsvector('simple', coalesce(new.category, '')), 'D')
    || setweight(to_tsvector('simple', coalesce(new.job_category, '')), 'D')
    || setweight(to_tsvector('simple', coalesce(array_to_string(new.secondary_categories, ' '), '')), 'D');

  new.avoid_document := to_tsvector('simple', coalesce(new.avoid_when, ''));
  new.updated_at := timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists icon_search_public_registry_metadata_documents_tg
  on public.icon_search_public_registry_metadata;

create trigger icon_search_public_registry_metadata_documents_tg
before insert or update on public.icon_search_public_registry_metadata
for each row
execute function public.si_refresh_icon_search_public_registry_metadata_documents();

create index if not exists icon_search_public_registry_metadata_search_idx
  on public.icon_search_public_registry_metadata using gin (search_document);

create index if not exists icon_search_public_registry_metadata_avoid_idx
  on public.icon_search_public_registry_metadata using gin (avoid_document);

create index if not exists icon_search_public_registry_metadata_category_idx
  on public.icon_search_public_registry_metadata (category, job_category);

alter table public.icon_search_public_registry_metadata enable row level security;

revoke all on table public.icon_search_public_registry_metadata from public;

grant select, insert, update, delete on table public.icon_search_public_registry_metadata to service_role;
revoke all on function public.si_refresh_icon_search_public_registry_metadata_documents() from public;
grant execute on function public.si_refresh_icon_search_public_registry_metadata_documents() to service_role;
