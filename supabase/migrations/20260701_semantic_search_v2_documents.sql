create table if not exists public.icon_search_semantic_documents (
  document_id text primary key,
  icon_id text not null references public.icon_catalog(icon_id) on delete cascade,
  source_library text not null,
  source_name text not null,
  label text not null,
  document_type text not null,
  locale text not null default 'en',
  content text not null,
  content_hash text not null,
  embedding_model text,
  embedding_version text,
  quality_status text not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_search_semantic_documents_document_id_nonempty check (char_length(trim(document_id)) > 0),
  constraint icon_search_semantic_documents_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_search_semantic_documents_source_library_nonempty check (char_length(trim(source_library)) > 0),
  constraint icon_search_semantic_documents_source_name_nonempty check (char_length(trim(source_name)) > 0),
  constraint icon_search_semantic_documents_label_nonempty check (char_length(trim(label)) > 0),
  constraint icon_search_semantic_documents_content_nonempty check (char_length(trim(content)) > 0),
  constraint icon_search_semantic_documents_content_hash_format check (content_hash ~ '^[a-f0-9]{64}$'),
  constraint icon_search_semantic_documents_document_type_valid check (
    document_type in ('identity', 'meaning', 'visual', 'domain', 'negative')
  ),
  constraint icon_search_semantic_documents_quality_status_valid check (
    quality_status in ('active', 'stale', 'blocked')
  )
);

create index if not exists icon_search_semantic_documents_icon_idx
  on public.icon_search_semantic_documents (icon_id);

create index if not exists icon_search_semantic_documents_type_locale_idx
  on public.icon_search_semantic_documents (document_type, locale);

create index if not exists icon_search_semantic_documents_library_type_idx
  on public.icon_search_semantic_documents (source_library, document_type);

create unique index if not exists icon_search_semantic_documents_hash_idx
  on public.icon_search_semantic_documents (icon_id, document_type, locale, content_hash);

alter table public.icon_search_semantic_documents enable row level security;

revoke all on table public.icon_search_semantic_documents from public;

grant select, insert, update, delete on table public.icon_search_semantic_documents to service_role;

comment on table public.icon_search_semantic_documents is
  'Server-side semantic search documents generated from public-safe icon catalog and registry projections for future hybrid/vector search.';

comment on column public.icon_search_semantic_documents.content_hash is
  'Stable hash used to skip unchanged semantic documents during future embedding refresh jobs.';
