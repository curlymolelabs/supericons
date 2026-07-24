function safeText(value, maxLength = 180) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, maxLength) : null;
}

export function extractReturnedIconRefs(result, toolName, limit = 100) {
  const payload = result?.structuredContent || {};
  const refs = [];
  const add = (value) => {
    const ref = safeText(value);
    if (ref && !refs.includes(ref) && refs.length < limit) refs.push(ref);
  };
  const addCandidate = (candidate) => {
    add(candidate?.icon_ref);
    const library = safeText(candidate?.library || candidate?.lib, 80);
    const id = safeText(candidate?.id, 180);
    if (library && id) add(`${library}:${id}`);
  };

  addCandidate(payload.icon);
  if (Array.isArray(payload.results)) {
    for (const item of payload.results) {
      if (toolName === 'recommend_icons') {
        addCandidate(item?.recommended);
        for (const alternative of Array.isArray(item?.alternatives) ? item.alternatives : []) {
          addCandidate(alternative);
        }
      } else {
        addCandidate(item);
      }
    }
  }
  return refs;
}

export function classifyMcpTraffic(context = {}) {
  const cohort = String(context.beta_cohort || '').trim().toLowerCase();
  if (
    cohort.startsWith('controlled-run:')
    || cohort.includes(':founder_controlled')
    || cohort.includes(':controlled_')
  ) return 'controlled_test';
  if (context.channel === 'internal_test' || context.environment === 'test') return 'controlled_test';
  if (context.environment === 'preview') return 'preview';
  if (context.environment === 'local') return 'local';
  if (context.beta_cohort) return 'named_cohort';
  return context.environment === 'production' || context.environment === 'legacy'
    ? 'unclassified_live'
    : 'unclassified';
}
