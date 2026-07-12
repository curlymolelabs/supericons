const MAX_SAMPLE_INPUTS_PER_REQUEST = 6;
const UNIT_NORM_TOLERANCE = 0.02;

function normalizeInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error('At least one embedding input is required.');
  }
  if (inputs.length > MAX_SAMPLE_INPUTS_PER_REQUEST) {
    throw new Error(`Sample requests are limited to ${MAX_SAMPLE_INPUTS_PER_REQUEST} inputs.`);
  }
  return inputs.map((value, index) => {
    const text = String(value || '').trim();
    if (!text) throw new Error(`Embedding input ${index + 1} is empty.`);
    return text;
  });
}

function validateCandidate(candidate) {
  if (!candidate?.provider || !candidate?.model || !candidate?.dimensions) {
    throw new Error('A validated embedding candidate is required.');
  }
  return candidate;
}

function inputTypeFor(candidate, inputKind) {
  if (inputKind === 'document') return candidate.document_input_type;
  if (inputKind === 'query') return candidate.query_input_type;
  throw new Error(`Unsupported embedding input kind: ${inputKind}`);
}

export function buildEmbeddingProviderRequest({ candidate, inputs, inputKind } = {}) {
  const selected = validateCandidate(candidate);
  const normalizedInputs = normalizeInputs(inputs);
  const providerInputType = inputTypeFor(selected, inputKind);

  if (selected.provider === 'voyage') {
    return {
      method: 'POST',
      url: 'https://api.voyageai.com/v1/embeddings',
      auth: {
        header: 'Authorization',
        scheme: 'Bearer',
        environment_variable: 'VOYAGE_API_KEY',
      },
      body: {
        input: normalizedInputs,
        model: selected.model,
        input_type: providerInputType,
        output_dimension: selected.dimensions,
        output_dtype: 'float',
        truncation: false,
      },
    };
  }

  if (selected.provider === 'google') {
    return {
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/models/${selected.model}:batchEmbedContents`,
      auth: {
        header: 'x-goog-api-key',
        environment_variable: 'GEMINI_API_KEY',
      },
      body: {
        requests: normalizedInputs.map((text) => ({
          model: `models/${selected.model}`,
          content: { parts: [{ text }] },
          taskType: providerInputType,
          outputDimensionality: selected.dimensions,
        })),
      },
    };
  }

  if (selected.provider === 'openai') {
    return {
      method: 'POST',
      url: 'https://api.openai.com/v1/embeddings',
      auth: {
        header: 'Authorization',
        scheme: 'Bearer',
        environment_variable: 'OPENAI_API_KEY',
      },
      body: {
        input: normalizedInputs,
        model: selected.model,
        dimensions: selected.dimensions,
        encoding_format: 'float',
      },
    };
  }

  throw new Error(`Unsupported embedding provider: ${selected.provider}`);
}

function extractVectors(candidate, response) {
  if (candidate.provider === 'voyage' || candidate.provider === 'openai') {
    const data = Array.isArray(response?.data) ? [...response.data] : null;
    if (!data) throw new Error(`${candidate.provider}: response data is missing.`);
    return data
      .sort((left, right) => Number(left.index || 0) - Number(right.index || 0))
      .map((entry) => entry.embedding);
  }
  if (candidate.provider === 'google') {
    if (!Array.isArray(response?.embeddings)) throw new Error('google: response embeddings are missing.');
    return response.embeddings.map((entry) => entry.values);
  }
  throw new Error(`Unsupported embedding provider: ${candidate.provider}`);
}

function vectorNorm(vector) {
  return Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0));
}

export function readValidatedEmbeddingProviderResponse({ candidate, response, expectedCount } = {}) {
  const selected = validateCandidate(candidate);
  const vectors = extractVectors(selected, response);
  if (vectors.length !== expectedCount) {
    throw new Error(`${selected.provider}: expected ${expectedCount} vectors, received ${vectors.length}.`);
  }

  const norms = vectors.map((vector, vectorIndex) => {
    if (!Array.isArray(vector) || vector.length !== selected.dimensions) {
      throw new Error(`${selected.provider}: vector ${vectorIndex + 1} has the wrong dimensions.`);
    }
    if (vector.some((value) => !Number.isFinite(value))) {
      throw new Error(`${selected.provider}: vector ${vectorIndex + 1} contains a non-finite value.`);
    }
    const norm = vectorNorm(vector);
    if (Math.abs(norm - 1) > UNIT_NORM_TOLERANCE) {
      throw new Error(`${selected.provider}: vector ${vectorIndex + 1} failed the unit norm check.`);
    }
    return norm;
  });

  return {
    vectors,
    summary: {
      provider: selected.provider,
      model: selected.model,
      dimensions: selected.dimensions,
      vector_count: vectors.length,
      unit_norm_tolerance: UNIT_NORM_TOLERANCE,
      norms,
      usage: response?.usage || response?.usageMetadata || null,
    },
  };
}

export function validateEmbeddingProviderResponse(options = {}) {
  return readValidatedEmbeddingProviderResponse(options).summary;
}

export const EMBEDDING_SAMPLE_LIMITS = Object.freeze({
  maximum_inputs_per_request: MAX_SAMPLE_INPUTS_PER_REQUEST,
  unit_norm_tolerance: UNIT_NORM_TOLERANCE,
});
