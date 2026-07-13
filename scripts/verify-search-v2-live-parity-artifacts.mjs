import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const controlPath = readArg('control');
const treatmentPath = readArg('treatment');
const manifestPath = readArg('manifest');
const manifestHash = readArg('manifest-hash');
assert.ok(controlPath, 'Provide --control with the control parity artifact.');
assert.ok(treatmentPath, 'Provide --treatment with the treatment parity artifact.');
assert.ok(manifestPath, 'Provide --manifest with the approved authorization manifest.');
assert.match(manifestHash || '', /^[a-f0-9]{64}$/, 'Provide --manifest-hash with the approved fingerprint.');

const control = readJson(controlPath);
const treatment = readJson(treatmentPath);
const manifestText = readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(manifestText);
assert.equal(createHash('sha256').update(manifestText).digest('hex'), manifestHash);
assert.equal(control.mode, 'parity');
assert.equal(treatment.mode, 'parity');
assert.equal(control.variant, 'control');
assert.equal(treatment.variant, 'treatment');
assert.equal(control.manifest_sha256, manifestHash);
assert.equal(treatment.manifest_sha256, manifestHash);
assert.equal(control.parity_summary.all_requests_successful, true);
assert.equal(treatment.parity_summary.all_requests_successful, true);
assert.equal(control.parity_summary.all_cases_stable_within_variant, true);
assert.equal(treatment.parity_summary.all_cases_stable_within_variant, true);

const treatmentById = new Map(treatment.cases.map((entry) => [entry.case_id, entry]));
const requirementsById = new Map(manifest.parity_precheck.cases.map((entry) => [entry.case_id, entry]));
const comparisons = control.cases.map((controlCase) => {
  const treatmentCase = treatmentById.get(controlCase.case_id);
  const requirements = requirementsById.get(controlCase.case_id);
  assert.ok(treatmentCase, `${controlCase.case_id}: treatment case is missing`);
  assert.ok(requirements, `${controlCase.case_id}: manifest case is missing`);
  assert.equal(treatmentCase.response_sha256, controlCase.response_sha256, `${controlCase.case_id}: response body changed`);
  assert.equal(treatmentCase.status, controlCase.status, `${controlCase.case_id}: status changed`);
  assert.deepEqual(treatmentCase.result_icon_ids, controlCase.result_icon_ids, `${controlCase.case_id}: result order changed`);
  assert.equal(treatmentCase.svg_result_count, controlCase.svg_result_count, `${controlCase.case_id}: SVG availability changed`);
  const minimumResults = Number(requirements.minimum_results || 0);
  assert.ok(controlCase.result_count >= minimumResults, `${controlCase.case_id}: control result count is below the approved minimum`);
  assert.ok(treatmentCase.result_count >= minimumResults, `${controlCase.case_id}: treatment result count is below the approved minimum`);
  return {
    case_id: controlCase.case_id,
    response_sha256: controlCase.response_sha256,
    result_count: controlCase.result_count,
    svg_result_count: controlCase.svg_result_count,
    minimum_results: minimumResults,
  };
});

assert.equal(comparisons.length, control.parity_summary.cases);
console.log(JSON.stringify({
  status: 'ok',
  manifest_sha256: manifestHash,
  exact_live_parity_cases: comparisons.length,
  repeated_requests_per_case_per_variant: control.cases[0]?.samples || 0,
  comparisons,
}, null, 2));
