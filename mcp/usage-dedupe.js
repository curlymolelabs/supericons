import { createHash } from 'node:crypto';

function clean(value) {
  const text = String(value || '').trim();
  return text || null;
}

export function buildMcpUsageDedupeKey({
  sessionHash = null,
  anonymousClientHash = null,
  requestId = null,
  rpcId = null,
  toolName,
  argsHash = null,
  eventId = null,
} = {}) {
  const normalizedSessionHash = clean(sessionHash);
  const normalizedAnonymousClientHash = clean(anonymousClientHash);
  const normalizedEventId = clean(eventId);
  const normalizedToolName = clean(toolName);

  if (!normalizedToolName) {
    throw new TypeError('toolName is required to build an MCP usage dedupe key.');
  }

  let identityKind = 'event';
  let identityValue = normalizedEventId;
  if (normalizedSessionHash) {
    identityKind = 'session';
    identityValue = normalizedSessionHash;
  } else if (normalizedAnonymousClientHash) {
    identityKind = 'anonymous_client';
    identityValue = normalizedAnonymousClientHash;
  }

  if (!identityValue) {
    throw new TypeError('eventId is required when no stable MCP client identity is available.');
  }

  const operationId = clean(rpcId) || clean(requestId) || normalizedEventId;
  const input = JSON.stringify([
    'mcp_usage_v2',
    identityKind,
    identityValue,
    operationId,
    normalizedToolName,
    clean(argsHash),
  ]);
  const digest = createHash('sha256').update(input).digest('hex');
  return `mcp:v2:${digest}`;
}
