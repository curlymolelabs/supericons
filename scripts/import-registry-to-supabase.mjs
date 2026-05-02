import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const manifestPath = path.join(repoRoot, 'data/si-registry/registry-manifest.json');
const defaultSnapshotPath = path.join(repoRoot, 'data/si-registry/generated/supabase-registry-import-snapshot.json');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const outputJson = args.has('--json');
const noWriteSnapshot = args.has('--no-write-snapshot');

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

const TABLE_ORDER = [
  'icon_registry_libraries',
  'icon_registry_import_staging',
  'icon_registry_records',
  'icon_registry_quality_findings',
  'icon_registry_review_queue',
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

function normalizeAccessTier(value) {
  if (value === 'protected_premium_record') return 'premium_record';
  if (ACCESS_VALUES.has(value)) return value;
  return 'private_record';
}

function normalizeProjectionPolicy(value) {
  if (value === 'protected_premium_record') return 'premium_record';
  if (PROJECTION_VALUES.has(value)) return value;
  return 'private_record';
}

function isExportCandidate(record, reviewState, accessTier, projectionPolicy) {
  return ['reviewed', 'approved'].includes(record.status)
    && reviewState === 'reviewed'
    && accessTier === 'public_open_record'
    && projectionPolicy === 'future_public_record';
}

function addFinding(findings, record, sourcePath, issueCode, fieldName, message, severity = 'error') {
  findings.push({
    icon_id: record?.icon_id || '(missing)',
    library_key: record?.source_library || '(missing)',
    issue_code: issueCode,
    severity,
    field_name: fieldName,
    message,
    source: sourcePath,
    status: 'open',
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
      addFinding(findings, record, sourcePath, 'icon_id_source_mismatch', 'icon_id', `icon_id must match ${expectedIconId}.`);
    }
  }

  if (!STATUS_VALUES.has(record.status)) {
    addFinding(findings, record, sourcePath, 'invalid_status', 'status', 'status must be draft, reviewed, approved, or deprecated.');
  }

  const reviewState = normalizeReviewState(record.review_state);
  const accessTier = normalizeAccessTier(record.access_tier);
  const projectionPolicy = normalizeProjectionPolicy(record.projection_policy);

  if (!REVIEW_VALUES.has(reviewState)) {
    addFinding(findings, record, sourcePath, 'invalid_review_state', 'review_state', 'review_state could not be normalized.');
  }

  if (!ACCESS_VALUES.has(accessTier)) {
    addFinding(findings, record, sourcePath, 'invalid_access_tier', 'access_tier', 'access_tier has an unsupported value.');
  }

  if (!PROJECTION_VALUES.has(projectionPolicy)) {
    addFinding(findings, record, sourcePath, 'invalid_projection_policy', 'projection_policy', 'projection_policy has an unsupported value.');
  }

  if (isExportCandidate(record, reviewState, accessTier, projectionPolicy)) {
    const depicts = String(record.depicts || '').trim().toLowerCase();
    for (const blocked of BLOCKED_DEPICTS) {
      if (blocked.test(depicts)) {
        addFinding(findings, record, sourcePath, blocked.code, 'depicts', 'Exportable records cannot use this generic or brand-only depicts phrase.', 'blocker');
      }
    }
  }
}

function summarizeBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] ?? 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildLibraryRows(records, manifest) {
  const libraries = new Map();

  for (const record of records) {
    if (!record.source_library) continue;
    libraries.set(record.source_library, {
      library_key: record.source_library,
      display_name: record.source_library
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      source_group: record.source_group === 'premium' ? 'premium' : 'free',
      package_name: null,
      homepage_url: record.source_library === manifest.provider?.namespace ? manifest.provider?.homepage ?? null : null,
      license_name: null,
      status: 'active',
    });
  }

  return [...libraries.values()].sort((left, right) => left.library_key.localeCompare(right.library_key));
}

function buildRecordRow(record) {
  const reviewState = normalizeReviewState(record.review_state);
  const accessTier = normalizeAccessTier(record.access_tier);
  const projectionPolicy = normalizeProjectionPolicy(record.projection_policy);

  return {
    icon_id: record.icon_id,
    library_key: record.source_library,
    source_name: record.source_name,
    label: record.label,
    purpose: record.purpose ?? null,
    category: record.category ?? null,
    depicts: record.depicts,
    semantic_tags: Array.isArray(record.semantic_tags) ? record.semantic_tags : [],
    synonyms: Array.isArray(record.synonyms) ? record.synonyms : [],
    use_when: record.use_when,
    avoid_when: record.avoid_when,
    status: record.status,
    review_state: reviewState,
    quality_status: 'passing',
    access_tier: accessTier,
    projection_policy: projectionPolicy,
    is_premium: record.is_premium === true,
    record,
  };
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function upsertRows(table, rows, onConflict) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for --apply.');
  }

  for (const batch of chunk(rows, 500)) {
    const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
    if (onConflict) url.searchParams.set('on_conflict', onConflict);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Supabase upsert failed for ${table} (${response.status}): ${text}`);
    }
  }
}

const manifest = await readJson(manifestPath);
const importBatchId = `registry-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const sourceRecords = [];
const findings = [];
const seenIconIds = new Map();
const seenLibraryNames = new Map();
const groupSummaries = [];

for (const group of manifest.recordGroups || []) {
  const sourcePath = path.join('data/si-registry', group.path);
  const records = normalizeRecords(await readJson(path.join(repoRoot, sourcePath))).map((record) => ({
    source_group: record.source_group ?? group.sourceGroup,
    ...record,
  }));

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

  sourceRecords.push(...records);
  groupSummaries.push({
    id: group.id,
    library_key: records[0]?.source_library ?? group.id.replace(/-approved$/, ''),
    path: group.path,
    records: records.length,
    findings: findings.length - groupFindingStart,
  });
}

const findingCountByIconId = findings.reduce((counts, finding) => {
  counts[finding.icon_id] = (counts[finding.icon_id] || 0) + 1;
  return counts;
}, {});

const libraryRows = buildLibraryRows(sourceRecords, manifest);
const stagingRows = sourceRecords.map((record) => ({
  import_batch_id: importBatchId,
  icon_id: record.icon_id,
  library_key: record.source_library,
  source_name: record.source_name,
  source_path: seenIconIds.get(record.icon_id) ?? 'unknown',
  record,
  import_status: findingCountByIconId[record.icon_id] ? 'failed' : 'passed',
  quality_failure_count: findingCountByIconId[record.icon_id] || 0,
}));
const recordRows = findings.length === 0 ? sourceRecords.map((record) => buildRecordRow(record)) : [];
const reviewQueueRows = findings.map((finding) => ({
  icon_id: finding.icon_id,
  library_key: finding.library_key === '(missing)' ? null : finding.library_key,
  queue_type: finding.issue_code,
  priority: finding.severity === 'blocker' ? 100 : finding.severity === 'error' ? 75 : 50,
  source_path: finding.source,
  status: 'open',
}));

const snapshot = {
  schemaVersion: manifest.schemaVersion,
  provider: manifest.provider,
  generatedAt: new Date().toISOString(),
  importBatchId,
  source: {
    manifest: path.relative(repoRoot, manifestPath).replaceAll(path.sep, '/'),
    recordGroups: groupSummaries,
    skippedImportSources: (manifest.importSources || []).map((source) => ({
      id: source.id,
      path: source.path,
      reason: 'Semantic registry importer imports manifest-listed record groups first. Premium import source stays with existing projection builder until a premium schema is finalized.',
    })),
  },
  summary: {
    recordsChecked: sourceRecords.length,
    findings: findings.length,
    libraries: libraryRows.length,
    stagingRows: stagingRows.length,
    promotableRows: recordRows.length,
    reviewQueueRows: reviewQueueRows.length,
    byLibrary: summarizeBy(sourceRecords, 'source_library'),
    findingsByLibrary: summarizeBy(findings, 'library_key'),
    findingsByIssue: summarizeBy(findings, 'issue_code'),
  },
  tables: {
    icon_registry_libraries: libraryRows,
    icon_registry_import_staging: stagingRows,
    icon_registry_records: recordRows,
    icon_registry_quality_findings: findings,
    icon_registry_review_queue: reviewQueueRows,
  },
  contentHash: crypto.createHash('sha256').update(JSON.stringify(sourceRecords)).digest('hex'),
};

if (!noWriteSnapshot) {
  await writeJson(defaultSnapshotPath, snapshot);
}

if (apply) {
  if (findings.length > 0) {
    throw new Error(`Refusing --apply because ${findings.length} quality findings remain.`);
  }

  await upsertRows('icon_registry_libraries', libraryRows, 'library_key');
  await upsertRows('icon_registry_import_staging', stagingRows, 'id');
  await upsertRows('icon_registry_records', recordRows, 'icon_id');
}

if (outputJson) {
  console.log(JSON.stringify(snapshot.summary, null, 2));
} else {
  console.log('import-registry-to-supabase');
  console.log(`mode: ${apply ? 'apply' : 'dry-run'}`);
  console.log(`snapshot: ${path.relative(repoRoot, defaultSnapshotPath)}`);
  console.log(`records checked: ${snapshot.summary.recordsChecked}`);
  console.log(`findings: ${snapshot.summary.findings}`);
  console.log(`libraries: ${snapshot.summary.libraries}`);
  console.log(`promotable rows: ${snapshot.summary.promotableRows}`);
  console.log('records by library:');
  for (const [library, count] of Object.entries(snapshot.summary.byLibrary).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${library}: ${count}`);
  }
}

if (findings.length > 0) {
  process.exitCode = 1;
}
