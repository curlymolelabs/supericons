const RECENT_SEARCH_MIN_LENGTH = 3;

export function createEmptyPopularityRecord() {
  return {
    copyCount30d: 0,
    downloadCount30d: 0,
    favoriteCount30d: 0,
    popularityScore30d: 0,
    trendingScore7d: 0,
  };
}

function toSafeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizePopularityRecord(record = {}) {
  const normalized = createEmptyPopularityRecord();
  normalized.copyCount30d = Math.max(0, Math.round(
    toSafeNumber(record.copyCount30d ?? record.copy_count_30d)
  ));
  normalized.downloadCount30d = Math.max(0, Math.round(
    toSafeNumber(record.downloadCount30d ?? record.download_count_30d)
  ));
  normalized.favoriteCount30d = Math.max(0, Math.round(
    toSafeNumber(record.favoriteCount30d ?? record.favorite_count_30d)
  ));
  normalized.popularityScore30d = Math.max(
    0,
    toSafeNumber(record.popularityScore30d ?? record.popularity_score_30d)
  );
  normalized.trendingScore7d = Math.max(
    0,
    toSafeNumber(record.trendingScore7d ?? record.trending_score_7d)
  );
  return normalized;
}

export function getPopularityKey(iconOrKey) {
  if (!iconOrKey) return null;
  if (typeof iconOrKey === 'string') return iconOrKey;
  if (!iconOrKey.lib || !iconOrKey.id) return null;
  return `${iconOrKey.lib}:${iconOrKey.id}`;
}

export function getPopularityRecord(popularityMap, iconOrKey) {
  const key = getPopularityKey(iconOrKey);
  if (!key) return createEmptyPopularityRecord();
  return normalizePopularityRecord(popularityMap?.[key]);
}

function comparePopularityRecords(aRecord, bRecord, aName = '', bName = '') {
  if (bRecord.popularityScore30d !== aRecord.popularityScore30d) {
    return bRecord.popularityScore30d - aRecord.popularityScore30d;
  }
  if (bRecord.trendingScore7d !== aRecord.trendingScore7d) {
    return bRecord.trendingScore7d - aRecord.trendingScore7d;
  }
  if (bRecord.copyCount30d !== aRecord.copyCount30d) {
    return bRecord.copyCount30d - aRecord.copyCount30d;
  }
  if (bRecord.downloadCount30d !== aRecord.downloadCount30d) {
    return bRecord.downloadCount30d - aRecord.downloadCount30d;
  }
  if (bRecord.favoriteCount30d !== aRecord.favoriteCount30d) {
    return bRecord.favoriteCount30d - aRecord.favoriteCount30d;
  }
  return String(aName || '').localeCompare(String(bName || ''));
}

export function compareBrowseIconsByPopularity(aIcon, bIcon, popularityMap) {
  const aRecord = getPopularityRecord(popularityMap, aIcon);
  const bRecord = getPopularityRecord(popularityMap, bIcon);
  return comparePopularityRecords(aRecord, bRecord, aIcon?.name, bIcon?.name);
}

export function compareSearchMatches(aMatch, bMatch, popularityMap, getJobRank = () => 0) {
  if (bMatch.aliasScore !== aMatch.aliasScore) {
    return bMatch.aliasScore - aMatch.aliasScore;
  }
  if (bMatch.directScore !== aMatch.directScore) {
    return bMatch.directScore - aMatch.directScore;
  }

  const popularityDiff = comparePopularityRecords(
    getPopularityRecord(popularityMap, aMatch.icon),
    getPopularityRecord(popularityMap, bMatch.icon),
    aMatch.icon?.name,
    bMatch.icon?.name
  );
  if (popularityDiff !== 0) return popularityDiff;

  const rankDiff = getJobRank(aMatch.icon) - getJobRank(bMatch.icon);
  if (rankDiff !== 0) return rankDiff;

  return String(aMatch.icon?.name || '').localeCompare(String(bMatch.icon?.name || ''));
}

export function applyPopularityDelta(record, delta = {}) {
  const next = normalizePopularityRecord(record);
  const copyDelta = Math.max(0, Math.round(toSafeNumber(delta.copyCount30d ?? delta.copy ?? 0)));
  const downloadDelta = Math.max(0, Math.round(toSafeNumber(delta.downloadCount30d ?? delta.download ?? 0)));
  const favoriteDelta = Math.max(0, Math.round(toSafeNumber(delta.favoriteCount30d ?? delta.favorite ?? 0)));

  next.copyCount30d += copyDelta;
  next.downloadCount30d += downloadDelta;
  next.favoriteCount30d += favoriteDelta;
  next.popularityScore30d += copyDelta + (downloadDelta * 1.5) + (favoriteDelta * 0.75);
  next.trendingScore7d += copyDelta + (downloadDelta * 1.5) + (favoriteDelta * 0.75);
  return next;
}

export function shouldSyncSearchOnBlur(inputValue, currentSearchQuery) {
  return String(inputValue || '').trim() !== String(currentSearchQuery || '').trim();
}

export function shouldShowTagFilterBar({ currentView, activeLibrary } = {}) {
  const resolvedView = String(currentView || 'icons');
  const inIconGridView = resolvedView === 'icons' || resolvedView === '';
  if (!inIconGridView) return false;

  const resolvedLibrary = String(activeLibrary || 'all');
  return resolvedLibrary !== 'favorites' && resolvedLibrary !== 'recent';
}

export function getScopedJobCategoryFilter({
  currentView,
  activeLibrary,
  activeJobCategoryFilter,
} = {}) {
  if (!shouldShowTagFilterBar({ currentView, activeLibrary })) {
    return null;
  }

  const resolvedFilter = String(activeJobCategoryFilter || 'all');
  return resolvedFilter === 'all' ? null : resolvedFilter;
}

export function getNextJobCategoryFilterForLibrarySelect({
  nextLibraryId,
  activeJobCategoryFilter,
} = {}) {
  const resolvedLibrary = String(nextLibraryId || 'all');
  if (resolvedLibrary === 'favorites' || resolvedLibrary === 'recent') {
    return 'all';
  }

  return String(activeJobCategoryFilter || 'all');
}

export function resolveGridHeadingText({
  currentView,
  activeLibrary,
  currentTitle,
  libraryTitle,
} = {}) {
  const resolvedView = String(currentView || 'icons');
  const inIconGridView = resolvedView === 'icons' || resolvedView === '';
  if (!inIconGridView) {
    return String(currentTitle || '');
  }

  const resolvedLibrary = String(activeLibrary || 'all');
  const resolvedLibraryTitle = String(libraryTitle || resolvedLibrary);

  return resolvedLibraryTitle;
}

export function resolveGridEmptyCopy({
  searchQuery,
  hostedSearchPending,
  isFavoritesView,
  isRecentView,
  activeJobCategoryLabel,
  activeJobCategoryDescription,
  defaultText,
} = {}) {
  const query = String(searchQuery || '').trim();
  if (query) {
    if (hostedSearchPending) {
      return {
        title: 'Searching icons...',
        text: `Checking the semantic search index for "${query}".`,
      };
    }

    const label = String(activeJobCategoryLabel || '').trim();
    return {
      title: 'No icons found',
      text: label
        ? `No icons in ${label} match "${query}". Try a different search term.`
        : `No icons match "${query}". Try a different search term.`,
    };
  }

  if (isFavoritesView) {
    return {
      title: 'No favorites yet',
      text: 'Select an icon and use Save in Customize to keep it here. Favorites stay on this device.',
    };
  }

  if (isRecentView) {
    return {
      title: 'No recent icons yet',
      text: 'Icons you open appear here on this device. Clear them anytime from the header.',
    };
  }

  const label = String(activeJobCategoryLabel || '').trim();
  if (label) {
    return {
      title: `No ${label.toLowerCase()} icons yet`,
      text: String(activeJobCategoryDescription || ''),
    };
  }

  return {
    title: 'Welcome to SuperIcons',
    text: String(defaultText || ''),
  };
}

export function normalizeRecentSearchQuery(query) {
  return String(query || '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function addRecentSearchEntry(entries, query, maxEntries = 8) {
  const normalized = normalizeRecentSearchQuery(query);
  const currentEntries = Array.isArray(entries) ? entries : [];
  if (normalized.length < RECENT_SEARCH_MIN_LENGTH) {
    return [...currentEntries];
  }

  const lowered = normalized.toLowerCase();
  const nextEntries = [
    normalized,
    ...currentEntries.filter((entry) => normalizeRecentSearchQuery(entry).toLowerCase() !== lowered),
  ];
  return nextEntries.slice(0, Math.max(1, Math.round(toSafeNumber(maxEntries) || 8)));
}
