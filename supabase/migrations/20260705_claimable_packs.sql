-- Decouple monthly Pro claim eligibility from v1_launch.
--
-- v1_launch keeps controlling Launch Edition bundle membership and the Pro
-- annual grant. The new claimable flag controls what a Pro subscriber can
-- redeem with the monthly claim, so premium packs like agentic-motion can be
-- claimable without joining the launch bundle.

alter table si_products
  add column if not exists claimable boolean not null default false;

-- Backfill: everything claimable today (launch packs) stays claimable.
update si_products
set claimable = true
where coalesce(v1_launch, false) = true;

-- The Agentic Motion pack joins the monthly claim pool.
update si_products
set claimable = true
where slug = 'agentic-motion';

-- Recreate the claim helpers against the claimable column. Logic is otherwise
-- identical to 20260406_simplified_claim_system.sql; the dynamic
-- column-existence branches are gone because this migration guarantees the
-- column exists.

create or replace function si_resolve_claim_status(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_active_sub boolean := false;
  v_total_claimable integer := 0;
  v_owned_claimable integer := 0;
  v_legacy_credits integer := 0;
  v_last_credit_claim timestamptz := null;
  v_next_available timestamptz := null;
begin
  if p_user_id is null then
    return jsonb_build_object(
      'canClaim', false,
      'nextAvailable', null,
      'reason', 'subscription_required',
      'legacyCredits', 0
    );
  end if;

  select exists (
    select 1
    from si_subscriptions s
    where s.user_id = p_user_id
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
  )
  into v_is_active_sub;

  if not v_is_active_sub then
    return jsonb_build_object(
      'canClaim', false,
      'nextAvailable', null,
      'reason', 'subscription_required',
      'legacyCredits', 0
    );
  end if;

  select count(*)
  into v_total_claimable
  from si_products p
  where p.status = 'active'
    and p.claimable = true;

  if v_total_claimable > 0 then
    select count(*)
    into v_owned_claimable
    from si_products p
    join si_purchases sp
      on sp.product_id = p.id
     and sp.user_id = p_user_id
    where p.status = 'active'
      and p.claimable = true;
  end if;

  if v_total_claimable > 0 and v_owned_claimable >= v_total_claimable then
    return jsonb_build_object(
      'canClaim', false,
      'nextAvailable', null,
      'reason', 'all_owned',
      'legacyCredits', 0
    );
  end if;

  select greatest(
    coalesce(sum(case when c.type in ('earned', 'bonus') then 1 else 0 end), 0) -
    coalesce(sum(case when c.type = 'redeemed' then 1 else 0 end), 0),
    0
  )::integer
  into v_legacy_credits
  from si_credits c
  where c.user_id = p_user_id;

  if v_legacy_credits > 0 then
    return jsonb_build_object(
      'canClaim', true,
      'nextAvailable', null,
      'reason', 'legacy_credit',
      'legacyCredits', v_legacy_credits
    );
  end if;

  select max(p.purchased_at)
  into v_last_credit_claim
  from si_purchases p
  where p.user_id = p_user_id
    and p.source = 'credit';

  if v_last_credit_claim is not null
     and v_last_credit_claim > now() - interval '30 days' then
    v_next_available := v_last_credit_claim + interval '30 days';
    return jsonb_build_object(
      'canClaim', false,
      'nextAvailable', v_next_available,
      'reason', 'cooldown_wait',
      'legacyCredits', 0
    );
  end if;

  return jsonb_build_object(
    'canClaim', true,
    'nextAvailable', null,
    'reason', 'cooldown_ready',
    'legacyCredits', 0
  );
end;
$$;

create or replace function si_claim_pack(p_user_id uuid, p_product_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status jsonb;
  v_product record;
  v_legacy_credits integer := 0;
  v_inserted_purchase_id uuid;
begin
  if p_user_id is null or p_product_id is null then
    return json_build_object(
      'success', false,
      'reason', 'invalid_request'
    );
  end if;

  -- Prevent double-claim races for the same user.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  v_status := si_resolve_claim_status(p_user_id);
  if not coalesce((v_status ->> 'canClaim')::boolean, false) then
    return json_build_object(
      'success', false,
      'canClaim', false,
      'reason', coalesce(v_status ->> 'reason', 'subscription_required'),
      'nextAvailable', v_status -> 'nextAvailable'
    );
  end if;

  select p.id, p.name, p.status, p.claimable
  into v_product
  from si_products p
  where p.id = p_product_id;

  if not found then
    return json_build_object(
      'success', false,
      'reason', 'product_not_found'
    );
  end if;

  if v_product.status <> 'active' then
    return json_build_object(
      'success', false,
      'reason', 'product_not_active'
    );
  end if;

  if not coalesce(v_product.claimable, false) then
    return json_build_object(
      'success', false,
      'reason', 'product_not_claimable'
    );
  end if;

  if exists (
    select 1
    from si_purchases p
    where p.user_id = p_user_id
      and p.product_id = p_product_id
  ) then
    return json_build_object(
      'success', false,
      'reason', 'already_owned'
    );
  end if;

  v_legacy_credits := coalesce((v_status ->> 'legacyCredits')::integer, 0);
  if v_legacy_credits > 0 then
    insert into si_credits (user_id, type, product_id, note)
    values (
      p_user_id,
      'redeemed',
      p_product_id,
      format('Redeemed legacy credit: %s', coalesce(v_product.name, 'Unknown collection'))
    );
  end if;

  insert into si_purchases (user_id, product_id, stripe_session_id, source, purchased_at)
  values (p_user_id, p_product_id, 'credit_redeem', 'credit', now())
  on conflict (user_id, product_id) do nothing
  returning id into v_inserted_purchase_id;

  if v_inserted_purchase_id is null then
    return json_build_object(
      'success', false,
      'reason', 'already_owned'
    );
  end if;

  return json_build_object(
    'success', true,
    'reason', 'claimed',
    'usedLegacyCredit', (v_legacy_credits > 0)
  );
end;
$$;

revoke all on function si_resolve_claim_status(uuid) from public;
revoke all on function si_claim_pack(uuid, uuid) from public;

grant execute on function si_resolve_claim_status(uuid) to service_role;
grant execute on function si_claim_pack(uuid, uuid) to service_role;
