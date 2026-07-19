import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const repoRoot = resolve(import.meta.dirname, '..');
const defaultManifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-mcp-docs-accuracy-authorization-manifest-2026-07-18.json',
);
const defaultPrivateRecord = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'private', 'search-v2-engine-canaries.json')
  : join(homedir(), '.supericons', 'private', 'search-v2-engine-canaries.json');
const defaultReceiptRoot = process.env.LOCALAPPDATA
  ? join(process.env.LOCALAPPDATA, 'Supericons', 'web-release-receipts')
  : join(homedir(), '.supericons', 'web-release-receipts');

export function sha256Buffer(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function sha256File(path) {
  return sha256Buffer(readFileSync(path));
}

export function sha256NormalizedText(path) {
  return sha256Buffer(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'));
}

export function assertExactProvenanceBytes(value, expectedHash) {
  assert.equal(sha256Buffer(value), expectedHash);
  return true;
}

function parseFirstJsonValue(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  for (let start = 0; start < source.length; start += 1) {
    if (source[start] !== '{' && source[start] !== '[') continue;
    const opening = source[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < source.length; end += 1) {
      const character = source[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\') escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if (character === opening) depth += 1;
      if (character === closing) depth -= 1;
      if (depth !== 0) continue;
      try {
        return JSON.parse(source.slice(start, end + 1));
      } catch {
        break;
      }
    }
  }
  throw new Error('Netlify output did not contain a complete JSON value.');
}

function sanitizeFailure(value) {
  return String(value || 'unknown failure')
    .replaceAll(repoRoot, '[workspace]')
    .replace(/[A-Za-z0-9_-]{30,}/g, '[redacted]')
    .slice(0, 500);
}

function netlifyCliPaths() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    const packageRoot = join(process.env.APPDATA, 'npm', 'node_modules', 'netlify-cli');
    const entrypoint = join(packageRoot, 'bin', 'run.js');
    const packageJson = join(packageRoot, 'package.json');
    if (existsSync(entrypoint) && existsSync(packageJson)) {
      return { entrypoint, packageJson };
    }
  }
  throw new Error('The local Netlify CLI entry point is unavailable.');
}

export function readNetlifyCliBinding() {
  const paths = netlifyCliPaths();
  return {
    version: JSON.parse(readFileSync(paths.packageJson, 'utf8')).version,
    entrypoint_sha256: sha256File(paths.entrypoint),
    package_json_sha256: sha256File(paths.packageJson),
  };
}

export function verifyNetlifyCliBinding(binding) {
  assert.deepEqual(readNetlifyCliBinding(), {
    version: binding.version,
    entrypoint_sha256: binding.entrypoint_sha256,
    package_json_sha256: binding.package_json_sha256,
  });
  return binding;
}

export function createNetlifyInvoker(binding) {
  const cliPath = netlifyCliPaths().entrypoint;
  verifyNetlifyCliBinding(binding);
  return (args) => {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.status !== 0) {
      throw new Error(sanitizeFailure(`${result.stdout || ''}\n${result.stderr || ''}`));
    }
    return parseFirstJsonValue(result.stdout);
  };
}

function atomicCreateJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
}

function replaceJson(path, value) {
  const temporaryPath = `${path}.${process.pid}.tmp`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(temporaryPath, path);
}

function siteData(siteId, extra = {}) {
  return JSON.stringify({ site_id: siteId, ...extra });
}

async function currentPublishedDeploy(netlify, siteId) {
  const site = await netlify(['api', 'getSite', '--data', siteData(siteId)]);
  assert.equal(site.id, siteId);
  assert.equal(site.published_deploy?.state, 'ready');
  return site.published_deploy;
}

export async function waitForPublishedDeploy(
  netlify,
  siteId,
  deployId,
  {
    maximumAttempts = 30,
    intervalMs = 2000,
    wait = (milliseconds) => new Promise((resolvePromise) => {
      setTimeout(resolvePromise, milliseconds);
    }),
  } = {},
) {
  assert.ok(Number.isInteger(maximumAttempts) && maximumAttempts >= 1);
  assert.ok(Number.isInteger(intervalMs) && intervalMs >= 0);
  assert.equal(typeof wait, 'function');
  let lastFailure = null;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const published = await currentPublishedDeploy(netlify, siteId);
      if (published.id === deployId) return published;
      lastFailure = `production still reports deploy ${published.id}`;
    } catch (error) {
      lastFailure = error?.message || String(error);
    }
    if (attempt < maximumAttempts) await wait(intervalMs);
  }

  throw new Error(
    `New production deploy did not become visible after ${maximumAttempts} checks: ${lastFailure}`,
  );
}

async function restoreExactDeploy(netlify, siteId, deployId) {
  await netlify([
    'api',
    'restoreSiteDeploy',
    '--data',
    siteData(siteId, { deploy_id: deployId }),
  ]);
  const restored = await currentPublishedDeploy(netlify, siteId);
  assert.equal(restored.id, deployId, 'Netlify did not restore the pinned production deploy.');
  return restored;
}

export async function executeBoundedNetlifyRelease({
  manifest,
  manifestHash,
  artifactRoot,
  receiptRoot = defaultReceiptRoot,
  netlify,
  verifyLive,
  visibilityWait = {},
  now = () => new Date().toISOString(),
}) {
  assert.equal(typeof netlify, 'function');
  assert.equal(typeof verifyLive, 'function');
  const { site_id: siteId, rollback_deploy_id: rollbackDeployId } = manifest.netlify;
  const receiptPath = join(receiptRoot, `${manifestHash}.json`);
  if (existsSync(receiptPath)) {
    throw new Error('This web release manifest already has a terminal or in-progress receipt.');
  }

  const before = await currentPublishedDeploy(netlify, siteId);
  assert.equal(
    before.id,
    rollbackDeployId,
    'Current Netlify production does not match the manifest rollback target.',
  );

  const receipt = {
    schema_version: 1,
    manifest_sha256: manifestHash,
    action: manifest.release.id,
    site_id: siteId,
    rollback_deploy_id: rollbackDeployId,
    status: 'reserved',
    reserved_at_utc: now(),
  };
  atomicCreateJson(receiptPath, receipt);

  let deploymentId = null;
  let deploymentAttempted = false;
  try {
    deploymentAttempted = true;
    const deployment = await netlify([
      'deploy',
      '--prod',
      '--dir',
      artifactRoot,
      '--site',
      siteId,
      '--no-build',
      '--json',
      '--message',
      manifest.release.title,
    ]);
    deploymentId = deployment.deploy_id || deployment.id;
    assert.match(deploymentId || '', /^[a-z0-9]{24}$/);

    const published = await waitForPublishedDeploy(
      netlify,
      siteId,
      deploymentId,
      visibilityWait,
    );
    assert.equal(new URL(published.ssl_url).hostname, manifest.netlify.hostname);

    const liveEvidence = await verifyLive(published.ssl_url);
    const completed = {
      ...receipt,
      status: 'published_and_verified',
      deploy_id: deploymentId,
      published_url: published.ssl_url,
      completed_at_utc: now(),
      live_evidence: liveEvidence,
    };
    replaceJson(receiptPath, completed);
    return completed;
  } catch (error) {
    const failure = sanitizeFailure(error?.message || error);
    try {
      if (deploymentAttempted) {
        await restoreExactDeploy(netlify, siteId, rollbackDeployId);
      }
      replaceJson(receiptPath, {
        ...receipt,
        status: 'rolled_back',
        deploy_id: deploymentId,
        deployment_attempted: deploymentAttempted,
        rollback_used: deploymentAttempted,
        failure,
        completed_at_utc: now(),
      });
    } catch (rollbackError) {
      replaceJson(receiptPath, {
        ...receipt,
        status: 'rollback_failed',
        deploy_id: deploymentId,
        deployment_attempted: deploymentAttempted,
        failure,
        rollback_failure: sanitizeFailure(rollbackError?.message || rollbackError),
        completed_at_utc: now(),
      });
      throw new Error(`Web release failed and exact rollback verification failed: ${failure}`);
    }
    throw new Error(`Web release failed and production was restored: ${failure}`);
  }
}

function runLocalCommand(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 60 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(sanitizeFailure(`${result.stdout || ''}\n${result.stderr || ''}`));
  }
  return parseFirstJsonValue(result.stdout);
}

function runLocalSuccess(args, testedSurface) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 60 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(sanitizeFailure(`${result.stdout || ''}\n${result.stderr || ''}`));
  }
  return {
    status: 'ok',
    tested_surface: testedSurface,
    command_output: String(result.stdout || '').trim(),
  };
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || `git ${args.join(' ')} failed.`);
  return result.stdout.trim();
}

function assertRequiredHashes(manifest) {
  for (const [relativePath, expectedHash] of Object.entries(manifest.preparation.required_file_sha256)) {
    assert.equal(sha256File(join(repoRoot, relativePath)), expectedHash, `${relativePath} changed.`);
  }
}

export function prepareAndVerifyArtifact({
  manifest,
  privateRecordPath = defaultPrivateRecord,
  outputRoot,
}) {
  assert.equal(
    runGit(['rev-parse', `${manifest.preparation.source_commit}^{tree}`]),
    manifest.preparation.source_tree,
  );
  const ancestry = spawnSync(
    'git',
    ['merge-base', '--is-ancestor', manifest.preparation.source_commit, 'HEAD'],
    { cwd: repoRoot, encoding: 'utf8', windowsHide: true },
  );
  assert.equal(ancestry.status, 0, 'The pinned source commit is not an ancestor of HEAD.');

  const packetChanges = runGit([
    'diff',
    '--name-only',
    `${manifest.preparation.source_commit}..HEAD`,
  ]).split(/\r?\n/).filter(Boolean);
  const allowedPacketPaths = new Set(manifest.preparation.allowed_packet_paths);
  for (const path of packetChanges) {
    assert.equal(allowedPacketPaths.has(path), true, `Unbound file changed after source commit: ${path}`);
  }

  assertRequiredHashes(manifest);
  assert.equal(sha256File(privateRecordPath), manifest.protection.private_record_sha256);
  assert.equal(
    sha256File(join(repoRoot, 'mcp', 'THIRD_PARTY_PROVENANCE.json')),
    manifest.protection.third_party_provenance_sha256,
  );
  const status = spawnSync('git', ['status', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(status.status, 0);
  assert.equal(status.stdout.trim(), '', 'The release worktree must be clean.');

  const builder = runLocalCommand([
    join(repoRoot, 'scripts', 'build-web-preview-persistence-release.mjs'),
    '--output-root',
    outputRoot,
    '--private-record',
    privateRecordPath,
    '--expected-record-sha256',
    manifest.protection.private_record_sha256,
    '--source-commit',
    manifest.preparation.source_commit,
  ]);
  assert.equal(builder.artifact.tree_sha256, manifest.artifact.tree_sha256);
  assert.equal(builder.artifact.file_count, manifest.artifact.file_count);
  assert.equal(builder.artifact.total_bytes, manifest.artifact.total_bytes);

  const catalogConsistency = runLocalSuccess([
    join(repoRoot, 'scripts', 'verify-i18n-catalogs.mjs'),
  ], 'maintained_sources_and_public_outputs');
  const clientAndDocs = runLocalSuccess([
    join(repoRoot, 'scripts', 'verify-mcp-client-tabs-browser.mjs'),
    '--use-existing-dist',
    '--artifact-root',
    outputRoot,
  ], 'existing_dist');
  const previewRegression = runLocalCommand([
    join(repoRoot, 'scripts', 'verify-mcp-preview-persistence.mjs'),
    '--use-existing-dist',
    '--artifact-root',
    outputRoot,
  ]);
  const protection = runLocalCommand([
    join(repoRoot, 'scripts', 'verify-search-v2-protected-public-artifacts.mjs'),
    '--private-record',
    privateRecordPath,
    '--expected-record-sha256',
    manifest.protection.private_record_sha256,
    '--expected-provenance-sha256',
    manifest.protection.third_party_provenance_sha256,
    '--web-root',
    join(outputRoot, 'dist'),
  ]);
  assert.equal(protection.final_web_surface_checked, true);
  return {
    builder,
    catalog_consistency: catalogConsistency,
    client_and_docs: clientAndDocs,
    preview_regression: previewRegression,
    protection,
  };
}

export async function verifyRemoteWebSurface(baseUrl, manifest, privateRecordPath) {
  const root = new URL(baseUrl);
  const fetchResponse = async (pathname) => {
    const url = new URL(pathname, root);
    url.searchParams.set('release_check', Date.now().toString());
    const response = await fetch(url, { redirect: 'follow' });
    assert.equal(response.ok, true, `${pathname} returned HTTP ${response.status}.`);
    return response;
  };
  const fetchText = async (pathname) => (await fetchResponse(pathname)).text();
  const fetchBytes = async (pathname) => Buffer.from(
    await (await fetchResponse(pathname)).arrayBuffer(),
  );

  const homepage = await fetchText('/');
  assert.match(homepage, /mcpClientTabs/);
  assert.match(homepage, /Free icon tools work without an API key/);
  const license = await fetchText('/search-engine-license.txt');
  assert.match(license, /may not extract/);
  const provenanceBytes = await fetchBytes('/THIRD_PARTY_PROVENANCE.json');
  assertExactProvenanceBytes(
    provenanceBytes,
    manifest.protection.third_party_provenance_sha256,
  );
  const synonyms = JSON.parse(await fetchText('/synonyms.json'));
  const privateRecord = JSON.parse(readFileSync(privateRecordPath, 'utf8'));
  for (const entry of privateRecord.entries) {
    assert.equal(synonyms[entry.target]?.includes(entry.alias), true);
  }

  const clientAndDocs = runLocalSuccess([
    join(repoRoot, 'scripts', 'verify-mcp-client-tabs-browser.mjs'),
    '--base-url',
    root.toString(),
  ], 'remote_web_surface');
  const previewRegression = runLocalCommand([
    join(repoRoot, 'scripts', 'verify-mcp-preview-persistence.mjs'),
    '--base-url',
    root.toString(),
  ]);
  return {
    homepage_ok: true,
    license_ok: true,
    provenance_ok: true,
    private_canaries_present: true,
    client_and_docs: clientAndDocs,
    preview_regression: previewRegression,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const readOnlySiteIndex = args.indexOf('--read-only-site');
  if (readOnlySiteIndex >= 0) {
    const siteId = args[readOnlySiteIndex + 1];
    assert.match(siteId || '', /^[0-9a-f-]{36}$/i);
    const binding = readNetlifyCliBinding();
    const netlify = createNetlifyInvoker(binding);
    const site = netlify(['api', 'getSite', '--data', siteData(siteId)]);
    console.log(JSON.stringify({
      status: 'read_only',
      toolchain: { netlify_cli: binding },
      site: {
        id: site.id,
        name: site.name,
        ssl_url: site.ssl_url,
        published_deploy: {
          id: site.published_deploy?.id,
          state: site.published_deploy?.state,
          ssl_url: site.published_deploy?.ssl_url,
          published_at: site.published_deploy?.published_at,
          title: site.published_deploy?.title,
        },
      },
    }, null, 2));
    return;
  }

  const execute = args.includes('--execute-approved-web-release');
  const verifyOnly = args.includes('--verify-only');
  assert.notEqual(execute, verifyOnly, 'Choose exactly one release mode.');
  const expectedIndex = args.indexOf('--expected-manifest');
  assert.ok(expectedIndex >= 0, '--expected-manifest is required.');
  const expectedManifestHash = args[expectedIndex + 1];
  assert.match(expectedManifestHash || '', /^[a-f0-9]{64}$/);
  const manifestIndex = args.indexOf('--manifest-path');
  const manifestPath = manifestIndex >= 0
    ? resolve(args[manifestIndex + 1])
    : defaultManifestPath;
  assert.equal(sha256NormalizedText(manifestPath), expectedManifestHash);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.release.id, 'search_v2_mcp_docs_accuracy');
  verifyNetlifyCliBinding(manifest.toolchain.netlify_cli);
  assert.equal(manifest.mutation_budget.netlify_production_deployments, 1);
  assert.equal(manifest.mutation_budget.netlify_restore_operations, 1);
  for (const [key, value] of Object.entries(manifest.mutation_budget)) {
    if (!['netlify_production_deployments', 'netlify_restore_operations'].includes(key)) {
      assert.equal(value, 0, `${key} must remain zero.`);
    }
  }

  const outputRoot = join(repoRoot, 'tmp', 'search-v2-mcp-docs-accuracy-release');
  const localEvidence = prepareAndVerifyArtifact({
    manifest,
    outputRoot,
  });
  if (verifyOnly) {
    console.log(JSON.stringify({
      status: 'local_packet_verified',
      manifest_sha256: expectedManifestHash,
      artifact: localEvidence.builder.artifact,
      catalog_consistency: localEvidence.catalog_consistency,
      client_and_docs: localEvidence.client_and_docs,
      preview_regression: localEvidence.preview_regression,
      protection: localEvidence.protection.probes,
    }, null, 2));
    return;
  }

  const result = await executeBoundedNetlifyRelease({
    manifest,
    manifestHash: expectedManifestHash,
    artifactRoot: join(outputRoot, 'dist'),
    netlify: createNetlifyInvoker(manifest.toolchain.netlify_cli),
    verifyLive: (baseUrl) => verifyRemoteWebSurface(baseUrl, manifest, defaultPrivateRecord),
    visibilityWait: {
      maximumAttempts: manifest.netlify.visibility_poll_attempts,
      intervalMs: manifest.netlify.visibility_poll_interval_ms,
    },
  });
  console.log(JSON.stringify(result, null, 2));
}

const directRun = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (directRun) {
  await main();
}
