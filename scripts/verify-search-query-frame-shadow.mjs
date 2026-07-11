import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildSearchQueryFrame as buildWebSearchQueryFrame } from '../lib/search-query-frame.js';
import { buildSearchQueryFrame as buildMcpSearchQueryFrame } from '../mcp/runtime/search-query-frame.js';
import { recommendIconsForTask } from '../mcp/recommend-icons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const evaluationSet = JSON.parse(readFileSync(
  join(repoRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'),
  'utf8',
));

function runClientProbe(modulePath, callSource, env = {}) {
  const moduleUrl = pathToFileURL(join(repoRoot, modulePath)).href;
  const script = `
    const calls = [];
    globalThis.fetch = async (url, init = {}) => {
      calls.push({
        url: String(url),
        headers: init.headers || {},
        body: JSON.parse(init.body || '{}'),
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({ results: [] }),
      };
    };
    const mod = await import(${JSON.stringify(moduleUrl)});
    await ${callSource};
    console.log(JSON.stringify(calls));
  `;

  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SUPERICONS_SEARCH_ENGINE_REQUIRE_JWT: '0',
      SUPERICONS_SEARCH_ENGINE_ANON_KEY: 'sb_publishable_test',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPERICONS_MCP_SEARCH_URL: 'https://example.test/mcp-search',
      SUPERICONS_API_KEY: '',
      ...env,
    },
    encoding: 'utf8',
  }).trim());
}

const longQuery = 'license plate recognition camera scan car';
const webFrame = buildWebSearchQueryFrame(longQuery);
const mcpFrame = buildMcpSearchQueryFrame(longQuery);
assert.deepEqual(mcpFrame, webFrame, 'web and MCP query-frame builders should return the same frame');
assert.ok(
  webFrame.meaning_groups.includes('vision_scan_detection'),
  'long license-plate query should expose the vision scan intent group',
);

const parityGroup = evaluationSet.query_groups.find((group) => group.id === 'cross_surface_query_frame');
assert.ok(parityGroup, 'evaluation set should include cross-surface query-frame cases');

for (const testCase of parityGroup.queries) {
  const searchFrame = buildWebSearchQueryFrame(testCase.query);
  const packagedFrame = buildMcpSearchQueryFrame(testCase.query);
  assert.deepEqual(
    packagedFrame,
    searchFrame,
    `${testCase.case_id}: web and MCP search builders should return the same frame`,
  );

  const recommendation = await recommendIconsForTask({
    task: testCase.task,
    slots: [testCase.slot],
    limitPerSlot: 1,
    responseMode: 'plan',
    includeQueryFrame: true,
    semanticMap: new Map(),
    searchIconsForQuery: async () => [
      { id: 'check', name: 'Check', lib: 'lucide', style: 'outline', svg: '<svg></svg>' },
    ],
    buildIconResult: async (icon) => ({
      id: icon.id,
      name: icon.name,
      library: icon.lib,
      style: icon.style,
      svg: icon.svg,
    }),
  });

  assert.deepEqual(
    recommendation.query_frame,
    buildWebSearchQueryFrame(testCase.task),
    `${testCase.case_id}: recommendation task should use the shared query-frame builder`,
  );
  assert.deepEqual(
    recommendation.results[0]?.query_frame,
    buildWebSearchQueryFrame(`${testCase.slot} ${testCase.task}`),
    `${testCase.case_id}: recommendation slot should use the shared query-frame builder with task context`,
  );
}

const webDefaultCalls = runClientProbe(
  'lib/search-engine-client.js',
  "mod.searchIconsHosted({ query: 'powerful', limit: 1 })",
);
assert.equal(
  webDefaultCalls[0]?.body?.include_query_frame,
  undefined,
  'web hosted search client should keep query-frame diagnostics off by default',
);

const webDiagnosticCalls = runClientProbe(
  'lib/search-engine-client.js',
  "mod.searchIconsHosted({ query: 'powerful', limit: 1, includeQueryFrame: true })",
);
assert.equal(
  webDiagnosticCalls[0]?.body?.include_query_frame,
  true,
  'web hosted search client should send include_query_frame only when requested',
);

const mcpDefaultCalls = runClientProbe(
  'mcp/hosted-search-client.js',
  "mod.searchIconsHostedMcp({ query: 'powerful', limit: 1 })",
  {
    SUPERICONS_SEARCH_ENGINE_ANON_KEY: '',
    SUPABASE_ANON_KEY: '',
  },
);
assert.equal(
  mcpDefaultCalls[0]?.body?.include_query_frame,
  undefined,
  'hosted MCP search client should keep query-frame diagnostics off by default',
);

const mcpDiagnosticCalls = runClientProbe(
  'mcp/hosted-search-client.js',
  "mod.searchIconsHostedMcp({ query: 'powerful', limit: 1, includeQueryFrame: true })",
  {
    SUPERICONS_SEARCH_ENGINE_ANON_KEY: '',
    SUPABASE_ANON_KEY: '',
  },
);
assert.equal(
  mcpDiagnosticCalls[0]?.body?.include_query_frame,
  true,
  'hosted MCP search client should forward include_query_frame when requested',
);

const defaultRecommendation = await recommendIconsForTask({
  task: 'Choose an icon for bad AI output warning.',
  slots: ['bad AI output warning'],
  limitPerSlot: 1,
  responseMode: 'plan',
  semanticMap: new Map(),
  searchIconsForQuery: async () => [
    { id: 'warning', name: 'Warning', lib: 'lucide', style: 'outline', svg: '<svg></svg>' },
  ],
  buildIconResult: async (icon) => ({
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    style: icon.style,
    svg: icon.svg,
  }),
});
assert.equal(
  'query_frame' in defaultRecommendation,
  false,
  'recommend_icons should keep query frames out of normal plan responses',
);
assert.equal(
  'query_frame' in defaultRecommendation.results[0],
  false,
  'recommend_icons slots should keep query frames out of normal plan responses',
);

const diagnosticRecommendation = await recommendIconsForTask({
  task: 'Choose an icon for bad AI output warning.',
  slots: ['bad AI output warning'],
  limitPerSlot: 1,
  responseMode: 'plan',
  includeQueryFrame: true,
  semanticMap: new Map(),
  searchIconsForQuery: async () => [
    { id: 'warning', name: 'Warning', lib: 'lucide', style: 'outline', svg: '<svg></svg>' },
  ],
  buildIconResult: async (icon) => ({
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    style: icon.style,
    svg: icon.svg,
  }),
});
assert.ok(
  diagnosticRecommendation.query_frame?.meaning_groups?.includes('ai_low_quality_output'),
  'recommend_icons diagnostic task frame should expose the AI low-quality output group',
);
assert.ok(
  diagnosticRecommendation.results[0]?.query_frame?.meaning_groups?.includes('ai_low_quality_output'),
  'recommend_icons diagnostic slot frame should expose the AI low-quality output group',
);

const hostedHandlerSource = readFileSync(
  join(repoRoot, 'supabase/functions/_shared/search-engine/handle-search-request.ts'),
  'utf8',
);
assert.match(hostedHandlerSource, /buildSearchQueryFrame/, 'hosted search handler should build query frames');
assert.match(hostedHandlerSource, /include_query_frame/, 'hosted search handler should support include_query_frame');
assert.match(hostedHandlerSource, /query_frame/, 'hosted search handler should return query_frame diagnostics when requested');

const localMcpSource = readFileSync(join(repoRoot, 'mcp/index.js'), 'utf8');
assert.match(localMcpSource, /include_query_frame/, 'local MCP search and recommend tools should expose include_query_frame');
assert.match(localMcpSource, /buildSearchQueryFrame/, 'local MCP should build query frames from the packaged runtime');

const remoteMcpSource = readFileSync(join(repoRoot, 'mcp/remote-server.js'), 'utf8');
assert.match(remoteMcpSource, /include_query_frame/, 'hosted MCP tools should expose include_query_frame');
assert.match(remoteMcpSource, /buildSearchQueryFrame/, 'hosted MCP should build query frames from the packaged runtime');

console.log('verify-search-query-frame-shadow: ok');
