import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { searchIcons } from '../mcp/search.js';

function read(path) {
  return readFileSync(path, 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

const evaluationSet = readJson('data/semantic-search-v2/evaluation-set.json');
const icons = readJson('mcp/public/icon-index.json').icons;
const synonyms = readJson('mcp/public/synonyms.json');
const handler = read('supabase/functions/_shared/search-engine/handle-search-request.ts');
const betaEndpoint = read('supabase/functions/mcp-search-v2-beta/index.ts');
const webEndpoint = read('supabase/functions/search-icons/index.ts');
const stableMcpEndpoint = read('supabase/functions/mcp-search/index.ts');

assert.match(handler, /candidateRpcName = 'si_search_icon_candidates'/);
assert.match(handler, /hydrateFinalSvg = false/);
assert.match(handler, /\.from\('icon_catalog'\)\s*\.select\('icon_id, svg'\)\s*\.in\('icon_id', resultIconIds\)/s);
assert.match(handler, /const results = finalRankedResults\.map\(\(row\) =>/);
assert.match(handler, /\.\.\.row,\s*semantic: buildPublicSemanticPayload\(publicRecord\)/s);
const betaVariant = betaEndpoint.includes("measurementVariant: 'control'") ? 'control' : 'treatment';
if (betaVariant === 'control') {
  assert.match(betaEndpoint, /candidateRpcName: 'si_search_icon_candidates'/);
  assert.match(betaEndpoint, /hydrateFinalSvg: false/);
} else {
  assert.match(betaEndpoint, /measurementVariant: 'treatment'/);
  assert.match(betaEndpoint, /candidateRpcName: 'si_search_icon_candidates_v2'/);
  assert.match(betaEndpoint, /hydrateFinalSvg: true/);
}
assert.doesNotMatch(webEndpoint, /si_search_icon_candidates_v2|hydrateFinalSvg/);
assert.doesNotMatch(stableMcpEndpoint, /si_search_icon_candidates_v2|hydrateFinalSvg/);

const cases = evaluationSet.query_groups.flatMap((group) => group.queries || []);
assert.equal(cases.length, 225);
assert.equal(new Set(cases.map((entry) => entry.case_id)).size, 225);

const observations = cases.map((entry) => {
  const query = String(entry.query || entry.slot || entry.task || '').trim();
  const results = searchIcons(query, icons, synonyms, {
    library: entry.requested_library || null,
    libraryMode: entry.library_mode || 'all',
    limit: 8,
  });
  return {
    case_id: entry.case_id,
    result_refs: results.map((icon) => `${icon.lib}:${icon.id}`),
  };
});

assert.equal(observations.length, 225);
assert.equal(observations.every((entry) => Array.isArray(entry.result_refs)), true);
const fingerprint = createHash('sha256').update(JSON.stringify(observations)).digest('hex');

console.log(JSON.stringify({
  status: 'ok',
  fixed_suite_cases_executed: observations.length,
  stable_case_ids: 225,
  deterministic_result_fingerprint: fingerprint,
  stable_web_endpoint_uses_existing_rpc: true,
  stable_mcp_endpoint_uses_existing_rpc: true,
  beta_measurement_variant: betaVariant,
  beta_endpoint_uses_lightweight_rpc: betaVariant === 'treatment',
  beta_final_svg_hydration_enabled: betaVariant === 'treatment',
  public_semantic_mapping_preserved: true,
}, null, 2));
