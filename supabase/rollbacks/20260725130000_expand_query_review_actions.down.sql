begin;

do $$
begin
  if exists (
    select 1
    from public.icon_query_reviews
    where status in ('add_icon', 'add_alias', 'improve_ranking', 'improve_docs', 'watch')
  ) then
    raise exception 'Cannot restore the old review action constraint while new Demand Inbox actions are stored.';
  end if;
end
$$;

alter table public.icon_query_reviews
  drop constraint if exists icon_query_reviews_status_valid;

alter table public.icon_query_reviews
  add constraint icon_query_reviews_status_valid check (
    status in ('resolved', 'needs_alias', 'needs_icon', 'ignore')
  );

comment on table public.icon_query_reviews is
  'Stores the current admin review decision for a normalized search query context.';

commit;
