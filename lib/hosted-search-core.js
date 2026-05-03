function uniqueNormalizedStrings(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = normalizeSearchEngineQuery(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

export function normalizeSearchEngineQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeSearchEngineText(value) {
  const normalized = normalizeSearchEngineQuery(value);
  return normalized ? normalized.split(' ') : [];
}

export function buildHostedSearchCatalogRows(icons = []) {
  return icons.map((icon) => {
    const iconId = `${icon.lib}:${icon.id}`;
    const searchText = normalizeSearchEngineQuery([
      icon.name,
      icon.id,
      icon.lib,
      icon.style || 'outline',
      icon.type || 'svg',
    ].join(' '));

    return {
      icon_id: iconId,
      name: icon.name,
      source_library: icon.lib,
      style: icon.style || 'outline',
      icon_type: icon.type || 'svg',
      svg: typeof icon.svg === 'string' ? icon.svg : null,
      search_text: searchText,
    };
  });
}

export function buildHostedSearchManifestSeedRows(aliasMap) {
  const entries = aliasMap instanceof Map
    ? [...aliasMap.entries()]
    : Object.entries(aliasMap || {});

  return entries.map(([icon_id, semantic_aliases]) => ({
    icon_id,
    semantic_aliases: uniqueNormalizedStrings(semantic_aliases),
    use_cases: [],
    contraindications: [],
    trust_tier: 't1',
    explanation_short: null,
  }));
}

function normalizeNullableText(value) {
  const normalized = normalizeSearchEngineQuery(value);
  return normalized || null;
}

export function buildHostedSearchPublicRegistryRows(records = [], taxonomyByIconId = {}) {
  return records
    .filter((record) => record && typeof record.icon_id === 'string' && record.icon_id.trim())
    .map((record) => {
      const taxonomy = taxonomyByIconId instanceof Map
        ? taxonomyByIconId.get(record.icon_id)
        : taxonomyByIconId[record.icon_id];

      return {
        icon_id: record.icon_id,
        label: normalizeNullableText(record.label),
        purpose: normalizeNullableText(record.purpose),
        category: normalizeNullableText(record.category),
        semantic_tags: uniqueNormalizedStrings(record.semantic_tags),
        synonyms: uniqueNormalizedStrings(record.synonyms),
        use_when: normalizeNullableText(record.use_when),
        avoid_when: normalizeNullableText(record.avoid_when),
        depicts: normalizeNullableText(record.depicts),
        job_category: normalizeNullableText(taxonomy?.jobCategory),
        secondary_categories: uniqueNormalizedStrings(taxonomy?.secondaryCategories),
        taxonomy_rank: Number.isFinite(Number(taxonomy?.rank)) ? Number(taxonomy.rank) : null,
      };
    });
}

function normalizeRegistrySourceName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .trim();
}

function normalizeDashedId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .trim();
}

export function resolveHostedSearchRegistryIconId(record, catalogIconIds = new Set()) {
  if (!record || typeof record !== 'object') return null;

  const directIconId = String(record.icon_id || '').trim();
  if (directIconId && catalogIconIds.has(directIconId)) return directIconId;

  const sourceLibrary = String(record.source_library || directIconId.split(':')[0] || '').trim().toLowerCase();
  const rawSourceName = normalizeRegistrySourceName(
    record.source_name || directIconId.split(':')[1] || '',
  );

  if (!sourceLibrary || !rawSourceName) return null;

  const candidates = [
    `${sourceLibrary}:${normalizeDashedId(rawSourceName)}`,
    `${sourceLibrary}:${rawSourceName}`,
    `${sourceLibrary}:${rawSourceName}_line`,
    `${sourceLibrary}:${rawSourceName}_outline`,
    `${sourceLibrary}:${rawSourceName}_fill`,
    `${sourceLibrary}:${normalizeDashedId(rawSourceName)}-line`,
    `${sourceLibrary}:${normalizeDashedId(rawSourceName)}-outline`,
    `${sourceLibrary}:${normalizeDashedId(rawSourceName)}-fill`,
  ];

  for (const candidate of candidates) {
    if (catalogIconIds.has(candidate)) return candidate;
  }

  return null;
}

export function indexRowsByIconId(rows = []) {
  return new Map(
    rows
      .filter((row) => row && typeof row.icon_id === 'string' && row.icon_id.length > 0)
      .map((row) => [row.icon_id, row]),
  );
}

function countTokenHits(values, queryNorm, queryTokens) {
  if (!Array.isArray(values) || values.length === 0 || !queryNorm) return 0;

  let bestScore = 0;

  for (const value of values) {
    const normalized = normalizeSearchEngineQuery(value);
    if (!normalized) continue;

    if (normalized === queryNorm) {
      bestScore = Math.max(bestScore, 3);
      continue;
    }

    if (normalized.includes(queryNorm)) {
      bestScore = Math.max(bestScore, 2);
      continue;
    }

    if (queryTokens.length > 0) {
      const tokens = new Set(tokenizeSearchEngineText(normalized));
      if (queryTokens.every((token) => tokens.has(token))) {
        bestScore = Math.max(bestScore, 1.5);
        continue;
      }
      if (queryTokens.every((token) => normalized.includes(token))) {
        bestScore = Math.max(bestScore, 1);
      }
    }
  }

  return bestScore;
}

function trustTierWeight(value) {
  if (value === 't3') return 1.5;
  if (value === 't2') return 1.0;
  if (value === 't1') return 0.5;
  return 0;
}

function roundScore(value) {
  return Math.round(value * 1000) / 1000;
}

export function rerankHostedSearchCandidates(query, candidates = [], manifestsById = new Map(), featuresById = new Map()) {
  const queryNorm = normalizeSearchEngineQuery(query);
  const queryTokens = tokenizeSearchEngineText(queryNorm);

  if (!queryNorm) return [];

  return candidates
    .map((candidate) => {
      const manifest = manifestsById.get(candidate.icon_id);
      const feature = featuresById.get(candidate.icon_id);

      const aliasHits = countTokenHits(manifest?.semantic_aliases, queryNorm, queryTokens);
      const useCaseHits = countTokenHits(manifest?.use_cases, queryNorm, queryTokens);
      const contraindicationHits = countTokenHits(manifest?.contraindications, queryNorm, queryTokens);

      const finalScore = roundScore(
        ((candidate.lexical_rank || 0) * 100)
        + ((candidate.registry_rank || 0) * 85)
        + (aliasHits * 90)
        + (useCaseHits * 40)
        + ((feature?.popularity_score || 0) * 0.25)
        + ((feature?.behavioral_score || 0) * 0.35)
        + ((feature?.editorial_score || 0) * 0.5)
        + trustTierWeight(manifest?.trust_tier || 't0')
        + (feature?.manual_boost || 0)
        + (candidate.intent_boost || 0)
        - (
          (feature?.manual_penalty || 0)
          + (candidate.intent_penalty || 0)
          + ((feature?.replace_risk_score || 0) * 20)
          + (contraindicationHits * 20)
          + ((candidate.avoid_rank || 0) * 35)
        )
      );

      return {
        icon_id: candidate.icon_id,
        name: candidate.name,
        library: candidate.source_library,
        source_library: candidate.source_library,
        style: candidate.style,
        icon_type: candidate.icon_type,
        svg: candidate.svg || null,
        score: finalScore,
        explanation: manifest?.explanation_short || null,
        trust_tier: manifest?.trust_tier || 't0',
        match_signals: {
          lexical_rank: candidate.lexical_rank || 0,
          registry_rank: candidate.registry_rank || 0,
          avoid_rank: candidate.avoid_rank || 0,
          query_variant: candidate.query_variant || queryNorm,
          query_variant_rank: candidate.query_variant_rank || 0,
          intent_boost: candidate.intent_boost || 0,
          intent_penalty: candidate.intent_penalty || 0,
          alias_hits: aliasHits,
          use_case_hits: useCaseHits,
          contraindication_hits: contraindicationHits,
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}
