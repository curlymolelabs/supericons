import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getBaseSemanticIdsForVariant,
  getVariantConceptId,
  getVariantStrategyForLibrary,
  librarySupportsSolid,
  VARIANT_STYLES,
} from '../mcp/variant-support.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const OUTLINE_INDEX_PATH = path.join(repoRoot, 'public', 'icon-index.json');
const SOLID_INDEX_PATH = path.join(repoRoot, 'public', 'icon-index-solid.json');
const REGISTRY_PATH = path.join(repoRoot, 'public', 'registry', 'records.json');
const SCREENSHOT_ROOT = path.join(repoRoot, 'output', 'icon_screenshot');

function readJson(filePath) {
  return fs.readFile(filePath, 'utf8').then((text) => JSON.parse(text));
}

function buildRecommendedFileName(library, assetId, assetStyle, strategy) {
  if (strategy.kind === 'material-fill-axis' || strategy.kind === 'same-id-style-pair') {
    return `${library}_${assetId}_${assetStyle}.png`;
  }
  return `${library}_${assetId}.png`;
}

function deriveRegistrySourceNameCandidate(library, assetId) {
  const strategy = getVariantStrategyForLibrary(library);
  const conceptId = getVariantConceptId(library, assetId);
  if (strategy.assetSeparator === 'hyphen') {
    return conceptId.replace(/-/g, '_');
  }
  return conceptId;
}

function getOutlineEntriesForLibrary(outlineIcons, library) {
  return outlineIcons
    .filter((icon) => icon.lib === library)
    .map((icon) => ({
      asset_id: icon.id,
      asset_name: icon.name,
      asset_style: VARIANT_STYLES.OUTLINE,
      asset_source_catalog: 'public/icon-index.json',
      capture_mode: 'catalog_svg_asset',
    }));
}

function getSolidEntriesForLibrary(outlineIcons, solidIcons, library) {
  if (library === 'material') {
    return outlineIcons
      .filter((icon) => icon.lib === library)
      .map((icon) => ({
        asset_id: icon.id,
        asset_name: icon.name,
        asset_style: VARIANT_STYLES.SOLID,
        asset_source_catalog: 'public/icon-index.json',
        capture_mode: 'material_fill_axis',
        material_fill: 1,
      }));
  }

  if (!librarySupportsSolid(library)) {
    return [];
  }

  return solidIcons
    .filter((icon) => icon.lib === library)
    .map((icon) => ({
      asset_id: icon.id,
      asset_name: icon.name,
      asset_style: VARIANT_STYLES.SOLID,
      asset_source_catalog: 'public/icon-index-solid.json',
      capture_mode: 'catalog_svg_asset',
    }));
}

function sortEntries(left, right) {
  if (left.asset_id !== right.asset_id) {
    return left.asset_id.localeCompare(right.asset_id);
  }
  return left.asset_style.localeCompare(right.asset_style);
}

async function main() {
  const [outlineIndex, solidIndex, registryRecords] = await Promise.all([
    readJson(OUTLINE_INDEX_PATH),
    readJson(SOLID_INDEX_PATH),
    readJson(REGISTRY_PATH),
  ]);

  const outlineIcons = Array.isArray(outlineIndex.icons) ? outlineIndex.icons : [];
  const solidIcons = Array.isArray(solidIndex.icons) ? solidIndex.icons : [];
  const registryById = new Map(
    (Array.isArray(registryRecords) ? registryRecords : []).map((record) => [record.icon_id, record])
  );

  const libraryIds = [...new Set((outlineIndex.libraries || []).map((library) => library.id))];

  for (const library of libraryIds) {
    const strategy = getVariantStrategyForLibrary(library);
    const screenshotFolder = path.join(SCREENSHOT_ROOT, library);
    await fs.mkdir(screenshotFolder, { recursive: true });

    const entries = [
      ...getOutlineEntriesForLibrary(outlineIcons, library),
      ...getSolidEntriesForLibrary(outlineIcons, solidIcons, library),
    ].sort(sortEntries);

    const mappedEntries = entries.map((entry, index) => {
      const registryLookupCandidates = getBaseSemanticIdsForVariant({
        library,
        id: entry.asset_id,
      });
      const currentRegistryRecord = registryLookupCandidates
        .map((candidate) => registryById.get(candidate))
        .find(Boolean) || null;

      return {
        capture_order: index + 1,
        asset_id: entry.asset_id,
        asset_name: entry.asset_name,
        asset_style: entry.asset_style,
        asset_source_catalog: entry.asset_source_catalog,
        capture_mode: entry.capture_mode,
        ...(typeof entry.material_fill === 'number' ? { material_fill: entry.material_fill } : {}),
        recommended_screenshot_file_name: buildRecommendedFileName(
          library,
          entry.asset_id,
          entry.asset_style,
          strategy
        ),
        base_concept_id: getVariantConceptId(library, entry.asset_id),
        registry_source_name_candidate: deriveRegistrySourceNameCandidate(library, entry.asset_id),
        registry_lookup_candidates: registryLookupCandidates,
        current_public_registry_icon_id: currentRegistryRecord?.icon_id || null,
        current_public_registry_source_name: currentRegistryRecord?.source_name || null,
      };
    });

    const payload = {
      generated_at: new Date().toISOString(),
      library,
      screenshot_folder: path.relative(repoRoot, screenshotFolder).replaceAll(path.sep, '/'),
      source_catalogs: {
        outline: 'public/icon-index.json',
        solid: library === 'material'
          ? 'public/icon-index.json (material fill axis)'
          : (librarySupportsSolid(library) ? 'public/icon-index-solid.json' : null),
        registry: 'public/registry/records.json',
      },
      variant_strategy: {
        kind: strategy.kind,
        supports_solid: librarySupportsSolid(library),
      },
      naming_rule: strategy.kind === 'material-fill-axis' || strategy.kind === 'same-id-style-pair'
        ? `${library}_{asset_id}_{style}.png`
        : `${library}_{asset_id}.png`,
      counts: {
        outline_capture_targets: mappedEntries.filter((entry) => entry.asset_style === VARIANT_STYLES.OUTLINE).length,
        solid_capture_targets: mappedEntries.filter((entry) => entry.asset_style === VARIANT_STYLES.SOLID).length,
        total_capture_targets: mappedEntries.length,
        current_public_registry_matches: mappedEntries.filter((entry) => entry.current_public_registry_icon_id).length,
      },
      entries: mappedEntries,
    };

    const outputPath = path.join(screenshotFolder, 'screenshot-mapping.json');
    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  console.log(`build-screenshot-mapping-lists: wrote mapping files for ${libraryIds.length} libraries under output/icon_screenshot`);
}

await main();
