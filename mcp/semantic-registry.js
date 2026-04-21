import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PUBLIC_SEMANTIC_FIELDS = Object.freeze([
  'label',
  'purpose',
  'category',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
  'depicts',
  'intent',
  'domain',
  'confidence',
]);

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

function buildPossibleRegistryIds(library, id) {
  const baseId = `${library}:${id}`;
  const ids = [baseId];

  if (library === 'mingcute') {
    const normalizedId = String(id || '').replace(/_(line|fill)$/i, '');
    if (normalizedId && normalizedId !== id) {
      ids.push(`${library}:${normalizedId}`);
    }
  }

  return ids;
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

  const weightedSources = [
    { value: semanticRecord.label, weight: 6 },
    { value: semanticRecord.category, weight: 6 },
    { value: semanticRecord.intent, weight: 5 },
    { value: semanticRecord.domain, weight: 5 },
    { value: semanticRecord.depicts, weight: 4 },
    { value: semanticRecord.purpose, weight: 4 },
    { value: semanticRecord.use_when, weight: 3 },
    { value: semanticRecord.avoid_when, weight: 2 },
  ];

  let score = 0;

  for (const tag of semanticRecord.semantic_tags || []) {
    const normalized = normalizeText(tag);
    for (const token of queryTokens) {
      if (normalized === token) score += 8;
      else if (normalized.includes(token)) score += 5;
    }
  }

  for (const synonym of semanticRecord.synonyms || []) {
    const normalized = normalizeText(synonym);
    for (const token of queryTokens) {
      if (normalized === token) score += 7;
      else if (normalized.includes(token)) score += 4;
    }
  }

  for (const source of weightedSources) {
    const normalized = normalizeText(source.value);
    if (!normalized) continue;
    for (const token of queryTokens) {
      if (normalized === token) score += source.weight + 2;
      else if (normalized.includes(token)) score += source.weight;
    }
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
