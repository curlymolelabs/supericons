import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import publicIconIndex from '../public/icon-index.json' with { type: 'json' };

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const automationRoot = path.join(repoRoot, 'data', 'si-registry', 'automation');
const libraryDir = path.join(automationRoot, 'mingcute');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');

const BATCH_ID = process.argv[2] || 'mingcute-editor-review-batch-01';
const selectionFileName = `${BATCH_ID.replace(/^mingcute-/, '')}-selection.json`;
const selectionPath = path.join(libraryDir, selectionFileName);
const existingBatchPath = path.join(libraryDir, `${BATCH_ID}.json`);

const REVIEW_DECISIONS = Object.freeze({
  'mingcute:align_arrow_down': {
    outcome: 'hold_for_editor_review',
    note: 'The alignment-and-arrow combination still mixes formatting layout and directional movement too broadly.',
  },
  'mingcute:align_arrow_up': {
    outcome: 'hold_for_editor_review',
    note: 'The alignment-and-arrow combination still mixes formatting layout and directional movement too broadly.',
  },
  'mingcute:border_left': {
    outcome: 'keep_as_reviewed_draft',
    note: 'This can read as a layout border control or a left-edge direction cue, so it stays too context-sensitive for approval.',
  },
  'mingcute:border_right': {
    outcome: 'keep_as_reviewed_draft',
    note: 'This can read as a layout border control or a right-edge direction cue, so it stays too context-sensitive for approval.',
  },
  'mingcute:delete_back': {
    outcome: 'hold_for_editor_review',
    note: 'The icon still drifts between backward delete, backspace, and back navigation without tighter product context.',
  },
  'mingcute:high_voltage_power': {
    outcome: 'hold_for_editor_review',
    note: 'The bolt-and-power reading still mixes power control, electrical hazard, and high-energy status too broadly.',
  },
  'mingcute:home_wifi': {
    outcome: 'hold_for_editor_review',
    note: 'The icon still drifts between a home destination and a connected smart-home or Wi-Fi context.',
  },
  'mingcute:record_mail': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The mail-plus-record meaning still spans logged mail, recorded mail, and message history too broadly.',
  },
  'mingcute:refresh_4_ai': {
    outcome: 'hold_for_editor_review',
    note: 'The AI refresh loop still mixes rerun, regenerate, and refresh-state meanings without stronger nearby context.',
  },
  'mingcute:search_2_none': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The search-with-none state still needs stronger interface context before it can be treated as a stable public semantic record.',
  },
  'mingcute:search_none': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The search-with-none state still needs stronger interface context before it can be treated as a stable public semantic record.',
  },
  'mingcute:lie_down': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The person posture reads more like a real-world body action than a stable UI semantic pattern.',
  },
  'mingcute:look_down': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The face-direction icon is still too context-sensitive to treat as a stable public UI meaning.',
  },
  'mingcute:look_left': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The face-direction icon is still too context-sensitive to treat as a stable public UI meaning.',
  },
  'mingcute:look_right': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The face-direction icon is still too context-sensitive to treat as a stable public UI meaning.',
  },
  'mingcute:look_up': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The face-direction icon is still too context-sensitive to treat as a stable public UI meaning.',
  },
  'mingcute:warm_up': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The exercise-style figure reads as a real-world warm-up action, not a stable product semantic.',
  },
  'mingcute:warm_up_2': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The exercise-style figure reads as a real-world warm-up action, not a stable product semantic.',
  },
  'mingcute:warm_up_3': {
    outcome: 'keep_as_reviewed_draft',
    note: 'The exercise-style figure reads as a real-world warm-up action, not a stable product semantic.',
  },
});

const LEFT_IDS = new Set([
  'mingcute:arrow_left',
  'mingcute:arrow_left_circle',
  'mingcute:arrow_to_left',
  'mingcute:arrows_left',
  'mingcute:large_arrow_left',
  'mingcute:square_arrow_left',
]);
const RIGHT_IDS = new Set([
  'mingcute:arrow_right',
  'mingcute:arrow_right_circle',
  'mingcute:arrow_to_right',
  'mingcute:arrows_right',
  'mingcute:large_arrow_right',
  'mingcute:square_arrow_right',
]);
const UP_IDS = new Set([
  'mingcute:arrow_up',
  'mingcute:arrow_up_circle',
  'mingcute:arrow_to_up',
  'mingcute:arrows_up',
  'mingcute:large_arrow_up',
  'mingcute:square_arrow_up',
  'mingcute:fan_direction_up',
  'mingcute:escalator_up',
]);
const DOWN_IDS = new Set([
  'mingcute:arrow_down',
  'mingcute:arrow_down_circle',
  'mingcute:arrow_to_down',
  'mingcute:arrows_down',
  'mingcute:large_arrow_down',
  'mingcute:square_arrow_down',
  'mingcute:fan_direction_down',
  'mingcute:escalator_down',
  'mingcute:down',
]);
const DOWN_LEFT_IDS = new Set([
  'mingcute:arrow_left_down',
  'mingcute:arrow_left_down_circle',
  'mingcute:corner_down_left',
]);
const UP_LEFT_IDS = new Set([
  'mingcute:arrow_left_up',
  'mingcute:arrow_left_up_circle',
  'mingcute:corner_up_left',
]);
const DOWN_RIGHT_IDS = new Set([
  'mingcute:arrow_right_down',
  'mingcute:arrow_right_down_circle',
  'mingcute:corner_down_right',
]);
const UP_RIGHT_IDS = new Set([
  'mingcute:arrow_right_up',
  'mingcute:arrow_right_up_circle',
  'mingcute:corner_up_right',
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

function normalizeEvidenceSources(values) {
  return [...new Set((values || []).map((value) => String(value).replaceAll('_', '-')))];
}

function buildBaseReviewedRecord(candidateRecord) {
  const confidenceScore = candidateRecord.confidence ?? 0.84;
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
    evidence_sources: normalizeEvidenceSources(candidateRecord.evidence || ['source_name', 'editorial_judgment']),
    confidence_score: confidenceScore,
    confidence_band: confidenceScore >= 0.86 ? 'high' : 'medium',
  };
}

function withOverrides(record, overrides) {
  const reviewed = { ...record, ...overrides };
  const confidenceScore = overrides.confidence_score ?? record.confidence_score;
  reviewed.confidence_score = confidenceScore;
  reviewed.confidence_band = confidenceScore >= 0.86 ? 'high' : 'medium';
  return reviewed;
}

function applyDirectionalOverride(record, directionLabel) {
  const lower = directionLabel.toLowerCase();
  return withOverrides(record, {
    label: `Move ${directionLabel}`,
    depicts: `A directional arrow pointing ${lower}.`,
    purpose: `Show moving, stepping, or navigating ${lower} within a layout, list, map, or directional interface.`,
    category: 'navigation_interface',
    intent: 'navigate',
    domain: 'navigation',
    semantic_tags: [`move ${lower}`, `${lower} direction`, 'arrow', 'navigation', 'direction'],
    synonyms: [`go ${lower}`, `${lower} arrow`, `${lower} movement`, `navigate ${lower}`],
    use_when: `Use when the interface moves, steps, or navigates ${lower} in a directional context.`,
    avoid_when: 'Do not use for undo, retry, or back-stack navigation when the meaning is spatial movement or directional stepping.',
    confidence_score: Math.max(record.confidence_score, 0.87),
  });
}

function applyPatternOverrides(record) {
  const reviewed = { ...record };

  if (record.icon_id.startsWith('mingcute:search') && record.icon_id.includes('_ai')) {
    return withOverrides(reviewed, {
      label: 'AI Search',
      depicts: 'A search symbol paired with an AI marker.',
      purpose: 'Show AI-assisted search, agent lookup, or model-guided retrieval.',
      category: 'search_discovery',
      intent: 'discover',
      domain: 'ai_agents',
      semantic_tags: ['ai search', 'assistant search', 'retrieval', 'lookup', 'search'],
      synonyms: ['assistant search', 'ai lookup', 'model search', 'retrieval search'],
      use_when: 'Use when the interface offers AI-assisted retrieval, model-guided lookup, or assistant-powered search.',
      avoid_when: 'Do not use for ordinary search when there is no AI, assistant, or model-guided search meaning.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id === 'mingcute:file_search') {
    return withOverrides(reviewed, {
      label: 'File Search',
      depicts: 'A file shape paired with a search cue.',
      purpose: 'Show searching within files, code assets, or file-based content.',
      category: 'search_discovery',
      intent: 'discover',
      domain: 'developer_tools',
      semantic_tags: ['file search', 'search files', 'find file', 'lookup', 'developer search'],
      synonyms: ['search files', 'find file', 'file lookup', 'code file search'],
      use_when: 'Use when the interface searches for files, documents, or code assets by name or contents.',
      avoid_when: 'Do not use for folder-only search or generic search when the meaning is specifically file lookup.',
    });
  }

  if (record.icon_id === 'mingcute:folder_delete') {
    return withOverrides(reviewed, {
      label: 'Delete Folder',
      depicts: 'A folder paired with a delete cue.',
      purpose: 'Show deleting, removing, or discarding a folder or container.',
      category: 'destructive_actions',
      intent: 'delete',
      domain: 'ui_controls',
      semantic_tags: ['delete folder', 'remove folder', 'discard folder', 'trash', 'destructive'],
      synonyms: ['remove folder', 'trash folder', 'delete container', 'discard folder'],
      use_when: 'Use when the interface deletes or removes a folder, container, or grouped item.',
      avoid_when: 'Do not use for generic delete when the meaning is not specifically a folder or container.',
    });
  }

  if (record.icon_id === 'mingcute:list_check') {
    return withOverrides(reviewed, {
      label: 'Checklist Complete',
      depicts: 'A list paired with a completion check.',
      purpose: 'Show a completed checklist, confirmed list item, or checked list state.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['checklist', 'complete', 'checked', 'confirmed', 'done'],
      synonyms: ['checklist complete', 'checked list', 'list done', 'confirmed list'],
      use_when: 'Use when the interface shows that a checklist or list item is complete, confirmed, or checked off.',
      avoid_when: 'Do not use for send, submit, or approval states that are not tied to a list or checklist.',
    });
  }

  if (record.icon_id === 'mingcute:list_search') {
    return withOverrides(reviewed, {
      label: 'Search List',
      depicts: 'A list paired with a search cue.',
      purpose: 'Show searching within a visible list, records table, or scoped list view.',
      category: 'search_discovery',
      intent: 'discover',
      domain: 'ui_controls',
      semantic_tags: ['list search', 'search list', 'lookup', 'find items', 'discover'],
      synonyms: ['search list', 'find in list', 'lookup items', 'search results list'],
      use_when: 'Use when the interface searches inside a visible list, table, or scoped result set.',
      avoid_when: 'Do not use for global search when the meaning is specifically list or table search.',
    });
  }

  if (record.icon_id === 'mingcute:list_check_2' || record.icon_id === 'mingcute:list_check_3') {
    return withOverrides(reviewed, {
      label: 'Checklist View',
      depicts: 'A list view paired with check indicators.',
      purpose: 'Show a checklist view, checked list layout, or task list surface.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['checklist view', 'task list', 'checked list', 'list layout', 'view'],
      synonyms: ['task list view', 'checklist layout', 'checked list view', 'list with checks'],
      use_when: 'Use when the interface switches to or labels a checklist or task-list view.',
      avoid_when: 'Do not use for a single completed item when the meaning is specifically a full list view.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:list_expansion') {
    return withOverrides(reviewed, {
      label: 'Expand List',
      depicts: 'A list paired with expand controls.',
      purpose: 'Show expanding a list, opening more list rows, or revealing additional items in a list view.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['expand list', 'show more items', 'open list', 'list control', 'expand'],
      synonyms: ['expand list', 'show more rows', 'open more items', 'list expansion'],
      use_when: 'Use when the interface expands a visible list or reveals more list items.',
      avoid_when: 'Do not use for generic list view when the meaning is specifically expansion or reveal.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:list_ordered') {
    return withOverrides(reviewed, {
      label: 'Ordered List',
      depicts: 'A numbered list layout.',
      purpose: 'Show an ordered list, ranked list, or numbered sequence view.',
      category: 'navigation_interface',
      intent: 'inform',
      domain: 'ui_shell',
      semantic_tags: ['ordered list', 'numbered list', 'ranked list', 'sequence', 'list view'],
      synonyms: ['numbered list', 'ranked list', 'ordered items', 'sequence list'],
      use_when: 'Use when the interface shows or switches to a numbered list, ranked list, or ordered sequence.',
      avoid_when: 'Do not use for plain list views when the numbered order itself is not important.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:layout_left' || record.icon_id === 'mingcute:layout_right') {
    const isLeft = record.icon_id.endsWith('left');
    return withOverrides(reviewed, {
      label: isLeft ? 'Left Panel Layout' : 'Right Panel Layout',
      depicts: isLeft ? 'A layout with a strong left-side panel.' : 'A layout with a strong right-side panel.',
      purpose: isLeft
        ? 'Show a layout mode where the main side panel sits on the left.'
        : 'Show a layout mode where the main side panel sits on the right.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: isLeft
        ? ['left panel', 'left sidebar', 'layout', 'panel layout', 'ui shell']
        : ['right panel', 'right sidebar', 'layout', 'panel layout', 'ui shell'],
      synonyms: isLeft
        ? ['left sidebar layout', 'left panel view', 'left rail layout', 'left shell']
        : ['right sidebar layout', 'right panel view', 'right rail layout', 'right shell'],
      use_when: isLeft
        ? 'Use when the interface switches to or labels a layout with a left-side panel or sidebar.'
        : 'Use when the interface switches to or labels a layout with a right-side panel or sidebar.',
      avoid_when: 'Do not use for back or forward navigation when the meaning is specifically a shell layout choice.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:text_direction_left' || record.icon_id === 'mingcute:text_direction_right') {
    const isLeft = record.icon_id.endsWith('left');
    return withOverrides(reviewed, {
      label: isLeft ? 'Left Text Direction' : 'Right Text Direction',
      depicts: isLeft ? 'A text direction control pointing left.' : 'A text direction control pointing right.',
      purpose: isLeft
        ? 'Show switching text direction toward the left or applying a left-direction text flow.'
        : 'Show switching text direction toward the right or applying a right-direction text flow.',
      category: 'data_controls',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: isLeft
        ? ['text direction', 'left text', 'writing direction', 'formatting', 'layout']
        : ['text direction', 'right text', 'writing direction', 'formatting', 'layout'],
      synonyms: isLeft
        ? ['left text flow', 'text left direction', 'left writing direction', 'text direction left']
        : ['right text flow', 'text right direction', 'right writing direction', 'text direction right'],
      use_when: isLeft
        ? 'Use when the interface changes writing direction, text flow, or formatting toward the left.'
        : 'Use when the interface changes writing direction, text flow, or formatting toward the right.',
      avoid_when: 'Do not use for navigation arrows when the meaning is specifically text formatting or writing direction.',
      confidence_score: 0.85,
    });
  }

  if (record.icon_id === 'mingcute:thumb_up_2' || record.icon_id === 'mingcute:thumb_down_2') {
    const isUp = record.icon_id.includes('thumb_up');
    return withOverrides(reviewed, {
      label: isUp ? 'Approval' : 'Disapproval',
      depicts: isUp ? 'A thumbs-up approval gesture.' : 'A thumbs-down disapproval gesture.',
      purpose: isUp
        ? 'Show positive feedback, approval, or a liked state.'
        : 'Show negative feedback, disapproval, or a disliked state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: isUp
        ? ['approval', 'positive feedback', 'like', 'endorsed', 'thumbs up']
        : ['disapproval', 'negative feedback', 'dislike', 'rejected', 'thumbs down'],
      synonyms: isUp
        ? ['liked', 'approved', 'positive response', 'endorsement']
        : ['disliked', 'rejected', 'negative response', 'downvote'],
      use_when: isUp
        ? 'Use when the interface shows positive feedback, approval, or a liked state.'
        : 'Use when the interface shows negative feedback, disapproval, or a disliked state.',
      avoid_when: 'Do not use for spatial movement or navigation when the meaning is sentiment or feedback.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id === 'mingcute:user_info') {
    return withOverrides(reviewed, {
      label: 'User Info',
      depicts: 'A user profile paired with an information cue.',
      purpose: 'Show profile details, account information, or user-specific help and metadata.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: ['user info', 'profile details', 'account information', 'user help', 'metadata'],
      synonyms: ['profile info', 'account details', 'user details', 'member information'],
      use_when: 'Use when the interface opens or labels profile details, account information, or user-specific metadata.',
      avoid_when: 'Do not use for generic info badges when the meaning is specifically tied to a user or profile.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:quote_left' || record.icon_id === 'mingcute:quote_right') {
    const isLeft = record.icon_id.endsWith('left');
    return withOverrides(reviewed, {
      label: isLeft ? 'Opening Quote' : 'Closing Quote',
      depicts: isLeft ? 'An opening quotation mark.' : 'A closing quotation mark.',
      purpose: isLeft
        ? 'Show the start of a quoted statement, testimonial, or cited passage.'
        : 'Show the end of a quoted statement, testimonial, or cited passage.',
      category: 'communication_social',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: isLeft
        ? ['opening quote', 'quoted text', 'testimonial', 'citation', 'quote mark']
        : ['closing quote', 'quoted text', 'testimonial', 'citation', 'quote mark'],
      synonyms: isLeft
        ? ['quote start', 'start quote', 'testimonial quote', 'opening quotation']
        : ['quote end', 'end quote', 'testimonial close', 'closing quotation'],
      use_when: 'Use when the interface labels quoted text, testimonials, or cited passages.',
      avoid_when: 'Do not use for back or forward navigation when the symbol is clearly a quotation mark.',
      confidence_score: 0.84,
    });
  }

  if (record.icon_id === 'mingcute:list_collapse') {
    return withOverrides(reviewed, {
      label: 'Collapse List',
      depicts: 'A list layout paired with a collapse or compacting cue.',
      purpose: 'Show collapsing, compacting, or folding a visible list section.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['collapse list', 'compact list', 'fold list', 'list control', 'collapse'],
      synonyms: ['compact list', 'fold list', 'collapse section', 'shrink list'],
      use_when: 'Use when the interface collapses or compacts a visible list or section.',
      avoid_when: 'Do not use for generic list view or density changes when the meaning is not specifically collapse.',
      confidence_score: 0.84,
    });
  }

  if (record.icon_id === 'mingcute:toggle_right' || record.icon_id === 'mingcute:toggle_right_2') {
    return withOverrides(reviewed, {
      label: 'Enabled Toggle',
      depicts: 'A toggle switch in the on position.',
      purpose: 'Show that a setting, control, or feature is switched on or enabled.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'ui_controls',
      semantic_tags: ['toggle', 'enabled', 'on', 'active', 'switch'],
      synonyms: ['enabled', 'switch on', 'active toggle', 'toggle on'],
      use_when: 'Use when the interface shows an enabled setting or active on-state.',
      avoid_when: 'Do not use for generic success or approval when the meaning is not a toggle state.',
    });
  }

  if (record.icon_id === 'mingcute:toggle_left' || record.icon_id === 'mingcute:toggle_left_2') {
    return withOverrides(reviewed, {
      label: 'Disabled Toggle',
      depicts: 'A toggle switch in the off position.',
      purpose: 'Show that a setting, control, or feature is switched off or disabled.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'ui_controls',
      semantic_tags: ['toggle', 'disabled', 'off', 'inactive', 'switch'],
      synonyms: ['disabled', 'switch off', 'inactive toggle', 'toggle off'],
      use_when: 'Use when the interface shows a disabled setting or inactive off-state.',
      avoid_when: 'Do not use for blocked errors or canceled actions when the meaning is specifically a toggle state.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id.startsWith('mingcute:az_sort_ascending')) {
    return withOverrides(reviewed, {
      label: 'Sort A to Z',
      depicts: 'A sort control for alphabetical ascending order.',
      purpose: 'Show sorting text items from A to Z.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort', 'alphabetical', 'ascending', 'a to z', 'order'],
      synonyms: ['sort alphabetically', 'ascending letters', 'a to z', 'sort ascending'],
      use_when: 'Use when the interface sorts text or labels in alphabetical ascending order.',
      avoid_when: 'Do not use for numeric sorting or generic filtering when the meaning is specifically alphabetical order.',
    });
  }

  if (record.icon_id.startsWith('mingcute:az_sort_descending')) {
    return withOverrides(reviewed, {
      label: 'Sort Z to A',
      depicts: 'A sort control for alphabetical descending order.',
      purpose: 'Show sorting text items from Z to A.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort', 'alphabetical', 'descending', 'z to a', 'order'],
      synonyms: ['sort reverse alphabetically', 'descending letters', 'z to a', 'sort descending'],
      use_when: 'Use when the interface sorts text or labels in alphabetical descending order.',
      avoid_when: 'Do not use for numeric sorting or generic filtering when the meaning is specifically reverse alphabetical order.',
    });
  }

  if (record.icon_id === 'mingcute:back' || record.icon_id === 'mingcute:back_2') {
    return withOverrides(reviewed, {
      label: 'Back',
      depicts: 'A left-facing navigation arrow.',
      purpose: 'Show a back action or a move to the previous screen, panel, or step.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['back', 'previous', 'return', 'navigation', 'go back'],
      synonyms: ['go back', 'return', 'previous screen', 'back navigation'],
      use_when: 'Use when the interface moves to the previous screen, panel, or navigation level.',
      avoid_when: 'Do not use for undo or dismiss when the action is not actual back navigation.',
    });
  }

  if (record.icon_id.startsWith('mingcute:dashboard')) {
    return withOverrides(reviewed, {
      label: 'Dashboard',
      depicts: 'A panel-style layout icon for a dashboard surface.',
      purpose: 'Show a dashboard destination or an overview surface.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'ui_shell',
      semantic_tags: ['dashboard', 'overview', 'summary', 'main surface', 'home panel'],
      synonyms: ['overview page', 'dashboard home', 'summary surface', 'main dashboard'],
      use_when: 'Use when the interface navigates to or labels a dashboard or overview surface.',
      avoid_when: 'Do not use for individual charts or analytics details when the meaning is specifically the dashboard destination.',
    });
  }

  if (record.icon_id.startsWith('mingcute:delete') && record.icon_id !== 'mingcute:delete_back') {
    return withOverrides(reviewed, {
      label: 'Delete',
      depicts: 'A delete or trash symbol used for removal.',
      purpose: 'Show delete, remove, or discard actions for content or items.',
      category: 'destructive_actions',
      intent: 'delete',
      domain: 'ui_controls',
      semantic_tags: ['delete', 'remove', 'discard', 'trash', 'destructive'],
      synonyms: ['delete item', 'remove item', 'discard', 'trash'],
      use_when: 'Use when the interface removes or discards content or items.',
      avoid_when: 'Do not use for archive, close, or hide when the action is not destructive removal.',
    });
  }

  if (record.icon_id === 'mingcute:delete_back') {
    return withOverrides(reviewed, {
      label: 'Delete Backward',
      depicts: 'A delete or erase cue aimed backward to the previous character or item.',
      purpose: 'Show deleting the previous character, erasing backward, or a backspace-like removal action.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['delete backward', 'backspace', 'erase previous', 'remove previous', 'input control'],
      synonyms: ['backspace', 'delete previous', 'erase backward', 'remove previous character'],
      use_when: 'Use when the interface deletes the previous character or erases backward in an input-like context.',
      avoid_when: 'Do not use for general delete or back navigation when the meaning is specifically backward erase.',
      confidence_score: 0.82,
    });
  }

  if (record.icon_id.startsWith('mingcute:eye')) {
    const hidden = record.icon_id === 'mingcute:eye_close';
    return withOverrides(reviewed, {
      label: hidden ? 'Hidden' : 'Visible',
      depicts: hidden ? 'An eye with a close or hide cue.' : 'An eye symbol for visible or reveal state.',
      purpose: hidden
        ? 'Show hidden content, masked visibility, or a state where content is not currently shown.'
        : 'Show a visible, reveal, or preview state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: hidden
        ? ['hidden', 'hide', 'masked', 'not visible', 'privacy']
        : ['visible', 'view', 'preview', 'reveal', 'eye'],
      synonyms: hidden
        ? ['hide', 'concealed', 'masked content', 'visibility off']
        : ['show', 'preview', 'reveal', 'visible state'],
      use_when: hidden
        ? 'Use when the interface hides content or shows that an item is currently concealed.'
        : 'Use when the interface reveals content or shows that something is visible.',
      avoid_when: hidden
        ? 'Do not use for delete, close, or blocked states when the meaning is specifically hidden visibility.'
        : 'Do not use for analytics or read-tracking when the meaning is specifically visibility or preview.',
      confidence_score: hidden ? 0.86 : record.confidence_score,
    });
  }

  if (record.icon_id === 'mingcute:color_filter') {
    return withOverrides(reviewed, {
      label: 'Color Filter',
      depicts: 'A filter cue paired with color-oriented meaning.',
      purpose: 'Show filtering or refining content by color or color-based criteria.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['color filter', 'filter by color', 'refine colors', 'filter', 'controls'],
      synonyms: ['filter colors', 'color refinement', 'refine by color', 'color-based filter'],
      use_when: 'Use when the interface narrows results or content using color-based criteria.',
      avoid_when: 'Do not use for generic filtering when the meaning is not specifically color-based.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id.startsWith('mingcute:filter')) {
    return withOverrides(reviewed, {
      label: 'Filter',
      depicts: 'A funnel-shaped control used to narrow visible results.',
      purpose: 'Show filtering or refinement of results, content, or data.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['filter', 'refine', 'narrow', 'results', 'data control'],
      synonyms: ['filter results', 'refine list', 'apply filters', 'narrow results'],
      use_when: 'Use when the interface narrows, refines, or filters a list, table, or result set.',
      avoid_when: 'Do not use for sorting or analytics funnels when the meaning is specifically filtering visible results.',
    });
  }

  if (record.icon_id === 'mingcute:forward' || record.icon_id === 'mingcute:forward_2') {
    return withOverrides(reviewed, {
      label: 'Forward',
      depicts: 'A right-facing navigation arrow.',
      purpose: 'Show a forward action or a move to the next screen, panel, or step.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'navigation',
      semantic_tags: ['forward', 'next', 'continue', 'navigation', 'advance'],
      synonyms: ['go forward', 'next screen', 'continue', 'forward navigation'],
      use_when: 'Use when the interface moves to the next screen, panel, or navigation level.',
      avoid_when: 'Do not use for send or submit when the action is not actual forward navigation.',
    });
  }

  if (record.icon_id.startsWith('mingcute:fullscreen')) {
    const exit = record.icon_id.includes('exit');
    return withOverrides(reviewed, {
      label: exit ? 'Exit Full Screen' : 'Full Screen',
      depicts: exit
        ? 'A frame-collapse icon returning from a full-screen view.'
        : 'A frame-expansion icon that fills the available screen.',
      purpose: exit
        ? 'Show leaving full screen or restoring a smaller view.'
        : 'Show entering full screen or expanding content to take over the screen.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: exit
        ? ['exit full screen', 'restore view', 'collapse', 'leave immersive', 'view control']
        : ['full screen', 'expand view', 'maximize', 'immersive', 'view control'],
      synonyms: exit
        ? ['leave full screen', 'restore window', 'shrink view', 'exit immersive mode']
        : ['maximize view', 'enter full screen', 'expand to screen', 'immersive mode'],
      use_when: exit
        ? 'Use when the interface leaves full screen and returns to the normal view.'
        : 'Use when the interface expands content into a full-screen or maximized view.',
      avoid_when: exit
        ? 'Do not use for close or dismiss when the meaning is specifically leaving full screen.'
        : 'Do not use for zoom or open in new window when the meaning is specifically full screen.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id.startsWith('mingcute:home_') && record.icon_id !== 'mingcute:home_wifi') {
    return withOverrides(reviewed, {
      label: 'Home',
      depicts: 'A house-shaped home destination symbol.',
      purpose: 'Show the home destination, root view, or main landing area of the product.',
      category: 'navigation_interface',
      intent: 'navigate',
      domain: 'ui_shell',
      semantic_tags: ['home', 'root', 'main', 'start', 'destination'],
      synonyms: ['home page', 'main screen', 'start page', 'root destination'],
      use_when: 'Use when the interface moves to the home destination or main landing area.',
      avoid_when: 'Do not use for physical houses, smart-home devices, or location meaning when the icon is a UI home destination.',
    });
  }

  if (record.icon_id === 'mingcute:home_wifi') {
    return withOverrides(reviewed, {
      label: 'Connected Home',
      depicts: 'A home symbol paired with a Wi-Fi connectivity cue.',
      purpose: 'Show home connectivity, smart-home context, or a home network surface.',
      category: 'navigation_interface',
      intent: 'inform',
      domain: 'ui_shell',
      semantic_tags: ['connected home', 'smart home', 'home wifi', 'network home', 'connectivity'],
      synonyms: ['smart home', 'home network', 'connected house', 'wifi home'],
      use_when: 'Use when the interface refers to home connectivity or a smart-home network context.',
      avoid_when: 'Do not use for a generic home destination when the Wi-Fi or connected-home meaning is not intended.',
      confidence_score: 0.82,
    });
  }

  if (record.icon_id.startsWith('mingcute:key_')) {
    return withOverrides(reviewed, {
      label: 'Access Key',
      depicts: 'A key symbol for access or credentials.',
      purpose: 'Show access credentials, keys, or secure key-based access.',
      category: 'security_auth',
      intent: 'inform',
      domain: 'security',
      semantic_tags: ['key', 'access', 'credential', 'secure', 'auth'],
      synonyms: ['access key', 'credential', 'secure key', 'auth key'],
      use_when: 'Use when the interface refers to credentials, key-based access, or secure secrets.',
      avoid_when: 'Do not use for generic settings or passwords when the meaning is not specifically key-based access.',
    });
  }

  if (record.icon_id === 'mingcute:lock' || record.icon_id === 'mingcute:safe_lock') {
    return withOverrides(reviewed, {
      label: 'Lock',
      depicts: 'A closed padlock used for secure or restricted access.',
      purpose: 'Show locked access, protected content, or a secured state.',
      category: 'security',
      intent: 'inform',
      domain: 'security',
      semantic_tags: ['lock', 'secure', 'protected', 'restricted', 'access'],
      synonyms: ['locked', 'secure access', 'protected', 'restricted'],
      use_when: 'Use when content, actions, or settings are locked or require protection.',
      avoid_when: 'Do not use for generic privacy copy unless the interface truly represents restricted access.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id === 'mingcute:menu') {
    return withOverrides(reviewed, {
      label: 'Menu',
      depicts: 'A stacked-line menu or drawer entry icon.',
      purpose: 'Show the main menu, navigation drawer, or app-level menu entry point.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['menu', 'navigation', 'drawer', 'sidebar', 'more'],
      synonyms: ['main menu', 'navigation drawer', 'open menu', 'sidebar menu'],
      use_when: 'Use when the interface opens a main menu, drawer, or navigation panel.',
      avoid_when: 'Do not use for overflow actions when the meaning is specifically the main navigation menu.',
    });
  }

  if (record.icon_id.startsWith('mingcute:numbers_09_sort_ascending')) {
    return withOverrides(reviewed, {
      label: 'Sort 0 to 9',
      depicts: 'A sort control for numeric ascending order.',
      purpose: 'Show sorting numbers from 0 to 9.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort', 'numbers', 'ascending', '0 to 9', 'order'],
      synonyms: ['sort numbers ascending', '0 to 9', 'numeric ascending', 'sort ascending'],
      use_when: 'Use when the interface sorts numeric values in ascending order.',
      avoid_when: 'Do not use for alphabetical sorting or generic filtering when the meaning is specifically numeric order.',
    });
  }

  if (record.icon_id.startsWith('mingcute:numbers_09_sort_descending') || record.icon_id.startsWith('mingcute:numbers_90_sort_ascending')) {
    return withOverrides(reviewed, {
      label: 'Sort 9 to 0',
      depicts: 'A sort control for numeric descending order.',
      purpose: 'Show sorting numbers from 9 to 0.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort', 'numbers', 'descending', '9 to 0', 'order'],
      synonyms: ['sort numbers descending', '9 to 0', 'numeric descending', 'sort descending'],
      use_when: 'Use when the interface sorts numeric values in descending order.',
      avoid_when: 'Do not use for alphabetical sorting or generic filtering when the meaning is specifically reverse numeric order.',
    });
  }

  if (record.icon_id.startsWith('mingcute:numbers_90_sort_descending')) {
    return withOverrides(reviewed, {
      label: 'Sort 0 to 9',
      depicts: 'A sort control for numeric ascending order.',
      purpose: 'Show sorting numbers from 0 to 9.',
      category: 'data_controls',
      intent: 'refine',
      domain: 'ui_controls',
      semantic_tags: ['sort', 'numbers', 'ascending', '0 to 9', 'order'],
      synonyms: ['sort numbers ascending', '0 to 9', 'numeric ascending', 'sort ascending'],
      use_when: 'Use when the interface sorts numeric values in ascending order.',
      avoid_when: 'Do not use for alphabetical sorting or generic filtering when the meaning is specifically numeric order.',
    });
  }

  if (record.icon_id === 'mingcute:power') {
    return withOverrides(reviewed, {
      label: 'Power',
      depicts: 'A power symbol for turning a system or device on or off.',
      purpose: 'Show power, start-stop control, or a device power state.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['power', 'on off', 'system control', 'device power', 'toggle power'],
      synonyms: ['turn on', 'turn off', 'power control', 'device power'],
      use_when: 'Use when the interface turns a system or device on or off or refers to power state.',
      avoid_when: 'Do not use for electrical hazard or energy analytics when the meaning is specifically power control.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:high_voltage_power') {
    return withOverrides(reviewed, {
      label: 'High Power',
      depicts: 'A power symbol paired with a high-energy or electrical cue.',
      purpose: 'Show high power, strong electrical output, or an energy-intensive power state.',
      category: 'system_control',
      intent: 'inform',
      domain: 'ui_controls',
      semantic_tags: ['high power', 'electrical power', 'energy', 'power state', 'voltage'],
      synonyms: ['high voltage', 'strong power', 'electrical output', 'energy power'],
      use_when: 'Use when the interface truly refers to high electrical power or an energy-heavy power state.',
      avoid_when: 'Do not use for ordinary power on-off controls when the high-power meaning is not intended.',
      confidence_score: 0.81,
    });
  }

  if (record.icon_id.startsWith('mingcute:refresh') && !record.icon_id.includes('_ai')) {
    return withOverrides(reviewed, {
      label: 'Refresh',
      depicts: 'A circular refresh loop.',
      purpose: 'Show refreshing or reloading the current view, results, or content state.',
      category: 'system_control',
      intent: 'control',
      domain: 'ui_controls',
      semantic_tags: ['refresh', 'reload', 'update', 'refetch', 'reload view'],
      synonyms: ['reload', 'refresh view', 'update results', 'refetch content'],
      use_when: 'Use when the interface refreshes a page, refetches results, or reloads the current content state.',
      avoid_when: 'Do not use for retry-after-error or long-running sync status when those meanings need a more specific icon.',
    });
  }

  if (record.icon_id === 'mingcute:refresh_4_ai') {
    return withOverrides(reviewed, {
      label: 'Rerun AI',
      depicts: 'A refresh loop paired with an AI cue.',
      purpose: 'Show rerunning an AI action, regenerating a result, or refreshing an AI-assisted output.',
      category: 'agent_lifecycle',
      intent: 'act',
      domain: 'ai_agents',
      semantic_tags: ['rerun ai', 'regenerate', 'refresh ai', 'assistant rerun', 'ai action'],
      synonyms: ['regenerate response', 'rerun assistant', 'refresh ai result', 'retry ai'],
      use_when: 'Use when the interface reruns an AI action, regenerates an answer, or refreshes an AI-assisted result.',
      avoid_when: 'Do not use for ordinary refresh when the meaning is not specifically AI or assistant rerun.',
      confidence_score: 0.82,
    });
  }

  if (record.icon_id === 'mingcute:fast_forward') {
    return withOverrides(reviewed, {
      label: 'Fast Forward',
      depicts: 'A media control for skipping ahead quickly.',
      purpose: 'Show fast-forward playback or moving quickly ahead in timed media.',
      category: 'media_playback',
      intent: 'control',
      domain: 'media',
      semantic_tags: ['fast forward', 'media control', 'skip ahead', 'playback', 'advance'],
      synonyms: ['fast-forward media', 'skip ahead', 'advance playback', 'speed ahead'],
      use_when: 'Use when the interface fast-forwards media or moves quickly ahead in a timed sequence.',
      avoid_when: 'Do not use for ordinary next-step navigation when the meaning is specifically media playback.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id.startsWith('mingcute:rewind_forward') || record.icon_id === 'mingcute:skip_forward') {
    return withOverrides(reviewed, {
      label: 'Skip Forward',
      depicts: 'A media control for jumping ahead in playback.',
      purpose: 'Show jumping forward to the next segment, time step, or media item.',
      category: 'media_playback',
      intent: 'control',
      domain: 'media',
      semantic_tags: ['skip forward', 'jump ahead', 'media control', 'playback', 'next segment'],
      synonyms: ['jump forward', 'skip ahead', 'forward playback', 'next media segment'],
      use_when: 'Use when the interface jumps forward in playback or moves to the next media segment.',
      avoid_when: 'Do not use for send or ordinary navigation when the meaning is specifically media or timed-sequence skipping.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:share_forward') {
    return withOverrides(reviewed, {
      label: 'Forward Share',
      depicts: 'A share or send cue pointing forward to another destination.',
      purpose: 'Show forwarding or sharing content onward to another person or destination.',
      category: 'message_actions',
      intent: 'act',
      domain: 'communication',
      semantic_tags: ['forward share', 'share', 'send onward', 'forward message', 'communication'],
      synonyms: ['forward content', 'share onward', 'send forward', 'forward item'],
      use_when: 'Use when the interface forwards or shares content onward to another destination.',
      avoid_when: 'Do not use for generic rightward navigation when the meaning is specifically sharing or forwarding content.',
      confidence_score: 0.85,
    });
  }

  if (record.icon_id === 'mingcute:mail') {
    return withOverrides(reviewed, {
      label: 'Mail',
      depicts: 'An envelope for email or message delivery.',
      purpose: 'Show mail, email, or inbox-related communication.',
      category: 'communication_social',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: ['mail', 'email', 'inbox', 'message', 'communication'],
      synonyms: ['email', 'inbox', 'mail message', 'mailbox'],
      use_when: 'Use when the interface refers to email, inbox items, or mail communication.',
      avoid_when: 'Do not use for chat bubbles or notification counts when the meaning is specifically mail.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:mail_open') {
    return withOverrides(reviewed, {
      label: 'Open Mail',
      depicts: 'An opened envelope for viewed or opened mail.',
      purpose: 'Show opened mail, viewed email, or a read message state.',
      category: 'communication_social',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: ['open mail', 'read email', 'opened envelope', 'viewed message', 'mail'],
      synonyms: ['read email', 'opened mail', 'viewed message', 'open envelope'],
      use_when: 'Use when the interface shows that a mail item is opened, read, or currently being viewed.',
      avoid_when: 'Do not use for compose or send when the meaning is specifically opened mail.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:mail_send') {
    return withOverrides(reviewed, {
      label: 'Send Mail',
      depicts: 'An envelope paired with a send or outbound cue.',
      purpose: 'Show sending an email or mailing a message outward.',
      category: 'message_actions',
      intent: 'act',
      domain: 'communication',
      semantic_tags: ['send mail', 'email send', 'outbound message', 'mail action', 'communication'],
      synonyms: ['send email', 'mail send', 'outbound email', 'send message'],
      use_when: 'Use when the interface sends an email or delivers a mail-style message outward.',
      avoid_when: 'Do not use for open, archive, or inbox states when the meaning is specifically send.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:record_mail') {
    return withOverrides(reviewed, {
      label: 'Recorded Mail',
      depicts: 'An envelope paired with a record or log cue.',
      purpose: 'Show logged mail, recorded delivery, or mail history tracking.',
      category: 'communication_social',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: ['recorded mail', 'mail log', 'mail history', 'tracked delivery', 'communication'],
      synonyms: ['logged mail', 'tracked mail', 'mail history', 'recorded delivery'],
      use_when: 'Use when the interface refers to logged mail, tracked delivery, or recorded mail history.',
      avoid_when: 'Do not use for generic inbox or send actions when the meaning is specifically mail record or tracking.',
      confidence_score: 0.82,
    });
  }

  if (record.icon_id === 'mingcute:mail_ai' || record.icon_id.startsWith('mingcute:message_') && record.icon_id.includes('_ai')) {
    const label = record.icon_id === 'mingcute:mail_ai' ? 'Assistant Mail' : 'Assistant Message';
    const depicts = record.icon_id === 'mingcute:mail_ai'
      ? 'An envelope paired with an AI cue.'
      : 'A message bubble paired with an AI cue.';
    return withOverrides(reviewed, {
      label,
      depicts,
      purpose: 'Show assistant-generated messaging, AI communication, or an AI-authored reply surface.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['assistant message', 'ai communication', 'agent reply', 'generated message', 'assistant'],
      synonyms: ['ai message', 'assistant reply', 'agent communication', 'generated reply'],
      use_when: 'Use when the interface shows assistant-authored messages, AI communication, or an agent reply surface.',
      avoid_when: 'Do not use for ordinary human-only mail or chat when there is no AI or assistant meaning.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id.startsWith('mingcute:message_') && !record.icon_id.includes('_ai')) {
    return withOverrides(reviewed, {
      label: 'Message',
      depicts: 'A message bubble for chat or written communication.',
      purpose: 'Show chat, messaging, or message-based communication.',
      category: 'communication_social',
      intent: 'inform',
      domain: 'communication',
      semantic_tags: ['message', 'chat', 'conversation', 'communication', 'reply'],
      synonyms: ['chat', 'message bubble', 'conversation', 'reply'],
      use_when: 'Use when the interface refers to chat, messaging, or conversation-based communication.',
      avoid_when: 'Do not use for email-specific actions when the meaning is general chat or message communication.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:robot') {
    return withOverrides(reviewed, {
      label: 'AI Agent',
      depicts: 'A robot or bot face used for an automated assistant.',
      purpose: 'Show an AI agent, automated assistant, or bot-powered workflow.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['ai agent', 'assistant', 'bot', 'automation', 'agent'],
      synonyms: ['bot', 'automated assistant', 'ai helper', 'agent system'],
      use_when: 'Use when the interface refers to an AI agent, bot, or automated assistant workflow.',
      avoid_when: 'Do not use for human profiles or device controls when the meaning is specifically an agent or bot.',
      confidence_score: 0.88,
    });
  }

  if (record.icon_id === 'mingcute:file_ai' || record.icon_id === 'mingcute:edit_2_ai' || record.icon_id === 'mingcute:edit_3_ai') {
    return withOverrides(reviewed, {
      label: record.icon_id === 'mingcute:file_ai' ? 'AI File Assist' : 'AI Writing Assist',
      depicts: record.icon_id === 'mingcute:file_ai'
        ? 'A file paired with an AI cue.'
        : 'An edit or writing tool paired with an AI cue.',
      purpose: 'Show AI assistance applied to files, writing, editing, or content generation.',
      category: 'agent_lifecycle',
      intent: 'inform',
      domain: 'ai_agents',
      semantic_tags: ['ai assist', 'assistant', 'content generation', 'agent help', 'workflow'],
      synonyms: ['assistant help', 'ai editing', 'ai writing', 'ai file help'],
      use_when: 'Use when the interface offers AI assistance for writing, editing, or file-based workflows.',
      avoid_when: 'Do not use for ordinary edit or file actions when the meaning is not specifically AI assistance.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:check' || record.icon_id === 'mingcute:check_2' || record.icon_id === 'mingcute:check_circle' || record.icon_id === 'mingcute:check_circle_dash') {
    return withOverrides(reviewed, {
      label: 'Confirmed',
      depicts: 'A check mark used for confirmation or completion.',
      purpose: 'Show success, confirmation, or a completed state.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['confirmed', 'success', 'complete', 'approved', 'done'],
      synonyms: ['success', 'completed', 'approved', 'done'],
      use_when: 'Use when the interface shows a confirmed, approved, or completed state.',
      avoid_when: 'Do not use for toggles or checklist views when the meaning is specifically generic confirmation.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:alert' || record.icon_id === 'mingcute:alert_diamond' || record.icon_id === 'mingcute:alert_octagon' || record.icon_id === 'mingcute:warning' || record.icon_id === 'mingcute:user_warning' || record.icon_id === 'mingcute:safe_alert') {
    return withOverrides(reviewed, {
      label: record.icon_id === 'mingcute:user_warning' ? 'User Warning' : 'Warning',
      depicts: record.icon_id === 'mingcute:user_warning'
        ? 'A user or profile cue paired with a warning marker.'
        : 'A warning symbol used for caution or alert states.',
      purpose: record.icon_id === 'mingcute:user_warning'
        ? 'Show a user-specific warning, caution, or account issue.'
        : 'Show caution, alert, or warning status that needs attention.',
      category: 'status_feedback',
      intent: 'warn',
      domain: 'product_status',
      semantic_tags: record.icon_id === 'mingcute:user_warning'
        ? ['user warning', 'account caution', 'profile alert', 'warning', 'attention']
        : ['warning', 'alert', 'caution', 'attention', 'risk'],
      synonyms: record.icon_id === 'mingcute:user_warning'
        ? ['account warning', 'user alert', 'profile caution', 'user issue']
        : ['caution', 'alert state', 'attention needed', 'risk warning'],
      use_when: record.icon_id === 'mingcute:user_warning'
        ? 'Use when the interface warns about a user account, profile, or person-specific issue.'
        : 'Use when the interface needs to show caution, alert, or warning status.',
      avoid_when: record.icon_id === 'mingcute:user_warning'
        ? 'Do not use for generic system warnings when the meaning is not tied to a user or account.'
        : 'Do not use for destructive delete or blocked access when the meaning is specifically warning rather than action.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:bell_ringing') {
    return withOverrides(reviewed, {
      label: 'Active Notification',
      depicts: 'A ringing bell for active notifications or alerts.',
      purpose: 'Show an active notification, alert stream, or ringing reminder state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: ['notification', 'alert', 'ringing bell', 'reminder', 'activity'],
      synonyms: ['active alert', 'notification bell', 'ringing notification', 'reminder'],
      use_when: 'Use when the interface shows an active notification, alert stream, or ringing reminder.',
      avoid_when: 'Do not use for mute or notification settings when the meaning is specifically an active alert.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:dot_grid' || record.icon_id === 'mingcute:grid' || record.icon_id === 'mingcute:grid_2' || record.icon_id === 'mingcute:layout_grid') {
    return withOverrides(reviewed, {
      label: 'Grid View',
      depicts: 'A grid of tiles or dots representing a grid layout.',
      purpose: 'Show a grid layout, tile view, or multi-item overview surface.',
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: ['grid view', 'tiles', 'layout', 'overview', 'grid'],
      synonyms: ['tile view', 'grid layout', 'overview grid', 'item grid'],
      use_when: 'Use when the interface switches to or labels a grid or tile-based layout.',
      avoid_when: 'Do not use for dashboards or app launchers when the meaning is specifically a content grid view.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:file_check') {
    return withOverrides(reviewed, {
      label: 'Confirmed File',
      depicts: 'A file paired with a check cue.',
      purpose: 'Show a confirmed, approved, or completed file state.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['confirmed file', 'approved file', 'completed file', 'file check', 'status'],
      synonyms: ['approved file', 'checked file', 'completed document', 'verified file'],
      use_when: 'Use when the interface shows that a file or document is confirmed, approved, or completed.',
      avoid_when: 'Do not use for generic file storage when the meaning is specifically file confirmation.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:file_info' || record.icon_id === 'mingcute:folder_info') {
    const noun = record.icon_id.startsWith('mingcute:file') ? 'File' : 'Folder';
    return withOverrides(reviewed, {
      label: `${noun} Info`,
      depicts: `A ${noun.toLowerCase()} paired with an information cue.`,
      purpose: `Show details, metadata, or extra information about a ${noun.toLowerCase()}.`,
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: [`${noun.toLowerCase()} info`, 'details', 'metadata', 'information', noun.toLowerCase()],
      synonyms: [`${noun.toLowerCase()} details`, `about ${noun.toLowerCase()}`, `${noun.toLowerCase()} metadata`, 'info panel'],
      use_when: `Use when the interface shows details, metadata, or extra information about a ${noun.toLowerCase()}.`,
      avoid_when: `Do not use for generic open or browse actions when the meaning is specifically ${noun.toLowerCase()} information.`,
      confidence_score: 0.85,
    });
  }

  if (record.icon_id === 'mingcute:file_warning' || record.icon_id === 'mingcute:folder_warning') {
    const noun = record.icon_id.startsWith('mingcute:file') ? 'File' : 'Folder';
    return withOverrides(reviewed, {
      label: `${noun} Warning`,
      depicts: `A ${noun.toLowerCase()} paired with a warning cue.`,
      purpose: `Show a warning, caution, or issue tied to a ${noun.toLowerCase()}.`,
      category: 'status_feedback',
      intent: 'warn',
      domain: 'product_status',
      semantic_tags: [`${noun.toLowerCase()} warning`, 'warning', 'caution', noun.toLowerCase(), 'attention'],
      synonyms: [`${noun.toLowerCase()} alert`, `warning ${noun.toLowerCase()}`, `${noun.toLowerCase()} caution`, 'attention needed'],
      use_when: `Use when the interface warns about a ${noun.toLowerCase()}-specific issue or caution state.`,
      avoid_when: `Do not use for generic delete or block states when the meaning is specifically a ${noun.toLowerCase()} warning.`,
      confidence_score: 0.85,
    });
  }

  if (record.icon_id === 'mingcute:file_more' || record.icon_id === 'mingcute:folder_more') {
    const noun = record.icon_id.startsWith('mingcute:file') ? 'File' : 'Folder';
    return withOverrides(reviewed, {
      label: `${noun} More Options`,
      depicts: `A ${noun.toLowerCase()} paired with an overflow or extra-options cue.`,
      purpose: `Show opening more actions or an overflow menu for a ${noun.toLowerCase()}.`,
      category: 'navigation_interface',
      intent: 'control',
      domain: 'ui_shell',
      semantic_tags: [`${noun.toLowerCase()} options`, 'more actions', 'overflow', noun.toLowerCase(), 'menu'],
      synonyms: [`${noun.toLowerCase()} menu`, `more ${noun.toLowerCase()} actions`, 'overflow menu', 'extra actions'],
      use_when: `Use when the interface opens more actions or an overflow menu for a ${noun.toLowerCase()}.`,
      avoid_when: `Do not use for generic navigation or file open when the meaning is specifically extra actions.`,
      confidence_score: 0.85,
    });
  }

  if (record.icon_id === 'mingcute:folder_check') {
    return withOverrides(reviewed, {
      label: 'Confirmed Folder',
      depicts: 'A folder paired with a check cue.',
      purpose: 'Show a confirmed, approved, or completed folder state.',
      category: 'status_feedback',
      intent: 'confirm',
      domain: 'product_status',
      semantic_tags: ['confirmed folder', 'approved folder', 'checked folder', 'folder check', 'status'],
      synonyms: ['approved folder', 'checked directory', 'confirmed container', 'completed folder'],
      use_when: 'Use when the interface shows that a folder or directory is confirmed, approved, or ready.',
      avoid_when: 'Do not use for generic folder browsing when the meaning is specifically folder confirmation.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:code' || record.icon_id === 'mingcute:file_code') {
    return withOverrides(reviewed, {
      label: record.icon_id === 'mingcute:file_code' ? 'Code File' : 'Code',
      depicts: record.icon_id === 'mingcute:file_code'
        ? 'A file paired with code or markup symbols.'
        : 'Code or markup symbols for programming content.',
      purpose: record.icon_id === 'mingcute:file_code'
        ? 'Show a source file, code document, or developer file artifact.'
        : 'Show code, programming, or developer-facing technical content.',
      category: 'engineering_developer_tools',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: record.icon_id === 'mingcute:file_code'
        ? ['code file', 'source file', 'developer file', 'programming', 'code']
        : ['code', 'programming', 'developer', 'technical', 'markup'],
      synonyms: record.icon_id === 'mingcute:file_code'
        ? ['source file', 'developer file', 'code document', 'programming file']
        : ['programming', 'source code', 'developer content', 'technical code'],
      use_when: record.icon_id === 'mingcute:file_code'
        ? 'Use when the interface refers to a code file, source file, or developer document.'
        : 'Use when the interface refers to programming, code, or developer-facing technical content.',
      avoid_when: record.icon_id === 'mingcute:file_code'
        ? 'Do not use for generic files when the meaning is not specifically code or source files.'
        : 'Do not use for AI logic or server infrastructure when the meaning is specifically code.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:server' || record.icon_id === 'mingcute:server_2') {
    return withOverrides(reviewed, {
      label: 'Server',
      depicts: 'A stacked server or infrastructure unit.',
      purpose: 'Show server infrastructure, backend systems, or hosted technical services.',
      category: 'systems_architecture',
      intent: 'inform',
      domain: 'developer_tools',
      semantic_tags: ['server', 'backend', 'infrastructure', 'hosted service', 'systems'],
      synonyms: ['backend server', 'hosted service', 'infrastructure', 'server stack'],
      use_when: 'Use when the interface refers to server infrastructure, backend systems, or hosted services.',
      avoid_when: 'Do not use for generic storage or file containers when the meaning is specifically server infrastructure.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:safe_shield' || record.icon_id === 'mingcute:safe_shield_2' || record.icon_id === 'mingcute:shield' || record.icon_id === 'mingcute:shield_shape') {
    return withOverrides(reviewed, {
      label: 'Protection',
      depicts: 'A shield used for protection, trust, or guarded access.',
      purpose: 'Show protection, trust, or a guarded security state.',
      category: 'security',
      intent: 'inform',
      domain: 'security',
      semantic_tags: ['protection', 'shield', 'security', 'trust', 'guarded'],
      synonyms: ['secure shield', 'protected state', 'trusted protection', 'guarded access'],
      use_when: 'Use when the interface refers to protection, security posture, or trusted guarded access.',
      avoid_when: 'Do not use for success or approval when the meaning is specifically protection or trust.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:unlock' || record.icon_id === 'mingcute:gesture_unlock') {
    return withOverrides(reviewed, {
      label: 'Unlocked',
      depicts: 'An open lock indicating available or released access.',
      purpose: 'Show unlocked access, released protection, or an available secure state.',
      category: 'security_auth',
      intent: 'inform',
      domain: 'security',
      semantic_tags: ['unlocked', 'access granted', 'open lock', 'available', 'security'],
      synonyms: ['open access', 'unlock state', 'released lock', 'available access'],
      use_when: 'Use when the interface shows that access is unlocked or protection has been released.',
      avoid_when: 'Do not use for generic open navigation when the meaning is specifically secure access.',
      confidence_score: 0.87,
    });
  }

  if (record.icon_id === 'mingcute:user_lock') {
    return withOverrides(reviewed, {
      label: 'Locked User',
      depicts: 'A user or profile paired with a lock cue.',
      purpose: 'Show a locked account, restricted user profile, or access-controlled person record.',
      category: 'security',
      intent: 'inform',
      domain: 'security',
      semantic_tags: ['locked user', 'restricted account', 'user lock', 'account security', 'profile'],
      synonyms: ['restricted user', 'locked account', 'secured profile', 'account lock'],
      use_when: 'Use when the interface refers to a locked account, restricted profile, or user-specific access control.',
      avoid_when: 'Do not use for generic user settings when the meaning is specifically account restriction.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:user_search') {
    return withOverrides(reviewed, {
      label: 'User Search',
      depicts: 'A user or profile paired with a search cue.',
      purpose: 'Show searching for users, profiles, or people records.',
      category: 'search_discovery',
      intent: 'discover',
      domain: 'ui_shell',
      semantic_tags: ['user search', 'search people', 'find user', 'profile lookup', 'search'],
      synonyms: ['search users', 'find profile', 'people lookup', 'user lookup'],
      use_when: 'Use when the interface searches for users, profiles, or people records.',
      avoid_when: 'Do not use for generic search when the meaning is specifically people or profile lookup.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:thumb_up' || record.icon_id === 'mingcute:thumb_down') {
    const isUp = record.icon_id.endsWith('up');
    return withOverrides(reviewed, {
      label: isUp ? 'Approval' : 'Disapproval',
      depicts: isUp ? 'A thumbs-up approval gesture.' : 'A thumbs-down disapproval gesture.',
      purpose: isUp
        ? 'Show approval, positive feedback, or a liked state.'
        : 'Show disapproval, negative feedback, or a disliked state.',
      category: 'status_feedback',
      intent: 'inform',
      domain: 'product_status',
      semantic_tags: isUp
        ? ['approval', 'positive feedback', 'like', 'endorsed', 'thumbs up']
        : ['disapproval', 'negative feedback', 'dislike', 'rejected', 'thumbs down'],
      synonyms: isUp
        ? ['liked', 'positive', 'approved', 'endorsement']
        : ['disliked', 'negative', 'rejected', 'downvote'],
      use_when: isUp
        ? 'Use when the interface shows positive feedback, approval, or a liked state.'
        : 'Use when the interface shows negative feedback, disapproval, or a disliked state.',
      avoid_when: 'Do not use for generic confirmation or warning when the meaning is specifically feedback sentiment.',
      confidence_score: 0.86,
    });
  }

  if (record.icon_id === 'mingcute:trending_up' || record.icon_id === 'mingcute:trending_down') {
    const isUp = record.icon_id.endsWith('up');
    return withOverrides(reviewed, {
      label: isUp ? 'Trend Up' : 'Trend Down',
      depicts: isUp ? 'A rising trend line.' : 'A falling trend line.',
      purpose: isUp
        ? 'Show upward trend, growth, or improved movement in analytics or metrics.'
        : 'Show downward trend, decline, or reduced movement in analytics or metrics.',
      category: 'analytics_data',
      intent: 'inform',
      domain: 'analytics',
      semantic_tags: isUp
        ? ['trend up', 'growth', 'increase', 'analytics', 'upward']
        : ['trend down', 'decline', 'decrease', 'analytics', 'downward'],
      synonyms: isUp
        ? ['upward trend', 'growth line', 'increase', 'rising metric']
        : ['downward trend', 'decline line', 'decrease', 'falling metric'],
      use_when: 'Use when the interface shows metric movement or analytics trend direction.',
      avoid_when: 'Do not use for navigation arrows when the meaning is specifically trend or analytics direction.',
      confidence_score: 0.86,
    });
  }

  if (LEFT_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Left');
  }

  if (RIGHT_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Right');
  }

  if (UP_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Up');
  }

  if (DOWN_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Down');
  }

  if (DOWN_LEFT_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Down Left');
  }

  if (UP_LEFT_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Up Left');
  }

  if (DOWN_RIGHT_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Down Right');
  }

  if (UP_RIGHT_IDS.has(record.icon_id)) {
    return applyDirectionalOverride(reviewed, 'Up Right');
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
      .filter((item) => item.queue_outcome === 'ready_for_editor_review' && !resolvedOtherBatchIds.has(item.candidate_icon_id))
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

  if (queueItem.queue_outcome !== 'ready_for_editor_review') {
    throw new Error(`Selected icon is not in the editor-review queue: ${iconId}`);
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

## Why this batch exists

This batch picks up the remaining high-confidence MingCute editor-review queue after the first MingCute import and the first visual-review batch.

## What is still intentionally conservative

- mixed layout-and-direction icons
- search-none states
- smart-home or power variants that still need tighter product context
- backward-delete and mail-record variants with multiple plausible UI meanings
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

console.log(
  `build-mingcute-editor-review-batch: batch=${batchRecords.length}, approved=${approveForImport.length}, hold=${holdForEditorReview.length}, draft=${keepAsReviewedDraft.length}`
);
