import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const hostedSearchClientUrl = pathToFileURL(path.join(repoRoot, 'mcp', 'hosted-search-client.js')).href;
const docsPagesSource = await fsRead(path.join(repoRoot, 'docs-pages.js'));
const docsGuideConfigSource = await fsRead(path.join(repoRoot, 'lib', 'docs-guide-config.js'));
const landingSource = await fsRead(path.join(repoRoot, 'index.html'));

async function fsRead(file) {
  const fs = await import('node:fs/promises');
  return fs.readFile(file, 'utf8');
}

assert.ok(
  docsPagesSource.includes('https://opencode.ai/docs/mcp-servers'),
  'Other clients docs must link to the official OpenCode MCP guide',
);
assert.ok(
  docsPagesSource.includes('Official OpenCode docs for local and remote MCP server setup.'),
  'OpenCode docs must acknowledge both local and remote MCP support',
);
assert.ok(
  !docsPagesSource.includes('id="docs-opencode-local-json"'),
  'Other clients overview must not show a config block for only OpenCode',
);
assert.ok(
  !docsPagesSource.includes('Direct hosted HTTP MCP is not the recommended OpenCode setup right now'),
  'docs must not imply OpenCode remote MCP is unsupported or broadly discouraged',
);
assert.ok(
  docsPagesSource.includes('Smithery authentication'),
  'docs must mention that Smithery hosted access may require Smithery authentication',
);
for (const [sourceName, source] of [
  ['docs-pages.js', docsPagesSource],
  ['lib/docs-guide-config.js', docsGuideConfigSource],
  ['index.html', landingSource],
]) {
  assert.ok(
    source.includes('@supericons/mcp@latest'),
    `${sourceName} must include explicit @supericons/mcp@latest setup examples`,
  );
  assert.ok(
    !source.includes('supericons-mcp'),
    `${sourceName} must not use the old supericons-mcp package in live setup docs`,
  );
}
assert.ok(
  docsPagesSource.includes('<code>recommend_icons</code>'),
  'MCP docs must document recommend_icons',
);
assert.ok(
  docsPagesSource.includes('<code>limit_per_slot</code>'),
  'recommend_icons docs must include limit_per_slot',
);
assert.ok(
  docsPagesSource.includes('<code>response_mode</code>'),
  'recommend_icons docs must include response_mode',
);
assert.ok(
  docsPagesSource.includes('Use <code>plan</code> for compact icon IDs and reasons'),
  'recommend_icons docs must recommend plan mode for compact agent output',
);

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
