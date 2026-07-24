export const SEARCH_INPUT_DEBOUNCE_MS = 150;
export const SEARCH_EPISODE_IDLE_MS = 2500;
export const WEB_SEARCH_OBSERVATION_DEADLINE_MS = 20000;

const TERMINAL_HOSTED_STATES = new Set(['success', 'zero', 'error']);

function safeCount(value) {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : 0;
}

function safeWrite(writer, payload) {
  try {
    const result = writer(payload);
    if (result && typeof result.catch === 'function') {
      void result.catch(() => {});
    }
  } catch {
    // Telemetry cannot affect search.
  }
}

export function createWebSearchEpisodeCoordinator({
  writeTelemetry,
  onCountable = () => {},
  createId = () => crypto.randomUUID(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
  episodeIdleMs = SEARCH_EPISODE_IDLE_MS,
  observationDeadlineMs = WEB_SEARCH_OBSERVATION_DEADLINE_MS,
  sourceVersion = null,
} = {}) {
  if (typeof writeTelemetry !== 'function') {
    throw new Error('writeTelemetry is required.');
  }

  let active = null;

  function clearEpisodeTimers(episode) {
    if (!episode) return;
    if (episode.idleTimer) {
      clearTimer(episode.idleTimer);
      episode.idleTimer = null;
    }
    if (episode.observationTimer) {
      clearTimer(episode.observationTimer);
      episode.observationTimer = null;
    }
  }

  function buildCommonPayload(episode) {
    return {
      contract_version: 1,
      episode_id: episode.id,
      recovery_chain_id: episode.recoveryChainId,
      query: episode.query,
      library_filter: episode.libraryFilter,
      library_mode: episode.libraryMode,
      style: episode.style,
      locale: episode.locale,
      local_match_count: episode.localMatchCount,
      hosted_match_count: episode.hostedMatchCount,
      hosted_state: episode.hostedState,
      search_execution: episode.searchExecution,
      diagnostic_attempt_count: episode.diagnosticAttemptCount,
      error_code: episode.errorCode,
      source_version: sourceVersion,
    };
  }

  function writeDiagnostic(episode, diagnosticType) {
    safeWrite(writeTelemetry, {
      ...buildCommonPayload(episode),
      action: 'diagnostic',
      diagnostic_type: diagnosticType,
    });
  }

  function tryFinalize(episode) {
    if (
      !episode
      || episode !== active
      || episode.finalized
      || !episode.countable
      || !TERMINAL_HOSTED_STATES.has(episode.hostedState)
    ) {
      return false;
    }

    const finalMatchCount = safeCount(episode.finalMatchCount);
    let finalOutcome;
    let settlementState;
    if (finalMatchCount > 0) {
      finalOutcome = 'success';
      settlementState = episode.hostedState === 'error' ? 'failed' : 'completed';
    } else if (episode.hostedState === 'zero') {
      finalOutcome = 'zero';
      settlementState = 'completed';
    } else if (episode.hostedState === 'error') {
      finalOutcome = 'error';
      settlementState = 'failed';
    } else {
      return false;
    }

    episode.finalized = true;
    clearEpisodeTimers(episode);
    safeWrite(writeTelemetry, {
      ...buildCommonPayload(episode),
      action: 'final',
      final_match_count: finalMatchCount,
      final_outcome: finalOutcome,
      settlement_state: settlementState,
      completion_trigger: episode.completionTrigger,
    });
    return true;
  }

  function markCountable({ episodeId = active?.id, trigger = 'idle' } = {}) {
    if (!active || active.id !== episodeId || active.finalized) return false;
    if (!active.countable) {
      active.countable = true;
      active.completionTrigger = trigger;
      if (active.idleTimer) {
        clearTimer(active.idleTimer);
        active.idleTimer = null;
      }
      try {
        onCountable(active.query, trigger);
      } catch {
        // Recent-search UI cannot affect telemetry settlement.
      }
    }
    tryFinalize(active);
    return true;
  }

  function supersedeActive() {
    if (!active) return false;
    const previous = active;
    clearEpisodeTimers(previous);
    if (!previous.finalized) {
      previous.superseded = true;
      writeDiagnostic(previous, 'superseded');
    }
    active = null;
    return true;
  }

  function startEpisode({
    query,
    libraryFilter = 'all',
    libraryMode = 'all',
    style = 'any',
    locale = null,
    recoveryChainId = null,
  } = {}) {
    const normalizedQuery = String(query || '').trim().replace(/\s+/g, ' ');
    if (normalizedQuery.length < 3) {
      supersedeActive();
      return null;
    }

    supersedeActive();
    const episode = {
      id: createId(),
      query: normalizedQuery,
      libraryFilter: String(libraryFilter || 'all'),
      libraryMode: String(libraryMode || 'all'),
      style: String(style || 'any'),
      locale: locale || null,
      recoveryChainId: recoveryChainId || null,
      localMatchCount: 0,
      hostedMatchCount: null,
      hostedState: 'not_started',
      finalMatchCount: 0,
      searchExecution: null,
      diagnosticAttemptCount: null,
      errorCode: null,
      countable: false,
      completionTrigger: null,
      finalized: false,
      superseded: false,
      idleTimer: null,
      observationTimer: null,
      incompleteRecorded: false,
    };
    active = episode;
    episode.idleTimer = setTimer(() => {
      markCountable({ episodeId: episode.id, trigger: 'idle' });
    }, episodeIdleMs);
    return episode.id;
  }

  function updateLocal({
    episodeId = active?.id,
    localMatchCount = 0,
    finalMatchCount = localMatchCount,
  } = {}) {
    if (!active || active.id !== episodeId || active.finalized) return false;
    active.localMatchCount = safeCount(localMatchCount);
    active.finalMatchCount = safeCount(finalMatchCount);
    return true;
  }

  function markHostedPending({ episodeId = active?.id } = {}) {
    if (!active || active.id !== episodeId || active.finalized) return false;
    active.hostedState = 'pending';
    if (active.observationTimer) clearTimer(active.observationTimer);
    const episode = active;
    episode.observationTimer = setTimer(() => {
      episode.observationTimer = null;
      if (
        active === episode
        && !episode.finalized
        && episode.hostedState === 'pending'
        && !episode.incompleteRecorded
      ) {
        episode.incompleteRecorded = true;
        writeDiagnostic(episode, 'incomplete');
      }
    }, observationDeadlineMs);
    return true;
  }

  function settleHosted({
    episodeId = active?.id,
    hostedState,
    hostedMatchCount = null,
    finalMatchCount = active?.finalMatchCount || 0,
    searchExecution = null,
    diagnosticAttemptCount = null,
    errorCode = null,
  } = {}) {
    if (
      !active
      || active.id !== episodeId
      || active.finalized
      || !TERMINAL_HOSTED_STATES.has(hostedState)
    ) {
      return false;
    }
    active.hostedState = hostedState;
    active.hostedMatchCount = hostedMatchCount === null ? null : safeCount(hostedMatchCount);
    active.finalMatchCount = safeCount(finalMatchCount);
    active.searchExecution = searchExecution || null;
    active.diagnosticAttemptCount = diagnosticAttemptCount === null
      ? null
      : safeCount(diagnosticAttemptCount);
    active.errorCode = errorCode || null;
    if (active.observationTimer) {
      clearTimer(active.observationTimer);
      active.observationTimer = null;
    }
    tryFinalize(active);
    return true;
  }

  function getActiveEpisode() {
    if (!active) return null;
    return {
      id: active.id,
      query: active.query,
      countable: active.countable,
      finalized: active.finalized,
      hostedState: active.hostedState,
      localMatchCount: active.localMatchCount,
      finalMatchCount: active.finalMatchCount,
    };
  }

  return {
    startEpisode,
    updateLocal,
    markHostedPending,
    settleHosted,
    markCountable,
    supersedeActive,
    getActiveEpisode,
  };
}
