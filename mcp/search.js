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

/** Inline Levenshtein distance (capped early for performance) */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev.splice(0, n + 1, ...curr);
  }
  return prev[n];
}

function normalizeSemanticText(value) {
  return normalizeCjkSearchText(value);
}

function tokenizeSemanticText(value) {
  const normalized = normalizeSemanticText(value);
  return normalized ? normalized.split(' ') : [];
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
  ]);
  const segments = lowerId.split(/[-_]/).concat(lowerName.split(/[\s\-_]/));
  const aliases = (getIconSemanticAliases(icon) || [])
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
    segments,
    aliases,
  };

  iconSearchMetadataCache.set(icon, metadata);
  return metadata;
}

function getDirectSearchScore(icon, normalizedQuery, queryWords) {
  if (!normalizedQuery) return 0;

  const { name, id, fullId, tokens } = getIconSearchMetadata(icon);

  if (name === normalizedQuery || id === normalizedQuery || fullId === normalizedQuery) {
    return 320;
  }

  if (normalizedQuery.length > 2 && (
    name.includes(normalizedQuery)
    || id.includes(normalizedQuery)
    || fullId.includes(normalizedQuery)
  )) {
    return 250;
  }

  if (queryWords.length > 0 && queryWords.every((word) => tokens.has(word))) {
    return 190;
  }

  if (queryWords.length > 0 && queryWords.every((word) => (
    name.includes(word) || id.includes(word) || fullId.includes(word)
  ))) {
    return 150;
  }

  return 0;
}

function getCuratedAliasScore(icon, normalizedQuery, queryWords) {
  if (!normalizedQuery) return 0;

  const { aliases } = getIconSearchMetadata(icon);
  if (!aliases?.length) return 0;

  let bestScore = 0;

  for (const alias of aliases) {
    const { normalized: normalizedAlias, tokens: aliasTokens } = alias;
    if (!normalizedAlias) continue;

    if (normalizedAlias === normalizedQuery) {
      bestScore = Math.max(bestScore, 420);
      continue;
    }

    if (normalizedQuery.length > 3 && normalizedAlias.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 360);
      continue;
    }

    if (queryWords.length > 1 && queryWords.every((word) => aliasTokens.has(word))) {
      bestScore = Math.max(bestScore, 320);
      continue;
    }

    if (queryWords.length === 1 && aliasTokens.has(queryWords[0])) {
      bestScore = Math.max(bestScore, 260);
      continue;
    }

    if (queryWords.length > 0 && queryWords.every((word) => normalizedAlias.includes(word))) {
      bestScore = Math.max(bestScore, 220);
    }
  }

  return bestScore;
}

/** Expand a single search word into a set of matching terms */
function expandSingleTerm(word, synonyms) {
  const terms = new Set([word]);

  // 1. Direct key match
  if (synonyms[word]) synonyms[word].forEach(t => terms.add(t));

  // 2. Reverse lookup (word is a value in some group)
  for (const [key, values] of Object.entries(synonyms)) {
    if (values.some(v => v === word || v.split(' ').includes(word))) {
      terms.add(key);
      values.forEach(t => terms.add(t));
    }
  }

  // 3. Prefix matching (word is a prefix of a synonym key, min 3 chars)
  if (word.length >= 3) {
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

  // 5. Fuzzy typo tolerance (edit distance <= 1, only for queries > 4 chars)
  if (terms.size === 1 && word.length > 4) {
    for (const key of Object.keys(synonyms)) {
      if (editDistance(word, key) <= 1) {
        terms.add(key);
        synonyms[key].forEach(t => terms.add(t));
      }
    }
  }

  // Filter out 2-char expansions (keep original word)
  const result = [...terms].filter(t => t === word || t.length > 2);
  return result.slice(0, 20);
}

/** Expand a full search query, returning array of term-sets for AND matching */
function expandSearchTerms(query, synonyms) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.map(w => expandSingleTerm(w, synonyms));
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
  const cjkExpansion = expandCjkQuery(query, {
    locale: options.locale,
    terms: multilingualExpansionTerms,
  });
  const queryVariants = cjkExpansion.variants.length > 0 ? cjkExpansion.variants : [query];
  const hasExpandedCjk = cjkExpansion.matched.length > 0 && queryVariants.length > 1;

  if (hasExpandedCjk) {
    const merged = [];
    const seen = new Set();

    for (const variant of queryVariants.slice(1)) {
      const results = searchIconsForSingleQuery(variant, icons, synonyms, {
        library,
        limit: Math.max(limit * 2, 20),
        style,
      });

      for (const icon of results) {
        const key = iconKey(icon);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(icon);
      }
    }

    return merged.slice(0, Math.max(1, limit));
  }

  return searchIconsForSingleQuery(query, icons, synonyms, options);
}

function searchIconsForSingleQuery(query, icons, synonyms, options = {}) {
  const { library, limit = 20, style = 'any' } = options;
  const normalizedStyle = normalizeRequestedStyle(style);

  // Library filter
  let filtered = icons;
  if (library) {
    filtered = filtered.filter(icon => icon.lib === library);
  }
  filtered = filtered.filter((icon) => iconMatchesRequestedStyle(icon, normalizedStyle));

  if (!query || !query.trim()) {
    return filtered.slice(0, limit);
  }

  const normalizedQuery = normalizeSemanticText(query);
  if (!normalizedQuery) return [];
  const queryWords = tokenizeSemanticText(query);
  const termSets = expandSearchTerms(normalizedQuery, synonyms);

  // Helper: check if icon matches a set of term-sets
  const iconMatchesTermSets = (icon, sets) => {
    const { lowerName: name, lowerId: id, segments } = getIconSearchMetadata(icon);
    return sets.every(terms =>
      terms.some(term => {
        if (term.length <= 3) return segments.some(s => s === term);
        return name.includes(term) || id.includes(term);
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
    !tier1Keys.has(iconKey(icon)) && iconMatchesTermSets(icon, termSets)
  );

  const merged = [...tier1, ...tier2];
  if (normalizedStyle !== 'any') {
    return merged.slice(0, limit);
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

  return orderedKeys.map((key) => selected.get(key)).slice(0, limit);
}
