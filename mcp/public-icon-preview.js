const DEFAULT_WEB_BASE_URL = 'https://supericons.dev';

export const PUBLIC_LIBRARY_META = Object.freeze({
  material: {
    name: 'Material Symbols',
    description: 'Google Material Symbols',
  },
  lucide: {
    name: 'Lucide',
    description: 'Consistent open-source outline icons',
  },
  tabler: {
    name: 'Tabler',
    description: 'Large open-source SVG icon library',
  },
  phosphor: {
    name: 'Phosphor',
    description: 'Flexible icon family',
  },
  heroicons: {
    name: 'Heroicons',
    description: 'Interface icons by Tailwind Labs',
  },
  bootstrap: {
    name: 'Bootstrap',
    description: 'Official Bootstrap SVG icons',
  },
  iconoir: {
    name: 'Iconoir',
    description: 'Open-source outline and solid icons',
  },
  ionicons: {
    name: 'Ionicons',
    description: 'Icons for app and interface design',
  },
  mingcute: {
    name: 'MingCute',
    description: 'Modern interface icons',
  },
  si: {
    name: 'Supericons',
    description: 'AI and developer tool logos curated for agentic app builders',
  },
  simpleicons: {
    name: 'Simple Icons',
    description: 'Brand and product icons',
  },
});

function normalizeBaseUrl(baseUrl = '') {
  return String(baseUrl || DEFAULT_WEB_BASE_URL).trim().replace(/\/+$/, '') || DEFAULT_WEB_BASE_URL;
}

function getConfiguredWebBaseUrl() {
  return normalizeBaseUrl(process.env.SUPERICONS_WEB_BASE_URL || DEFAULT_WEB_BASE_URL);
}

function getIconLibrary(icon = {}) {
  return icon.library || icon.lib || icon.library_key || '';
}

export function getPublicLibraryMeta(libraryKey, fallback = {}) {
  const key = String(libraryKey || '').trim();
  const known = PUBLIC_LIBRARY_META[key] || {};
  const name = fallback.name || fallback.libraryName || known.name || key || 'Unknown library';
  const description = fallback.description || known.description || '';
  return {
    id: key,
    key,
    name,
    description,
    label: key ? `${name} (${key})` : name,
  };
}

export function buildIconRef(icon = {}) {
  const library = getIconLibrary(icon);
  const id = icon.id || icon.icon_id || '';
  return library && id ? `${library}:${id}` : '';
}

export function parseIconRef(ref = '') {
  const [library, ...idParts] = String(ref || '').split(':');
  const id = idParts.join(':');
  return library && id ? { library, id } : null;
}

export function buildSearchPreviewUrl({
  query,
  library,
  style,
  locale,
  limit,
  baseUrl,
} = {}) {
  const url = new URL('/', baseUrl ? normalizeBaseUrl(baseUrl) : getConfiguredWebBaseUrl());
  url.searchParams.set('view', 'icons');
  url.searchParams.set('preview', 'mcp');
  if (query) url.searchParams.set('q', String(query));
  if (library && library !== 'all') url.searchParams.set('library', String(library));
  if (style && style !== 'any') url.searchParams.set('style', String(style));
  if (locale) url.searchParams.set('locale', String(locale));
  if (limit) url.searchParams.set('limit', String(limit));
  return url.toString();
}

export function buildIconPreviewUrl({ library, id, baseUrl } = {}) {
  const url = new URL('/', baseUrl ? normalizeBaseUrl(baseUrl) : getConfiguredWebBaseUrl());
  url.searchParams.set('view', 'icons');
  url.searchParams.set('preview', 'mcp');
  if (library && library !== 'all') url.searchParams.set('library', String(library));
  if (library && id) url.searchParams.set('icon', `${library}:${id}`);
  return url.toString();
}

export function enrichPublicIconResult(icon = {}, options = {}) {
  const library = getIconLibrary(icon);
  const id = icon.id || '';
  const meta = getPublicLibraryMeta(library, {
    name: icon.libraryName || icon.library_name,
    description: icon.libraryDescription || icon.library_description,
  });
  const iconRef = buildIconRef({ library, id });
  const preview = {
    library_key: library,
    library_name: meta.name,
    library_label: meta.label,
    icon_ref: iconRef,
    icon_preview_url: library && id ? buildIconPreviewUrl({ library, id, baseUrl: options.baseUrl }) : null,
  };

  if (options.query) {
    preview.search_preview_url = buildSearchPreviewUrl({
      query: options.query,
      library: options.library,
      style: options.style,
      locale: options.locale,
      limit: options.limit,
      baseUrl: options.baseUrl,
    });
  }

  return {
    ...icon,
    ...preview,
    libraryName: icon.libraryName || meta.name,
  };
}

export function buildPreviewBoardUrlForIcons(iconRefs = [], options = {}) {
  const url = new URL('/', options.baseUrl ? normalizeBaseUrl(options.baseUrl) : getConfiguredWebBaseUrl());
  url.searchParams.set('view', 'icons');
  url.searchParams.set('preview', 'mcp');
  const refs = iconRefs.map(String).map((ref) => ref.trim()).filter(Boolean).slice(0, 24);
  if (refs.length) url.searchParams.set('icons', refs.join(','));
  return url.toString();
}
