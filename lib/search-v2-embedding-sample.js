import { createHash } from 'node:crypto';

import { validateEmbeddingCandidates } from './search-v2-embedding-plan.js';
import { buildEmbeddingProviderRequest } from './search-v2-embedding-provider.js';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateSampleSet(sampleSet) {
  if (sampleSet?.schema_version !== 'search-v2-embedding-sample-set-1') {
    throw new Error('Unsupported embedding sample-set schema.');
  }
  const documents = Array.isArray(sampleSet.documents) ? sampleSet.documents : [];
  const queries = Array.isArray(sampleSet.queries) ? sampleSet.queries : [];
  const maximumInputs = Number(sampleSet.maximum_total_inputs_per_candidate);
  if (documents.length === 0 || queries.length === 0) throw new Error('Sample documents and queries are required.');
  if (documents.length + queries.length > maximumInputs) throw new Error('Sample set exceeds its input limit.');

  const ids = new Set();
  for (const entry of [...documents, ...queries]) {
    if (!entry?.id || !entry?.locale || !String(entry.text || '').trim()) {
      throw new Error('Every sample entry requires an ID, locale, and text.');
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate sample ID: ${entry.id}`);
    ids.add(entry.id);
  }
  const documentIds = new Set(documents.map((entry) => entry.id));
  for (const query of queries) {
    if (!documentIds.has(query.expected_document_id)) {
      throw new Error(`${query.id}: expected document is missing.`);
    }
  }
  return { documents, queries, maximumInputs };
}

export function buildEmbeddingSamplePlan({ sampleSet, candidates, candidateIds = [] } = {}) {
  const sample = validateSampleSet(sampleSet);
  const validatedCandidates = validateEmbeddingCandidates(candidates);
  const requestedIds = new Set((candidateIds || []).map((value) => String(value).trim()).filter(Boolean));
  const selectedCandidates = requestedIds.size > 0
    ? validatedCandidates.filter((candidate) => requestedIds.has(candidate.id))
    : validatedCandidates.filter((candidate) => !candidate.optional);
  const missingIds = [...requestedIds].filter((id) => !validatedCandidates.some((candidate) => candidate.id === id));
  if (missingIds.length > 0) throw new Error(`Unknown embedding candidates: ${missingIds.join(', ')}`);
  if (selectedCandidates.length === 0) throw new Error('At least one embedding candidate is required.');

  const candidatePlans = selectedCandidates.map((candidate) => ({
    id: candidate.id,
    provider: candidate.provider,
    model: candidate.model,
    dimensions: candidate.dimensions,
    request_count: 2,
    document_request: buildEmbeddingProviderRequest({
      candidate,
      inputs: sample.documents.map((entry) => entry.text),
      inputKind: 'document',
    }),
    query_request: buildEmbeddingProviderRequest({
      candidate,
      inputs: sample.queries.map((entry) => entry.text),
      inputKind: 'query',
    }),
  }));

  const authorizationMaterial = {
    sample_schema_version: sampleSet.schema_version,
    maximum_total_inputs_per_candidate: sample.maximumInputs,
    documents: sample.documents,
    queries: sample.queries,
    candidates: candidatePlans,
  };
  const authorizationFingerprint = createHash('sha256')
    .update(stableJson(authorizationMaterial))
    .digest('hex');

  return {
    schema_version: 'search-v2-embedding-sample-plan-1',
    mode: 'sample-plan',
    network_allowed: false,
    writes_allowed: false,
    provider_execution_implemented: false,
    authorization_required_for_execution: true,
    authorization_fingerprint: authorizationFingerprint,
    maximum_total_inputs_per_candidate: sample.maximumInputs,
    document_count: sample.documents.length,
    query_count: sample.queries.length,
    total_inputs_per_candidate: sample.documents.length + sample.queries.length,
    candidate_count: candidatePlans.length,
    expected_pairs: sample.queries.map((query) => ({
      query_id: query.id,
      locale: query.locale,
      expected_document_id: query.expected_document_id,
    })),
    candidates: candidatePlans,
  };
}
