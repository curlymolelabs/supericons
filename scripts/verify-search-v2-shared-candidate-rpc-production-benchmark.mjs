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

function percentile(values, quantile) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
}

const projectRef = readArgument('--project-ref', 'kcjmkakdhsqplvasgkjv');
const expectedMigrationHash = readArgument('--expected-migration-hash');
const managementApiBase = readArgument('--management-api-base', 'https://api.supabase.com/v1');
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const migrationPath =
  'supabase/migrations/20260714190000_search_v2_shared_recommendation_candidates.sql';
const migrationSource = readFileSync(migrationPath);
const migrationText = migrationSource.toString('utf8');
const migrationHash = sha256(migrationSource);
const functionSignature = 'public.si_search_icon_candidates_v4(jsonb,text,integer)';
const migrationVersion = '20260714190000';

assert.match(projectRef, /^[a-z]{20}$/);
assert.match(expectedMigrationHash, /^[0-9a-f]{64}$/);
assert.equal(migrationHash, expectedMigrationHash, 'The shared candidate migration hash changed.');
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');

const queryGroups = [
  { logical_query_index: 0, query_variant: 'home', query_variant_rank: 0 },
  { logical_query_index: 1, query_variant: 'house', query_variant_rank: 0 },
  {
    logical_query_index: 2,
    query_variant: 'home choose navigation icons for a fitness application',
    query_variant_rank: 0,
  },
  { logical_query_index: 3, query_variant: 'home choose navigation', query_variant_rank: 0 },
];
const queryTexts = queryGroups.map((group) => group.query_variant);
const queryGroupsSql = `'${JSON.stringify(queryGroups).replaceAll("'", "''")}'::jsonb`;
const queryTextsSql = `array[${queryTexts
  .map((query) => `'${query.replaceAll("'", "''")}'`)
  .join(',')}]::text[]`;

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
  ) as migration_record_present;
`;

async function queryDatabase(sql, { readOnly }) {
  const suffix = readOnly ? '/database/query/read-only' : '/database/query';
  const response = await fetch(`${managementApiBase}/projects/${projectRef}${suffix}`, {
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
    `Database ${readOnly ? 'read' : 'benchmark'} failed with HTTP ${response.status}.`,
  );
  assert.ok(Array.isArray(payload), 'The database query returned invalid JSON.');
  return payload;
}

function assertAbsentState(row) {
  assert.equal(row?.v3_present, true, 'The v3 control RPC is absent.');
  assert.equal(row?.v4_present, false, 'The v4 benchmark RPC already exists.');
  assert.equal(row?.migration_record_present, false, 'The v4 migration record already exists.');
}

const benchmarkSql = `
begin;

do $benchmark_preflight$
begin
  if to_regprocedure('${functionSignature}') is not null then
    raise exception 'The v4 candidate RPC already exists';
  end if;
  if exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '${migrationVersion}'
  ) then
    raise exception 'The v4 candidate migration is already recorded';
  end if;
end
$benchmark_preflight$;

${migrationText}

create temp table search_v2_candidate_benchmark (
  implementation text not null,
  sample integer not null,
  elapsed_ms double precision not null,
  row_count integer not null
) on commit preserve rows;

do $benchmark$
declare
  started_at timestamptz;
  observed_count integer;
  sample_number integer;
begin
  for sample_number in 1..3 loop
    started_at := clock_timestamp();
    select count(*) into observed_count
    from public.si_search_icon_candidates_v4(${queryGroupsSql}, null, 40);
    insert into search_v2_candidate_benchmark
      values (
        'v4_indexed_candidates',
        sample_number,
        extract(epoch from (clock_timestamp() - started_at)) * 1000,
        observed_count
      );
  end loop;

  for sample_number in 1..3 loop
    started_at := clock_timestamp();
    select count(*) into observed_count
    from public.si_search_icon_candidates_v3(${queryTextsSql}, null, 40);
    insert into search_v2_candidate_benchmark
      values (
        'v3_or_scan_control',
        sample_number,
        extract(epoch from (clock_timestamp() - started_at)) * 1000,
        observed_count
      );
  end loop;

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
      from public.si_search_icon_candidates_v3(${queryTextsSql}, null, 40)
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
      from public.si_search_icon_candidates_v4(${queryGroupsSql}, null, 40)
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
      from public.si_search_icon_candidates_v4(${queryGroupsSql}, null, 40)
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
      from public.si_search_icon_candidates_v3(${queryTextsSql}, null, 40)
    )
  ) then
    raise exception 'Candidate parity failed';
  end if;
end
$benchmark$;

drop function public.si_search_icon_candidates_v4(jsonb, text, integer);
commit;

select
  implementation,
  sample,
  round(elapsed_ms::numeric, 3)::double precision as elapsed_ms,
  row_count
from search_v2_candidate_benchmark
order by implementation, sample;
`;

const beforeRows = await queryDatabase(stateSql, { readOnly: true });
assertAbsentState(beforeRows[0]);
const benchmarkRows = await queryDatabase(benchmarkSql, { readOnly: false });
const afterRows = await queryDatabase(stateSql, { readOnly: true });
assertAbsentState(afterRows[0]);

const indexedRows = benchmarkRows.filter((row) => row.implementation === 'v4_indexed_candidates');
const controlRows = benchmarkRows.filter((row) => row.implementation === 'v3_or_scan_control');
assert.equal(indexedRows.length, 3);
assert.equal(controlRows.length, 3);
assert.equal(new Set(benchmarkRows.map((row) => Number(row.row_count))).size, 1);

const indexedLatencies = indexedRows.map((row) => Number(row.elapsed_ms));
const controlLatencies = controlRows.map((row) => Number(row.elapsed_ms));
const indexedP95 = percentile(indexedLatencies, 0.95);
const controlP95 = percentile(controlLatencies, 0.95);
const speedup = controlP95 / indexedP95;
assert.ok(indexedP95 <= 500, `The indexed v4 candidate p95 was ${indexedP95} ms.`);
assert.ok(speedup >= 3, `The indexed v4 candidate speedup was only ${speedup.toFixed(2)}x.`);

console.log(JSON.stringify({
  status: 'ok',
  project_ref: projectRef,
  migration_sha256: migrationHash,
  workload: {
    logical_queries: queryGroups.length,
    query_variants: queryGroups.length,
    samples_per_implementation: 3,
  },
  indexed_v4: {
    latencies_ms: indexedLatencies,
    p95_ms: indexedP95,
  },
  v3_control: {
    latencies_ms: controlLatencies,
    p95_ms: controlP95,
  },
  speedup: Number(speedup.toFixed(2)),
  exact_result_parity: true,
  v4_absent_before_and_after: true,
  migration_record_absent_before_and_after: true,
}, null, 2));
