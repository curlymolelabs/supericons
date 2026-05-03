import { GENERATED_INTENT_RULES } from './generated-search-intent-rules.js';

function unique(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values) {
    const normalized = normalizeIntentText(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

export function normalizeIntentText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeIntentText(value) {
  const normalized = normalizeIntentText(value);
  return normalized ? normalized.split(' ') : [];
}

function compileRule(rule) {
  return {
    variants: rule.variants || [],
    prefer: (rule.prefer || []).map((source) => new RegExp(source, 'i')),
    avoid: (rule.avoid || []).map((source) => new RegExp(source, 'i')),
    avoidUnless: rule.avoidUnless || rule.avoid_unless || [],
  };
}

const INTENT_RULES = Object.freeze(
  Object.fromEntries(
    Object.entries(GENERATED_INTENT_RULES).map(([term, rule]) => [term, compileRule(rule)]),
  ),
);

function getCandidateText(candidate = {}) {
  return [
    candidate.icon_id,
    candidate.id,
    candidate.name,
    candidate.label,
    candidate.source_name,
    candidate.library,
    candidate.source_library,
  ].filter(Boolean).join(' ');
}

function hasOverrideToken(queryTokens, rule) {
  if (!rule?.avoidUnless?.length) return false;
  return rule.avoidUnless.some((token) => queryTokens.has(normalizeIntentText(token)));
}

export function buildSearchIntentProfile(query) {
  const normalized = normalizeIntentText(query);
  const tokens = tokenizeIntentText(normalized);
  const tokenSet = new Set(tokens);
  const activeRules = [];

  for (const token of tokens) {
    const rule = INTENT_RULES[token];
    if (rule) activeRules.push({ token, rule });
  }

  return {
    query: normalized,
    tokens,
    tokenSet,
    activeRules,
    expanded: activeRules.length > 0,
  };
}

export function buildIntentQueryVariants(query, options = {}) {
  const maxVariants = Math.max(1, Math.min(12, Number(options.maxVariants || 8)));
  const normalizedQuery = normalizeIntentText(query);
  const baseQuery = normalizeIntentText(options.baseQuery || normalizedQuery);
  const profile = buildSearchIntentProfile(normalizedQuery);
  const variants = [];

  if (baseQuery) variants.push(baseQuery);
  if (normalizedQuery && normalizedQuery !== baseQuery) variants.push(normalizedQuery);

  for (const { rule } of profile.activeRules) {
    variants.push(...rule.variants);
  }

  return unique(variants).slice(0, maxVariants);
}

export function getIntentCandidateAdjustment(candidate = {}, intentProfile = buildSearchIntentProfile('')) {
  const candidateText = getCandidateText(candidate);
  const normalizedCandidateText = normalizeIntentText(candidateText);
  const rawCandidateText = String(candidateText || '');
  let boost = 0;
  let penalty = 0;
  const reasons = [];

  for (const { token, rule } of intentProfile.activeRules || []) {
    for (const pattern of rule.prefer || []) {
      if (pattern.test(rawCandidateText) || pattern.test(normalizedCandidateText)) {
        boost += 18;
        reasons.push(`prefer:${token}`);
        break;
      }
    }

    if (!hasOverrideToken(intentProfile.tokenSet, rule)) {
      for (const pattern of rule.avoid || []) {
        if (pattern.test(rawCandidateText) || pattern.test(normalizedCandidateText)) {
          penalty += 28;
          reasons.push(`avoid:${token}`);
          break;
        }
      }
    }
  }

  return { boost, penalty, reasons };
}
