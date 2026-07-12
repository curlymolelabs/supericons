import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(readFileSync('mcp/package.json', 'utf8'));
const authorization = JSON.parse(
  readFileSync('data/semantic-search-v2/embedding-sample-authorization.json', 'utf8'),
);
const specification = readFileSync('docs/si-v2/search/search-engine-v2.md', 'utf8');
const decisions = readFileSync('docs/si-v2/search/decisions.md', 'utf8');

const requiredDeterministicFiles = [
  'runtime/generated-search-intent-graph.js',
  'runtime/generated-search-ranking-policy.js',
  'runtime/search-intent-core.js',
  'runtime/search-query-frame.js',
  'runtime/search-ranking-policy.js',
  'recommend-icons.js',
  'search.js',
];

for (const file of requiredDeterministicFiles) {
  assert.ok(packageJson.files.includes(file), `MCP package should include ${file}`);
}

assert.equal(authorization.status, 'revoked_by_owner');
assert.match(specification, /Version: 1\.5/);
assert.match(specification, /FR-31/);
assert.match(specification, /FR-32/);
assert.match(decisions, /D-021: Deterministic-first MCP search and paused provider work/);

const forbiddenPathPattern = /(?:^|[/\\])(?:search-v2-)?embedding-(?:provider|executor|ledger|sample|candidates)/i;
const forbiddenSourcePatterns = [
  /api\.voyageai\.com/i,
  /generativelanguage\.googleapis\.com/i,
  /api\.openai\.com\/v1\/embeddings/i,
  /VOYAGE_API_KEY/,
  /GEMINI_API_KEY/,
  /OPENAI_API_KEY/,
  /ANTHROPIC_API_KEY/,
  /XAI_API_KEY/,
  /COHERE_API_KEY/,
  /MISTRAL_API_KEY/,
  /ZHIPUAI_API_KEY/,
  /api\.anthropic\.com/i,
  /api\.x\.ai/i,
  /api\.cohere\.com/i,
  /api\.mistral\.ai/i,
  /open\.bigmodel\.cn/i,
  /huggingface\.co\/api\/inference/i,
  /search-v2-embedding-executor/i,
];

const hostedDefaultFiles = [
  'supabase/functions/search-icons/index.ts',
  'supabase/functions/_shared/search-engine/catalog.ts',
  'supabase/functions/_shared/search-engine/handle-search-request.ts',
  'supabase/functions/_shared/search-engine/normalize.ts',
  'supabase/functions/_shared/search-engine/rank.ts',
  'supabase/functions/_shared/search-engine/rate-limit.ts',
  'supabase/functions/_shared/search-engine/types.ts',
  'lib/hosted-search-core.js',
  'lib/generated-search-intent-graph.js',
  'lib/generated-search-ranking-policy.js',
  'lib/search-intent-core.js',
  'lib/search-query-frame.js',
  'lib/search-ranking-policy.js',
];

for (const relativePath of packageJson.files) {
  assert.doesNotMatch(relativePath, forbiddenPathPattern, `MCP package should not include ${relativePath}`);
  const absolutePath = path.join('mcp', relativePath);
  if (!statSync(absolutePath).isFile()) continue;
  const source = readFileSync(absolutePath, 'utf8');
  for (const pattern of forbiddenSourcePatterns) {
    assert.doesNotMatch(source, pattern, `${relativePath} should not reference ${pattern}`);
  }
}

for (const file of hostedDefaultFiles) {
  const source = readFileSync(file, 'utf8');
  for (const pattern of forbiddenSourcePatterns) {
    assert.doesNotMatch(source, pattern, `${file} should not reference ${pattern}`);
  }
}

for (const [localPath, runtimePath] of [
  ['lib/generated-search-intent-graph.js', 'mcp/runtime/generated-search-intent-graph.js'],
  ['lib/generated-search-ranking-policy.js', 'mcp/runtime/generated-search-ranking-policy.js'],
  ['lib/search-intent-core.js', 'mcp/runtime/search-intent-core.js'],
  ['lib/search-query-frame.js', 'mcp/runtime/search-query-frame.js'],
  ['lib/search-ranking-policy.js', 'mcp/runtime/search-ranking-policy.js'],
]) {
  assert.equal(
    readFileSync(localPath, 'utf8'),
    readFileSync(runtimePath, 'utf8'),
    `${runtimePath} should match ${localPath}`,
  );
}

console.log(JSON.stringify({
  status: 'ok',
  package: packageJson.name,
  version: packageJson.version,
  deterministic_files: requiredDeterministicFiles.length,
  hosted_default_files: hostedDefaultFiles.length,
  default_path_external_model_provider_calls: 0,
  embedding_authorization_status: authorization.status,
}, null, 2));
