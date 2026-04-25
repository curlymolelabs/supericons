export function trackIdFromStage(stageId) {
  return stageId === 'purpose-chip-150' ? 'purpose-chip' : stageId;
}

export function getStageByTrackId(restartOrder, trackId) {
  return (restartOrder.stages || []).find((stage) => trackIdFromStage(stage.stage_id) === trackId) || null;
}

export function resolveReviewPolicy(restartOrder, trackId) {
  const defaults = restartOrder.default_review_policy || {};
  const stage = getStageByTrackId(restartOrder, trackId);
  const stagePolicy = stage?.review_policy || {};

  return {
    phase: stagePolicy.phase || defaults.phase || 'calibration',
    batch_size: stagePolicy.batch_size || defaults.batch_size || 5,
    approval_scope: stagePolicy.approval_scope || defaults.approval_scope || 'full_batch',
    fallback_batch_size: stagePolicy.fallback_batch_size || defaults.fallback_batch_size || 5
  };
}
