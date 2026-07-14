import { createHash, randomUUID } from 'crypto';
import { SUPABASE_ANON, SUPABASE_URL } from './auth.js';

const PROCESS_SESSION_TOKEN = randomUUID();

function isTelemetryDisabled() {
  const disableFlag = String(process.env.SUPERICONS_DISABLE_TELEMETRY || '').trim().toLowerCase();
  const telemetryFlag = String(process.env.SUPERICONS_TELEMETRY || '').trim().toLowerCase();
  const doNotTrack = String(process.env.DO_NOT_TRACK || '').trim().toLowerCase();

  return disableFlag === '1'
    || disableFlag === 'true'
    || disableFlag === 'on'
    || telemetryFlag === '0'
    || telemetryFlag === 'false'
    || telemetryFlag === 'off'
    || telemetryFlag === 'disabled'
    || doNotTrack === '1'
    || doNotTrack === 'true';
}

function getSessionHash() {
  const today = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${PROCESS_SESSION_TOKEN}|${today}`)
    .digest('hex');
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
  });

  if (!response.ok) {
    throw new Error(`RPC ${name} failed (${response.status})`);
  }
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
        p_ui_surface: 'mcp',
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

  try {
    await callRpc('si_log_mcp_search_outcome_v2', {
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
    });
  } catch (error) {
    console.error('[SuperIcons] MCP search-attempt telemetry failed:', error.message);
  }
}
