import { getPurposeChipLaneConfig, PURPOSE_CHIP_LANE_ORDER } from './purpose-chip-pilot.js';
import { validateRegistryRecord } from './record-shape.js';

const STAGED_ACCESS_TIER = 'private_operational_enrichment';
const STAGED_PROJECTION_POLICY = 'internal_only';

export const SCALE_UP_NEXT_STEPS = Object.freeze([
  'editor_review',
  'visual_review',
  'text_review',
  'manual_tightening',
]);

function toTitleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function tokenize(value) {
  return String(value || '')
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

function hasAllTokens(tokens, expected) {
  return expected.every((token) => hasToken(tokens, token));
}

function isVisualPayloadReady(visualPayloadStatus) {
  return visualPayloadStatus === 'svg_available' || visualPayloadStatus === 'svg_available_local_material';
}

function clampConfidence(value) {
  return Number(Math.max(0.52, Math.min(0.94, value)).toFixed(2));
}

function buildFallbackSemanticProfile(candidateRecord) {
  const laneConfig = getPurposeChipLaneConfig(candidateRecord.purpose_chip_category_id);
  const label = toTitleCase(candidateRecord.source_name);

  return {
    label,
    depicts: `${label} shown as an interface symbol.`,
    purpose: candidateRecord.purpose,
    category: candidateRecord.category,
    intent: laneConfig.intent,
    domain: laneConfig.domain,
    semantic_tags: uniqueStrings(candidateRecord.semantic_tags || []),
    synonyms: uniqueStrings([label.toLowerCase(), candidateRecord.source_name.replace(/[_-]+/g, ' ')]),
    use_when: candidateRecord.use_when,
    avoid_when: candidateRecord.avoid_when,
    strength: 'low',
  };
}

function profile(fields) {
  return {
    ...fields,
    semantic_tags: uniqueStrings(fields.semantic_tags),
    synonyms: uniqueStrings(fields.synonyms),
  };
}

function resolveNavigationProfile(sourceName, tokens) {
  if (hasAllTokens(tokens, ['chevron', 'left']) || hasAllTokens(tokens, ['arrow', 'back'])) {
    return profile({
      label: 'Back',
      depicts: 'A left-facing navigation arrow.',
      purpose: 'Show a back action or a move to the previous screen, panel, or step.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['back', 'previous', 'navigate', 'return', 'left'],
      synonyms: ['go back', 'previous', 'return', 'back navigation'],
      use_when: 'Use when the interface needs to move backward to the previous screen, panel, or navigation level.',
      avoid_when: 'Do not use for undo, close, or dismiss when the action is not actually backward navigation.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['chevron', 'right']) || hasAllTokens(tokens, ['arrow', 'forward'])) {
    return profile({
      label: 'Forward',
      depicts: 'A right-facing navigation arrow.',
      purpose: 'Show a move forward to the next screen, panel, or step.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['forward', 'next', 'navigate', 'continue', 'right'],
      synonyms: ['next', 'go forward', 'continue', 'forward navigation'],
      use_when: 'Use when the interface needs to move to the next screen, panel, or navigation level.',
      avoid_when: 'Do not use for send, share, or submit when the action is not actually moving forward in navigation.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['arrow', 'upward'])) {
    return profile({
      label: 'Move Up',
      depicts: 'An upward arrow for movement or direction.',
      purpose: 'Show upward movement, moving an item up, or navigating to a higher position.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['up', 'move up', 'navigate', 'reorder', 'direction'],
      synonyms: ['move up', 'upward', 'go up', 'higher position'],
      use_when: 'Use when the user or system is moving upward in order, hierarchy, or directional navigation.',
      avoid_when: 'Do not use for upload or positive trend when the meaning is not about actual movement upward.',
      strength: 'medium',
    });
  }

  if (hasAllTokens(tokens, ['arrow', 'downward'])) {
    return profile({
      label: 'Move Down',
      depicts: 'A downward arrow for movement or direction.',
      purpose: 'Show downward movement, moving an item down, or navigating to a lower position.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['down', 'move down', 'navigate', 'reorder', 'direction'],
      synonyms: ['move down', 'downward', 'go down', 'lower position'],
      use_when: 'Use when the user or system is moving downward in order, hierarchy, or directional navigation.',
      avoid_when: 'Do not use for download or negative status when the meaning is not about actual movement downward.',
      strength: 'medium',
    });
  }

  if (hasAllTokens(tokens, ['first', 'page'])) {
    return profile({
      label: 'First Page',
      depicts: 'A page-jump control that moves to the beginning of a list or pager.',
      purpose: 'Show a jump to the first page or start of a paged result set.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['first page', 'start', 'jump to start', 'pagination', 'beginning'],
      synonyms: ['go to first page', 'start of pages', 'first result page', 'jump to beginning'],
      use_when: 'Use when pagination or result browsing needs a direct jump to the beginning.',
      avoid_when: 'Do not use for rewind media or reset state when the control is specifically page navigation.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['last', 'page'])) {
    return profile({
      label: 'Last Page',
      depicts: 'A page-jump control that moves to the end of a list or pager.',
      purpose: 'Show a jump to the last page or end of a paged result set.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['last page', 'end', 'jump to end', 'pagination', 'final page'],
      synonyms: ['go to last page', 'end of pages', 'last result page', 'jump to end'],
      use_when: 'Use when pagination or result browsing needs a direct jump to the end.',
      avoid_when: 'Do not use for fast-forward media or completion state when the control is specifically page navigation.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['expand', 'more']) || hasAllTokens(tokens, ['unfold', 'more'])) {
    return profile({
      label: 'Expand',
      depicts: 'A downward control indicating more content can open.',
      purpose: 'Show that more content, options, or details can expand open.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['expand', 'show more', 'open', 'details', 'dropdown'],
      synonyms: ['show more', 'expand section', 'open details', 'dropdown open'],
      use_when: 'Use when the interface can expand a section, reveal more options, or open a dropdown-like control.',
      avoid_when: 'Do not use for download, downward movement, or status decline when the meaning is not expansion.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['expand', 'less']) || hasAllTokens(tokens, ['unfold', 'less'])) {
    return profile({
      label: 'Collapse',
      depicts: 'An upward control indicating content can close or fold away.',
      purpose: 'Show that open content, options, or details can collapse closed.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['collapse', 'show less', 'close', 'hide details', 'fold'],
      synonyms: ['show less', 'collapse section', 'close details', 'fold up'],
      use_when: 'Use when the interface can collapse a section, hide details, or close expanded content.',
      avoid_when: 'Do not use for upload or upward movement when the meaning is not collapse.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['more', 'vert']) || hasAllTokens(tokens, ['more', 'horiz'])) {
    return profile({
      label: 'More Options',
      depicts: 'A grouped dot icon used for overflow actions.',
      purpose: 'Show an overflow menu with more actions or options.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['more options', 'overflow', 'menu', 'actions', 'extra'],
      synonyms: ['overflow menu', 'more actions', 'extra options', 'kebab menu'],
      use_when: 'Use when the interface hides additional actions inside an overflow menu.',
      avoid_when: 'Do not use for settings, grid navigation, or pagination when the intent is specifically overflow actions.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['menu', 'open'])) {
    return profile({
      label: 'Open Menu',
      depicts: 'A menu icon shown in an opened or opening state.',
      purpose: 'Show that the main menu or side menu can open or has been revealed.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['menu', 'open menu', 'sidebar', 'navigation drawer', 'panel'],
      synonyms: ['open navigation', 'sidebar menu', 'open drawer', 'menu panel'],
      use_when: 'Use when the interface opens, reveals, or toggles a main navigation menu.',
      avoid_when: 'Do not use for generic settings or overflow actions when the control is specifically a main menu.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'apps')) {
    return profile({
      label: 'App Grid',
      depicts: 'A grid of small squares representing app destinations.',
      purpose: 'Show an app grid, app launcher, or collection of app destinations.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'ui_shell',
      semantic_tags: ['apps', 'app grid', 'launcher', 'destinations', 'dashboard'],
      synonyms: ['app launcher', 'all apps', 'grid menu', 'app destinations'],
      use_when: 'Use when the interface opens an app launcher, app grid, or collection of primary destinations.',
      avoid_when: 'Do not use for generic layout switching when the meaning is specifically a set of apps or destinations.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['filter', 'list'])) {
    return profile({
      label: 'Filter List',
      depicts: 'A list or funnel control for narrowing visible results.',
      purpose: 'Show filtering of a list, results, or visible data set.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['filter', 'list filter', 'refine', 'narrow', 'results'],
      synonyms: ['filter results', 'narrow list', 'refine list', 'apply list filters'],
      use_when: 'Use when the interface lets the user narrow, refine, or filter a list of results.',
      avoid_when: 'Do not use for sort-only controls or analytics funnels when the UI is actually filtering results.',
      strength: 'high',
    });
  }

  if (sourceName === 'sort' || hasAllTokens(tokens, ['sort', 'ascending'])) {
    return profile({
      label: 'Sort',
      depicts: 'A control that changes ordering or ranking of items.',
      purpose: 'Show sorting of a list, results, or ordered set of items.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort', 'order', 'arrange', 'rank', 'list control'],
      synonyms: ['sort list', 'change order', 'arrange items', 'sort results'],
      use_when: 'Use when the interface changes how items are ordered or ranked.',
      avoid_when: 'Do not use for filtering, navigation, or progress states when the control is about ordering.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['swap', 'vert']) || hasAllTokens(tokens, ['swap', 'horiz'])) {
    return profile({
      label: 'Swap',
      depicts: 'Opposing arrows indicating exchange or order swap.',
      purpose: 'Show swapping, reversing, or exchanging positions or directions.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['swap', 'switch', 'reverse', 'exchange', 'change order'],
      synonyms: ['switch sides', 'reverse order', 'exchange positions', 'swap direction'],
      use_when: 'Use when the interface swaps values, reverses direction, or exchanges positions.',
      avoid_when: 'Do not use for sync, refresh, or undo when the meaning is not actual exchange.',
      strength: 'medium',
    });
  }

  if (hasToken(tokens, 'undo')) {
    return profile({
      label: 'Undo',
      depicts: 'A curved arrow returning to a previous state.',
      purpose: 'Show undoing the most recent action.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['undo', 'reverse action', 'go back', 'revert', 'history'],
      synonyms: ['revert action', 'go back one step', 'undo last change', 'reverse change'],
      use_when: 'Use when the interface reverses the most recent user action.',
      avoid_when: 'Do not use for back navigation or refresh when the meaning is not action history.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'redo')) {
    return profile({
      label: 'Redo',
      depicts: 'A curved arrow replaying a previous state change.',
      purpose: 'Show redoing an action that was just undone.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['redo', 'repeat action', 'reapply', 'history', 'restore change'],
      synonyms: ['redo last change', 'reapply action', 'restore undone change', 'repeat change'],
      use_when: 'Use when the interface reapplies an action that was previously undone.',
      avoid_when: 'Do not use for forward navigation or submit actions when the meaning is not action history.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['drag', 'indicator'])) {
    return profile({
      label: 'Drag Handle',
      depicts: 'A grip pattern used for dragging or reordering.',
      purpose: 'Show that an item can be dragged, moved, or reordered.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['drag', 'reorder', 'move', 'handle', 'grip'],
      synonyms: ['drag handle', 'reorder item', 'move grip', 'grab handle'],
      use_when: 'Use when the user can drag or reorder an item in the interface.',
      avoid_when: 'Do not use for navigation arrows or menu buttons when the control is specifically for drag movement.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'tab')) {
    return profile({
      label: 'Tabs',
      depicts: 'A tab-like layout marker for switching sections.',
      purpose: 'Show tabbed navigation between sibling sections or views.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'ui_shell',
      semantic_tags: ['tabs', 'tab navigation', 'sections', 'switch view', 'top nav'],
      synonyms: ['tab bar', 'section tabs', 'switch tabs', 'tabbed view'],
      use_when: 'Use when the interface switches between sibling sections through a tab pattern.',
      avoid_when: 'Do not use for generic lists or cards when the control is specifically tab navigation.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'segment')) {
    return profile({
      label: 'Segmented Control',
      depicts: 'A segmented switch used for quick view or mode changes.',
      purpose: 'Show a segmented control that switches between a small set of modes or views.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['segmented control', 'switch view', 'modes', 'toggle view', 'segments'],
      synonyms: ['segmented switch', 'mode selector', 'view switcher', 'toggle segments'],
      use_when: 'Use when the interface switches between a few closely related modes or views.',
      avoid_when: 'Do not use for tab bars or dropdowns when the control is specifically segmented switching.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['density', 'medium'])) {
    return profile({
      label: 'View Density',
      depicts: 'A compact layout marker for list or content density.',
      purpose: 'Show view density or compactness controls for how much content is shown.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['density', 'compact view', 'layout spacing', 'content density', 'view settings'],
      synonyms: ['compact layout', 'view density', 'spacing control', 'content spacing'],
      use_when: 'Use when the interface changes how compactly content is displayed.',
      avoid_when: 'Do not use for general settings or font size when the control is specifically layout density.',
      strength: 'medium',
    });
  }

  if (hasAllTokens(tokens, ['view', 'sidebar'])) {
    return profile({
      label: 'Sidebar View',
      depicts: 'A layout icon showing a main area beside a sidebar.',
      purpose: 'Show a sidebar layout or a control that opens, closes, or focuses the sidebar.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['sidebar', 'layout', 'side panel', 'navigation panel', 'split layout'],
      synonyms: ['sidebar layout', 'side panel', 'open sidebar', 'toggle sidebar'],
      use_when: 'Use when the interface highlights or toggles a sidebar or side navigation panel.',
      avoid_when: 'Do not use for generic settings or drawer menus when the meaning is not a sidebar layout.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['dock', 'to', 'left']) || hasAllTokens(tokens, ['dock', 'to', 'right'])) {
    const side = hasToken(tokens, 'left') ? 'left' : 'right';
    const capSide = side.charAt(0).toUpperCase() + side.slice(1);
    return profile({
      label: `Dock To ${capSide}`,
      depicts: `A layout control that snaps or docks content to the ${side} side.`,
      purpose: `Show docking or pinning content to the ${side} side of the layout.`,
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['dock', side, 'layout', 'pin panel', 'snap side'],
      synonyms: [`dock ${side}`, `pin to ${side}`, `${side} panel`, `snap ${side}`],
      use_when: `Use when the interface docks a panel, window, or content area to the ${side} side.`,
      avoid_when: 'Do not use for simple back or forward navigation when the meaning is about layout docking.',
      strength: 'medium',
    });
  }

  if (hasAllTokens(tokens, ['grid', 'view']) || hasAllTokens(tokens, ['view', 'module'])) {
    return profile({
      label: 'Grid View',
      depicts: 'A tiled layout icon showing content in a grid.',
      purpose: 'Show a grid or tiled view mode for browsing content.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['grid view', 'tiles', 'card view', 'browse grid', 'layout'],
      synonyms: ['tile view', 'card grid', 'grid layout', 'browse in grid'],
      use_when: 'Use when the interface switches content into a grid, tile, or card-based view.',
      avoid_when: 'Do not use for app launchers or dashboards when the meaning is specifically a view mode.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['view', 'list'])) {
    return profile({
      label: 'List View',
      depicts: 'A stacked-line layout icon for list presentation.',
      purpose: 'Show a list view mode for browsing content in rows.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['list view', 'rows', 'stacked list', 'browse list', 'layout'],
      synonyms: ['row view', 'list layout', 'browse in list', 'stacked items'],
      use_when: 'Use when the interface switches content into a list or row-based view.',
      avoid_when: 'Do not use for checklists or navigation menus when the meaning is specifically a view mode.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'dashboard')) {
    return profile({
      label: 'Dashboard',
      depicts: 'A panel-style layout icon for a dashboard surface.',
      purpose: 'Show a dashboard destination or a dashboard-style overview surface.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'ui_shell',
      semantic_tags: ['dashboard', 'overview', 'home panel', 'main surface', 'summary view'],
      synonyms: ['overview page', 'main dashboard', 'summary surface', 'dashboard home'],
      use_when: 'Use when the interface navigates to or labels a dashboard or overview surface.',
      avoid_when: 'Do not use for charts or analytics details when the meaning is specifically the dashboard destination.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'splitscreen')) {
    return profile({
      label: 'Split View',
      depicts: 'A layout icon showing the screen divided into sections.',
      purpose: 'Show a split-screen or side-by-side layout mode.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['split view', 'side by side', 'multi pane', 'layout', 'dual panel'],
      synonyms: ['split screen', 'dual pane', 'two panel view', 'side by side layout'],
      use_when: 'Use when the interface switches into a split-screen or multi-pane layout.',
      avoid_when: 'Do not use for resizing or generic window controls when the meaning is specifically split layout.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['picture', 'in', 'picture', 'alt'])) {
    return profile({
      label: 'Picture In Picture',
      depicts: 'A small floating window inside a larger frame.',
      purpose: 'Show picture-in-picture or a floating mini-player style layout.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'media',
      semantic_tags: ['picture in picture', 'floating window', 'mini player', 'overlay', 'media layout'],
      synonyms: ['pip mode', 'floating player', 'small overlay', 'mini window'],
      use_when: 'Use when the interface switches media or content into a floating picture-in-picture layout.',
      avoid_when: 'Do not use for generic popups or docking when the meaning is specifically a PiP layout.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['open', 'in', 'new']) || hasToken(tokens, 'launch')) {
    return profile({
      label: 'Open In New',
      depicts: 'An outward arrow showing content opening in a new destination.',
      purpose: 'Show opening content in a new tab, new window, or external destination.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['open in new', 'external', 'new tab', 'launch', 'outbound'],
      synonyms: ['open external', 'new tab', 'launch page', 'open separately'],
      use_when: 'Use when the interface opens content in a new tab, new window, or external destination.',
      avoid_when: 'Do not use for send or share when the meaning is specifically opening elsewhere.',
      strength: 'high',
    });
  }

  if ((hasToken(tokens, 'fullscreen') && !hasToken(tokens, 'exit')) || hasAllTokens(tokens, ['open', 'in', 'full'])) {
    return profile({
      label: 'Full Screen',
      depicts: 'A frame-expansion icon that fills the available screen.',
      purpose: 'Show entering full screen or expanding content to take over the screen.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['full screen', 'expand view', 'maximize', 'immersive', 'view control'],
      synonyms: ['maximize view', 'enter full screen', 'expand to screen', 'immersive mode'],
      use_when: 'Use when the interface expands content into a full-screen or maximized view.',
      avoid_when: 'Do not use for zoom or open in new window when the meaning is specifically full screen.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['fullscreen', 'exit'])) {
    return profile({
      label: 'Exit Full Screen',
      depicts: 'A frame-collapse icon returning from a full-screen view.',
      purpose: 'Show leaving full screen or restoring a smaller view.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['exit full screen', 'restore view', 'collapse', 'leave immersive', 'view control'],
      synonyms: ['leave full screen', 'restore window', 'shrink view', 'exit immersive mode'],
      use_when: 'Use when the interface leaves full screen and returns to the normal view.',
      avoid_when: 'Do not use for close or dismiss when the meaning is specifically leaving full screen.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['zoom', 'in']) || hasAllTokens(tokens, ['zoom', 'out'])) {
    const zoomDirection = hasToken(tokens, 'in') ? 'in' : 'out';
    const capDirection = zoomDirection.charAt(0).toUpperCase() + zoomDirection.slice(1);
    return profile({
      label: `Zoom ${capDirection}`,
      depicts: `A zoom control for scaling content ${zoomDirection}.`,
      purpose: `Show zooming ${zoomDirection} on content or a workspace view.`,
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['zoom', zoomDirection, 'scale', 'view control', 'magnify'],
      synonyms: [`zoom ${zoomDirection}`, `${zoomDirection === 'in' ? 'magnify' : 'shrink'} view`, `scale ${zoomDirection}`, `${zoomDirection} closer`],
      use_when: `Use when the interface changes magnification and zooms ${zoomDirection} on visible content.`,
      avoid_when: 'Do not use for open, search, or resize when the meaning is specifically zoom level.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['double', 'arrow'])) {
    return profile({
      label: 'Jump Forward',
      depicts: 'A doubled arrow suggesting a faster or larger forward step.',
      purpose: 'Show a faster forward move, larger next step, or jump to a further destination.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['jump forward', 'fast move', 'double arrow', 'skip ahead', 'advance'],
      synonyms: ['skip ahead', 'jump ahead', 'fast forward step', 'advance quickly'],
      use_when: 'Use when the interface moves ahead faster than a normal single-step forward control.',
      avoid_when: 'Do not use for send or open-in-new actions when the meaning is specifically a faster forward move.',
      strength: 'medium',
    });
  }

  if (hasAllTokens(tokens, ['subdirectory', 'arrow', 'right'])) {
    return profile({
      label: 'Nested Destination',
      depicts: 'An arrow entering a nested branch or sublevel.',
      purpose: 'Show a move into a nested section, child route, or deeper branch in a hierarchy.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['nested route', 'subdirectory', 'drill in', 'child level', 'hierarchy'],
      synonyms: ['go deeper', 'child route', 'nested destination', 'drill into branch'],
      use_when: 'Use when the interface moves into a child item, nested route, or deeper hierarchy level.',
      avoid_when: 'Do not use for simple forward navigation when the meaning is specifically hierarchical drill-in.',
      strength: 'medium',
    });
  }

  if (sourceName === 'refresh') {
    return profile({
      label: 'Refresh',
      depicts: 'A circular arrow loop used for reloading or refetching.',
      purpose: 'Show refreshing or reloading the current view, results, or visible content state.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['refresh', 'reload', 'update view', 'refetch', 'reload results'],
      synonyms: ['reload', 'refresh view', 'update results', 'refetch content'],
      use_when: 'Use when the interface refreshes a page, refetches results, or reloads the current content state.',
      avoid_when: 'Do not use for retry-after-error, sync status, or undo when the meaning is not a direct refresh action.',
      strength: 'high',
    });
  }

  return null;
}

function resolveStatusProfile(sourceName, tokens) {
  if (sourceName === 'info-circle') {
    return profile({
      label: 'Information',
      depicts: 'A circled information symbol.',
      purpose: 'Show helpful information, extra context, or a neutral informational state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['information', 'info', 'context', 'details', 'neutral state'],
      synonyms: ['info', 'more information', 'context', 'details'],
      use_when: 'Use when the interface presents neutral information, extra context, or helper details.',
      avoid_when: 'Do not use for warnings, errors, or required actions when the meaning is not neutral information.',
      strength: 'high',
    });
  }

  if (sourceName === 'help-circle') {
    return profile({
      label: 'Help',
      depicts: 'A circled help symbol.',
      purpose: 'Show help, guidance, or a place to get assistance.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['help', 'guidance', 'support', 'question', 'assistance'],
      synonyms: ['help center', 'need help', 'guidance', 'assistance'],
      use_when: 'Use when the interface points to help, assistance, or guidance.',
      avoid_when: 'Do not use for generic information when the meaning is specifically help or support.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'clock')) {
    return profile({
      label: 'Time Pending',
      depicts: 'A clock face used for time or waiting.',
      purpose: 'Show time-based waiting, scheduled status, or a pending state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['time', 'pending', 'scheduled', 'waiting', 'clock'],
      synonyms: ['pending time', 'scheduled', 'wait', 'time state'],
      use_when: 'Use when the interface shows a pending, scheduled, or time-based state.',
      avoid_when: 'Do not use for alarms or duration settings when the meaning is specifically a waiting or time status.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'hourglass')) {
    return profile({
      label: 'Waiting',
      depicts: 'An hourglass used for waiting or process time.',
      purpose: 'Show waiting, in-progress delay, or time passing before completion.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['waiting', 'delay', 'processing', 'pending', 'time passing'],
      synonyms: ['in progress wait', 'pending delay', 'process waiting', 'hold on'],
      use_when: 'Use when the interface communicates waiting, delay, or time still passing before completion.',
      avoid_when: 'Do not use for scheduling or calendars when the meaning is specifically waiting.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'loader')) {
    return profile({
      label: 'Loading',
      depicts: 'A spinning or circular loader indicator.',
      purpose: 'Show an active loading or in-progress system state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['loading', 'in progress', 'spinner', 'working', 'processing'],
      synonyms: ['loading state', 'working', 'processing', 'spinner'],
      use_when: 'Use when the interface is actively loading, processing, or waiting for work to finish.',
      avoid_when: 'Do not use for refresh buttons or static status badges when the meaning is an active loading state.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['progress', 'check'])) {
    return profile({
      label: 'Completed Progress',
      depicts: 'A progress or task indicator with a completion check.',
      purpose: 'Show progress that has completed or a task that finished successfully.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['completed', 'progress done', 'finished task', 'success', 'check'],
      synonyms: ['completed progress', 'task complete', 'finished', 'done state'],
      use_when: 'Use when the interface confirms that a progress step or task has completed.',
      avoid_when: 'Do not use for simple success badges when the meaning is not tied to progress or completion.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'bell')) {
    return profile({
      label: 'Notifications',
      depicts: 'A bell symbol used for alerts and notifications.',
      purpose: 'Show notifications, alerts, or items needing attention.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['notifications', 'alerts', 'attention', 'updates', 'bell'],
      synonyms: ['alerts', 'notification center', 'updates', 'attention needed'],
      use_when: 'Use when the interface points to notifications, alert feeds, or items needing attention.',
      avoid_when: 'Do not use for alarms or warnings when the meaning is specifically app notifications.',
      strength: 'high',
    });
  }

  if (sourceName === 'eye') {
    return profile({
      label: 'Visible',
      depicts: 'An eye symbol used for visibility or preview.',
      purpose: 'Show visibility, preview, or content that is currently shown.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['visible', 'show', 'preview', 'see', 'displayed'],
      synonyms: ['show content', 'visible state', 'preview', 'currently shown'],
      use_when: 'Use when the interface indicates that content is visible or can be previewed.',
      avoid_when: 'Do not use for search or surveillance when the meaning is specifically visibility.',
      strength: 'high',
    });
  }

  if (sourceName === 'eye-off') {
    return profile({
      label: 'Hidden',
      depicts: 'An eye symbol crossed to show hidden visibility.',
      purpose: 'Show hidden content, turned-off visibility, or a concealed state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['hidden', 'concealed', 'visibility off', 'not shown', 'private'],
      synonyms: ['hide content', 'hidden state', 'visibility off', 'concealed'],
      use_when: 'Use when the interface indicates that content is hidden or visibility is turned off.',
      avoid_when: 'Do not use for delete or disabled actions when the meaning is specifically hidden visibility.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['thumb', 'up']) || hasAllTokens(tokens, ['thumb', 'down'])) {
    const positive = hasToken(tokens, 'up');
    return profile({
      label: positive ? 'Approval' : 'Disapproval',
      depicts: `A thumbs-${positive ? 'up' : 'down'} feedback symbol.`,
      purpose: positive ? 'Show positive feedback, approval, or a liked state.' : 'Show negative feedback, disapproval, or a disliked state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: positive ? ['approval', 'like', 'positive feedback', 'endorsed', 'thumbs up'] : ['disapproval', 'dislike', 'negative feedback', 'rejected', 'thumbs down'],
      synonyms: positive ? ['liked', 'approved', 'positive signal', 'good feedback'] : ['disliked', 'negative signal', 'bad feedback', 'downvote'],
      use_when: positive
        ? 'Use when the interface signals positive feedback, approval, or a liked state.'
        : 'Use when the interface signals negative feedback, disapproval, or a disliked state.',
      avoid_when: positive
        ? 'Do not use for completion or trust verification when the meaning is specifically approval or liking.'
        : 'Do not use for warnings or errors when the meaning is specifically negative feedback.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'star')) {
    return profile({
      label: 'Favorite',
      depicts: 'A star symbol used for saved or favored items.',
      purpose: 'Show a favorite, featured, or starred state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['favorite', 'starred', 'featured', 'saved', 'important'],
      synonyms: ['starred item', 'favorite', 'featured', 'marked important'],
      use_when: 'Use when the interface marks something as a favorite, featured item, or starred state.',
      avoid_when: 'Do not use for ratings or success when the meaning is specifically saved or favored.',
      strength: 'medium',
    });
  }

  if (hasToken(tokens, 'bookmark') || hasToken(tokens, 'pinned') || hasToken(tokens, 'flag') || hasToken(tokens, 'archive')) {
    const isBookmark = hasToken(tokens, 'bookmark');
    const isPinned = hasToken(tokens, 'pinned');
    const isFlag = hasToken(tokens, 'flag');
    const label = isBookmark ? 'Saved' : isPinned ? 'Pinned' : isFlag ? 'Flagged' : 'Archived';
    const purpose = isBookmark
      ? 'Show saved items or content bookmarked for later.'
      : isPinned
        ? 'Show content pinned to stay visible or prioritized.'
        : isFlag
          ? 'Show content that has been flagged, marked, or needs attention.'
          : 'Show archived items that have been stored away from the main active view.';
    const tags = isBookmark
      ? ['bookmark', 'saved', 'later', 'stored', 'marked']
      : isPinned
        ? ['pinned', 'priority', 'fixed', 'important', 'kept visible']
        : isFlag
          ? ['flagged', 'marked', 'attention', 'report', 'important']
          : ['archive', 'stored', 'past', 'saved away', 'inactive'];

    return profile({
      label,
      depicts: `${label} state shown as a compact interface mark.`,
      purpose,
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: tags,
      synonyms: [label.toLowerCase(), `${label.toLowerCase()} item`, 'marked state', 'saved state'],
      use_when: `Use when the interface shows that something is ${label.toLowerCase()} or marked in that specific way.`,
      avoid_when: 'Do not use for general favorites, likes, or completion when the meaning is a specific marked state.',
      strength: 'medium',
    });
  }

  if (sourceName === 'cloud-check') {
    return profile({
      label: 'Cloud Synced',
      depicts: 'A cloud with a check mark showing successful cloud state.',
      purpose: 'Show that content is synced, backed up, or safely stored in the cloud.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['cloud synced', 'backed up', 'stored', 'sync success', 'cloud check'],
      synonyms: ['cloud backup complete', 'synced to cloud', 'stored online', 'cloud saved'],
      use_when: 'Use when the interface confirms successful cloud sync, backup, or safe storage.',
      avoid_when: 'Do not use for generic internet connection when the meaning is specifically a good cloud state.',
      strength: 'high',
    });
  }

  if (sourceName === 'wifi') {
    return profile({
      label: 'Connection',
      depicts: 'A wireless signal icon representing network connection.',
      purpose: 'Show wireless connection status or network availability.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['wifi', 'network', 'connection', 'signal', 'online'],
      synonyms: ['wireless', 'network signal', 'internet connection', 'online state'],
      use_when: 'Use when the interface shows connection, signal, or wireless network state.',
      avoid_when: 'Do not use for trust, security, or generic communication when the meaning is specifically connection status.',
      strength: 'high',
    });
  }

  if (sourceName === 'lock' || sourceName === 'lock-open' || sourceName === 'key') {
    const lockOpen = sourceName === 'lock-open';
    const keyIcon = sourceName === 'key';
    return profile({
      label: keyIcon ? 'Access Key' : lockOpen ? 'Unlocked' : 'Locked',
      depicts: keyIcon ? 'A key symbol for access or credentials.' : lockOpen ? 'An open lock showing access is available.' : 'A closed lock showing protected access.',
      purpose: keyIcon
        ? 'Show credentials, access keys, or a key-based access concept.'
        : lockOpen
          ? 'Show unlocked access, open permission, or content that is no longer locked.'
          : 'Show locked access, protection, or content that requires permission.',
      category: keyIcon ? 'security_auth' : 'security',
      intent: keyIcon ? 'inform' : 'confirm',
      domain: 'security',
      semantic_tags: keyIcon
        ? ['key', 'credentials', 'access', 'auth', 'secret']
        : lockOpen
          ? ['unlocked', 'open access', 'permission granted', 'available', 'security']
          : ['locked', 'protected', 'restricted', 'secure', 'permission needed'],
      synonyms: keyIcon
        ? ['access key', 'credentials', 'auth key', 'secret']
        : lockOpen
          ? ['open lock', 'unlocked', 'access granted', 'available access']
          : ['secure lock', 'restricted', 'locked access', 'protected'],
      use_when: keyIcon
        ? 'Use when the interface refers to keys, credentials, or key-based access.'
        : lockOpen
          ? 'Use when the interface indicates something is unlocked or access has been opened.'
          : 'Use when the interface indicates something is locked, protected, or restricted.',
      avoid_when: keyIcon
        ? 'Do not use for generic security state when the meaning is specifically a key or credential.'
        : 'Do not use for password fields or account sign-in when a more specific auth icon would be clearer.',
      strength: 'high',
    });
  }

  if (sourceName === 'mail-check' || sourceName === 'message-check' || sourceName === 'list-check' || sourceName === 'clipboard-check') {
    const label = sourceName === 'mail-check'
      ? 'Mail Complete'
      : sourceName === 'message-check'
        ? 'Message Complete'
        : sourceName === 'list-check'
          ? 'Checklist Complete'
          : 'Clipboard Complete';

    return profile({
      label,
      depicts: `${label} shown with a completion check mark.`,
      purpose: `Show a completed or confirmed ${label.replace(' Complete', '').toLowerCase()} state.`,
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['complete', 'confirmed', 'checked', 'done', label.replace(' Complete', '').toLowerCase()],
      synonyms: [`${label.replace(' Complete', '').toLowerCase()} done`, 'completed', 'confirmed', 'checked state'],
      use_when: `Use when the interface shows that a ${label.replace(' Complete', '').toLowerCase()} action or object is complete or confirmed.`,
      avoid_when: 'Do not use for sending or editing when the meaning is specifically a completed state.',
      strength: 'high',
    });
  }

  if (sourceName === 'trending-down') {
    return profile({
      label: 'Downward Trend',
      depicts: 'A line or arrow showing decline over time.',
      purpose: 'Show a downward trend, decrease, or negative movement in a metric.',
      category: 'analytics_data',
      intent: 'inform',
      domain: 'analytics',
      semantic_tags: ['downward trend', 'decrease', 'decline', 'lowering', 'metric down'],
      synonyms: ['trend down', 'decline', 'decrease', 'metric drop'],
      use_when: 'Use when the interface shows that a metric or measure is trending downward.',
      avoid_when: 'Do not use for download or move-down actions when the meaning is specifically analytics decline.',
      strength: 'high',
    });
  }

  if (sourceName === 'mood-smile' || sourceName === 'mood-sad') {
    const positive = sourceName === 'mood-smile';
    return profile({
      label: positive ? 'Positive Mood' : 'Negative Mood',
      depicts: positive ? 'A smiling face used for positive sentiment.' : 'A sad face used for negative sentiment.',
      purpose: positive ? 'Show positive sentiment, satisfaction, or a happy emotional state.' : 'Show negative sentiment, dissatisfaction, or a sad emotional state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: positive ? ['happy', 'positive mood', 'satisfaction', 'good feeling', 'sentiment'] : ['sad', 'negative mood', 'dissatisfied', 'bad feeling', 'sentiment'],
      synonyms: positive ? ['happy', 'positive sentiment', 'satisfied', 'good mood'] : ['sad', 'negative sentiment', 'dissatisfied', 'low mood'],
      use_when: positive
        ? 'Use when the interface shows positive sentiment or a good emotional result.'
        : 'Use when the interface shows negative sentiment or a poor emotional result.',
      avoid_when: 'Do not use for success or failure states when the meaning is specifically sentiment.',
      strength: 'medium',
    });
  }

  if (sourceName === 'circle-dot') {
    return profile({
      label: 'Current State',
      depicts: 'A circle with a dot indicating the active or current position.',
      purpose: 'Show the current item, active step, or selected point in a sequence.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['current', 'active', 'selected', 'step marker', 'position'],
      synonyms: ['current step', 'active marker', 'selected point', 'current item'],
      use_when: 'Use when the interface marks the current step, active point, or selected position.',
      avoid_when: 'Do not use for notifications or unread counts when the meaning is specifically active position.',
      strength: 'medium',
    });
  }

  if (sourceName === 'rosette-discount-check') {
    return profile({
      label: 'Verified Offer',
      depicts: 'A rosette badge with a check mark for verified discount or offer status.',
      purpose: 'Show a verified offer, confirmed discount, or trusted deal badge.',
      category: 'commerce',
      intent: 'confirm',
      domain: 'commerce',
      semantic_tags: ['verified offer', 'discount', 'deal badge', 'confirmed deal', 'commerce'],
      synonyms: ['verified discount', 'trusted deal', 'offer badge', 'confirmed promotion'],
      use_when: 'Use when the interface highlights a verified offer, trusted deal, or confirmed discount state.',
      avoid_when: 'Do not use for general trust verification or loyalty rewards when the meaning is specifically an offer badge.',
      strength: 'high',
    });
  }

  if (sourceName === 'heart') {
    return profile({
      label: 'Liked',
      depicts: 'A heart symbol used for likes, favorites, or affection.',
      purpose: 'Show a liked, loved, or favorited state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['liked', 'favorite', 'heart', 'loved', 'saved preference'],
      synonyms: ['heart', 'liked item', 'favorite', 'loved'],
      use_when: 'Use when the interface shows a liked or favorited state tied to affection or preference.',
      avoid_when: 'Do not use for health, approval, or trust when the meaning is specifically liking or affection.',
      strength: 'medium',
    });
  }

  if (sourceName === 'sort-ascending') {
    return profile({
      label: 'Sort Ascending',
      depicts: 'An ordering control that arranges items from low to high or A to Z.',
      purpose: 'Show ascending sort order for a list, results set, or ordered collection.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort ascending', 'order low to high', 'a to z', 'arrange', 'list order'],
      synonyms: ['ascending order', 'sort low to high', 'sort a to z', 'ordered list'],
      use_when: 'Use when the interface sorts items in ascending order such as low-to-high or A-to-Z.',
      avoid_when: 'Do not use for filtering or ranking trends when the meaning is specifically sort order.',
      strength: 'high',
    });
  }

  return null;
}

function resolveAiProfile(sourceName, tokens) {
  if (hasAllTokens(tokens, ['smart', 'toy']) || hasToken(tokens, 'robot')) {
    return profile({
      label: 'Agent',
      depicts: 'A robot-like symbol for an assistant or automated agent.',
      purpose: 'Show an AI assistant, autonomous agent, or bot-like system actor.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['agent', 'assistant', 'bot', 'automation', 'ai'],
      synonyms: ['ai agent', 'assistant bot', 'automated assistant', 'agent actor'],
      use_when: 'Use when the interface refers to an AI assistant, autonomous agent, or bot-driven actor.',
      avoid_when: 'Do not use for general toys, mascots, or generic automation with no agent meaning.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'psychology')) {
    return profile({
      label: 'Reasoning',
      depicts: 'A thinking-focused symbol used for cognition or mental processing.',
      purpose: 'Show reasoning, analytical thought, or a deliberate thinking process.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['reasoning', 'thinking', 'analysis', 'cognition', 'deliberation'],
      synonyms: ['thinking process', 'analysis', 'reasoning step', 'deliberation'],
      use_when: 'Use when the interface highlights reasoning, analytical thought, or a deliberate decision-making stage.',
      avoid_when: 'Do not use for mental health or human psychology content when the meaning is specifically system reasoning.',
      strength: 'medium',
    });
  }

  if (hasToken(tokens, 'memory')) {
    return profile({
      label: 'Memory',
      depicts: 'A memory-related symbol for saved context or retained state.',
      purpose: 'Show retained memory, saved context, or remembered state inside a system.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['memory', 'saved context', 'retained state', 'recall', 'history'],
      synonyms: ['agent memory', 'saved context', 'remembered state', 'recall'],
      use_when: 'Use when the interface refers to stored context, memory recall, or retained state in an agent or model.',
      avoid_when: 'Do not use for hardware memory or browser history when the meaning is specifically contextual memory.',
      strength: 'high',
    });
  }

  if (sourceName === 'database' || sourceName === 'dataset' || sourceName === 'dataset_linked' || sourceName === 'data_object') {
    return profile({
      label: sourceName === 'data_object' ? 'Data Object' : sourceName === 'dataset_linked' ? 'Linked Dataset' : sourceName === 'dataset' ? 'Dataset' : 'Data Store',
      depicts: 'A structured data symbol for stored records or organized information.',
      purpose: sourceName === 'database'
        ? 'Show a structured data store or database.'
        : sourceName === 'data_object'
          ? 'Show a structured data object or typed record.'
          : sourceName === 'dataset_linked'
            ? 'Show linked datasets or connected data sets.'
            : 'Show a dataset or grouped training data.',
      category: 'analytics_data',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: sourceName === 'database'
        ? ['database', 'data store', 'records', 'structured data', 'storage']
        : sourceName === 'data_object'
          ? ['data object', 'structured record', 'typed data', 'schema object', 'entity']
          : sourceName === 'dataset_linked'
            ? ['linked dataset', 'connected data', 'joined dataset', 'data relation', 'dataset']
            : ['dataset', 'training data', 'data collection', 'examples', 'data set'],
      synonyms: sourceName === 'database'
        ? ['data store', 'structured storage', 'records database', 'data source']
        : sourceName === 'data_object'
          ? ['structured record', 'typed object', 'data entity', 'schema object']
          : sourceName === 'dataset_linked'
            ? ['connected dataset', 'joined data', 'related datasets', 'linked data']
            : ['training dataset', 'data set', 'example collection', 'data collection'],
      use_when: 'Use when the interface refers to structured data, stored records, or organized data collections.',
      avoid_when: 'Do not use for generic files or folders when the meaning is specifically structured data.',
      strength: 'high',
    });
  }

  if (sourceName === 'database_search' || sourceName === 'file-search' || sourceName === 'folder-search' || sourceName === 'scan-eye') {
    return profile({
      label: sourceName === 'database_search'
        ? 'Data Search'
        : sourceName === 'file-search'
          ? 'File Search'
          : sourceName === 'folder-search'
            ? 'Folder Search'
            : 'Visual Scan',
      depicts: sourceName === 'scan-eye'
        ? 'An eye and scan mark showing inspection or visual scanning.'
        : 'A search-focused symbol showing structured or scoped search.',
      purpose: sourceName === 'database_search'
        ? 'Show search across stored records or structured data.'
        : sourceName === 'file-search'
          ? 'Show search across files or code assets.'
          : sourceName === 'folder-search'
            ? 'Show search across folders, directories, or grouped content.'
            : 'Show visual scanning, inspection, or a focused detection pass.',
      category: 'search_discovery',
      intent: 'discover',
      domain: sourceName === 'scan-eye' ? 'ai_agents' : 'developer_tools',
      semantic_tags: sourceName === 'database_search'
        ? ['search', 'database', 'records', 'lookup', 'structured query']
        : sourceName === 'file-search'
          ? ['file search', 'search code', 'lookup file', 'developer search', 'search']
          : sourceName === 'folder-search'
            ? ['folder search', 'directory search', 'find folder', 'browse lookup', 'search']
            : ['scan', 'inspect', 'detect', 'visual review', 'observation'],
      synonyms: sourceName === 'database_search'
        ? ['search records', 'query database', 'structured lookup', 'data search']
        : sourceName === 'file-search'
          ? ['find file', 'search files', 'code search', 'developer lookup']
          : sourceName === 'folder-search'
            ? ['find folder', 'search directories', 'folder lookup', 'directory search']
            : ['visual scan', 'inspect view', 'scan pass', 'observe'],
      use_when: 'Use when the interface needs a focused search, lookup, or inspection action with a clear scope.',
      avoid_when: 'Do not use for generic browsing or broad AI reasoning when the meaning is specifically search or inspection.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'webhook')) {
    return profile({
      label: 'Webhook',
      depicts: 'A hook-like integration symbol for events or callbacks.',
      purpose: 'Show a webhook, event callback, or trigger sent between systems.',
      category: 'systems_architecture',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: ['webhook', 'event callback', 'trigger', 'integration', 'system event'],
      synonyms: ['event hook', 'callback', 'integration trigger', 'webhook event'],
      use_when: 'Use when the interface refers to webhook setup, event callbacks, or system trigger flows.',
      avoid_when: 'Do not use for generic links or external navigation when the meaning is specifically webhooks.',
      strength: 'high',
    });
  }

  if (hasToken(tokens, 'workflow') || hasToken(tokens, 'waypoints') || hasAllTokens(tokens, ['layers', '3'])) {
    const label = hasToken(tokens, 'workflow') ? 'Workflow' : hasToken(tokens, 'waypoints') ? 'Waypoints' : 'System Layers';
    const purpose = hasToken(tokens, 'workflow')
      ? 'Show orchestration flow, step-based automation, or a multi-step agent process.'
      : hasToken(tokens, 'waypoints')
        ? 'Show named waypoints, milestones, or stepping stones in a process.'
        : 'Show layered system structure or multiple stacked system layers.';
    const tags = hasToken(tokens, 'workflow')
      ? ['workflow', 'orchestration', 'steps', 'automation', 'process']
      : hasToken(tokens, 'waypoints')
        ? ['waypoints', 'milestones', 'steps', 'route points', 'process map']
        : ['layers', 'system layers', 'stack', 'architecture', 'stacked structure'];

    return profile({
      label,
      depicts: `${label} shown as a structured process or layered system symbol.`,
      purpose,
      category: hasToken(tokens, 'workflow') ? 'agent_lifecycle' : 'systems_architecture',
      intent: 'inform',
      domain: hasToken(tokens, 'workflow') ? 'ai_agents' : 'developer_tools',
      semantic_tags: tags,
      synonyms: [label.toLowerCase(), `${label.toLowerCase()} view`, 'process structure', 'system structure'],
      use_when: 'Use when the interface refers to a process, route, or structured system arrangement rather than a single isolated action.',
      avoid_when: 'Do not use for generic navigation arrows or simple status changes when the meaning is process structure.',
      strength: 'medium',
    });
  }

  if (sourceName === 'prompt_suggestion' || sourceName === 'auto_awesome' || sourceName === 'wand-sparkles') {
    const label = sourceName === 'prompt_suggestion' ? 'Prompt Suggestion' : sourceName === 'auto_awesome' ? 'Smart Enhancement' : 'Smart Polish';
    return profile({
      label,
      depicts: 'An enhancement-focused symbol used for generated or improved output.',
      purpose: sourceName === 'prompt_suggestion'
        ? 'Show suggested prompt text or AI-assisted prompt help.'
        : 'Show AI enhancement, generated improvement, or smart polishing of content.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: sourceName === 'prompt_suggestion'
        ? ['prompt', 'suggestion', 'assistant help', 'ai assist', 'prompt writing']
        : ['enhancement', 'ai improve', 'smart polish', 'generated upgrade', 'assist'],
      synonyms: sourceName === 'prompt_suggestion'
        ? ['prompt help', 'suggested prompt', 'assistant suggestion', 'prompt assist']
        : ['smart improve', 'ai enhancement', 'polish', 'generated upgrade'],
      use_when: 'Use when the interface offers AI-assisted prompt help or smart enhancement of content.',
      avoid_when: 'Do not use for hard status, success, or warning when the meaning is specifically suggestion or enhancement.',
      strength: 'medium',
    });
  }

  if (sourceName === 'model_training' || sourceName === 'generating_tokens' || sourceName === 'token') {
    const label = sourceName === 'model_training' ? 'Model Training' : sourceName === 'generating_tokens' ? 'Token Generation' : 'Token';
    const purpose = sourceName === 'model_training'
      ? 'Show model training, learning, or tuning of an AI system.'
      : sourceName === 'generating_tokens'
        ? 'Show token generation, token streaming, or incremental model output.'
        : 'Show token units, model tokens, or token-based usage.';
    return profile({
      label,
      depicts: `${label} shown as an AI model or token-related symbol.`,
      purpose,
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: sourceName === 'model_training'
        ? ['model training', 'learning', 'tuning', 'fit model', 'ai training']
        : sourceName === 'generating_tokens'
          ? ['token generation', 'streaming', 'model output', 'token stream', 'generation']
          : ['token', 'usage unit', 'model token', 'token count', 'tokenized'],
      synonyms: sourceName === 'model_training'
        ? ['train model', 'model learning', 'tune model', 'ai training']
        : sourceName === 'generating_tokens'
          ? ['stream tokens', 'generate output tokens', 'token stream', 'incremental output']
          : ['token count', 'model token', 'usage token', 'text token'],
      use_when: 'Use when the interface refers to training, token generation, or token-based model activity.',
      avoid_when: 'Do not use for generic pricing, badges, or ordinary counters when the meaning is specifically model activity.',
      strength: 'high',
    });
  }

  if (hasAllTokens(tokens, ['network', 'intelligence']) || sourceName === 'network' || sourceName === 'router' || sourceName === 'hub' || sourceName === 'account_tree') {
    const label = hasAllTokens(tokens, ['network', 'intelligence'])
      ? 'Network Intelligence'
      : sourceName === 'router'
        ? 'Routing'
        : sourceName === 'hub'
          ? 'Hub'
          : sourceName === 'account_tree'
            ? 'Hierarchy'
            : 'Network';

    return profile({
      label,
      depicts: `${label} shown as a connected system or branching structure.`,
      purpose: hasAllTokens(tokens, ['network', 'intelligence'])
        ? 'Show insight across a connected system, network activity, or graph-like intelligence.'
        : sourceName === 'router'
          ? 'Show routing, path selection, or network traffic direction.'
          : sourceName === 'hub'
            ? 'Show a central hub that connects multiple related system parts.'
            : sourceName === 'account_tree'
              ? 'Show nested hierarchy, branching structure, or parent-child relationships.'
              : 'Show a connected network, linked nodes, or system graph.',
      category: 'systems_architecture',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: hasAllTokens(tokens, ['network', 'intelligence'])
        ? ['network intelligence', 'system insight', 'graph signal', 'connected insight', 'network']
        : sourceName === 'router'
          ? ['routing', 'network path', 'traffic direction', 'route control', 'system path']
          : sourceName === 'hub'
            ? ['hub', 'central node', 'connected center', 'shared point', 'system hub']
            : sourceName === 'account_tree'
              ? ['hierarchy', 'tree', 'branching', 'parent child', 'structure']
              : ['network', 'graph', 'connected nodes', 'system map', 'links'],
      synonyms: [label.toLowerCase(), 'connected system', 'system graph', 'linked structure'],
      use_when: 'Use when the interface refers to connected system structure, graph relationships, routing, or hierarchy.',
      avoid_when: 'Do not use for simple chat or generic sharing when the meaning is specifically connected architecture.',
      strength: 'medium',
    });
  }

  if (sourceName === 'schema' || sourceName === 'server-cog') {
    return profile({
      label: sourceName === 'schema' ? 'Schema' : 'Server Control',
      depicts: sourceName === 'schema' ? 'A structured schema symbol for typed data rules.' : 'A server with a control gear.',
      purpose: sourceName === 'schema'
        ? 'Show structured schema, field rules, or typed data shape.'
        : 'Show server-side control, configuration, or backend operation.',
      category: sourceName === 'schema' ? 'systems_architecture' : 'systems_architecture',
      intent: sourceName === 'schema' ? 'inform' : 'configure',
      domain: 'developer_tools',
      semantic_tags: sourceName === 'schema'
        ? ['schema', 'data shape', 'structure', 'typed fields', 'spec']
        : ['server', 'backend control', 'server config', 'operations', 'backend'],
      synonyms: sourceName === 'schema'
        ? ['data schema', 'typed structure', 'field model', 'data rules']
        : ['server settings', 'backend control', 'server operation', 'server management'],
      use_when: 'Use when the interface refers to technical structure, backend controls, or typed data definitions.',
      avoid_when: 'Do not use for user-facing settings or simple forms when the meaning is specifically technical structure.',
      strength: 'high',
    });
  }

  if (sourceName === 'terminal') {
    return profile({
      label: 'Terminal',
      depicts: 'A command-line terminal prompt.',
      purpose: 'Show command-line tooling, terminal access, or developer shell work.',
      category: 'engineering_developer_tools',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: ['terminal', 'command line', 'shell', 'developer tool', 'console'],
      synonyms: ['shell', 'console', 'command line', 'terminal session'],
      use_when: 'Use when the interface refers to shell commands, console work, or terminal-based tooling.',
      avoid_when: 'Do not use for chat or generic code views when the meaning is specifically terminal access.',
      strength: 'high',
    });
  }

  if (sourceName === 'messages-square' || sourceName === 'message-square-code' || sourceName === 'message-circle-code') {
    return profile({
      label: sourceName === 'messages-square' ? 'Message Threads' : 'Code Message',
      depicts: 'A message bubble with a communication or code detail.',
      purpose: sourceName === 'messages-square'
        ? 'Show grouped message threads, conversations, or discussion space.'
        : 'Show code-focused conversation, developer chat, or technical message exchange.',
      category: sourceName === 'messages-square' ? 'communication_social' : 'message_actions',
      intent: 'inform',
      domain: sourceName === 'messages-square' ? 'communication' : 'developer_tools',
      semantic_tags: sourceName === 'messages-square'
        ? ['messages', 'threads', 'conversation', 'chat', 'discussion']
        : ['code message', 'developer chat', 'technical conversation', 'message', 'code'],
      synonyms: sourceName === 'messages-square'
        ? ['message threads', 'chat threads', 'conversation list', 'discussion threads']
        : ['technical message', 'developer message', 'code chat', 'message with code'],
      use_when: 'Use when the interface refers to communication, threads, or technical message exchange.',
      avoid_when: 'Do not use for generic notifications or status badges when the meaning is specifically conversation.',
      strength: 'medium',
    });
  }

  if (sourceName === 'database-zap' || sourceName === 'plug-zap') {
    return profile({
      label: sourceName === 'database-zap' ? 'Fast Data Operation' : 'Powered Integration',
      depicts: 'A technical system symbol combined with a lightning accent.',
      purpose: sourceName === 'database-zap'
        ? 'Show accelerated data work, high-speed data action, or powered database activity.'
        : 'Show a fast or powered integration, connected tool, or energized plug-in path.',
      category: 'systems_architecture',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: sourceName === 'database-zap'
        ? ['fast data', 'accelerated database', 'powered data', 'speed', 'database']
        : ['integration', 'plug in', 'powered connection', 'fast integration', 'connector'],
      synonyms: sourceName === 'database-zap'
        ? ['accelerated database', 'fast data operation', 'powered storage', 'database speed']
        : ['fast integration', 'powered connector', 'plug in action', 'energized connection'],
      use_when: 'Use when the interface refers to a technical system action with speed or powered emphasis.',
      avoid_when: 'Do not use for generic performance or power states when the meaning is specifically technical integration or data action.',
      strength: 'medium',
    });
  }

  return null;
}

function resolveSemanticProfile(candidateRecord) {
  const tokens = tokenize(candidateRecord.source_name);

  if (candidateRecord.purpose_chip_category_id === 'navigation-wayfinding') {
    return resolveNavigationProfile(candidateRecord.source_name, tokens) || buildFallbackSemanticProfile(candidateRecord);
  }

  if (candidateRecord.purpose_chip_category_id === 'status-feedback') {
    return resolveStatusProfile(candidateRecord.source_name, tokens) || buildFallbackSemanticProfile(candidateRecord);
  }

  if (candidateRecord.purpose_chip_category_id === 'ai-agent-workflows') {
    return resolveAiProfile(candidateRecord.source_name, tokens) || buildFallbackSemanticProfile(candidateRecord);
  }

  return buildFallbackSemanticProfile(candidateRecord);
}

function estimateScaleUpConfidence(baseConfidence, profileStrength, visualPayloadStatus) {
  const base = typeof baseConfidence === 'number' ? baseConfidence : 0.72;
  const strengthBoost = profileStrength === 'high' ? 0.08 : profileStrength === 'medium' ? 0.04 : 0;
  const visualBoost = isVisualPayloadReady(visualPayloadStatus) ? 0.03 : -0.04;
  return clampConfidence(base + strengthBoost + visualBoost);
}

function determineNextStep(confidence, profileStrength, visualPayloadStatus) {
  const visualReady = isVisualPayloadReady(visualPayloadStatus);

  if (visualReady && profileStrength === 'high' && confidence >= 0.86) {
    return 'editor_review';
  }

  if (visualReady && confidence >= 0.72) {
    return 'visual_review';
  }

  if (!visualReady && confidence >= 0.74 && profileStrength !== 'low') {
    return 'text_review';
  }

  return 'manual_tightening';
}

export function getPurposeChipHandledStateMap({ approvedRecords = [], editorHoldQueue = [], promotionDecisions = {} }) {
  const handled = new Map();

  for (const record of approvedRecords) {
    handled.set(record.icon_id, 'approved');
  }

  for (const record of editorHoldQueue) {
    handled.set(record.icon_id, 'editor_hold');
  }

  for (const batchDecision of Object.values(promotionDecisions.batches || {})) {
    for (const entry of batchDecision.keep_as_reviewed_draft || []) {
      const iconId = typeof entry === 'string' ? entry : entry.icon_id;
      handled.set(iconId, 'reviewed_draft');
    }
  }

  return handled;
}

export function buildAutomationStagedRecord(candidateRecord, visualReviewInput) {
  const semanticProfile = resolveSemanticProfile(candidateRecord);
  const confidence = estimateScaleUpConfidence(candidateRecord.confidence, semanticProfile.strength, visualReviewInput.visual_payload_status);

  const stagedRecord = {
    icon_id: candidateRecord.icon_id,
    source_group: 'pilot',
    source_library: candidateRecord.source_library,
    source_name: candidateRecord.source_name,
    label: semanticProfile.label,
    purpose: semanticProfile.purpose,
    category: semanticProfile.category,
    semantic_tags: semanticProfile.semantic_tags,
    use_when: semanticProfile.use_when,
    avoid_when: semanticProfile.avoid_when,
    version: '1.0.0',
    status: 'draft',
    access_tier: STAGED_ACCESS_TIER,
    projection_policy: STAGED_PROJECTION_POLICY,
    is_premium: false,
    depicts: semanticProfile.depicts,
    intent: semanticProfile.intent,
    domain: semanticProfile.domain,
    confidence,
    synonyms: semanticProfile.synonyms,
    evidence: uniqueStrings([
      'source_name',
      'taxonomy_seed',
      isVisualPayloadReady(visualReviewInput.visual_payload_status) ? 'svg_payload' : 'metadata_only',
    ]),
  };

  validateRegistryRecord(stagedRecord);

  return {
    ...stagedRecord,
    purpose_chip_category_id: candidateRecord.purpose_chip_category_id,
    purpose_chip_category_label: candidateRecord.purpose_chip_category_label,
    rank: candidateRecord.rank,
  };
}

export function buildAutomationNextStepEntry(stagedRecord, visualReviewInput) {
  const nextStep = determineNextStep(stagedRecord.confidence, resolveSemanticProfile(stagedRecord).strength || 'low', visualReviewInput.visual_payload_status);

  return {
    icon_id: stagedRecord.icon_id,
    source_library: stagedRecord.source_library,
    label: stagedRecord.label,
    category: stagedRecord.category,
    purpose_chip_category_id: stagedRecord.purpose_chip_category_id,
    visual_payload_status: visualReviewInput.visual_payload_status,
    confidence: stagedRecord.confidence,
    next_step: nextStep,
    purpose: stagedRecord.purpose,
  };
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

export function buildPurposeChipScaleUpArtifacts({ worklist = [], candidateRecords = [], visualReviewInputs = [], approvedRecords = [], editorHoldQueue = [], promotionDecisions = {} }) {
  const handledStateMap = getPurposeChipHandledStateMap({ approvedRecords, editorHoldQueue, promotionDecisions });
  const visualById = new Map((visualReviewInputs || []).map((item) => [item.icon_id, item]));
  const worklistById = new Map((worklist || []).map((item) => [item.icon_id, item]));

  const stagedRecords = [];
  const nextSteps = [];

  for (const candidateRecord of candidateRecords || []) {
    if (handledStateMap.has(candidateRecord.icon_id)) {
      continue;
    }

    const visualReviewInput = visualById.get(candidateRecord.icon_id);
    if (!visualReviewInput) {
      throw new Error(`Missing visual-review input for ${candidateRecord.icon_id}`);
    }

    const worklistItem = worklistById.get(candidateRecord.icon_id);
    if (!worklistItem) {
      throw new Error(`Missing worklist item for ${candidateRecord.icon_id}`);
    }

    const stagedRecord = buildAutomationStagedRecord(candidateRecord, visualReviewInput);
    stagedRecords.push(stagedRecord);
    nextSteps.push(buildAutomationNextStepEntry(stagedRecord, visualReviewInput));
  }

  stagedRecords.sort((left, right) => left.icon_id.localeCompare(right.icon_id));
  nextSteps.sort((left, right) => {
    const stepOrder = SCALE_UP_NEXT_STEPS.indexOf(left.next_step) - SCALE_UP_NEXT_STEPS.indexOf(right.next_step);
    if (stepOrder !== 0) return stepOrder;
    const confidenceDelta = right.confidence - left.confidence;
    if (confidenceDelta !== 0) return confidenceDelta;
    return left.icon_id.localeCompare(right.icon_id);
  });

  const nextStepCounts = countBy(nextSteps, (entry) => entry.next_step);
  const visualPayloadStatusCounts = countBy(nextSteps, (entry) => entry.visual_payload_status);
  const laneCounts = countBy(stagedRecords, (record) => record.purpose_chip_category_id);

  const laneStateCounts = PURPOSE_CHIP_LANE_ORDER.reduce((summary, laneId) => {
    summary[laneId] = {
      approved: 0,
      editor_hold: 0,
      reviewed_draft: 0,
      automation_staged: 0,
    };
    return summary;
  }, {});

  for (const worklistItem of worklist || []) {
    const state = handledStateMap.get(worklistItem.icon_id) || 'automation_staged';
    laneStateCounts[worklistItem.purpose_chip_category_id][state] += 1;
  }

  const fullCoverageSummary = {
    schema_version: '1.0.0',
    total_icons: worklist.length,
    handled_icon_count: handledStateMap.size,
    remaining_icon_count: stagedRecords.length,
    state_counts: {
      approved: approvedRecords.length,
      editor_hold: editorHoldQueue.length,
      reviewed_draft: [...handledStateMap.values()].filter((value) => value === 'reviewed_draft').length,
      automation_staged: stagedRecords.length,
    },
    state_counts_by_lane: laneStateCounts,
    remaining_next_step_counts: nextStepCounts,
  };

  const scaleUpSummary = {
    schema_version: '1.0.0',
    total_remaining_icons: stagedRecords.length,
    lane_counts: laneCounts,
    next_step_counts: nextStepCounts,
    visual_payload_status_counts: visualPayloadStatusCounts,
    automation_staged_path: 'data/si-registry/pilot/purpose-chip/automation-staged-records.json',
    automation_next_steps_path: 'data/si-registry/pilot/purpose-chip/automation-next-steps.json',
  };

  return {
    stagedRecords,
    nextSteps,
    scaleUpSummary,
    fullCoverageSummary,
  };
}
