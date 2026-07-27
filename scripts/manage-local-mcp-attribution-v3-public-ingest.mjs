import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function argument(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function migrationBody(source) {
  return source
    .replace(/\bbegin;\s*/i, '')
    .replace(/\s*commit;\s*$/i, '')
    .trim();
}

const mode = argument('mode', 'verify');
const outputPath = argument('output');
const projectRef = argument('project-ref', 'kcjmkakdhsqplvasgkjv');
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const migrationPath = resolve(
  'supabase/migrations/20260728110000_local_mcp_attribution_v3_public_ingest.sql',
);
const rollbackPath = resolve(
  'supabase/rollbacks/20260728110000_local_mcp_attribution_v3_public_ingest.down.sql',
);
const managementUrl =
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

assert.ok(
  ['transaction-test', 'apply', 'verify', 'rollback'].includes(mode),
  'Unsupported mode.',
);
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
assert.ok(outputPath, 'Provide --output for retained evidence.');

const migrationSource = await readFile(migrationPath, 'utf8');
const rollbackSource = await readFile(rollbackPath, 'utf8');
const migrationHash = createHash('sha256').update(migrationSource).digest('hex');
const rollbackHash = createHash('sha256').update(rollbackSource).digest('hex');

async function queryDatabase(query) {
  const response = await fetch(managementUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, parameters: [] }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => null);
  assert.ok(response.ok, `Database request failed with HTTP ${response.status}.`);
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
      ) is not null as internal_v3_present,
      to_regprocedure(
        'public.si_log_local_mcp_search_outcome_v3(jsonb)'
      ) is not null as public_v3_present,
      (
        select count(*)::int
        from vault.decrypted_secrets
        where name = 'supericons_local_install_hash_v1'
          and char_length(decrypted_secret) >= 64
      ) as hash_secrets,
      case
        when to_regprocedure(
          'public.si_log_local_mcp_search_outcome_v3(jsonb)'
        ) is null then false
        else has_function_privilege(
          'anon',
          to_regprocedure('public.si_log_local_mcp_search_outcome_v3(jsonb)'),
          'execute'
        )
      end as anon_can_execute;
  `);
  return rows[0];
}

const before = await readState();
assert.equal(before.v2_present, true);
assert.equal(before.internal_v3_present, true);
assert.equal(Number(before.hash_secrets), 1);

if (mode === 'transaction-test') {
  assert.equal(before.public_v3_present, false);
  await queryDatabase(`
    begin;
    ${migrationBody(migrationSource)}
    do $verify$
    begin
      if to_regprocedure(
        'public.si_log_local_mcp_search_outcome_v3(jsonb)'
      ) is null then
        raise exception 'Public v3 ingest RPC was not created';
      end if;
      if not has_function_privilege(
        'anon',
        to_regprocedure('public.si_log_local_mcp_search_outcome_v3(jsonb)'),
        'execute'
      ) then
        raise exception 'Anonymous package caller cannot execute v3 ingest';
      end if;
    end;
    $verify$;
    rollback;
  `);
} else if (mode === 'apply') {
  assert.equal(before.public_v3_present, false);
  await queryDatabase(migrationSource);
} else if (mode === 'rollback') {
  assert.equal(before.public_v3_present, true);
  await queryDatabase(rollbackSource);
}

const after = await readState();
assert.equal(after.v2_present, true);
assert.equal(after.internal_v3_present, true);
if (mode === 'apply' || mode === 'verify') {
  assert.equal(after.public_v3_present, true);
  assert.equal(after.anon_can_execute, true);
} else {
  assert.equal(after.public_v3_present, false);
  assert.equal(after.anon_can_execute, false);
}

const evidence = {
  artifact: 'local_mcp_attribution_v3_public_ingest_release_action',
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
  public_v3_present: after.public_v3_present,
  v2_preserved: after.v2_present,
}));
