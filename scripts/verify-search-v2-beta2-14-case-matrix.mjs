import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const tarballPath = resolve(readArgument('--tarball') || '');
assert.match(
  basename(tarballPath),
  /^supericons-mcp-0\.4\.19-beta\.2\.tgz$/,
  'Pass the exact beta.2 tarball with --tarball.',
);

const tempRoot = mkdtempSync(join(tmpdir(), 'search-v2-beta2-matrix-'));
const installRoot = join(tempRoot, 'install');
const localTarballPath = join(tempRoot, basename(tarballPath));
mkdirSync(installRoot, { recursive: true });
let transport;

function runNpm(args, cwd) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : 'npm';
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;
  return execFileSync(command, commandArgs, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: !npmExecPath && process.platform === 'win32',
  });
}

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  assert.equal(typeof text, 'string', 'Tool call returned no text payload.');
  return JSON.parse(text);
}

function refs(payload) {
  return (payload.results || []).map((icon) => icon.icon_ref);
}

function assertLocal(payload) {
  assert.equal(payload.search_runtime?.mode, 'local_first');
  assert.equal(payload.search_runtime?.index_generated_at, '2026-07-19T20:30:08.523Z');
}

function assertRelevant(refList, patterns, message) {
  const joined = refList.join(' ');
  assert.ok(patterns.some((pattern) => pattern.test(joined)), message);
}

try {
  copyFileSync(tarballPath, localTarballPath);
  writeFileSync(join(installRoot, 'package.json'), JSON.stringify({
    name: 'search-v2-beta2-matrix',
    private: true,
    type: 'module',
  }, null, 2));
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund', localTarballPath], installRoot);

  const packageRoot = join(installRoot, 'node_modules', '@supericons', 'mcp');
  const installedPackage = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(installedPackage.version, '0.4.19-beta.2');

  const sdkClientRoot = join(
    installRoot,
    'node_modules',
    '@modelcontextprotocol',
    'sdk',
    'dist',
    'esm',
    'client',
  );
  const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
  const { StdioClientTransport } = await import(pathToFileURL(join(sdkClientRoot, 'stdio.js')).href);

  transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(packageRoot, 'index.js')],
    cwd: packageRoot,
    env: {
      ...process.env,
      SUPERICONS_API_KEY: '',
      SUPERICONS_DISABLE_TELEMETRY: '1',
      SUPERICONS_MCP_LOG_STARTUP: '0',
    },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'search-v2-beta2-matrix', version: '1.0.0' });
  await client.connect(transport);

  const observations = [];
  async function search(argumentsValue) {
    return parsePayload(await client.callTool({
      name: 'search_icons',
      arguments: argumentsValue,
    }));
  }

  const database = await search({ query: 'database', limit: 5, include_query_frame: true });
  assertLocal(database);
  assert.equal(database.results.length, 5);
  assert.ok(refs(database).every((ref) => /database/i.test(ref)));
  observations.push({ id: 1, verdict: 'pass', result_refs: refs(database) });

  const lucideSettings = await search({
    query: 'user settings',
    library: 'lucide',
    library_mode: 'strict',
    limit: 10,
  });
  assertLocal(lucideSettings);
  assert.ok(lucideSettings.results.length > 0);
  assert.ok(lucideSettings.results.every((icon) => icon.library === 'lucide'));
  assertRelevant(refs(lucideSettings).slice(0, 3), [/user.*(?:cog|settings)|(?:cog|settings).*user/i], 'Lucide settings results are not relevant.');
  observations.push({ id: 2, verdict: 'pass', result_refs: refs(lucideSettings) });

  const dashboard = await search({
    query: 'analytics dashboard',
    library: 'tabler',
    library_mode: 'prefer',
    limit: 10,
  });
  assertLocal(dashboard);
  assert.ok(dashboard.results.length >= 3);
  assert.equal(dashboard.results[0].library, 'tabler');
  assert.ok(dashboard.results.slice(0, 3).every((icon) => (
    /dashboard|analytics|chart/i.test(`${icon.id} ${icon.name}`)
  )));
  assert.ok(dashboard.results.every((icon) => icon.matchedQueryVariant));
  observations.push({ id: 3, verdict: 'pass', result_refs: refs(dashboard).slice(0, 3) });

  const restore = await search({
    query: 'restore an item that was deleted by mistake',
    limit: 10,
    include_query_frame: true,
  });
  assertLocal(restore);
  assert.ok(restore.results.length > 0);
  assertRelevant(refs(restore).slice(0, 3), [/restore|undo|history|trash/i], 'Restore intent did not produce a relevant top result.');
  observations.push({ id: 4, verdict: 'pass', result_refs: refs(restore).slice(0, 3) });

  const typo = await search({
    query: 'analtyics dashbord',
    limit: 10,
    include_query_frame: true,
  });
  assertLocal(typo);
  assert.ok(typo.results.length > 0);
  assertRelevant(refs(typo).slice(0, 3), [/analytics|dashboard|chart/i], 'Two-word typo did not recover a relevant top result.');
  assert.ok(typo.results.every((icon) => icon.matchedQueryVariant));
  observations.push({ id: 5, verdict: 'pass', result_refs: refs(typo).slice(0, 3) });

  const siClaude = await search({
    query: 'Claude',
    library: 'si',
    library_mode: 'strict',
    limit: 10,
  });
  const simpleClaude = await search({
    query: 'Claude',
    library: 'simpleicons',
    library_mode: 'strict',
    limit: 10,
  });
  assertLocal(siClaude);
  assertLocal(simpleClaude);
  assert.equal(siClaude.code, 'no_icons_found');
  assert.equal('image_url' in siClaude, false);
  assert.deepEqual(refs(simpleClaude), ['simpleicons:claude']);
  observations.push({ id: 6, verdict: 'pass', si_outcome: siClaude.code, simpleicons_refs: refs(simpleClaude) });

  const materialOutline = await search({
    query: 'favorite',
    library: 'material',
    library_mode: 'strict',
    style: 'outline',
    limit: 5,
  });
  const materialSolid = await search({
    query: 'favorite',
    library: 'material',
    library_mode: 'strict',
    style: 'solid',
    limit: 5,
  });
  for (const [style, payload] of [['outline', materialOutline], ['solid', materialSolid]]) {
    assertLocal(payload);
    assert.ok(payload.results.length >= 2);
    assert.ok(payload.results.every((icon) => icon.library === 'material' && icon.style === style));
    assert.ok(payload.results.every((icon) => /favorite|heart|star|bookmark/.test(icon.id)));
  }
  observations.push({
    id: 7,
    verdict: 'pass',
    outline_refs: refs(materialOutline),
    solid_refs: refs(materialSolid),
  });

  const spanishCalendar = await search({ query: 'calendario', locale: 'es', limit: 5 });
  assert.ok(spanishCalendar.results.length > 0);
  assert.ok(spanishCalendar.results.every((icon) => /calendar|calend/i.test(`${icon.id} ${icon.name}`)));
  assert.notEqual(spanishCalendar.search_runtime?.mode, 'local_first');
  observations.push({ id: 8, verdict: 'pass', result_refs: refs(spanishCalendar) });

  const nonsense = await search({
    query: 'flibbertigibbet quantum banana zxqv',
    limit: 10,
    include_query_frame: true,
  });
  assertLocal(nonsense);
  assert.equal(nonsense.code, 'no_icons_found');
  assert.equal('results' in nonsense, false);
  assert.equal('image_url' in nonsense, false);
  assert.equal('markdown_image' in nonsense, false);
  assert.equal(typeof nonsense.hint, 'string');
  assert.equal(typeof nonsense.next_step, 'string');
  observations.push({ id: 9, verdict: 'pass', outcome: nonsense.code });

  const cloudRuns = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payload = await search({ query: 'cloud deployment', library_mode: 'all', limit: 10 });
    assertLocal(payload);
    assert.ok(payload.results.length > 0);
    assertRelevant(refs(payload).slice(0, 3), [/cloud|deploy|rocket|upload/i], 'Cloud deployment did not produce a relevant top result.');
    cloudRuns.push(refs(payload));
  }
  assert.deepEqual(cloudRuns[1], cloudRuns[0]);
  assert.deepEqual(cloudRuns[2], cloudRuns[0]);
  observations.push({ id: 10, verdict: 'pass', result_refs: cloudRuns[0].slice(0, 3), deterministic_runs: 3 });

  const recommendation = parsePayload(await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose distinct Lucide outline icons for an AI dashboard sidebar.',
      slots: ['model', 'prompt', 'dataset', 'evaluation', 'deployment', 'monitoring'],
      library: 'lucide',
      style: 'outline',
      limit_per_slot: 3,
      response_mode: 'assets',
      include_query_frame: true,
    },
  }));
  assert.equal(recommendation.all_slots_resolved, true);
  assert.equal(recommendation.needs_clarification, false);
  assert.equal(recommendation.results.length, 6);
  const recommendedRefs = recommendation.results.map((slot) => (
    `${slot.recommended?.library}:${slot.recommended?.id}`
  ));
  assert.equal(new Set(recommendedRefs).size, 6);
  assert.ok(recommendation.results.every((slot) => (
    slot.recommended?.library === 'lucide'
    && slot.recommended?.style === 'outline'
    && /^<svg\b/.test(slot.recommended?.svg || '')
  )));
  observations.push({ id: 11, verdict: 'pass', recommended_refs: recommendedRefs });

  const runClarification = parsePayload(await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose an icon for this UI slot without assuming what the label means.',
      slots: ['run'],
      limit_per_slot: 3,
      response_mode: 'plan',
      include_query_frame: true,
    },
  }));
  assert.equal(runClarification.all_slots_resolved, false);
  assert.equal(runClarification.needs_clarification, true);
  assert.deepEqual(runClarification.clarification_slots, ['run']);
  assert.equal(runClarification.results[0].recommended, null);
  assert.ok(runClarification.results[0].interpretations.length >= 2);
  observations.push({
    id: 12,
    verdict: 'pass',
    interpretation_ids: runClarification.results[0].interpretations.map((entry) => entry.family_id),
  });

  const arrows = await search({ query: 'arrow', library_mode: 'all', limit: 50 });
  assertLocal(arrows);
  assert.equal(arrows.results.length, 50);
  assert.equal(new Set(refs(arrows)).size, 50);
  assert.ok(arrows.results.every((icon) => /^<svg\b/.test(icon.svg || '')));
  assert.ok(arrows.results.every((icon) => {
    const preview = new URL(icon.icon_preview_url);
    return preview.protocol === 'https:';
  }));
  observations.push({ id: 13, verdict: 'pass', result_count: arrows.results.length });

  let invalidError = null;
  let invalidResult = null;
  try {
    invalidResult = await client.callTool({
      name: 'search_icons',
      arguments: { query: 'arrow', library_mode: 'all', limit: 51 },
    });
  } catch (error) {
    invalidError = error;
  }
  const invalidText = invalidError
    ? String(invalidError.message)
    : invalidResult?.content?.find((entry) => entry.type === 'text')?.text;
  assert.ok(invalidError || invalidResult?.isError, 'Limit 51 must be rejected.');
  assert.match(String(invalidText), /less than or equal to 50|maximum.*50/i);
  observations.push({ id: 14, verdict: 'pass', rejected_limit: 51 });

  console.log(JSON.stringify({
    status: 'ok',
    package: installedPackage.name,
    version: installedPackage.version,
    tarball: basename(tarballPath),
    cases: observations,
    passed: observations.length,
    failed: 0,
  }, null, 2));
} finally {
  if (transport) await transport.close().catch(() => {});
  rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
