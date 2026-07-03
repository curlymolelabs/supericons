#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildIconContactSheetPng,
  buildIconContactSheetSvg,
} from '../mcp/preview-icons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const iconIndexPath = join(repoRoot, 'mcp', 'public', 'icon-index.json');

function fail(message) {
  console.error(`verify-mcp-preview-icons-image: ${message}`);
  process.exit(1);
}

if (!existsSync(iconIndexPath)) {
  fail(`missing icon index: ${iconIndexPath}`);
}

const iconIndex = JSON.parse(readFileSync(iconIndexPath, 'utf8'));
const iconRows = Array.isArray(iconIndex.icons) ? iconIndex.icons : [];

function findIcon(library, id) {
  const icon = iconRows.find((row) => row.lib === library && row.id === id && row.svg);
  if (!icon) fail(`missing preview fixture icon ${library}:${id}`);
  return {
    id: icon.id,
    name: icon.name || icon.id,
    library: icon.lib,
    library_label: icon.lib,
    icon_ref: `${icon.lib}:${icon.id}`,
    style: icon.style,
    svg: icon.svg,
    semantic: { purpose: icon.name || icon.id },
  };
}

const icons = [
  findIcon('lucide', 'bug-play'),
  findIcon('phosphor', 'x-circle'),
  findIcon('heroicons', 'x-circle'),
];

const sheetSvg = buildIconContactSheetSvg(icons, {
  title: 'Supericons preview: ai slop',
});

if (/<svg\s+x=/i.test(sheetSvg)) {
  fail('contact sheet still nests icon SVG elements; use transformed groups so resvg renders glyphs reliably.');
}

if (!/transform="translate\(/.test(sheetSvg)) {
  fail('contact sheet does not include transformed icon groups.');
}

if (!/stroke="currentColor"/.test(sheetSvg) || !/fill="currentColor"/.test(sheetSvg)) {
  fail('contact sheet does not preserve currentColor fill and stroke inheritance.');
}

const png = buildIconContactSheetPng(icons, {
  title: 'Supericons preview: ai slop',
});

const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
for (let index = 0; index < pngSignature.length; index += 1) {
  if (png[index] !== pngSignature[index]) {
    fail('contact sheet did not render as a PNG.');
  }
}

if (png.length < 20_000) {
  fail(`contact sheet PNG is unexpectedly small (${png.length} bytes), which suggests blank placeholders.`);
}

console.log(`MCP preview icon image verified: ${icons.length} icons, ${png.length} PNG bytes.`);
