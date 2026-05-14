import { readFileSync } from 'node:fs';

const localeDataUrl = new URL('./generated/mcp-output-locales.json', import.meta.url);
const localeDataset = JSON.parse(readFileSync(localeDataUrl, 'utf8'));

export const SUPPORTED_MCP_OUTPUT_LOCALES = Object.freeze(Object.keys(localeDataset.locales || {}));

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function normalizeMcpOutputLocale(locale) {
  return SUPPORTED_MCP_OUTPUT_LOCALES.includes(locale) ? locale : null;
}

function getLocale(locale) {
  const normalized = normalizeMcpOutputLocale(locale);
  return normalized ? localeDataset.locales[normalized] : null;
}

function formatMessage(template, replacements = {}) {
  if (typeof template !== 'string') return null;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) =>
    Object.hasOwn(replacements, key) ? String(replacements[key]) : match
  );
}

function localizeTriggerLabels(triggers = [], localeRecord) {
  return triggers.map((trigger) => ({
    id: trigger,
    label: localeRecord.motionLab.triggers[trigger] || trigger,
  }));
}

export function localizeMotionPresetSummary(record, locale) {
  const localeRecord = getLocale(locale);
  if (!localeRecord) return record;

  const preset = localeRecord.motionLab.presets[record.preset];
  if (!preset) return record;

  return {
    ...record,
    localized: {
      locale: normalizeMcpOutputLocale(locale),
      label: preset.label,
      group: preset.group,
      description: preset.description,
      supported_triggers: localizeTriggerLabels(record.supported_triggers || [], localeRecord),
    },
  };
}

export function localizeMotionRecipe(recipe, locale) {
  const localeRecord = getLocale(locale);
  if (!localeRecord || !recipe) return recipe;

  const presetId = recipe.preset_id || recipe.preset;
  const preset = localeRecord.motionLab.presets[presetId];
  if (!preset) return recipe;

  return {
    ...recipe,
    localized: {
      locale: normalizeMcpOutputLocale(locale),
      preset: preset.label,
      group: preset.group,
      description: preset.description,
      ...(preset.visual_character ? { visual_character: preset.visual_character } : {}),
      ...(preset.emotional_tone ? { emotional_tone: [...preset.emotional_tone] } : {}),
      ...(preset.recommended_contexts ? { recommended_contexts: [...preset.recommended_contexts] } : {}),
      ...(preset.avoid_for ? { avoid_for: [...preset.avoid_for] } : {}),
      ...(recipe.trigger ? { trigger: localeRecord.motionLab.triggers[recipe.trigger] || recipe.trigger } : {}),
    },
  };
}

export function localizeSelectorInstructions(selectorMode, selectorToken, locale) {
  const localeRecord = getLocale(locale);
  if (!localeRecord) return null;

  const selectorMessages = localeRecord.messages?.selector || {};
  if (selectorMode === 'literal') return selectorMessages.literal || null;
  if (selectorToken) {
    return formatMessage(selectorMessages.placeholder, { selectorToken });
  }
  return selectorMessages.fallback || null;
}

export function localizeSearchNoResultsHint(locale, hasLocale) {
  const localeRecord = getLocale(locale);
  if (!localeRecord) return null;
  return hasLocale
    ? localeRecord.messages?.hints?.noResultsWithLocale || null
    : localeRecord.messages?.hints?.noResultsNoLocale || null;
}

export function localizeIconNotFoundHint(locale) {
  const localeRecord = getLocale(locale);
  return localeRecord?.messages?.hints?.iconNotFound || null;
}

export function localizeWorkflowAccessPayload(payload, locale) {
  const localeRecord = getLocale(locale);
  if (!localeRecord || !payload || typeof payload !== 'object') return payload;

  const proKeyHint = localeRecord.messages?.hints?.proKey;
  if (!proKeyHint) return payload;

  return {
    ...payload,
    localized: {
      locale: normalizeMcpOutputLocale(locale),
      hint: proKeyHint,
    },
  };
}

export function localizeConverterOptions(options, locale) {
  const localeRecord = getLocale(locale);
  if (!localeRecord) return options;

  const localizedConverter = localeRecord.converter || {};
  return {
    ...options,
    localized: {
      locale: normalizeMcpOutputLocale(locale),
      guidance: cloneJson(localizedConverter.guidance || {}),
      traceClasses: cloneJson(localizedConverter.traceClasses || {}),
    },
  };
}
