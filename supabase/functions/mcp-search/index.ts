import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import { handleGroupedSearchRequest } from '../_shared/search-engine/grouped-search-request.ts';

serve((req) => handleGroupedSearchRequest(req, {
  defaultSource: 'mcp',
  maxQueries: 96,
  concurrency: 8,
}));
