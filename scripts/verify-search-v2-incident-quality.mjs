import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { recommendIconsForTask } from '../mcp/recommend-icons.js';
import { searchIcons } from '../mcp/search.js';
import {
  createSemanticRegistryMap,
  getSemanticRecordForIcon,
  loadSemanticRegistryRecords,
  mergeSemanticMatchesIntoIcons,
} from '../mcp/semantic-registry.js';

const icons = JSON.parse(readFileSync('mcp/public/icon-index.json', 'utf8')).icons;
const synonyms = JSON.parse(readFileSync('mcp/public/synonyms.json', 'utf8'));
const semanticMap = createSemanticRegistryMap(loadSemanticRegistryRecords('mcp/public'));

function refs(results) {
  return results.map((result) => `${result.lib}:${result.id}`);
}

function assertRelevantSearch(testCase) {
  const results = searchIcons(testCase.query, icons, synonyms, {
    library: testCase.library,
    libraryMode: 'strict',
    locale: testCase.locale,
    limit: 10,
  });
  const actual = refs(results);
  const top = actual.slice(0, testCase.top || 3);

  assert.ok(
    top.some((ref) => testCase.required.some((pattern) => pattern.test(ref))),
    `${testCase.name}: expected a relevant result in the top ${testCase.top || 3}, received ${actual.join(', ') || 'no results'}`,
  );
  for (const forbidden of testCase.forbiddenTop || []) {
    assert.ok(
      top.every((ref) => !forbidden.test(ref)),
      `${testCase.name}: forbidden result ${forbidden} appeared in ${top.join(', ')}`,
    );
  }
  return actual;
}

const searchCases = [
  {
    name: 'English hard-hat phrase',
    query: 'hard hat construction worker',
    library: 'lucide',
    required: [/^lucide:hard-hat$/],
  },
  {
    name: 'English network graph phrase',
    query: 'network proximity graph nodes',
    library: 'phosphor',
    required: [/^phosphor:(graph|network|share-network)$/],
    forbiddenTop: [/^phosphor:network-(slash|x)$/],
  },
  {
    name: 'English connected-people phrase',
    query: 'connection two people together care relationship',
    library: 'phosphor',
    required: [/^phosphor:(users|users-three|users-four|share-network|link|plugs-connected)$/],
    forbiddenTop: [/^phosphor:wifi/],
  },
  {
    name: 'English disconnected-network phrase',
    query: 'network disconnected broken link',
    library: 'lucide',
    required: [/^lucide:(link-2-off|unlink|unlink-2|wifi-off|network)$/],
  },
  {
    name: 'English engineer hard-hat phrase',
    query: 'engineer hard hat professional person',
    library: 'phosphor',
    required: [/^phosphor:hard-hat$/],
    forbiddenTop: [/^phosphor:(palette|magic-wand|star|calendar-star)$/],
  },
  {
    name: 'English construction crane phrase',
    query: 'crane hook construction',
    required: [/^(tabler:crane|phosphor:crane|phosphor:crane-tower|mingcute:tower_crane_line)$/],
    forbiddenTop: [/(fish-hook|fishing-hook|webhook)/],
  },
  {
    name: 'English tow-truck phrase',
    query: 'tow truck',
    required: [/^(material:auto_towing|tabler:truck-loading|phosphor:truck-trailer|tabler:car-crane)$/],
  },
  {
    name: 'Spanish construction helmet',
    query: 'casco de construcción',
    locale: 'es',
    library: 'lucide',
    required: [/^lucide:hard-hat$/],
  },
  {
    name: 'Spanish connected node graph',
    query: 'red de nodos conectados',
    locale: 'es',
    library: 'phosphor',
    required: [/^phosphor:(graph|network|share-network)$/],
    forbiddenTop: [/^phosphor:wifi/],
  },
  {
    name: 'Japanese connected people',
    query: 'つながった人々',
    locale: 'ja',
    library: 'phosphor',
    required: [/^phosphor:(users|users-three|users-four|share-network|link|plugs-connected)$/],
  },
  {
    name: 'Portuguese pending-task checklist',
    query: 'checklist tarefas pendentes',
    locale: 'pt',
    library: 'lucide',
    required: [/^lucide:(list-check|list-checks|clipboard-check)$/],
  },
  {
    name: 'English construction cleanup',
    query: 'broom cleanup construction',
    library: 'tabler',
    required: [/^tabler:(brush|vacuum-cleaner)$/],
  },
  {
    name: 'Portuguese customers and contacts',
    query: 'clientes empresas contatos',
    locale: 'pt',
    library: 'lucide',
    required: [/^lucide:(users|contact|building|user-round)$/],
  },
  {
    name: 'English excavation vehicle',
    query: 'excavator construction vehicle',
    required: [/(bulldozer|tractor|construction|car-crane)/],
  },
  {
    name: 'English email document',
    query: 'email document',
    library: 'lucide',
    required: [/^lucide:(file-text|mail|files|paperclip|mail-check)$/],
  },
  {
    name: 'English game controller',
    query: 'game controller gaming',
    library: 'phosphor',
    required: [/^phosphor:game-controller/],
  },
  {
    name: 'English inbox work queue',
    query: 'work review queue inbox',
    library: 'phosphor',
    required: [/^phosphor:(tray|tray-arrow-down|stack|inbox)$/],
  },
  {
    name: 'English claw or grab',
    query: 'claw grab grapple',
    library: 'tabler',
    required: [/^tabler:hand-grab$/],
  },
  {
    name: 'English value proposition',
    query: 'why choose us',
    library: 'lucide',
    required: [/^lucide:(badge-check|shield-check|users|award)$/],
  },
  {
    name: 'English celebration and achievement',
    query: 'celebrating success',
    required: [/(celebration|party-popper|trophy|award|rocket-launch)/],
  },
  {
    name: 'Korean magnetic snapping',
    query: '자석 magnet snapping',
    locale: 'ko',
    required: [/(magnet|magnetic)/],
    forbiddenTop: [/(magnet-off|unlink|disconnect)/],
  },
  {
    name: 'Exact xAI brand identity',
    query: 'xAI logo',
    required: [/^si:x-ai$/],
  },
  {
    name: 'Spanish database search',
    query: 'buscar icono de base de datos',
    locale: 'es',
    required: [/(database-search|database_search|database)$/],
    forbiddenTop: [/base[_-]station/i],
  },
  {
    name: 'Spanish code editor',
    query: 'editor de código',
    locale: 'es',
    required: [/(code|terminal|braces)/],
    forbiddenTop: [/editor[_-]choice/i],
  },
];

const observed = searchCases.map((testCase) => ({
  name: testCase.name,
  results: assertRelevantSearch(testCase),
}));

const neckPainResults = searchIcons('neck pain person', icons, synonyms, {
  limit: 10,
});
assert.equal(neckPainResults.length, 0, 'A generic person icon must not be presented as a neck-pain match.');

const openAiCodexResults = refs(searchIcons('openai codex', icons, synonyms, { limit: 10 }));
assert.deepEqual(
  openAiCodexResults,
  ['si:openai-codex-app'],
  'An exact maintained brand query must not be diluted with generic alternatives.',
);

const missingCursorLogo = searchIcons('cursor ai code editor logo', icons, synonyms, { limit: 10 });
assert.equal(
  missingCursorLogo.length,
  0,
  'An unavailable logo must remain an honest no-result instead of returning generic code icons.',
);

for (const [query, prohibitedRef] of [
  ['browser base', 'si:browserbase'],
  ['open claw', 'si:openclaw'],
]) {
  const results = refs(searchIcons(query, icons, synonyms, { limit: 10 }));
  assert.equal(
    results.includes(prohibitedRef),
    false,
    `${query} must not resolve to the blocked brand identity ${prohibitedRef}.`,
  );
}

const recommendation = await recommendIconsForTask({
  task: 'Choose a coherent Phosphor outline icon set for an admin relations view with parent placement, planning attachments, identity aliases, a proximity graph, travel-time links, and an empty state.',
  library: 'phosphor',
  style: 'outline',
  slots: ['Relations graph', 'Planning attachments'],
  limitPerSlot: 3,
  responseMode: 'plan',
  semanticMap,
  searchIconsForQuery: async ({ query, library, style, limit }) => {
    const searchable = icons.filter((icon) => icon.lib === library && icon.type === 'svg' && icon.svg);
    const baseline = searchIcons(query, searchable, synonyms, {
      library,
      libraryMode: 'strict',
      style,
      limit,
    });
    return mergeSemanticMatchesIntoIcons(query, baseline, searchable, semanticMap, { limit });
  },
  buildIconResult: async (icon) => {
    if (!icon?.svg) return null;
    const semantic = getSemanticRecordForIcon(semanticMap, icon);
    return {
      id: icon.id,
      name: icon.name,
      library: icon.lib,
      style: icon.style,
      svg: icon.svg,
      semantic,
    };
  },
});

assert.match(
  recommendation.results[0]?.recommended?.id || '',
  /^(graph|network|share-network|link|plugs-connected)$/,
  'recommendation must resolve the relations-graph slot with a relevant Phosphor icon',
);
assert.match(
  recommendation.results[1]?.recommended?.id || '',
  /^(paperclip|paperclip-horizontal|file|files|file-text)$/,
  'recommendation must resolve the planning-attachments slot with a relevant Phosphor icon',
);

console.log(JSON.stringify({ status: 'ok', search_cases: observed, recommendation: 'passed' }, null, 2));
