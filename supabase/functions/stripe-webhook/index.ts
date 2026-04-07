// Supericons: Stripe Webhook Handler
// Supabase Edge Function (Deno)
// POST /functions/v1/stripe-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

async function grantLaunchProducts(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  source: string,
  stripeReference: string | null,
) {
  const { data: launchProducts, error: fetchErr } = await supabase
    .from('si_products')
    .select('id')
    .eq('v1_launch', true);

  if (fetchErr) {
    console.error('Failed to fetch V1 products:', fetchErr);
    return;
  }

  if (!launchProducts || launchProducts.length === 0) return;

  for (const product of launchProducts) {
    const { error } = await supabase
      .from('si_purchases')
      .upsert({
        user_id: userId,
        product_id: product.id,
        stripe_session_id: stripeReference,
        source,
        purchased_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_id' });

    if (error) {
      console.error(`${source} purchase insert error (${product.id}):`, error);
    }
  }

  console.log(`${source}: ${launchProducts.length} packs granted to user=${userId}`);
}

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    });

    const body = await req.text();
    const sig = req.headers.get('stripe-signature')!;
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

    // Verify webhook signature (use async variant for Deno/Web Crypto API)
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    // Admin client for writes (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const productId = session.metadata?.product_id;

        if (userId && productId && session.mode === 'payment') {
          // Launch Edition: bulk-insert all V1 packs
          if (productId === 'launch_edition') {
            await grantLaunchProducts(supabase, userId, 'launch_edition', session.id);
          } else {
            // Single pack purchase
            const { error } = await supabase
              .from('si_purchases')
              .upsert({
                user_id: userId,
                product_id: productId,
                stripe_session_id: session.id,
                source: 'purchase',
                purchased_at: new Date().toISOString(),
              }, { onConflict: 'user_id,product_id' });

            if (error) console.error('Purchase insert error:', error);
            else console.log(`Purchase recorded: user=${userId}, product=${productId}`);
          }
        }

        if (userId && session.mode === 'subscription') {
          // Handle subscription creation
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;

          // Determine plan type from price
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id || '';
          const plan = sub.items.data[0]?.price?.recurring?.interval === 'year'
            ? 'pro_annual' : 'pro_monthly';

          const { error } = await supabase
            .from('si_subscriptions')
            .upsert({
              user_id: userId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: 'active',
              plan,
              current_period_end: null, // Updated by subscription.updated event
            }, { onConflict: 'user_id' });

          if (error) console.error('Subscription insert error:', error);
          else console.log(`Subscription created: user=${userId}, plan=${plan}`);

          if (plan === 'pro_annual') {
            await grantLaunchProducts(supabase, userId, 'pro_annual_grant', subscriptionId);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const plan = subscription.items.data[0]?.price?.recurring?.interval === 'year'
          ? 'pro_annual' : 'pro_monthly';
        const { error } = await supabase
          .from('si_subscriptions')
          .update({
            status: subscription.status,
            plan,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) console.error('Subscription update error:', error);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from('si_subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        if (error) console.error('Subscription cancel error:', error);
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
