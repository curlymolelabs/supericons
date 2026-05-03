import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function readEnvValue(name) {
  if (process.env[name]) return process.env[name];

  const envPath = resolve('.env.local');
  if (!existsSync(envPath)) return '';

  const content = readFileSync(envPath, 'utf8');
  const match = content.match(new RegExp(`^${name}=([^\\r\\n]+)`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : '';
}

const supabaseUrl = readEnvValue('SUPABASE_URL');
const baseUrl = (
  process.env.SUPERICONS_MCP_SEARCH_URL
  || (supabaseUrl ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/mcp-search` : '')
).replace(/\/+$/, '');

assert.ok(
  baseUrl,
  'SUPABASE_URL or SUPERICONS_MCP_SEARCH_URL is required for live hosted search intent verification',
);

const checks = [
  { query: 'beautiful', expectAny: ['palette', 'swatch', 'sparkles', 'star', 'heart'] },
  { query: 'pretty', expectAny: ['palette', 'sparkles', 'star', 'heart'] },
  { query: 'user profile', expectAny: ['user', 'user-circle', 'circle-user'], rejectTop: ['user-x', 'user-minus'] },
  { query: 'dataset', expectAny: ['table', 'database', 'grid'] },
  { query: 'evaluation', expectAny: ['chart', 'gauge', 'bar-chart'] },
  { query: 'deployment', expectAny: ['cloud-upload', 'upload', 'server', 'package'] },
  { query: 'monitoring', expectAny: ['activity', 'chart-line', 'line-chart', 'gauge'] },
  { query: 'prompt', expectAny: ['message', 'terminal', 'text'] },
  { query: 'stupid', expectAny: ['bug', 'alert', 'warning', 'x-circle', 'brain'] },
  { query: 'smart', expectAny: ['brain', 'brain-circuit', 'lightbulb', 'sparkles'] },
  { query: 'broken', expectAny: ['bug', 'alert', 'warning', 'x-circle', 'wrench'] },
  { query: 'professional', expectAny: ['briefcase', 'building', 'shield', 'badge'] },
  { query: 'chill', expectAny: ['snowflake', 'thermometer', 'moon', 'smile', 'coffee'] },
  { query: 'smell', expectAny: ['nose', 'air', 'cloud', 'wind'] },
  { query: 'smelly', expectAny: ['trash', 'alert', 'nose', 'cloud'] },
];

function resultText(result) {
  return [
    result?.icon_id,
    result?.id,
    result?.name,
    result?.label,
    result?.library,
    result?.source_library,
  ].filter(Boolean).join(' ').toLowerCase();
}

async function search(query) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      library: null,
      limit: 10,
      source: 'verify',
    }),
  });

  const raw = await response.text();
  assert.equal(response.status, 200, `search for "${query}" should return 200. Body: ${raw}`);
  const payload = JSON.parse(raw);
  assert.ok(Array.isArray(payload.results), `search for "${query}" should return results array`);
  assert.ok(payload.query_expansion?.expanded, `search for "${query}" should include expanded query diagnostics`);
  return payload.results;
}

const failures = [];

for (const check of checks) {
  try {
    const results = await search(check.query);
    const topTexts = results.slice(0, 10).map(resultText);
    const firstTexts = results.slice(0, 3).map(resultText);
    const hasExpected = check.expectAny.some((term) => topTexts.some((text) => text.includes(term)));

    if (!hasExpected) {
      failures.push(`${check.query}: expected one of ${check.expectAny.join(', ')} in top 10. Got: ${topTexts.join(' | ')}`);
    }

    for (const rejected of check.rejectTop || []) {
      if (firstTexts.some((text) => text.includes(rejected))) {
        failures.push(`${check.query}: rejected early term "${rejected}" appeared in top 3. Got: ${firstTexts.join(' | ')}`);
      }
    }
  } catch (error) {
    failures.push(`${check.query}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length > 0) {
  console.error('verify-hosted-search-intent-live: failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('verify-hosted-search-intent-live: ok');
