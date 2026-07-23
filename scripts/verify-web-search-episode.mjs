import assert from 'node:assert/strict';
import {
  SEARCH_EPISODE_IDLE_MS,
  SEARCH_INPUT_DEBOUNCE_MS,
  WEB_SEARCH_OBSERVATION_DEADLINE_MS,
  createWebSearchEpisodeCoordinator,
} from '../lib/web-search-episode.js';

function createHarness() {
  const writes = [];
  const countable = [];
  const timers = new Map();
  let timerId = 0;
  let episodeId = 0;
  const coordinator = createWebSearchEpisodeCoordinator({
    writeTelemetry: (payload) => writes.push(payload),
    onCountable: (query, trigger) => countable.push({ query, trigger }),
    createId: () => `00000000-0000-4000-8000-${String(++episodeId).padStart(12, '0')}`,
    setTimer: (callback, delay) => {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    sourceVersion: 'test-build',
  });

  function fireByDelay(delay) {
    const matching = [...timers.entries()].filter(([, timer]) => timer.delay === delay);
    for (const [id, timer] of matching) {
      timers.delete(id);
      timer.callback();
    }
  }

  return { coordinator, writes, countable, timers, fireByDelay };
}

assert.equal(SEARCH_INPUT_DEBOUNCE_MS, 150);
assert.equal(SEARCH_EPISODE_IDLE_MS, 2500);
assert.equal(WEB_SEARCH_OBSERVATION_DEADLINE_MS, 20000);

{
  const harness = createHarness();
  const episodeId = harness.coordinator.startEpisode({ query: 'camera' });
  harness.coordinator.updateLocal({ episodeId, localMatchCount: 12, finalMatchCount: 12 });
  harness.coordinator.markHostedPending({ episodeId });
  harness.fireByDelay(SEARCH_EPISODE_IDLE_MS);
  assert.equal(harness.writes.length, 0, 'Pending hosted work must not create a final event.');
  harness.coordinator.settleHosted({
    episodeId,
    hostedState: 'success',
    hostedMatchCount: 8,
    finalMatchCount: 12,
    searchExecution: 'hosted_fused',
  });
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.writes[0].action, 'final');
  assert.equal(harness.writes[0].final_outcome, 'success');
  assert.equal(harness.writes[0].final_match_count, 12);
  assert.equal(harness.countable[0].trigger, 'idle');
}

{
  const harness = createHarness();
  const episodeId = harness.coordinator.startEpisode({ query: 'nothing matches' });
  harness.coordinator.updateLocal({ episodeId, localMatchCount: 0 });
  harness.coordinator.markHostedPending({ episodeId });
  harness.coordinator.markCountable({ episodeId, trigger: 'enter' });
  harness.coordinator.settleHosted({
    episodeId,
    hostedState: 'zero',
    hostedMatchCount: 0,
    finalMatchCount: 0,
  });
  assert.equal(harness.writes[0].final_outcome, 'zero');
  assert.equal(harness.writes[0].settlement_state, 'completed');
}

{
  const harness = createHarness();
  const episodeId = harness.coordinator.startEpisode({ query: 'local survives' });
  harness.coordinator.updateLocal({ episodeId, localMatchCount: 4, finalMatchCount: 4 });
  harness.coordinator.markHostedPending({ episodeId });
  harness.coordinator.markCountable({ episodeId, trigger: 'blur' });
  harness.coordinator.settleHosted({
    episodeId,
    hostedState: 'error',
    hostedMatchCount: 0,
    finalMatchCount: 4,
    errorCode: 'hosted_unavailable',
  });
  assert.equal(harness.writes[0].final_outcome, 'success');
  assert.equal(harness.writes[0].settlement_state, 'failed');
}

{
  const harness = createHarness();
  const episodeId = harness.coordinator.startEpisode({ query: 'total failure' });
  harness.coordinator.updateLocal({ episodeId, localMatchCount: 0 });
  harness.coordinator.markHostedPending({ episodeId });
  harness.coordinator.markCountable({ episodeId, trigger: 'enter' });
  harness.coordinator.settleHosted({
    episodeId,
    hostedState: 'error',
    finalMatchCount: 0,
    errorCode: 'hosted_unavailable',
  });
  assert.equal(harness.writes[0].final_outcome, 'error');
  assert.equal(harness.writes[0].settlement_state, 'failed');
}

{
  const harness = createHarness();
  const firstId = harness.coordinator.startEpisode({ query: 'first query' });
  harness.coordinator.updateLocal({ episodeId: firstId, localMatchCount: 0 });
  harness.coordinator.markHostedPending({ episodeId: firstId });
  const secondId = harness.coordinator.startEpisode({ query: 'second query' });
  assert.notEqual(firstId, secondId);
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.writes[0].action, 'diagnostic');
  assert.equal(harness.writes[0].diagnostic_type, 'superseded');
  assert.equal(
    harness.coordinator.settleHosted({
      episodeId: firstId,
      hostedState: 'success',
      finalMatchCount: 3,
    }),
    false,
    'A late response must not settle a newer episode.',
  );
  assert.equal(harness.writes.length, 1);
}

{
  const harness = createHarness();
  const episodeId = harness.coordinator.startEpisode({ query: 'slow hosted query' });
  harness.coordinator.updateLocal({ episodeId, localMatchCount: 7, finalMatchCount: 7 });
  harness.coordinator.markHostedPending({ episodeId });
  harness.coordinator.markCountable({ episodeId, trigger: 'enter' });
  harness.fireByDelay(WEB_SEARCH_OBSERVATION_DEADLINE_MS);
  assert.equal(harness.writes.length, 1);
  assert.equal(harness.writes[0].diagnostic_type, 'incomplete');
  harness.coordinator.settleHosted({
    episodeId,
    hostedState: 'success',
    hostedMatchCount: 5,
    finalMatchCount: 7,
  });
  assert.equal(harness.writes.length, 2);
  assert.equal(harness.writes[1].action, 'final');
  assert.equal(harness.writes[1].final_outcome, 'success');
}

{
  const harness = createHarness();
  const firstId = harness.coordinator.startEpisode({ query: 'repeat me' });
  harness.coordinator.markHostedPending({ episodeId: firstId });
  harness.coordinator.markCountable({ episodeId: firstId, trigger: 'enter' });
  harness.coordinator.settleHosted({
    episodeId: firstId,
    hostedState: 'zero',
    finalMatchCount: 0,
  });
  const secondId = harness.coordinator.startEpisode({ query: 'repeat me' });
  assert.notEqual(firstId, secondId, 'Repeated intentional searches need distinct episode IDs.');
}

console.log(JSON.stringify({
  status: 'ok',
  timing_constants_unchanged: true,
  local_and_hosted_settlement_cases: 4,
  superseded_excluded: true,
  late_response_excluded: true,
  incomplete_not_zero: true,
  late_completion_finalized: true,
  repeated_queries_distinct: true,
}, null, 2));
