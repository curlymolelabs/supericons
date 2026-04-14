-- Supericons billing notifications log
-- Prevent duplicate billing lifecycle emails on Stripe webhook retries

create table if not exists si_billing_notifications (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id  text not null,
  stripe_event_id         text not null unique,
  event_kind              text not null,
  event_context           jsonb not null default '{}'::jsonb,
  sent_at                 timestamptz not null default now()
);

alter table si_billing_notifications enable row level security;

create policy "users_read_own_billing_notifications"
  on si_billing_notifications
  for select
  using (auth.uid() = user_id);

create index if not exists si_billing_notifications_user_idx
  on si_billing_notifications (user_id);

create index if not exists si_billing_notifications_subscription_idx
  on si_billing_notifications (stripe_subscription_id);
