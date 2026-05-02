import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const FILES = [
  'data/si-registry/source/free-pilot.json',
  'data/si-registry/source/purpose-chip-approved.json',
];

const UPDATES = {
  'material:database': {
    depicts: 'Stacked cylinder shape with horizontal bands representing a database of stored records.',
    use_when: 'Use when the interface refers to a database, record store, persistent data source, or structured storage.',
    avoid_when: 'Do not use for generic files, folders, spreadsheets, or unstructured document collections.',
    synonyms: ['database', 'data store', 'record storage', 'structured storage', 'persistent data'],
  },
  'material:dataset': {
    depicts: 'Rectangular dataset grid with grouped cells representing an organized collection of examples or records.',
    use_when: 'Use when the interface refers to a dataset, training data, example collection, or grouped records.',
    avoid_when: 'Do not use for a single database, table schema, or generic file when the meaning is a dataset collection.',
    synonyms: ['dataset', 'data set', 'training data', 'example collection', 'data collection'],
  },
  'material:dataset_linked': {
    depicts: 'Dataset grid paired with a link mark showing connected or related data collections.',
    use_when: 'Use when the interface refers to linked datasets, joined records, related data sources, or connected training data.',
    avoid_when: 'Do not use for a single standalone dataset or a generic hyperlink when the data relationship is not important.',
    synonyms: ['linked dataset', 'connected dataset', 'joined data', 'related datasets', 'linked data'],
  },
  'material:schema': {
    depicts: 'Structured schema diagram with connected blocks representing typed fields and data rules.',
    use_when: 'Use when the interface refers to a data schema, typed structure, field model, validation rules, or backend contract.',
    avoid_when: 'Do not use for user preferences, simple forms, or generic settings when typed data structure is not the meaning.',
    synonyms: ['schema', 'data schema', 'typed structure', 'field model', 'data rules'],
  },
  'material:lock': {
    depicts: 'Closed padlock with a shackle and solid body indicating secured or restricted access.',
    use_when: 'Use when the UI shows locked access, protected content, a secured setting, or a restricted action.',
    avoid_when: 'Do not use for verified trust, shielded safety, or password entry when a more specific security icon is needed.',
    synonyms: ['lock', 'locked access', 'restricted', 'protected content', 'secure setting'],
  },
  'material:chevron_left': {
    depicts: 'Single left-pointing chevron angle used for back or previous navigation.',
  },
  'material:chevron_right': {
    depicts: 'Single right-pointing chevron angle used for next or forward navigation.',
  },
  'material:search': {
    depicts: 'Magnifying glass with a circular lens and handle for search or lookup.',
  },
  'material:settings': {
    depicts: 'Gear cog with teeth around a center hub for settings and configuration.',
  },
  'material:terminal': {
    depicts: 'Terminal window prompt with command-line marks for shell or console input.',
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
  script: 'polish-material-registry-records',
  summary,
  total: Object.values(summary).reduce((sum, count) => sum + count, 0),
}, null, 2));
