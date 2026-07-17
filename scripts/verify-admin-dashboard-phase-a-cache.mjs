import assert from 'node:assert/strict';
import { createBoundedAsyncCache } from '../lib/bounded-async-cache.js';

let clock = 1000;
let loads = 0;
const cache = createBoundedAsyncCache({
  ttlMs: 30_000,
  maxEntries: 2,
  now: () => clock,
});

const first = await cache.getOrCreate('queue:1d', async () => {
  loads += 1;
  return { version: loads };
});
const second = await cache.getOrCreate('queue:1d', async () => {
  loads += 1;
  return { version: loads };
});
assert.equal(first, second);
assert.equal(loads, 1, 'A warm request must reuse the cached payload.');

clock += 30_001;
const expired = await cache.getOrCreate('queue:1d', async () => {
  loads += 1;
  return { version: loads };
});
assert.equal(expired.version, 2);

cache.clear();
const afterClear = await cache.getOrCreate('queue:1d', async () => {
  loads += 1;
  return { version: loads };
});
assert.equal(afterClear.version, 3);

let releaseLoad;
const heldLoad = new Promise((resolve) => {
  releaseLoad = resolve;
});
let coalescedLoads = 0;
const pendingOne = cache.getOrCreate('queue:all', async () => {
  coalescedLoads += 1;
  await heldLoad;
  return { ready: true };
});
const pendingTwo = cache.getOrCreate('queue:all', async () => {
  coalescedLoads += 1;
  return { ready: false };
});
releaseLoad();
const [coalescedOne, coalescedTwo] = await Promise.all([pendingOne, pendingTwo]);
assert.equal(coalescedLoads, 1, 'Concurrent requests for one key must share one loader.');
assert.equal(coalescedOne, coalescedTwo);

let failedLoads = 0;
await assert.rejects(
  cache.getOrCreate('queue:error', async () => {
    failedLoads += 1;
    throw new Error('expected failure');
  }),
  /expected failure/,
);
const recovered = await cache.getOrCreate('queue:error', async () => {
  failedLoads += 1;
  return { recovered: true };
});
assert.equal(recovered.recovered, true);
assert.equal(failedLoads, 2, 'A failed loader must not poison later requests.');

await cache.getOrCreate('queue:a', async () => ({ key: 'a' }));
await cache.getOrCreate('queue:b', async () => ({ key: 'b' }));
await cache.getOrCreate('queue:c', async () => ({ key: 'c' }));
let evictedLoads = 0;
await cache.getOrCreate('queue:a', async () => {
  evictedLoads += 1;
  return { key: 'a-new' };
});
assert.equal(evictedLoads, 1, 'The cache must evict old entries when it reaches its bound.');

console.log(JSON.stringify({
  status: 'ok',
  ttl_ms: 30_000,
  max_entries: 2,
  warm_cache: true,
  concurrent_coalescing: true,
  failed_load_recovery: true,
  bounded_eviction: true,
}, null, 2));
