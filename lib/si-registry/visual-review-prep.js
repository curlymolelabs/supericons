import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import materialExportManifest from '../../public/material-export-manifest.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const materialExportBasePath = path.join(repoRoot, 'public', 'material-export');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toCandidateId(candidate) {
  return candidate?.icon_id ?? candidate?.candidate_icon_id ?? candidate?.candidate_id ?? null;
}

function toCandidateSourceName(candidate) {
  return candidate?.source_name ?? candidate?.source_asset_name ?? candidate?.icon_name ?? candidate?.name ?? null;
}

function toCandidateLaneId(candidate) {
  return candidate?.purpose_chip_category_id ?? candidate?.lane_id ?? candidate?.jobCategory ?? null;
}

function toCandidatePurpose(candidate) {
  return candidate?.purpose ?? null;
}

function toCandidateCategory(candidate) {
  return candidate?.category ?? null;
}

function toCandidateRoutingScore(candidate) {
  if (typeof candidate?.routing_score === 'number' && Number.isFinite(candidate.routing_score)) {
    return candidate.routing_score;
  }

  if (typeof candidate?.routing_score === 'string' && candidate.routing_score.trim() !== '') {
    const parsed = Number(candidate.routing_score);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function buildIconRecordKey(iconRecord) {
  if (isNonEmptyString(iconRecord?.icon_id)) {
    return iconRecord.icon_id;
  }

  if (isNonEmptyString(iconRecord?.lib) && isNonEmptyString(iconRecord?.id)) {
    return `${iconRecord.lib}:${iconRecord.id}`;
  }

  if (isNonEmptyString(iconRecord?.library) && isNonEmptyString(iconRecord?.name)) {
    return `${iconRecord.library}:${iconRecord.name}`;
  }

  return null;
}

function normalizeIconRecord(iconRecord) {
  const iconId = buildIconRecordKey(iconRecord);

  if (!isNonEmptyString(iconId)) {
    throw new Error('Icon index record must include icon_id, or a lib/id pair');
  }

  const sourceLibrary = iconRecord?.source_library ?? iconRecord?.lib ?? iconId.split(':')[0];
  const sourceName = iconRecord?.source_name ?? iconRecord?.name ?? iconId.split(':').slice(1).join(':') ?? iconId;

  return {
    icon_id: iconId,
    source_library: sourceLibrary,
    source_name: sourceName,
    source_asset_name: iconRecord?.id ?? iconRecord?.source_name ?? iconId.split(':').slice(1).join(':') ?? iconId,
    source_svg: iconRecord?.svg ?? null,
    icon_type: iconRecord?.type ?? null,
    icon_style: iconRecord?.style ?? null,
    raw: iconRecord,
  };
}

function buildMaterialExportKey(assetName) {
  return `material:${assetName}:f0:w300:g0:o24`;
}

function readMaterialSvgIfAvailable(assetName) {
  const entryKey = buildMaterialExportKey(assetName);
  const entry = materialExportManifest?.entries?.[entryKey];
  if (!entry?.path) {
    return null;
  }

  const fullPath = path.join(materialExportBasePath, entry.path);
  if (!fs.existsSync(fullPath)) {
    return null;
  }

  return fs.readFileSync(fullPath, 'utf8');
}

function resolveVisualPayload(normalizedIconRecord) {
  if (isNonEmptyString(normalizedIconRecord.source_svg)) {
    return {
      source_svg: normalizedIconRecord.source_svg,
      visual_payload_status: 'svg_available',
    };
  }

  if (normalizedIconRecord.source_library === 'material') {
    const localMaterialSvg = readMaterialSvgIfAvailable(normalizedIconRecord.source_asset_name);
    if (isNonEmptyString(localMaterialSvg)) {
      return {
        source_svg: localMaterialSvg,
        visual_payload_status: 'svg_available_local_material',
      };
    }
  }

  return {
    source_svg: normalizedIconRecord.source_svg,
    visual_payload_status: 'metadata_only',
  };
}

export function buildIconIndexLookup(iconIndexRecords) {
  const byIconId = new Map();
  const bySourceName = new Map();

  for (const record of iconIndexRecords || []) {
    const normalized = normalizeIconRecord(record);

    if (byIconId.has(normalized.icon_id)) {
      throw new Error(`Duplicate icon index record for ${normalized.icon_id}`);
    }

    byIconId.set(normalized.icon_id, normalized);

    if (isNonEmptyString(normalized.source_name) && !bySourceName.has(normalized.source_name)) {
      bySourceName.set(normalized.source_name, normalized);
    }
  }

  return {
    byIconId,
    bySourceName,
  };
}

export function resolveIconRecord(iconIndexLookup, candidate) {
  const candidateIconId = toCandidateId(candidate);
  const candidateSourceName = toCandidateSourceName(candidate);

  if (isNonEmptyString(candidateIconId) && iconIndexLookup.byIconId.has(candidateIconId)) {
    return iconIndexLookup.byIconId.get(candidateIconId);
  }

  if (isNonEmptyString(candidateSourceName) && iconIndexLookup.bySourceName.has(candidateSourceName)) {
    return iconIndexLookup.bySourceName.get(candidateSourceName);
  }

  throw new Error(`Unable to resolve icon index record for candidate ${candidateIconId || candidateSourceName || '<unknown>'}`);
}

export function buildVisualReviewInput(iconRecord, candidateRecord, options = {}) {
  const normalizedIconRecord = normalizeIconRecord(iconRecord);
  const candidateIconId = toCandidateId(candidateRecord);

  if (!isNonEmptyString(candidateIconId)) {
    throw new Error('buildVisualReviewInput requires a candidate record with icon_id, candidate_icon_id, or candidate_id');
  }

  const visualPayload = resolveVisualPayload(normalizedIconRecord);

  return {
    icon_id: candidateIconId,
    candidate_icon_id: candidateIconId,
    source_library: normalizedIconRecord.source_library,
    source_name: normalizedIconRecord.source_name,
    candidate_source_name: toCandidateSourceName(candidateRecord),
    purpose_chip_category_id: toCandidateLaneId(candidateRecord),
    current_candidate_purpose: toCandidatePurpose(candidateRecord),
    current_candidate_category: toCandidateCategory(candidateRecord),
    current_candidate_routing_score: toCandidateRoutingScore(candidateRecord),
    visual_payload_status: visualPayload.visual_payload_status,
    source_svg: visualPayload.source_svg,
    renderable_icon_payload: {
      svg: visualPayload.source_svg,
      type: normalizedIconRecord.icon_type,
      style: normalizedIconRecord.icon_style,
    },
  };
}

export function buildVisualReviewInputs(iconIndexRecords, candidateRecords, options = {}) {
  const iconIndexLookup = buildIconIndexLookup(iconIndexRecords);
  const candidateLookup = new Map();
  const inputs = [];

  for (const candidate of candidateRecords || []) {
    const candidateIconId = toCandidateId(candidate);

    if (!isNonEmptyString(candidateIconId)) {
      throw new Error('Candidate record is missing an icon identifier');
    }

    if (candidateLookup.has(candidateIconId)) {
      throw new Error(`Duplicate candidate record for ${candidateIconId}`);
    }

    candidateLookup.set(candidateIconId, candidate);
  }

  for (const candidate of candidateRecords || []) {
    const candidateIconId = toCandidateId(candidate);
    const candidateRecord = candidateLookup.get(candidateIconId);
    const iconRecord = resolveIconRecord(iconIndexLookup, candidateRecord);
    inputs.push(buildVisualReviewInput(iconRecord.raw, candidateRecord, options));
  }

  return inputs.sort((left, right) => left.icon_id.localeCompare(right.icon_id));
}
