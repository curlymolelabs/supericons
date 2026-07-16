import assert from 'node:assert/strict';
import { runBoundedRollupRefresh } from './admin-dashboard-rollup-refresh-gate.mjs';

function dayAt(offset) {
  return new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10);
}

async function runFixture(days, maxRefreshDays = days.length) {
  let cursor = 0;
  const refreshes = [];
  const result = await runBoundedRollupRefresh({
    maxRefreshDays,
    deadlineEpochMs: Date.now() + 60_000,
    refreshes,
    requestRefresh: async () => {
      if (cursor >= days.length) {
        return { payload: { available: true, complete: true, refreshed_days: [] }, latency_ms: 1 };
      }
      const day = days[cursor];
      cursor += 1;
      return { payload: { available: true, complete: false, refreshed_days: [day] }, latency_ms: 1 };
    },
  });
  return { result, refreshes };
}

for (const count of [0, 1, 60, 120]) {
  const days = Array.from({ length: count }, (_, index) => dayAt(index));
  const { result, refreshes } = await runFixture(days);
  assert.equal(result.complete, true);
  assert.equal(result.refreshed_days.length, count);
  assert.equal(result.calls, count + 1);
  assert.equal(refreshes.length, count + 1);
}

{
  const refreshes = [];
  await assert.rejects(
    runBoundedRollupRefresh({
      maxRefreshDays: 1,
      deadlineEpochMs: Date.now() + 60_000,
      refreshes,
      requestRefresh: async () => ({
        payload: { available: true, complete: false, refreshed_days: ['2026-01-01'] },
        latency_ms: 1,
      }),
    }),
    /repeated day|exceeded the measured backlog/,
  );
  assert.ok(refreshes.length > 0, 'Failure must retain refresh evidence.');
}

{
  const refreshes = [];
  await assert.rejects(
    runBoundedRollupRefresh({
      maxRefreshDays: 0,
      deadlineEpochMs: Date.now() - 1,
      refreshes,
      requestRefresh: async () => ({
        payload: { available: true, complete: true, refreshed_days: [] },
        latency_ms: 1,
      }),
    }),
    /elapsed-time budget/,
  );
}

console.log(JSON.stringify({
  status: 'ok',
  cases: ['zero_days', 'one_day', 'sixty_days_plus_confirmation', 'one_hundred_twenty_days_plus_confirmation', 'duplicate_day', 'deadline'],
}));
