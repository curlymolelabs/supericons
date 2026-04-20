import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const batchSourceDir = path.join(automationRoot, 'mingcute-batch-01');
const libraryDir = path.join(automationRoot, 'mingcute');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = 'mingcute-visual-review-batch-01';
const selectionPath = path.join(libraryDir, 'visual-review-batch-01-selection.json');

const REVIEW_DECISIONS = Object.freeze({
  'mingcute:align_arrow_left': {
    outcome: 'hold_for_editor_review',
    note: 'The alignment-and-arrow combination still drifts between align-left formatting and directional navigation.',
  },
  'mingcute:align_arrow_right': {
    outcome: 'hold_for_editor_review',
    note: 'The alignment-and-arrow combination still drifts between align-right formatting and directional navigation.',
  },
  'mingcute:direction_arrow': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The arrow reads as a generic direction cue and still needs tighter product context before approval.',
  },
  'mingcute:google_play': {
    outcome: 'keep_as_reviewed_draft',
    note: 'This reads as a platform or brand destination and should be handled under the brand/logo workflow instead of generic UI semantics.',
  },
  'mingcute:play_football': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The sports meaning competes with media-playback language, so it is too context-sensitive for approval in the generic UI lane.',
  },
});

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonOrDefault(filePath, fallbackValue) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
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

function normalizeEvidenceSources(values) {
  return [...new Set((values || []).map((value) => String(value).replaceAll('_', '-')))];
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
    evidence_sources: normalizeEvidenceSources(candidateRecord.evidence || ['source_name', 'visual_inspection', 'editorial_judgment']),
    confidence_score: confidenceScore,
    confidence_band: confidenceScore >= 0.86 ? 'high' : 'medium',
  };
}

function applyPatternOverrides(record) {
  const reviewed = { ...record };

  if (record.icon_id === 'mingcute:file_download') {
    reviewed.label = 'Download File';
    reviewed.depicts = 'A file paired with a downward download cue.';
    reviewed.purpose = 'Show downloading, exporting, or saving a file.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['download file', 'export file', 'save file', 'download', 'file'];
    reviewed.synonyms = ['download file', 'export file', 'save document', 'download document'];
    reviewed.use_when = 'Use when the interface downloads, exports, or saves a file or document.';
    reviewed.avoid_when = 'Do not use for folder download, generic sync, or network transfer when the meaning is specifically a single file.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_upload') {
    reviewed.label = 'Upload File';
    reviewed.depicts = 'A file paired with an upward upload cue.';
    reviewed.purpose = 'Show uploading, importing, or adding a file.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['upload file', 'import file', 'add file', 'upload', 'file'];
    reviewed.synonyms = ['upload file', 'import document', 'add file', 'submit file'];
    reviewed.use_when = 'Use when the interface uploads, imports, or adds a file or document.';
    reviewed.avoid_when = 'Do not use for folder upload, generic sync, or network transfer when the meaning is specifically a single file.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_download') {
    reviewed.label = 'Download Folder';
    reviewed.depicts = 'A folder paired with a downward download cue.';
    reviewed.purpose = 'Show downloading, exporting, or saving a folder or grouped file container.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['download folder', 'export folder', 'save folder', 'download', 'folder'];
    reviewed.synonyms = ['download folder', 'export folder', 'save folder', 'download container'];
    reviewed.use_when = 'Use when the interface downloads, exports, or saves a folder or grouped file container.';
    reviewed.avoid_when = 'Do not use for single-file download or generic sync when the meaning is specifically a folder.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_open' || record.icon_id === 'mingcute:folder_open_2') {
    reviewed.label = 'Open Folder';
    reviewed.depicts = 'An open folder indicating entry into a container.';
    reviewed.purpose = 'Show opening a folder or entering a file container.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['open folder', 'folder', 'enter container', 'directory', 'browse'];
    reviewed.synonyms = ['open folder', 'browse folder', 'open directory', 'enter folder'];
    reviewed.use_when = 'Use when the interface opens or enters a folder, directory, or file container.';
    reviewed.avoid_when = 'Do not use for creating folders or generic file browsing when the meaning is specifically opening a folder.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_upload') {
    reviewed.label = 'Upload Folder';
    reviewed.depicts = 'A folder paired with an upward upload cue.';
    reviewed.purpose = 'Show uploading, importing, or adding a folder or grouped file container.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['upload folder', 'import folder', 'add folder', 'upload', 'folder'];
    reviewed.synonyms = ['upload folder', 'import folder', 'submit folder', 'add folder'];
    reviewed.use_when = 'Use when the interface uploads, imports, or adds a folder or grouped file container.';
    reviewed.avoid_when = 'Do not use for single-file upload or generic sync when the meaning is specifically a folder.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:barcode_scan') {
    reviewed.label = 'Barcode Scan';
    reviewed.depicts = 'A barcode inside scan corners.';
    reviewed.purpose = 'Show scanning a barcode, QR-like code, or machine-readable label.';
    reviewed.category = 'search_discovery';
    reviewed.intent = 'discover';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['barcode scan', 'scan code', 'scanner', 'lookup', 'capture'];
    reviewed.synonyms = ['scan barcode', 'scan code', 'barcode scanner', 'scan label'];
    reviewed.use_when = 'Use when the interface scans a barcode, code label, or machine-readable identifier.';
    reviewed.avoid_when = 'Do not use for generic search or camera capture when the meaning is specifically barcode or coded-label scanning.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_certificate') {
    reviewed.label = 'Certified File';
    reviewed.depicts = 'A file paired with a certificate or verified seal.';
    reviewed.purpose = 'Show a verified file, certified document, or trusted file artifact.';
    reviewed.category = 'security';
    reviewed.intent = 'inform';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['certified file', 'verified document', 'trusted file', 'certificate', 'file'];
    reviewed.synonyms = ['verified file', 'certified document', 'trusted document', 'signed file'];
    reviewed.use_when = 'Use when the interface refers to a certified, signed, or trusted document or file.';
    reviewed.avoid_when = 'Do not use for generic file storage when the meaning is not specifically verified or certified.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_export') {
    reviewed.label = 'Export File';
    reviewed.depicts = 'A file paired with an outward export cue.';
    reviewed.purpose = 'Show exporting or sending a file out of the current system.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['export file', 'send file', 'download file', 'export', 'file'];
    reviewed.synonyms = ['export file', 'send document', 'output file', 'download export'];
    reviewed.use_when = 'Use when the interface exports, sends, or outputs a file from the current context.';
    reviewed.avoid_when = 'Do not use for import or open-file actions when the meaning is specifically export.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_forbid') {
    reviewed.label = 'Blocked File';
    reviewed.depicts = 'A file paired with a blocked or forbidden badge.';
    reviewed.purpose = 'Show a file that is blocked, restricted, or not allowed.';
    reviewed.category = 'security';
    reviewed.intent = 'warn';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['blocked file', 'restricted file', 'forbidden', 'file access', 'not allowed'];
    reviewed.synonyms = ['restricted file', 'blocked document', 'forbidden file', 'file not allowed'];
    reviewed.use_when = 'Use when the interface shows that a file is blocked, restricted, or disallowed.';
    reviewed.avoid_when = 'Do not use for delete or generic error states when the meaning is specifically file restriction.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_import') {
    reviewed.label = 'Import File';
    reviewed.depicts = 'A file paired with an inward import cue.';
    reviewed.purpose = 'Show importing, bringing in, or adding a file into the current system.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['import file', 'add file', 'bring file in', 'import', 'file'];
    reviewed.synonyms = ['import file', 'add document', 'bring in file', 'receive file'];
    reviewed.use_when = 'Use when the interface imports, receives, or brings a file into the current context.';
    reviewed.avoid_when = 'Do not use for export or open-file actions when the meaning is specifically import.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file') {
    reviewed.label = 'File';
    reviewed.depicts = 'A generic file or document symbol.';
    reviewed.purpose = 'Show a file, document, or generic file artifact.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['file', 'document', 'artifact', 'document item', 'record'];
    reviewed.synonyms = ['document', 'file item', 'doc', 'file artifact'];
    reviewed.use_when = 'Use when the interface refers to a generic file or document with no more specific file meaning needed.';
    reviewed.avoid_when = 'Do not use for folders, uploads, exports, or verified documents when a more specific file icon exists.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_locked') {
    reviewed.label = 'Locked File';
    reviewed.depicts = 'A file paired with a lock cue.';
    reviewed.purpose = 'Show a file that is locked, protected, or access-controlled.';
    reviewed.category = 'security';
    reviewed.intent = 'inform';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['locked file', 'protected file', 'secure file', 'restricted document', 'file'];
    reviewed.synonyms = ['protected file', 'secure document', 'restricted file', 'locked document'];
    reviewed.use_when = 'Use when the interface refers to a file that is protected or requires access control.';
    reviewed.avoid_when = 'Do not use for generic file storage when the meaning is not specifically file protection.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_new') {
    reviewed.label = 'New File';
    reviewed.depicts = 'A file paired with a creation cue.';
    reviewed.purpose = 'Show creating a new file or starting a new document.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['new file', 'create file', 'new document', 'add file', 'file'];
    reviewed.synonyms = ['create file', 'new document', 'add document', 'start file'];
    reviewed.use_when = 'Use when the interface creates a new file or starts a new document.';
    reviewed.avoid_when = 'Do not use for open, import, or generic file browsing when the meaning is specifically new file creation.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_security') {
    reviewed.label = 'Secure File';
    reviewed.depicts = 'A file paired with a security or shield cue.';
    reviewed.purpose = 'Show a secure file, protected document, or file with a security safeguard.';
    reviewed.category = 'security';
    reviewed.intent = 'inform';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['secure file', 'protected document', 'file security', 'trusted file', 'file'];
    reviewed.synonyms = ['protected file', 'secure document', 'trusted file', 'file safeguard'];
    reviewed.use_when = 'Use when the interface refers to a file with a security safeguard or protected access model.';
    reviewed.avoid_when = 'Do not use for generic file storage when the meaning is not specifically security or protection.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_unknown') {
    reviewed.label = 'Unknown File';
    reviewed.depicts = 'A file paired with an unknown or unclear-type cue.';
    reviewed.purpose = 'Show a file of unknown type, unrecognized format, or unspecified document kind.';
    reviewed.category = 'status_feedback';
    reviewed.intent = 'inform';
    reviewed.domain = 'product_status';
    reviewed.semantic_tags = ['unknown file', 'unrecognized file', 'file type', 'unknown format', 'file'];
    reviewed.synonyms = ['unrecognized file', 'unknown document', 'unknown format', 'file type unknown'];
    reviewed.use_when = 'Use when the interface shows a file with an unknown, unsupported, or unspecified type.';
    reviewed.avoid_when = 'Do not use for file errors or restricted files when the meaning is specifically unknown file type.';
    reviewed.confidence_score = 0.83;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:file_zip') {
    reviewed.label = 'Compressed File';
    reviewed.depicts = 'A file paired with a zipper cue.';
    reviewed.purpose = 'Show a compressed file, archive, or zipped document.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['compressed file', 'zip file', 'archive', 'packed file', 'file'];
    reviewed.synonyms = ['zip file', 'archived file', 'compressed document', 'packed file'];
    reviewed.use_when = 'Use when the interface refers to a compressed file or archive artifact.';
    reviewed.avoid_when = 'Do not use for ordinary files or folders when the meaning is not specifically compression or archive format.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder' || record.icon_id === 'mingcute:folder_2' || record.icon_id === 'mingcute:folder_3') {
    reviewed.label = 'Folder';
    reviewed.depicts = 'A generic folder or directory symbol.';
    reviewed.purpose = 'Show a folder, directory, or file container.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['folder', 'directory', 'container', 'browse', 'collection'];
    reviewed.synonyms = ['directory', 'file folder', 'container', 'folder item'];
    reviewed.use_when = 'Use when the interface refers to a generic folder, directory, or file container.';
    reviewed.avoid_when = 'Do not use for folder creation, protection, or transfer when a more specific folder icon exists.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_forbid') {
    reviewed.label = 'Blocked Folder';
    reviewed.depicts = 'A folder paired with a blocked or forbidden badge.';
    reviewed.purpose = 'Show a folder that is blocked, restricted, or not allowed.';
    reviewed.category = 'security';
    reviewed.intent = 'warn';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['blocked folder', 'restricted folder', 'forbidden', 'folder access', 'not allowed'];
    reviewed.synonyms = ['restricted folder', 'blocked directory', 'forbidden folder', 'folder not allowed'];
    reviewed.use_when = 'Use when the interface shows that a folder is blocked, restricted, or disallowed.';
    reviewed.avoid_when = 'Do not use for delete or generic error states when the meaning is specifically folder restriction.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_locked' || record.icon_id === 'mingcute:folder_locked_2') {
    reviewed.label = 'Locked Folder';
    reviewed.depicts = 'A folder paired with a lock cue.';
    reviewed.purpose = 'Show a folder that is locked, protected, or access-controlled.';
    reviewed.category = 'security';
    reviewed.intent = 'inform';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['locked folder', 'protected folder', 'secure folder', 'restricted directory', 'folder'];
    reviewed.synonyms = ['protected folder', 'secure directory', 'restricted folder', 'locked directory'];
    reviewed.use_when = 'Use when the interface refers to a folder that is protected or requires access control.';
    reviewed.avoid_when = 'Do not use for generic folders when the meaning is not specifically folder protection.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_minus') {
    reviewed.label = 'Remove Folder';
    reviewed.depicts = 'A folder paired with a minus or remove cue.';
    reviewed.purpose = 'Show removing a folder from the current context or unassigning a folder-like container.';
    reviewed.category = 'destructive_actions';
    reviewed.intent = 'delete';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['remove folder', 'folder minus', 'unassign folder', 'remove', 'folder'];
    reviewed.synonyms = ['remove folder', 'folder minus', 'detach folder', 'unassign folder'];
    reviewed.use_when = 'Use when the interface removes a folder from the current context or unassigns a folder-like container.';
    reviewed.avoid_when = 'Do not use for permanent folder deletion when a trash or delete-folder icon communicates that meaning better.';
    reviewed.confidence_score = 0.83;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_security') {
    reviewed.label = 'Secure Folder';
    reviewed.depicts = 'A folder paired with a security or shield cue.';
    reviewed.purpose = 'Show a secure folder, protected directory, or folder with a security safeguard.';
    reviewed.category = 'security';
    reviewed.intent = 'inform';
    reviewed.domain = 'security';
    reviewed.semantic_tags = ['secure folder', 'protected folder', 'folder security', 'trusted folder', 'folder'];
    reviewed.synonyms = ['protected folder', 'secure directory', 'trusted folder', 'folder safeguard'];
    reviewed.use_when = 'Use when the interface refers to a folder with a security safeguard or protected access model.';
    reviewed.avoid_when = 'Do not use for generic folder browsing when the meaning is not specifically folder security.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:folder_zip') {
    reviewed.label = 'Compressed Folder';
    reviewed.depicts = 'A folder paired with a zipper cue.';
    reviewed.purpose = 'Show a compressed folder, archive, or zipped directory.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['compressed folder', 'zip folder', 'archive', 'packed folder', 'folder'];
    reviewed.synonyms = ['zip folder', 'archived folder', 'compressed directory', 'packed folder'];
    reviewed.use_when = 'Use when the interface refers to a compressed folder or archive container.';
    reviewed.avoid_when = 'Do not use for ordinary folders when the meaning is not specifically compression or archive format.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:new_folder') {
    reviewed.label = 'New Folder';
    reviewed.depicts = 'A folder paired with a creation cue.';
    reviewed.purpose = 'Show creating a new folder or starting a new directory.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['new folder', 'create folder', 'new directory', 'add folder', 'folder'];
    reviewed.synonyms = ['create folder', 'new directory', 'add folder', 'start folder'];
    reviewed.use_when = 'Use when the interface creates a new folder or starts a new directory.';
    reviewed.avoid_when = 'Do not use for open-folder or generic browsing when the meaning is specifically new folder creation.';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:pause' || record.icon_id === 'mingcute:pause_circle') {
    reviewed.label = 'Pause';
    reviewed.depicts = record.icon_id.endsWith('circle')
      ? 'A pause control inside a circular boundary.'
      : 'A pause control with two vertical bars.';
    reviewed.purpose = 'Show pausing media playback, a running process, or a timed activity.';
    reviewed.category = 'media_playback';
    reviewed.intent = 'control';
    reviewed.domain = 'media';
    reviewed.semantic_tags = ['pause', 'media control', 'halt', 'temporarily stop', 'playback'];
    reviewed.synonyms = ['pause playback', 'pause media', 'temporarily stop', 'hold playback'];
    reviewed.use_when = 'Use when the interface pauses media playback, a running process, or a timed activity.';
    reviewed.avoid_when = 'Do not use for stop, disable, or blocked states when the meaning is specifically pause.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:play' || record.icon_id === 'mingcute:play_circle') {
    reviewed.label = 'Play';
    reviewed.depicts = record.icon_id.endsWith('circle')
      ? 'A play control inside a circular boundary.'
      : 'A play triangle for starting playback.';
    reviewed.purpose = 'Show starting media playback, resuming a running flow, or beginning a timed activity.';
    reviewed.category = 'media_playback';
    reviewed.intent = 'act';
    reviewed.domain = 'media';
    reviewed.semantic_tags = ['play', 'start playback', 'resume', 'media control', 'playback'];
    reviewed.synonyms = ['play media', 'start playback', 'resume playback', 'begin media'];
    reviewed.use_when = 'Use when the interface starts or resumes playback, media, or another time-based flow.';
    reviewed.avoid_when = 'Do not use for submit or generic next-step navigation when the meaning is specifically playback or timed start.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:scan' || record.icon_id === 'mingcute:scan_2') {
    reviewed.label = 'Scan';
    reviewed.depicts = 'Scan corners or a framed scan target.';
    reviewed.purpose = 'Show scanning, visual capture, or inspection of an item or visible surface.';
    reviewed.category = 'search_discovery';
    reviewed.intent = 'discover';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['scan', 'capture', 'inspect', 'visual scan', 'lookup'];
    reviewed.synonyms = ['scan item', 'capture scan', 'inspect visually', 'scan target'];
    reviewed.use_when = 'Use when the interface scans, inspects, or visually captures an item or visible surface.';
    reviewed.avoid_when = 'Do not use for generic search when the meaning is specifically scan or capture.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:skip_previous') {
    reviewed.label = 'Skip Previous';
    reviewed.depicts = 'A media control for jumping to the previous item.';
    reviewed.purpose = 'Show skipping to the previous track, clip, or item in a media sequence.';
    reviewed.category = 'media_playback';
    reviewed.intent = 'control';
    reviewed.domain = 'media';
    reviewed.semantic_tags = ['skip previous', 'previous track', 'media control', 'playback', 'back track'];
    reviewed.synonyms = ['previous track', 'skip back', 'last track', 'media previous'];
    reviewed.use_when = 'Use when the interface jumps to the previous track, clip, or item in a playback sequence.';
    reviewed.avoid_when = 'Do not use for generic back navigation when the meaning is specifically previous media or playlist item.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:stop' || record.icon_id === 'mingcute:stop_circle') {
    reviewed.label = 'Stop';
    reviewed.depicts = record.icon_id.endsWith('circle')
      ? 'A stop control inside a circular boundary.'
      : 'A square stop control.';
    reviewed.purpose = 'Show stopping media playback, recording, or a running timed activity.';
    reviewed.category = 'media_playback';
    reviewed.intent = 'control';
    reviewed.domain = 'media';
    reviewed.semantic_tags = ['stop', 'end playback', 'halt', 'media control', 'playback'];
    reviewed.synonyms = ['stop playback', 'end media', 'halt playback', 'stop media'];
    reviewed.use_when = 'Use when the interface stops media playback, recording, or another timed activity.';
    reviewed.avoid_when = 'Do not use for blocked, canceled, or disabled states when the meaning is specifically stop control.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  return reviewed;
}

function countBy(values, selector) {
  return values.reduce((counts, value) => {
    const key = selector(value);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

const selection = await readJson(selectionPath);
const worklist = await readJson(path.join(batchSourceDir, 'worklist.json'));
const candidateRecords = await readJson(path.join(batchSourceDir, 'candidate-records.json'));
const reviewQueue = await readJson(path.join(batchSourceDir, 'review-queue.json'));
const promotionDecisions = await readJsonOrDefault(path.join(libraryDir, 'promotion-decisions.json'), {
  schema_version: '1.0.0',
  batches: {},
});

const worklistById = new Map(worklist.map((item) => [item.icon_id, item]));
const candidateById = new Map(candidateRecords.map((item) => [item.icon_id, item]));
const queueById = new Map(reviewQueue.map((item) => [item.candidate_icon_id, item]));
const iconIndexById = new Map((publicIconIndex.icons || []).map((icon) => [icon.id, icon]));

const batchRecords = selection.selected_icon_ids.map((iconId) => {
  const worklistItem = worklistById.get(iconId);
  const candidateRecord = candidateById.get(iconId);
  const queueItem = queueById.get(iconId);

  if (!worklistItem || !candidateRecord || !queueItem) {
    throw new Error(`Missing MingCute staged data for ${iconId}`);
  }

  if (queueItem.queue_outcome !== 'needs_visual_review') {
    throw new Error(`Selected icon is not in the visual-review queue: ${iconId}`);
  }

  const sourceIcon = iconIndexById.get(candidateRecord.source_asset_name);
  if (!sourceIcon?.svg) {
    throw new Error(`Missing SVG payload for ${iconId}`);
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

const reviewedRecords = batchRecords.map((record) => applyPatternOverrides(buildBaseReviewedRecord(record.current_candidate_record)));

const approveForImport = [];
const holdForEditorReview = [];
const keepAsReviewedDraft = [];

for (const reviewedRecord of reviewedRecords) {
  const decision = REVIEW_DECISIONS[reviewedRecord.icon_id] || { outcome: 'approve_for_import' };

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

  throw new Error(`Unsupported review outcome for ${reviewedRecord.icon_id}`);
}

promotionDecisions.batches[BATCH_ID] = {
  approve_for_import: approveForImport,
  hold_for_editor_review: holdForEditorReview,
  keep_as_reviewed_draft: keepAsReviewedDraft,
};

const batch = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  library_id: selection.library_id,
  library_label: selection.library_label,
  purpose: selection.purpose,
  total_icons: batchRecords.length,
  counts: {
    by_family: countBy(batchRecords, (record) => record.family_key),
    by_queue: countBy(batchRecords, (record) => record.queue_outcome),
  },
  records: batchRecords,
};

const summary = {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  library_id: selection.library_id,
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
- Holds added: ${holdForEditorReview.length}
- Drafts added: ${keepAsReviewedDraft.length}

## Why this batch matters

This batch clears the remaining MingCute visual-review queue from batch 01. Most of the icons are file and folder actions, playback controls, and scan actions where the shape meaning is strong once visually confirmed.

## Why some icons were held or drafted

- alignment-plus-arrow icons still mix formatting and direction
- Google Play belongs in the future brand/logo workflow
- Play Football is too sports-specific for the generic UI semantic lane
- Direction Arrow stays too broad without stronger product context
`;

await writeJson(path.join(libraryDir, `${BATCH_ID}.json`), batch);
await writeJson(path.join(libraryDir, `${BATCH_ID}-reviewed-records.json`), {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
});
await writeJson(path.join(libraryDir, 'promotion-decisions.json'), promotionDecisions);
await writeJson(path.join(generatedDir, `${BATCH_ID}-summary.json`), summary);
await writeText(path.join(libraryDir, `${BATCH_ID}-notes.md`), notes);

console.log(`build-mingcute-visual-review-batch: batch=${batchRecords.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`);
