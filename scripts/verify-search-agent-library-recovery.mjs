import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { searchIcons } from '../mcp/search.js';
import { createControlledRunHeaders } from '../mcp/controlled-run-auth.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = resolve(repoRoot, 'mcp');
const corpus = JSON.parse(readFileSync(resolve(repoRoot, 'data/search-intent-fixtures/agent-library-recovery-corpus.json'), 'utf8'));
const icons = JSON.parse(readFileSync(resolve(packageRoot, 'public/icon-index.json'), 'utf8')).icons;
const synonyms = JSON.parse(readFileSync(resolve(packageRoot, 'public/synonyms.json'), 'utf8'));

function iconRef(icon) {
  return `${icon.lib}:${icon.id}`.toLowerCase();
}

function includesAny(refs, fragments = []) {
  return fragments.some((fragment) => refs.some((ref) => ref.includes(String(fragment).toLowerCase())));
}

function includesAll(refs, fragments = []) {
  return fragments.every((fragment) => refs.some((ref) => ref.includes(String(fragment).toLowerCase())));
}

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

assert.equal(corpus.schema_version, 1);
assert.equal(corpus.cases.length, 33);

const observations = [];
for (const testCase of corpus.cases) {
  const strictOrAllResults = searchIcons(testCase.query, icons, synonyms, {
    library: testCase.library || undefined,
    libraryMode: testCase.library_mode,
    limit: testCase.limit,
    style: 'any',
  });
  const refs = strictOrAllResults.map(iconRef);

  if (testCase.group === 'strict_success') {
    assert.ok(refs.length > 0, `${testCase.case_id} returned a false strict zero`);
    assert.ok(refs.every((ref) => ref.startsWith(`${testCase.library}:`)), `${testCase.case_id} escaped its strict library`);
    assert.ok(includesAny(refs, testCase.required_ref_fragments), `${testCase.case_id} missed its required identity: ${refs.join(', ')}`);
  }

  if (testCase.group === 'strict_recovery') {
    assert.equal(refs.length, 0, `${testCase.case_id} must remain an honest strict zero: ${refs.join(', ')}`);
    const alternatives = searchIcons(testCase.query, icons, synonyms, {
      libraryMode: 'all',
      limit: testCase.limit,
      style: 'any',
    }).map(iconRef);
    assert.ok(alternatives.length > 0, `${testCase.case_id} has no reviewed alternate result`);
    assert.ok(
      includesAny(alternatives, testCase.required_ref_fragments),
      `${testCase.case_id} missed its reviewed alternate: ${alternatives.join(', ')}`,
    );
  }

  if (testCase.group === 'honest_brand_zero' || testCase.group === 'honest_catalog_zero') {
    assert.equal(refs.length, 0, `${testCase.case_id} must remain an honest zero: ${refs.join(', ')}`);
    assert.ok(!includesAny(refs, testCase.forbidden_ref_fragments), `${testCase.case_id} returned a forbidden substitute`);
  }

  if (testCase.group === 'file_extension_positive') {
    assert.ok(refs.length > 0, `${testCase.case_id} returned a false file-extension zero`);
    if (testCase.required_all_ref_fragments) {
      assert.ok(
        includesAll(refs, testCase.required_all_ref_fragments),
        `${testCase.case_id} missed a required file meaning: ${refs.join(', ')}`,
      );
    } else {
      assert.ok(
        includesAny(refs, testCase.required_ref_fragments),
        `${testCase.case_id} missed its reviewed file meaning: ${refs.join(', ')}`,
      );
    }
  }

  observations.push({ case_id: testCase.case_id, refs });
}

const sdkClientRoot = join(packageRoot, 'node_modules', '@modelcontextprotocol', 'sdk', 'dist', 'esm', 'client');
const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(join(sdkClientRoot, 'stdio.js')).href);
const { StreamableHTTPClientTransport } = await import(
  pathToFileURL(join(sdkClientRoot, 'streamableHttp.js')).href
);
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageRoot, 'index.js')],
  cwd: packageRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'agent-library-recovery-verifier', version: '1.0.0' });
let localStrictRecoveryExample = null;
let localCopyAiExample = null;
let localFollowupExample = null;
const strictRecoveryLatenciesMs = [];

try {
  await client.connect(transport);
  const instructions = client.getInstructions();
  assert.match(instructions, /choose a library.*prefer/i);
  assert.match(instructions, /strict mode only when the user explicitly requires/i);

  const tools = await client.listTools();
  const searchTool = tools.tools.find((tool) => tool.name === 'search_icons');
  assert.match(searchTool.description, /si means Supericons/i);
  assert.match(searchTool.description, /strict only when the user/i);

  for (const testCase of corpus.cases.filter((entry) => entry.group === 'strict_recovery')) {
    const startedAt = performance.now();
    const strictPayload = parsePayload(await client.callTool({
      name: 'search_icons',
      arguments: {
        query: testCase.query,
        library: testCase.library,
        library_mode: 'strict',
        limit: testCase.limit,
      },
    }));
    strictRecoveryLatenciesMs.push(Number((performance.now() - startedAt).toFixed(1)));
    assert.equal(strictPayload.code, 'no_icons_found', `${testCase.case_id} must keep an honest strict zero`);
    assert.equal(strictPayload.result_count, 0);
    assert.equal('results' in strictPayload, false);
    assert.equal('image_url' in strictPayload, false);
    assert.equal('markdown_image' in strictPayload, false);
    assert.match(strictPayload.next_step, /get_icon|library_mode "all"/i);
    assert.match(strictPayload.suggested_response_markdown, new RegExp(testCase.library, 'i'));
    assert.ok(
      includesAny(
        [strictPayload.hint, strictPayload.next_step, strictPayload.suggested_response_markdown].filter(Boolean),
        testCase.required_ref_fragments,
      ),
      `${testCase.case_id} guidance omitted its reviewed alternate`,
    );
    if (testCase.case_id === 'strict_si_openai_recovery') {
      localStrictRecoveryExample = {
        code: strictPayload.code,
        result_count: strictPayload.result_count,
        hint: strictPayload.hint,
        next_step: strictPayload.next_step,
      };
    }
  }

  const copyAiPayload = parsePayload(await client.callTool({
    name: 'search_icons',
    arguments: { query: 'copy.ai', library_mode: 'all', limit: 5 },
  }));
  assert.equal(copyAiPayload.code, 'no_icons_found');
  assert.equal(copyAiPayload.result_count, 0);
  assert.equal('results' in copyAiPayload, false);
  localCopyAiExample = {
    code: copyAiPayload.code,
    result_count: copyAiPayload.result_count,
    hint: copyAiPayload.hint,
  };

  for (const query of ['copy.ai?', 'copy.ai,', 'Can you find copy.ai?']) {
    const punctuatedPayload = parsePayload(await client.callTool({
      name: 'search_icons',
      arguments: { query, library_mode: 'all', limit: 5 },
    }));
    assert.equal(punctuatedPayload.code, 'no_icons_found', `${query} must remain an honest MCP zero`);
    assert.equal(punctuatedPayload.result_count, 0, `${query} must not fabricate MCP brand results`);
    assert.equal('results' in punctuatedPayload, false, `${query} must keep MCP results absent`);
  }

  const followupPayload = parsePayload(await client.callTool({
    name: 'search_icons',
    arguments: { query: 'openai', library_mode: 'all', limit: 5 },
  }));
  assert.ok(followupPayload.result_count > 0);
  assert.ok(followupPayload.results.some((icon) => icon.icon_ref === 'tabler:brand-openai'));
  localFollowupExample = {
    result_count: followupPayload.result_count,
    refs: followupPayload.results.map((icon) => icon.icon_ref),
  };
} finally {
  await client.close();
}

const warmStrictRecoveryLatencies = strictRecoveryLatenciesMs.slice(1).sort((a, b) => a - b);
const warmStrictRecoveryP95 = warmStrictRecoveryLatencies[
  Math.ceil(warmStrictRecoveryLatencies.length * 0.95) - 1
];
assert.ok(
  warmStrictRecoveryP95 <= 1_000,
  `Strict-zero recovery warm p95 was ${warmStrictRecoveryP95} ms, above 1000 ms. Samples: ${strictRecoveryLatenciesMs.join(', ')}.`,
);

function listen(server) {
  return new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', () => resolveListen(server.address()));
  });
}

function readBody(request) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolveBody(Buffer.concat(chunks).toString('utf8')));
    request.on('error', rejectBody);
  });
}

const hostedRequests = [];
const hostedServer = createServer(async (request, response) => {
  const body = JSON.parse(await readBody(request));
  hostedRequests.push(body);
  if (body.query === 'forced hosted outage') {
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      error: 'forced_hosted_outage',
      message: 'Forced hosted outage for agent recovery verification.',
      retryable: true,
    }));
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ results: [] }));
});
const hostedAddress = await listen(hostedServer);
const portReservation = createServer();
const appAddress = await listen(portReservation);
await new Promise((resolveClose) => portReservation.close(resolveClose));
const remoteBaseUrl = `http://127.0.0.1:${appAddress.port}`;
const controlledSecret = 'agent-library-recovery-verifier-secret-20260803';
const remoteChild = spawn(process.execPath, ['mcp/remote-server.js'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PORT: String(appAddress.port),
    SUPERICONS_RAILWAY_LOCAL_FIRST: 'on',
    SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${hostedAddress.port}/search`,
    SUPERICONS_CONTROLLED_RUN_SECRET: controlledSecret,
    SUPERICONS_MCP_USAGE_DEBUG: '0',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let remoteChildOutput = '';
for (const stream of [remoteChild.stdout, remoteChild.stderr]) {
  stream.on('data', (chunk) => {
    remoteChildOutput = `${remoteChildOutput}${chunk}`.slice(-12_000);
  });
}

async function waitForRemoteHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (remoteChild.exitCode !== null) {
      throw new Error(`Hosted candidate exited before health was ready.\n${remoteChildOutput}`);
    }
    try {
      const response = await fetch(`${remoteBaseUrl}/health`);
      if (response.ok) return response.json();
    } catch {
      // The local hosted candidate is still starting.
    }
    await delay(100);
  }
  throw new Error(`Hosted candidate did not become healthy.\n${remoteChildOutput}`);
}

let remoteClient;
try {
  const health = await waitForRemoteHealth();
  assert.equal(health.version, '0.4.27');
  const controlledHeaders = createControlledRunHeaders(
    'agent-library-recovery-verifier',
    controlledSecret,
  );
  const remoteTransport = new StreamableHTTPClientTransport(new URL(`${remoteBaseUrl}/mcp`), {
    requestInit: { headers: controlledHeaders },
  });
  remoteClient = new Client({ name: 'agent-library-recovery-hosted-verifier', version: '1.0.0' });
  await remoteClient.connect(remoteTransport);

  const hostedStrictPayload = parsePayload(await remoteClient.callTool({
    name: 'search_icons',
    arguments: { query: 'openai', library: 'si', library_mode: 'strict', limit: 5 },
  }));
  assert.equal(hostedStrictPayload.code, 'no_icons_found');
  assert.equal(hostedStrictPayload.result_count, 0);
  assert.equal((hostedStrictPayload.results || []).length, 0);
  assert.match(hostedStrictPayload.hint, /tabler:brand-openai/i);
  assert.equal(hostedRequests.length, 1, 'Strict-zero recovery must not make a second hosted request.');

  const httpResponse = await fetch(`${remoteBaseUrl}/search-icons`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...controlledHeaders },
    body: JSON.stringify({ query: 'openai', library: 'si', limit: 5 }),
  });
  const httpPayload = await httpResponse.json();
  assert.equal(httpResponse.status, 200);
  assert.equal(httpPayload.results.length, 0);
  assert.equal(hostedRequests.length, 2, 'Public HTTP strict zero must use one hosted request.');

  const hostedCopyAiPayload = parsePayload(await remoteClient.callTool({
    name: 'search_icons',
    arguments: { query: 'Can you find copy.ai?', library_mode: 'all', limit: 5 },
  }));
  assert.equal(hostedCopyAiPayload.code, 'no_icons_found');
  assert.equal(hostedCopyAiPayload.result_count, 0);
  assert.equal((hostedCopyAiPayload.results || []).length, 0);
  assert.equal(hostedRequests.length, 3, 'Hosted MCP Copy.ai must use one hosted request.');

  const fileHttpResponse = await fetch(`${remoteBaseUrl}/search-icons`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...controlledHeaders },
    body: JSON.stringify({ query: 'file.ai icon', limit: 5 }),
  });
  const fileHttpPayload = await fileHttpResponse.json();
  assert.equal(fileHttpResponse.status, 200);
  assert.ok(fileHttpPayload.results.length > 0);
  assert.ok(fileHttpPayload.results.some((icon) => iconRef(icon).includes('file')));
  assert.equal(hostedRequests.length, 4, 'Public HTTP file query must use one hosted request.');

  const hostedIllustratorPayload = parsePayload(await remoteClient.callTool({
    name: 'search_icons',
    arguments: { query: 'Adobe Illustrator .ai file', library_mode: 'all', limit: 5 },
  }));
  assert.ok(hostedIllustratorPayload.result_count > 0);
  assert.ok(hostedIllustratorPayload.results.some((icon) => icon.icon_ref === 'iconoir:adobe-illustrator'));
  assert.equal(hostedRequests.length, 5, 'Hosted MCP Illustrator query must use one hosted request.');

  const outageResult = await remoteClient.callTool({
    name: 'search_icons',
    arguments: { query: 'forced hosted outage', library: 'si', library_mode: 'strict', limit: 5 },
  });
  const outagePayload = parsePayload(outageResult);
  assert.equal(outagePayload.outcome_type, 'tool_error');
  assert.equal((outagePayload.results || []).length, 0);
  assert.equal('search_runtime' in outagePayload, false);
  assert.equal(hostedRequests.length, 6, 'Hosted outage must not trigger alternate recovery.');
} finally {
  if (remoteClient) await remoteClient.close();
  remoteChild.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => remoteChild.once('exit', resolveExit)),
    delay(2_000),
  ]);
  if (remoteChild.exitCode === null) remoteChild.kill('SIGKILL');
  await new Promise((resolveClose) => hostedServer.close(resolveClose));
}

console.log(JSON.stringify({
  status: 'ok',
  fixture_id: corpus.fixture_id,
  cases: observations.length,
  hosted_requests: hostedRequests.length,
  hosted_strict_zero_recovery: 'passed',
  public_http_strict_zero: 'passed',
  hosted_error_visibility: 'passed',
  strict_recovery_latency: {
    first_call_ms: strictRecoveryLatenciesMs[0],
    warm_sample_count: warmStrictRecoveryLatencies.length,
    warm_p95_ms: warmStrictRecoveryP95,
    gate_ms: 1_000,
  },
  response_examples: {
    strict_si_openai: localStrictRecoveryExample,
    copy_ai: localCopyAiExample,
    followed_recovery: localFollowupExample,
  },
  observations,
}, null, 2));
