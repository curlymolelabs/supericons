import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const batchId = process.argv[2];

if (!batchId) {
  throw new Error('Usage: node scripts/build-purpose-chip-contact-sheet.mjs <batch-id>');
}

const batchPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', `${batchId}.json`);
const outputDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const svgOutputPath = path.join(outputDir, `${batchId}-contact-sheet.svg`);
const pngOutputPath = path.join(outputDir, `${batchId}-contact-sheet.png`);

const CARD_WIDTH = 280;
const CARD_HEIGHT = 220;
const ICON_BOX_SIZE = 96;
const GRID_COLUMNS = 3;
const SHEET_PADDING = 32;
const GRID_GAP = 24;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getInnerSvg(svg) {
  return String(svg ?? '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '')
    .trim();
}

function getViewBox(svg) {
  const match = String(svg ?? '').match(/viewBox="([^"]+)"/i);
  return match ? match[1] : '0 0 24 24';
}

function renderCard(record, index) {
  const col = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  const x = SHEET_PADDING + col * (CARD_WIDTH + GRID_GAP);
  const y = SHEET_PADDING + row * (CARD_HEIGHT + GRID_GAP);
  const iconX = 24;
  const iconY = 24;
  const icon = record.visual_review_input;
  const payload = icon.renderable_icon_payload?.svg || icon.source_svg || '';
  const iconViewBox = getViewBox(payload);
  const iconMarkup = getInnerSvg(payload);
  const iconStatus = icon.visual_payload_status;
  const lane = record.purpose_chip_category_label;
  const queue = record.queue_outcome;
  const label = record.current_candidate_record?.label || record.icon_id;
  const iconId = record.icon_id;

  return `
    <g transform="translate(${x}, ${y})">
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="20" fill="#ffffff" stroke="#d6dce6" stroke-width="1.5"/>
      <rect x="24" y="24" width="${ICON_BOX_SIZE}" height="${ICON_BOX_SIZE}" rx="18" fill="#f5f7fb" stroke="#e6eaf2"/>
      <svg x="${iconX}" y="${iconY}" width="${ICON_BOX_SIZE}" height="${ICON_BOX_SIZE}" viewBox="${iconViewBox}" style="color:#162033">
        ${iconMarkup}
      </svg>
      <text x="140" y="48" font-size="14" font-weight="700" fill="#162033">${escapeHtml(label)}</text>
      <text x="140" y="70" font-size="12" fill="#4d5a70">${escapeHtml(iconId)}</text>
      <text x="24" y="146" font-size="12" font-weight="700" fill="#2456d3">${escapeHtml(lane)}</text>
      <text x="24" y="168" font-size="12" fill="#4d5a70">Queue: ${escapeHtml(queue)}</text>
      <text x="24" y="188" font-size="12" fill="#4d5a70">Visual: ${escapeHtml(iconStatus)}</text>
    </g>
  `;
}

const batch = JSON.parse(await fs.readFile(batchPath, 'utf8'));
const rows = Math.ceil(batch.records.length / GRID_COLUMNS);
const width = SHEET_PADDING * 2 + GRID_COLUMNS * CARD_WIDTH + (GRID_COLUMNS - 1) * GRID_GAP;
const height = SHEET_PADDING * 2 + rows * CARD_HEIGHT + (rows - 1) * GRID_GAP + 56;

const cards = batch.records.map(renderCard).join('\n');

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#eef2f8"/>
  <text x="${SHEET_PADDING}" y="30" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#162033">
    ${escapeHtml(batch.batch_id)} Contact Sheet
  </text>
  <text x="${SHEET_PADDING}" y="54" font-family="Arial, sans-serif" font-size="13" fill="#4d5a70">
    ${escapeHtml(batch.purpose)}
  </text>
  <g font-family="Arial, sans-serif">
    ${cards}
  </g>
</svg>
`.trim();

const rendered = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: width,
  },
});

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(svgOutputPath, `${svg}\n`, 'utf8');
await fs.writeFile(pngOutputPath, rendered.render().asPng());

console.log(`build-purpose-chip-contact-sheet: wrote ${path.relative(repoRoot, svgOutputPath)}`);
console.log(`build-purpose-chip-contact-sheet: wrote ${path.relative(repoRoot, pngOutputPath)}`);
