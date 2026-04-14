-- Supericons admin cleanup: ensure user-owned rows cascade on auth.users deletion

alter table si_purchases
  drop constraint if exists si_purchases_user_id_fkey,
  add constraint si_purchases_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table si_subscriptions
  drop constraint if exists si_subscriptions_user_id_fkey,
  add constraint si_subscriptions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'si_api_keys'
      and column_name = 'user_id'
  ) then
    execute '
      alter table public.si_api_keys
        drop constraint if exists si_api_keys_user_id_fkey,
        add constraint si_api_keys_user_id_fkey
          foreign key (user_id) references auth.users(id) on delete cascade
    ';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'si_credits'
      and column_name = 'user_id'
  ) then
    execute '
      alter table public.si_credits
        drop constraint if exists si_credits_user_id_fkey,
        add constraint si_credits_user_id_fkey
          foreign key (user_id) references auth.users(id) on delete cascade
    ';
  end if;
end
$$;
