import assert from 'node:assert/strict';

const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function runBoundedRollupRefresh({
  maxRefreshDays,
  deadlineEpochMs,
  requestRefresh,
  refreshes,
  now = () => Date.now(),
}) {
  assert.ok(Number.isInteger(maxRefreshDays) && maxRefreshDays >= 0,
    'Maximum refresh days must be a non-negative integer.');
  assert.ok(Array.isArray(refreshes), 'Refresh evidence must be an array.');
  assert.equal(typeof requestRefresh, 'function', 'A refresh request function is required.');

  const refreshedDays = new Set();
  const maxCalls = maxRefreshDays + 1;

  for (let attempt = 1; attempt <= maxCalls; attempt += 1) {
    assert.ok(now() < deadlineEpochMs, 'Rollup refresh exceeded its elapsed-time budget.');
    const refresh = await requestRefresh();
    assert.equal(refresh.payload.available, true, 'Phase A rollup tables are unavailable.');
    assert.ok(Array.isArray(refresh.payload.refreshed_days),
      'Rollup refresh response must include refreshed_days.');

    const complete = refresh.payload.complete === true;
    const days = refresh.payload.refreshed_days.map(String);
    refreshes.push({
      attempt,
      latency_ms: refresh.latency_ms,
      complete,
      refreshed_days: days,
    });

    if (complete) {
      assert.equal(days.length, 0, 'A completion response must not claim another refreshed day.');
      assert.equal(refreshedDays.size, maxRefreshDays,
        `Expected ${maxRefreshDays} refreshed days, received ${refreshedDays.size}.`);
      return {
        complete: true,
        refreshed_days: [...refreshedDays],
        calls: attempt,
      };
    }

    assert.equal(days.length, 1, 'Each incomplete refresh response must process exactly one day.');
    assert.match(days[0], UTC_DAY_PATTERN, 'Refreshed day must use YYYY-MM-DD.');
    assert.equal(refreshedDays.has(days[0]), false, `Rollup refresh repeated day ${days[0]}.`);
    refreshedDays.add(days[0]);
    assert.ok(refreshedDays.size <= maxRefreshDays,
      `Rollup refresh exceeded the measured backlog of ${maxRefreshDays} days.`);
  }

  throw new assert.AssertionError({
    message: `Rollup refresh did not finish within ${maxCalls} bounded calls.`,
    actual: false,
    expected: true,
    operator: 'strictEqual',
  });
}
