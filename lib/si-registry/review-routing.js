export const ROUTING_BANDS = Object.freeze({
  HIGH_CONFIDENCE: 'high_confidence',
  NEEDS_REVIEW: 'needs_review',
  AMBIGUOUS: 'ambiguous',
});

export const REVIEW_QUEUE_OUTCOMES = Object.freeze({
  READY_FOR_EDITOR_REVIEW: 'ready_for_editor_review',
  NEEDS_VISUAL_REVIEW: 'needs_visual_review',
  ESCALATE_TO_STRONGER_REVIEW: 'escalate_to_stronger_review',
  BLOCKED_FOR_MANUAL_JUDGMENT: 'blocked_for_manual_judgment',
});

export const DEFAULT_THRESHOLD_READY_FOR_EDITOR = 0.82;
export const DEFAULT_THRESHOLD_NEEDS_REVIEW = 0.66;

export const REVIEW_QUEUE_PRIORITIES = Object.freeze({
  [REVIEW_QUEUE_OUTCOMES.BLOCKED_FOR_MANUAL_JUDGMENT]: 0,
  [REVIEW_QUEUE_OUTCOMES.ESCALATE_TO_STRONGER_REVIEW]: 1,
  [REVIEW_QUEUE_OUTCOMES.NEEDS_VISUAL_REVIEW]: 2,
  [REVIEW_QUEUE_OUTCOMES.READY_FOR_EDITOR_REVIEW]: 3,
});

const MANUAL_JUDGMENT_REVIEW_STATES = new Set([
  'blocked_for_manual_judgment',
  'manual_judgment_required',
  'needs_manual_judgment',
  'blocked',
]);

const STRONGER_REVIEW_STATES = new Set([
  'escalate_to_stronger_review',
  'needs_stronger_review',
]);

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toRoutingScoreNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.min(1, Math.max(0, parsed));
    }
  }

  return null;
}

function getCandidateId(candidate) {
  return candidate?.icon_id ?? candidate?.candidate_icon_id ?? candidate?.candidate_id ?? null;
}

function getCandidateLaneId(candidate) {
  return candidate?.purpose_chip_category_id ?? candidate?.lane_id ?? candidate?.jobCategory ?? null;
}

function getConflictSignals(candidate) {
  const signals = [];
  const candidateSource = candidate?.candidate_source && typeof candidate.candidate_source === 'object' ? candidate.candidate_source : null;
  const internalSignals = candidate?.internalSignals && typeof candidate.internalSignals === 'object' ? candidate.internalSignals : null;

  if (candidate?.review_state && STRONGER_REVIEW_STATES.has(candidate.review_state)) {
    signals.push(candidate.review_state);
  }

  if (candidate?.manual_judgment_required === true || candidate?.requires_manual_judgment === true) {
    signals.push('manual_judgment_required');
  }

  if (candidateSource) {
    if (candidateSource.conflict === true || candidateSource.has_conflict === true) {
      signals.push('candidate_source_conflict');
    }

    if (Array.isArray(candidateSource.conflicts) && candidateSource.conflicts.length > 0) {
      signals.push(...candidateSource.conflicts.map((value) => `candidate_source:${value}`));
    }
  }

  if (Array.isArray(candidate?.conflicts) && candidate.conflicts.length > 0) {
    signals.push(...candidate.conflicts.map((value) => `conflict:${value}`));
  }

  if (internalSignals) {
    if (internalSignals.manual_judgment === true) {
      signals.push('internal_signals:manual_judgment');
    }

    if (internalSignals.conflict === true || internalSignals.requires_stronger_review === true) {
      signals.push('internal_signals:conflict');
    }

    if (Array.isArray(internalSignals.conflicts) && internalSignals.conflicts.length > 0) {
      signals.push(...internalSignals.conflicts.map((value) => `internal_signals:${value}`));
    }
  }

  return signals;
}

function getManualJudgmentSignals(candidate) {
  const signals = [];

  if (candidate?.review_state && MANUAL_JUDGMENT_REVIEW_STATES.has(candidate.review_state)) {
    signals.push(candidate.review_state);
  }

  if (candidate?.manual_judgment_required === true || candidate?.requires_manual_judgment === true) {
    signals.push('manual_judgment_required');
  }

  const internalSignals = candidate?.internalSignals && typeof candidate.internalSignals === 'object' ? candidate.internalSignals : null;
  if (internalSignals?.manual_judgment === true || internalSignals?.blocked === true) {
    signals.push('internal_signals:manual_judgment');
  }

  return signals;
}

export function getRoutingBand(routingScore, thresholds = {}) {
  const normalizedRoutingScore = toRoutingScoreNumber(routingScore) ?? 0;
  const readyForEditorThreshold = thresholds.readyForEditorThreshold ?? DEFAULT_THRESHOLD_READY_FOR_EDITOR;
  const needsReviewThreshold = thresholds.needsReviewThreshold ?? DEFAULT_THRESHOLD_NEEDS_REVIEW;

  if (normalizedRoutingScore >= readyForEditorThreshold) {
    return ROUTING_BANDS.HIGH_CONFIDENCE;
  }

  if (normalizedRoutingScore >= needsReviewThreshold) {
    return ROUTING_BANDS.NEEDS_REVIEW;
  }

  return ROUTING_BANDS.AMBIGUOUS;
}

export function routeCandidateForReview(candidate, options = {}) {
  const candidateIconId = getCandidateId(candidate);

  if (!isNonEmptyString(candidateIconId)) {
    throw new Error('routeCandidateForReview requires a candidate with icon_id, candidate_icon_id, or candidate_id');
  }

  const routingScore = toRoutingScoreNumber(candidate?.routing_score) ?? 0;
  const routingBand = getRoutingBand(routingScore, options);
  const conflictSignals = getConflictSignals(candidate);
  const manualJudgmentSignals = getManualJudgmentSignals(candidate);

  let queueOutcome;

  if (manualJudgmentSignals.length > 0) {
    queueOutcome = REVIEW_QUEUE_OUTCOMES.BLOCKED_FOR_MANUAL_JUDGMENT;
  } else if (conflictSignals.length > 0 || routingBand === ROUTING_BANDS.AMBIGUOUS) {
    queueOutcome = REVIEW_QUEUE_OUTCOMES.ESCALATE_TO_STRONGER_REVIEW;
  } else if (routingBand === ROUTING_BANDS.NEEDS_REVIEW) {
    queueOutcome = REVIEW_QUEUE_OUTCOMES.NEEDS_VISUAL_REVIEW;
  } else {
    queueOutcome = REVIEW_QUEUE_OUTCOMES.READY_FOR_EDITOR_REVIEW;
  }

  return {
    candidate_icon_id: candidateIconId,
    purpose_chip_category_id: getCandidateLaneId(candidate),
    routing_score: routingScore,
    routing_band: routingBand,
    queue_outcome: queueOutcome,
    queue_priority: REVIEW_QUEUE_PRIORITIES[queueOutcome],
    conflict_signals: conflictSignals,
    manual_judgment_signals: manualJudgmentSignals,
    reasons: manualJudgmentSignals.length > 0 ? manualJudgmentSignals : conflictSignals,
  };
}

export function buildReviewQueueItem(candidate, options = {}) {
  const routing = routeCandidateForReview(candidate, options);

  return {
    candidate_icon_id: routing.candidate_icon_id,
    purpose_chip_category_id: routing.purpose_chip_category_id,
    routing_score: routing.routing_score,
    routing_band: routing.routing_band,
    queue_outcome: routing.queue_outcome,
    queue_priority: routing.queue_priority,
    reasons: routing.reasons,
  };
}

export function buildReviewQueue(candidates, options = {}) {
  const items = (candidates || []).map((candidate) => buildReviewQueueItem(candidate, options));

  return [...items].sort((left, right) => {
    const priorityDelta = left.queue_priority - right.queue_priority;
    if (priorityDelta !== 0) return priorityDelta;

    const routingScoreDelta = right.routing_score - left.routing_score;
    if (routingScoreDelta !== 0) return routingScoreDelta;

    return left.candidate_icon_id.localeCompare(right.candidate_icon_id);
  });
}

export function summarizeReviewQueue(items) {
  const initialByOutcome = Object.values(REVIEW_QUEUE_OUTCOMES).reduce((summary, outcome) => {
    summary[outcome] = 0;
    return summary;
  }, {});
  const initialByBand = Object.values(ROUTING_BANDS).reduce((summary, band) => {
    summary[band] = 0;
    return summary;
  }, {});

  return (items || []).reduce(
    (summary, item) => {
      summary.count += 1;
      summary.byOutcome[item.queue_outcome] = (summary.byOutcome[item.queue_outcome] || 0) + 1;
      summary.byBand[item.routing_band] = (summary.byBand[item.routing_band] || 0) + 1;
      return summary;
    },
    {
      count: 0,
      byOutcome: initialByOutcome,
      byBand: initialByBand,
    }
  );
}

export const buildReviewRouting = routeCandidateForReview;
