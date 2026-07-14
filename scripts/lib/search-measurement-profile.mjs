import assert from 'node:assert/strict';

export function normalizeMeasurementProfile(value) {
  const profile = String(value || 'beta').trim().toLowerCase();
  assert.ok(['beta', 'production'].includes(profile), 'Use beta or production measurement profile.');
  return profile;
}

export function assertMeasurementTarget(profile, endpointName) {
  if (profile === 'production') {
    assert.equal(endpointName, 'mcp-search', 'Production measurements must target stable mcp-search.');
  }
}

export function buildMeasurementUsageContext(profile, toolName, options = {}) {
  if (profile === 'production') {
    return {
      source: 'verify',
      channel: 'internal_test',
      environment: 'production',
      client_family: 'material_release_latency',
      tool_name: toolName,
    };
  }

  return {
    source: 'mcp_beta',
    channel: 'hosted_mcp',
    environment: 'preview',
    client_family: 'latency_gate_a',
    tool_name: toolName,
    beta_cohort: options.betaCohort || 'deterministic-v2-beta',
  };
}

export function productionizeMeasurementPayload(value, options = {}) {
  let usageIndex = 0;
  const runId = String(options.runId || '').trim();
  const requestSequence = Number.isInteger(options.requestSequence) ? options.requestSequence : 0;

  function visit(entry) {
    if (Array.isArray(entry)) return entry.map(visit);
    if (!entry || typeof entry !== 'object') return entry;

    const output = Object.fromEntries(
      Object.entries(entry).map(([key, child]) => [key, visit(child)]),
    );
    const hasUsageFields = [
      'source',
      'channel',
      'environment',
      'client_family',
      'tool_name',
      'beta_cohort',
    ].some((key) => Object.hasOwn(output, key));
    if (!hasUsageFields) return output;

    output.source = 'verify';
    output.channel = 'internal_test';
    output.environment = 'production';
    output.client_family = 'material_release_latency';
    delete output.beta_cohort;
    if (runId) {
      output.request_id = runId;
      output.dedupe_key = `material-baseline:${runId}:${requestSequence}:${usageIndex}`.slice(0, 180);
    }
    usageIndex += 1;
    return output;
  }

  return visit(value);
}
