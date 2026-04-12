import { getConfiguredApiKey } from './auth.js';

export function hasPremiumLibraryAccess(authState, library) {
  if (authState?.isPro) return true;
  return Array.isArray(authState?.purchasedSlugs) && authState.purchasedSlugs.includes(library);
}

export function hasProWorkflowAccess(authState) {
  return Boolean(authState?.isPro);
}

export function buildPremiumLibraryAccessError(
  libraryName,
  hint = 'Set SUPERICONS_API_KEY in your MCP config with an API key that includes access to this premium pack.'
) {
  return {
    error: 'Premium access required',
    code: 'premium_library_access_required',
    message: `The "${libraryName}" pack requires a purchase or Pro subscription. Visit https://supericons.dev`,
    hint,
    retryable: false,
  };
}

export function buildProWorkflowAccessError(authState, featureName) {
  const configuredApiKey = getConfiguredApiKey();

  if (!configuredApiKey) {
    return {
      error: 'API key required',
      code: 'workflow_api_key_required',
      message: `${featureName} requires a Pro-linked SUPERICONS_API_KEY.`,
      hint: 'Add SUPERICONS_API_KEY to your MCP config, then restart the MCP client.',
      retryable: false,
    };
  }

  if (authState?.authenticated && !authState?.isPro) {
    return {
      error: 'Pro workflow access required',
      code: 'workflow_pro_required',
      message: `${featureName} is available through Supericons Pro workflow access. Your current API key is valid, but it is not linked to a Pro subscription.`,
      hint: 'Upgrade the account linked to this API key to Pro, or switch to a different Pro-linked SUPERICONS_API_KEY.',
      retryable: false,
    };
  }

  if (authState?.error) {
    return {
      error: 'Workflow access validation failed',
      code: 'workflow_access_validation_failed',
      message: `${featureName} could not confirm your workflow access right now.`,
      hint: `Current auth validation error: ${authState.error}`,
      retryable: true,
    };
  }

  return {
    error: 'Pro workflow access required',
    code: 'workflow_pro_required',
    message: `${featureName} is available through Supericons Pro workflow access. Visit https://supericons.dev/pricing and connect a Pro-linked SUPERICONS_API_KEY.`,
    hint: 'Generate or manage your API key from Dashboard > API Keys after subscribing to Pro.',
    retryable: false,
  };
}
