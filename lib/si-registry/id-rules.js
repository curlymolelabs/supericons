const SEGMENT_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const REGISTRY_ID_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/;

function assertSegment(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required ${field}`);
  }
  if (!SEGMENT_PATTERN.test(value)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
}

export function buildRegistryId(record) {
  if (!record || typeof record !== 'object') {
    throw new Error('Registry record must be an object');
  }

  const { source_library: sourceLibrary, source_name: sourceName } = record;
  assertSegment(sourceLibrary, 'source_library');
  assertSegment(sourceName, 'source_name');

  if (sourceLibrary === 'si') {
    return `si:${sourceName}`;
  }

  return `${sourceLibrary}:${sourceName}`;
}

export function isValidRegistryId(value) {
  return typeof value === 'string' && REGISTRY_ID_PATTERN.test(value);
}

export function assertValidRegistryId(record) {
  const registryId = buildRegistryId(record);
  if (!isValidRegistryId(registryId)) {
    throw new Error(`Invalid derived icon_id: ${registryId}`);
  }
  return registryId;
}
