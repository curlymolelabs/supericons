import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const workbenchDir = path.join(repoRoot, 'data/si-registry/staging/library-workbench');
const indexPath = path.join(workbenchDir, 'index.json');
const outputDir = path.join(repoRoot, 'data/si-registry/staging/supabase-review-queues');
const outputPath = path.join(outputDir, 'registry-review-queue-snapshot.json');

function priorityForIssues(issues) {
  const base = issues.reduce((score, issue) => {
    if (issue.severity === 'blocker') return Math.max(score, 100);
    if (issue.severity === 'error') return Math.max(score, 90);
    if (issue.severity === 'warning') return Math.max(score, 75);
    return Math.max(score, 50);
  }, 0);

  return Math.min(100, base + Math.min(10, Math.max(0, issues.length - 1)));
}

function queueTypeForIssues(issues) {
  if (issues.some((issue) => issue.severity === 'blocker')) return 'publish_blocker_repair';
  if (issues.some((issue) => issue.code.includes('generic') || issue.code.includes('thin') || issue.code.includes('short'))) {
    return 'semantic_quality_review';
  }
  return 'registry_review';
}

function summarizeBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] ?? 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const index = await readJson(indexPath);
const qualityFindings = [];
const reviewQueueRows = [];
const librarySummaries = {};

for (const [libraryKey, librarySummary] of Object.entries(index.libraries || {})) {
  const workbenchPath = path.join(repoRoot, librarySummary.output);
  const workbench = await readJson(workbenchPath);

  librarySummaries[libraryKey] = {
    recordCount: workbench.recordCount,
    reviewQueueCount: workbench.reviewQueueCount,
    byIssue: workbench.byIssue || {},
    bySeverity: workbench.bySeverity || {},
  };

  for (const record of workbench.reviewQueue || []) {
    const issues = record.issues || [];

    reviewQueueRows.push({
      icon_id: record.icon_id,
      library_key: record.source_library,
      queue_type: queueTypeForIssues(issues),
      priority: priorityForIssues(issues),
      source_path: record.source_path,
      status: 'open',
    });

    for (const issue of issues) {
      qualityFindings.push({
        icon_id: record.icon_id,
        library_key: record.source_library,
        issue_code: issue.code,
        severity: issue.severity,
        field_name: issue.field,
        message: issue.message,
        source: record.source_path,
        status: 'open',
      });
    }
  }
}

reviewQueueRows.sort((left, right) => (
  right.priority - left.priority
  || left.library_key.localeCompare(right.library_key)
  || left.icon_id.localeCompare(right.icon_id)
));

qualityFindings.sort((left, right) => (
  left.library_key.localeCompare(right.library_key)
  || left.icon_id.localeCompare(right.icon_id)
  || left.issue_code.localeCompare(right.issue_code)
));

const snapshot = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: {
    workbenchIndex: path.relative(repoRoot, indexPath).replaceAll(path.sep, '/'),
    sourceManifest: index.sourceManifest,
    sourceRoot: index.sourceRoot,
  },
  summary: {
    libraries: Object.keys(librarySummaries).length,
    reviewQueueRows: reviewQueueRows.length,
    qualityFindings: qualityFindings.length,
    reviewQueueByLibrary: summarizeBy(reviewQueueRows, 'library_key'),
    reviewQueueByType: summarizeBy(reviewQueueRows, 'queue_type'),
    findingsByIssue: summarizeBy(qualityFindings, 'issue_code'),
    findingsBySeverity: summarizeBy(qualityFindings, 'severity'),
  },
  libraries: librarySummaries,
  tables: {
    icon_registry_quality_findings: qualityFindings,
    icon_registry_review_queue: reviewQueueRows,
  },
};

snapshot.contentHash = crypto.createHash('sha256').update(JSON.stringify(snapshot.tables)).digest('hex');

await writeJson(outputPath, snapshot);

console.log('build-supabase-registry-review-queues');
console.log(`snapshot: ${path.relative(repoRoot, outputPath)}`);
console.log(`libraries: ${snapshot.summary.libraries}`);
console.log(`review queue rows: ${snapshot.summary.reviewQueueRows}`);
console.log(`quality findings: ${snapshot.summary.qualityFindings}`);
console.log(`content hash: ${snapshot.contentHash}`);
console.log('review queue by library:');
for (const [library, count] of Object.entries(snapshot.summary.reviewQueueByLibrary).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${library}: ${count}`);
}
