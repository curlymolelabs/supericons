import { readFileSync } from 'node:fs';
import { localizeMotionPresetSummary } from './mcp-output-localization.js';

const baselineUrl = new URL('./generated/motion-lab-baseline.json', import.meta.url);
const baselineDataset = JSON.parse(readFileSync(baselineUrl, 'utf8'));
const baselinePresets = Object.freeze(
  (baselineDataset.presets || []).map((record) => Object.freeze({
    ...record,
    supported_triggers: Object.freeze([...(record.supported_triggers || [])]),
  }))
);

export function listMotionLabPresets(locale = null) {
  return baselinePresets.map((record) => ({
    preset: record.preset,
    label: record.label,
    group: record.group,
    description: record.description,
    supported_triggers: [...record.supported_triggers],
  })).map((record) => localizeMotionPresetSummary(record, locale));
}
