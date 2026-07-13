import assert from 'node:assert/strict';

import { retrieveCandidateBatches } from '../supabase/functions/_shared/search-engine/candidate-retrieval.ts';

function candidate(iconId: string, queryVariant: string, queryVariantRank: number) {
  return {
    query_variant: queryVariant,
    query_variant_rank: queryVariantRank,
    icon_id: iconId,
    name: iconId.split(':').at(-1),
    source_library: iconId.split(':')[0],
    style: 'outline',
    icon_type: 'svg',
    lexical_rank: 1,
    registry_rank: 0,
    avoid_rank: 0,
  };
}

const variants = ['cog', 'settings', 'gear'];
const legacyCalls: Array<Record<string, unknown>> = [];
const legacyClient = {
  rpc(name: string, params: Record<string, unknown>) {
    legacyCalls.push({ name, params });
    return Promise.resolve({
      data: [candidate(`lucide:${params.p_query}`, String(params.p_query), legacyCalls.length - 1)],
      error: null,
    });
  },
};

const legacy = await retrieveCandidateBatches(legacyClient, {
  queryVariants: variants,
  candidateRpcName: 'si_search_icon_candidates_v2',
  candidateBatchRpcName: null,
  library: null,
  limit: 40,
});
assert.equal(legacyCalls.length, 3);
assert.deepEqual(legacy.map((batch) => batch.variant), variants);
assert.deepEqual(legacy.map((batch) => batch.index), [0, 1, 2]);

const batchCalls: Array<Record<string, unknown>> = [];
const batchClient = {
  rpc(name: string, params: Record<string, unknown>) {
    batchCalls.push({ name, params });
    return Promise.resolve({
      data: [
        candidate('lucide:cog', 'cog', 0),
        candidate('lucide:settings', 'settings', 1),
        candidate('lucide:gear', 'gear', 2),
      ],
      error: null,
    });
  },
};

const batched = await retrieveCandidateBatches(batchClient, {
  queryVariants: variants,
  candidateRpcName: 'si_search_icon_candidates_v2',
  candidateBatchRpcName: 'si_search_icon_candidates_v3',
  library: 'lucide',
  limit: 40,
});
assert.equal(batchCalls.length, 1, 'Batched retrieval must use one database call.');
assert.deepEqual(batchCalls[0], {
  name: 'si_search_icon_candidates_v3',
  params: {
    p_queries: variants,
    p_library: 'lucide',
    p_limit: 40,
  },
});
assert.deepEqual(batched.map((batch) => batch.variant), variants);
assert.deepEqual(batched.map((batch) => batch.index), [0, 1, 2]);
assert.deepEqual(batched.map((batch) => batch.data.length), [1, 1, 1]);

const malformedClient = {
  rpc() {
    return Promise.resolve({
      data: [candidate('lucide:wrong', 'wrong', 0)],
      error: null,
    });
  },
};
await assert.rejects(
  () => retrieveCandidateBatches(malformedClient, {
    queryVariants: variants,
    candidateRpcName: 'si_search_icon_candidates_v2',
    candidateBatchRpcName: 'si_search_icon_candidates_v3',
    library: null,
    limit: 40,
  }),
  /provenance/i,
);

console.log(JSON.stringify({
  status: 'ok',
  legacy_database_calls: legacyCalls.length,
  batched_database_calls: batchCalls.length,
  variant_order_preserved: true,
  malformed_provenance_rejected: true,
}, null, 2));
