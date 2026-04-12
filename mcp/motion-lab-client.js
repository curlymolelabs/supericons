import { hashApiKey, getConfiguredApiKey, SUPABASE_ANON, SUPABASE_URL } from './auth.js';

const HOSTED_FUNCTIONS_BASE_URL = (process.env.SUPERICONS_MOTION_LAB_BASE_URL || `${SUPABASE_URL}/functions/v1`).replace(/\/+$/, '');
const SESSION_ENDPOINT = `${HOSTED_FUNCTIONS_BASE_URL}/motion-lab-session`;
const RECIPE_ENDPOINT = `${HOSTED_FUNCTIONS_BASE_URL}/motion-lab-recipe`;
const CSS_ENDPOINT = `${HOSTED_FUNCTIONS_BASE_URL}/motion-lab-render-css`;
const ANIMATED_SVG_ENDPOINT = `${HOSTED_FUNCTIONS_BASE_URL}/motion-lab-render-animated-svg`;
const LOCAL_WORKFLOW_MODULE_URL = new URL('../lib/motion-lab-workflow.js', import.meta.url);
const PLACEHOLDER_SELECTOR = '{{ICON_SELECTOR}}';
const MCP_CLIENT_VERSION = '0.3.0';

class MotionLabClientError extends Error {
  constructor(message, {
    code = 'motion_lab_service_unavailable',
    status = 503,
    hint = 'Retry when the Motion Lab service is available.',
    retryable = true,
    retryAfterSeconds = null,
    limitScope = null,
    cause = null,
  } = {}) {
    super(message);
    this.name = 'MotionLabClientError';
    this.code = code;
    this.status = status;
    this.hint = hint;
    this.retryable = retryable;
    this.retry_after_seconds = typeof retryAfterSeconds === 'number' ? retryAfterSeconds : null;
    this.limit_scope = typeof limitScope === 'string' ? limitScope : null;
    this.cause = cause;
  }
}

let cachedSession = null;
let localFallbackWarningShown = false;

function normalizeErrorFromBody(body, status) {
  if (status === 404) {
    return new MotionLabClientError('Motion Lab hosted endpoint is not available.', {
      code: 'motion_lab_service_unavailable',
      status,
      hint: 'Deploy the Motion Lab hosted functions or use the repo-local fallback during development.',
      retryable: true,
    });
  }

  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return new MotionLabClientError(
      typeof body.message === 'string' ? body.message : `Motion Lab request failed (${status}).`,
      {
        code: typeof body.error === 'string' ? body.error : 'motion_lab_service_unavailable',
        status,
        hint: typeof body.hint === 'string' ? body.hint : 'Retry when the Motion Lab service is available.',
        retryable: typeof body.retryable === 'boolean' ? body.retryable : status >= 500,
        retryAfterSeconds: typeof body.retry_after_seconds === 'number' ? body.retry_after_seconds : null,
        limitScope: typeof body.limit_scope === 'string' ? body.limit_scope : null,
      }
    );
  }

  return new MotionLabClientError(`Motion Lab request failed (${status}).`, {
    status,
    retryable: status >= 500,
  });
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getExpiryTimestamp(expiresAt) {
  const expiry = Date.parse(expiresAt || '');
  return Number.isFinite(expiry) ? expiry : 0;
}

function isSessionFresh(session) {
  if (!session?.sessionToken || !session?.expiresAtMs) return false;
  return session.expiresAtMs - Date.now() > 30_000;
}

async function exchangeSessionToken() {
  const apiKey = getConfiguredApiKey();
  if (!apiKey) {
    throw new MotionLabClientError('Motion Lab MCP requires SUPERICONS_API_KEY for premium calls.', {
      code: 'motion_lab_auth_required',
      status: 401,
      hint: 'Set SUPERICONS_API_KEY before using Motion Lab MCP premium tools.',
      retryable: false,
    });
  }

  const api_key_hash = await hashApiKey(apiKey);

  let response;
  try {
    response = await fetch(SESSION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({
        api_key_hash,
        client: {
          surface: 'mcp',
          version: MCP_CLIENT_VERSION,
        },
      }),
    });
  } catch (error) {
    throw new MotionLabClientError('Motion Lab session exchange failed.', {
      cause: error,
      retryable: true,
    });
  }

  const body = await readJsonResponse(response);
  if (!response.ok) {
    throw normalizeErrorFromBody(body, response.status);
  }

  const sessionToken = body?.session_token;
  const expiresAt = body?.expires_at;
  if (typeof sessionToken !== 'string' || typeof expiresAt !== 'string') {
    throw new MotionLabClientError('Motion Lab session exchange returned an invalid payload.', {
      retryable: false,
    });
  }

  cachedSession = {
    sessionToken,
    expiresAtMs: getExpiryTimestamp(expiresAt),
  };
  return cachedSession.sessionToken;
}

async function getSessionToken(forceRefresh = false) {
  if (!forceRefresh && isSessionFresh(cachedSession)) {
    return cachedSession.sessionToken;
  }
  return exchangeSessionToken();
}

async function callHostedMotionLab(endpoint, body) {
  let token = await getSessionToken();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new MotionLabClientError('Motion Lab hosted call failed.', {
        cause: error,
        retryable: true,
      });
    }

    const responseBody = await readJsonResponse(response);
    if (response.ok) {
      return responseBody;
    }

    if (response.status === 401 && attempt === 0) {
      token = await getSessionToken(true);
      continue;
    }

    throw normalizeErrorFromBody(responseBody, response.status);
  }

  throw new MotionLabClientError('Motion Lab hosted call failed after token refresh.', {
    retryable: true,
  });
}

async function loadLocalFallbackModule() {
  try {
    return await import(LOCAL_WORKFLOW_MODULE_URL.href);
  } catch {
    return null;
  }
}

function shouldFallbackToLocal(error) {
  if (process.env.SUPERICONS_MOTION_LAB_LOCAL_FALLBACK === '0') {
    return false;
  }
  return Boolean(error?.retryable);
}

async function withOptionalLocalFallback(hostedCall, localResolver) {
  try {
    return await hostedCall();
  } catch (error) {
    if (!shouldFallbackToLocal(error)) {
      throw error;
    }
    const localWorkflow = await loadLocalFallbackModule();
    if (!localWorkflow) {
      throw error;
    }
    if (!localFallbackWarningShown) {
      console.error('[Motion Lab MCP] Hosted premium path unavailable, using local workflow fallback in this repo checkout.');
      localFallbackWarningShown = true;
    }
    return localResolver(localWorkflow);
  }
}

function replaceLegacyCssSelector(css, selector) {
  return css.replace(/#icon-container svg/g, selector);
}

function buildLocalCssResponse(localWorkflow, { preset, trigger, duration_ms, intensity_percent, selector = null }) {
  const recipe = localWorkflow.buildMotionLabRecipe({
    presetId: preset,
    trigger,
    durationMs: duration_ms,
    intensityPercent: intensity_percent,
  });
  const cssSelector = selector || PLACEHOLDER_SELECTOR;
  return {
    recipe: {
      preset_id: recipe.preset_id,
      preset: recipe.preset,
      group: recipe.group,
    },
    css: replaceLegacyCssSelector(
      localWorkflow.buildMotionLabExternalCss({
        presetId: preset,
        trigger,
        durationMs: duration_ms,
        intensityPercent: intensity_percent,
      }),
      cssSelector
    ),
    selector_mode: selector ? 'literal' : 'placeholder',
    ...(selector ? {} : { selector_token: PLACEHOLDER_SELECTOR }),
  };
}

export async function getMotionLabRecipeHosted({ preset, trigger = 'loop', duration_ms = 500, intensity_percent = 100 }) {
  return withOptionalLocalFallback(
    async () => {
      const response = await callHostedMotionLab(RECIPE_ENDPOINT, {
        preset,
        trigger,
        duration_ms,
        intensity_percent,
      });
      return response.recipe;
    },
    async (localWorkflow) => localWorkflow.buildMotionLabRecipe({
      presetId: preset,
      trigger,
      durationMs: duration_ms,
      intensityPercent: intensity_percent,
    })
  );
}

export async function renderMotionLabCssHosted({ preset, trigger = 'loop', duration_ms = 500, intensity_percent = 100, selector = null }) {
  return withOptionalLocalFallback(
    async () => callHostedMotionLab(CSS_ENDPOINT, {
      preset,
      trigger,
      duration_ms,
      intensity_percent,
      ...(selector ? { selector } : {}),
    }),
    async (localWorkflow) => buildLocalCssResponse(localWorkflow, {
      preset,
      trigger,
      duration_ms,
      intensity_percent,
      selector,
    })
  );
}

export async function renderMotionLabAnimatedSvgHosted({ svg, preset, trigger = 'loop', duration_ms = 500, intensity_percent = 100, color = null }) {
  return withOptionalLocalFallback(
    async () => callHostedMotionLab(ANIMATED_SVG_ENDPOINT, {
      svg,
      preset,
      trigger,
      duration_ms,
      intensity_percent,
      ...(color ? { color } : {}),
    }),
    async (localWorkflow) => {
      const recipe = localWorkflow.buildMotionLabRecipe({
        presetId: preset,
        trigger,
        durationMs: duration_ms,
        intensityPercent: intensity_percent,
      });
      return {
        recipe: {
          preset_id: recipe.preset_id,
          preset: recipe.preset,
          group: recipe.group,
        },
        animated_svg: localWorkflow.buildMotionLabAnimatedSvg({
          svg,
          presetId: preset,
          trigger,
          durationMs: duration_ms,
          intensityPercent: intensity_percent,
          color,
        }),
        applied_color: color || null,
      };
    }
  );
}

export async function animateMotionLabIconHosted({ svg, preset, trigger = 'loop', duration_ms = 500, intensity_percent = 100, color = null }) {
  const [recipe, cssResponse, animatedSvgResponse] = await Promise.all([
    getMotionLabRecipeHosted({ preset, trigger, duration_ms, intensity_percent }),
    renderMotionLabCssHosted({ preset, trigger, duration_ms, intensity_percent }),
    renderMotionLabAnimatedSvgHosted({ svg, preset, trigger, duration_ms, intensity_percent, color }),
  ]);

  return {
    recipe,
    css: cssResponse.css,
    animated_svg: animatedSvgResponse.animated_svg,
    selector_mode: cssResponse.selector_mode,
    ...(cssResponse.selector_token ? { selector_token: cssResponse.selector_token } : {}),
    ...(animatedSvgResponse.applied_color ? { applied_color: animatedSvgResponse.applied_color } : {}),
  };
}
