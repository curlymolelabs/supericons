export function aggregateLocaleAttemptCounts(queries = []) {
  const counts = {};
  for (const query of Array.isArray(queries) ? queries : []) {
    const queryCounts = query?.locale_attempt_counts && typeof query.locale_attempt_counts === 'object'
      ? query.locale_attempt_counts
      : {};
    for (const [locale, value] of Object.entries(queryCounts)) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue < 0) continue;
      counts[locale] = Number(counts[locale] || 0) + numericValue;
    }
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}
