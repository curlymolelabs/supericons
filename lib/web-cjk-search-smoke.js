import { expandCjkQuery, normalizeCjkSearchText } from './cjk-search-core.js';

function valuesForRecord(record) {
  return [record.term, ...(record.variants || [])].filter(Boolean);
}

function inferExactLocale(query, terms) {
  const normalizedQuery = normalizeCjkSearchText(query);
  if (!normalizedQuery) return null;
  const matched = terms.find((record) => (
    record.gate === 'auto_accept'
    && valuesForRecord(record).some((value) => normalizeCjkSearchText(value) === normalizedQuery)
  ));
  return matched?.locale || null;
}

export function buildWebSearchQueryPlan(query, cjkSearchTerms = [], intentVariantBuilder = null, locale = null) {
  const normalizedQuery = normalizeCjkSearchText(query);
  const inferredLocale = locale || inferExactLocale(query, cjkSearchTerms);
  const cjkExpansion = expandCjkQuery(query, { locale: inferredLocale, terms: cjkSearchTerms });
  const cjkVariants = cjkExpansion.matched.length > 0 ? cjkExpansion.variants.slice(1) : [];
  const intentVariants = typeof intentVariantBuilder === 'function'
    ? intentVariantBuilder(normalizedQuery, { maxVariants: 8 })
    : [normalizedQuery];
  const variants = [];

  for (const value of [normalizedQuery, ...cjkVariants, ...intentVariants]) {
    const normalized = normalizeCjkSearchText(value);
    if (normalized && !variants.includes(normalized)) variants.push(normalized);
  }

  return {
    normalizedQuery,
    cjkLocale: cjkExpansion.matched[0]?.locale || null,
    locale: cjkExpansion.matched[0]?.locale || inferredLocale || null,
    variants,
  };
}
