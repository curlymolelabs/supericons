import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const projectRef = readArgument('project-ref') || 'kcjmkakdhsqplvasgkjv';
const outputPath = readArgument('output');
const endpoint =
  `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`;

assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
assert.match(projectRef, /^[a-z]{20}$/, 'The Supabase project reference is malformed.');
assert.ok(outputPath, 'Provide --output for the retained baseline.');

const query = `
with bounds as (
  select
    timezone('utc', now()) as cutoff_at,
    timezone('utc', now()) - interval '24 hours' as started_at
),
local_events as (
  select event.*
  from public.mcp_usage_events event, bounds
  where event.channel = 'local_mcp'
    and event.event_type = 'search_outcome'
    and event.created_at >= bounds.started_at
    and event.created_at < bounds.cutoff_at
),
local_finals as (
  select final.*
  from public.search_final_outcomes final, bounds
  where final.channel = 'local_mcp'
    and final.completed_at >= bounds.started_at
    and final.completed_at < bounds.cutoff_at
)
select
  (select started_at from bounds) as started_at,
  (select cutoff_at from bounds) as cutoff_at,
  (select count(*)::int from local_events) as event_count,
  (select count(distinct session_hash)::int from local_events) as session_hash_count,
  (select count(*)::int from local_events where beta_cohort is null)
    as stable_without_cohort,
  (select count(*)::int from local_events where country_code is not null)
    as country_count,
  (select count(*)::int from local_events where ip_hash is not null)
    as ip_hash_count,
  (select count(*)::int from local_events where anonymous_client_hash is not null)
    as anonymous_hash_count,
  (
    select coalesce(jsonb_object_agg(search_outcome, count_value), '{}'::jsonb)
    from (
      select search_outcome, count(*)::int as count_value
      from local_events
      group by search_outcome
      order by search_outcome
    ) grouped
  ) as outcomes,
  (
    select coalesce(jsonb_object_agg(tool_name, count_value), '{}'::jsonb)
    from (
      select tool_name, count(*)::int as count_value
      from local_events
      group by tool_name
      order by tool_name
    ) grouped
  ) as tools,
  (
    select coalesce(
      jsonb_object_agg(coalesce(mcp_server_version, 'unknown'), count_value),
      '{}'::jsonb
    )
    from (
      select mcp_server_version, count(*)::int as count_value
      from local_events
      group by mcp_server_version
      order by mcp_server_version
    ) grouped
  ) as versions,
  (select count(*)::int from local_finals) as final_count,
  to_regprocedure(
    'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'
  ) is not null as v2_present,
  pg_get_functiondef(
    'public.si_log_mcp_search_outcome_v2(text,integer,text,text,text,text,text,text,text,text,text,integer,timestamptz)'::regprocedure
  ) as v2_definition;
`;

const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({ query, parameters: [] }),
  signal: AbortSignal.timeout(30_000),
});
const payload = await response.json().catch(() => null);

assert.ok(response.ok, `The baseline query failed with HTTP ${response.status}.`);
assert.ok(Array.isArray(payload) && payload.length === 1, 'The baseline result is invalid.');

const row = payload[0];
const functionDefinition = String(row.v2_definition || '');
delete row.v2_definition;

assert.equal(row.v2_present, true, 'The existing v2 RPC is missing.');
assert.ok(Number(row.event_count) > 0, 'No stable Local MCP outcomes were observed.');
assert.equal(
  Number(row.event_count),
  Number(row.final_count),
  'Local usage events and final outcomes do not reconcile.',
);
assert.equal(
  Number(row.event_count),
  Number(row.stable_without_cohort),
  'The baseline contains unexpected cohort-labelled traffic.',
);

const artifact = {
  artifact: 'local_channel_attribution_24h_baseline',
  generated_at: new Date().toISOString(),
  project_ref: projectRef,
  transaction_mode: 'read_only',
  query,
  baseline: {
    ...row,
    v2_definition_sha256: createHash('sha256')
      .update(functionDefinition)
      .digest('hex'),
  },
  interpretation: {
    stable_local_outcomes_are_recorded: true,
    final_linkage_is_approximate_until_v3: true,
    durable_installation_identity_available: false,
    country_available: Number(row.country_count) > 0,
  },
  status: 'passed',
};

const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(artifact, null, 2)}\n`);

console.log(JSON.stringify({
  status: artifact.status,
  output: resolvedOutput,
  event_count: row.event_count,
  final_count: row.final_count,
  versions: row.versions,
}));
