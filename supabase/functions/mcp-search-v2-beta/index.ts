import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import { handleSearchRequest } from '../_shared/search-engine/handle-search-request.ts';

serve((req) => handleSearchRequest(req, {
  defaultSource: 'mcp_beta',
  defaultEnvironment: 'preview',
  betaCohort: 'deterministic-v2-beta',
  timingSink: (record) => console.log(JSON.stringify(record)),
  candidateRpcName: 'si_search_icon_candidates_v2',
  hydrateFinalSvg: true,
}));
