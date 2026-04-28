import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  loadAndValidateDeterministicManualRedoSelection,
  resolveVisualPreview,
  validateDeterministicDepictsObservation,
} from '../lib/si-registry/manual-redo-determinism.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const batchId = process.argv[2] || 'purpose-chip-batch-01';
const selectionPath = path.join(repoRoot, 'data', 'si-registry', 'manual-redo', `${batchId}-selection.json`);
const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

function asUniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))];
}

const LIST_FIELD_WORD_LIMITS = Object.freeze({
  semantic_tags: 4,
  synonyms: 5,
});

function requireNonEmptyString(value, fieldLabel, iconId) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  throw new Error(`Missing required ${fieldLabel} for ${iconId}`);
}

function normalizeListValue(value) {
  return String(value || '')
    .trim()
    .replace(/[.]+$/g, '')
    .replace(/\s+/g, ' ');
}

function toPublicListValue(value, field) {
  const normalized = normalizeListValue(value);
  if (!normalized) return null;
  if (/[,;:!?]/.test(normalized)) return null;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length > (LIST_FIELD_WORD_LIMITS[field] || 5)) return null;
  if (words.length >= 4 && /\b(and|or)\b/i.test(normalized)) return null;

  return normalized.toLowerCase();
}

function buildDeterministicPhraseList(values, field) {
  const normalizedMap = new Map();

  for (const value of values) {
    const normalized = toPublicListValue(value, field);
    if (!normalized) continue;
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, normalized);
    }
  }

  return [...normalizedMap.values()].sort((left, right) => left.localeCompare(right));
}

const { selection, currentRecords, visualItems } =
  await loadAndValidateDeterministicManualRedoSelection(selectionPath, repoRoot);
const batchSlug = batchId.startsWith(`${selection.track_id}-`) ? batchId.slice(`${selection.track_id}-`.length) : batchId;

const currentRecordById = new Map(currentRecords.map((record) => [record.icon_id, record]));

const reviewItems = selection.items.map((item, index) => {
  const currentRecord = currentRecordById.get(item.icon_id);
  if (!currentRecord) {
    throw new Error(`Missing current record for ${item.icon_id}`);
  }

  const visualPreview = resolveVisualPreview(selection.visual_source, visualItems, item.icon_id, repoRoot, item);
  if (!visualPreview) {
    throw new Error(`Missing visual source for ${item.icon_id}`);
  }

  const depictsObservation = validateDeterministicDepictsObservation(item.depicts_observation, item.icon_id, currentRecord);
  const popularReading = requireNonEmptyString(item.popular_reading, 'popular_reading', item.icon_id);
  const contextBias = requireNonEmptyString(item.context_bias, 'context_bias', item.icon_id);
  const ambiguityNote = requireNonEmptyString(item.ambiguity_note, 'ambiguity_note', item.icon_id);
  const selectionReason = requireNonEmptyString(item.selection_reason, 'selection_reason', item.icon_id);
  const plausibleReadings = asUniqueStrings(item.plausible_readings || []);

  const proposedInterpretation = {
    icon_id: item.icon_id,
    source_library: currentRecord.source_library,
    source_name: currentRecord.source_name,
    label: currentRecord.label,
    depicts_observation: depictsObservation,
    popular_reading: popularReading,
    plausible_readings: plausibleReadings,
    context_bias: contextBias,
    ambiguity_note: ambiguityNote,
    search_hints: [
      currentRecord.label,
      ...plausibleReadings,
      popularReading
    ],
    official_source_url: item.official_source_url,
    public_reference_url: item.public_reference_url || null,
    selection_reason: selectionReason
  };

  const proposedFinalRecord = {
    icon_id: item.icon_id,
    source_library: currentRecord.source_library,
    source_name: currentRecord.source_name,
    label: currentRecord.label,
    depicts: depictsObservation,
    use_when: contextBias,
    avoid_when: ambiguityNote,
    semantic_tags: buildDeterministicPhraseList([
      ...(currentRecord.semantic_tags || []),
      ...plausibleReadings
    ], 'semantic_tags'),
    synonyms: buildDeterministicPhraseList([
      ...(currentRecord.synonyms || []),
      currentRecord.label,
      ...plausibleReadings
    ], 'synonyms')
  };

  return {
    order: index + 1,
    icon_id: item.icon_id,
    svg: visualPreview.kind === 'svg' ? visualPreview.svg : undefined,
    screenshot_path: visualPreview.kind === 'image' ? visualPreview.relative_path : undefined,
    current_semantic_record: currentRecord,
    proposed_interpretation: proposedInterpretation,
    proposed_final_record: proposedFinalRecord
  };
});

const outputJsonPath = path.join(
  repoRoot,
  'data',
  'si-registry',
  'manual-redo',
  `${selection.track_id}-manual-redo-${batchSlug}-internal-review-reviewed-records.json`
);
const outputFinalJsonPath = path.join(
  repoRoot,
  'data',
  'si-registry',
  'manual-redo',
  `${selection.track_id}-manual-redo-${batchSlug}-final-records.json`
);
const outputSummaryPath = path.join(
  repoRoot,
  'data',
  'si-registry',
  'generated',
  `${selection.track_id}-manual-redo-${batchSlug}-summary.json`
);
const outputHtmlPath = path.join(
  repoRoot,
  'docs',
  'superpowers',
  'plans',
  `${today}-${selection.track_id}-manual-redo-${batchSlug}-internal-review.html`
);

const summary = {
  batch_id: selection.batch_id,
  track_id: selection.track_id,
  track_label: selection.track_label,
  title: selection.title,
  review_goal: selection.review_goal,
  review_policy_snapshot: selection.review_policy_snapshot,
  internal_review_only: true,
  process_rule: 'Each icon must include depicts_observation (literal visual read) before final record generation.',
  final_schema_rule: 'Final semantic_tags and synonyms are lowercased, de-duplicated, sorted, and filtered to short phrase values only.',
  item_count: reviewItems.length,
  icon_ids: reviewItems.map((item) => item.icon_id),
  output_json_path: path.relative(repoRoot, outputJsonPath).replaceAll(path.sep, '/'),
  output_final_json_path: path.relative(repoRoot, outputFinalJsonPath).replaceAll(path.sep, '/'),
  output_html_path: path.relative(repoRoot, outputHtmlPath).replaceAll(path.sep, '/')
};

const cardsHtml = reviewItems.map((item) => {
  const currentJson = JSON.stringify(item.current_semantic_record, null, 2);
  const proposedJson = JSON.stringify(item.proposed_interpretation, null, 2);
  const finalJson = JSON.stringify(item.proposed_final_record, null, 2);
  const visualHtml = item.screenshot_path
    ? `<img src="${escapeHtml(pathToFileURL(path.join(repoRoot, item.screenshot_path)).href)}" alt="${escapeHtml(item.icon_id)} preview">`
    : item.svg;
  const plausibleList = item.proposed_interpretation.plausible_readings.map((reading) => `<li>${escapeHtml(reading)}</li>`).join('');
  const publicReference = item.proposed_interpretation.public_reference_url
    ? `<li><strong>Public reference:</strong> <a href="${escapeHtml(item.proposed_interpretation.public_reference_url)}">${escapeHtml(item.proposed_interpretation.public_reference_url)}</a></li>`
    : '';

  return `
    <article class="card" id="${escapeHtml(item.icon_id)}">
      <div class="top">
        <div class="icon-panel">
          <div class="icon-wrap">${visualHtml}</div>
        </div>
        <div class="reading-panel">
          <div class="order">Item ${item.order}</div>
          <h2>${escapeHtml(item.current_semantic_record.label)}</h2>
          <p><code>${escapeHtml(item.icon_id)}</code></p>
          <p><strong>Most common reading:</strong> ${escapeHtml(item.proposed_interpretation.popular_reading)}</p>
          <p><strong>Literal visual read (what the icon shows):</strong> ${escapeHtml(item.proposed_interpretation.depicts_observation)}</p>
          <p><strong>Context where it fits best:</strong> ${escapeHtml(item.proposed_interpretation.context_bias)}</p>
          <p><strong>Ambiguity note:</strong> ${escapeHtml(item.proposed_interpretation.ambiguity_note)}</p>
          <p><strong>Why this reading is strong:</strong> ${escapeHtml(item.proposed_interpretation.selection_reason)}</p>
          <p><strong>Other plausible readings:</strong></p>
          <ul>${plausibleList}</ul>
          <ul class="evidence">
            <li><strong>Official source:</strong> <a href="${escapeHtml(item.proposed_interpretation.official_source_url)}">${escapeHtml(item.proposed_interpretation.official_source_url)}</a></li>
            ${publicReference}
          </ul>
        </div>
      </div>
      <div class="json-grid">
        <section class="json-panel">
          <h3>Current Record</h3>
          <pre><code>${escapeHtml(currentJson)}</code></pre>
        </section>
        <section class="json-panel">
          <h3>Rich Review Notes (Internal)</h3>
          <pre><code>${escapeHtml(proposedJson)}</code></pre>
        </section>
        <section class="json-panel json-panel-wide">
          <h3>Final Public Record Candidate</h3>
          <pre><code>${escapeHtml(finalJson)}</code></pre>
        </section>
      </div>
    </article>
  `;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(selection.title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --bg: #f6f0e6;
      --paper: #fffdf9;
      --ink: #1f2937;
      --muted: #6b7280;
      --line: #e7dac7;
      --accent: #9a3412;
      --accent-soft: #fde7d2;
      --shadow: 0 16px 44px rgba(30,24,18,0.08);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: linear-gradient(180deg, #fbf6ee 0%, var(--bg) 100%);
      color: var(--ink);
      line-height: 1.6;
    }
    main {
      max-width: 1280px;
      margin: 0 auto;
      padding: 28px 20px 56px;
    }
    .hero, .card {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
    }
    .hero {
      padding: 26px;
      margin-bottom: 20px;
    }
    .eyebrow {
      display: inline-block;
      background: var(--accent-soft);
      color: var(--accent);
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 12px;
      font-weight: 700;
    }
    h1, h2, h3 { margin-top: 0; }
    h1 { color: var(--accent); font-size: clamp(2rem, 4vw, 2.8rem); }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .summary-box {
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 14px;
      background: rgba(255,255,255,0.78);
    }
    .summary-box strong {
      display: block;
      font-size: 1.7rem;
      color: var(--accent);
      margin-bottom: 6px;
    }
    .card {
      padding: 22px;
      margin-bottom: 18px;
    }
    .top {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 18px;
      margin-bottom: 16px;
    }
    .icon-panel, .reading-panel, .json-panel {
      border: 1px solid var(--line);
      border-radius: 18px;
      background: rgba(255,255,255,0.82);
    }
    .icon-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      min-height: 240px;
    }
    .icon-wrap {
      width: 160px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 24px;
      border: 1px solid var(--line);
      background: linear-gradient(180deg, #fff7eb 0%, #fff 100%);
    }
    .icon-wrap svg {
      width: 108px;
      height: 108px;
    }
    .icon-wrap img {
      max-width: 108px;
      max-height: 108px;
      width: auto;
      height: auto;
      display: block;
    }
    .reading-panel {
      padding: 18px;
    }
    .order {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 8px;
    }
    code {
      font-family: Consolas, "Courier New", monospace;
      background: #f5ecdf;
      padding: 1px 5px;
      border-radius: 6px;
    }
    .evidence {
      padding-left: 20px;
      margin-top: 12px;
    }
    a { color: var(--accent); }
    .json-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .json-panel-wide {
      grid-column: 1 / -1;
    }
    .json-panel {
      padding: 16px;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: 13px;
      line-height: 1.5;
    }
    @media (max-width: 900px) {
      .top, .json-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">Manual Restart Batch</div>
      <h1>${escapeHtml(selection.title)}</h1>
      <p>${escapeHtml(selection.review_goal)}</p>
      <div class="summary">
        <div class="summary-box"><strong>${reviewItems.length}</strong>icons in this policy-sized batch</div>
        <div class="summary-box"><strong>${escapeHtml(selection.track_label)}</strong>restart stage</div>
        <div class="summary-box"><strong>3 views</strong>current, rich review, and lean final</div>
        <div class="summary-box"><strong>Paused</strong>after this batch for your review</div>
      </div>
    </section>
    ${cardsHtml}
  </main>
</body>
</html>`;

await writeJson(outputJsonPath, reviewItems);
await writeJson(outputFinalJsonPath, reviewItems.map((item) => item.proposed_final_record));
await writeJson(outputSummaryPath, summary);
await writeText(outputHtmlPath, html);

console.log(
  `build-manual-redo-batch: wrote ${path.relative(repoRoot, outputJsonPath)}, ${path.relative(repoRoot, outputSummaryPath)}, ${path.relative(repoRoot, outputHtmlPath)}`
);
