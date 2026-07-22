import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createRailwayRecommendationSearch,
  createRailwaySearchRoute,
} from '../mcp/railway-local-search.js';

const hostedResult = [{ id: 'hard-hat', library: 'lucide' }];
let hostedCalls = 0;
let localCalls = 0;

const hostedPrimary = createRailwaySearchRoute({
  hostedSearchOne: async () => {
    hostedCalls += 1;
    return hostedResult;
  },
  localSearchOne: async () => {
    localCalls += 1;
    return [{ id: 'wrong-local-result' }];
  },
});

assert.deepEqual(
  await hostedPrimary.searchOne({ query: 'hard hat construction worker' }),
  hostedResult,
  'Search must return the established hosted result.',
);
assert.equal(hostedCalls, 1);
assert.equal(localCalls, 0, 'A nonempty hosted result must not run the local fallback.');
assert.deepEqual(hostedPrimary.getRuntime(), {
  mode: 'hosted',
  fallback_used: false,
  hosted_search_calls: 1,
  local_failure_code: null,
});

const localResult = [{ id: 'sparkles', library: 'tabler' }];
const emptyHostedFallback = createRailwaySearchRoute({
  hostedSearchOne: async () => [],
  localSearchOne: async () => localResult,
});
assert.deepEqual(
  await emptyHostedFallback.searchOne({ query: 'amazing' }),
  localResult,
  'A genuine hosted zero must try the reviewed local semantic coverage.',
);
assert.deepEqual(emptyHostedFallback.getRuntime(), {
  mode: 'local_fallback',
  fallback_used: true,
  hosted_search_calls: 1,
  local_failure_code: null,
});

let localCalledAfterHostedError = false;
const hostedFailure = new Error('rate limited');
hostedFailure.code = 'hosted_rate_limited';
hostedFailure.status = 429;
const failingHostedRoute = createRailwaySearchRoute({
  hostedSearchOne: async () => { throw hostedFailure; },
  localSearchOne: async () => {
    localCalledAfterHostedError = true;
    return localResult;
  },
});
await assert.rejects(
  failingHostedRoute.searchOne({ query: 'sports' }),
  (error) => error === hostedFailure,
  'Hosted errors must remain visible instead of being mislabeled as search results.',
);
assert.equal(localCalledAfterHostedError, false);

const localFailureAfterHostedZero = new Error('local fallback failed');
localFailureAfterHostedZero.code = 'local_fallback_failed';
const resilientHonestZero = createRailwaySearchRoute({
  hostedSearchOne: async () => [],
  localSearchOne: async () => { throw localFailureAfterHostedZero; },
});
assert.deepEqual(
  await resilientHonestZero.searchOne({ query: 'florblequux' }),
  [],
  'A local fallback failure after a valid hosted zero must remain an honest zero.',
);
assert.deepEqual(resilientHonestZero.getRuntime(), {
  mode: 'hosted',
  fallback_used: false,
  hosted_search_calls: 1,
  local_failure_code: 'local_fallback_failed',
});

let recommendationFallbackCalls = 0;
const recommendationRoute = createRailwayRecommendationSearch({
  localSearchOne: async () => [],
  hostedSearchOne: async () => {
    recommendationFallbackCalls += 1;
    return hostedResult;
  },
});
assert.deepEqual(
  await recommendationRoute.searchOne({ query: 'unsupported recommendation slot' }),
  [],
  'Recommendation routing must keep its existing honest local zero behavior.',
);
assert.equal(recommendationFallbackCalls, 0);

const remoteSource = readFileSync('mcp/remote-server.js', 'utf8');
assert.match(remoteSource, /createRailwaySearchRoute/);
assert.equal(
  [...remoteSource.matchAll(/createRailwaySearchRoute\s*\(/g)].length,
  2,
  'Only search_icons and the public search endpoint should use hosted-primary routing.',
);
assert.equal(
  [...remoteSource.matchAll(/createRailwayRecommendationSearch\s*\(/g)].length,
  1,
  'Only recommend_icons should retain local-first recommendation routing.',
);

console.log(JSON.stringify({
  status: 'ok',
  hosted_primary: 'passed',
  local_zero_fallback: 'passed',
  error_truthfulness: 'passed',
  recommendation_scope: 'passed',
}, null, 2));
