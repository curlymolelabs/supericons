import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import registryManifest from '../data/si-registry/registry-manifest.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const BANNED_RECORD_KEYS = new Set([
  'intent',
  'domain',
  'confidence',
  'confidence_score',
  'confidence_band',
  'candidate_confidence',
  'current_candidate_confidence',
]);

const PUBLIC_ALLOWED_FIELDS = new Set([
  'icon_id',
  'source_library',
  'source_name',
  'label',
  'depicts',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
]);

const REVIEW_ONLY_KEYS = new Set([
  'current_semantic_record',
  'proposed_interpretation',
  'proposed_final_record',
  'depicts_observation',
  'popular_reading',
  'plausible_readings',
  'context_bias',
  'ambiguity_note',
  'selection_reason',
  'official_source_url',
  'public_reference_url',
  'internal_review_only',
]);

const INTERNAL_REVIEW_FILE_MARKER = '-internal-review-reviewed-records.json';
const FINAL_RECORD_FILE_MARKER = '-final-records.json';
const LIST_FIELD_WORD_LIMITS = Object.freeze({
  semantic_tags: 4,
  synonyms: 5,
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function collectJsonFiles(dir, output = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsonFiles(absolutePath, output);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      output.push(absolutePath);
    }
  }

  return output;
}

function collectBannedKeyPaths(value, basePath = '$') {
  const issues = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      issues.push(...collectBannedKeyPaths(item, `${basePath}[${index}]`));
    });
    return issues;
  }

  if (!value || typeof value !== 'object') {
    return issues;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (BANNED_RECORD_KEYS.has(key)) {
      issues.push(`${basePath}.${key}`);
    }
    issues.push(...collectBannedKeyPaths(nestedValue, `${basePath}.${key}`));
  }

  return issues;
}

function collectKeyPathsForSet(value, keySet, basePath = '$') {
  const issues = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      issues.push(...collectKeyPathsForSet(item, keySet, `${basePath}[${index}]`));
    });
    return issues;
  }

  if (!value || typeof value !== 'object') {
    return issues;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (keySet.has(key)) {
      issues.push(`${basePath}.${key}`);
    }
    issues.push(...collectKeyPathsForSet(nestedValue, keySet, `${basePath}.${key}`));
  }

  return issues;
}

function normalizeListValue(value) {
  return String(value || '')
    .trim()
    .replace(/[.]+$/g, '')
    .replace(/\s+/g, ' ');
}

function isSentenceLikeListValue(value, field) {
  const normalized = normalizeListValue(value);
  if (!normalized) return false;

  if (/[,;:!?]/.test(normalized)) {
    return true;
  }

  const words = normalized.split(' ').filter(Boolean);
  if (words.length > (LIST_FIELD_WORD_LIMITS[field] || 5)) {
    return true;
  }

  if (words.length >= 4 && /\b(and|or)\b/i.test(normalized)) {
    return true;
  }

  return false;
}

function collectFinalRecordQualityIssues(records, label) {
  const issues = [];

  for (const record of records) {
    for (const field of ['semantic_tags', 'synonyms']) {
      const values = Array.isArray(record[field]) ? record[field] : [];
      values.forEach((value, index) => {
        if (isSentenceLikeListValue(value, field)) {
          issues.push(`${label} ${record.icon_id || '<unknown>'} ${field}[${index}]="${value}"`);
        }
      });
    }
  }

  return issues;
}

function ensurePublicRecordShape(records, label) {
  for (const record of records) {
    for (const field of Object.keys(record)) {
      assert(
        PUBLIC_ALLOWED_FIELDS.has(field),
        `${label} exposes non-public field "${field}" for ${record.icon_id || '<unknown>'}`
      );
    }
  }
}

async function main() {
  const manifestRecordSources = (registryManifest.recordGroups || []).map((group) => ({
    sourceKind: 'recordGroup',
    sourceId: group.id || '<unknown>',
    path: group.path || '',
  }));
  const manifestImportSources = (registryManifest.importSources || []).map((importSource) => ({
    sourceKind: 'importSource',
    sourceId: importSource.id || '<unknown>',
    path: importSource.path || '',
  }));
  const manifestSources = [...manifestRecordSources, ...manifestImportSources];

  const sourceRecordFiles = (registryManifest.recordGroups || []).map((group) =>
    path.join(repoRoot, 'data', 'si-registry', group.path)
  );

  const pilotPurposeChipFiles = await collectJsonFiles(
    path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip')
  );
  const automationArtifactFiles = await collectJsonFiles(
    path.join(repoRoot, 'data', 'si-registry', 'automation')
  );
  const generatedFiles = await collectJsonFiles(
    path.join(repoRoot, 'data', 'si-registry', 'generated')
  );
  const manualRedoFiles = await collectJsonFiles(
    path.join(repoRoot, 'data', 'si-registry', 'manual-redo')
  );

  const projectionFiles = [
    path.join(repoRoot, 'public', 'registry', 'records.json'),
    path.join(repoRoot, 'mcp', 'public', 'registry-records.json'),
  ];

  const filesToCheck = [
    ...new Set([
      ...sourceRecordFiles,
      ...pilotPurposeChipFiles,
      ...automationArtifactFiles,
      ...generatedFiles,
      ...projectionFiles,
    ]),
  ];
  const violations = [];
  const parsedByFile = new Map();

  for (const source of manifestSources) {
    const normalizedPath = String(source.path || '').replaceAll('\\', '/').toLowerCase();
    if (normalizedPath.includes('manual-redo/')) {
      violations.push(
        `registry-manifest ${source.sourceKind} "${source.sourceId}" points to manual-redo path: ${source.path}`
      );
    }
    if (normalizedPath.includes(INTERNAL_REVIEW_FILE_MARKER)) {
      violations.push(
        `registry-manifest ${source.sourceKind} "${source.sourceId}" points to internal-review payload: ${source.path}`
      );
    }
  }

  for (const filePath of manualRedoFiles) {
    const fileName = path.basename(filePath);
    if (!fileName.endsWith('-reviewed-records.json')) continue;
    if (fileName.endsWith(INTERNAL_REVIEW_FILE_MARKER)) continue;
    violations.push(
      `manual-redo reviewed payload must include "${INTERNAL_REVIEW_FILE_MARKER}" marker: data/si-registry/manual-redo/${fileName}`
    );
  }

  for (const filePath of filesToCheck) {
    let parsed;
    try {
      parsed = await readJson(filePath);
      parsedByFile.set(filePath, parsed);
    } catch (error) {
      violations.push(`${path.relative(repoRoot, filePath)}: ${error.message}`);
      continue;
    }

    const bannedPaths = collectBannedKeyPaths(parsed);
    if (bannedPaths.length > 0) {
      violations.push(
        `${path.relative(repoRoot, filePath)} contains banned keys at ${bannedPaths.slice(0, 10).join(', ')}${
          bannedPaths.length > 10 ? ` (+${bannedPaths.length - 10} more)` : ''
        }`
      );
    }
  }

  for (const filePath of manualRedoFiles) {
    const fileName = path.basename(filePath);
    if (!fileName.endsWith(FINAL_RECORD_FILE_MARKER)) continue;

    const parsed = await readJson(filePath);
    const qualityIssues = collectFinalRecordQualityIssues(
      parsed,
      path.relative(repoRoot, filePath)
    );
    if (qualityIssues.length > 0) {
      violations.push(
        `manual-redo final record quality issues:\n${qualityIssues.slice(0, 20).join('\n')}${
          qualityIssues.length > 20 ? `\n(+${qualityIssues.length - 20} more)` : ''
        }`
      );
    }
  }

  for (const filePath of projectionFiles) {
    const parsed = parsedByFile.get(filePath);
    if (!parsed) continue;
    const reviewOnlyPaths = collectKeyPathsForSet(parsed, REVIEW_ONLY_KEYS);
    if (reviewOnlyPaths.length > 0) {
      violations.push(
        `${path.relative(repoRoot, filePath)} contains review-only keys at ${reviewOnlyPaths.slice(0, 10).join(', ')}${
          reviewOnlyPaths.length > 10 ? ` (+${reviewOnlyPaths.length - 10} more)` : ''
        }`
      );
    }
  }

  const publicSiteRecords = await readJson(path.join(repoRoot, 'public', 'registry', 'records.json'));
  const publicMcpRecords = await readJson(path.join(repoRoot, 'mcp', 'public', 'registry-records.json'));

  ensurePublicRecordShape(publicSiteRecords, 'public/registry/records.json');
  ensurePublicRecordShape(publicMcpRecords, 'mcp/public/registry-records.json');

  if (violations.length > 0) {
    throw new Error(`verify-pruned-semantic-fields failed:\n${violations.join('\n')}`);
  }

  console.log(`verify-pruned-semantic-fields: ok (${filesToCheck.length} files checked)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
