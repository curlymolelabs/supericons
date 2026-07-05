import { readFile } from 'node:fs/promises';

const files = {
  api: 'supabase/functions/admin-api/index.ts',
  app: 'public/admin-app.js',
  html: 'admin.html',
  main: 'main.js',
  iconIntelligence: 'lib/icon-intelligence.js',
  searchClient: 'lib/search-engine-client.js',
  searchHandler: 'supabase/functions/_shared/search-engine/handle-search-request.ts',
  hostedSearchClient: 'mcp/hosted-search-client.js',
  remoteMcpServer: 'mcp/remote-server.js',
  rateLimit: 'supabase/functions/_shared/search-engine/rate-limit.ts',
  migration: 'supabase/migrations/20260612_search_audit_geo_account_fields.sql',
};

const forbiddenPublicMetadata = [
  'reviewer_model',
  'reviewer_reasoning_effort',
  'internal_review_status',
  'prompt_notes',
  'workflow_trace',
  'agent_notes',
  'private_confidence_rationale',
];

async function load(path) {
  return await readFile(path, 'utf8');
}

function assertIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`${label} is missing: ${needle}`);
  }
}

function assertNotIncludes(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`${label} contains public-unsafe metadata: ${needle}`);
  }
}

const [
  api,
  app,
  html,
  main,
  iconIntelligence,
  searchClient,
  searchHandler,
  hostedSearchClient,
  remoteMcpServer,
  rateLimit,
  migration,
] = await Promise.all([
  load(files.api),
  load(files.app),
  load(files.html),
  load(files.main),
  load(files.iconIntelligence),
  load(files.searchClient),
  load(files.searchHandler),
  load(files.hostedSearchClient),
  load(files.remoteMcpServer),
  load(files.rateLimit),
  load(files.migration),
]);

[
  'handleIntelligenceSearchQueue',
  'handleIntelligenceSearchDetail',
  'handleIntelligenceSearchExport',
  'buildQueryQueuePayload',
  'buildQueryWorkbenchRows',
  "segments[2] === 'queue'",
  "segments[2] === 'query-detail'",
  "segments[2] === 'export'",
  'query_review_feature_available',
  'Content-Disposition',
].forEach((needle) => assertIncludes(api, needle, files.api));

[
  'pagination:',
  'page_size',
  'fetchAllRows<Record<string, unknown>>',
  'fetchHostedSearchAuditRows',
  'source_table',
  'registered_user_count',
  'country_code',
  'successful_attempt_count',
  'parseQueryEnvironmentFilter',
  'filterEvidenceRowsByEnvironment',
  'environment: params.environment',
  'environments',
  'http://127.0.0.1:5173',
  'schema_version: 2',
  'evidence_sample',
  'filteredEvidence.slice',
].forEach((needle) => assertIncludes(api, needle, `${files.api} evidence pagination`));

[
  'queryExplorerTableBody',
  'queryExplorerIssueFilter',
  'queryExplorerStatusFilter',
  'intelligenceEnvironmentFilter',
  'queryExplorerEnvironmentFilter',
  'queryExplorerLibraryFilter',
  'queryExplorerPurposeFilter',
  'queryExplorerSort',
  'queryExplorerDirection',
  'queryExplorerPageSize',
  'queryExplorerExportCsv',
  'queryExplorerExportJson',
  'queryExplorerExportAgentPack',
  'decisionActions',
  'decisionMetricStrip',
  'decisionCockpitStamp',
  'umamiCsvInput',
  'umamiCsvButton',
  'umamiCsvClearButton',
  'umamiAudienceSummary',
  'umamiChannelSummary',
  'intelligenceChannelFilter',
  'queryExplorerChannelFilter',
  'Production',
  'All channels',
  'Unclassified source',
  'Unclassified',
  'queryWorkbenchTabQueries',
  'queryWorkbenchTabActivity',
  'intelligenceRawSignalsDetails',
  'Raw Signals And Secondary Metrics',
  'intelligenceSearchSummaryDetails',
  'Search Demand Summary',
  'queryDetailDrawer',
  'queryDetailContent',
  'intelligenceEvidencePaginationControls',
  'Filter latest activity...',
  'aria-label="Filter latest activity"',
  'value="hosted_search_audit"',
].forEach((needle) => assertIncludes(html, needle, files.html));

[
  'Review Queue',
  'Query Review',
  '<div id="searchIntelZeroResultQueries">',
  '<div id="searchIntelLowResultQueries">',
  '<div id="searchIntelReplacementQueries">',
  'id="searchIntelNotes"',
  'id="queryReviewForm"',
  'id="queryReviewShowReviewed"',
  'Legacy / unknown',
  'Production only',
  '>Unknown<',
].forEach((needle) => assertNotIncludes(html, needle, files.html));

[
  'loadQueryQueue',
  'renderQueryExplorer',
  'buildFallbackQueryQueuePayload',
  'applyFallbackQueryQueue',
  'normalizeQueryEnvironment',
  'syncQueryEnvironmentControls',
  'refreshEnvironmentScopedIntelligence',
  'rowMatchesQueryEnvironment',
  'rowMatchesQueryChannel',
  'collectClientRowChannels',
  'collectClientRowEnvironments',
  'entryHasHostedAuditSource',
  'rowMatchesIntelligenceEvidenceFilters',
  'classifyClientEvidenceChannel',
  'formatQueryAccountText',
  'queryChannelLabel',
  'syncQueryChannelControls',
  'renderDecisionCockpit',
  'buildDecisionActions',
  'importUmamiCsvFiles',
  'buildUmamiSummary',
  'sanitizeAnalyticsPath',
  'stripTokenLikeText',
  'successful_attempt_count',
  'isLocalAdminHost',
  'setQueryWorkbenchView',
  'toggleSidebar',
  'openQueryDetail',
  'saveQueryDetailReview',
  'exportCurrentQueryView',
  'visible_admin_data',
  'schema_version: 2',
  'evidence_sample',
  'limitations',
  'ip_hash_count',
  'countries',
  'changeQueryExplorerPage',
  'changeIntelligenceEvidencePage',
  '/intelligence/search/queue',
  '/intelligence/search/query-detail',
  '/intelligence/search/export',
  "params.set('environment'",
  "params.set('channel'",
  "action.includes('search')",
  'No successful search or engagement signals yet',
  'No MCP query events in this window',
  'No copied, saved, or downloaded icons in this window',
  'No purpose-filtered searches or icon actions in this window',
  'No replacement events in this window',
  'Search-only window',
  'Purpose coverage',
  'Icon Copy Events',
  'MCP Events',
  'Review applies to this query, library, and purpose across all environments.',
  'Showing rows that match the active filters from the loaded API page.',
].forEach((needle) => assertIncludes(app, needle, files.app));

[
  'Account data not captured',
].forEach((needle) => assertNotIncludes(app, needle, files.app));

[
  "source === 'mcp'",
  "source === 'hosted_mcp'",
  "source.includes('local_mcp')",
  "source === 'verify'",
  'type QueryChannel',
  'parseQueryChannelFilter',
  'normalizeAnalyticsToken',
  'isUnclassifiedAnalyticsToken',
  'classifySearchEvidenceChannel',
  'filterEvidenceRowsByChannel',
  'channel: parseQueryChannelFilter(url)',
  'channels: new Set<string>()',
  "'channels'",
].forEach((needle) => assertIncludes(api, needle, `${files.api} source classification`));

[
  'getSearchAnalyticsSource',
  'VITE_SUPERICONS_ANALYTICS_SOURCE',
  'source: getSearchAnalyticsSource()',
].forEach((needle) => assertIncludes(main, needle, files.main));

[
  'withPageContext',
  'p_domain: getEvidenceDomain()',
  'p_context_url: getEvidenceContextPath()',
].forEach((needle) => assertIncludes(iconIntelligence, needle, files.iconIntelligence));

[
  'getSignedInAccessToken',
  'headers.Authorization = `Bearer ${authorizationToken}`',
].forEach((needle) => assertIncludes(searchClient, needle, files.searchClient));

[
  'resolveSearchAuditAccount',
  'insertSearchAudit',
  'country_code: auditContext.country_code || identity.countryCode',
  'ip_hash: auditContext.ip_hash || identity.ipHash',
  'is_pro: account.isPro',
].forEach((needle) => assertIncludes(searchHandler, needle, files.searchHandler));

[
  'country_code: normalizeUsageCountry(context.country_code)',
  'geo_source: normalizeUsageToken(context.geo_source',
  'session_hash: normalizeUsageHash(context.session_hash)',
  'ip_hash: normalizeUsageHash(context.ip_hash)',
].forEach((needle) => assertIncludes(hostedSearchClient, needle, files.hostedSearchClient));

[
  'country_code: context.country_code',
  'geo_source: context.geo_source',
  'req.body?.params?.clientInfo?.name',
].forEach((needle) => assertIncludes(remoteMcpServer, needle, files.remoteMcpServer));

[
  'extractTrustedCountry',
  'cf-ipcountry',
  'x-vercel-ip-country',
].forEach((needle) => assertIncludes(rateLimit, needle, files.rateLimit));

[
  'add column if not exists country_code',
  'add column if not exists user_id',
  'search_request_audit_country_created_at_idx',
  'search_request_audit_user_created_at_idx',
].forEach((needle) => assertIncludes(migration, needle, files.migration));

for (const source of [api, app, html]) {
  for (const needle of forbiddenPublicMetadata) {
    assertNotIncludes(source, needle, 'admin query workbench');
  }
}

console.log('Admin query workbench contract checks passed.');
