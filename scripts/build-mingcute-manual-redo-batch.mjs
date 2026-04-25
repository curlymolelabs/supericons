import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const batchId = process.argv[2] || 'mingcute-batch-01';
const today = new Date().toISOString().slice(0, 10);
const batchSlug = batchId.startsWith('mingcute-') ? batchId.slice('mingcute-'.length) : batchId;

const selectionPath = path.join(repoRoot, 'data', 'si-registry', 'manual-redo', `${batchId}-selection.json`);
const approvedPath = path.join(repoRoot, 'data', 'si-registry', 'automation', 'mingcute', 'approved-records.json');
const iconIndexPath = path.join(repoRoot, 'public', 'icon-index.json');
const outputJsonPath = path.join(repoRoot, 'data', 'si-registry', 'manual-redo', `mingcute-manual-redo-${batchSlug}-internal-review-reviewed-records.json`);
const outputSummaryPath = path.join(repoRoot, 'data', 'si-registry', 'generated', `mingcute-manual-redo-${batchSlug}-summary.json`);
const outputHtmlPath = path.join(repoRoot, 'docs', 'superpowers', 'plans', `${today}-mingcute-manual-redo-${batchSlug}-internal-review.html`);

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeMingcuteIndexId(sourceName) {
  return sourceName === 'abs' ? 'ABS_line' : `${sourceName}_line`;
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

const selection = await readJson(selectionPath);
const approvedRecords = await readJson(approvedPath);
const iconIndex = await readJson(iconIndexPath);

const approvedById = new Map(approvedRecords.map((record) => [record.icon_id, record]));
const iconIndexById = new Map(iconIndex.icons.map((icon) => [`${icon.lib}:${icon.id}`, icon]));

const reviewItems = selection.items.map((item, index) => {
  const approvedRecord = approvedById.get(item.icon_id);
  if (!approvedRecord) {
    throw new Error(`Missing approved MingCute record for ${item.icon_id}`);
  }

  const assetId = normalizeMingcuteIndexId(approvedRecord.source_name);
  const iconIndexRecord = iconIndexById.get(`mingcute:${assetId}`);
  if (!iconIndexRecord?.svg) {
    throw new Error(`Missing MingCute SVG payload for ${item.icon_id} using asset ${assetId}`);
  }

  return {
    order: index + 1,
    icon_id: item.icon_id,
    source_asset_name: assetId,
    label: approvedRecord.label,
    fit_note: item.fit_note,
    official_source_url: item.official_source_url,
    public_reference_url: item.public_reference_url || null,
    svg: iconIndexRecord.svg,
    semantic_record: approvedRecord,
  };
});

const summary = {
  batch_id: selection.batch_id,
  library_id: selection.library_id,
  title: selection.title,
  review_goal: selection.review_goal,
  internal_review_only: true,
  item_count: reviewItems.length,
  icon_ids: reviewItems.map((item) => item.icon_id),
  output_json_path: path.relative(repoRoot, outputJsonPath).replaceAll(path.sep, '/'),
  output_html_path: path.relative(repoRoot, outputHtmlPath).replaceAll(path.sep, '/'),
};

const cardsHtml = reviewItems.map((item) => {
  const semanticJson = JSON.stringify(item.semantic_record, null, 2);
  const publicReference = item.public_reference_url
    ? `<li><strong>Public reference:</strong> <a href="${escapeHtml(item.public_reference_url)}">${escapeHtml(item.public_reference_url)}</a></li>`
    : '';

  return `
    <article class="card" id="${escapeHtml(item.icon_id)}">
      <div class="card-top">
        <div class="icon-panel">
          <div class="icon-wrap" aria-label="${escapeHtml(item.label)} icon">
            ${item.svg}
          </div>
        </div>
        <div class="meta-panel">
          <div class="batch-order">Item ${item.order}</div>
          <h2>${escapeHtml(item.label)}</h2>
          <p class="icon-id"><code>${escapeHtml(item.icon_id)}</code></p>
          <p>${escapeHtml(item.fit_note)}</p>
          <ul class="evidence-list">
            <li><strong>Official source:</strong> <a href="${escapeHtml(item.official_source_url)}">${escapeHtml(item.official_source_url)}</a></li>
            ${publicReference}
          </ul>
        </div>
      </div>
      <div class="json-panel">
        <p class="json-label">Exact semantic metadata</p>
        <pre><code>${escapeHtml(semanticJson)}</code></pre>
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
      color-scheme: light;
      --bg: #f6f0e6;
      --paper: #fffdf9;
      --ink: #1f2937;
      --muted: #6b7280;
      --line: #e7dac7;
      --accent: #9a3412;
      --accent-soft: #fde7d2;
      --shadow: 0 16px 44px rgba(30, 24, 18, 0.08);
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
      max-width: 1180px;
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
    h1, h2 { margin-top: 0; }
    h1 { color: var(--accent); font-size: clamp(2rem, 4vw, 2.8rem); }
    .muted { color: var(--muted); }
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
    .card-top {
      display: grid;
      grid-template-columns: minmax(260px, 320px) 1fr;
      gap: 18px;
      margin-bottom: 16px;
    }
    .icon-panel, .meta-panel, .json-panel {
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
      fill: #12365b;
    }
    .meta-panel {
      padding: 18px;
    }
    .batch-order {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 8px;
    }
    .icon-id {
      margin-top: -4px;
      color: var(--muted);
    }
    code {
      font-family: Consolas, "Courier New", monospace;
      background: #f5ecdf;
      padding: 1px 5px;
      border-radius: 6px;
    }
    .evidence-list {
      padding-left: 20px;
      margin: 12px 0 0;
    }
    a { color: var(--accent); }
    .json-panel {
      padding: 16px;
    }
    .json-label {
      margin-top: 0;
      font-weight: 700;
      color: var(--accent);
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
      font-size: 13px;
      line-height: 1.5;
    }
    @media (max-width: 860px) {
      .card-top {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">Manual Redo Batch</div>
      <h1>${escapeHtml(selection.title)}</h1>
      <p>${escapeHtml(selection.review_goal)}</p>
      <p class="muted">This page is the new slower review path. It is only the first 5 icons. The redo pauses after this batch so you can inspect the pattern before we continue.</p>
      <div class="summary">
        <div class="summary-box"><strong>${reviewItems.length}</strong>icons in this batch</div>
        <div class="summary-box"><strong>MingCute</strong>first library in the redo order</div>
        <div class="summary-box"><strong>Official</strong>source links included</div>
        <div class="summary-box"><strong>Paused</strong>after this batch for your review</div>
      </div>
    </section>
    ${cardsHtml}
  </main>
</body>
</html>`;

await writeJson(outputJsonPath, reviewItems);
await writeJson(outputSummaryPath, summary);
await writeText(outputHtmlPath, html);

console.log(`build-mingcute-manual-redo-batch: wrote ${path.relative(repoRoot, outputJsonPath)}, ${path.relative(repoRoot, outputSummaryPath)}, ${path.relative(repoRoot, outputHtmlPath)}`);
