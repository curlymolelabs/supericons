-- Admin dashboard icon-request review state.
--
-- Rollback:
-- drop table if exists public.admin_icon_request_reviews;
--
-- The source request remains in icon_evidence. This table only stores the
-- operator's current review state, so rollback does not delete user requests.

begin;

-- table-access: private public.admin_icon_request_reviews
create table if not exists public.admin_icon_request_reviews (
  icon_evidence_id uuid primary key references public.icon_evidence(id) on delete cascade,
  status text not null default 'new',
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint admin_icon_request_reviews_status_valid check (
    status in ('new', 'planned', 'added', 'declined')
  )
);

create index if not exists admin_icon_request_reviews_status_updated_at_idx
  on public.admin_icon_request_reviews (status, updated_at desc);

alter table public.admin_icon_request_reviews enable row level security;

revoke all on table public.admin_icon_request_reviews from public;
revoke all on table public.admin_icon_request_reviews from anon, authenticated;
grant select, insert, update, delete on table public.admin_icon_request_reviews to service_role;

comment on table public.admin_icon_request_reviews is
  'Stores the current admin review state for requests captured in icon_evidence.';

commit;
