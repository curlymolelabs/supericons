import { DOCS_PAGE_VIEWS, getDocsPageConfig } from '../docs-pages.js';

export const SITE_ORIGIN = 'https://supericons.dev';

const SPECIAL_DOC_PATHS = Object.freeze({
  'docs-mcp-universal': '/mcp/',
  'docs-claude-code': '/mcp/claude-code/',
  'docs-codex': '/mcp/codex/',
  'docs-cursor': '/mcp/cursor/',
});

const BASE_PUBLIC_ROUTES = Object.freeze({
  home: {
    view: 'icons',
    path: '/',
    title: 'Supericons | Find the Right Icon Faster',
    description: 'Search 20,000+ curated SVG icons by meaning, use case, or where they appear in your interface. Built for designers, developers, and AI coding agents.',
    priority: '1.0',
  },
  pricing: {
    view: 'pricing',
    path: '/pricing/',
    title: 'Supericons Pricing',
    description: 'See Supericons plans for free icon search, MCP access, Motion Lab, converter tools, and premium icon workflows.',
    priority: '0.8',
  },
  'api-keys': {
    view: 'api-keys',
    path: '/api-keys/',
    title: 'Supericons API Keys',
    description: 'Learn how to use Supericons API keys for premium MCP tools and account-connected workflows.',
    priority: '0.6',
  },
  privacy: {
    view: 'privacy',
    path: '/privacy/',
    title: 'Supericons Privacy Policy',
    description: 'Read the Supericons privacy policy, including how product data and account information are handled.',
    priority: '0.4',
  },
  terms: {
    view: 'terms',
    path: '/terms/',
    title: 'Supericons Terms of Service',
    description: 'Read the Supericons terms of service for using the app, icon search, MCP tools, Motion Lab, and converter.',
    priority: '0.4',
  },
  'motion-lab': {
    view: 'motion-lab',
    path: '/motion-lab/',
    title: 'Supericons Motion Lab',
    description: 'Animate SVG icons with Motion Lab presets and export motion-ready icon code for apps, demos, and product UI.',
    priority: '0.8',
  },
  converter: {
    view: 'converter',
    path: '/converter/',
    title: 'Supericons Converter',
    description: 'Convert icons and images for design and development workflows, including SVG and PNG output paths.',
    priority: '0.7',
  },
});

function docsPathForView(view) {
  if (SPECIAL_DOC_PATHS[view]) return SPECIAL_DOC_PATHS[view];
  if (view === 'docs') return '/docs/';
  return `/docs/${view.replace(/^docs-/, '')}/`;
}

function docsTitleForConfig(config) {
  if (!config?.pageTitle) return 'Supericons Documentation';
  if (/supericons/i.test(config.pageTitle)) return config.pageTitle;
  return `${config.pageTitle} | Supericons Docs`;
}

function docsDescriptionForConfig(config) {
  const summary = config?.summary?.trim();
  if (summary) return summary;
  return 'Read Supericons documentation for icon search, MCP setup, Motion Lab, converter workflows, and troubleshooting.';
}

const DOCS_PUBLIC_ROUTES = Object.freeze(
  Object.fromEntries(
    [...DOCS_PAGE_VIEWS].map((view) => {
      const config = getDocsPageConfig(view);
      return [
        view,
        {
          view,
          path: docsPathForView(view),
          title: docsTitleForConfig(config),
          description: docsDescriptionForConfig(config),
          priority: SPECIAL_DOC_PATHS[view] ? '0.8' : '0.6',
        },
      ];
    }),
  ),
);

export const PUBLIC_ROUTE_SEO = Object.freeze({
  ...BASE_PUBLIC_ROUTES,
  ...DOCS_PUBLIC_ROUTES,
});

export const PRETTY_ROUTE_VIEW_PATHS = Object.freeze(
  Object.fromEntries(
    Object.values(PUBLIC_ROUTE_SEO)
      .filter((route) => route.view !== 'icons')
      .map((route) => [route.view, route.path]),
  ),
);

export function getPublicSeoEntries() {
  return Object.values(PUBLIC_ROUTE_SEO);
}

export function getCanonicalUrl(path) {
  return `${SITE_ORIGIN}${path === '/' ? '/' : path}`;
}
