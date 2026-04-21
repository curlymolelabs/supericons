import {
  buildPublicSemanticPayload,
  getSemanticRecordForIcon,
  scoreSemanticAlignment,
} from './semantic-registry.js';

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

const SLOT_INTENT_MAP = Object.freeze({
  add: ['add', 'create', 'plus', 'new', 'compose'],
  alerts: ['alerts', 'notification', 'bell', 'alarm'],
  back: ['back', 'previous', 'return', 'left'],
  create: ['create', 'add', 'plus', 'new', 'compose'],
  delete: ['delete', 'remove', 'trash', 'discard'],
  filter: ['filter', 'refine', 'results'],
  home: ['home', 'house', 'main'],
  menu: ['menu', 'drawer', 'navigation', 'sidebar'],
  notification: ['notification', 'alerts', 'bell', 'alarm'],
  profile: ['profile', 'user', 'account', 'person'],
  refresh: ['refresh', 'reload', 'sync'],
  search: ['search', 'find', 'lookup'],
  settings: ['settings', 'preferences', 'config'],
  user: ['user', 'profile', 'account', 'person'],
});

const VARIANT_PENALTIES = Object.freeze([
  { pattern: /circle/i, penalty: 5 },
  { pattern: /square/i, penalty: 4 },
  { pattern: /dash/i, penalty: 5 },
  { pattern: /badge/i, penalty: 4 },
  { pattern: /off/i, penalty: 6 },
  { pattern: /slash/i, penalty: 6 },
  { pattern: /warning/i, penalty: 4 },
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

  const expanded = [];
  for (const token of usefulSlotTokens) {
    expanded.push(token);
    if (SLOT_INTENT_MAP[token]) {
      expanded.push(...SLOT_INTENT_MAP[token]);
    }
  }

  const usefulTaskTokens = taskTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));
  for (const token of usefulTaskTokens) {
    if (SLOT_INTENT_MAP[token]) {
      expanded.push(...SLOT_INTENT_MAP[token]);
    }
  }

  return dedupe(expanded);
}

function buildSlotQueryVariants(task, slot) {
  const normalizedSlot = normalizeText(slot);
  const intentTerms = buildSlotIntentTerms(task, slot);
  const variants = [];

  if (normalizedSlot) variants.push(normalizedSlot);
  if (intentTerms.length > 0) {
    variants.push(intentTerms.join(' '));
    variants.push(...intentTerms);
    if (intentTerms.length > 1) {
      variants.push(`${intentTerms[0]} ${intentTerms[1]}`);
    }
  }

  return dedupe(variants).slice(0, 6);
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

function getSlotPreferenceBonus(icon, slotLabel, intentTerms, library) {
  const rules = SLOT_PREFERENCE_RULES[library];
  if (!rules?.length) return 0;

  const slotText = `${slotLabel} ${intentTerms.join(' ')}`;
  let bonus = 0;

  for (const rule of rules) {
    if (!rule.slotPatterns.some((pattern) => pattern.test(slotText))) continue;
    for (const preference of rule.iconPreferences) {
      if (preference.pattern.test(icon.id)) {
        bonus += preference.bonus;
      }
    }
  }

  return bonus;
}

function summarizeSemanticFit(slotLabel, semanticRecord, intentTerms) {
  if (semanticRecord?.purpose) {
    return `Strong fit for ${slotLabel}: ${semanticRecord.purpose}`;
  }
  if (semanticRecord?.depicts) {
    return `Good fit for ${slotLabel}: visually reads as ${String(semanticRecord.depicts).toLowerCase()}.`;
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
  if (semanticRecord?.purpose) {
    return `${label} matches ${slotLabel} because ${String(semanticRecord.purpose).charAt(0).toLowerCase()}${String(semanticRecord.purpose).slice(1)}`;
  }
  return `${label} is the clearest match for ${slotLabel} from the current library.`;
}

function buildCandidatePayload(slotLabel, iconResult, semanticRecord, intentTerms) {
  return {
    id: iconResult.id,
    library: iconResult.library,
    name: iconResult.name,
    label: semanticRecord?.label || iconResult.semantic?.label || iconResult.name,
    purpose: semanticRecord?.purpose || iconResult.semantic?.purpose || null,
    semantic_fit: summarizeSemanticFit(slotLabel, semanticRecord, intentTerms),
    why_selected: buildWhySelected(slotLabel, semanticRecord, iconResult),
    svg: iconResult.svg,
    semantic: buildPublicSemanticPayload(semanticRecord) || iconResult.semantic || null,
  };
}

export async function recommendIconsForTask({
  task,
  library,
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
        limit: Math.max(limitPerSlot * 4, 10),
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

        return {
          icon,
          index,
          semanticRecord,
          slotPreferenceBonus,
          totalScore:
            semanticScore +
            lexicalScore +
            semanticBonus +
            slotPreferenceBonus -
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
      const iconResult = await buildIconResult(entry.icon);
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
    slot_count: slots.length,
    results: slotResults,
  };
}
