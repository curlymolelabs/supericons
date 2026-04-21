import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const approvedPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'approved-records.json');
const visualInputsPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'visual-review-inputs.json');
const outputPath = path.join(
  repoRoot,
  'docs',
  'superpowers',
  'plans',
  '2026-04-22-purpose-chip-pruned-schema-5-icon-proof.html'
);

const PUBLIC_TAG_FIELDS = [
  'label',
  'source_name',
  'depicts',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildPublicTagPreview(record) {
  const preview = {};
  for (const field of PUBLIC_TAG_FIELDS) {
    if (field in record) {
      preview[field] = record[field];
    }
  }
  return preview;
}

function renderCard(record, svgPayload) {
  const metadataJson = JSON.stringify(buildPublicTagPreview(record), null, 2);
  const safeSvg = svgPayload && svgPayload.trim().length > 0
    ? svgPayload
        .replace('<svg', '<svg aria-label="Icon preview"')
        .replace(/width=\"[^\"]*\"/g, 'width="64"')
        .replace(/height=\"[^\"]*\"/g, 'height="64"')
    : '<div class="missing">No SVG preview was found for this icon.</div>';

  return `
    <article class="card">
      <header class="card-head">
        <h2>${escapeHtml(record.icon_id)}</h2>
        <p>${escapeHtml(record.label || 'Untitled icon')}</p>
      </header>
      <div class="card-body">
        <div class="icon-box">${safeSvg}</div>
        <div class="meta-box">
          <h3>Public semantic metadata</h3>
          <pre><code>${escapeHtml(metadataJson)}</code></pre>
        </div>
      </div>
    </article>
  `;
}

async function main() {
  const approvedRecords = JSON.parse(await fs.readFile(approvedPath, 'utf8'));
  const visualInputs = JSON.parse(await fs.readFile(visualInputsPath, 'utf8'));

  const svgByIconId = new Map(
    visualInputs.map((entry) => [entry.icon_id, entry.source_svg || entry?.renderable_icon_payload?.svg || ''])
  );

  const selected = approvedRecords.slice(0, 5);
  const cards = selected.map((record) => renderCard(record, svgByIconId.get(record.icon_id) || '')).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Purpose Chip Pruned Schema Proof (5 Icons)</title>
  <style>
    :root {
      --bg: #0f172a;
      --panel: #111827;
      --line: #334155;
      --text: #e2e8f0;
      --muted: #94a3b8;
      --accent: #22d3ee;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: radial-gradient(circle at top, #1e293b, var(--bg) 50%);
      color: var(--text);
      line-height: 1.5;
    }
    main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 40px 20px 80px;
    }
    h1 { margin: 0 0 8px; font-size: 30px; }
    .lead { margin: 0 0 24px; color: var(--muted); max-width: 900px; }
    .point {
      border-left: 4px solid var(--accent);
      padding: 12px 14px;
      margin: 0 0 24px;
      background: rgba(15, 23, 42, 0.7);
      color: #cbd5e1;
    }
    .grid {
      display: grid;
      gap: 18px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(17, 24, 39, 0.88);
      overflow: hidden;
    }
    .card-head {
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(30, 41, 59, 0.7);
    }
    .card-head h2 {
      margin: 0;
      font-size: 16px;
      color: #f8fafc;
      word-break: break-word;
    }
    .card-head p {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 14px;
    }
    .card-body {
      display: grid;
      grid-template-columns: 180px 1fr;
      gap: 14px;
      padding: 14px 16px 16px;
    }
    .icon-box {
      min-height: 140px;
      border: 1px dashed #475569;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.75);
      display: grid;
      place-items: center;
      color: #f8fafc;
    }
    .icon-box svg {
      stroke: currentColor;
      color: #f8fafc;
    }
    .meta-box h3 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #cbd5e1;
      font-weight: 600;
    }
    pre {
      margin: 0;
      max-height: 280px;
      overflow: auto;
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px;
      color: #e2e8f0;
      font-size: 12px;
    }
    .missing {
      color: #94a3b8;
      text-align: center;
      padding: 10px;
      font-size: 13px;
    }
    @media (max-width: 820px) {
      .card-body { grid-template-columns: 1fr; }
      .icon-box { min-height: 120px; }
    }
  </style>
</head>
<body>
  <main>
    <h1>Purpose Chip Schema Proof (5 Icons)</h1>
    <p class="lead">This page shows five approved purpose-chip icons side by side with the exact public semantic metadata that agents will receive.</p>
    <div class="point">
      We removed old metadata keys like <code>intent</code>, <code>domain</code>, and <code>confidence</code> from active records.  
      What you see here is the current pruned metadata shape used for public agent-facing output.
    </div>
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>
`;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, html, 'utf8');

  console.log(`build-purpose-chip-pruned-schema-proof: wrote ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

