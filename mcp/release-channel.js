export const DETERMINISTIC_BETA_COHORT = 'deterministic-v2-beta';

export function isDeterministicBetaVersion(version) {
  return /^0\.4\.18-beta\.\d+$/.test(String(version || '').trim());
}

export function getDefaultHostedSearchFunctionName(version) {
  return isDeterministicBetaVersion(version) ? 'mcp-search-v2-beta' : 'mcp-search';
}

export function getBetaCohortForVersion(version) {
  return isDeterministicBetaVersion(version) ? DETERMINISTIC_BETA_COHORT : null;
}
