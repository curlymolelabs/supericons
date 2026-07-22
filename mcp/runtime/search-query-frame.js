import { GENERATED_INTENT_GRAPH_GROUPS, GENERATED_INTENT_GRAPH_PHRASES } from './generated-search-intent-graph.js';
import { getSearchInterpretationPlan } from './search-ranking-policy.js';

const LOGO_INTENT_TOKENS = new Set(['logo', 'logos', 'brand', 'brands', 'mark', 'marks']);

const groupsById = new Map(GENERATED_INTENT_GRAPH_GROUPS.map((group) => [group.id, group]));

function unique(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = normalizeQueryFrameText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function uniqueRaw(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function uniqueIdentifiers(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

export function normalizeQueryFrameText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQueryFrameText(value) {
  const normalized = normalizeQueryFrameText(value);
  return normalized ? normalized.split(' ') : [];
}

function phraseMatchesQuery(phrase, normalizedQuery) {
  if (!phrase || !normalizedQuery) return false;
  if (phrase === normalizedQuery) return true;

  const paddedPhrase = ` ${phrase} `;
  const paddedQuery = ` ${normalizedQuery} `;
  return paddedQuery.includes(paddedPhrase);
}

function getMatchedPhraseEntries(normalizedQuery) {
  const seen = new Set();
  const matches = [];

  for (const entry of GENERATED_INTENT_GRAPH_PHRASES) {
    if (!phraseMatchesQuery(entry.normalized, normalizedQuery)) continue;
    const key = `${entry.groupId}:${entry.normalized}:${entry.locale}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matches.push(entry);
  }

  const suppressedGroupIds = new Set(matches.flatMap((match) => groupsById.get(match.groupId)?.suppressGroups || []));
  return matches
    .filter((match) => !suppressedGroupIds.has(match.groupId))
    .sort((left, right) => right.normalized.length - left.normalized.length);
}

function resolveLanguage(matches, fallbackLanguage) {
  if (fallbackLanguage) return fallbackLanguage;
  const localizedMatch = matches.find((match) => match.locale && match.locale !== 'en');
  return localizedMatch?.locale || 'en';
}

function getConfidenceFloor(groups, interpretationPlan) {
  if (groups.some((group) => group.confidenceFloor === 'high')) return 'high';
  if (groups.some((group) => group.confidenceFloor === 'medium')) return 'medium';
  if (interpretationPlan && !interpretationPlan.needs_clarification) return 'medium';
  return 'low';
}

export function buildSearchQueryFrame(query, options = {}) {
  const normalizedQuery = normalizeQueryFrameText(query);
  const tokens = tokenizeQueryFrameText(normalizedQuery);
  const matchedPhrases = getMatchedPhraseEntries(normalizedQuery);
  const matchedGroupIds = uniqueRaw(matchedPhrases.map((entry) => entry.groupId));
  const matchedGroups = matchedGroupIds.map((id) => groupsById.get(id)).filter(Boolean);
  const interpretationPlan = getSearchInterpretationPlan(query, {
    context: options.context,
  });
  const interpretations = (interpretationPlan?.families || []).map((family) => ({
    family_id: family.id,
    label: family.label,
  }));
  const interpretationFamilyIds = interpretations.map((entry) => entry.family_id);
  const hasLogoIntent = tokens.some((token) => LOGO_INTENT_TOKENS.has(token));
  const intentTypes = uniqueIdentifiers([
    ...(hasLogoIntent ? ['brand_logo'] : []),
    ...matchedGroups.flatMap((group) => group.intentTypes || []),
    ...(interpretationPlan?.intent_types || []),
    ...(matchedGroups.length === 0 && !hasLogoIntent && !interpretationPlan ? ['unclassified'] : []),
  ]);

  return {
    raw_query: String(query || ''),
    normalized_query: normalizedQuery,
    language: resolveLanguage(matchedPhrases, options.locale || options.language || null),
    tokens,
    intent_types: intentTypes,
    meaning_groups: matchedGroupIds,
    domain_terms: unique(matchedGroups.flatMap((group) => group.domains || [])),
    facets: uniqueIdentifiers(matchedGroups.flatMap((group) => group.facets || [])),
    objects: unique(matchedGroups.flatMap((group) => group.objects || [])),
    actions: unique(matchedGroups.flatMap((group) => group.actions || [])),
    devices: unique(matchedGroups.flatMap((group) => group.devices || [])),
    positive_concepts: unique(matchedGroups.flatMap((group) => group.positiveConcepts || [])),
    avoid_concepts: unique(matchedGroups.flatMap((group) => group.avoidConcepts || [])),
    fallback_terms: unique(matchedGroups.flatMap((group) => group.fallbackTerms || [])),
    result_families: uniqueIdentifiers([
      ...matchedGroups.flatMap((group) => group.resultFamilies || []),
      ...interpretationFamilyIds,
    ]),
    interpretation_family_ids: interpretationFamilyIds,
    interpretations,
    interpretation_status: interpretationPlan?.interpretation_status || 'none',
    needs_clarification: Boolean(interpretationPlan?.needs_clarification),
    gap_strategies: uniqueRaw(matchedGroups.map((group) => group.gapStrategy)),
    confidence_floor: getConfidenceFloor(matchedGroups, interpretationPlan),
    match_reasons: [
      ...matchedPhrases.map((match) => ({
        type: 'intent_group',
        group_id: match.groupId,
        phrase: match.phrase,
        locale: match.locale,
      })),
      ...(interpretationPlan
        ? [
            {
              type: 'ranking_policy',
              policy_id: interpretationPlan.policy_id,
              trigger: interpretationPlan.trigger,
            },
          ]
        : []),
    ],
    is_brand_logo_query: hasLogoIntent,
    matched: matchedGroups.length > 0 || hasLogoIntent || Boolean(interpretationPlan),
  };
}

export function getIntentGraphGroups() {
  return GENERATED_INTENT_GRAPH_GROUPS;
}
