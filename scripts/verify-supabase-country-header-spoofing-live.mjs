import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { SUPABASE_ANON, SUPABASE_URL } from '../mcp/auth.js';

function readArgument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const accessToken = String(process.env.SUPABASE_ACCESS_TOKEN || '').trim();
const projectRef = readArgument('project-ref') || 'kcjmkakdhsqplvasgkjv';
const outputPath = readArgument('output');
const functionName = 'si_local_country_header_spoof_preflight_20260728';
const managementBase = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

assert.ok(accessToken, 'SUPABASE_ACCESS_TOKEN must be present.');
assert.match(projectRef, /^[a-z]{20}$/, 'The Supabase project reference is malformed.');
assert.ok(outputPath, 'Provide --output for the retained preflight.');

async function queryDatabase(query, { readOnly = false } = {}) {
  const response = await fetch(readOnly ? `${managementBase}/read-only` : managementBase, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query, parameters: [] }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => null);
  assert.ok(response.ok, `The database request failed with HTTP ${response.status}.`);
  assert.ok(Array.isArray(payload), 'The database response is invalid.');
  return payload;
}

async function callProbe(extraHeaders = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${SUPABASE_ANON}`,
      'content-type': 'application/json',
      ...extraHeaders,
    },
    body: '{}',
    signal: AbortSignal.timeout(15_000),
  });
  return {
    ok: response.ok,
    status: response.status,
    payload: await response.json().catch(() => null),
  };
}

let functionCreated = false;
let artifact;

try {
  await queryDatabase(`
    create or replace function public.${functionName}()
    returns jsonb
    language sql
    stable
    security invoker
    set search_path = public
    as $$
      select jsonb_build_object(
        'cf',
        coalesce(
          (nullif(current_setting('request.headers', true), '')::jsonb)
            ->> 'cf-ipcountry',
          ''
        ),
        'vercel',
        coalesce(
          (nullif(current_setting('request.headers', true), '')::jsonb)
            ->> 'x-vercel-ip-country',
          ''
        ),
        'proxy',
        coalesce(
          (nullif(current_setting('request.headers', true), '')::jsonb)
            ->> 'x-country-code',
          ''
        )
      )
    $$;

    revoke all on function public.${functionName}() from public;
    grant execute on function public.${functionName}() to anon, authenticated;
    notify pgrst, 'reload schema';
  `);
  functionCreated = true;

  let ordinary;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    ordinary = await callProbe();
    if (ordinary.ok) break;
    await delay(500);
  }
  assert.ok(ordinary?.ok, `The ordinary probe failed with HTTP ${ordinary?.status}.`);

  const spoofed = await callProbe({
    'cf-ipcountry': 'NZ',
    'x-vercel-ip-country': 'CA',
    'x-country-code': 'JP',
  });
  assert.ok(spoofed.ok, `The spoofed probe failed with HTTP ${spoofed.status}.`);

  const ordinaryValues = {
    cf: ordinary.payload?.cf || null,
    vercel: ordinary.payload?.vercel || null,
    proxy: ordinary.payload?.proxy || null,
  };
  const callerValuesVisible = {
    cf: spoofed.payload?.cf === 'NZ',
    vercel: spoofed.payload?.vercel === 'CA',
    proxy: spoofed.payload?.proxy === 'JP',
  };

  assert.equal(
    callerValuesVisible.cf,
    false,
    'The caller was able to forge cf-ipcountry.',
  );
  assert.equal(
    callerValuesVisible.vercel,
    true,
    'The preflight no longer proves x-vercel-ip-country is caller-controlled.',
  );
  assert.equal(
    callerValuesVisible.proxy,
    true,
    'The preflight no longer proves x-country-code is caller-controlled.',
  );

  artifact = {
    artifact: 'supabase_country_header_spoofing_preflight',
    generated_at: new Date().toISOString(),
    project_ref: projectRef,
    temporary_function: functionName,
    probe_values: {
      cf_ipcountry: 'NZ',
      x_vercel_ip_country: 'CA',
      x_country_code: 'JP',
    },
    ordinary_values: ordinaryValues,
    caller_values_visible: callerValuesVisible,
    decision: {
      trusted_country_header: 'cf-ipcountry',
      rejected_country_headers: ['x-vercel-ip-country', 'x-country-code'],
      v3_transport: 'dedicated_geo_aware_endpoint',
    },
    status: 'passed',
  };
} finally {
  if (functionCreated) {
    await queryDatabase(`
      drop function if exists public.${functionName}();
      notify pgrst, 'reload schema';
    `);
  }
  const state = await queryDatabase(
    `select to_regprocedure('public.${functionName}()') is null as removed;`,
    { readOnly: true },
  );
  assert.equal(state[0]?.removed, true, 'The temporary probe function was not removed.');
  if (artifact) artifact.cleanup_removed = true;
}

const resolvedOutput = resolve(outputPath);
await mkdir(dirname(resolvedOutput), { recursive: true });
await writeFile(resolvedOutput, `${JSON.stringify(artifact, null, 2)}\n`);

console.log(JSON.stringify({
  status: artifact.status,
  output: resolvedOutput,
  trusted_country_header: artifact.decision.trusted_country_header,
  cleanup_removed: artifact.cleanup_removed,
}));
