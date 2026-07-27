import { createHash, randomUUID } from 'crypto';
import { platform } from 'node:os';
import { SUPABASE_ANON, SUPABASE_URL } from './auth.js';
import { getOrCreateLocalTelemetryInstallationId } from './local-telemetry-identity.js';

const PROCESS_SESSION_TOKEN = randomUUID();
const LOCAL_TELEMETRY_ENDPOINT =
  `${SUPABASE_URL}/rest/v1/rpc/si_log_local_mcp_search_outcome_v3`;
const TELEMETRY_TIMEOUT_MS = 750;
let clientVersionProvider = () => null;
let persistedInstallationId = null;
let installationLoadPromise = null;

export function isTelemetryDisabled(env = process.env) {
  const disableFlag = String(env.SUPERICONS_DISABLE_TELEMETRY || '').trim().toLowerCase();
  const telemetryFlag = String(env.SUPERICONS_TELEMETRY || '').trim().toLowerCase();
  const mcpTelemetryFlag = String(env.SUPERICONS_MCP_TELEMETRY_ENABLED || '').trim().toLowerCase();
  const doNotTrack = String(env.DO_NOT_TRACK || '').trim().toLowerCase();

  return disableFlag === '1'
    || disableFlag === 'true'
    || disableFlag === 'on'
    || telemetryFlag === '0'
    || telemetryFlag === 'false'
    || telemetryFlag === 'off'
    || telemetryFlag === 'disabled'
    || mcpTelemetryFlag === '0'
    || mcpTelemetryFlag === 'false'
    || mcpTelemetryFlag === 'off'
    || mcpTelemetryFlag === 'disabled'
    || doNotTrack === '1'
    || doNotTrack === 'true';
}

function getSessionHash() {
  const today = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${PROCESS_SESSION_TOKEN}|${today}`)
    .digest('hex');
}

export function getMcpTelemetrySessionHash() {
  return getSessionHash();
}

export function configureMcpTelemetryContext({
  getClientVersion = () => null,
} = {}) {
  clientVersionProvider = typeof getClientVersion === 'function'
    ? getClientVersion
    : () => null;
}

function normalizeClientToken(value, maxLength) {
  const token = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return token ? token.slice(0, maxLength) : null;
}

function normalizeClientText(value, maxLength) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, maxLength) : null;
}

function getMcpClientContext() {
  let clientInfo = null;
  try {
    clientInfo = clientVersionProvider();
  } catch {
    clientInfo = null;
  }
  return {
    clientFamily: normalizeClientToken(clientInfo?.name, 64) || 'unknown',
    clientVersion: normalizeClientText(clientInfo?.version, 40),
    osPlatform: ['win32', 'darwin', 'linux'].includes(platform())
      ? platform()
      : 'other',
  };
}

async function getInstallationId() {
  if (persistedInstallationId) return persistedInstallationId;
  if (!installationLoadPromise) {
    installationLoadPromise = getOrCreateLocalTelemetryInstallationId()
      .then((value) => {
        if (value) persistedInstallationId = value;
        return value;
      })
      .finally(() => {
        installationLoadPromise = null;
      });
  }
  return installationLoadPromise;
}

async function callRpc(name, payload) {
  if (isTelemetryDisabled()) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`RPC ${name} failed (${response.status})`);
  }
}

async function callV2SearchOutcome(payload) {
  return callRpc('si_log_mcp_search_outcome_v2', payload);
}

async function callV3SearchOutcome(payload) {
  const response = await fetch(LOCAL_TELEMETRY_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ p_payload: payload }),
    signal: AbortSignal.timeout(TELEMETRY_TIMEOUT_MS),
  });
  if (response.ok) return { accepted: true, fallbackToV2: false };
  const errorBody = await response.json().catch(() => null);
  return {
    accepted: false,
    fallbackToV2: response.status === 404
      || (response.status === 400 && errorBody?.code === 'PGRST202'),
  };
}

function v2SearchOutcomePayload({
  normalizedQuery,
  safeResultCount,
  libraryFilter,
  libraryMode,
  normalizedOutcome,
  toolName,
  locale,
  confidenceLabel,
  betaCohort,
  mcpServerVersion,
  safeLatencyMs,
}) {
  return {
    p_query_norm: normalizedQuery,
    p_result_count: safeResultCount,
    p_library_filter: libraryFilter || 'all',
    p_library_mode: libraryMode,
    p_search_outcome: normalizedOutcome,
    p_tool_name: toolName,
    p_session_hash: getSessionHash(),
    p_locale: locale,
    p_confidence_label: confidenceLabel,
    p_beta_cohort: betaCohort,
    p_mcp_server_version: mcpServerVersion,
    p_latency_ms: safeLatencyMs,
    p_created_at: new Date().toISOString(),
  };
}

export async function logMcpSearchBatch({
  query,
  results,
  locale = null,
}) {
  if (!Array.isArray(results) || results.length === 0) return;

  const sessionHash = getSessionHash();
  const batchId = randomUUID();

  try {
    await callRpc('si_mark_superseded_mcp_batches', {
      p_session_hash: sessionHash,
    });

    await Promise.allSettled(results.map((result, index) => callRpc('si_log_icon_evidence', {
      p_signal_type: 'mcp_call',
      p_icon_id: `${result.library}:${result.id}`,
      p_batch_id: batchId,
      p_search_query: query || null,
      p_result_position: index + 1,
      p_ui_surface: 'local_mcp',
      p_evidence_text: locale ? `search_icons locale=${locale}` : 'search_icons',
      p_session_hash: sessionHash,
      p_created_at: new Date().toISOString(),
    })));
  } catch (error) {
    console.error('[SuperIcons] MCP telemetry failed:', error.message);
  }
}

export async function logMcpSearchAttempt({
  query,
  resultCount,
  libraryFilter = null,
  libraryMode = 'strict',
  searchOutcome = null,
  toolName = 'search_icons',
  locale = null,
  confidenceLabel = null,
  betaCohort = null,
  mcpServerVersion = null,
  latencyMs = null,
}) {
  const normalizedQuery = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const safeResultCount = Number.isFinite(resultCount) ? Math.max(0, Math.round(resultCount)) : null;
  if (!normalizedQuery || safeResultCount === null) return;

  const normalizedOutcome = String(searchOutcome || (safeResultCount > 0 ? 'results' : 'zero'))
    .trim()
    .toLowerCase();
  const safeLatencyMs = Number.isFinite(latencyMs)
    ? Math.max(0, Math.round(latencyMs))
    : null;
  const basePayload = {
    normalizedQuery,
    safeResultCount,
    libraryFilter,
    libraryMode,
    normalizedOutcome,
    toolName,
    locale,
    confidenceLabel,
    betaCohort,
    mcpServerVersion,
    safeLatencyMs,
  };

  try {
    if (isTelemetryDisabled()) return;
    const installId = await getInstallationId();
    if (!installId) {
      await callV2SearchOutcome(v2SearchOutcomePayload(basePayload));
      return;
    }

    const episodeId = randomUUID();
    const client = getMcpClientContext();
    const v3Result = await callV3SearchOutcome({
      contract_version: 3,
      install_id: installId,
      episode_id: episodeId,
      attempt_id: randomUUID(),
      recovery_chain_id: episodeId,
      query: normalizedQuery,
      result_count: safeResultCount,
      library_filter: libraryFilter || 'all',
      library_mode: libraryMode,
      search_outcome: normalizedOutcome,
      tool_name: toolName,
      locale,
      confidence_label: confidenceLabel,
      beta_cohort: betaCohort,
      mcp_server_version: mcpServerVersion,
      latency_ms: safeLatencyMs,
      client_family: client.clientFamily,
      client_version: client.clientVersion,
      os_platform: client.osPlatform,
      session_hash: getSessionHash(),
    });
    if (v3Result.fallbackToV2) {
      await callV2SearchOutcome(v2SearchOutcomePayload(basePayload));
    }
  } catch {
    console.error('[SuperIcons] MCP search-attempt telemetry failed.');
  }
}

export function resetMcpTelemetryForTests() {
  clientVersionProvider = () => null;
  persistedInstallationId = null;
  installationLoadPromise = null;
}
