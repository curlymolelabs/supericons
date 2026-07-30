/* Read-only demand pull: zero-result searches + icon requests.
   Usage: node demand-pull.mjs <path-to-.env.local> <out.json> */
import fs from 'fs';

const [envPath, outPath] = process.argv.slice(2);
const env = Object.fromEntries(fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const URL0 = env.SUPABASE_URL.replace(/\/$/, '');
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function count(pathq) {
  const r = await fetch(URL0 + '/rest/v1/' + pathq + '&limit=1', {
    headers: { ...H, Prefer: 'count=exact', Range: '0-0' } });
  const cr = r.headers.get('content-range') || '';
  return parseInt(cr.split('/')[1] || '0', 10);
}
async function rows(pathq, max = 10000) {
  const out = [];
  for (let from = 0; from < max; from += 1000) {
    const sep = pathq.includes('limit=') ? null : '&limit=1000&offset=' + from;
    if (sep === null && from > 0) break;
    const r = await fetch(URL0 + '/rest/v1/' + pathq + (sep || ''), { headers: H });
    if (!r.ok) throw new Error(pathq.split('?')[0] + ' -> ' + r.status + ' ' + (await r.text()).slice(0, 200));
    const batch = await r.json();
    out.push(...batch);
    if (batch.length < 1000) break;
  }
  return out;
}

const result = { pulled_at: new Date().toISOString(), window_note: 'final-outcome coverage begins 2026-07-15 (hosted) / 2026-07-23 (web, local)' };

/* traffic classes present, to exclude non-production honestly */
const classes = await rows('search_final_outcomes?select=traffic_class&limit=1000');
result.traffic_classes_seen = [...new Set(classes.map(r => r.traffic_class))];
result.class_counts = {};
for (const c of result.traffic_classes_seen) result.class_counts[c] = await count('search_final_outcomes?traffic_class=eq.' + c + '&select=id');

/* totals */
result.total_live_outcomes = await count('search_final_outcomes?traffic_class=eq.unclassified_live&select=id');
result.zero_live_outcomes = await count('search_final_outcomes?traffic_class=eq.unclassified_live&final_match_count=eq.0&select=id');

/* zero-result queries, production only */
const zeros = await rows('search_final_outcomes?traffic_class=eq.unclassified_live&final_match_count=eq.0&select=query,channel,locale,created_at&order=created_at.desc');
const agg = {};
for (const z of zeros) {
  const q = (z.query || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!q) continue;
  agg[q] = agg[q] || { query: q, n: 0, channels: {}, last: z.created_at, locales: {} };
  agg[q].n++;
  agg[q].channels[z.channel] = (agg[q].channels[z.channel] || 0) + 1;
  if (z.locale) agg[q].locales[z.locale] = (agg[q].locales[z.locale] || 0) + 1;
  if (z.created_at > agg[q].last) agg[q].last = z.created_at;
}
result.zero_unique_queries = Object.keys(agg).length;
result.zero_top = Object.values(agg).sort((a, b) => b.n - a.n).slice(0, 60);

/* icon requests */
const reqs = await rows("icon_evidence?signal_type=eq.icon_request&select=evidence_text,search_query,ui_surface,created_at&order=created_at.desc&limit=500");
result.icon_requests_total = await count('icon_evidence?signal_type=eq.icon_request&select=id');
result.icon_requests = reqs;

/* low-result (1-2 matches) for the "barely served" band */
result.low_live_outcomes = await count('search_final_outcomes?traffic_class=eq.unclassified_live&final_match_count=gte.1&final_match_count=lte.2&select=id');

fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log('pulled:', JSON.stringify({
  traffic_classes: result.traffic_classes_seen,
  total_live: result.total_live_outcomes,
  zero_live: result.zero_live_outcomes,
  zero_unique: result.zero_unique_queries,
  low_1_2: result.low_live_outcomes,
  icon_requests: result.icon_requests_total
}));
