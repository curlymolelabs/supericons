import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRef = 'kcjmkakdhsqplvasgkjv';
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex >= 0
  ? process.argv[outputIndex + 1]
  : '.tmp/website-popularity-live-audit.json';

assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN is required.');
assert.ok(outputPath, 'The audit output path is required.');

const sql = `
begin read only;
set local statement_timeout = '15000ms';
with cutoffs(label, cutoff_at) as (
  values
    ('current'::text, now()),
    ('one_day_ago'::text, now() - interval '1 day'),
    ('three_days_ago'::text, now() - interval '3 days'),
    ('seven_days_ago'::text, now() - interval '7 days')
), cutoff_bounds as (
  select
    label,
    cutoff_at,
    (
      date_trunc('day', cutoff_at at time zone 'UTC')
      - interval '29 days'
    ) at time zone 'UTC' as window_start,
    (
      date_trunc('day', cutoff_at at time zone 'UTC')
      - interval '6 days'
    ) at time zone 'UTC' as recent_start
  from cutoffs
), hosted_base as (
  select
    usage.created_at,
    lower(trim(coalesce(
      nullif(trim(usage.metadata -> 'returned_icon_refs' ->> 0), ''),
      case
        when nullif(trim(usage.library_filter), '') is not null
          and nullif(trim(usage.query_norm), '') is not null
          then trim(usage.library_filter) || ':' || trim(usage.query_norm)
        else null
      end
    ))) as icon_ref,
    lower(trim(nullif(usage.metadata -> 'returned_icon_refs' ->> 0, ''))) as recorded_ref,
    lower(trim(
      case
        when nullif(trim(usage.library_filter), '') is not null
          and nullif(trim(usage.query_norm), '') is not null
          then trim(usage.library_filter) || ':' || trim(usage.query_norm)
        else null
      end
    )) as reconstructed_ref
  from public.mcp_usage_events as usage
  where usage.created_at >= (
      select min(window_start) from cutoff_bounds
    )
    and usage.created_at < (select max(cutoff_at) from cutoff_bounds)
    and usage.channel = 'hosted_mcp'
    and usage.environment in ('production', 'legacy')
    and usage.tool_name = 'get_icon'
    and usage.event_type = 'tool_call'
    and usage.status = 'ok'
    and usage.result_count = 1
    and coalesce(
      usage.metadata ->> 'traffic_class',
      'unclassified_live'
    ) not in ('controlled_test', 'preview', 'local')
    and coalesce(usage.beta_cohort, '') not like 'controlled-run:%'
    and coalesce(usage.beta_cohort, '') not like '%:founder_controlled%'
    and coalesce(usage.beta_cohort, '') not like '%:controlled_%'
), web_base as (
  select
    evidence.created_at,
    lower(trim(evidence.icon_id)) as icon_ref
  from public.icon_evidence as evidence
  where evidence.created_at >= (
      select min(window_start) from cutoff_bounds
    )
    and evidence.created_at < (select max(cutoff_at) from cutoff_bounds)
    and evidence.signal_type = 'copy'
    and evidence.icon_id is not null
    and lower(trim(evidence.domain)) in (
      'supericons.dev',
      'www.supericons.dev'
    )
), confirmed_source as (
  select created_at, icon_ref from hosted_base
  union all
  select created_at, icon_ref from web_base
), scored as (
  select
    bounds.label,
    source.icon_ref,
    count(distinct (
      source.created_at at time zone 'UTC'
    )::date)::integer as active_days_30d,
    count(distinct (
      source.created_at at time zone 'UTC'
    )::date) filter (
      where source.created_at >= bounds.recent_start
    )::integer as active_days_7d
  from cutoff_bounds as bounds
  inner join confirmed_source as source
    on source.created_at >= bounds.window_start
    and source.created_at < bounds.cutoff_at
  where source.icon_ref
    ~ '^[a-z0-9][a-z0-9_-]*:[^[:space:]:]+$'
  group by bounds.label, source.icon_ref
), ranked as (
  select
    scored.*,
    row_number() over (
      partition by scored.label
      order by
        scored.active_days_30d desc,
        scored.active_days_7d desc,
        scored.icon_ref asc
    )::integer as rank
  from scored
)
select
  (select cutoff_at::text from cutoff_bounds where label = 'current') as cutoff_at,
  (select window_start::text from cutoff_bounds where label = 'current') as window_start,
  (
    select jsonb_object_agg(label, qualifying_count)
    from (
      select label, count(*)::integer as qualifying_count
      from ranked
      where active_days_30d >= 3
      group by label
    ) counts
  ) as qualifying_counts,
  (
    select jsonb_object_agg(label, refs)
    from (
      select
        label,
        jsonb_agg(icon_ref order by rank) as refs
      from ranked
      where active_days_30d >= 3
      group by label
    ) lists
  ) as qualifying_refs,
  (
    select count(*)::integer
    from hosted_base
    where recorded_ref is not null
      and reconstructed_ref is not null
  ) as comparable_hosted_refs,
  (
    select count(*)::integer
    from hosted_base
    where recorded_ref is not null
      and reconstructed_ref is not null
      and recorded_ref <> reconstructed_ref
  ) as mismatched_hosted_refs;
rollback;
`;

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
    signal: AbortSignal.timeout(20_000),
  },
);
const rawPayload = await response.json().catch(() => null);
assert.ok(response.ok, `Live popularity audit failed with HTTP ${response.status}.`);
const payload = Array.isArray(rawPayload) ? rawPayload[0] : rawPayload;
assert.ok(payload && typeof payload === 'object', 'Live popularity audit returned invalid JSON.');

const [outlineIndex, solidIndex] = await Promise.all([
  readFile('public/icon-index.json', 'utf8').then(JSON.parse),
  readFile('public/icon-index-solid.json', 'utf8').then(JSON.parse),
]);
const outlineRefs = new Set(outlineIndex.icons.map((icon) => `${icon.lib}:${icon.id}`.toLowerCase()));
const solidRefs = new Set(solidIndex.icons.map((icon) => `${icon.lib}:${icon.id}`.toLowerCase()));
const labels = ['current', 'one_day_ago', 'three_days_ago', 'seven_days_ago'];

function styleList(label, styleRefs, limit) {
  const refs = Array.isArray(payload.qualifying_refs?.[label])
    ? payload.qualifying_refs[label]
    : [];
  return refs.filter((ref) => styleRefs.has(ref)).slice(0, limit);
}

function overlap(left, right) {
  const rightSet = new Set(right);
  return left.filter((ref) => rightSet.has(ref)).length;
}

const top50 = Object.fromEntries(labels.map((label) => [
  label,
  styleList(label, outlineRefs, 50),
]));
const top20 = Object.fromEntries(labels.map((label) => [
  label,
  styleList(label, outlineRefs, 20),
]));
const currentTop50 = top50.current;
const currentTop20 = top20.current;
const stability = Object.fromEntries(labels.slice(1).map((label) => [
  label,
  {
    top_50_overlap: overlap(currentTop50, top50[label]),
    top_20_overlap: overlap(currentTop20, top20[label]),
  },
]));

const result = {
  artifact: 'website_popularity_live_read_only_audit',
  status: 'ok',
  transaction_mode: 'read_only',
  project_ref: projectRef,
  cutoff_at: payload.cutoff_at,
  window_start: payload.window_start,
  qualifying_counts: payload.qualifying_counts,
  current_outline_qualifying: styleList('current', outlineRefs, Number.MAX_SAFE_INTEGER).length,
  current_solid_qualifying: styleList('current', solidRefs, Number.MAX_SAFE_INTEGER).length,
  current_top_20: currentTop20,
  current_solid_top_20: styleList('current', solidRefs, 20),
  stability,
  comparable_hosted_refs: Number(payload.comparable_hosted_refs || 0),
  mismatched_hosted_refs: Number(payload.mismatched_hosted_refs || 0),
  mutations: 0,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(result, null, 2));
