import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

function readArgument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const action = readArgument('--action');
const projectRef = readArgument('--project-ref', 'kcjmkakdhsqplvasgkjv');
const expectedMigrationHash = readArgument('--expected-migration-hash');
const expectedDefinitionSha256 = readArgument('--expected-definition-sha256');
const expectedDefinitionMd5 = readArgument('--expected-definition-md5');
const managementApiBase = readArgument('--management-api-base', 'https://api.supabase.com/v1');
const migrationPath =
  'supabase/migrations/20260714190000_search_v2_shared_recommendation_candidates.sql';
const migrationVersion = '20260714190000';
const migrationName = 'search_v2_shared_recommendation_candidates';
const functionSignature = 'public.si_search_icon_candidates_v4(jsonb,text,integer)';
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const migrationSource = readFileSync(migrationPath);
const migrationText = migrationSource.toString('utf8');
const migrationHash = sha256(migrationSource);

assert.match(projectRef, /^[a-z]{20}$/);
assert.match(expectedMigrationHash, /^[0-9a-f]{64}$/);
assert.equal(migrationHash, expectedMigrationHash, 'The shared candidate migration hash changed.');
assert.ok(['plan', 'preflight', 'inspect', 'apply', 'verify', 'rollback'].includes(action));

const readOnlyQueryUrl =
  `${managementApiBase}/projects/${projectRef}/database/query/read-only`;
const mutationQueryUrl =
  `${managementApiBase}/projects/${projectRef}/database/query`;

async function queryDatabase(sql, { readOnly }) {
  assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
  const response = await fetch(readOnly ? readOnlyQueryUrl : mutationQueryUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: sql, parameters: [] }),
    signal: AbortSignal.timeout(60_000),
  });
  const payload = await response.json().catch(() => null);
  assert.ok(
    response.status === 200 || response.status === 201,
    `Database ${readOnly ? 'read' : 'mutation'} failed with HTTP ${response.status}.`,
  );
  assert.ok(Array.isArray(payload), 'The database query returned invalid JSON.');
  return payload;
}

function verifyStateRow(row, {
  expectFunction,
  expectMigration,
}) {
  assert.ok(row && typeof row === 'object');
  assert.equal(row.v3_present, true, 'The required v3 candidate RPC is absent.');
  assert.equal(row.v4_present, expectFunction, 'The v4 candidate RPC state is unexpected.');
  assert.equal(
    row.migration_record_present,
    expectMigration,
    'The v4 migration-history state is unexpected.',
  );
  assert.equal(Number(row.required_tables), 4, 'A shared-pipeline table is absent.');
  assert.equal(row.service_role_present, true, 'The service role is absent.');
}

const stateSql = `
select
  to_regprocedure('public.si_search_icon_candidates_v3(text[],text,integer)') is not null
    as v3_present,
  to_regprocedure('${functionSignature}') is not null
    as v4_present,
  exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '${migrationVersion}'
      and name = '${migrationName}'
  ) as migration_record_present,
  (
    select count(*)::int
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'icon_catalog',
        'icon_search_private_manifest',
        'icon_search_private_features',
        'icon_search_public_registry_metadata'
      )
  ) as required_tables,
  exists (select 1 from pg_roles where rolname = 'service_role') as service_role_present;
`;

const parityGroups = `jsonb_build_array(
  jsonb_build_object(
    'logical_query_index', 0,
    'query_variant', 'settings',
    'query_variant_rank', 0
  ),
  jsonb_build_object(
    'logical_query_index', 1,
    'query_variant', 'hello',
    'query_variant_rank', 0
  ),
  jsonb_build_object(
    'logical_query_index', 2,
    'query_variant', 'cog',
    'query_variant_rank', 0
  ),
  jsonb_build_object(
    'logical_query_index', 3,
    'query_variant', 'respond',
    'query_variant_rank', 0
  )
)`;

const postflightSql = `
do $shared_candidate_postflight$
begin
  if to_regprocedure('${functionSignature}') is null then
    raise exception 'Shared candidate RPC was not created';
  end if;
  if not has_function_privilege(
    'service_role',
    '${functionSignature}',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute the shared candidate RPC';
  end if;
  if exists (
    select 1
    from pg_proc p
    cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) permission
    where p.oid = '${functionSignature}'::regprocedure
      and permission.grantee = 0
      and permission.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC can execute the shared candidate RPC';
  end if;
  if exists (
    (
      select
        query_variant_rank as logical_query_index,
        query_variant,
        icon_id,
        name,
        source_library,
        style,
        icon_type,
        lexical_rank,
        registry_rank,
        avoid_rank
      from public.si_search_icon_candidates_v3(
        array['settings', 'hello', 'cog', 'respond'],
        null,
        40
      )
      except all
      select
        logical_query_index,
        query_variant,
        icon_id,
        name,
        source_library,
        style,
        icon_type,
        lexical_rank,
        registry_rank,
        avoid_rank
      from public.si_search_icon_candidates_v4(${parityGroups}, null, 40)
    )
    union all
    (
      select
        logical_query_index,
        query_variant,
        icon_id,
        name,
        source_library,
        style,
        icon_type,
        lexical_rank,
        registry_rank,
        avoid_rank
      from public.si_search_icon_candidates_v4(${parityGroups}, null, 40)
      except all
      select
        query_variant_rank as logical_query_index,
        query_variant,
        icon_id,
        name,
        source_library,
        style,
        icon_type,
        lexical_rank,
        registry_rank,
        avoid_rank
      from public.si_search_icon_candidates_v3(
        array['settings', 'hello', 'cog', 'respond'],
        null,
        40
      )
    )
  ) then
    raise exception 'Shared and batched candidate RPC results differ';
  end if;
end
$shared_candidate_postflight$;
`;

function definitionSql() {
  return `
select
  pg_get_functiondef('${functionSignature}'::regprocedure) as function_definition,
  md5(pg_get_functiondef('${functionSignature}'::regprocedure)) as function_definition_md5,
  (
    select count(*)::int
    from supabase_migrations.schema_migrations
    where version = '${migrationVersion}'
      and name = '${migrationName}'
  ) as migration_record_count;
`;
}

function summarizeDefinition(row) {
  assert.equal(Number(row.migration_record_count), 1);
  assert.equal(typeof row.function_definition, 'string');
  assert.match(row.function_definition_md5, /^[0-9a-f]{32}$/);
  return {
    function_definition_sha256: sha256(row.function_definition),
    function_definition_md5: row.function_definition_md5,
  };
}

async function main() {
if (action === 'plan') {
  console.log(JSON.stringify({
    status: 'ok',
    action,
    project_ref: projectRef,
    migration_version: migrationVersion,
    migration_sha256: migrationHash,
    mutations: {
      shared_candidate_rpc_creations: 1,
      migration_history_inserts: 1,
      conditional_shared_candidate_rpc_drops: 1,
      conditional_migration_history_deletes: 1,
    },
  }, null, 2));
  return;
}

if (action === 'preflight') {
  const rows = await queryDatabase(stateSql, { readOnly: true });
  verifyStateRow(rows[0], {
    expectFunction: false,
    expectMigration: false,
  });
  console.log(JSON.stringify({
    status: 'ok',
    action,
    project_ref: projectRef,
    migration_sha256: migrationHash,
    v3_present: true,
    v4_present: false,
    migration_record_present: false,
  }, null, 2));
  return;
}

if (action === 'inspect') {
  const stateRows = await queryDatabase(stateSql, { readOnly: true });
  const state = stateRows[0];
  assert.ok(state && typeof state === 'object');
  assert.equal(state.v3_present, true, 'The required v3 candidate RPC is absent.');
  assert.equal(Number(state.required_tables), 4, 'A shared-pipeline table is absent.');
  assert.equal(state.service_role_present, true, 'The service role is absent.');
  if (!state.v4_present && !state.migration_record_present) {
    console.log(JSON.stringify({
      status: 'absent',
      action,
      project_ref: projectRef,
      migration_version: migrationVersion,
      migration_sha256: migrationHash,
    }, null, 2));
    return;
  }
  assert.equal(
    state.v4_present,
    state.migration_record_present,
    'The shared candidate RPC and migration history disagree.',
  );
  await queryDatabase(postflightSql, { readOnly: true });
  const definitionRows = await queryDatabase(definitionSql(), { readOnly: true });
  console.log(JSON.stringify({
    status: 'present_and_verified',
    action,
    project_ref: projectRef,
    migration_version: migrationVersion,
    migration_sha256: migrationHash,
    ...summarizeDefinition(definitionRows[0]),
  }, null, 2));
  return;
}

if (action === 'apply') {
  const migrationRecordTag = '$shared_candidate_migration_record$';
  assert.equal(migrationText.includes(migrationRecordTag), false);
  const applySql = `
begin;
do $shared_candidate_preflight$
begin
  if to_regprocedure('public.si_search_icon_candidates_v3(text[],text,integer)') is null then
    raise exception 'Required v3 candidate RPC is absent';
  end if;
  if to_regprocedure('${functionSignature}') is not null then
    raise exception 'Shared candidate RPC already exists';
  end if;
  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '${migrationVersion}'
  ) then
    raise exception 'Shared candidate migration is already recorded';
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    raise exception 'Required service_role is absent';
  end if;
end
$shared_candidate_preflight$;

${migrationText}

${postflightSql}

insert into supabase_migrations.schema_migrations (
  version,
  statements,
  name
) values (
  '${migrationVersion}',
  array[${migrationRecordTag}${migrationText}${migrationRecordTag}]::text[],
  '${migrationName}'
);
commit;
${definitionSql()}
`;
  const rows = await queryDatabase(applySql, { readOnly: false });
  const definition = summarizeDefinition(rows[0]);
  console.log(JSON.stringify({
    status: 'applied_and_verified',
    action,
    project_ref: projectRef,
    migration_version: migrationVersion,
    migration_sha256: migrationHash,
    ...definition,
  }, null, 2));
  return;
}

if (action === 'verify') {
  const stateRows = await queryDatabase(stateSql, { readOnly: true });
  verifyStateRow(stateRows[0], {
    expectFunction: true,
    expectMigration: true,
  });
  await queryDatabase(postflightSql, { readOnly: true });
  const definitionRows = await queryDatabase(definitionSql(), { readOnly: true });
  const definition = summarizeDefinition(definitionRows[0]);
  if (expectedDefinitionSha256) {
    assert.equal(
      definition.function_definition_sha256,
      expectedDefinitionSha256,
      'The shared candidate RPC definition changed.',
    );
  }
  console.log(JSON.stringify({
    status: 'present_and_verified',
    action,
    project_ref: projectRef,
    migration_version: migrationVersion,
    migration_sha256: migrationHash,
    ...definition,
  }, null, 2));
  return;
}

assert.match(expectedDefinitionSha256, /^[0-9a-f]{64}$/);
assert.match(expectedDefinitionMd5, /^[0-9a-f]{32}$/);
const definitionRows = await queryDatabase(definitionSql(), { readOnly: true });
const definition = summarizeDefinition(definitionRows[0]);
assert.equal(
  definition.function_definition_sha256,
  expectedDefinitionSha256,
  'Rollback refused because the shared candidate RPC definition changed.',
);
assert.equal(
  definition.function_definition_md5,
  expectedDefinitionMd5,
  'Rollback refused because the shared candidate RPC database fingerprint changed.',
);

const rollbackSql = `
begin;
do $shared_candidate_rollback$
begin
  if to_regprocedure('${functionSignature}') is null then
    raise exception 'Shared candidate RPC is already absent';
  end if;
  if md5(pg_get_functiondef('${functionSignature}'::regprocedure)) <> '${expectedDefinitionMd5}' then
    raise exception 'Shared candidate RPC changed before rollback';
  end if;
  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '${migrationVersion}'
      and name = '${migrationName}'
  ) then
    raise exception 'Shared candidate migration record changed before rollback';
  end if;
end
$shared_candidate_rollback$;
drop function public.si_search_icon_candidates_v4(jsonb, text, integer);
delete from supabase_migrations.schema_migrations
where version = '${migrationVersion}'
  and name = '${migrationName}';
commit;
${stateSql}
`;
const rollbackRows = await queryDatabase(rollbackSql, { readOnly: false });
verifyStateRow(rollbackRows[0], {
  expectFunction: false,
  expectMigration: false,
});
console.log(JSON.stringify({
  status: 'removed_and_verified',
  action,
  project_ref: projectRef,
  migration_version: migrationVersion,
  migration_sha256: migrationHash,
  function_definition_sha256: expectedDefinitionSha256,
  function_definition_md5: expectedDefinitionMd5,
}, null, 2));
}

await main();
