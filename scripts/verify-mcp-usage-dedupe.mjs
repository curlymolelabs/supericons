import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildMcpUsageDedupeKey } from '../mcp/usage-dedupe.js';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const remoteServerPath = join(rootDir, 'mcp', 'remote-server.js');
const mcpPackagePath = join(rootDir, 'mcp', 'package.json');

const argsHash = createHash('sha256')
  .update(JSON.stringify({ query: null, task: null, id: null, library: null, limit: null }))
  .digest('hex')
  .slice(0, 24);

const shared = {
  requestId: '1',
  rpcId: '1',
  toolName: 'list_libraries',
  argsHash,
};

const legacyDedupeKey = ({ requestId, rpcId, toolName, argsHash: legacyArgsHash }) => (
  [requestId, rpcId, toolName, legacyArgsHash].filter(Boolean).join(':')
);
assert.equal(
  legacyDedupeKey(shared),
  legacyDedupeKey({ ...shared, sessionHash: 'a-different-session' }),
  'The verifier must retain the original cross-session collision reproducer.',
);

const firstSessionKey = buildMcpUsageDedupeKey({
  ...shared,
  sessionHash: 'session-a',
  anonymousClientHash: 'client-shared',
  eventId: 'event-a',
});
const secondSessionKey = buildMcpUsageDedupeKey({
  ...shared,
  sessionHash: 'session-b',
  anonymousClientHash: 'client-shared',
  eventId: 'event-b',
});
assert.notEqual(
  firstSessionKey,
  secondSessionKey,
  'Different sessions using JSON-RPC id 1 must not collide.',
);

const sameSessionRetryKey = buildMcpUsageDedupeKey({
  ...shared,
  requestId: 'new-transport-request-id',
  sessionHash: 'session-a',
  anonymousClientHash: 'client-shared',
  eventId: 'retry-event',
});
assert.equal(
  firstSessionKey,
  sameSessionRetryKey,
  'The same session retrying the same JSON-RPC request must keep the same key.',
);

const firstAnonymousClientKey = buildMcpUsageDedupeKey({
  ...shared,
  anonymousClientHash: 'anonymous-a',
  eventId: 'anonymous-event-a',
});
const secondAnonymousClientKey = buildMcpUsageDedupeKey({
  ...shared,
  anonymousClientHash: 'anonymous-b',
  eventId: 'anonymous-event-b',
});
assert.notEqual(
  firstAnonymousClientKey,
  secondAnonymousClientKey,
  'Different anonymous client identities must not collide.',
);

const firstEventFallbackKey = buildMcpUsageDedupeKey({ ...shared, eventId: 'fallback-a' });
const secondEventFallbackKey = buildMcpUsageDedupeKey({ ...shared, eventId: 'fallback-b' });
assert.notEqual(
  firstEventFallbackKey,
  secondEventFallbackKey,
  'Events without stable identity must use a unique event fallback.',
);

assert.match(firstSessionKey, /^mcp:v2:[a-f0-9]{64}$/);
assert.throws(
  () => buildMcpUsageDedupeKey({ ...shared }),
  /eventId is required/,
  'A shared constant must not replace the per-event fallback.',
);

const [remoteServerSource, mcpPackage] = await Promise.all([
  readFile(remoteServerPath, 'utf8'),
  readFile(mcpPackagePath, 'utf8').then(JSON.parse),
]);
assert.match(remoteServerSource, /buildMcpUsageDedupeKey\(\{/);
assert.match(remoteServerSource, /buildToolUsageContext\(requestContext, toolName, args, \{ eventId \}\)/);
assert.ok(mcpPackage.files.includes('usage-dedupe.js'), 'The published MCP file list must include the helper.');

console.log(JSON.stringify({
  status: 'pass',
  checks: {
    legacy_cross_session_collision_reproduced: true,
    cross_session_id_1_distinct: true,
    same_session_retry_stable: true,
    anonymous_client_identity_distinct: true,
    per_event_fallback_distinct: true,
    shared_fallback_rejected: true,
    remote_server_integration_present: true,
    published_file_included: true,
  },
}, null, 2));
