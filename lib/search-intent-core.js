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

const COMPOUND_INTENT_RULES = Object.freeze(
  Object.fromEntries(
    Object.entries({
      'license plate recognition': {
        variants: [
          'license plate recognition',
          'license plate camera',
          'vehicle scan',
          'camera scan',
          'car scan',
          'traffic camera',
          'camera',
          'scan',
          'car',
          'alpr',
          'automatic license plate recognition',
        ],
        prefer: ['\\b(camera|scan|vehicle|car|plate|traffic)\\b'],
        avoid: ['\\b(document|file|certificate|food|dish)\\b'],
      },
      'dream interpretation': {
        variants: [
          'dream interpretation',
          'moon star eye',
          'moon',
          'star',
          'eye',
          'sparkles',
          'mystical',
          'dream',
        ],
        prefer: ['\\b(moon|star|spark|sparkles|eye)\\b'],
      },
      'neck pain': {
        variants: [
          'neck pain',
          'person neck',
          'body pain',
          'person',
          'neck',
          'pain',
          'activity',
          'accessibility',
        ],
        prefer: ['\\b(person|body|activity|accessibility)\\b'],
      },
      'cursor ai code editor': {
        variants: [
          'cursor ai code editor',
          'cursor code editor',
          'code editor',
          'cursor',
          'code',
          'editor',
          'terminal',
        ],
        prefer: ['\\b(cursor|codex|code|editor|terminal|trae|kilo|opencode)\\b'],
        avoid: ['\\bbarcode\\b'],
      },
      'code editor': {
        variants: [
          'code editor',
          'code editor logo',
          'code',
          'editor',
          'terminal',
        ],
        prefer: ['\\b(codex|code|editor|terminal|trae|kilo|opencode)\\b'],
        avoid: ['\\bbarcode\\b'],
      },
      'vercel v0 ai app builder': {
        variants: [
          'vercel v0',
          'v0 app builder',
          'app builder',
          'v0',
          'vercel',
          'builder',
          'base44',
          'bolt',
          'lovable',
        ],
        prefer: ['\\b(vercel|v0|base44|bolt|lovable|builder)\\b'],
      },
      'ai app builder': {
        variants: [
          'ai app builder',
          'app builder',
          'base44',
          'bolt',
          'lovable',
          'builder',
        ],
        prefer: ['\\b(base44|bolt|lovable|builder)\\b'],
      },
    }).map(([term, rule]) => [normalizeIntentText(term), compileRule(rule)]),
  ),
);

const QUERY_BACKOFF_STOP_TOKENS = new Set([
  'a',
  'an',
  'and',
  'as',
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
  'with',
]);

const QUERY_BACKOFF_GENERIC_TOKENS = new Set([
  'ai',
  'app',
  'apps',
  'artificial',
  'brand',
  'brands',
  'company',
  'icon',
  'icons',
  'intelligence',
  'logo',
  'logos',
  'mark',
  'marks',
  'product',
  'site',
  'symbol',
  'symbols',
  'tool',
  'tools',
  'website',
]);

const QUERY_BACKOFF_VISUAL_TOKENS = new Set([
  'arrow',
  'bell',
  'brain',
  'calendar',
  'camera',
  'car',
  'chart',
  'check',
  'circuit',
  'cloud',
  'code',
  'cog',
  'database',
  'document',
  'editor',
  'eye',
  'file',
  'folder',
  'heart',
  'home',
  'image',
  'key',
  'lock',
  'moon',
  'network',
  'person',
  'scan',
  'search',
  'settings',
  'shield',
  'spark',
  'star',
  'user',
  'video',
]);

function isUsefulBackoffToken(token) {
  if (!token || QUERY_BACKOFF_STOP_TOKENS.has(token)) return false;
  if (/^[a-z]\d+$/i.test(token)) return true;
  return token.length >= 3;
}

function getBackoffTokenScore(token, index, tokens) {
  let score = 0;

  if (!QUERY_BACKOFF_GENERIC_TOKENS.has(token)) score += 10;
  if (QUERY_BACKOFF_VISUAL_TOKENS.has(token)) score += 8;
  if (/^[a-z]\d+$/i.test(token)) score += 7;
  if (token.length >= 4) score += 3;
  if (index === tokens.length - 1) score += 3;
  if (index === 0) score += 1;

  return score;
}

function phraseScore(phraseTokens, tokenEntries) {
  const scoreByToken = new Map(tokenEntries.map((entry) => [entry.token, entry.score]));
  return phraseTokens.reduce((sum, token) => sum + (scoreByToken.get(token) || 0), 0)
    + (phraseTokens.length * 2);
}

function buildKeywordBackoffVariants(normalizedQuery) {
  const tokens = tokenizeIntentText(normalizedQuery);
  const usefulEntries = tokens
    .map((token, index) => ({ token, index, score: getBackoffTokenScore(token, index, tokens) }))
    .filter(({ token }) => isUsefulBackoffToken(token));

  if (usefulEntries.length < 2) {
    return usefulEntries.map(({ token }) => token);
  }

  const usefulTokens = usefulEntries.map(({ token }) => token);
  const phraseCandidates = [];

  for (const size of [3, 2]) {
    if (usefulTokens.length < size) continue;
    for (let index = 0; index <= usefulTokens.length - size; index += 1) {
      const phraseTokens = usefulTokens.slice(index, index + size);
      if (phraseTokens.every((token) => QUERY_BACKOFF_GENERIC_TOKENS.has(token))) continue;
      const phrase = phraseTokens.join(' ');
      if (phrase === normalizedQuery) continue;
      phraseCandidates.push({
        phrase,
        score: phraseScore(phraseTokens, usefulEntries),
        index,
      });
    }
  }

  const tokenVariants = [...usefulEntries]
    .filter(({ token }) => !QUERY_BACKOFF_GENERIC_TOKENS.has(token))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ token }) => token);

  return unique([
    ...phraseCandidates
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 4)
      .map(({ phrase }) => phrase),
    ...tokenVariants.slice(0, 6),
  ]);
}

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

function getCompoundIntentMatches(normalizedQuery) {
  if (!normalizedQuery) return [];

  return Object.entries(COMPOUND_INTENT_RULES)
    .filter(([term]) => normalizedQuery === term || normalizedQuery.includes(term))
    .sort(([left], [right]) => right.length - left.length)
    .map(([term, rule]) => ({ token: term, rule, compound: true }));
}

export function buildSearchIntentProfile(query) {
  const normalized = normalizeIntentText(query);
  const tokens = tokenizeIntentText(normalized);
  const tokenSet = new Set(tokens);
  const activeRules = getCompoundIntentMatches(normalized);

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

  if (options.keywordBackoff !== false) {
    variants.push(...buildKeywordBackoffVariants(normalizedQuery));
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
