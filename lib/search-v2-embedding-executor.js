import { buildEmbeddingSamplePlan } from './search-v2-embedding-sample.js';
import { readValidatedEmbeddingProviderResponse } from './search-v2-embedding-provider.js';

const EXECUTION_TIMEOUT_MS = 30_000;
const APPROVED_LEDGER_ROOT = 'tmp/search-v2-embedding-sample';

export class EmbeddingSampleExecutionError extends Error {
  constructor(message, executionSummary, options = {}) {
    super(message, options);
    this.name = 'EmbeddingSampleExecutionError';
    this.execution_summary = executionSummary;
  }
}

function requireExactAuthorization({ authorization, plan, suppliedFingerprint, suppliedSpendCapUsd }) {
  if (authorization?.schema_version !== 'search-v2-embedding-sample-authorization-1') {
    throw new Error('Unsupported embedding sample authorization.');
  }
  if (authorization.status !== 'approved_once') {
    throw new Error('Embedding sample authorization is not active.');
  }
  if (suppliedFingerprint !== plan.authorization_fingerprint) {
    throw new Error('Supplied authorization fingerprint does not match the sample plan.');
  }
  if (authorization.authorization_fingerprint !== plan.authorization_fingerprint) {
    throw new Error('Recorded authorization fingerprint does not match the sample plan.');
  }
  if (Number(suppliedSpendCapUsd) !== Number(authorization.spend_cap_usd)) {
    throw new Error('Supplied spend cap does not match the approved spend cap.');
  }
  if (plan.total_inputs_per_candidate > authorization.maximum_inputs_per_candidate) {
    throw new Error('Sample input count exceeds the approved limit.');
  }
  const plannedRequests = plan.candidates.reduce((sum, candidate) => sum + candidate.request_count, 0);
  if (plannedRequests > authorization.maximum_requests || authorization.maximum_retries !== 0) {
    throw new Error('Sample request or retry limits do not match the approval.');
  }
  if (authorization.vector_storage_allowed !== false || authorization.scope !== 'exact_sample_only') {
    throw new Error('Sample storage or scope does not match the approval.');
  }
  if (
    authorization.execution_ledger_required !== true
    || authorization.execution_ledger_root !== APPROVED_LEDGER_ROOT
  ) {
    throw new Error('A local one-run execution ledger must be required by the approval.');
  }
  return plannedRequests;
}

function requireExecutionLedger(executionLedger) {
  for (const method of ['reserve', 'recordAttempt', 'recordFailure', 'recordSuccess']) {
    if (typeof executionLedger?.[method] !== 'function') {
      throw new Error('A complete local execution ledger is required.');
    }
  }
  return executionLedger;
}

function requireCredentials(plan, environment) {
  const requiredNames = [...new Set(plan.candidates.flatMap((candidate) => [
    candidate.document_request.auth.environment_variable,
    candidate.query_request.auth.environment_variable,
  ]))];
  const missing = requiredNames.filter((name) => !String(environment?.[name] || '').trim());
  if (missing.length > 0) {
    throw new Error(`Missing required provider credentials: ${missing.join(', ')}`);
  }
  return Object.fromEntries(requiredNames.map((name) => [name, String(environment[name]).trim()]));
}

function validatePricing(pricing, plan) {
  if (pricing?.schema_version !== 'search-v2-embedding-sample-pricing-1') {
    throw new Error('Unsupported embedding sample pricing data.');
  }
  const prices = new Map();
  for (const candidate of plan.candidates) {
    const value = Number(pricing.candidates?.[candidate.id]?.price);
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${candidate.id}: valid sample pricing is required.`);
    }
    prices.set(candidate.id, value);
  }
  return prices;
}

function conservativeTokenUpperBound(request) {
  return Buffer.byteLength(JSON.stringify(request.body), 'utf8');
}

function estimateMaximumCost(plan, prices) {
  return plan.candidates.reduce((sum, candidate) => {
    const tokenUpperBound = conservativeTokenUpperBound(candidate.document_request)
      + conservativeTokenUpperBound(candidate.query_request);
    return sum + ((tokenUpperBound * prices.get(candidate.id)) / 1_000_000);
  }, 0);
}

function authenticatedHeaders(request, credentials) {
  const name = request.auth.environment_variable;
  const credential = credentials[name];
  const value = request.auth.scheme ? `${request.auth.scheme} ${credential}` : credential;
  return {
    'Content-Type': 'application/json',
    [request.auth.header]: value,
  };
}

function usageTokens(provider, usage) {
  if (!usage || typeof usage !== 'object') return null;
  if (provider === 'google') {
    const value = Number(usage.totalTokenCount ?? usage.promptTokenCount);
    return Number.isFinite(value) ? value : null;
  }
  const value = Number(usage.total_tokens);
  return Number.isFinite(value) ? value : null;
}

function dotProduct(left, right) {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) total += left[index] * right[index];
  return total;
}

function rankExpectedDocuments({ documents, queries, documentVectors, queryVectors }) {
  return queries.map((query, queryIndex) => {
    const ranked = documents
      .map((document, documentIndex) => ({
        document_id: document.id,
        similarity: dotProduct(queryVectors[queryIndex], documentVectors[documentIndex]),
      }))
      .sort((left, right) => right.similarity - left.similarity || left.document_id.localeCompare(right.document_id));
    const expectedRank = ranked.findIndex((entry) => entry.document_id === query.expected_document_id) + 1;
    return {
      query_id: query.id,
      locale: query.locale,
      expected_document_id: query.expected_document_id,
      expected_document_rank: expectedRank,
      top_document_id: ranked[0]?.document_id || null,
      top_1_pass: expectedRank === 1,
    };
  });
}

function reserveProviderRequest({ requestCount, approvedRequestCount }) {
  if (requestCount >= approvedRequestCount) {
    throw new Error('Approved provider request limit is exhausted.');
  }
  return requestCount + 1;
}

async function callProvider({ candidate, request, expectedCount, credentials, fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetchImpl(request.url, {
      method: request.method,
      headers: authenticatedHeaders(request, credentials),
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (!response?.ok) {
      throw new Error(`${candidate.provider}: provider request failed with status ${Number(response?.status) || 0}.`);
    }
    const payload = await response.json();
    const validated = readValidatedEmbeddingProviderResponse({
      candidate,
      response: payload,
      expectedCount,
    });
    return { ...validated, latency_ms: latencyMs };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${candidate.provider}: provider request timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeEmbeddingSample({
  sampleSet,
  candidates,
  authorization,
  pricing,
  suppliedFingerprint,
  suppliedSpendCapUsd,
  environment,
  fetchImpl,
  executionLedger,
  timeoutMs = EXECUTION_TIMEOUT_MS,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A provider transport is required.');
  const ledger = requireExecutionLedger(executionLedger);
  const plan = buildEmbeddingSamplePlan({ sampleSet, candidates });
  const approvedRequestCount = requireExactAuthorization({
    authorization,
    plan,
    suppliedFingerprint,
    suppliedSpendCapUsd,
  });
  const credentials = requireCredentials(plan, environment);
  const prices = validatePricing(pricing, plan);
  const maximumEstimatedCostUsd = estimateMaximumCost(plan, prices);
  if (maximumEstimatedCostUsd > Number(suppliedSpendCapUsd)) {
    throw new Error('Conservative sample cost estimate exceeds the approved spend cap.');
  }
  ledger.reserve({
    authorization_fingerprint: plan.authorization_fingerprint,
    spend_cap_usd: Number(suppliedSpendCapUsd),
    approved_request_count: approvedRequestCount,
  });

  const results = [];
  let requestCount = 0;
  let activeCandidateId = null;
  let activeInputKind = null;
  try {
    for (const candidatePlan of plan.candidates) {
      const candidate = candidates.find((entry) => entry.id === candidatePlan.id);
      activeCandidateId = candidate.id;
      activeInputKind = 'document';
      requestCount = reserveProviderRequest({ requestCount, approvedRequestCount });
      ledger.recordAttempt({
        attempt_number: requestCount,
        candidate_id: activeCandidateId,
        input_kind: activeInputKind,
      });
      const documentResult = await callProvider({
        candidate,
        request: candidatePlan.document_request,
        expectedCount: sampleSet.documents.length,
        credentials,
        fetchImpl,
        timeoutMs,
      });
      activeInputKind = 'query';
      requestCount = reserveProviderRequest({ requestCount, approvedRequestCount });
      ledger.recordAttempt({
        attempt_number: requestCount,
        candidate_id: activeCandidateId,
        input_kind: activeInputKind,
      });
      const queryResult = await callProvider({
        candidate,
        request: candidatePlan.query_request,
        expectedCount: sampleSet.queries.length,
        credentials,
        fetchImpl,
        timeoutMs,
      });

      const rankings = rankExpectedDocuments({
        documents: sampleSet.documents,
        queries: sampleSet.queries,
        documentVectors: documentResult.vectors,
        queryVectors: queryResult.vectors,
      });
      const documentTokens = usageTokens(candidate.provider, documentResult.summary.usage);
      const queryTokens = usageTokens(candidate.provider, queryResult.summary.usage);
      const totalTokens = documentTokens === null || queryTokens === null ? null : documentTokens + queryTokens;
      results.push({
        candidate_id: candidate.id,
        provider: candidate.provider,
        model: candidate.model,
        dimensions: candidate.dimensions,
        request_count: 2,
        latency_ms: {
          document: documentResult.latency_ms,
          query: queryResult.latency_ms,
          total: documentResult.latency_ms + queryResult.latency_ms,
        },
        validation: {
          document_vector_count: documentResult.summary.vector_count,
          query_vector_count: queryResult.summary.vector_count,
          unit_norm_tolerance: documentResult.summary.unit_norm_tolerance,
        },
        provider_reported_input_tokens: totalTokens,
        estimated_cost_usd: totalTokens === null ? null : (totalTokens * prices.get(candidate.id)) / 1_000_000,
        top_1_pass_count: rankings.filter((entry) => entry.top_1_pass).length,
        query_count: rankings.length,
        rankings,
      });
    }
    ledger.recordSuccess({
      request_count: requestCount,
      completed_candidate_count: results.length,
    });
  } catch (error) {
    const executionSummary = {
      schema_version: 'search-v2-embedding-sample-failure-1',
      status: 'failed',
      authorization_fingerprint: plan.authorization_fingerprint,
      spend_cap_usd: Number(suppliedSpendCapUsd),
      request_attempt_count: requestCount,
      approved_request_count: approvedRequestCount,
      retry_count: 0,
      vectors_stored: false,
      completed_candidate_count: results.length,
      failed_candidate_id: activeCandidateId,
      failed_input_kind: activeInputKind,
    };
    let ledgerFailureRecorded = false;
    try {
      ledger.recordFailure(executionSummary);
      ledgerFailureRecorded = true;
    } catch {
      ledgerFailureRecorded = false;
    }
    throw new EmbeddingSampleExecutionError(error.message, {
      ...executionSummary,
      ledger_failure_recorded: ledgerFailureRecorded,
    }, { cause: error });
  }

  return {
    schema_version: 'search-v2-embedding-sample-result-1',
    authorization_fingerprint: plan.authorization_fingerprint,
    spend_cap_usd: Number(suppliedSpendCapUsd),
    maximum_estimated_cost_usd: maximumEstimatedCostUsd,
    request_count: requestCount,
    approved_request_count: approvedRequestCount,
    retry_count: 0,
    vectors_stored: false,
    execution_ledger_recorded: true,
    candidates: results,
  };
}

export const EMBEDDING_SAMPLE_EXECUTION_LIMITS = Object.freeze({
  timeout_ms: EXECUTION_TIMEOUT_MS,
});
