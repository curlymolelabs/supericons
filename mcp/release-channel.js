export const DETERMINISTIC_BETA_COHORT = 'deterministic-v2-beta';
export const STABLE_HOSTED_SEARCH_FUNCTION = 'mcp-search';
export const BETA_HOSTED_SEARCH_FUNCTION = 'mcp-search-v2-beta';

export function isDeterministicBetaVersion(version) {
  return /^0\.4\.19-beta\.\d+$/.test(String(version || '').trim());
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

function getControlledRunLabel() {
  const raw = String(process.env.SUPERICONS_CONTROLLED_RUN_LABEL || '').trim().toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  return normalized || null;
}

export function getBetaCohortForTool(version, toolName = 'search_icons') {
  const normalizedToolName = String(toolName || '').trim().toLowerCase();
  const cohort = isDeterministicBetaVersion(version) && normalizedToolName === 'search_icons'
    ? DETERMINISTIC_BETA_COHORT
    : null;
  if (!cohort) return null;
  // Controlled runs (owner validation scripts, reliability workloads) label
  // their cohort so telemetry stays distinguishable from organic beta use.
  const label = getControlledRunLabel();
  return label ? `${cohort}:${label}` : cohort;
}

export function getBetaCohortForRequest(
  version,
  toolName = 'search_icons',
  { locale = null, query = '' } = {},
) {
  return shouldUseLocalFirstBetaSearch(version, { toolName, query, locale })
    ? getBetaCohortForTool(version, toolName)
    : null;
}

export function shouldUseLocalFirstBetaSearch(
  version,
  { toolName = 'search_icons', query = '', locale = null } = {},
) {
  const normalizedToolName = String(toolName || '').trim().toLowerCase();
  const normalizedQuery = String(query || '').trim();
  return isDeterministicBetaVersion(version)
    && normalizedToolName === 'search_icons'
    && !String(locale || '').trim()
    && normalizedQuery.length > 0
    && !/[^\x00-\x7f]/.test(normalizedQuery);
}
