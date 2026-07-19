// Behavioral verification of the dormant tiered daily allowance.
//
// Trigger: npm run verify:search-v2-daily-allowance
// (deno run --allow-env scripts/verify-search-v2-daily-allowance.ts)
// Side effects: none; uses an in-memory fake admin client, no network.
//
// Covers: enforcement off by default, tier resolution, request cost for
// recommendation fanout, 429 shape with details, fail-open on lookup error,
// and no-env-permission behavior is covered separately by the shared
// recommendation pipeline test which runs without --allow-env.

import assert from 'node:assert/strict';
import {
  enforceDailyAllowance,
  HOSTED_ALLOWANCE_POLICY,
  isTierEnforcementEnabled,
  resolveAllowanceTier,
  SearchEngineHttpError,
  secondsUntilUtcMidnight,
} from '../supabase/functions/_shared/search-engine/rate-limit.ts';

function fakeAdminClient({ count, error = null }: { count: number | null; error?: unknown }) {
  return {
    from: (_table: string) => ({
      select: (_columns: string, _options: { count: 'exact'; head: true }) => ({
        eq: (_column: string, _value: string) => ({
          gte: (_c: string, _v: string) => Promise.resolve({ count, error }),
        }),
      }),
    }),
  };
}

const IP = 'a'.repeat(64);

// 1. Policy constants match the ratified thresholds.
assert.deepEqual(HOSTED_ALLOWANCE_POLICY.dailyByTier, {
  anonymous: 300,
  registered_free: 1500,
  paid: 5000,
});
assert.equal(HOSTED_ALLOWANCE_POLICY.burstPerMinute, 120);

// 2. Tier resolution: Pro wins, registration next, anonymous default.
assert.equal(resolveAllowanceTier({ isPro: true, isRegistered: true }), 'paid');
assert.equal(resolveAllowanceTier({ isPro: false, isRegistered: true }), 'registered_free');
assert.equal(resolveAllowanceTier({}), 'anonymous');
assert.equal(resolveAllowanceTier(null), 'anonymous');

// 3. Enforcement is off by default: even a saturated count must not throw.
Deno.env.delete('SEARCH_ENGINE_TIER_ENFORCEMENT');
assert.equal(isTierEnforcementEnabled(), false);
await enforceDailyAllowance(fakeAdminClient({ count: 10_000 }), { ipHash: IP, tier: 'anonymous' });

// 4. With enforcement on: under the limit passes, at the limit throws 429.
Deno.env.set('SEARCH_ENGINE_TIER_ENFORCEMENT', 'on');
assert.equal(isTierEnforcementEnabled(), true);
await enforceDailyAllowance(fakeAdminClient({ count: 298 }), { ipHash: IP, tier: 'anonymous' });
await assert.rejects(
  () => enforceDailyAllowance(fakeAdminClient({ count: 300 }), { ipHash: IP, tier: 'anonymous' }),
  (error: unknown) => {
    assert.ok(error instanceof SearchEngineHttpError);
    assert.equal(error.status, 429);
    assert.equal(error.code, 'search_daily_allowance_reached');
    assert.equal(error.details.limit_scope, 'daily_allowance');
    assert.equal(error.details.tier, 'anonymous');
    assert.equal(error.details.daily_limit, 300);
    assert.ok(typeof error.details.resets_at_utc === 'string');
    assert.ok(Number(error.details.retry_after_seconds) > 0);
    return true;
  },
);

// 5. Request cost models recommendation fanout: 296 used + cost 4 passes,
// 297 used + cost 4 exceeds 300.
await enforceDailyAllowance(fakeAdminClient({ count: 296 }), { ipHash: IP, tier: 'anonymous', requestCost: 4 });
await assert.rejects(
  () => enforceDailyAllowance(fakeAdminClient({ count: 297 }), { ipHash: IP, tier: 'anonymous', requestCost: 4 }),
  (error: unknown) => error instanceof SearchEngineHttpError && error.status === 429,
);

// 6. Higher tiers get their own limits.
await enforceDailyAllowance(fakeAdminClient({ count: 1400 }), { ipHash: IP, tier: 'registered_free' });
await assert.rejects(
  () => enforceDailyAllowance(fakeAdminClient({ count: 1500 }), { ipHash: IP, tier: 'registered_free' }),
  (error: unknown) => error instanceof SearchEngineHttpError,
);
await enforceDailyAllowance(fakeAdminClient({ count: 4999 }), { ipHash: IP, tier: 'paid' });

// 7. Fail open: a lookup error must never block search.
await enforceDailyAllowance(fakeAdminClient({ count: null, error: new Error('db down') }), {
  ipHash: IP,
  tier: 'anonymous',
});

// 8. Missing identity is never metered.
await enforceDailyAllowance(fakeAdminClient({ count: 10_000 }), { ipHash: null, tier: 'anonymous' });

// 9. Reset math points at the next UTC midnight.
assert.equal(secondsUntilUtcMidnight(new Date('2026-07-19T23:59:00Z')), 60);
assert.equal(secondsUntilUtcMidnight(new Date('2026-07-19T00:00:00Z')), 86_400);

Deno.env.delete('SEARCH_ENGINE_TIER_ENFORCEMENT');
console.log('verify-search-v2-daily-allowance: ok');
