import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { evaluateGateC } from './search-v2-gate-c-evidence.mjs';

const manifest = {
  implementation: { endpoint: 'mcp-search-v2-beta' },
  package: { latest_tag_must_remain: '0.4.17' },
  release_gates: {
    search_warm_p95_ms_max: 2000,
    error_rate_percent_max: 1,
    eligible_request_audit_capture_percent_min: 95,
  },
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
const manifestHash = createHash('sha256').update(manifestText).digest('hex');
const workerSummary = {
  first_request: { samples: 1 },
  reused_worker: { samples: 20 },
  unknown: { samples: 0 },
};
const search = {
  manifest_sha256: manifestHash,
  warm_summary: { p95_ms: 1500, error_rate_percent: 0 },
  worker_summary: workerSummary,
  first_request: { ok: true },
  warm_samples: Array.from({ length: 5 }, () => ({ ok: true })),
};
const localized = {
  manifest_sha256: manifestHash,
  warm_summary: { p95_ms: 1500, error_rate_percent: 0 },
  worker_summary: workerSummary,
  first_request: { hosted_attempts: [{ ok: true }, { ok: true }] },
  warm_samples: Array.from(
    { length: 5 },
    () => ({ hosted_attempts: [{ ok: true }, { ok: true }] }),
  ),
};
const smoke = {
  manifest_sha256: manifestHash,
  smoke_summary: { all_passed: true },
  worker_summary: workerSummary,
  material_outline: { ok: true },
  material_solid: { ok: true },
  invalid_request: { ok: false },
};
const expectedEligibleRequests = 21;
const liveEvidence = {
  endpoint: 'mcp-search-v2-beta',
  window: {
    started_at: '2026-07-16T00:00:00Z',
    ended_at: '2026-07-16T00:05:00Z',
  },
  platform_error_evidence: {
    readable: true,
    eligible_requests: expectedEligibleRequests,
    error_count: 0,
    source_sha256: 'a'.repeat(64),
  },
  search_audit_evidence: {
    readable: true,
    expected_eligible_requests: expectedEligibleRequests,
    captured_rows: expectedEligibleRequests,
    error_rows: 0,
    source_sha256: 'b'.repeat(64),
  },
  production_functions: {
    readable: true,
    search_icons: { before_version: 35, after_version: 35 },
    mcp_search: { before_version: 38, after_version: 38 },
  },
  npm_registry: {
    readable: true,
    latest_before: '0.4.17',
    latest_after: '0.4.17',
  },
};
const localGates = {
  recommendation_response_byte_parity: true,
  usage_dedupe: true,
};

function evaluate(overrides = {}) {
  return evaluateGateC({
    manifest,
    manifestText,
    manifestHash,
    search: structuredClone(search),
    localized: structuredClone(localized),
    smoke: structuredClone(smoke),
    liveEvidence: structuredClone(liveEvidence),
    localGates: structuredClone(localGates),
    ...overrides,
  });
}

assert.equal(evaluate().status, 'ok');

const failureCases = [
  ['platform evidence required', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.readable = false;
    evaluate({ liveEvidence: value });
  }],
  ['platform errors enforced', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.error_count = 1;
    evaluate({ liveEvidence: value });
  }],
  ['platform request count enforced', () => {
    const value = structuredClone(liveEvidence);
    value.platform_error_evidence.eligible_requests -= 1;
    evaluate({ liveEvidence: value });
  }],
  ['audit evidence required', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.readable = false;
    evaluate({ liveEvidence: value });
  }],
  ['audit capture enforced', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.captured_rows = 19;
    evaluate({ liveEvidence: value });
  }],
  ['audit workload count enforced', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.expected_eligible_requests -= 1;
    evaluate({ liveEvidence: value });
  }],
  ['audit errors enforced', () => {
    const value = structuredClone(liveEvidence);
    value.search_audit_evidence.error_rows = 1;
    evaluate({ liveEvidence: value });
  }],
  ['recommendation parity enforced', () => {
    evaluate({ localGates: { ...localGates, recommendation_response_byte_parity: false } });
  }],
  ['production function state enforced', () => {
    const value = structuredClone(liveEvidence);
    value.production_functions.mcp_search.after_version = 39;
    evaluate({ liveEvidence: value });
  }],
  ['npm latest enforced', () => {
    const value = structuredClone(liveEvidence);
    value.npm_registry.latest_after = '0.4.18';
    evaluate({ liveEvidence: value });
  }],
];

for (const [name, operation] of failureCases) {
  assert.throws(operation, undefined, name);
}

const integrationRoot = mkdtempSync(join(tmpdir(), 'search-v2-gate-c-evidence-'));
try {
  const actualManifestPath = resolve(
    'docs/si-v2/search/reviews/search-v2-search-only-beta-authorization-manifest-2026-07-16.json',
  );
  const actualManifestText = readFileSync(actualManifestPath, 'utf8');
  const actualManifest = JSON.parse(actualManifestText);
  const actualManifestHash = createHash('sha256')
    .update(actualManifestText.replace(/\r\n?/g, '\n'))
    .digest('hex');
  const integrationWorkerSummary = {
    first_request: { samples: 1 },
    reused_worker: { samples: 1 },
    unknown: { samples: 0 },
  };
  const integrationSearch = {
    manifest_sha256: actualManifestHash,
    warm_summary: { p95_ms: 1500, error_rate_percent: 0 },
    worker_summary: integrationWorkerSummary,
    first_request: { ok: true },
    warm_samples: Array.from({ length: 25 }, () => ({ ok: true })),
  };
  const integrationLocalized = {
    manifest_sha256: actualManifestHash,
    warm_summary: { p95_ms: 1500, error_rate_percent: 0 },
    worker_summary: integrationWorkerSummary,
    first_request: { hosted_attempts: [{ ok: true }, { ok: true }] },
    warm_samples: Array.from(
      { length: 5 },
      () => ({ hosted_attempts: [{ ok: true }, { ok: true }] }),
    ),
  };
  const integrationSmoke = {
    manifest_sha256: actualManifestHash,
    smoke_summary: { all_passed: true },
    worker_summary: integrationWorkerSummary,
    material_outline: { ok: true },
    material_solid: { ok: true },
    invalid_request: { ok: false },
  };
  const integrationLiveEvidence = {
    endpoint: actualManifest.implementation.endpoint,
    window: {
      started_at: '2026-07-16T00:00:00Z',
      ended_at: '2026-07-16T00:05:00Z',
    },
    platform_error_evidence: {
      readable: true,
      eligible_requests: 41,
      error_count: 0,
      source_sha256: 'c'.repeat(64),
    },
    search_audit_evidence: {
      readable: true,
      expected_eligible_requests: 41,
      captured_rows: 41,
      error_rows: 0,
      source_sha256: 'd'.repeat(64),
    },
    production_functions: {
      readable: true,
      search_icons: { before_version: 35, after_version: 35 },
      mcp_search: { before_version: 38, after_version: 38 },
    },
    npm_registry: {
      readable: true,
      latest_before: actualManifest.package.latest_tag_must_remain,
      latest_after: actualManifest.package.latest_tag_must_remain,
    },
  };

  for (const [name, value] of Object.entries({
    'search.json': integrationSearch,
    'localized.json': integrationLocalized,
    'smoke.json': integrationSmoke,
    'live-evidence.json': integrationLiveEvidence,
  })) {
    writeFileSync(join(integrationRoot, name), `${JSON.stringify(value, null, 2)}\n`);
  }

  const powershell = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
  const integration = spawnSync(powershell, [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    resolve('scripts/run-search-v2-search-only-beta-gate-c.ps1'),
    '-ManifestHash',
    actualManifestHash,
    '-OutputDirectory',
    integrationRoot,
    '-Phase',
    'finalize',
    '-LiveEvidencePath',
    join(integrationRoot, 'live-evidence.json'),
    '-ExecuteApprovedGateC',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 120000,
  });
  assert.equal(
    integration.status,
    0,
    `PowerShell finalize integration failed:\n${integration.stdout}\n${integration.stderr}`,
  );
  assert.match(integration.stdout, /"status":\s*"ok"/);
} finally {
  rmSync(integrationRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({
  status: 'ok',
  passing_contract: true,
  powershell_finalize_integration: true,
  fail_closed_cases: failureCases.map(([name]) => name),
}, null, 2));
