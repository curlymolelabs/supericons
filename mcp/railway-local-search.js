const DEFAULT_LOCAL_FIRST_VALUE = 'on';

function normalizeSwitch(value) {
  return String(value || '').trim().toLowerCase();
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
}

export function createRailwayCandidateIndex({ icons = [], synonyms = {}, getSearchValues }) {
  const iconsByToken = new Map();
  const relatedTerms = new Map();

  function addRelatedTerm(left, right) {
    if (!left || !right) return;
    if (!relatedTerms.has(left)) relatedTerms.set(left, new Set());
    relatedTerms.get(left).add(right);
  }

  for (const [key, values] of Object.entries(synonyms)) {
    const terms = new Set([
      ...tokenize(key),
      ...(Array.isArray(values) ? values.flatMap(tokenize) : []),
    ]);
    for (const left of terms) {
      for (const right of terms) addRelatedTerm(left, right);
    }
  }

  for (const icon of icons) {
    const values = typeof getSearchValues === 'function'
      ? getSearchValues(icon)
      : [icon?.id, icon?.name];
    const iconTokens = new Set(values.flatMap(tokenize));
    for (const token of iconTokens) {
      if (!iconsByToken.has(token)) iconsByToken.set(token, []);
      iconsByToken.get(token).push(icon);
    }
  }

  return {
    token_count: iconsByToken.size,
    select(query) {
      const queryTerms = new Set(tokenize(query));
      for (const term of [...queryTerms]) {
        for (const related of relatedTerms.get(term) || []) queryTerms.add(related);
      }
      const selected = [];
      const seen = new Set();
      for (const term of queryTerms) {
        for (const icon of iconsByToken.get(term) || []) {
          if (seen.has(icon)) continue;
          seen.add(icon);
          selected.push(icon);
        }
      }
      return selected;
    },
  };
}

export function isRailwayLocalFirstEnabled(env = process.env) {
  const value = normalizeSwitch(env.SUPERICONS_RAILWAY_LOCAL_FIRST || DEFAULT_LOCAL_FIRST_VALUE);
  return !['0', 'false', 'off', 'disabled'].includes(value);
}

function buildSingleFallbackRequest(queries) {
  const libraries = [...new Set(queries.map((query) => query.library).filter(Boolean))];
  const styles = [...new Set(queries.map((query) => query.style || 'any'))];
  return {
    query: queries.map((query) => query.query).filter(Boolean).join(' '),
    library: libraries.length === 1 ? libraries[0] : null,
    libraryMode: 'strict',
    style: styles.length === 1 ? styles[0] : 'any',
    limit: 50,
    locale: null,
  };
}

export function createRailwayRecommendationSearch({
  enabled = true,
  localSearchOne,
  hostedSearchOne,
  hostedSearchMany,
}) {
  if (typeof localSearchOne !== 'function') {
    throw new TypeError('localSearchOne must be a function.');
  }
  if (typeof hostedSearchOne !== 'function') {
    throw new TypeError('hostedSearchOne must be a function.');
  }

  const state = {
    mode: enabled ? 'local_first' : 'hosted',
    fallback_used: false,
    hosted_search_calls: 0,
    local_failure_code: null,
  };

  async function searchOne(params) {
    if (!enabled) {
      state.hosted_search_calls += 1;
      return hostedSearchOne(params);
    }

    try {
      return await localSearchOne(params);
    } catch (error) {
      state.mode = 'hosted_fallback';
      state.fallback_used = true;
      state.local_failure_code = error?.code || 'local_search_failed';
      state.hosted_search_calls += 1;
      return hostedSearchOne({ ...params, locale: null });
    }
  }

  async function searchMany(queries = []) {
    if (!enabled) {
      if (typeof hostedSearchMany === 'function') {
        state.hosted_search_calls += 1;
        return hostedSearchMany(queries);
      }
      return Promise.all(queries.map((query) => searchOne(query)));
    }

    try {
      return await Promise.all(queries.map((query) => localSearchOne(query)));
    } catch (error) {
      state.mode = 'hosted_fallback';
      state.fallback_used = true;
      state.local_failure_code = error?.code || 'local_search_failed';
      state.hosted_search_calls += 1;
      const fallbackResults = await hostedSearchOne(buildSingleFallbackRequest(queries));
      return queries.map(() => fallbackResults);
    }
  }

  return {
    searchOne,
    searchMany,
    getRuntime() {
      return { ...state };
    },
  };
}

export function createRailwaySearchRoute({
  localSearchOne,
  hostedSearchOne,
}) {
  if (typeof localSearchOne !== 'function') {
    throw new TypeError('localSearchOne must be a function.');
  }
  if (typeof hostedSearchOne !== 'function') {
    throw new TypeError('hostedSearchOne must be a function.');
  }

  const state = {
    mode: 'hosted',
    fallback_used: false,
    hosted_search_calls: 0,
    local_failure_code: null,
  };

  async function searchOne(params) {
    state.hosted_search_calls += 1;
    const hostedResults = await hostedSearchOne(params);
    if (Array.isArray(hostedResults) && hostedResults.length > 0) {
      return hostedResults;
    }

    try {
      const localResults = await localSearchOne(params);
      if (Array.isArray(localResults) && localResults.length > 0) {
        state.mode = 'local_fallback';
        state.fallback_used = true;
        return localResults;
      }
    } catch (error) {
      state.local_failure_code = error?.code || 'local_search_failed';
    }

    return [];
  }

  return {
    searchOne,
    getRuntime() {
      return { ...state };
    },
  };
}
