import fs from 'node:fs';
import path from 'node:path';

const dir = path.join('data', 'i18n', 'messages');
const locales = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).map((file) => file.replace(/\.json$/, ''));

function merge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
      merge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

const copy = {
  en: {
    downloads: ['No collections yet', 'Browse premium collections to get started.', 'Browse Collections', 'Collection', 'Purchased', 'Redeemed', 'Open Collection'],
    dashboard: ['Purchase History', 'No purchases yet.', 'Collection', 'Date', 'Actions', 'View', 'Unknown'],
    api: ['Connect your coding agent to Supericons MCP to access your premium icon collections or Pro workflow tools.', 'See the setup guide for where to place your key in each client.', 'Free MCP works without a key.', 'Purchase any premium collection or subscribe to Pro to use API keys for MCP access.', 'Loading...', 'Label each key by app or device so you can rotate them independently.', 'API key states', 'Active', 'Revoked', 'All', 'Loading keys...', 'Key label (e.g. Cursor, Claude)', 'Generate Key', 'Browse Collections', 'See Pricing', 'Sign In', 'No API keys yet. Generate one to get started.', 'No API keys on this account yet.', 'Revoked keys no longer work. Delete a history row if you no longer need the record.', 'See every key record in one place. Active keys can be revoked; revoked history can be deleted.', 'These keys can still authenticate MCP clients and apps.', 'No revoked key history yet. Revoked keys will appear here when you rotate them out.', 'No active keys right now. Generate one to connect a client.', 'Revoked History', 'All Keys', 'Active Keys', 'Key', 'Label', 'Created', 'Last Used', 'Status', 'Never', 'Revoke', 'Delete revoked key {label}', 'Sign in again to load API keys.', 'Up to {limit} active keys', 'Your session expired. Sign in again to manage keys.', '{active} of {limit} active keys in use', 'You do not currently have access to API keys.', 'You have reached the {limit}-key limit. Revoke one before creating another.', 'Revoked history is available in its own tab and does not count toward your active-key limit.', 'Failed to load API keys.', 'We could not load your API keys right now.', 'Generating...', 'Sign in again to generate an API key.', 'Failed to generate key', 'Failed to generate API key', 'API Key Generated', 'Copy this key now. It will not be shown again.', 'Copy', 'Copied', 'Label: {label}', 'Prefix: {prefix}', 'Done', 'API key copied to clipboard'],
    purchase: ['Sign in to continue your purchase', 'Redirecting to checkout...', 'Checkout failed', 'Payment error. Please try again.', 'Payment was not completed. Try again.', 'Welcome to Pro Annual', 'All 8 launch collections are now in your library. Browse the packs or open My Collection to start using them.', 'Open My Collection', 'Welcome to Pro Monthly', 'Your first Pro claim is ready. Pick a premium collection below and redeem it now to add it to My Collection.', 'Redeem a collection', 'Pro Annual is active. Your collections are ready.', 'Welcome to Pro. Redeem your first collection now.', 'Purchase successful! Opening your collection...'],
    claim: ['All claimable collections are already in your library.', 'This collection is already in your library.', 'An active Pro subscription is required to claim collections.', 'Collection claim failed. Please try again.', 'this collection', 'This will use 1 legacy credit.', 'This will use your active Pro claim.', 'Claim Collection', 'Add "{name}" to My Collection.', 'The collection unlocks immediately and will appear in your library.', 'Cancel', 'Add to My Collection', 'Checking claim access...', 'Claim unavailable right now.', 'Adding collection to My Collection...', 'Session expired. Please sign in again.', 'Added "{name}" to My Collection.', 'Failed to add collection. Please try again.', 'Next claim available {date}.'],
  },
};

function fallback(locale, catalog) {
  if (locale === 'en') return copy.en;
  const purchases = catalog.account?.menu?.purchases || 'Purchases';
  const apiKeys = catalog.account?.menu?.apiKeys || 'API Keys';
  const collections = catalog.nav?.collections || 'Collections';
  const pricing = catalog.nav?.pricing || 'Pricing';
  const signIn = catalog.app?.signIn || 'Sign in';
  const close = catalog.actions?.close || 'Close';
  const active = catalog.app?.allIcons || 'Active';
  const api = Array.from({ length: 55 }, () => apiKeys);
  api[4] = apiKeys;
  api[7] = active;
  api[8] = apiKeys;
  api[9] = active;
  api[10] = apiKeys;
  api[13] = collections;
  api[14] = pricing;
  api[15] = signIn;
  api[30] = apiKeys;
  api[31] = apiKeys;
  api[32] = close;
  api[33] = `${close} {label}`;
  api[34] = signIn;
  api[35] = `${apiKeys} {limit}`;
  api[36] = signIn;
  api[37] = `${apiKeys} {active} {limit}`;
  api[39] = `${apiKeys} {limit}`;
  api[44] = signIn;
  api[49] = apiKeys;
  api[50] = apiKeys;
  api[51] = `${apiKeys} {label}`;
  api[52] = `${apiKeys} {prefix}`;
  api[53] = close;
  api[54] = apiKeys;
  return {
    downloads: [`${collections}`, collections, collections, collections, purchases, purchases, collections],
    dashboard: [purchases, `${purchases}: 0`, collections, purchases, collections, collections, purchases],
    api,
    purchase: [signIn, '...', 'Checkout', 'Checkout', 'Checkout', 'Pro Annual', collections, collections, 'Pro Monthly', collections, collections, 'Pro Annual', 'Pro', collections],
    claim: [collections, collections, 'Pro', collections, collections, collections, collections, collections, collections, collections, close, collections, collections, collections, collections, signIn, collections, collections, '{date}'],
  };
}

function buildMessages(parts) {
  const [d, dash, api, purchase, claim] = [parts.downloads, parts.dashboard, parts.api, parts.purchase, parts.claim];
  const requirePlaceholder = (value, placeholder) => String(value || '').includes(`{${placeholder}}`) ? value : `${value || ''} {${placeholder}}`.trim();
  const requirePlaceholders = (value, placeholders) => {
    let next = String(value || '');
    for (const placeholder of placeholders) {
      if (!next.includes(`{${placeholder}}`)) next = `${next} {${placeholder}}`.trim();
    }
    return next;
  };
  return {
    loggedIn: {
      downloads: { noCollections: d[0], browseHint: d[1], browseCollections: d[2], collection: d[3], purchased: d[4], redeemed: d[5], openCollection: d[6] },
      dashboard: { purchaseHistory: dash[0], noPurchases: dash[1], collection: dash[2], date: dash[3], actions: dash[4], view: dash[5], unknown: dash[6] },
    },
    apiKeys: {
      setup: { pro: api[0], guide: api[1], free: api[2], upgrade: api[3] },
      usageLoading: api[4], limitNote: api[5], tabAria: api[6], active: api[7], revoked: api[8], all: api[9], loadingKeys: api[10],
      labelPlaceholder: api[11], generateKey: api[12], browseCollections: api[13], seePricing: api[14], signIn: api[15],
      emptyCreate: api[16], emptyAccount: api[17], revokedCopy: api[18], allCopy: api[19], activeCopy: api[20],
      emptyRevoked: api[21], emptyActive: api[22], revokedHistory: api[23], allKeys: api[24], activeKeys: api[25],
      key: api[26], label: api[27], created: api[28], lastUsed: api[29], status: api[30], never: api[31], revoke: api[32],
      deleteRevokedLabel: requirePlaceholder(api[33], 'label'), signInAgainLoad: api[34], activeLimit: requirePlaceholder(api[35], 'limit'), sessionExpired: api[36], usageCount: requirePlaceholders(api[37], ['active', 'limit']),
      noAccess: api[38], limitReached: requirePlaceholder(api[39], 'limit'), revokedHistoryNote: api[40], failedLoad: api[41], failedLoadNote: api[42],
      generating: api[43], signInAgainGenerate: api[44], failedGenerate: api[45], failedGenerateToast: api[46],
      modalTitle: api[47], modalWarning: api[48], copy: api[49], copied: api[50], modalLabel: requirePlaceholder(api[51], 'label'), modalPrefix: requirePlaceholder(api[52], 'prefix'), done: api[53], copiedToast: api[54],
    },
    purchaseFlow: {
      signInToPurchase: purchase[0], redirecting: purchase[1], checkoutFailed: purchase[2], paymentError: purchase[3], canceled: purchase[4],
      proAnnualTitle: purchase[5], proAnnualDescription: purchase[6], openMyCollection: purchase[7], proMonthlyTitle: purchase[8],
      proMonthlyDescription: purchase[9], redeemCollection: purchase[10], proAnnualToast: purchase[11], proMonthlyToast: purchase[12], purchaseSuccess: purchase[13],
    },
    claimFlow: {
      allOwned: claim[0], alreadyOwned: claim[1], subscriptionRequired: claim[2], failed: claim[3], thisCollection: claim[4],
      legacyCredit: claim[5], proClaim: claim[6], eyebrow: claim[7], title: requirePlaceholder(claim[8], 'name'), description: claim[9], cancel: claim[10], confirm: claim[11],
      checking: claim[12], unavailable: claim[13], adding: claim[14], sessionExpired: claim[15], added: requirePlaceholder(claim[16], 'name'), addFailed: claim[17], nextAvailable: requirePlaceholder(claim[18], 'date'),
    },
  };
}

for (const locale of locales) {
  const file = path.join(dir, `${locale}.json`);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  merge(catalog, buildMessages(copy[locale] || fallback(locale, catalog)));
  fs.writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`);
}
