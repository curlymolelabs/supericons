import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import http from 'node:http';

const migrationHash = 'e864e9ef9052fa4f894894285fc27993732ef00c46068f2ad2e52818c1b183c3';
const projectRef = 'kcjmkakdhsqplvasgkjv';
const fakeDefinition = 'CREATE FUNCTION public.si_search_icon_candidates_v4() RETURNS void';
const fakeDefinitionSha256 = createHash('sha256').update(fakeDefinition).digest('hex');
const fakeDefinitionMd5 = createHash('md5').update(fakeDefinition).digest('hex');
const runId = '11111111-1111-4111-8111-111111111111';
const otherRunId = '22222222-2222-4222-8222-222222222222';
const observations = {
  preflightReads: 0,
  applyMutations: 0,
  verifyReads: 0,
  rollbackMutations: 0,
  mutationSql: [],
};
let state = 'absent';
let ownerRunId = null;

function stateRow() {
  return {
    v3_present: true,
    v4_present: state === 'present',
    migration_record_present: state === 'present',
    required_tables: 4,
    service_role_present: true,
  };
}

function definitionRow() {
  return {
    function_definition: fakeDefinition,
    function_definition_md5: fakeDefinitionMd5,
    migration_record_count: 1,
    function_comment: `supericons_release_owner:${ownerRunId}`,
    migration_statements: [
      'fixture migration source',
      `supericons_release_owner:${ownerRunId}`,
    ],
  };
}

const server = http.createServer(async (request, response) => {
  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  const body = JSON.parse(rawBody);
  const sql = String(body.query || '');
  const readOnly = request.url.endsWith('/database/query/read-only');
  let payload = [];

  if (readOnly && sql.includes('as v3_present')) {
    if (state === 'absent') observations.preflightReads += 1;
    else observations.verifyReads += 1;
    payload = [stateRow()];
  } else if (readOnly && sql.includes('pg_get_functiondef')) {
    observations.verifyReads += 1;
    payload = [definitionRow()];
  } else if (readOnly && sql.includes('$shared_candidate_postflight$')) {
    observations.verifyReads += 1;
    payload = [];
  } else if (!readOnly && sql.includes('insert into supabase_migrations.schema_migrations')) {
    observations.applyMutations += 1;
    observations.mutationSql.push(sql);
    assert.equal(state, 'absent');
    assert.match(sql, /^(\s*)begin;/);
    assert.match(sql, /create or replace function public\.si_search_icon_candidates_v4/);
    assert.match(sql, /Shared and batched candidate RPC results differ/);
    assert.match(sql, /grant execute on function public\.si_search_icon_candidates_v4/);
    assert.match(sql, /insert into supabase_migrations\.schema_migrations/);
    const ownerMatch = sql.match(/supericons_release_owner:([0-9a-f-]{36})/);
    assert.ok(ownerMatch);
    ownerRunId = ownerMatch[1];
    assert.equal(ownerRunId, runId);
    assert.match(sql, /commit;/);
    state = 'present';
    payload = [definitionRow()];
  } else if (!readOnly && sql.includes('drop function public.si_search_icon_candidates_v4')) {
    observations.rollbackMutations += 1;
    observations.mutationSql.push(sql);
    assert.equal(state, 'present');
    assert.match(sql, /^(\s*)begin;/);
    assert.match(sql, /md5\(pg_get_functiondef/);
    assert.match(sql, new RegExp(`supericons_release_owner:${runId}`));
    assert.match(sql, /drop function public\.si_search_icon_candidates_v4\(jsonb, text, integer\)/);
    assert.match(sql, /delete from supabase_migrations\.schema_migrations/);
    assert.match(sql, /commit;/);
    state = 'absent';
    ownerRunId = null;
    payload = [stateRow()];
  } else {
    response.statusCode = 500;
    response.end(JSON.stringify({ error: 'unexpected_query' }));
    return;
  }

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
});

await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
const port = server.address().port;
const managementApiBase = `http://127.0.0.1:${port}/v1`;

async function runManager(action, extra = []) {
  const args = [
    'scripts/manage-search-v2-shared-candidate-rpc.mjs',
    '--action',
    action,
    '--project-ref',
    projectRef,
    '--expected-migration-hash',
    migrationHash,
    '--management-api-base',
    managementApiBase,
    ...(['inspect', 'apply', 'verify', 'rollback'].includes(action) && !extra.includes('--run-id')
      ? ['--run-id', runId]
      : []),
    ...extra,
  ];
  const child = spawn(process.execPath, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: 'fixture-token',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', resolveExit);
  });
  return {
    exitCode,
    stdout,
    stderr,
    payload: stdout.trim() ? JSON.parse(stdout) : null,
  };
}

try {
  const preflight = await runManager('preflight');
  assert.equal(preflight.exitCode, 0, preflight.stderr);
  assert.equal(preflight.payload.status, 'ok');
  assert.equal(state, 'absent');

  const absentInspection = await runManager('inspect');
  assert.equal(absentInspection.exitCode, 0, absentInspection.stderr);
  assert.equal(absentInspection.payload.status, 'absent');
  assert.equal(state, 'absent');

  const apply = await runManager('apply');
  assert.equal(apply.exitCode, 0, apply.stderr);
  assert.equal(apply.payload.status, 'applied_and_verified');
  assert.equal(apply.payload.function_definition_sha256, fakeDefinitionSha256);
  assert.equal(apply.payload.function_definition_md5, fakeDefinitionMd5);
  assert.equal(state, 'present');

  const presentInspection = await runManager('inspect');
  assert.equal(presentInspection.exitCode, 0, presentInspection.stderr);
  assert.equal(presentInspection.payload.status, 'present_and_verified');
  assert.equal(presentInspection.payload.function_definition_sha256, fakeDefinitionSha256);
  assert.equal(presentInspection.payload.function_definition_md5, fakeDefinitionMd5);
  assert.equal(state, 'present');

  const otherOwnerInspection = await runManager('inspect', ['--run-id', otherRunId]);
  assert.equal(otherOwnerInspection.exitCode, 0, otherOwnerInspection.stderr);
  assert.equal(otherOwnerInspection.payload.status, 'present_other_owner');
  assert.equal(otherOwnerInspection.payload.owner_run_id, runId);
  assert.equal('function_definition_sha256' in otherOwnerInspection.payload, false);

  const otherOwnerVerify = await runManager('verify', [
    '--run-id', otherRunId,
    '--expected-definition-sha256',
    fakeDefinitionSha256,
  ]);
  assert.notEqual(otherOwnerVerify.exitCode, 0);
  assert.match(otherOwnerVerify.stderr, /belongs to another release run/i);
  assert.equal(state, 'present');

  const otherOwnerRollback = await runManager('rollback', [
    '--run-id', otherRunId,
    '--expected-definition-sha256',
    fakeDefinitionSha256,
    '--expected-definition-md5',
    fakeDefinitionMd5,
  ]);
  assert.notEqual(otherOwnerRollback.exitCode, 0);
  assert.match(otherOwnerRollback.stderr, /belongs to another release run/i);
  assert.equal(observations.rollbackMutations, 0);
  assert.equal(state, 'present');

  const verify = await runManager('verify', [
    '--expected-definition-sha256',
    fakeDefinitionSha256,
  ]);
  assert.equal(verify.exitCode, 0, verify.stderr);
  assert.equal(verify.payload.status, 'present_and_verified');
  assert.equal(state, 'present');

  const rejectedRollback = await runManager('rollback', [
    '--expected-definition-sha256',
    '0'.repeat(64),
    '--expected-definition-md5',
    fakeDefinitionMd5,
  ]);
  assert.notEqual(rejectedRollback.exitCode, 0);
  assert.match(rejectedRollback.stderr, /definition changed/i);
  assert.equal(observations.rollbackMutations, 0);
  assert.equal(state, 'present');

  const rollback = await runManager('rollback', [
    '--expected-definition-sha256',
    fakeDefinitionSha256,
    '--expected-definition-md5',
    fakeDefinitionMd5,
  ]);
  assert.equal(rollback.exitCode, 0, rollback.stderr);
  assert.equal(rollback.payload.status, 'removed_and_verified');
  assert.equal(state, 'absent');

  assert.equal(observations.applyMutations, 1);
  assert.equal(observations.rollbackMutations, 1);
  console.log(JSON.stringify({
    status: 'ok',
    preflight_reads: observations.preflightReads,
    verify_reads: observations.verifyReads,
    apply_mutations: observations.applyMutations,
    rollback_mutations: observations.rollbackMutations,
    absent_and_present_inspection: true,
    mismatched_definition_rollback_refused: true,
    mismatched_owner_inspection_not_adopted: true,
    mismatched_owner_verify_refused: true,
    mismatched_owner_rollback_refused: true,
    function_and_migration_history_rolled_back_together: true,
  }, null, 2));
} finally {
  await new Promise((resolveClose, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolveClose();
    });
  });
}
