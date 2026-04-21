const REQUIRED_PROVIDER_FIELDS = Object.freeze([
  'name',
  'namespace',
  'homepage',
]);

export { REQUIRED_PROVIDER_FIELDS };

export function validateRegistryProviderMetadata(provider) {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new Error('Registry provider metadata must be an object.');
  }

  for (const field of REQUIRED_PROVIDER_FIELDS) {
    if (typeof provider[field] !== 'string' || provider[field].trim().length === 0) {
      throw new Error(`Registry provider metadata field "${field}" must be a non-empty string.`);
    }
  }
}

export function normalizeRegistryProviderMetadata(provider) {
  validateRegistryProviderMetadata(provider);

  return {
    name: provider.name.trim(),
    namespace: provider.namespace.trim(),
    homepage: provider.homepage.trim(),
  };
}
