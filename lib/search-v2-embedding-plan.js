import { createHash } from 'node:crypto';

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

export function normalizeEmbeddingRunnerMode(value) {
  const mode = String(value || 'plan').trim().toLowerCase();
  if (mode === 'plan' || mode === 'dry-run') return mode;
  throw new Error('Only plan and dry-run modes are implemented. Networked embedding modes are blocked.');
}

export function validateEmbeddingCandidates(input) {
  const source = Array.isArray(input) ? input : input?.candidates;
  if (!Array.isArray(source) || source.length === 0) throw new Error('Embedding candidates are required.');
  const seen = new Set();

  return source.map((candidate) => {
    const id = String(candidate?.id || '').trim();
    const provider = String(candidate?.provider || '').trim();
    const model = String(candidate?.model || '').trim();
    const dimensions = Number(candidate?.dimensions);
    if (!id || !/^[a-z0-9-]+$/.test(id)) throw new Error(`Invalid embedding candidate ID: ${id || '(empty)'}`);
    if (seen.has(id)) throw new Error(`Duplicate embedding candidate ID: ${id}`);
    if (!provider || !model) throw new Error(`${id}: provider and model are required`);
    if (!Number.isInteger(dimensions) || dimensions < 1 || dimensions > 2000) {
      throw new Error(`${id}: dimensions must be an integer from 1 to 2000`);
    }
    if (!candidate.document_input_type || !candidate.query_input_type) {
      throw new Error(`${id}: document and query input types are required`);
    }
    seen.add(id);
    return {
      id,
      provider,
      model,
      dimensions,
      document_input_type: String(candidate.document_input_type),
      query_input_type: String(candidate.query_input_type),
      purpose: String(candidate.purpose || ''),
      optional: Boolean(candidate.optional),
    };
  });
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents) || documents.length === 0) throw new Error('Semantic documents are required.');
  const seen = new Set();
  return documents.map((document) => {
    const documentId = String(document?.document_id || '').trim();
    const contentHash = String(document?.content_hash || '').trim();
    if (!documentId || !contentHash) throw new Error('Every semantic document needs document_id and content_hash.');
    if (seen.has(documentId)) throw new Error(`Duplicate semantic document ID: ${documentId}`);
    seen.add(documentId);
    return {
      document_id: documentId,
      document_type: String(document.document_type || 'unknown'),
      locale: String(document.locale || 'unknown'),
      content: String(document.content || ''),
      content_hash: contentHash,
    };
  }).sort((left, right) => left.document_id.localeCompare(right.document_id));
}

function fingerprintDocuments(documents) {
  const hash = createHash('sha256');
  for (const document of documents) hash.update(`${document.document_id}\n${document.content_hash}\n`);
  return hash.digest('hex');
}

export function buildEmbeddingWorkPlan({
  documents,
  candidates,
  mode = 'plan',
  candidateIds = [],
  batchSize = 100,
} = {}) {
  const normalizedMode = normalizeEmbeddingRunnerMode(mode);
  const normalizedDocuments = normalizeDocuments(documents);
  const validatedCandidates = validateEmbeddingCandidates(candidates);
  const requestedIds = new Set((candidateIds || []).map((value) => String(value).trim()).filter(Boolean));
  const selectedCandidates = requestedIds.size === 0
    ? validatedCandidates
    : validatedCandidates.filter((candidate) => requestedIds.has(candidate.id));
  const missingIds = [...requestedIds].filter((id) => !validatedCandidates.some((candidate) => candidate.id === id));
  if (missingIds.length > 0) throw new Error(`Unknown embedding candidates: ${missingIds.join(', ')}`);
  if (selectedCandidates.length === 0) throw new Error('At least one embedding candidate must be selected.');

  const normalizedBatchSize = positiveInteger(batchSize, 100);
  const fingerprint = fingerprintDocuments(normalizedDocuments);
  const totalCharacters = normalizedDocuments.reduce((sum, document) => sum + document.content.length, 0);
  const candidatePlans = selectedCandidates.map((candidate) => {
    const entry = {
      ...candidate,
      embedding_version: `${candidate.id}-${fingerprint.slice(0, 12)}`,
      document_count: normalizedDocuments.length,
      batch_size: normalizedBatchSize,
    };
    if (normalizedMode === 'dry-run') {
      entry.batch_count = Math.ceil(normalizedDocuments.length / normalizedBatchSize);
      entry.sample_document_ids = normalizedDocuments.slice(0, 5).map((document) => document.document_id);
    }
    return entry;
  });

  return {
    schema_version: 'search-v2-embedding-work-plan-1',
    mode: normalizedMode,
    network_allowed: false,
    writes_allowed: false,
    document_count: normalizedDocuments.length,
    candidate_count: candidatePlans.length,
    total_characters: totalCharacters,
    total_utf8_bytes: normalizedDocuments.reduce((sum, document) => sum + Buffer.byteLength(document.content, 'utf8'), 0),
    documents_by_type: countBy(normalizedDocuments.map((document) => document.document_type)),
    documents_by_locale: countBy(normalizedDocuments.map((document) => document.locale)),
    content_fingerprint: fingerprint,
    candidates: candidatePlans,
  };
}
