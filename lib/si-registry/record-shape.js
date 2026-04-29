import { buildRegistryId } from './id-rules.js';
import { assertControlledVocabularyValue } from './controlled-values.js';
import { isValidAccessTier, isValidProjectionPolicy } from './visibility-rules.js';

export const REQUIRED_RECORD_FIELDS = Object.freeze([
  'icon_id',
  'source_library',
  'source_name',
  'label',
  'purpose',
  'category',
  'semantic_tags',
  'use_when',
  'avoid_when',
  'version',
  'status',
  'access_tier',
  'projection_policy',
]);

export const OPTIONAL_RECORD_FIELDS = Object.freeze([
  'source_group',
  'source_asset_name',
  'collection_id',
  'collection_title',
  'is_premium',
  'raw_category',
  'depicts',
  'synonyms',
  'state',
  'review_state',
  'evidence',
  'editorialNotes',
  'internalSignals',
  'projectionTargets',
]);

const CONTROLLED_VOCABULARY_FIELDS = Object.freeze([
  'category',
  'state',
  'status',
  'review_state',
]);

function assertNonEmptyString(record, field) {
  if (typeof record[field] !== 'string' || record[field].trim().length === 0) {
    throw new Error(`Missing or invalid ${field}`);
  }
}

function assertStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error(`Missing or invalid ${field}`);
  }
}

export function validateRegistryRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('Registry record must be an object');
  }

  for (const field of REQUIRED_RECORD_FIELDS) {
    if (!(field in record)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  for (const field of ['icon_id', 'source_library', 'source_name', 'label', 'purpose', 'use_when', 'avoid_when', 'version', 'status', 'access_tier', 'projection_policy']) {
    assertNonEmptyString(record, field);
  }

  if (record.icon_id !== buildRegistryId(record)) {
    throw new Error(`icon_id does not match derived value: ${record.icon_id}`);
  }

  assertStringArray(record.semantic_tags, 'semantic_tags');

  if ('synonyms' in record) {
    assertStringArray(record.synonyms, 'synonyms');
  }

  if ('evidence' in record) {
    assertStringArray(record.evidence, 'evidence');
  }

  if ('projectionTargets' in record) {
    assertStringArray(record.projectionTargets, 'projectionTargets');
  }

  if ('is_premium' in record && typeof record.is_premium !== 'boolean') {
    throw new Error('Invalid is_premium');
  }

  if ('internalSignals' in record) {
    if (!record.internalSignals || typeof record.internalSignals !== 'object' || Array.isArray(record.internalSignals)) {
      throw new Error('Invalid internalSignals');
    }
  }

  if (!isValidAccessTier(record.access_tier)) {
    throw new Error(`Invalid access_tier: ${record.access_tier}`);
  }

  if (!isValidProjectionPolicy(record.projection_policy)) {
    throw new Error(`Invalid projection_policy: ${record.projection_policy}`);
  }

  for (const field of CONTROLLED_VOCABULARY_FIELDS) {
    if (field in record) {
      assertControlledVocabularyValue(field, record[field]);
    }
  }

  return record;
}
