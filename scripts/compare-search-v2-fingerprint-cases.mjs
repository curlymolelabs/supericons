import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function getArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || '';
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

async function evaluateRoot(root, cases, includeLocale = false) {
  const resolvedRoot = path.resolve(root);
  const searchModule = await import(pathToFileURL(path.join(resolvedRoot, 'mcp', 'search.js')).href);
  const icons = readJson(path.join(resolvedRoot, 'mcp', 'public', 'icon-index.json')).icons;
  const synonyms = readJson(path.join(resolvedRoot, 'mcp', 'public', 'synonyms.json'));

  return new Map(cases.map((entry) => {
    const query = String(entry.query || entry.slot || entry.task || '').trim();
    const results = searchModule.searchIcons(query, icons, synonyms, {
      library: entry.requested_library || null,
      libraryMode: entry.library_mode || 'all',
      locale: includeLocale ? entry.locale || null : null,
      limit: 8,
    });
    return [entry.case_id, results.map((icon) => `${icon.lib}:${icon.id}`)];
  }));
}

function fingerprint(observations, cases) {
  return createHash('sha256')
    .update(JSON.stringify(cases.map((entry) => ({
      case_id: entry.case_id,
      result_refs: observations.get(entry.case_id),
    }))))
    .digest('hex');
}

const baselineRoot = getArgument('baseline-root');
assert.ok(baselineRoot, 'Provide --baseline-root with the extracted baseline source path.');
const currentRoot = path.resolve(getArgument('current-root') || '.');
const evaluationSet = readJson(path.join(currentRoot, 'data', 'semantic-search-v2', 'evaluation-set.json'));
const cases = evaluationSet.query_groups.flatMap((group) => group.queries || []);
assert.equal(cases.length, 225);

const baseline = await evaluateRoot(baselineRoot, cases);
const current = await evaluateRoot(currentRoot, cases);
const baselineWithLocale = await evaluateRoot(baselineRoot, cases, true);
const currentWithLocale = await evaluateRoot(currentRoot, cases, true);
const changed = [];
const localeRouteChanged = [];

for (const entry of cases) {
  const baselineRefs = baseline.get(entry.case_id);
  const currentRefs = current.get(entry.case_id);
  if (JSON.stringify(baselineRefs) === JSON.stringify(currentRefs)) continue;
  changed.push({
    case_id: entry.case_id,
    query: String(entry.query || entry.slot || entry.task || '').trim(),
    before: baselineRefs,
    after: currentRefs,
  });
}
for (const entry of cases) {
  const baselineRefs = baselineWithLocale.get(entry.case_id);
  const currentRefs = currentWithLocale.get(entry.case_id);
  if (JSON.stringify(baselineRefs) === JSON.stringify(currentRefs)) continue;
  localeRouteChanged.push({
    case_id: entry.case_id,
    query: String(entry.query || entry.slot || entry.task || '').trim(),
    before: baselineRefs,
    after: currentRefs,
  });
}

console.log(JSON.stringify({
  status: 'ok',
  evaluated_cases: cases.length,
  baseline_fingerprint: fingerprint(baseline, cases),
  current_fingerprint: fingerprint(current, cases),
  baseline_locale_route_fingerprint: fingerprint(baselineWithLocale, cases),
  current_locale_route_fingerprint: fingerprint(currentWithLocale, cases),
  changed_case_count: changed.length,
  changed,
  locale_route_changed_case_count: localeRouteChanged.length,
  locale_route_changed: localeRouteChanged,
}, null, 2));
