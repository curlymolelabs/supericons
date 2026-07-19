import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const packageRoot = resolve(readArgument('--package-root', 'mcp'));
const expectedIndexGeneratedAt = readArgument('--expected-index-generated-at');
const packagePath = resolve(packageRoot, 'package.json');
const indexPath = resolve(packageRoot, 'public', 'icon-index.json');
const queryFramePath = resolve(packageRoot, 'runtime', 'search-query-frame.js');
const intentCorePath = resolve(packageRoot, 'runtime', 'search-intent-core.js');
const graphPath = resolve(packageRoot, 'runtime', 'generated-search-intent-graph.js');
const rulesPath = resolve(packageRoot, 'runtime', 'generated-search-intent-rules.js');

for (const requiredPath of [
  packagePath,
  indexPath,
  queryFramePath,
  intentCorePath,
  graphPath,
  rulesPath,
]) {
  assert.ok(existsSync(requiredPath), `packaged runtime file is missing: ${requiredPath}`);
}

const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const iconIndex = JSON.parse(readFileSync(indexPath, 'utf8'));
assert.ok(
  Number.isFinite(Date.parse(iconIndex.generatedAt)),
  'packaged icon index must declare a valid generatedAt timestamp',
);
if (expectedIndexGeneratedAt) {
  assert.equal(
    iconIndex.generatedAt,
    expectedIndexGeneratedAt,
    'packaged icon index timestamp must match the release evidence',
  );
}

const { buildSearchQueryFrame } = await import(pathToFileURL(queryFramePath).href);
const { buildIntentQueryVariants } = await import(pathToFileURL(intentCorePath).href);
const observations = [];
for (const query of ['ai slop', 'agent tool call']) {
  const frame = buildSearchQueryFrame(query);
  const variants = buildIntentQueryVariants(query);
  assert.equal(frame.matched, true, `${query} should match packaged query-frame data`);
  assert.ok(frame.meaning_groups.length > 0, `${query} should load a maintained meaning group`);
  assert.ok(frame.positive_concepts.length > 0, `${query} should produce positive concepts`);
  assert.ok(variants.length > 1, `${query} should produce more than the raw query variant`);
  observations.push({
    query,
    meaning_groups: frame.meaning_groups,
    positive_concepts: frame.positive_concepts.length,
    variants: variants.length,
  });
}

console.log(JSON.stringify({
  status: 'ok',
  package: packageJson.name,
  version: packageJson.version,
  index_generated_at: iconIndex.generatedAt,
  runtime_hashes: {
    query_frame: sha256(queryFramePath),
    intent_core: sha256(intentCorePath),
    generated_graph: sha256(graphPath),
    generated_rules: sha256(rulesPath),
  },
  observations,
}, null, 2));
