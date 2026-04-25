import fs from 'node:fs/promises';
import path from 'node:path';

const REQUIRED_SELECTION_FIELDS = Object.freeze([
  'batch_id',
  'track_id',
  'track_label',
  'title',
  'review_goal',
  'record_source_path',
  'review_policy_snapshot',
  'visual_source',
  'items',
]);

const REQUIRED_ITEM_FIELDS = Object.freeze([
  'icon_id',
  'official_source_url',
  'depicts_observation',
  'popular_reading',
  'plausible_readings',
  'context_bias',
  'ambiguity_note',
  'selection_reason',
]);

const DISALLOWED_DEPICTS_PATTERNS = Object.freeze([
  /\bautomation\b/i,
  /\bworkflow\b/i,
  /\bpipeline\b/i,
  /\bprocess\b/i,
  /\bfeature\b/i,
  /\bplatform\b/i,
  /\bsystem capability\b/i,
  /\bsemantic\b/i,
  /\bmetadata\b/i,
  /\bsynonym\b/i,
  /\bretrieval\b/i,
  /\bsearch\b/i,
  /\breasoning\b/i,
  /\bintelligence\b/i,
  /\binfrastructure\b/i,
  /\bproductivity\b/i,
]);

const SPATIAL_CUES = Object.freeze([
  'top',
  'bottom',
  'left',
  'right',
  'upper',
  'lower',
  'above',
  'across',
  'below',
  'inside',
  'centered',
  'offset',
  'grid',
  'stacked',
  'cluster',
  'row',
  'column',
  'linked',
  'connected',
  'with',
]);

const VISUAL_NOUN_CUES = Object.freeze([
  'arc',
  'arrow',
  'badge',
  'bars',
  'bar',
  'base',
  'block',
  'board',
  'body',
  'brain',
  'branch',
  'bubble',
  'canopy',
  'circle',
  'chevron',
  'column',
  'cluster',
  'container',
  'chip',
  'clock',
  'cog',
  'document',
  'digit',
  'dot',
  'dots',
  'door',
  'edge',
  'envelope',
  'eye',
  'face',
  'fan',
  'flap',
  'form',
  'frame',
  'gear',
  'glyph',
  'glass',
  'grid',
  'handle',
  'head',
  'house',
  'hub',
  'hull',
  'indicator',
  'key',
  'knob',
  'letters',
  'line',
  'loop',
  'mark',
  'node',
  'outline',
  'panel',
  'person',
  'pin',
  'profile',
  'ring',
  'robot',
  'screen',
  'sign',
  'square',
  'star',
  'shaft',
  'shape',
  'sheet',
  'silhouette',
  'stem',
  'tab',
  'tile',
  'trace',
  'thumb',
  'track',
  'triangle',
  'vehicle',
  'wheel',
  'window',
]);

const PREFERRED_OBJECT_ANCHORS = Object.freeze([
  {
    match: /\bsearch\b/i,
    requiredAny: ['magnifying glass'],
  },
  {
    match: /\bsettings\b/i,
    requiredAny: ['gear', 'cog'],
  },
  {
    match: /\bmore horiz\b|\bmore vert\b/i,
    requiredAny: ['dots', 'ellipsis'],
  },
  {
    match: /\bmenu\b/i,
    requiredAny: ['bars', 'menu bars', 'horizontal bars'],
  },
  {
    match: /\brobot\b|\bsmart toy\b/i,
    requiredAny: ['robot', 'robot face'],
  },
  {
    match: /\bsplitscreen\b|\bsplit view\b/i,
    requiredAny: ['screen', 'panels', 'windows'],
  },
  {
    match: /\bpicture in picture\b/i,
    requiredAny: ['screen', 'panel', 'window'],
  },
]);

const DEPICTS_MIN_WORDS = 8;
const DEPICTS_MAX_WORDS = 22;
const PLAUSIBLE_READING_MIN_COUNT = 2;
const PLAUSIBLE_READING_MAX_COUNT = 4;
const PLAUSIBLE_READING_MAX_WORDS = 5;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function asTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value) {
  return asTrimmedString(value)
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(value) {
  return asTrimmedString(value).split(/\s+/).filter(Boolean).length;
}

function hasCue(text, cueList) {
  return cueList.some((cue) => text.includes(cue));
}

function isHttpsUrl(value) {
  return /^https:\/\//i.test(asTrimmedString(value));
}

function validateReviewPolicySnapshot(snapshot, trackId) {
  assert(snapshot && typeof snapshot === 'object', `Missing review_policy_snapshot for ${trackId}`);
  assert(Number.isInteger(snapshot.batch_size), `review_policy_snapshot.batch_size must be an integer for ${trackId}`);
  assert(snapshot.batch_size > 0, `review_policy_snapshot.batch_size must be > 0 for ${trackId}`);
  assert(snapshot.approval_scope === 'full_batch', `Unsupported approval_scope for ${trackId}`);
  return snapshot;
}

function requireNonEmptyString(value, fieldLabel, iconId) {
  const normalized = asTrimmedString(value);
  assert(normalized.length > 0, `Missing required ${fieldLabel} for ${iconId}`);
  return normalized;
}

function validatePlausibleReadings(value, iconId) {
  assert(Array.isArray(value), `plausible_readings must be an array for ${iconId}`);
  assert(
    value.length >= PLAUSIBLE_READING_MIN_COUNT && value.length <= PLAUSIBLE_READING_MAX_COUNT,
    `plausible_readings must contain ${PLAUSIBLE_READING_MIN_COUNT}-${PLAUSIBLE_READING_MAX_COUNT} entries for ${iconId}`
  );

  const normalizedSet = new Set();
  for (const entry of value) {
    const normalized = requireNonEmptyString(entry, 'plausible_readings entry', iconId);
    assert(
      !/[,;:!?]/.test(normalized),
      `plausible_readings entry must stay short and phrase-like for ${iconId}: "${normalized}"`
    );
    assert(
      wordCount(normalized) <= PLAUSIBLE_READING_MAX_WORDS,
      `plausible_readings entry is too long for ${iconId}: "${normalized}"`
    );
    const dedupeKey = normalizeText(normalized);
    assert(!normalizedSet.has(dedupeKey), `Duplicate plausible_readings entry for ${iconId}: "${normalized}"`);
    normalizedSet.add(dedupeKey);
  }
}

export function resolveVisualSvg(visualSource, visualItems, iconId) {
  if (visualSource.kind === 'purpose_visual_inputs') {
    const visual = visualItems.find((entry) => (entry.icon_id || entry.candidate_icon_id) === iconId);
    return visual?.source_svg || visual?.renderable_icon_payload?.svg || null;
  }

  if (visualSource.kind === 'simpleicons_icon_index') {
    const [libraryId, sourceName] = String(iconId || '').split(':');
    assert(libraryId === 'simpleicons' && sourceName, `Invalid Simple Icons icon id for visual lookup: ${iconId}`);

    const icons = Array.isArray(visualItems?.icons) ? visualItems.icons : [];
    const visual = icons.find(
      (entry) =>
        entry?.lib === 'simpleicons' &&
        String(entry?.id || '') === sourceName
    );
    return visual?.svg || null;
  }

  if (visualSource.kind === 'mingcute_icon_index') {
    const [libraryId, sourceName] = String(iconId || '').split(':');
    assert(libraryId === 'mingcute' && sourceName, `Invalid MingCute icon id for visual lookup: ${iconId}`);

    const icons = Array.isArray(visualItems?.icons) ? visualItems.icons : [];
    const iconIndexId = sourceName === 'abs' ? 'ABS_line' : `${sourceName}_line`;
    const visual = icons.find(
      (entry) =>
        entry?.lib === 'mingcute' &&
        String(entry?.id || '').toLowerCase() === iconIndexId.toLowerCase()
    );
    return visual?.svg || null;
  }

  throw new Error(`Unsupported visual source kind: ${visualSource.kind}`);
}

function resolveScreenshotFileName(visualSource, iconId, item = null) {
  if (item && typeof item.screenshot_file_name === 'string' && item.screenshot_file_name.trim().length > 0) {
    return item.screenshot_file_name.trim();
  }

  const [sourceLibrary, sourceName] = String(iconId || '').split(':');
  assert(sourceLibrary && sourceName, `Invalid icon id for screenshot lookup: ${iconId}`);
  const namingPattern = String(visualSource.naming_pattern || '{source_library}_{source_name}.png');

  return namingPattern
    .replaceAll('{source_library}', sourceLibrary)
    .replaceAll('{source_name}', sourceName);
}

export function resolveVisualPreview(visualSource, visualItems, iconId, repoRoot, item = null) {
  if (visualSource.kind === 'icon_screenshot_folder') {
    const fileName = resolveScreenshotFileName(visualSource, iconId, item);
    const files = Array.isArray(visualItems?.files) ? visualItems.files : [];
    const hasFile = files.includes(fileName);
    if (!hasFile) {
      return null;
    }

    const imagePath = path.join(repoRoot, visualSource.path, fileName);
    return {
      kind: 'image',
      image_path: imagePath,
      relative_path: path.relative(repoRoot, imagePath).replaceAll(path.sep, '/'),
    };
  }

  const svg = resolveVisualSvg(visualSource, visualItems, iconId);
  if (!svg) {
    return null;
  }

  return {
    kind: 'svg',
    svg,
  };
}

export function validateDeterministicDepictsObservation(value, iconId, record = null) {
  const normalized = requireNonEmptyString(value, 'depicts_observation', iconId);
  const plain = normalizeText(normalized);
  const skipAbstractLanguageCheck = record?.source_library === 'simpleicons' && record?.category === 'brand_identity';

  assert(
    wordCount(normalized) >= DEPICTS_MIN_WORDS && wordCount(normalized) <= DEPICTS_MAX_WORDS,
    `depicts_observation must contain ${DEPICTS_MIN_WORDS}-${DEPICTS_MAX_WORDS} words for ${iconId}`
  );
  assert(
    !/[,;:!?]/.test(normalized),
    `depicts_observation must avoid sentence punctuation for ${iconId}`
  );

  for (const pattern of DISALLOWED_DEPICTS_PATTERNS) {
    if (skipAbstractLanguageCheck) {
      continue;
    }
    assert(!pattern.test(normalized), `depicts_observation drifts into abstract/product language for ${iconId}`);
  }

  assert(
    hasCue(plain, SPATIAL_CUES),
    `depicts_observation must include at least one spatial or structural cue for ${iconId}`
  );
  assert(
    hasCue(plain, VISUAL_NOUN_CUES),
    `depicts_observation must include at least one visible-form noun for ${iconId}`
  );

  if (record) {
    const sourceText = normalizeText(`${record.source_name || ''} ${record.label || ''}`);

    assert(
      plain !== normalizeText(record.label),
      `depicts_observation must not just repeat the label for ${iconId}`
    );
    assert(
      plain !== normalizeText(record.source_name),
      `depicts_observation must not just repeat the source_name for ${iconId}`
    );

    if (!skipAbstractLanguageCheck) {
      for (const rule of PREFERRED_OBJECT_ANCHORS) {
        if (rule.match.test(sourceText)) {
          assert(
            rule.requiredAny.some((cue) => plain.includes(cue)),
            `depicts_observation should use a stable object name for ${iconId}; expected one of: ${rule.requiredAny.join(', ')}`
          );
        }
      }
    }
  }

  return normalized;
}

export function isDeterministicManualRedoSelection(selection) {
  return Boolean(
    selection &&
      typeof selection === 'object' &&
      typeof selection.track_id === 'string' &&
      typeof selection.record_source_path === 'string' &&
      selection.visual_source &&
      Array.isArray(selection.items)
  );
}

export async function loadAndValidateDeterministicManualRedoSelection(selectionPath, repoRoot) {
  const selection = await readJson(selectionPath);
  assert(
    isDeterministicManualRedoSelection(selection),
    `${path.relative(repoRoot, selectionPath)} is not a deterministic manual redo selection file`
  );

  for (const field of REQUIRED_SELECTION_FIELDS) {
    assert(field in selection, `Selection file is missing "${field}": ${path.relative(repoRoot, selectionPath)}`);
  }

  const expectedBatchId = path.basename(selectionPath).replace(/-selection\.json$/i, '');
  assert(
    selection.batch_id === expectedBatchId,
    `batch_id does not match selection file name in ${path.relative(repoRoot, selectionPath)}`
  );
  const reviewPolicySnapshot = validateReviewPolicySnapshot(selection.review_policy_snapshot, selection.track_id);
  assert(
    Array.isArray(selection.items) && selection.items.length === reviewPolicySnapshot.batch_size,
    `Selection file must contain exactly ${reviewPolicySnapshot.batch_size} items: ${path.relative(repoRoot, selectionPath)}`
  );
  assert(
    selection.visual_source && typeof selection.visual_source === 'object',
    `visual_source must be an object in ${path.relative(repoRoot, selectionPath)}`
  );
  assert(
    typeof selection.visual_source.kind === 'string' && selection.visual_source.kind.trim().length > 0,
    `visual_source.kind is required in ${path.relative(repoRoot, selectionPath)}`
  );
  assert(
    typeof selection.visual_source.path === 'string' && selection.visual_source.path.trim().length > 0,
    `visual_source.path is required in ${path.relative(repoRoot, selectionPath)}`
  );

  const recordSourcePath = path.join(repoRoot, selection.record_source_path);
  const visualSourcePath = path.join(repoRoot, selection.visual_source.path);
  const currentRecords = await readJson(recordSourcePath);
  const visualItems = selection.visual_source.kind === 'icon_screenshot_folder'
    ? {
        files: (await fs.readdir(visualSourcePath, { withFileTypes: true }))
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name),
      }
    : await readJson(visualSourcePath);
  const currentRecordById = new Map(currentRecords.map((record) => [record.icon_id, record]));
  const seenIconIds = new Set();

  selection.items.forEach((item, index) => {
    const itemLabel = `items[${index}]`;

    for (const field of REQUIRED_ITEM_FIELDS) {
      assert(field in item, `${itemLabel} is missing "${field}" in ${path.relative(repoRoot, selectionPath)}`);
    }

    const iconId = requireNonEmptyString(item.icon_id, 'icon_id', itemLabel);
    assert(!seenIconIds.has(iconId), `Duplicate icon_id in ${path.relative(repoRoot, selectionPath)}: ${iconId}`);
    seenIconIds.add(iconId);

    assert(isHttpsUrl(item.official_source_url), `official_source_url must be https for ${iconId}`);
    if ('public_reference_url' in item && item.public_reference_url !== null && asTrimmedString(item.public_reference_url)) {
      assert(isHttpsUrl(item.public_reference_url), `public_reference_url must be https for ${iconId}`);
    }

    const record = currentRecordById.get(iconId);
    assert(record, `Missing current record for ${iconId} in ${selection.record_source_path}`);

    validateDeterministicDepictsObservation(item.depicts_observation, iconId, record);
    const popularReading = requireNonEmptyString(item.popular_reading, 'popular_reading', iconId);
    assert(
      normalizeText(popularReading) !== normalizeText(item.depicts_observation),
      `popular_reading must not duplicate depicts_observation for ${iconId}`
    );
    assert(
      wordCount(requireNonEmptyString(item.context_bias, 'context_bias', iconId)) >= 6,
      `context_bias must be specific enough for ${iconId}`
    );
    assert(
      wordCount(requireNonEmptyString(item.ambiguity_note, 'ambiguity_note', iconId)) >= 6,
      `ambiguity_note must explain real ambiguity for ${iconId}`
    );
    assert(
      wordCount(requireNonEmptyString(item.selection_reason, 'selection_reason', iconId)) >= 6,
      `selection_reason must explain the evidence basis for ${iconId}`
    );

    validatePlausibleReadings(item.plausible_readings, iconId);

    const visualPreview = resolveVisualPreview(selection.visual_source, visualItems, iconId, repoRoot, item);
    assert(visualPreview, `Missing visual source for ${iconId} in ${selection.visual_source.path}`);
  });

  return {
    selection,
    currentRecords,
    visualItems,
  };
}
