import { GENERATED_SEARCH_RANKING_POLICY } from './generated-search-ranking-policy.js';

const policy = GENERATED_SEARCH_RANKING_POLICY;
const familyById = new Map(
  (policy.interpretation_families || []).map((family) => [family.id, family]),
);
const brandIntentTerms = new Set(policy.brand_intent_terms || []);

export function normalizeSearchRankingText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  const normalized = normalizeSearchRankingText(value);
  return normalized ? normalized.split(' ') : [];
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeSearchLibraryMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'prefer' || normalized === 'all') return normalized;
  return 'strict';
}

function includesPhrase(text, phrase) {
  if (!text || !phrase) return false;
  return ` ${text} `.includes(` ${phrase} `);
}

function findQueryPolicy(normalizedQuery) {
  for (const queryPolicy of policy.query_policies || []) {
    for (const rawTrigger of queryPolicy.trigger_terms || []) {
      const trigger = normalizeSearchRankingText(rawTrigger);
      if (!trigger) continue;
      if (queryPolicy.match === 'exact' && normalizedQuery === trigger) return { queryPolicy, trigger };
      if (queryPolicy.match === 'token' && includesPhrase(normalizedQuery, trigger)) return { queryPolicy, trigger };
    }
  }
  return null;
}

function getContextFamilyIds(queryPolicy, normalizedQuery) {
  const order = queryPolicy.context_family_order || queryPolicy.bare_query_family_ids || [];
  return order
    .map((familyId, index) => {
      const family = familyById.get(familyId);
      const score = (family?.context_terms || []).reduce((sum, term) => (
        includesPhrase(normalizedQuery, normalizeSearchRankingText(term)) ? sum + 1 : sum
      ), 0);
      return { familyId, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.familyId);
}

export function getSearchInterpretationPlan(query) {
  const normalizedQuery = normalizeSearchRankingText(query);
  if (!normalizedQuery) return null;

  const match = findQueryPolicy(normalizedQuery);
  if (!match) return null;

  const isBareQuery = normalizedQuery === match.trigger;
  const contextualFamilyIds = isBareQuery
    ? []
    : getContextFamilyIds(match.queryPolicy, normalizedQuery);
  const familyIds = unique(
    contextualFamilyIds.length > 0
      ? contextualFamilyIds
      : match.queryPolicy.bare_query_family_ids || [],
  );
  const retrievalOverrides = match.queryPolicy.retrieval_queries_by_trigger?.[match.trigger] || {};
  const families = familyIds
    .map((familyId) => {
      const family = familyById.get(familyId);
      if (!family) return null;
      const retrievalQueries = retrievalOverrides[familyId];
      return retrievalQueries?.length
        ? { ...family, retrieval_queries: retrievalQueries }
        : family;
    })
    .filter(Boolean);

  return {
    policy_id: match.queryPolicy.id,
    normalized_query: normalizedQuery,
    trigger: match.trigger,
    is_bare_query: isBareQuery,
    minimum_distinct_families_top_8: isBareQuery
      ? Number(match.queryPolicy.minimum_distinct_families_top_8 || 1)
      : 1,
    families,
  };
}

export function buildSearchRankingQueryVariants(query, baseVariants = [], options = {}) {
  const maxVariants = Math.max(1, Number(options.maxVariants || 16));
  const plan = getSearchInterpretationPlan(query);
  const variants = unique([
    ...baseVariants.map(normalizeSearchRankingText),
    normalizeSearchRankingText(query),
    ...(plan?.families || []).map((family) => normalizeSearchRankingText(family.retrieval_queries?.[0])),
  ]);
  return variants.slice(0, maxVariants);
}

function getCandidateIconRef(candidate = {}) {
  if (candidate.icon_id) return String(candidate.icon_id).toLowerCase();
  if (candidate.lib && candidate.id) return `${candidate.lib}:${candidate.id}`.toLowerCase();
  return '';
}

function getCandidateText(candidate = {}) {
  return normalizeSearchRankingText([
    candidate.icon_id,
    candidate.lib,
    candidate.id,
    candidate.name,
    candidate.label,
    candidate.meaning,
    candidate.query_variant,
    ...(candidate.semanticTags || []),
    ...(candidate.synonyms || []),
    ...(candidate.aliases || []),
    ...(candidate.searchTerms || []),
    ...(candidate.filterTags || []),
    ...(candidate.aiFilterTags || []),
  ].filter(Boolean).join(' '));
}

function isLikelyBrandCandidate(candidate, iconRef) {
  return iconRef.startsWith('simpleicons:')
    || iconRef.includes(':brand-')
    || candidate.assetType === 'brand-logo'
    || candidate.filterTags?.includes('brand-logo')
    || candidate.aiFilterTags?.includes('brand-logo');
}

function getCandidateBrandIdentity(candidate, iconRef) {
  const rawId = candidate.id || iconRef.split(':')[1] || '';
  return normalizeSearchRankingText(String(rawId).replace(/^brand[-_]/i, ''));
}

function getMeaningfulBrandQuery(query) {
  const tokens = tokenize(query);
  return tokens.filter((token) => !brandIntentTerms.has(token)).join(' ');
}

function hasBrandIntent(query) {
  return tokenize(query).some((token) => brandIntentTerms.has(token));
}

export function getBrandRankAdjustment(query, candidate = {}) {
  const iconRef = getCandidateIconRef(candidate);
  if (!iconRef) return { boost: 0, penalty: 0, match_class: null };

  const meaningfulQuery = getMeaningfulBrandQuery(query);
  const explicitBrandIntent = hasBrandIntent(query);

  for (const brandTerm of policy.brand_terms || []) {
    const iconRefs = (brandTerm.icon_refs || []).map((value) => String(value).toLowerCase());
    if (!iconRefs.includes(iconRef)) continue;

    const maintainedTerms = [brandTerm.term, ...(brandTerm.aliases || [])]
      .map(normalizeSearchRankingText)
      .filter(Boolean);
    const exactMatch = maintainedTerms.includes(meaningfulQuery);
    const substringMatch = meaningfulQuery.length >= 3 && maintainedTerms.some((term) => (
      term.includes(meaningfulQuery) || meaningfulQuery.includes(term)
    ));

    if (exactMatch) {
      if (brandTerm.match_class === 'distinctive_exact' || explicitBrandIntent) {
        return { boost: 300, penalty: 0, match_class: brandTerm.match_class };
      }
      return { boost: 0, penalty: 20, match_class: brandTerm.match_class };
    }

    if (substringMatch && !explicitBrandIntent) {
      return { boost: 0, penalty: 1000, match_class: 'prefix_or_substring' };
    }
  }

  if (isLikelyBrandCandidate(candidate, iconRef)) {
    const identity = getCandidateBrandIdentity(candidate, iconRef);
    if (identity && identity === meaningfulQuery) {
      return { boost: 160, penalty: 0, match_class: 'distinctive_exact' };
    }
    if (
      !explicitBrandIntent
      && meaningfulQuery.length >= 3
      && identity
      && (identity.includes(meaningfulQuery) || meaningfulQuery.includes(identity))
    ) {
      return { boost: 0, penalty: 1000, match_class: 'prefix_or_substring' };
    }
  }

  return { boost: 0, penalty: 0, match_class: null };
}

export function getMeaningPolicyPenalty(query, candidate = {}) {
  const normalizedQuery = normalizeSearchRankingText(query);
  const match = findQueryPolicy(normalizedQuery);
  if (!match) return 0;
  const candidateText = getCandidateText(candidate);
  const avoidTerms = [
    ...(match.queryPolicy.avoid_candidate_terms || []),
    ...(match.queryPolicy.avoid_candidate_terms_by_trigger?.[match.trigger] || []),
  ];
  return avoidTerms.some((term) => (
    includesPhrase(candidateText, normalizeSearchRankingText(term))
  )) ? 1000 : 0;
}

export function rerankSearchCandidatesAtFusion(query, candidates = [], options = {}) {
  const libraryMode = normalizeSearchLibraryMode(options.libraryMode);
  const requestedLibrary = String(options.requestedLibrary || options.library || '').trim().toLowerCase();
  const scored = candidates
    .map((candidate, index) => {
      const brandAdjustment = getBrandRankAdjustment(query, candidate);
      const meaningPenalty = getMeaningPolicyPenalty(query, candidate);
      return {
        candidate,
        index,
        policyScore: brandAdjustment.boost - brandAdjustment.penalty - meaningPenalty,
        strongPenalty: brandAdjustment.penalty + meaningPenalty >= 1000,
      };
    })
    .filter((entry) => {
      if (entry.strongPenalty) return false;
      if (libraryMode !== 'strict' || !requestedLibrary) return true;
      const library = String(entry.candidate.lib || entry.candidate.library || entry.candidate.source_library || '').toLowerCase();
      return library === requestedLibrary;
    })
    .sort((left, right) => right.policyScore - left.policyScore || left.index - right.index);

  if (libraryMode === 'prefer' && requestedLibrary && scored.length > 1 && scored[0].policyScore <= 0) {
    const preferredIndex = scored.findIndex((entry) => {
      const library = String(entry.candidate.lib || entry.candidate.library || entry.candidate.source_library || '').toLowerCase();
      return library === requestedLibrary;
    });
    if (preferredIndex > 0) {
      scored.unshift(...scored.splice(preferredIndex, 1));
    }

    const alternativeIndex = scored.findIndex((entry, index) => {
      if (index === 0) return false;
      const library = String(entry.candidate.lib || entry.candidate.library || entry.candidate.source_library || '').toLowerCase();
      return library !== requestedLibrary;
    });
    if (alternativeIndex > 1) {
      scored.splice(1, 0, ...scored.splice(alternativeIndex, 1));
    }
  }

  return scored.map((entry) => entry.candidate);
}

export function getCandidateInterpretationFamilyIds(query, candidate = {}) {
  const plan = getSearchInterpretationPlan(query);
  if (!plan) return [];

  const queryVariant = normalizeSearchRankingText(candidate.query_variant);
  const candidateText = getCandidateText(candidate);
  const iconRef = getCandidateIconRef(candidate);
  const familyIds = [];

  for (const family of plan.families) {
    const retrievalQueries = (family.retrieval_queries || []).map(normalizeSearchRankingText);
    const candidateTerms = (family.candidate_terms || []).map(normalizeSearchRankingText);
    const candidateIconRefs = (family.candidate_icon_refs || []).map((value) => String(value).toLowerCase());
    const matchedVariant = queryVariant && retrievalQueries.includes(queryVariant);
    const matchedCandidate = candidateTerms.some((term) => includesPhrase(candidateText, term));
    const matchedIconRef = candidateIconRefs.includes(iconRef);
    const matchedBrand = family.id === 'brand_identity' && (policy.brand_terms || []).some((brandTerm) => (
      (brandTerm.icon_refs || []).map((value) => String(value).toLowerCase()).includes(iconRef)
    ));
    if (matchedVariant || matchedCandidate || matchedIconRef || matchedBrand) familyIds.push(family.id);
  }

  return unique(familyIds);
}

export function diversifyRankedSearchCandidates(query, rankedCandidates = []) {
  const plan = getSearchInterpretationPlan(query);
  if (!plan || plan.minimum_distinct_families_top_8 < 2 || rankedCandidates.length < 2) {
    return rankedCandidates;
  }

  const selected = [];
  const selectedRefs = new Set();
  for (const family of plan.families) {
    const candidate = rankedCandidates.find((entry) => (
      !selectedRefs.has(getCandidateIconRef(entry))
      && (entry.match_signals?.interpretation_family_ids || []).includes(family.id)
    ));
    if (!candidate) continue;
    selected.push(candidate);
    selectedRefs.add(getCandidateIconRef(candidate));
  }

  for (const candidate of rankedCandidates) {
    const iconRef = getCandidateIconRef(candidate);
    if (selectedRefs.has(iconRef)) continue;
    selected.push(candidate);
    selectedRefs.add(iconRef);
  }

  return selected;
}

export function getSearchRankingPolicy() {
  return policy;
}
