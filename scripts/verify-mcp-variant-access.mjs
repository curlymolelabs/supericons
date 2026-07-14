import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildVariantLookupCandidates,
  compareVariantPreference,
  iconMatchesRequestedStyle,
  normalizeRequestedStyle,
  VARIANT_STYLES,
} from '../mcp/variant-support.js';
import {
  createSemanticRegistryMap,
  buildPublicSemanticPayload,
  getSemanticRecordForIcon,
  loadSemanticRegistryRecords,
} from '../mcp/semantic-registry.js';
import { searchIcons } from '../mcp/search.js';
import { recommendIconsForTask } from '../mcp/recommend-icons.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);
const mcpPublicDir = join(repoRoot, 'mcp', 'public');
const outlinePath = join(mcpPublicDir, 'icon-index.json');
const solidPath = join(mcpPublicDir, 'icon-index-solid.json');

function fail(message) {
  console.error(`verify-mcp-variant-access failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function choosePreferredIconCandidate(candidates, requestedStyle) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return [...candidates].sort((left, right) => compareVariantPreference(left, right, requestedStyle))[0] || null;
}

function resolveAccessibleIcon(freeIcons, id, library, style = VARIANT_STYLES.ANY) {
  const requestedStyle = normalizeRequestedStyle(style);
  const accessibleIcons = freeIcons.filter((icon) => icon.lib === library);

  for (const candidateId of buildVariantLookupCandidates({ library, id, style: requestedStyle })) {
    const candidates = accessibleIcons.filter((icon) =>
      icon.id.toLowerCase() === candidateId.toLowerCase() && iconMatchesRequestedStyle(icon, requestedStyle)
    );
    const chosen = choosePreferredIconCandidate(candidates, requestedStyle);
    if (chosen) return chosen;
  }

  return null;
}

if (!existsSync(outlinePath)) {
  fail('missing mcp/public/icon-index.json');
}

if (!existsSync(solidPath)) {
  fail('missing mcp/public/icon-index-solid.json');
}

const outline = readJson(outlinePath);
const solid = readJson(solidPath);
const synonyms = readJson(join(mcpPublicDir, 'synonyms.json'));
const freeIcons = [
  ...(outline.icons || []).filter((entry) => (entry.type === 'svg' && entry.svg) || (entry.lib === 'material' && entry.type === 'font')),
  ...(solid.icons || []).filter((entry) => entry.type === 'svg' && entry.svg),
];

const semanticRegistryMap = createSemanticRegistryMap(loadSemanticRegistryRecords(mcpPublicDir));

const verificationCases = [
  {
    library: 'material',
    id: 'menu',
    style: 'solid',
    expectedAssetId: 'menu',
    expectedSemanticId: 'material:menu',
  },
  {
    library: 'tabler',
    id: 'ad_circle',
    style: 'solid',
    expectedAssetId: 'ad-circle',
    expectedSemanticId: 'tabler:ad_circle',
  },
  {
    library: 'phosphor',
    id: 'arrow_arc_left',
    style: 'solid',
    expectedAssetId: 'arrow-arc-left-fill',
    expectedSemanticId: 'phosphor:arrow_arc_left',
  },
  {
    library: 'heroicons',
    id: 'archive_box_arrow_down',
    style: 'solid',
    expectedAssetId: 'archive-box-arrow-down',
    expectedSemanticId: 'heroicons:archive_box_arrow_down',
  },
  {
    library: 'bootstrap',
    id: 'archive',
    style: 'solid',
    expectedAssetId: 'archive-fill',
    expectedSemanticId: 'bootstrap:archive',
  },
  {
    library: 'ionicons',
    id: 'alert_circle_outline',
    style: 'solid',
    expectedAssetId: 'alert-circle',
    expectedSemanticId: 'ionicons:alert_circle_outline',
  },
  {
    library: 'iconoir',
    id: 'airplay',
    style: 'solid',
    expectedAssetId: 'airplay',
    expectedSemanticId: 'iconoir:airplay',
  },
  {
    library: 'mingcute',
    id: 'home_1',
    style: 'solid',
    expectedAssetId: 'home_1_fill',
    expectedSemanticId: 'mingcute:home_1',
  },
];

for (const testCase of verificationCases) {
  const resolved = resolveAccessibleIcon(freeIcons, testCase.id, testCase.library, testCase.style);
  if (!resolved) {
    fail(`could not resolve ${testCase.library}:${testCase.id} as style=${testCase.style}`);
  }

  if (resolved.id !== testCase.expectedAssetId) {
    fail(`resolved ${testCase.library}:${testCase.id} to ${resolved.id}, expected ${testCase.expectedAssetId}`);
  }

  if (!iconMatchesRequestedStyle(resolved, testCase.style) && resolved.lib !== 'material') {
    fail(`resolved ${testCase.library}:${testCase.id} to a non-${testCase.style} asset`);
  }

  const semanticRecord = getSemanticRecordForIcon(semanticRegistryMap, resolved);
  if (!semanticRecord) {
    fail(`resolved ${testCase.library}:${testCase.id} to ${resolved.id} but found no semantic record`);
  }

  if (semanticRecord.icon_id !== testCase.expectedSemanticId) {
    fail(`semantic fallback for ${testCase.library}:${testCase.id} resolved to ${semanticRecord.icon_id}, expected ${testCase.expectedSemanticId}`);
  }
}

const searchCases = [
  {
    query: 'archive',
    library: 'bootstrap',
    style: 'solid',
    expectedAssetId: 'archive-fill',
  },
  {
    query: 'archive box arrow down',
    library: 'heroicons',
    style: 'solid',
    expectedAssetId: 'archive-box-arrow-down',
  },
  {
    query: 'home 1',
    library: 'mingcute',
    style: 'solid',
    expectedAssetId: 'home_1_fill',
  },
];

for (const searchCase of searchCases) {
  const results = searchIcons(searchCase.query, freeIcons, synonyms, {
    library: searchCase.library,
    style: searchCase.style,
    limit: 5,
  });
  if (!results.length) {
    fail(`search returned no results for ${searchCase.library} query "${searchCase.query}" with style=${searchCase.style}`);
  }
  if (results[0].id !== searchCase.expectedAssetId) {
    fail(`search for ${searchCase.library} query "${searchCase.query}" returned ${results[0].id}, expected ${searchCase.expectedAssetId}`);
  }
  if (!iconMatchesRequestedStyle(results[0], searchCase.style)) {
    fail(`search for ${searchCase.library} query "${searchCase.query}" did not return a ${searchCase.style} variant first`);
  }
}

async function buildIconResult(icon, options = {}) {
  const requestedStyle = normalizeRequestedStyle(options.style);
  const semanticRecord = getSemanticRecordForIcon(semanticRegistryMap, icon);
  if (!icon.svg) {
    throw new Error(`Verification requires a real SVG for ${icon.lib}:${icon.id}.`);
  }
  return {
    id: icon.id,
    library: icon.lib,
    name: icon.name,
    style: icon.lib === 'material' ? requestedStyle : (icon.style || 'outline'),
    svg: icon.svg,
    semantic: semanticRecord ? buildPublicSemanticPayload(semanticRecord) : null,
  };
}

const recommendationChecks = [
  {
    task: 'Pick icons for a toolbar',
    library: 'bootstrap',
    style: 'solid',
    slot: 'Archive action',
    expectedAssetId: 'archive-fill',
  },
  {
    task: 'Pick icons for a home navigation bar',
    library: 'mingcute',
    style: 'solid',
    slot: 'Home tab',
    expectedAssetPattern: /^home_.*_fill$/i,
  },
];

for (const check of recommendationChecks) {
  const recommendation = await recommendIconsForTask({
    task: check.task,
    library: check.library,
    style: check.style,
    slots: [check.slot],
    limitPerSlot: 3,
    searchIconsForQuery: ({ query, library, style, limit }) => searchIcons(query, freeIcons, synonyms, { query, library, style, limit }),
    buildIconResult,
    semanticMap: semanticRegistryMap,
  });

  const recommended = recommendation.results?.[0]?.recommended;
  if (!recommended) {
    fail(`recommendation returned no primary result for ${check.library} slot "${check.slot}"`);
  }
  if (check.expectedAssetId && recommended.id !== check.expectedAssetId) {
    fail(`recommendation for ${check.library} slot "${check.slot}" returned ${recommended.id}, expected ${check.expectedAssetId}`);
  }
  if (check.expectedAssetPattern && !check.expectedAssetPattern.test(recommended.id)) {
    fail(`recommendation for ${check.library} slot "${check.slot}" returned ${recommended.id}, expected pattern ${check.expectedAssetPattern}`);
  }
  if (recommended.style !== check.style) {
    fail(`recommendation for ${check.library} slot "${check.slot}" returned style=${recommended.style}, expected ${check.style}`);
  }
}

const totalChecks = verificationCases.length + searchCases.length + recommendationChecks.length;
console.log(`verify-mcp-variant-access: ok (${totalChecks} checks across lookup, search, and recommendation)`); 
