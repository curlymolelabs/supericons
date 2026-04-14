const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const TARGET_SUBSCRIPTION_ID = process.env.STRIPE_SUBSCRIPTION_ID || '';
const DRY_RUN = process.env.DRY_RUN === '1';

for (const [name, value] of [
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
  ['STRIPE_SECRET_KEY', STRIPE_SECRET_KEY],
]) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

function toIsoFromUnixSeconds(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriodEndIso(subscription) {
  const itemPeriodEnds = Array.isArray(subscription?.items?.data)
    ? subscription.items.data
      .map((item) => item?.current_period_end)
      .filter((value) => typeof value === 'number' && Number.isFinite(value))
    : [];

  const subscriptionPeriodEnd = typeof subscription?.current_period_end === 'number'
    && Number.isFinite(subscription.current_period_end)
    ? subscription.current_period_end
    : null;

  const periodEnd = itemPeriodEnds.length > 0
    ? Math.min(...itemPeriodEnds)
    : subscriptionPeriodEnd;

  return toIsoFromUnixSeconds(periodEnd);
}

async function fetchSupabase(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: method === 'PATCH' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase ${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function fetchStripeSubscription(subscriptionId) {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Stripe subscription fetch failed (${response.status}) for ${subscriptionId}: ${text}`);
  }

  return response.json();
}

async function loadTargetRows() {
  const params = new URLSearchParams();
  params.set('select', 'user_id,stripe_subscription_id,status,current_period_end,plan');
  params.set('order', 'user_id.asc');
  params.set('current_period_end', 'is.null');

  if (TARGET_SUBSCRIPTION_ID) {
    params.set('stripe_subscription_id', `eq.${TARGET_SUBSCRIPTION_ID}`);
  } else {
    params.set('stripe_subscription_id', 'not.is.null');
    params.set('status', 'in.(active,trialing)');
  }

  return fetchSupabase(`si_subscriptions?${params.toString()}`);
}

async function updateCurrentPeriodEnd(subscriptionId, currentPeriodEnd) {
  const params = new URLSearchParams();
  params.set('stripe_subscription_id', `eq.${subscriptionId}`);
  await fetchSupabase(`si_subscriptions?${params.toString()}`, {
    method: 'PATCH',
    body: { current_period_end: currentPeriodEnd },
  });
}

const rows = await loadTargetRows();
if (!Array.isArray(rows) || rows.length === 0) {
  console.log('No subscription rows require current_period_end backfill.');
  process.exit(0);
}

console.log(`Found ${rows.length} subscription row(s) with null current_period_end.`);

let updatedCount = 0;
let skippedCount = 0;

for (const row of rows) {
  const subscriptionId = row?.stripe_subscription_id;
  if (!subscriptionId) {
    skippedCount += 1;
    console.warn(`Skipping row with missing stripe_subscription_id for user ${row?.user_id || '<unknown>'}.`);
    continue;
  }

  try {
    const subscription = await fetchStripeSubscription(subscriptionId);
    const currentPeriodEnd = getSubscriptionPeriodEndIso(subscription);

    if (!currentPeriodEnd) {
      skippedCount += 1;
      console.warn(`No current_period_end found in Stripe payload for ${subscriptionId}.`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`[dry-run] Would update ${subscriptionId} -> ${currentPeriodEnd}`);
      updatedCount += 1;
      continue;
    }

    await updateCurrentPeriodEnd(subscriptionId, currentPeriodEnd);
    updatedCount += 1;
    console.log(`Updated ${subscriptionId} -> ${currentPeriodEnd}`);
  } catch (error) {
    skippedCount += 1;
    console.error(`Failed to backfill ${subscriptionId}:`, error instanceof Error ? error.message : String(error));
  }
}

console.log(`Backfill complete. Updated: ${updatedCount}. Skipped: ${skippedCount}. Dry run: ${DRY_RUN}.`);
