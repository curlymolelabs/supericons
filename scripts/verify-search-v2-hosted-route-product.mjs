import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createControlledRunHeaders } from '../mcp/controlled-run-auth.js';

const requestedBaseUrl = String(process.argv[2] || '').replace(/\/+$/, '');
const expectedVersion = String(
  process.env.SUPERICONS_EXPECTED_VERSION ||
    JSON.parse(readFileSync(new URL('../mcp/package.json', import.meta.url), 'utf8')).version,
).trim();
const outputPath = String(process.env.SUPERICONS_VERIFICATION_OUTPUT || '').trim();
const controlledRunLabel = 'search-v2-hosted-route-product-gate';
const controlledRunSecret = requestedBaseUrl
  ? String(process.env.SUPERICONS_CONTROLLED_RUN_SECRET || '').trim()
  : 'local-search-v2-product-gate-secret-20260723';
assert.ok(
  controlledRunSecret.length >= 32,
  'SUPERICONS_CONTROLLED_RUN_SECRET must be set to the live Railway secret for a live verification run.',
);
const controlledHeaders = createControlledRunHeaders(controlledRunLabel, controlledRunSecret);
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
      ...controlledHeaders,
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
  for (const pattern of searchCase.forbiddenPatterns || []) {
    assert.equal(
      refs.slice(0, searchCase.forbiddenLimit || 5).some((ref) => pattern.test(ref)),
      false,
      `${searchCase.query} included a forbidden result pattern near the top. Received: ${refs.join(', ')}`,
    );
  }

  assert.ok(
    ['hosted', 'hosted_fused', 'local_fallback'].includes(payload.search_runtime?.mode),
    `${searchCase.query} used an unexpected route: ${payload.search_runtime?.mode}`,
  );
  assert.equal(payload.search_runtime?.hosted_search_calls, 1);
  if (payload.search_runtime?.mode === 'hosted') {
    assert.equal(payload.search_runtime?.fallback_used, false);
  }
  if (payload.search_runtime?.mode === 'hosted_fused') {
    assert.equal(payload.search_runtime?.fallback_used, false);
    assert.equal(payload.search_runtime?.local_fusion_used, true);
  }
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
    topLimit: 3,
    forbiddenPatterns: [/network-x/i, /network-slash/i, /wifi/i],
  },
  {
    query: 'tow truck',
    topIncludes: ['material:auto_towing', 'tabler:truck-loading', 'phosphor:truck-trailer', 'tabler:car-crane'],
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
    forbiddenLimit: 5,
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
    topIncludes: ['phosphor:hard-hat', 'phosphor:baseball-helmet', 'phosphor:football-helmet'],
    topLimit: 3,
    forbiddenPatterns: [/:palette$/i, /magic-wand/i, /calendar-star/i],
  },
  {
    query: 'network disconnected broken link',
    library: 'lucide',
    topIncludes: ['lucide:link-2-off', 'lucide:unlink', 'lucide:wifi-off'],
    topLimit: 3,
  },
  {
    query: 'casco de construcción',
    locale: 'es',
    library: 'lucide',
    topIncludes: ['lucide:hard-hat', 'lucide:construction'],
    topLimit: 3,
  },
  {
    query: 'red de nodos conectados',
    locale: 'es',
    library: 'phosphor',
    topIncludes: ['phosphor:graph', 'phosphor:network', 'phosphor:share-network'],
    topLimit: 3,
    forbiddenPatterns: [/wifi/i],
  },
  {
    query: 'つながった人々',
    locale: 'ja',
    library: 'phosphor',
    topIncludes: ['phosphor:users', 'phosphor:users-three', 'phosphor:share-network', 'phosphor:link'],
    topLimit: 3,
    forbiddenPatterns: [/wifi/i],
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
    query: 'checklist tarefas pendentes',
    locale: 'pt',
    library: 'lucide',
    topIncludes: ['lucide:list-checks', 'lucide:list-check', 'lucide:clipboard-check'],
    topLimit: 3,
  },
  {
    query: 'broom cleanup construction',
    library: 'tabler',
    topIncludes: ['tabler:vacuum-cleaner', 'tabler:brush'],
    topLimit: 3,
  },
  {
    query: 'clientes empresas contatos',
    locale: 'pt',
    library: 'lucide',
    topIncludes: ['lucide:users', 'lucide:contact', 'lucide:building'],
    topLimit: 3,
  },
  {
    query: 'excavator construction vehicle',
    topIncludes: [
      'tabler:bulldozer',
      'phosphor:bulldozer',
      'lucide:tractor',
      'material:construction',
      'tabler:car-crane',
    ],
    topLimit: 3,
  },
  {
    query: 'email document',
    library: 'lucide',
    topIncludes: ['lucide:file-text', 'lucide:mail', 'lucide:files'],
    topLimit: 3,
  },
  {
    query: 'game controller gaming',
    library: 'phosphor',
    first: 'phosphor:game-controller',
  },
  {
    query: 'work review queue inbox',
    library: 'phosphor',
    topIncludes: ['phosphor:tray', 'phosphor:tray-arrow-down'],
    topLimit: 3,
  },
  {
    query: 'claw grab grapple',
    library: 'tabler',
    first: 'tabler:hand-grab',
  },
  {
    query: 'why choose us',
    library: 'lucide',
    topIncludes: ['lucide:badge-check', 'lucide:shield-check'],
    topLimit: 3,
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
      SUPERICONS_CONTROLLED_RUN_SECRET: controlledRunSecret,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', (chunk) => {
    childOutput = `${childOutput}${chunk}`.slice(-12_000);
  });
  child.stderr.on('data', (chunk) => {
    childOutput = `${childOutput}${chunk}`.slice(-12_000);
  });
}

let transport;
try {
  const health = await waitForHealth();
  assert.equal(health.version, expectedVersion);
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
      headers: {
        'user-agent': 'supericons-search-v2-route-product-gate/1.0',
        ...controlledHeaders,
      },
    },
  });
  const client = new Client({
    name: 'search-v2-route-product-gate',
    version: '1.0.0',
  });
  await client.connect(transport);

  for (const searchCase of cases) {
    const mcpPayload = parseMcpPayload(
      await client.callTool({
        name: 'search_icons',
        arguments: {
          query: searchCase.query,
          library: searchCase.library || undefined,
          library_mode: searchCase.libraryMode || (searchCase.library ? 'strict' : 'all'),
          locale: searchCase.locale || undefined,
          limit: searchCase.limit || 10,
        },
      }),
    );
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

  const evidence = {
    status: 'ok',
    target: requestedBaseUrl ? 'live' : 'candidate',
    base_url: baseUrl,
    version: health.version,
    controlled_run_label: controlledRunLabel,
    cases: summaries,
  };
  if (outputPath) {
    await writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  }
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  if (child) {
    child.kill('SIGTERM');
    await Promise.race([new Promise((resolveExit) => child.once('exit', resolveExit)), delay(2_000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
}
