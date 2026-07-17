/**
 * @param {{
 *   ttlMs: number,
 *   maxEntries: number,
 *   now?: () => number,
 * }} options
 */
export function createBoundedAsyncCache({
  ttlMs,
  maxEntries,
  now = () => Date.now(),
}) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
    throw new Error('ttlMs must be a positive number');
  }
  if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
    throw new Error('maxEntries must be a positive integer');
  }

  const entries = new Map();
  const pending = new Map();

  function pruneExpired(timestamp) {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= timestamp) entries.delete(key);
    }
  }

  function trimOldest() {
    while (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      entries.delete(oldestKey);
    }
  }

  async function getOrCreate(key, loader) {
    const timestamp = now();
    const cached = entries.get(key);
    if (cached && cached.expiresAt > timestamp) {
      entries.delete(key);
      entries.set(key, cached);
      return cached.value;
    }
    if (cached) entries.delete(key);

    const active = pending.get(key);
    if (active) return await active;

    const request = Promise.resolve()
      .then(loader)
      .then((value) => {
        pruneExpired(now());
        entries.set(key, {
          value,
          expiresAt: now() + ttlMs,
        });
        trimOldest();
        return value;
      })
      .finally(() => {
        pending.delete(key);
      });

    pending.set(key, request);
    return await request;
  }

  function clear() {
    entries.clear();
  }

  return {
    clear,
    getOrCreate,
  };
}
