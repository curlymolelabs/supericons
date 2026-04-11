import { readFileSync } from 'node:fs';

import { MOTION_LAB_PRESET_GROUPS, MOTION_LAB_PRESET_IDS } from '../lib/motion-lab-presets.js';

const datasetUrl = new URL('../data/motion-lab-preset-metadata.json', import.meta.url);
const dataset = JSON.parse(readFileSync(datasetUrl, 'utf8'));

const expectedGroups = MOTION_LAB_PRESET_GROUPS.map((group) => group.label);
const expectedPresetIds = [...MOTION_LAB_PRESET_IDS];
const requiredFields = [
  'preset',
  'label',
  'group',
  'description',
  'supported_triggers',
  'default_duration_ms',
  'duration_range_ms',
  'default_intensity_percent',
  'intensity_range_percent',
  'export_compatibility',
  'technical_output_notes',
  'visual_character',
  'emotional_tone',
  'recommended_contexts',
  'avoid_for',
];
const allowedTriggers = new Set(['loop', 'hover', 'click']);

function fail(message) {
  console.error(`Motion Lab agent metadata verification failed: ${message}`);
  process.exit(1);
}

if (!Array.isArray(dataset.groups)) {
  fail('dataset.groups must be an array.');
}

if (dataset.groups.join('|') !== expectedGroups.join('|')) {
  fail(`group list mismatch. Expected ${expectedGroups.join(', ')}; received ${dataset.groups.join(', ')}.`);
}

if (!Array.isArray(dataset.presets)) {
  fail('dataset.presets must be an array.');
}

const seen = new Set();
for (const record of dataset.presets) {
  if (!record || typeof record !== 'object') {
    fail('every preset record must be an object.');
  }
  if (typeof record.preset !== 'string' || !record.preset) {
    fail('every preset record must have a non-empty preset id.');
  }
  if (seen.has(record.preset)) {
    fail(`duplicate preset id "${record.preset}" found in dataset.`);
  }
  seen.add(record.preset);
  for (const field of requiredFields) {
    if (!(field in record)) {
      fail(`preset "${record.preset}" is missing required field "${field}".`);
    }
  }
  if (!Array.isArray(record.supported_triggers) || record.supported_triggers.length === 0) {
    fail(`preset "${record.preset}" must include supported_triggers.`);
  }
  for (const trigger of record.supported_triggers) {
    if (!allowedTriggers.has(trigger)) {
      fail(`preset "${record.preset}" uses unsupported trigger "${trigger}".`);
    }
  }
  if (!record.export_compatibility || typeof record.export_compatibility !== 'object') {
    fail(`preset "${record.preset}" must include export_compatibility object.`);
  }
  if (typeof record.export_compatibility.css !== 'boolean' || typeof record.export_compatibility.animated_svg !== 'boolean') {
    fail(`preset "${record.preset}" must include boolean css and animated_svg flags in export_compatibility.`);
  }
  if (!Array.isArray(record.export_compatibility.notes)) {
    fail(`preset "${record.preset}" must include export_compatibility.notes array.`);
  }
}

const actualPresetIds = dataset.presets.map((record) => record.preset);
if (actualPresetIds.join('|') !== expectedPresetIds.join('|')) {
  fail('preset ordering or coverage does not match the shared Motion Lab preset source.');
}

console.log(`Motion Lab agent metadata verified: ${actualPresetIds.length} presets across ${dataset.groups.length} groups.`);

