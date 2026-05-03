import {
  buildPublicSemanticPayload,
  getSemanticRecordForIcon,
  scoreSemanticAlignment,
} from './semantic-registry.js';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from '../lib/search-intent-core.js';

const GENERIC_SLOT_WORDS = new Set([
  'action',
  'button',
  'buttons',
  'control',
  'controls',
  'icon',
  'icons',
  'item',
  'items',
  'nav',
  'navigation',
  'slot',
  'tab',
  'tabs',
  'ui',
  'view',
]);

const VARIANT_PENALTIES = Object.freeze([
  { pattern: /circle/i, penalty: 5 },
  { pattern: /square/i, penalty: 4 },
  { pattern: /dash/i, penalty: 5 },
  { pattern: /badge/i, penalty: 4 },
  { pattern: /off/i, penalty: 6 },
  { pattern: /slash/i, penalty: 6 },
  { pattern: /warning/i, penalty: 4 },
]);

const COMMON_SLOT_PREFERENCE_RULES = Object.freeze([
  {
    slotPatterns: [/create/i, /\badd\b/i, /\bplus\b/i, /compose/i, /new item/i],
    queryVariants: ['add', 'plus', 'create new', 'compose'],
    iconPreferences: [
      { pattern: /^(add|plus)(?:_|-|$)/i, bonus: 48 },
      { pattern: /(?:_|-)(add|plus)(?:_|-|$)/i, bonus: 18 },
      { pattern: /compose|edit|pencil/i, bonus: 8 },
    ],
  },
  {
    slotPatterns: [/alerts?/i, /notifications?/i, /bell/i],
    queryVariants: ['notification', 'bell', 'alert', 'alarm'],
    iconPreferences: [
      { pattern: /notification|bell/i, bonus: 42 },
      { pattern: /alarm|alert/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/profile/i, /account/i, /\buser\b/i, /\busers\b/i, /avatar/i],
    queryVariants: ['user profile', 'account user', 'avatar person'],
    iconPreferences: [
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)|users|profile|avatar|circle-user|user-circle/i, bonus: 36 },
      { pattern: /person|contact/i, bonus: 10 },
    ],
  },
  {
    slotPatterns: [/model/i, /\bai\b/i, /\bml\b/i, /machine learning/i],
    queryVariants: ['brain circuit', 'brain cog', 'neural network', 'model'],
    iconPreferences: [
      { pattern: /brain-circuit|brain_circuit/i, bonus: 44 },
      { pattern: /brain|circuit|nodes/i, bonus: 24 },
    ],
  },
  {
    slotPatterns: [/prompt/i],
    queryVariants: ['message text', 'text input', 'terminal', 'text cursor'],
    iconPreferences: [
      { pattern: /message.*text|text.*input|text-cursor-input|terminal/i, bonus: 36 },
      { pattern: /text|prompt|keyboard/i, bonus: 14 },
    ],
  },
  {
    slotPatterns: [/dataset/i, /\bdata\b/i, /table/i],
    queryVariants: ['database', 'data table', 'grid rows columns', 'table'],
    iconPreferences: [
      { pattern: /^database$|^table-2$|^table_2$|table-cells|table-columns|table-rows/i, bonus: 36 },
      { pattern: /database|table|grid/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/evaluation/i, /benchmark/i, /score/i, /metrics?/i],
    queryVariants: ['bar chart', 'metrics chart', 'gauge', 'checklist', 'benchmark'],
    iconPreferences: [
      { pattern: /bar-chart-3|chart-bar|bar-chart|gauge|clipboard-check|list-check/i, bonus: 38 },
      { pattern: /chart|metrics|check/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/deployment/i, /deploy/i, /release/i, /ship/i, /publish/i],
    queryVariants: ['cloud upload', 'upload', 'rocket launch', 'server upload', 'send'],
    iconPreferences: [
      { pattern: /cloud-upload|upload-cloud|rocket|send/i, bonus: 40 },
      { pattern: /upload|server|package/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/monitoring/i, /monitor/i, /observability/i, /telemetry/i, /activity/i],
    queryVariants: ['chart line', 'activity', 'pulse', 'gauge', 'signal'],
    iconPreferences: [
      { pattern: /chart-line|line-chart|activity|pulse|gauge/i, bonus: 42 },
      { pattern: /chart|signal|radar/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/billing/i, /payment/i, /invoice/i, /subscription/i],
    queryVariants: ['credit card', 'receipt', 'invoice', 'payment', 'wallet'],
    iconPreferences: [
      { pattern: /credit-card|receipt|wallet|invoice/i, bonus: 44 },
      { pattern: /card|banknote|currency|dollar/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [/reports?/i, /analytics/i, /insights?/i],
    queryVariants: ['bar chart', 'file chart', 'analytics chart', 'report document'],
    iconPreferences: [
      { pattern: /file-.*chart|chart-bar|bar-chart-3|bar-chart|chart-line|line-chart/i, bonus: 40 },
      { pattern: /chart|report|analytics/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/settings?/i, /preferences?/i, /configure/i],
    queryVariants: ['settings', 'cog', 'sliders'],
    iconPreferences: [
      { pattern: /^settings$|^cog$|settings-2|sliders/i, bonus: 34 },
      { pattern: /settings|cog|adjustments/i, bonus: 16 },
    ],
  },
  {
    slotPatterns: [/database/i, /storage/i],
    queryVariants: ['database', 'server database', 'data storage'],
    iconPreferences: [
      { pattern: /^database$|database-stack/i, bonus: 36 },
      { pattern: /database|server/i, bonus: 16 },
    ],
  },
]);

const SLOT_PREFERENCE_RULES = Object.freeze({
  mingcute: [
    {
      slotPatterns: [/home/i],
      iconPreferences: [
        { pattern: /^home_3_line$/i, bonus: 14 },
        { pattern: /^home_2_line$/i, bonus: 8 },
        { pattern: /^home_1_line$/i, bonus: 4 },
      ],
    },
    {
      slotPatterns: [/create/i, /add/i, /plus/i, /compose/i],
      iconPreferences: [
        { pattern: /^add_line$/i, bonus: 42 },
        { pattern: /^plus_line$/i, bonus: 10 },
        { pattern: /^add_circle_line$/i, bonus: 6 },
      ],
    },
    {
      slotPatterns: [/alerts?/i, /notification/i],
      iconPreferences: [{ pattern: /^notification_line$/i, bonus: 12 }],
    },
    {
      slotPatterns: [/profile/i, /user/i, /account/i],
      iconPreferences: [{ pattern: /^user_1_line$/i, bonus: 12 }],
    },
  ],
});

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeText(value) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(' ') : [];
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

function buildSlotIntentTerms(task, slot) {
  const taskTokens = tokenizeText(task);
  const slotTokens = tokenizeText(slot);
  const usefulSlotTokens = slotTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));

  const expanded = [...usefulSlotTokens];

  const usefulTaskTokens = taskTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));
  expanded.push(...usefulTaskTokens);

  const variants = buildIntentQueryVariants(`${slot} ${task}`, {
    baseQuery: slot,
    maxVariants: 8,
  });
  for (const variant of variants) {
    expanded.push(...tokenizeText(variant));
  }

  for (const rule of getMatchingSlotRules(slot, expanded)) {
    for (const variant of rule.queryVariants || []) {
      expanded.push(...tokenizeText(variant));
    }
  }

  return dedupe(expanded);
}

function buildSlotQueryVariants(task, slot) {
  const variants = buildIntentQueryVariants(`${slot} ${task}`, {
    baseQuery: slot,
    maxVariants: 8,
  });
  const usefulSlotTokens = tokenizeText(slot).filter((token) => !GENERIC_SLOT_WORDS.has(token));
  variants.push(...usefulSlotTokens);
  const intentTerms = tokenizeText(`${slot} ${task} ${variants.join(' ')}`);
  for (const rule of getMatchingSlotRules(slot, intentTerms)) {
    variants.push(...(rule.queryVariants || []));
  }
  return dedupe(variants).slice(0, 12);
}

function scoreLexicalFit(icon, intentTerms, slotLabel) {
  const tokens = new Set([
    ...tokenizeText(icon.id),
    ...tokenizeText(icon.name),
    ...tokenizeText(`${icon.lib}:${icon.id}`),
  ]);
  const normalizedId = normalizeText(icon.id);
  const normalizedName = normalizeText(icon.name);
  const normalizedSlot = normalizeText(slotLabel);

  let score = 0;
  for (const term of intentTerms) {
    if (tokens.has(term)) score += 14;
    else if (normalizedId.includes(term) || normalizedName.includes(term)) score += 8;

    if (normalizedId === term || normalizedName === term) {
      score += 20;
    }
  }

  if (normalizedSlot && (normalizedId === normalizedSlot || normalizedName === normalizedSlot)) {
    score += 20;
  }

  return score;
}

function getVariantPenalty(icon) {
  const normalizedId = normalizeText(icon.id);
  let penalty = 0;
  for (const rule of VARIANT_PENALTIES) {
    if (rule.pattern.test(normalizedId)) {
      penalty += rule.penalty;
    }
  }
  return penalty;
}

function getMatchingSlotRules(slotLabel, intentTerms) {
  const slotText = normalizeText(slotLabel);
  return COMMON_SLOT_PREFERENCE_RULES.filter((rule) => rule.slotPatterns.some((pattern) => pattern.test(slotText)));
}

function scoreSlotPreferenceRules(icon, rules = [], slotText = '') {
  let bonus = 0;

  for (const rule of rules) {
    for (const preference of rule.iconPreferences) {
      if (preference.pattern.test(icon.id)) {
        bonus += preference.bonus;
      }
    }
  }

  return bonus;
}

function getSlotPreferenceBonus(icon, slotLabel, intentTerms, library) {
  const slotText = `${slotLabel} ${intentTerms.join(' ')}`;
  const commonRules = getMatchingSlotRules(slotLabel, intentTerms);
  const libraryRules = (SLOT_PREFERENCE_RULES[library] || [])
    .filter((rule) => rule.slotPatterns.some((pattern) => pattern.test(slotText)));

  return scoreSlotPreferenceRules(icon, commonRules, slotText) +
    scoreSlotPreferenceRules(icon, libraryRules, slotText);
}

function summarizeSemanticFit(slotLabel, semanticRecord, intentTerms) {
  if (semanticRecord?.depicts && semanticRecord?.use_when) {
    return `Strong fit for ${slotLabel}: visually reads as ${String(semanticRecord.depicts).toLowerCase()}. ${semanticRecord.use_when}`;
  }
  if (semanticRecord?.depicts) {
    return `Good fit for ${slotLabel}: visually reads as ${String(semanticRecord.depicts).toLowerCase()}.`;
  }
  if (semanticRecord?.use_when) {
    return `Strong fit for ${slotLabel}: ${semanticRecord.use_when}`;
  }
  if (intentTerms.length > 0) {
    return `Best lexical match for ${slotLabel} from the current library.`;
  }
  return `Best available match for ${slotLabel}.`;
}

function buildWhySelected(slotLabel, semanticRecord, iconResult) {
  const label = semanticRecord?.label || iconResult.name;
  if (semanticRecord?.depicts) {
    return `${label} matches ${slotLabel} and visually reads as ${String(semanticRecord.depicts).toLowerCase()}.`;
  }
  if (semanticRecord?.use_when) {
    return `${label} matches ${slotLabel}. ${semanticRecord.use_when}`;
  }
  return `${label} is the clearest match for ${slotLabel} from the current library.`;
}

function buildCandidatePayload(slotLabel, iconResult, semanticRecord, intentTerms) {
  return {
    id: iconResult.id,
    library: iconResult.library,
    name: iconResult.name,
    style: iconResult.style || 'outline',
    label: semanticRecord?.label || iconResult.semantic?.label || iconResult.name,
    semantic_fit: summarizeSemanticFit(slotLabel, semanticRecord, intentTerms),
    why_selected: buildWhySelected(slotLabel, semanticRecord, iconResult),
    svg: iconResult.svg,
    semantic: buildPublicSemanticPayload(semanticRecord) || iconResult.semantic || null,
  };
}

export async function recommendIconsForTask({
  task,
  library,
  style = 'any',
  slots,
  limitPerSlot = 3,
  searchIconsForQuery,
  buildIconResult,
  semanticMap,
}) {
  const slotResults = [];

  for (const slotLabel of slots) {
    const intentTerms = buildSlotIntentTerms(task, slotLabel);
    const queryVariants = buildSlotQueryVariants(task, slotLabel);
    const pooledIcons = [];
    const seen = new Set();

    for (const queryVariant of queryVariants) {
      const results = await searchIconsForQuery({
        query: queryVariant,
        library,
        style,
        limit: Math.max(limitPerSlot * 10, 50),
      });

      for (const icon of results) {
        const key = `${icon.lib}:${icon.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pooledIcons.push(icon);
      }
    }

    const scored = pooledIcons
      .map((icon, index) => {
        const semanticRecord = getSemanticRecordForIcon(semanticMap, icon);
        const semanticQuery = queryVariants.join(' ');
        const semanticScore = semanticRecord ? scoreSemanticAlignment(semanticQuery, semanticRecord) * 3 : 0;
        const lexicalScore = scoreLexicalFit(icon, intentTerms, slotLabel);
        const semanticBonus = semanticRecord ? 6 : 0;
        const variantPenalty = getVariantPenalty(icon);
        const slotPreferenceBonus = getSlotPreferenceBonus(icon, slotLabel, intentTerms, library);
        const intentProfile = buildSearchIntentProfile(`${slotLabel} ${task}`);
        const intentAdjustment = getIntentCandidateAdjustment(icon, intentProfile);

        return {
          icon,
          index,
          semanticRecord,
          slotPreferenceBonus,
          totalScore:
            semanticScore +
            lexicalScore +
            semanticBonus +
            slotPreferenceBonus +
            intentAdjustment.boost -
            intentAdjustment.penalty -
            variantPenalty,
        };
      })
      .filter((entry) => entry.totalScore > 0)
      .sort((left, right) => {
        if (right.slotPreferenceBonus !== left.slotPreferenceBonus) {
          return right.slotPreferenceBonus - left.slotPreferenceBonus;
        }
        if (right.totalScore !== left.totalScore) return right.totalScore - left.totalScore;
        return left.index - right.index;
      })
      .slice(0, limitPerSlot);

    const preparedCandidates = [];
    for (const entry of scored) {
      const iconResult = await buildIconResult(entry.icon, { style });
      if (!iconResult?.svg) continue;
      preparedCandidates.push(buildCandidatePayload(slotLabel, iconResult, entry.semanticRecord, intentTerms));
    }

    slotResults.push({
      slot: slotLabel,
      queries_used: queryVariants,
      recommended: preparedCandidates[0] || null,
      alternatives: preparedCandidates.slice(1),
    });
  }

  return {
    task,
    library: library || 'all',
    style,
    slot_count: slots.length,
    results: slotResults,
  };
}
