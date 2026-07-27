import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const mode = argument('mode', 'verify');
const outputPath = argument('output');
const projectRef = argument('project-ref', 'kcjmkakdhsqplvasgkjv');
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const migrationPath = resolve(
  'supabase/migrations/20260728100000_local_mcp_attribution_v3.sql',
);
const rollbackPath = resolve(
  'supabase/rollbacks/20260728100000_local_mcp_attribution_v3.down.sql',
);
const managementUrl =
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const readOnlyUrl = `${managementUrl}/read-only`;

assert.ok(['apply', 'verify', 'rollback'].includes(mode), 'Unsupported mode.');
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
assert.match(projectRef, /^[a-z]{20}$/, 'Invalid Supabase project reference.');
assert.ok(outputPath, 'Provide --output for retained evidence.');

const migrationSource = await readFile(migrationPath, 'utf8');
const rollbackSource = await readFile(rollbackPath, 'utf8');
const migrationHash = createHash('sha256').update(migrationSource).digest('hex');
const rollbackHash = createHash('sha256').update(rollbackSource).digest('hex');

async function queryDatabase(query, { readOnly = false } = {}) {
  const response = await fetch(readOnly ? readOnlyUrl : managementUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, parameters: [] }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => null);
  assert.ok(
    response.ok,
    `Database request failed with HTTP ${response.status}.`,
  );
  assert.ok(Array.isArray(payload), 'Unexpected database response.');
  return payload;
}

async function readState() {
  const rows = await queryDatabase(`
    select
      to_regprocedure(
        'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'
      ) is not null as v2_present,
      to_regprocedure(
        'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)'
      ) is not null as v3_present,
      (
        select count(*)::int
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'mcp_usage_events'
          and column_name in (
            'install_hash',
            'install_key_version',
            'client_version',
            'os_platform',
            'episode_id',
            'attempt_id',
            'recovery_chain_id'
          )
      ) as usage_columns,
      (
        select count(*)::int
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'search_final_outcomes'
          and column_name in (
            'install_hash',
            'install_key_version',
            'client_version',
            'os_platform'
          )
      ) as final_columns,
      (
        select count(*)::int
        from pg_trigger
        where tgname = 'zz_enrich_local_mcp_final_attribution_v3'
          and not tgisinternal
      ) as enrichment_triggers,
      (
        select count(*)::int
        from cron.job
        where jobname = 'si-prune-local-mcp-attribution-v3-daily'
      ) as retention_jobs,
      case
        when to_regprocedure(
          'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)'
        ) is null then false
        else has_function_privilege(
          'anon',
          to_regprocedure(
            'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)'
          ),
          'execute'
        )
      end as anon_can_execute_v3,
      case
        when to_regprocedure(
          'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)'
        ) is null then false
        else has_function_privilege(
          'service_role',
          to_regprocedure(
            'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)'
          ),
          'execute'
        )
      end as service_role_can_execute_v3;
  `, { readOnly: true });
  return rows[0];
}

const before = await readState();
assert.equal(before.v2_present, true, 'The required v2 RPC is missing.');

if (mode === 'apply') {
  assert.equal(before.v3_present, false, 'The v3 migration is already applied.');
  assert.equal(Number(before.usage_columns), 0);
  assert.equal(Number(before.final_columns), 0);
  await queryDatabase(migrationSource);
} else if (mode === 'rollback') {
  assert.equal(before.v3_present, true, 'The v3 migration is not applied.');
  await queryDatabase(rollbackSource);
}

const after = await readState();
assert.equal(after.v2_present, true, 'The v2 RPC changed.');

if (mode === 'apply' || mode === 'verify') {
  assert.equal(after.v3_present, true);
  assert.equal(Number(after.usage_columns), 7);
  assert.equal(Number(after.final_columns), 4);
  assert.equal(Number(after.enrichment_triggers), 1);
  assert.equal(Number(after.retention_jobs), 1);
  assert.equal(after.anon_can_execute_v3, false);
  assert.equal(after.service_role_can_execute_v3, true);
} else {
  assert.equal(after.v3_present, false);
  assert.equal(Number(after.enrichment_triggers), 0);
  assert.equal(Number(after.retention_jobs), 0);
}

const evidence = {
  artifact: 'local_mcp_attribution_v3_release_action',
  generated_at: new Date().toISOString(),
  project_ref: projectRef,
  mode,
  migration_sha256: migrationHash,
  rollback_sha256: rollbackHash,
  before,
  after,
  status: 'passed',
};
const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({
  status: evidence.status,
  mode,
  output: resolvedOutput,
  v2_preserved: after.v2_present,
  v3_present: after.v3_present,
}));
