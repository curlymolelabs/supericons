import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CONTRACT_VERSION = 1;
const RATE_LIMIT = 120;
const RATE_WINDOW_SECONDS = 60;
const CONTROLLED_RUN_MAX_AGE_SECONDS = 300;
const CONTROLLED_RUN_MAX_FUTURE_SKEW_SECONDS = 30;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const CONTROLLED_LABEL_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const ALLOWED_LIBRARY_MODES = new Set(['strict', 'prefer', 'all']);
const ALLOWED_STYLES = new Set(['any', 'outline', 'solid']);
const ALLOWED_HOSTED_STATES = new Set(['pending', 'success', 'zero', 'error', 'not_started']);
const ALLOWED_FINAL_OUTCOMES = new Set(['success', 'zero', 'error']);
const ALLOWED_SETTLEMENT_STATES = new Set(['completed', 'failed']);
const ALLOWED_DIAGNOSTIC_TYPES = new Set(['superseded', 'incomplete']);
const ALLOWED_COMPLETION_TRIGGERS = new Set(['idle', 'enter', 'blur']);
const ALLOWED_INTERFACE_LOCALES = new Set([
  'en',
  'zh-Hans',
  'zh-Hant',
  'ja',
  'ko',
  'es',
  'de',
  'pt',
  'ar',
  'hi',
  'vi',
  'th',
]);

type ParsedTelemetryCommon = {
  contractVersion: number;
  episodeId: string;
  recoveryChainId: string | null;
  query: string;
  libraryFilter: string;
  libraryMode: string;
  style: string;
  locale: string | null;
  interfaceLocale: string | null;
  localMatchCount: number | null;
  hostedMatchCount: number | null;
  hostedState: string;
  searchExecution: string | null;
  sourceVersion: string | null;
  diagnosticAttemptCount: number | null;
  errorCode: string | null;
};

type ParsedTelemetry = (
  | { action: 'diagnostic'; diagnosticType: string }
  | {
    action: 'final';
    finalOutcome: string;
    settlementState: string;
    finalMatchCount: number;
    completionTrigger: string;
  }
) & ParsedTelemetryCommon;

export class TelemetryHttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function readAllowedProductionHosts() {
  const configured = String(Deno.env.get('SUPERICONS_PRODUCTION_WEB_HOSTS') || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set(['supericons.dev', 'www.supericons.dev', ...configured]);
}

export function classifyOrigin(originValue: string | null) {
  let url: URL;
  try {
    url = new URL(String(originValue || ''));
  } catch {
    throw new TelemetryHttpError(403, 'web_telemetry_origin_required', 'A recognized website origin is required.');
  }

  const hostname = url.hostname.toLowerCase();
  const productionHosts = readAllowedProductionHosts();
  if (url.protocol === 'https:' && productionHosts.has(hostname)) {
    return { origin: url.origin, environment: 'production', trafficClass: 'unclassified_live' };
  }
  if (url.protocol === 'https:' && hostname.endsWith('.netlify.app')) {
    return { origin: url.origin, environment: 'preview', trafficClass: 'preview' };
  }
  if (
    (url.protocol === 'http:' || url.protocol === 'https:')
    && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
  ) {
    return { origin: url.origin, environment: 'local', trafficClass: 'local' };
  }
  throw new TelemetryHttpError(403, 'web_telemetry_origin_forbidden', 'This website origin is not allowed.');
}

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': [
      'authorization',
      'apikey',
      'content-type',
      'x-supericons-controlled-run-label',
      'x-supericons-controlled-run-timestamp',
      'x-supericons-controlled-run-signature',
    ].join(', '),
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(
  origin: string | null,
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
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

function normalizeUuid(value: unknown, fieldName: string) {
  const text = String(value || '').trim().toLowerCase();
  if (!UUID_PATTERN.test(text)) {
    throw new TelemetryHttpError(400, 'web_telemetry_invalid_id', `${fieldName} must be a random UUID.`);
  }
  return text;
}

function optionalUuid(value: unknown, fieldName: string) {
  if (value === null || value === undefined || value === '') return null;
  return normalizeUuid(value, fieldName);
}

function normalizeCount(value: unknown, fieldName: string, { required = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (required) {
      throw new TelemetryHttpError(400, 'web_telemetry_count_required', `${fieldName} is required.`);
    }
    return null;
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0 || count > 100000) {
    throw new TelemetryHttpError(400, 'web_telemetry_invalid_count', `${fieldName} must be a nonnegative integer.`);
  }
  return count;
}

function normalizeInterfaceLocale(value: unknown) {
  const locale = String(value || '').trim();
  return ALLOWED_INTERFACE_LOCALES.has(locale) ? locale : null;
}

export function parsePayload(value: unknown): ParsedTelemetry {
  const body = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  if (Number(body.contract_version) !== CONTRACT_VERSION) {
    throw new TelemetryHttpError(400, 'web_telemetry_contract_unsupported', 'Unsupported telemetry contract version.');
  }

  const action = String(body.action || '').trim().toLowerCase();
  if (!['final', 'diagnostic'].includes(action)) {
    throw new TelemetryHttpError(400, 'web_telemetry_action_invalid', 'Telemetry action must be final or diagnostic.');
  }

  const query = normalizeText(body.query, 500);
  if (!query || query.length < 3) {
    throw new TelemetryHttpError(400, 'web_telemetry_query_invalid', 'A search query of at least three characters is required.');
  }

  const libraryMode = normalizeToken(body.library_mode, 20);
  if (libraryMode && !ALLOWED_LIBRARY_MODES.has(libraryMode)) {
    throw new TelemetryHttpError(400, 'web_telemetry_library_mode_invalid', 'Unsupported library mode.');
  }
  const style = normalizeToken(body.style, 20);
  if (style && !ALLOWED_STYLES.has(style)) {
    throw new TelemetryHttpError(400, 'web_telemetry_style_invalid', 'Unsupported icon style.');
  }
  const hostedState = normalizeToken(body.hosted_state, 20);
  if (hostedState && !ALLOWED_HOSTED_STATES.has(hostedState)) {
    throw new TelemetryHttpError(400, 'web_telemetry_hosted_state_invalid', 'Unsupported hosted state.');
  }

  const common = {
    action,
    contractVersion: CONTRACT_VERSION,
    episodeId: normalizeUuid(body.episode_id, 'episode_id'),
    recoveryChainId: optionalUuid(body.recovery_chain_id, 'recovery_chain_id'),
    query,
    libraryFilter: normalizeToken(body.library_filter, 80) || 'all',
    libraryMode: libraryMode || 'all',
    style: style || 'any',
    locale: normalizeText(body.locale, 32),
    interfaceLocale: normalizeInterfaceLocale(body.interface_locale),
    localMatchCount: normalizeCount(body.local_match_count, 'local_match_count'),
    hostedMatchCount: normalizeCount(body.hosted_match_count, 'hosted_match_count'),
    hostedState: hostedState || 'not_started',
    searchExecution: normalizeToken(body.search_execution, 80),
    sourceVersion: normalizeText(body.source_version, 120),
    diagnosticAttemptCount: normalizeCount(body.diagnostic_attempt_count, 'diagnostic_attempt_count'),
    errorCode: normalizeToken(body.error_code, 80),
  };

  if (action === 'diagnostic') {
    const diagnosticType = normalizeToken(body.diagnostic_type, 30);
    if (!diagnosticType || !ALLOWED_DIAGNOSTIC_TYPES.has(diagnosticType)) {
      throw new TelemetryHttpError(400, 'web_telemetry_diagnostic_invalid', 'Unsupported diagnostic type.');
    }
    return { ...common, action: 'diagnostic', diagnosticType };
  }

  const finalOutcome = normalizeToken(body.final_outcome, 20);
  const settlementState = normalizeToken(body.settlement_state, 20);
  const completionTrigger = normalizeToken(body.completion_trigger, 20);
  const finalMatchCount = normalizeCount(
    body.final_match_count,
    'final_match_count',
    { required: true },
  ) as number;
  if (!finalOutcome || !ALLOWED_FINAL_OUTCOMES.has(finalOutcome)) {
    throw new TelemetryHttpError(400, 'web_telemetry_outcome_invalid', 'Unsupported final outcome.');
  }
  if (!settlementState || !ALLOWED_SETTLEMENT_STATES.has(settlementState)) {
    throw new TelemetryHttpError(400, 'web_telemetry_settlement_invalid', 'Unsupported settlement state.');
  }
  if (!completionTrigger || !ALLOWED_COMPLETION_TRIGGERS.has(completionTrigger)) {
    throw new TelemetryHttpError(400, 'web_telemetry_completion_trigger_invalid', 'Unsupported completion trigger.');
  }
  if (finalOutcome === 'success' && finalMatchCount === 0) {
    throw new TelemetryHttpError(400, 'web_telemetry_outcome_mismatch', 'A successful outcome requires at least one match.');
  }
  if (finalOutcome !== 'success' && finalMatchCount !== 0) {
    throw new TelemetryHttpError(400, 'web_telemetry_outcome_mismatch', 'Zero and error outcomes cannot contain matches.');
  }
  if (finalOutcome === 'zero' && (settlementState !== 'completed' || common.hostedState !== 'zero')) {
    throw new TelemetryHttpError(400, 'web_telemetry_false_zero', 'A final zero requires completed hosted work with no matches.');
  }
  if (finalOutcome === 'error' && settlementState !== 'failed') {
    throw new TelemetryHttpError(400, 'web_telemetry_error_state_invalid', 'An error outcome requires failed settlement.');
  }

  return {
    ...common,
    action: 'final',
    finalOutcome,
    settlementState,
    finalMatchCount,
    completionTrigger,
  };
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256Hex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
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

export async function verifyControlledRun(req: Request) {
  const secret = String(Deno.env.get('SUPERICONS_CONTROLLED_RUN_SECRET') || '');
  if (secret.length < 32) return { valid: false, label: null };

  const label = String(req.headers.get('x-supericons-controlled-run-label') || '').trim().toLowerCase();
  const timestampText = String(req.headers.get('x-supericons-controlled-run-timestamp') || '').trim();
  const signature = String(req.headers.get('x-supericons-controlled-run-signature') || '').trim().toLowerCase();
  if (
    !CONTROLLED_LABEL_PATTERN.test(label)
    || !/^\d{10}$/.test(timestampText)
    || !HASH_PATTERN.test(signature)
  ) {
    return { valid: false, label: null };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const timestamp = Number(timestampText);
  if (
    timestamp > nowSeconds + CONTROLLED_RUN_MAX_FUTURE_SKEW_SECONDS
    || nowSeconds - timestamp > CONTROLLED_RUN_MAX_AGE_SECONDS
  ) {
    return { valid: false, label: null };
  }

  const expected = await hmacSha256Hex(secret, `${timestampText}.${label}`);
  return constantTimeEqual(signature, expected)
    ? { valid: true, label }
    : { valid: false, label: null };
}

function getClientIp(req: Request) {
  const candidates = [
    req.headers.get('cf-connecting-ip'),
    req.headers.get('true-client-ip'),
    req.headers.get('x-forwarded-for')?.split(',')[0],
    req.headers.get('x-real-ip'),
  ];
  return candidates.map((value) => String(value || '').trim()).find(Boolean) || 'unavailable';
}

function normalizeCountryCode(value: unknown) {
  const countryCode = String(value || '').trim().toUpperCase();
  return COUNTRY_PATTERN.test(countryCode) && !['XX', 'ZZ', 'T1'].includes(countryCode)
    ? countryCode
    : null;
}

async function buildPrivateIdentity(req: Request) {
  const secret = String(
    Deno.env.get('SUPERICONS_TELEMETRY_HASH_SECRET')
    || Deno.env.get('SUPERICONS_CONTROLLED_RUN_SECRET')
    || '',
  );
  if (secret.length < 32) {
    throw new TelemetryHttpError(503, 'web_telemetry_secret_unavailable', 'Telemetry is temporarily unavailable.');
  }
  const clientIp = getClientIp(req);
  const userAgent = String(req.headers.get('user-agent') || '').slice(0, 500);
  const month = new Date().toISOString().slice(0, 7);
  return {
    rateSubjectHash: await hmacSha256Hex(secret, `rate|${clientIp}`),
    anonymousClientHash: await hmacSha256Hex(secret, `client|${clientIp}|${userAgent}|${month}`),
    clientIpPublic: clientIp !== 'unavailable',
  };
}

async function resolveSignedInUser(adminClient: any, req: Request) {
  const authorization = String(req.headers.get('authorization') || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) return null;
  try {
    const { data, error } = await adminClient.auth.getUser(match[1]);
    return error ? null : data?.user?.id || null;
  } catch {
    return null;
  }
}

export async function countLinkedDiagnosticAttempts(adminClient: any, episodeId: string) {
  const { count, error } = await adminClient
    .from('search_request_audit')
    .select('id', { count: 'exact', head: true })
    .eq('episode_id', episodeId);
  if (error) throw error;
  return Number(count || 0);
}

export async function resolveLinkedWebCountry(
  adminClient: any,
  episodeId: string,
  environment: string,
) {
  try {
    const { data, error } = await adminClient
      .from('search_request_audit')
      .select('country_code,geo_source')
      .eq('episode_id', episodeId)
      .eq('channel', 'web')
      .eq('environment', environment);
    if (error) {
      console.warn('[Web Search Telemetry] linked_country_query_failed');
      return { countryCode: null, geoSource: null };
    }

    const linkedRows = Array.isArray(data) ? data : [];
    const countryCodes = [...new Set(
      linkedRows
        .map((row) => normalizeCountryCode(row?.country_code))
        .filter(Boolean),
    )];
    if (countryCodes.length !== 1) {
      return { countryCode: null, geoSource: null };
    }

    const countryCode = countryCodes[0];
    const geoSources = [...new Set(
      linkedRows
        .filter((row) => normalizeCountryCode(row?.country_code) === countryCode)
        .map((row) => normalizeText(row?.geo_source, 64))
        .filter(Boolean),
    )];
    return {
      countryCode,
      geoSource: geoSources.length === 1 ? geoSources[0] : null,
    };
  } catch {
    console.warn('[Web Search Telemetry] linked_country_query_failed');
    return { countryCode: null, geoSource: null };
  }
}

export async function handleWebSearchTelemetryRequest(req: Request) {
  const rawOrigin = req.headers.get('origin');
  let classifiedOrigin: ReturnType<typeof classifyOrigin> | null = null;
  try {
    classifiedOrigin = classifyOrigin(rawOrigin);
  } catch (error) {
    if (req.method === 'OPTIONS') {
      return jsonResponse(null, { error: 'web_telemetry_origin_forbidden' }, 403);
    }
    const known = error instanceof TelemetryHttpError
      ? error
      : new TelemetryHttpError(403, 'web_telemetry_origin_forbidden', 'This website origin is not allowed.');
    return jsonResponse(null, { error: known.code, message: known.message }, known.status);
  }

  const origin = classifiedOrigin.origin;
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== 'POST') {
    return jsonResponse(origin, { error: 'method_not_allowed', message: 'Use POST.' }, 405, { Allow: 'POST,OPTIONS' });
  }

  try {
    const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '');
    const serviceRoleKey = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    if (!supabaseUrl || !serviceRoleKey) {
      throw new TelemetryHttpError(503, 'web_telemetry_store_unavailable', 'Telemetry is temporarily unavailable.');
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signedInUserId = await resolveSignedInUser(adminClient, req);

    const { data: settings, error: settingsError } = await adminClient
      .from('search_telemetry_settings')
      .select('web_ingestion_enabled')
      .eq('setting_id', 'active')
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (settings?.web_ingestion_enabled !== true) {
      return jsonResponse(origin, { accepted: false, disabled: true }, 202);
    }

    const identity = await buildPrivateIdentity(req);
    const { data: rateRows, error: rateError } = await adminClient.rpc(
      'si_take_web_search_telemetry_rate_limit',
      {
        p_subject_hash: identity.rateSubjectHash,
        p_limit: RATE_LIMIT,
        p_window_seconds: RATE_WINDOW_SECONDS,
      },
    );
    if (rateError) throw rateError;
    const rateState = Array.isArray(rateRows) ? rateRows[0] : rateRows;
    if (rateState?.allowed !== true) {
      const retryAfter = Math.max(1, Number(rateState?.retry_after_seconds || RATE_WINDOW_SECONDS));
      return jsonResponse(
        origin,
        { error: 'web_telemetry_rate_limited', message: 'Too many telemetry requests.' },
        429,
        { 'Retry-After': String(retryAfter) },
      );
    }

    const parsed = parsePayload(await req.json());
    const controlledRun = await verifyControlledRun(req);
    const environment = controlledRun.valid ? 'test' : classifiedOrigin.environment;
    const trafficClass = controlledRun.valid ? 'controlled_test' : classifiedOrigin.trafficClass;
    const serverBuild = normalizeText(
      Deno.env.get('DENO_DEPLOYMENT_ID')
      || Deno.env.get('SUPABASE_DEPLOYMENT_ID')
      || null,
      120,
    );

    if (parsed.action === 'diagnostic') {
      const { error } = await adminClient
        .from('search_episode_diagnostics')
        .upsert({
          contract_version: CONTRACT_VERSION,
          episode_id: parsed.episodeId,
          recovery_chain_id: parsed.recoveryChainId,
          diagnostic_type: parsed.diagnosticType,
          channel: 'web',
          query: parsed.query,
          local_match_count: parsed.localMatchCount,
          hosted_match_count: parsed.hostedMatchCount,
          hosted_state: parsed.hostedState,
          search_execution: parsed.searchExecution,
          error_code: parsed.errorCode,
          environment,
          traffic_class: trafficClass,
          source_version: parsed.sourceVersion,
          observed_at: new Date().toISOString(),
          metadata: {
            controlled_run_label: controlledRun.label,
            interface_locale: parsed.interfaceLocale,
          },
        }, {
          onConflict: 'episode_id,diagnostic_type',
        });
      if (error) throw error;
      return jsonResponse(origin, { accepted: true, kind: 'diagnostic' }, 202);
    }

    const linkedDiagnosticAttemptCount = await countLinkedDiagnosticAttempts(
      adminClient,
      parsed.episodeId,
    );
    const linkedCountry = await resolveLinkedWebCountry(
      adminClient,
      parsed.episodeId,
      environment,
    );

    const { error } = await adminClient
      .from('search_final_outcomes')
      .upsert({
        contract_version: CONTRACT_VERSION,
        episode_id: parsed.episodeId,
        recovery_chain_id: parsed.recoveryChainId,
        channel: 'web',
        query: parsed.query,
        environment,
        traffic_class: trafficClass,
        client_family: 'browser',
        tool_name: null,
        library_filter: parsed.libraryFilter,
        library_mode: parsed.libraryMode,
        style: parsed.style,
        locale: parsed.locale,
        interface_locale: parsed.interfaceLocale,
        final_match_count: parsed.finalMatchCount,
        final_outcome: parsed.finalOutcome,
        settlement_state: parsed.settlementState,
        search_execution: parsed.searchExecution,
        server_build: serverBuild,
        diagnostic_attempt_count: linkedDiagnosticAttemptCount,
        legacy_identity_quality: 'exact',
        source_version: parsed.sourceVersion,
        anonymous_client_hash: identity.anonymousClientHash,
        user_id: signedInUserId,
        is_registered: Boolean(signedInUserId),
        client_ip_public: identity.clientIpPublic,
        country_code: linkedCountry.countryCode,
        geo_source: linkedCountry.geoSource,
        completed_at: new Date().toISOString(),
        metadata: {
          local_match_count: parsed.localMatchCount,
          hosted_match_count: parsed.hostedMatchCount,
          hosted_state: parsed.hostedState,
          completion_trigger: parsed.completionTrigger,
          controlled_run_label: controlledRun.label,
        },
      }, {
        onConflict: 'episode_id',
        ignoreDuplicates: true,
      });
    if (error) throw error;

    return jsonResponse(origin, { accepted: true, kind: 'final' }, 202);
  } catch (error) {
    const known = error instanceof TelemetryHttpError
      ? error
      : new TelemetryHttpError(503, 'web_telemetry_write_failed', 'Telemetry is temporarily unavailable.');
    console.warn('[Web Search Telemetry]', known.code);
    return jsonResponse(origin, { error: known.code, message: known.message }, known.status);
  }
}

if (import.meta.main) {
  serve(handleWebSearchTelemetryRequest);
}
