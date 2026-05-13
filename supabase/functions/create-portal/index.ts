// Supericons: Create Stripe Customer Portal Session
// Supabase Edge Function (Deno)
// POST /functions/v1/create-portal

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeLocales = new Set([
  'auto',
  'ar',
  'de',
  'en',
  'es',
  'fr',
  'hi',
  'ja',
  'ko',
  'pt',
  'th',
  'vi',
  'zh',
  'zh-TW',
]);

function normalizeStripeLocale(locale: unknown) {
  if (typeof locale !== 'string') return undefined;
  const value = locale.trim();
  return stripeLocales.has(value) ? value : undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
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

    // Get customer ID from subscription
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: sub, error: subError } = await adminClient
      .from('si_subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (subError) {
      throw subError;
    }

    if (!sub) {
      return new Response(JSON.stringify({ error: 'No subscription record found for this account.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { return_url, locale } = await req.json();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const isExpired = Boolean(sub.current_period_end)
      && new Date(sub.current_period_end) < new Date();
    if (sub.status !== 'active' || isExpired) {
      return new Response(JSON.stringify({ error: 'Your Pro subscription is not active.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let customerId = sub.stripe_customer_id;
    if (!customerId && sub.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
      customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id ?? null;

      if (customerId) {
        const { error: backfillError } = await adminClient
          .from('si_subscriptions')
          .update({ stripe_customer_id: customerId })
          .eq('user_id', user.id);
        if (backfillError) {
          console.error('Portal customer backfill error:', backfillError);
        }
      }
    }

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'Subscription record is missing a Stripe customer ID.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: return_url || `${Deno.env.get('SITE_URL') || 'https://supericons.dev'}`,
      locale: normalizeStripeLocale(locale),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Portal error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
