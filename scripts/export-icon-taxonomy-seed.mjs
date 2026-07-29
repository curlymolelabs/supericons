import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  JOB_CATEGORY_DEFINITIONS,
  JOB_ICON_TAXONOMY_SEED,
} from '../lib/icon-taxonomy-seed.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicSnapshotPath = path.join(rootDir, 'public', 'icon-taxonomy.json');

const snapshot = {
  version: 'p0.02',
  generatedAt: new Date().toISOString(),
  categories: JOB_CATEGORY_DEFINITIONS,
  entries: JOB_ICON_TAXONOMY_SEED,
};

await fs.writeFile(publicSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

console.log(`Wrote ${path.relative(rootDir, publicSnapshotPath)}`);
