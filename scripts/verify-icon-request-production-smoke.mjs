import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

function sqlUuidList(values) {
  return values.map((value) => `'${value}'::uuid`).join(', ');
}

function sqlTextList(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(', ');
}

const projectRef = 'kcjmkakdhsqplvasgkjv';
const supabaseUrl = `https://${projectRef}.supabase.co`;
const adminUrl = `${supabaseUrl}/functions/v1/admin-api`;
const managementQueryUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
const anonKey = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';
const adminSecret = String(process.env.ADMIN_SECRET || '').trim();
const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const outputPath = readArg('output')
  || 'references/verification/icon-request-production-smoke-2026-07-27.json';

assert.ok(adminSecret, 'ADMIN_SECRET must be present in the process environment.');
assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present in the process environment.');

async function queryDatabase(query) {
  const response = await fetch(managementQueryUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const bodyText = await response.text();
  assert.equal(
    response.ok,
    true,
    `The production database query failed with HTTP ${response.status}: ${bodyText}`,
  );
  return bodyText ? JSON.parse(bodyText) : [];
}

async function writeRequest(testCase) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/si_log_icon_request`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      p_request_text: testCase.requestText,
      p_ui_surface: testCase.surface,
      p_session_hash: testCase.sessionHash,
      p_search_query: testCase.query,
      p_result_count: testCase.resultCount,
      p_library_filter: 'all',
      p_job_category: null,
      p_domain: 'controlled-test.supericons.dev',
      p_context_url: '/controlled-test/icon-request',
    }),
  });
  const bodyText = await response.text();
  assert.equal(response.ok, true, `Controlled request write failed: ${bodyText}`);
  const id = JSON.parse(bodyText);
  assert.match(id, /^[0-9a-f-]{36}$/i, 'The controlled request ID is malformed.');
  return id;
}

const runId = randomUUID();
const marker = `[CONTROLLED TEST ${runId}]`;
const cases = [
  {
    surface: 'grid_empty_feedback',
    query: `controlled-empty-${runId}`,
    resultCount: 0,
    requestText: `${marker} zero result placement`,
  },
  {
    surface: 'grid_low_result_feedback',
    query: `controlled-low-${runId}`,
    resultCount: 1,
    requestText: `${marker} low result placement`,
  },
  {
    surface: 'sidebar_request',
    query: null,
    resultCount: null,
    requestText: `${marker} standalone sidebar placement`,
  },
].map((testCase) => ({
  ...testCase,
  sessionHash: createHash('sha256')
    .update(`${runId}|${testCase.surface}`)
    .digest('hex'),
}));

const createdIds = [];
let databaseVerified = false;
let demandInboxVerified = false;
let metricIsolationVerified = false;
let cleanupVerified = false;
let createdRows = [];

try {
  for (const testCase of cases) {
    createdIds.push(await writeRequest(testCase));
  }

  createdRows = await queryDatabase(`
    select
      id,
      signal_type,
      search_query,
      result_count,
      library_filter,
      ui_surface,
      domain,
      evidence_text,
      context_url,
      session_hash,
      created_at
    from public.icon_evidence
    where id in (${sqlUuidList(createdIds)})
    order by array_position(
      array[${createdIds.map((id) => `'${id}'::uuid`).join(', ')}],
      id
    )
  `);
  assert.equal(createdRows.length, cases.length, 'Not all controlled request rows were stored.');
  createdRows.forEach((row, index) => {
    const expected = cases[index];
    assert.equal(row.id, createdIds[index]);
    assert.equal(row.signal_type, 'icon_request');
    assert.equal(row.search_query, expected.query);
    assert.equal(row.result_count, expected.resultCount);
    assert.equal(row.library_filter, 'all');
    assert.equal(row.ui_surface, expected.surface);
    assert.equal(row.domain, 'controlled-test.supericons.dev');
    assert.equal(row.evidence_text, expected.requestText);
    assert.equal(row.context_url, '/controlled-test/icon-request');
    assert.equal(row.session_hash, expected.sessionHash);
    assert.ok(
      Math.abs(Date.now() - Date.parse(row.created_at)) < 5 * 60 * 1000,
      'The request timestamp was not assigned by the current server clock.',
    );
  });
  databaseVerified = true;

  const searchAttemptRows = await queryDatabase(`
    select id
    from public.icon_evidence
    where signal_type = 'search_attempt'
      and session_hash in (${sqlTextList(cases.map((testCase) => testCase.sessionHash))})
  `);
  assert.equal(
    searchAttemptRows.length,
    0,
    'A controlled icon request was incorrectly stored as a search attempt.',
  );
  metricIsolationVerified = true;

  const inboxResponse = await fetch(
    `${adminUrl}/v2/search?window=30d&channel=all&include_test=true`,
    { headers: { 'x-admin-secret': adminSecret } },
  );
  const inboxText = await inboxResponse.text();
  assert.equal(
    inboxResponse.ok,
    true,
    `The production Demand Inbox request failed with HTTP ${inboxResponse.status}: ${inboxText}`,
  );
  const inbox = JSON.parse(inboxText);
  assert.equal(inbox.icon_requests?.available, true, 'The production Demand Inbox is unavailable.');
  const inboxRows = Array.isArray(inbox.icon_requests?.rows) ? inbox.icon_requests.rows : [];
  for (let index = 0; index < createdIds.length; index += 1) {
    const row = inboxRows.find((candidate) => candidate.id === createdIds[index]);
    assert.ok(row, `Controlled request ${createdIds[index]} is missing from the Demand Inbox.`);
    assert.equal(row.signal_type, 'icon_request');
    assert.equal(row.request_text, cases[index].requestText);
    assert.equal(row.search_query, cases[index].query);
    assert.equal(row.result_count, cases[index].resultCount);
    assert.equal(row.ui_surface, cases[index].surface);
  }
  demandInboxVerified = true;
} finally {
  if (createdIds.length) {
    await queryDatabase(`
      delete from public.admin_icon_request_reviews
      where icon_evidence_id in (${sqlUuidList(createdIds)})
    `).catch(() => []);
    await queryDatabase(`
      delete from public.icon_evidence
      where id in (${sqlUuidList(createdIds)})
      returning id
    `).catch(() => []);
    const remainingRows = await queryDatabase(`
      select id
      from public.icon_evidence
      where id in (${sqlUuidList(createdIds)})
    `).catch(() => createdIds.map((id) => ({ id })));
    cleanupVerified = remainingRows.length === 0;
  }
}

assert.equal(databaseVerified, true, 'The controlled database rows were not verified.');
assert.equal(metricIsolationVerified, true, 'Search metric isolation was not verified.');
assert.equal(demandInboxVerified, true, 'The controlled Demand Inbox rows were not verified.');
assert.equal(cleanupVerified, true, 'Controlled production request cleanup was not verified.');

const evidence = {
  artifact: 'icon_request_production_smoke',
  verified_at: new Date().toISOString(),
  status: 'passed',
  project_ref: projectRef,
  controlled_domain: 'controlled-test.supericons.dev',
  controlled_ids: createdIds,
  surfaces: cases.map((testCase) => testCase.surface),
  database_rows_verified: databaseVerified,
  server_timestamps_verified: true,
  search_metric_isolation_verified: metricIsolationVerified,
  demand_inbox_verified: demandInboxVerified,
  exact_id_cleanup_verified: cleanupVerified,
  controlled_rows_remaining: 0,
};

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(evidence, null, 2));
