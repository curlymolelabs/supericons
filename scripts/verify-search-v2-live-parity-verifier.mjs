import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const manifestHash = 'a'.repeat(64);
const directory = mkdtempSync(join(tmpdir(), 'supericons-live-parity-'));
const controlPath = join(directory, 'control.json');
const treatmentPath = join(directory, 'treatment.json');

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
  writeFileSync(controlPath, JSON.stringify(artifact('control')));
  writeFileSync(treatmentPath, JSON.stringify(artifact('treatment')));

  const passing = execFileSync(process.execPath, [
    'scripts/verify-search-v2-live-parity-artifacts.mjs',
    '--control', controlPath,
    '--treatment', treatmentPath,
    '--manifest-hash', manifestHash,
  ], { encoding: 'utf8' });
  assert.match(passing, /"status": "ok"/);

  writeFileSync(treatmentPath, JSON.stringify(artifact('treatment', 'c'.repeat(64))));
  const failing = spawnSync(process.execPath, [
    'scripts/verify-search-v2-live-parity-artifacts.mjs',
    '--control', controlPath,
    '--treatment', treatmentPath,
    '--manifest-hash', manifestHash,
  ], { encoding: 'utf8' });
  assert.notEqual(failing.status, 0, 'Parity verifier should reject a changed response body.');

  console.log(JSON.stringify({
    status: 'ok',
    exact_match_path: 'passed',
    changed_response_path: 'rejected',
  }, null, 2));
} finally {
  rmSync(directory, { recursive: true, force: true });
}
