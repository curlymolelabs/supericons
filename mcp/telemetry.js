import { createHash, randomUUID } from 'crypto';
import { SUPABASE_ANON, SUPABASE_URL } from './auth.js';

const PROCESS_SESSION_TOKEN = randomUUID();

function getSessionHash() {
  const today = new Date().toISOString().slice(0, 10);
  return createHash('sha256')
    .update(`${PROCESS_SESSION_TOKEN}|${today}`)
    .digest('hex');
}

async function callRpc(name, payload) {
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
  locale = null,
}) {
  const normalizedQuery = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const safeResultCount = Number.isFinite(resultCount) ? Math.max(0, Math.round(resultCount)) : null;
  if (!normalizedQuery || safeResultCount === null) return;

  try {
    await callRpc('si_log_icon_evidence', {
      p_signal_type: 'search_attempt',
      p_search_query: normalizedQuery,
      p_result_count: safeResultCount,
      p_library_filter: libraryFilter || 'all',
      p_ui_surface: 'mcp',
      p_evidence_text: locale ? `search_icons locale=${locale}` : 'search_icons',
      p_session_hash: getSessionHash(),
      p_created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SuperIcons] MCP search-attempt telemetry failed:', error.message);
  }
}
