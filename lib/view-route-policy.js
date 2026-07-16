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

const PRETTY_ROUTE_VIEW_PATHS = Object.freeze({
  privacy: '/privacy/',
  terms: '/terms/',
  'docs-mcp-universal': '/mcp/',
  'docs-claude-code': '/mcp/claude-code/',
  'docs-codex': '/mcp/codex/',
  'docs-cursor': '/mcp/cursor/',
});

const PRETTY_PATH_ROUTE_VIEWS = Object.freeze(
  Object.fromEntries(
    Object.entries(PRETTY_ROUTE_VIEW_PATHS).map(([view, path]) => [path, view]),
  ),
);

const MCP_PREVIEW_ROUTE_PARAMS = Object.freeze([
  'preview',
  'q',
  'query',
  'search',
  'library',
  'lib',
  'icon',
  'icon_ref',
  'icons',
  'style',
  'locale',
  'limit',
]);

function normalizePathname(pathname = '/') {
  const cleanPath = pathname.split('?')[0].split('#')[0] || '/';
  if (cleanPath === '/') return cleanPath;
  return cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;
}

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

export function getPrettyRoutePath(view) {
  return PRETTY_ROUTE_VIEW_PATHS[normalizeRouteView(view)] || null;
}

export function getRouteViewFromPath(pathname) {
  return PRETTY_PATH_ROUTE_VIEWS[normalizePathname(pathname)] || null;
}

export function buildRouteUrl({ pathname, view, hash = '', search = '' }) {
  const normalized = normalizeRouteView(view);
  const safeHash = hash || '';
  const currentParams = new URLSearchParams(search || '');
  const nextParams = new URLSearchParams();
  const locale = currentParams.get('locale');
  if (locale) nextParams.set('locale', locale);
  const hasMcpPreviewParams = normalized === 'icons'
    && (
      currentParams.get('preview') === 'mcp'
      || currentParams.has('q')
      || currentParams.has('query')
      || currentParams.has('search')
      || currentParams.has('icon')
      || currentParams.has('icon_ref')
      || currentParams.has('icons')
    );
  if (hasMcpPreviewParams) {
    for (const param of MCP_PREVIEW_ROUTE_PARAMS) {
      const value = currentParams.get(param);
      if (value !== null && value !== '') nextParams.set(param, value);
    }
  }

  const prettyPath = getPrettyRoutePath(normalized);
  if (prettyPath) {
    const query = nextParams.toString();
    return `${prettyPath}${query ? `?${query}` : ''}${safeHash}`;
  }

  if (!shouldPersistRouteView(normalized)) {
    const query = nextParams.toString();
    return `${pathname}${query ? `?${query}` : ''}${safeHash}`;
  }
  const routePathname = getRouteViewFromPath(pathname) ? '/' : pathname;
  nextParams.set('view', normalized);
  return `${routePathname}?${nextParams.toString()}${safeHash}`;
}
