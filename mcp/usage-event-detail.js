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

  add(payload.icon?.icon_ref);
  if (Array.isArray(payload.results)) {
    for (const item of payload.results) {
      if (toolName === 'recommend_icons') {
        add(item?.recommended?.icon_ref);
        for (const alternative of Array.isArray(item?.alternatives) ? item.alternatives : []) {
          add(alternative?.icon_ref);
        }
      } else {
        add(item?.icon_ref);
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
