// CP-07 hosted allowance measurement: read-only aggregate over search_request_audit
// for the trailing 30 days. Reproduces the distribution, concentration, and
// exceedance evidence in docs/si-v2/search/experiments/hosted-allowance-measurement-2026-07-19.md.
//
// Trigger: run manually with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set
// (see supabase/.env.local): node scripts/measure-hosted-allowance-distribution.mjs
// Side effects: none; read-only REST queries, prints aggregate JSON to stdout.
// No raw identifiers are printed; clients are counted by pre-hashed ip_hash only.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('missing env');
const since = new Date(Date.now() - 30 * 864e5).toISOString();

const rows = [];
let from = 0;
const page = 1000;
for (;;) {
  const res = await fetch(
    `${url}/rest/v1/search_request_audit?select=created_at,ip_hash,session_hash,source,status,result_count,latency_ms&created_at=gte.${since}&order=created_at.asc&limit=${page}&offset=${from}`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } },
  );
  if (!res.ok && res.status !== 206) throw new Error(`fetch ${res.status}`);
  const batch = await res.json();
  rows.push(...batch);
  if (batch.length < page) break;
  from += page;
}

const PUBLIC_SOURCES = new Set(['web', 'local_web', 'mcp', 'mcp_beta']);
const excluded = rows.length;
const publicRows = rows.filter((r) => PUBLIC_SOURCES.has(r.source));
rows.length = 0;
rows.push(...publicRows);
console.error(`excluded ${excluded - rows.length} internal/test rows`);

const day = (t) => t.slice(0, 10);
const pct = (sorted, p) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] : null;

// per-client per-day request counts
const clientDay = new Map(); // `${ip}|${day}` -> count
const clientTotal = new Map();
const daily = new Map();
const bySource = new Map();
const byStatus = new Map();
let zero = 0;
const latencies = [];
const perMinute = new Map(); // `${ip}|${minute}` -> count (burst analysis)
for (const r of rows) {
  const ip = r.ip_hash || 'null';
  const d = day(r.created_at);
  clientDay.set(`${ip}|${d}`, (clientDay.get(`${ip}|${d}`) || 0) + 1);
  clientTotal.set(ip, (clientTotal.get(ip) || 0) + 1);
  daily.set(d, (daily.get(d) || 0) + 1);
  bySource.set(r.source, (bySource.get(r.source) || 0) + 1);
  byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
  if (r.result_count === 0) zero++;
  if (r.latency_ms != null) latencies.push(r.latency_ms);
  const minute = r.created_at.slice(0, 16);
  perMinute.set(`${ip}|${minute}`, (perMinute.get(`${ip}|${minute}`) || 0) + 1);
}

const dayCounts = [...clientDay.values()].sort((a, b) => a - b);
const minuteCounts = [...perMinute.values()].sort((a, b) => a - b);
const totals = [...clientTotal.values()].sort((a, b) => b - a);
latencies.sort((a, b) => a - b);
const grand = rows.length;

const report = {
  window: { since, until: new Date().toISOString(), total_requests: grand },
  distinct_clients_30d: clientTotal.size,
  client_days: dayCounts.length,
  requests_per_client_day: {
    p50: pct(dayCounts, 50), p90: pct(dayCounts, 90), p95: pct(dayCounts, 95),
    p99: pct(dayCounts, 99), p999: pct(dayCounts, 99.9), max: dayCounts.at(-1),
  },
  client_days_exceeding: {
    anonymous_300: dayCounts.filter((c) => c > 300).length,
    registered_1500: dayCounts.filter((c) => c > 1500).length,
    pro_5000: dayCounts.filter((c) => c > 5000).length,
  },
  requests_per_client_minute: {
    p99: pct(minuteCounts, 99), p999: pct(minuteCounts, 99.9), max: minuteCounts.at(-1),
  },
  concentration: {
    top1_share: +(totals[0] / grand).toFixed(3),
    top5_share: +(totals.slice(0, 5).reduce((a, b) => a + b, 0) / grand).toFixed(3),
    top10_share: +(totals.slice(0, 10).reduce((a, b) => a + b, 0) / grand).toFixed(3),
    top10_daily_avg: totals.slice(0, 10).map((t) => +(t / 30).toFixed(1)),
  },
  daily_volume: Object.fromEntries([...daily.entries()].sort()),
  by_source: Object.fromEntries(bySource),
  by_status: Object.fromEntries(byStatus),
  zero_result_rate: +(zero / grand).toFixed(3),
  latency_ms: { p50: pct(latencies, 50), p95: pct(latencies, 95), p99: pct(latencies, 99) },
};
console.log(JSON.stringify(report, null, 2));
