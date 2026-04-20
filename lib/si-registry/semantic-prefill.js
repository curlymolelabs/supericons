import { getPurposeChipLaneConfig } from './purpose-chip-pilot.js';

const DRAFT_ACCESS_TIER = 'private_operational_enrichment';
const DRAFT_PROJECTION_POLICY = 'internal_only';

function titleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function splitTokens(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function dedupeStrings(values) {
  const unique = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim().toLowerCase();
    if (!normalized || unique.includes(normalized)) continue;
    unique.push(normalized);
  }
  return unique;
}

function buildPurposeFromLane(laneConfig, label) {
  return `Show ${label} to represent ${laneConfig.label.toLowerCase()} in the interface.`;
}

function buildUseWhenFromLane(laneConfig, label) {
  return `Use when ${laneConfig.use_when_template} and the UI should read as ${label.toLowerCase()}.`;
}

function buildAvoidWhenFromLane(laneConfig) {
  return `Do not use when ${laneConfig.avoid_when_template}.`;
}

function buildSemanticTags(laneConfig, worklistItem, label, sourceName) {
  const labelTokens = splitTokens(label);
  const sourceTokens = splitTokens(sourceName);
  const categoryTokens = splitTokens(worklistItem.purpose_chip_category_label);
  const secondaryTokens = cloneStrings(worklistItem.secondary_categories || []).flatMap((value) => splitTokens(value));

  return dedupeStrings([
    ...laneConfig.semantic_tags,
    ...labelTokens,
    ...sourceTokens,
    ...categoryTokens,
    ...secondaryTokens,
  ]);
}

function cloneStrings(values) {
  return Array.isArray(values) ? values.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean) : [];
}

function scoreSignals(tokens, laneConfig) {
  const tokenSet = new Set(tokens);
  const strongMatches = laneConfig.high_signal_terms.filter((term) => tokenSet.has(term));
  const softMatches = laneConfig.soft_signal_terms.filter((term) => tokenSet.has(term));
  return { strongMatches, softMatches };
}

function estimateConfidence(worklistItem, label, sourceName, laneConfig) {
  const tokens = dedupeStrings([
    ...splitTokens(label),
    ...splitTokens(sourceName),
    ...splitTokens(worklistItem.purpose_chip_category_label),
    ...cloneStrings(worklistItem.secondary_categories || []).flatMap((value) => splitTokens(value)),
  ]);

  const { strongMatches, softMatches } = scoreSignals(tokens, laneConfig);
  const strongBoost = Math.min(0.16, strongMatches.length * 0.04);
  const softBoost = Math.min(0.08, softMatches.length * 0.02);
  const rarityPenalty = tokens.length <= 2 ? 0.02 : 0;
  const base = laneConfig.confidence_seed;
  const confidence = base + strongBoost + softBoost - rarityPenalty;

  return Number(Math.max(0.45, Math.min(0.94, confidence)).toFixed(2));
}

export function buildPurposeChipCandidateRecord(worklistItem, iconRecord) {
  const laneConfig = getPurposeChipLaneConfig(worklistItem.purpose_chip_category_id);
  const sourceName = iconRecord?.id || worklistItem.icon_id.split(':')[1];
  const label = titleCase(iconRecord?.name || sourceName);

  return {
    icon_id: worklistItem.icon_id,
    source_group: 'pilot',
    source_library: worklistItem.source_library,
    source_name: sourceName,
    label,
    purpose: buildPurposeFromLane(laneConfig, label),
    category: laneConfig.category,
    semantic_tags: buildSemanticTags(laneConfig, worklistItem, label, sourceName),
    use_when: buildUseWhenFromLane(laneConfig, label),
    avoid_when: buildAvoidWhenFromLane(laneConfig),
    version: '1.0.0',
    status: 'draft',
    access_tier: DRAFT_ACCESS_TIER,
    projection_policy: DRAFT_PROJECTION_POLICY,
    purpose_chip_category_id: worklistItem.purpose_chip_category_id,
    purpose_chip_category_label: worklistItem.purpose_chip_category_label,
    rank: worklistItem.rank,
    secondary_categories: [...worklistItem.secondary_categories],
    confidence: estimateConfidence(worklistItem, label, sourceName, laneConfig),
  };
}

export function buildPurposeChipCandidateRecords(worklist, iconIndexMap) {
  if (!Array.isArray(worklist)) {
    throw new Error('Purpose-chip worklist must be an array');
  }

  return worklist.map((worklistItem) => {
    const iconRecord = iconIndexMap.get(worklistItem.icon_id);
    if (!iconRecord) {
      throw new Error(`Missing icon index entry for ${worklistItem.icon_id}`);
    }
    return buildPurposeChipCandidateRecord(worklistItem, iconRecord);
  });
}

export function buildPurposeChipVisualReviewInputs(candidateRecords, iconIndexMap) {
  return candidateRecords.map((candidateRecord) => {
    const iconRecord = iconIndexMap.get(candidateRecord.icon_id);
    if (!iconRecord) {
      throw new Error(`Missing visual-review icon payload for ${candidateRecord.icon_id}`);
    }

    return {
      icon_id: candidateRecord.icon_id,
      source_library: candidateRecord.source_library,
      source_name: candidateRecord.source_name,
      source_svg: iconRecord.svg,
      source_type: iconRecord.type,
      source_label: iconRecord.name,
      candidate_purpose: candidateRecord.purpose,
      candidate_category: candidateRecord.category,
      candidate_confidence: candidateRecord.confidence,
      purpose_chip_category_id: candidateRecord.purpose_chip_category_id,
      purpose_chip_category_label: candidateRecord.purpose_chip_category_label,
      secondary_categories: [...candidateRecord.secondary_categories],
    };
  });
}

export function buildPurposeChipReviewQueue(candidateRecords) {
  const queues = {
    ready_for_editor_review: [],
    needs_visual_review: [],
    escalate_to_stronger_review: [],
    blocked_for_manual_judgment: [],
  };

  for (const candidateRecord of candidateRecords) {
    const confidence = candidateRecord.confidence;
    let queue = 'needs_visual_review';
    let confidence_band = 'needs_review';
    let reason = 'Draft is internally prefilled and should be checked visually.';

    if (confidence >= 0.84) {
      queue = 'ready_for_editor_review';
      confidence_band = 'high_confidence';
      reason = 'Lexical prefill is strong enough for editor review, but not auto-approval.';
    } else if (confidence >= 0.68) {
      queue = 'needs_visual_review';
      confidence_band = 'needs_review';
      reason = 'Visual inspection should resolve the remaining ambiguity.';
    } else if (confidence >= 0.54) {
      queue = 'escalate_to_stronger_review';
      confidence_band = 'ambiguous';
      reason = 'The lexical draft is weak enough to escalate to stronger review.';
    } else {
      queue = 'blocked_for_manual_judgment';
      confidence_band = 'ambiguous';
      reason = 'The draft is too weak for simple queueing and needs manual judgment.';
    }

    const item = {
      icon_id: candidateRecord.icon_id,
      confidence: confidence,
      confidence_band,
      queue,
      reason,
      candidate_source: candidateRecord.candidate_source,
    };

    queues[queue].push(item);
  }

  return queues;
}
