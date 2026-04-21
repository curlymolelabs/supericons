import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'lucide');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = process.argv[2] || 'lucide-visual-review-batch-01';
const SOURCE_BATCH_ID = process.argv[3] || 'lucide-batch-01';
const existingBatchPath = path.join(libraryDir, `${BATCH_ID}.json`);

const REVIEW_DECISIONS = Object.freeze({
  'lucide:file_archive': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Archive File',
      depicts: 'A file paired with an archive zipper cue.',
      purpose: 'Show archiving, compressing, or opening a file archive.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['archive file', 'compressed file', 'zip file', 'file archive', 'storage'],
      synonyms: ['zip file', 'compressed document', 'archive document', 'open archive'],
      use_when: 'Use when the interface archives a file, opens a compressed file, or points to a file stored as an archive.',
      avoid_when: 'Do not use for generic file browsing when the meaning is not specifically archive or compression.',
      confidence_score: 0.84,
    },
  },
  'lucide:file_clock': {
    outcome: 'hold_for_editor_review',
    note: 'The file-and-clock shape still blends recent file, scheduled file, and time-limited file meanings.',
    overrides: {
      label: 'Timed File',
      depicts: 'A file paired with a clock cue.',
      purpose: 'Show a file tied to time, schedule, or recency.',
      category: 'system_control',
      intent: 'inform',
      domain: 'ui_controls',
      semantic_tags: ['timed file', 'scheduled file', 'recent file', 'file history', 'clock'],
      synonyms: ['recent file', 'scheduled document', 'timed document', 'file with time'],
      use_when: 'Use when the interface refers to a file with a clear time, recency, or schedule meaning.',
      avoid_when: 'Do not use when the product needs a more specific meaning like recent files, scheduled jobs, or file history and the nearby context is not explicit.',
      confidence_score: 0.78,
    },
  },
  'lucide:file_edit': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Edit File',
      depicts: 'A file paired with an edit cue.',
      purpose: 'Show editing or updating a file or document.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['edit file', 'update file', 'modify document', 'file edit', 'document'],
      synonyms: ['update file', 'edit document', 'modify file', 'change document'],
      use_when: 'Use when the interface edits, updates, or renames a file or document.',
      avoid_when: 'Do not use for file creation or generic open-file actions when the meaning is specifically editing.',
      confidence_score: 0.84,
    },
  },
  'lucide:file_play': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Play File',
      depicts: 'A file paired with a play cue.',
      purpose: 'Show playing, previewing, or opening a playable media file.',
      category: 'media_playback',
      intent: 'act',
      domain: 'media',
      semantic_tags: ['play file', 'media file', 'preview media', 'playback', 'file'],
      synonyms: ['preview file', 'play media file', 'open playable file', 'media preview'],
      use_when: 'Use when the interface plays or previews a file meant for media playback.',
      avoid_when: 'Do not use for generic open-file actions when the meaning is not specifically playback or media preview.',
      confidence_score: 0.84,
    },
  },
  'lucide:file_plus': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'New File',
      depicts: 'A file paired with an add cue inside the file boundary.',
      purpose: 'Show creating or adding a new file or document.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['new file', 'create file', 'add file', 'new document', 'file'],
      synonyms: ['create file', 'new document', 'add document', 'start file'],
      use_when: 'Use when the interface creates a new file or starts a new document.',
      avoid_when: 'Do not use for import or upload flows when the meaning is specifically new file creation.',
      confidence_score: 0.85,
    },
  },
  'lucide:file_plus_2': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Add File',
      depicts: 'A file paired with an add cue outside the file boundary.',
      purpose: 'Show adding a file into the current context.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['add file', 'insert file', 'attach file', 'new file', 'file'],
      synonyms: ['insert file', 'attach document', 'add document', 'bring in file'],
      use_when: 'Use when the interface adds or attaches a file into the current context.',
      avoid_when: 'Do not use for new blank-document creation when the meaning is specifically attaching or adding a file.',
      confidence_score: 0.84,
    },
  },
  'lucide:file_scan': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Scan File',
      depicts: 'A file paired with a scan-target cue.',
      purpose: 'Show scanning, inspecting, or capturing a document file.',
      category: 'search_discovery',
      intent: 'discover',
      domain: 'ui_controls',
      semantic_tags: ['scan file', 'document scan', 'inspect file', 'capture document', 'scan'],
      synonyms: ['document scan', 'scan document', 'inspect file', 'capture file'],
      use_when: 'Use when the interface scans, captures, or inspects a document or file surface.',
      avoid_when: 'Do not use for generic file search when the meaning is specifically scan or capture.',
      confidence_score: 0.84,
    },
  },
  'lucide:file_user': {
    outcome: 'hold_for_editor_review',
    note: 'The file-and-user shape still drifts between profile document, account export, and user-owned file meanings.',
    overrides: {
      label: 'User File',
      depicts: 'A file paired with a user silhouette.',
      purpose: 'Show a file tied to a user, profile, or account record.',
      category: 'communication_social',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: ['user file', 'profile document', 'account file', 'person record', 'file'],
      synonyms: ['profile document', 'account document', 'user record', 'identity file'],
      use_when: 'Use when the interface refers to a document clearly tied to a person, profile, or account.',
      avoid_when: 'Do not use when the product needs a more specific meaning like profile document, permissions file, or account export and the nearby context is not explicit.',
      confidence_score: 0.78,
    },
  },
  'lucide:file_x': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Remove File',
      depicts: 'A file paired with a remove cue.',
      purpose: 'Show removing, clearing, or rejecting a file.',
      category: 'destructive_actions',
      intent: 'delete',
      domain: 'ui_controls',
      semantic_tags: ['remove file', 'delete file', 'clear file', 'reject file', 'file'],
      synonyms: ['delete file', 'remove document', 'clear document', 'discard file'],
      use_when: 'Use when the interface removes, clears, or rejects a file from the current context.',
      avoid_when: 'Do not use for generic error or blocked-file states when the meaning is specifically removing a file.',
      confidence_score: 0.84,
    },
  },
  'lucide:file_x_2': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Remove File',
      depicts: 'A file paired with an external remove cue.',
      purpose: 'Show removing or detaching a file from the current context.',
      category: 'destructive_actions',
      intent: 'delete',
      domain: 'ui_controls',
      semantic_tags: ['remove file', 'delete file', 'detach file', 'clear file', 'file'],
      synonyms: ['delete file', 'detach document', 'remove document', 'discard file'],
      use_when: 'Use when the interface removes or detaches a file from the current context.',
      avoid_when: 'Do not use for generic blocked-file states when the meaning is specifically file removal.',
      confidence_score: 0.84,
    },
  },
  'lucide:folder_archive': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Archive Folder',
      depicts: 'A folder paired with an archive zipper cue.',
      purpose: 'Show archiving, compressing, or opening a folder archive.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['archive folder', 'compressed folder', 'zip folder', 'folder archive', 'storage'],
      synonyms: ['zip folder', 'compressed directory', 'archive directory', 'open folder archive'],
      use_when: 'Use when the interface archives a folder, opens a compressed folder, or points to a folder stored as an archive.',
      avoid_when: 'Do not use for generic folder browsing when the meaning is not specifically archive or compression.',
      confidence_score: 0.84,
    },
  },
  'lucide:folder_clock': {
    outcome: 'hold_for_editor_review',
    note: 'The folder-and-clock shape still blends recent folder, scheduled folder, and folder history meanings.',
    overrides: {
      label: 'Timed Folder',
      depicts: 'A folder paired with a clock cue.',
      purpose: 'Show a folder tied to time, schedule, or recency.',
      category: 'system_control',
      intent: 'inform',
      domain: 'ui_controls',
      semantic_tags: ['timed folder', 'scheduled folder', 'recent folder', 'folder history', 'clock'],
      synonyms: ['recent folder', 'scheduled directory', 'timed directory', 'folder with time'],
      use_when: 'Use when the interface refers to a folder with a clear time, recency, or schedule meaning.',
      avoid_when: 'Do not use when the product needs a more specific meaning like recent folders, folder history, or scheduled storage and the nearby context is not explicit.',
      confidence_score: 0.78,
    },
  },
  'lucide:folder_edit': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Edit Folder',
      depicts: 'A folder paired with an edit cue.',
      purpose: 'Show editing or renaming a folder or directory.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['edit folder', 'rename folder', 'modify directory', 'folder edit', 'folder'],
      synonyms: ['rename folder', 'edit directory', 'modify folder', 'change folder'],
      use_when: 'Use when the interface edits, updates, or renames a folder or directory.',
      avoid_when: 'Do not use for folder creation or generic open-folder actions when the meaning is specifically editing.',
      confidence_score: 0.84,
    },
  },
  'lucide:folder_open_dot': {
    outcome: 'hold_for_editor_review',
    note: 'The open-folder-and-dot shape still blends current folder, unread folder, and active folder meanings too broadly.',
    overrides: {
      label: 'Active Open Folder',
      depicts: 'An open folder paired with a small status dot.',
      purpose: 'Show an open folder with an active, current, or highlighted marker.',
      category: 'system_control',
      intent: 'inform',
      domain: 'ui_controls',
      semantic_tags: ['active folder', 'current folder', 'open folder status', 'folder marker', 'folder'],
      synonyms: ['current folder', 'highlighted folder', 'open folder marker', 'folder status'],
      use_when: 'Use when the interface refers to an open folder with a clearly explained active or current marker.',
      avoid_when: 'Do not use when the nearby product context does not make the dot meaning explicit.',
      confidence_score: 0.77,
    },
  },
  'lucide:folder_plus': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'New Folder',
      depicts: 'A folder paired with an add cue.',
      purpose: 'Show creating or adding a new folder or directory.',
      category: 'system_control',
      intent: 'act',
      domain: 'ui_controls',
      semantic_tags: ['new folder', 'create folder', 'add folder', 'new directory', 'folder'],
      synonyms: ['create folder', 'new directory', 'add directory', 'start folder'],
      use_when: 'Use when the interface creates a new folder or adds a folder into the current context.',
      avoid_when: 'Do not use for generic open-folder actions when the meaning is specifically adding a folder.',
      confidence_score: 0.85,
    },
  },
  'lucide:folder_x': {
    outcome: 'approve_for_import',
    overrides: {
      label: 'Remove Folder',
      depicts: 'A folder paired with a remove cue.',
      purpose: 'Show removing, clearing, or rejecting a folder.',
      category: 'destructive_actions',
      intent: 'delete',
      domain: 'ui_controls',
      semantic_tags: ['remove folder', 'delete folder', 'clear folder', 'reject folder', 'folder'],
      synonyms: ['delete folder', 'remove directory', 'discard folder', 'clear directory'],
      use_when: 'Use when the interface removes, clears, or rejects a folder from the current context.',
      avoid_when: 'Do not use for generic folder errors when the meaning is specifically folder removal.',
      confidence_score: 0.84,
    },
  },
  'lucide:bug_play': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The bug-and-play shape still mixes run debug, replay bug, and reproduce issue meanings too broadly for approval.',
    overrides: {
      label: 'Bug Replay',
      depicts: 'A bug symbol paired with a play cue.',
      purpose: 'Show replaying or running a bug scenario during testing or debugging.',
      category: 'engineering_developer_tools',
      intent: 'act',
      domain: 'developer_tools',
      semantic_tags: ['bug replay', 'debug run', 'reproduce bug', 'bug test', 'debug'],
      synonyms: ['reproduce bug', 'run debug scenario', 'bug playback', 'debug replay'],
      use_when: 'Use when a developer tool replays or runs a bug scenario for investigation.',
      avoid_when: 'Do not use for generic play, media start, or generic bug reporting when the meaning is not specifically replaying a bug scenario.',
      confidence_score: 0.72,
    },
  },
});

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, 'utf8');
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function normalizeEvidenceSources(values) {
  return [...new Set((values || []).map((value) => String(value).replaceAll('_', '-')))];
}

function getDecisionIconIds(batches, excludedBatchId) {
  const resolved = new Set();
  for (const [batchId, batchDecision] of Object.entries(batches || {})) {
    if (batchId === excludedBatchId) {
      continue;
    }
    for (const key of ['approve_for_import', 'hold_for_editor_review', 'keep_as_reviewed_draft']) {
      for (const entry of batchDecision[key] || []) {
        resolved.add(typeof entry === 'string' ? entry : entry.icon_id);
      }
    }
  }
  return resolved;
}

function buildBaseReviewedRecord(candidateRecord) {
  const confidenceScore = candidateRecord.confidence ?? 0.8;
  return {
    icon_id: candidateRecord.icon_id,
    source_library: candidateRecord.source_library,
    source_name: candidateRecord.source_name,
    label: candidateRecord.label,
    depicts: candidateRecord.depicts,
    purpose: candidateRecord.purpose,
    category: candidateRecord.category,
    intent: candidateRecord.intent,
    domain: candidateRecord.domain,
    semantic_tags: candidateRecord.semantic_tags,
    synonyms: candidateRecord.synonyms || [],
    use_when: candidateRecord.use_when,
    avoid_when: candidateRecord.avoid_when,
    evidence_sources: normalizeEvidenceSources(candidateRecord.evidence || ['source_name', 'svg_payload']),
    confidence_score: confidenceScore,
    confidence_band: confidenceScore >= 0.86 ? 'high' : 'medium',
  };
}

function withOverrides(record, overrides) {
  const reviewed = {
    ...record,
    ...overrides,
  };
  const confidenceScore = overrides.confidence_score ?? record.confidence_score;
  reviewed.confidence_score = confidenceScore;
  reviewed.confidence_band = confidenceScore >= 0.86 ? 'high' : 'medium';
  return reviewed;
}

const summary = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'summary.json'));
const worklist = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'worklist.json'));
const candidateRecords = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'candidate-records.json'));
const reviewQueue = await readJson(path.join(automationRoot, SOURCE_BATCH_ID, 'review-queue.json'));
const existingDecisions = await readJsonOrDefault(path.join(libraryDir, 'promotion-decisions.json'), {
  schema_version: '1.0.0',
  batches: {},
});
const existingBatch = await readJsonOrDefault(existingBatchPath, { selected_icon_ids: [], records: [] });

const worklistById = new Map(worklist.map((record) => [record.icon_id, record]));
const candidateById = new Map(candidateRecords.map((record) => [record.icon_id, record]));
const iconIndexById = new Map((publicIconIndex.icons || []).map((icon) => [icon.id, icon]));
const existingRecordsById = new Map((existingBatch.records || []).map((record) => [record.icon_id, record]));
const resolvedOtherBatchIds = getDecisionIconIds(existingDecisions.batches, BATCH_ID);
const liveSelectedIds = reviewQueue
  .filter((item) => item.queue_outcome === 'needs_visual_review' && !resolvedOtherBatchIds.has(item.candidate_icon_id))
  .map((item) => item.candidate_icon_id);
const selectedIds = Array.isArray(existingBatch.selected_icon_ids) && existingBatch.selected_icon_ids.length >= liveSelectedIds.length
  ? existingBatch.selected_icon_ids
  : liveSelectedIds;

const batchRecords = selectedIds.map((iconId) => {
  const savedRecord = existingRecordsById.get(iconId);
  if (savedRecord && !candidateById.has(iconId)) {
    return savedRecord;
  }

  const worklistItem = worklistById.get(iconId);
  const candidateRecord = candidateById.get(iconId);
  const queueItem = reviewQueue.find((item) => item.candidate_icon_id === iconId);

  if (!worklistItem || !candidateRecord || !queueItem) {
    throw new Error(`Missing Lucide staged data for ${iconId}`);
  }

  if (queueItem.queue_outcome !== 'needs_visual_review') {
    throw new Error(`Selected icon is not in the Lucide visual-review queue: ${iconId}`);
  }

  const sourceIcon = iconIndexById.get(candidateRecord.source_asset_name);
  if (!sourceIcon?.svg) {
    throw new Error(`Missing Lucide SVG payload for ${iconId}`);
  }

  return {
    icon_id: iconId,
    family_key: worklistItem.family_key,
    selection_score: worklistItem.selection_score,
    approved_reference_icon_id: worklistItem.approved_reference_icon_id,
    queue_outcome: queueItem.queue_outcome,
    current_candidate_record: candidateRecord,
    visual_review_input: {
      source_asset_name: candidateRecord.source_asset_name,
      visual_payload_status: 'svg_available',
      renderable_icon_payload: {
        svg: sourceIcon.svg,
      },
    },
  };
});

const reviewedRecords = batchRecords.map((record) => {
  const decision = REVIEW_DECISIONS[record.icon_id];
  if (!decision) {
    throw new Error(`Missing Lucide visual-review decision for ${record.icon_id}`);
  }
  return withOverrides(buildBaseReviewedRecord(record.current_candidate_record), decision.overrides || {});
});

const approveForImport = [];
const holdForEditorReview = [];
const keepAsReviewedDraft = [];

for (const reviewedRecord of reviewedRecords) {
  const decision = REVIEW_DECISIONS[reviewedRecord.icon_id];
  if (decision.outcome === 'approve_for_import') {
    approveForImport.push(reviewedRecord.icon_id);
    continue;
  }

  if (decision.outcome === 'hold_for_editor_review') {
    holdForEditorReview.push({
      icon_id: reviewedRecord.icon_id,
      note: decision.note,
    });
    continue;
  }

  if (decision.outcome === 'keep_as_reviewed_draft') {
    keepAsReviewedDraft.push({
      icon_id: reviewedRecord.icon_id,
      note: decision.note,
    });
    continue;
  }

  throw new Error(`Unsupported Lucide review outcome for ${reviewedRecord.icon_id}`);
}

const promotionDecisions = {
  ...existingDecisions,
  batches: {
    ...(existingDecisions.batches || {}),
    [BATCH_ID]: {
      approve_for_import: approveForImport,
      hold_for_editor_review: holdForEditorReview,
      keep_as_reviewed_draft: keepAsReviewedDraft,
    },
  },
};

const batchData = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  library_id: summary.library_id,
  library_label: summary.library_label,
  purpose: 'Resolve the remaining visually ambiguous Lucide icons from the first Lucide automation batch.',
  selected_count: selectedIds.length,
  selected_icon_ids: selectedIds,
  counts: {
    by_family: countBy(batchRecords, (record) => record.family_key),
    by_queue: countBy(batchRecords, (record) => record.queue_outcome),
  },
  records: batchRecords,
};

const summaryPayload = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  source_batch_id: SOURCE_BATCH_ID,
  total_icons: reviewedRecords.length,
  approved_for_import_count: approveForImport.length,
  hold_for_editor_review_count: holdForEditorReview.length,
  reviewed_draft_count: keepAsReviewedDraft.length,
  by_family: countBy(batchRecords, (record) => record.family_key),
  by_category: countBy(reviewedRecords, (record) => record.category),
};

const notes = `# ${BATCH_ID} Notes

## Outcome

- Total reviewed: ${reviewedRecords.length}
- Approved for import: ${approveForImport.length}
- Hold for editor review: ${holdForEditorReview.length}
- Keep as reviewed draft: ${keepAsReviewedDraft.length}

## Main pattern

This batch clears the visually ambiguous Lucide file and folder variants from the first Lucide automation slice.

The icons that moved forward were the ones where the second cue reads clearly:

- archive
- edit
- play
- add
- remove

The icons that stayed conservative are the ones where the extra cue still depends too much on nearby product wording:

- time
- user
- open folder plus dot
- bug plus play
`;

await writeJson(existingBatchPath, batchData);
await writeJson(path.join(libraryDir, `${BATCH_ID}-reviewed-records.json`), {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
});
await writeJson(path.join(libraryDir, 'promotion-decisions.json'), promotionDecisions);
await writeJson(path.join(generatedDir, `${BATCH_ID}-summary.json`), summaryPayload);
await writeText(path.join(libraryDir, `${BATCH_ID}-notes.md`), notes);

console.log(
  `build-lucide-visual-review-batch: batch=${reviewedRecords.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`
);
