import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateRegistryRecord } from '../lib/si-registry/record-shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const docsPlansDir = path.join(repoRoot, 'docs', 'superpowers', 'plans');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const automationDir = path.join(repoRoot, 'data', 'si-registry', 'automation');
const publicDir = path.join(repoRoot, 'public');
const priorPublicSourcePaths = [
  path.join(repoRoot, 'data', 'si-registry', 'records', 'free-pilot.json'),
  path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'approved-records.json'),
];
const today = new Date().toISOString().slice(0, 10);
const bannedFields = [
  'reviewer_model',
  'reviewer_reasoning_effort',
  'internal_review_status',
  'prompt_notes',
  'workflow_trace',
  'agent_notes',
  'private_confidence_rationale',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

function formatTitle(text) {
  return text
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sortEntries(objectMap = {}) {
  return Object.entries(objectMap)
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

function extractDecisionIconIds(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => (typeof entry === 'string' ? entry : entry?.icon_id))
    .filter((value) => typeof value === 'string' && value.length > 0);
}

function summarizeBannedFields(records, recordType) {
  const hits = [];

  for (const record of records) {
    for (const field of bannedFields) {
      if (Object.prototype.hasOwnProperty.call(record, field)) {
        hits.push({
          record_type: recordType,
          icon_id: record.icon_id ?? record.source_name ?? 'unknown',
          field,
        });
      }
    }
  }

  return hits;
}

function buildGapList({ coverageMatches, projectionMatches, holdCount, draftCount, bannedHits, overlapSkipped }) {
  const gaps = [];

  if (!coverageMatches) {
    gaps.push('The processed totals do not match the official library size yet.');
  }

  if (!projectionMatches) {
    gaps.push('The public registry count does not match the approved record count yet.');
  }

  if (holdCount > 0) {
    gaps.push(`${holdCount} icons are still on hold and need editor follow-up.`);
  }

  if (draftCount > 0) {
    gaps.push(`${draftCount} icons are still kept as reviewed drafts, so the semantics are not fully approved yet.`);
  }

  if (bannedHits.length > 0) {
    gaps.push('Sensitive workflow fields leaked into library records and need cleanup.');
  }

  if (overlapSkipped > 0) {
    gaps.push(`${overlapSkipped} icons were skipped because they already exist in another free registry group.`);
  }

  return gaps;
}

async function loadPriorPublicSameLibraryCount({ libraryId, libraryOrder }) {
  let count = 0;

  for (const filePath of priorPublicSourcePaths) {
    if (await exists(filePath)) {
      const records = await readJson(filePath);
      count += records.filter((record) => record.source_library === libraryId).length;
    }
  }

  for (const library of libraryOrder.libraries || []) {
    if (library.library_id === libraryId) {
      continue;
    }

    const approvedPath = path.join(automationDir, library.library_id, 'approved-records.json');
    if (await exists(approvedPath)) {
      const records = await readJson(approvedPath);
      count += records.filter((record) => record.source_library === libraryId).length;
    }
  }

  return count;
}

function buildVerdict({ coverageMatches, projectionMatches, holdCount, draftCount, bannedHits }) {
  if (!coverageMatches || !projectionMatches || bannedHits.length > 0) {
    return {
      status: 'needs_fix',
      message: 'The library should not be treated as fully closed yet because the audit found a blocking mismatch.',
      recommended_next_step: 'Fix the blocking audit mismatch before moving to the next library.',
    };
  }

  if (holdCount > 0 || draftCount > 0) {
    return {
      status: 'operationally_complete_with_follow_up',
      message: 'The library is fully processed in the pipeline, but it still carries quality follow-up work.',
      recommended_next_step: 'Keep the library closed for rollout sequencing, but schedule a later quality pass for holds and drafts.',
    };
  }

  return {
    status: 'operationally_complete_clean',
    message: 'The library is fully processed and has no remaining hold or draft backlog.',
    recommended_next_step: 'Move to the next library in the rollout order.',
  };
}

function renderMarkdown(report) {
  const topCategories = report.quality_signals.top_categories
    .slice(0, 5)
    .map((entry) => `- \`${entry.key}\`: ${entry.count}`)
    .join('\n');
  const topDomains = report.quality_signals.top_domains
    .slice(0, 5)
    .map((entry) => `- \`${entry.key}\`: ${entry.count}`)
    .join('\n');
  const gaps = report.gaps.length > 0
    ? report.gaps.map((gap) => `- ${gap}`).join('\n')
    : '- No blocking or follow-up gaps found.';
  const approvedExamples = report.manual_spotcheck.approved_examples.map((iconId) => `- \`${iconId}\``).join('\n') || '- None';
  const holdExamples = report.manual_spotcheck.hold_examples.map((iconId) => `- \`${iconId}\``).join('\n') || '- None';
  const draftExamples = report.manual_spotcheck.draft_examples.map((iconId) => `- \`${iconId}\``).join('\n') || '- None';

  return `# ${report.library_label} Completion Audit

## Verdict

- Status: \`${report.verdict.status}\`
- Message: ${report.verdict.message}
- Recommended next step: ${report.verdict.recommended_next_step}

## Coverage

- Official library size: \`${report.coverage.source_total_icons}\`
- Approved records: \`${report.coverage.approved_records}\`
- Hold records: \`${report.coverage.hold_records}\`
- Reviewed drafts: \`${report.coverage.reviewed_drafts}\`
- Overlap-skipped: \`${report.coverage.overlap_skipped}\`
- Processed total: \`${report.coverage.processed_total}\`
- Matches official size: \`${report.coverage.processed_matches_source_total}\`

## Projection

- Public registry records for this library: \`${report.projection.public_registry_records}\`
- Earlier public records outside this rollout: \`${report.projection.prior_public_records_outside_library_rollout}\`
- Expected public total: \`${report.projection.expected_public_registry_records}\`
- Matches expected public total: \`${report.projection.matches_expected_public_registry_count}\`

## Quality Signals

- Approved ratio: \`${report.quality_signals.approved_ratio}\`
- Hold ratio: \`${report.quality_signals.hold_ratio}\`
- Draft ratio: \`${report.quality_signals.draft_ratio}\`
- Batch count: \`${report.quality_signals.batch_count}\`

### Top Categories

${topCategories}

### Top Domains

${topDomains}

## Metadata Safety

- Records checked: \`${report.metadata_safety.records_checked}\`
- Sensitive field hits: \`${report.metadata_safety.banned_field_hit_count}\`

## Gaps

${gaps}

## Manual Spot Check Set

### Approved Examples

${approvedExamples}

### Hold Examples

${holdExamples}

### Draft Examples

${draftExamples}
`;
}

function renderHtml(report) {
  const gapItems = report.gaps.length > 0
    ? report.gaps.map((gap) => `<li>${gap}</li>`).join('')
    : '<li>No blocking or follow-up gaps were found.</li>';
  const approvedExamples = report.manual_spotcheck.approved_examples.length > 0
    ? report.manual_spotcheck.approved_examples.map((iconId) => `<li><code>${iconId}</code></li>`).join('')
    : '<li>None</li>';
  const holdExamples = report.manual_spotcheck.hold_examples.length > 0
    ? report.manual_spotcheck.hold_examples.map((iconId) => `<li><code>${iconId}</code></li>`).join('')
    : '<li>None</li>';
  const draftExamples = report.manual_spotcheck.draft_examples.length > 0
    ? report.manual_spotcheck.draft_examples.map((iconId) => `<li><code>${iconId}</code></li>`).join('')
    : '<li>None</li>';
  const topCategories = report.quality_signals.top_categories
    .slice(0, 5)
    .map((entry) => `<li><strong>${entry.key}</strong>: ${entry.count}</li>`)
    .join('');
  const topDomains = report.quality_signals.top_domains
    .slice(0, 5)
    .map((entry) => `<li><strong>${entry.key}</strong>: ${entry.count}</li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${report.library_label} Completion Audit</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f2ea;
      --card: #fffaf2;
      --ink: #1f1b16;
      --muted: #6c6257;
      --line: #decdb8;
      --accent: #b85c10;
      --good: #216a3a;
      --warn: #8a5b00;
      --bad: #a12626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(180deg, #f3ecdf 0%, #faf6ef 100%);
      color: var(--ink);
    }
    main {
      max-width: 1080px;
      margin: 0 auto;
      padding: 40px 20px 72px;
    }
    h1, h2, h3 { margin: 0 0 14px; line-height: 1.15; }
    p { line-height: 1.6; }
    .hero, .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 22px;
      padding: 24px;
      box-shadow: 0 18px 40px rgba(75, 49, 16, 0.08);
    }
    .hero { margin-bottom: 22px; }
    .hero p { max-width: 68ch; }
    .pill {
      display: inline-block;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 12px;
      background: #f8e7d5;
      color: var(--accent);
    }
    .status-good { color: var(--good); }
    .status-warn { color: var(--warn); }
    .status-bad { color: var(--bad); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin: 22px 0;
    }
    .metric {
      background: white;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
    }
    .metric .label {
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 10px;
    }
    .metric .value {
      font-size: 34px;
      font-weight: 700;
    }
    .section {
      margin-top: 18px;
      display: grid;
      gap: 18px;
    }
    ul { margin: 0; padding-left: 20px; }
    li { margin: 8px 0; }
    code {
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.95em;
      background: #f5ecdf;
      padding: 1px 5px;
      border-radius: 6px;
    }
    .two-up {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="pill">Post-Library Audit</div>
      <h1>${report.library_label} Completion Audit</h1>
      <p>This page checks whether the ${report.library_label} rollout is really safe to close. It looks at the official library size, how many icons were approved, how many are still on hold or draft status, and whether the public registry matches the approved records.</p>
      <p><strong>Current result:</strong> <span class="${report.verdict.status === 'needs_fix' ? 'status-bad' : report.verdict.status === 'operationally_complete_with_follow_up' ? 'status-warn' : 'status-good'}">${report.verdict.message}</span></p>
    </section>

    <section class="grid">
      <article class="metric">
        <div class="label">Official Library Size</div>
        <div class="value">${report.coverage.source_total_icons}</div>
      </article>
      <article class="metric">
        <div class="label">Approved</div>
        <div class="value">${report.coverage.approved_records}</div>
      </article>
      <article class="metric">
        <div class="label">Hold</div>
        <div class="value">${report.coverage.hold_records}</div>
      </article>
      <article class="metric">
        <div class="label">Draft</div>
        <div class="value">${report.coverage.reviewed_drafts}</div>
      </article>
      <article class="metric">
        <div class="label">Overlap Skipped</div>
        <div class="value">${report.coverage.overlap_skipped}</div>
      </article>
      <article class="metric">
        <div class="label">Public Registry Records</div>
        <div class="value">${report.projection.public_registry_records}</div>
      </article>
    </section>

    <section class="section two-up">
      <article class="card">
        <h2>What Passed</h2>
        <ul>
          <li>The processed total is <strong>${report.coverage.processed_total}</strong> and it ${report.coverage.processed_matches_source_total ? 'matches' : 'does not match'} the official library size.</li>
          <li>The public registry count ${report.projection.matches_expected_public_registry_count ? 'matches' : 'does not match'} the expected total for this library.</li>
          <li>${report.metadata_safety.records_checked} records were checked for sensitive workflow fields.</li>
          <li>${report.metadata_safety.banned_field_hit_count === 0 ? 'No sensitive workflow fields were found in the audited records.' : `${report.metadata_safety.banned_field_hit_count} sensitive field hits were found and need cleanup.`}</li>
        </ul>
      </article>
      <article class="card">
        <h2>What Still Needs Attention</h2>
        <ul>${gapItems}</ul>
      </article>
    </section>

    <section class="section two-up">
      <article class="card">
        <h2>Most Common Approved Categories</h2>
        <ul>${topCategories || '<li>No category data found.</li>'}</ul>
      </article>
      <article class="card">
        <h2>Most Common Approved Domains</h2>
        <ul>${topDomains || '<li>No domain data found.</li>'}</ul>
      </article>
    </section>

    <section class="section two-up">
      <article class="card">
        <h2>Good Icons To Spot-Check</h2>
        <ul>${approvedExamples}</ul>
      </article>
      <article class="card">
        <h2>Icons That Still Need Human Attention</h2>
        <h3>Hold Queue</h3>
        <ul>${holdExamples}</ul>
        <h3 style="margin-top:18px;">Draft Queue</h3>
        <ul>${draftExamples}</ul>
      </article>
    </section>
  </main>
</body>
</html>`;
}

const libraryId = process.argv[2];

assert(libraryId, 'Usage: node scripts/build-library-completion-audit.mjs <library_id>');

const libraryOrder = await readJson(path.join(automationDir, 'library-order.json'));
const libraryMeta = libraryOrder.libraries.find((item) => item.library_id === libraryId);
assert(libraryMeta, `Unknown library_id: ${libraryId}`);

const iconIndex = await readJson(path.join(publicDir, 'icon-index.json'));
const sourceLibraryEntry = (iconIndex.libraries || []).find((item) => item.id === libraryId);
assert(sourceLibraryEntry, `Missing source library count for ${libraryId}`);

const summaryPath = path.join(generatedDir, `${libraryId}-approval-summary.json`);
assert(await exists(summaryPath), `Missing approval summary for ${libraryId}`);

const approvalSummary = await readJson(summaryPath);
const approvedRecordPath = path.join(repoRoot, approvalSummary.approved_record_path ?? path.join('data', 'si-registry', 'automation', libraryId, 'approved-records.json'));
const holdQueuePath = path.join(repoRoot, approvalSummary.editor_hold_queue_path ?? path.join('data', 'si-registry', 'automation', libraryId, 'editor-hold-queue.json'));
const promotionDecisionPath = path.join(repoRoot, 'data', 'si-registry', 'automation', libraryId, 'promotion-decisions.json');
const publicRegistryPath = path.join(repoRoot, 'public', 'registry', 'records.json');

const approvedRecords = await readJson(approvedRecordPath);
const holdRecords = await readJson(holdQueuePath);
const promotionDecisions = await readJson(promotionDecisionPath);
const publicRegistryRecords = await readJson(publicRegistryPath);
const priorPublicSameLibraryCount = await loadPriorPublicSameLibraryCount({ libraryId, libraryOrder });

for (const record of approvedRecords) {
  validateRegistryRecord(record);
}

const approvedRecordBannedHits = summarizeBannedFields(approvedRecords, 'approved_record');
const holdRecordBannedHits = summarizeBannedFields(holdRecords, 'hold_record');
const bannedHits = [...approvedRecordBannedHits, ...holdRecordBannedHits];

const reviewedDraftIconIds = Object.values(promotionDecisions.batches || {})
  .flatMap((batch) => extractDecisionIconIds(batch.keep_as_reviewed_draft));
const overlapSkipped = approvalSummary.overlap_skipped_count || 0;
const holdCount = holdRecords.length;
const draftCount = approvalSummary.total_reviewed_drafts || 0;
const approvedCount = approvedRecords.length;
const sourceTotal = sourceLibraryEntry.count;
const processedTotal = approvedCount + holdCount + draftCount + overlapSkipped;
const publicRegistryCount = publicRegistryRecords.filter((record) => record.source_library === libraryId).length;
const expectedPublicRegistryCount = approvedCount + priorPublicSameLibraryCount;
const coverageMatches = processedTotal === sourceTotal;
const projectionMatches = publicRegistryCount === expectedPublicRegistryCount;
const gaps = buildGapList({
  coverageMatches,
  projectionMatches,
  holdCount,
  draftCount,
  bannedHits,
  overlapSkipped,
});
const verdict = buildVerdict({
  coverageMatches,
  projectionMatches,
  holdCount,
  draftCount,
  bannedHits,
});
const topCategories = sortEntries(approvalSummary.approved_by_category);
const topDomains = sortEntries(approvalSummary.approved_by_domain);
const markdownReportPath = path.join(docsPlansDir, `${today}-${libraryId}-completion-audit-report.md`);
const htmlReportPath = path.join(docsPlansDir, `${today}-${libraryId}-completion-audit-report.html`);
const jsonReportPath = path.join(generatedDir, `${libraryId}-completion-audit.json`);

const report = {
  schema_version: '1.0.0',
  generated_at: new Date().toISOString(),
  library_id: libraryId,
  library_label: libraryMeta.label ?? formatTitle(libraryId),
  library_order: libraryMeta.order,
  verdict,
  coverage: {
    source_total_icons: sourceTotal,
    approved_records: approvedCount,
    hold_records: holdCount,
    reviewed_drafts: draftCount,
    overlap_skipped: overlapSkipped,
    processed_total: processedTotal,
    processed_matches_source_total: coverageMatches,
  },
  projection: {
    public_registry_records: publicRegistryCount,
    prior_public_records_outside_library_rollout: priorPublicSameLibraryCount,
    expected_public_registry_records: expectedPublicRegistryCount,
    matches_expected_public_registry_count: projectionMatches,
  },
  quality_signals: {
    approved_ratio: Number((approvedCount / sourceTotal).toFixed(4)),
    hold_ratio: Number((holdCount / sourceTotal).toFixed(4)),
    draft_ratio: Number((draftCount / sourceTotal).toFixed(4)),
    batch_count: Object.keys(approvalSummary.batch_summaries || {}).length,
    top_categories: topCategories,
    top_domains: topDomains,
  },
  metadata_safety: {
    records_checked: approvedCount + holdCount,
    banned_field_hit_count: bannedHits.length,
    banned_field_hits: bannedHits,
  },
  gaps,
  manual_spotcheck: {
    approved_examples: approvedRecords.slice(0, 8).map((record) => record.icon_id),
    hold_examples: holdRecords.slice(0, 8).map((record) => record.icon_id),
    draft_examples: reviewedDraftIconIds.slice(0, 8),
  },
  report_paths: {
    json: path.relative(repoRoot, jsonReportPath).replaceAll(path.sep, '/'),
    markdown: path.relative(repoRoot, markdownReportPath).replaceAll(path.sep, '/'),
    html: path.relative(repoRoot, htmlReportPath).replaceAll(path.sep, '/'),
  },
};

await ensureDir(jsonReportPath);
await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2), 'utf8');
await fs.writeFile(markdownReportPath, renderMarkdown(report), 'utf8');
await fs.writeFile(htmlReportPath, renderHtml(report), 'utf8');

console.log(
  `build-library-completion-audit: ${libraryId} | verdict=${report.verdict.status} | processed=${processedTotal}/${sourceTotal} | approved=${approvedCount} | hold=${holdCount} | draft=${draftCount}`
);
