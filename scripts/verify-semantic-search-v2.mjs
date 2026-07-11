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

const ALLOWED_REVIEW_STATUSES = new Set([
  'legacy_seed_pending_owner_confirmation',
  'public_safe_seed_pending_owner_scoring',
  'contract_seed_pending_owner_scoring',
  'contract_seed',
  'policy_seed_pending_owner_scoring',
  'owner_reviewed',
]);

const ALLOWED_SURFACES = new Set(['search_icons', 'recommend_icons', 'web']);
const ALLOWED_LIBRARY_MODES = new Set(['strict', 'prefer', 'all']);
const LIBRARY_BEHAVIOR_BY_MODE = {
  strict: 'requested_library_only',
  prefer: 'requested_library_first_then_labeled_alternatives',
  all: 'all_eligible_libraries',
};
const ALLOWED_BRAND_MATCH_CLASSES = new Set([
  'distinctive_exact',
  'ambiguous_exact',
  'prefix_or_substring',
]);
const ALLOWED_BRAND_BEHAVIORS = new Set([
  'exact_identity_priority',
  'brand_not_top_without_intent',
  'brand_shares_with_concept_without_intent',
]);

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
  assert.ok(
    !/[\u2013\u2014]/.test(JSON.stringify(evaluationSet)),
    'agent-authored evaluation content should not contain forbidden punctuation',
  );
  assert.equal(
    evaluationSet.schema_version,
    'semantic-search-v2-evaluation-set-2',
    'evaluation set schema version should be explicit',
  );
  assert.equal(evaluationSet.target_case_count, 225, 'evaluation set should declare the approved target');
  assert.ok(evaluationSet.review_policy, 'evaluation set should explain its review policy');
  assert.ok(
    ALLOWED_REVIEW_STATUSES.has(evaluationSet.default_review_status),
    'evaluation set should declare a supported default review status',
  );

  const groups = evaluationSet.query_groups || [];
  assert.ok(groups.length >= 11, 'evaluation set should cover the approved query dimensions');

  const queries = flattenEvaluationQueries(evaluationSet);
  assert.ok(queries.length >= 70, 'evaluation set should include ambiguity and brand-gating policy cases');
  assert.ok(
    queries.length < evaluationSet.target_case_count,
    'candidate case count should remain below the target until suite expansion is complete',
  );

  const requiredGroups = new Set([
    'brand_logo_exact',
    'long_natural_language',
    'common_ui_concepts',
    'localized_concepts',
    'negative_meaning_separation',
    'recommendation_slots',
    'july_11_regression_seeds',
    'library_mode_contract',
    'cross_surface_query_frame',
    'ambiguous_intent_diversity',
    'brand_intent_gating',
  ]);

  for (const groupId of requiredGroups) {
    assert.ok(groups.some((group) => group.id === groupId), `missing evaluation group ${groupId}`);
  }

  const groupIds = new Set();
  const caseIds = new Set();
  const reviewStatusCounts = new Map();

  for (const group of groups) {
    assert.ok(group.id, 'evaluation group should declare id');
    assert.ok(!groupIds.has(group.id), `duplicate evaluation group ${group.id}`);
    groupIds.add(group.id);
    assert.ok(group.purpose, `${group.id}: evaluation group should declare purpose`);

    const reviewStatus = group.review_status || evaluationSet.default_review_status;
    assert.ok(ALLOWED_REVIEW_STATUSES.has(reviewStatus), `${group.id}: unsupported review status ${reviewStatus}`);
    reviewStatusCounts.set(reviewStatus, (reviewStatusCounts.get(reviewStatus) || 0) + (group.queries || []).length);
  }

  for (const query of queries) {
    assert.ok(query.intent_type, `${query.group_id}: query should declare intent_type`);
    assert.ok(query.query || (query.task && query.slot), `${query.group_id}: query should declare query or task+slot`);
    assert.ok(
      Array.isArray(query.acceptable_families) || Array.isArray(query.expected_top_icon_ids),
      `${query.query || query.slot}: query should define acceptable_families or expected_top_icon_ids`,
    );

    assert.ok(query.case_id, `${query.group_id}: every evaluation case should declare a stable case_id`);
    assert.match(query.case_id, /^[a-z0-9-]+$/, `${query.case_id}: case_id should be stable kebab-case`);
    assert.ok(!caseIds.has(query.case_id), `duplicate evaluation case_id ${query.case_id}`);
    caseIds.add(query.case_id);

    for (const field of [
      'related_families',
      'insufficient_families',
      'required_signal_families',
    ]) {
      if (query[field]) {
        assert.ok(Array.isArray(query[field]) && query[field].length > 0, `${query.case_id}: ${field} should be non-empty`);
      }
    }

    if (query.identity_substitution_allowed !== undefined) {
      assert.equal(typeof query.identity_substitution_allowed, 'boolean', `${query.case_id}: identity substitution rule should be boolean`);
    }

    if ([
      'july_11_regression_seeds',
      'library_mode_contract',
      'cross_surface_query_frame',
      'ambiguous_intent_diversity',
      'brand_intent_gating',
    ].includes(query.group_id)) {
      assert.ok(query.case_id, `${query.group_id}: expanded cases should declare case_id`);
      assert.ok(query.expected_outcome, `${query.case_id}: expanded cases should declare expected_outcome`);
    }

    if (query.surfaces) {
      assert.ok(Array.isArray(query.surfaces) && query.surfaces.length > 0, `${query.case_id}: surfaces should be non-empty`);
      for (const surface of query.surfaces) {
        assert.ok(ALLOWED_SURFACES.has(surface), `${query.case_id}: unsupported surface ${surface}`);
      }
    }

    if (query.proposed_avoid_families) {
      assert.ok(
        Array.isArray(query.proposed_avoid_families) && query.proposed_avoid_families.length > 0,
        `${query.case_id}: proposed_avoid_families should be non-empty`,
      );
    }

    if (query.proposed_related_families) {
      assert.ok(
        Array.isArray(query.proposed_related_families) && query.proposed_related_families.length > 0,
        `${query.case_id}: proposed_related_families should be non-empty`,
      );
    }

    if (query.interpretation_family_ids) {
      assert.ok(
        Array.isArray(query.interpretation_family_ids) && query.interpretation_family_ids.length > 0,
        `${query.case_id}: interpretation_family_ids should be non-empty`,
      );
      for (const familyId of query.interpretation_family_ids) {
        assert.match(familyId, /^[a-z0-9_]+$/, `${query.case_id}: interpretation family should be snake_case`);
      }
    }

    if (query.minimum_distinct_families_top_8) {
      assert.ok(
        query.minimum_distinct_families_top_8 >= 2 && query.minimum_distinct_families_top_8 <= 8,
        `${query.case_id}: minimum family diversity should fit within the top eight`,
      );
      assert.ok(
        query.interpretation_family_ids?.length >= query.minimum_distinct_families_top_8,
        `${query.case_id}: declared families should cover the diversity minimum`,
      );
    }

    if (query.expected_needs_clarification) {
      assert.ok(query.surfaces?.includes('recommend_icons'), `${query.case_id}: clarification should target recommend_icons`);
      assert.ok(query.task && query.slot, `${query.case_id}: clarification case should include task and slot context`);
      assert.ok(query.minimum_interpretation_options >= 2, `${query.case_id}: clarification should require multiple options`);
      assert.ok(
        query.interpretation_family_ids?.length >= query.minimum_interpretation_options,
        `${query.case_id}: declared families should cover the clarification minimum`,
      );
    }

    if (query.expected_primary_interpretation_family) {
      assert.ok(
        query.interpretation_family_ids?.includes(query.expected_primary_interpretation_family),
        `${query.case_id}: primary interpretation should be in interpretation_family_ids`,
      );
    }

    if (query.brand_match_class) {
      assert.ok(
        ALLOWED_BRAND_MATCH_CLASSES.has(query.brand_match_class),
        `${query.case_id}: unsupported brand match class`,
      );
      assert.ok(
        ALLOWED_BRAND_BEHAVIORS.has(query.expected_brand_behavior),
        `${query.case_id}: unsupported brand behavior`,
      );
    }

    if (query.prohibited_top_icon_refs) {
      assert.ok(
        Array.isArray(query.prohibited_top_icon_refs) && query.prohibited_top_icon_refs.length > 0,
        `${query.case_id}: prohibited_top_icon_refs should be non-empty`,
      );
      for (const iconRef of query.prohibited_top_icon_refs) {
        assert.match(iconRef, /^[a-z0-9-]+:[a-z0-9._-]+$/i, `${query.case_id}: invalid prohibited icon ref`);
      }
    }

    if (query.library_mode) {
      assert.ok(ALLOWED_LIBRARY_MODES.has(query.library_mode), `${query.case_id}: unsupported library mode`);
      assert.equal(
        query.expected_library_behavior,
        LIBRARY_BEHAVIOR_BY_MODE[query.library_mode],
        `${query.case_id}: library behavior should match mode`,
      );
      if (query.library_mode === 'strict' || query.library_mode === 'prefer') {
        assert.ok(query.requested_library, `${query.case_id}: requested_library is required for ${query.library_mode}`);
      }
      if (query.library_mode === 'prefer') {
        assert.ok(
          query.minimum_requested_library_results_top_3 >= 1,
          `${query.case_id}: prefer mode should require a requested-library result in the top three`,
        );
        assert.ok(
          query.minimum_cross_library_alternatives_top_8 >= 1,
          `${query.case_id}: prefer mode should require a cross-library alternative in the top eight`,
        );
      }
    }

    assertNoUnsafeText(`evaluation query ${query.query || query.slot}`, JSON.stringify(query));
  }

  assert.ok(caseIds.size >= 40, 'expanded evaluation cases should have stable IDs');

  return {
    candidate_case_count: queries.length,
    target_case_count: evaluationSet.target_case_count,
    remaining_to_target: evaluationSet.target_case_count - queries.length,
    stable_case_id_count: caseIds.size,
    review_status_counts: Object.fromEntries([...reviewStatusCounts.entries()].sort()),
  };
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

const evaluationSummary = assertEvaluationSet(evaluationSet);
const semanticPayload = buildSemanticSearchDocuments(iconIndex, registryRaw);
const summary = assertSemanticDocuments(semanticPayload, registryRecords, iconIndex);

console.log(JSON.stringify({
  status: 'ok',
  evaluation_queries: flattenEvaluationQueries(evaluationSet).length,
  evaluation: evaluationSummary,
  semantic_documents: summary.document_count,
  semantic_documents_by_type: summary.by_type,
  skipped: summary.skipped_count,
}, null, 2));
