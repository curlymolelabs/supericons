import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import { handleGroupedSearchRequest } from '../_shared/search-engine/grouped-search-request.ts';

serve((req) => handleGroupedSearchRequest(req, {
  defaultSource: 'mcp_beta',
  defaultEnvironment: 'preview',
  betaCohort: 'deterministic-v2-roundtrip-measurement',
  timingSink: (record) => console.log(JSON.stringify(record)),
  measurementVariant: 'treatment',
  candidateRpcName: 'si_search_icon_candidates_v2',
  candidateBatchRpcName: 'si_search_icon_candidates_v3',
  hydrateFinalSvg: true,
  maxQueries: 96,
  concurrency: 8,
}));
