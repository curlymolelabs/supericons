export const CJK_SEARCH_LOCALES = Object.freeze(['zh-Hans', 'zh-Hant', 'ja', 'ko']);
export const MULTILINGUAL_SEARCH_LOCALES = Object.freeze([...CJK_SEARCH_LOCALES, 'es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']);

const SEPARATORS = /[_:\-]+/g;
const NON_SEARCH_CHARS = /[^\p{L}\p{M}\p{N}\s]/gu;
const CJK_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const EXPLICIT_MULTILINGUAL_LOCALES = new Set(['es', 'de', 'pt', 'ar', 'hi', 'vi', 'th']);
const HANGUL_SPACING = /\s+/g;
const LOCALE_ALIASES = Object.freeze({
  'zh-cn': 'zh-Hans',
  'zh-sg': 'zh-Hans',
  'zh-hans': 'zh-Hans',
  'zh-hk': 'zh-Hant',
  'zh-mo': 'zh-Hant',
  'zh-tw': 'zh-Hant',
  'zh-hant': 'zh-Hant',
});
const WORD_SEGMENTERS = new Map();
const RECORD_WORD_FORMS = new WeakMap();

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

export function normalizeMultilingualSearchLocale(value) {
  const normalized = String(value || '').trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return null;
  if (LOCALE_ALIASES[normalized]) return LOCALE_ALIASES[normalized];
  const base = normalized.split('-')[0];
  return MULTILINGUAL_SEARCH_LOCALES.includes(base) ? base : null;
}

export function isSupportedMultilingualLocale(value) {
  return normalizeMultilingualSearchLocale(value) !== null;
}

function recordValues(record) {
  return [
    record.term,
    ...(record.variants || []),
  ].filter(Boolean);
}

function getWordSegmenter(locale) {
  if (WORD_SEGMENTERS.has(locale)) return WORD_SEGMENTERS.get(locale);
  let segmenter = null;
  try {
    segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  } catch {
    segmenter = null;
  }
  WORD_SEGMENTERS.set(locale, segmenter);
  return segmenter;
}

function segmentNormalizedSearchText(value, locale) {
  const normalized = normalizeCjkSearchText(value);
  if (!normalized) return [];
  const segmenter = getWordSegmenter(locale);
  if (!segmenter) return normalized.split(/\s+/).filter(Boolean);
  return [...segmenter.segment(normalized)]
    .filter((entry) => entry.isWordLike !== false && /[\p{L}\p{N}]/u.test(entry.segment))
    .map((entry) => normalizeCjkSearchText(entry.segment))
    .filter(Boolean);
}

function getRecordWordForms(record) {
  if (RECORD_WORD_FORMS.has(record)) return RECORD_WORD_FORMS.get(record);
  const forms = recordValues(record).map((value) => ({
    normalized: normalizeCjkSearchText(value),
    segments: segmentNormalizedSearchText(value, record.locale),
  }));
  RECORD_WORD_FORMS.set(record, forms);
  return forms;
}

function containsSegmentSequence(querySegments, valueSegments) {
  if (valueSegments.length === 0 || valueSegments.length > querySegments.length) return false;
  for (let start = 0; start <= querySegments.length - valueSegments.length; start += 1) {
    if (valueSegments.every((value, index) => querySegments[start + index] === value)) return true;
  }
  return false;
}

function recordMatchesQuery(record, normalizedQuery, querySegments) {
  if (!normalizedQuery) return false;
  const wordForms = getRecordWordForms(record);
  if (wordForms.some((form) => form.normalized === normalizedQuery)) return true;
  if (wordForms.some((form) => containsSegmentSequence(querySegments, form.segments))) return true;

  if (record.locale === 'ko') {
    const compactQuery = compactKoreanSpacing(normalizedQuery);
    return recordValues(record).some((value) => compactKoreanSpacing(value) === compactQuery);
  }

  return false;
}

function recordMatchPriority(record, normalizedQuery) {
  return getRecordWordForms(record).some((form) => form.normalized === normalizedQuery) ? 1 : 0;
}

export function expandCjkQuery(query, options = {}) {
  const normalizedQuery = normalizeCjkSearchText(query);
  const locale = normalizeMultilingualSearchLocale(options.locale);
  const canUseExplicitLocaleTerms = EXPLICIT_MULTILINGUAL_LOCALES.has(locale);
  const canUseMultilingualTerms = isLikelyCjkQuery(query) || canUseExplicitLocaleTerms;
  if (!normalizedQuery || !canUseMultilingualTerms) {
    return { query: normalizedQuery, variants: [String(query || '').trim()].filter(Boolean), matched: [] };
  }

  const terms = Array.isArray(options.terms) ? options.terms : [];
  const eligibleTerms = locale
    ? terms.filter((record) => record.locale === locale)
    : terms;
  const querySegments = segmentNormalizedSearchText(normalizedQuery, locale);
  const matched = eligibleTerms.filter((record) => (
    record.gate === 'auto_accept'
    && recordMatchesQuery(record, normalizedQuery, querySegments)
  )).sort((left, right) => (
    recordMatchPriority(right, normalizedQuery) - recordMatchPriority(left, normalizedQuery)
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
