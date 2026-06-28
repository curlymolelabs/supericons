import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { getBaseSemanticIdsForVariant } from './variant-support.js';

const PUBLIC_SEMANTIC_FIELDS = Object.freeze([
  'id',
  'source_library',
  'label',
  'name',
  'slug',
  'source_name',
  'purpose',
  'category',
  'asset_type',
  'pack',
  'source_url',
  'source_trust',
  'meaning',
  'depicts',
  'semantic_tags',
  'ai_category',
  'ai_category_label',
  'ai_filter_tags',
  'job_category',
  'secondary_categories',
  'synonyms',
  'aliases',
  'search_terms',
  'filter_tags',
  'use_when',
  'avoid_when',
  'rights',
  'variants',
  'quality_status',
  'access',
]);
const LOGO_INTENT_TOKENS = new Set(['logo', 'logos', 'icon', 'icons', 'brand', 'brands', 'mark', 'marks', 'symbol', 'symbols']);
const GENERIC_AI_TOKENS = new Set(['ai', 'artificial', 'intelligence']);

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ') : [];
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function getMeaningfulQueryTokens(queryTokens) {
  const withoutLogoIntent = queryTokens.filter((token) => !LOGO_INTENT_TOKENS.has(token));
  const candidateTokens = withoutLogoIntent.length > 0 ? withoutLogoIntent : queryTokens;
  const withoutGenericAi = candidateTokens.length > 1
    ? candidateTokens.filter((token) => !GENERIC_AI_TOKENS.has(token))
    : candidateTokens;

  return withoutGenericAi.length > 0 ? withoutGenericAi : candidateTokens;
}

function buildQueryPhraseVariants(queryTokens, meaningfulTokens) {
  const variants = [
    queryTokens.join(' '),
    meaningfulTokens.join(' '),
  ];

  for (let size = Math.min(4, meaningfulTokens.length); size >= 2; size -= 1) {
    for (let index = 0; index <= meaningfulTokens.length - size; index += 1) {
      variants.push(meaningfulTokens.slice(index, index + size).join(' '));
    }
  }

  return uniqueStrings(variants).filter((variant) => variant.length > 2);
}

function scoreSemanticValue(value, weight, phraseVariants, meaningfulTokens) {
  const normalized = normalizeText(value);
  if (!normalized) return 0;

  let score = 0;

  for (const phrase of phraseVariants) {
    if (normalized === phrase) {
      score = Math.max(score, weight * 4);
      continue;
    }

    if (phrase.length > 2 && normalized.includes(phrase)) {
      score = Math.max(score, weight * 2.6);
      continue;
    }

    if (normalized.length > 2 && phrase.includes(normalized) && tokenize(normalized).length > 1) {
      score = Math.max(score, weight * 1.6);
    }
  }

  if (meaningfulTokens.length > 0) {
    const valueTokens = new Set(tokenize(normalized));
    const exactHits = meaningfulTokens.filter((token) => valueTokens.has(token)).length;
    const includesHits = meaningfulTokens.filter((token) => normalized.includes(token)).length;

    if (exactHits === meaningfulTokens.length) {
      score = Math.max(score, weight * 1.8);
    } else if (includesHits > 0) {
      score += includesHits * weight * 0.35;
    }
  }

  return score;
}

function scoreSemanticValues(values, weight, phraseVariants, meaningfulTokens) {
  if (!Array.isArray(values)) return 0;
  return values.reduce(
    (total, value) => total + scoreSemanticValue(value, weight, phraseVariants, meaningfulTokens),
    0,
  );
}

function buildPossibleRegistryIds(library, id) {
  return getBaseSemanticIdsForVariant({ library, id });
}

function getPrimaryRegistryId(iconOrLibrary, maybeId) {
  if (typeof iconOrLibrary === 'object' && iconOrLibrary) {
    return `${iconOrLibrary.lib}:${iconOrLibrary.id}`;
  }
  return `${iconOrLibrary}:${maybeId}`;
}

function getPossibleRegistryIds(iconOrLibrary, maybeId) {
  if (typeof iconOrLibrary === 'object' && iconOrLibrary) {
    return buildPossibleRegistryIds(iconOrLibrary.lib, iconOrLibrary.id);
  }
  return buildPossibleRegistryIds(iconOrLibrary, maybeId);
}

export function loadSemanticRegistryRecords(dataDir) {
  const recordsPath = join(dataDir, 'registry-records.json');
  if (!existsSync(recordsPath)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(recordsPath, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

export function createSemanticRegistryMap(records) {
  return new Map(records.map((record) => [record.icon_id, record]));
}

export function buildPublicSemanticPayload(record) {
  if (!record) return null;

  const payload = {};
  for (const field of PUBLIC_SEMANTIC_FIELDS) {
    if (!(field in record)) continue;
    const value = record[field];
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && value.trim().length === 0) continue;
    payload[field] = value;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

export function getSemanticRecordForIcon(semanticMap, iconOrLibrary, maybeId) {
  for (const registryId of getPossibleRegistryIds(iconOrLibrary, maybeId)) {
    const record = semanticMap.get(registryId);
    if (record) return record;
  }
  return null;
}

export function attachSemanticPayload(target, semanticMap, iconOrLibrary, maybeId) {
  const semanticRecord = getSemanticRecordForIcon(semanticMap, iconOrLibrary, maybeId);
  const semantic = buildPublicSemanticPayload(semanticRecord);
  return semantic ? { ...target, semantic } : target;
}

export function scoreSemanticAlignment(query, semanticRecord) {
  if (!semanticRecord) return 0;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return 0;

  const meaningfulTokens = getMeaningfulQueryTokens(queryTokens);
  const phraseVariants = buildQueryPhraseVariants(queryTokens, meaningfulTokens);
  const hasLogoIntent = queryTokens.some((token) => LOGO_INTENT_TOKENS.has(token));
  const isSupericonsBrandLogo = semanticRecord.source_library === 'si'
    && (
      semanticRecord.asset_type === 'brand-logo'
      || semanticRecord.ai_filter_tags?.includes('brand-logo')
      || semanticRecord.filter_tags?.includes('brand-logo')
    );
  let score = 0;

  score += scoreSemanticValue(semanticRecord.label, 24, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.name, 24, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.source_name, 22, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.aliases, 22, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.synonyms, 21, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.semantic_tags, 19, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.search_terms, 18, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.meaning, 16, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.purpose, 15, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.ai_filter_tags, 14, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.filter_tags, 13, phraseVariants, meaningfulTokens);
  score += scoreSemanticValues(semanticRecord.secondary_categories, 12, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.ai_category_label, 10, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.job_category, 10, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.category, 8, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.depicts, 8, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.use_when, 8, phraseVariants, meaningfulTokens);
  score += scoreSemanticValue(semanticRecord.avoid_when, 1, phraseVariants, meaningfulTokens);

  if (hasLogoIntent && isSupericonsBrandLogo) {
    score += 10;
  }

  const identityValues = uniqueStrings([
    semanticRecord.label,
    semanticRecord.name,
    semanticRecord.source_name,
    ...(semanticRecord.aliases || []),
    ...(semanticRecord.synonyms || []),
  ]);
  const meaningfulQuery = meaningfulTokens.join(' ');
  if (hasLogoIntent && identityValues.some((value) => value === meaningfulQuery)) {
    score += 80;
  }

  return score;
}

export function chooseSemanticCandidate(query, icons, semanticMap) {
  const scored = icons
    .map((icon, index) => {
      const semanticRecord = getSemanticRecordForIcon(semanticMap, icon);
      return {
        icon,
        index,
        semanticRecord,
        score: scoreSemanticAlignment(query, semanticRecord),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.index - right.index;
    });

  return scored[0] || null;
}

export function searchSemanticRegistryRecords(query, semanticMap, options = {}) {
  const { limit = 20, minimumScore = 12 } = options;
  const normalizedLimit = Math.max(1, limit);

  const scored = [...semanticMap.values()]
    .map((record) => ({
      record,
      score: scoreSemanticAlignment(query, record),
    }))
    .filter((entry) => entry.score >= minimumScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.record.icon_id.localeCompare(right.record.icon_id);
    });

  return scored.slice(0, normalizedLimit);
}

export function mergeSemanticMatchesIntoIcons(query, baselineIcons, searchableIcons, semanticMap, options = {}) {
  const { limit = 20, minimumScore = 12 } = options;
  const normalizedLimit = Math.max(1, limit);
  const baseline = Array.isArray(baselineIcons) ? baselineIcons : [];
  const searchable = Array.isArray(searchableIcons) ? searchableIcons : [];

  const byId = new Map();
  for (const icon of searchable) {
    for (const registryId of getPossibleRegistryIds(icon)) {
      if (!byId.has(registryId)) {
        byId.set(registryId, icon);
      }
    }
  }
  const merged = [];
  const seen = new Set();

  const semanticMatches = searchSemanticRegistryRecords(query, semanticMap, {
    limit: normalizedLimit,
    minimumScore,
  });

  for (const match of semanticMatches) {
    const icon = byId.get(match.record.icon_id);
    if (!icon) continue;
    const registryId = getPrimaryRegistryId(icon);
    if (seen.has(registryId)) continue;
    merged.push(icon);
    seen.add(registryId);
  }

  for (const icon of baseline) {
    const registryId = getPrimaryRegistryId(icon);
    if (seen.has(registryId)) continue;
    merged.push(icon);
    seen.add(registryId);
  }

  return merged.slice(0, normalizedLimit);
}
