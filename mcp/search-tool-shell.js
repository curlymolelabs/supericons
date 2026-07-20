import { normalizeSearchQueryRequest } from './search-query-normalization.js';

export const SEARCH_TOOL_SERVER_INSTRUCTIONS = [
  'Use search_icons as the main tool when a user asks for icons.',
  'When search_icons returns markdown_image, include it in the final answer so the user can see the result set.',
  'The suggested_response_markdown field is safe to use as a compact answer, or it can be rewritten without changing the icon names and refs.',
  'If search_icons returns no_icons_found, do not invent an icon. Follow next_step or explain the honest no-result.',
  'Use recommend_icons for a coherent set of up to 20 named UI slots.',
  'When a tool returns error, code, and next_step, explain the plain-language reason and follow next_step instead of repeating the same rejected call.',
  'Use preview_icons only to refine a result set or preview known icon refs.',
].join(' ');

export const SEARCH_LIBRARY_MODES = ['strict', 'prefer', 'all'];
export const SEARCH_STYLES = ['any', 'outline', 'solid'];
export const MAX_PREVIEW_ICONS = 12;
export const MAX_ACCEPTED_PREVIEW_REFS = 100;
export const MAX_BROWSER_PREVIEW_REFS = 24;
export const MAX_RECOMMENDATION_SLOTS = 20;
export const RECOMMENDATION_RESPONSE_MODES = ['plan', 'assets', 'full'];

export function coerceToolString(value) {
  if (Array.isArray(value)) return coerceToolString(value[0]);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return value;
}

export function coerceToolNumber(value) {
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

export function coerceToolBoolean(value) {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  return value;
}

export function coerceToolIconRefs(value) {
  if (typeof value === 'string') {
    return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  }
  if (!Array.isArray(value)) return value;
  return value
    .flatMap((entry) => (
      typeof entry === 'string'
        ? entry.split(',')
        : [entry]
    ))
    .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
    .filter((entry) => entry !== '');
}

export function coerceToolSlots(value) {
  if (typeof value === 'string') return [value.trim()].filter(Boolean);
  if (!Array.isArray(value)) return value;
  return value
    .map((entry) => (
      typeof entry === 'number' || typeof entry === 'boolean'
        ? String(entry)
        : entry
    ))
    .map((entry) => (typeof entry === 'string' ? entry.trim() : entry))
    .filter((entry) => entry !== '');
}

function normalizeChoice(value, allowed, fallback, field, warnings) {
  if (allowed.includes(value)) return value;
  if (value !== undefined && value !== null && value !== '') {
    warnings.push(`Ignored unsupported ${field} value "${String(value)}"; using "${fallback}".`);
  }
  return fallback;
}

export function normalizeSearchToolArguments(args = {}, { supportedLocales = [] } = {}) {
  const warnings = [];
  const locale = args.locale && supportedLocales.includes(args.locale)
    ? args.locale
    : undefined;
  if (args.locale && !locale) {
    warnings.push(`Ignored unsupported locale "${String(args.locale)}".`);
  }
  const normalizedStyle = normalizeChoice(
    args.style,
    SEARCH_STYLES,
    'any',
    'style',
    warnings,
  );
  const queryNormalization = normalizeSearchQueryRequest(args.query, normalizedStyle);
  return {
    ...args,
    query: queryNormalization.query,
    original_query: queryNormalization.original_query,
    library_mode: normalizeChoice(
      args.library_mode,
      SEARCH_LIBRARY_MODES,
      'strict',
      'library_mode',
      warnings,
    ),
    style: queryNormalization.style,
    locale,
    query_normalization: queryNormalization,
    warnings,
  };
}

export function normalizePreviewToolArguments(args = {}, { supportedLocales = [] } = {}) {
  const normalized = normalizeSearchToolArguments(args, { supportedLocales });
  const warnings = [...normalized.warnings];
  const iconRefs = Array.isArray(args.icon_refs)
    ? args.icon_refs.map((entry) => String(entry).trim()).filter(Boolean)
    : [];
  const acceptedIconRefs = iconRefs.slice(0, MAX_ACCEPTED_PREVIEW_REFS);
  if (iconRefs.length > MAX_ACCEPTED_PREVIEW_REFS) {
    warnings.push(
      `Received ${iconRefs.length} icon refs; accepted the first ${MAX_ACCEPTED_PREVIEW_REFS}.`,
    );
  }
  const requestedLimit = Number(args.limit);
  const finiteLimit = Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : MAX_PREVIEW_ICONS;
  const effectiveLimit = Math.min(MAX_PREVIEW_ICONS, Math.max(1, finiteLimit));
  if (args.limit !== undefined && !Number.isFinite(requestedLimit)) {
    warnings.push(`Ignored invalid preview limit "${String(args.limit)}"; showing up to ${MAX_PREVIEW_ICONS}.`);
  } else if (finiteLimit > MAX_PREVIEW_ICONS) {
    warnings.push(
      `Requested ${finiteLimit} inline preview icons; showing the maximum of ${MAX_PREVIEW_ICONS}.`,
    );
  } else if (finiteLimit < 1) {
    warnings.push('Preview limit must be at least 1; showing 1 icon.');
  }
  const selectedIconRefs = acceptedIconRefs.slice(0, effectiveLimit);
  return {
    ...normalized,
    warnings,
    limit: effectiveLimit,
    icon_refs: selectedIconRefs,
    browser_icon_refs: acceptedIconRefs.slice(0, MAX_BROWSER_PREVIEW_REFS),
    truncated_from: iconRefs.length > selectedIconRefs.length ? iconRefs.length : null,
  };
}

function buildRecommendationErrorBase({
  task = '',
  library,
  style = 'any',
  responseMode = 'plan',
  slots = [],
} = {}) {
  return {
    task,
    ...(library ? { library } : {}),
    style,
    response_mode: responseMode,
    slot_count: slots.length,
    all_slots_resolved: false,
    needs_clarification: false,
    clarification_slots: [],
    low_confidence_slots: [],
    fallback_recommended: false,
    results: [],
  };
}

function buildRecommendationErrorResponse({
  task,
  library,
  style,
  responseMode,
  slots,
  error,
  code,
  hint,
  retryable,
  status,
  retryAfterSeconds,
  details,
  warnings = [],
} = {}) {
  const displayTask = task || 'the requested icon set';
  return {
    ...buildRecommendationErrorBase({ task, library, style, responseMode, slots }),
    error,
    code,
    hint,
    retryable,
    ...(typeof status === 'number' ? { status } : {}),
    ...(typeof retryAfterSeconds === 'number' ? { retry_after_seconds: retryAfterSeconds } : {}),
    ...(details && typeof details === 'object' ? { details } : {}),
    ...(warnings.length ? { warnings } : {}),
    suggested_response_markdown: `Icon recommendation could not complete for "${displayTask}". ${hint}`,
    next_step: hint,
  };
}

export function normalizeRecommendationToolArguments(
  args = {},
  { supportedLocales = [] } = {},
) {
  const warnings = [];
  const task = String(args.task || '').trim();
  const slots = Array.isArray(args.slots)
    ? args.slots.map((slot) => String(slot).trim()).filter(Boolean)
    : [];
  const library = String(args.library || '').trim() || undefined;
  const style = normalizeChoice(args.style, SEARCH_STYLES, 'any', 'style', warnings);
  const responseMode = normalizeChoice(
    args.response_mode,
    RECOMMENDATION_RESPONSE_MODES,
    'plan',
    'response_mode',
    warnings,
  );
  const locale = args.locale && supportedLocales.includes(args.locale)
    ? args.locale
    : undefined;
  if (args.locale && !locale) {
    warnings.push(`Ignored unsupported locale "${String(args.locale)}".`);
  }

  const requestedLimitPerSlot = Number(args.limit_per_slot);
  const finiteLimitPerSlot = Number.isFinite(requestedLimitPerSlot)
    ? Math.trunc(requestedLimitPerSlot)
    : 3;
  const limitPerSlot = Math.min(5, Math.max(1, finiteLimitPerSlot));
  if (args.limit_per_slot !== undefined && !Number.isFinite(requestedLimitPerSlot)) {
    warnings.push(`Ignored invalid choices-per-slot value "${String(args.limit_per_slot)}"; using 3.`);
  } else if (finiteLimitPerSlot !== limitPerSlot) {
    warnings.push(
      `Requested ${finiteLimitPerSlot} choices per slot; using ${limitPerSlot}. The supported range is 1 to 5.`,
    );
  }

  const normalized = {
    ...args,
    task,
    slots,
    library,
    style,
    locale,
    limit_per_slot: limitPerSlot,
    response_mode: responseMode,
    include_query_frame: args.include_query_frame === true,
    warnings,
  };

  if (!task) {
    normalized.input_error = buildRecommendationErrorResponse({
      ...normalized,
      responseMode,
      error: 'A task description is required for icon recommendations.',
      code: 'recommendation_task_required',
      hint: 'Add a short task description, for example "choose icons for a fitness app".',
      retryable: true,
      warnings,
    });
    return normalized;
  }

  if (slots.length === 0) {
    normalized.input_error = buildRecommendationErrorResponse({
      ...normalized,
      responseMode,
      error: 'At least one UI slot is required for icon recommendations.',
      code: 'recommendation_slots_required',
      hint: 'Add one or more slot labels, for example ["Workouts", "Progress", "Profile"].',
      retryable: true,
      warnings,
    });
    return normalized;
  }

  if (slots.length > MAX_RECOMMENDATION_SLOTS) {
    normalized.input_error = buildRecommendationErrorResponse({
      ...normalized,
      responseMode,
      error: `This request has ${slots.length} slots, but recommend_icons accepts up to ${MAX_RECOMMENDATION_SLOTS} in one call.`,
      code: 'recommendation_slot_limit_exceeded',
      hint: `Split the slots into groups of ${MAX_RECOMMENDATION_SLOTS} or fewer and call recommend_icons once for each group.`,
      retryable: true,
      details: {
        received_slot_count: slots.length,
        maximum_slot_count: MAX_RECOMMENDATION_SLOTS,
      },
      warnings,
    });
  }

  return normalized;
}

export function buildRecommendationFailurePresentation({
  task = '',
  library,
  style = 'any',
  responseMode = 'plan',
  slots = [],
  error,
  warnings = [],
} = {}) {
  const status = typeof error?.status === 'number' ? error.status : undefined;
  const code = typeof error?.code === 'string' ? error.code : 'recommendation_failed';
  const retryAfterSeconds = typeof error?.details?.retry_after_seconds === 'number'
    ? error.details.retry_after_seconds
    : typeof error?.retry_after_seconds === 'number'
      ? error.retry_after_seconds
      : undefined;
  const rateLimited = status === 429 || code.includes('rate_limit') || code.includes('allowance');
  const timedOut = code === 'hosted_search_timeout' || code === 'recommendation_timeout';

  let publicError = 'Supericons could not complete this icon recommendation.';
  let hint = 'Try the same request again. If it still fails, split the slots into smaller groups.';
  if (rateLimited) {
    publicError = 'The hosted icon recommendation limit was reached.';
    hint = typeof retryAfterSeconds === 'number'
      ? `Try again after ${retryAfterSeconds} seconds.`
      : 'Wait for the usage limit to reset, then try again.';
  } else if (timedOut) {
    publicError = 'The icon recommendation took too long and was stopped.';
    hint = 'Try again. If it times out again, split the slots into groups of 10 or fewer.';
  }

  const reason = typeof error?.message === 'string'
    ? error.message.trim().slice(0, 240)
    : null;
  const details = {
    ...(error?.details && typeof error.details === 'object' ? error.details : {}),
    ...(reason ? { reason } : {}),
  };

  return buildRecommendationErrorResponse({
    task,
    library,
    style,
    responseMode,
    slots,
    error: publicError,
    code,
    hint,
    retryable: typeof error?.retryable === 'boolean'
      ? error.retryable
      : rateLimited || timedOut || (typeof status === 'number' && status >= 500),
    status,
    retryAfterSeconds,
    details,
    warnings,
  });
}

function escapeMarkdownInline(value) {
  return String(value || '').replace(/([\\`*_[\]<>])/g, '\\$1');
}

function getIconRef(icon = {}) {
  return icon.icon_ref || (
    (icon.library || icon.library_key || icon.lib) && icon.id
      ? `${icon.library || icon.library_key || icon.lib}:${icon.id}`
      : null
  );
}

export function buildSearchMatchPresentation({
  query,
  results = [],
  previewUrl,
  imageUrl,
  markdownImage,
} = {}) {
  const shown = results.slice(0, 5);
  const itemLines = shown.map((icon) => {
    const ref = getIconRef(icon);
    const name = icon.name || icon.id || ref || 'Icon';
    return ref
      ? `- ${escapeMarkdownInline(name)} (\`${escapeMarkdownInline(ref)}\`)`
      : `- ${escapeMarkdownInline(name)}`;
  });
  const responseLines = [
    `Found ${results.length} icon option${results.length === 1 ? '' : 's'} for "${escapeMarkdownInline(query)}":`,
    '',
    ...itemLines,
  ];
  if (markdownImage) {
    responseLines.push('', markdownImage);
  }
  if (previewUrl) {
    responseLines.push('', `[Open the visual preview](${previewUrl})`);
  }
  return {
    image_url: imageUrl,
    markdown_image: markdownImage,
    suggested_response_markdown: responseLines.join('\n'),
    next_step: 'Choose an icon ref from the results, then call get_icon when you need the exact SVG.',
  };
}

export function buildSearchNoResultPresentation({ query, hint } = {}) {
  const safeHint = String(hint || 'Try a broader term or remove optional filters.').trim();
  return {
    suggested_response_markdown: `No matching icons were found for "${escapeMarkdownInline(query)}". ${safeHint}`,
    next_step: safeHint,
  };
}

export function buildSearchFailurePresentation({
  query,
  error,
  fallbackMessage = 'Icon search is unavailable.',
} = {}) {
  const retryAfterSeconds = typeof error?.details?.retry_after_seconds === 'number'
    ? error.details.retry_after_seconds
    : error?.retry_after_seconds;
  const hint = typeof error?.hint === 'string'
    ? error.hint
    : (
      typeof retryAfterSeconds === 'number'
        ? `Try again after ${retryAfterSeconds} seconds.`
        : 'Try again later or use local package search when it is available.'
    );
  return {
    error: typeof error?.message === 'string' ? error.message : fallbackMessage,
    ...(typeof error?.code === 'string' ? { code: error.code } : {}),
    ...(typeof error?.retryable === 'boolean' ? { retryable: error.retryable } : {}),
    ...(typeof error?.status === 'number' ? { status: error.status } : {}),
    ...(typeof retryAfterSeconds === 'number' ? { retry_after_seconds: retryAfterSeconds } : {}),
    ...(typeof error?.limit_scope === 'string' ? { limit_scope: error.limit_scope } : {}),
    ...(error?.details && typeof error.details === 'object' ? { details: error.details } : {}),
    suggested_response_markdown: `Icon search could not complete for "${escapeMarkdownInline(query)}". ${hint}`,
    next_step: hint,
  };
}
