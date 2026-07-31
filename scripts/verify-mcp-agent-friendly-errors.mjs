import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  MAX_RECOMMENDATION_SLOTS,
  buildRecommendationFailurePresentation,
  normalizeRecommendationToolArguments,
  normalizePreviewToolArguments,
} from '../mcp/search-tool-shell.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const mcpRoot = join(repoRoot, 'mcp');
const sdkClientRoot = join(
  mcpRoot,
  'node_modules',
  '@modelcontextprotocol',
  'sdk',
  'dist',
  'esm',
  'client',
);
const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
const { StreamableHTTPClientTransport } = await import(
  pathToFileURL(join(sdkClientRoot, 'streamableHttp.js')).href
);
const { StdioClientTransport } = await import(
  pathToFileURL(join(sdkClientRoot, 'stdio.js')).href
);

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

async function waitForHealth(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Hosted MCP verifier process exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The child process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error('Hosted MCP verifier process did not become healthy.');
}

const twentySlots = Array.from({ length: MAX_RECOMMENDATION_SLOTS }, (_, index) => `Slot ${index + 1}`);
const accepted = normalizeRecommendationToolArguments({
  task: 'Choose icons for a fitness application.',
  slots: twentySlots,
});
assert.equal(accepted.input_error, undefined);
assert.equal(accepted.slots.length, 20);

const rejected = normalizeRecommendationToolArguments({
  task: 'Choose icons for a fitness application.',
  slots: [...twentySlots, 'Slot 21'],
  limit_per_slot: 'many',
});
assert.equal(rejected.input_error.code, 'recommendation_slot_limit_exceeded');
assert.equal(rejected.input_error.details.received_slot_count, 21);
assert.equal(rejected.input_error.details.maximum_slot_count, 20);
assert.match(rejected.input_error.next_step, /groups of 20 or fewer/);
assert.match(rejected.input_error.warnings.join(' '), /using 3/);

const normalizedPreview = normalizePreviewToolArguments({
  icon_refs: Array.from({ length: 13 }, (_, index) => `lucide:icon-${index + 1}`),
  limit: 13,
});
assert.equal(normalizedPreview.limit, 12);
assert.equal(normalizedPreview.icon_refs.length, 12);
assert.equal(normalizedPreview.browser_icon_refs.length, 13);
assert.equal(normalizedPreview.truncated_from, 13);
assert.match(normalizedPreview.warnings.join(' '), /maximum of 12/);

const timeoutError = new Error('Hosted MCP search dependency did not respond in time.');
timeoutError.code = 'hosted_search_timeout';
timeoutError.status = 503;
timeoutError.retryable = true;
const timeoutPayload = buildRecommendationFailurePresentation({
  task: 'Choose fitness icons.',
  slots: ['Workouts'],
  error: timeoutError,
});
assert.equal(timeoutPayload.code, 'hosted_search_timeout');
assert.equal(timeoutPayload.error, 'The icon recommendation took too long and was stopped.');
assert.match(timeoutPayload.next_step, /split the slots into groups of 10 or fewer/);
assert.equal(timeoutPayload.retryable, true);

const allowanceError = new Error('Daily allowance exceeded.');
allowanceError.code = 'daily_allowance_exceeded';
allowanceError.status = 429;
allowanceError.retryable = true;
allowanceError.details = {
  tier: 'anonymous',
  daily_limit: 300,
  retry_after_seconds: 43_200,
};
const allowancePayload = buildRecommendationFailurePresentation({
  task: 'Choose fitness icons.',
  slots: ['Workouts'],
  error: allowanceError,
});
assert.equal(allowancePayload.error, 'The hosted icon recommendation limit was reached.');
assert.equal(allowancePayload.retry_after_seconds, 43_200);
assert.match(allowancePayload.next_step, /43200 seconds/);

const port = 41_000 + (process.pid % 1_000);
const hostedSearchPort = port + 1_000;
let groupedSearchRequests = 0;
const groupedSearchRequestSizes = [];
const hostedSearchServer = createServer(async (request, response) => {
  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  const body = JSON.parse(rawBody || '{}');
  groupedSearchRequests += 1;
  const queries = Array.isArray(body.queries) ? body.queries : [];
  groupedSearchRequestSizes.push(queries.length);
  const requestUrl = new URL(request.url || '/', `http://127.0.0.1:${hostedSearchPort}`);
  const returnEmptyResults = requestUrl.pathname === '/empty';
  const localPackageRequest = queries.length > 0
    && queries.every((query) => query.channel === 'local_mcp');
  const hostedFallbackProbe = queries.some((query) => String(query.query || '').includes('fallbackprobe'));
  const forcedAllowance = requestUrl.pathname === '/allowance';
  const successfulRequest = !forcedAllowance && (localPackageRequest || hostedFallbackProbe);
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    schema_version: 1,
    response_count: queries.length,
    responses: queries.map((query, index) => ({
      index,
      status: successfulRequest ? 200 : 429,
      body: successfulRequest
        ? {
          query: query.query,
          results: returnEmptyResults || hostedFallbackProbe ? [] : [{
            icon_id: 'lucide:settings',
            name: 'Settings',
            source_library: 'lucide',
            icon_type: 'svg',
            style: 'outline',
            svg: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>',
          }],
        }
        : {
          error: 'daily_allowance_exceeded',
          code: 'daily_allowance_exceeded',
          message: `Daily allowance reached while searching for ${query.query}.`,
          retryable: true,
          retry_after_seconds: 43_200,
          details: {
            tier: 'anonymous',
            daily_limit: 300,
            retry_after_seconds: 43_200,
          },
        },
    })),
  }));
});
await new Promise((resolveListen, rejectListen) => {
  hostedSearchServer.once('error', rejectListen);
  hostedSearchServer.listen(hostedSearchPort, '127.0.0.1', resolveListen);
});

const localTransport = new StdioClientTransport({
  command: process.execPath,
  args: [join(mcpRoot, 'index.js')],
  cwd: mcpRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
    SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/search`,
    SUPERICONS_MCP_GROUPED_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/grouped`,
  },
  stderr: 'pipe',
});
const localClient = new Client({ name: 'mcp-local-twenty-slots', version: '1.0.0' });
try {
  await localClient.connect(localTransport);
  const localTwentyResult = await localClient.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose icons for application settings.',
      slots: Array.from({ length: 20 }, () => 'settings'),
      response_mode: 'plan',
      limit_per_slot: 1,
    },
  });
  const localTwentyPayload = parsePayload(localTwentyResult);
  assert.equal(localTwentyResult.isError, undefined);
  assert.equal(localTwentyPayload.slot_count, 20);
  assert.equal(localTwentyPayload.results.length, 20);
  assert.equal(localTwentyPayload.results.every((slot) => Boolean(slot.recommended)), true);
  assert.equal(groupedSearchRequests, 0);
} catch (error) {
  await localTransport.close().catch(() => {});
  await localClient.close().catch(() => {});
  await new Promise((resolveClose) => hostedSearchServer.close(resolveClose));
  throw error;
}

const localFallbackTransport = new StdioClientTransport({
  command: process.execPath,
  args: [join(mcpRoot, 'index.js')],
  cwd: mcpRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
    SUPERICONS_LOCAL_FIRST: 'off',
    SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK: '1',
    SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/empty`,
    SUPERICONS_MCP_GROUPED_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/empty`,
  },
  stderr: 'pipe',
});
const localFallbackClient = new Client({ name: 'mcp-local-grouped-empty-fallback', version: '1.0.0' });
try {
  await localFallbackClient.connect(localFallbackTransport);
  const localFallbackResult = await localFallbackClient.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose an icon for application settings.',
      slots: ['settings'],
      response_mode: 'plan',
      limit_per_slot: 1,
    },
  });
  const localFallbackPayload = parsePayload(localFallbackResult);
  assert.equal(localFallbackResult.isError, undefined);
  assert.equal(localFallbackPayload.results.length, 1);
  assert.ok(localFallbackPayload.results[0].recommended);
  assert.equal(groupedSearchRequests, 1);
} catch (error) {
  await localFallbackTransport.close().catch(() => {});
  await localFallbackClient.close().catch(() => {});
  await new Promise((resolveClose) => hostedSearchServer.close(resolveClose));
  throw error;
}

const localAllowanceTransport = new StdioClientTransport({
  command: process.execPath,
  args: [join(mcpRoot, 'index.js')],
  cwd: mcpRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
    SUPERICONS_LOCAL_FIRST: 'off',
    SUPERICONS_ALLOW_LOCAL_SEARCH_FALLBACK: '1',
    SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/allowance`,
    SUPERICONS_MCP_GROUPED_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/allowance`,
  },
  stderr: 'pipe',
});
const localAllowanceClient = new Client({ name: 'mcp-local-visible-allowance', version: '1.0.0' });
try {
  const beforeLocalAllowanceRequests = groupedSearchRequests;
  await localAllowanceClient.connect(localAllowanceTransport);
  const localAllowanceResult = await localAllowanceClient.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose an icon for application settings.',
      slots: ['settings'],
      response_mode: 'plan',
      limit_per_slot: 1,
    },
  });
  const localAllowancePayload = parsePayload(localAllowanceResult);
  assert.equal(localAllowancePayload.code, 'daily_allowance_exceeded');
  assert.equal(localAllowancePayload.error, 'The hosted icon recommendation limit was reached.');
  assert.equal(localAllowancePayload.retry_after_seconds, 43_200);
  assert.equal(localAllowancePayload.results.length, 0);
  assert.equal(groupedSearchRequests, beforeLocalAllowanceRequests + 1);
} catch (error) {
  await localAllowanceTransport.close().catch(() => {});
  await localAllowanceClient.close().catch(() => {});
  await new Promise((resolveClose) => hostedSearchServer.close(resolveClose));
  throw error;
}

const child = spawn(process.execPath, ['mcp/remote-server.js'], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PORT: String(port),
    SUPERICONS_RAILWAY_LOCAL_FIRST: 'off',
    SUPERICONS_MCP_USAGE_DEBUG: '0',
    SUPERICONS_MCP_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/search`,
    SUPERICONS_MCP_GROUPED_SEARCH_URL: `http://127.0.0.1:${hostedSearchPort}/grouped`,
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let childStderr = '';
child.stderr.on('data', (chunk) => {
  childStderr += String(chunk);
});

const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`));
const client = new Client({ name: 'mcp-agent-friendly-errors', version: '1.0.0' });

try {
  await waitForHealth(`http://127.0.0.1:${port}/health`, child);
  await client.connect(transport);

  const tools = await client.listTools();
  const recommendationTool = tools.tools.find((tool) => tool.name === 'recommend_icons');
  assert.ok(recommendationTool);
  assert.match(recommendationTool.description, /up to 20 named UI slots/);

  const hostedTwentyResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose icons for a running application.',
      slots: Array.from({ length: 20 }, () => 'run'),
      response_mode: 'plan',
      limit_per_slot: '1',
    },
  });
  const hostedTwentyPayload = parsePayload(hostedTwentyResult);
  assert.equal(hostedTwentyResult.isError, undefined);
  assert.equal(hostedTwentyPayload.slot_count, 20);
  assert.equal(hostedTwentyPayload.results.length, 20);
  assert.equal(hostedTwentyPayload.needs_clarification, true);

  const hostedFallbackResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose a settings icon for a fallbackprobe application.',
      slots: ['settings'],
      response_mode: 'plan',
      limit_per_slot: 1,
    },
  });
  const hostedFallbackPayload = parsePayload(hostedFallbackResult);
  assert.equal(hostedFallbackResult.isError, undefined);
  assert.equal(hostedFallbackPayload.results.length, 1);
  assert.ok(hostedFallbackPayload.results[0].recommended);

  const hostedOverLimitResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose icons for a fitness application.',
      slots: [...twentySlots, 'Slot 21'],
      limit_per_slot: 'many',
    },
  });
  const hostedOverLimitPayload = parsePayload(hostedOverLimitResult);
  assert.equal(hostedOverLimitResult.isError, true);
  assert.equal(hostedOverLimitPayload.code, 'recommendation_slot_limit_exceeded');
  assert.match(hostedOverLimitPayload.next_step, /groups of 20 or fewer/);
  assert.match(hostedOverLimitPayload.warnings.join(' '), /using 3/);

  const hostedMissingTaskResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      slots: ['Home'],
    },
  });
  const hostedMissingTaskPayload = parsePayload(hostedMissingTaskResult);
  assert.equal(hostedMissingTaskResult.isError, true);
  assert.equal(hostedMissingTaskPayload.code, 'recommendation_task_required');

  const hostedAllowanceResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose icons for application settings.',
      slots: ['settings'],
      response_mode: 'plan',
    },
  });
  const hostedAllowancePayload = parsePayload(hostedAllowanceResult);
  assert.equal(hostedAllowanceResult.isError, true);
  assert.equal(hostedAllowancePayload.code, 'daily_allowance_exceeded');
  assert.equal(hostedAllowancePayload.error, 'The hosted icon recommendation limit was reached.');
  assert.equal(hostedAllowancePayload.retry_after_seconds, 43_200);
  assert.match(hostedAllowancePayload.next_step, /43200 seconds/);
  assert.equal(groupedSearchRequests, 4);

  const hostedPreviewInputResult = await client.callTool({
    name: 'preview_icons',
    arguments: {
      limit: 13,
    },
  });
  const hostedPreviewInputPayload = parsePayload(hostedPreviewInputResult);
  assert.equal(hostedPreviewInputResult.isError, true);
  assert.equal(hostedPreviewInputPayload.error, 'Provide either query or icon_refs.');
  assert.match(hostedPreviewInputPayload.warnings.join(' '), /maximum of 12/);

  const hostedMissingIconResult = await client.callTool({
    name: 'get_icon',
    arguments: {
      id: 'fallbackprobe-missing',
      library: 'lucide',
      style: 'outline',
    },
  });
  const hostedMissingIconPayload = parsePayload(hostedMissingIconResult);
  assert.equal(hostedMissingIconResult.isError, true);
  assert.equal(hostedMissingIconPayload.code, 'icon_not_found');
  assert.equal(hostedMissingIconPayload.retryable, false);
  assert.match(hostedMissingIconPayload.next_step, /search_icons/);
} finally {
  await transport.close().catch(() => {});
  await client.close().catch(() => {});
  await localTransport.close().catch(() => {});
  await localClient.close().catch(() => {});
  await localFallbackTransport.close().catch(() => {});
  await localFallbackClient.close().catch(() => {});
  await localAllowanceTransport.close().catch(() => {});
  await localAllowanceClient.close().catch(() => {});
  child.kill();
  await new Promise((resolveClose) => hostedSearchServer.close(resolveClose));
  await new Promise((resolveExit) => {
    if (child.exitCode !== null) {
      resolveExit();
      return;
    }
    child.once('exit', resolveExit);
    setTimeout(resolveExit, 2_000);
  });
}

assert.equal(childStderr, '', `Hosted MCP verifier wrote to stderr:\n${childStderr}`);

console.log(JSON.stringify({
  status: 'ok',
  local_recommendation_slot_limit: 20,
  hosted_recommendation_slot_limit: 20,
  local_twenty_slot_grouped_queries: 0,
  grouped_empty_used_local_fallback: true,
  hosted_grouped_empty_used_local_fallback: true,
  local_allowance_error_propagated: true,
  over_limit_code: rejected.input_error.code,
  timeout_code: timeoutPayload.code,
  allowance_retry_after_seconds: allowancePayload.retry_after_seconds,
  hosted_allowance_error_propagated: true,
  hosted_get_icon_not_found_schema: 'passed',
  preview_inline_limit: normalizedPreview.limit,
  preview_browser_count: normalizedPreview.browser_icon_refs.length,
}, null, 2));
