import { DOCS_PAGE_VIEWS } from '../docs-pages.js';

const BASE_ROUTE_META = Object.freeze({
  icons: {
    directRoute: true,
    persistUrl: false,
    storeShell: false,
    panelSuppressed: false,
    searchMode: 'icons',
  },
  packs: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: false,
    searchMode: 'icons',
  },
  downloads: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: false,
    searchMode: 'icons',
  },
  dashboard: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: false,
    searchMode: 'icons',
  },
  'api-keys': {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: false,
    searchMode: 'icons',
  },
  pricing: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: true,
    searchMode: 'icons',
  },
  privacy: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: true,
    searchMode: 'icons',
  },
  terms: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: true,
    searchMode: 'icons',
  },
  'motion-lab': {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: true,
    searchMode: 'icons',
  },
  converter: {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: true,
    searchMode: 'icons',
  },
  'converter-lab': {
    directRoute: true,
    persistUrl: true,
    storeShell: true,
    panelSuppressed: true,
    searchMode: 'icons',
  },
  'collection-detail': {
    directRoute: false,
    persistUrl: false,
    storeShell: true,
    panelSuppressed: false,
    searchMode: 'icons',
  },
});

const DOCS_ROUTE_META = Object.freeze(
  Object.fromEntries(
    [...DOCS_PAGE_VIEWS].map((view) => [
      view,
      {
        directRoute: true,
        persistUrl: true,
        storeShell: true,
        panelSuppressed: true,
        searchMode: 'docs',
      },
    ]),
  ),
);

export const ROUTE_VIEW_META = Object.freeze({
  ...BASE_ROUTE_META,
  ...DOCS_ROUTE_META,
});

export function normalizeRouteView(view) {
  if (view === 'mcp') return 'docs';
  return ROUTE_VIEW_META[view] ? view : 'icons';
}

export function hasDirectRouteView(view) {
  return view === 'mcp' || Boolean(ROUTE_VIEW_META[view]?.directRoute);
}

export function getRouteMeta(view) {
  return ROUTE_VIEW_META[normalizeRouteView(view)] || ROUTE_VIEW_META.icons;
}

export function shouldPersistRouteView(view) {
  return Boolean(getRouteMeta(view).persistUrl);
}

export function buildRouteUrl({ pathname, view, hash = '' }) {
  const normalized = normalizeRouteView(view);
  const safeHash = hash || '';
  if (!shouldPersistRouteView(normalized)) {
    return safeHash ? `${pathname}${safeHash}` : pathname;
  }
  return `${pathname}?view=${normalized}${safeHash}`;
}
