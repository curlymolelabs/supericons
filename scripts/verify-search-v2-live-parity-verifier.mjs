import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const manifestHash = 'a'.repeat(64);
const directory = mkdtempSync(join(tmpdir(), 'supericons-live-parity-'));
const controlPath = join(directory, 'control.json');
const treatmentPath = join(directory, 'treatment.json');
const manifestPath = join(directory, 'manifest.json');

function artifact(variant, responseHash = 'b'.repeat(64)) {
  return {
    mode: 'parity',
    variant,
    manifest_sha256: manifestHash,
    parity_summary: {
      cases: 1,
      requests: 3,
      all_requests_successful: true,
      all_cases_stable_within_variant: true,
    },
    cases: [{
      case_id: 'settings-all',
      samples: 3,
      response_sha256: responseHash,
      status: 200,
      result_count: 1,
      result_icon_ids: ['lucide:settings'],
      svg_result_count: 1,
    }],
  };
}

try {
  writeFileSync(manifestPath, JSON.stringify({
    parity_precheck: {
      cases: [{ case_id: 'settings-all', minimum_results: 1 }],
    },
  }));
  const actualManifestHash = createHash('sha256')
    .update(readFileSync(manifestPath, 'utf8'))
    .digest('hex');
  const approvedArtifact = (variant, responseHash = 'b'.repeat(64)) => ({
    ...artifact(variant, responseHash),
    manifest_sha256: actualManifestHash,
  });
  writeFileSync(controlPath, JSON.stringify(approvedArtifact('control')));
  writeFileSync(treatmentPath, JSON.stringify(approvedArtifact('treatment')));

  const passing = execFileSync(process.execPath, [
    'scripts/verify-search-v2-live-parity-artifacts.mjs',
    '--control', controlPath,
    '--treatment', treatmentPath,
    '--manifest', manifestPath,
    '--manifest-hash', actualManifestHash,
  ], { encoding: 'utf8' });
  assert.match(passing, /"status": "ok"/);

  writeFileSync(treatmentPath, JSON.stringify(approvedArtifact('treatment', 'c'.repeat(64))));
  const failing = spawnSync(process.execPath, [
    'scripts/verify-search-v2-live-parity-artifacts.mjs',
    '--control', controlPath,
    '--treatment', treatmentPath,
    '--manifest', manifestPath,
    '--manifest-hash', actualManifestHash,
  ], { encoding: 'utf8' });
  assert.notEqual(failing.status, 0, 'Parity verifier should reject a changed response body.');

  const belowMinimum = approvedArtifact('treatment');
  belowMinimum.cases[0].result_count = 0;
  belowMinimum.cases[0].result_icon_ids = [];
  belowMinimum.cases[0].svg_result_count = 0;
  writeFileSync(treatmentPath, JSON.stringify(belowMinimum));
  const minimumFailure = spawnSync(process.execPath, [
    'scripts/verify-search-v2-live-parity-artifacts.mjs',
    '--control', controlPath,
    '--treatment', treatmentPath,
    '--manifest', manifestPath,
    '--manifest-hash', actualManifestHash,
  ], { encoding: 'utf8' });
  assert.notEqual(minimumFailure.status, 0, 'Parity verifier should reject a result count below the manifest minimum.');

  console.log(JSON.stringify({
    status: 'ok',
    exact_match_path: 'passed',
    changed_response_path: 'rejected',
    below_minimum_result_path: 'rejected',
  }, null, 2));
} finally {
  rmSync(directory, { recursive: true, force: true });
}
