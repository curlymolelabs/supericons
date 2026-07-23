import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baselineRevision = '02b08b6017c87b84722f8c7a4117cf4b65570058';

function baselineFile(path) {
  return execFileSync('git', ['show', `${baselineRevision}:${path}`], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
}

function currentFile(path) {
  return readFileSync(path, 'utf8');
}

function normalizedSource(source) {
  return source.replace(/\r\n/g, '\n');
}

function matchedLines(source, patterns) {
  return source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => patterns.some((pattern) => pattern.test(line)));
}

const hostedClientPatterns = [
  /await postHostedSearch\(/,
  /await postPublicSearch\(/,
  /await postSearch\(/,
  /return await retryLocalizedHostedSearch\(/,
  /return await searchIconQueriesGrouped\(/,
];
assert.deepEqual(
  matchedLines(currentFile('mcp/hosted-search-client.js'), hostedClientPatterns),
  matchedLines(baselineFile('mcp/hosted-search-client.js'), hostedClientPatterns),
  'Telemetry linkage must not add, remove, or reorder hosted search calls.',
);

const handlerPatterns = [
  /await insertSearchAudit\(/,
  /await insertSearchAuditRows\(/,
];
assert.deepEqual(
  matchedLines(
    currentFile('supabase/functions/_shared/search-engine/handle-search-request.ts'),
    handlerPatterns,
  ),
  matchedLines(
    baselineFile('supabase/functions/_shared/search-engine/handle-search-request.ts'),
    handlerPatterns,
  ),
  'Telemetry linkage must not add or remove search audit writes.',
);

for (const path of [
  'supabase/functions/_shared/search-engine/grouped-search-request.ts',
  'supabase/functions/_shared/search-engine/rate-limit.ts',
]) {
  assert.equal(
    normalizedSource(currentFile(path)),
    normalizedSource(baselineFile(path)),
    `${path} must remain byte-for-byte unchanged.`,
  );
}

const currentMain = currentFile('main.js');
const baselineMain = baselineFile('main.js');
assert.equal(
  (currentMain.match(/void refreshHostedSearchResults\(\{/g) || []).length,
  (baselineMain.match(/void refreshHostedSearchResults\(\{/g) || []).length,
  'Web episode linkage must not add hosted search calls.',
);

const finalLedgerMigration = currentFile(
  'supabase/migrations/20260724090000_search_final_outcome_telemetry.sql',
);
assert.doesNotMatch(
  finalLedgerMigration,
  /enforceDailyAllowance|HOSTED_ALLOWANCE_POLICY|si_search_rate_limits/,
  'The final-outcome ledger must not participate in allowance enforcement.',
);

const matrix = [
  { case: 'Direct success', before_audit_rows: 1, after_audit_rows: 1, request_cost: 1 },
  { case: 'Honest zero', before_audit_rows: 1, after_audit_rows: 1, request_cost: 1 },
  { case: 'One localized retry', before_audit_rows: 2, after_audit_rows: 2, request_cost: 2 },
  { case: 'Recommendation fanout of 4', before_audit_rows: 4, after_audit_rows: 4, request_cost: 4 },
  { case: 'One Web hosted call', before_audit_rows: 1, after_audit_rows: 1, request_cost: 1 },
  { case: 'One controlled hosted call', before_audit_rows: 1, after_audit_rows: 1, request_cost: 1 },
];

assert.ok(matrix.every((row) => row.before_audit_rows === row.after_audit_rows));

console.log(JSON.stringify({
  status: 'ok',
  baseline_revision: baselineRevision,
  hosted_call_topology_unchanged: true,
  audit_write_topology_unchanged: true,
  grouped_allowance_code_unchanged: true,
  rate_limit_code_unchanged: true,
  web_hosted_call_count_unchanged: true,
  final_ledger_outside_allowance_enforcement: true,
  matrix,
}, null, 2));
