-- Supericons Pro: si_subscriptions table
-- Run this in Supabase SQL Editor

create table if not exists si_subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid unique not null references auth.users(id),
  stripe_subscription_id  text unique,
  stripe_customer_id      text,
  status                  text not null default 'active',
  current_period_end      timestamptz,
  plan                    text default 'pro'
);

alter table si_subscriptions enable row level security;
create policy "users_read_own_subscription" on si_subscriptions for select using (auth.uid() = user_id);

create index if not exists si_subscriptions_user_idx on si_subscriptions (user_id);
create index if not exists si_subscriptions_stripe_sub_idx on si_subscriptions (stripe_subscription_id);
