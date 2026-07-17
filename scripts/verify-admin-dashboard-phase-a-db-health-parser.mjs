import assert from 'node:assert/strict';
import { parseDatabaseHealthOutput } from './admin-dashboard-phase-a-db-health-parser.mjs';

const healthy = [
  'NOTICE: PHASE_A_HEALTH|recent_mcp_usage|1.2|1|1000',
  'NOTICE: PHASE_A_HEALTH|recent_search_audit|2.3|1|1000',
  'NOTICE: PHASE_A_HEALTH|latest_rollup_overview|0.7|1|1000',
  'NOTICE: PHASE_A_HEALTH|recent_telemetry_window|12.4|24|2000',
].join('\n');
const healthyResult = parseDatabaseHealthOutput(healthy, 0);
assert.equal(healthyResult.status, 'ok');
assert.equal(healthyResult.metrics.length, 4);

const slow = healthy.replace('12.4|24|2000', '2000.1|24|2000');
const slowResult = parseDatabaseHealthOutput(slow, 1);
assert.equal(slowResult.status, 'blocked');
assert.deepEqual(slowResult.failures, ['slow:recent_telemetry_window', 'psql_exit:1']);

const missing = healthy
  .split('\n')
  .filter((line) => !line.includes('latest_rollup_overview'))
  .join('\n');
const missingResult = parseDatabaseHealthOutput(missing, 0);
assert.equal(missingResult.status, 'blocked');
assert.deepEqual(missingResult.failures, ['missing:latest_rollup_overview']);

assert.throws(
  () => parseDatabaseHealthOutput(`${healthy}\n${healthy.split('\n')[0]}`, 0),
  /Duplicate database health metric/,
);

console.log(JSON.stringify({ status: 'ok', cases: 4 }, null, 2));
