import {
  buildPublicSemanticPayload,
  getSemanticRecordForIcon,
  scoreSemanticAlignment,
} from './semantic-registry.js';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expandCjkQuery,
  normalizeCjkSearchText,
} from './runtime/cjk-search-core.js';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from './runtime/search-intent-core.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cjkTermsPath = join(__dirname, 'public', 'cjk-search-terms.json');
const multilingualAliasesPath = join(__dirname, 'public', 'multilingual-search-aliases.json');
const cjkSearchTerms = existsSync(cjkTermsPath)
  ? JSON.parse(readFileSync(cjkTermsPath, 'utf8')).terms || []
  : [];
const multilingualSearchAliases = existsSync(multilingualAliasesPath)
  ? JSON.parse(readFileSync(multilingualAliasesPath, 'utf8')).aliases || []
  : [];
const multilingualExpansionTerms = [...cjkSearchTerms, ...multilingualSearchAliases];

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
    slotPatterns: [
      /profile/i,
      /account/i,
      /\buser\b/i,
      /\busers\b/i,
      /avatar/i,
      /\u8d26\u6237|\u5e10\u6237|\u5e33\u6236|\u500b\u4eba\u8cc7\u6599|\u4e2a\u4eba\u8d44\u6599|\u7528\u6237|\u4f7f\u7528\u8005/u,
      /\u30a2\u30ab\u30a6\u30f3\u30c8|\u30d7\u30ed\u30d5\u30a3\u30fc\u30eb|\u30e6\u30fc\u30b6\u30fc/u,
      /\uacc4\uc815|\ud504\ub85c\ud544|\uc0ac\uc6a9\uc790/u,
      /cuenta|perfil|usuario/i,
      /konto|profil|benutzer/i,
      /conta|perfil|usu[aá]rio|utilizador/i,
      /\u0627\u0644\u062d\u0633\u0627\u0628|\u0645\u0644\u0641\s+\u0634\u062e\u0635\u064a|\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645/u,
      /\u0916\u093e\u0924\u093e|\u092a\u094d\u0930\u094b\u092b\u093c\u093e\u0907\u0932|\u092a\u094d\u0930\u094b\u092b\u093e\u0907\u0932|\u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e/u,
      /t[aà]i kho[aả]n|tai khoan|h[oồ] s[oơ]|ho so|ng[uư][oờ]i d[uù]ng|nguoi dung/i,
      /\u0e1a\u0e31\u0e0d\u0e0a\u0e35|\u0e42\u0e1b\u0e23\u0e44\u0e1f\u0e25\u0e4c|\u0e1c\u0e39\u0e49\u0e43\u0e0a\u0e49/u,
    ],
    queryVariants: ['user profile', 'account user', 'avatar person', 'user'],
    iconPreferences: [
      { pattern: /^user(?:_|-|$)|(?:_|-)user(?:_|-|$)|users|profile|avatar|circle-user|user-circle/i, bonus: 42 },
      { pattern: /person|contact/i, bonus: 12 },
    ],
  },
  {
    slotPatterns: [
      /\bhome\b/i,
      /\bmain\b/i,
      /\u9996\u9875|\u9996\u9801|\u4e3b\u9875|\u4e3b\u9801/u,
      /\u30db\u30fc\u30e0|\u30e1\u30a4\u30f3/u,
      /\ud648|\uba54\uc778/u,
      /inicio|principal/i,
      /startseite|hauptseite/i,
      /\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629|\u0627\u0644\u0635\u0641\u062d\u0629\s+\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629/u,
      /\u0e2b\u0e19\u0e49\u0e32\u0e2b\u0e25\u0e31\u0e01/u,
    ],
    queryVariants: ['home', 'house'],
    iconPreferences: [
      { pattern: /^home(?:_|-|$)|(?:_|-)home(?:_|-|$)|house/i, bonus: 40 },
    ],
  },
  {
    slotPatterns: [
      /alerts?/i,
      /notifications?/i,
      /bell/i,
      /\u901a\u77e5|\u63d0\u9192/u,
      /\u30a2\u30e9\u30fc\u30c8|\u304a\u77e5\u3089\u305b|\u901a\u77e5/u,
      /\uc54c\ub9bc/u,
      /notificaci[oó]n|notificaciones|alerta/i,
      /benachrichtigung|benachrichtigungen/i,
      /notifica(?:ç|c)[aã]o|notifica(?:ç|c)[oõ]es|notificacoes|alerta/i,
      /\u0627\u0644\u0625\u0634\u0639\u0627\u0631|\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a/u,
      /\u0938\u0942\u091a\u0928\u093e|\u0938\u0942\u091a\u0928\u093e\u090f\u0901|\u0905\u0927\u093f\u0938\u0942\u091a\u0928\u093e/u,
      /th[oô]ng b[aá]o|thong bao|c[aả]nh b[aá]o|canh bao/i,
      /\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19|\u0e01\u0e32\u0e23\u0e41\u0e08\u0e49\u0e07\u0e40\u0e15\u0e37\u0e2d\u0e19/u,
    ],
    queryVariants: ['notification', 'bell', 'alert', 'alarm'],
    iconPreferences: [
      { pattern: /notification|bell/i, bonus: 46 },
      { pattern: /alarm|alert/i, bonus: 18 },
    ],
  },
  {
    slotPatterns: [
      /privacy/i,
      /security/i,
      /private/i,
      /safe/i,
      /protection/i,
      /\u9690\u79c1|\u96b1\u79c1|\u5b89\u5168/u,
      /\u30d7\u30e9\u30a4\u30d0\u30b7\u30fc|\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3|\u5b89\u5168/u,
      /\uac1c\uc778\uc815\ubcf4|\uac1c\uc778\s+\uc815\ubcf4|\ubcf4\uc548|\uc548\uc804/u,
      /privacidad|seguridad/i,
      /datenschutz|sicherheit/i,
      /privacidade|seguran[cç]a|seguranca/i,
      /\u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629|\u0627\u0644\u0623\u0645\u0627\u0646|\u0627\u0644\u0627\u0645\u0627\u0646|\u0627\u0644\u0623\u0645\u0646|\u0627\u0644\u0627\u0645\u0646/u,
      /\u0917\u094b\u092a\u0928\u0940\u092f\u0924\u093e|\u0938\u0941\u0930\u0915\u094d\u0937\u093e/u,
      /quy[eề]n ri[eê]ng t[uư]|quyen rieng tu|b[aả]o m[aậ]t|bao mat|an to[aà]n|an toan/i,
      /\u0e04\u0e27\u0e32\u0e21\u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e48\u0e27\u0e19\u0e15\u0e31\u0e27|\u0e04\u0e27\u0e32\u0e21\u0e1b\u0e25\u0e2d\u0e14\u0e20\u0e31\u0e22/u,
    ],
    queryVariants: ['shield lock', 'lock', 'shield', 'privacy security', 'security'],
    iconPreferences: [
      { pattern: /shield.*lock|lock.*shield|shield-check|shield-alert|shield/i, bonus: 58 },
      { pattern: /^lock$|(?:_|-)lock(?:_|-|$)|key|fingerprint/i, bonus: 28 },
    ],
  },
  {
    slotPatterns: [
      /appearance/i,
      /theme/i,
      /color/i,
      /palette/i,
      /dark mode/i,
      /light mode/i,
      /\u5916\u89c2|\u5916\u89c0|\u4e3b\u9898|\u4e3b\u984c|\u989c\u8272|\u984f\u8272/u,
      /\u5916\u89b3|\u30c6\u30fc\u30de|\u8868\u793a|\u914d\u8272/u,
      /\uc678\uad00|\ud14c\ub9c8|\uc0c9\uc0c1|\ud654\uba74/u,
      /apariencia|tema|colou?r|modo/i,
      /erscheinungsbild|design|darstellung|thema/i,
      /apar[eê]ncia|tema|cor/i,
      /\u0627\u0644\u0645\u0638\u0647\u0631|\u0627\u0644\u0633\u0645\u0629|\u0627\u0644\u0648\u0636\u0639|\u0627\u0644\u0623\u0644\u0648\u0627\u0646/u,
      /\u0930\u0942\u092a|\u0925\u0940\u092e|\u0926\u093f\u0916\u093e\u0935\u091f|\u0930\u0902\u0917/u,
      /giao di[eệ]n|giao dien|ch[uủ] \u0111[eề]|chu de|m[aà]u|mau/i,
      /\u0e23\u0e39\u0e1b\u0e25\u0e31\u0e01\u0e29\u0e13\u0e4c|\u0e18\u0e35\u0e21|\u0e2a\u0e35|\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e32/u,
    ],
    queryVariants: ['palette', 'moon', 'theme', 'sun moon', 'appearance'],
    iconPreferences: [
      { pattern: /^palette$|paint|brush|color|swatch/i, bonus: 54 },
      { pattern: /^moon$|sun-moon|sun|theme/i, bonus: 28 },
    ],
  },
  {
    slotPatterns: [
      /language/i,
      /locale/i,
      /translate/i,
      /translation/i,
      /\u8bed\u8a00/u,
      /\u8a9e\u8a00/u,
      /\u8a00\u8a9e/u,
      /\uc5b8\uc5b4/u,
      /idioma/i,
      /sprache/i,
      /l[ií]ngua/i,
      /langue/i,
      /\u0627\u0644\u0644\u063a\u0629|\u0644\u063a\u0629/u,
      /\u092d\u093e\u0937\u093e/u,
      /ng[oô]n ng[uữ]|ngon ngu/i,
      /\u0e20\u0e32\u0e29\u0e32/u,
    ],
    queryVariants: ['globe', 'languages', 'translate', 'language'],
    iconPreferences: [
      { pattern: /^globe$|^languages?$|^translate$|(?:_|-)(globe|languages?|translate)(?:_|-|$)/i, bonus: 70 },
      { pattern: /globe|language|translate/i, bonus: 28 },
    ],
  },
  {
    slotPatterns: [
      /language/i,
      /locale/i,
      /translate/i,
      /translation/i,
      /语言/u,
      /語言/u,
      /言語/u,
      /언어/u,
      /idioma/i,
      /sprache/i,
      /língua/i,
      /langue/i,
      /اللغة/u,
      /भाषा/u,
      /ngôn ngữ/i,
      /ภาษา/u,
    ],
    queryVariants: ['globe', 'languages', 'translate', 'language'],
    iconPreferences: [
      { pattern: /^globe$|^languages?$|^translate$|(?:_|-)(globe|languages?|translate)(?:_|-|$)/i, bonus: 70 },
      { pattern: /globe|language|translate/i, bonus: 28 },
    ],
  },
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
    slotPatterns: [/archive/i],
    queryVariants: ['archive', 'archive box', 'box archive'],
    iconPreferences: [
      { pattern: /^archive(?:_|-|$)|(?:_|-)archive(?:_|-|$)/i, bonus: 40 },
      { pattern: /box|tray/i, bonus: 8 },
    ],
  },
  {
    slotPatterns: [/alerts?/i, /notifications?/i, /bell/i, /通知/u, /알림/u, /通知/u],
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

function buildLocalizedVariants(value, locale) {
  if (!locale) return [];
  const expanded = expandCjkQuery(value, {
    locale,
    terms: multilingualExpansionTerms,
  });
  const variants = expanded.matched.length > 0 ? expanded.variants.slice(1) : [];
  const normalizedValue = normalizeCjkSearchText(value);
  const containedMatches = [];

  if (normalizedValue) {
    for (const record of multilingualExpansionTerms) {
      if (record.locale !== locale || record.gate !== 'auto_accept') continue;

      const recordValues = [record.term, ...(record.variants || [])]
        .map((term) => normalizeCjkSearchText(term))
        .filter(Boolean);
      const isContainedMatch = recordValues.some((term) => (
        term.length >= 2
        && (normalizedValue.includes(term) || term.includes(normalizedValue))
      ));
      if (!isContainedMatch) continue;

      const firstIndex = Math.min(
        ...recordValues
          .map((term) => normalizedValue.indexOf(term))
          .filter((index) => index >= 0)
      );
      containedMatches.push({
        index: Number.isFinite(firstIndex) ? firstIndex : Number.MAX_SAFE_INTEGER,
        concepts: record.maps_to || [],
      });
    }
  }

  containedMatches
    .sort((left, right) => left.index - right.index)
    .forEach((match) => {
      for (const concept of match.concepts) {
        const normalizedConcept = normalizeCjkSearchText(concept);
        if (normalizedConcept) variants.push(normalizedConcept);
      }
    });

  return dedupe(variants);
}

function buildSlotIntentTerms(task, slot, locale = null) {
  const taskTokens = tokenizeText(task);
  const slotTokens = tokenizeText(slot);
  const usefulSlotTokens = slotTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));

  const expanded = [...usefulSlotTokens];

  const usefulTaskTokens = taskTokens.filter((token) => !GENERIC_SLOT_WORDS.has(token));
  expanded.push(...usefulTaskTokens);
  expanded.push(...buildLocalizedVariants(slot, locale).flatMap(tokenizeText));
  expanded.push(...buildLocalizedVariants(task, locale).flatMap(tokenizeText));

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

function buildSlotQueryVariants(task, slot, locale = null) {
  const localizedVariants = [
    ...buildLocalizedVariants(slot, locale),
    ...buildLocalizedVariants(`${slot} ${task}`, locale),
  ];
  const variants = buildIntentQueryVariants(`${slot} ${task}`, {
    baseQuery: slot,
    maxVariants: 8,
  });
  variants.unshift(...localizedVariants);
  const usefulSlotTokens = tokenizeText(slot).filter((token) => !GENERIC_SLOT_WORDS.has(token));
  variants.push(...usefulSlotTokens);
  const intentTerms = tokenizeText(`${slot} ${task} ${variants.join(' ')}`);
  const ruleVariants = getMatchingSlotRules(slot, intentTerms)
    .flatMap((rule) => rule.queryVariants || []);
  variants.unshift(...ruleVariants);
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

function getMatchingSlotRules(slotLabel, intentTerms = []) {
  const rawSlotText = String(slotLabel || '');
  const slotText = normalizeText(slotLabel);
  return COMMON_SLOT_PREFERENCE_RULES.filter((rule) => rule.slotPatterns.some((pattern) => (
    pattern.test(slotText) || pattern.test(rawSlotText)
  )));
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

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function recommendIconsForTask({
  task,
  library,
  style = 'any',
  locale = null,
  slots,
  limitPerSlot = 3,
  searchIconsForQuery,
  buildIconResult,
  semanticMap,
}) {
  const slotResults = await mapWithConcurrency(slots, 6, async (slotLabel) => {
    const intentTerms = buildSlotIntentTerms(task, slotLabel, locale);
    const queryVariants = buildSlotQueryVariants(task, slotLabel, locale).slice(0, locale ? 8 : 2);
    const pooledIcons = [];
    const seen = new Set();

    const resultGroups = await mapWithConcurrency(queryVariants, 2, async (queryVariant) => {
      try {
        return await searchIconsForQuery({
          query: queryVariant,
          library,
          style,
          limit: Math.max(limitPerSlot * 5, 10),
          locale,
        });
      } catch {
        return [];
      }
    });

    for (const results of resultGroups) {
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

    return {
      slot: slotLabel,
      queries_used: queryVariants,
      recommended: preparedCandidates[0] || null,
      alternatives: preparedCandidates.slice(1),
    };
  });

  return {
    task,
    library: library || 'all',
    style,
    slot_count: slots.length,
    results: slotResults,
  };
}
