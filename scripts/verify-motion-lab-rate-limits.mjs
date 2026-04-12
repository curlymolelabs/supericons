#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const requiredProKey = process.env.SUPERICONS_API_KEY;

if (!requiredProKey) {
  throw new Error('SUPERICONS_API_KEY is required for Motion Lab rate-limit verification.');
}

process.env.SUPERICONS_MOTION_LAB_LOCAL_FALLBACK = '0';

const EXPECT_429 = process.env.SUPERICONS_MOTION_LAB_EXPECT_429 === '1';
const TARGET = (process.env.SUPERICONS_MOTION_LAB_RATE_LIMIT_TARGET || 'recipe').trim().toLowerCase();
const MAX_ATTEMPTS = parsePositiveInt(
  process.env.SUPERICONS_MOTION_LAB_RATE_LIMIT_MAX_ATTEMPTS,
  EXPECT_429 ? 6 : 1
);
const ICON_ID = (process.env.SUPERICONS_MOTION_LAB_RATE_LIMIT_ICON_ID || 'heart').trim();
const ICON_LIBRARY = (process.env.SUPERICONS_MOTION_LAB_RATE_LIMIT_LIBRARY || 'lucide').trim();

await import(pathToFileURL(join(repoRoot, 'scripts', 'build-motion-lab-mcp-artifacts.mjs')).href);

const clientModuleUrl = `${pathToFileURL(join(repoRoot, 'mcp', 'motion-lab-client.js')).href}?t=${Date.now()}`;
const authModuleUrl = `${pathToFileURL(join(repoRoot, 'mcp', 'auth.js')).href}?t=${Date.now()}`;
const sdkClientUrl = pathToFileURL(
  join(repoRoot, 'mcp', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'client', 'index.js')
).href;
const sdkStdioUrl = pathToFileURL(
  join(repoRoot, 'mcp', 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'client', 'stdio.js')
).href;

const {
  getMotionLabRecipeHosted,
  renderMotionLabCssHosted,
  renderMotionLabAnimatedSvgHosted,
} = await import(clientModuleUrl);
const {
  hashApiKey,
  SUPABASE_ANON,
  SUPABASE_URL,
} = await import(authModuleUrl);
const { Client } = await import(sdkClientUrl);
const { StdioClientTransport } = await import(sdkStdioUrl);

const DEFAULT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 4l8 8-8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
const HOSTED_FUNCTIONS_BASE_URL = (process.env.SUPERICONS_MOTION_LAB_BASE_URL || `${SUPABASE_URL}/functions/v1`).replace(/\/+$/, '');
const SESSION_ENDPOINT = `${HOSTED_FUNCTIONS_BASE_URL}/motion-lab-session`;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function buildServerEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => typeof value === 'string')
  );
}

function parseToolPayload(result, toolName) {
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  assert(typeof text === 'string' && text.trim(), `${toolName} did not return text content.`);

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${toolName} returned non-JSON text: ${error instanceof Error ? error.message : 'unknown parse failure'}`);
  }
}

function getTargetConfig(target) {
  const sharedRecipeArgs = {
    preset: 'sweep',
    trigger: 'hover',
    duration_ms: 240,
    intensity_percent: 100,
  };

  const configs = {
    recipe: {
      label: 'recipe',
      expectedLimitScope: 'motion-lab-recipe:user',
      hostedBelowLimit: () => getMotionLabRecipeHosted(sharedRecipeArgs),
      mcpToolName: 'get_motion_recipe',
      mcpArguments: sharedRecipeArgs,
      assertHostedSuccess: (payload) => {
        assert(payload?.preset_id === 'sweep', 'Hosted recipe verification did not return the expected preset.');
      },
      assertMcpSuccess: (payload) => {
        assert(payload?.preset_id === 'sweep', 'MCP recipe verification did not return the expected preset.');
      },
    },
    css: {
      label: 'css render',
      expectedLimitScope: 'motion-lab-render-css:user',
      hostedBelowLimit: () => renderMotionLabCssHosted(sharedRecipeArgs),
      mcpToolName: 'export_motion_css',
      mcpArguments: {
        id: ICON_ID,
        library: ICON_LIBRARY,
        ...sharedRecipeArgs,
      },
      assertHostedSuccess: (payload) => {
        assert(payload?.selector_mode === 'placeholder', 'Hosted CSS verification did not preserve the placeholder selector mode.');
        assert(typeof payload?.css === 'string' && payload.css.includes('{{ICON_SELECTOR}}'), 'Hosted CSS verification did not return placeholder CSS.');
      },
      assertMcpSuccess: (payload) => {
        assert(typeof payload?.css === 'string' && payload.css.includes('{{ICON_SELECTOR}}'), 'MCP CSS verification did not return placeholder CSS.');
        assert(typeof payload?.selector_instructions === 'string', 'MCP CSS verification did not return selector instructions.');
      },
    },
    'animated-svg': {
      label: 'animated SVG render',
      expectedLimitScope: 'motion-lab-render-animated-svg:user',
      hostedBelowLimit: () => renderMotionLabAnimatedSvgHosted({
        svg: DEFAULT_SVG,
        color: '#ff6b35',
        ...sharedRecipeArgs,
      }),
      mcpToolName: 'export_animated_svg',
      mcpArguments: {
        id: ICON_ID,
        library: ICON_LIBRARY,
        color: '#ff6b35',
        ...sharedRecipeArgs,
      },
      assertHostedSuccess: (payload) => {
        assert(typeof payload?.animated_svg === 'string' && payload.animated_svg.includes('<style>'), 'Hosted animated SVG verification did not return embedded animation.');
      },
      assertMcpSuccess: (payload) => {
        assert(typeof payload?.animated_svg === 'string' && payload.animated_svg.includes('<style>'), 'MCP animated SVG verification did not return embedded animation.');
      },
    },
  };

  const config = configs[target];
  if (!config) {
    throw new Error(`Unsupported rate-limit target "${target}". Use "session", "recipe", "css", or "animated-svg".`);
  }
  return config;
}

async function createMcpClient() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(repoRoot, 'mcp', 'index.js')],
    cwd: join(repoRoot, 'mcp'),
    env: buildServerEnv(),
    stderr: 'pipe',
  });
  const client = new Client({
    name: 'motion-lab-rate-limit-verifier',
    version: '0.1.0',
  });

  await client.connect(transport);
  return { client, transport };
}

async function closeMcpClient({ client, transport }) {
  try {
    await transport.close();
  } finally {
    void client;
  }
}

async function callMcpTool(client, toolName, args) {
  const result = await client.callTool({
    name: toolName,
    arguments: args,
  });
  return parseToolPayload(result, toolName);
}

function assertRateLimitPayload(payload, expectedLimitScope) {
  assert(payload?.code === 'motion_lab_rate_limited', `Expected code "motion_lab_rate_limited" but received "${payload?.code}".`);
  assert(typeof payload?.retry_after_seconds === 'number' && payload.retry_after_seconds > 0, 'Rate-limit payload did not include retry_after_seconds.');
  assert(payload?.limit_scope === expectedLimitScope, `Rate-limit payload limit_scope "${payload?.limit_scope}" did not match "${expectedLimitScope}".`);
  assert(payload?.retryable === true, 'Rate-limit payload did not mark the error as retryable.');
}

function assertHostedRateLimitPayload(payload, expectedLimitScope) {
  assert(payload?.error === 'motion_lab_rate_limited', `Expected error "motion_lab_rate_limited" but received "${payload?.error}".`);
  assert(typeof payload?.retry_after_seconds === 'number' && payload.retry_after_seconds > 0, 'Hosted rate-limit payload did not include retry_after_seconds.');
  assert(payload?.limit_scope === expectedLimitScope, `Hosted rate-limit payload limit_scope "${payload?.limit_scope}" did not match "${expectedLimitScope}".`);
  assert(payload?.retryable === true, 'Hosted rate-limit payload did not mark the error as retryable.');
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

async function callHostedSessionExchange(apiKeyHash) {
  const response = await fetch(SESSION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON,
    },
    body: JSON.stringify({
      api_key_hash: apiKeyHash,
      client: {
        surface: 'mcp',
        version: '0.3.0',
      },
    }),
  });

  const body = await readJsonResponse(response);
  return { response, body };
}

if (TARGET === 'session') {
  const apiKeyHash = await hashApiKey(requiredProKey);
  const { response, body } = await callHostedSessionExchange(apiKeyHash);
  assert(response.ok, `Hosted session below-limit verification failed (${response.status}).`);
  assert(typeof body?.session_token === 'string' && body.session_token.length > 10, 'Hosted session below-limit verification did not return a session token.');
  assert(typeof body?.expires_at === 'string', 'Hosted session below-limit verification did not return expires_at.');
  console.log('Hosted session below-limit path: verified.');

  if (!EXPECT_429) {
    console.log(
      'Motion Lab rate-limit threshold-crossing check skipped. To verify a live 429, temporarily lower the target bucket threshold in Supabase, redeploy the Motion Lab functions, then rerun with SUPERICONS_MOTION_LAB_EXPECT_429=1.'
    );
  } else {
    let rateLimitedPayload = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const sessionAttempt = await callHostedSessionExchange(apiKeyHash);
      if (sessionAttempt.response.status === 429) {
        rateLimitedPayload = sessionAttempt.body;
        console.log(`Hosted session over-limit path: triggered on attempt ${attempt}.`);
        break;
      }
    }

    assert(
      rateLimitedPayload,
      `Expected Motion Lab rate limiting within ${MAX_ATTEMPTS} session attempts. Lower the live threshold for motion-lab-session:api_key_hash in Supabase, redeploy the Motion Lab functions, and rerun this verifier.`
    );
    assertHostedRateLimitPayload(rateLimitedPayload, 'motion-lab-session:api_key_hash');
    console.log('Hosted session 429 contract: verified (motion-lab-session:api_key_hash).');
  }

  console.log('Motion Lab rate-limit verification complete: hosted session path verified and ready for controlled live 429 testing.');
} else {
  const targetConfig = getTargetConfig(TARGET);
  const hostedPayload = await targetConfig.hostedBelowLimit();
  targetConfig.assertHostedSuccess(hostedPayload);
  console.log(`Hosted ${targetConfig.label} below-limit path: verified.`);

  const mcpConnection = await createMcpClient();

  try {
    const belowLimitPayload = await callMcpTool(mcpConnection.client, targetConfig.mcpToolName, targetConfig.mcpArguments);
    targetConfig.assertMcpSuccess(belowLimitPayload);
    console.log(`MCP ${targetConfig.label} below-limit path: verified.`);

    if (!EXPECT_429) {
      console.log(
        'Motion Lab rate-limit threshold-crossing check skipped. To verify a live 429, temporarily lower the target bucket threshold in Supabase, redeploy the Motion Lab functions, then rerun with SUPERICONS_MOTION_LAB_EXPECT_429=1.'
      );
    } else {
      let rateLimitedPayload = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const payload = await callMcpTool(mcpConnection.client, targetConfig.mcpToolName, targetConfig.mcpArguments);
        if (payload?.code === 'motion_lab_rate_limited') {
          rateLimitedPayload = payload;
          console.log(`MCP ${targetConfig.label} over-limit path: triggered on attempt ${attempt}.`);
          break;
        }
      }

      assert(
        rateLimitedPayload,
        `Expected Motion Lab rate limiting within ${MAX_ATTEMPTS} ${TARGET} attempts. Lower the live threshold for ${targetConfig.expectedLimitScope} in Supabase, redeploy the Motion Lab functions, and rerun this verifier.`
      );
      assertRateLimitPayload(rateLimitedPayload, targetConfig.expectedLimitScope);
      console.log(`MCP ${targetConfig.label} 429 pass-through: verified (${targetConfig.expectedLimitScope}).`);
    }
  } finally {
    await closeMcpClient(mcpConnection);
  }

  console.log('Motion Lab rate-limit verification complete: hosted below-limit path verified and MCP pass-through ready for controlled live 429 testing.');
}
