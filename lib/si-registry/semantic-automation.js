import { buildReviewQueue, summarizeReviewQueue } from './review-routing.js';
import { validateRegistryRecord } from './record-shape.js';
import * as simpleIcons from 'simple-icons';

const DRAFT_ACCESS_TIER = 'private_operational_enrichment';
const DRAFT_PROJECTION_POLICY = 'internal_only';
const BRAND_IDENTITY_CATEGORY = 'brand_identity';
const BRAND_PLATFORM_FAMILY = 'brand_platforms';

const SIMPLE_ICON_FAMILY_HINTS = Object.freeze({
  ai_agents: ['openai', 'anthropic', 'claude', 'grok', 'perplexity', 'huggingface', 'ollama', 'langchain', 'deepseek'],
  analytics: ['amplitude', 'mixpanel', 'datadog', 'grafana', 'looker', 'tableau', 'metabase', 'sentry', 'newrelic'],
  commerce: ['paypal', 'stripe', 'shopify', 'visa', 'mastercard', 'klarna', 'square', 'cashapp', 'lemonsqueezy', 'patreon'],
  communication: ['discord', 'slack', 'telegram', 'whatsapp', 'wechat', 'messenger', 'line', 'zoom', 'skype', 'teams', 'reddit', 'snapchat', 'threads', 'x', 'twitter', 'tiktok', 'linkedin'],
  developer_tools: ['github', 'gitlab', 'vercel', 'netlify', 'docker', 'kubernetes', 'npm', 'react', 'vue', 'angular', 'svelte', 'vscode', 'postman', 'jira', 'notion', 'figma', 'framer'],
  media: ['spotify', 'youtube', 'netflix', 'twitch', 'vimeo', 'soundcloud', 'substack', 'applemusic', 'deezer'],
  navigation: ['googlemaps', 'mapbox', 'waze', 'uber', 'lyft', 'airbnb', 'bookingdotcom'],
  security: ['1password', 'auth0', 'okta', 'bitwarden', 'lastpass', 'proton', 'crowdstrike', 'snyk', 'tailscale'],
  ui_shell: ['googlechrome', 'firefox', 'safari', 'edge', 'opera', 'arc', 'windows', 'apple', 'android', 'ubuntu'],
});

const SIMPLE_ICON_AMBIGUOUS_SLUGS = new Set([
  'line',
  'x',
  'meta',
  'medium',
  'threads',
  'box',
  'cashapp',
  'square',
]);

function stripStyleSuffix(value) {
  return String(value || '').replace(/_(line|fill)$/i, '');
}

function tokenize(value) {
  return stripStyleSuffix(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function uniqueStrings(values) {
  const seen = new Set();
  const result = [];

  for (const value of values || []) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function hasToken(tokens, token) {
  return tokens.includes(token);
}

function hasAnyToken(tokens, expected) {
  return expected.some((token) => hasToken(tokens, token));
}

function hasAllTokens(tokens, expected) {
  return expected.every((token) => hasToken(tokens, token));
}

function buildLabelFromTokens(tokens) {
  return tokens
    .filter((token) => !/^\d+$/.test(token))
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function normalizeSourceName(sourceName) {
  return stripStyleSuffix(sourceName)
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function splitBrandTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function buildFallbackSynonyms(label, tokens, semanticTags) {
  return uniqueStrings([
    label,
    ...(semanticTags || []),
    ...tokens.map((token) => token.replace(/_/g, ' ')),
  ]);
}

function buildSimpleIconsMetadataIndex() {
  const entries = new Map();

  for (const value of Object.values(simpleIcons)) {
    if (!value || typeof value !== 'object' || !('slug' in value)) continue;
    entries.set(normalizeSourceName(value.slug), {
      title: value.title,
      slug: normalizeSourceName(value.slug),
      source: value.source || null,
      guidelines: value.guidelines || null,
      license: value.license || null,
    });
  }

  return entries;
}

const SIMPLE_ICONS_METADATA_INDEX = buildSimpleIconsMetadataIndex();

function buildReferenceIndex(approvedRecords) {
  const bySourceName = new Map();

  for (const record of approvedRecords || []) {
    bySourceName.set(normalizeSourceName(record.source_name), record);
  }

  return { bySourceName };
}

function buildSimpleIconsSynonyms(label, slug, titleTokens) {
  const slugAsWords = slug.replace(/_/g, ' ');
  const normalizedLabel = String(label || '').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const titleWords = titleTokens.join(' ');

  return uniqueStrings([
    label,
    normalizedLabel,
    slug,
    slugAsWords,
    titleWords,
  ]);
}

function detectSimpleIconsFamily(slug, titleTokens) {
  const haystack = new Set([slug, ...titleTokens]);

  for (const [familyKey, hints] of Object.entries(SIMPLE_ICON_FAMILY_HINTS)) {
    if (hints.some((hint) => haystack.has(normalizeSourceName(hint)))) {
      return familyKey;
    }
  }

  return BRAND_PLATFORM_FAMILY;
}

function buildSimpleIconsRoutingScore(metadata, slug, titleTokens) {
  let routingScore = 0.84;

  if (metadata?.source) routingScore += 0.03;
  if (metadata?.guidelines) routingScore += 0.03;
  if (metadata?.title) routingScore += 0.02;
  if (SIMPLE_ICON_AMBIGUOUS_SLUGS.has(slug)) routingScore -= 0.1;
  if (titleTokens.length <= 1 && titleTokens[0] && titleTokens[0].length <= 2) routingScore -= 0.06;

  return Math.max(0.66, Math.min(0.92, routingScore));
}

function buildSimpleIconsSelectionScore(metadata, familyKey, routingScore, slug) {
  let score = Math.round(routingScore * 10);
  if (metadata?.source) score += 2;
  if (metadata?.guidelines) score += 3;
  if (familyKey !== BRAND_PLATFORM_FAMILY) score += 2;
  if (SIMPLE_ICON_AMBIGUOUS_SLUGS.has(slug)) score -= 4;
  return score;
}

function buildSimpleIconsInternalSignals(slug, titleTokens) {
  if (SIMPLE_ICON_AMBIGUOUS_SLUGS.has(slug)) {
    return { conflicts: ['ambiguous_brand_name'] };
  }

  if (titleTokens.length <= 1 && titleTokens[0] && titleTokens[0].length <= 2) {
    return { conflicts: ['short_brand_mark'] };
  }

  return null;
}

function buildSimpleIconsDraft(iconRecord) {
  const sourceName = normalizeSourceName(iconRecord.id);
  const metadata = SIMPLE_ICONS_METADATA_INDEX.get(sourceName) || {
    title: iconRecord.name,
    slug: sourceName,
    source: null,
    guidelines: null,
    license: null,
  };
  const label = metadata.title || iconRecord.name || buildLabelFromTokens(tokenize(sourceName));
  const titleTokens = splitBrandTitle(label);
  const familyKey = detectSimpleIconsFamily(sourceName, titleTokens);
  const routingScore = buildSimpleIconsRoutingScore(metadata, sourceName, titleTokens);
  const internalSignals = buildSimpleIconsInternalSignals(sourceName, titleTokens);

  const candidateRecord = {
    icon_id: `simpleicons:${sourceName}`,
    source_group: 'free',
    source_library: 'simpleicons',
    source_name: sourceName,
    source_asset_name: iconRecord.id,
    label,
    purpose: `Show the official ${label} brand or product mark.`,
    category: BRAND_IDENTITY_CATEGORY,
    semantic_tags: uniqueStrings([
      label.toLowerCase(),
      'brand',
      'logo',
      familyKey.replace(/_/g, ' '),
      ...titleTokens,
    ]),
    use_when: `Use when the interface refers specifically to ${label} as a brand, login provider, connected service, supported platform, payment method, or official destination.`,
    avoid_when: `Do not use as a generic action, status, or non-${label} product icon when the meaning is not specifically ${label}.`,
    version: '1.0.0',
    status: 'draft',
    access_tier: DRAFT_ACCESS_TIER,
    projection_policy: DRAFT_PROJECTION_POLICY,
    is_premium: false,
    depicts: `The official ${label} brand or product mark.`,
    synonyms: buildSimpleIconsSynonyms(label, sourceName, titleTokens),
    evidence: uniqueStrings([
      'source_name',
      iconRecord.svg ? 'svg_payload' : 'metadata_only',
      'simple_icons_metadata',
      metadata.source ? 'official_source' : null,
      metadata.guidelines ? 'brand_guidelines' : null,
    ]),
    routing_score: routingScore,
  };

  if (internalSignals) {
    candidateRecord.internalSignals = internalSignals;
  }

  validateRegistryRecord(candidateRecord);

  return {
    sourceName,
    metadata,
    candidateRecord,
    familyKey,
    selectionScore: buildSimpleIconsSelectionScore(metadata, familyKey, routingScore, sourceName),
  };
}

function countMatches(tokens, expected) {
  return expected.reduce((count, token) => count + (hasToken(tokens, token) ? 1 : 0), 0);
}

function deriveFamilyKey(tokens) {
  if (hasAnyToken(tokens, ['arrow', 'back', 'forward', 'left', 'right', 'up', 'down', 'transfer', 'swap', 'undo', 'redo'])) {
    return 'navigation_motion';
  }
  if (hasToken(tokens, 'file')) return 'file_actions';
  if (hasToken(tokens, 'folder')) return 'folder_actions';
  if (hasAnyToken(tokens, ['search', 'scan'])) return 'search_discovery';
  if (hasAnyToken(tokens, ['message', 'mail', 'chat'])) return 'messages_mail';
  if (hasAnyToken(tokens, ['alert', 'warning', 'error', 'check', 'lock', 'unlock', 'shield', 'key', 'ban', 'bell', 'eye', 'toggle', 'power'])) {
    return 'status_security';
  }
  if (hasAnyToken(tokens, ['database', 'server', 'code', 'workflow', 'robot', 'bot', 'ai'])) return 'systems_ai';
  if (hasAnyToken(tokens, ['menu', 'home', 'dashboard', 'grid', 'list', 'sidebar', 'fullscreen', 'more'])) return 'ui_shell';
  if (hasAnyToken(tokens, ['play', 'pause', 'stop', 'next', 'previous'])) return 'media_controls';
  return 'generic_controls';
}

function buildSelectionScore(tokens, config, approvedReference) {
  const coreMatches = countMatches(tokens, config.core_tokens || []);
  const boostMatches = countMatches(tokens, config.boost_tokens || []);
  const excludeMatches = countMatches(tokens, config.exclude_tokens || []);
  const referenceBoost = approvedReference ? 5 : 0;
  const ambiguityPenalty = hasAnyToken(tokens, ['align', 'corner', 'selector', 'small', 'large']) ? 1 : 0;
  return coreMatches * 3 + boostMatches * 2 + referenceBoost - excludeMatches * 6 - ambiguityPenalty;
}

function pickApprovedReference(tokens, referenceIndex) {
  const exactKey = normalizeSourceName(tokens.join('_'));
  if (referenceIndex.bySourceName.has(exactKey)) {
    return referenceIndex.bySourceName.get(exactKey);
  }

  if (hasToken(tokens, 'home')) return referenceIndex.bySourceName.get('home');
  if (hasToken(tokens, 'menu')) return referenceIndex.bySourceName.get('menu');
  if (hasAllTokens(tokens, ['arrow', 'back']) || hasToken(tokens, 'back')) return referenceIndex.bySourceName.get('arrow_back') || referenceIndex.bySourceName.get('chevron_left');
  if (hasAllTokens(tokens, ['arrow', 'forward']) || hasToken(tokens, 'forward')) return referenceIndex.bySourceName.get('arrow_forward') || referenceIndex.bySourceName.get('chevron_right');
  if (hasToken(tokens, 'search') && hasToken(tokens, 'file')) return referenceIndex.bySourceName.get('file-search');
  if (hasToken(tokens, 'search') && hasToken(tokens, 'folder')) return referenceIndex.bySourceName.get('folder-search');
  if (hasToken(tokens, 'search') && hasToken(tokens, 'code')) return referenceIndex.bySourceName.get('search-code');
  if (hasToken(tokens, 'search')) return referenceIndex.bySourceName.get('search');
  if (hasToken(tokens, 'filter')) return referenceIndex.bySourceName.get('filter');
  if (hasToken(tokens, 'sort')) return referenceIndex.bySourceName.get('sort');
  if (hasToken(tokens, 'refresh')) return referenceIndex.bySourceName.get('refresh');
  if (hasAnyToken(tokens, ['trash', 'delete'])) return referenceIndex.bySourceName.get('trash');
  if (hasToken(tokens, 'toggle') && hasToken(tokens, 'right')) return referenceIndex.bySourceName.get('toggle-right');
  if (hasToken(tokens, 'lock') && hasToken(tokens, 'open')) return referenceIndex.bySourceName.get('lock-open');
  if (hasToken(tokens, 'lock')) return referenceIndex.bySourceName.get('lock');
  if (hasToken(tokens, 'key')) return referenceIndex.bySourceName.get('key');
  if (hasToken(tokens, 'shield') && hasToken(tokens, 'check')) return referenceIndex.bySourceName.get('shield-check');
  if (hasToken(tokens, 'info')) return referenceIndex.bySourceName.get('info-circle');
  if (hasAnyToken(tokens, ['warning', 'alert'])) return referenceIndex.bySourceName.get('alert-triangle') || referenceIndex.bySourceName.get('alert-circle');
  if (hasToken(tokens, 'eye') && hasToken(tokens, 'close')) return referenceIndex.bySourceName.get('eye-off');
  if (hasToken(tokens, 'eye')) return referenceIndex.bySourceName.get('eye');
  if (hasToken(tokens, 'workflow')) return referenceIndex.bySourceName.get('workflow');
  if (hasToken(tokens, 'database')) return referenceIndex.bySourceName.get('database');
  if (hasToken(tokens, 'server')) return referenceIndex.bySourceName.get('server-cog');
  if (hasToken(tokens, 'code')) return referenceIndex.bySourceName.get('code-xml');
  if (hasToken(tokens, 'dashboard')) return referenceIndex.bySourceName.get('dashboard');
  if (hasAllTokens(tokens, ['message', 'ai']) || hasAllTokens(tokens, ['mail', 'ai']) || hasAllTokens(tokens, ['search', 'ai'])) {
    return referenceIndex.bySourceName.get('bot-message-square') || referenceIndex.bySourceName.get('brain-circuit');
  }

  return null;
}

function buildDraftFromReference(iconRecord, sourceName, referenceRecord, libraryId = 'mingcute') {
  const tokens = tokenize(sourceName);
  const label = referenceRecord.label || buildLabelFromTokens(tokens);
  const semanticTags = uniqueStrings(referenceRecord.semantic_tags || []);
  const synonyms = uniqueStrings(referenceRecord.synonyms || []);
  const candidateRecord = {
    icon_id: `${libraryId}:${normalizeSourceName(sourceName)}`,
    source_group: 'free',
    source_library: libraryId,
    source_name: normalizeSourceName(sourceName),
    source_asset_name: iconRecord.id,
    label,
    purpose: referenceRecord.purpose,
    category: referenceRecord.category,
    semantic_tags: semanticTags,
    use_when: referenceRecord.use_when,
    avoid_when: referenceRecord.avoid_when,
    version: '1.0.0',
    status: 'draft',
    access_tier: DRAFT_ACCESS_TIER,
    projection_policy: DRAFT_PROJECTION_POLICY,
    is_premium: false,
    depicts: referenceRecord.depicts,
    synonyms: synonyms.length > 0 ? synonyms : buildFallbackSynonyms(label, tokens, semanticTags),
    evidence: uniqueStrings(['source_name', 'approved_reference', iconRecord.svg ? 'svg_payload' : 'metadata_only']),
    routing_score: 0.9,
  };

  validateRegistryRecord(candidateRecord);
  return candidateRecord;
}

function profileFromTokens(tokens) {
  if (hasAllTokens(tokens, ['file', 'search'])) {
    return {
      label: 'File Search',
      purpose: 'Show searching within files, file lookup, or finding a file by name or content.',
      category: 'search_discovery',
      semantic_tags: ['file search', 'find file', 'search files', 'lookup', 'discover'],
      synonyms: ['search file', 'find file', 'lookup file', 'file lookup'],
      use_when: 'Use when the interface searches for files by name, path, or contents.',
      avoid_when: 'Do not use for folder-only search or generic global search when the meaning is specifically file lookup.',
      depicts: 'A file symbol paired with a search or lookup cue.',
      routing_score: 0.87,
    };
  }

  if (hasAllTokens(tokens, ['folder', 'search'])) {
    return {
      label: 'Folder Search',
      purpose: 'Show searching within folders, folder lookup, or finding a folder by name.',
      category: 'search_discovery',
      semantic_tags: ['folder search', 'find folder', 'search folders', 'lookup', 'discover'],
      synonyms: ['search folder', 'find folder', 'lookup folder', 'folder lookup'],
      use_when: 'Use when the interface searches for folders or navigable containers.',
      avoid_when: 'Do not use for generic file search when the meaning is specifically folder lookup.',
      depicts: 'A folder symbol paired with a search or lookup cue.',
      routing_score: 0.87,
    };
  }

  if (hasToken(tokens, 'search')) {
    const label = hasToken(tokens, 'scan') ? 'Scan Search' : 'Search';
    return {
      label,
      purpose: hasToken(tokens, 'scan')
        ? 'Show scanning, inspection, or retrieval-driven search over content or data.'
        : 'Show search, lookup, or find behavior over content, records, or interface surfaces.',
      category: hasToken(tokens, 'scan') ? 'agent_lifecycle' : 'search_discovery',
      semantic_tags: uniqueStrings(['search', 'lookup', hasToken(tokens, 'scan') ? 'inspection' : 'find', ...tokens]),
      synonyms: uniqueStrings(['find', 'lookup', 'search items', ...tokens.map((token) => `${token} search`)]),
      use_when: 'Use when the interface helps the user find, inspect, or look up content.',
      avoid_when: 'Do not use for filtering or sort-only controls when the meaning is specifically search.',
      depicts: 'A search symbol or magnifying glass linked to a specific search target.',
      routing_score: 0.84,
    };
  }

  if (hasAnyToken(tokens, ['back', 'left']) && !hasToken(tokens, 'align')) {
    return {
      label: 'Back',
      purpose: 'Show a back action or a move to the previous screen, panel, or step.',
      category: 'navigation_interface',
      semantic_tags: uniqueStrings(['back', 'previous', 'left', 'navigation', ...tokens]),
      synonyms: ['go back', 'previous screen', 'return', 'back navigation'],
      use_when: 'Use when the interface moves backward to the previous screen, panel, or navigation level.',
      avoid_when: 'Do not use for undo or dismiss when the action is not actual back navigation.',
      depicts: 'A left-facing arrow or backward navigation cue.',
      routing_score: 0.86,
    };
  }

  if (hasAnyToken(tokens, ['forward', 'right']) && !hasToken(tokens, 'align')) {
    return {
      label: 'Forward',
      purpose: 'Show a forward action or a move to the next screen, panel, or step.',
      category: 'navigation_interface',
      semantic_tags: uniqueStrings(['forward', 'next', 'right', 'navigation', ...tokens]),
      synonyms: ['go forward', 'next screen', 'continue', 'forward navigation'],
      use_when: 'Use when the interface moves to the next screen, panel, or navigation level.',
      avoid_when: 'Do not use for send or submit when the action is not actual forward navigation.',
      depicts: 'A right-facing arrow or forward navigation cue.',
      routing_score: 0.86,
    };
  }

  if (hasToken(tokens, 'up') || hasToken(tokens, 'down')) {
    const upward = hasToken(tokens, 'up');
    return {
      label: upward ? 'Move Up' : 'Move Down',
      purpose: upward
        ? 'Show upward movement, upward navigation, or moving an item to a higher position.'
        : 'Show downward movement, downward navigation, or moving an item to a lower position.',
      category: 'navigation_interface',
      semantic_tags: uniqueStrings([upward ? 'up' : 'down', 'move', 'navigation', ...tokens]),
      synonyms: upward ? ['move up', 'go up', 'higher position'] : ['move down', 'go down', 'lower position'],
      use_when: upward
        ? 'Use when the interface moves upward in order, hierarchy, or directional navigation.'
        : 'Use when the interface moves downward in order, hierarchy, or directional navigation.',
      avoid_when: upward
        ? 'Do not use for upload or positive trend when the meaning is not actual upward movement.'
        : 'Do not use for download or decline when the meaning is not actual downward movement.',
      depicts: upward ? 'An upward arrow or movement cue.' : 'A downward arrow or movement cue.',
      routing_score: 0.82,
    };
  }

  if (hasAnyToken(tokens, ['menu', 'sidebar', 'dashboard', 'grid', 'list', 'home', 'fullscreen', 'more'])) {
    let label = 'Menu';
    let purpose = 'Show the main menu, navigation drawer, or app-level menu entry point.';
    if (hasToken(tokens, 'home')) {
      label = 'Home';
      purpose = 'Show the home destination, root view, or primary landing area of the product.';
    } else if (hasToken(tokens, 'dashboard')) {
      label = 'Dashboard';
      purpose = 'Show a dashboard, overview screen, or main control surface.';
    } else if (hasToken(tokens, 'grid')) {
      label = 'Grid View';
      purpose = 'Show a grid layout or switching content into a grid view.';
    } else if (hasToken(tokens, 'list')) {
      label = 'List View';
      purpose = 'Show a list layout or switching content into a list view.';
    } else if (hasToken(tokens, 'fullscreen')) {
      label = hasToken(tokens, 'exit') ? 'Exit Fullscreen' : 'Fullscreen';
      purpose = hasToken(tokens, 'exit')
        ? 'Show leaving fullscreen mode or restoring the normal layout.'
        : 'Show entering fullscreen mode or expanding the current surface.';
    } else if (hasToken(tokens, 'more')) {
      label = 'More Options';
      purpose = 'Show an overflow menu with more actions or options.';
    }

    return {
      label,
      purpose,
      category: 'navigation_interface',
      semantic_tags: uniqueStrings([label.toLowerCase(), ...tokens]),
      synonyms: uniqueStrings([label.toLowerCase(), `${label.toLowerCase()} control`, ...tokens.map((token) => `${token} menu`)]),
      use_when: 'Use when the interface opens, switches, or focuses a main layout, navigation entry, or shell surface.',
      avoid_when: 'Do not use for settings or unrelated status when the meaning is specifically shell or layout control.',
      depicts: 'A shell or layout control symbol used for major navigation and view changes.',
      routing_score: 0.83,
    };
  }

  if (hasAnyToken(tokens, ['refresh', 'undo', 'redo', 'swap', 'transfer', 'toggle', 'power', 'drag'])) {
    let label = buildLabelFromTokens(tokens) || 'Control';
    let purpose = 'Show a system control action or a reversible interface action.';
    if (hasToken(tokens, 'refresh')) {
      label = 'Refresh';
      purpose = 'Show refreshing or reloading the current view, results, or content state.';
    } else if (hasToken(tokens, 'undo')) {
      label = 'Undo';
      purpose = 'Show undoing the most recent action.';
    } else if (hasToken(tokens, 'redo')) {
      label = 'Redo';
      purpose = 'Show redoing an action that was previously undone.';
    } else if (hasToken(tokens, 'toggle')) {
      label = hasToken(tokens, 'left') ? 'Disabled Toggle' : 'Enabled Toggle';
      purpose = hasToken(tokens, 'left')
        ? 'Show that a setting, control, or feature is switched off or disabled.'
        : 'Show that a setting, control, or feature is switched on or enabled.';
    } else if (hasToken(tokens, 'power')) {
      label = 'Power';
      purpose = 'Show powering on, powering off, or the main power state of a feature or system.';
    } else if (hasToken(tokens, 'drag')) {
      label = 'Drag Handle';
      purpose = 'Show that an item can be dragged, moved, or reordered.';
    }

    return {
      label,
      purpose,
      category: hasToken(tokens, 'toggle') ? 'status_feedback' : 'system_control',
      semantic_tags: uniqueStrings([...tokens, 'control']),
      synonyms: uniqueStrings([label.toLowerCase(), ...tokens.map((token) => `${token} control`)]),
      use_when: 'Use when the interface applies a direct control action or changes a local system state.',
      avoid_when: 'Do not use for navigation or passive status when the meaning is an active control action.',
      depicts: 'A control symbol used for state changes, refresh, or interaction handling.',
      routing_score: 0.82,
    };
  }

  if (hasAnyToken(tokens, ['trash', 'delete'])) {
    return {
      label: 'Delete',
      purpose: 'Show delete, discard, or remove actions for content or items.',
      category: 'destructive_actions',
      semantic_tags: uniqueStrings(['delete', 'remove', 'discard', ...tokens]),
      synonyms: ['delete item', 'remove item', 'discard', 'trash'],
      use_when: 'Use when the interface removes or discards content or items.',
      avoid_when: 'Do not use for close or hide actions when the meaning is not permanent removal.',
      depicts: 'A delete or trash symbol used for removal.',
      routing_score: 0.9,
    };
  }

  if (hasAnyToken(tokens, ['check', 'alert', 'warning', 'info', 'ban', 'eye', 'bell'])) {
    let label = 'Status';
    let purpose = 'Show an informative or attention-related status in the interface.';
    if (hasToken(tokens, 'check')) {
      label = 'Confirmed';
      purpose = 'Show a confirmed, completed, or accepted state.';
    } else if (hasAnyToken(tokens, ['alert', 'warning'])) {
      label = 'Warning';
      purpose = 'Show a warning, caution, or state that needs attention.';
    } else if (hasToken(tokens, 'info')) {
      label = 'Info';
      purpose = 'Show additional information, explanation, or a helpful details state.';
    } else if (hasToken(tokens, 'ban')) {
      label = 'Blocked';
      purpose = 'Show that an action, object, or state is blocked, prohibited, or not allowed.';
    } else if (hasToken(tokens, 'eye')) {
      label = hasToken(tokens, 'close') ? 'Hidden' : 'Visible';
      purpose = hasToken(tokens, 'close')
        ? 'Show hidden or obscured visibility state.'
        : 'Show visible or reveal state.';
    } else if (hasToken(tokens, 'bell')) {
      label = 'Notification';
      purpose = 'Show notifications, alerts, or attention for incoming events.';
    }

    return {
      label,
      purpose,
      category: 'status_feedback',
      semantic_tags: uniqueStrings([...tokens, 'status']),
      synonyms: uniqueStrings([label.toLowerCase(), ...tokens.map((token) => `${token} status`)]),
      use_when: 'Use when the interface needs to communicate status, visibility, or attention-related feedback.',
      avoid_when: 'Do not use for navigation or setup controls when the meaning is status feedback.',
      depicts: 'A status or attention symbol used to communicate state clearly.',
      routing_score: 0.85,
    };
  }

  if (hasAnyToken(tokens, ['lock', 'unlock', 'shield', 'key'])) {
    let label = 'Security';
    let purpose = 'Show protection, access, or a security-related control or state.';
    if (hasToken(tokens, 'unlock')) {
      label = 'Unlocked';
      purpose = 'Show open access, unlocked state, or released protection.';
    } else if (hasToken(tokens, 'lock')) {
      label = 'Locked';
      purpose = 'Show locked access, secured content, or protected state.';
    } else if (hasToken(tokens, 'shield')) {
      label = hasToken(tokens, 'check') ? 'Shield Check' : 'Protection';
      purpose = hasToken(tokens, 'check')
        ? 'Show verified protection, trusted status, or a confirmed security safeguard.'
        : 'Show protection, defense, or a security safeguard.';
    } else if (hasToken(tokens, 'key')) {
      label = 'Access Key';
      purpose = 'Show access credentials, secret keys, or a secure key-based action.';
    }

    return {
      label,
      purpose,
      category: hasToken(tokens, 'shield') ? 'security' : 'security_auth',
      semantic_tags: uniqueStrings([...tokens, 'security']),
      synonyms: uniqueStrings([label.toLowerCase(), 'secure access', ...tokens.map((token) => `${token} security`)]),
      use_when: 'Use when the interface refers to protection, authentication, access control, or secure credentials.',
      avoid_when: 'Do not use for simple status or navigation when the meaning is specifically security or access.',
      depicts: 'A security symbol used for access, protection, or trusted safeguards.',
      routing_score: 0.88,
    };
  }

  if (hasAnyToken(tokens, ['database', 'server', 'code', 'workflow', 'robot', 'bot', 'ai'])) {
    let label = buildLabelFromTokens(tokens) || 'System';
    let purpose = 'Show a technical system, developer surface, or AI-related operation.';
    let category = 'systems_architecture';
    if (hasToken(tokens, 'workflow')) {
      label = 'Workflow';
      purpose = 'Show a multi-step workflow, orchestration path, or linked automation sequence.';
      category = 'agent_lifecycle';
    } else if (hasToken(tokens, 'database')) {
      label = 'Database';
      purpose = 'Show structured data storage, a database surface, or stored records.';
      category = 'analytics_data';
    } else if (hasToken(tokens, 'code')) {
      label = 'Code';
      purpose = 'Show source code, markup, structured syntax, or developer-facing code views.';
      category = 'engineering_developer_tools';
    } else if (hasToken(tokens, 'server')) {
      label = 'Server Control';
      purpose = 'Show server-side control, configuration, or backend operation.';
    } else if (hasAnyToken(tokens, ['robot', 'bot', 'ai'])) {
      label = hasAnyToken(tokens, ['message', 'mail']) ? 'Assistant Message' : 'AI Assist';
      purpose = hasAnyToken(tokens, ['message', 'mail'])
        ? 'Show that a message, suggestion, or reply came from an AI assistant or automated agent.'
        : 'Show AI assistance, model-generated help, or an automated agent feature.';
      category = 'agent_lifecycle';
    }

    return {
      label,
      purpose,
      category,
      semantic_tags: uniqueStrings([...tokens, category.replace(/_/g, ' ')]),
      synonyms: uniqueStrings([label.toLowerCase(), ...tokens.map((token) => `${token} tool`)]),
      use_when: 'Use when the interface refers to developer work, technical structure, or AI-assisted system behavior.',
      avoid_when: 'Do not use for everyday consumer actions when the meaning is specifically technical or AI-system oriented.',
      depicts: 'A technical or AI-oriented symbol used for system behavior and tooling.',
      routing_score: 0.84,
    };
  }

  if (hasAnyToken(tokens, ['message', 'mail', 'send'])) {
    return {
      label: hasToken(tokens, 'send') ? 'Send' : hasToken(tokens, 'mail') ? 'Mail' : 'Message',
      purpose: hasToken(tokens, 'send')
        ? 'Show an outbound send, submit, or dispatch action for messages, content, or requests.'
        : hasToken(tokens, 'mail')
          ? 'Show mail, email communication, or an email-related action.'
          : 'Show messages, conversation, or a communication surface.',
      category: hasToken(tokens, 'send') ? 'message_actions' : 'communication_social',
      semantic_tags: uniqueStrings([...tokens, 'communication']),
      synonyms: uniqueStrings(['message', 'mail', 'send', ...tokens.map((token) => `${token} message`)]),
      use_when: 'Use when the interface refers to communication, message handling, email, or sending content out.',
      avoid_when: 'Do not use for generic navigation when the meaning is specifically communication or message action.',
      depicts: 'A message or mail symbol used for communication and message flow.',
      routing_score: 0.84,
    };
  }

  if (hasAnyToken(tokens, ['file', 'folder', 'download', 'upload', 'open', 'link'])) {
    let label = hasToken(tokens, 'folder') ? 'Folder' : 'File';
    let purpose = hasToken(tokens, 'folder')
      ? 'Show a folder, container, or directory-related action.'
      : 'Show a file, document, or file-related action.';

    if (hasToken(tokens, 'download')) {
      label = hasToken(tokens, 'folder') ? 'Download Folder' : 'Download File';
      purpose = hasToken(tokens, 'folder')
        ? 'Show downloading or exporting a folder-like container.'
        : 'Show downloading, exporting, or saving a file.';
    } else if (hasToken(tokens, 'upload')) {
      label = hasToken(tokens, 'folder') ? 'Upload Folder' : 'Upload File';
      purpose = hasToken(tokens, 'folder')
        ? 'Show uploading or importing a folder-like container.'
        : 'Show uploading, importing, or adding a file.';
    } else if (hasToken(tokens, 'open')) {
      label = hasToken(tokens, 'folder') ? 'Open Folder' : 'Open File';
      purpose = hasToken(tokens, 'folder')
        ? 'Show opening a folder or entering a file container.'
        : 'Show opening a file or entering a document view.';
    } else if (hasToken(tokens, 'link')) {
      label = 'Linked File';
      purpose = 'Show a linked file, connected document, or reference to external file content.';
    }

    return {
      label,
      purpose,
      category: 'system_control',
      semantic_tags: uniqueStrings([...tokens, hasToken(tokens, 'folder') ? 'folder' : 'file']),
      synonyms: uniqueStrings([label.toLowerCase(), ...tokens.map((token) => `${token} ${hasToken(tokens, 'folder') ? 'folder' : 'file'}`)]),
      use_when: 'Use when the interface refers to basic file or folder handling such as opening, importing, exporting, or linking.',
      avoid_when: 'Do not use for abstract system status when the meaning is specifically about files or folders.',
      depicts: 'A file or folder symbol paired with an action or state cue.',
      routing_score: 0.8,
    };
  }

  const fallbackLabel = buildLabelFromTokens(tokens) || 'Icon';
  let fallbackDomain = 'ui_controls';
  if (hasAnyToken(tokens, ['user', 'profile', 'heart', 'star', 'emoji', 'message'])) {
    fallbackDomain = 'communication';
  } else if (hasAnyToken(tokens, ['map', 'pin', 'location', 'airplane', 'car', 'ship'])) {
    fallbackDomain = 'navigation';
  } else if (hasAnyToken(tokens, ['music', 'album', 'video', 'camera', 'pic', 'photo'])) {
    fallbackDomain = 'media';
  }

  return {
    label: fallbackLabel,
    purpose: `Show ${fallbackLabel.toLowerCase()} as a direct object, concept, or themed surface cue.`,
    category: 'status_feedback',
    semantic_tags: uniqueStrings(tokens),
    synonyms: uniqueStrings(tokens.map((token) => token.replace(/_/g, ' '))),
    use_when: `Use when the interface refers directly to ${fallbackLabel.toLowerCase()} as an object, concept, or themed surface cue.`,
    avoid_when: 'Do not use when the product needs a more specific action, status, or domain meaning than this generic draft can support.',
    depicts: `A symbol representing ${fallbackLabel.toLowerCase()}.`,
    routing_score: 0.7,
  };
}

function buildHeuristicDraft(iconRecord, sourceName, libraryId = 'mingcute') {
  const tokens = tokenize(sourceName);
  const profile = profileFromTokens(tokens);

  const candidateRecord = {
    icon_id: `${libraryId}:${normalizeSourceName(sourceName)}`,
    source_group: 'free',
    source_library: libraryId,
    source_name: normalizeSourceName(sourceName),
    source_asset_name: iconRecord.id,
    label: profile.label,
    purpose: profile.purpose,
    category: profile.category,
    semantic_tags: uniqueStrings(profile.semantic_tags),
    use_when: profile.use_when,
    avoid_when: profile.avoid_when,
    version: '1.0.0',
    status: 'draft',
    access_tier: DRAFT_ACCESS_TIER,
    projection_policy: DRAFT_PROJECTION_POLICY,
    is_premium: false,
    depicts: profile.depicts,
    synonyms: uniqueStrings(profile.synonyms),
    evidence: uniqueStrings(['source_name', iconRecord.svg ? 'svg_payload' : 'metadata_only']),
    routing_score: profile.routing_score,
  };

  validateRegistryRecord(candidateRecord);
  return candidateRecord;
}

function buildWorklistItem(iconRecord, libraryId, sourceName, selectionScore, familyKey, approvedReference, rank) {
  return {
    rank,
    icon_id: `${libraryId}:${sourceName}`,
    source_library: libraryId,
    source_asset_name: iconRecord.id,
    source_name: sourceName,
    label: iconRecord.name,
    family_key: familyKey,
    selection_score: selectionScore,
    approved_reference_icon_id: approvedReference?.icon_id || null,
    style: iconRecord.style,
    type: iconRecord.type,
  };
}

function selectUiSemanticBatchIcons(iconIndexEntries, approvedRecords, batchConfig, options = {}) {
  const excludedIconIds = new Set(options.excludedIconIds || []);
  const referenceIndex = buildReferenceIndex(approvedRecords);
  const familyCaps = batchConfig.family_caps || {};
  const familyCounts = new Map();

  const candidates = (iconIndexEntries || [])
    .filter((entry) => entry.lib === batchConfig.library_id)
    .map((entry) => {
      const sourceName = normalizeSourceName(entry.id);
      const tokens = tokenize(sourceName);
      const approvedReference = pickApprovedReference(tokens, referenceIndex);
      const familyKey = deriveFamilyKey(tokens);
      const selectionScore = buildSelectionScore(tokens, batchConfig, approvedReference);

      return {
        entry,
        sourceName,
        tokens,
        familyKey,
        approvedReference,
        selectionScore,
      };
    })
    .filter((item) => !excludedIconIds.has(`${batchConfig.library_id}:${item.sourceName}`))
    .filter((item) => item.selectionScore >= (batchConfig.score_threshold || 0))
    .sort((left, right) => {
      const scoreDelta = right.selectionScore - left.selectionScore;
      if (scoreDelta !== 0) return scoreDelta;
      return left.entry.id.localeCompare(right.entry.id);
    });

  const selected = [];
  for (const candidate of candidates) {
    if (selected.length >= batchConfig.target_size) {
      break;
    }

    const currentCount = familyCounts.get(candidate.familyKey) || 0;
    const familyCap = familyCaps[candidate.familyKey] ?? batchConfig.target_size;
    if (currentCount >= familyCap) {
      continue;
    }

    familyCounts.set(candidate.familyKey, currentCount + 1);
    selected.push(candidate);
  }

  return selected.map((candidate, index) => {
    const worklistItem = buildWorklistItem(
      candidate.entry,
      batchConfig.library_id,
      candidate.sourceName,
      candidate.selectionScore,
      candidate.familyKey,
      candidate.approvedReference,
      index + 1
    );

    const candidateRecord = candidate.approvedReference
      ? buildDraftFromReference(candidate.entry, candidate.entry.id, candidate.approvedReference, batchConfig.library_id)
      : buildHeuristicDraft(candidate.entry, candidate.entry.id, batchConfig.library_id);

    if (!candidate.approvedReference && candidateRecord.routing_score > 0.86) {
      candidateRecord.routing_score = 0.86;
    }

    const reviewQueueItem = buildReviewQueue([candidateRecord])[0];

    return {
      worklistItem,
      candidateRecord,
      reviewQueueItem,
      approvedReference: candidate.approvedReference
        ? {
            icon_id: candidate.approvedReference.icon_id,
            label: candidate.approvedReference.label,
            category: candidate.approvedReference.category,
          }
        : null,
    };
  });
}

function selectBrandSemanticBatchIcons(iconIndexEntries, batchConfig, options = {}) {
  const excludedIconIds = new Set(options.excludedIconIds || []);
  const familyCaps = batchConfig.family_caps || {};

  const candidates = (iconIndexEntries || [])
    .filter((entry) => entry.lib === batchConfig.library_id)
    .map((entry) => {
      const sourceName = normalizeSourceName(entry.id);
      const draft = buildSimpleIconsDraft(entry);
      return {
        entry,
        sourceName,
        ...draft,
      };
    })
    .filter((item) => !excludedIconIds.has(`${batchConfig.library_id}:${item.sourceName}`))
    .filter((item) => item.selectionScore >= (batchConfig.score_threshold || 0))
    .sort((left, right) => {
      const scoreDelta = right.selectionScore - left.selectionScore;
      if (scoreDelta !== 0) return scoreDelta;
      return left.sourceName.localeCompare(right.sourceName);
    });

  const selected = [];
  const familyCounts = new Map();

  for (const candidate of candidates) {
    if (selected.length >= batchConfig.target_size) {
      break;
    }

    const currentCount = familyCounts.get(candidate.familyKey) || 0;
    const familyCap = familyCaps[candidate.familyKey] ?? batchConfig.target_size;
    if (currentCount >= familyCap) {
      continue;
    }

    familyCounts.set(candidate.familyKey, currentCount + 1);
    selected.push(candidate);
  }

  return selected.map((candidate, index) => ({
    worklistItem: buildWorklistItem(
      candidate.entry,
      batchConfig.library_id,
      candidate.sourceName,
      candidate.selectionScore,
      candidate.familyKey,
      null,
      index + 1
    ),
    candidateRecord: candidate.candidateRecord,
    reviewQueueItem: buildReviewQueue([candidate.candidateRecord])[0],
    approvedReference: null,
  }));
}

export function selectSemanticAutomationBatchIcons(iconIndexEntries, approvedRecords, batchConfig, options = {}) {
  if (batchConfig.template_mode === 'brand_semantics') {
    return selectBrandSemanticBatchIcons(iconIndexEntries, batchConfig, options);
  }

  return selectUiSemanticBatchIcons(iconIndexEntries, approvedRecords, batchConfig, options);
}

export function buildSemanticAutomationBatchArtifacts({ iconIndexEntries, approvedRecords, batchConfig, excludedIconIds = [] }) {
  const batchItems = selectSemanticAutomationBatchIcons(iconIndexEntries, approvedRecords, batchConfig, { excludedIconIds });
  const worklist = batchItems.map((item) => item.worklistItem);
  const candidateRecords = batchItems.map((item) => item.candidateRecord);
  const reviewQueue = batchItems.map((item) => item.reviewQueueItem);
  const reviewSummary = summarizeReviewQueue(reviewQueue);
  const selectedCount = worklist.length;
  const referenceMatchCount = batchItems.filter((item) => item.approvedReference).length;
  const familyCounts = worklist.reduce((counts, item) => {
    counts[item.family_key] = (counts[item.family_key] || 0) + 1;
    return counts;
  }, {});

  const summary = {
    schema_version: '1.0.0',
    batch_id: batchConfig.batch_id,
    library_id: batchConfig.library_id,
    library_label: batchConfig.library_label,
    selected_count: selectedCount,
    target_size: batchConfig.target_size,
    target_min: batchConfig.target_min,
    target_max: batchConfig.target_max,
    reference_match_count: referenceMatchCount,
    family_counts: familyCounts,
    review_queue_counts: reviewSummary.byOutcome,
    routing_band_counts: reviewSummary.byBand,
  };

  return {
    worklist,
    candidateRecords,
    reviewQueue,
    summary,
  };
}
