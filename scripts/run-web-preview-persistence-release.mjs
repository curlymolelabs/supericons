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
  'search-v2-web-preview-persistence-authorization-manifest-2026-07-18.json',
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

function netlifyCliPath() {
  if (process.platform === 'win32' && process.env.APPDATA) {
    const path = join(
      process.env.APPDATA,
      'npm',
      'node_modules',
      'netlify-cli',
      'bin',
      'run.js',
    );
    if (existsSync(path)) return path;
  }
  throw new Error('The local Netlify CLI entry point is unavailable.');
}

export function createNetlifyInvoker() {
  const cliPath = netlifyCliPath();
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
    action: 'netlify_web_preview_persistence_release',
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

    const published = await currentPublishedDeploy(netlify, siteId);
    assert.equal(published.id, deploymentId);
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
    let current = null;
    let rollbackUsed = false;
    try {
      current = await currentPublishedDeploy(netlify, siteId);
      if (current.id !== rollbackDeployId) {
        await restoreExactDeploy(netlify, siteId, rollbackDeployId);
        rollbackUsed = true;
      }
      const rolledBack = {
        ...receipt,
        status: 'rolled_back',
        deploy_id: deploymentId,
        deployment_attempted: deploymentAttempted,
        rollback_used: rollbackUsed,
        failure,
        completed_at_utc: now(),
      };
      replaceJson(receiptPath, rolledBack);
    } catch (rollbackError) {
      const rollbackFailed = {
        ...receipt,
        status: 'rollback_failed',
        deploy_id: deploymentId,
        deployment_attempted: deploymentAttempted,
        failure,
        rollback_failure: sanitizeFailure(rollbackError?.message || rollbackError),
        completed_at_utc: now(),
      };
      replaceJson(receiptPath, rollbackFailed);
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
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(sanitizeFailure(`${result.stdout || ''}\n${result.stderr || ''}`));
  }
  return parseFirstJsonValue(result.stdout);
}

function assertRequiredHashes(manifest) {
  for (const [relativePath, expectedHash] of Object.entries(manifest.preparation.required_file_sha256)) {
    assert.equal(sha256File(join(repoRoot, relativePath)), expectedHash, `${relativePath} changed.`);
  }
}

export function prepareAndVerifyArtifact({
  manifest,
  manifestHash,
  privateRecordPath = defaultPrivateRecord,
  outputRoot,
}) {
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

  const behavior = runLocalCommand([
    join(repoRoot, 'scripts', 'verify-mcp-preview-persistence.mjs'),
    '--use-existing-dist',
    '--artifact-root',
    outputRoot,
  ]);
  assert.equal(behavior.tested_surface, 'existing_dist');

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
  return { builder, behavior, protection };
}

async function verifyRemoteWebSurface(baseUrl, manifest, privateRecordPath) {
  const root = new URL(baseUrl);
  const fetchText = async (path) => {
    const url = new URL(path, root);
    url.searchParams.set('release_check', Date.now().toString());
    const response = await fetch(url, { redirect: 'follow' });
    assert.equal(response.ok, true, `${path} returned HTTP ${response.status}.`);
    return response.text();
  };

  const homepage = await fetchText('/');
  assert.match(homepage, /mcpPreviewBanner/);
  const license = await fetchText('/search-engine-license.txt');
  assert.match(license, /may not extract/);
  const provenanceText = await fetchText('/THIRD_PARTY_PROVENANCE.json');
  assert.equal(
    sha256Buffer(provenanceText.replace(/\r\n/g, '\n')),
    manifest.protection.third_party_provenance_sha256,
  );
  const synonyms = JSON.parse(await fetchText('/synonyms.json'));
  const privateRecord = JSON.parse(readFileSync(privateRecordPath, 'utf8'));
  for (const entry of privateRecord.entries) {
    assert.equal(synonyms[entry.target]?.includes(entry.alias), true);
  }

  const browser = runLocalCommand([
    join(repoRoot, 'scripts', 'verify-mcp-preview-persistence.mjs'),
    '--base-url',
    root.toString(),
  ]);
  assert.equal(browser.tested_surface, 'remote_web_surface');
  return {
    homepage_ok: true,
    license_ok: true,
    provenance_ok: true,
    private_canaries_present: true,
    preview_behavior: browser,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const execute = args.includes('--execute-approved-web-release');
  const verifyOnly = args.includes('--verify-only');
  assert.notEqual(execute, verifyOnly, 'Choose exactly one release mode.');
  const expectedIndex = args.indexOf('--expected-manifest');
  assert.ok(expectedIndex >= 0, '--expected-manifest is required.');
  const expectedManifestHash = args[expectedIndex + 1];
  assert.match(expectedManifestHash || '', /^[a-f0-9]{64}$/);
  const manifestPath = defaultManifestPath;
  assert.equal(sha256NormalizedText(manifestPath), expectedManifestHash);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.schema_version, 1);
  assert.equal(manifest.release.id, 'search_v2_web_preview_persistence');
  assert.equal(manifest.mutation_budget.netlify_production_deployments, 1);
  assert.equal(manifest.mutation_budget.netlify_restore_operations, 1);
  for (const [key, value] of Object.entries(manifest.mutation_budget)) {
    if (!['netlify_production_deployments', 'netlify_restore_operations'].includes(key)) {
      assert.equal(value, 0, `${key} must remain zero.`);
    }
  }

  const outputRoot = join(repoRoot, 'tmp', 'search-v2-web-preview-persistence-release');
  const localEvidence = prepareAndVerifyArtifact({
    manifest,
    manifestHash: expectedManifestHash,
    outputRoot,
  });
  if (verifyOnly) {
    console.log(JSON.stringify({
      status: 'local_packet_verified',
      manifest_sha256: expectedManifestHash,
      artifact: localEvidence.builder.artifact,
      behavior: localEvidence.behavior,
      protection: localEvidence.protection.probes,
    }, null, 2));
    return;
  }

  const result = await executeBoundedNetlifyRelease({
    manifest,
    manifestHash: expectedManifestHash,
    artifactRoot: join(outputRoot, 'dist'),
    netlify: createNetlifyInvoker(),
    verifyLive: (baseUrl) => verifyRemoteWebSurface(baseUrl, manifest, defaultPrivateRecord),
  });
  console.log(JSON.stringify(result, null, 2));
}

const directRun = process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename);
if (directRun) {
  await main();
}
