interface LogicalCandidateQuery {
  queryVariants: string[];
}

interface RecommendationCandidateRetrievalOptions {
  logicalQueries: LogicalCandidateQuery[];
  candidateRpcName?: string;
  library: string | null;
  limit: number;
}

export interface LogicalCandidateBatch {
  variant: string;
  index: number;
  data: any[];
  error: any;
}

export async function retrieveRecommendationCandidateBatches(
  adminClient: any,
  {
    logicalQueries,
    candidateRpcName = 'si_search_icon_candidates_v4',
    library,
    limit,
  }: RecommendationCandidateRetrievalOptions,
): Promise<LogicalCandidateBatch[][]> {
  const queryGroups = logicalQueries.flatMap((logicalQuery, logicalQueryIndex) => (
    logicalQuery.queryVariants.map((queryVariant, queryVariantRank) => ({
      logical_query_index: logicalQueryIndex,
      query_variant: queryVariant,
      query_variant_rank: queryVariantRank,
    }))
  ));

  const batches = logicalQueries.map((logicalQuery) => (
    logicalQuery.queryVariants.map((variant, index) => ({
      variant,
      index,
      data: [] as any[],
      error: null,
    }))
  ));
  if (queryGroups.length === 0) return batches;

  const result = await adminClient.rpc(candidateRpcName, {
    p_query_groups: queryGroups,
    p_library: library,
    p_limit: limit,
  });

  if (result.error) {
    return batches.map((logicalBatches) => logicalBatches.map((batch) => ({
      ...batch,
      error: result.error,
    })));
  }

  for (const row of result.data || []) {
    const logicalQueryIndex = Number(row?.logical_query_index);
    const queryVariantRank = Number(row?.query_variant_rank);
    const queryVariant = typeof row?.query_variant === 'string' ? row.query_variant : '';
    const expectedVariants = logicalQueries[logicalQueryIndex]?.queryVariants;
    if (
      !Number.isInteger(logicalQueryIndex)
      || logicalQueryIndex < 0
      || logicalQueryIndex >= logicalQueries.length
      || !Number.isInteger(queryVariantRank)
      || queryVariantRank < 0
      || queryVariantRank >= expectedVariants.length
      || expectedVariants[queryVariantRank] !== queryVariant
    ) {
      throw new Error('Shared recommendation candidate row has invalid query provenance.');
    }
    batches[logicalQueryIndex][queryVariantRank].data.push(row);
  }

  return batches;
}
