interface CandidateRetrievalOptions {
  queryVariants: string[];
  candidateRpcName: string;
  candidateBatchRpcName?: string | null;
  library: string | null;
  limit: number;
}

interface CandidateBatch {
  variant: string;
  index: number;
  data: any[];
  error: any;
}

export async function retrieveCandidateBatches(
  adminClient: any,
  {
    queryVariants,
    candidateRpcName,
    candidateBatchRpcName = null,
    library,
    limit,
  }: CandidateRetrievalOptions,
): Promise<CandidateBatch[]> {
  if (!candidateBatchRpcName) {
    return await Promise.all(
      queryVariants.map((variant, index) =>
        adminClient.rpc(candidateRpcName, {
          p_query: variant,
          p_library: library,
          p_limit: limit,
        }).then((result: any) => ({ ...result, variant, index }))
      ),
    );
  }

  if (queryVariants.length === 0) return [];

  const result = await adminClient.rpc(candidateBatchRpcName, {
    p_queries: queryVariants,
    p_library: library,
    p_limit: limit,
  });

  if (result.error) {
    return queryVariants.map((variant, index) => ({
      variant,
      index,
      data: [],
      error: result.error,
    }));
  }

  const batches = queryVariants.map((variant, index) => ({
    variant,
    index,
    data: [] as any[],
    error: null,
  }));

  for (const row of result.data || []) {
    const index = Number(row?.query_variant_rank);
    const variant = typeof row?.query_variant === 'string' ? row.query_variant : '';
    if (!Number.isInteger(index) || index < 0 || index >= queryVariants.length || queryVariants[index] !== variant) {
      throw new Error('Batched candidate row has invalid query variant provenance.');
    }
    batches[index].data.push(row);
  }

  return batches;
}
