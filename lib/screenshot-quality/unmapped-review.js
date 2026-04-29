import fs from 'node:fs';
import path from 'node:path';

import { PUBLIC_FIELDS, readJson, writeJson } from './state.js';

function entryIconId(entry) {
  return typeof entry === 'string' ? entry : entry?.icon_id;
}

function normalizeCandidate(candidate) {
  if (typeof candidate !== 'string' || candidate.trim().length === 0) {
    return null;
  }

  return candidate.includes(':') ? candidate.split(':').slice(1).join(':') : candidate;
}

function candidateVariants(candidate) {
  const normalized = normalizeCandidate(candidate);
  if (!normalized) {
    return [];
  }

  return [...new Set([normalized, normalized.replace(/-/g, '_'), normalized.replace(/_/g, '-')])];
}

function conceptCandidates(concept) {
  const candidates = new Set();

  for (const candidate of concept.registry_source_name_candidates || []) {
    for (const variant of candidateVariants(candidate)) {
      candidates.add(variant.toLowerCase());
    }
  }

  for (const candidate of concept.registry_lookup_candidates || []) {
    for (const variant of candidateVariants(candidate)) {
      candidates.add(variant.toLowerCase());
    }
  }

  for (const baseConceptId of concept.base_concept_ids || []) {
    for (const variant of candidateVariants(baseConceptId)) {
      candidates.add(variant.toLowerCase());
    }
  }

  return [...candidates];
}

function sortByConceptId(left, right) {
  const leftKey = left.base_concept_ids?.[0] || left.icon_id || '';
  const rightKey = right.base_concept_ids?.[0] || right.icon_id || '';
  return leftKey.localeCompare(rightKey);
}

export function loadUnmappedReviewSourceData({ repoRoot, library }) {
  const libraryDir = path.join(repoRoot, 'data', 'si-registry', 'automation', library);
  const decisionsPath = path.join(libraryDir, 'promotion-decisions.json');
  const decisions = readJson(decisionsPath);
  const reviewedFileNames = fs
    .readdirSync(libraryDir)
    .filter((fileName) => fileName.endsWith('-reviewed-records.json'))
    .sort();

  const reviewedFiles = new Map();
  const reviewedByIconId = new Map();
  const reviewedBySourceNameLower = new Map();
  const decisionByIconId = new Map();

  for (const [batchId, batchDecision] of Object.entries(decisions.batches || {})) {
    for (const entry of batchDecision.approve_for_import || []) {
      decisionByIconId.set(entryIconId(entry), { batchId, status: 'approve', entry });
    }
    for (const entry of batchDecision.hold_for_editor_review || []) {
      decisionByIconId.set(entryIconId(entry), { batchId, status: 'hold', entry });
    }
    for (const entry of batchDecision.keep_as_reviewed_draft || []) {
      decisionByIconId.set(entryIconId(entry), { batchId, status: 'draft', entry });
    }
  }

  for (const fileName of reviewedFileNames) {
    const filePath = path.join(libraryDir, fileName);
    const json = readJson(filePath);
    const reviewedRecords = Array.isArray(json) ? json : json.reviewed_records || json.records || [];
    reviewedFiles.set(fileName, { fileName, filePath, json, reviewedRecords });

    reviewedRecords.forEach((record, index) => {
      const decision = decisionByIconId.get(record.icon_id) || null;
      const metadata = {
        fileName,
        filePath,
        batchId: json.batch_id || decision?.batchId || fileName.replace(/-reviewed-records\.json$/, ''),
        recordIndex: index,
        record,
        decision,
      };

      reviewedByIconId.set(record.icon_id, metadata);
      const sourceNameKey = record.source_name.toLowerCase();
      if (!reviewedBySourceNameLower.has(sourceNameKey)) {
        reviewedBySourceNameLower.set(sourceNameKey, []);
      }
      reviewedBySourceNameLower.get(sourceNameKey).push(metadata);
    });
  }

  return {
    libraryDir,
    decisionsPath,
    decisions,
    reviewedFiles,
    reviewedByIconId,
    reviewedBySourceNameLower,
    decisionByIconId,
  };
}

export function matchConceptToReviewedRecord({ concept, sourceData }) {
  const candidates = conceptCandidates(concept);
  const matches = new Map();

  for (const candidate of candidates) {
    for (const metadata of sourceData.reviewedBySourceNameLower.get(candidate) || []) {
      matches.set(metadata.record.icon_id, metadata);
    }
  }

  const values = [...matches.values()];
  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 0) {
    throw new Error(
      `No reviewed source record found for unresolved unmapped concept ${concept.base_concept_ids?.join(', ')}`
    );
  }

  throw new Error(
    `Ambiguous reviewed source record match for unresolved unmapped concept ${concept.base_concept_ids?.join(
      ', '
    )}: ${values.map((value) => value.record.icon_id).join(', ')}`
  );
}

export function collectExistingUnmappedPacketIconIds({ manualRedoDir, library }) {
  if (!fs.existsSync(manualRedoDir)) {
    return new Set();
  }

  const blockedIconIds = new Set();
  const packetFiles = fs.readdirSync(manualRedoDir).filter((fileName) => fileName.endsWith('-packet.json')).sort();

  for (const fileName of packetFiles) {
    const filePath = path.join(manualRedoDir, fileName);
    const packet = readJson(filePath);
    if (
      packet?.library !== library ||
      packet?.review_mode !== 'depicts_only_from_reviewed_source' ||
      !Array.isArray(packet?.items)
    ) {
      continue;
    }

    for (const item of packet.items) {
      if (typeof item?.icon_id === 'string' && item.icon_id.length > 0) {
        blockedIconIds.add(item.icon_id);
      }
    }
  }

  return blockedIconIds;
}

export function selectNextUnmappedReviewBatch({
  unresolvedConcepts,
  sourceData,
  size,
  blockedIconIds = new Set(),
}) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`Batch size must be a positive integer. Received: ${size}`);
  }

  const items = [];

  for (const concept of [...unresolvedConcepts].sort(sortByConceptId)) {
    const match = matchConceptToReviewedRecord({ concept, sourceData });

    if (blockedIconIds.has(match.record.icon_id)) {
      continue;
    }

    if (match.decision?.status !== 'draft') {
      continue;
    }

    items.push({
      concept,
      match,
    });

    if (items.length >= size) {
      break;
    }
  }

  return {
    items,
    counts: {
      requested: size,
      selected: items.length,
    },
  };
}

export function applyReviewedPublicFields({ reviewedRecord, finalRecord }) {
  for (const field of PUBLIC_FIELDS) {
    reviewedRecord[field] = finalRecord[field];
  }
}

export function moveDecisionEntryToApprove({ decisions, iconId, batchId }) {
  const batchDecision = decisions.batches?.[batchId];
  if (!batchDecision) {
    throw new Error(`Missing promotion decision batch ${batchId} for ${iconId}`);
  }

  const draftEntries = batchDecision.keep_as_reviewed_draft || [];
  const draftIndex = draftEntries.findIndex((entry) => entryIconId(entry) === iconId);
  if (draftIndex === -1) {
    throw new Error(`Icon ${iconId} is not currently in keep_as_reviewed_draft for ${batchId}`);
  }

  const [entry] = draftEntries.splice(draftIndex, 1);
  const approveEntries = batchDecision.approve_for_import || [];
  const alreadyApproved = approveEntries.some((approveEntry) => entryIconId(approveEntry) === iconId);
  if (!alreadyApproved) {
    approveEntries.push(iconId);
  }
  batchDecision.approve_for_import = approveEntries;
  batchDecision.keep_as_reviewed_draft = draftEntries;

  return entry;
}

export function writeReviewedSourceData(sourceData) {
  writeJson(sourceData.decisionsPath, sourceData.decisions);
  for (const reviewedFile of sourceData.reviewedFiles.values()) {
    writeJson(reviewedFile.filePath, reviewedFile.json);
  }
}
