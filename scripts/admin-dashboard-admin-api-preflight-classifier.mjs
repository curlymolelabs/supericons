export const ADMIN_API_PREFLIGHT_MAX_LATENCY_MS = 10_000;

export function classifyAdminApiPreflight({
  httpStatus = null,
  payloadHasStats = false,
  errorName = '',
  errorMessage = '',
  latencyMs = 0,
  maxLatencyMs = ADMIN_API_PREFLIGHT_MAX_LATENCY_MS,
} = {}) {
  const normalizedErrorName = String(errorName || '').toLowerCase();
  const normalizedErrorMessage = String(errorMessage || '').toLowerCase();
  const timedOut = normalizedErrorName === 'timeouterror'
    || normalizedErrorMessage.includes('timeout')
    || normalizedErrorMessage.includes('timed out');

  if (timedOut) {
    return { proceed: false, outcome: 'timeout', reason: 'shared_database_unhealthy' };
  }
  if (Number(latencyMs) > Number(maxLatencyMs)) {
    return { proceed: false, outcome: 'slow_response', reason: 'shared_database_unhealthy' };
  }
  if (errorName || errorMessage) {
    return { proceed: false, outcome: 'network_error', reason: 'preflight_unreachable' };
  }
  if (httpStatus === 401 || httpStatus === 403) {
    return { proceed: false, outcome: 'auth_rejected', reason: 'admin_secret_rejected' };
  }
  if (Number.isInteger(httpStatus) && httpStatus >= 500 && httpStatus <= 599) {
    return { proceed: true, outcome: 'http_5xx', reason: 'legacy_service_degraded' };
  }
  if (httpStatus !== 200) {
    return { proceed: false, outcome: 'unexpected_http_status', reason: 'preflight_contract_unknown' };
  }
  if (!payloadHasStats) {
    return { proceed: false, outcome: 'invalid_payload', reason: 'preflight_contract_invalid' };
  }
  return { proceed: true, outcome: 'healthy', reason: 'legacy_contract_verified' };
}
