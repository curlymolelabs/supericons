export const CJK_SEARCH_LOCALES = Object.freeze(['zh-Hans', 'zh-Hant', 'ja', 'ko']);
export const MULTILINGUAL_SEARCH_LOCALES = Object.freeze([...CJK_SEARCH_LOCALES, 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']);

const SEPARATORS = /[_:\-]+/g;
const NON_SEARCH_CHARS = /[^\p{L}\p{M}\p{N}\s]/gu;
const CJK_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const EXPLICIT_MULTILINGUAL_LOCALES = new Set(['es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']);
const HANGUL_SPACING = /\s+/g;

export function normalizeCjkSearchText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(SEPARATORS, ' ')
    .replace(NON_SEARCH_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactKoreanSpacing(value) {
  return normalizeCjkSearchText(value).replace(HANGUL_SPACING, '');
}

export function isLikelyCjkQuery(value) {
  return CJK_SCRIPT.test(String(value || ''));
}

export function isSupportedMultilingualLocale(value) {
  return MULTILINGUAL_SEARCH_LOCALES.includes(value);
}

function recordValues(record) {
  return [
    record.term,
    ...(record.variants || []),
  ].filter(Boolean);
}

function recordMatchesQuery(record, normalizedQuery) {
  if (!normalizedQuery) return false;
  if (recordValues(record).some((value) => normalizeCjkSearchText(value) === normalizedQuery)) return true;

  if (record.locale === 'ko') {
    const compactQuery = compactKoreanSpacing(normalizedQuery);
    return recordValues(record).some((value) => compactKoreanSpacing(value) === compactQuery);
  }

  return false;
}

export function expandCjkQuery(query, options = {}) {
  const normalizedQuery = normalizeCjkSearchText(query);
  const locale = options.locale || null;
  const canUseExplicitLocaleTerms = EXPLICIT_MULTILINGUAL_LOCALES.has(locale);
  const canUseMultilingualTerms = isLikelyCjkQuery(query) || canUseExplicitLocaleTerms;
  if (!normalizedQuery || !canUseMultilingualTerms) {
    return { query: normalizedQuery, variants: [String(query || '').trim()].filter(Boolean), matched: [] };
  }

  const terms = Array.isArray(options.terms) ? options.terms : [];
  const eligibleTerms = locale
    ? terms.filter((record) => record.locale === locale)
    : terms;
  const matched = eligibleTerms.filter((record) => (
    record.gate === 'auto_accept'
    && recordMatchesQuery(record, normalizedQuery)
  ));
  const variants = [];

  for (const value of [String(query || '').trim(), normalizedQuery]) {
    if (value && !variants.includes(value)) variants.push(value);
  }

  for (const record of matched) {
    for (const value of record.maps_to || []) {
      const normalized = normalizeCjkSearchText(value);
      if (normalized && !variants.includes(normalized)) variants.push(normalized);
    }
  }

  return { query: normalizedQuery, variants, matched };
}
