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

  for (const filePath of filesToCheck) {
    let parsed;
    try {
      parsed = await readJson(filePath);
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
