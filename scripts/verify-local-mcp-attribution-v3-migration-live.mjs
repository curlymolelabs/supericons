import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function migrationBody(source) {
  return source
    .replace(/\bbegin;\s*/i, '')
    .replace(/\s*commit;\s*$/i, '')
    .trim();
}

const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const projectRef = readArgument('project-ref') || 'kcjmkakdhsqplvasgkjv';
const outputPath = readArgument('output');
const migrationPath = resolve(
  'supabase/migrations/20260728100000_local_mcp_attribution_v3.sql',
);
const rollbackPath = resolve(
  'supabase/rollbacks/20260728100000_local_mcp_attribution_v3.down.sql',
);
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const readOnlyEndpoint = `${endpoint}/read-only`;

assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
assert.match(projectRef, /^[a-z]{20}$/, 'The Supabase project reference is malformed.');
assert.ok(outputPath, 'Provide --output for retained evidence.');

const migrationSource = await readFile(migrationPath, 'utf8');
const rollbackSource = await readFile(rollbackPath, 'utf8');
const migrationHash = createHash('sha256').update(migrationSource).digest('hex');
const rollbackHash = createHash('sha256').update(rollbackSource).digest('hex');

async function queryDatabase(query, { readOnly = false } = {}) {
  const response = await fetch(readOnly ? readOnlyEndpoint : endpoint, {
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
    `The ${readOnly ? 'read-only' : 'transactional'} database check failed with HTTP ${response.status}.`,
  );
  assert.ok(Array.isArray(payload), 'The database response is invalid.');
  return payload;
}

const v2Signature =
  'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)';
const v3Signature =
  'public.si_ingest_local_mcp_search_outcome_v3(text,integer,uuid,uuid,uuid,text,integer,text,text,text,text,text,text,text,text,integer,text,text,text,text,text,text)';

const preflightRows = await queryDatabase(`
  select
    to_regprocedure('${v2Signature}') is not null as v2_present,
    to_regprocedure('${v3Signature}') is null as v3_absent,
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
    ) as preexisting_usage_columns;
`, { readOnly: true });

assert.equal(preflightRows[0]?.v2_present, true, 'The v2 RPC is missing.');
assert.equal(preflightRows[0]?.v3_absent, true, 'The v3 RPC already exists.');
assert.equal(
  Number(preflightRows[0]?.preexisting_usage_columns),
  0,
  'The v3 usage columns already exist.',
);

const stateAssertions = `
  do $verification$
  begin
    if to_regprocedure('${v2Signature}') is null then
      raise exception 'v2 RPC changed during v3 migration';
    end if;
    if to_regprocedure('${v3Signature}') is null then
      raise exception 'v3 RPC was not created';
    end if;
    if (
      select count(*)
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
    ) <> 7 then
      raise exception 'v3 usage columns are incomplete';
    end if;
    if (
      select count(*)
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'search_final_outcomes'
        and column_name in (
          'install_hash',
          'install_key_version',
          'client_version',
          'os_platform'
        )
    ) <> 4 then
      raise exception 'v3 final columns are incomplete';
    end if;
    if not exists (
      select 1
      from pg_trigger
      where tgname = 'zz_enrich_local_mcp_final_attribution_v3'
        and not tgisinternal
    ) then
      raise exception 'v3 final enrichment trigger is missing';
    end if;
    if not exists (
      select 1
      from cron.job
      where jobname = 'si-prune-local-mcp-attribution-v3-daily'
    ) then
      raise exception 'v3 retention job is missing';
    end if;
  end;
  $verification$;
`;

await queryDatabase(`
  begin;
  set local lock_timeout = '3000ms';
  set local statement_timeout = '30000ms';
  ${migrationBody(migrationSource)}
  ${stateAssertions}
  rollback;
`);

await queryDatabase(`
  begin;
  set local lock_timeout = '3000ms';
  set local statement_timeout = '30000ms';
  ${migrationBody(migrationSource)}
  ${migrationBody(rollbackSource)}
  do $rollback_verification$
  begin
    if to_regprocedure('${v2Signature}') is null then
      raise exception 'v2 RPC changed during rollback';
    end if;
    if to_regprocedure('${v3Signature}') is not null then
      raise exception 'v3 RPC remained after rollback';
    end if;
    if exists (
      select 1
      from pg_trigger
      where tgname = 'zz_enrich_local_mcp_final_attribution_v3'
        and not tgisinternal
    ) then
      raise exception 'v3 trigger remained after rollback';
    end if;
    if exists (
      select 1
      from cron.job
      where jobname = 'si-prune-local-mcp-attribution-v3-daily'
    ) then
      raise exception 'v3 retention job remained after rollback';
    end if;
  end;
  $rollback_verification$;
  rollback;
`);

const postflightRows = await queryDatabase(`
  select
    to_regprocedure('${v2Signature}') is not null as v2_present,
    to_regprocedure('${v3Signature}') is null as v3_absent,
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
    ) as persisted_usage_columns,
    (
      select count(*)::int
      from cron.job
      where jobname = 'si-prune-local-mcp-attribution-v3-daily'
    ) as persisted_jobs;
`, { readOnly: true });

assert.equal(postflightRows[0]?.v2_present, true);
assert.equal(postflightRows[0]?.v3_absent, true);
assert.equal(Number(postflightRows[0]?.persisted_usage_columns), 0);
assert.equal(Number(postflightRows[0]?.persisted_jobs), 0);

const artifact = {
  artifact: 'local_mcp_attribution_v3_migration_transactional_verification',
  generated_at: new Date().toISOString(),
  project_ref: projectRef,
  migration_sha256: migrationHash,
  rollback_sha256: rollbackHash,
  production_mutations_persisted: 0,
  apply_transaction_rolled_back: true,
  rollback_transaction_rolled_back: true,
  v2_rpc_preserved: true,
  v3_objects_absent_after_test: true,
  status: 'passed',
};

const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({
  status: artifact.status,
  output: resolvedOutput,
  production_mutations_persisted: artifact.production_mutations_persisted,
}));
