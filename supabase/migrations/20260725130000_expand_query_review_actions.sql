begin;

alter table public.icon_query_reviews
  drop constraint if exists icon_query_reviews_status_valid;

alter table public.icon_query_reviews
  add constraint icon_query_reviews_status_valid check (
    status in (
      'resolved',
      'needs_alias',
      'needs_icon',
      'ignore',
      'add_icon',
      'add_alias',
      'improve_ranking',
      'improve_docs',
      'watch'
    )
  );

comment on table public.icon_query_reviews is
  'Stores the human-selected Demand Inbox action for a normalized search query context.';

commit;
