// Supericons: MCP API Key Validation
// Supabase Edge Function (Deno)
// POST /functions/v1/validate-mcp-key
//
// Validates MCP API keys server-side (bypasses RLS via service_role key).
// Input:  { key_hash: "sha256hex" }
// Output: { authenticated, isPro, purchasedSlugs, userId }
//
// JWT verification: OFF (request carries a key hash, not a user JWT)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { key_hash } = await req.json();

    if (!key_hash || typeof key_hash !== 'string' || key_hash.length !== 64) {
      return new Response(JSON.stringify({
        authenticated: false,
        isPro: false,
        purchasedSlugs: [],
        userId: null,
        error: 'Invalid key hash format',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client (bypasses RLS)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Look up API key
    const { data: keys, error: keyErr } = await admin
      .from('si_api_keys')
      .select('id, user_id')
      .eq('key_hash', key_hash)
      .eq('revoked', false)
      .limit(1);

    if (keyErr || !keys || keys.length === 0) {
      return new Response(JSON.stringify({
        authenticated: false,
        isPro: false,
        purchasedSlugs: [],
        userId: null,
        error: 'Invalid or revoked API key',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id: keyId, user_id } = keys[0];

    // 2. Update last_used timestamp (fire and forget)
    admin
      .from('si_api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyId)
      .then(() => {});

    // 3. Check Pro subscription
    const { data: subs } = await admin
      .from('si_subscriptions')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .limit(1);

    const isPro = subs && subs.length > 0;

    // 4. Check purchased collections
    let purchasedSlugs: string[] = [];
    const { data: purchases } = await admin
      .from('si_purchases')
      .select('si_products(slug)')
      .eq('user_id', user_id);

    if (purchases && purchases.length > 0) {
      purchasedSlugs = purchases
        .map((p: any) => p.si_products?.slug)
        .filter(Boolean);
    }

    return new Response(JSON.stringify({
      authenticated: true,
      isPro,
      purchasedSlugs,
      userId: user_id,
      error: null,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('validate-mcp-key error:', err);
    return new Response(JSON.stringify({
      authenticated: false,
      isPro: false,
      purchasedSlugs: [],
      userId: null,
      error: 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
