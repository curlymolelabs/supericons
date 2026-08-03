import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { searchIcons } from '../mcp/search.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = join(repoRoot, 'mcp');
const corpus = JSON.parse(readFileSync(
  join(repoRoot, 'data/search-intent-fixtures/donation-charity-parity-corpus.json'),
  'utf8',
));
const icons = JSON.parse(readFileSync(join(packageRoot, 'public/icon-index.json'), 'utf8')).icons;
const synonyms = JSON.parse(readFileSync(join(packageRoot, 'public/synonyms.json'), 'utf8'));
const reviewedRefs = new Set(corpus.reviewed_refs);

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`.toLowerCase();
}

function includesAny(refs, fragments = []) {
  return fragments.some((fragment) => refs.some((ref) => ref.includes(String(fragment).toLowerCase())));
}

function evaluateCase(testCase, refs, surface) {
  if (testCase.expected_decision === 'expected_zero') {
    assert.equal(refs.length, 0, `${testCase.case_id} fabricated ${surface} results: ${refs.join(', ')}`);
    return;
  }

  assert.ok(refs.length > 0, `${testCase.case_id} returned a ${surface} false zero`);
  if (testCase.minimum_reviewed_results) {
    const reviewedCount = refs.slice(0, 5).filter((ref) => reviewedRefs.has(ref)).length;
    assert.ok(
      reviewedCount >= testCase.minimum_reviewed_results,
      `${testCase.case_id} returned ${reviewedCount} reviewed ${surface} results: ${refs.join(', ')}`,
    );
  }
  for (const requiredRef of testCase.required_refs || []) {
    assert.ok(refs.includes(requiredRef), `${testCase.case_id} missed ${requiredRef} on ${surface}: ${refs.join(', ')}`);
  }
  if (testCase.required_ref_fragments) {
    assert.ok(
      includesAny(refs.slice(0, 3), testCase.required_ref_fragments),
      `${testCase.case_id} missed its reviewed ${surface} meaning: ${refs.join(', ')}`,
    );
  }
  assert.ok(
    !includesAny(refs.slice(0, 3), testCase.forbidden_top_ref_fragments),
    `${testCase.case_id} was hijacked on ${surface}: ${refs.join(', ')}`,
  );
  if (testCase.library_mode === 'strict') {
    assert.ok(
      refs.every((ref) => ref.startsWith(`${testCase.library}:`)),
      `${testCase.case_id} escaped strict ${surface} library scope: ${refs.join(', ')}`,
    );
  }
}

assert.equal(corpus.schema_version, 1);
assert.equal(corpus.cases.length, 13);
assert.equal(
  readFileSync(join(repoRoot, 'lib/icon-semantic-aliases.js'), 'utf8'),
  readFileSync(join(repoRoot, 'mcp/runtime/icon-semantic-aliases.js'), 'utf8'),
  'Public and MCP semantic alias files must stay byte-identical',
);

const directObservations = [];
for (const testCase of corpus.cases) {
  const refs = searchIcons(testCase.query, icons, synonyms, {
    library: testCase.library || undefined,
    libraryMode: testCase.library_mode || 'all',
    style: 'any',
    limit: 10,
  }).map(iconRef);
  evaluateCase(testCase, refs, 'shared-pipeline');
  directObservations.push({ case_id: testCase.case_id, refs });
}

const sdkClientRoot = join(packageRoot, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'client');
const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(join(sdkClientRoot, 'stdio.js')).href);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageRoot, 'index.js')],
  cwd: packageRoot,
  env: {
    ...process.env,
    SUPERICONS_CONTROLLED_RUN_LABEL: 'search-donation-charity-parity-20260804',
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'donation-charity-parity-verifier', version: '1.0.0' });
const stdioObservations = [];

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

try {
  await client.connect(transport);
  for (const testCase of corpus.cases) {
    const payload = parsePayload(await client.callTool({
      name: 'search_icons',
      arguments: {
        query: testCase.query,
        ...(testCase.library ? { library: testCase.library } : {}),
        library_mode: testCase.library_mode || 'all',
        limit: 10,
      },
    }));
    const refs = (payload?.results || []).map((icon) => String(icon.icon_ref).toLowerCase());
    evaluateCase(testCase, refs, 'local-mcp');
    if (testCase.expected_decision === 'expected_zero') {
      assert.equal(payload.code, 'no_icons_found');
      assert.equal(payload.result_count, 0);
      assert.equal('results' in payload, false);
    }
    stdioObservations.push({ case_id: testCase.case_id, refs });
  }
} finally {
  await client.close();
}

console.log(JSON.stringify({
  status: 'ok',
  fixture_id: corpus.fixture_id,
  cases: corpus.cases.length,
  shared_pipeline: directObservations,
  local_mcp: stdioObservations,
}, null, 2));
