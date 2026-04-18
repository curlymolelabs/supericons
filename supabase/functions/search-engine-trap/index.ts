import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  await adminClient.from('search_request_audit').insert({
    query_norm: '__trap__',
    source: 'trap',
    result_count: 0,
    status: 'trap_hit',
  });

  return new Response(JSON.stringify({
    engine: 'internal-search',
    canary: 'supericons-search-trap-v1',
    status: 'ignored',
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
});
