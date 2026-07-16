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

export function getBetaCohortForTool(version, toolName = 'search_icons') {
  const normalizedToolName = String(toolName || '').trim().toLowerCase();
  return isDeterministicBetaVersion(version) && normalizedToolName === 'search_icons'
    ? DETERMINISTIC_BETA_COHORT
    : null;
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
