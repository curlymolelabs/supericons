import { buildRegistryId } from './id-rules.js';
import { normalizeRegistryProviderMetadata } from './provider-metadata.js';
import { validateRegistryRecord } from './record-shape.js';
import {
  canProjectRecordToTarget,
  getProjectionTargetsForRecord,
  INTERNAL_PROJECTION_TARGET,
  PUBLIC_PROJECTION_TARGET,
} from './visibility-rules.js';

const INTERNAL_ONLY_FIELDS = Object.freeze([
  'editorialNotes',
  'internalSignals',
]);

function sortRecords(records) {
  return [...records].sort((left, right) => left.icon_id.localeCompare(right.icon_id));
}

function countBy(records, field) {
  return records.reduce((counts, record) => {
    const key = record[field] ?? 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function normalizeSourceGroup(record) {
  if (record.source_group === 'premium' || record.is_premium === true) {
    return 'premium';
  }
  return 'free';
}

export function normalizeRegistryRecord(record) {
  const normalizedRecord = {
    ...record,
    icon_id: buildRegistryId(record),
    source_group: normalizeSourceGroup(record),
    projectionTargets: getProjectionTargetsForRecord(record),
  };

  validateRegistryRecord(normalizedRecord);
  return normalizedRecord;
}

export function sanitizeForPublicProjection(record) {
  const sanitizedRecord = { ...record };
  for (const field of INTERNAL_ONLY_FIELDS) {
    delete sanitizedRecord[field];
  }
  return sanitizedRecord;
}

export function buildPublicRecordPreview(records) {
  return sortRecords(
    records
      .filter((record) => canProjectRecordToTarget(record, PUBLIC_PROJECTION_TARGET))
      .map((record) => sanitizeForPublicProjection(record))
  );
}

export function buildPremiumRecordPreview(records) {
  return sortRecords(records.filter((record) => record.source_group === 'premium'));
}

export function buildFreeRecordPreview(records) {
  return sortRecords(records.filter((record) => record.source_group === 'free'));
}

export function buildPublicRegistrySummary(summary, publicRecordPreview) {
  return {
    schemaVersion: summary.schemaVersion,
    generatedAt: summary.generatedAt,
    provider: summary.provider,
    publicRecordCount: publicRecordPreview.length,
    publicAccessTiers: {
      public_open_record: summary.accessTiers.public_open_record || 0,
    },
  };
}

export function buildRegistrySummary(records, schemaVersion, provider) {
  const sortedRecords = sortRecords(records);
  return {
    schemaVersion,
    generatedAt: new Date().toISOString(),
    provider,
    totalRecordCount: sortedRecords.length,
    sourceGroups: countBy(sortedRecords, 'source_group'),
    accessTiers: countBy(sortedRecords, 'access_tier'),
    reviewStates: countBy(sortedRecords, 'review_state'),
    publicRecordCount: sortedRecords.filter((record) => canProjectRecordToTarget(record, PUBLIC_PROJECTION_TARGET)).length,
    internalRecordCount: sortedRecords.filter((record) => canProjectRecordToTarget(record, INTERNAL_PROJECTION_TARGET)).length,
  };
}

export function buildRegistryProjections(sourceRecords, { schemaVersion, provider }) {
  const normalizedRecords = sortRecords(sourceRecords.map((record) => normalizeRegistryRecord(record)));
  const normalizedProvider = normalizeRegistryProviderMetadata(provider);
  const summary = buildRegistrySummary(normalizedRecords, schemaVersion, normalizedProvider);
  const publicRecordPreview = buildPublicRecordPreview(normalizedRecords);
  const premiumRecordPreview = buildPremiumRecordPreview(normalizedRecords);
  const freeRecordPreview = buildFreeRecordPreview(normalizedRecords);

  return {
    summary,
    recordPreview: normalizedRecords,
    publicRecordPreview,
    premiumRecordPreview,
    freeRecordPreview,
    publicSummary: buildPublicRegistrySummary(summary, publicRecordPreview),
  };
}
