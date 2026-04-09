export function hasPremiumLibraryAccess(authState, library) {
  if (authState?.isPro) return true;
  return Array.isArray(authState?.purchasedSlugs) && authState.purchasedSlugs.includes(library);
}

export function hasProWorkflowAccess(authState) {
  return Boolean(authState?.isPro);
}

export function buildPremiumLibraryAccessError(libraryName, hint = 'Set SUPERICONS_API_KEY in your MCP config with your API key.') {
  return {
    error: 'Premium access required',
    message: `The "${libraryName}" pack requires a purchase or Pro subscription. Visit https://supericons.dev`,
    hint,
  };
}

export function buildProWorkflowAccessError(featureName) {
  return {
    error: 'Pro workflow access required',
    message: `${featureName} is available through Supericons Pro workflow access. Visit https://supericons.dev/pricing and connect a Pro-linked SUPERICONS_API_KEY.`,
    hint: 'Generate or manage your API key from Dashboard > API Keys after subscribing to Pro.',
  };
}
