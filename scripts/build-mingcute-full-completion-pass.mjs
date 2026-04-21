import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeReviewedRecordToApprovedRecord } from '../lib/si-registry/purpose-chip-approved-records.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationDir = path.join(repoRoot, 'data', 'si-registry', 'automation', 'mingcute');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const passBatchId = 'mingcute-full-completion-pass-01';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function uniqueStrings(values) {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim()))];
}

function splitWords(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function titleCase(value) {
  return splitWords(value)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function slugify(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function buildConfidenceBand(score) {
  if (score >= 0.85) {
    return 'high';
  }
  if (score >= 0.7) {
    return 'medium';
  }
  return 'low';
}

function normalizeMingcuteSourceName(indexId) {
  if (typeof indexId !== 'string') {
    return null;
  }
  const normalized = indexId.endsWith('_line') ? indexId.slice(0, -5) : indexId;
  return normalized.toLowerCase();
}

function getDecisionEntries(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => (typeof entry === 'string' ? { icon_id: entry } : entry));
}

function filterDecisionEntries(value, resolvedIds) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => {
    const iconId = typeof entry === 'string' ? entry : entry?.icon_id;
    return !resolvedIds.has(iconId);
  });
}

function isBrandResolutionEntry(entry) {
  const note = `${entry.note || ''}`.toLowerCase();
  return note.includes('brand') || note.includes('platform') || note.includes('product mark') || note.includes('logo workflow');
}

function toReviewedRecord(base, overrides = {}) {
  const reviewedRecord = {
    icon_id: overrides.icon_id ?? base.icon_id,
    source_library: overrides.source_library ?? base.source_library,
    source_name: overrides.source_name ?? base.source_name,
    label: overrides.label ?? base.label,
    depicts: overrides.depicts ?? base.depicts,
    purpose: overrides.purpose ?? base.purpose,
    category: overrides.category ?? base.category,
    intent: overrides.intent ?? base.intent,
    domain: overrides.domain ?? base.domain,
    semantic_tags: uniqueStrings(overrides.semantic_tags ?? base.semantic_tags ?? []),
    synonyms: uniqueStrings(overrides.synonyms ?? base.synonyms ?? []),
    use_when: overrides.use_when ?? base.use_when,
    avoid_when: overrides.avoid_when ?? base.avoid_when,
    evidence_sources: uniqueStrings(overrides.evidence_sources ?? base.evidence_sources ?? []),
    confidence_score: overrides.confidence_score ?? base.confidence_score,
    confidence_band: overrides.confidence_band ?? base.confidence_band,
  };

  normalizeReviewedRecordToApprovedRecord(reviewedRecord);
  return reviewedRecord;
}

function buildBrandReviewedRecord({ iconId, sourceName, label, simpleIconsRecord, iconMeta }) {
  const finalLabel = simpleIconsRecord?.label || label || titleCase(iconMeta?.name || sourceName);
  const baseSynonyms = uniqueStrings([
    ...(simpleIconsRecord?.synonyms || []),
    finalLabel,
    iconMeta?.name,
    sourceName.replace(/_/g, ' '),
  ]);
  const semanticTags = uniqueStrings([
    finalLabel.toLowerCase(),
    ...baseSynonyms.map((value) => value.toLowerCase()),
    'brand',
    'logo',
    'brand platforms',
  ]);

  return toReviewedRecord(
    {
      icon_id: iconId,
      source_library: 'mingcute',
      source_name: sourceName,
      label: finalLabel,
      depicts: `The official ${finalLabel} brand or product mark.`,
      purpose: `Show the official ${finalLabel} brand or product mark.`,
      category: 'brand_identity',
      intent: 'inform',
      domain: 'brand_platforms',
      semantic_tags: semanticTags,
      synonyms: baseSynonyms,
      use_when: `Use when the interface refers specifically to ${finalLabel} as a brand, login provider, connected service, supported platform, payment method, or official destination.`,
      avoid_when: `Do not use as a generic action, status, or non-${finalLabel} product icon when the meaning is not specifically ${finalLabel}.`,
      evidence_sources: simpleIconsRecord ? ['source-name', 'svg-payload', 'approved-reference', 'editorial-review'] : ['source-name', 'svg-payload', 'editorial-review'],
      confidence_score: 0.89,
      confidence_band: 'high',
    },
    {}
  );
}

const manualOverrideDefinitions = {
  'mingcute:align_arrow_down': {
    label: 'Align Bottom',
    depicts: 'An alignment control that moves content toward the bottom edge.',
    purpose: 'Show aligning selected content, layers, or blocks to the bottom edge of a layout.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['align bottom', 'bottom alignment', 'layout alignment', 'formatting', 'edge alignment'],
    synonyms: ['align bottom', 'move to bottom edge', 'bottom align', 'align down'],
    use_when: 'Use when the interface aligns selected content or layers to the bottom edge of a frame, layout, or canvas.',
    avoid_when: 'Do not use for ordinary down navigation, download, or scroll actions when the meaning is specifically bottom alignment.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.89,
  },
  'mingcute:align_arrow_left': {
    label: 'Align Left',
    depicts: 'An alignment control that moves content toward the left edge.',
    purpose: 'Show aligning selected content, layers, or blocks to the left edge of a layout.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['align left', 'left alignment', 'layout alignment', 'formatting', 'edge alignment'],
    synonyms: ['align left', 'move to left edge', 'left align', 'align to start'],
    use_when: 'Use when the interface aligns selected content or layers to the left edge of a frame, layout, or canvas.',
    avoid_when: 'Do not use for back navigation or left movement when the meaning is specifically left alignment.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.89,
  },
  'mingcute:align_arrow_right': {
    label: 'Align Right',
    depicts: 'An alignment control that moves content toward the right edge.',
    purpose: 'Show aligning selected content, layers, or blocks to the right edge of a layout.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['align right', 'right alignment', 'layout alignment', 'formatting', 'edge alignment'],
    synonyms: ['align right', 'move to right edge', 'right align', 'align to end'],
    use_when: 'Use when the interface aligns selected content or layers to the right edge of a frame, layout, or canvas.',
    avoid_when: 'Do not use for forward navigation or right movement when the meaning is specifically right alignment.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.89,
  },
  'mingcute:align_arrow_up': {
    label: 'Align Top',
    depicts: 'An alignment control that moves content toward the top edge.',
    purpose: 'Show aligning selected content, layers, or blocks to the top edge of a layout.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['align top', 'top alignment', 'layout alignment', 'formatting', 'edge alignment'],
    synonyms: ['align top', 'move to top edge', 'top align', 'align up'],
    use_when: 'Use when the interface aligns selected content or layers to the top edge of a frame, layout, or canvas.',
    avoid_when: 'Do not use for ordinary up navigation, upload, or scroll actions when the meaning is specifically top alignment.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.89,
  },
  'mingcute:border_left': {
    label: 'Left Border',
    depicts: 'A border-formatting control that emphasizes the left edge.',
    purpose: 'Show applying, toggling, or highlighting the left border of a layout, table, or text frame.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['left border', 'border formatting', 'edge border', 'table border', 'layout border'],
    synonyms: ['left border', 'border left', 'format left border', 'left edge border'],
    use_when: 'Use when the interface applies or previews a left border in a formatting, layout, or table tool.',
    avoid_when: 'Do not use for back navigation or left movement when the meaning is specifically border formatting.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.88,
  },
  'mingcute:border_right': {
    label: 'Right Border',
    depicts: 'A border-formatting control that emphasizes the right edge.',
    purpose: 'Show applying, toggling, or highlighting the right border of a layout, table, or text frame.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['right border', 'border formatting', 'edge border', 'table border', 'layout border'],
    synonyms: ['right border', 'border right', 'format right border', 'right edge border'],
    use_when: 'Use when the interface applies or previews a right border in a formatting, layout, or table tool.',
    avoid_when: 'Do not use for forward navigation or right movement when the meaning is specifically border formatting.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.88,
  },
  'mingcute:direction_arrow': {
    label: 'Direction Pad',
    depicts: 'A circular directional control with arrow cues on four sides.',
    purpose: 'Show a directional pad, four-way navigation control, or move-in-any-direction surface.',
    category: 'navigation_interface',
    intent: 'control',
    domain: 'navigation',
    semantic_tags: ['direction pad', 'd-pad', 'four-way control', 'directional control', 'navigation pad'],
    synonyms: ['d-pad', 'direction pad', 'four direction control', 'navigation pad'],
    use_when: 'Use when the interface offers four-way directional movement, focus travel, or controller-like navigation.',
    avoid_when: 'Do not use for a single-direction arrow or route indicator when the meaning is specifically a four-way directional control.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.87,
  },
  'mingcute:direction_dot': {
    label: 'Direction Pad Dots',
    depicts: 'A circular directional control with four dot markers around the center.',
    purpose: 'Show a four-way directional selector, focus pad, or controller-style navigation surface.',
    category: 'navigation_interface',
    intent: 'control',
    domain: 'navigation',
    semantic_tags: ['direction pad', 'direction dots', 'four-way selector', 'navigation pad', 'focus control'],
    synonyms: ['direction pad dots', 'd-pad dots', 'four-way selector', 'navigation selector'],
    use_when: 'Use when the interface offers four-way navigation, focus movement, or a controller-like directional selector.',
    avoid_when: 'Do not use for plain status dots or location markers when the meaning is specifically a four-way directional control.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.84,
  },
  'mingcute:high_voltage_power': {
    label: 'High Voltage Warning',
    depicts: 'A power symbol paired with a high-voltage electrical cue.',
    purpose: 'Show electrical hazard, high-voltage equipment, or a power state that requires caution.',
    category: 'security',
    intent: 'warn',
    domain: 'security',
    semantic_tags: ['high voltage', 'electrical hazard', 'power warning', 'energy danger', 'voltage warning'],
    synonyms: ['high voltage warning', 'electrical warning', 'power hazard', 'dangerous voltage'],
    use_when: 'Use when the interface warns about high-voltage equipment, electrical danger, or a hazardous power state.',
    avoid_when: 'Do not use for a normal power toggle or simple on-off state when the meaning is not a safety warning.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.87,
  },
  'mingcute:lie_down': {
    label: 'Lie Down',
    depicts: 'A person in a lying or reclining posture.',
    purpose: 'Show lying down, reclining, resting posture, or a body-position theme.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['lie down', 'recline', 'rest posture', 'body position', 'rest'],
    synonyms: ['recline', 'lying down', 'resting posture', 'body pose'],
    use_when: 'Use when the interface refers directly to lying down, resting posture, or a body-position activity.',
    avoid_when: 'Do not use for down navigation, lowering rank, or moving content when the icon is clearly a human posture.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.85,
  },
  'mingcute:look_down': {
    label: 'Look Down',
    depicts: 'A face or gaze cue directed downward.',
    purpose: 'Show looking downward, downward gaze, or a face-direction cue.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['look down', 'downward gaze', 'face direction', 'gaze cue', 'look'],
    synonyms: ['gaze down', 'looking down', 'downward look', 'face down'],
    use_when: 'Use when the interface refers directly to downward gaze, face direction, or a themed visual cue about looking down.',
    avoid_when: 'Do not use for scroll down, download, or lower-order navigation when the icon is clearly a face-direction symbol.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.84,
  },
  'mingcute:look_left': {
    label: 'Look Left',
    depicts: 'A face or gaze cue directed to the left.',
    purpose: 'Show looking left, leftward gaze, or a face-direction cue.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['look left', 'leftward gaze', 'face direction', 'gaze cue', 'look'],
    synonyms: ['gaze left', 'looking left', 'leftward look', 'face left'],
    use_when: 'Use when the interface refers directly to leftward gaze, face direction, or a themed visual cue about looking left.',
    avoid_when: 'Do not use for back navigation or previous-step controls when the icon is clearly a face-direction symbol.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.84,
  },
  'mingcute:look_right': {
    label: 'Look Right',
    depicts: 'A face or gaze cue directed to the right.',
    purpose: 'Show looking right, rightward gaze, or a face-direction cue.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['look right', 'rightward gaze', 'face direction', 'gaze cue', 'look'],
    synonyms: ['gaze right', 'looking right', 'rightward look', 'face right'],
    use_when: 'Use when the interface refers directly to rightward gaze, face direction, or a themed visual cue about looking right.',
    avoid_when: 'Do not use for next-step navigation or forward movement when the icon is clearly a face-direction symbol.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.84,
  },
  'mingcute:look_up': {
    label: 'Look Up',
    depicts: 'A face or gaze cue directed upward.',
    purpose: 'Show looking up, upward gaze, or a face-direction cue.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['look up', 'upward gaze', 'face direction', 'gaze cue', 'look'],
    synonyms: ['gaze up', 'looking up', 'upward look', 'face up'],
    use_when: 'Use when the interface refers directly to upward gaze, face direction, or a themed visual cue about looking up.',
    avoid_when: 'Do not use for upload, move up, or higher-rank navigation when the icon is clearly a face-direction symbol.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.84,
  },
  'mingcute:play_football': {
    label: 'Play Football',
    depicts: 'A person playing football or soccer.',
    purpose: 'Show football or soccer play, sports activity, or a themed athletics surface.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['football', 'soccer', 'sports', 'athletics', 'play football'],
    synonyms: ['play football', 'soccer activity', 'football action', 'sports play'],
    use_when: 'Use when the interface refers directly to football, soccer play, sports training, or an athletics-themed surface.',
    avoid_when: 'Do not use for media playback when the meaning is a sport activity rather than a play button.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.86,
  },
  'mingcute:search_2_none': {
    label: 'No Search Results',
    depicts: 'A magnifying glass with a clear no-result mark inside the search lens.',
    purpose: 'Show an empty search result, unsuccessful find action, or a no-match search state.',
    category: 'search_discovery',
    intent: 'inform',
    domain: 'ui_shell',
    semantic_tags: ['no search results', 'empty search', 'search no match', 'search none', 'not found'],
    synonyms: ['no results', 'search no match', 'empty search', 'nothing found'],
    use_when: 'Use when the interface shows that a search returned no matches or an expected result was not found.',
    avoid_when: 'Do not use for generic search entry, disabled search, or ordinary search launch actions when the meaning is specifically no results.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.9,
  },
  'mingcute:search_none': {
    label: 'No Search Results',
    depicts: 'A magnifying glass with a clear no-result mark inside the search lens.',
    purpose: 'Show an empty search result, unsuccessful find action, or a no-match search state.',
    category: 'search_discovery',
    intent: 'inform',
    domain: 'ui_shell',
    semantic_tags: ['no search results', 'empty search', 'search no match', 'search none', 'not found'],
    synonyms: ['no results', 'search no match', 'empty search', 'nothing found'],
    use_when: 'Use when the interface shows that a search returned no matches or an expected result was not found.',
    avoid_when: 'Do not use for generic search entry, disabled search, or ordinary search launch actions when the meaning is specifically no results.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.9,
  },
  'mingcute:transfer': {
    label: 'Transfer Horizontal',
    depicts: 'Two horizontal transfer arrows showing exchange between left and right.',
    purpose: 'Show transferring, swapping, or moving items between left and right lanes or lists.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['transfer', 'swap', 'exchange', 'horizontal transfer', 'move between lists'],
    synonyms: ['horizontal transfer', 'swap horizontally', 'exchange items', 'move between columns'],
    use_when: 'Use when the interface transfers, swaps, or moves items between left and right lists, panels, or destinations.',
    avoid_when: 'Do not use for a one-way navigation arrow when the meaning is specifically exchange or transfer.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.88,
  },
  'mingcute:transfer_2': {
    label: 'Transfer Vertical',
    depicts: 'Two vertical transfer arrows showing exchange between top and bottom.',
    purpose: 'Show transferring, swapping, or moving items between upper and lower positions.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['transfer', 'swap', 'exchange', 'vertical transfer', 'move between rows'],
    synonyms: ['vertical transfer', 'swap vertically', 'exchange positions', 'move between rows'],
    use_when: 'Use when the interface transfers, swaps, or moves items between upper and lower rows, panels, or destinations.',
    avoid_when: 'Do not use for a one-way up or down arrow when the meaning is specifically exchange or transfer.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.88,
  },
  'mingcute:transfer_3': {
    label: 'Transfer Left Right',
    depicts: 'Opposing horizontal transfer arrows for two-way left and right exchange.',
    purpose: 'Show two-way transfer or swap between left and right destinations.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['transfer left right', 'swap', 'exchange', 'two-way transfer', 'horizontal exchange'],
    synonyms: ['left right transfer', 'horizontal exchange', 'two-way swap', 'move both directions'],
    use_when: 'Use when the interface exchanges or transfers items in both directions between left and right destinations.',
    avoid_when: 'Do not use for single-direction navigation when the meaning is specifically two-way exchange.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.88,
  },
  'mingcute:transfer_4': {
    label: 'Transfer Up Down',
    depicts: 'Opposing vertical transfer arrows for two-way top and bottom exchange.',
    purpose: 'Show two-way transfer or swap between upper and lower destinations.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['transfer up down', 'swap', 'exchange', 'two-way transfer', 'vertical exchange'],
    synonyms: ['up down transfer', 'vertical exchange', 'two-way swap', 'move both directions'],
    use_when: 'Use when the interface exchanges or transfers items in both directions between upper and lower destinations.',
    avoid_when: 'Do not use for single-direction navigation when the meaning is specifically two-way exchange.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.88,
  },
  'mingcute:transfer_horizontal': {
    label: 'Horizontal Transfer',
    depicts: 'A dense horizontal transfer control with opposing arrows for left-right exchange.',
    purpose: 'Show horizontal transfer, exchange, or move-between-lists behavior in a compact control.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['horizontal transfer', 'swap', 'exchange', 'left right transfer', 'compact transfer'],
    synonyms: ['horizontal transfer', 'left right exchange', 'swap horizontally', 'move between lists'],
    use_when: 'Use when the interface provides a compact control for swapping or transferring items horizontally.',
    avoid_when: 'Do not use for a plain horizontal arrow when the meaning is specifically exchange or transfer.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.89,
  },
  'mingcute:transfer_vertical': {
    label: 'Vertical Transfer',
    depicts: 'A dense vertical transfer control with opposing arrows for top-bottom exchange.',
    purpose: 'Show vertical transfer, exchange, or move-between-rows behavior in a compact control.',
    category: 'data_controls',
    intent: 'control',
    domain: 'ui_controls',
    semantic_tags: ['vertical transfer', 'swap', 'exchange', 'up down transfer', 'compact transfer'],
    synonyms: ['vertical transfer', 'up down exchange', 'swap vertically', 'move between rows'],
    use_when: 'Use when the interface provides a compact control for swapping or transferring items vertically.',
    avoid_when: 'Do not use for a plain vertical arrow when the meaning is specifically exchange or transfer.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.89,
  },
  'mingcute:warm_up': {
    label: 'Warm-Up Exercise',
    depicts: 'A person doing a warm-up or stretch before exercise.',
    purpose: 'Show warm-up movement, pre-workout stretching, or exercise preparation.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['warm-up', 'exercise', 'stretch', 'fitness', 'pre-workout'],
    synonyms: ['warm-up exercise', 'stretching', 'pre-workout', 'fitness prep'],
    use_when: 'Use when the interface refers directly to warm-up activity, stretching, exercise prep, or a workout-themed surface.',
    avoid_when: 'Do not use for move up navigation or progress increase when the icon is clearly a person exercising.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.86,
  },
  'mingcute:warm_up_2': {
    label: 'Warm-Up Exercise 2',
    depicts: 'A person doing a second warm-up or stretch pose.',
    purpose: 'Show a warm-up routine, stretch sequence, or exercise-preparation variation.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['warm-up', 'exercise', 'stretch', 'fitness', 'warm-up routine'],
    synonyms: ['warm-up exercise', 'stretching', 'exercise prep', 'warm-up routine'],
    use_when: 'Use when the interface refers directly to warm-up activity, stretch routines, or a workout-preparation surface.',
    avoid_when: 'Do not use for move up navigation or positive trend cues when the icon is clearly a person exercising.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.86,
  },
  'mingcute:warm_up_3': {
    label: 'Warm-Up Exercise 3',
    depicts: 'A person doing a third warm-up or stretch pose.',
    purpose: 'Show a warm-up routine, stretch sequence, or exercise-preparation variation.',
    category: 'status_feedback',
    intent: 'inform',
    domain: 'product_status',
    semantic_tags: ['warm-up', 'exercise', 'stretch', 'fitness', 'warm-up routine'],
    synonyms: ['warm-up exercise', 'stretching', 'exercise prep', 'warm-up routine'],
    use_when: 'Use when the interface refers directly to warm-up activity, stretch routines, or a workout-preparation surface.',
    avoid_when: 'Do not use for move up navigation or positive trend cues when the icon is clearly a person exercising.',
    evidence_sources: ['source-name', 'svg-payload', 'editorial-review'],
    confidence_score: 0.86,
  },
};

const decisions = await readJson(path.join(automationDir, 'promotion-decisions.json'));
const iconIndex = await readJson(path.join(repoRoot, 'public', 'icon-index.json'));
const simpleIconsApproved = await readJson(path.join(repoRoot, 'data', 'si-registry', 'automation', 'simpleicons', 'approved-records.json'));

const reviewedFiles = (await fs.readdir(automationDir))
  .filter((fileName) => fileName.endsWith('-reviewed-records.json'))
  .sort();

const reviewedById = new Map();
for (const fileName of reviewedFiles) {
  const batch = await readJson(path.join(automationDir, fileName));
  for (const reviewedRecord of batch.reviewed_records || []) {
    reviewedById.set(reviewedRecord.icon_id, reviewedRecord);
  }
}

const allMingcuteIconIds = new Set(
  (iconIndex.icons || [])
    .filter((icon) => icon.lib === 'mingcute')
    .map((icon) => `mingcute:${normalizeMingcuteSourceName(icon.id)}`)
);

const iconMetaById = new Map(
  (iconIndex.icons || [])
    .filter((icon) => icon.lib === 'mingcute')
    .map((icon) => [`mingcute:${normalizeMingcuteSourceName(icon.id)}`, icon])
);

const simpleIconsBySlug = new Map();
for (const record of simpleIconsApproved) {
  const keys = uniqueStrings([record.source_name, record.label, ...(record.synonyms || [])]).map(slugify);
  for (const key of keys) {
    if (!simpleIconsBySlug.has(key)) {
      simpleIconsBySlug.set(key, record);
    }
  }
}

const approveIds = new Set();
const holdEntries = [];
const draftEntries = [];

for (const batchDecision of Object.values(decisions.batches || {})) {
  for (const entry of getDecisionEntries(batchDecision.approve_for_import)) {
    approveIds.add(entry.icon_id);
  }
  holdEntries.push(...getDecisionEntries(batchDecision.hold_for_editor_review));
  draftEntries.push(...getDecisionEntries(batchDecision.keep_as_reviewed_draft));
}

const decisionPathIds = new Set([
  ...approveIds,
  ...holdEntries.map((entry) => entry.icon_id),
  ...draftEntries.map((entry) => entry.icon_id),
]);

const missingIconIds = [...allMingcuteIconIds].filter((iconId) => !decisionPathIds.has(iconId)).sort();
const unresolvedEntries = [
  ...holdEntries.map((entry) => ({ ...entry, source: 'hold' })),
  ...draftEntries.map((entry) => ({ ...entry, source: 'draft' })),
  ...missingIconIds.map((iconId) => ({ icon_id: iconId, source: 'missing', note: 'Missing from earlier MingCute decision path.' })),
];

const resolvedReviewedRecords = [];
const resolvedIds = new Set();

for (const entry of unresolvedEntries) {
  const iconId = entry.icon_id;
  const reviewedRecord = reviewedById.get(iconId);
  const iconMeta = iconMetaById.get(iconId);
  const sourceName = reviewedRecord?.source_name || iconId.split(':')[1];
  const simpleIconsRecord = simpleIconsBySlug.get(slugify(sourceName));

  let resolvedRecord;

  if (isBrandResolutionEntry(entry)) {
    resolvedRecord = buildBrandReviewedRecord({
      iconId,
      sourceName,
      label: reviewedRecord?.label,
      simpleIconsRecord,
      iconMeta,
    });
  } else if (manualOverrideDefinitions[iconId]) {
    const override = manualOverrideDefinitions[iconId];
    resolvedRecord = toReviewedRecord(
      reviewedRecord || {
        icon_id: iconId,
        source_library: 'mingcute',
        source_name: sourceName,
        label: titleCase(iconMeta?.name || sourceName),
        depicts: '',
        purpose: '',
        category: override.category,
        intent: override.intent,
        domain: override.domain,
        semantic_tags: [],
        synonyms: [],
        use_when: '',
        avoid_when: '',
        evidence_sources: [],
        confidence_score: override.confidence_score,
        confidence_band: buildConfidenceBand(override.confidence_score),
      },
      {
        ...override,
        source_library: 'mingcute',
        source_name: sourceName,
        confidence_band: buildConfidenceBand(override.confidence_score),
      }
    );
  } else if (reviewedRecord) {
    resolvedRecord = toReviewedRecord(reviewedRecord, {
      evidence_sources: uniqueStrings([...(reviewedRecord.evidence_sources || []), 'editorial-review']),
      confidence_score: Math.max(reviewedRecord.confidence_score || 0.7, 0.8),
      confidence_band: buildConfidenceBand(Math.max(reviewedRecord.confidence_score || 0.7, 0.8)),
    });
  } else {
    throw new Error(`No completion strategy for unresolved MingCute icon: ${iconId}`);
  }

  assert(!resolvedIds.has(iconId), `Duplicate resolved MingCute icon: ${iconId}`);
  resolvedIds.add(iconId);
  resolvedReviewedRecords.push(resolvedRecord);
}

assert(resolvedReviewedRecords.length === unresolvedEntries.length, 'Every unresolved MingCute icon must be resolved in the full-completion pass');

const updatedBatches = {};
for (const [batchId, batchDecision] of Object.entries(decisions.batches || {})) {
  updatedBatches[batchId] = {
    approve_for_import: Array.isArray(batchDecision.approve_for_import) ? [...batchDecision.approve_for_import] : [],
    hold_for_editor_review: filterDecisionEntries(batchDecision.hold_for_editor_review, resolvedIds),
    keep_as_reviewed_draft: filterDecisionEntries(batchDecision.keep_as_reviewed_draft, resolvedIds),
  };
}

updatedBatches[passBatchId] = {
  approve_for_import: resolvedReviewedRecords.map((record) => record.icon_id).sort(),
  hold_for_editor_review: [],
  keep_as_reviewed_draft: [],
};

const updatedDecisions = {
  ...decisions,
  batches: updatedBatches,
};

const passPayload = {
  schema_version: '1.0.0',
  batch_id: passBatchId,
  reviewed_records: resolvedReviewedRecords.sort((left, right) => left.icon_id.localeCompare(right.icon_id)),
};

const summaryPayload = {
  schema_version: '1.0.0',
  batch_id: passBatchId,
  total_resolved_icons: resolvedReviewedRecords.length,
  resolved_brand_icons: resolvedReviewedRecords.filter((record) => record.category === 'brand_identity').length,
  resolved_manual_overrides: resolvedReviewedRecords.filter((record) => manualOverrideDefinitions[record.icon_id]).length,
  resolved_carry_forward_records: resolvedReviewedRecords.filter((record) => !manualOverrideDefinitions[record.icon_id] && record.category !== 'brand_identity').length,
  missing_coverage_fixed: missingIconIds.length,
  output_path: `data/si-registry/automation/mingcute/${passBatchId}-reviewed-records.json`,
};

await writeJson(path.join(automationDir, 'promotion-decisions.json'), updatedDecisions);
await writeJson(path.join(automationDir, `${passBatchId}-reviewed-records.json`), passPayload);
await writeJson(path.join(generatedDir, `${passBatchId}-summary.json`), summaryPayload);

console.log(
  `build-mingcute-full-completion-pass: resolved=${resolvedReviewedRecords.length} | brand=${summaryPayload.resolved_brand_icons} | manual=${summaryPayload.resolved_manual_overrides} | missing=${missingIconIds.length}`
);
