import { readFileSync } from 'node:fs';

import { MOTION_LAB_PRESET_IDS } from './motion-lab-presets.js';

const datasetUrl = new URL('../data/motion-lab-preset-metadata.json', import.meta.url);
const dataset = JSON.parse(readFileSync(datasetUrl, 'utf8'));

function freezeRecord(record) {
  return Object.freeze({
    ...record,
    supported_triggers: Object.freeze([...(record.supported_triggers || [])]),
    duration_range_ms: Object.freeze({ ...(record.duration_range_ms || {}) }),
    intensity_range_percent: Object.freeze({ ...(record.intensity_range_percent || {}) }),
    export_compatibility: Object.freeze({
      ...(record.export_compatibility || {}),
      notes: Object.freeze([...(record.export_compatibility?.notes || [])]),
    }),
    technical_output_notes: Object.freeze([...(record.technical_output_notes || [])]),
    emotional_tone: Object.freeze([...(record.emotional_tone || [])]),
    recommended_contexts: Object.freeze([...(record.recommended_contexts || [])]),
    avoid_for: Object.freeze([...(record.avoid_for || [])]),
  });
}

const recordsByPreset = Object.freeze(Object.fromEntries(
  (dataset.presets || []).map((record) => [record.preset, freezeRecord(record)])
));

export const MOTION_LAB_AGENT_METADATA_VERSION = dataset.version || 1;
export const MOTION_LAB_AGENT_METADATA_GROUPS = Object.freeze([...(dataset.groups || [])]);

export function getMotionLabAgentMetadata(presetId) {
  return recordsByPreset[presetId] || null;
}

export function listMotionLabAgentMetadata() {
  return MOTION_LAB_PRESET_IDS
    .map((presetId) => recordsByPreset[presetId])
    .filter(Boolean);
}

