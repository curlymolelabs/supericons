import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const sourceRoot = path.join(repoRoot, 'data/si-registry');
const write = process.argv.includes('--write');

const TARGET_GROUPS = new Set(['phosphor-approved', 'heroicons-approved']);
const SEARCH_ROOTS = [
  path.join(repoRoot, 'data/si-registry/manual-redo'),
  path.join(repoRoot, 'data/si-registry/automation'),
];

const BLOCKED = [
  (value) => value.startsWith('a symbol representing'),
  (value) => value.startsWith('a symbol for'),
  (value) => value.includes('product mark'),
  (value) => value.includes('official') && value.includes('brand'),
];

const PUBLIC_SEMANTIC_FIELDS = [
  'label',
  'purpose',
  'category',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
  'depicts',
];

function isBlockedDepicts(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return BLOCKED.some((test) => test(normalized));
}

function normalizeRecords(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.records)) return raw.records;
  if (Array.isArray(raw?.icons)) return raw.icons;
  if (Array.isArray(raw?.reviewed_records)) return raw.reviewed_records;
  return [];
}

function candidateRank(relativePath) {
  let score = 0;
  if (relativePath.includes('/manual-redo/')) score += 1000;
  if (relativePath.endsWith('-final-records.json')) score += 500;
  if (relativePath.includes('screenshot')) score += 100;
  if (relativePath.includes('visual-review')) score += 50;
  if (relativePath.includes('editor-review')) score += 10;
  if (relativePath.endsWith('-agent-output.json')) score -= 100;
  return score;
}

function shouldSkipCandidatePath(relativePath) {
  return relativePath.endsWith('/approved-records.json')
    || relativePath.endsWith('/worklist.json')
    || relativePath.endsWith('/promotion-decisions.json')
    || relativePath.endsWith('/editor-hold-queue.json')
    || relativePath.includes('/generated/');
}

async function* walkFiles(dir) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      yield fullPath;
    }
  }
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

const manifest = await readJson(path.join(sourceRoot, 'registry-manifest.json'));
const targetGroups = (manifest.recordGroups || []).filter((group) => TARGET_GROUPS.has(group.id));
const badTargets = new Map();

for (const group of targetGroups) {
  const file = path.join(sourceRoot, group.path);
  const records = normalizeRecords(await readJson(file));
  for (const record of records) {
    if (record?.icon_id && isBlockedDepicts(record.depicts)) {
      badTargets.set(record.icon_id, { group, file });
    }
  }
}

const candidates = new Map();

for (const root of SEARCH_ROOTS) {
  for await (const file of walkFiles(root)) {
    const relativePath = path.relative(repoRoot, file).replaceAll(path.sep, '/');
    if (shouldSkipCandidatePath(relativePath)) continue;

    const records = normalizeRecords(await readJson(file));
    for (const record of records) {
      if (!record?.icon_id || !badTargets.has(record.icon_id)) continue;
      if (typeof record.depicts !== 'string' || record.depicts.trim().length < 12) continue;
      if (isBlockedDepicts(record.depicts)) continue;

      const existing = candidates.get(record.icon_id);
      const current = {
        record,
        source_path: relativePath,
        rank: candidateRank(relativePath),
      };

      if (!existing || current.rank > existing.rank) {
        candidates.set(record.icon_id, current);
      }
    }
  }
}

const summaries = {};
let replacements = 0;

for (const group of targetGroups) {
  const file = path.join(sourceRoot, group.path);
  const records = normalizeRecords(await readJson(file));
  let changed = 0;

  for (const record of records) {
    if (!isBlockedDepicts(record.depicts)) continue;
    const candidate = candidates.get(record.icon_id);
    if (!candidate) continue;

    for (const field of PUBLIC_SEMANTIC_FIELDS) {
      const value = candidate.record[field];
      if (typeof value === 'string' && value.trim().length > 0) {
        record[field] = value;
      } else if (Array.isArray(value)) {
        record[field] = value;
      }
    }

    changed += 1;
    replacements += 1;
  }

  summaries[group.id] = {
    path: group.path,
    replacements: changed,
  };

  if (write && changed > 0) {
    await fs.writeFile(file, `${JSON.stringify(records, null, 2)}\n`);
  }
}

console.log(JSON.stringify({
  mode: write ? 'write' : 'dry-run',
  badTargets: badTargets.size,
  candidateMatches: candidates.size,
  replacements,
  summaries,
}, null, 2));

if (!write && replacements === 0) {
  process.exitCode = 1;
}
