import { normalizePopularityRecord } from './icon-grid-behavior.js';

const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';
const SESSION_TOKEN_STORAGE_KEY = 'si-intelligence-session-token';
const LAST_COPY_STORAGE_KEY = 'si-intelligence-last-copy';

let inMemorySessionToken = null;
let lastSearchAttemptSignature = null;
let lastSearchAttemptAt = 0;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getSessionToken() {
  try {
    const stored = localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (stored) {
      inMemorySessionToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage access failures.
  }

  if (inMemorySessionToken) return inMemorySessionToken;

  const token = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  inMemorySessionToken = token;
  try {
    localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage access failures.
  }
  return token;
}

async function sha256Hex(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await window.crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getSessionHash() {
  if (!window.crypto?.subtle) return null;
  return sha256Hex(`${getSessionToken()}|${getTodayKey()}`);
}

function toEvidenceIconId(icon) {
  if (!icon?.lib || !icon?.id) return null;
  return `${icon.lib}:${icon.id}`;
}

function normalizeQuery(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeFilterValue(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function getEvidenceDomain() {
  const hostname = String(window.location?.hostname || '').trim().toLowerCase();
  return hostname || null;
}

function getEvidenceContextPath() {
  const pathname = String(window.location?.pathname || '').trim();
  return pathname || '/';
}

function withPageContext(payload) {
  return {
    ...payload,
    p_domain: getEvidenceDomain(),
    p_context_url: getEvidenceContextPath(),
  };
}

async function postRpc(name, payload) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`icon intelligence RPC failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

function readLastCopy() {
  try {
    const raw = localStorage.getItem(LAST_COPY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLastCopy(entry) {
  try {
    localStorage.setItem(LAST_COPY_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore local storage write failures.
  }
}

async function maybeLogReplacement({
  currentIconId,
  currentQuery,
  currentJobCategory,
  sessionHash,
  uiSurface,
}) {
  const lastCopy = readLastCopy();
  if (!lastCopy?.icon_id || !lastCopy?.copied_at || lastCopy.icon_id === currentIconId) {
    return;
  }

  const previousQuery = normalizeQuery(lastCopy.search_query);
  const normalizedCurrentQuery = normalizeQuery(currentQuery);
  if (!previousQuery || previousQuery !== normalizedCurrentQuery) {
    return;
  }

  const previousDate = new Date(lastCopy.copied_at);
  if (!Number.isFinite(previousDate.getTime())) {
    return;
  }

  const deltaMs = Date.now() - previousDate.getTime();
  if (deltaMs < 0 || deltaMs > 30 * 24 * 60 * 60 * 1000) {
    return;
  }

  const retainedDays = Math.max(0, Math.floor(deltaMs / (24 * 60 * 60 * 1000)));

  await postRpc('si_log_icon_evidence', withPageContext({
    p_signal_type: 'replace',
    p_icon_id: lastCopy.icon_id,
    p_search_query: lastCopy.search_query || null,
    p_job_category: lastCopy.job_category || currentJobCategory || null,
    p_ui_surface: uiSurface || null,
    p_replaced_with: currentIconId,
    p_retained_days: retainedDays,
    p_session_hash: sessionHash,
    p_created_at: new Date().toISOString(),
  }));
}

export async function logCopyEvent({
  icon,
  searchQuery = null,
  resultPosition = null,
  timeToCopyMs = null,
  jobCategory = null,
  uiSurface = null,
  evidenceText = null,
}) {
  const iconId = toEvidenceIconId(icon);
  if (!iconId) return;

  try {
    const sessionHash = await getSessionHash();
    if (!sessionHash) return;
    await maybeLogReplacement({
      currentIconId: iconId,
      currentQuery: searchQuery,
      currentJobCategory: jobCategory,
      sessionHash,
      uiSurface,
    });

    await postRpc('si_log_icon_evidence', withPageContext({
      p_signal_type: 'copy',
      p_icon_id: iconId,
      p_search_query: searchQuery || null,
      p_result_position: resultPosition ?? null,
      p_time_to_copy_ms: timeToCopyMs ?? null,
      p_job_category: jobCategory || null,
      p_ui_surface: uiSurface || null,
      p_evidence_text: evidenceText || null,
      p_session_hash: sessionHash,
      p_created_at: new Date().toISOString(),
    }));

    writeLastCopy({
      icon_id: iconId,
      job_category: jobCategory || null,
      search_query: searchQuery || null,
      copied_at: new Date().toISOString(),
    });
  } catch {
    // Never block UI on analytics failures.
  }
}

export async function logFavoriteEvent({
  icon,
  searchQuery = null,
  resultPosition = null,
  jobCategory = null,
  uiSurface = null,
}) {
  const iconId = toEvidenceIconId(icon);
  if (!iconId) return;

  try {
    const sessionHash = await getSessionHash();
    if (!sessionHash) return;
    await postRpc('si_log_icon_evidence', withPageContext({
      p_signal_type: 'favorite',
      p_icon_id: iconId,
      p_search_query: searchQuery || null,
      p_result_position: resultPosition ?? null,
      p_job_category: jobCategory || null,
      p_ui_surface: uiSurface || null,
      p_session_hash: sessionHash,
      p_created_at: new Date().toISOString(),
    }));
  } catch {
    // Never block UI on analytics failures.
  }
}

export async function logSearchAttempt({
  searchQuery = null,
  resultCount = null,
  libraryFilter = null,
  jobCategory = null,
  uiSurface = null,
  evidenceText = null,
}) {
  const normalizedQuery = normalizeQuery(searchQuery);
  const normalizedLibraryFilter = normalizeFilterValue(libraryFilter);
  const normalizedJobCategory = normalizeFilterValue(jobCategory);
  const safeResultCount = Number.isFinite(resultCount) ? Math.max(0, Math.round(resultCount)) : null;

  if (!normalizedQuery || normalizedQuery.length < 2 || safeResultCount === null) {
    return;
  }

  const signature = [
    normalizedQuery,
    String(safeResultCount),
    normalizedLibraryFilter || 'all',
    normalizedJobCategory || 'all',
    normalizeFilterValue(uiSurface) || 'grid',
  ].join('|');

  const now = Date.now();
  if (signature === lastSearchAttemptSignature && now - lastSearchAttemptAt < 30000) {
    return;
  }

  lastSearchAttemptSignature = signature;
  lastSearchAttemptAt = now;

  try {
    const sessionHash = await getSessionHash();
    if (!sessionHash) return;
    await postRpc('si_log_icon_evidence', withPageContext({
      p_signal_type: 'search_attempt',
      p_search_query: normalizedQuery,
      p_result_count: safeResultCount,
      p_library_filter: normalizedLibraryFilter || 'all',
      p_job_category: normalizedJobCategory || null,
      p_ui_surface: uiSurface || null,
      p_evidence_text: evidenceText || null,
      p_session_hash: sessionHash,
      p_created_at: new Date().toISOString(),
    }));
  } catch {
    // Never block UI on analytics failures.
  }
}

export async function logIconRequest({
  searchQuery = null,
  feedbackText = null,
  libraryFilter = null,
  jobCategory = null,
  uiSurface = 'grid_empty_feedback',
  resultCount = null,
}) {
  const normalizedQuery = normalizeQuery(searchQuery);
  const normalizedLibraryFilter = normalizeFilterValue(libraryFilter);
  const normalizedJobCategory = normalizeFilterValue(jobCategory);
  const safeResultCount = resultCount === null || resultCount === undefined
    ? null
    : Number.isFinite(Number(resultCount))
      ? Math.max(0, Math.trunc(Number(resultCount)))
      : null;
  const safeFeedbackText = String(feedbackText || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 400);

  if (!safeFeedbackText || Boolean(normalizedQuery) !== (safeResultCount !== null)) {
    return false;
  }

  try {
    const sessionHash = await getSessionHash();
    if (!sessionHash) return false;
    await postRpc('si_log_icon_request', withPageContext({
      p_request_text: safeFeedbackText,
      p_ui_surface: uiSurface || 'grid_empty_feedback',
      p_session_hash: sessionHash,
      p_search_query: normalizedQuery || null,
      p_result_count: safeResultCount,
      p_library_filter: normalizedLibraryFilter || 'all',
      p_job_category: normalizedJobCategory || null,
    }));
    return true;
  } catch {
    return false;
  }
}

export async function fetchPopularityMap() {
  const headers = {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
  };

  const primaryResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/icon_scores?select=icon_id,copy_count_30d,download_count_30d,favorite_count_30d,popularity_score_30d,trending_score_7d&order=popularity_score_30d.desc.nullslast,trending_score_7d.desc.nullslast,copy_count_30d.desc.nullslast&limit=5000`,
    { headers }
  );

  let response = primaryResponse;
  if (!response.ok && response.status === 400) {
    response = await fetch(
      `${SUPABASE_URL}/rest/v1/icon_scores?select=icon_id,copy_count_30d&order=copy_count_30d.desc.nullslast&limit=5000`,
      { headers }
    );
  }

  if (!response.ok) {
    throw new Error(`icon score fetch failed (${response.status})`);
  }

  const rows = await response.json();
  const counts = {};
  for (const row of rows || []) {
    if (!row?.icon_id) continue;
    counts[row.icon_id] = normalizePopularityRecord(row);
  }
  return counts;
}

export function buildEvidenceIconId(icon) {
  return toEvidenceIconId(icon);
}
