// Supericons: Redeem Credit for Collection
// Supabase Edge Function (Deno)
// POST /functions/v1/redeem-credit

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ClaimPackResult = {
  success?: boolean;
  canClaim?: boolean;
  reason?: string;
  nextAvailable?: string | null;
  usedLegacyCredit?: boolean;
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function mapClaimFailureStatus(reason: string): number {
  if (reason === 'subscription_required') return 403;
  if (reason === 'already_owned' || reason === 'all_owned' || reason === 'cooldown_wait') return 409;
  if (reason === 'invalid_request' || reason === 'product_not_found' || reason === 'product_not_active' || reason === 'product_not_claimable') {
    return 400;
  }
  return 500;
}

function mapClaimFailureMessage(reason: string): string {
  switch (reason) {
    case 'subscription_required':
      return 'Active Pro subscription required';
    case 'already_owned':
      return 'Collection already owned';
    case 'all_owned':
      return 'All eligible collections are already owned';
    case 'cooldown_wait':
      return 'Claim is currently on cooldown';
    case 'product_not_found':
      return 'Collection not found';
    case 'product_not_active':
      return 'Collection is not currently claimable';
    case 'product_not_claimable':
      return 'Collection is not eligible for Pro claims';
    case 'invalid_request':
      return 'Missing or invalid request payload';
    default:
      return 'Claim failed';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : '';
    if (!token) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // Admin client for token verification + RPC execution.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const product_id = body?.product_id;
    if (!product_id) {
      return jsonResponse({ error: 'Missing product_id' }, 400);
    }

    const { data, error: claimErr } = await adminClient.rpc('si_claim_pack', {
      p_user_id: user.id,
      p_product_id: product_id,
    });

    if (claimErr) {
      console.error('si_claim_pack RPC failed:', claimErr);
      return jsonResponse({ error: 'Claim RPC failed' }, 500);
    }

    const result = (data || {}) as ClaimPackResult;
    if (result.success) {
      return jsonResponse({ success: true, reason: 'claimed', usedLegacyCredit: result.usedLegacyCredit === true }, 200);
    }

    const reason = result.reason || 'claim_failed';
    const status = mapClaimFailureStatus(reason);
    const message = mapClaimFailureMessage(reason);
    return jsonResponse({
      error: message,
      reason,
      nextAvailable: result.nextAvailable ?? null,
    }, status);

  } catch (err) {
    console.error('Redeem credit error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
