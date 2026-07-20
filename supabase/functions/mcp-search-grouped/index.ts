import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import {
  handleSharedRecommendationSearchRequest,
} from '../_shared/search-engine/shared-recommendation-search-request.ts';

serve((req) => handleSharedRecommendationSearchRequest(req, {
  defaultSource: 'mcp',
  defaultEnvironment: null,
  candidateRpcName: 'si_search_icon_candidates_v4',
  hydrateFinalSvg: true,
  includeTimingInResponse: true,
  maxQueries: 40,
}));
