import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const manifestPath = path.join(repoRoot, 'data/si-registry/registry-manifest.json');

const args = new Set(process.argv.slice(2));
const outputJson = args.has('--json');
const strict = args.has('--strict');

const STATUS_VALUES = new Set(['draft', 'reviewed', 'approved', 'deprecated']);
const REVIEW_VALUES = new Set(['pending', 'reviewed', 'needs_repair', 'rejected']);
const ACCESS_VALUES = new Set(['public_open_record', 'premium_record', 'private_record']);
const PROJECTION_VALUES = new Set(['future_public_record', 'premium_record', 'private_record']);

const BLOCKED_DEPICTS = [
  { code: 'blocked_depicts_symbol_representing', test: (value) => value.includes('a symbol representing') },
  { code: 'blocked_depicts_symbol_for', test: (value) => value.includes('a symbol for') },
  { code: 'blocked_depicts_product_mark', test: (value) => value.includes('product mark') },
  {
    code: 'blocked_depicts_official_brand',
    test: (value) => value.includes('official') && value.includes('brand'),
  },
];

function normalizeRecords(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.records)) return raw.records;
  if (Array.isArray(raw?.icons)) return raw.icons;
  return [];
}

function normalizeReviewState(value) {
  if (value === 'human_reviewed') return 'reviewed';
  if (value === 'needs_redo') return 'needs_repair';
  if (value === 'rejected') return 'rejected';
  if (REVIEW_VALUES.has(value)) return value;
  return 'pending';
}

function isExportCandidate(record, normalizedReviewState) {
  return ['reviewed', 'approved'].includes(record.status)
    && normalizedReviewState === 'reviewed'
    && record.access_tier === 'public_open_record'
    && record.projection_policy === 'future_public_record';
}

function addFinding(findings, record, sourcePath, issueCode, fieldName, message, severity = 'error') {
  findings.push({
    icon_id: record?.icon_id || '(missing)',
    library_key: record?.source_library || '(missing)',
    issue_code: issueCode,
    severity,
    field_name: fieldName,
    message,
    source_path: sourcePath,
  });
}

function validateRecord(record, sourcePath, findings) {
  const requiredTextFields = [
    ['icon_id', record.icon_id],
    ['source_library', record.source_library],
    ['source_name', record.source_name],
    ['label', record.label],
    ['depicts', record.depicts],
    ['use_when', record.use_when],
    ['avoid_when', record.avoid_when],
  ];

  for (const [fieldName, value] of requiredTextFields) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      addFinding(findings, record, sourcePath, 'missing_required_text', fieldName, `${fieldName} must be nonempty.`);
    }
  }

  if (!Array.isArray(record.semantic_tags)) {
    addFinding(findings, record, sourcePath, 'invalid_array', 'semantic_tags', 'semantic_tags must be an array.');
  }

  if (record.synonyms !== undefined && !Array.isArray(record.synonyms)) {
    addFinding(findings, record, sourcePath, 'invalid_array', 'synonyms', 'synonyms must be an array when present.');
  }

  if (record.icon_id && record.source_library && record.source_name) {
    const expectedIconId = `${record.source_library}:${record.source_name}`;
    if (record.icon_id !== expectedIconId) {
      addFinding(
        findings,
        record,
        sourcePath,
        'icon_id_source_mismatch',
        'icon_id',
        `icon_id must match source_library:source_name (${expectedIconId}).`,
      );
    }
  }

  if (!STATUS_VALUES.has(record.status)) {
    addFinding(findings, record, sourcePath, 'invalid_status', 'status', 'status must be draft, reviewed, approved, or deprecated.');
  }

  const normalizedReviewState = normalizeReviewState(record.review_state);
  if (!REVIEW_VALUES.has(normalizedReviewState)) {
    addFinding(findings, record, sourcePath, 'invalid_review_state', 'review_state', 'review_state could not be normalized.');
  }

  if (!ACCESS_VALUES.has(record.access_tier)) {
    addFinding(findings, record, sourcePath, 'invalid_access_tier', 'access_tier', 'access_tier has an unsupported value.');
  }

  if (!PROJECTION_VALUES.has(record.projection_policy)) {
    addFinding(findings, record, sourcePath, 'invalid_projection_policy', 'projection_policy', 'projection_policy has an unsupported value.');
  }

  if (isExportCandidate(record, normalizedReviewState)) {
    const depicts = String(record.depicts || '').trim().toLowerCase();
    for (const blocked of BLOCKED_DEPICTS) {
      if (blocked.test(depicts)) {
        addFinding(findings, record, sourcePath, blocked.code, 'depicts', 'Exportable records cannot use this generic or brand-only depicts phrase.', 'blocker');
      }
    }
  }
}

function summarizeFindings(findings) {
  const byIssue = {};
  const byLibrary = {};

  for (const finding of findings) {
    byIssue[finding.issue_code] = (byIssue[finding.issue_code] || 0) + 1;
    byLibrary[finding.library_key] = (byLibrary[finding.library_key] || 0) + 1;
  }

  return { byIssue, byLibrary };
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(repoRoot, relativePath), 'utf8'));
}

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const recordGroups = Array.isArray(manifest.recordGroups) ? manifest.recordGroups : [];
const importSources = Array.isArray(manifest.importSources) ? manifest.importSources : [];

const findings = [];
const seenIconIds = new Map();
const seenLibraryNames = new Map();
const groupSummaries = [];
let totalRecords = 0;

for (const group of recordGroups) {
  const raw = await readJson(path.join('data/si-registry', group.path));
  const records = normalizeRecords(raw);
  totalRecords += records.length;

  const groupFindingStart = findings.length;
  for (const record of records) {
    validateRecord(record, group.path, findings);

    if (record?.icon_id) {
      const previousPath = seenIconIds.get(record.icon_id);
      if (previousPath) {
        addFinding(findings, record, group.path, 'duplicate_icon_id', 'icon_id', `Duplicate icon_id also found in ${previousPath}.`);
      } else {
        seenIconIds.set(record.icon_id, group.path);
      }
    }

    if (record?.source_library && record?.source_name) {
      const key = `${record.source_library}:${record.source_name}`;
      const previousPath = seenLibraryNames.get(key);
      if (previousPath) {
        addFinding(findings, record, group.path, 'duplicate_library_source_name', 'source_name', `Duplicate source library/name also found in ${previousPath}.`);
      } else {
        seenLibraryNames.set(key, group.path);
      }
    }
  }

  groupSummaries.push({
    id: group.id,
    path: group.path,
    records: records.length,
    findings: findings.length - groupFindingStart,
  });
}

const summary = {
  manifest: path.relative(repoRoot, manifestPath).replaceAll(path.sep, '/'),
  recordGroups: groupSummaries,
  skippedImportSources: importSources.map((source) => ({
    id: source.id,
    path: source.path,
    reason: 'Dry run validates semantic record groups first; import source normalizers are handled in the importer phase.',
  })),
  totalRecords,
  findingCount: findings.length,
  ...summarizeFindings(findings),
  sampleFindings: findings.slice(0, 20),
};

if (outputJson) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log('dry-run-registry-supabase-import');
  console.log(`manifest: ${summary.manifest}`);
  console.log(`record groups: ${recordGroups.length}`);
  console.log(`records checked: ${totalRecords}`);
  console.log(`findings: ${findings.length}`);
  console.log('');
  console.log('findings by issue:');
  for (const [issue, count] of Object.entries(summary.byIssue).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${issue}: ${count}`);
  }
  console.log('');
  console.log('findings by library:');
  for (const [library, count] of Object.entries(summary.byLibrary).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${library}: ${count}`);
  }
  console.log('');
  console.log(`skipped import sources: ${summary.skippedImportSources.length}`);
}

if (strict && findings.length > 0) {
  process.exitCode = 1;
}
