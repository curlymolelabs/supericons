export const JOB_LIBRARY_PREFIX = 'job:';

export const JOB_CATEGORY_DEFINITIONS = [
  {
    id: 'ai-agent-workflows',
    label: 'AI & Agents',
    description: 'Curated icons for models, prompts, orchestration, retrieval, and agent runtime surfaces.',
    sidebarGlyph: 'smart_toy',
  },
  {
    id: 'navigation-wayfinding',
    label: 'Navigation & Wayfinding',
    description: 'Core app-shell icons for menus, routing, layout, movement, and dashboard wayfinding.',
    sidebarGlyph: 'dashboard',
  },
  {
    id: 'status-feedback',
    label: 'Status & Feedback',
    description: 'Signals for success, warning, progress, trust, notifications, and user feedback states.',
    sidebarGlyph: 'task_alt',
  },
];

const NAVIGATION_ICON_IDS = [
  'material:menu',
  'material:close',
  'material:arrow_back',
  'material:arrow_forward',
  'material:chevron_left',
  'material:chevron_right',
  'material:expand_more',
  'material:expand_less',
  'material:home',
  'material:search',
  'material:settings',
  'material:more_vert',
  'material:more_horiz',
  'material:apps',
  'material:fullscreen',
  'material:filter_list',
  'material:sort',
  'material:refresh',
  'material:tab',
  'material:drag_indicator',
  'material:arrow_upward',
  'material:arrow_downward',
  'material:swap_vert',
  'material:swap_horiz',
  'material:undo',
  'material:redo',
  'material:menu_open',
  'material:segment',
  'material:density_medium',
  'material:view_sidebar',
  'material:dock_to_right',
  'material:dock_to_left',
  'material:grid_view',
  'material:view_list',
  'material:view_module',
  'material:dashboard',
  'material:splitscreen',
  'material:picture_in_picture_alt',
  'material:open_in_new',
  'material:open_in_full',
  'material:zoom_in',
  'material:zoom_out',
  'material:first_page',
  'material:last_page',
  'material:unfold_more',
  'material:unfold_less',
  'material:fullscreen_exit',
  'material:double_arrow',
  'material:subdirectory_arrow_right',
  'material:launch',
];

const STATUS_ICON_IDS = [
  'tabler:circle-check',
  'tabler:circle-x',
  'tabler:alert-triangle',
  'tabler:info-circle',
  'tabler:help-circle',
  'tabler:ban',
  'tabler:clock',
  'tabler:hourglass',
  'tabler:loader-2',
  'tabler:refresh',
  'tabler:progress-check',
  'tabler:bell',
  'tabler:eye',
  'tabler:eye-off',
  'tabler:thumb-up',
  'tabler:thumb-down',
  'tabler:star',
  'tabler:shield-check',
  'tabler:trophy',
  'tabler:sparkles',
  'tabler:power',
  'tabler:toggle-right',
  'tabler:bookmark',
  'tabler:pinned',
  'tabler:flag',
  'tabler:archive',
  'tabler:trash',
  'tabler:send',
  'tabler:cloud-check',
  'tabler:wifi',
  'tabler:bolt',
  'tabler:flame',
  'tabler:link',
  'tabler:lock',
  'tabler:lock-open',
  'tabler:key',
  'tabler:mail-check',
  'tabler:message-check',
  'tabler:list-check',
  'tabler:filter',
  'tabler:sort-ascending',
  'tabler:trending-up',
  'tabler:trending-down',
  'tabler:mood-smile',
  'tabler:mood-sad',
  'tabler:circle-dot',
  'tabler:clipboard-check',
  'tabler:rosette-discount-check',
  'tabler:heart',
  'tabler:alert-circle',
];

const AI_AGENT_ICON_IDS = [
  'material:smart_toy',
  'material:robot',
  'material:psychology',
  'material:psychology_alt',
  'material:memory',
  'material:memory_alt',
  'material:database',
  'material:database_search',
  'material:webhook',
  'material:workflow',
  'material:prompt_suggestion',
  'material:model_training',
  'material:network_intelligence',
  'material:network_intelligence_history',
  'material:network_intelligence_update',
  'material:hub',
  'material:schema',
  'material:data_object',
  'material:account_tree',
  'material:auto_awesome',
  'material:generating_tokens',
  'material:token',
  'material:dataset',
  'material:dataset_linked',
  'material:terminal',
  'lucide:brain-circuit',
  'lucide:brain-cog',
  'lucide:brain',
  'lucide:bot-message-square',
  'lucide:messages-square',
  'lucide:message-square-code',
  'lucide:message-circle-code',
  'lucide:scan-search',
  'lucide:scan-eye',
  'lucide:search-code',
  'lucide:file-search',
  'lucide:folder-search',
  'lucide:workflow',
  'lucide:circuit-board',
  'lucide:waypoints',
  'lucide:layers-3',
  'lucide:blocks',
  'lucide:binary',
  'lucide:code-xml',
  'lucide:database-zap',
  'lucide:server-cog',
  'lucide:network',
  'lucide:router',
  'lucide:plug-zap',
  'lucide:wand-sparkles',
];

function sourceLibraryFromIconId(iconId) {
  return String(iconId).split(':')[0];
}

function buildEntries(jobCategory, iconIds, secondaryCategories) {
  return iconIds.map((iconId, index) => ({
    iconId,
    sourceLibrary: sourceLibraryFromIconId(iconId),
    jobCategory,
    secondaryCategories: [...secondaryCategories],
    rank: index + 1,
  }));
}

export const JOB_ICON_TAXONOMY_SEED = [
  ...buildEntries('ai-agent-workflows', AI_AGENT_ICON_IDS, ['ai', 'agents', 'automation']),
  ...buildEntries('navigation-wayfinding', NAVIGATION_ICON_IDS, ['navigation', 'wayfinding', 'layout']),
  ...buildEntries('status-feedback', STATUS_ICON_IDS, ['status', 'feedback', 'signals']),
];

export function buildJobLibraryId(jobCategoryId) {
  return `${JOB_LIBRARY_PREFIX}${jobCategoryId}`;
}

export function parseJobLibraryId(value) {
  if (typeof value !== 'string' || !value.startsWith(JOB_LIBRARY_PREFIX)) {
    return null;
  }
  return value.slice(JOB_LIBRARY_PREFIX.length);
}

export function createIconTaxonomyMap() {
  return new Map(JOB_ICON_TAXONOMY_SEED.map((entry) => [entry.iconId, entry]));
}

export function createJobCategoryMap() {
  return new Map(JOB_CATEGORY_DEFINITIONS.map((category) => [category.id, category]));
}
