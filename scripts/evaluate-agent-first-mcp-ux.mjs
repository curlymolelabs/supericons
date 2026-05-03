import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { searchIcons } from '../mcp/search.js';
import { recommendIconsForTask } from '../mcp/recommend-icons.js';
import {
  getSemanticRecordForIcon,
  createSemanticRegistryMap,
  loadSemanticRegistryRecords,
  mergeSemanticMatchesIntoIcons,
} from '../mcp/semantic-registry.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const mcpPublicDir = join(repoRoot, 'mcp', 'public');
const fixturePath = join(repoRoot, 'data', 'si-registry', 'benchmarks', 'agent-first-mcp-ux-fixtures.json');
const reportJsonPath = join(repoRoot, 'data', 'si-registry', 'generated', 'agent-first-mcp-ux-report.json');
const reportHtmlPath = join(repoRoot, 'docs', 'superpowers', 'plans', '2026-04-21-agent-first-mcp-ux-report.html');

function loadFreeIcons() {
  const raw = JSON.parse(readFileSync(join(mcpPublicDir, 'icon-index.json'), 'utf8'));
  return raw.icons
    .filter((entry) => entry.type === 'svg' && entry.svg)
    .map((icon) => ({ ...icon, premium: false }));
}

function loadSynonyms() {
  return JSON.parse(readFileSync(join(mcpPublicDir, 'synonyms.json'), 'utf8'));
}

function buildIconResult(icon, semanticMap) {
  if (!icon?.svg) return null;
  const semanticRecord = getSemanticRecordForIcon(semanticMap, icon);
  return {
    id: icon.id,
    name: icon.name,
    library: icon.lib,
    svg: icon.svg,
    semantic: semanticRecord ? {
      label: semanticRecord.label || null,
      purpose: semanticRecord.purpose || null,
      category: semanticRecord.category || null,
    } : null,
  };
}

function renderHtml(report) {
  const fixtureSections = report.results.map((fixture) => {
    const slotCards = fixture.slot_results.map((slotResult) => {
      const recommended = slotResult.recommended
        ? `
          <div class="preview">
            <div class="icon">${slotResult.recommended.svg}</div>
            <div>
              <strong>${slotResult.recommended.library}:${slotResult.recommended.id}</strong>
              <p>${slotResult.recommended.why_selected}</p>
              <p><strong>Fit:</strong> ${slotResult.recommended.semantic_fit}</p>
            </div>
          </div>
        `
        : '<p>No recommendation returned.</p>';

      const alternatives = slotResult.alternatives.length > 0
        ? `<ul>${slotResult.alternatives.map((alternative) => `<li><strong>${alternative.library}:${alternative.id}</strong> - ${alternative.label}</li>`).join('')}</ul>`
        : '<p>No alternatives returned.</p>';

      return `
        <article class="card">
          <p class="eyebrow">${slotResult.slot}</p>
          <h3>${slotResult.match_label}</h3>
          <p><strong>Expected:</strong> ${slotResult.expected_icon_ids.join(', ')}</p>
          <p><strong>Recommended:</strong> ${slotResult.recommended_icon_id || 'none'}</p>
          <p><strong>Queries used:</strong> ${slotResult.queries_used.join(', ')}</p>
          ${recommended}
          <h4>Alternatives</h4>
          ${alternatives}
        </article>
      `;
    }).join('');

    return `
      <section>
        <p class="eyebrow">Fixture</p>
        <h2>${fixture.id}</h2>
        <p><strong>Task:</strong> ${fixture.task}</p>
        <p><strong>Library:</strong> ${fixture.library}</p>
        <p><strong>Slot hit rate:</strong> ${fixture.hit_count} / ${fixture.slot_count}</p>
        <div class="grid">
          ${slotCards}
        </div>
      </section>
    `;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Agent-First MCP UX Report</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ec;
      --panel: #fffdf8;
      --ink: #211a14;
      --muted: #6c6155;
      --line: #ddd2c3;
      --accent: #8d5a2b;
      --soft: #f2e2ce;
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
      max-width: 1180px;
      margin: 0 auto;
      padding: 40px 20px 64px;
    }
    section, .hero {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 24px;
      box-shadow: 0 18px 45px rgba(33, 26, 20, 0.06);
      margin-bottom: 18px;
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
    h1, h2, h3, h4 {
      margin-top: 0;
      color: var(--ink);
    }
    p, li {
      color: var(--muted);
    }
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: #fffaf2;
      padding: 18px;
    }
    .preview {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 14px;
      align-items: start;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--line);
    }
    .icon {
      width: 72px;
      height: 72px;
      border-radius: 18px;
      background: #f5eee4;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #5b3819;
    }
    .icon svg {
      width: 32px;
      height: 32px;
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <p class="eyebrow">Checkpoint</p>
      <h1>Can the new recommendation flow help an agent choose icons faster?</h1>
      <p>This first report checks the exact bottom-navigation use case that was tested in an external MCP client. The goal is to see whether the new recommendation tool can return shortlist choices with previews and short reasons, without forcing the agent to manually break the task into many separate search prompts.</p>
      <p><strong>Headline result:</strong> ${report.summary.total_hits} of ${report.summary.total_slots} slots matched the current expected MingCute pick.</p>
    </section>
    ${fixtureSections}
  </main>
</body>
</html>`;
}

const freeIcons = loadFreeIcons();
const synonyms = loadSynonyms();
const semanticMap = createSemanticRegistryMap(loadSemanticRegistryRecords(mcpPublicDir));
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8')).fixtures || [];

const results = [];
for (const fixture of fixtures) {
  const recommendation = await recommendIconsForTask({
    task: fixture.task,
    library: fixture.library,
    slots: fixture.slots.map((slot) => slot.slot),
    limitPerSlot: fixture.limit_per_slot || 3,
    semanticMap,
    searchIconsForQuery: async ({ query, library, limit }) => {
      const searchable = library
        ? freeIcons.filter((icon) => icon.lib === library)
        : freeIcons;
      const baseline = searchIcons(query, searchable, synonyms, { library, limit });
      return mergeSemanticMatchesIntoIcons(query, baseline, searchable, semanticMap, { limit });
    },
    buildIconResult: async (icon) => buildIconResult(icon, semanticMap),
  });

  const slotResults = recommendation.results.map((slotResult, index) => {
    const expected = fixture.slots[index];
    const recommendedIconId = slotResult.recommended
      ? `${slotResult.recommended.library}:${slotResult.recommended.id}`
      : null;
    const expectedIconIds = expected.expected_icon_ids || [expected.expected_icon_id].filter(Boolean);
    const matched = expectedIconIds.includes(recommendedIconId);

    return {
      slot: slotResult.slot,
      expected_icon_ids: expectedIconIds,
      recommended_icon_id: recommendedIconId,
      match_label: matched ? 'Matched expected recommendation' : 'Different from expected recommendation',
      queries_used: slotResult.queries_used,
      recommended: slotResult.recommended,
      alternatives: slotResult.alternatives,
      matched,
    };
  });

  results.push({
    id: fixture.id,
    task: fixture.task,
    library: fixture.library,
    slot_count: slotResults.length,
    hit_count: slotResults.filter((slot) => slot.matched).length,
    slot_results: slotResults,
  });
}

const report = {
  schema_version: '1.0.0',
  generated_at: new Date().toISOString(),
  summary: {
    fixture_count: results.length,
    total_slots: results.reduce((sum, fixture) => sum + fixture.slot_count, 0),
    total_hits: results.reduce((sum, fixture) => sum + fixture.hit_count, 0),
  },
  results,
};

writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
writeFileSync(reportHtmlPath, renderHtml(report));

console.log(JSON.stringify(report.summary, null, 2));

if (report.summary.total_hits !== report.summary.total_slots) {
  console.error(`agent-first MCP UX benchmark missed ${report.summary.total_slots - report.summary.total_hits} slot(s). See ${reportJsonPath}`);
  process.exitCode = 1;
}
