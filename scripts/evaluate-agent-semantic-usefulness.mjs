import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { searchIcons } from '../mcp/search.js';
import {
  buildPublicSemanticPayload,
  chooseSemanticCandidate,
  createSemanticRegistryMap,
  getSemanticRecordForIcon,
  loadSemanticRegistryRecords,
  mergeSemanticMatchesIntoIcons,
} from '../mcp/semantic-registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const docsDir = path.join(repoRoot, 'docs', 'superpowers', 'plans');

async function readJson(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  return JSON.parse(await fs.readFile(absolutePath, 'utf8'));
}

async function writeJson(relativePath, value) {
  const absolutePath = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(relativePath, value) {
  const absolutePath = path.join(repoRoot, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, value, 'utf8');
}

function iconId(icon) {
  return `${icon.lib}:${icon.id}`;
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildCandidateDetail(icon, semanticMap) {
  const registryRecord = getSemanticRecordForIcon(semanticMap, icon);
  const semantic = buildPublicSemanticPayload(registryRecord);

  return {
    icon_id: iconId(icon),
    name: icon.name,
    library: icon.lib,
    has_semantic: Boolean(semantic),
    semantic_label: semantic?.label || null,
    semantic_category: semantic?.category || null,
    semantic_purpose: semantic?.purpose || null,
  };
}

function buildHtmlReport(report) {
  const summaryCards = [
    ['Queries checked', report.summary.total_fixture_count],
    ['Baseline first-result hits', `${report.summary.baseline_top1_hit_count} / ${report.summary.total_fixture_count}`],
    ['Augmented first-result hits', `${report.summary.augmented_top1_hit_count} / ${report.summary.total_fixture_count}`],
    ['Semantic-assisted hits', `${report.summary.semantic_pick_hit_count} / ${report.summary.total_fixture_count}`],
    ['Queries with semantic coverage', `${report.summary.fixtures_with_semantic_coverage} / ${report.summary.total_fixture_count}`],
  ];

  const querySections = report.results.map((result) => {
    const statusLabel = result.semantic_pick_matches_expected
      ? 'Semantic pick matched expected icon'
      : result.baseline_top1_matches_expected
        ? 'Baseline already correct'
        : 'Still unresolved';

    const candidateList = result.candidates.map((candidate) => `
      <li>
        <strong>${escapeHtml(candidate.icon_id)}</strong>
        ${candidate.has_semantic ? `<span class="pill">meaning data available</span>` : `<span class="pill muted">no meaning data</span>`}
        <div class="subtle">${escapeHtml(candidate.semantic_label || candidate.name)}</div>
      </li>
    `).join('');

    return `
      <section class="query-card">
        <div class="query-head">
          <div>
            <p class="eyebrow">Query</p>
            <h2>${escapeHtml(result.query)}</h2>
          </div>
          <div class="status">${escapeHtml(statusLabel)}</div>
        </div>
        <p><strong>Expected icon:</strong> ${escapeHtml(result.expected_icon_id)}</p>
        <p><strong>Baseline first result:</strong> ${escapeHtml(result.baseline_first_icon_id || 'none')}</p>
        <p><strong>Semantic-augmented first result:</strong> ${escapeHtml(result.augmented_first_icon_id || 'none')}</p>
        <p><strong>Semantic-assisted pick:</strong> ${escapeHtml(result.semantic_pick_icon_id || 'none')}</p>
        <p><strong>Why this query matters:</strong> ${escapeHtml(result.why)}</p>
      <p><strong>Semantic coverage in augmented top ${result.top_n}:</strong> ${result.semantic_coverage_count} of ${result.augmented_candidate_count} candidates</p>
        <ul class="candidate-list">${candidateList}</ul>
      </section>
    `;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent Semantic Usefulness Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ec;
      --panel: #fffdf8;
      --ink: #1f1a14;
      --muted: #6d6257;
      --line: #ddd2c3;
      --accent: #8c5727;
      --soft: #f3e4d2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(180deg, #fbf8f1 0%, var(--bg) 100%);
      color: var(--ink);
      line-height: 1.65;
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px 64px;
    }
    .hero, .query-card, .summary {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 18px 45px rgba(31, 26, 20, 0.06);
      margin-bottom: 20px;
    }
    .eyebrow {
      display: inline-block;
      margin: 0 0 12px;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--soft);
      color: var(--accent);
      font-size: 0.9rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      margin-top: 16px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      background: #fffaf2;
    }
    .card strong {
      display: block;
      font-size: 1.7rem;
      color: var(--ink);
      margin-top: 6px;
    }
    .query-head {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
    }
    .status {
      background: #f4efe6;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 0.95rem;
      color: var(--ink);
      white-space: nowrap;
    }
    .candidate-list {
      margin: 14px 0 0;
      padding-left: 20px;
    }
    .candidate-list li {
      margin-bottom: 10px;
      color: var(--muted);
    }
    .pill {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #efe2cf;
      color: var(--accent);
      font-size: 0.82rem;
    }
    .pill.muted {
      background: #f0ece5;
      color: var(--muted);
    }
    .subtle {
      color: var(--muted);
      font-size: 0.95rem;
      margin-top: 4px;
    }
    p, li { color: var(--muted); }
    strong, h1, h2 { color: var(--ink); }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p class="eyebrow">Checkpoint</p>
      <h1>Does the new icon meaning data help agents?</h1>
      <p>This report checks a small set of real icon-picking prompts. It compares the basic search result with a semantic-augmented result list, then checks whether the meaning data helps pick the best icon from that improved shortlist.</p>
      <p><strong>What this means:</strong> the reviewed meaning records are now being used to pull better candidates into the result set, not just to explain icons after they appear.</p>
    </section>

    <section class="summary">
      <h2>Headline Result</h2>
      <p><strong>Baseline first-result accuracy:</strong> ${report.summary.baseline_top1_hit_count} of ${report.summary.total_fixture_count}</p>
      <p><strong>Semantic-augmented first-result accuracy:</strong> ${report.summary.augmented_top1_hit_count} of ${report.summary.total_fixture_count}</p>
      <p><strong>Semantic-assisted pick accuracy:</strong> ${report.summary.semantic_pick_hit_count} of ${report.summary.total_fixture_count}</p>
      <p><strong>Lift vs baseline:</strong> ${report.summary.semantic_lift_vs_baseline >= 0 ? '+' : ''}${report.summary.semantic_lift_vs_baseline}</p>
      <div class="grid">
        ${summaryCards.map(([label, value]) => `
          <div class="card">
            <div>${escapeHtml(label)}</div>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `).join('')}
      </div>
    </section>

    ${querySections}
  </main>
</body>
</html>`;
}

const iconIndex = await readJson('public/icon-index.json');
const synonyms = await readJson('public/synonyms.json');
const fixtures = await readJson('data/si-registry/benchmarks/agent-usefulness-fixtures.json');
const semanticRecords = loadSemanticRegistryRecords(path.join(repoRoot, 'mcp', 'public'));
const semanticMap = createSemanticRegistryMap(semanticRecords);
const icons = iconIndex.icons || [];

const results = fixtures.map((fixture) => {
  const resultsForQuery = searchIcons(fixture.query, icons, synonyms, { limit: fixture.top_n });
  const augmentedResults = mergeSemanticMatchesIntoIcons(fixture.query, resultsForQuery, icons, semanticMap, { limit: fixture.top_n });
  const baselineFirstIconId = resultsForQuery[0] ? iconId(resultsForQuery[0]) : null;
  const augmentedFirstIconId = augmentedResults[0] ? iconId(augmentedResults[0]) : null;
  const semanticPick = chooseSemanticCandidate(fixture.query, augmentedResults, semanticMap);
  const semanticPickIconId = semanticPick?.icon ? iconId(semanticPick.icon) : null;
  const semanticCoverageCount = augmentedResults.filter((icon) => getSemanticRecordForIcon(semanticMap, icon)).length;
  const expectedInTopN = resultsForQuery.some((icon) => iconId(icon) === fixture.expected_icon_id);
  const expectedInAugmentedTopN = augmentedResults.some((icon) => iconId(icon) === fixture.expected_icon_id);

  return {
    query: fixture.query,
    why: fixture.why,
    top_n: fixture.top_n,
    expected_icon_id: fixture.expected_icon_id,
    candidate_count: resultsForQuery.length,
    augmented_candidate_count: augmentedResults.length,
    baseline_first_icon_id: baselineFirstIconId,
    baseline_top1_matches_expected: baselineFirstIconId === fixture.expected_icon_id,
    baseline_contains_expected_in_top_n: expectedInTopN,
    augmented_first_icon_id: augmentedFirstIconId,
    augmented_top1_matches_expected: augmentedFirstIconId === fixture.expected_icon_id,
    augmented_contains_expected_in_top_n: expectedInAugmentedTopN,
    semantic_pick_icon_id: semanticPickIconId,
    semantic_pick_matches_expected: semanticPickIconId === fixture.expected_icon_id,
    semantic_pick_score: semanticPick ? semanticPick.score : 0,
    semantic_coverage_count: semanticCoverageCount,
    semantic_coverage_rate: augmentedResults.length ? round(semanticCoverageCount / augmentedResults.length) : 0,
    improved_over_baseline: baselineFirstIconId !== fixture.expected_icon_id && semanticPickIconId === fixture.expected_icon_id,
    regressed_from_baseline: baselineFirstIconId === fixture.expected_icon_id && semanticPickIconId !== fixture.expected_icon_id,
    candidates: augmentedResults.map((icon) => buildCandidateDetail(icon, semanticMap)),
  };
});

const summary = {
  generated_at: new Date().toISOString(),
  total_fixture_count: results.length,
  public_semantic_record_count: semanticRecords.length,
  baseline_top1_hit_count: results.filter((result) => result.baseline_top1_matches_expected).length,
  baseline_top_n_hit_count: results.filter((result) => result.baseline_contains_expected_in_top_n).length,
  augmented_top1_hit_count: results.filter((result) => result.augmented_top1_matches_expected).length,
  augmented_top_n_hit_count: results.filter((result) => result.augmented_contains_expected_in_top_n).length,
  semantic_pick_hit_count: results.filter((result) => result.semantic_pick_matches_expected).length,
  semantic_improvement_count: results.filter((result) => result.improved_over_baseline).length,
  semantic_regression_count: results.filter((result) => result.regressed_from_baseline).length,
  fixtures_with_semantic_coverage: results.filter((result) => result.semantic_coverage_count > 0).length,
  average_semantic_coverage_rate: round(average(results.map((result) => result.semantic_coverage_rate))),
};

summary.semantic_lift_vs_baseline = summary.semantic_pick_hit_count - summary.baseline_top1_hit_count;
summary.augmented_lift_vs_baseline = summary.augmented_top1_hit_count - summary.baseline_top1_hit_count;

const report = {
  schema_version: '1.0.0',
  summary,
  results,
};

await writeJson('data/si-registry/generated/agent-semantic-usefulness-report.json', report);
await writeText(
  'docs/superpowers/plans/2026-04-20-agent-semantic-usefulness-report.html',
  buildHtmlReport(report)
);

console.log(
  `evaluate-agent-semantic-usefulness: baseline=${summary.baseline_top1_hit_count}/${summary.total_fixture_count}, augmented=${summary.augmented_top1_hit_count}/${summary.total_fixture_count}, semantic=${summary.semantic_pick_hit_count}/${summary.total_fixture_count}, lift=${summary.semantic_lift_vs_baseline >= 0 ? '+' : ''}${summary.semantic_lift_vs_baseline}`
);
