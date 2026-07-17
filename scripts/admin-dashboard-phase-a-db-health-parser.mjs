import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_METRICS = Object.freeze({
  recent_mcp_usage: 1000,
  recent_search_audit: 1000,
  latest_rollup_overview: 1000,
  recent_telemetry_window: 2000,
});

function readArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

export function parseDatabaseHealthOutput(rawOutput, sqlExitCode = 0) {
  const metrics = [];
  const pattern = /PHASE_A_HEALTH\|([a-z_]+)\|([0-9]+(?:\.[0-9]+)?)\|([0-9]+)\|([0-9]+)/g;
  for (const match of String(rawOutput || '').matchAll(pattern)) {
    metrics.push({
      name: match[1],
      latency_ms: Number(match[2]),
      matched_rows: Number(match[3]),
      limit_ms: Number(match[4]),
    });
  }

  const byName = new Map();
  for (const metric of metrics) {
    assert.equal(byName.has(metric.name), false, `Duplicate database health metric: ${metric.name}`);
    byName.set(metric.name, metric);
  }

  const failures = [];
  for (const [name, expectedLimit] of Object.entries(EXPECTED_METRICS)) {
    const metric = byName.get(name);
    if (!metric) {
      failures.push(`missing:${name}`);
      continue;
    }
    if (metric.limit_ms !== expectedLimit) failures.push(`limit:${name}`);
    if (metric.latency_ms > expectedLimit) failures.push(`slow:${name}`);
  }
  for (const metric of metrics) {
    if (!(metric.name in EXPECTED_METRICS)) failures.push(`unexpected:${metric.name}`);
  }
  if (Number(sqlExitCode) !== 0) failures.push(`psql_exit:${Number(sqlExitCode)}`);

  return {
    status: failures.length === 0 ? 'ok' : 'blocked',
    sql_exit_code: Number(sqlExitCode),
    metrics,
    failures,
  };
}

function runCli() {
  const inputPath = resolve(readArg('input'));
  const outputPath = resolve(readArg('output'));
  const approvalFingerprint = readArg('approval-fingerprint');
  const sqlExitCode = Number(readArg('sql-exit-code') || 0);

  assert.ok(readArg('input'), 'Provide --input with captured psql output.');
  assert.ok(readArg('output'), 'Provide --output with a write-once evidence path.');
  assert.match(approvalFingerprint, /^[0-9a-f]{64}$/, 'Provide a valid approval fingerprint.');
  assert.equal(existsSync(outputPath), false, `Evidence already exists: ${outputPath}`);

  const parsed = parseDatabaseHealthOutput(readFileSync(inputPath, 'utf8'), sqlExitCode);
  const evidence = {
    artifact: 'admin_dashboard_phase_a_database_measured_health',
    approval_fingerprint: approvalFingerprint,
    status: parsed.status,
    transaction_mode: 'read_only',
    connection_read_only: true,
    statement_timeout_ms: 3000,
    metrics: parsed.metrics,
    failures: parsed.failures,
    sql_exit_code: parsed.sql_exit_code,
    mutations: 0,
    captured_at: new Date().toISOString(),
  };
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ status: evidence.status, output: outputPath }));
  if (evidence.status !== 'ok') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCli();
}
