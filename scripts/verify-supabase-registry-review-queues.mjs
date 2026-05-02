import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const snapshotPath = path.join(repoRoot, 'data/si-registry/staging/supabase-review-queues/registry-review-queue-snapshot.json');

const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
const findings = snapshot.tables?.icon_registry_quality_findings || [];
const queueRows = snapshot.tables?.icon_registry_review_queue || [];

assert.equal(Array.isArray(findings), true, 'quality findings must be an array');
assert.equal(Array.isArray(queueRows), true, 'review queue must be an array');
assert.equal(snapshot.summary?.qualityFindings, findings.length, 'quality finding count should match summary');
assert.equal(snapshot.summary?.reviewQueueRows, queueRows.length, 'review queue count should match summary');

const queueIconIds = new Set();
for (const row of queueRows) {
  assert.equal(typeof row.icon_id, 'string', 'queue icon_id should be a string');
  assert.equal(row.icon_id.includes(':'), true, `queue icon_id should include library prefix: ${row.icon_id}`);
  assert.equal(typeof row.library_key, 'string', `queue library_key should be a string for ${row.icon_id}`);
  assert.equal(row.icon_id.startsWith(`${row.library_key}:`), true, `queue icon_id should match library_key for ${row.icon_id}`);
  assert.equal(typeof row.queue_type, 'string', `queue_type should be a string for ${row.icon_id}`);
  assert.equal(Number.isInteger(row.priority), true, `priority should be an integer for ${row.icon_id}`);
  assert.equal(row.priority >= 0 && row.priority <= 100, true, `priority should be 0-100 for ${row.icon_id}`);
  assert.equal(row.status, 'open', `queue status should be open for ${row.icon_id}`);

  assert.equal(queueIconIds.has(row.icon_id), false, `duplicate queue icon_id: ${row.icon_id}`);
  queueIconIds.add(row.icon_id);
}

for (const finding of findings) {
  assert.equal(typeof finding.icon_id, 'string', 'finding icon_id should be a string');
  assert.equal(queueIconIds.has(finding.icon_id), true, `finding should have a matching queue row: ${finding.icon_id}`);
  assert.equal(['info', 'warning', 'error', 'blocker'].includes(finding.severity), true, `invalid severity for ${finding.icon_id}`);
  assert.equal(typeof finding.issue_code, 'string', `issue_code should be a string for ${finding.icon_id}`);
  assert.equal(typeof finding.field_name, 'string', `field_name should be a string for ${finding.icon_id}`);
  assert.equal(typeof finding.message, 'string', `message should be a string for ${finding.icon_id}`);
  assert.equal(finding.status, 'open', `finding status should be open for ${finding.icon_id}`);
}

console.log('verify-supabase-registry-review-queues: ok');
console.log(`snapshot: ${path.relative(repoRoot, snapshotPath)}`);
console.log(`review queue rows: ${queueRows.length}`);
console.log(`quality findings: ${findings.length}`);
