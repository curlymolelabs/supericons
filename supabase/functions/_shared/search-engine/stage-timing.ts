export type SearchTimingStage =
  | 'request_parse'
  | 'rate_limit'
  | 'account_resolution'
  | 'candidate_search'
  | 'private_metadata'
  | 'reranking'
  | 'public_semantic'
  | 'final_svg'
  | 'audit_write';

export interface SearchStageTimingRecord {
  schema_version: 2;
  event: 'search_stage_timing';
  measurement_variant: 'control' | 'treatment' | 'unspecified';
  worker_state: 'first_request' | 'reused_worker';
  worker_request_ordinal: number;
  module_age_ms_at_handler_entry: number;
  outcome: 'results' | 'zero' | 'error' | 'empty_query';
  total_ms: number;
  stages_ms: Partial<Record<SearchTimingStage, number>>;
  counts: {
    query_variants: number;
    candidate_rows: number;
    unique_candidates: number;
    final_results: number;
  };
  approximate_sizes: {
    candidate_svg_characters: number;
    candidate_payload_characters: number;
    response_json_characters: number;
  };
}

export type SearchStageTimingSink = (record: SearchStageTimingRecord) => void;
export type SearchTimingVariant = 'control' | 'treatment' | 'unspecified';

let workerRequestCount = 0;
const moduleEvaluatedAt = performance.now();

function elapsedMs(startedAt: number, now: () => number) {
  return Number(Math.max(0, now() - startedAt).toFixed(3));
}

function approximatePrimitiveJsonCharacters(value: unknown) {
  if (value === null || value === undefined) return 4;
  if (typeof value === 'string') return value.length + 2;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).length;
  return 2;
}

export function estimateCandidatePayloadCharacters(rows: Array<Record<string, unknown>>) {
  return rows.reduce((total, row) => {
    const entries = Object.entries(row);
    const entryCharacters = entries.reduce((rowTotal, [key, value]) => (
      rowTotal + key.length + 3 + approximatePrimitiveJsonCharacters(value)
    ), 0);
    return total + 2 + entryCharacters + Math.max(0, entries.length - 1);
  }, 2 + Math.max(0, rows.length - 1));
}

export function createSearchStageTimer(
  sink: SearchStageTimingSink | null = null,
  now: () => number = () => performance.now(),
  measurementVariant: SearchTimingVariant = 'unspecified',
) {
  const enabled = typeof sink === 'function';
  const startedAt = now();
  const workerState = workerRequestCount === 0 ? 'first_request' : 'reused_worker';
  workerRequestCount += 1;
  const workerRequestOrdinal = workerRequestCount;
  const moduleAgeMsAtHandlerEntry = Number(
    Math.max(0, performance.now() - moduleEvaluatedAt).toFixed(3),
  );
  const stages: Partial<Record<SearchTimingStage, number>> = {};
  const counts = {
    query_variants: 0,
    candidate_rows: 0,
    unique_candidates: 0,
    final_results: 0,
  };
  const approximateSizes = {
    candidate_svg_characters: 0,
    candidate_payload_characters: 0,
    response_json_characters: 0,
  };

  async function measure<T>(stage: SearchTimingStage, operation: () => Promise<T>): Promise<T> {
    if (!enabled) return await operation();
    const stageStartedAt = now();
    try {
      return await operation();
    } finally {
      stages[stage] = elapsedMs(stageStartedAt, now);
    }
  }

  function measureSync<T>(stage: SearchTimingStage, operation: () => T): T {
    if (!enabled) return operation();
    const stageStartedAt = now();
    try {
      return operation();
    } finally {
      stages[stage] = elapsedMs(stageStartedAt, now);
    }
  }

  function addCounts(values: Partial<typeof counts>) {
    if (!enabled) return;
    for (const key of Object.keys(counts) as Array<keyof typeof counts>) {
      const value = values[key];
      if (typeof value === 'number' && Number.isFinite(value)) counts[key] = Math.max(0, Math.round(value));
    }
  }

  function addApproximateSizes(values: Partial<typeof approximateSizes>) {
    if (!enabled) return;
    for (const key of Object.keys(approximateSizes) as Array<keyof typeof approximateSizes>) {
      const value = values[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        approximateSizes[key] = Math.max(0, Math.round(value));
      }
    }
  }

  function finish(outcome: SearchStageTimingRecord['outcome']) {
    if (!enabled || !sink) return;
    const record: SearchStageTimingRecord = {
      schema_version: 2,
      event: 'search_stage_timing',
      measurement_variant: measurementVariant,
      worker_state: workerState,
      worker_request_ordinal: workerRequestOrdinal,
      module_age_ms_at_handler_entry: moduleAgeMsAtHandlerEntry,
      outcome,
      total_ms: elapsedMs(startedAt, now),
      stages_ms: { ...stages },
      counts: { ...counts },
      approximate_sizes: { ...approximateSizes },
    };

    try {
      sink(record);
    } catch {
      // Timing output must never change the search response.
    }
  }

  return {
    enabled,
    measure,
    measureSync,
    addCounts,
    addApproximateSizes,
    finish,
  };
}
