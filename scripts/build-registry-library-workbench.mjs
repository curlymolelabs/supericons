import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const registryRoot = path.join(repoRoot, 'data/si-registry');
const manifestPath = path.join(registryRoot, 'registry-manifest.json');
const outputDir = path.join(registryRoot, 'staging/library-workbench');

const EXCLUDED_LIBRARY_NAMES = new Set(['']);

const BLOCKED_PHRASES = [
  ['blocked_symbol_representing', (value) => value.includes('a symbol representing')],
  ['blocked_symbol_for', (value) => value.includes('a symbol for')],
  ['blocked_product_mark', (value) => value.includes('product mark')],
  ['blocked_official_brand', (value) => value.includes('official') && value.includes('brand')],
];

const WEAK_DEPICTS_PATTERNS = [
  ['generic_outline_icon', (value) => value.startsWith('outline icon of ')],
  ['generic_brand_logo_glyph', (value) => value.includes('brand logo glyph used to identify')],
  ['generic_logo_style_mark', (value) => value.startsWith('logo-style mark associated with')],
  ['generic_structured_data', (value) => value.includes('structured data') && value.includes('stored records')],
  ['generic_interface_friendly_strokes', (value) => value.includes('interface-friendly strokes')],
  ['generic_direct_object', (value) => value.includes('object, concept, or themed surface cue')],
  ['generic_line_drawing_template', (value) => value.includes(' line drawing showing ')],
  ['generic_symbol_template', (value) => value.includes(' symbol used to ') || value.includes(' symbol for ')],
  ['generic_shape_template', (value) => value.endsWith(' shape.') || value.endsWith(' form.')],
];

const GENERIC_USE_WHEN_PATTERNS = [
  ['generic_direct_reference', (value) => value.includes('refers directly to')],
  ['generic_object_concept_surface', (value) => value.includes('object, concept, or themed surface cue')],
  ['generic_search_filters_labels', (value) => value.includes('search results, filters, labels')],
  ['generic_concrete_object_need', (value) => value.includes('interface needs') && value.includes('as the concrete object')],
  ['generic_service_identification', (value) => value.includes('needs to identify') && value.includes('external service')],
];

const GENERIC_AVOID_WHEN_PATTERNS = [
  ['generic_specialized_icon_avoidance', (value) => value.includes('another object, action, or specialized') && value.includes('communicates the meaning more clearly')],
  ['generic_not_specifically_meant', (value) => value.includes('is not specifically meant')],
];

const GENERIC_TAGS = new Set(['line drawing', 'outline', 'object', 'icon', 'symbol', 'shape']);
const GENERIC_SYNONYM_WORDS = [' icon', ' symbol', ' shape'];

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRecords(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.records)) return raw.records;
  if (Array.isArray(raw?.icons)) return raw.icons;
  return [];
}

function addIssue(issues, code, severity, field, message) {
  issues.push({ code, severity, field, message });
}

function analyzeRecord(record) {
  const issues = [];
  const depicts = normalizeText(record.depicts);
  const useWhen = normalizeText(record.use_when);
  const avoidWhen = normalizeText(record.avoid_when);
  const semanticTags = Array.isArray(record.semantic_tags) ? record.semantic_tags : [];
  const synonyms = Array.isArray(record.synonyms) ? record.synonyms : [];
  const normalizedTags = semanticTags.map(normalizeText);
  const normalizedSynonyms = synonyms.map(normalizeText);

  for (const [code, test] of BLOCKED_PHRASES) {
    if (test(depicts)) {
      addIssue(issues, code, 'blocker', 'depicts', 'Contains a blocked generic or brand-only phrase.');
    }
  }

  for (const [code, test] of WEAK_DEPICTS_PATTERNS) {
    if (test(depicts)) {
      addIssue(issues, code, 'warning', 'depicts', 'Depicts is acceptable for gating but still too generic for final library polish.');
    }
  }

  if (depicts.length > 0 && depicts.length < 36) {
    addIssue(issues, 'short_depicts', 'warning', 'depicts', 'Depicts is very short and may not describe the visible form enough.');
  }

  if (semanticTags.length < 3) {
    addIssue(issues, 'thin_semantic_tags', 'warning', 'semantic_tags', 'Fewer than three semantic tags.');
  }

  if (normalizedTags.filter((tag) => GENERIC_TAGS.has(tag)).length >= 2) {
    addIssue(issues, 'generic_semantic_tag_padding', 'warning', 'semantic_tags', 'Semantic tags use generic padding instead of search-relevant concepts.');
  }

  if (synonyms.length < 2) {
    addIssue(issues, 'thin_synonyms', 'warning', 'synonyms', 'Fewer than two synonyms.');
  }

  if (normalizedSynonyms.length >= 2 && normalizedSynonyms.filter((synonym) => GENERIC_SYNONYM_WORDS.some((word) => synonym.endsWith(word))).length >= 2) {
    addIssue(issues, 'generic_synonym_padding', 'warning', 'synonyms', 'Synonyms repeat icon/symbol/shape padding instead of user search language.');
  }

  for (const [code, test] of GENERIC_USE_WHEN_PATTERNS) {
    if (test(useWhen)) {
      addIssue(issues, code, 'info', 'use_when', 'Use guidance is generic and may need a more concrete UI situation.');
    }
  }

  for (const [code, test] of GENERIC_AVOID_WHEN_PATTERNS) {
    if (test(avoidWhen)) {
      addIssue(issues, code, 'info', 'avoid_when', 'Avoid guidance is generic and may need more concrete alternatives.');
    }
  }

  if (avoidWhen.length > 0 && avoidWhen.includes('unrelated') && avoidWhen.includes('different object')) {
    addIssue(issues, 'generic_avoid_when', 'info', 'avoid_when', 'Avoid guidance is generic and may need more concrete alternatives.');
  }

  const priority = issues.reduce((score, issue) => {
    if (issue.severity === 'blocker') return score + 100;
    if (issue.severity === 'warning') return score + 10;
    return score + 1;
  }, 0);

  return { issues, priority };
}

function summarizeIssues(records) {
  const byIssue = {};
  const bySeverity = {};

  for (const record of records) {
    for (const issue of record.issues) {
      byIssue[issue.code] = (byIssue[issue.code] || 0) + 1;
      bySeverity[issue.severity] = (bySeverity[issue.severity] || 0) + 1;
    }
  }

  return { byIssue, bySeverity };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const manifest = await readJson(manifestPath);
const records = [];

for (const recordGroup of manifest.recordGroups || []) {
  const groupRecords = normalizeRecords(await readJson(path.join(registryRoot, recordGroup.path))).map((record) => ({
    source_group: record.source_group ?? recordGroup.sourceGroup,
    source_path: recordGroup.path,
    ...record,
  }));
  records.push(...groupRecords);
}

const index = {
  generatedAt: new Date().toISOString(),
  sourceManifest: 'data/si-registry/registry-manifest.json',
  sourceRoot: 'data/si-registry/source',
  libraries: {},
};

const targetLibraries = [...new Set(records.map((record) => record.source_library).filter((library) => !EXCLUDED_LIBRARY_NAMES.has(library)))].sort();

for (const library of targetLibraries) {
  const libraryRecords = records
    .filter((record) => record.source_library === library)
    .map((record) => {
      const analysis = analyzeRecord(record);
      return {
        icon_id: record.icon_id,
        source_library: record.source_library,
        source_name: record.source_name,
        label: record.label,
        depicts: record.depicts,
        semantic_tags: record.semantic_tags || [],
        synonyms: record.synonyms || [],
        use_when: record.use_when,
        avoid_when: record.avoid_when,
        source_path: record.source_path,
        priority: analysis.priority,
        issues: analysis.issues,
      };
    })
    .sort((left, right) => right.priority - left.priority || left.icon_id.localeCompare(right.icon_id));

  const reviewQueue = libraryRecords.filter((record) => record.issues.length > 0);
  const issueSummary = summarizeIssues(libraryRecords);
  const outputPath = path.join(outputDir, `${library}.json`);

  const workbench = {
    library,
    generatedAt: index.generatedAt,
    sourceManifest: index.sourceManifest,
    sourceRoot: index.sourceRoot,
    recordCount: libraryRecords.length,
    reviewQueueCount: reviewQueue.length,
    ...issueSummary,
    reviewQueue,
  };

  await writeJson(outputPath, workbench);

  index.libraries[library] = {
    output: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
    recordCount: libraryRecords.length,
    reviewQueueCount: reviewQueue.length,
    ...issueSummary,
  };
}

await writeJson(path.join(outputDir, 'index.json'), index);

console.log('build-registry-library-workbench');
for (const [library, summary] of Object.entries(index.libraries)) {
  console.log(`${library}: records=${summary.recordCount} review_queue=${summary.reviewQueueCount}`);
}
