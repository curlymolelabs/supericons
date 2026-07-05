/**
 * merge-si-concept-icons-into-index.mjs
 *
 * Merges Supericons (si) concept icons from data/supericons/icon-library/agentic-concepts-001
 * into the web and MCP icon catalogs, using the same enriched entry shape as the
 * agentic-ai-tools-logos-001 launch entries.
 *
 * Sources:
 *   - data/supericons/icon-library/agentic-concepts-001/manifest.json (assets)
 *   - data/si-registry/source/libraries/supericons-concepts.json (semantic records)
 *
 * Targets (updated in place, idempotent):
 *   - public/icon-index.json
 *   - mcp/public/icon-index.json
 *
 * Usage: node scripts/merge-si-concept-icons-into-index.mjs
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const COLLECTION_DIR = join(ROOT, 'data', 'supericons', 'icon-library', 'agentic-concepts-001');
const RECORDS_PATH = join(ROOT, 'data', 'si-registry', 'source', 'libraries', 'supericons-concepts.json');
const TARGET_INDEXES = [
  join(ROOT, 'public', 'icon-index.json'),
  join(ROOT, 'mcp', 'public', 'icon-index.json'),
];

const CONCEPT_PACK = 'agentic-concepts-001';
const CONCEPT_ASSET_TYPE = 'concept-icon';
const CONCEPT_RIGHTS = 'Original Supericons artwork. Free to use in personal and commercial projects.';
const CONCEPT_VARIANTS = Object.freeze(['mono-svg']);

function uniqueStrings(values = []) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    output.push(trimmed);
  }
  return output;
}

function cleanSvg(svg) {
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n\s*/g, ' ')
    .trim();
}

function buildIndexEntry(manifestIcon, record, svg) {
  const aliases = uniqueStrings([
    ...(record.synonyms || []),
    record.label,
    record.source_name,
  ]);
  const searchTerms = uniqueStrings([
    ...(record.semantic_tags || []),
    ...(record.ai_filter_tags || []),
    ...(record.secondary_categories || []),
    record.ai_category,
    record.ai_category_label,
    record.job_category,
    record.purpose,
  ]);
  const filterTags = uniqueStrings([
    'agentic-concepts-pack',
    CONCEPT_ASSET_TYPE,
    record.ai_category,
    record.job_category,
    ...(record.ai_filter_tags || []),
  ]);

  const entry = {
    name: record.label,
    id: record.source_name,
    lib: 'si',
    type: manifestIcon.type,
    style: manifestIcon.style,
    aiCategory: record.ai_category,
    aiCategoryLabel: record.ai_category_label,
    aiFilterTags: filterTags,
    jobCategory: record.job_category,
    secondaryCategories: record.secondary_categories || [],
    semanticTags: record.semantic_tags || [],
    synonyms: record.synonyms || [],
    aliases,
    searchTerms,
    filterTags,
    variants: [...CONCEPT_VARIANTS],
    assetType: CONCEPT_ASSET_TYPE,
    pack: CONCEPT_PACK,
    sourceTrust: 'original_artwork',
    meaning: record.purpose,
    rights: CONCEPT_RIGHTS,
    qualityStatus: 'draft',
    access: 'free',
    svg,
  };

  if (record.motion && record.motion.has_motion === true) {
    entry.hasMotion = true;
    if (record.motion.reduced_motion_fallback) {
      entry.reducedMotionFallback = record.motion.reduced_motion_fallback;
    }
  }

  return entry;
}

async function main() {
  const manifest = JSON.parse(await readFile(join(COLLECTION_DIR, 'manifest.json'), 'utf-8'));
  const records = JSON.parse(await readFile(RECORDS_PATH, 'utf-8'));
  const recordsById = new Map(records.map((record) => [record.source_name, record]));

  const entries = [];
  for (const manifestIcon of manifest.icons) {
    const record = recordsById.get(manifestIcon.id);
    if (!record) {
      throw new Error(`No registry record found for manifest icon: ${manifestIcon.id}`);
    }
    const svg = cleanSvg(await readFile(join(COLLECTION_DIR, manifestIcon.path), 'utf-8'));
    entries.push(buildIndexEntry(manifestIcon, record, svg));
  }

  for (const indexPath of TARGET_INDEXES) {
    const index = JSON.parse(await readFile(indexPath, 'utf-8'));
    const mergedIds = new Set(entries.map((entry) => entry.id));

    // Idempotent: drop any previous copies of these entries, then append fresh ones.
    index.icons = index.icons.filter((icon) => !(icon.lib === 'si' && mergedIds.has(icon.id)));
    index.icons.push(...entries);

    // Recompute per-library counts and the total from actual contents.
    const counts = {};
    for (const icon of index.icons) {
      counts[icon.lib] = (counts[icon.lib] || 0) + 1;
    }
    index.libraries = index.libraries.map((library) => ({
      ...library,
      count: counts[library.id] || 0,
    }));
    index.totalCount = index.icons.length;

    await writeFile(indexPath, JSON.stringify(index));
    const siCount = counts.si || 0;
    console.log(`merge-si-concept-icons-into-index: ${indexPath} now has ${siCount} si icons, total ${index.totalCount}`);
  }
}

main().catch((error) => {
  console.error('merge-si-concept-icons-into-index failed:', error.message);
  process.exit(1);
});
