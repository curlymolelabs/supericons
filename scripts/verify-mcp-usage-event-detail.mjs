import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  classifyMcpTraffic,
  extractReturnedIconRefs,
} from '../mcp/usage-event-detail.js';
import { logMcpSearchAttempt } from '../mcp/telemetry.js';

assert.deepEqual(extractReturnedIconRefs({
  structuredContent: {
    icon: { icon_ref: 'lucide:database' },
  },
}, 'get_icon'), ['lucide:database']);

assert.deepEqual(extractReturnedIconRefs({
  structuredContent: {
    results: [
      { icon_ref: 'lucide:database' },
      { icon_ref: 'tabler:database' },
      { icon_ref: 'lucide:database' },
    ],
  },
}, 'search_icons'), ['lucide:database', 'tabler:database']);

assert.deepEqual(extractReturnedIconRefs({
  structuredContent: {
    results: [{
      recommended: { icon_ref: 'lucide:database' },
      alternatives: [
        { icon_ref: 'tabler:database' },
        { icon_ref: 'phosphor:database' },
      ],
    }],
  },
}, 'recommend_icons'), [
  'lucide:database',
  'tabler:database',
  'phosphor:database',
]);

const manyRefs = Array.from({ length: 150 }, (_, index) => ({ icon_ref: `lucide:test-${index}` }));
assert.equal(extractReturnedIconRefs({ structuredContent: { results: manyRefs } }, 'search_icons').length, 100);

assert.equal(classifyMcpTraffic({ environment: 'production', channel: 'hosted_mcp' }), 'unclassified_live');
assert.equal(classifyMcpTraffic({ environment: 'test', channel: 'hosted_mcp' }), 'controlled_test');
assert.equal(classifyMcpTraffic({ environment: 'production', channel: 'internal_test' }), 'controlled_test');
assert.equal(classifyMcpTraffic({ environment: 'preview', channel: 'hosted_mcp' }), 'preview');
assert.equal(classifyMcpTraffic({ environment: 'local', channel: 'local_mcp' }), 'local');
assert.equal(classifyMcpTraffic({ environment: 'production', beta_cohort: 'founder_controlled' }), 'named_cohort');
assert.equal(classifyMcpTraffic({ environment: 'production', beta_cohort: 'controlled-run:load_test' }), 'controlled_test');
assert.equal(classifyMcpTraffic({ environment: 'production', beta_cohort: 'deterministic-v2-beta:founder_controlled' }), 'controlled_test');

const originalFetch = globalThis.fetch;
const originalTelemetryFlag = process.env.SUPERICONS_MCP_TELEMETRY_ENABLED;
let telemetryRequests = 0;
try {
  globalThis.fetch = async () => {
    telemetryRequests += 1;
    return new Response(null, { status: 204 });
  };
  process.env.SUPERICONS_MCP_TELEMETRY_ENABLED = '0';
  await logMcpSearchAttempt({ query: 'disabled telemetry probe', resultCount: 1 });
  assert.equal(telemetryRequests, 0);
} finally {
  globalThis.fetch = originalFetch;
  if (originalTelemetryFlag === undefined) delete process.env.SUPERICONS_MCP_TELEMETRY_ENABLED;
  else process.env.SUPERICONS_MCP_TELEMETRY_ENABLED = originalTelemetryFlag;
}

const server = await readFile('mcp/remote-server.js', 'utf8');
for (const field of [
  'root_request_hash',
  'returned_icon_refs',
  'returned_icon_refs_recorded',
  'server_build',
  'traffic_class',
]) {
  assert.match(server, new RegExp(field));
}

console.log(JSON.stringify({
  status: 'ok',
  returned_ref_paths: ['get_icon', 'search_icons', 'recommend_icons'],
  returned_ref_limit: 100,
  traffic_classes: ['controlled_test', 'preview', 'local', 'named_cohort', 'unclassified_live'],
  legacy_disable_flag_respected: true,
}, null, 2));
