import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CONTRACT_VERSION = 3;
const MAX_BODY_BYTES = 8192;
const RATE_LIMIT = 120;
const RATE_WINDOW_SECONDS = 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CLIENT_TOKEN_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const ALLOWED_LIBRARY_MODES = new Set(['strict', 'prefer', 'all']);
const ALLOWED_OUTCOMES = new Set(['results', 'clarification', 'zero', 'error']);
const ALLOWED_TOOLS = new Set(['search_icons', 'recommend_icons']);
const ALLOWED_CONFIDENCE = new Set(['low', 'medium', 'high']);
const ALLOWED_PLATFORMS = new Set(['win32', 'darwin', 'linux', 'other']);

type ParsedPayload = {
  installId: string;
  episodeId: string;
  attemptId: string;
  recoveryChainId: string;
  query: string;
  resultCount: number;
  libraryFilter: string;
  libraryMode: string;
  searchOutcome: string;
  toolName: string;
  locale: string | null;
  confidenceLabel: string | null;
  betaCohort: string | null;
  mcpServerVersion: string | null;
  latencyMs: number | null;
  clientFamily: string;
  clientVersion: string | null;
  osPlatform: string;
  sessionHash: string | null;
};

export class LocalTelemetryHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

function normalizeText(value: unknown, maxLength: number) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, maxLength) : null;
}

function normalizeToken(value: unknown, maxLength: number) {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return text ? text.slice(0, maxLength) : null;
}

function requiredUuid(value: unknown, fieldName: string) {
  const text = String(value || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(text)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_invalid_id',
      `${fieldName} must be a random UUID.`,
    );
  }
  return text;
}

function normalizeInteger(
  value: unknown,
  fieldName: string,
  maxValue: number,
  { nullable = false } = {},
) {
  if (nullable && (value === null || value === undefined || value === '')) return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > maxValue) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_invalid_number',
      `${fieldName} is outside the supported range.`,
    );
  }
  return number;
}

export function parseLocalTelemetryPayload(value: unknown): ParsedPayload {
  const body = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  if (Number(body.contract_version) !== CONTRACT_VERSION) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_contract_unsupported',
      'Unsupported telemetry contract version.',
    );
  }

  const query = normalizeText(body.query, 500);
  if (!query) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_query_required',
      'A search query is required.',
    );
  }

  const libraryMode = normalizeToken(body.library_mode, 20);
  const searchOutcome = normalizeToken(body.search_outcome, 20);
  const toolName = normalizeToken(body.tool_name, 40);
  const confidenceLabel = normalizeToken(body.confidence_label, 20);
  const clientFamily = normalizeToken(body.client_family, 64) || 'unknown';
  const osPlatform = normalizeToken(body.os_platform, 20) || 'other';
  const sessionHash = normalizeToken(body.session_hash, 64);

  if (!libraryMode || !ALLOWED_LIBRARY_MODES.has(libraryMode)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_library_mode_invalid',
      'Unsupported library mode.',
    );
  }
  if (!searchOutcome || !ALLOWED_OUTCOMES.has(searchOutcome)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_outcome_invalid',
      'Unsupported search outcome.',
    );
  }
  if (!toolName || !ALLOWED_TOOLS.has(toolName)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_tool_invalid',
      'Unsupported tool name.',
    );
  }
  if (confidenceLabel && !ALLOWED_CONFIDENCE.has(confidenceLabel)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_confidence_invalid',
      'Unsupported confidence label.',
    );
  }
  if (!CLIENT_TOKEN_PATTERN.test(clientFamily)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_client_invalid',
      'The MCP client name is invalid.',
    );
  }
  if (!ALLOWED_PLATFORMS.has(osPlatform)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_platform_invalid',
      'The operating system platform is invalid.',
    );
  }
  if (sessionHash && !HASH_PATTERN.test(sessionHash)) {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_session_invalid',
      'The session identifier is invalid.',
    );
  }

  return {
    installId: requiredUuid(body.install_id, 'install_id'),
    episodeId: requiredUuid(body.episode_id, 'episode_id'),
    attemptId: requiredUuid(body.attempt_id, 'attempt_id'),
    recoveryChainId: requiredUuid(body.recovery_chain_id, 'recovery_chain_id'),
    query,
    resultCount: normalizeInteger(
      body.result_count,
      'result_count',
      100000,
    ) as number,
    libraryFilter: normalizeToken(body.library_filter, 80) || 'all',
    libraryMode,
    searchOutcome,
    toolName,
    locale: normalizeText(body.locale, 32),
    confidenceLabel,
    betaCohort: normalizeToken(body.beta_cohort, 80),
    mcpServerVersion: normalizeText(body.mcp_server_version, 40),
    latencyMs: normalizeInteger(body.latency_ms, 'latency_ms', 600000, {
      nullable: true,
    }),
    clientFamily,
    clientVersion: normalizeText(body.client_version, 40),
    osPlatform,
    sessionHash,
  };
}

export function normalizeTrustedCountry(value: unknown) {
  const country = String(value || '').trim().toUpperCase();
  return COUNTRY_PATTERN.test(country) && !['XX', 'ZZ', 'T1'].includes(country)
    ? country
    : null;
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(signature));
}

export function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

async function readLimitedJson(req: Request) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    throw new LocalTelemetryHttpError(
      413,
      'local_telemetry_body_too_large',
      'The telemetry request is too large.',
    );
  }

  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new LocalTelemetryHttpError(
        413,
        'local_telemetry_body_too_large',
        'The telemetry request is too large.',
      );
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new LocalTelemetryHttpError(
      400,
      'local_telemetry_json_invalid',
      'The telemetry request is not valid JSON.',
    );
  }
}

export async function handleLocalMcpTelemetryRequest(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse(
      { error: 'method_not_allowed', message: 'Use POST.' },
      405,
    );
  }
  if (
    !String(req.headers.get('content-type') || '')
      .toLowerCase()
      .startsWith('application/json')
  ) {
    return jsonResponse(
      {
        error: 'local_telemetry_content_type_invalid',
        message: 'Send JSON.',
      },
      415,
    );
  }

  try {
    const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '');
    const serviceRoleKey = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const expectedAnonKey = String(Deno.env.get('SUPABASE_ANON_KEY') || '');
    const installSecret = String(
      Deno.env.get('SUPERICONS_LOCAL_INSTALL_HASH_SECRET') || '',
    );
    const installKeyVersion = Number(
      Deno.env.get('SUPERICONS_LOCAL_INSTALL_HASH_KEY_VERSION') || 0,
    );
    const suppliedApiKey = String(req.headers.get('apikey') || '');

    if (
      !supabaseUrl
      || !serviceRoleKey
      || expectedAnonKey.length < 32
      || installSecret.length < 32
      || !Number.isInteger(installKeyVersion)
      || installKeyVersion < 1
      || installKeyVersion > 999
    ) {
      throw new LocalTelemetryHttpError(
        503,
        'local_telemetry_unavailable',
        'Telemetry is temporarily unavailable.',
      );
    }
    if (!constantTimeEqual(suppliedApiKey, expectedAnonKey)) {
      throw new LocalTelemetryHttpError(
        401,
        'local_telemetry_unauthorized',
        'Telemetry authorization failed.',
      );
    }

    const parsed = parseLocalTelemetryPayload(await readLimitedJson(req));
    const installHash = await hmacSha256Hex(
      installSecret,
      `install|v${installKeyVersion}|${parsed.installId}`,
    );
    const rateSubjectHash = await hmacSha256Hex(
      installSecret,
      `rate|v${installKeyVersion}|${parsed.installId}`,
    );
    const countryCode = normalizeTrustedCountry(req.headers.get('cf-ipcountry'));
    const geoSource = countryCode ? 'supabase_edge_cf' : null;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: rateRows, error: rateError } = await adminClient.rpc(
      'si_take_web_search_telemetry_rate_limit',
      {
        p_subject_hash: rateSubjectHash,
        p_limit: RATE_LIMIT,
        p_window_seconds: RATE_WINDOW_SECONDS,
      },
    );
    if (rateError) throw rateError;
    const rateState = Array.isArray(rateRows) ? rateRows[0] : rateRows;
    if (rateState?.allowed !== true) {
      return jsonResponse(
        {
          error: 'local_telemetry_rate_limited',
          message: 'Too many telemetry requests.',
        },
        429,
      );
    }

    const { data, error } = await adminClient.rpc(
      'si_ingest_local_mcp_search_outcome_v3',
      {
        p_install_hash: installHash,
        p_install_key_version: installKeyVersion,
        p_episode_id: parsed.episodeId,
        p_attempt_id: parsed.attemptId,
        p_recovery_chain_id: parsed.recoveryChainId,
        p_query_norm: parsed.query,
        p_result_count: parsed.resultCount,
        p_library_filter: parsed.libraryFilter,
        p_library_mode: parsed.libraryMode,
        p_search_outcome: parsed.searchOutcome,
        p_tool_name: parsed.toolName,
        p_locale: parsed.locale,
        p_confidence_label: parsed.confidenceLabel,
        p_beta_cohort: parsed.betaCohort,
        p_mcp_server_version: parsed.mcpServerVersion,
        p_latency_ms: parsed.latencyMs,
        p_client_family: parsed.clientFamily,
        p_client_version: parsed.clientVersion,
        p_os_platform: parsed.osPlatform,
        p_country_code: countryCode,
        p_geo_source: geoSource,
        p_session_hash: parsed.sessionHash,
      },
    );
    if (error) throw error;

    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, unknown>
      : {};
    return jsonResponse({
      accepted: true,
      duplicate: result.duplicate === true,
    }, 202);
  } catch (error) {
    const known = error instanceof LocalTelemetryHttpError
      ? error
      : new LocalTelemetryHttpError(
        503,
        'local_telemetry_write_failed',
        'Telemetry is temporarily unavailable.',
      );
    console.warn('[Local MCP Telemetry]', known.code);
    return jsonResponse({ error: known.code, message: known.message }, known.status);
  }
}

if (import.meta.main) {
  Deno.serve(handleLocalMcpTelemetryRequest);
}
