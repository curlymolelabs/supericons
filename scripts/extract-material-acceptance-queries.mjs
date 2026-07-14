// Extract the Material acceptance query set from a Query Explorer agent-pack export.
// Usage: node scripts/extract-material-acceptance-queries.mjs <path-to-agent-pack.json> [outPath]
//
// Selection rules (kept deliberately simple and reproducible):
// - query rows with library_filter === 'material'
// - at least one zero-result attempt in the export window
// - direct-query shaped: 6 words or fewer (filters out machine-built slot+task strings)
// - sanitized: only query text and aggregate counts are retained, no hashes or client data
// - ranked by attempt volume, capped at 50

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const packPath = process.argv[2];
if (!packPath) {
  console.error('Usage: node scripts/extract-material-acceptance-queries.mjs <agent-pack.json> [outPath]');
  process.exit(1);
}

const outPath = process.argv[3]
  || path.join('references', 'verification', 'material-acceptance-queries-2026-07-14.json');

const packBytes = fs.readFileSync(packPath);
const packSha256 = crypto.createHash('sha256').update(packBytes).digest('hex');
const pack = JSON.parse(packBytes.toString('utf8')).agent_pack;
const rows = Array.isArray(pack?.queries) ? pack.queries : [];

const selected = rows
  .filter((row) => row.library_filter === 'material')
  .filter((row) => (row.zero_attempt_count || 0) > 0)
  .filter((row) => String(row.query || '').trim().split(/\s+/).length <= 6)
  .map((row) => ({
    query: row.query,
    attempts: row.attempt_count || 0,
    zero_attempts: row.zero_attempt_count || 0,
    tools: row.tools || [],
    first_seen: row.first_seen || null,
    last_seen: row.last_seen || null,
  }))
  .sort((a, b) => b.attempts - a.attempts || a.query.localeCompare(b.query))
  .slice(0, 50);

const artifact = {
  artifact: 'material_acceptance_queries',
  purpose: 'Observed smoke set: real production requests that hit the material library filter. Most rows originate from recommend_icons internal fan-out, so this set tests that material requests do not fail or silently disappear; it is not a relevance fixture.',
  generated_from: {
    export_file: path.basename(packPath),
    export_sha256: packSha256,
    exported_at: pack?.exported_at || null,
    window: pack?.filters?.window || null,
    total_rows_in_export: rows.length,
    sampling_note: 'Agent packs export the top rows sorted by last activity; counts are lower bounds for the full window.',
  },
  selection_rules: {
    library_filter: 'material',
    min_zero_attempts: 1,
    max_query_words: 6,
    ranking: 'attempts desc',
    cap: 50,
  },
  query_count: selected.length,
  queries: selected,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`extract-material-acceptance-queries: wrote ${selected.length} queries to ${outPath}`);
