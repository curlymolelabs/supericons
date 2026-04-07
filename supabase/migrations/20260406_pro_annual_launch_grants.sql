-- Grant current launch packs to active Pro Annual subscribers.
-- This backfills existing annual subscribers and is safe to run repeatedly.

insert into si_purchases (user_id, product_id, stripe_session_id, source, purchased_at)
select
  s.user_id,
  p.id,
  s.stripe_subscription_id,
  'pro_annual_grant',
  now()
from si_subscriptions s
join si_products p
  on p.status = 'active'
 and coalesce(p.v1_launch, false) = true
where s.plan = 'pro_annual'
  and s.status = 'active'
  and (s.current_period_end is null or s.current_period_end > now())
on conflict (user_id, product_id) do update
set source = case
    when si_purchases.source in ('launch_edition', 'bundle') then si_purchases.source
    else excluded.source
  end,
  stripe_session_id = coalesce(si_purchases.stripe_session_id, excluded.stripe_session_id);
