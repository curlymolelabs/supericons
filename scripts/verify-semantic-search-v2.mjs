import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DOCUMENT_TYPE_ORDER,
  buildSemanticSearchDocuments,
  summarizeSemanticSearchDocuments,
} from '../lib/semantic-search-documents.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const SECRET_OR_INTERNAL_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/i,
  /service_role/i,
  /sb_secret/i,
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /reviewer_model/i,
  /internal_review_status/i,
  /workflow_trace/i,
  /private_confidence/i,
  /prompt_notes/i,
  /<svg[\s>]/i,
  /<\/svg>/i,
];

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

function flattenEvaluationQueries(evaluationSet) {
  return (evaluationSet.query_groups || []).flatMap((group) =>
    (group.queries || []).map((query) => ({
      group_id: group.id,
      ...query,
    }))
  );
}

function assertNoUnsafeText(label, value) {
  const text = String(value || '');
  for (const pattern of SECRET_OR_INTERNAL_PATTERNS) {
    assert.ok(!pattern.test(text), `${label} contains unsafe text matching ${pattern}`);
  }
}

function assertEvaluationSet(evaluationSet) {
  assert.equal(
    evaluationSet.schema_version,
    'semantic-search-v2-evaluation-set-1',
    'evaluation set schema version should be explicit',
  );

  const groups = evaluationSet.query_groups || [];
  assert.ok(groups.length >= 5, 'evaluation set should cover multiple query groups');

  const queries = flattenEvaluationQueries(evaluationSet);
  assert.ok(queries.length >= 25, 'evaluation set should include at least 25 queries');

  const requiredGroups = new Set([
    'brand_logo_exact',
    'long_natural_language',
    'common_ui_concepts',
    'localized_concepts',
    'negative_meaning_separation',
    'recommendation_slots',
  ]);

  for (const groupId of requiredGroups) {
    assert.ok(groups.some((group) => group.id === groupId), `missing evaluation group ${groupId}`);
  }

  for (const query of queries) {
    assert.ok(query.intent_type, `${query.group_id}: query should declare intent_type`);
    assert.ok(query.query || (query.task && query.slot), `${query.group_id}: query should declare query or task+slot`);
    assert.ok(
      Array.isArray(query.acceptable_families) || Array.isArray(query.expected_top_icon_ids),
      `${query.query || query.slot}: query should define acceptable_families or expected_top_icon_ids`,
    );
    assertNoUnsafeText(`evaluation query ${query.query || query.slot}`, JSON.stringify(query));
  }
}

function assertSemanticDocuments(payload, registryRecords, iconIndex) {
  assert.equal(payload.schema_version, 'semantic-search-documents-1', 'semantic document schema version should match');
  assert.ok(Array.isArray(payload.documents), 'semantic payload should include documents[]');
  const resolvedRecordCount = registryRecords.length - payload.skipped.length;
  assert.ok(payload.skipped.length <= 50, 'semantic document builder should skip only the known small unresolved registry tail');
  assert.ok(payload.documents.length >= resolvedRecordCount * 4, 'semantic docs should cover at least four documents per resolved registry record on average');

  const summary = summarizeSemanticSearchDocuments(payload);
  for (const type of DOCUMENT_TYPE_ORDER) {
    assert.ok(summary.by_type[type] > 0, `semantic docs should include ${type} documents`);
  }

  const docIds = new Set();
  const iconDocTypes = new Map();

  for (const document of payload.documents) {
    assert.ok(document.document_id, 'semantic document should include document_id');
    assert.ok(document.icon_id?.includes(':'), `${document.document_id}: icon_id should use lib:id`);
    assert.ok(DOCUMENT_TYPE_ORDER.includes(document.document_type), `${document.document_id}: unsupported document type`);
    assert.equal(document.locale, 'en', `${document.document_id}: default locale should be en`);
    assert.ok(document.content.length > 10, `${document.document_id}: content should be meaningful`);
    assert.match(document.content_hash, /^[a-f0-9]{64}$/, `${document.document_id}: content_hash should be sha256 hex`);
    assertNoUnsafeText(document.document_id, JSON.stringify(document));

    assert.ok(!docIds.has(document.document_id), `duplicate document_id ${document.document_id}`);
    docIds.add(document.document_id);

    const existing = iconDocTypes.get(document.icon_id) || new Set();
    existing.add(document.document_type);
    iconDocTypes.set(document.icon_id, existing);
  }

  const requiredSamples = [
    ['si:x-ai', ['identity', 'meaning', 'domain', 'negative']],
    ['si:openai-codex-app', ['identity', 'meaning', 'domain', 'negative']],
    ['mingcute:scan_line', ['identity', 'meaning', 'visual', 'negative']],
  ];

  for (const [iconId, expectedTypes] of requiredSamples) {
    const types = iconDocTypes.get(iconId);
    assert.ok(types, `missing semantic documents for ${iconId}`);
    for (const expectedType of expectedTypes) {
      assert.ok(types.has(expectedType), `${iconId}: missing ${expectedType} document`);
    }
  }

  const rebuilt = buildSemanticSearchDocuments(
    iconIndex,
    registryRecords.slice(0, 50),
  );
  const rebuiltAgain = buildSemanticSearchDocuments(
    iconIndex,
    registryRecords.slice(0, 50),
  );
  assert.deepEqual(rebuilt.documents, rebuiltAgain.documents, 'semantic document generation should be deterministic');

  return summary;
}

const evaluationSet = await readJson('data/semantic-search-v2/evaluation-set.json');
const iconIndex = await readJson('public/icon-index.json');
const registryRaw = await readJson('public/registry/records.json');
const registryRecords = Array.isArray(registryRaw) ? registryRaw : registryRaw.records || [];

assertEvaluationSet(evaluationSet);
const semanticPayload = buildSemanticSearchDocuments(iconIndex, registryRaw);
const summary = assertSemanticDocuments(semanticPayload, registryRecords, iconIndex);

console.log(JSON.stringify({
  status: 'ok',
  evaluation_queries: flattenEvaluationQueries(evaluationSet).length,
  semantic_documents: summary.document_count,
  semantic_documents_by_type: summary.by_type,
  skipped: summary.skipped_count,
}, null, 2));
