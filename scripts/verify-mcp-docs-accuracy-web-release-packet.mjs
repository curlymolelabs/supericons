import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  executeBoundedNetlifyRelease,
  sha256NormalizedText,
  verifyNetlifyCliBinding,
} from './run-mcp-docs-accuracy-web-release.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
const manifestPath = join(
  repoRoot,
  'docs',
  'si-v2',
  'search',
  'reviews',
  'search-v2-mcp-docs-accuracy-authorization-manifest-2026-07-18.json',
);
const args = process.argv.slice(2);
const expectedIndex = args.indexOf('--expected-manifest');
assert.ok(expectedIndex >= 0, '--expected-manifest is required.');
const expectedManifestHash = args[expectedIndex + 1];
assert.equal(sha256NormalizedText(manifestPath), expectedManifestHash);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const expectedProbeInventory = [
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
  'postdeploy_read_failure_exact_rollback',
  'delayed_visibility_exact_rollback',
  'rollback_failure_terminal_record',
  'netlify_cli_binding',
  'mcp_client_tabs_all_seven',
  'active_config_clipboard',
  'tab_keyboard_navigation',
  'mobile_tab_scroll',
  'free_mcp_keyless_claim_english',
  'free_mcp_keyless_claim_localized',
  'stale_api_key_claim_absent',
  'generated_catalog_parity',
];

function runBoundCliVerification() {
  const result = spawnSync(process.execPath, [
    join(repoRoot, 'scripts', 'run-mcp-docs-accuracy-web-release.mjs'),
    '--verify-only',
    '--expected-manifest',
    expectedManifestHash,
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 80 * 1024 * 1024,
  });
  assert.equal(result.status, 0, `${result.stdout || ''}\n${result.stderr || ''}`);
  const start = result.stdout.indexOf('{');
  assert.ok(start >= 0, 'The bound runner did not return JSON evidence.');
  const report = JSON.parse(result.stdout.slice(start));
  assert.equal(report.status, 'local_packet_verified');
  assert.equal(report.manifest_sha256, expectedManifestHash);
  assert.equal(report.client_and_docs.tested_surface, 'existing_dist');
  assert.equal(report.preview_regression.tested_surface, 'existing_dist');
  return report;
}

function createMockNetlify({
  rollbackDeployId,
  failRestore = false,
  postDeployReadFailures = 0,
  delayedVisibilityReads = 0,
} = {}) {
  const calls = [];
  let currentDeployId = rollbackDeployId;
  let deploymentOccurred = false;
  let remainingReadFailures = postDeployReadFailures;
  let remainingDelayedReads = delayedVisibilityReads;
  const netlify = async (command) => {
    calls.push([...command]);
    if (command[0] === 'deploy') {
      deploymentOccurred = true;
      currentDeployId = 'a'.repeat(24);
      return {
        deploy_id: currentDeployId,
        deploy_url: `https://${currentDeployId}--example.netlify.app`,
      };
    }
    assert.equal(command[0], 'api');
    if (command[1] === 'getSite') {
      if (deploymentOccurred && remainingReadFailures > 0) {
        remainingReadFailures -= 1;
        throw new Error('controlled post-deploy site-read failure');
      }
      const visibleDeployId = deploymentOccurred && remainingDelayedReads > 0
        ? rollbackDeployId
        : currentDeployId;
      if (deploymentOccurred && remainingDelayedReads > 0) {
        remainingDelayedReads -= 1;
      }
      return {
        id: manifest.netlify.site_id,
        published_deploy: {
          id: visibleDeployId,
          state: 'ready',
          ssl_url: `https://${manifest.netlify.hostname}`,
        },
      };
    }
    if (command[1] === 'restoreSiteDeploy') {
      const dataIndex = command.indexOf('--data');
      assert.ok(dataIndex >= 0);
      const data = JSON.parse(command[dataIndex + 1]);
      assert.equal(data.site_id, manifest.netlify.site_id);
      assert.equal(data.deploy_id, rollbackDeployId);
      if (failRestore) throw new Error('controlled restore failure');
      currentDeployId = rollbackDeployId;
      deploymentOccurred = false;
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

async function executeWithMock(receiptRoot, mock, verifyLive) {
  return executeBoundedNetlifyRelease({
    manifest,
    manifestHash: expectedManifestHash,
    artifactRoot: join(receiptRoot, 'dist'),
    receiptRoot,
    netlify: mock.netlify,
    verifyLive,
  });
}

async function runMutationSelfTests() {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'supericons-mcp-docs-release-tests-'));
  try {
    {
      const receiptRoot = join(temporaryRoot, 'success');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
      });
      const result = await executeWithMock(
        receiptRoot,
        mock,
        async () => ({ status: 'ok' }),
      );
      assert.equal(result.status, 'published_and_verified');
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 0);
      const beforeReplay = mock.calls.length;
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => ({ status: 'ok' })),
        /already has a terminal or in-progress receipt/,
      );
      assert.equal(mock.calls.length, beforeReplay);
    }

    {
      const receiptRoot = join(temporaryRoot, 'wrong-production');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
      });
      mock.setCurrentDeployId('b'.repeat(24));
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => ({ status: 'ok' })),
        /does not match the manifest rollback target/,
      );
      assert.equal(commandCount(mock.calls, 'deploy'), 0);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 0);
    }

    {
      const receiptRoot = join(temporaryRoot, 'smoke-failure');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
      });
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => {
          throw new Error('controlled live smoke failure');
        }),
        /production was restored/,
      );
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 1);
      const receipt = JSON.parse(readFileSync(
        join(receiptRoot, `${expectedManifestHash}.json`),
        'utf8',
      ));
      assert.equal(receipt.status, 'rolled_back');
    }

    {
      const receiptRoot = join(temporaryRoot, 'post-deploy-read-failure');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
        postDeployReadFailures: 1,
      });
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => ({ status: 'ok' })),
        /production was restored/,
      );
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 1);
    }

    {
      const receiptRoot = join(temporaryRoot, 'delayed-visibility');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
        delayedVisibilityReads: 1,
      });
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => ({ status: 'ok' })),
        /production was restored/,
      );
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 1);
    }

    {
      const receiptRoot = join(temporaryRoot, 'restore-failure');
      const mock = createMockNetlify({
        rollbackDeployId: manifest.netlify.rollback_deploy_id,
        failRestore: true,
      });
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => {
          throw new Error('controlled live smoke failure');
        }),
        /rollback verification failed/,
      );
      assert.equal(commandCount(mock.calls, 'deploy'), 1);
      assert.equal(commandCount(mock.calls, 'api', 'restoreSiteDeploy'), 1);
      const receipt = JSON.parse(readFileSync(
        join(receiptRoot, `${expectedManifestHash}.json`),
        'utf8',
      ));
      assert.equal(receipt.status, 'rollback_failed');
      const beforeReplay = mock.calls.length;
      await expectRejected(
        () => executeWithMock(receiptRoot, mock, async () => ({ status: 'ok' })),
        /already has a terminal or in-progress receipt/,
      );
      assert.equal(mock.calls.length, beforeReplay);
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

assert.deepEqual(
  manifest.probe_inventory.map((probe) => probe.id),
  expectedProbeInventory,
);
for (const probe of manifest.probe_inventory) {
  assert.equal(probe.status, 'enforced');
}

const local = runBoundCliVerification();
const netlifyCli = verifyNetlifyCliBinding(manifest.toolchain.netlify_cli);
assert.throws(() => verifyNetlifyCliBinding({
  ...manifest.toolchain.netlify_cli,
  version: '0.0.0',
}));
assert.throws(() => verifyNetlifyCliBinding({
  ...manifest.toolchain.netlify_cli,
  entrypoint_sha256: '0'.repeat(64),
}));
await runMutationSelfTests();

console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: expectedManifestHash,
  artifact: local.artifact,
  client_and_docs: local.client_and_docs,
  preview_regression: local.preview_regression,
  protection: local.protection,
  mutation_self_tests: {
    success_one_deploy_zero_restore: true,
    replay_zero_external_calls: true,
    wrong_production_zero_deploy: true,
    smoke_failure_one_exact_restore: true,
    postdeploy_read_failure_one_exact_restore: true,
    delayed_visibility_one_exact_restore: true,
    rollback_failure_terminal_and_replay_safe: true,
  },
  netlify_cli: netlifyCli,
  netlify_cli_negative_probes: {
    wrong_version_rejected: true,
    wrong_entrypoint_hash_rejected: true,
  },
}, null, 2));
