import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import {
  handleSharedRecommendationSearchRequest,
} from '../_shared/search-engine/shared-recommendation-search-request.ts';

serve((req) => handleSharedRecommendationSearchRequest(req, {
  defaultSource: 'mcp_beta',
  defaultEnvironment: 'preview',
  betaCohort: 'deterministic-v2-recommendation-measurement',
  timingSink: (record) => console.log(JSON.stringify(record)),
  measurementVariant: 'treatment',
  candidateRpcName: 'si_search_icon_candidates_v4',
  hydrateFinalSvg: true,
  includeTimingInResponse: true,
  maxQueries: 8,
}));
