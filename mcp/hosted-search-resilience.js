const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_MAX_QUEUED = 8;
const DEFAULT_QUEUE_TIMEOUT_MS = 5000;
const DEFAULT_FAILURE_THRESHOLD = 2;
const DEFAULT_OPEN_DURATION_MS = 30_000;

function buildGuardError(code, message, retryAfterSeconds = null) {
  const error = new Error(message);
  error.code = code;
  error.status = 503;
  error.retryable = true;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    error.retry_after_seconds = retryAfterSeconds;
  }
  return error;
}

export function createHostedSearchResilience({
  maxConcurrent = DEFAULT_MAX_CONCURRENT,
  maxQueued = DEFAULT_MAX_QUEUED,
  queueTimeoutMs = DEFAULT_QUEUE_TIMEOUT_MS,
  failureThreshold = DEFAULT_FAILURE_THRESHOLD,
  openDurationMs = DEFAULT_OPEN_DURATION_MS,
  now = () => Date.now(),
} = {}) {
  const concurrencyLimit = Math.max(1, Math.min(16, Number(maxConcurrent) || DEFAULT_MAX_CONCURRENT));
  const queueLimit = Math.max(0, Math.min(128, Number(maxQueued) || DEFAULT_MAX_QUEUED));
  const waitLimitMs = Math.max(1, Number(queueTimeoutMs) || DEFAULT_QUEUE_TIMEOUT_MS);
  const failureLimit = Math.max(1, Number(failureThreshold) || DEFAULT_FAILURE_THRESHOLD);
  const resetDelayMs = Math.max(1, Number(openDurationMs) || DEFAULT_OPEN_DURATION_MS);

  let active = 0;
  let consecutiveFailures = 0;
  let openUntil = 0;
  let halfOpenInFlight = false;
  const queue = [];

  function getRetryAfterSeconds() {
    return Math.max(1, Math.ceil(Math.max(0, openUntil - now()) / 1000));
  }

  function circuitOpenError() {
    return buildGuardError(
      'hosted_search_circuit_open',
      'Hosted search is cooling down after repeated dependency failures.',
      getRetryAfterSeconds(),
    );
  }

  function queueBusyError() {
    return buildGuardError(
      'hosted_search_busy',
      'Hosted search is busy. Retry after the current requests finish.',
      1,
    );
  }

  function release() {
    active = Math.max(0, active - 1);
    while (active < concurrencyLimit && queue.length > 0) {
      const entry = queue.shift();
      clearTimeout(entry.timer);
      if (entry.expired) continue;
      active += 1;
      entry.resolve(release);
    }
  }

  function acquire() {
    if (active < concurrencyLimit) {
      active += 1;
      return Promise.resolve(release);
    }
    if (queue.length >= queueLimit) {
      return Promise.reject(queueBusyError());
    }

    return new Promise((resolve, reject) => {
      const entry = { resolve, reject, expired: false, timer: null };
      entry.timer = setTimeout(() => {
        entry.expired = true;
        const index = queue.indexOf(entry);
        if (index >= 0) queue.splice(index, 1);
        reject(queueBusyError());
      }, waitLimitMs);
      queue.push(entry);
    });
  }

  function reserveCircuitAttempt() {
    const currentTime = now();
    if (openUntil > currentTime) throw circuitOpenError();
    if (openUntil > 0) {
      if (halfOpenInFlight) throw circuitOpenError();
      halfOpenInFlight = true;
      return 'half_open';
    }
    return 'closed';
  }

  function closeCircuit() {
    consecutiveFailures = 0;
    openUntil = 0;
    halfOpenInFlight = false;
  }

  function openCircuit() {
    openUntil = now() + resetDelayMs;
    halfOpenInFlight = false;
  }

  function recordFailure(mode) {
    if (mode === 'half_open') {
      openCircuit();
      return;
    }
    consecutiveFailures += 1;
    if (consecutiveFailures >= failureLimit) openCircuit();
  }

  async function execute(operation) {
    const mode = reserveCircuitAttempt();
    let releasePermit = null;
    try {
      releasePermit = await acquire();
      if (mode === 'closed' && openUntil > now()) throw circuitOpenError();
      const value = await operation();
      closeCircuit();
      return value;
    } catch (error) {
      if (mode === 'half_open' || error?.hosted_search_dependency_failure === true) {
        recordFailure(mode);
      }
      throw error;
    } finally {
      if (releasePermit) releasePermit();
      if (mode === 'half_open' && halfOpenInFlight) halfOpenInFlight = false;
    }
  }

  function getStatus() {
    const currentTime = now();
    const state = openUntil > currentTime
      ? 'open'
      : openUntil > 0
        ? 'half_open_ready'
        : 'closed';
    return {
      state,
      active,
      queued: queue.length,
      max_concurrent: concurrencyLimit,
      max_queued: queueLimit,
      consecutive_failures: consecutiveFailures,
      retry_after_seconds: state === 'open' ? getRetryAfterSeconds() : 0,
    };
  }

  return { execute, getStatus };
}

export const hostedSearchResilience = createHostedSearchResilience();
