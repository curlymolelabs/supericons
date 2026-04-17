-- Supericons P0.02 Phase 4C: lightweight query review workflow
-- Stores a single review decision per normalized query context so the
-- admin intelligence panel can track whether a query is resolved,
-- needs an alias, needs a better icon, or should be ignored.

create table if not exists public.icon_query_reviews (
  id uuid primary key default gen_random_uuid(),
  normalized_query text not null,
  library_filter text not null default 'all',
  job_category text not null default '',
  status text not null,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_query_reviews_normalized_query_nonempty check (char_length(trim(normalized_query)) > 0),
  constraint icon_query_reviews_library_filter_nonempty check (char_length(trim(library_filter)) > 0),
  constraint icon_query_reviews_status_valid check (
    status in ('resolved', 'needs_alias', 'needs_icon', 'ignore')
  )
);

create unique index if not exists icon_query_reviews_query_context_idx
  on public.icon_query_reviews (normalized_query, library_filter, job_category);

create index if not exists icon_query_reviews_status_updated_at_idx
  on public.icon_query_reviews (status, updated_at desc);

alter table public.icon_query_reviews enable row level security;

revoke all on table public.icon_query_reviews from public;

grant select, insert, update, delete on table public.icon_query_reviews to service_role;

comment on table public.icon_query_reviews is
  'Stores the current admin review decision for a normalized search query context.';
