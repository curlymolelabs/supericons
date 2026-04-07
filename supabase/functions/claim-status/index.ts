// Supericons: Claim Status
// Supabase Edge Function (Deno)
// GET /functions/v1/claim-status

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClaimStatus = {
  canClaim: boolean;
  nextAvailable: string | null;
  reason: 'legacy_credit' | 'cooldown_ready' | 'cooldown_wait' | 'subscription_required' | 'all_owned';
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeClaimStatus(raw: unknown): ClaimStatus {
  const data = (raw || {}) as Partial<ClaimStatus>;
  const reason = typeof data.reason === 'string' ? data.reason : 'subscription_required';
  return {
    canClaim: data.canClaim === true,
    nextAvailable: typeof data.nextAvailable === 'string' ? data.nextAvailable : null,
    reason: reason as ClaimStatus['reason'],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';
    if (!token) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Admin client: validate caller token, then execute RPC.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data, error } = await adminClient.rpc('si_get_claim_status', {
      p_user_id: user.id,
    });

    if (error) {
      console.error('si_get_claim_status RPC failed:', error);
      return jsonResponse({ error: 'Claim status unavailable' }, 500);
    }

    return jsonResponse(normalizeClaimStatus(data), 200);
  } catch (err) {
    console.error('Claim status error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
