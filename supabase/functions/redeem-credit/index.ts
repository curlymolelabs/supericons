// Supericons: Redeem Credit for Collection
// Supabase Edge Function (Deno)
// POST /functions/v1/redeem-credit

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth (user-context client)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: 'Missing product_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client for writes (bypasses RLS)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Verify active Pro subscription
    const { data: sub, error: subErr } = await adminClient
      .from('si_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: 'Active Pro subscription required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check if already owned
    const { data: existing } = await adminClient
      .from('si_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Collection already owned' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Calculate credit balance
    const { data: credits, error: credErr } = await adminClient
      .from('si_credits')
      .select('type')
      .eq('user_id', user.id);

    if (credErr) {
      return new Response(JSON.stringify({ error: 'Failed to check credits' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const earned = (credits || []).filter((c: { type: string }) => c.type === 'earned' || c.type === 'bonus').length;
    const redeemed = (credits || []).filter((c: { type: string }) => c.type === 'redeemed').length;
    const balance = earned - redeemed;

    if (balance <= 0) {
      return new Response(JSON.stringify({ error: 'No credits available' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Get product name for the note
    const { data: product } = await adminClient
      .from('si_products')
      .select('name')
      .eq('id', product_id)
      .single();

    // 5. Insert redeemed credit
    const { error: creditErr } = await adminClient
      .from('si_credits')
      .insert({
        user_id: user.id,
        type: 'redeemed',
        product_id,
        note: `Redeemed: ${product?.name || 'Unknown collection'}`,
      });

    if (creditErr) {
      return new Response(JSON.stringify({ error: 'Failed to redeem credit' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Insert purchase record
    const { error: purchaseErr } = await adminClient
      .from('si_purchases')
      .insert({
        user_id: user.id,
        product_id,
        stripe_session_id: 'credit_redeem',
        source: 'credit',
        purchased_at: new Date().toISOString(),
      });

    if (purchaseErr) {
      console.error('Purchase insert after credit redeem failed:', purchaseErr);
      return new Response(JSON.stringify({ error: 'Credit used but purchase record failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      remaining_credits: balance - 1,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Redeem credit error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
