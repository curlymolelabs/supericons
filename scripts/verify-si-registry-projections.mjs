import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import registryManifest from '../data/si-registry/registry-manifest.json' with { type: 'json' };
import {
  buildRegistryId,
  isValidRegistryId,
} from '../lib/si-registry/id-rules.js';
import { normalizeRegistryProviderMetadata } from '../lib/si-registry/provider-metadata.js';
import {
  OPTIONAL_RECORD_FIELDS,
  REQUIRED_RECORD_FIELDS,
  validateRegistryRecord,
} from '../lib/si-registry/record-shape.js';
import {
  INTERNAL_PROJECTION_TARGET,
  PUBLIC_PROJECTION_TARGET,
  isValidAccessTier,
  isValidProjectionPolicy,
} from '../lib/si-registry/visibility-rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const summaryPath = path.join(generatedDir, 'registry-summary.json');
const previewPath = path.join(generatedDir, 'record-preview.json');
const publicPreviewPath = path.join(generatedDir, 'public-record-preview.json');
const premiumPreviewPath = path.join(generatedDir, 'premium-record-preview.json');
const freePreviewPath = path.join(generatedDir, 'free-record-preview.json');
const publicSummaryPath = path.join(repoRoot, 'public', 'registry', 'summary.json');
const publicRegistryRecordsPath = path.join(repoRoot, 'public', 'registry', 'records.json');
const mcpSummaryPath = path.join(repoRoot, 'mcp', 'public', 'registry-summary.json');
const mcpRegistryRecordsPath = path.join(repoRoot, 'mcp', 'public', 'registry-records.json');
const premiumManifestPath = path.join(repoRoot, 'public', 'packs', 'manifest.json');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

let summary;
let recordPreview;
let publicRecordPreview;
let premiumRecordPreview;
let freeRecordPreview;
let publicSummary;
let publicRegistryRecords;
let mcpSummary;
let mcpRegistryRecords;
let premiumManifest;

try {
  summary = await readJson(summaryPath);
  recordPreview = await readJson(previewPath);
  publicRecordPreview = await readJson(publicPreviewPath);
  premiumRecordPreview = await readJson(premiumPreviewPath);
  freeRecordPreview = await readJson(freePreviewPath);
  publicSummary = await readJson(publicSummaryPath);
  publicRegistryRecords = await readJson(publicRegistryRecordsPath);
  mcpSummary = await readJson(mcpSummaryPath);
  mcpRegistryRecords = await readJson(mcpRegistryRecordsPath);
  premiumManifest = await readJson(premiumManifestPath);
} catch (error) {
  console.error('verify-si-registry-projections: generated registry outputs are missing. Run: node scripts/build-si-registry-projections.mjs');
  process.exit(1);
}

const freeRecordGroups = await Promise.all(
  (registryManifest.recordGroups || [])
    .filter((recordGroup) => recordGroup.sourceGroup === 'free')
    .map(async (recordGroup) => {
      const records = await readJson(path.join(repoRoot, 'data', 'si-registry', recordGroup.path));
      return Array.isArray(records) ? records : [];
    })
);
const expectedFreeCount = freeRecordGroups.reduce((total, records) => total + records.length, 0);
const expectedFreeReviewStates = freeRecordGroups.flat().reduce((counts, record) => {
  const key = record.review_state ?? 'unknown';
  counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});
const expectedPremiumCount = Object.values(premiumManifest).reduce(
  (total, collection) => total + (Array.isArray(collection?.icons) ? collection.icons.length : 0),
  0
);
const expectedTotalCount = expectedFreeCount + expectedPremiumCount;
const expectedProvider = normalizeRegistryProviderMetadata(registryManifest.provider);
const providerPrefixedId = `${expectedProvider.namespace}:`;

assert.ok(Array.isArray(REQUIRED_RECORD_FIELDS), 'required field list should exist');
assert.ok(REQUIRED_RECORD_FIELDS.includes('icon_id'), 'required field list should include icon_id');
assert.equal(REQUIRED_RECORD_FIELDS.includes('avoid_when'), false, 'avoid_when should not be required');
assert.equal(OPTIONAL_RECORD_FIELDS.includes('avoid_when'), true, 'avoid_when should be optional');
assert.equal(PUBLIC_PROJECTION_TARGET, 'generated_public_projection');
assert.equal(INTERNAL_PROJECTION_TARGET, 'generated_internal_projection');

assert.equal(summary.schemaVersion, '1.0.0');
assert.deepEqual(summary.provider, expectedProvider);
assert.equal(summary.totalRecordCount, expectedTotalCount);
assert.deepEqual(summary.sourceGroups, { premium: expectedPremiumCount, free: expectedFreeCount });
assert.deepEqual(summary.accessTiers, {
  public_open_record: expectedFreeCount,
  protected_premium_record: expectedPremiumCount,
});
assert.deepEqual(summary.reviewStates, {
  ...expectedFreeReviewStates,
  source_mapped: (expectedFreeReviewStates.source_mapped || 0) + expectedPremiumCount,
});
assert.equal(summary.publicRecordCount, expectedFreeCount);
assert.equal(summary.internalRecordCount, expectedTotalCount);
assert.deepEqual(publicSummary.provider, expectedProvider);
assert.deepEqual(mcpSummary.provider, expectedProvider);
assert.equal(publicSummary.schemaVersion, summary.schemaVersion);
assert.equal(mcpSummary.schemaVersion, summary.schemaVersion);
assert.equal(publicSummary.publicRecordCount, expectedFreeCount);
assert.equal(mcpSummary.publicRecordCount, expectedFreeCount);
assert.deepEqual(publicSummary.publicAccessTiers, { public_open_record: expectedFreeCount });
assert.deepEqual(mcpSummary.publicAccessTiers, { public_open_record: expectedFreeCount });

assert.equal(recordPreview.length, expectedTotalCount, 'internal record preview should contain the premium normalization plus free semantic records');
assert.equal(publicRecordPreview.length, expectedFreeCount, 'public record preview should contain only public-safe free records');
assert.equal(premiumRecordPreview.length, expectedPremiumCount, 'premium preview should contain all normalized premium records');
assert.equal(freeRecordPreview.length, expectedFreeCount, 'free preview should contain the curated free pilot plus approved semantic records');
assert.equal(publicRegistryRecords.length, expectedFreeCount, 'site public registry records should contain the public-safe semantic records');
assert.equal(mcpRegistryRecords.length, expectedFreeCount, 'MCP public registry records should contain the public-safe semantic records');

const previewIds = new Set(recordPreview.map((record) => record.icon_id));
assert.equal(previewIds.size, recordPreview.length, 'record preview should not contain duplicate ids');

assert.equal(
  previewIds.has('si:ai-agentic-agent'),
  true,
  'premium normalization should generate collision-safe SI ids'
);
assert.equal(
  previewIds.has('si:status-feedback-circle-check'),
  true,
  'premium normalization should include prefixed SI ids for duplicate-prone pack names'
);
assert.equal(
  previewIds.has('lucide:shield-check'),
  true,
  'free pilot should still include lucide:shield-check'
);
assert.equal(
  previewIds.has('tabler:trash'),
  true,
  'approved semantic imports should include tabler:trash'
);
assert.equal(
  previewIds.has('lucide:bot-message-square'),
  true,
  'approved semantic imports should include lucide:bot-message-square'
);
assert.equal(
  previewIds.has('mingcute:file_search'),
  true,
  'approved MingCute imports should include mingcute:file_search'
);

for (const record of recordPreview) {
  validateRegistryRecord(record);
  assert.equal(buildRegistryId(record), record.icon_id, `derived icon_id should match for ${record.label}`);
  assert.equal(isValidRegistryId(record.icon_id), true, `icon_id should be valid for ${record.label}`);
  assert.equal(isValidAccessTier(record.access_tier), true, `access_tier should be valid for ${record.label}`);
  assert.equal(
    isValidProjectionPolicy(record.projection_policy),
    true,
    `projection_policy should be valid for ${record.label}`
  );
}

for (const record of publicRecordPreview) {
  assert.equal('provider' in record, false, `public records should not include nested provider branding (${record.icon_id})`);
  assert.equal('providerName' in record, false, `public records should not include providerName (${record.icon_id})`);
  assert.equal('providerNamespace' in record, false, `public records should not include providerNamespace (${record.icon_id})`);
  assert.equal('providerHomepage' in record, false, `public records should not include providerHomepage (${record.icon_id})`);
  assert.equal('source_group' in record, false, `public records should not include source_group (${record.icon_id})`);
  assert.equal('version' in record, false, `public records should not include version (${record.icon_id})`);
  assert.equal('status' in record, false, `public records should not include status (${record.icon_id})`);
  assert.equal('access_tier' in record, false, `public records should not include access_tier (${record.icon_id})`);
  assert.equal('projection_policy' in record, false, `public records should not include projection_policy (${record.icon_id})`);
  assert.equal('is_premium' in record, false, `public records should not include is_premium (${record.icon_id})`);
  assert.equal('intent' in record, false, `public records should not include intent (${record.icon_id})`);
  assert.equal('domain' in record, false, `public records should not include domain (${record.icon_id})`);
  assert.equal('review_state' in record, false, `public records should not include review_state (${record.icon_id})`);
  assert.equal('evidence' in record, false, `public records should not include evidence (${record.icon_id})`);
  assert.equal('confidence' in record, false, `public records should not include confidence (${record.icon_id})`);
  assert.equal('projectionTargets' in record, false, `public records should not include projectionTargets (${record.icon_id})`);
  if (record.icon_id.startsWith(providerPrefixedId)) {
    assert.equal(
      record.source_library,
      expectedProvider.namespace,
      `provider-prefixed ids must only be used for native provider records (${record.icon_id})`
    );
  }
  if (record.source_library === expectedProvider.namespace) {
    assert.equal(
      record.icon_id.startsWith(providerPrefixedId),
      true,
      `native provider records must use the provider namespace (${record.icon_id})`
    );
  }
  if (record.source_library !== expectedProvider.namespace) {
    assert.equal(
      record.icon_id.startsWith(providerPrefixedId),
      false,
      `third-party records must not use the provider namespace (${record.icon_id})`
    );
  }
}

for (const record of premiumRecordPreview) {
  assert.equal(record.access_tier, 'protected_premium_record', `premium preview should stay protected (${record.icon_id})`);
}

for (const record of freeRecordPreview) {
  assert.equal(record.access_tier, 'public_open_record', `free preview should stay public-safe (${record.icon_id})`);
}

assert.equal(
  publicRecordPreview.some((record) => record.internalSignals || record.editorialNotes),
  false,
  'internal-only operational fields must not leak into the public preview'
);

assert.deepEqual(publicRegistryRecords, publicRecordPreview, 'site public registry records should mirror the generated public preview');
assert.deepEqual(mcpRegistryRecords, publicRecordPreview, 'MCP public registry records should mirror the generated public preview');
assert.deepEqual(publicSummary, mcpSummary, 'site and MCP public registry summaries should match');

console.log('verify-si-registry-projections: ok');
