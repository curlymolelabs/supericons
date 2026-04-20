import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'mingcute');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = process.argv[2] || 'mingcute-visual-review-batch-01';
const selectionFileName = `${BATCH_ID.replace(/^mingcute-/, '')}-selection.json`;
const selectionPath = path.join(libraryDir, selectionFileName);
const existingBatchPath = path.join(libraryDir, `${BATCH_ID}.json`);

const REVIEW_DECISIONS = Object.freeze({
  'mingcute:air_condition_open': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The climate-device meaning is clear, but it is too product-specific for broad UI approval right now.',
  },
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
  'mingcute:direction_dot': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The dotted direction target still reads as a generic marker and needs stronger product context.',
  },
  'mingcute:diamond_square': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The abstract diamond-inside-square shape is still too broad for stable approval.',
  },
  'mingcute:fan_direction_front': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The fan-direction symbol is understandable, but it is still too appliance-specific for broad UI approval right now.',
  },
  'mingcute:google_play': {
    outcome: 'keep_as_reviewed_draft',
    note: 'This reads as a platform or brand destination and should be handled under the brand/logo workflow instead of generic UI semantics.',
  },
  'mingcute:line': {
    outcome: 'keep_as_reviewed_draft',
    note: 'This reads as the LINE messaging brand mark and should stay in the brand or logo workflow instead of the generic UI lane.',
  },
  'mingcute:play_football': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The sports meaning competes with media-playback language, so it is too context-sensitive for approval in the generic UI lane.',
  },
  'mingcute:red_packet_open': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The cultural object meaning is clear, but it still needs stronger product context before broad approval.',
  },
  'mingcute:square': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The basic square shape is too abstract to treat as a stable public semantic record by itself.',
  },
});

const BRAND_TOKENS = Object.freeze([
  'airbnb',
  'alipay',
  'android',
  'appstore',
  'apple_intelligence',
  'apple',
  'arc_browser',
  'avalanche',
  'behance',
  'bilibili',
  'binance',
  'bluesky',
  'bnb',
  'cardano',
  'carplay',
  'chrome',
  'claude',
  'codepen',
  'copilot',
  'deepseek',
  'dogecoin',
  'discord',
  'dingtalk',
  'dribbble',
  'dropbox',
  'edge',
  'facebook',
  'feishu',
  'figma',
  'firebase',
  'firefox',
  'flickr',
  'flutter',
  'framer',
  'github',
  'git_lab',
  'gitlab',
  'gmail',
  'google',
  'google_play',
  'grok',
  'gumroad',
  'homepod',
  'imac',
  'instagram',
  'ios',
  'kakao_talk',
  'lemon_squeezy',
  'line_app',
  'linkedin',
  'linear',
  'linux',
  'mastodon',
  'mastercard',
  'medium',
  'messenger',
  'meta',
  'microsoft',
  'mingcute',
  'misskey',
  'monero',
  'netflix',
  'netease_music',
  'nintendo_switch',
  'notion',
  'npm',
  'openai',
  'oracle',
  'outlook',
  'patreon',
  'paypal',
  'perplexity',
  'pinterest',
  'qq',
  'react',
  'reddit',
  'roblox',
  'safari',
  'signal',
  'siri',
  'slack',
  'snapchat',
  'spotify',
  'steam',
  'stripe',
  'telegram',
  'threads',
  'tiktok',
  'trello',
  'trello_board',
  'twitch',
  'twitter',
  'wechat',
  'weibo',
  'whatsapp',
  'visa',
  'vkontakte',
  'vscode',
  'vue',
  'xbox',
  'youtube',
]);

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

function hasBrandLikeToken(sourceName) {
  return BRAND_TOKENS.some((token) => sourceName === token || sourceName.startsWith(`${token}_`) || sourceName.includes(`_${token}_`) || sourceName.endsWith(`_${token}`));
}

function getReviewDecision(reviewedRecord) {
  if (REVIEW_DECISIONS[reviewedRecord.icon_id]) {
    return REVIEW_DECISIONS[reviewedRecord.icon_id];
  }

  if (hasBrandLikeToken(reviewedRecord.source_name) && reviewedRecord.source_name !== 'apple_fruit') {
    return {
      outcome: 'keep_as_reviewed_draft',
      note: 'This reads as a brand, platform, or product mark and should stay in the brand/logo workflow until that lane is processed.',
    };
  }

  return { outcome: 'approve_for_import' };
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

  if (record.icon_id === 'mingcute:external_link') {
    reviewed.label = 'Open External Link';
    reviewed.depicts = 'An outbound arrow leaving a square or window frame.';
    reviewed.purpose = 'Show opening a destination outside the current app, surface, or page.';
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'navigate';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['external link', 'open external', 'leave app', 'outbound', 'open outside'];
    reviewed.synonyms = ['open external link', 'open outside', 'outbound link', 'leave current page'];
    reviewed.use_when = 'Use when the interface opens a destination outside the current app, page, or product surface.';
    reviewed.avoid_when = 'Do not use for generic links when the meaning is not specifically external or outbound.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:air_condition_open') {
    reviewed.label = 'Air Conditioner Open';
    reviewed.depicts = 'An air-conditioner unit in an open or active state.';
    reviewed.purpose = 'Show an air-conditioner device in an open, active, or enabled state.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['air conditioner', 'climate device', 'open state', 'active', 'appliance'];
    reviewed.synonyms = ['air conditioner open', 'ac active', 'climate device on', 'open air conditioner'];
    reviewed.use_when = 'Use when the interface refers directly to an air-conditioner device or climate-control product state.';
    reviewed.avoid_when = 'Do not use for generic open actions when the meaning is specifically a climate device.';
    reviewed.confidence_score = 0.78;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:clock_2') {
    reviewed.label = 'Time';
    reviewed.depicts = 'A round clock face showing time.';
    reviewed.purpose = 'Show time, schedule, recency, or a time-based status cue.';
    reviewed.category = 'status_feedback';
    reviewed.intent = 'inform';
    reviewed.domain = 'product_status';
    reviewed.semantic_tags = ['time', 'clock', 'schedule', 'recent', 'history'];
    reviewed.synonyms = ['clock', 'time status', 'schedule', 'recent activity'];
    reviewed.use_when = 'Use when the interface refers to time, schedule, or recent history.';
    reviewed.avoid_when = 'Do not use for timers or countdown controls when the meaning is not general time or schedule.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:open_door') {
    reviewed.label = 'Open Door';
    reviewed.depicts = 'A door opening outward.';
    reviewed.purpose = 'Show opening a door, entering a doorway, or an exit-style door action.';
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'navigate';
    reviewed.domain = 'navigation';
    reviewed.semantic_tags = ['open door', 'door', 'entry', 'exit', 'doorway'];
    reviewed.synonyms = ['door open', 'enter doorway', 'exit door', 'open entrance'];
    reviewed.use_when = 'Use when the interface refers directly to an entry, exit, or door-opening action.';
    reviewed.avoid_when = 'Do not use for generic file open when the icon is clearly a door or entry symbol.';
    reviewed.confidence_score = 0.82;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:red_packet_open') {
    reviewed.label = 'Open Red Packet';
    reviewed.depicts = 'An opened red packet or envelope.';
    reviewed.purpose = 'Show opening a red packet, reward envelope, or culturally specific gift packet.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['red packet', 'reward envelope', 'open packet', 'gift packet', 'open'];
    reviewed.synonyms = ['open red packet', 'open reward envelope', 'gift packet', 'envelope reward'];
    reviewed.use_when = 'Use when the interface refers directly to a reward envelope, gift packet, or red-packet style product flow.';
    reviewed.avoid_when = 'Do not use for generic open actions when the meaning is not this specific object or reward pattern.';
    reviewed.confidence_score = 0.77;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:close_square' || record.icon_id === 'mingcute:close_circle' || record.icon_id === 'mingcute:close_medium') {
    reviewed.label = 'Close';
    reviewed.depicts = 'A close mark inside a button-like boundary or standalone close shape.';
    reviewed.purpose = 'Show closing, dismissing, or removing the current surface or dialog.';
    reviewed.category = 'system_control';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['close', 'dismiss', 'remove', 'exit', 'cancel'];
    reviewed.synonyms = ['dismiss', 'close surface', 'exit dialog', 'cancel close'];
    reviewed.use_when = 'Use when the interface closes a dialog, panel, modal, or removable surface.';
    reviewed.avoid_when = 'Do not use for delete when the action is not simply closing or dismissing.';
    reviewed.confidence_score = 0.88;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:close_circle_dash') {
    reviewed.label = 'Dismiss Option';
    reviewed.depicts = 'A close mark inside a dashed circular boundary.';
    reviewed.purpose = 'Show dismissing or removing a temporary option, state, or circular token.';
    reviewed.category = 'system_control';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['dismiss', 'remove option', 'close token', 'cancel', 'close'];
    reviewed.synonyms = ['dismiss option', 'remove token', 'cancel state', 'close marker'];
    reviewed.use_when = 'Use when the interface dismisses a temporary option, token, or state chip.';
    reviewed.avoid_when = 'Do not use for destructive delete when the action is just dismissing or removing a temporary element.';
    reviewed.confidence_score = 0.82;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:add_square' || record.icon_id === 'mingcute:minus_square') {
    const add = record.icon_id === 'mingcute:add_square';
    reviewed.label = add ? 'Add' : 'Remove';
    reviewed.depicts = add ? 'A plus sign inside a square button.' : 'A minus sign inside a square button.';
    reviewed.purpose = add
      ? 'Show adding, creating, or increasing within the current surface.'
      : 'Show removing, reducing, or subtracting within the current surface.';
    reviewed.category = 'system_control';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = add
      ? ['add', 'create', 'plus', 'increase', 'button']
      : ['remove', 'minus', 'decrease', 'subtract', 'button'];
    reviewed.synonyms = add
      ? ['add item', 'create', 'plus action', 'increase']
      : ['remove item', 'minus action', 'decrease', 'subtract'];
    reviewed.use_when = add
      ? 'Use when the interface adds or creates an item inside the current surface.'
      : 'Use when the interface removes, reduces, or subtracts an item inside the current surface.';
    reviewed.avoid_when = 'Do not use for navigation when the meaning is a direct add or remove control.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:bookmark_edit') {
    reviewed.label = 'Edit Bookmark';
    reviewed.depicts = 'A bookmark paired with an edit cue.';
    reviewed.purpose = 'Show editing or changing a saved bookmark, favorite, or saved reference.';
    reviewed.category = 'system_control';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['edit bookmark', 'saved item', 'favorite edit', 'bookmark', 'edit'];
    reviewed.synonyms = ['change bookmark', 'edit saved item', 'edit favorite', 'bookmark settings'];
    reviewed.use_when = 'Use when the interface edits a bookmark, favorite, or saved reference.';
    reviewed.avoid_when = 'Do not use for creating bookmarks when the meaning is specifically editing an existing saved item.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (record.icon_id.startsWith('mingcute:align_')) {
    const labelMap = {
      align_left: 'Align Left',
      align_left_2: 'Align Left',
      align_right: 'Align Right',
      align_right_2: 'Align Right',
      align_bottom: 'Align Bottom',
      align_center: 'Align Center',
      align_horizontal_center: 'Align Horizontal Center',
      align_justify: 'Align Justify',
      align_top: 'Align Top',
      align_vertical_center: 'Align Vertical Center',
    };
    reviewed.label = labelMap[record.icon_id.replace(/^mingcute:/, '')] || reviewed.label;
    reviewed.depicts = 'A formatting alignment control.';
    reviewed.purpose = 'Show text or layout alignment inside a formatted surface.';
    reviewed.category = 'data_controls';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['alignment', 'formatting', 'layout control', 'text layout', 'align'];
    reviewed.synonyms = [reviewed.label.toLowerCase(), 'alignment control', 'format text', 'layout alignment'];
    reviewed.use_when = 'Use when the interface changes alignment, formatting, or positioning inside text or layout tools.';
    reviewed.avoid_when = 'Do not use for navigation arrows when the meaning is specifically formatting or alignment.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id.startsWith('mingcute:border_')) {
    const labelMap = {
      border_blank: 'No Border',
      border_bottom: 'Bottom Border',
      border_horizontal: 'Horizontal Borders',
      border_inner: 'Inner Borders',
      border_outer: 'Outer Border',
      border_radius: 'Rounded Border',
      border_top: 'Top Border',
      border_vertical: 'Vertical Borders',
    };
    reviewed.label = labelMap[record.icon_id.replace(/^mingcute:/, '')] || reviewed.label;
    reviewed.depicts = 'A border or edge-formatting control.';
    reviewed.purpose = 'Show border formatting, border placement, or border style inside a layout or formatting tool.';
    reviewed.category = 'data_controls';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['border', 'formatting', 'layout border', 'table border', 'style'];
    reviewed.synonyms = [reviewed.label.toLowerCase(), 'border control', 'format border', 'border style'];
    reviewed.use_when = 'Use when the interface changes border styling, placement, or edge formatting.';
    reviewed.avoid_when = 'Do not use for generic containers when the meaning is specifically border formatting.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (record.icon_id.startsWith('mingcute:download')) {
    reviewed.label = 'Download';
    reviewed.depicts = 'A downward transfer or save action.';
    reviewed.purpose = 'Show downloading, saving, or pulling content into the current device or workspace.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['download', 'save', 'export', 'pull content', 'transfer'];
    reviewed.synonyms = ['download', 'save locally', 'export', 'pull down'];
    reviewed.use_when = 'Use when the interface downloads or saves content into the current device or workspace.';
    reviewed.avoid_when = 'Do not use for import or upload when the action is specifically downloading.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id.startsWith('mingcute:upload')) {
    reviewed.label = 'Upload';
    reviewed.depicts = 'An upward transfer or submit action.';
    reviewed.purpose = 'Show uploading, sending, or pushing content out from the current device or workspace.';
    reviewed.category = 'system_control';
    reviewed.intent = 'act';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['upload', 'send', 'push content', 'submit', 'transfer'];
    reviewed.synonyms = ['upload', 'send up', 'submit file', 'push out'];
    reviewed.use_when = 'Use when the interface uploads or sends content from the current device or workspace.';
    reviewed.avoid_when = 'Do not use for import or download when the action is specifically uploading.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:edit' || record.icon_id === 'mingcute:edit_2' || record.icon_id === 'mingcute:edit_3' || record.icon_id === 'mingcute:edit_4') {
    reviewed.label = 'Edit';
    reviewed.depicts = 'A pencil or editing cue.';
    reviewed.purpose = 'Show editing, modifying, or changing the current content or record.';
    reviewed.category = 'system_control';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['edit', 'modify', 'change', 'pencil', 'update'];
    reviewed.synonyms = ['edit item', 'modify', 'change content', 'update'];
    reviewed.use_when = 'Use when the interface edits or changes the current content or record.';
    reviewed.avoid_when = 'Do not use for create-new actions when the meaning is specifically editing an existing item.';
    reviewed.confidence_score = 0.88;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:fan' || record.icon_id === 'mingcute:fan_2' || record.icon_id === 'mingcute:folding_fan') {
    const labelMap = {
      fan: 'Fan',
      fan_2: 'Fan',
      folding_fan: 'Folding Fan',
    };
    reviewed.label = labelMap[record.icon_id.replace(/^mingcute:/, '')] || reviewed.label;
    reviewed.depicts = reviewed.label === 'Folding Fan' ? 'A folding hand fan.' : 'A fan or rotor symbol.';
    reviewed.purpose = reviewed.label === 'Folding Fan'
      ? 'Show a folding fan object or a decorative fan-themed surface.'
      : 'Show a fan, airflow device, or rotor-like object.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['fan', 'airflow', reviewed.label.toLowerCase(), 'device', 'object'];
    reviewed.synonyms = reviewed.label === 'Folding Fan'
      ? ['folding fan', 'hand fan', 'decorative fan', 'fan object']
      : ['fan', 'airflow device', 'rotor', 'fan object'];
    reviewed.use_when = 'Use when the interface refers directly to a fan-themed object, airflow device, or related product item.';
    reviewed.avoid_when = 'Do not use for generic refresh or rotate controls when the meaning is specifically a fan object.';
    reviewed.confidence_score = 0.8;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:fan_direction_front') {
    reviewed.label = 'Front Airflow';
    reviewed.depicts = 'An airflow or fan-direction symbol pointing forward.';
    reviewed.purpose = 'Show front-facing airflow direction or a climate-device front-direction setting.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['front airflow', 'fan direction', 'airflow setting', 'climate device', 'front'];
    reviewed.synonyms = ['fan direction front', 'front airflow', 'climate airflow', 'airflow forward'];
    reviewed.use_when = 'Use when the interface refers directly to a climate-device airflow direction or appliance setting.';
    reviewed.avoid_when = 'Do not use for general navigation or movement when the icon is clearly an airflow symbol.';
    reviewed.confidence_score = 0.76;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:follow') {
    reviewed.label = 'Follow';
    reviewed.depicts = 'A list or profile-like follow control.';
    reviewed.purpose = 'Show following, subscribing to, or tracking an item, account, or surface.';
    reviewed.category = 'communication_social';
    reviewed.intent = 'act';
    reviewed.domain = 'communication';
    reviewed.semantic_tags = ['follow', 'subscribe', 'track', 'watch', 'social'];
    reviewed.synonyms = ['follow item', 'subscribe', 'track updates', 'watch account'];
    reviewed.use_when = 'Use when the interface follows or subscribes to an item, account, or content stream.';
    reviewed.avoid_when = 'Do not use for forward navigation when the meaning is specifically following or tracking.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:git_pull_request_close') {
    reviewed.label = 'Close Pull Request';
    reviewed.depicts = 'A pull request path with a close mark.';
    reviewed.purpose = 'Show closing or ending a pull request or merge proposal in a developer workflow.';
    reviewed.category = 'engineering_developer_tools';
    reviewed.intent = 'control';
    reviewed.domain = 'developer_tools';
    reviewed.semantic_tags = ['pull request', 'close pr', 'developer', 'git', 'merge flow'];
    reviewed.synonyms = ['close pull request', 'end pr', 'close merge request', 'git workflow'];
    reviewed.use_when = 'Use when the interface closes a pull request or similar developer review flow.';
    reviewed.avoid_when = 'Do not use for generic close actions when the meaning is specifically a developer workflow state.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:layout' || /^mingcute:layout_(\d+|top|bottom)$/.test(record.icon_id)) {
    const baseName = record.icon_id.replace(/^mingcute:/, '');
    const labelMap = {
      layout: 'Layout',
      layout_2: 'Layout',
      layout_3: 'Layout',
      layout_4: 'Layout',
      layout_5: 'Layout',
      layout_6: 'Layout',
      layout_7: 'Layout',
      layout_8: 'Layout',
      layout_9: 'Layout',
      layout_10: 'Layout',
      layout_11: 'Layout',
      layout_top: 'Top Layout',
      layout_bottom: 'Bottom Layout',
    };
    reviewed.label = labelMap[baseName] || 'Layout';
    reviewed.depicts = 'A shell or panel layout arrangement.';
    reviewed.purpose = 'Show a layout preset, panel arrangement, or shell structure choice.';
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_shell';
    reviewed.semantic_tags = ['layout', 'panel layout', 'shell arrangement', 'view preset', 'ui shell'];
    reviewed.synonyms = [reviewed.label.toLowerCase(), 'layout preset', 'panel arrangement', 'shell layout'];
    reviewed.use_when = 'Use when the interface switches to or labels a specific shell layout or panel arrangement.';
    reviewed.avoid_when = 'Do not use for back, forward, or file-open actions when the meaning is layout choice.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (/^mingcute:layout_(bottom|leftbar|rightbar|top)_(open|close)$/.test(record.icon_id)) {
    const match = record.icon_id.match(/^mingcute:layout_(bottom|leftbar|rightbar|top)_(open|close)$/);
    const region = match?.[1] || 'panel';
    const mode = match?.[2] || 'open';
    const regionLabelMap = {
      bottom: 'Bottom Panel',
      leftbar: 'Left Sidebar',
      rightbar: 'Right Sidebar',
      top: 'Top Panel',
    };
    const regionLabel = regionLabelMap[region] || 'Panel';
    reviewed.label = `${mode === 'open' ? 'Open' : 'Close'} ${regionLabel}`;
    reviewed.depicts = `A shell layout icon showing the ${regionLabel.toLowerCase()} ${mode === 'open' ? 'opening' : 'closing'}.`;
    reviewed.purpose = mode === 'open'
      ? `Show opening or expanding the ${regionLabel.toLowerCase()} in the current shell layout.`
      : `Show closing or collapsing the ${regionLabel.toLowerCase()} in the current shell layout.`;
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_shell';
    reviewed.semantic_tags = [mode, regionLabel.toLowerCase(), 'layout', 'panel control', 'ui shell'];
    reviewed.synonyms = [`${mode} ${regionLabel.toLowerCase()}`, `${regionLabel.toLowerCase()} ${mode}`, 'panel layout control', 'shell panel'];
    reviewed.use_when = `Use when the interface opens or closes the ${regionLabel.toLowerCase()} in a shell or panel layout.`;
    reviewed.avoid_when = 'Do not use for file open or generic navigation when the meaning is a panel layout control.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:link' || record.icon_id === 'mingcute:link_2' || record.icon_id === 'mingcute:link_3') {
    reviewed.label = 'Link';
    reviewed.depicts = 'A linked-chain symbol.';
    reviewed.purpose = 'Show linking, a connected reference, or a hyperlink-style connection.';
    reviewed.category = 'system_control';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['link', 'connection', 'hyperlink', 'connected', 'reference'];
    reviewed.synonyms = ['linked', 'hyperlink', 'connection', 'connected reference'];
    reviewed.use_when = 'Use when the interface shows a link, connected reference, or hyperlink-like action.';
    reviewed.avoid_when = 'Do not use for files when the meaning is a general link or connection cue.';
    reviewed.confidence_score = 0.84;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:map_pin') {
    reviewed.label = 'Map Pin';
    reviewed.depicts = 'A location pin marker.';
    reviewed.purpose = 'Show a place, saved location, or map marker.';
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'inform';
    reviewed.domain = 'navigation';
    reviewed.semantic_tags = ['map pin', 'location', 'marker', 'place', 'map'];
    reviewed.synonyms = ['location pin', 'map marker', 'place marker', 'saved location'];
    reviewed.use_when = 'Use when the interface refers to a place, map marker, or saved location.';
    reviewed.avoid_when = 'Do not use for generic save or pin controls when the meaning is specifically location or place.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:direction_dot') {
    reviewed.label = 'Direction Target';
    reviewed.depicts = 'A dotted circular target with directional meaning.';
    reviewed.purpose = 'Show a directional marker, orientation target, or a generic direction indicator.';
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'inform';
    reviewed.domain = 'navigation';
    reviewed.semantic_tags = ['direction target', 'orientation', 'marker', 'direction', 'target'];
    reviewed.synonyms = ['direction marker', 'orientation target', 'direction indicator', 'target marker'];
    reviewed.use_when = 'Use when the interface refers directly to orientation or a target-like direction marker.';
    reviewed.avoid_when = 'Do not use for ordinary location pins or navigation arrows when the meaning is this specific target symbol.';
    reviewed.confidence_score = 0.74;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:diamond_square') {
    reviewed.label = 'Diamond Shape';
    reviewed.depicts = 'A diamond set inside a square frame.';
    reviewed.purpose = 'Show a geometric diamond-inside-square shape or an abstract shape option.';
    reviewed.category = 'status_feedback';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['diamond shape', 'abstract shape', 'geometry', 'diamond', 'square'];
    reviewed.synonyms = ['diamond inside square', 'abstract diamond', 'geometric shape', 'shape option'];
    reviewed.use_when = 'Use when the interface refers directly to this abstract geometric shape or a shape selection surface.';
    reviewed.avoid_when = 'Do not use for generic status or action meanings when the icon is just an abstract shape.';
    reviewed.confidence_score = 0.72;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:pin' || record.icon_id === 'mingcute:pin_2') {
    reviewed.label = 'Pin';
    reviewed.depicts = 'A pin or pushpin symbol.';
    reviewed.purpose = 'Show pinning, saving a spot, or keeping an item fixed in place.';
    reviewed.category = 'system_control';
    reviewed.intent = 'control';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['pin', 'keep in place', 'save spot', 'fixed', 'pushpin'];
    reviewed.synonyms = ['pin item', 'keep pinned', 'save spot', 'fix in place'];
    reviewed.use_when = 'Use when the interface pins or fixes an item in place.';
    reviewed.avoid_when = 'Do not use for location markers when the meaning is a general pin control rather than a place.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:profile') {
    reviewed.label = 'Profile';
    reviewed.depicts = 'An ID-card or profile panel symbol.';
    reviewed.purpose = 'Show a profile, account card, or identity details surface.';
    reviewed.category = 'navigation_interface';
    reviewed.intent = 'navigate';
    reviewed.domain = 'communication';
    reviewed.semantic_tags = ['profile', 'account', 'identity', 'user card', 'details'];
    reviewed.synonyms = ['account profile', 'user profile', 'identity card', 'profile details'];
    reviewed.use_when = 'Use when the interface opens or labels a profile, account details, or identity surface.';
    reviewed.avoid_when = 'Do not use for generic user presence when the meaning is a profile or account panel.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:question' || record.icon_id === 'mingcute:question_2') {
    reviewed.label = 'Help';
    reviewed.depicts = 'A question-mark help cue.';
    reviewed.purpose = 'Show help, uncertainty, or a prompt for more explanation.';
    reviewed.category = 'status_feedback';
    reviewed.intent = 'inform';
    reviewed.domain = 'product_status';
    reviewed.semantic_tags = ['help', 'question', 'support', 'uncertain', 'info'];
    reviewed.synonyms = ['help', 'support', 'question', 'need explanation'];
    reviewed.use_when = 'Use when the interface asks for clarification, opens help, or marks an uncertain state.';
    reviewed.avoid_when = 'Do not use for warning or error states when the meaning is general help or question.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (/^mingcute:rewind_backward_square_/.test(record.icon_id)) {
    reviewed.label = 'Rewind';
    reviewed.depicts = 'A rewind control with a time step label.';
    reviewed.purpose = 'Show jumping backward by a fixed number of seconds in media playback.';
    reviewed.category = 'media_playback';
    reviewed.intent = 'control';
    reviewed.domain = 'media';
    reviewed.semantic_tags = ['rewind', 'jump back', 'media control', 'skip backward', 'playback'];
    reviewed.synonyms = ['rewind playback', 'jump backward', 'skip back', 'back seconds'];
    reviewed.use_when = 'Use when the interface rewinds playback by a fixed time step.';
    reviewed.avoid_when = 'Do not use for generic back navigation when the meaning is media rewind.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id === 'mingcute:square') {
    reviewed.label = 'Square Shape';
    reviewed.depicts = 'A simple square outline.';
    reviewed.purpose = 'Show a square shape, shape selection, or an abstract square marker.';
    reviewed.category = 'status_feedback';
    reviewed.intent = 'inform';
    reviewed.domain = 'ui_controls';
    reviewed.semantic_tags = ['square', 'shape', 'geometry', 'marker', 'abstract'];
    reviewed.synonyms = ['square shape', 'geometric square', 'shape option', 'square marker'];
    reviewed.use_when = 'Use when the interface refers directly to a square shape or a shape-selection surface.';
    reviewed.avoid_when = 'Do not use for generic stop or checkbox meanings when the icon is only an abstract square.';
    reviewed.confidence_score = 0.7;
    return reviewed;
  }

  if (/^mingcute:user(_\d+)?$/.test(record.icon_id)) {
    reviewed.label = 'User';
    reviewed.depicts = 'A user or profile silhouette.';
    reviewed.purpose = 'Show a user, profile, member, or account identity.';
    reviewed.category = 'communication_social';
    reviewed.intent = 'inform';
    reviewed.domain = 'communication';
    reviewed.semantic_tags = ['user', 'profile', 'member', 'account', 'person'];
    reviewed.synonyms = ['profile', 'member', 'account', 'person'];
    reviewed.use_when = 'Use when the interface refers to a user, member, profile, or account identity.';
    reviewed.avoid_when = 'Do not use for specific profile actions when the meaning is a generic user identity only.';
    reviewed.confidence_score = 0.86;
    reviewed.confidence_band = 'high';
    return reviewed;
  }

  if (record.icon_id.startsWith('mingcute:user_')) {
    const labelMap = {
      user_add: 'Add User',
      user_add_2: 'Add User',
      user_edit: 'Edit User',
      user_follow: 'Follow User',
      user_follow_2: 'Follow User',
      user_forbid: 'Block User',
      user_hide: 'Hide User',
      user_pin: 'Pin User',
      user_question: 'User Help',
      user_remove: 'Remove User',
      user_remove_2: 'Remove User',
      user_security: 'User Security',
      user_setting: 'User Settings',
      user_visible: 'Visible User',
      user_x: 'Remove User',
    };
    reviewed.label = labelMap[record.icon_id.replace(/^mingcute:/, '')] || reviewed.label;
    reviewed.depicts = 'A user silhouette paired with a specific account action or status cue.';
    reviewed.purpose = `${reviewed.label} action or status for a user profile or account.`;
    reviewed.category = reviewed.label.includes('Security') ? 'security' : reviewed.label.includes('Follow') ? 'communication_social' : 'system_control';
    reviewed.intent = reviewed.label.includes('Visible') || reviewed.label.includes('Help') ? 'inform' : 'control';
    reviewed.domain = reviewed.label.includes('Security') ? 'security' : 'communication';
    reviewed.semantic_tags = ['user', 'profile action', reviewed.label.toLowerCase(), 'account', 'member'];
    reviewed.synonyms = [reviewed.label.toLowerCase(), 'user action', 'profile control', 'account control'];
    reviewed.use_when = 'Use when the interface applies or shows a specific user-profile action or account state.';
    reviewed.avoid_when = 'Do not use for generic user identity when the meaning is a specific user action or state.';
    reviewed.confidence_score = 0.85;
    return reviewed;
  }

  if (record.icon_id === 'mingcute:notification' || record.icon_id === 'mingcute:notification_newdot' || record.icon_id === 'mingcute:notification_off') {
    const labelMap = {
      notification: 'Notifications',
      notification_newdot: 'New Notification',
      notification_off: 'Notifications Off',
    };
    reviewed.label = labelMap[record.icon_id.replace(/^mingcute:/, '')] || reviewed.label;
    reviewed.depicts = 'A bell-based notification symbol.';
    reviewed.purpose = record.icon_id.endsWith('off')
      ? 'Show muted, disabled, or turned-off notifications.'
      : record.icon_id.endsWith('newdot')
        ? 'Show a newly arrived notification or unread alert.'
        : 'Show notifications, alerts, or incoming event attention.';
    reviewed.category = 'status_feedback';
    reviewed.intent = 'inform';
    reviewed.domain = 'product_status';
    reviewed.semantic_tags = ['notification', 'alert', 'bell', 'inbox status', 'attention'];
    reviewed.synonyms = [reviewed.label.toLowerCase(), 'alerts', 'notification state', 'bell status'];
    reviewed.use_when = 'Use when the interface shows notification status, unread alerts, or muted notification state.';
    reviewed.avoid_when = 'Do not use for general warning states when the meaning is specifically notifications.';
    reviewed.confidence_score = 0.87;
    reviewed.confidence_band = 'high';
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
const sourceBatchId = selection.source_batch_id || 'mingcute-batch-01';
const batchSourceDir = path.join(automationRoot, sourceBatchId);
const worklist = await readJson(path.join(batchSourceDir, 'worklist.json'));
const candidateRecords = await readJson(path.join(batchSourceDir, 'candidate-records.json'));
const reviewQueue = await readJson(path.join(batchSourceDir, 'review-queue.json'));
const promotionDecisions = await readJsonOrDefault(path.join(libraryDir, 'promotion-decisions.json'), {
  schema_version: '1.0.0',
  batches: {},
});
const existingBatch = await readJsonOrDefault(existingBatchPath, { records: [] });

const worklistById = new Map(worklist.map((item) => [item.icon_id, item]));
const candidateById = new Map(candidateRecords.map((item) => [item.icon_id, item]));
const queueById = new Map(reviewQueue.map((item) => [item.candidate_icon_id, item]));
const iconIndexById = new Map((publicIconIndex.icons || []).map((icon) => [icon.id, icon]));
const existingRecordsById = new Map((existingBatch.records || []).map((record) => [record.icon_id, record]));

const resolvedOtherBatchIds = getDecisionIconIds(promotionDecisions.batches, BATCH_ID);
const liveSelectedIds = Array.isArray(selection.selected_icon_ids) && selection.selected_icon_ids.length > 0
  ? selection.selected_icon_ids
  : reviewQueue
      .filter((item) => item.queue_outcome === 'needs_visual_review' && !resolvedOtherBatchIds.has(item.candidate_icon_id))
      .map((item) => item.candidate_icon_id);
const savedSelectedIds = (existingBatch.records || []).map((record) => record.icon_id);
const selectedIds = savedSelectedIds.length >= liveSelectedIds.length ? savedSelectedIds : liveSelectedIds;

const batchRecords = selectedIds.map((iconId) => {
  const savedRecord = existingRecordsById.get(iconId);
  if (savedRecord && !candidateById.has(iconId)) {
    return savedRecord;
  }

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
  const decision = getReviewDecision(reviewedRecord);

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
  source_batch_id: sourceBatchId,
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
  source_batch_id: sourceBatchId,
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

await writeJson(existingBatchPath, batch);
await writeJson(path.join(libraryDir, `${BATCH_ID}-reviewed-records.json`), {
  schema_version: '1.0.0',
  batch_id: BATCH_ID,
  reviewed_records: reviewedRecords,
});
await writeJson(path.join(libraryDir, 'promotion-decisions.json'), promotionDecisions);
await writeJson(path.join(generatedDir, `${BATCH_ID}-summary.json`), summary);
await writeText(path.join(libraryDir, `${BATCH_ID}-notes.md`), notes);

console.log(`build-mingcute-visual-review-batch: batch=${batchRecords.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`);
