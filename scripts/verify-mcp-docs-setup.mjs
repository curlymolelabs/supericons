import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const hostedSearchClientUrl = pathToFileURL(path.join(repoRoot, 'mcp', 'hosted-search-client.js')).href;

function runScenario(envOverrides = {}) {
  const script = `
    globalThis.fetch = async (url, init = {}) => {
      console.log(JSON.stringify({
        url,
        headers: init.headers || {},
        body: JSON.parse(init.body || '{}'),
      }));
      return {
        ok: true,
        json: async () => ({ results: [{ icon_id: 'lucide:calendar' }] }),
      };
    };

    const mod = await import(${JSON.stringify(hostedSearchClientUrl)});
    await mod.searchIconsHostedMcp({ query: 'calendar', limit: 3 });
  `;

  const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SUPABASE_ANON_KEY: '',
      SUPERICONS_SEARCH_ENGINE_ANON_KEY: '',
      SUPERICONS_API_KEY: '',
      SUPERICONS_INTERNAL_HOSTED_DEBUG: '',
      SUPERICONS_SEARCH_ENGINE_URL: '',
      SUPERICONS_MCP_SEARCH_URL: '',
      ...envOverrides,
    },
    encoding: 'utf8',
  }).trim();

  const [line] = output.split(/\r?\n/).filter(Boolean).slice(-1);
  return JSON.parse(line);
}

const docsOnlyCall = runScenario();
assert.match(
  docsOnlyCall.url,
  /\/functions\/v1\/mcp-search$/,
  'docs-only MCP setup should use the public mcp-search gateway',
);
assert.equal(docsOnlyCall.headers.apikey, undefined, 'docs-only MCP setup should not send a Supabase apikey header');
assert.equal(docsOnlyCall.headers.Authorization, undefined, 'docs-only MCP setup should not send a Supabase bearer token');
assert.equal(
  docsOnlyCall.headers['x-supericons-api-key'],
  undefined,
  'docs-only MCP setup should not send a Supericons API key when none is configured',
);
assert.equal(docsOnlyCall.body.source, 'mcp', 'docs-only MCP setup should mark requests as MCP traffic');

const premiumCall = runScenario({
  SUPERICONS_API_KEY: 'si_test_key',
});
assert.equal(
  premiumCall.headers['x-supericons-api-key'],
  'si_test_key',
  'premium MCP setup should send SUPERICONS_API_KEY to the public gateway',
);
assert.equal(premiumCall.headers.apikey, undefined, 'premium MCP setup should not depend on a Supabase apikey header');
assert.equal(premiumCall.headers.Authorization, undefined, 'premium MCP setup should not depend on a Supabase bearer token');

const internalDebugCall = runScenario({
  SUPERICONS_INTERNAL_HOSTED_DEBUG: '1',
  SUPABASE_ANON_KEY: 'debug.header.signature',
  SUPERICONS_SEARCH_ENGINE_URL: 'https://example.supabase.co/functions/v1/search-icons',
});
assert.equal(
  internalDebugCall.url,
  'https://example.supabase.co/functions/v1/search-icons',
  'internal hosted debug mode should keep the direct search-icons path available',
);
assert.equal(
  internalDebugCall.headers.apikey,
  'debug.header.signature',
  'internal hosted debug mode should send the Supabase anon JWT as apikey',
);
assert.equal(
  internalDebugCall.headers.Authorization,
  'Bearer debug.header.signature',
  'internal hosted debug mode should send a Supabase bearer token',
);

console.log('verify-mcp-docs-setup: ok');
