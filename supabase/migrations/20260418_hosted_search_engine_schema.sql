create table if not exists public.icon_catalog (
  icon_id text primary key,
  name text not null,
  source_library text not null,
  style text not null,
  icon_type text not null,
  search_text text not null,
  search_document tsvector generated always as (
    to_tsvector('simple', search_text)
  ) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_catalog_icon_id_nonempty check (char_length(trim(icon_id)) > 0),
  constraint icon_catalog_name_nonempty check (char_length(trim(name)) > 0),
  constraint icon_catalog_source_library_nonempty check (char_length(trim(source_library)) > 0),
  constraint icon_catalog_style_nonempty check (char_length(trim(style)) > 0),
  constraint icon_catalog_type_nonempty check (char_length(trim(icon_type)) > 0)
);

create table if not exists public.icon_search_private_manifest (
  icon_id text primary key references public.icon_catalog(icon_id) on delete cascade,
  semantic_aliases text[] not null default '{}'::text[],
  use_cases text[] not null default '{}'::text[],
  contraindications text[] not null default '{}'::text[],
  trust_tier text not null default 't0',
  explanation_short text,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint icon_search_private_manifest_trust_tier_valid check (
    trust_tier in ('t0', 't1', 't2', 't3')
  )
);

create table if not exists public.icon_search_private_features (
  icon_id text primary key references public.icon_catalog(icon_id) on delete cascade,
  popularity_score double precision not null default 0,
  behavioral_score double precision not null default 0,
  editorial_score double precision not null default 0,
  replace_risk_score double precision not null default 0,
  manual_boost double precision not null default 0,
  manual_penalty double precision not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.search_request_audit (
  id bigserial primary key,
  query_norm text not null,
  source text not null,
  library_filter text,
  result_count integer not null default 0,
  status text not null default 'ok',
  latency_ms integer,
  session_hash text,
  ip_hash text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint search_request_audit_result_count_nonnegative check (result_count >= 0),
  constraint search_request_audit_latency_nonnegative check (latency_ms is null or latency_ms >= 0)
);

create index if not exists icon_catalog_search_document_idx
  on public.icon_catalog using gin (search_document);

create index if not exists icon_catalog_source_library_idx
  on public.icon_catalog (source_library, name asc);

create index if not exists search_request_audit_query_created_at_idx
  on public.search_request_audit (query_norm, created_at desc);

create index if not exists search_request_audit_ip_created_at_idx
  on public.search_request_audit (ip_hash, created_at desc)
  where ip_hash is not null;

alter table public.icon_catalog enable row level security;
alter table public.icon_search_private_manifest enable row level security;
alter table public.icon_search_private_features enable row level security;
alter table public.search_request_audit enable row level security;

revoke all on table public.icon_catalog from public;
revoke all on table public.icon_search_private_manifest from public;
revoke all on table public.icon_search_private_features from public;
revoke all on table public.search_request_audit from public;

grant select, insert, update, delete on table public.icon_catalog to service_role;
grant select, insert, update, delete on table public.icon_search_private_manifest to service_role;
grant select, insert, update, delete on table public.icon_search_private_features to service_role;
grant select, insert, update, delete on table public.search_request_audit to service_role;
