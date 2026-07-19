import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { buildPrivateRowMaps } from './catalog.ts';
import {
  ENGINE_VERSION,
  RAILWAY_PROMOTION_TRIGGERS,
  buildErrorResponse,
  buildJsonResponse,
  buildPublicSemanticPayload,
  buildSearchAuditContext,
  corsHeaders,
  insertSearchAuditRows,
  normalizeBoolean,
  normalizeLibrary,
  normalizeSource,
  normalizeStyle,
  resolveSearchAuditAccount,
} from './handle-search-request.ts';
import { normalizeQuery } from './normalize.ts';
import { rerankCandidates } from './rank.ts';
import {
  enforceDailyAllowance,
  enforceSearchRateLimit,
  resolveAllowanceTier,
  SearchEngineHttpError,
} from './rate-limit.ts';
import {
  retrieveRecommendationCandidateBatches,
} from './recommendation-candidate-retrieval.ts';
import { hydrateServingSvgRows, type FinalSvgRow } from './result-hydration.ts';
import {
  filterEligibleMaterialCandidates,
  materialStyleMatches,
  resolveMaterialVariant,
  uniqueMaterialCandidateIds,
  type MaterialAssetRow,
} from './material-serving.ts';
import {
  createSearchStageTimer,
  estimateCandidatePayloadCharacters,
  type SearchStageTimingSink,
  type SearchTimingVariant,
} from './stage-timing.ts';
import type { CandidateRow, PrivateFeatureRow, PrivateManifestRow } from './types.ts';
import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from '../../../../lib/search-intent-core.js';
import { buildSearchQueryFrame } from '../../../../lib/search-query-frame.js';
import {
  buildSearchRankingQueryVariants,
  normalizeSearchLibraryMode,
} from '../../../../lib/search-ranking-policy.js';

interface SharedRecommendationSearchOptions {
  defaultSource?: string;
  defaultEnvironment?: string | null;
  betaCohort?: string | null;
  timingSink?: SearchStageTimingSink | null;
  measurementVariant?: SearchTimingVariant;
  candidateRpcName?: string;
  hydrateFinalSvg?: boolean;
  includeTimingInResponse?: boolean;
  maxQueries?: number;
  adminClientFactory?: (() => any) | null;
  rateLimitEnforcer?: typeof enforceSearchRateLimit;
}

function sharedContractKey(plan: Record<string, unknown>) {
  return JSON.stringify({
    library: plan.library,
    libraryMode: plan.libraryMode,
    style: plan.style,
    limit: plan.limit,
    locale: plan.locale,
    includeQueryFrame: plan.includeQueryFrame,
  });
}

export async function handleSharedRecommendationSearchRequest(
  req: Request,
  {
    defaultSource = 'mcp_beta',
    defaultEnvironment = 'preview',
    betaCohort = null,
    timingSink = null,
    measurementVariant = 'treatment',
    candidateRpcName = 'si_search_icon_candidates_v4',
    hydrateFinalSvg = true,
    includeTimingInResponse = false,
    maxQueries = 8,
    adminClientFactory = null,
    rateLimitEnforcer = enforceSearchRateLimit,
  }: SharedRecommendationSearchOptions = {},
) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return buildJsonResponse({ error: 'method_not_allowed' }, 405);
  }

  const startedAt = Date.now();
  const timing = createSearchStageTimer(timingSink, undefined, measurementVariant);
  let adminClient: any = null;
  let plans: any[] = [];
  let identity: Awaited<ReturnType<typeof enforceSearchRateLimit>> = {
    sessionHash: null,
    ipHash: null,
    countryCode: null,
    geoSource: null,
  };
  let account: Awaited<ReturnType<typeof resolveSearchAuditAccount>> = {
    userId: null,
    isRegistered: false,
    accountPlan: null,
    subscriptionStatus: null,
    isPro: false,
  };

  try {
    const body = await timing.measure('request_parse', () => req.json().catch(() => ({})));
    if (!Array.isArray(body.queries) || body.queries.length < 1 || body.queries.length > maxQueries) {
      throw new SearchEngineHttpError('Shared recommendation query count is outside the allowed range.', {
        status: 400,
        code: 'grouped_query_limit_exceeded',
        hint: `Provide between 1 and ${maxQueries} queries.`,
        retryable: false,
      });
    }
    if (body.queries.some((query: unknown) => !query || typeof query !== 'object' || Array.isArray(query))) {
      throw new SearchEngineHttpError('Each shared recommendation query must be an object.', {
        status: 400,
        code: 'invalid_grouped_query',
        hint: 'Provide the normal search request fields for each query.',
        retryable: false,
      });
    }

    const sharedFields = Object.fromEntries(
      Object.entries(body as Record<string, unknown>).filter(([key]) => key !== 'queries'),
    );
    plans = (body.queries as Array<Record<string, unknown>>).map((query, index) => {
      const requestBody = { ...sharedFields, ...query };
      const queryNorm = normalizeQuery(requestBody.query);
      if (!queryNorm) {
        throw new SearchEngineHttpError('A shared recommendation query is empty.', {
          status: 400,
          code: 'empty_grouped_query',
          hint: 'Provide a non-empty query for every recommendation variant.',
          retryable: false,
          details: { index },
        });
      }
      const library = normalizeLibrary(requestBody.library);
      const rawLibraryMode = String(requestBody.library_mode || 'strict').trim().toLowerCase();
      if (!['strict', 'prefer', 'all'].includes(rawLibraryMode)) {
        throw new SearchEngineHttpError('Unsupported library mode.', {
          status: 400,
          code: 'invalid_library_mode',
          hint: 'Use strict, prefer, or all.',
          retryable: false,
          details: { index },
        });
      }
      const libraryMode = normalizeSearchLibraryMode(rawLibraryMode);
      if (libraryMode === 'prefer' && !library) {
        throw new SearchEngineHttpError('Preferred-library mode requires a library.', {
          status: 400,
          code: 'preferred_library_required',
          hint: 'Provide a library or use all mode.',
          retryable: false,
          details: { index },
        });
      }
      const source = normalizeSource(requestBody.source, defaultSource);
      const auditContext = buildSearchAuditContext(requestBody, source);
      if (defaultEnvironment) auditContext.environment = defaultEnvironment;
      if (betaCohort) auditContext.beta_cohort = betaCohort;
      const style = normalizeStyle(requestBody.style);
      const limit = Math.max(1, Math.min(50, Number(requestBody.limit || 20)));
      const locale = requestBody.locale || null;
      const auditQueryFrame = buildSearchQueryFrame(queryNorm, { locale });
      const includeQueryFrame = normalizeBoolean(requestBody.include_query_frame);
      const queryVariants = buildSearchRankingQueryVariants(
        queryNorm,
        buildIntentQueryVariants(queryNorm, { maxVariants: 10 }),
        { maxVariants: 14 },
      );
      return {
        index,
        queryNorm,
        queryVariants,
        library,
        libraryMode,
        source,
        auditContext,
        style,
        limit,
        locale,
        includeQueryFrame,
        auditQueryFrame,
        intentProfile: buildSearchIntentProfile(queryNorm),
      };
    });

    const contractKeys = new Set(plans.map((plan) => sharedContractKey(plan)));
    if (contractKeys.size !== 1) {
      throw new SearchEngineHttpError('Shared recommendation queries must use one search contract.', {
        status: 400,
        code: 'mixed_grouped_search_contract',
        hint: 'Use the same library, library mode, style, limit, and locale for every query.',
        retryable: false,
      });
    }

    identity = await timing.measure('rate_limit', () => rateLimitEnforcer(req, plans.length));
    adminClient = adminClientFactory
      ? adminClientFactory()
      : createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
    account = await timing.measure(
      'account_resolution',
      () => resolveSearchAuditAccount(adminClient, req, plans[0].auditContext.api_key_hash),
    );

    // Tiered daily allowance; inert unless SEARCH_ENGINE_TIER_ENFORCEMENT=on.
    // Recommendation fanout must consume the same allowance as direct search.
    await enforceDailyAllowance(adminClient, {
      ipHash: plans[0].auditContext.ip_hash || identity.ipHash,
      tier: resolveAllowanceTier(account),
    });

    const logicalBatches = await timing.measure(
      'candidate_search',
      () => retrieveRecommendationCandidateBatches(adminClient, {
        logicalQueries: plans,
        candidateRpcName,
        library: plans[0].libraryMode === 'strict' ? plans[0].library : null,
        limit: Math.max(plans[0].limit * 3, 40),
      }),
    );
    timing.addCounts({
      query_variants: plans.reduce((total, plan) => total + plan.queryVariants.length, 0),
      candidate_rows: logicalBatches.reduce(
        (total, batches) => total + batches.reduce(
          (batchTotal, batch) => batchTotal + (batch.data?.length || 0),
          0,
        ),
        0,
      ),
    });
    timing.addApproximateSizes({
      candidate_svg_characters: 0,
      candidate_payload_characters: estimateCandidatePayloadCharacters(
        logicalBatches.flatMap((batches) => batches.flatMap((batch) => batch.data || [])),
      ),
    });

    const unfilteredCandidatesByLogicalQuery = plans.map((plan, logicalQueryIndex) => {
      const candidatesById = new Map<string, CandidateRow>();
      for (const batch of logicalBatches[logicalQueryIndex]) {
        if (batch.error) throw batch.error;
        for (const rawRow of (batch.data || []) as CandidateRow[]) {
          const adjustment = getIntentCandidateAdjustment(rawRow, plan.intentProfile);
          const row = {
            ...rawRow,
            query_variant: batch.variant,
            query_variant_rank: batch.index,
            intent_boost: adjustment.boost + Math.max(0, 6 - batch.index),
            intent_penalty: adjustment.penalty,
            lexical_rank: Number(rawRow.lexical_rank || 0),
          };
          const existing = candidatesById.get(row.icon_id);
          const rowScore = row.lexical_rank + (row.intent_boost || 0) - (row.intent_penalty || 0);
          const existingScore = existing
            ? existing.lexical_rank + (existing.intent_boost || 0) - (existing.intent_penalty || 0)
            : -Infinity;
          if (!existing || rowScore > existingScore) candidatesById.set(row.icon_id, row);
        }
      }
      return [...candidatesById.values()];
    });
    const materialVariant = resolveMaterialVariant(plans[0].style);
    const materialCandidateIds = [...new Set(
      unfilteredCandidatesByLogicalQuery.flatMap((candidates) => uniqueMaterialCandidateIds(candidates)),
    )];
    let eligibleMaterialIds = new Set<string>();
    if (materialCandidateIds.length > 0) {
      const materialEligibilityResult = await timing.measure<any>(
        'material_eligibility',
        () => adminClient
          .from('material_icon_assets')
          .select('icon_id')
          .eq('variant', materialVariant)
          .in('icon_id', materialCandidateIds),
      );
      if (materialEligibilityResult.error) throw materialEligibilityResult.error;
      eligibleMaterialIds = new Set(
        (materialEligibilityResult.data || []).map((row: { icon_id: string }) => row.icon_id),
      );
    }
    const candidatesByLogicalQuery = unfilteredCandidatesByLogicalQuery.map((candidates) => (
      filterEligibleMaterialCandidates(candidates, eligibleMaterialIds)
    ));
    if (
      plans[0].libraryMode === 'strict'
      && plans[0].library === 'material'
      && candidatesByLogicalQuery.some((candidates, index) => (
        uniqueMaterialCandidateIds(unfilteredCandidatesByLogicalQuery[index]).length > 0
        && candidates.length === 0
      ))
    ) {
      throw new SearchEngineHttpError('Matching Material icons exist, but their SVG assets are unavailable.', {
        status: 503,
        code: 'material_asset_unavailable',
        hint: 'Retry after the Material asset store is restored.',
        retryable: true,
        details: { variant: materialVariant },
      });
    }
    timing.addCounts({
      unique_candidates: new Set(
        candidatesByLogicalQuery.flatMap((candidates) => candidates.map((row) => row.icon_id)),
      ).size,
    });

    const allCandidateIconIds = [...new Set(
      candidatesByLogicalQuery.flatMap((candidates) => candidates.map((row) => row.icon_id)),
    )];
    let manifests: PrivateManifestRow[] = [];
    let features: PrivateFeatureRow[] = [];
    if (allCandidateIconIds.length > 0) {
      const [manifestResult, featureResult] = await timing.measure('private_metadata', () => Promise.all([
        adminClient
          .from('icon_search_private_manifest')
          .select('icon_id, semantic_aliases, use_cases, contraindications, trust_tier, explanation_short')
          .in('icon_id', allCandidateIconIds),
        adminClient
          .from('icon_search_private_features')
          .select('icon_id, popularity_score, behavioral_score, editorial_score, replace_risk_score, manual_boost, manual_penalty')
          .in('icon_id', allCandidateIconIds),
      ]));
      if (manifestResult.error) throw manifestResult.error;
      if (featureResult.error) throw featureResult.error;
      manifests = (manifestResult.data || []) as PrivateManifestRow[];
      features = (featureResult.data || []) as PrivateFeatureRow[];
    }

    const { manifestsById, featuresById } = buildPrivateRowMaps(manifests, features);
    const rankedByLogicalQuery = timing.measureSync('reranking', () => (
      plans.map((plan, index) => rerankCandidates(
        plan.queryNorm,
        candidatesByLogicalQuery[index],
        manifestsById,
        featuresById,
        { libraryMode: plan.libraryMode, requestedLibrary: plan.library },
      )
        .filter((row) => materialStyleMatches(row, plan.style))
        .slice(0, plan.limit))
    ));
    timing.addCounts({
      final_results: rankedByLogicalQuery.reduce((total, rows) => total + rows.length, 0),
    });

    const resultIconIds = [...new Set(
      rankedByLogicalQuery.flatMap((rows) => rows.map((row) => row.icon_id)),
    )];
    const materialResultIds = [...new Set(
      rankedByLogicalQuery.flatMap((rows) => rows
        .filter((row) => row.source_library === 'material')
        .map((row) => row.icon_id)),
    )];
    const catalogResultIds = resultIconIds.filter((iconId) => !materialResultIds.includes(iconId));
    let finalSvgById = new Map<string, string | null>();
    let materialSvgRows: MaterialAssetRow[] = [];
    let publicRecordsById = new Map<string, Record<string, unknown>>();
    if (resultIconIds.length > 0) {
      const [finalSvgResult, materialSvgResult, publicRegistryResult] = await Promise.all([
        hydrateFinalSvg && catalogResultIds.length > 0
          ? timing.measure<any>(
            'final_svg',
            () => adminClient.from('icon_catalog').select('icon_id, svg').in('icon_id', catalogResultIds),
          )
          : Promise.resolve(null),
        materialResultIds.length > 0
          ? timing.measure<any>(
            'material_svg',
            () => adminClient
              .from('material_icon_assets')
              .select('icon_id, variant, svg')
              .eq('variant', materialVariant)
              .in('icon_id', materialResultIds),
          )
          : Promise.resolve(null),
        timing.measure<any>(
          'public_semantic',
          () => adminClient
            .from('icon_registry_public_export')
            .select('icon_id, source_library, source_name, label, purpose, category, depicts, semantic_tags, synonyms, use_when, avoid_when, record')
            .in('icon_id', resultIconIds),
        ),
      ]);
      if (finalSvgResult?.error) throw finalSvgResult.error;
      if (materialSvgResult?.error) throw materialSvgResult.error;
      if (finalSvgResult) {
        finalSvgById = new Map(
          ((finalSvgResult.data || []) as FinalSvgRow[]).map((row) => [row.icon_id, row.svg]),
        );
      }
      materialSvgRows = materialSvgResult ? (materialSvgResult.data || []) as MaterialAssetRow[] : [];
      if (publicRegistryResult.error) throw publicRegistryResult.error;
      publicRecordsById = new Map(
        (publicRegistryResult.data || []).map((record: Record<string, unknown>) => [
          String(record.icon_id),
          record,
        ]),
      );
    }

    const resultsByLogicalQuery = rankedByLogicalQuery.map((rows) => {
      const hydratedRows = hydrateServingSvgRows(rows, {
        catalogSvgRows: hydrateFinalSvg
          ? rows
            .filter((row) => row.source_library !== 'material')
            .map((row) => ({ icon_id: row.icon_id, svg: finalSvgById.get(row.icon_id) ?? null }))
          : null,
        materialSvgRows,
        materialVariant,
      });
      return hydratedRows.map((row) => {
        const publicRecord = publicRecordsById.get(row.icon_id);
        return publicRecord
          ? { ...row, semantic: buildPublicSemanticPayload(publicRecord) }
          : row;
      });
    });

    const latencyMs = Date.now() - startedAt;
    await timing.measure('audit_write', () => insertSearchAuditRows(
      adminClient,
      plans.map((plan, index) => ({
        query_norm: plan.queryNorm,
        source: plan.source,
        library_filter: plan.library,
        library_mode: plan.libraryMode,
        result_count: resultsByLogicalQuery[index].length,
        search_outcome: resultsByLogicalQuery[index].length > 0 ? 'results' : 'zero',
        confidence_label: plan.auditQueryFrame.confidence_floor,
        status: 'ok',
        latency_ms: latencyMs,
        ...timing.requestContext,
        ...plan.auditContext,
        session_hash: plan.auditContext.session_hash || identity.sessionHash,
        ip_hash: plan.auditContext.ip_hash || identity.ipHash,
        country_code: plan.auditContext.country_code || identity.countryCode,
        geo_source: plan.auditContext.geo_source || identity.geoSource,
        user_id: account.userId,
        is_registered: account.isRegistered,
        account_plan: account.accountPlan,
        subscription_status: account.subscriptionStatus,
        is_pro: account.isPro,
      })),
    ));

    const responses = plans.map((plan, index) => ({
      index,
      status: 200,
      body: {
        query: plan.queryNorm,
        results: resultsByLogicalQuery[index],
        library_mode: plan.libraryMode,
        requested_library: plan.library,
        engine_version: ENGINE_VERSION,
        query_expansion: {
          variants: plan.queryVariants,
          expanded: plan.queryVariants.length > 1,
          ...(plan.includeQueryFrame ? { query_frame: plan.auditQueryFrame } : {}),
        },
        railway_promotion_triggers: RAILWAY_PROMOTION_TRIGGERS,
      },
    }));
    const responseBody = {
      schema_version: 1,
      response_count: responses.length,
      responses,
    };
    timing.addApproximateSizes({ response_json_characters: JSON.stringify(responseBody).length });
    const timingRecord = timing.finish(
      resultsByLogicalQuery.some((results) => results.length > 0) ? 'results' : 'zero',
    );
    return buildJsonResponse({
      ...responseBody,
      ...(includeTimingInResponse && timingRecord ? { measurement_timing: timingRecord } : {}),
    });
  } catch (error) {
    if (adminClient && plans.length > 0) {
      try {
        await insertSearchAuditRows(
          adminClient,
          plans.map((plan) => ({
            query_norm: plan.queryNorm,
            source: plan.source,
            library_filter: plan.library,
            library_mode: plan.libraryMode,
            result_count: 0,
            search_outcome: 'error',
            error_code: error instanceof SearchEngineHttpError ? error.code : 'search_service_unavailable',
            confidence_label: null,
            status: 'error',
            latency_ms: Date.now() - startedAt,
            ...timing.requestContext,
            ...plan.auditContext,
            session_hash: plan.auditContext.session_hash || identity.sessionHash,
            ip_hash: plan.auditContext.ip_hash || identity.ipHash,
            country_code: plan.auditContext.country_code || identity.countryCode,
            geo_source: plan.auditContext.geo_source || identity.geoSource,
            user_id: account.userId,
            is_registered: account.isRegistered,
            account_plan: account.accountPlan,
            subscription_status: account.subscriptionStatus,
            is_pro: account.isPro,
          })),
        );
      } catch {
        // Ignore secondary audit failures while returning the primary error.
      }
    }
    const timingRecord = timing.finish('error');
    return buildErrorResponse(error, {
      measurementTiming: includeTimingInResponse ? timingRecord : null,
    });
  }
}
