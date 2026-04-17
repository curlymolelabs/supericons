/**
 * SuperIcons - Main Application Entry
 * Build 7: Collections, Favorites, Recent, Multi-select
 */

import './style.css';
import { initAuth } from './auth.js';
import {
  initStore,
  isDocsSidebarDrawerMode,
  isDocsSidebarDrawerOpen,
  isStoreView,
  loadSvgIntoMotionLab,
  switchView,
  toggleDocsSidebarDrawer,
} from './store.js';
import { hydrateSidebarIconSlot, renderSidebarIconSlot } from './sidebar-icons.js';
import {
  MATERIAL_EXPORT_DEFAULT_AXES,
  MATERIAL_EXPORT_STORAGE,
  MATERIAL_EXPORT_SUPPORTED_AXES,
  buildMaterialCacheKey,
  buildMaterialOwnedSnapshotUrl,
  normalizeMaterialExportAxes,
  normalizeMaterialSnapshotSvg,
} from './material-export.js';
import { initLandingEffects, destroyLandingEffects } from './landing-effects.js';
import { sanitizeSvgExportMarkup } from './lib/public-metadata-sanitizer.js';
import {
  fetchPopularityMap,
  logCopyEvent,
  logFavoriteEvent,
  logSearchAttempt,
} from './lib/icon-intelligence.js';
import {
  JOB_CATEGORY_DEFINITIONS,
  createIconTaxonomyMap,
  createJobCategoryMap,
} from './lib/icon-taxonomy-seed.js';
import { createIconSemanticAliasMap } from './lib/icon-semantic-aliases.js';

// ============================================================

// ============================================================
// State
// ============================================================
const CUSTOMIZE_DEFAULTS = {
  color: '#ffffff',
  color2: '#7B61FF',
  strokeWidth: 1.5,
  materialWeight: 300,
  materialFill: 0,
  materialGrade: 0,
  materialOpticalSize: 24,
  container: 'none',
  badge: false,
  lightBg: false,
  animation: 'none',
  pngSize: 48,
};

const COLOR_PALETTES = {
  default: { label: 'Default', colors: ['#ffffff', '#adaaaa', '#767575', '#000000', '#ff4f00', '#ff906c', '#f97a75', '#ff716c', '#eb9bfe', '#a78bfa', '#60a5fa', '#38bdf8', '#4ade80', '#22d3ee', '#facc15', '#f472b6'] },
  material: { label: 'Material', colors: ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'] },
  tailwind: { label: 'Tailwind', colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'] },
  radix: { label: 'Radix', colors: ['#e5484d', '#e54666', '#ab4aba', '#8e4ec6', '#6e56cf', '#3e63dd', '#0090ff', '#12a594', '#30a46c', '#46a758', '#f5a623', '#e5484d'] },
  mono: { label: 'Mono', colors: ['#000000', '#1a1a1a', '#333333', '#4d4d4d', '#666666', '#808080', '#999999', '#b3b3b3', '#cccccc', '#e6e6e6', '#f2f2f2', '#ffffff'] },
};

const MOBILE_PANEL_MEDIA = window.matchMedia('(max-width: 768px)');

const state = {
  sidebarOpen: false,
  panelOpen: !MOBILE_PANEL_MEDIA.matches,
  activeLibrary: 'all',
  activeJobCategoryFilter: 'all',
  selectedIcon: null,
  searchQuery: '',
  icons: [],
  solidIcons: [],
  solidLoaded: false,
  libraries: [],
  filteredIcons: [],
  synonyms: {},
  iconStyle: 'outline',
  visibleRange: { start: 0, end: 200 },
  batchSize: 200,
  favorites: new Set(),
  recent: [],
  multiSelect: false,
  selectedIcons: new Set(),
  customize: { ...CUSTOMIZE_DEFAULTS },
  recentColors: [],
  activePalette: 'default',
  compareIcons: [],
  popularityMap: {},
  jobCategoryCounts: {},
  searchContextStartedAt: typeof performance !== 'undefined' ? performance.now() : 0,
};

const SEARCH_ATTEMPT_IDLE_MS = 2500;
let pendingSearchAttemptPayload = null;
let pendingSearchAttemptTimer = null;

const iconTaxonomyMap = createIconTaxonomyMap();
const jobCategoryMap = createJobCategoryMap();
const iconSemanticAliasMap = createIconSemanticAliasMap();

const MATERIAL_EXPORT_MANIFEST_FALLBACK = {
  version: 2,
  upstream: null,
  exportMatrix: MATERIAL_EXPORT_SUPPORTED_AXES,
  defaultAxes: MATERIAL_EXPORT_DEFAULT_AXES,
  storage: MATERIAL_EXPORT_STORAGE,
  entries: {},
};

const materialExportState = {
  manifest: null,
  manifestPromise: null,
  svgCache: new Map(),
  failedKeys: new Set(),
};

function resetCustomization() {
  state.customize = { ...CUSTOMIZE_DEFAULTS };
  state.activePalette = 'default';
  if (state.selectedIcon) {
    renderPanelForIcon(state.selectedIcon);
  }
  renderGrid();
  showToast('Customization reset to defaults');
}

function isMaterialFontIcon(icon) {
  return icon?.lib === 'material' && icon?.type === 'font';
}

async function loadMaterialExportManifest() {
  if (materialExportState.manifest) return materialExportState.manifest;
  if (!materialExportState.manifestPromise) {
    materialExportState.manifestPromise = fetch('/material-export-manifest.json')
      .then(resp => (resp.ok ? resp.json() : MATERIAL_EXPORT_MANIFEST_FALLBACK))
      .catch(() => MATERIAL_EXPORT_MANIFEST_FALLBACK)
      .then((manifest) => {
        materialExportState.manifest = manifest || MATERIAL_EXPORT_MANIFEST_FALLBACK;
        return materialExportState.manifest;
      });
  }
  return materialExportState.manifestPromise;
}

function normalizeExportSvgRoot(rawSvg) {
  if (!rawSvg) return null;

  let svg = rawSvg
    .replace(/<svg([^>]*?)\s+width="[^"]*"/gi, '<svg$1')
    .replace(/<svg([^>]*?)\s+height="[^"]*"/gi, '<svg$1');

  if (!/\bviewBox="/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg viewBox="0 0 24 24"');
  }
  if (!/\bpreserveAspectRatio="/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return svg;
}

function getExportStrokeWidth(icon, customize = state.customize) {
  return customize.strokeWidth * (libraryMeta[icon.lib]?.strokeScale || 1);
}

function applyExportCustomization(rawSvg, icon, customize = state.customize, options = {}) {
  if (!rawSvg) return null;

  const c = customize;
  const normalizeRoot = options.normalizeRoot === true;
  let svg = normalizeRoot ? normalizeExportSvgRoot(rawSvg) : rawSvg;

  svg = svg.replace(/stroke="currentColor"/g, `stroke="${c.color}"`);
  svg = svg.replace(/fill="currentColor"/g, `fill="${c.color}"`);

  if (icon.lib === 'material' && !/\bfill="/.test(svg)) {
    svg = svg.replace(/<svg([^>]*)>/, `<svg$1 fill="${c.color}">`);
  }

  if (svg.includes('stop-color')) {
    const stops = [...svg.matchAll(/stop-color="([^"]+)"/g)];
    if (stops.length >= 2) {
      svg = svg.replace(stops[0][0], `stop-color="${c.color}"`);
      svg = svg.replace(stops[1][0], `stop-color="${c.color2}"`);
    }
    svg = svg.replace(/stroke="#00D4FF"/g, `stroke="${c.color}"`);
  }

  const exportStrokeWidth = getExportStrokeWidth(icon, c);
  if (/stroke-width="/i.test(svg)) {
    svg = svg.replace(/stroke-width="[^"]*"/gi, `stroke-width="${exportStrokeWidth}"`);
  } else if (libraryMeta[icon.lib]?.hasStroke !== false && /\bstroke="/i.test(svg)) {
    svg = svg.replace(/<svg([^>]*)>/i, `<svg$1 stroke-width="${exportStrokeWidth}">`);
  }

  if (c.animation && c.animation !== 'none' && ANIM_CSS[c.animation]) {
    const anim = ANIM_CSS[c.animation];
    const styleTag = `<style>${anim.keyframes} ${anim.rule}</style>`;
    svg = svg.replace(/<svg([^>]*)>/, `<svg$1>${styleTag}<g class="si-anim">`);
    svg = svg.replace(/<\/svg>/, '</g></svg>');
  }

  return sanitizeSvgExportMarkup(svg, { preserveBranding: false });
}

async function resolveMaterialSnapshotSvg(icon, customize = state.customize) {
  const axes = normalizeMaterialExportAxes(customize);
  const cacheKey = buildMaterialCacheKey(icon.id, axes);
  if (materialExportState.svgCache.has(cacheKey)) {
    return {
      svg: materialExportState.svgCache.get(cacheKey),
      axes,
      snapped: axes.snapped,
      source: 'material-snapshot',
    };
  }
  if (materialExportState.failedKeys.has(cacheKey)) return null;

  const manifest = await loadMaterialExportManifest();
  const url = buildMaterialOwnedSnapshotUrl(icon.id, axes, manifest);
  let resp;
  try {
    resp = await fetch(url);
  } catch {
    materialExportState.failedKeys.add(cacheKey);
    return null;
  }
  if (!resp.ok) {
    materialExportState.failedKeys.add(cacheKey);
    return null;
  }

  const svg = normalizeMaterialSnapshotSvg(await resp.text());
  const cacheStatus = resp.headers.get('X-Cache-Status');
  materialExportState.svgCache.set(cacheKey, svg);
  return {
    svg,
    axes,
    snapped: axes.snapped,
    source: cacheStatus ? `owned-material-cache:${cacheStatus}` : 'owned-material-cache',
  };
}

async function resolveExportSvg(icon, customize = state.customize) {
  if (isMaterialFontIcon(icon)) {
    const resolved = await resolveMaterialSnapshotSvg(icon, customize);
    if (!resolved) return null;
    return {
      ...resolved,
      svg: applyExportCustomization(resolved.svg, icon, customize),
    };
  }

  const svg = getStyledSvg(icon);
  if (!svg) return null;
  return {
    svg,
    axes: null,
    snapped: false,
    source: 'svg',
  };
}

// ============================================================
// LocalStorage: Favorites & Recent
// ============================================================
function loadCollections() {
  try {
    const favs = localStorage.getItem('si-favorites');
    if (favs) state.favorites = new Set(JSON.parse(favs));
    const rec = localStorage.getItem('si-recent');
    if (rec) state.recent = JSON.parse(rec);
    const rc = localStorage.getItem('si-recent-colors');
    if (rc) state.recentColors = JSON.parse(rc);
  } catch (e) {
    console.warn('Failed to load collections:', e);
  }
}

function pushRecentColor(hex) {
  if (!hex || !/^#[0-9a-fA-F]{3,8}$/.test(hex)) return;
  const lc = hex.toLowerCase();
  state.recentColors = [lc, ...state.recentColors.filter(c => c !== lc)].slice(0, 8);
  localStorage.setItem('si-recent-colors', JSON.stringify(state.recentColors));
}

function saveFavorites() {
  if (state.favorites.size > 0) {
    localStorage.setItem('si-favorites', JSON.stringify([...state.favorites]));
  } else {
    localStorage.removeItem('si-favorites');
  }
  updateSidebarCounts();
}

function saveRecent() {
  if (state.recent.length > 0) {
    localStorage.setItem('si-recent', JSON.stringify(state.recent));
  } else {
    localStorage.removeItem('si-recent');
  }
  updateSidebarCounts();
}

function toggleFavorite(key) {
  if (state.favorites.has(key)) {
    state.favorites.delete(key);
  } else {
    state.favorites.add(key);
  }
  saveFavorites();
  return state.favorites.has(key);
}

function addToRecent(key) {
  state.recent = state.recent.filter((k) => k !== key);
  state.recent.unshift(key);
  if (state.recent.length > 50) state.recent = state.recent.slice(0, 50);
  saveRecent();
}

function clearFavorites() {
  if (state.favorites.size === 0) return;
  state.favorites.clear();
  saveFavorites();
}

function clearRecent() {
  if (state.recent.length === 0) return;
  state.recent = [];
  saveRecent();
}

function iconKey(icon) {
  return `${icon.lib}:${icon.id}`;
}

function getCurrentSearchQuery() {
  return state.searchQuery?.trim() || null;
}

function getResultPositionForIcon(icon) {
  if (!icon) return null;
  const index = state.filteredIcons.findIndex((candidate) => iconKey(candidate) === iconKey(icon));
  return index >= 0 ? index + 1 : null;
}

function getTimeToCopyMs() {
  const startedAt = Number(state.searchContextStartedAt || 0);
  if (!Number.isFinite(startedAt) || startedAt <= 0 || typeof performance === 'undefined') {
    return null;
  }
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function buildCurrentSearchAttemptPayload() {
  const searchQuery = getCurrentSearchQuery();
  if (!searchQuery || searchQuery.length < 3) return null;

  return {
    searchQuery,
    resultCount: state.filteredIcons.length,
    libraryFilter: state.activeLibrary,
    jobCategory: getActiveJobCategoryId(),
    uiSurface: 'grid',
    evidenceText: 'search:grid',
  };
}

function clearPendingSearchAttempt() {
  pendingSearchAttemptPayload = null;
  if (pendingSearchAttemptTimer) {
    clearTimeout(pendingSearchAttemptTimer);
    pendingSearchAttemptTimer = null;
  }
}

function flushPendingSearchAttempt({ useCurrentState = false } = {}) {
  const payload = useCurrentState
    ? buildCurrentSearchAttemptPayload()
    : (pendingSearchAttemptPayload || buildCurrentSearchAttemptPayload());

  clearPendingSearchAttempt();
  if (!payload) return;
  void logSearchAttempt(payload);
}

function queueCurrentSearchAttempt() {
  const payload = buildCurrentSearchAttemptPayload();
  if (!payload) {
    clearPendingSearchAttempt();
    return;
  }

  pendingSearchAttemptPayload = payload;
  if (pendingSearchAttemptTimer) {
    clearTimeout(pendingSearchAttemptTimer);
  }
  pendingSearchAttemptTimer = setTimeout(() => {
    flushPendingSearchAttempt();
  }, SEARCH_ATTEMPT_IDLE_MS);
}

function syncSearchStateFromInput({ resetSearchContext = false } = {}) {
  const nextQuery = els.searchInput?.value?.trim() || '';
  const queryChanged = nextQuery !== state.searchQuery;
  state.searchQuery = nextQuery;
  if (resetSearchContext || queryChanged) {
    state.searchContextStartedAt = typeof performance !== 'undefined' ? performance.now() : 0;
  }
  applyFilters();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFavoriteActionLabel(iconName, isFav) {
  return isFav ? `Remove ${iconName} from favorites` : `Save ${iconName} to favorites`;
}

function renderPanelFavoriteButton(icon) {
  const isFav = state.favorites.has(iconKey(icon));
  const actionLabel = escapeHtml(getFavoriteActionLabel(icon.name, isFav));
  return `
    <button
      type="button"
      class="panel__favorite-btn${isFav ? ' active' : ''}"
      id="panelFavoriteBtn"
      aria-pressed="${isFav}"
      aria-label="${actionLabel}"
      title="${actionLabel}"
    >
      <span class="material-symbols-outlined panel__favorite-btn-icon" aria-hidden="true">${isFav ? 'favorite' : 'favorite_border'}</span>
      <span class="panel__favorite-btn-label">${isFav ? 'Saved' : 'Save'}</span>
    </button>
  `;
}

function updatePanelFavoriteButton(button, icon, isFav) {
  if (!button) return;
  const actionLabel = getFavoriteActionLabel(icon.name, isFav);
  button.classList.toggle('active', isFav);
  button.setAttribute('aria-pressed', String(isFav));
  button.setAttribute('aria-label', actionLabel);
  button.setAttribute('title', actionLabel);
  const iconEl = button.querySelector('.panel__favorite-btn-icon');
  const labelEl = button.querySelector('.panel__favorite-btn-label');
  if (iconEl) iconEl.textContent = isFav ? 'favorite' : 'favorite_border';
  if (labelEl) labelEl.textContent = isFav ? 'Saved' : 'Save';
}

function updateSidebarCounts() {
  const favCount = $('#countFavorites');
  const recCount = $('#countRecent');
  if (favCount) favCount.textContent = state.favorites.size;
  if (recCount) recCount.textContent = state.recent.length;
}

// ============================================================
// DOM
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  sidebarToggle: $('#sidebarToggle'),
  sidebar: $('#sidebar'),
  panelToggle: $('#panelToggle'),
  panelClose: $('#panelClose'),
  panel: $('#panel'),
  mainLayout: $('#mainLayout'),
  landingShell: $('#landingShell'),
  landingHero: $('#landingHero'),
  landingMcp: $('#landing-mcp'),
  compareDrawer: $('#compareDrawer'),
  searchInput: $('#searchInput'),
  searchShortcut: $('#searchShortcut'),
  searchClear: $('#searchClear'),
  iconGrid: $('#iconGrid'),
  gridEmpty: $('#gridEmpty'),
  gridTitle: $('#gridTitle'),
  gridMeta: $('#gridMeta'),
  gridClearCollectionBtn: $('#gridClearCollectionBtn'),

  toast: $('#toast'),
  libraryList: $('#libraryList'),
  useCaseFilters: $('#useCaseFilters'),
  gridArea: $('#gridArea'),
  panelPreview: $('#panelPreview'),

};

function isDocsHeaderSearchMode() {
  return document.body.getAttribute('data-view') === 'docs';
}

function syncHeaderSearchChrome({
  mode = document.body.dataset.headerSearchMode === 'docs' ? 'docs' : 'icons',
  value = els.searchInput?.value || '',
} = {}) {
  if (!els.searchInput || !els.searchShortcut || !els.searchClear) return;

  const isDocsMode = mode === 'docs';
  els.searchInput.placeholder = isDocsMode ? 'Search docs' : 'Search 20,000+ icons...';
  els.searchInput.setAttribute('aria-label', isDocsMode ? 'Search docs' : 'Search icons');
  if (isDocsMode) {
    els.searchInput.setAttribute('aria-controls', 'docsSearchResults');
    els.searchInput.setAttribute('aria-expanded', 'false');
  } else {
    els.searchInput.removeAttribute('aria-controls');
    els.searchInput.removeAttribute('aria-expanded');
  }

  const hasValue = value.length > 0;
  els.searchShortcut.style.display = hasValue ? 'none' : '';
  els.searchClear.style.display = hasValue ? 'flex' : 'none';
}

function setHeaderSearchMode(mode = 'icons', { value } = {}) {
  const resolvedMode = mode === 'docs' ? 'docs' : 'icons';
  document.body.dataset.headerSearchMode = resolvedMode;
  const nextValue = value ?? (resolvedMode === 'docs' ? '' : (state.searchQuery || ''));
  els.searchInput.value = nextValue;
  syncHeaderSearchChrome({ mode: resolvedMode, value: nextValue });
}

function syncCollectionClearButton() {
  const button = els.gridClearCollectionBtn;
  if (!button) return;

  const currentView = document.body.getAttribute('data-view');
  const inIconGridView = !currentView || currentView === 'icons';
  const isFavoritesView = state.activeLibrary === 'favorites';
  const isRecentView = state.activeLibrary === 'recent';
  const isVisible = inIconGridView && (isFavoritesView || isRecentView);

  button.hidden = !isVisible;
  button.classList.toggle('grid-header__utility-btn--hidden', !isVisible);
  if (!isVisible) {
    button.disabled = true;
    button.setAttribute('aria-hidden', 'true');
    button.removeAttribute('data-tip');
    button.removeAttribute('title');
    return;
  }

  const isEmpty = isFavoritesView ? state.favorites.size === 0 : state.recent.length === 0;
  const actionLabel = isFavoritesView ? 'Clear favorites' : 'Clear recent';
  button.disabled = isEmpty;
  button.removeAttribute('aria-hidden');
  button.setAttribute('aria-label', actionLabel);
  button.setAttribute('data-tip', actionLabel);
  button.removeAttribute('title');
}

// ============================================================
// Icon + Synonym Loading
// ============================================================
async function loadIcons() {
  els.gridMeta.textContent = 'Loading icon libraries...';

  try {
    const [iconResp, synResp] = await Promise.all([
      fetch('/icon-index.json'),
      fetch('/synonyms.json', { cache: 'no-store' }),
    ]);

    if (!iconResp.ok) throw new Error(`Icons: HTTP ${iconResp.status}`);
    const data = await iconResp.json();

    state.icons = data.icons;
    state.libraries = data.libraries;
    state.filteredIcons = state.icons;

    if (synResp.ok) {
      state.synonyms = await synResp.json();
      console.log(`Loaded ${Object.keys(state.synonyms).length} synonym groups`);
    }

    rebuildJobCategoryCounts();
    renderUseCaseFilters();
    renderLibraries();
    updateCounts();
    renderGrid();

    els.gridEmpty.style.display = 'none';
    els.iconGrid.style.display = '';

    console.log(`Loaded ${state.icons.length} outline icons from ${state.libraries.length} libraries`);
  } catch (err) {
    console.error('Failed to load icons:', err);
    els.gridMeta.textContent = 'Failed to load icons. Run: node scripts/build-icons.js';
  }
}

async function loadSolidIcons() {
  if (state.solidLoaded) return;
  try {
    const resp = await fetch('/icon-index-solid.json');
    if (!resp.ok) throw new Error(`Solid: HTTP ${resp.status}`);
    const data = await resp.json();
    state.solidIcons = data.icons;
    state.solidLoaded = true;
    console.log(`Lazy-loaded ${state.solidIcons.length} solid icons`);
  } catch (err) {
    console.error('Failed to load solid icons:', err);
    showToast('Failed to load solid icons');
  }
}

// ============================================================
// Libraries
// ============================================================
const libraryMeta = {
  material: { name: 'Material Symbols', iconKey: 'material', fallbackIcon: 'widgets', hasStroke: false, hasFilled: true },
  lucide: { name: 'Lucide', iconKey: 'lucide', fallbackIcon: 'edit', hasStroke: true, hasFilled: false },
  tabler: { name: 'Tabler', iconKey: 'tabler', fallbackIcon: 'category', hasStroke: true, hasFilled: true },
  phosphor: { name: 'Phosphor', iconKey: 'phosphor', fallbackIcon: 'hexagon', hasStroke: false, hasFilled: true },
  heroicons: { name: 'Heroicons', iconKey: 'heroicons', fallbackIcon: 'shield', hasStroke: true, hasFilled: true },
  bootstrap: { name: 'Bootstrap', iconKey: 'bootstrap', fallbackIcon: 'grid_view', hasStroke: false, hasFilled: true },
  iconoir: { name: 'Iconoir', iconKey: 'iconoir', fallbackIcon: 'circle', hasStroke: true, hasFilled: true },
  ionicons: { name: 'Ionicons', iconKey: 'ionicons', fallbackIcon: 'bolt', hasStroke: true, strokeScale: 21.33, hasFilled: true },
  simpleicons: { name: 'Simple Icons', iconKey: 'simpleicons', fallbackIcon: 'apps', hasStroke: false, hasFilled: false },
  mingcute: { name: 'MingCute', iconKey: 'mingcute', fallbackIcon: 'star', hasStroke: false, hasFilled: true, previewSize: 72 },
  premium: { name: 'Premium', iconKey: 'collections', fallbackIcon: 'diamond', hasStroke: true, hasFilled: false },
};

const librarySidebarOrder = [
  'mingcute',
  'simpleicons',
  'lucide',
  'tabler',
  'phosphor',
  'heroicons',
  'bootstrap',
  'iconoir',
  'ionicons',
  'material',
  'premium',
];

const librarySidebarPriority = new Map(
  librarySidebarOrder.map((id, index) => [id, index]),
);

function getIconTaxonomyEntry(iconOrIconId) {
  const resolvedIconId = typeof iconOrIconId === 'string'
    ? iconOrIconId
    : iconOrIconId
      ? iconKey(iconOrIconId)
      : null;
  if (!resolvedIconId) return null;
  return iconTaxonomyMap.get(resolvedIconId) || null;
}

function getIconJobCategory(iconOrIconId) {
  return getIconTaxonomyEntry(iconOrIconId)?.jobCategory || null;
}

function getIconJobRank(iconOrIconId) {
  return getIconTaxonomyEntry(iconOrIconId)?.rank ?? Number.MAX_SAFE_INTEGER;
}

function getTelemetryJobCategory(icon) {
  return getIconJobCategory(icon) || getActiveJobCategoryId();
}

function getJobCategoryMeta(jobCategoryId) {
  if (!jobCategoryId) return null;
  return jobCategoryMap.get(jobCategoryId) || null;
}

function getActiveJobCategoryId() {
  return state.activeJobCategoryFilter === 'all' ? null : state.activeJobCategoryFilter;
}

function getJobCategoryCount(jobCategoryId) {
  return state.jobCategoryCounts?.[jobCategoryId] || 0;
}

function rebuildJobCategoryCounts() {
  const counts = Object.fromEntries(JOB_CATEGORY_DEFINITIONS.map((category) => [category.id, 0]));
  for (const icon of state.icons) {
    const jobCategory = getIconJobCategory(icon);
    if (jobCategory && counts[jobCategory] !== undefined) {
      counts[jobCategory] += 1;
    }
  }
  state.jobCategoryCounts = counts;
}

function renderUseCaseFilters() {
  if (!els.useCaseFilters) return;

  const activeFilter = getActiveJobCategoryId() || 'all';
  const chips = [
    `
      <button
        type="button"
        class="grid-filter-chip${activeFilter === 'all' ? ' active' : ''}"
        data-job-category="all"
        aria-pressed="${activeFilter === 'all'}"
      >
        All
      </button>
    `,
    ...JOB_CATEGORY_DEFINITIONS
      .filter((category) => getJobCategoryCount(category.id) > 0)
      .map((category) => {
        const isActive = activeFilter === category.id;
        return `
          <button
            type="button"
            class="grid-filter-chip${isActive ? ' active' : ''}"
            data-job-category="${category.id}"
            aria-pressed="${isActive}"
          >
            <span>${category.label}</span>
            <span class="grid-filter-chip__count">${getJobCategoryCount(category.id).toLocaleString()}</span>
          </button>
        `;
      }),
  ];

  els.useCaseFilters.innerHTML = chips.join('');
}

function renderLibraries() {
  const orderedLibraries = [...state.libraries].sort((a, b) => {
    const aPriority = librarySidebarPriority.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bPriority = librarySidebarPriority.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return a.id.localeCompare(b.id);
  });

  els.libraryList.innerHTML = orderedLibraries
    .map((lib) => {
      const meta = libraryMeta[lib.id] || { name: lib.id, iconKey: lib.id, fallbackIcon: 'folder' };
      return `
        <div class="sidebar__item" data-library="${lib.id}">
          ${renderSidebarIconSlot(meta.iconKey || lib.id, { fallbackGlyph: meta.fallbackIcon || 'folder' })}
          <span class="sidebar__item-name">${meta.name}</span>
          <span class="sidebar__item-count">${lib.count.toLocaleString()}</span>
        </div>
      `;
    })
    .join('');
}

function hydrateSidebarIcons() {
  $$('[data-sidebar-icon]').forEach((el) => {
    const iconKey = el.dataset.sidebarIcon;
    const fallbackGlyph = el.textContent.trim() || 'folder';
    hydrateSidebarIconSlot(el, iconKey, { fallbackGlyph });
  });
}

// ============================================================
// Grid Rendering
// ============================================================
function renderIconCell(icon) {
  const c = state.customize;
  const isSelected = state.selectedIcons.has(iconKey(icon));
  const selectClass = isSelected ? ' multi-selected' : '';
  const checkmark = state.multiSelect ? `<span class="icon-cell__check ${isSelected ? 'checked' : ''}"><span class="material-symbols-outlined" style="font-size:14px">check_circle</span></span>` : '';
  const compareBtn = `
    <div class="icon-cell__controls">
      <button
        type="button"
        class="icon-cell__compare"
        data-cmp-id="${icon.id}"
        data-cmp-lib="${icon.lib}"
        data-tip="Add to compare"
        aria-label="Add ${icon.name} to compare"
      >
        <svg class="icon-cell__compare-svg" viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
          <path d="M3 5.5H13M10.5 3L13 5.5L10.5 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M13 10.5H3M5.5 8L3 10.5L5.5 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>`;

  if (icon.type === 'font') {
    const fontVars = `font-variation-settings:'FILL' ${c.materialFill},'wght' ${c.materialWeight},'GRAD' ${c.materialGrade},'opsz' ${c.materialOpticalSize};`;
    return `
      <div class="icon-cell${selectClass}" data-icon-id="${icon.id}" data-icon-lib="${icon.lib}">
        ${checkmark}${compareBtn}
        <span class="material-symbols-outlined icon-cell__icon" style="${fontVars}">${icon.id}</span>
        <span class="icon-cell__name">${icon.name}</span>
      </div>
    `;
  }

  const libMeta = libraryMeta[icon.lib] || {};
  const libSupportsStroke = libMeta.hasStroke !== false;
  const scaledStroke = c.strokeWidth * (libMeta.strokeScale || 1);
  const strokeStyle = libSupportsStroke ? `--si-stroke-width:${scaledStroke};` : '';
  const isFilled = !libSupportsStroke;
  const filledClass = isFilled ? ' icon-cell__icon--filled' : '';
  return `
    <div class="icon-cell${selectClass}" data-icon-id="${icon.id}" data-icon-lib="${icon.lib}">
      ${checkmark}${compareBtn}
      <div class="icon-cell__icon${filledClass}" style="${strokeStyle}">${icon.svg}</div>
      <span class="icon-cell__name">${icon.name}</span>
    </div>
  `;
}

function renderGrid() {
  const icons = state.filteredIcons;
  const end = Math.min(state.visibleRange.end, icons.length);
  const visibleIcons = icons.slice(0, end);
  const dividerIdx = state.tierDividerIndex ?? -1;

  let html = '';
  for (let i = 0; i < visibleIcons.length; i++) {
    // Insert tier divider between direct and related results
    if (i === dividerIdx && dividerIdx > 0 && dividerIdx < icons.length) {
      const relatedCount = icons.length - dividerIdx;
      html += `<div class="tier-divider"><span class="tier-divider__label">Related</span><span class="tier-divider__count">${relatedCount} more</span></div>`;
    }
    html += renderIconCell(visibleIcons[i]);
  }
  els.iconGrid.innerHTML = html;

  if (icons.length === 0) {
    els.iconGrid.style.display = 'none';
    els.gridEmpty.style.display = '';
    const emptyTitle = $('.grid-empty__title');
    const emptyText = $('.grid-empty__text');
    const isFavoritesView = state.activeLibrary === 'favorites' && !state.searchQuery;
    const isRecentView = state.activeLibrary === 'recent' && !state.searchQuery;
    const activeJobCategoryMeta = getJobCategoryMeta(getActiveJobCategoryId());
    if (emptyTitle) {
      emptyTitle.textContent = state.searchQuery
        ? 'No icons found'
        : isFavoritesView
          ? 'No favorites yet'
          : isRecentView
            ? 'No recent icons yet'
            : activeJobCategoryMeta
              ? `No ${activeJobCategoryMeta.label.toLowerCase()} icons yet`
            : 'Welcome to SuperIcons';
    }
    if (emptyText) {
      emptyText.textContent = state.searchQuery
        ? activeJobCategoryMeta
          ? `No icons in ${activeJobCategoryMeta.label} match "${state.searchQuery}". Try a different search term.`
          : `No icons match "${state.searchQuery}". Try a different search term.`
        : isFavoritesView
          ? 'Select an icon and use Save in Customize to keep it here. Favorites stay on this device.'
          : isRecentView
            ? 'Icons you open appear here on this device. Clear them anytime from the header.'
            : activeJobCategoryMeta
              ? activeJobCategoryMeta.description
          : '20,000+ icons across 10 libraries including Material Symbols, Lucide, Tabler, and 3,400+ brand logos via Simple Icons. Search, customize, and export in seconds.';
    }
  } else {
    els.iconGrid.style.display = '';
    els.gridEmpty.style.display = 'none';
  }
}

// ============================================================
// Infinite Scroll
// ============================================================
function setupInfiniteScroll() {
  const sentinel = document.createElement('div');
  sentinel.id = 'scrollSentinel';
  sentinel.style.height = '1px';

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && state.visibleRange.end < state.filteredIcons.length) {
        state.visibleRange.end += state.batchSize;
        renderGrid();
        els.gridArea.appendChild(sentinel);
      }
    },
    { root: els.gridArea, rootMargin: '400px' }
  );

  els.gridArea.appendChild(sentinel);
  observer.observe(sentinel);
}

// ============================================================
// ============================================================
// Search with Synonyms + Smart Matching
// ============================================================

/** Inline Levenshtein distance (capped early for performance) */
function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length, n = b.length;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev.splice(0, n + 1, ...curr);
  }
  return prev[n];
}

function normalizeSemanticText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSemanticText(value) {
  const normalized = normalizeSemanticText(value);
  return normalized ? normalized.split(' ') : [];
}

function getIconSemanticAliases(iconOrIconId) {
  const resolvedIconId = typeof iconOrIconId === 'string'
    ? iconOrIconId
    : iconKey(iconOrIconId);
  return iconSemanticAliasMap.get(resolvedIconId) || null;
}

function getDirectSearchScore(icon, normalizedQuery, queryWords) {
  if (!normalizedQuery) return 0;

  const name = normalizeSemanticText(icon.name);
  const id = normalizeSemanticText(icon.id);
  const fullId = normalizeSemanticText(iconKey(icon));
  const tokens = new Set([
    ...tokenizeSemanticText(icon.name),
    ...tokenizeSemanticText(icon.id),
    ...tokenizeSemanticText(iconKey(icon)),
  ]);

  if (name === normalizedQuery || id === normalizedQuery || fullId === normalizedQuery) {
    return 320;
  }

  if (normalizedQuery.length > 2 && (
    name.includes(normalizedQuery)
    || id.includes(normalizedQuery)
    || fullId.includes(normalizedQuery)
  )) {
    return 250;
  }

  if (queryWords.length > 0 && queryWords.every((word) => tokens.has(word))) {
    return 190;
  }

  if (queryWords.length > 0 && queryWords.every((word) => (
    name.includes(word) || id.includes(word) || fullId.includes(word)
  ))) {
    return 150;
  }

  return 0;
}

function getCuratedAliasScore(icon, normalizedQuery, queryWords) {
  if (!normalizedQuery) return 0;

  const aliases = getIconSemanticAliases(icon);
  if (!aliases?.length) return 0;

  let bestScore = 0;

  for (const alias of aliases) {
    const normalizedAlias = normalizeSemanticText(alias);
    if (!normalizedAlias) continue;

    const aliasTokens = new Set(tokenizeSemanticText(normalizedAlias));

    if (normalizedAlias === normalizedQuery) {
      bestScore = Math.max(bestScore, 420);
      continue;
    }

    if (normalizedQuery.length > 3 && normalizedAlias.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 360);
      continue;
    }

    if (queryWords.length > 1 && queryWords.every((word) => aliasTokens.has(word))) {
      bestScore = Math.max(bestScore, 320);
      continue;
    }

    if (queryWords.length === 1 && aliasTokens.has(queryWords[0])) {
      bestScore = Math.max(bestScore, 260);
      continue;
    }

    if (queryWords.length > 0 && queryWords.every((word) => normalizedAlias.includes(word))) {
      bestScore = Math.max(bestScore, 220);
    }
  }

  return bestScore;
}

/** Expand a single search word into a set of matching terms */
function expandSingleTerm(word) {
  const syn = state.synonyms;
  const terms = new Set([word]);

  // 1. Direct key match
  if (syn[word]) syn[word].forEach(t => terms.add(t));

  // 2. Reverse lookup (word is a value in some group)
  for (const [key, values] of Object.entries(syn)) {
    if (values.some(v => v === word || v.split(' ').includes(word))) {
      terms.add(key);
      values.forEach(t => terms.add(t));
    }
  }

  // 3. Prefix matching (word is a prefix of a synonym key, min 3 chars)
  if (word.length >= 3) {
    for (const [key, values] of Object.entries(syn)) {
      if (key.startsWith(word) && key !== word) {
        terms.add(key);
        values.forEach(t => terms.add(t));
      }
    }
  }

  // 4. Plural/suffix normalization (try stripping common suffixes)
  if (terms.size === 1) {
    const stripped = word.replace(/ings?$/, '').replace(/ations?$/, 'ate').replace(/es$/, '').replace(/s$/, '');
    if (stripped !== word && stripped.length > 2) {
      if (syn[stripped]) syn[stripped].forEach(t => terms.add(t));
      for (const [key, values] of Object.entries(syn)) {
        if (key === stripped || values.includes(stripped)) {
          terms.add(key);
          values.forEach(t => terms.add(t));
        }
      }
    }
  }

  // 5. Fuzzy typo tolerance (edit distance <= 1, only for queries > 4 chars, only if still no expansion)
  if (terms.size === 1 && word.length > 4) {
    for (const key of Object.keys(syn)) {
      if (editDistance(word, key) <= 1) {
        terms.add(key);
        syn[key].forEach(t => terms.add(t));
      }
    }
  }

  // Filter out 2-char terms from the EXPANSION (not the original query) to prevent
  // false positives: 'ai' as a substring matches 'brain','train','maintain' etc.
  const result = [...terms].filter(t => t === word || t.length > 2);

  // Cap to avoid over-broadening
  return result.slice(0, 20);
}

/** Expand a full search query, returning an array of term-sets for AND matching */
function expandSearchTerms(query) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.map(w => expandSingleTerm(w));
}

function applyFilters() {
  // Choose icon set based on active style
  const isSolid = state.iconStyle === 'solid';
  const activeJobCategoryId = getActiveJobCategoryId();
  let icons;

  if (isSolid && state.solidLoaded) {
    // For solid mode: start with solid icons
    icons = state.solidIcons;

    // Material Symbols: use same outline icons but with Fill=1
    // They don't have separate solid SVGs, the font axis handles it
    const materialOutline = state.icons.filter(i => i.lib === 'material');
    const solidNonMaterial = icons.filter(i => i.lib !== 'material');
    icons = [...materialOutline, ...solidNonMaterial];

    // For libraries without solid variants (lucide, feather), fall back to outline
    const libsWithSolid = new Set(icons.map(i => i.lib));
    const outlineFallback = state.icons.filter(
      i => !libsWithSolid.has(i.lib)
    );
    icons = [...icons, ...outlineFallback];
  } else {
    icons = state.icons;
  }

  // Library filter
  if (state.activeLibrary === 'favorites') {
    icons = icons.filter((icon) => state.favorites.has(iconKey(icon)));
  } else if (state.activeLibrary === 'recent') {
    const recentIcons = [];
    for (const key of state.recent) {
      const found = icons.find((i) => iconKey(i) === key);
      if (found) recentIcons.push(found);
    }
    icons = recentIcons;
  } else if (state.activeLibrary !== 'all') {
    icons = icons.filter((icon) => icon.lib === state.activeLibrary);
  }

  if (activeJobCategoryId) {
    icons = icons
      .filter((icon) => getIconJobCategory(icon) === activeJobCategoryId)
      .sort((a, b) => {
        const rankDiff = getIconJobRank(a) - getIconJobRank(b);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name);
      });
  }

  // Search filter: tiered results (direct matches first, then synonym matches)
  if (state.searchQuery) {
    const normalizedQuery = normalizeSemanticText(state.searchQuery);
    const queryWords = tokenizeSemanticText(state.searchQuery);
    const termSets = expandSearchTerms(normalizedQuery); // array of term-sets, one per word

    // Helper: check if icon matches a set of term-sets
    const iconMatchesTermSets = (icon, sets) => {
      const name = icon.name.toLowerCase();
      const id = icon.id.toLowerCase();
      const segments = id.split(/[-_]/).concat(name.split(/[\s\-_]/));
      return sets.every(terms =>
        terms.some(term => {
          if (term.length <= 3) return segments.some(s => s === term);
          return name.includes(term) || id.includes(term);
        })
      );
    };

    // Tier 1: direct query and curated-alias matches
    const tier1 = icons
      .map((icon) => ({
        icon,
        aliasScore: getCuratedAliasScore(icon, normalizedQuery, queryWords),
        directScore: getDirectSearchScore(icon, normalizedQuery, queryWords),
      }))
      .filter(({ aliasScore, directScore }) => aliasScore > 0 || directScore > 0)
      .sort((a, b) => {
        if (b.aliasScore !== a.aliasScore) return b.aliasScore - a.aliasScore;
        if (b.directScore !== a.directScore) return b.directScore - a.directScore;

        const rankDiff = getIconJobRank(a.icon) - getIconJobRank(b.icon);
        if (rankDiff !== 0) return rankDiff;

        return a.icon.name.localeCompare(b.icon.name);
      })
      .map(({ icon }) => icon);

    const tier1Keys = new Set(tier1.map(i => iconKey(i)));

    // Tier 2: matched by synonym expansion but NOT by direct query
    const tier2 = icons.filter(icon =>
      !tier1Keys.has(iconKey(icon)) && iconMatchesTermSets(icon, termSets)
    );

    state.tierDividerIndex = tier1.length;
    icons = [...tier1, ...tier2];
  } else {
    state.tierDividerIndex = -1;
  }

  // Popularity sort: in default 'All Icons' view with no search, sort popular icons first
  if (!activeJobCategoryId && state.activeLibrary === 'all' && !state.searchQuery && Object.keys(state.popularityMap).length > 0) {
    const pop = state.popularityMap;
    icons.sort((a, b) => {
      const aCount = pop[`${a.lib}:${a.id}`] || 0;
      const bCount = pop[`${b.lib}:${b.id}`] || 0;
      if (aCount !== bCount) return bCount - aCount; // popular first
      return a.name.localeCompare(b.name);            // then alphabetical
    });
  }

  state.filteredIcons = icons;
  state.visibleRange.end = state.batchSize;
  updateCounts();
  renderGrid();
}

function updateCounts() {
  const total = state.icons.length;
  const showing = state.filteredIcons.length;
  const styleSuffix = state.iconStyle === 'solid' ? ' (solid)' : '';
  const activeJobCategoryId = getActiveJobCategoryId();
  const activeJobCategoryMeta = getJobCategoryMeta(activeJobCategoryId);

  $('#countAll').textContent = total.toLocaleString();
  syncHeaderSearchChrome();
  syncCollectionClearButton();
  updateGridHeading();

  if (isStoreView()) return;

  // Check if current library has no solid variant
  const activeLib = state.activeLibrary;
  const noSolid = state.iconStyle === 'solid'
    && activeLib !== 'all' && activeLib !== 'favorites' && activeLib !== 'recent'
    && libraryMeta[activeLib] && !libraryMeta[activeLib].hasFilled;

  if (noSolid) {
    els.gridMeta.textContent = `Showing outline (no solid variant available)`;
  } else if (activeJobCategoryMeta) {
    const scopeLabel = state.activeLibrary === 'all' ? activeJobCategoryMeta.label : els.gridTitle.textContent;
    els.gridMeta.textContent = state.searchQuery
      ? `Showing ${showing.toLocaleString()} results in ${scopeLabel}${styleSuffix}`
      : `Showing ${showing.toLocaleString()} curated icons in ${scopeLabel}${styleSuffix}`;
  } else if (showing === total && !state.searchQuery) {
    els.gridMeta.textContent = `Showing ${total.toLocaleString()} icons${styleSuffix}`;
  } else {
    els.gridMeta.textContent = `Showing ${showing.toLocaleString()} of ${total.toLocaleString()} icons${styleSuffix}`;
  }

}

// ============================================================
// Sidebar & Panel
// ============================================================
function isLandingActive() {
  return Boolean(els.landingShell && !els.landingShell.classList.contains('hidden'));
}

function isMobilePanelMode() {
  return MOBILE_PANEL_MEDIA.matches;
}

function syncPanelLayout() {
  const panelSuppressed = els.panel?.classList.contains('panel--pricing-hidden');
  const showPanel = state.panelOpen && !panelSuppressed && !isLandingActive();
  if (els.panel) {
    els.panel.classList.toggle('panel-open', showPanel);
  }
  if (els.mainLayout) {
    els.mainLayout.classList.toggle('panel-hidden', !state.panelOpen || panelSuppressed);
  }
}

function syncSidebarToggleButton() {
  const button = els.sidebarToggle;
  if (!button) return;

  const docsDrawerMode = isDocsSidebarDrawerMode();
  const docsDrawerOpen = isDocsSidebarDrawerOpen();
  const icon = button.querySelector('.material-symbols-outlined');
  const actionLabel = docsDrawerMode
    ? (docsDrawerOpen ? 'Close docs navigation' : 'Open docs navigation')
    : 'Menu';

  if (icon) {
    icon.textContent = docsDrawerMode && docsDrawerOpen ? 'close' : 'menu';
  }

  button.setAttribute('aria-label', actionLabel);
  button.setAttribute('data-tip', actionLabel);
  button.setAttribute('title', actionLabel);

  if (docsDrawerMode) {
    button.setAttribute('aria-controls', 'docsSidebarNav');
    button.setAttribute('aria-expanded', docsDrawerOpen ? 'true' : 'false');
    return;
  }

  button.setAttribute('aria-controls', 'sidebar');
  button.setAttribute('aria-expanded', state.sidebarOpen ? 'true' : 'false');
}

function setSidebarOpen(isOpen) {
  state.sidebarOpen = Boolean(isOpen);
  els.sidebar.classList.toggle('open', state.sidebarOpen && !isLandingActive());
  syncSidebarToggleButton();
}

function setPanelOpen(isOpen) {
  state.panelOpen = Boolean(isOpen);
  syncPanelLayout();
}

function setPanelSuppressed(isSuppressed) {
  if (!els.panel) return;
  els.panel.classList.toggle('panel--pricing-hidden', Boolean(isSuppressed));
  if (isSuppressed) {
    els.panel.dataset.hiddenByView = '1';
  } else {
    delete els.panel.dataset.hiddenByView;
  }
  syncPanelLayout();
}

function closeCompareDrawer() {
  els.compareDrawer?.classList.remove('open');
}

function syncLandingState() {
  const landingActive = isLandingActive();
  document.body.classList.toggle('landing-active', landingActive);
  if (landingActive) {
    setSidebarOpen(false);
    closeCompareDrawer();
  }
  syncPanelLayout();
}

function syncShellForViewport() {
  setSidebarOpen(false);
  if (isMobilePanelMode() && !state.selectedIcon && !state.multiSelect) {
    setPanelOpen(false);
    return;
  }
  syncPanelLayout();
}

function toggleSidebar() {
  if (isDocsSidebarDrawerMode()) {
    toggleDocsSidebarDrawer();
    return;
  }
  setSidebarOpen(!state.sidebarOpen);
}

function togglePanel() {
  setPanelOpen(!state.panelOpen);
}

function updateGridHeading() {
  const titleMap = { all: 'All Icons', favorites: 'Favorites', recent: 'Recent' };
  const activeJobCategoryMeta = getJobCategoryMeta(getActiveJobCategoryId());
  const libraryTitle = titleMap[state.activeLibrary] || (libraryMeta[state.activeLibrary]?.name || state.activeLibrary);

  if (state.activeLibrary === 'all' && activeJobCategoryMeta) {
    els.gridTitle.textContent = activeJobCategoryMeta.label;
    return;
  }

  if (activeJobCategoryMeta) {
    els.gridTitle.textContent = `${libraryTitle} + ${activeJobCategoryMeta.label}`;
    return;
  }

  els.gridTitle.textContent = libraryTitle;
}

function setActiveLibrary(libraryId) {
  // Store views are handled by store.js, not the icon grid
  if (libraryId === 'animated-packs' || libraryId === 'my-downloads') {
    return; // store.js handles these via its own click listeners
  }

  // If leaving a store view, clean up store state
  if (isStoreView()) {
    switchView('icons');
  }

  state.activeLibrary = libraryId;

  $$('.sidebar__item').forEach((item) => {
    item.classList.toggle('active', item.dataset.library === libraryId);
  });

  updateGridHeading();
  applyFilters();
  flushPendingSearchAttempt({ useCurrentState: true });
}

function setActiveJobCategoryFilter(jobCategoryId) {
  const nextFilter = jobCategoryId && jobCategoryMap.has(jobCategoryId) ? jobCategoryId : 'all';
  state.activeJobCategoryFilter = nextFilter;
  renderUseCaseFilters();
  updateGridHeading();
  applyFilters();
  flushPendingSearchAttempt({ useCurrentState: true });
}

function selectIcon(iconId, iconLib) {
  const icon = state.icons.find((i) => i.id === iconId && i.lib === iconLib);
  if (!icon) return;

  flushPendingSearchAttempt();

  // Multi-select mode
  if (state.multiSelect) {
    const key = iconKey(icon);
    if (state.selectedIcons.has(key)) {
      state.selectedIcons.delete(key);
    } else {
      if (state.selectedIcons.size >= 10) {
        showToast('Maximum 10 icons. Deselect one first.');
        return;
      }
      state.selectedIcons.add(key);
    }
    renderGrid();
    updateMultiSelectCount();
    renderBatchPanel();
    return;
  }

  // Toggle: clicking same icon again deselects it
  if (state.selectedIcon && state.selectedIcon.id === icon.id && state.selectedIcon.lib === icon.lib) {
    state.selectedIcon = null;
    $$('.icon-cell.selected').forEach((el) => el.classList.remove('selected'));
    // Restore default preview and placeholder
    els.panelPreview.innerHTML = '<span class="material-symbols-outlined panel__preview-icon" style="font-size:64px; color: var(--si-text-dim);">widgets</span>';
    const panelBody = $('.panel__body');
    if (panelBody) {
      panelBody.className = 'panel__placeholder';
      panelBody.innerHTML = '<span class="material-symbols-outlined panel__placeholder-icon">touch_app</span><p class="panel__placeholder-text">Select an icon from the grid to customize it</p>';
    }
    return;
  }

  state.selectedIcon = icon;
  addToRecent(iconKey(icon));

  // Update grid selection
  $$('.icon-cell.selected').forEach((el) => el.classList.remove('selected'));
  const cell = $(`.icon-cell[data-icon-id="${iconId}"][data-icon-lib="${iconLib}"]`);
  if (cell) cell.classList.add('selected');

  // Update panel with customize controls
  renderPanelForIcon(icon);

  if (!state.panelOpen) setPanelOpen(true);
}

function updateMultiSelectCount() {
  const count = state.selectedIcons.size;
  els.gridMeta.textContent = count > 0
    ? `${count}/10 selected`
    : 'Click icons to select (max 10).';
}

// ============================================================
// Customization Panel Rendering
// ============================================================
function findSameConceptIcons(icon) {
  const normalize = (id) => id.toLowerCase().replace(/[-_\s]+/g, '-');
  const normalId = normalize(icon.id);
  // Skip Material Symbols (font icons, different naming) and same-library matches
  return state.icons.filter(other =>
    other.lib !== icon.lib &&
    other.type === 'svg' &&
    normalize(other.id) === normalId
  );
}

function renderAlsoInRow(icon) {
  const alsoIn = findSameConceptIcons(icon);
  if (alsoIn.length === 0) return '';
  // Deduplicate by library (take first match per lib)
  const seen = new Set();
  const unique = alsoIn.filter(a => {
    if (seen.has(a.lib)) return false;
    seen.add(a.lib);
    return true;
  });
  return `
    <div class="also-in-row">
      <span class="also-in-label">Also in</span>
      ${unique.map(alt => `
        <button type="button" class="also-in-pill" data-also-lib="${alt.lib}" data-also-id="${alt.id}">
          ${escapeHtml(libraryMeta[alt.lib]?.name || alt.lib)}
        </button>
      `).join('')}
    </div>
  `;
}
function renderPanelForIcon(icon) {
  const c = state.customize;
  const iconName = escapeHtml(icon.name);
  const libraryName = escapeHtml(libraryMeta[icon.lib]?.name || icon.lib);
  const assetType = icon.type === 'font' ? 'Variable Font' : 'SVG';
  const iconId = escapeHtml(icon.id);

  // Preview
  if (icon.type === 'font') {
    const fontVars = `font-variation-settings:'FILL' ${c.materialFill},'wght' ${c.materialWeight},'GRAD' ${c.materialGrade},'opsz' ${c.materialOpticalSize};`;
    els.panelPreview.innerHTML = `<span class="material-symbols-outlined panel__preview-icon" style="font-size:64px;${fontVars}color:${c.color};">${icon.id}</span>`;
  } else {
    const isFilled = libraryMeta[icon.lib]?.hasStroke === false;
    const filledClass = isFilled ? ' panel__preview-icon--filled' : '';
    const previewScale = (libraryMeta[icon.lib]?.strokeScale || 1);
    const previewSize = libraryMeta[icon.lib]?.previewSize || 64;
    // Strip hardcoded width/height from SVG so CSS controls sizing,
    // and ensure viewBox exists so the content scales properly.
    let cleanedSvg = icon.svg.replace(/<svg([^>]*?)\s+width="[^"]*"/g, '<svg$1')
                              .replace(/<svg([^>]*?)\s+height="[^"]*"/g, '<svg$1');
    if (!cleanedSvg.includes('viewBox')) {
      cleanedSvg = cleanedSvg.replace('<svg', '<svg viewBox="0 0 24 24"');
    }
    els.panelPreview.innerHTML = `<div class="panel__preview-icon${filledClass}" style="color:${c.color};--si-stroke-width:${c.strokeWidth * previewScale};--si-preview-size:${previewSize}px;">${cleanedSvg}</div>`;
  }

  // Build customize sections
  const panelBody = $('.panel__placeholder') || document.createElement('div');
  panelBody.className = 'panel__body';
  panelBody.innerHTML = `
    <!-- Icon Info -->
    <div class="panel__section">
      <div class="panel__meta">
        <div class="panel__meta-head">
          <p class="panel__meta-title">${iconName}</p>
          ${renderPanelFavoriteButton(icon)}
        </div>
        <p class="panel__meta-subtitle">${libraryName} &middot; ${assetType} &middot; <code>${iconId}</code></p>
        ${renderAlsoInRow(icon)}
      </div>
    </div>

    <!-- Color -->
    <div class="panel__section">
      <div class="panel__section-title">Color</div>
      <div class="customize-color">
          <input type="color" id="colorPicker" value="${c.color}" class="customize-color__input">
          <input type="text" id="colorHex" value="${c.color}" class="customize-color__hex" maxlength="7" spellcheck="false">
      </div>
      <div class="palette-selector">
        ${Object.entries(COLOR_PALETTES).map(([key, p]) => `
          <button class="palette-tab ${state.activePalette === key ? 'active' : ''}" data-palette="${key}">${p.label}</button>
        `).join('')}
      </div>
      ${state.recentColors.length > 0 ? `
        <div class="recent-colors-label">Recent</div>
        <div class="customize-swatches recent-colors-row">
          ${state.recentColors.map(rc => `<button class="customize-swatch" data-color="${rc}" style="background:${rc};" aria-label="Color ${rc}"></button>`).join('')}
        </div>
      ` : ''}
      <div class="customize-swatches" id="colorSwatches">
        ${renderSwatches()}
      </div>
    </div>

    <!-- Stroke Width (SVG only) -->
    ${icon.type === 'svg' ? (() => {
      const supportsStroke = libraryMeta[icon.lib]?.hasStroke !== false;
      const disabledAttr = supportsStroke ? '' : ' disabled';
      const disabledClass = supportsStroke ? '' : ' customize-slider--disabled';
      const hint = supportsStroke ? '' : '<p class="customize-hint"><span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">info</span> This library uses filled paths. Stroke width has no effect.</p>';
      return `
    <div class="panel__section">
      <div class="panel__section-title">Stroke Width</div>
      <div class="customize-slider${disabledClass}">
        <input type="range" id="strokeSlider" min="0.5" max="3" step="0.1" value="${c.strokeWidth}" class="customize-slider__range"${disabledAttr}>
        <span class="customize-slider__value" id="strokeValue">${c.strokeWidth}px</span>
      </div>
      ${hint}
    </div>
    `;
    })() : ''}

    <!-- Material Symbols Variable Axes (font only) -->
    ${icon.type === 'font' ? `
    <div class="panel__section">
      <div class="panel__section-title">Variable Font Axes</div>
      <div class="customize-axis">
        <label class="customize-axis__label">Weight <span id="weightValue">${c.materialWeight}</span></label>
        <input type="range" id="axisWeight" min="100" max="700" step="100" value="${c.materialWeight}" class="customize-slider__range">
      </div>
      <div class="customize-axis">
        <label class="customize-axis__label">Fill <span id="fillValue">${c.materialFill}</span></label>
        <input type="range" id="axisFill" min="0" max="1" step="1" value="${c.materialFill}" class="customize-slider__range">
      </div>
      <div class="customize-axis">
        <label class="customize-axis__label">Grade <span id="gradeValue">${c.materialGrade}</span></label>
        <input type="range" id="axisGrade" min="-25" max="200" step="25" value="${c.materialGrade}" class="customize-slider__range">
      </div>
      <div class="customize-axis">
        <label class="customize-axis__label">Optical Size <span id="opszValue">${c.materialOpticalSize}</span></label>
        <input type="range" id="axisOpsz" min="20" max="48" step="4" value="${c.materialOpticalSize}" class="customize-slider__range">
      </div>
    </div>
    ` : ''}

    <!-- Container Preview -->
    <div class="panel__section">
      <div class="panel__section-title">Container</div>
      <div class="customize-container-shapes">
        <button class="customize-container-btn ${state.customize.container === 'none' ? 'active' : ''}" data-shape="none" data-tip="None">
          <span class="material-symbols-outlined" style="font-size:16px">crop_free</span>
        </button>
        <button class="customize-container-btn ${state.customize.container === 'circle' ? 'active' : ''}" data-shape="circle" data-tip="Circle">
          <span class="material-symbols-outlined" style="font-size:16px">circle</span>
        </button>
        <button class="customize-container-btn ${state.customize.container === 'squircle' ? 'active' : ''}" data-shape="squircle" data-tip="Squircle">
          <span class="material-symbols-outlined" style="font-size:16px">square</span>
        </button>
        <button class="customize-container-btn ${state.customize.container === 'pill' ? 'active' : ''}" data-shape="pill" data-tip="Pill">
          <span class="material-symbols-outlined" style="font-size:16px">rectangle</span>
        </button>
        <button class="customize-container-btn ${state.customize.container === 'glass' ? 'active' : ''}" data-shape="glass" data-tip="Glass">
          <span class="material-symbols-outlined" style="font-size:16px">blur_on</span>
        </button>
      </div>
      <div class="customize-row" style="margin-top: var(--si-space-2);">
        <label class="customize-toggle">
          <input type="checkbox" id="badgeToggle" ${state.customize.badge ? 'checked' : ''}>
          <span class="customize-toggle__label">Badge dot</span>
        </label>
        <label class="customize-toggle">
          <input type="checkbox" id="lightBgToggle" ${state.customize.lightBg ? 'checked' : ''}>
          <span class="customize-toggle__label">Light bg</span>
        </label>
      </div>
    </div>

    <!-- Animation -->
    <div class="panel__section">
      <div class="panel__section-title">Animation</div>
      <div class="customize-container-shapes">
        ${['none', 'spin', 'pulse', 'bounce', 'shake'].map(a => `
          <button class="customize-container-btn ${state.customize.animation === a ? 'active' : ''}" data-animation="${a}" data-tip="${a}">
            ${a === 'none' ? '<span class="material-symbols-outlined" style="font-size:16px">block</span>' : `<span style="font-size:0.5rem;text-transform:uppercase;letter-spacing:-0.02em">${a}</span>`}
          </button>
        `).join('')}
      </div>
      ${(icon.type === 'svg' || isMaterialFontIcon(icon)) ? `
      <div style="margin-top:8px">
        <button class="customize-export__btn" id="openMotionLab">
          <span class="material-symbols-outlined" style="font-size:16px">animation</span> Open in Motion Lab
        </button>
      </div>
      ` : ''}
    </div>

    <!-- Export -->
    <div class="panel__section">
      <div class="panel__section-title">Export</div>
      <div class="customize-export">
        <button class="customize-export__btn" id="exportCopySvg">
          <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy SVG
        </button>
        <button class="customize-export__btn" id="exportCopyBase64">
          <span class="material-symbols-outlined" style="font-size:16px">data_object</span> Copy Base64
        </button>
        <button class="customize-export__btn" id="exportDownloadSvg">
          <span class="material-symbols-outlined" style="font-size:16px">download</span> Download SVG
        </button>
      </div>

      <!-- PNG / ICO sub-section -->
      <div class="panel__section-divider"></div>
      <div class="panel__section-subtitle">PNG Size</div>
      <div class="png-size-picker">
        ${[16, 24, 32, 48, 64, 128, 256].map(s => `
          <button class="png-size-btn ${state.customize.pngSize === s ? 'active' : ''}" data-size="${s}">${s}</button>
        `).join('')}
        <input class="png-size-custom" id="pngSizeCustom" type="number" min="8" max="1024" placeholder="px"
          title="Custom size (8-1024)">
      </div>
      <div class="customize-export">
        <button class="customize-export__btn" id="exportDownloadPng">
          <span class="material-symbols-outlined" style="font-size:16px">image</span>
          Download PNG <span class="png-size-badge" id="pngSizeBadge">${state.customize.pngSize}px</span>
        </button>
        <button class="customize-export__btn" id="exportDownloadIco">
          <span class="material-symbols-outlined" style="font-size:16px">bookmark</span> Download ICO
        </button>
      </div>
      ${isMaterialFontIcon(icon) ? `
      <p class="customize-hint">
        <span class="material-symbols-outlined" style="font-size:14px;vertical-align:-2px">info</span>
        Graphical exports use the nearest supported Material snapshot when an exact slider value is unavailable.
      </p>
      ` : ''}
    </div>

    <!-- Copy as Component -->
    <div class="panel__section">
      <div class="panel__section-title">Copy as Component</div>
      <div class="customize-export">
        <button class="customize-export__btn" id="exportReact">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> React
        </button>
        <button class="customize-export__btn" id="exportVue">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> Vue
        </button>
        <button class="customize-export__btn" id="exportSvelte">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> Svelte
        </button>
        <button class="customize-export__btn" id="exportHtml">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> HTML
        </button>
      </div>
    </div>

    <!-- Reset -->
    <div class="panel__section">
      <button class="customize-export__btn customize-export__btn--reset" id="resetBtn">
        <span class="material-symbols-outlined" style="font-size:16px">restart_alt</span> Reset to Defaults
      </button>
    </div>
  `;

  // Replace placeholder or existing body
  const existing = els.panel.querySelector('.panel__body') || els.panel.querySelector('.panel__placeholder');
  if (existing) {
    existing.replaceWith(panelBody);
  } else {
    els.panel.appendChild(panelBody);
  }

  // Attach customize event listeners
  attachCustomizeListeners(icon);
}

// ============================================================
// Batch Multi-Select Panel
// ============================================================
function getSelectedIcons() {
  const result = [];
  for (const key of state.selectedIcons) {
    const found = state.icons.find(i => iconKey(i) === key);
    if (found) result.push(found);
  }
  return result;
}

function resetPanelToPlaceholder() {
  els.panelPreview.innerHTML = `<span class="material-symbols-outlined panel__preview-icon" style="font-size:64px; color: var(--si-text-dim);">widgets</span>`;
  const panelBody = els.panel.querySelector('.panel__body');
  if (panelBody) {
    panelBody.className = 'panel__placeholder';
    panelBody.innerHTML = `
      <span class="material-symbols-outlined panel__placeholder-icon">touch_app</span>
      <p class="panel__placeholder-text">Select an icon from the grid to customize it</p>
    `;
  }
}

function renderBatchPanel() {
  const selected = getSelectedIcons();
  const c = state.customize;

  if (selected.length === 0) {
    els.panelPreview.innerHTML = `<span class="material-symbols-outlined panel__preview-icon" style="font-size:64px; color: var(--si-text-dim);">select_all</span>`;
    const body = els.panel.querySelector('.panel__body') || els.panel.querySelector('.panel__placeholder');
    if (body) {
      const placeholder = document.createElement('div');
      placeholder.className = 'panel__placeholder';
      placeholder.innerHTML = `
        <span class="material-symbols-outlined" style="font-size:48px;color:var(--si-text-dim)">touch_app</span>
        <p style="color:var(--si-text-dim);font-size:0.8rem;margin-top:0.5rem">Click icons to select them</p>
      `;
      body.replaceWith(placeholder);
    }
    return;
  }

  // Preview: thumbnail grid
  // Strip hardcoded width/height from SVGs via DOM for reliable cross-library support
  const normSvg = (raw) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = raw;
    const svg = tmp.querySelector('svg');
    if (svg) {
      svg.removeAttribute('width');
      svg.removeAttribute('height');
      if (!svg.getAttribute('viewBox')) {
        svg.setAttribute('viewBox', '0 0 24 24');
      }
    }
    return tmp.innerHTML;
  };
  const thumbs = selected.map(icon => {
    if (icon.type === 'font') {
      return `<div class="batch-preview-item" title="${icon.name}"><span class="material-symbols-outlined" style="font-size:24px;color:${c.color}">${icon.id}</span></div>`;
    }
    const isFilled = libraryMeta[icon.lib]?.hasStroke === false;
    const cls = isFilled ? ' panel__preview-icon--filled' : '';
    const previewScale = (libraryMeta[icon.lib]?.strokeScale || 1);
    return `<div class="batch-preview-item${cls}" title="${icon.name}" style="color:${c.color};--si-stroke-width:${c.strokeWidth * previewScale}">${normSvg(icon.svg)}</div>`;
  }).join('');
  els.panelPreview.innerHTML = `<div class="batch-preview-grid">${thumbs}</div>`;

  const panelBody = els.panel.querySelector('.panel__body') || els.panel.querySelector('.panel__placeholder') || document.createElement('div');
  panelBody.className = 'panel__body';

  const hasMaterial = selected.some(isMaterialFontIcon);

  panelBody.innerHTML = `
    <div class="panel__section">
      <div style="text-align:center; padding-bottom: var(--si-space-2);">
        <p style="font-size: 1rem; color: var(--si-text); margin-bottom: 0.15rem; font-weight: 500;">${selected.length}/10 icons selected</p>
        <p style="font-size: 0.75rem; color: var(--si-text-dim);">All export actions apply to all selected icons.${hasMaterial ? ' Material exports use the nearest supported snapshot when an exact slider value is unavailable.' : ''}</p>
      </div>
    </div>

    <div class="panel__section">
      <div class="panel__section-title">Color</div>
      <div class="customize-color">
          <input type="color" id="colorPicker" value="${c.color}" class="customize-color__input">
          <input type="text" id="colorHex" value="${c.color}" class="customize-color__hex" maxlength="7" spellcheck="false">
      </div>
      <div class="palette-selector">
        ${Object.entries(COLOR_PALETTES).map(([key, p]) => `
          <button class="palette-tab ${state.activePalette === key ? 'active' : ''}" data-palette="${key}">${p.label}</button>
        `).join('')}
      </div>
      ${state.recentColors.length > 0 ? `
        <div class="recent-colors-label">Recent</div>
        <div class="customize-swatches recent-colors-row">
          ${state.recentColors.map(rc => `<button class="customize-swatch" data-color="${rc}" style="background:${rc};" aria-label="Color ${rc}"></button>`).join('')}
        </div>
      ` : ''}
      <div class="customize-swatches" id="colorSwatches">
        ${renderSwatches()}
      </div>
    </div>

    <div class="panel__section">
      <div class="panel__section-title">Export (Batch)</div>
      <div class="customize-export">
        <button class="customize-export__btn" id="exportCopySvg">
          <span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy SVGs
        </button>
        <button class="customize-export__btn" id="exportDownloadSvg">
          <span class="material-symbols-outlined" style="font-size:16px">folder_zip</span> Download SVGs (ZIP)
        </button>
      </div>
      <div class="panel__section-divider"></div>
      <div class="panel__section-subtitle">PNG Size</div>
      <div class="png-size-picker">
        ${[16, 24, 32, 48, 64, 128, 256].map(s => `
          <button class="png-size-btn ${state.customize.pngSize === s ? 'active' : ''}" data-size="${s}">${s}</button>
        `).join('')}
        <input class="png-size-custom" id="pngSizeCustom" type="number" min="8" max="1024" placeholder="px" title="Custom size (8-1024)">
      </div>
      <div class="customize-export">
        <button class="customize-export__btn" id="exportDownloadPng">
          <span class="material-symbols-outlined" style="font-size:16px">folder_zip</span>
          Download PNGs (ZIP) <span class="png-size-badge" id="pngSizeBadge">${state.customize.pngSize}px</span>
        </button>
        <button class="customize-export__btn" id="exportDownloadIco">
          <span class="material-symbols-outlined" style="font-size:16px">folder_zip</span> Download ICOs (ZIP)
        </button>
      </div>
    </div>

    <div class="panel__section">
      <div class="panel__section-title">Copy as Component (Batch)</div>
      <div class="customize-export">
        <button class="customize-export__btn" id="exportReact">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> React
        </button>
        <button class="customize-export__btn" id="exportVue">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> Vue
        </button>
        <button class="customize-export__btn" id="exportSvelte">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> Svelte
        </button>
        <button class="customize-export__btn" id="exportHtml">
          <span class="material-symbols-outlined" style="font-size:16px">code</span> HTML
        </button>
      </div>
    </div>
  `;

  const existing = els.panel.querySelector('.panel__body') || els.panel.querySelector('.panel__placeholder');
  if (existing && existing !== panelBody) {
    existing.replaceWith(panelBody);
  } else if (!existing) {
    els.panel.appendChild(panelBody);
  }

  attachBatchListeners();
}

function attachBatchListeners() {
  const colorPicker = $('#colorPicker');
  const colorHex = $('#colorHex');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      state.customize.color = e.target.value;
      colorHex.value = e.target.value;
      renderBatchPanel();
    });
    colorPicker.addEventListener('change', (e) => pushRecentColor(e.target.value));
  }
  if (colorHex) {
    colorHex.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.customize.color = val;
        colorPicker.value = val;
        pushRecentColor(val);
        renderBatchPanel();
      }
    });
  }

  $$('.customize-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      state.customize.color = swatch.dataset.color;
      if (colorPicker) colorPicker.value = swatch.dataset.color;
      if (colorHex) colorHex.value = swatch.dataset.color;
      pushRecentColor(swatch.dataset.color);
      renderBatchPanel();
    });
  });

  $$('.palette-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.activePalette = tab.dataset.palette;
      $$('.palette-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const swatchContainer = $('#colorSwatches');
      if (swatchContainer) swatchContainer.innerHTML = renderSwatches();
      $$('#colorSwatches .customize-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          state.customize.color = swatch.dataset.color;
          if (colorPicker) colorPicker.value = swatch.dataset.color;
          if (colorHex) colorHex.value = swatch.dataset.color;
          pushRecentColor(swatch.dataset.color);
          renderBatchPanel();
        });
      });
    });
  });

  $$('.png-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.customize.pngSize = parseInt(btn.dataset.size);
      $$('.png-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const customInput = $('#pngSizeCustom');
      if (customInput) customInput.value = '';
      const badge = $('#pngSizeBadge');
      if (badge) badge.textContent = `${state.customize.pngSize}px`;
    });
  });

  const pngSizeCustom = $('#pngSizeCustom');
  if (pngSizeCustom) {
    pngSizeCustom.addEventListener('change', (e) => {
      const val = parseInt(e.target.value);
      if (val >= 8 && val <= 1024) {
        state.customize.pngSize = val;
        $$('.png-size-btn').forEach(b => b.classList.remove('active'));
        const badge = $('#pngSizeBadge');
        if (badge) badge.textContent = `${val}px`;
      } else {
        showToast('Size must be between 8 and 1024px');
        e.target.value = '';
      }
    });
  }

  // Batch: Copy SVGs
  const exportCopySvg = $('#exportCopySvg');
  if (exportCopySvg) {
    exportCopySvg.addEventListener('click', async () => {
      const icons = getSelectedIcons();
      if (icons.length === 0) { showToast('No icons selected'); return; }
      showToast(`Preparing ${icons.length} SVG${icons.length === 1 ? '' : 's'}...`);
      const results = await Promise.all(icons.map(icon => resolveExportSvg(icon)));
      const svgs = results.filter(Boolean).map(result => result.svg);
      if (svgs.length === 0) { showToast('No exportable icons selected'); return; }
      navigator.clipboard.writeText(svgs.join('\n\n')).then(() => {
        showToast(`${svgs.length} SVGs copied to clipboard`);
      });
    });
  }

  // Batch: Download SVGs as ZIP
  const exportDownloadSvg = $('#exportDownloadSvg');
  if (exportDownloadSvg) {
    exportDownloadSvg.addEventListener('click', async () => {
      const icons = getSelectedIcons();
      if (icons.length === 0) { showToast('No icons selected'); return; }
      if (typeof JSZip === 'undefined') { showToast('ZIP not available. Reload page.'); return; }
      showToast(`Preparing ${icons.length} SVG${icons.length === 1 ? '' : 's'}...`);
      const results = await Promise.all(icons.map(icon => resolveExportSvg(icon).then(result => ({ icon, result }))));
      const resolved = results.filter(entry => entry.result);
      if (resolved.length === 0) { showToast('No exportable icons selected'); return; }
      const zip = new JSZip();
      resolved.forEach(({ icon, result }) => {
        zip.file(`${icon.lib}--${icon.id}.svg`, result.svg);
      });
      zip.generateAsync({ type: 'blob' }).then(blob => {
        downloadBlob(blob, `supericons-batch-${resolved.length}.zip`);
        showToast(`${resolved.length} SVGs downloaded as ZIP`);
      });
    });
  }

  // Batch: Download PNGs as ZIP
  const exportDownloadPng = $('#exportDownloadPng');
  if (exportDownloadPng) {
    exportDownloadPng.addEventListener('click', async () => {
      const icons = getSelectedIcons();
      if (icons.length === 0) { showToast('No icons selected'); return; }
      if (typeof JSZip === 'undefined') { showToast('ZIP not available. Reload page.'); return; }
      const size = state.customize.pngSize || 48;
      showToast(`Rendering ${icons.length} PNGs at ${size}px...`);
      const renderPng = async (icon) => {
        const resolved = await resolveExportSvg(icon);
        if (!resolved?.svg) return null;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        const blob = new Blob([resolved.svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        return new Promise((resolve) => {
          img.onload = () => {
            ctx.drawImage(img, 0, 0, size, size);
            canvas.toBlob(pngBlob => {
              URL.revokeObjectURL(url);
              resolve(pngBlob ? { name: `${icon.lib}--${icon.id}-${size}px.png`, blob: pngBlob } : null);
            });
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
          img.src = url;
        });
      };
      Promise.all(icons.map(renderPng)).then(results => {
        const files = results.filter(Boolean);
        if (files.length === 0) { showToast('No exportable icons selected'); return; }
        const zip = new JSZip();
        files.forEach(r => zip.file(r.name, r.blob));
        zip.generateAsync({ type: 'blob' }).then(blob => {
          downloadBlob(blob, `supericons-batch-${files.length}-png-${size}px.zip`);
          showToast(`${files.length} PNGs downloaded as ZIP`);
        });
      });
    });
  }

  // Batch: Download ICOs as ZIP
  const exportDownloadIco = $('#exportDownloadIco');
  if (exportDownloadIco) {
    exportDownloadIco.addEventListener('click', async () => {
      const icons = getSelectedIcons();
      if (icons.length === 0) { showToast('No icons selected'); return; }
      if (typeof JSZip === 'undefined') { showToast('ZIP not available. Reload page.'); return; }
      showToast(`Rendering ${icons.length} ICOs...`);
      const sizes = [16, 32, 48];
      const renderIco = async (icon) => {
        const resolved = await resolveExportSvg(icon);
        if (!resolved?.svg) return null;
        const renderAt = (sz) => new Promise((resolve, reject) => {
          const canvas = document.createElement('canvas');
          canvas.width = sz; canvas.height = sz;
          const ctx = canvas.getContext('2d');
          const img = new Image();
          const b = new Blob([resolved.svg], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(b);
          img.onload = () => {
            ctx.drawImage(img, 0, 0, sz, sz);
            canvas.toBlob(pngBlob => {
              URL.revokeObjectURL(url);
              pngBlob.arrayBuffer().then(resolve).catch(reject);
            }, 'image/png');
          };
          img.onerror = () => { URL.revokeObjectURL(url); reject(); };
          img.src = url;
        });
        return Promise.all(sizes.map(renderAt)).then(pngBuffers => {
          const count = sizes.length;
          const headerSize = 6 + count * 16;
          const totalSize = headerSize + pngBuffers.reduce((s, b) => s + b.byteLength, 0);
          const buf = new ArrayBuffer(totalSize);
          const view = new DataView(buf);
          view.setUint16(0, 0, true); view.setUint16(2, 1, true); view.setUint16(4, count, true);
          let dataOffset = headerSize;
          pngBuffers.forEach((pngBuf, i) => {
            const off = 6 + i * 16;
            const sz = sizes[i];
            view.setUint8(off, sz); view.setUint8(off + 1, sz);
            view.setUint8(off + 2, 0); view.setUint8(off + 3, 0);
            view.setUint16(off + 4, 1, true); view.setUint16(off + 6, 32, true);
            view.setUint32(off + 8, pngBuf.byteLength, true);
            view.setUint32(off + 12, dataOffset, true);
            new Uint8Array(buf, dataOffset, pngBuf.byteLength).set(new Uint8Array(pngBuf));
            dataOffset += pngBuf.byteLength;
          });
          return { name: `${icon.lib}--${icon.id}.ico`, blob: new Blob([buf], { type: 'image/x-icon' }) };
        }).catch(() => null);
      };
      Promise.all(icons.map(renderIco)).then(results => {
        const files = results.filter(Boolean);
        if (files.length === 0) { showToast('No exportable icons selected'); return; }
        const zip = new JSZip();
        files.forEach(r => zip.file(r.name, r.blob));
        zip.generateAsync({ type: 'blob' }).then(blob => {
          downloadBlob(blob, `supericons-batch-${files.length}-ico.zip`);
          showToast(`${files.length} ICOs downloaded as ZIP`);
        });
      });
    });
  }

  // Batch: Component copy
  const componentHandlers = {
    exportReact: 'react',
    exportVue: 'vue',
    exportSvelte: 'svelte',
    exportHtml: 'html',
  };
  for (const [id, framework] of Object.entries(componentHandlers)) {
    const btn = $(`#${id}`);
    if (btn) {
      btn.addEventListener('click', async () => {
        const icons = getSelectedIcons();
        const codes = (await Promise.all(icons.map(i => generateComponentCode(i, framework)))).filter(Boolean);
        if (codes.length === 0) {
          showToast('No exportable icons selected');
          return;
        }
        await navigator.clipboard.writeText(codes.join('\n\n'));
        const skipped = icons.length - codes.length;
        showToast(skipped > 0 ? `${codes.length} ${framework} components copied (${skipped} skipped)` : `${codes.length} ${framework} components copied`);
      });
    }
  }
}

function renderSwatches() {
  const colors = COLOR_PALETTES[state.activePalette]?.colors || COLOR_PALETTES.default.colors;
  return colors
    .map((c) => `<button class="customize-swatch" data-color="${c}" style="background:${c};" aria-label="Color ${c}"></button>`)
    .join('');
}

function attachCustomizeListeners(icon) {
  const panelFavoriteBtn = $('#panelFavoriteBtn');
  if (panelFavoriteBtn) {
    panelFavoriteBtn.addEventListener('click', () => {
      const isFav = toggleFavorite(iconKey(icon));
      updatePanelFavoriteButton(panelFavoriteBtn, icon, isFav);

      if (isFav) {
        flushPendingSearchAttempt();
        void logFavoriteEvent({
          icon,
          searchQuery: getCurrentSearchQuery(),
          resultPosition: getResultPositionForIcon(icon),
          jobCategory: getTelemetryJobCategory(icon),
          uiSurface: 'panel',
        });
      }

      if (!isFav && state.activeLibrary === 'favorites') {
        state.selectedIcon = null;
        applyFilters();
        resetPanelToPlaceholder();
        return;
      }

      if (state.activeLibrary === 'favorites') {
        applyFilters();
      }
    });
  }

  // Color picker
  const colorPicker = $('#colorPicker');
  const colorHex = $('#colorHex');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      state.customize.color = e.target.value;
      colorHex.value = e.target.value;
      updatePreview(icon);
    });
    colorPicker.addEventListener('change', (e) => {
      pushRecentColor(e.target.value);
    });
  }
  if (colorHex) {
    colorHex.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.customize.color = val;
        colorPicker.value = val;
        updatePreview(icon);
        pushRecentColor(val);
      }
    });
  }

  // Secondary color picker (for gradient end)
  const colorPicker2 = $('#colorPicker2');
  const colorHex2 = $('#colorHex2');
  if (colorPicker2) {
    colorPicker2.addEventListener('input', (e) => {
      state.customize.color2 = e.target.value;
      if (colorHex2) colorHex2.value = e.target.value;
      updatePreview(icon);
    });
    colorPicker2.addEventListener('change', (e) => {
      pushRecentColor(e.target.value);
    });
  }
  if (colorHex2) {
    colorHex2.addEventListener('input', (e) => {
      const val = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(val)) {
        state.customize.color2 = val;
        if (colorPicker2) colorPicker2.value = val;
        updatePreview(icon);
        pushRecentColor(val);
      }
    });
  }

  // Color swatches (both palette swatches and recent color swatches)
  $$('.customize-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      state.customize.color = swatch.dataset.color;
      colorPicker.value = swatch.dataset.color;
      colorHex.value = swatch.dataset.color;
      pushRecentColor(swatch.dataset.color);
      updatePreview(icon);
    });
  });

  // Palette tab switching
  $$('.palette-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.activePalette = tab.dataset.palette;
      $$('.palette-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const swatchContainer = $('#colorSwatches');
      if (swatchContainer) swatchContainer.innerHTML = renderSwatches();
      // Re-wire the new swatch click handlers
      $$('#colorSwatches .customize-swatch').forEach((swatch) => {
        swatch.addEventListener('click', () => {
          state.customize.color = swatch.dataset.color;
          colorPicker.value = swatch.dataset.color;
          colorHex.value = swatch.dataset.color;
          pushRecentColor(swatch.dataset.color);
          updatePreview(icon);
        });
      });
    });
  });

  // Also-in cross-library pills (S6a)
  $$('.also-in-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      selectIcon(pill.dataset.alsoId, pill.dataset.alsoLib);
    });
  });

  // Stroke slider
  const strokeSlider = $('#strokeSlider');
  if (strokeSlider) {
    strokeSlider.addEventListener('input', (e) => {
      state.customize.strokeWidth = parseFloat(e.target.value);
      $('#strokeValue').textContent = `${e.target.value}px`;
      updatePreview(icon);
    });
  }

  // Material Symbols axes
  const axisWeight = $('#axisWeight');
  const axisFill = $('#axisFill');
  const axisGrade = $('#axisGrade');
  const axisOpsz = $('#axisOpsz');

  if (axisWeight) {
    axisWeight.addEventListener('input', (e) => {
      state.customize.materialWeight = parseInt(e.target.value);
      $('#weightValue').textContent = e.target.value;
      updatePreview(icon);
    });
  }
  if (axisFill) {
    axisFill.addEventListener('input', (e) => {
      state.customize.materialFill = parseInt(e.target.value);
      $('#fillValue').textContent = e.target.value;
      updatePreview(icon);
    });
  }
  if (axisGrade) {
    axisGrade.addEventListener('input', (e) => {
      state.customize.materialGrade = parseInt(e.target.value);
      $('#gradeValue').textContent = e.target.value;
      updatePreview(icon);
    });
  }
  if (axisOpsz) {
    axisOpsz.addEventListener('input', (e) => {
      state.customize.materialOpticalSize = parseInt(e.target.value);
      $('#opszValue').textContent = e.target.value;
      updatePreview(icon);
    });
  }

  // Container shape buttons
  $$('.customize-container-btn[data-shape]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.customize.container = btn.dataset.shape;
      $$('.customize-container-btn[data-shape]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePreview(icon);
    });
  });

  // Animation buttons
  $$('.customize-container-btn[data-animation]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.customize.animation = btn.dataset.animation;
      $$('.customize-container-btn[data-animation]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePreview(icon);
    });
  });

  // Open in Motion Lab (one-click animate)
  const openMlBtn = $('#openMotionLab');
  if (openMlBtn && (icon.type === 'svg' || isMaterialFontIcon(icon))) {
    openMlBtn.addEventListener('click', async () => {
      const resolved = await resolveExportSvg(icon);
      if (!resolved?.svg) {
        showToast('Unable to resolve this icon for Motion Lab');
        return;
      }
      switchView('motion-lab');
      requestAnimationFrame(() => {
        loadSvgIntoMotionLab(resolved.svg);
        showToast(`Loaded "${icon.name}" in Motion Lab`);
      });
    });
  }

  // Badge toggle
  const badgeToggle = $('#badgeToggle');
  if (badgeToggle) {
    badgeToggle.addEventListener('change', (e) => {
      state.customize.badge = e.target.checked;
      updatePreview(icon);
    });
  }

  // Light bg toggle
  const lightBgToggle = $('#lightBgToggle');
  if (lightBgToggle) {
    lightBgToggle.addEventListener('change', (e) => {
      state.customize.lightBg = e.target.checked;
      updatePreview(icon);
    });
  }

  // Export: Copy SVG
  const exportCopySvg = $('#exportCopySvg');
  if (exportCopySvg) {
    exportCopySvg.addEventListener('click', async () => {
      const resolved = await resolveExportSvg(icon);
      if (resolved?.svg) {
        navigator.clipboard.writeText(resolved.svg).then(() => {
          flushPendingSearchAttempt();
          showToast(resolved.snapped ? 'SVG copied using nearest Material snapshot' : 'SVG copied to clipboard');
          window.umami?.track('icon-copy', { lib: icon.lib, id: icon.id, format: 'svg' });
          void logCopyEvent({
            icon,
            searchQuery: getCurrentSearchQuery(),
            resultPosition: getResultPositionForIcon(icon),
            timeToCopyMs: getTimeToCopyMs(),
            jobCategory: getTelemetryJobCategory(icon),
            uiSurface: 'panel',
            evidenceText: 'copy:svg',
          });
        });
      } else {
        showToast('This icon could not be resolved for SVG export');
      }
    });
  }

  // Export: Copy Base64
  const exportCopyBase64 = $('#exportCopyBase64');
  if (exportCopyBase64) {
    exportCopyBase64.addEventListener('click', async () => {
      const resolved = await resolveExportSvg(icon);
      if (resolved?.svg) {
        const b64 = svgToBase64(resolved.svg);
        navigator.clipboard.writeText(b64).then(() => showToast(resolved.snapped ? 'Base64 copied using nearest Material snapshot' : 'Base64 data URI copied'));
      } else {
        showToast('This icon could not be resolved for Base64 export');
      }
    });
  }

  // Export: Download SVG
  const exportDownloadSvg = $('#exportDownloadSvg');
  if (exportDownloadSvg) {
    exportDownloadSvg.addEventListener('click', async () => {
      const resolved = await resolveExportSvg(icon);
      if (resolved?.svg) {
        downloadBlob(new Blob([resolved.svg], { type: 'image/svg+xml' }), `${icon.id}.svg`);
        flushPendingSearchAttempt();
        showToast(resolved.snapped ? 'SVG downloaded using nearest Material snapshot' : 'SVG downloaded');
        window.umami?.track('icon-download', { lib: icon.lib, id: icon.id, format: 'svg' });
        void logCopyEvent({
          icon,
          searchQuery: getCurrentSearchQuery(),
          resultPosition: getResultPositionForIcon(icon),
          timeToCopyMs: getTimeToCopyMs(),
          jobCategory: getTelemetryJobCategory(icon),
          uiSurface: 'panel',
          evidenceText: 'download:svg',
        });
      } else {
        showToast('This icon could not be resolved for SVG export');
      }
    });
  }

  // PNG size preset buttons
  $$('.png-size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.customize.pngSize = parseInt(btn.dataset.size);
      $$('.png-size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const customInput = $('#pngSizeCustom');
      if (customInput) customInput.value = '';
      const badge = $('#pngSizeBadge');
      if (badge) badge.textContent = `${state.customize.pngSize}px`;
    });
  });

  // PNG size custom input
  const pngSizeCustom = $('#pngSizeCustom');
  if (pngSizeCustom) {
    pngSizeCustom.addEventListener('change', (e) => {
      const val = parseInt(e.target.value);
      if (val >= 8 && val <= 1024) {
        state.customize.pngSize = val;
        $$('.png-size-btn').forEach(b => b.classList.remove('active'));
        const badge = $('#pngSizeBadge');
        if (badge) badge.textContent = `${val}px`;
      } else {
        showToast('Size must be between 8 and 1024px');
        e.target.value = '';
      }
    });
  }

  // Export: Download PNG (uses state.customize.pngSize)
  const exportDownloadPng = $('#exportDownloadPng');
  if (exportDownloadPng) {
    exportDownloadPng.addEventListener('click', async () => {
      await exportAsPng(icon);
    });
  }

  // Export: Download ICO
  const exportDownloadIco = $('#exportDownloadIco');
  if (exportDownloadIco) {
    exportDownloadIco.addEventListener('click', async () => {
      await exportAsIco(icon);
    });
  }

  // Component export buttons
  const componentHandlers = {
    exportReact: () => copyComponent(icon, 'react'),
    exportVue: () => copyComponent(icon, 'vue'),
    exportSvelte: () => copyComponent(icon, 'svelte'),
    exportHtml: () => copyComponent(icon, 'html'),
  };
  for (const [id, handler] of Object.entries(componentHandlers)) {
    const btn = $(`#${id}`);
    if (btn) btn.addEventListener('click', handler);
  }

  // Reset button
  const resetBtn = $('#resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => resetCustomization());
  }
}

function updatePreview(icon) {
  const c = state.customize;

  // Container classes
  const containerCls = c.container !== 'none' ? `preview-container preview-container--${c.container}` : '';
  const bgClass = c.lightBg ? 'preview-bg--light' : '';
  const animClass = c.animation !== 'none' ? `anim-${c.animation}` : '';
  const badgeHtml = c.badge ? '<span class="preview-badge"></span>' : '';

  let iconHtml;
  if (icon.type === 'font') {
    const fontVars = `font-variation-settings:'FILL' ${c.materialFill},'wght' ${c.materialWeight},'GRAD' ${c.materialGrade},'opsz' ${c.materialOpticalSize};`;
    iconHtml = `<span class="material-symbols-outlined panel__preview-icon ${animClass}" style="font-size:64px;${fontVars}color:${c.color};">${icon.id}</span>`;
  } else {
    const isFilled = libraryMeta[icon.lib]?.hasStroke === false;
    const filledClass = isFilled ? ' panel__preview-icon--filled' : '';
    const liveScale = (libraryMeta[icon.lib]?.strokeScale || 1);
    const previewSize = libraryMeta[icon.lib]?.previewSize || 64;
    // For premium icons with gradient SVGs, replace stop-colors for live preview
    let previewSvg = icon.svg;
    if (previewSvg && previewSvg.includes('stop-color')) {
      const stops = [...previewSvg.matchAll(/stop-color="([^"]+)"/g)];
      if (stops.length >= 2) {
        previewSvg = previewSvg.replace(stops[0][0], `stop-color="${c.color}"`);
        previewSvg = previewSvg.replace(stops[1][0], `stop-color="${c.color2}"`);
      }
      // Also replace any direct stroke/fill that uses the old gradient start color
      previewSvg = previewSvg.replace(/stroke="#00D4FF"/g, `stroke="${c.color}"`);
    }
    // Strip hardcoded width/height and ensure viewBox for proper scaling
    previewSvg = previewSvg.replace(/<svg([^>]*?)\s+width="[^"]*"/g, '<svg$1')
                            .replace(/<svg([^>]*?)\s+height="[^"]*"/g, '<svg$1');
    if (!previewSvg.includes('viewBox')) {
      previewSvg = previewSvg.replace('<svg', '<svg viewBox="0 0 24 24"');
    }
    iconHtml = `<div class="panel__preview-icon${filledClass} ${animClass}" style="color:${c.color};--si-stroke-width:${c.strokeWidth * liveScale};--si-preview-size:${previewSize}px;">${previewSvg}</div>`;
  }

  els.panelPreview.className = `panel__preview ${bgClass}`;
  els.panelPreview.innerHTML = containerCls
    ? `<div class="${containerCls}">${iconHtml}${badgeHtml}</div>`
    : `${iconHtml}${badgeHtml}`;
}

// ============================================================
// Export Helpers
// ============================================================
// Animation CSS map: keyframes + class for each free animation type
const ANIM_CSS = {
  spin: {
    keyframes: '@keyframes si-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
    rule: '.si-anim { animation: si-spin 1.5s linear infinite; }'
  },
  pulse: {
    keyframes: '@keyframes si-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }',
    rule: '.si-anim { animation: si-pulse 1.5s ease-in-out infinite; }'
  },
  bounce: {
    keyframes: '@keyframes si-bounce { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(-8px); } 75% { transform: translateY(4px); } }',
    rule: '.si-anim { animation: si-bounce 0.8s ease infinite; }'
  },
  shake: {
    keyframes: '@keyframes si-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }',
    rule: '.si-anim { animation: si-shake 0.4s ease infinite; }'
  },
};

function getStyledSvg(icon) {
  if (!icon.svg) return null;
  return applyExportCustomization(icon.svg, icon, state.customize, { normalizeRoot: true });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function exportAsPng(icon) {
  const resolved = await resolveExportSvg(icon);
  if (!resolved?.svg) {
    showToast('PNG export not available for this icon');
    return;
  }

  const svg = resolved.svg;
  const size = state.customize.pngSize || 48;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const img = new Image();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) {
        showToast('PNG export failed - try a different icon');
        return;
      }
      downloadBlob(pngBlob, `${icon.id}-${size}px.png`);
      showToast(
        resolved.snapped
          ? `PNG downloaded (${size}x${size}px, snapped to nearest Material snapshot)`
          : `PNG downloaded (${size}x${size}px)`
      );
    });
    URL.revokeObjectURL(url);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    showToast('PNG export failed - try a different icon');
  };
  img.src = url;
}

// ============================================================
// F2: Base64 helper
// ============================================================
function svgToBase64(svgStr) {
  // Use encodeURIComponent + unescape to handle UTF-8 chars safely before btoa
  const encoded = btoa(unescape(encodeURIComponent(svgStr)));
  return `data:image/svg+xml;base64,${encoded}`;
}

// ============================================================
// F3: ICO export - embeds 16, 32, 48px PNGs into a valid .ico binary
// ============================================================
async function exportAsIco(icon) {
  const resolved = await resolveExportSvg(icon);
  if (!resolved?.svg) {
    showToast('ICO export not available for this icon');
    return;
  }

  const svg = resolved.svg;

  const sizes = [16, 32, 48];

  // Render SVG to PNG blob at each size
  const renderAt = (sz) => new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = sz;
    canvas.height = sz;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, sz, sz);
      canvas.toBlob((pngBlob) => {
        URL.revokeObjectURL(url);
        if (!pngBlob) {
          reject(new Error('PNG render failed'));
          return;
        }
        pngBlob.arrayBuffer().then(resolve).catch(reject);
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });

  Promise.all(sizes.map(renderAt)).then((pngBuffers) => {
    // ICO format: ICONDIR (6 bytes) + N x ICONDIRENTRY (16 bytes each) + PNG data
    const count = sizes.length;
    const headerSize = 6 + count * 16;
    const totalSize = headerSize + pngBuffers.reduce((s, b) => s + b.byteLength, 0);
    const buf = new ArrayBuffer(totalSize);
    const view = new DataView(buf);

    // ICONDIR header: reserved=0, type=1 (icon), count
    view.setUint16(0, 0, true);
    view.setUint16(2, 1, true);
    view.setUint16(4, count, true);

    // Write ICONDIRENTRY for each size, then the PNG data
    let dataOffset = headerSize;
    pngBuffers.forEach((pngBuf, i) => {
      const entryOffset = 6 + i * 16;
      const sz = sizes[i];
      view.setUint8(entryOffset, sz === 256 ? 0 : sz);     // width (0 = 256)
      view.setUint8(entryOffset + 1, sz === 256 ? 0 : sz); // height
      view.setUint8(entryOffset + 2, 0);    // color count (0 = no palette)
      view.setUint8(entryOffset + 3, 0);    // reserved
      view.setUint16(entryOffset + 4, 1, true); // color planes
      view.setUint16(entryOffset + 6, 32, true); // bits per pixel
      view.setUint32(entryOffset + 8, pngBuf.byteLength, true); // size of PNG data
      view.setUint32(entryOffset + 12, dataOffset, true);       // offset to PNG data

      // Copy PNG bytes into ICO buffer
      new Uint8Array(buf, dataOffset, pngBuf.byteLength).set(new Uint8Array(pngBuf));
      dataOffset += pngBuf.byteLength;
    });

    downloadBlob(new Blob([buf], { type: 'image/x-icon' }), `${icon.id}.ico`);
    showToast(
      resolved.snapped
        ? 'ICO downloaded (16, 32, 48px, snapped to nearest Material snapshot)'
        : 'ICO downloaded (16, 32, 48px)'
    );
  }).catch(() => showToast('ICO export failed - try a different icon'));
}



function toPascalCase(str) {
  return str.replace(/(^|[-_ ])([a-z])/g, (_, __, c) => c.toUpperCase());
}

function stripRootSvgSize(svg) {
  return svg
    .replace(/<svg\b([^>]*?)\swidth="[^"]*"/i, '<svg$1')
    .replace(/<svg\b([^>]*?)\sheight="[^"]*"/i, '<svg$1');
}

function buildReactSvgComponentCode(name, svg) {
  const sizedSvg = stripRootSvgSize(svg).replace(
    '<svg',
    '<svg className={className} width={size} height={size} {...props}'
  );
  return `export function ${name}Icon({ className, size = 24, ...props }) {\n  return (\n    ${sizedSvg}\n  );\n}`;
}

function buildSvgFrameworkCode(name, svg, framework) {
  switch (framework) {
    case 'react':
      return buildReactSvgComponentCode(name, svg);
    case 'vue':
      return `<template>\n  ${svg}\n</template>`;
    case 'svelte':
    case 'html':
      return svg;
    default:
      return '';
  }
}

async function copyComponent(icon, framework) {
  // If multi-select is active, export all selected icons
  if (state.multiSelect && state.selectedIcons.size > 0) {
    const selectedIcons = [];
    for (const key of state.selectedIcons) {
      const found = state.icons.find((i) => iconKey(i) === key);
      if (found) selectedIcons.push(found);
    }
    const codes = (await Promise.all(selectedIcons.map((i) => generateComponentCode(i, framework))))
      .filter(Boolean);
    if (codes.length === 0) {
      showToast('No exportable icons selected');
      return;
    }
    const combined = codes.join('\n\n');
    await navigator.clipboard.writeText(combined);
    const skipped = selectedIcons.length - codes.length;
    showToast(skipped > 0 ? `${codes.length} ${framework} components copied (${skipped} skipped)` : `${codes.length} ${framework} components copied`);
    return;
  }

  // Single icon export
  const code = await generateComponentCode(icon, framework);
  if (!code) {
    showToast('This icon could not be resolved for code export');
    return;
  }
  await navigator.clipboard.writeText(code);
  flushPendingSearchAttempt();
  showToast(`${framework.charAt(0).toUpperCase() + framework.slice(1)} component copied`);
  window.umami?.track('icon-copy', { lib: icon.lib, id: icon.id, format: framework });
  void logCopyEvent({
    icon,
    searchQuery: getCurrentSearchQuery(),
    resultPosition: getResultPositionForIcon(icon),
    timeToCopyMs: getTimeToCopyMs(),
    jobCategory: getTelemetryJobCategory(icon),
    uiSurface: 'component-export',
    evidenceText: `copy:${framework}`,
  });
}

async function generateComponentCode(icon, framework) {
  const name = toPascalCase(icon.id);
  const c = state.customize;

  if (isMaterialFontIcon(icon)) {
    const resolved = await resolveExportSvg(icon, c);
    if (!resolved?.svg) return '';
    return buildSvgFrameworkCode(name, resolved.svg, framework);
  }

  if (icon.type === 'font') {
    const fontVariationSettings = `'FILL' ${c.materialFill}, 'wght' ${c.materialWeight}, 'GRAD' ${c.materialGrade}, 'opsz' ${c.materialOpticalSize}`;
    const style = `font-variation-settings: ${fontVariationSettings}; color: ${c.color};`;
    switch (framework) {
      case 'react':
        return `export function ${name}Icon({ className, ...props }) {\n  return (\n    <span\n      className={\`material-symbols-outlined \${className || ''}\`}\n      style={{ fontVariationSettings: ${JSON.stringify(fontVariationSettings)}, color: ${JSON.stringify(c.color)} }}\n      {...props}\n    >\n      ${icon.id}\n    </span>\n  );\n}`;
      case 'vue':
        return `<template>\n  <span class="material-symbols-outlined" :style="iconStyle">\n    ${icon.id}\n  </span>\n</template>\n<script setup>\nconst iconStyle = {\n  fontVariationSettings: ${JSON.stringify(fontVariationSettings)},\n  color: ${JSON.stringify(c.color)},\n};\n</script>`;
      case 'svelte':
        return `<span class="material-symbols-outlined" style="${style}">\n  ${icon.id}\n</span>`;
      case 'html':
        return `<span class="material-symbols-outlined" style="${style}">${icon.id}</span>`;
    }
  } else {
    const svg = getStyledSvg(icon);
    return buildSvgFrameworkCode(name, svg, framework);
  }
  return '';
}


// ============================================================
// Event Listeners
// ============================================================
syncLandingState();
if (typeof MOBILE_PANEL_MEDIA.addEventListener === 'function') {
  MOBILE_PANEL_MEDIA.addEventListener('change', syncShellForViewport);
} else if (typeof MOBILE_PANEL_MEDIA.addListener === 'function') {
  MOBILE_PANEL_MEDIA.addListener(syncShellForViewport);
}

els.sidebarToggle.addEventListener('click', toggleSidebar);
syncSidebarToggleButton();
els.panelToggle.addEventListener('click', togglePanel);
// Panel close button (use delegation on panel in case DOM is rebuilt)
els.panel.addEventListener('click', (e) => {
  const closeBtn = e.target.closest('#panelClose, .panel__close');
  if (!closeBtn) return;
  state.selectedIcon = null;
  setPanelOpen(false);
  $$('.icon-cell.selected').forEach((el) => el.classList.remove('selected'));
});

// Theme toggle (dark/light)
const themeToggleBtn = $('#themeToggle');
if (themeToggleBtn) {
  const syncThemeToggleButton = () => {
    const isLight = document.body.classList.contains('theme-light');
    const actionLabel = isLight ? 'Dark Mode' : 'Light Mode';
    const icon = themeToggleBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = isLight ? 'dark_mode' : 'light_mode';
    }
    themeToggleBtn.setAttribute('aria-label', actionLabel);
    themeToggleBtn.setAttribute('data-tip', actionLabel);
    themeToggleBtn.removeAttribute('title');
  };

  syncThemeToggleButton();

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('theme-light');
    const isLight = document.body.classList.contains('theme-light');
    syncThemeToggleButton();
    // Auto-switch default color to match theme
    if (state.customize.color === '#ffffff' && isLight) {
      state.customize.color = '#1c1917';
    } else if (state.customize.color === '#1c1917' && !isLight) {
      state.customize.color = '#ffffff';
    }
    // Re-render preview if an icon is selected
    if (state.selectedIcon) {
      renderPanelForIcon(state.selectedIcon);
    }
  });
}

// Multi-select toggle button
const multiSelectToggle = $('#multiSelectToggle');
if (multiSelectToggle) {
  multiSelectToggle.addEventListener('click', () => {
    state.multiSelect = !state.multiSelect;
    if (!state.multiSelect) {
      state.selectedIcons.clear();
      if (state.selectedIcon) {
        renderPanelForIcon(state.selectedIcon);
      } else {
        resetPanelToPlaceholder();
      }
    }
    multiSelectToggle.classList.toggle('header__btn--active', state.multiSelect);
    renderGrid();
    if (state.multiSelect) {
      updateMultiSelectCount();
      renderBatchPanel();
      showToast('Multi-select ON. Click icons to select (max 10).');
    } else {
      updateCounts();
      showToast('Multi-select OFF');
    }
  });
}

// Style toggle (outline/solid)
const styleOutline = $('#styleOutline');
const styleSolid = $('#styleSolid');
if (styleOutline) {
  styleOutline.addEventListener('click', () => {
    state.iconStyle = 'outline';
    state.customize.materialFill = 0;
    styleOutline.classList.add('active');
    if (styleSolid) styleSolid.classList.remove('active');
    applyFilters();
    if (state.selectedIcon) renderPanelForIcon(state.selectedIcon);
  });
}


if (styleSolid) {
  styleSolid.addEventListener('click', async () => {
    state.iconStyle = 'solid';
    state.customize.materialFill = 1;
    if (styleSolid) styleSolid.classList.add('active');
    if (styleOutline) styleOutline.classList.remove('active');
    if (!state.solidLoaded) {
      els.gridMeta.textContent = 'Loading solid variants...';
      await loadSolidIcons();
    }
    applyFilters();
    if (state.selectedIcon) renderPanelForIcon(state.selectedIcon);
  });
}

const gridClearCollectionBtn = els.gridClearCollectionBtn;
if (gridClearCollectionBtn) {
  gridClearCollectionBtn.addEventListener('click', async () => {
    const isFavoritesView = state.activeLibrary === 'favorites';
    const isRecentView = state.activeLibrary === 'recent';
    if ((!isFavoritesView && !isRecentView) || gridClearCollectionBtn.disabled) return;

    const confirmed = await showCollectionClearConfirmModal({
      title: isFavoritesView ? 'Clear all favorites from this device?' : 'Clear recent icons from this device?',
      description: isFavoritesView
        ? 'This removes every saved favorite stored in this browser. It does not affect your account or purchased packs.'
        : 'This removes your recent icon history stored in this browser. It does not affect favorites, purchases, or account access.',
      confirmLabel: isFavoritesView ? 'Clear favorites' : 'Clear recent',
    });

    if (!confirmed) return;

    if (isFavoritesView) {
      clearFavorites();
    } else {
      clearRecent();
    }

    state.selectedIcons.clear();
    state.selectedIcon = null;
    applyFilters();
    resetPanelToPlaceholder();
    showToast(isFavoritesView ? 'Favorites cleared on this device' : 'Recent icons cleared on this device');
  });
}

// ============================================================
// Compare Drawer (S6b)
// ============================================================
function addToCompare(icon) {
  // Already in compare?
  if (state.compareIcons.some(c => c.id === icon.id && c.lib === icon.lib)) {
    showToast(`${icon.name} already in compare`);
    return;
  }
  if (state.compareIcons.length >= 4) {
    showToast('Compare limited to 4 icons');
    return;
  }
  state.compareIcons.push(icon);
  renderCompareDrawer();
}

function removeFromCompare(index) {
  state.compareIcons.splice(index, 1);
  renderCompareDrawer();
}

function clearCompare() {
  state.compareIcons = [];
  renderCompareDrawer();
}

function renderCompareDrawer() {
  const drawer = $('#compareDrawer');
  if (!drawer) return;

  const count = state.compareIcons.length;
  const countEl = $('#compareCount');
  if (countEl) countEl.textContent = count;

  if (count === 0) {
    drawer.classList.remove('open');
    return;
  }

  drawer.classList.add('open');
  const grid = $('#compareGrid');
  if (!grid) return;

  const c = state.customize;
  grid.innerHTML = state.compareIcons.map((icon, idx) => {
    let preview = '';
    if (icon.type === 'font') {
      const fontVars = `font-variation-settings:'FILL' ${c.materialFill},'wght' ${c.materialWeight},'GRAD' ${c.materialGrade},'opsz' ${c.materialOpticalSize};`;
      preview = `<span class="material-symbols-outlined" style="font-size:48px;${fontVars}color:${c.color};">${icon.id}</span>`;
    } else {
      const libMeta = libraryMeta[icon.lib] || {};
      const scaledStroke = c.strokeWidth * (libMeta.strokeScale || 1);
      preview = `<div style="color:${c.color};--si-stroke-width:${scaledStroke};width:48px;height:48px;">${icon.svg}</div>`;
    }
    const libLabel = libraryMeta[icon.lib]?.name || icon.lib;
    return `
      <div class="compare-item">
        <div class="compare-item__preview">${preview}</div>
        <p class="compare-item__name">${icon.name}</p>
        <span class="compare-item__lib">${libLabel}</span>
        <div class="compare-item__actions">
          <button class="compare-item__use" data-use-idx="${idx}">Use this</button>
          <button class="compare-item__remove" data-remove-idx="${idx}">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  // Wire actions
  $$('.compare-item__use').forEach(btn => {
    btn.addEventListener('click', () => {
      const icon = state.compareIcons[parseInt(btn.dataset.useIdx)];
      if (icon) selectIcon(icon.id, icon.lib);
    });
  });
  $$('.compare-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCompare(parseInt(btn.dataset.removeIdx));
    });
  });
}

// Sidebar library click
els.sidebar.addEventListener('click', (e) => {
  const item = e.target.closest('.sidebar__item');
  if (item && item.dataset.library) {
    setActiveLibrary(item.dataset.library);
  }
});

if (els.useCaseFilters) {
  els.useCaseFilters.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-job-category]');
    if (!chip) return;
    setActiveJobCategoryFilter(chip.dataset.jobCategory);
  });
}

// Icon grid click (delegated)
els.iconGrid.addEventListener('click', (e) => {
  // Compare button
  const cmpBtn = e.target.closest('.icon-cell__compare');
  if (cmpBtn) {
    e.stopPropagation();
    const cmpIcon = state.icons.find(i => i.id === cmpBtn.dataset.cmpId && i.lib === cmpBtn.dataset.cmpLib);
    if (cmpIcon) addToCompare(cmpIcon);
    return;
  }

  const cell = e.target.closest('.icon-cell');
  if (cell) {
    selectIcon(cell.dataset.iconId, cell.dataset.iconLib);
  }
});

// Compare drawer controls
const compareClearAll = $('#compareClearAll');
if (compareClearAll) compareClearAll.addEventListener('click', clearCompare);
const compareDrawerClose = $('#compareDrawerClose');
if (compareDrawerClose) compareDrawerClose.addEventListener('click', () => {
  const drawer = $('#compareDrawer');
  if (drawer) drawer.classList.remove('open');
});

// Search
let searchDebounce = null;
els.searchInput.addEventListener('input', (e) => {
  if (isDocsHeaderSearchMode()) return;
  const hasValue = e.target.value.length > 0;
  els.searchShortcut.style.display = hasValue ? 'none' : '';
  els.searchClear.style.display = hasValue ? 'flex' : 'none';
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    syncSearchStateFromInput({ resetSearchContext: true });
    queueCurrentSearchAttempt();
    if (state.searchQuery.length > 1) {
      window.umami?.track('search', { query: state.searchQuery, results: state.filteredIcons.length });
    }
  }, 150);
});
els.searchInput.addEventListener('keydown', (e) => {
  if (isDocsHeaderSearchMode()) return;
  if (e.key === 'Enter') {
    clearTimeout(searchDebounce);
    searchDebounce = null;
    syncSearchStateFromInput();
    flushPendingSearchAttempt({ useCurrentState: true });
  }
});
els.searchInput.addEventListener('blur', () => {
  if (isDocsHeaderSearchMode()) return;
  clearTimeout(searchDebounce);
  searchDebounce = null;
  syncSearchStateFromInput();
  flushPendingSearchAttempt({ useCurrentState: true });
});
els.searchClear.addEventListener('click', () => {
  if (isDocsHeaderSearchMode()) return;
  clearPendingSearchAttempt();
  els.searchInput.value = '';
  els.searchInput.dispatchEvent(new Event('input'));
  els.searchInput.focus();
});

// Keyboard shortcuts
function showCollectionClearConfirmModal({
  title = 'Clear saved items from this device?',
  description = 'This only affects data stored in the current browser.',
  confirmLabel = 'Clear items',
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'claim-confirm-modal collection-clear-confirm-modal';
    const safeTitle = escapeHtml(title);
    const safeDescription = escapeHtml(description);
    const safeConfirmLabel = escapeHtml(confirmLabel);

    overlay.innerHTML = `
      <div class="claim-confirm-modal__backdrop"></div>
      <div class="claim-confirm-modal__card" role="dialog" aria-modal="true" aria-labelledby="collectionClearTitle">
        <button class="claim-confirm-modal__close" type="button" aria-label="Close">
          <span class="material-symbols-outlined">close</span>
        </button>
        <p class="claim-confirm-modal__eyebrow">This Device</p>
        <h3 class="claim-confirm-modal__title" id="collectionClearTitle">${safeTitle}</h3>
        <p class="claim-confirm-modal__desc">${safeDescription}</p>
        <p class="claim-confirm-modal__meta">Only this browser storage is affected.</p>
        <div class="claim-confirm-modal__actions">
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--ghost" type="button" data-action="cancel">Cancel</button>
          <button class="claim-confirm-modal__btn claim-confirm-modal__btn--danger" type="button" data-action="confirm">${safeConfirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const card = overlay.querySelector('.claim-confirm-modal__card');
    const closeBtn = overlay.querySelector('.claim-confirm-modal__close');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    const backdrop = overlay.querySelector('.claim-confirm-modal__backdrop');

    let settled = false;
    const close = (accepted) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(accepted);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
      if (event.key === 'Enter' && document.activeElement === confirmBtn) {
        event.preventDefault();
        close(true);
      }
    };

    backdrop?.addEventListener('click', () => close(false));
    closeBtn?.addEventListener('click', () => close(false));
    cancelBtn?.addEventListener('click', () => close(false));
    confirmBtn?.addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => {
      overlay.classList.add('open');
      confirmBtn?.focus();
      card?.scrollIntoView({ block: 'nearest' });
    });
  });
}

document.addEventListener('keydown', (e) => {
  if (document.querySelector('.claim-confirm-modal')) return;
  if (e.key === '/' && document.activeElement !== els.searchInput) {
    e.preventDefault();
    els.searchInput.focus();
  }
  if (e.key === 'Escape') {
    if (isDocsHeaderSearchMode()) return;
    if (document.activeElement === els.searchInput) {
      els.searchInput.value = '';
      els.searchInput.blur();
      state.searchQuery = '';
      applyFilters();
    }
    // Exit multi-select
    if (state.multiSelect) {
      state.multiSelect = false;
      state.selectedIcons.clear();
      renderGrid();
      updateCounts();
    }
  }
  // Toggle multi-select with Ctrl+M
  if (e.ctrlKey && e.key === 'm') {
    e.preventDefault();
    state.multiSelect = !state.multiSelect;
    if (!state.multiSelect) {
      state.selectedIcons.clear();
      if (state.selectedIcon) {
        renderPanelForIcon(state.selectedIcon);
      } else {
        resetPanelToPlaceholder();
      }
    }
    renderGrid();
    if (state.multiSelect) {
      updateMultiSelectCount();
      renderBatchPanel();
      showToast('Multi-select ON (Ctrl+M to toggle)');
    } else {
      updateCounts();
      showToast('Multi-select OFF');
    }
  }

});

// ============================================================
// Toast
// ============================================================
let toastTimeout = null;
function showToast(message, duration = 2000) {
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    els.toast.classList.remove('visible');
  }, duration);
}

// ============================================================
// Landing Hero Dismiss (S7)
// ============================================================
function dismissHero() {
  destroyLandingEffects();
  if (els.landingShell) {
    els.landingShell.classList.add('hidden');
  } else {
    if (els.landingHero) els.landingHero.classList.add('hidden');
    if (els.landingMcp) els.landingMcp.classList.add('hidden');
  }
  localStorage.setItem('si-hero-dismissed', '1');
  syncLandingState();
}

// Auto-hide hero if previously dismissed
if (localStorage.getItem('si-hero-dismissed')) {
  dismissHero();
} else {
  initLandingEffects();
}

// "Start searching" button
const heroSearchBtn = $('#heroSearchBtn');
if (heroSearchBtn) {
  heroSearchBtn.addEventListener('click', () => {
    dismissHero();
    els.searchInput.focus();
  });
}

// MCP config copy button
const mcpCopyBtn = $('#mcpCopyBtn');
if (mcpCopyBtn) {
  mcpCopyBtn.addEventListener('click', () => {
    const code = $('#mcpConfigBlock code');
    if (code) {
      navigator.clipboard.writeText(code.textContent).then(() => {
        mcpCopyBtn.classList.add('copied');
        mcpCopyBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">check</span> Copied!';
        setTimeout(() => {
          mcpCopyBtn.classList.remove('copied');
          mcpCopyBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">content_copy</span> Copy';
        }, 2000);
      });
    }
  });
}

// Auto-dismiss hero on first meaningful interaction
const autoDismissOnce = () => {
  dismissHero();
  els.searchInput.removeEventListener('input', autoDismissOnce);
};
els.searchInput.addEventListener('input', autoDismissOnce);

// ============================================================
// Init
// ============================================================
async function init() {
  hydrateSidebarIcons();
  loadCollections();
  await loadIcons();
  setupInfiniteScroll();
  updateSidebarCounts();
  fetchPopularity(); // non-blocking, re-sorts grid when data arrives
}

// Fetch popularity counts from the icon_scores aggregate table (fire-and-forget)
async function fetchPopularity() {
  try {
    state.popularityMap = await fetchPopularityMap();
    applyFilters(); // re-sort with popularity data
  } catch (e) {
    // Silent fail: popularity is a nice-to-have, not critical
  }
}

init();

window.__supericons = {
  state,
  showToast,
  renderPanelForIcon,
  togglePanel,
  setPanelOpen,
  setPanelSuppressed,
  setSidebarOpen,
  dismissLanding: dismissHero,
  isMobilePanelMode,
  libraryMeta,
  getStyledSvg,
  ANIM_CSS,
  setHeaderSearchMode,
  syncHeaderSearchChrome,
  syncSidebarToggleButton,
};

// MCP links
const landingMcpDocsLink = $('#landingMcpDocsLink');
if (landingMcpDocsLink) {
  landingMcpDocsLink.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.assign('/?view=docs');
  });
}

const footerPricingLink = $('#footerPricingLink');
if (footerPricingLink) {
  footerPricingLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('pricing');
  });
}

const footerDocsLink = $('#footerDocsLink');
if (footerDocsLink) {
  footerDocsLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('docs');
  });
}

const footerPrivacyLink = $('#footerPrivacyLink');
if (footerPrivacyLink) {
  footerPrivacyLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('privacy');
  });
}

const footerTermsLink = $('#footerTermsLink');
if (footerTermsLink) {
  footerTermsLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('terms');
  });
}

// MCP section close button
const mcpCloseBtn = $('#mcpCloseBtn');
if (mcpCloseBtn) {
  mcpCloseBtn.addEventListener('click', () => {
    const landingShell = $('#landingShell');
    const mcpSection = $('#landing-mcp');
    if (mcpSection) mcpSection.classList.add('hidden');
    if (landingShell && !landingShell.classList.contains('hidden')) {
      landingShell.scrollTo({ behavior: 'smooth', top: 0 });
      return;
    }
    const header = $('#header');
    if (header) header.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// Footer: Contact modal
const contactModal = $('#contactModal');
const contactClose = $('#contactClose');
const contactBackdrop = $('#contactBackdrop');

if (contactModal) {
  const openContactModal = () => {
    contactModal.classList.add('open');
  };
  const closeContactModal = () => {
    contactModal.classList.remove('open');
  };

  document.addEventListener('click', (e) => {
    const contactTrigger = e.target.closest('[data-open-contact]');
    if (!contactTrigger) return;
    e.preventDefault();
    openContactModal();
  });

  contactClose?.addEventListener('click', closeContactModal);
  contactBackdrop?.addEventListener('click', closeContactModal);
}

// Contact form submission
const contactForm = $('#contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = $('#contactSubmit');
    const status = $('#contactStatus');
    const name = $('#contactName').value.trim();
    const email = $('#contactEmail').value.trim();
    const message = $('#contactMessage').value.trim();

    if (!name || !email || !message) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">hourglass_empty</span> Sending...';
    status.textContent = '';
    status.className = 'contact-form__status';

    try {
      const res = await fetch('https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, source: 'supericons' }),
      });

      if (!res.ok) throw new Error(`Server responded with ${res.status}`);

      status.textContent = 'Message sent. Thank you!';
      status.className = 'contact-form__status success';
      contactForm.reset();
      window.umami?.track('contact-submit');

      setTimeout(() => {
        contactModal.classList.remove('open');
        status.textContent = '';
        status.className = 'contact-form__status';
      }, 2000);
    } catch (err) {
      status.textContent = 'Failed to send. Please try the email link below.';
      status.className = 'contact-form__status error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px">send</span> Send message';
    }
  });
}

// ============================================================
// Collapsible Sidebar Libraries
// ============================================================
(function initCollapsibleLibraries() {
  const toggle = document.getElementById('librariesToggle');
  const list = document.getElementById('librariesList');
  if (!toggle || !list) return;

  const STORAGE_KEY = 'si-libraries-collapsed';
  const isCollapsed = localStorage.getItem(STORAGE_KEY) !== 'expanded';

  if (isCollapsed) {
    toggle.classList.add('collapsed');
    list.classList.add('collapsed');
  }

  toggle.addEventListener('click', () => {
    const collapsed = toggle.classList.toggle('collapsed');
    list.classList.toggle('collapsed');
    localStorage.setItem(STORAGE_KEY, collapsed ? 'collapsed' : 'expanded');
  });
})();

// ============================================================
// Auth Init
// ============================================================
initAuth();

// ============================================================
// Store Init
// ============================================================
initStore();
