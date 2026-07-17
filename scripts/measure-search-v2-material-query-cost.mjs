import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

import { searchIcons } from '../mcp/search.js';
import { SEARCH_CASES } from './search-v2-gate-c-workload.mjs';

const POSTGRES_IMAGE = 'postgres:17-alpine';
const ITERATIONS = 500;
const containerName = `supericons-material-benchmark-${randomUUID().slice(0, 8)}`;

const outlineIcons = JSON.parse(readFileSync('mcp/public/icon-index.json', 'utf8')).icons;
const synonyms = JSON.parse(readFileSync('mcp/public/synonyms.json', 'utf8'));
const materialBundle = JSON.parse(gunzipSync(
  readFileSync('mcp/material-mcp-assets.json.gz'),
).toString('utf8'));

const workload = SEARCH_CASES.map((entry) => ({
  case_id: entry.id,
  query: entry.query,
  locale: entry.locale,
  library: entry.library || null,
  library_mode: entry.library_mode,
}));

function runDocker(args, { input = null, allowFailure = false } = {}) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `docker ${args[0]} failed`);
  }
  return result;
}

function psql(sql, { input = null } = {}) {
  return runDocker([
    'exec', '-i', containerName,
    'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres',
    '-A', '-t', '-F', '|',
    ...(sql ? ['-c', sql] : []),
  ], { input }).stdout.trim();
}

function csvField(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
  return sorted[index];
}

function sqlArray(values) {
  return `array[${values.map((value) => `'${value.replaceAll("'", "''")}'`).join(',')}]::text[]`;
}

function materialCandidateIds(entry) {
  if (entry.library_mode === 'strict' && entry.library !== 'material') return [];
  return searchIcons(entry.query, outlineIcons, synonyms, {
    library: 'material',
    libraryMode: 'strict',
    style: 'outline',
    locale: entry.locale,
    limit: 40,
  }).map((icon) => `material:${icon.id}`);
}

function benchmark(ids, returnSvg) {
  if (ids.length === 0) {
    return {
      branch_executed: false,
      samples: 0,
      rows: 0,
      payload_bytes: 0,
      p50_ms: 0,
      p95_ms: 0,
      max_ms: 0,
    };
  }
  const output = psql(
    `select sample, elapsed_ms, matched_rows, payload_bytes from benchmark_material_query(${sqlArray(ids)}, 'outline', ${returnSvg ? 'true' : 'false'}, ${ITERATIONS});`,
  );
  const rows = output.split(/\r?\n/).filter(Boolean).map((line) => {
    const [sample, elapsed, matched, payloadBytes] = line.split('|');
    return {
      sample: Number(sample),
      elapsed_ms: Number(elapsed),
      matched_rows: Number(matched),
      payload_bytes: Number(payloadBytes),
    };
  });
  const durations = rows.map((row) => row.elapsed_ms);
  return {
    branch_executed: true,
    samples: rows.length,
    rows: rows[0]?.matched_rows || 0,
    payload_bytes: rows[0]?.payload_bytes || 0,
    p50_ms: Number(percentile(durations, 0.5).toFixed(4)),
    p95_ms: Number(percentile(durations, 0.95).toFixed(4)),
    max_ms: Number(Math.max(...durations).toFixed(4)),
  };
}

try {
  runDocker([
    'run', '-d', '--name', containerName,
    '-e', 'POSTGRES_PASSWORD=postgres',
    '-e', 'POSTGRES_DB=postgres',
    POSTGRES_IMAGE,
  ]);

  let ready = false;
  let consecutiveSqlChecks = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const check = runDocker([
      'exec', containerName,
      'psql', '-X', '-q', '-U', 'postgres', '-d', 'postgres', '-c', 'select 1;',
    ], { allowFailure: true });
    consecutiveSqlChecks = check.status === 0 ? consecutiveSqlChecks + 1 : 0;
    if (consecutiveSqlChecks >= 3) {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready.');

  psql(`
    create table material_icon_assets (
      icon_id text not null,
      variant text not null,
      svg text not null,
      primary key (icon_id, variant)
    );
    create or replace function benchmark_material_query(
      p_ids text[],
      p_variant text,
      p_return_svg boolean,
      p_iterations integer
    ) returns table(
      sample integer,
      elapsed_ms double precision,
      matched_rows integer,
      payload_bytes bigint
    )
    language plpgsql as $$
    declare
      started_at timestamptz;
      row_total integer;
      byte_total bigint;
      iteration integer;
    begin
      for iteration in 1..p_iterations loop
        started_at := clock_timestamp();
        if p_return_svg then
          select count(*), coalesce(sum(octet_length(svg)), 0)
          into row_total, byte_total
          from material_icon_assets
          where variant = p_variant and icon_id = any(p_ids);
        else
          select count(*), 0
          into row_total, byte_total
          from material_icon_assets
          where variant = p_variant and icon_id = any(p_ids);
        end if;
        sample := iteration;
        elapsed_ms := extract(epoch from (clock_timestamp() - started_at)) * 1000;
        matched_rows := row_total;
        payload_bytes := byte_total;
        return next;
      end loop;
    end;
    $$;
  `);

  const csv = Object.entries(materialBundle.assets).map(([key, svg]) => {
    const separator = key.indexOf(':');
    const variant = key.slice(0, separator);
    const iconId = key.slice(separator + 1);
    return [csvField(`material:${iconId}`), csvField(variant), csvField(svg)].join(',');
  }).join('\n');
  psql('', {
    input: `copy material_icon_assets (icon_id, variant, svg) from stdin with (format csv);\n${csv}\n\\.\nanalyze material_icon_assets;\n`,
  });

  const cases = workload.map((entry) => {
    const candidateIds = materialCandidateIds(entry);
    return {
      ...entry,
      material_candidate_count: candidateIds.length,
      eligibility_query: benchmark(candidateIds, false),
      final_svg_query: benchmark(candidateIds.slice(0, 8), true),
      no_material_branch_ms: 0,
    };
  });

  console.log(JSON.stringify({
    status: 'ok',
    environment: 'disposable_postgresql_17',
    hosted_network_included: false,
    material_asset_rows: Object.keys(materialBundle.assets).length,
    iterations_per_query: ITERATIONS,
    cases,
  }, null, 2));
} finally {
  runDocker(['rm', '-f', containerName], { allowFailure: true });
}
