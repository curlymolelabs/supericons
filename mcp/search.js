/**
 * Local fallback search only.
 * Do not treat this file as the production ranking engine.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  expandCjkQuery,
  normalizeCjkSearchText,
} from './runtime/cjk-search-core.js';
import { createIconSemanticAliasMap } from './runtime/icon-semantic-aliases.js';
import { createIconTaxonomyMap } from './runtime/icon-taxonomy-seed.js';
import {
  getSearchInterpretationPlan,
  normalizeSearchLibraryMode,
  rerankSearchCandidatesAtFusion,
} from './runtime/search-ranking-policy.js';
import { buildIntentQueryVariants } from './runtime/search-intent-core.js';
import { buildSearchQueryFrame } from './runtime/search-query-frame.js';
import {
  compareVariantPreference,
  getConceptKeyForIcon,
  iconMatchesRequestedStyle,
  normalizeRequestedStyle,
} from './variant-support.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconSemanticAliasMap = createIconSemanticAliasMap();
const iconTaxonomyMap = createIconTaxonomyMap();
const packagedCjkTermsPath = join(__dirname, 'public', 'cjk-search-terms.json');
const repoCjkTermsPath = join(__dirname, '..', 'data', 'i18n', 'cjk-search-terms.json');
const cjkTermsPath = existsSync(packagedCjkTermsPath) ? packagedCjkTermsPath : repoCjkTermsPath;
const cjkSearchTerms = existsSync(cjkTermsPath)
  ? JSON.parse(readFileSync(cjkTermsPath, 'utf8')).terms || []
  : [];
const packagedMultilingualAliasesPath = join(__dirname, 'public', 'multilingual-search-aliases.json');
const repoMultilingualAliasesPath = join(__dirname, '..', 'data', 'i18n', 'multilingual-search-aliases.json');
const multilingualAliasesPath = existsSync(packagedMultilingualAliasesPath)
  ? packagedMultilingualAliasesPath
  : repoMultilingualAliasesPath;
const multilingualSearchAliases = existsSync(multilingualAliasesPath)
  ? JSON.parse(readFileSync(multilingualAliasesPath, 'utf8')).aliases || []
  : [];
const multilingualExpansionTerms = [...cjkSearchTerms, ...multilingualSearchAliases];
const iconSearchMetadataCache = new WeakMap();
const iconCandidateIndexCache = new WeakMap();
const LOGO_INTENT_TOKENS = new Set(['logo', 'logos', 'icon', 'icons', 'brand', 'brands', 'mark', 'marks', 'symbol', 'symbols']);
const GENERIC_AI_LOGO_TOKENS = new Set(['ai', 'artificial', 'intelligence']);
const QUERY_CONFIDENCE_STOP_TOKENS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'using',
  'was',
  'with',
]);
const QUERY_CONFIDENCE_GENERIC_TOKENS = new Set([
  'class',
  'icon',
  'icons',
  'item',
  'mode',
  'symbol',
  'thing',
]);

/** Inline optimal-string-alignment distance (capped early for performance). */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const rows = Array.from(
    { length: a.length + 1 },
    (_, row) => Array.from({ length: b.length + 1 }, (_, column) => (
      row === 0 ? column : column === 0 ? row : 0
    )),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const substitutionCost = a[row - 1] === b[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        rows[row - 1][column - 1] + substitutionCost,
      );
      if (
        row > 1
        && column > 1
        && a[row - 1] === b[column - 2]
        && a[row - 2] === b[column - 1]
      ) {
        rows[row][column] = Math.min(
          rows[row][column],
          rows[row - 2][column - 2] + 1,
        );
      }
    }
  }

  return rows[a.length][b.length];
}

function normalizeSemanticText(value) {
  return normalizeCjkSearchText(value);
}

function tokenizeSemanticText(value) {
  const normalized = normalizeSemanticText(value);
  return normalized ? normalized.split(' ') : [];
}

function containsSemanticPhrase(value, phrase) {
  const normalizedValue = normalizeSemanticText(value);
  const normalizedPhrase = normalizeSemanticText(phrase);
  if (!normalizedValue || !normalizedPhrase) return false;
  return ` ${normalizedValue} `.includes(` ${normalizedPhrase} `);
}

function isSafeInflectionalTokenMatch(left, right) {
  if (!left || !right || Math.min(left.length, right.length) < 3) return false;
  const suffixes = ['s', 'es', 'ed', 'ing'];
  return suffixes.some((suffix) => (
    right === `${left}${suffix}` || left === `${right}${suffix}`
  ));
}

function iconKey(icon) {
  return `${icon.lib}:${icon.id}`;
}

function getIconJobRank(icon) {
  return iconTaxonomyMap.get(iconKey(icon))?.rank ?? Number.MAX_SAFE_INTEGER;
}

function getIconSemanticAliases(icon) {
  return iconSemanticAliasMap.get(iconKey(icon)) || null;
}

function collectIconSearchValues(icon) {
  const values = [
    icon.name,
    icon.id,
    iconKey(icon),
    icon.meaning,
    icon.jobCategory,
    icon.aiCategory,
    icon.aiCategoryLabel,
    icon.assetType,
    icon.pack,
    icon.access,
  ];

  for (const field of [
    'semanticTags',
    'synonyms',
    'aliases',
    'searchTerms',
    'filterTags',
    'aiFilterTags',
    'secondaryCategories',
    'variants',
  ]) {
    if (Array.isArray(icon[field])) {
      values.push(...icon[field]);
    }
  }

  return values.filter((value) => typeof value === 'string' && value.trim());
}

function getMeaningfulQueryWords(queryWords) {
  const withoutLogoIntent = queryWords.filter((word) => !LOGO_INTENT_TOKENS.has(word));
  const candidateWords = withoutLogoIntent.length > 0 ? withoutLogoIntent : queryWords;
  const withoutGenericAi = candidateWords.length > 1
    ? candidateWords.filter((word) => !GENERIC_AI_LOGO_TOKENS.has(word))
    : candidateWords;
  return withoutGenericAi.length > 0 ? withoutGenericAi : candidateWords;
}

function getConfidenceQueryWords(query) {
  const queryWords = tokenizeSemanticText(query)
    .filter((word) => !QUERY_CONFIDENCE_STOP_TOKENS.has(word));
  const specificWords = queryWords
    .filter((word) => !QUERY_CONFIDENCE_GENERIC_TOKENS.has(word));
  return specificWords.length > 0 ? specificWords : queryWords;
}

function getCandidateConfidenceTokens(icon) {
  const metadata = getIconSearchMetadata(icon);
  return new Set([
    ...metadata.tokens,
    ...metadata.aliases.flatMap((alias) => [...alias.tokens]),
  ]);
}

function tokenMatchesQueryConcept(queryWord, candidateToken, allowTypo = false) {
  if (queryWord === candidateToken) return true;
  if (
    queryWord.length >= 5
    && candidateToken.length >= 5
    && (
      candidateToken.startsWith(queryWord)
      || queryWord.startsWith(candidateToken)
    )
    && Math.abs(queryWord.length - candidateToken.length) <= 4
  ) {
    return true;
  }
  if (!allowTypo) return false;
  if (queryWord.length <= 4 || candidateToken.length <= 4) return false;
  return editDistance(queryWord, candidateToken) <= 1;
}

function getFuzzySynonymCorrections(word, synonyms) {
  if (word.length <= 4) return [];
  const candidateGroups = new Map();
  for (const [key, values] of Object.entries(synonyms)) {
    for (const value of [key, ...values]) {
      const candidate = normalizeSemanticText(value);
      if (!candidate || candidate.includes(' ')) continue;
      if (candidate === word) return [];
      const groups = candidateGroups.get(candidate) || new Set();
      groups.add(key);
      candidateGroups.set(candidate, groups);
    }
  }

  const minimumGroupCount = word.length >= 7 ? 1 : 2;
  const inflectionCandidate = singularizeQueryWord(word);
  return [...candidateGroups]
    .filter(([candidate, groups]) => (
      groups.size >= minimumGroupCount
      && candidate !== inflectionCandidate
      && editDistance(word, candidate) <= 1
    ))
    .map(([candidate]) => candidate);
}

function getFuzzyCorrectionWords(query, synonyms) {
  return new Set(
    tokenizeSemanticText(query)
      .filter((word) => getFuzzySynonymCorrections(word, synonyms).length > 0),
  );
}

function getCorrectedTypoQuery(query, synonyms) {
  const words = tokenizeSemanticText(query);
  const correctedWords = words.map((word) => (
    getFuzzySynonymCorrections(word, synonyms)[0] || word
  ));
  const correctedQuery = correctedWords.join(' ');
  const normalizedQuery = normalizeSemanticText(query);
  return correctedQuery !== normalizedQuery ? correctedQuery : null;
}

function iconMatchesOriginalQueryConcept(
  icon,
  query,
  minimumMatches = 1,
  fuzzyCorrectionWords = new Set(),
) {
  const queryWords = getConfidenceQueryWords(query);
  if (queryWords.length === 0) return true;
  const candidateTokens = getCandidateConfidenceTokens(icon);
  const matchCount = queryWords.filter((queryWord) => (
    [...candidateTokens].some((candidateToken) => (
      tokenMatchesQueryConcept(
        queryWord,
        candidateToken,
        fuzzyCorrectionWords.has(queryWord),
      )
    ))
  )).length;
  return matchCount >= Math.min(minimumMatches, queryWords.length);
}

function getDirectSearchFallbackVariants(
  query,
  synonyms,
  frame = buildSearchQueryFrame(query),
) {
  if (/[^\x00-\x7f]/.test(query) && !frame.matched) return [];
  const fuzzyCorrectionWords = getFuzzyCorrectionWords(query, synonyms);
  const queryWords = tokenizeSemanticText(query);
  const allowFuzzyCorrection = queryWords.length === 1
    ? fuzzyCorrectionWords.size > 0
    : fuzzyCorrectionWords.size >= 2;
  if (!frame.matched && !allowFuzzyCorrection) return [];
  const correctedVariants = tokenizeSemanticText(query)
    .flatMap((word) => getFuzzySynonymCorrections(word, synonyms));
  const variants = [
    ...(frame.positive_concepts || []),
    ...(frame.fallback_terms || []),
    ...correctedVariants,
    ...(frame.matched
      ? []
      : buildIntentQueryVariants(query, { maxVariants: 12 })
        .filter((variant) => fuzzyCorrectionWords.has(normalizeSemanticText(variant)))),
  ];
  const normalizedQuery = normalizeSemanticText(query);
  const seen = new Set([normalizedQuery]);
  const output = [];

  for (const variant of variants) {
    const normalized = normalizeSemanticText(variant);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output.slice(0, 20);
}

function singularizeQueryWord(word) {
  if (
    word.length <= 4
    || QUERY_CONFIDENCE_GENERIC_TOKENS.has(word)
    || /(ss|us|is|ics|news)$/.test(word)
  ) {
    return word;
  }
  if (word.endsWith('ies') && word.length > 5) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|sses|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

function getInflectionQueryVariant(query) {
  const normalizedQuery = normalizeSemanticText(query);
  if (!normalizedQuery || /[^\x00-\x7f]/.test(normalizedQuery)) return null;
  const words = normalizedQuery.split(' ');
  const normalizedWords = words.map(singularizeQueryWord);
  const variant = normalizedWords.join(' ');
  return variant !== normalizedQuery ? variant : null;
}

function hasLogoIntent(queryWords) {
  return queryWords.some((word) => LOGO_INTENT_TOKENS.has(word));
}

function isSupericonsBrandLogo(icon) {
  return icon.lib === 'si'
    && (
      icon.assetType === 'brand-logo'
      || icon.aiFilterTags?.includes('brand-logo')
      || icon.filterTags?.includes('brand-logo')
    );
}

function getIconSearchMetadata(icon) {
  const cached = iconSearchMetadataCache.get(icon);
  if (cached) return cached;

  const name = normalizeSemanticText(icon.name);
  const id = normalizeSemanticText(icon.id);
  const fullId = normalizeSemanticText(iconKey(icon));
  const lowerName = String(icon.name || '').toLowerCase();
  const lowerId = String(icon.id || '').toLowerCase();
  const tokens = new Set([
    ...tokenizeSemanticText(icon.name),
    ...tokenizeSemanticText(icon.id),
    ...tokenizeSemanticText(iconKey(icon)),
    ...collectIconSearchValues(icon).flatMap((value) => tokenizeSemanticText(value)),
  ]);
  const primaryTokens = new Set([
    ...tokenizeSemanticText(icon.name),
    ...tokenizeSemanticText(icon.id),
    ...tokenizeSemanticText(iconKey(icon)),
  ]);
  const segments = lowerId.split(/[-_]/).concat(lowerName.split(/[\s\-_]/));
  const aliases = [...(getIconSemanticAliases(icon) || []), ...collectIconSearchValues(icon)]
    .map((alias) => {
      const normalized = normalizeSemanticText(alias);
      return normalized
        ? { normalized, tokens: new Set(tokenizeSemanticText(normalized)) }
        : null;
    })
    .filter(Boolean);
  const metadata = {
    name,
    id,
    fullId,
    lowerName,
    lowerId,
    tokens,
    primaryTokens,
    segments,
    aliases,
  };

  iconSearchMetadataCache.set(icon, metadata);
  return metadata;
}

function getIconCandidateIndex(icons) {
  const cached = iconCandidateIndexCache.get(icons);
  if (cached) return cached;

  const byToken = new Map();
  for (const icon of icons) {
    const { tokens } = getIconSearchMetadata(icon);
    for (const token of tokens) {
      if (!token) continue;
      const matches = byToken.get(token) || [];
      matches.push(icon);
      byToken.set(token, matches);
    }
  }

  const index = { byToken };
  iconCandidateIndexCache.set(icons, index);
  return index;
}

function getIndexedCandidatePool(icons, query, synonyms) {
  const normalizedQuery = normalizeSemanticText(query);
  if (!normalizedQuery) return [];
  const termSets = expandSearchTerms(normalizedQuery, synonyms);
  const lookupTokens = new Set([
    ...tokenizeSemanticText(normalizedQuery),
    ...termSets.flatMap((terms) => terms.flatMap((term) => tokenizeSemanticText(term))),
  ]);
  const { byToken } = getIconCandidateIndex(icons);
  const candidates = [];
  const seen = new Set();

  const addMatches = (matches = []) => {
    for (const icon of matches) {
      const key = iconKey(icon);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(icon);
    }
  };

  for (const token of lookupTokens) {
    addMatches(byToken.get(token));
  }

  return candidates;
}

function getDirectSearchScore(icon, normalizedQuery, queryWords) {
  if (!normalizedQuery) return 0;

  const { name, id, fullId, tokens } = getIconSearchMetadata(icon);
  const meaningfulQueryWords = getMeaningfulQueryWords(queryWords);

  if (name === normalizedQuery || id === normalizedQuery || fullId === normalizedQuery) {
    return 320;
  }

  const singleQueryWord = queryWords.length === 1 ? queryWords[0] : null;
  const hasLongTokenPrefix = singleQueryWord?.length >= 5
    && [...tokens].some((token) => token.startsWith(singleQueryWord));
  if (
    containsSemanticPhrase(name, normalizedQuery)
    || containsSemanticPhrase(id, normalizedQuery)
    || containsSemanticPhrase(fullId, normalizedQuery)
    || hasLongTokenPrefix
  ) {
    return 250;
  }

  if (meaningfulQueryWords.length > 0 && meaningfulQueryWords.every((word) => tokens.has(word))) {
    return 190;
  }

  if (
    meaningfulQueryWords.length > 1
    && meaningfulQueryWords.every((word) => (
      [...tokens].some((token) => token === word || isSafeInflectionalTokenMatch(word, token))
    ))
  ) {
    return 180;
  }

  return 0;
}

function getExactSynonymKeys(query, synonyms) {
  const normalizedQuery = normalizeSemanticText(query);
  if (!normalizedQuery) return [];
  return Object.entries(synonyms)
    .filter(([, values]) => values.some((value) => normalizeSemanticText(value) === normalizedQuery))
    .map(([key]) => normalizeSemanticText(key))
    .filter(Boolean);
}

function iconMatchesExactQueryTokens(icon, query, exactSynonymKeys = []) {
  const queryWords = getConfidenceQueryWords(query);
  if (queryWords.length === 0) return false;
  const { primaryTokens } = getIconSearchMetadata(icon);
  if (queryWords.every((word) => primaryTokens.has(word))) return true;
  return exactSynonymKeys.some((key) => (
    tokenizeSemanticText(key).every((word) => primaryTokens.has(word))
  ));
}

function getCuratedAliasScore(icon, normalizedQuery, queryWords) {
  if (!normalizedQuery) return 0;

  const { aliases } = getIconSearchMetadata(icon);
  if (!aliases?.length) return 0;

  let bestScore = 0;
  const meaningfulQueryWords = getMeaningfulQueryWords(queryWords);
  const meaningfulQuery = meaningfulQueryWords.join(' ');
  const shouldBoostBrandLogo = hasLogoIntent(queryWords) && isSupericonsBrandLogo(icon);

  for (const alias of aliases) {
    const { normalized: normalizedAlias, tokens: aliasTokens } = alias;
    if (!normalizedAlias) continue;

    if (normalizedAlias === normalizedQuery) {
      bestScore = Math.max(bestScore, 420);
      continue;
    }

    if (
      containsSemanticPhrase(normalizedAlias, normalizedQuery)
      || (
        queryWords.length === 1
        && [...aliasTokens].some((token) => (
          (
            queryWords[0].length >= 5
            && token.startsWith(queryWords[0])
          )
          || isSafeInflectionalTokenMatch(queryWords[0], token)
        ))
      )
    ) {
      bestScore = Math.max(bestScore, 360);
      continue;
    }

    if (meaningfulQuery.length > 3 && containsSemanticPhrase(normalizedAlias, meaningfulQuery)) {
      bestScore = Math.max(bestScore, shouldBoostBrandLogo ? 520 : 350);
      continue;
    }

    if (meaningfulQueryWords.length > 1 && meaningfulQueryWords.every((word) => aliasTokens.has(word))) {
      bestScore = Math.max(bestScore, shouldBoostBrandLogo ? 490 : 320);
      continue;
    }

    if (meaningfulQueryWords.length === 1 && aliasTokens.has(meaningfulQueryWords[0])) {
      bestScore = Math.max(bestScore, shouldBoostBrandLogo ? 460 : 260);
      continue;
    }

    if (meaningfulQueryWords.length > 0 && meaningfulQueryWords.every((word) => aliasTokens.has(word))) {
      bestScore = Math.max(bestScore, shouldBoostBrandLogo ? 420 : 220);
    }
  }

  return bestScore;
}

/** Expand a single search word into a set of matching terms */
function expandSingleTerm(word, synonyms, options = {}) {
  const terms = new Set([word]);

  // 1. Direct key match
  if (synonyms[word]) synonyms[word].forEach(t => terms.add(t));

  // 2. Reverse lookup (word is a value in some group)
  for (const [key, values] of Object.entries(synonyms)) {
    if (values.some(v => v === word || v.split(' ').includes(word))) {
      terms.add(key);
    }
  }

  // 3. Prefix matching for longer partial words. Short prefixes such as
  // "win" must not expand to unrelated words such as "window".
  if (word.length >= 5) {
    for (const [key, values] of Object.entries(synonyms)) {
      if (key.startsWith(word) && key !== word) {
        terms.add(key);
        values.forEach(t => terms.add(t));
      }
    }
  }

  // 4. Plural/suffix normalization
  if (terms.size === 1) {
    const stripped = word
      .replace(/ings?$/, '')
      .replace(/ations?$/, 'ate')
      .replace(/es$/, '')
      .replace(/s$/, '');
    if (stripped !== word && stripped.length > 2) {
      if (synonyms[stripped]) synonyms[stripped].forEach(t => terms.add(t));
      for (const [key, values] of Object.entries(synonyms)) {
        if (key === stripped || values.includes(stripped)) {
          terms.add(key);
          values.forEach(t => terms.add(t));
        }
      }
    }
  }

  // 5. Fuzzy typo tolerance, including adjacent transpositions.
  if (terms.size === 1 && word.length > 4) {
    for (const [key, values] of Object.entries(synonyms)) {
      const candidates = [key, ...(options.allowValueFuzzy ? values : [])]
        .map((value) => normalizeSemanticText(value))
        .filter((value) => value && !value.includes(' '));
      if (candidates.some((candidate) => editDistance(word, candidate) <= 1)) {
        terms.add(key);
        values.forEach(t => terms.add(t));
      }
    }
  }

  // Filter out 2-char expansions (keep original word)
  const result = [...terms].filter(t => t === word || t.length > 2);
  return result.slice(0, 20);
}

/** Expand a full search query, returning array of term-sets for AND matching */
function expandSearchTerms(query, synonyms, options = {}) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.map(w => expandSingleTerm(w, synonyms, options));
}

/**
 * Search icons with tiered results.
 * @param {string} query - Search term
 * @param {Array} icons - Array of icon objects
 * @param {Object} synonyms - Synonym map
 * @param {Object} options - { library, limit }
 * @returns {Array} Matched icons (direct first, then synonym matches)
 */
export function searchIcons(query, icons, synonyms, options = {}) {
  const { library, limit = 20, style = 'any' } = options;
  const libraryMode = normalizeSearchLibraryMode(options.libraryMode);
  const semanticQueryFrame = buildSearchQueryFrame(query);
  const cjkExpansion = expandCjkQuery(query, {
    locale: options.locale,
    terms: multilingualExpansionTerms,
  });
  const queryVariants = cjkExpansion.variants.length > 0 ? cjkExpansion.variants : [query];
  const hasExpandedCjk = cjkExpansion.matched.length > 0 && queryVariants.length > 1;

  if (hasExpandedCjk && !semanticQueryFrame.matched) {
    const merged = [];
    const seen = new Set();

    for (const variant of queryVariants.slice(1)) {
      const results = searchIconsForSingleQuery(variant, icons, synonyms, {
        library,
        libraryMode,
        limit: Math.max(limit * 2, 20),
        style,
        applyExpressiveFallback: false,
        candidatePool: getIndexedCandidatePool(icons, variant, synonyms),
      });

      for (const icon of results) {
        const key = iconKey(icon);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(icon);
      }
    }

    return rerankSearchCandidatesAtFusion(query, merged, {
      libraryMode,
      requestedLibrary: library,
    }).slice(0, Math.max(1, limit));
  }

  const interpretationPlan = getSearchInterpretationPlan(query);
  if (interpretationPlan?.families?.length) {
    return searchIconsWithInterpretationPlan(query, icons, synonyms, interpretationPlan, options);
  }

  const queryFrame = semanticQueryFrame;
  const fuzzyCorrectionWords = getFuzzyCorrectionWords(query, synonyms);
  const queryWords = tokenizeSemanticText(query);
  const allowFuzzyCorrection = queryWords.length === 1
    ? fuzzyCorrectionWords.size > 0
    : fuzzyCorrectionWords.size >= 2;
  const effectiveLimit = Math.max(1, Number(options.limit || 20));
  const directResults = searchIconsForSingleQuery(query, icons, synonyms, {
    ...options,
    applyConfidenceFloor: queryFrame.matched || allowFuzzyCorrection,
    allowFuzzyCorrection,
    ...(queryFrame.matched
      ? { candidatePool: getIndexedCandidatePool(icons, query, synonyms) }
      : {}),
  });
  const inflectionVariant = getInflectionQueryVariant(query);
  const directConceptMatches = directResults.filter((icon) => (
    iconMatchesOriginalQueryConcept(icon, query)
  ));
  const exactSynonymKeys = getExactSynonymKeys(query, synonyms);
  const exactDirectMatches = directResults.filter((icon) => (
    iconMatchesExactQueryTokens(icon, query, exactSynonymKeys)
  ));
  const minimumUsefulResults = Math.min(3, effectiveLimit);
  if (
    inflectionVariant
    && !queryFrame.matched
    && (
      exactDirectMatches.length < minimumUsefulResults
      || exactDirectMatches.length < directResults.length
    )
  ) {
    const inflectionResults = searchIconsForSingleQuery(
      inflectionVariant,
      icons,
      synonyms,
      {
        ...options,
        limit: Math.max(effectiveLimit, 12),
        applyExpressiveFallback: false,
      },
    )
      .filter((icon) => iconMatchesOriginalQueryConcept(icon, query))
      .map((icon) => ({
        ...icon,
        query_variant: inflectionVariant,
        query_variant_rank: 1,
        query_variant_kind: 'normalized_inflection',
      }));
    if (inflectionResults.length > 0) {
      const merged = [...inflectionResults, ...directConceptMatches];
      const seen = new Set();
      return merged
        .filter((icon) => {
          const key = iconKey(icon);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, effectiveLimit);
    }
  }
  if (
    directResults.length > 0
    && (!queryFrame.matched || queryFrame.is_brand_logo_query)
  ) {
    if (queryFrame.is_brand_logo_query && directResults[0]?.lib === 'si') {
      const firstNonBrandIndex = directResults.findIndex((icon) => icon.lib !== 'si');
      return directResults.slice(0, firstNonBrandIndex === -1 ? directResults.length : firstNonBrandIndex);
    }
    const correctedTypoQuery = allowFuzzyCorrection
      ? getCorrectedTypoQuery(query, synonyms)
      : null;
    if (correctedTypoQuery) {
      return directResults.map((icon) => ({
        ...icon,
        query_variant: correctedTypoQuery,
        query_variant_rank: 1,
        query_variant_kind: 'normalized_typo',
      }));
    }
    return directResults;
  }

  const fallbackVariants = getDirectSearchFallbackVariants(query, synonyms, queryFrame);
  const fallbackBatches = [];
  for (let index = 0; index < fallbackVariants.length; index += 1) {
    const queryVariant = fallbackVariants[index];
    const variantResults = searchIconsForSingleQuery(queryVariant, icons, synonyms, {
      ...options,
      limit: Math.max(effectiveLimit, 12),
      applyExpressiveFallback: false,
      candidatePool: getIndexedCandidatePool(icons, queryVariant, synonyms),
    }).filter((icon) => (
      (queryFrame.is_brand_logo_query || !isSupericonsBrandLogo(icon))
      && iconMatchesOriginalQueryConcept(
        icon,
        queryFrame.matched ? queryVariant : query,
        1,
        queryFrame.matched ? new Set() : fuzzyCorrectionWords,
      )
    ));
    if (variantResults.length === 0) continue;

    fallbackBatches.push(variantResults.map((icon) => ({
      ...icon,
      query_variant: queryVariant,
      query_variant_rank: index + 1,
      query_variant_kind: 'semantic_fallback',
    })));
  }

  const useExactDirectAnchors = queryFrame.matched && queryFrame.confidence_floor === 'high';
  const mergedFallbackResults = queryFrame.matched
    ? (useExactDirectAnchors ? [...exactDirectMatches] : [])
    : [...directResults];
  const mergedFallbackKeys = new Set(mergedFallbackResults.map((icon) => iconKey(icon)));
  const maximumBatchLength = fallbackBatches.reduce(
    (maximum, batch) => Math.max(maximum, batch.length),
    0,
  );
  for (let resultIndex = 0; resultIndex < maximumBatchLength; resultIndex += 1) {
    for (const batch of fallbackBatches) {
      const icon = batch[resultIndex];
      if (!icon) continue;
      const key = iconKey(icon);
      if (mergedFallbackKeys.has(key)) continue;
      mergedFallbackKeys.add(key);
      mergedFallbackResults.push(icon);
    }
  }

  if (queryFrame.matched) {
    for (const icon of directResults) {
      const key = iconKey(icon);
      if (mergedFallbackKeys.has(key)) continue;
      mergedFallbackKeys.add(key);
      mergedFallbackResults.push(icon);
    }
  }

  if (mergedFallbackResults.length > 0) {
    if (queryFrame.matched) {
      return mergedFallbackResults.slice(0, effectiveLimit);
    }
    return rerankSearchCandidatesAtFusion(
      query,
      mergedFallbackResults,
      {
        libraryMode: options.libraryMode,
        requestedLibrary: options.library,
        applyExpressiveFallback: false,
      },
    ).slice(0, effectiveLimit);
  }

  return directResults;
}

function searchIconsWithInterpretationPlan(query, icons, synonyms, plan, options = {}) {
  const limit = Math.max(1, Number(options.limit || 20));
  const perQueryLimit = Math.max(limit, 12);
  const familyBatches = plan.families.map((family) => {
    const results = [];
    const seen = new Set();
    const retrievalBatches = [];
    for (const retrievalQuery of family.retrieval_queries || []) {
      retrievalBatches.push(
        searchIconsForSingleQuery(retrievalQuery, icons, synonyms, {
          ...options,
          limit: perQueryLimit,
          applyExpressiveFallback: false,
        }).filter((icon) => family.id === 'brand_identity' || !isSupericonsBrandLogo(icon)),
      );
    }
    for (let index = 0; index < perQueryLimit; index += 1) {
      for (const retrievalResults of retrievalBatches) {
        const icon = retrievalResults[index];
        if (!icon) continue;
        const key = iconKey(icon);
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(icon);
      }
    }
    return { family, results };
  });

  const originalResults = searchIconsForSingleQuery(query, icons, synonyms, {
    ...options,
    limit: perQueryLimit,
    applyExpressiveFallback: false,
  });
  const selected = [];
  const selectedKeys = new Set();
  let resultIndex = 0;

  while (selected.length < limit) {
    let added = false;
    for (const batch of familyBatches) {
      const icon = batch.results[resultIndex];
      if (!icon) continue;
      const key = iconKey(icon);
      if (selectedKeys.has(key)) continue;
      selected.push(icon);
      selectedKeys.add(key);
      added = true;
      if (selected.length >= limit) break;
    }
    if (!added && resultIndex >= perQueryLimit) break;
    resultIndex += 1;
    if (resultIndex > perQueryLimit) break;
  }

  for (const icon of originalResults) {
    if (selected.length >= limit) break;
    const key = iconKey(icon);
    if (selectedKeys.has(key)) continue;
    selected.push(icon);
    selectedKeys.add(key);
  }

  return rerankSearchCandidatesAtFusion(query, selected, {
    libraryMode: options.libraryMode,
    requestedLibrary: options.library,
  }).slice(0, limit);
}

function searchIconsForSingleQuery(query, icons, synonyms, options = {}) {
  const { library, limit = 20, style = 'any' } = options;
  const libraryMode = normalizeSearchLibraryMode(options.libraryMode);
  const normalizedStyle = normalizeRequestedStyle(style);

  // Library filter
  let filtered = Array.isArray(options.candidatePool) ? options.candidatePool : icons;
  if (library && libraryMode === 'strict') {
    filtered = filtered.filter(icon => icon.lib === library);
  }
  filtered = filtered.filter((icon) => iconMatchesRequestedStyle(icon, normalizedStyle));

  if (!query || !query.trim()) {
    return filtered.slice(0, limit);
  }

  const normalizedQuery = normalizeSemanticText(query);
  if (!normalizedQuery) return [];
  const queryWords = tokenizeSemanticText(query);
  const fuzzyCorrectionWords = getFuzzyCorrectionWords(query, synonyms);
  const termSets = expandSearchTerms(normalizedQuery, synonyms, {
    allowValueFuzzy: options.allowFuzzyCorrection === true,
  });
  const hasSingleWordFuzzyCorrection = options.allowFuzzyCorrection === true
    && queryWords.length === 1
    && fuzzyCorrectionWords.has(queryWords[0]);

  // Helper: check if icon matches a set of term-sets
  const iconMatchesTermSets = (icon, sets) => {
    const { lowerName: name, lowerId: id, segments } = getIconSearchMetadata(icon);
    return sets.every(terms =>
      terms.some(term => {
        const normalizedTerm = normalizeSemanticText(term);
        const termWords = tokenizeSemanticText(normalizedTerm);
        if (termWords.length <= 1) {
          return segments.some((segment) => segment === normalizedTerm);
        }
        return name.includes(normalizedTerm) || id.includes(normalizedTerm);
      })
    );
  };

  // Tier 1: direct query words match
  const tier1 = filtered
    .map((icon) => ({
      icon,
      aliasScore: getCuratedAliasScore(icon, normalizedQuery, queryWords),
      directScore: getDirectSearchScore(icon, normalizedQuery, queryWords),
    }))
    .filter(({ aliasScore, directScore }) => aliasScore > 0 || directScore > 0)
    .sort((a, b) => {
      if (b.aliasScore !== a.aliasScore) return b.aliasScore - a.aliasScore;
      if (b.directScore !== a.directScore) return b.directScore - a.directScore;

      const rankDiff = getIconJobRank(a.icon) - getIconJobRank(b.icon);
      if (rankDiff !== 0) return rankDiff;

      return a.icon.name.localeCompare(b.icon.name);
    })
    .map(({ icon }) => icon);
  const tier1Keys = new Set(tier1.map((i) => iconKey(i)));

  // Tier 2: synonym expansion matches
  const tier2 = filtered.filter(icon =>
    !tier1Keys.has(iconKey(icon))
    && iconMatchesTermSets(icon, termSets)
    && (
      options.applyConfidenceFloor !== true
      || (queryWords.length <= 1 && !hasSingleWordFuzzyCorrection)
      || (
        queryWords.length === 1
        && iconMatchesOriginalQueryConcept(icon, query, 1, fuzzyCorrectionWords)
      )
      || iconMatchesOriginalQueryConcept(icon, query, 2, fuzzyCorrectionWords)
    )
  );

  const merged = [...tier1, ...tier2];
  if (normalizedStyle !== 'any') {
    return rerankSearchCandidatesAtFusion(query, merged, {
      libraryMode,
      requestedLibrary: library,
      applyExpressiveFallback: options.applyExpressiveFallback,
    }).slice(0, limit);
  }

  const selected = new Map();
  const orderedKeys = [];

  for (const icon of merged) {
    const conceptKey = getConceptKeyForIcon(icon) || iconKey(icon);
    const existing = selected.get(conceptKey);

    if (!existing) {
      selected.set(conceptKey, icon);
      orderedKeys.push(conceptKey);
      continue;
    }

    if (compareVariantPreference(existing, icon, normalizedStyle) > 0) {
      selected.set(conceptKey, icon);
    }
  }

  return rerankSearchCandidatesAtFusion(
    query,
    orderedKeys.map((key) => selected.get(key)),
    {
      libraryMode,
      requestedLibrary: library,
      applyExpressiveFallback: options.applyExpressiveFallback,
    },
  ).slice(0, limit);
}
