import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

const requiredProKey = process.env.SUPERICONS_API_KEY;
const optionalNonProKey = process.env.SUPERICONS_NON_PRO_API_KEY || null;

if (!requiredProKey) {
  throw new Error('SUPERICONS_API_KEY is required for Motion Lab negative-path verification.');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function freshModuleUrl(relativePath) {
  return `${pathToFileURL(join(repoRoot, relativePath)).href}?t=${Date.now()}-${Math.random()}`;
}

async function importFresh(relativePath) {
  return import(freshModuleUrl(relativePath));
}

async function withEnv(overrides, fn) {
  const previous = new Map();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

async function expectMotionLabError(label, fn, { code, retryable, messageIncludes }) {
  try {
    await fn();
    throw new Error(`${label} unexpectedly succeeded.`);
  } catch (error) {
    assert(error?.code === code, `${label} returned code "${error?.code}" instead of "${code}".`);
    if (typeof retryable === 'boolean') {
      assert(error?.retryable === retryable, `${label} returned retryable=${error?.retryable} instead of ${retryable}.`);
    }
    if (messageIncludes) {
      assert(
        typeof error?.message === 'string' && error.message.includes(messageIncludes),
        `${label} message did not include "${messageIncludes}".`
      );
    }
    console.log(`${label}: verified (${code})`);
    return error;
  }
}

await import(pathToFileURL(join(repoRoot, 'scripts', 'build-motion-lab-mcp-artifacts.mjs')).href);

await withEnv({ SUPERICONS_API_KEY: null }, async () => {
  const { buildProWorkflowAccessError } = await importFresh('mcp/workflow-access.js');
  const error = buildProWorkflowAccessError({ authenticated: false, isPro: false, purchasedSlugs: [], userId: null, error: null }, 'Motion Lab MCP');
  assert(error.code === 'workflow_api_key_required', 'Missing-key workflow gate did not return workflow_api_key_required.');
  assert(error.message.includes('requires a Pro-linked SUPERICONS_API_KEY'), 'Missing-key workflow gate did not explain that the API key is required.');
  console.log('Workflow gate missing-key guidance: verified.');
});

await withEnv({ SUPERICONS_API_KEY: 'si_mock_non_pro_key' }, async () => {
  const { buildProWorkflowAccessError } = await importFresh('mcp/workflow-access.js');
  const error = buildProWorkflowAccessError({ authenticated: true, isPro: false, purchasedSlugs: [], userId: 'mock-user', error: null }, 'Motion Lab MCP');
  assert(error.code === 'workflow_pro_required', 'Non-Pro workflow gate did not return workflow_pro_required.');
  assert(error.message.includes('valid, but it is not linked to a Pro subscription'), 'Non-Pro workflow gate did not return the improved upgrade guidance.');
  console.log('Workflow gate non-Pro guidance: verified.');
});

await withEnv(
  {
    SUPERICONS_API_KEY: requiredProKey,
    SUPERICONS_MOTION_LAB_LOCAL_FALLBACK: '0',
    SUPERICONS_MOTION_LAB_BASE_URL: null,
  },
  async () => {
    const {
      getMotionLabRecipeHosted,
      renderMotionLabCssHosted,
      renderMotionLabAnimatedSvgHosted,
    } = await importFresh('mcp/motion-lab-client.js');

    await expectMotionLabError(
      'Hosted invalid preset path',
      () => getMotionLabRecipeHosted({
        preset: 'not-a-real-preset',
        trigger: 'hover',
        duration_ms: 240,
        intensity_percent: 100,
      }),
      {
        code: 'motion_lab_unsupported_preset',
        retryable: false,
        messageIncludes: 'Unsupported Motion Lab preset',
      }
    );

    const literalCss = await renderMotionLabCssHosted({
      preset: 'sweep',
      trigger: 'hover',
      duration_ms: 240,
      intensity_percent: 100,
      selector: '.settings-button svg',
    });

    assert(literalCss.selector_mode === 'literal', 'Explicit selector CSS path did not return selector_mode="literal".');
    assert(!('selector_token' in literalCss), 'Explicit selector CSS path should not return selector_token.');
    assert(literalCss.css.includes('.settings-button svg'), 'Explicit selector CSS path did not embed the supplied selector.');
    assert(!literalCss.css.includes('{{ICON_SELECTOR}}'), 'Explicit selector CSS path still returned the placeholder token.');
    console.log('Hosted explicit-selector CSS path: verified.');

    await expectMotionLabError(
      'Hosted malformed animated SVG path',
      () => renderMotionLabAnimatedSvgHosted({
        svg: '   ',
        preset: 'sweep',
        trigger: 'hover',
        duration_ms: 240,
        intensity_percent: 100,
        color: '#ff6b35',
      }),
      {
        code: 'motion_lab_invalid_request',
        retryable: false,
        messageIncludes: 'requires a non-empty "svg" string',
      }
    );
  }
);

await withEnv(
  {
    SUPERICONS_API_KEY: requiredProKey,
    SUPERICONS_MOTION_LAB_BASE_URL: 'http://127.0.0.1:9',
    SUPERICONS_MOTION_LAB_LOCAL_FALLBACK: '0',
  },
  async () => {
    const { getMotionLabRecipeHosted } = await importFresh('mcp/motion-lab-client.js');
    await expectMotionLabError(
      'Hosted outage hard-fail path',
      () => getMotionLabRecipeHosted({
        preset: 'sweep',
        trigger: 'hover',
        duration_ms: 240,
        intensity_percent: 100,
      }),
      {
        code: 'motion_lab_service_unavailable',
        retryable: true,
      }
    );
  }
);

if (optionalNonProKey) {
  const {
    SUPABASE_ANON,
    SUPABASE_URL,
  } = await importFresh('mcp/auth.js');

  const keyHash = createHash('sha256').update(optionalNonProKey).digest('hex');
  const response = await fetch(`${SUPABASE_URL}/functions/v1/motion-lab-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
    },
    body: JSON.stringify({ api_key_hash: keyHash }),
  });

  const body = await response.json();
  assert(response.status === 403, `Live non-Pro session path returned ${response.status} instead of 403.`);
  assert(body?.error === 'motion_lab_pro_required', 'Live non-Pro session path did not return motion_lab_pro_required.');
  assert(typeof body?.message === 'string' && body.message.includes('requires a Pro account'), 'Live non-Pro session path did not return the expected Pro-upgrade message.');
  console.log('Live non-Pro session denial path: verified.');
} else {
  console.log('Live non-Pro session denial path: skipped (set SUPERICONS_NON_PRO_API_KEY to verify against a real non-Pro key).');
}

console.log('Motion Lab negative-path verification complete: workflow gate messaging, invalid preset, explicit selector CSS, malformed SVG, outage hard-fail, and optional non-Pro denial path.');
