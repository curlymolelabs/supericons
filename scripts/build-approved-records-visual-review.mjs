import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const approvedPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'approved-records.json');
const visualsPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'visual-review-inputs.json');
const outputPath = path.join(repoRoot, 'docs', 'superpowers', 'plans', '2026-04-20-approved-semantic-records-visual-review.html');

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function confidenceLabel(value) {
  const rounded = Math.round((Number(value) || 0) * 100);
  return `${rounded}%`;
}

function groupByCategory(records) {
  return records.reduce((map, record) => {
    const key = record.category || 'uncategorized';
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(record);
    return map;
  }, new Map());
}

function buildSection(category, records, visualById) {
  const items = records.map((record) => {
    const visual = visualById.get(record.icon_id);
    const svg = visual?.source_svg || visual?.renderable_icon_payload?.svg || '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"></svg>';
    const prettyJson = JSON.stringify(record, null, 2);

    return `
      <article class="record-card" id="${escapeHtml(record.icon_id)}">
        <div class="record-preview">
          <div class="icon-stage">
            <div class="icon-wrap" aria-label="${escapeHtml(record.label)} icon">
              ${svg}
            </div>
          </div>
          <div class="record-quick">
            <div class="mini-pill">${escapeHtml(record.source_library)}</div>
            <h3>${escapeHtml(record.label)}</h3>
            <p class="record-id"><code>${escapeHtml(record.icon_id)}</code></p>
            <p>${escapeHtml(record.purpose)}</p>
            <dl class="mini-meta">
              <div><dt>Confidence</dt><dd>${escapeHtml(confidenceLabel(record.confidence))}</dd></div>
              <div><dt>Category</dt><dd>${escapeHtml(record.category)}</dd></div>
              <div><dt>Domain</dt><dd>${escapeHtml(record.domain || 'n/a')}</dd></div>
            </dl>
          </div>
        </div>
        <div class="record-code">
          <p class="code-label">Exact current semantic metadata</p>
          <pre><code>${escapeHtml(prettyJson)}</code></pre>
        </div>
      </article>
    `;
  }).join('\n');

  return `
    <section class="category-section">
      <div class="section-head">
        <h2>${escapeHtml(category)}</h2>
        <span class="count-chip">${records.length} approved</span>
      </div>
      <div class="record-list">
        ${items}
      </div>
    </section>
  `;
}

const approvedRecords = JSON.parse(await fs.readFile(approvedPath, 'utf8'));
const visualInputs = JSON.parse(await fs.readFile(visualsPath, 'utf8'));
const visualById = new Map(visualInputs.map((record) => [record.icon_id || record.candidate_icon_id, record]));

const grouped = [...groupByCategory(approvedRecords).entries()].sort((a, b) => a[0].localeCompare(b[0]));
const categoryNav = grouped.map(([category, records]) => {
  const id = category.replaceAll('_', '-');
  return `<a href="#${escapeHtml(id)}">${escapeHtml(category)} <span>${records.length}</span></a>`;
}).join('');

const sections = grouped.map(([category, records]) => {
  const sectionHtml = buildSection(category, records, visualById);
  return sectionHtml.replace('<section class="category-section">', `<section class="category-section" id="${escapeHtml(category.replaceAll('_', '-'))}">`);
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Approved Semantic Records Visual Review</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      color-scheme: light;
      --bg: #f5efe4;
      --paper: #fffdf8;
      --ink: #1f2937;
      --muted: #5f6b7a;
      --line: #e6dac6;
      --accent: #9a3412;
      --accent-soft: #fde7d2;
      --shadow: 0 16px 45px rgba(35, 28, 20, 0.08);
    }

    * {
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
    }

    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background:
        radial-gradient(circle at top left, rgba(253, 231, 210, 0.8), transparent 28%),
        linear-gradient(180deg, #faf4ea 0%, var(--bg) 100%);
      color: var(--ink);
      line-height: 1.6;
    }

    main {
      max-width: 1320px;
      margin: 0 auto;
      padding: 30px 20px 70px;
    }

    .hero,
    .category-section {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 28px;
      box-shadow: var(--shadow);
    }

    .hero {
      padding: 28px;
      margin-bottom: 20px;
    }

    .eyebrow {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-size: 13px;
      letter-spacing: 0.03em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    h1, h2, h3 {
      margin: 0 0 10px;
      color: var(--accent);
      line-height: 1.2;
    }

    h1 {
      font-size: clamp(2rem, 4vw, 3rem);
      max-width: 840px;
    }

    h2 {
      font-size: 1.45rem;
    }

    h3 {
      font-size: 1.15rem;
      color: var(--ink);
    }

    p {
      margin: 0 0 14px;
    }

    .muted {
      color: var(--muted);
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-top: 20px;
    }

    .summary-card {
      background: rgba(255,255,255,0.82);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 16px;
    }

    .summary-card strong {
      display: block;
      font-size: 1.9rem;
      color: var(--accent);
      line-height: 1;
      margin-bottom: 8px;
    }

    .jump-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }

    .jump-nav a {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      background: #f8efe2;
      border: 1px solid var(--line);
      color: var(--accent);
      text-decoration: none;
      font-size: 0.94rem;
    }

    .jump-nav span {
      display: inline-block;
      min-width: 24px;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(154, 52, 18, 0.1);
      text-align: center;
    }

    .category-section {
      padding: 22px;
      margin-top: 20px;
    }

    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 18px;
    }

    .count-chip,
    .mini-pill {
      display: inline-block;
      padding: 6px 11px;
      border-radius: 999px;
      border: 1px solid var(--line);
      background: #faf1e4;
      color: var(--accent);
      font-size: 0.88rem;
    }

    .record-list {
      display: grid;
      gap: 16px;
    }

    .record-card {
      border: 1px solid var(--line);
      border-radius: 24px;
      overflow: hidden;
      background: rgba(255,255,255,0.86);
      display: grid;
      grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    }

    .record-preview {
      padding: 18px;
      border-right: 1px solid var(--line);
      background: linear-gradient(180deg, #fff9f0 0%, #fffdf8 100%);
    }

    .icon-stage {
      display: grid;
      place-items: center;
      min-height: 150px;
      margin-bottom: 14px;
      border-radius: 22px;
      border: 1px solid var(--line);
      background:
        radial-gradient(circle at center, rgba(253, 231, 210, 0.55), transparent 60%),
        linear-gradient(180deg, #fffdf8 0%, #f8f1e6 100%);
    }

    .icon-wrap {
      width: 98px;
      height: 98px;
      display: grid;
      place-items: center;
      color: #8a3412;
    }

    .icon-wrap svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    .record-id {
      margin: 0 0 8px;
    }

    .mini-meta {
      margin: 14px 0 0;
      display: grid;
      gap: 10px;
    }

    .mini-meta div {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      border-top: 1px dashed #eadfcd;
      padding-top: 8px;
    }

    .mini-meta dt {
      color: var(--muted);
    }

    .mini-meta dd {
      margin: 0;
      text-align: right;
      font-weight: 700;
      color: var(--ink);
    }

    .record-code {
      padding: 18px;
      overflow: auto;
    }

    .code-label {
      font-size: 0.95rem;
      color: var(--muted);
      margin-bottom: 10px;
    }

    pre {
      margin: 0;
      padding: 16px;
      border-radius: 20px;
      border: 1px solid #eadfcd;
      background: #fffaf2;
      overflow: auto;
      font-size: 12.8px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
    }

    code {
      font-family: "Courier New", monospace;
    }

    @media (max-width: 1100px) {
      .summary {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .record-card {
        grid-template-columns: 1fr;
      }

      .record-preview {
        border-right: 0;
        border-bottom: 1px solid var(--line);
      }
    }

    @media (max-width: 720px) {
      main {
        padding: 20px 14px 50px;
      }

      .hero,
      .category-section {
        padding: 18px;
        border-radius: 22px;
      }

      .summary {
        grid-template-columns: 1fr;
      }

      .section-head {
        display: block;
      }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">Manual Review Page</div>
      <h1>Approved Supericons semantic records, shown beside the real icon and the exact current JSON</h1>
      <p class="muted">This page is for manual checking. Every item below shows the icon on the left and the exact current approved semantic metadata on the right.</p>
      <p>
        This is the current approved set only. It does not include the hold queue or the reviewed drafts that were intentionally left out of approval.
      </p>

      <div class="summary">
        <div class="summary-card">
          <strong>${approvedRecords.length}</strong>
          <span>approved records shown on this page</span>
        </div>
        <div class="summary-card">
          <strong>${grouped.length}</strong>
          <span>categories represented in the current approved set</span>
        </div>
        <div class="summary-card">
          <strong>2</strong>
          <span>records still on hold outside this page</span>
        </div>
        <div class="summary-card">
          <strong>4</strong>
          <span>reviewed drafts still intentionally not approved</span>
        </div>
      </div>

      <div class="jump-nav">
        ${categoryNav}
      </div>
    </section>

    ${sections}
  </main>
</body>
</html>
`;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, html, 'utf8');

console.log(`build-approved-records-visual-review: wrote ${path.relative(repoRoot, outputPath)}`);
