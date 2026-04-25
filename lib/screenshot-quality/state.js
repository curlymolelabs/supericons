import fs from 'node:fs';
import path from 'node:path';

export const PUBLIC_FIELDS = [
  'label',
  'depicts',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
];

export function samePublicFields(left, right) {
  return PUBLIC_FIELDS.every(
    (field) => JSON.stringify(left?.[field]) === JSON.stringify(right?.[field])
  );
}

export function isRecognizedScreenshotFinalRecordsFile(fileName, library) {
  return (
    new RegExp(`^${library}-.*screenshot.*final-records\\.json$`, 'i').test(fileName) ||
    new RegExp(`^${library}-test-batch-.*final-records\\.json$`, 'i').test(fileName)
  );
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function createCaseInsensitiveSourceMap(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = record.source_name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(record);
  }
  return grouped;
}

export function resolveMappingEntryToLiveRecord(entry, liveBySourceName, liveByLowerName) {
  const candidates = [
    entry.current_public_registry_source_name,
    entry.registry_source_name_candidate,
    entry.base_concept_id,
    ...(entry.registry_lookup_candidates || []).map((candidate) =>
      candidate.includes(':') ? candidate.split(':').slice(1).join(':') : candidate
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (liveBySourceName.has(candidate)) {
      return {
        record: liveBySourceName.get(candidate),
        matched_by: 'exact',
        candidate,
      };
    }
  }

  for (const candidate of candidates) {
    const lowerMatches = liveByLowerName.get(candidate.toLowerCase()) || [];
    if (lowerMatches.length === 1) {
      return {
        record: lowerMatches[0],
        matched_by: 'lowercase',
        candidate,
      };
    }
  }

  return null;
}

export function buildScreenshotConcepts({ mappingEntries, liveRecords, library }) {
  const liveBySourceName = new Map(
    liveRecords
      .filter((record) => record.source_library === library)
      .map((record) => [record.source_name, record])
  );
  const liveByLowerName = createCaseInsensitiveSourceMap(
    liveRecords.filter((record) => record.source_library === library)
  );
  const conceptMap = new Map();

  for (const entry of mappingEntries) {
    const resolution = resolveMappingEntryToLiveRecord(entry, liveBySourceName, liveByLowerName);
    const conceptKey = resolution?.record?.icon_id || `__unmapped__:${entry.base_concept_id}`;

    if (!conceptMap.has(conceptKey)) {
      conceptMap.set(conceptKey, {
        icon_id: resolution?.record?.icon_id || null,
        source_name: resolution?.record?.source_name || null,
        matched_by: resolution?.matched_by || null,
        base_concept_ids: new Set(),
        screenshot_files: new Set(),
        styles: new Set(),
        has_live_registry_match: Boolean(resolution?.record),
      });
    }

    const concept = conceptMap.get(conceptKey);
    concept.base_concept_ids.add(entry.base_concept_id);
    concept.screenshot_files.add(entry.recommended_screenshot_file_name);
    concept.styles.add(entry.asset_style);
  }

  return [...conceptMap.values()]
    .map((concept) => ({
      ...concept,
      base_concept_ids: [...concept.base_concept_ids].sort(),
      screenshot_files: [...concept.screenshot_files].sort(),
      styles: [...concept.styles].sort(),
    }))
    .sort((left, right) =>
      (left.source_name || left.base_concept_ids[0]).localeCompare(
        right.source_name || right.base_concept_ids[0]
      )
    );
}

export function classifyScreenshotQualityState({
  library,
  liveRecords,
  screenshotConcepts,
  recognizedArtifacts,
}) {
  const liveById = new Map(
    liveRecords
      .filter((record) => record.source_library === library)
      .map((record) => [record.icon_id, record])
  );
  const artifactsByIcon = new Map();

  for (const artifact of recognizedArtifacts) {
    for (const record of artifact.records || []) {
      if (!artifactsByIcon.has(record.icon_id)) {
        artifactsByIcon.set(record.icon_id, []);
      }
      artifactsByIcon.get(record.icon_id).push({ fileName: artifact.fileName, record });
    }
  }

  const completed_live = [];
  const reviewed_pending = [];
  const untouched = [];
  const unmapped = [];

  for (const concept of screenshotConcepts) {
    if (!concept.icon_id || !concept.has_live_registry_match) {
      unmapped.push(concept);
      continue;
    }

    const liveRecord = liveById.get(concept.icon_id);
    if (!liveRecord) {
      unmapped.push(concept);
      continue;
    }

    const artifacts = artifactsByIcon.get(concept.icon_id) || [];
    const matchingArtifacts = artifacts.filter((artifact) =>
      samePublicFields(artifact.record, liveRecord)
    );

    if (matchingArtifacts.length > 0) {
      completed_live.push({
        ...concept,
        reviewed_files: matchingArtifacts.map((artifact) => artifact.fileName),
      });
      continue;
    }

    if (artifacts.length > 0) {
      reviewed_pending.push({
        ...concept,
        reviewed_files: artifacts.map((artifact) => artifact.fileName),
      });
      continue;
    }

    untouched.push(concept);
  }

  return { completed_live, reviewed_pending, untouched, unmapped };
}

export function loadRecognizedArtifacts({ manualRedoDir, library }) {
  if (!fs.existsSync(manualRedoDir)) {
    return [];
  }

  return fs
    .readdirSync(manualRedoDir)
    .filter((fileName) => isRecognizedScreenshotFinalRecordsFile(fileName, library))
    .sort()
    .map((fileName) => ({
      fileName,
      records: readJson(path.join(manualRedoDir, fileName)),
    }));
}

export function loadScreenshotQualityState({ repoRoot = process.cwd(), library }) {
  const screenshotFolder = path.join(repoRoot, 'output', 'icon_screenshot', library);
  const mappingPath = path.join(screenshotFolder, 'screenshot-mapping.json');
  const liveRegistryPath = path.join(repoRoot, 'public', 'registry', 'records.json');
  const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');

  const mapping = readJson(mappingPath);
  const liveRecords = readJson(liveRegistryPath);
  const screenshotConcepts = buildScreenshotConcepts({
    mappingEntries: mapping.entries || [],
    liveRecords,
    library,
  });
  const recognizedArtifacts = loadRecognizedArtifacts({ manualRedoDir, library });
  const state = classifyScreenshotQualityState({
    library,
    liveRecords,
    screenshotConcepts,
    recognizedArtifacts,
  });

  return {
    library,
    screenshotFolder,
    mappingPath,
    liveRegistryPath,
    manualRedoDir,
    mapping,
    liveRecords,
    screenshotConcepts,
    recognizedArtifacts,
    state,
  };
}

export function stateCounts(state) {
  return {
    completed_live: state.completed_live.length,
    reviewed_pending: state.reviewed_pending.length,
    untouched: state.untouched.length,
    unmapped: state.unmapped.length,
  };
}
