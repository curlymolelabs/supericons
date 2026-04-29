import { validateRegistryRecord } from './record-shape.js';

function normalizeEvidenceToken(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'editorial-review') {
    return 'editorial_judgment';
  }

  return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function asUniqueStringArray(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))];
}

export function normalizeReviewedRecordToApprovedRecord(reviewedRecord) {
  const approvedRecord = {
    icon_id: reviewedRecord.icon_id,
    source_group: 'free',
    source_library: reviewedRecord.source_library,
    source_name: reviewedRecord.source_name,
    label: reviewedRecord.label,
    purpose: reviewedRecord.purpose,
    category: reviewedRecord.category,
    semantic_tags: asUniqueStringArray(reviewedRecord.semantic_tags),
    use_when: reviewedRecord.use_when,
    avoid_when: reviewedRecord.avoid_when,
    version: '1.0.0',
    status: 'reviewed',
    access_tier: 'public_open_record',
    projection_policy: 'future_public_record',
    is_premium: false,
    depicts: reviewedRecord.depicts,
    review_state: 'human_reviewed',
    evidence: asUniqueStringArray((reviewedRecord.evidence_sources || []).map(normalizeEvidenceToken).filter(Boolean)),
  };

  const synonyms = asUniqueStringArray(reviewedRecord.synonyms);
  if (synonyms.length > 0) {
    approvedRecord.synonyms = synonyms;
  }

  validateRegistryRecord(approvedRecord);
  return approvedRecord;
}

export function buildEditorHoldQueueRecord(reviewedRecord, batchId, holdNote) {
  return {
    batch_id: batchId,
    icon_id: reviewedRecord.icon_id,
    source_library: reviewedRecord.source_library,
    source_name: reviewedRecord.source_name,
    label: reviewedRecord.label,
    depicts: reviewedRecord.depicts,
    purpose: reviewedRecord.purpose,
    category: reviewedRecord.category,
    routing_score: reviewedRecord.routing_score,
    routing_band: reviewedRecord.routing_band,
    visual_confusion_notes: reviewedRecord.visual_confusion_notes,
    why_not_approved_yet: holdNote,
  };
}
