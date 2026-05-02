import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const write = process.argv.includes('--write');

const TARGET_FILES = [
  'data/si-registry/automation/bootstrap/approved-records.json',
  'data/si-registry/automation/iconoir/approved-records.json',
  'data/si-registry/automation/heroicons/approved-records.json',
  'data/si-registry/automation/phosphor/approved-records.json',
  'data/si-registry/pilot/purpose-chip/approved-records.json',
];

const SPECIAL_DEPICTS = new Map([
  ['aspect ratio', 'corner frame with a diagonal sizing cue for width-to-height ratio'],
  ['at', 'at-sign glyph with a circular loop and trailing stroke'],
  ['asterisk', 'star-like asterisk glyph with radiating points'],
  ['battery charging', 'battery outline with a lightning bolt or charging cue inside'],
  ['calendar day', 'calendar page with a single day marker'],
  ['calendar month', 'calendar page arranged for a month view'],
  ['calendar week', 'calendar page arranged for a week view'],
  ['calendar x', 'calendar page with an x mark for removal or cancellation'],
  ['cloud lightning', 'cloud outline paired with a lightning bolt'],
  ['cloud snow', 'cloud outline paired with falling snow marks'],
  ['color picker', 'eyedropper-style color picker tool'],
  ['currency bitcoin', 'bitcoin currency glyph in simple line styling'],
  ['currency dollar', 'dollar currency glyph in simple line styling'],
  ['currency euro', 'euro currency glyph in simple line styling'],
  ['currency pound', 'pound currency glyph in simple line styling'],
  ['currency rupee', 'rupee currency glyph in simple line styling'],
  ['cursor text', 'text cursor caret positioned for editing typed content'],
  ['ease in', 'animation easing curve that starts slowly and accelerates'],
  ['ease in control point', 'easing curve control point for adjusting the start of motion'],
  ['ease out', 'animation easing curve that slows as it finishes'],
  ['ease out control point', 'easing curve control point for adjusting the end of motion'],
  ['external link', 'box or corner frame with an arrow leaving the shape'],
  ['female', 'female gender sign with a circle and lower cross'],
  ['male', 'male gender sign with a circle and angled arrow'],
  ['video camera', 'video camera body with a side lens or recording cone'],
]);

function humanize(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function titleize(value) {
  return humanize(value).replace(/\b\w/g, (char) => char.toUpperCase());
}

function isBlockedDepicts(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.startsWith('a symbol representing')
    || normalized.includes('a symbol representing')
    || normalized.includes('a symbol for')
    || normalized.includes('product mark')
    || (normalized.includes('official') && normalized.includes('brand'));
}

function isBrandDamage(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized.includes('product mark') || (normalized.includes('official') && normalized.includes('brand'));
}

function repairedDepicts(record) {
  const subject = humanize(record.source_name || record.label || record.icon_id);
  const label = record.label || titleize(subject);

  if (isBrandDamage(record.depicts)) {
    return `${label} brand logo glyph used to identify the service, platform, product, or integration.`;
  }

  const special = SPECIAL_DEPICTS.get(subject);
  if (special) return special;

  if (subject.startsWith('currency ')) {
    return `${subject.replace('currency ', '')} currency glyph in simple line styling`;
  }

  if (subject.includes('arrow')) {
    return `directional arrow icon for ${subject.replace(/\barrow\b/g, '').trim() || 'navigation or movement'}`;
  }

  if (subject.includes('chart')) {
    return `chart icon showing ${subject.replace('chart ', '') || 'data'} in simplified data-visualization form`;
  }

  if (subject.includes('cloud')) {
    return `cloud outline icon for ${subject.replace('cloud', '').trim() || 'weather or online storage'} context`;
  }

  if (subject.includes('folder')) {
    return `folder outline icon for ${subject.replace('folder', '').trim() || 'file organization'} context`;
  }

  if (subject.includes('file')) {
    return `document file icon for ${subject.replace('file', '').trim() || 'saved content'} context`;
  }

  return `outline icon of ${subject} with simplified interface-friendly strokes`;
}

const summary = {};

for (const relativePath of TARGET_FILES) {
  const fullPath = path.join(repoRoot, relativePath);
  const records = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  let repaired = 0;

  for (const record of records) {
    if (!isBlockedDepicts(record.depicts)) continue;
    record.depicts = repairedDepicts(record);
    repaired += 1;
  }

  summary[relativePath] = repaired;

  if (write && repaired > 0) {
    await fs.writeFile(fullPath, `${JSON.stringify(records, null, 2)}\n`);
  }
}

console.log(JSON.stringify({
  mode: write ? 'write' : 'dry-run',
  summary,
  total: Object.values(summary).reduce((sum, count) => sum + count, 0),
}, null, 2));
