export const UNMAPPED_RESOLUTION_TYPES = Object.freeze([
  'alias_to_live_record',
  'requires_source_record_creation',
  'requires_ownership_reconciliation',
  'intentionally_excluded_from_registry',
]);

function normalizeResolutionEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return null;
  }

  const baseConceptId = typeof entry.base_concept_id === 'string' ? entry.base_concept_id.trim() : '';
  if (!baseConceptId) {
    return null;
  }

  const resolution = typeof entry.resolution === 'string' ? entry.resolution.trim() : '';
  const targetIconId = typeof entry.target_icon_id === 'string' ? entry.target_icon_id.trim() : '';
  const notes = typeof entry.notes === 'string' ? entry.notes.trim() : '';
  const allBaseConceptIds = Array.isArray(entry.all_base_concept_ids)
    ? entry.all_base_concept_ids.filter((value) => typeof value === 'string' && value.trim().length > 0)
    : [];

  return {
    base_concept_id: baseConceptId,
    all_base_concept_ids: [...new Set([baseConceptId, ...allBaseConceptIds])],
    resolution,
    target_icon_id: targetIconId,
    notes,
  };
}

export function normalizeResolutionEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => normalizeResolutionEntry(entry))
    .filter(Boolean);
}

export function buildResolutionIndex(entries) {
  const normalizedEntries = normalizeResolutionEntries(entries);
  const resolutionByBaseConceptId = new Map();

  for (const entry of normalizedEntries) {
    for (const baseConceptId of entry.all_base_concept_ids) {
      resolutionByBaseConceptId.set(baseConceptId, entry);
    }
  }

  return resolutionByBaseConceptId;
}

export function findResolutionForConcept(concept, resolutionIndex) {
  for (const baseConceptId of concept.base_concept_ids || []) {
    if (resolutionIndex.has(baseConceptId)) {
      return resolutionIndex.get(baseConceptId);
    }
  }
  return null;
}

export function isResolutionSatisfied({ concept, resolutionEntry, liveRecordsById }) {
  if (!resolutionEntry || !UNMAPPED_RESOLUTION_TYPES.includes(resolutionEntry.resolution)) {
    return false;
  }

  switch (resolutionEntry.resolution) {
    case 'alias_to_live_record':
      return Boolean(resolutionEntry.target_icon_id) && liveRecordsById.has(resolutionEntry.target_icon_id);
    case 'requires_source_record_creation':
    case 'requires_ownership_reconciliation':
      return Boolean(concept.icon_id) && liveRecordsById.has(concept.icon_id);
    case 'intentionally_excluded_from_registry':
      return true;
    default:
      return false;
  }
}

export function buildLibraryCompletionState({
  screenshotConcepts,
  reviewState,
  liveRecords,
  resolutionEntries,
}) {
  const resolutionIndex = buildResolutionIndex(resolutionEntries);
  const liveRecordsById = new Map((liveRecords || []).map((record) => [record.icon_id, record]));
  const resolved_unmapped = [];
  const unresolved_unmapped = [];

  for (const concept of reviewState.unmapped || []) {
    const resolutionEntry = findResolutionForConcept(concept, resolutionIndex);
    const resolved = isResolutionSatisfied({
      concept,
      resolutionEntry,
      liveRecordsById,
    });
    const enrichedConcept = resolutionEntry
      ? {
          ...concept,
          resolution: resolutionEntry.resolution,
          resolution_target_icon_id: resolutionEntry.target_icon_id || null,
          resolution_notes: resolutionEntry.notes || '',
        }
      : concept;

    if (resolved) {
      resolved_unmapped.push(enrichedConcept);
    } else {
      unresolved_unmapped.push(enrichedConcept);
    }
  }

  const conceptScopeTotal = Array.isArray(screenshotConcepts) ? screenshotConcepts.length : 0;
  const libraryComplete =
    (reviewState.reviewed_pending || []).length === 0 &&
    (reviewState.untouched || []).length === 0 &&
    unresolved_unmapped.length === 0;

  return {
    concept_scope_total: conceptScopeTotal,
    completed_live: reviewState.completed_live || [],
    reviewed_pending: reviewState.reviewed_pending || [],
    untouched: reviewState.untouched || [],
    unresolved_unmapped,
    resolved_unmapped,
    unresolved_unmapped_count: unresolved_unmapped.length,
    resolved_unmapped_count: resolved_unmapped.length,
    library_complete: libraryComplete,
    move_to_next_library_allowed: libraryComplete,
  };
}
