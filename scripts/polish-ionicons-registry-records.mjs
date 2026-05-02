import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const FILES = [
  'data/si-registry/source/libraries/ionicons.json',
];

const UPDATES = {
  'ionicons:arrow_down_circle_outline': {
    depicts: 'Downward arrow inside a circular outline showing vertical movement or lower navigation.',
  },
  'ionicons:arrow_down_outline': {
    depicts: 'Downward arrow with a straight stem and pointed head showing vertical movement or lower navigation.',
  },
  'ionicons:arrow_up_circle_outline': {
    depicts: 'Upward arrow inside a circular outline showing vertical movement or higher navigation.',
  },
  'ionicons:arrow_up_outline': {
    depicts: 'Upward arrow with a straight stem and pointed head showing vertical movement or higher navigation.',
  },
  'ionicons:caret_down_circle_outline': {
    depicts: 'Downward caret triangle inside a circular outline for collapse, menu, or lower navigation.',
  },
  'ionicons:caret_down_outline': {
    depicts: 'Downward caret triangle for collapse, dropdown, or lower navigation controls.',
  },
  'ionicons:caret_up_circle_outline': {
    depicts: 'Upward caret triangle inside a circular outline for expand, close, or higher navigation.',
  },
  'ionicons:caret_up_outline': {
    depicts: 'Upward caret triangle for expand, close, or higher navigation controls.',
  },
  'ionicons:chevron_down_circle_outline': {
    depicts: 'Downward chevron angle inside a circular outline for lower navigation or expanding content.',
  },
  'ionicons:chevron_down_outline': {
    depicts: 'Downward chevron angle used for dropdowns, expanding sections, or lower navigation.',
  },
  'ionicons:chevron_up_circle_outline': {
    depicts: 'Upward chevron angle inside a circular outline for higher navigation or collapsing content.',
  },
  'ionicons:chevron_up_outline': {
    depicts: 'Upward chevron angle used for collapse controls, returning upward, or higher navigation.',
  },
  'ionicons:document_lock_outline': {
    depicts: 'Document page outline with a padlock indicating a protected, restricted, or secured file.',
    semantic_tags: ['document', 'lock', 'secure', 'protected', 'restricted', 'file'],
    synonyms: ['locked document', 'secured file', 'protected file', 'restricted document', 'file lock'],
    use_when: 'Use when the interface refers to a locked document, protected file, restricted attachment, or secured record.',
    avoid_when: 'Do not use for a generic lock without a document or for password entry when no file is involved.',
  },
  'ionicons:lock_closed_outline': {
    depicts: 'Closed padlock outline with a shackle and body indicating secured or restricted access.',
  },
  'ionicons:search_circle_outline': {
    depicts: 'Magnifying glass inside a circular outline for search, lookup, or finding content.',
  },
  'ionicons:search_outline': {
    depicts: 'Magnifying glass with a circular lens and handle for search, lookup, or finding content.',
  },
  'ionicons:thumbs_down_outline': {
    depicts: 'Hand outline with thumb pointing downward indicating dislike, rejection, or negative feedback.',
    semantic_tags: ['thumbs down', 'dislike', 'reject', 'negative feedback', 'hand', 'outline'],
    synonyms: ['thumbs down', 'dislike', 'downvote', 'negative feedback', 'reject'],
    use_when: 'Use when the interface captures dislike, downvote, rejection, or negative feedback.',
    avoid_when: 'Do not use for downward navigation, downloads, or lower position changes.',
  },
  'ionicons:thumbs_up_outline': {
    depicts: 'Hand outline with thumb pointing upward indicating approval, like, or positive feedback.',
    semantic_tags: ['thumbs up', 'like', 'approve', 'positive feedback', 'hand', 'outline'],
    synonyms: ['thumbs up', 'like', 'upvote', 'positive feedback', 'approve'],
    use_when: 'Use when the interface captures approval, like, upvote, endorsement, or positive feedback.',
    avoid_when: 'Do not use for upward navigation, uploads, or higher position changes.',
  },
  'ionicons:trending_down_outline': {
    depicts: 'Descending trend line with an arrowhead indicating decline, decrease, or downward performance.',
    semantic_tags: ['trend down', 'decline', 'decrease', 'analytics', 'performance', 'outline'],
    synonyms: ['trend down', 'declining trend', 'decrease', 'falling metric', 'downward performance'],
    use_when: 'Use when metrics, analytics, prices, or performance are decreasing over time.',
    avoid_when: 'Do not use for moving an item down, scrolling, downloading, or simple downward navigation.',
  },
  'ionicons:trending_up_outline': {
    depicts: 'Rising trend line with an arrowhead indicating growth, increase, or upward performance.',
    semantic_tags: ['trend up', 'growth', 'increase', 'analytics', 'performance', 'outline'],
    synonyms: ['trend up', 'rising trend', 'increase', 'growing metric', 'upward performance'],
    use_when: 'Use when metrics, analytics, prices, or performance are increasing over time.',
    avoid_when: 'Do not use for moving an item up, scrolling, uploading, or simple upward navigation.',
  },
};

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const summary = {};

for (const relativePath of FILES) {
  const fullPath = path.join(repoRoot, relativePath);
  const records = await readJson(fullPath);
  let changed = 0;

  for (const record of records) {
    const update = UPDATES[record.icon_id];
    if (!update) continue;

    Object.assign(record, update);
    changed += 1;
  }

  if (changed > 0) {
    await writeJson(fullPath, records);
  }

  summary[relativePath] = changed;
}

console.log(JSON.stringify({
  script: 'polish-ionicons-registry-records',
  summary,
  total: Object.values(summary).reduce((sum, count) => sum + count, 0),
}, null, 2));
