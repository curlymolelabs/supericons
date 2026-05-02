import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const snapshotPath = path.join(repoRoot, 'data/si-registry/generated/supabase-registry-import-snapshot.json');

const BLOCKED = [
  ['A symbol representing', (value) => value.includes('a symbol representing')],
  ['A symbol for', (value) => value.includes('a symbol for')],
  ['product mark', (value) => value.includes('product mark')],
  ['official+brand', (value) => value.includes('official') && value.includes('brand')],
];

function blockedDepictsIssue(depicts) {
  const normalized = String(depicts || '').trim().toLowerCase();
  return BLOCKED.find(([, test]) => test(normalized))?.[0] ?? null;
}

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
const tables = snapshot.tables || {};
const libraryRows = tables.icon_registry_libraries || [];
const stagingRows = tables.icon_registry_import_staging || [];
const recordRows = tables.icon_registry_records || [];
const findings = tables.icon_registry_quality_findings || [];

assert.equal(snapshot.summary?.findings, 0, 'snapshot summary should have zero findings');
assert.equal(findings.length, 0, 'quality findings table should be empty for promotable snapshot');
assert.equal(recordRows.length, snapshot.summary?.recordsChecked, 'all checked records should be promotable');
assert.equal(stagingRows.length, snapshot.summary?.recordsChecked, 'staging should include every checked record');

const libraryKeys = new Set(libraryRows.map((row) => row.library_key));
const iconIds = new Set();
const libraryNames = new Set();

for (const row of recordRows) {
  assert.equal(typeof row.icon_id, 'string', 'record row icon_id should be a string');
  assert.equal(row.icon_id, `${row.library_key}:${row.source_name}`, `icon_id should match library/source for ${row.icon_id}`);
  assert.equal(libraryKeys.has(row.library_key), true, `library row should exist for ${row.library_key}`);
  assert.equal(row.quality_status, 'passing', `quality_status should be passing for ${row.icon_id}`);
  assert.equal(row.review_state, 'reviewed', `review_state should be reviewed for ${row.icon_id}`);
  assert.equal(row.access_tier, 'public_open_record', `access_tier should be public_open_record for ${row.icon_id}`);
  assert.equal(row.projection_policy, 'future_public_record', `projection_policy should be future_public_record for ${row.icon_id}`);

  const issue = blockedDepictsIssue(row.depicts);
  assert.equal(issue, null, `blocked depicts phrase ${issue} found for ${row.icon_id}`);

  assert.equal(iconIds.has(row.icon_id), false, `duplicate icon_id found: ${row.icon_id}`);
  iconIds.add(row.icon_id);

  const libraryName = `${row.library_key}:${row.source_name}`;
  assert.equal(libraryNames.has(libraryName), false, `duplicate library/source found: ${libraryName}`);
  libraryNames.add(libraryName);
}

for (const row of stagingRows) {
  assert.equal(row.import_status, 'passed', `staging row should pass for ${row.icon_id}`);
  assert.equal(row.quality_failure_count, 0, `staging row should have zero quality failures for ${row.icon_id}`);
}

console.log('verify-supabase-registry-quality: ok');
