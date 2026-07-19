import { normalizeSearchQueryRequest } from './search-query-normalization.js';

export const SEARCH_TOOL_SERVER_INSTRUCTIONS = [
  'Use search_icons as the main tool when a user asks for icons.',
  'When search_icons returns markdown_image, include it in the final answer so the user can see the result set.',
  'The suggested_response_markdown field is safe to use as a compact answer, or it can be rewritten without changing the icon names and refs.',
  'If search_icons returns no_icons_found, do not invent an icon. Follow next_step or explain the honest no-result.',
  'Use preview_icons only to refine a result set or preview known icon refs.',
].join(' ');

export const SEARCH_LIBRARY_MODES = ['strict', 'prefer', 'all'];
export const SEARCH_STYLES = ['any', 'outline', 'solid'];
export const MAX_PREVIEW_ICONS = 12;
export const MAX_ACCEPTED_PREVIEW_REFS = 100;

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
  const iconRefs = Array.isArray(args.icon_refs) ? args.icon_refs : [];
  const effectiveLimit = Math.min(MAX_PREVIEW_ICONS, Math.max(1, Number(args.limit) || MAX_PREVIEW_ICONS));
  const selectedIconRefs = iconRefs.slice(0, effectiveLimit);
  return {
    ...normalized,
    limit: effectiveLimit,
    icon_refs: selectedIconRefs,
    truncated_from: iconRefs.length > selectedIconRefs.length ? iconRefs.length : null,
  };
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
