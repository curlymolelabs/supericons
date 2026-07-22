export const DETERMINISTIC_BETA_COHORT = 'deterministic-v2-beta';
export const STABLE_HOSTED_SEARCH_FUNCTION = 'mcp-search';
export const GROUPED_HOSTED_SEARCH_FUNCTION = 'mcp-search-grouped';
export const BETA_HOSTED_SEARCH_FUNCTION = 'mcp-search-v2-beta';

export function isDeterministicBetaVersion(version) {
  return /^0\.4\.19-beta\.\d+$/.test(String(version || '').trim());
}

export function isDeterministicStableVersion(version) {
  const match = String(version || '').trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;
  const [, major, minor, patch] = match.map(Number);
  if (major > 0) return true;
  if (minor > 4) return true;
  return minor === 4 && patch >= 19;
}

export function getDefaultHostedSearchFunctionName(version) {
  return getHostedSearchFunctionNameForTool(version, 'search_icons');
}

export function getBetaCohortForVersion(version) {
  return getBetaCohortForTool(version, 'search_icons');
}

export function getHostedSearchFunctionNameForTool(version, toolName = 'search_icons') {
  void version;
  void toolName;
  return STABLE_HOSTED_SEARCH_FUNCTION;
}

export function getControlledRunLabel() {
  const raw = String(process.env.SUPERICONS_CONTROLLED_RUN_LABEL || '').trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  return normalized || null;
}

export function isControlledRunCohort(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('controlled-run:')
    || normalized.includes(':founder_controlled')
    || normalized.includes(':controlled_');
}

export function getBetaCohortForTool(version, toolName = 'search_icons') {
  const normalizedToolName = String(toolName || '').trim().toLowerCase();
  const cohort = isDeterministicBetaVersion(version) && normalizedToolName === 'search_icons'
    ? DETERMINISTIC_BETA_COHORT
    : null;
  // Controlled runs (owner validation scripts, reliability workloads) label
  // every tool so telemetry stays separate from user activity.
  const label = getControlledRunLabel();
  if (label) return cohort ? `${cohort}:${label}` : `controlled-run:${label}`;
  return cohort;
}

export function getBetaCohortForRequest(
  version,
  toolName = 'search_icons',
  { locale = null, query = '' } = {},
) {
  const controlledRunCohort = getControlledRunLabel();
  if (controlledRunCohort) return `controlled-run:${controlledRunCohort}`;
  return shouldUseLocalFirstBetaSearch(version, { toolName, query, locale })
    ? getBetaCohortForTool(version, toolName)
    : null;
}

export function shouldUseLocalFirstSearch(
  version,
  { toolName = 'search_icons', query = '', locale = null } = {},
) {
  const normalizedToolName = String(toolName || '').trim().toLowerCase();
  const normalizedQuery = String(query || '').trim();
  if (!['search_icons', 'recommend_icons'].includes(normalizedToolName)) return false;
  if (!normalizedQuery) return false;

  if (isDeterministicStableVersion(version)) return true;

  return isDeterministicBetaVersion(version)
    && normalizedToolName === 'search_icons'
    && !String(locale || '').trim()
    && !/[^\x00-\x7f]/.test(normalizedQuery);
}

export function shouldUseLocalFirstBetaSearch(
  version,
  { toolName = 'search_icons', query = '', locale = null } = {},
) {
  return shouldUseLocalFirstSearch(version, { toolName, query, locale });
}
