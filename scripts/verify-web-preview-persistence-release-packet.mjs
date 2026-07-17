import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  executeBoundedNetlifyRelease,
  sha256NormalizedText,
} from './run-web-preview-persistence-release.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-web-preview-persistence-authorization-manifest-2026-07-18.json',
);
const args = process.argv.slice(2);
const expectedIndex = args.indexOf('--expected-manifest');
assert.ok(expectedIndex >= 0, '--expected-manifest is required.');
const expectedManifestHash = args[expectedIndex + 1];
assert.equal(sha256NormalizedText(manifestPath), expectedManifestHash);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function runBoundCliVerification() {
  const result = spawnSync(process.execPath, [
    join(repoRoot, 'scripts', 'run-web-preview-persistence-release.mjs'),
    '--verify-only',
    '--expected-manifest',
    expectedManifestHash,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 60 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${result.stdout || ''}\n${result.stderr || ''}`);
  const start = result.stdout.indexOf('{');
  assert.ok(start >= 0);
  const report = JSON.parse(result.stdout.slice(start));
  assert.equal(report.status, 'local_packet_verified');
  assert.equal(report.manifest_sha256, expectedManifestHash);
  return report;
}

function createMockNetlify({ rollbackDeployId, failRestore = false } = {}) {
  const calls = [];
  let currentDeployId = rollbackDeployId;
  const netlify = async (command) => {
    calls.push([...command]);
    if (command[0] === 'deploy') {
      currentDeployId = 'a'.repeat(24);
      return {
        deploy_id: currentDeployId,
        deploy_url: `https://${currentDeployId}--example.netlify.app`,
      };
    }
    assert.equal(command[0], 'api');
    if (command[1] === 'getSite') {
      return {
        id: manifest.netlify.site_id,
        published_deploy: {
          id: currentDeployId,
          state: 'ready',
          ssl_url: `https://${manifest.netlify.hostname}`,
        },
      };
    }
    if (command[1] === 'restoreSiteDeploy') {
      if (failRestore) throw new Error('controlled restore failure');
      currentDeployId = rollbackDeployId;
      return { id: rollbackDeployId };
    }
    throw new Error(`Unexpected mock command: ${command.join(' ')}`);
  };
  return {
    calls,
    netlify,
    setCurrentDeployId(value) {
      currentDeployId = value;
    },
  };
}

function commandCount(calls, command, subcommand = null) {
  return calls.filter((entry) => (
    entry[0] === command
    && (subcommand === null || entry[1] === subcommand)
  )).length;
}

async function expectRejected(operation, pattern) {
  let error = null;
  try {
    await operation();
  } catch (caught) {
    error = caught;
  }
  assert.ok(error, 'Expected the operation to reject.');
  assert.match(error.message, pattern);
}

async function runMutationSelfTests() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'supericons-web-release-tests-'));
  try {
    {
      const receiptRoot = join(temporaryRoot, 'success');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
      });
      const result = await executeBoundedNetlifyRelease({
        manifest,
        manifestHash: expectedManifestHash,
        artifactRoot: join(temporaryRoot, 'dist'),
        receiptRoot,
        netlify: mock.netlify,
        verifyLive: async () => ({ status: 'ok' }),
      });
      assert.equal(result.status, 'published_and_verified');
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 0);
      const beforeReplay = mock.calls.length;
      await expectRejected(() => executeBoundedNetlifyRelease({
        manifest,
        manifestHash: expectedManifestHash,
        artifactRoot: join(temporaryRoot, 'dist'),
        receiptRoot,
        netlify: mock.netlify,
        verifyLive: async () => ({ status: 'ok' }),
      }), /already has a terminal or in-progress receipt/);
      assert.equal(mock.calls.length, beforeReplay);
    }

    {
      const receiptRoot = join(temporaryRoot, 'smoke-failure');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
      });
      await expectRejected(() => executeBoundedNetlifyRelease({
        manifest,
        manifestHash: expectedManifestHash,
        artifactRoot: join(temporaryRoot, 'dist'),
        receiptRoot,
        netlify: mock.netlify,
        verifyLive: async () => {
          throw new Error('controlled live smoke failure');
        },
      }), /production was restored/);
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 1);
      const receipt = JSON.parse(readFileSync(
        join(receiptRoot, `${expectedManifestHash}.json`),
        'utf8',
      ));
      assert.equal(receipt.status, 'rolled_back');
      assert.equal(receipt.rollback_deploy_id, manifest.netlify.rollback_deploy_id);
    }

    {
      const receiptRoot = join(temporaryRoot, 'wrong-production');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
      });
      mock.setCurrentDeployId('b'.repeat(24));
      await expectRejected(() => executeBoundedNetlifyRelease({
        manifest,
        manifestHash: expectedManifestHash,
        artifactRoot: join(temporaryRoot, 'dist'),
        receiptRoot,
        netlify: mock.netlify,
        verifyLive: async () => ({ status: 'ok' }),
      }), /does not match the manifest rollback target/);
      assert.equal(commandCount(mock.calls, 'deploy'), 0);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 0);
    }

    {
      const receiptRoot = join(temporaryRoot, 'rollback-failure');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
        failRestore: true,
      });
      await expectRejected(() => executeBoundedNetlifyRelease({
        manifest,
        manifestHash: expectedManifestHash,
        artifactRoot: join(temporaryRoot, 'dist'),
        receiptRoot,
        netlify: mock.netlify,
        verifyLive: async () => {
          throw new Error('controlled live smoke failure');
        },
      }), /rollback verification failed/);
      const receipt = JSON.parse(readFileSync(
        join(receiptRoot, `${expectedManifestHash}.json`),
        'utf8',
      ));
      assert.equal(receipt.status, 'rollback_failed');
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 1);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

assert.deepEqual(manifest.probe_inventory.map((probe) => probe.id), [
  'exact_artifact_rebuild',
  'explicit_preview_persistence',
  'query_preview_persistence',
  'unknown_refs_zero_results',
  'late_hosted_response_invalidation',
  'view_icons_route_persistence',
  'VC-3_bundle_content',
  'VC-4_license_and_canary',
  'wrong_production_preflight_rejection',
  'single_use_release_receipt',
  'postdeploy_exact_rollback',
  'rollback_failure_terminal_record',
]);
for (const probe of manifest.probe_inventory) {
  assert.equal(probe.status, 'enforced');
}

const local = runBoundCliVerification();
await runMutationSelfTests();
console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: expectedManifestHash,
  artifact: local.artifact,
  local_behavior: local.behavior,
  protection: local.protection,
  mutation_self_tests: {
    success_one_deploy_zero_restore: true,
    replay_zero_external_calls: true,
    smoke_failure_one_exact_restore: true,
    wrong_production_zero_deploy: true,
    rollback_failure_terminal: true,
  },
}, null, 2));

