import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const requestedBaseUrl = String(process.argv[2] || '').replace(/\/+$/, '');
const port = 19_000 + Math.floor(Math.random() * 800);
const baseUrl = requestedBaseUrl || `http://127.0.0.1:${port}`;
let child = null;
let childOutput = '';

function parseMcpPayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  assert.equal(typeof text, 'string', 'MCP tool returned no JSON text payload.');
  return JSON.parse(text);
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child && child.exitCode !== null) {
      throw new Error(`Candidate server exited before health was ready.\n${childOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return response.json();
    } catch {
      // The local candidate is still starting.
    }
    await delay(150);
  }
  throw new Error(`Candidate server did not become healthy.\n${childOutput}`);
}

async function postSearch(searchCase) {
  const response = await fetch(`${baseUrl}/search-icons`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'supericons-search-v2-route-product-gate/1.0',
    },
    body: JSON.stringify({
      query: searchCase.query,
      library: searchCase.library || null,
      library_mode: searchCase.libraryMode || (searchCase.library ? 'strict' : 'all'),
      style: 'outline',
      locale: searchCase.locale || null,
      limit: searchCase.limit || 10,
    }),
  });
  assert.equal(response.status, 200, `${searchCase.query} returned HTTP ${response.status}.`);
  return response.json();
}

function getHttpRefs(payload) {
  return (payload.results || []).map((result) => result.icon_id);
}

function getMcpRefs(payload) {
  return (payload.results || []).map((result) => result.icon_ref);
}

function assertSearchCase(searchCase, payload) {
  const refs = getHttpRefs(payload);
  if (searchCase.expectedCount === 0) {
    assert.equal(refs.length, 0, `${searchCase.query} must remain an honest no-result.`);
  } else {
    assert.ok(refs.length > 0, `${searchCase.query} returned no icons.`);
  }

  if (searchCase.first) {
    assert.equal(refs[0], searchCase.first, `${searchCase.query} returned the wrong first icon.`);
  }
  if (searchCase.includes) {
    assert.ok(
      searchCase.includes.some((expected) => refs.includes(expected)),
      `${searchCase.query} did not include any required icon. Received: ${refs.join(', ')}`,
    );
  }
  if (searchCase.topIncludes) {
    const topRefs = refs.slice(0, searchCase.topLimit || 3);
    assert.ok(
      searchCase.topIncludes.some((expected) => topRefs.includes(expected)),
      `${searchCase.query} had no required icon in the first ${searchCase.topLimit || 3}. Received: ${topRefs.join(', ')}`,
    );
  }
  for (const forbidden of searchCase.forbiddenTop || []) {
    assert.notEqual(
      refs[0],
      forbidden,
      `${searchCase.query} was led by the irrelevant icon ${forbidden}.`,
    );
  }
  for (const pattern of searchCase.forbiddenPatterns || []) {
    assert.equal(
      refs.slice(0, searchCase.forbiddenLimit || 5).some((ref) => pattern.test(ref)),
      false,
      `${searchCase.query} included a forbidden result pattern near the top. Received: ${refs.join(', ')}`,
    );
  }

  assert.ok(
    ['hosted', 'local_fallback'].includes(payload.search_runtime?.mode),
    `${searchCase.query} used an unexpected route: ${payload.search_runtime?.mode}`,
  );
  assert.equal(payload.search_runtime?.hosted_search_calls, 1);
  assert.ok((payload.results || []).every((result) => !Object.hasOwn(result, 'svg')));
  assert.ok((payload.results || []).every((result) => !Object.hasOwn(result, 'semantic')));
  return refs;
}

const cases = [
  {
    query: 'hard hat construction worker',
    library: 'lucide',
    first: 'lucide:hard-hat',
  },
  {
    query: 'network proximity graph nodes',
    library: 'phosphor',
    topIncludes: ['phosphor:graph', 'phosphor:network', 'phosphor:share-network'],
    topLimit: 5,
  },
  {
    query: 'tow truck',
    topIncludes: ['bootstrap:truck', 'iconoir:truck', 'phosphor:truck-trailer'],
  },
  {
    query: 'verification audit shield check',
    library: 'lucide',
    topIncludes: ['lucide:shield-check'],
  },
  {
    query: 'forklift warehouse logistics',
    topIncludes: ['lucide:forklift', 'tabler:forklift', 'material:forklift'],
    forbiddenPatterns: [/:git/i, /utensil/i],
  },
  {
    query: 'fortress secure boundary',
    first: 'tabler:building-fortress',
    forbiddenPatterns: [/:minus/i, /layout/i, /align/i],
  },
  {
    query: 'crane hook construction',
    topIncludes: ['phosphor:crane-tower', 'mingcute:tower_crane_line', 'tabler:crane', 'phosphor:crane'],
    forbiddenPatterns: [/fish-hook/i, /fishing-hook/i],
    forbiddenLimit: 2,
  },
  {
    query: 'connection two people together care relationship',
    library: 'phosphor',
    includes: ['phosphor:hand-heart', 'phosphor:users-three', 'phosphor:link', 'phosphor:plugs-connected'],
    forbiddenPatterns: [/wifi/i],
  },
  {
    query: 'engineer hard hat professional person',
    library: 'phosphor',
    forbiddenTop: [
      'phosphor:palette',
      'phosphor:magic-wand',
      'phosphor:star',
      'phosphor:calendar-star',
    ],
  },
  {
    query: 'amazing',
    first: 'tabler:sparkles',
  },
  {
    query: 'sports',
    includes: [
      'material:sports',
      'material:sports_and_outdoors',
      'mingcute:play_football_line',
      'mingcute:basketball_line',
      'iconoir:basketball',
      'iconoir:football',
    ],
  },
  {
    query: '\u30b9\u30dd\u30fc\u30c4',
    locale: 'ja',
    first: 'material:sports',
  },
  {
    query: 'deportes',
    locale: 'es',
    includes: ['ionicons:fitness-outline', 'material:sports'],
  },
  {
    query: 'definitelymissingbrandzz',
    library: 'simpleicons',
    expectedCount: 0,
  },
  {
    query: 'florblequux',
    expectedCount: 0,
  },
];

if (!requestedBaseUrl) {
  child = spawn(process.execPath, ['mcp/remote-server.js'], {
    env: {
      ...process.env,
      PORT: String(port),
      SUPERICONS_RAILWAY_LOCAL_FIRST: 'on',
      SUPERICONS_CONTROLLED_RUN_LABEL: 'search-v2-route-product-gate',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', (chunk) => { childOutput = `${childOutput}${chunk}`.slice(-12_000); });
  child.stderr.on('data', (chunk) => { childOutput = `${childOutput}${chunk}`.slice(-12_000); });
}

let transport;
try {
  const health = await waitForHealth();
  assert.equal(health.version, '0.4.20');
  assert.equal(health.railway_local_first?.search_mode, 'hosted_primary');

  const summaries = [];
  const payloads = new Map();
  for (const searchCase of cases) {
    const startedAt = performance.now();
    const payload = await postSearch(searchCase);
    const latencyMs = performance.now() - startedAt;
    const refs = assertSearchCase(searchCase, payload);
    payloads.set(`${searchCase.query}:${searchCase.locale || ''}:${searchCase.library || ''}`, payload);
    summaries.push({
      query: searchCase.query,
      locale: searchCase.locale || 'en',
      route: payload.search_runtime.mode,
      count: refs.length,
      top: refs[0] || null,
      latency_ms: Number(latencyMs.toFixed(1)),
    });
  }

  transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: {
      headers: { 'user-agent': 'supericons-search-v2-route-product-gate/1.0' },
    },
  });
  const client = new Client({ name: 'search-v2-route-product-gate', version: '1.0.0' });
  await client.connect(transport);

  for (const searchCase of cases) {
    const mcpPayload = parseMcpPayload(await client.callTool({
      name: 'search_icons',
      arguments: {
        query: searchCase.query,
        library: searchCase.library || undefined,
        library_mode: searchCase.libraryMode || (searchCase.library ? 'strict' : 'all'),
        locale: searchCase.locale || undefined,
        limit: searchCase.limit || 10,
      },
    }));
    const httpPayload = payloads.get(`${searchCase.query}:${searchCase.locale || ''}:${searchCase.library || ''}`);
    assert.deepEqual(
      getMcpRefs(mcpPayload),
      getHttpRefs(httpPayload),
      `${searchCase.query} differed between hosted MCP and public HTTP search.`,
    );
    assert.equal(mcpPayload.search_runtime?.mode, httpPayload.search_runtime?.mode);
    if (searchCase.expectedCount === 0) {
      assert.equal(mcpPayload.code, 'no_icons_found');
      assert.equal(Object.hasOwn(mcpPayload, 'image_url'), false);
      assert.equal(Object.hasOwn(mcpPayload, 'markdown_image'), false);
    }
  }

  console.log(JSON.stringify({
    status: 'ok',
    target: requestedBaseUrl ? 'live' : 'candidate',
    base_url: baseUrl,
    version: health.version,
    cases: summaries,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  if (child) {
    child.kill('SIGTERM');
    await Promise.race([
      new Promise((resolveExit) => child.once('exit', resolveExit)),
      delay(2_000),
    ]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}
