import { readFileSync } from 'node:fs';

const baselineUrl = new URL('./generated/motion-lab-baseline.json', import.meta.url);
const baselineDataset = JSON.parse(readFileSync(baselineUrl, 'utf8'));
const baselinePresets = Object.freeze(
  (baselineDataset.presets || []).map((record) => Object.freeze({
    ...record,
    supported_triggers: Object.freeze([...(record.supported_triggers || [])]),
  }))
);

export function listMotionLabPresets() {
  return baselinePresets.map((record) => ({
    preset: record.preset,
    label: record.label,
    group: record.group,
    description: record.description,
    supported_triggers: [...record.supported_triggers],
  }));
}
