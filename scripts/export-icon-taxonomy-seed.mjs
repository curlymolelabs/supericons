import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  JOB_CATEGORY_DEFINITIONS,
  JOB_ICON_TAXONOMY_SEED,
} from '../lib/icon-taxonomy-seed.js';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicSnapshotPath = path.join(rootDir, 'public', 'icon-taxonomy.json');
const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260416_icon_taxonomy_seed_p0.sql');

function toSqlText(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function toSqlTextArray(values) {
  if (!values.length) return 'array[]::text[]';
  return `array[${values.map(toSqlText).join(', ')}]::text[]`;
}

const snapshot = {
  version: 'p0.02',
  generatedAt: new Date().toISOString(),
  categories: JOB_CATEGORY_DEFINITIONS,
  entries: JOB_ICON_TAXONOMY_SEED,
};

const valuesSql = JOB_ICON_TAXONOMY_SEED.map((entry) => {
  return `  (${toSqlText(entry.iconId)}, ${toSqlText(entry.sourceLibrary)}, ${toSqlText(entry.jobCategory)}, ${toSqlTextArray(entry.secondaryCategories)})`;
}).join(',\n');

const migrationSql = `-- P0.02 taxonomy seed for the first three job-shaped collections.
-- Source of truth: lib/icon-taxonomy-seed.js

insert into public.icon_metadata (
  icon_id,
  source_library,
  job_category,
  secondary_categories
)
values
${valuesSql}
on conflict (icon_id) do update
set
  source_library = excluded.source_library,
  job_category = excluded.job_category,
  secondary_categories = excluded.secondary_categories,
  updated_at = timezone('utc', now());
`;

await fs.writeFile(publicSnapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
await fs.writeFile(migrationPath, migrationSql, 'utf8');

console.log(`Wrote ${path.relative(rootDir, publicSnapshotPath)}`);
console.log(`Wrote ${path.relative(rootDir, migrationPath)}`);
