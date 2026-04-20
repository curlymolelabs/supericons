import visibilityModel from '../../data/si-registry/visibility-model.json' with { type: 'json' };

export const PUBLIC_PROJECTION_TARGET = 'generated_public_projection';
export const INTERNAL_PROJECTION_TARGET = 'generated_internal_projection';

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function isValidAccessTier(value) {
  return typeof value === 'string' && hasOwn(visibilityModel.accessTiers, value);
}

export function isValidProjectionPolicy(value) {
  return typeof value === 'string' && hasOwn(visibilityModel.projectionPolicies, value);
}

export function getAccessTierConfig(value) {
  if (!isValidAccessTier(value)) {
    throw new Error(`Unknown access_tier: ${value}`);
  }
  return visibilityModel.accessTiers[value];
}

export function getProjectionPolicyConfig(value) {
  if (!isValidProjectionPolicy(value)) {
    throw new Error(`Unknown projection_policy: ${value}`);
  }
  return visibilityModel.projectionPolicies[value];
}

export function getAllowedProjectionTargetsForAccessTier(value) {
  return [...getAccessTierConfig(value).allowedProjectionTargets];
}

export function getProjectionTargetsForPolicy(value) {
  return [...getProjectionPolicyConfig(value).projectionTargets];
}

export function getProjectionTargetsForRecord(record) {
  const accessTargets = new Set(getAllowedProjectionTargetsForAccessTier(record.access_tier));
  return getProjectionTargetsForPolicy(record.projection_policy).filter((target) => accessTargets.has(target));
}

export function canProjectRecordToTarget(record, target) {
  return getProjectionTargetsForRecord(record).includes(target);
}

export function getPublicProjectionTargets() {
  return [...visibilityModel.publicProjectionTargets];
}

export function getInternalProjectionTargets() {
  return [...visibilityModel.internalProjectionTargets];
}
