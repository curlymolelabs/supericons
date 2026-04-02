// Supericons: Stripe Webhook Handler
// Supabase Edge Function (Deno)
// POST /functions/v1/stripe-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

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
            const { data: launchProducts, error: fetchErr } = await supabase
              .from('si_products')
              .select('id')
              .eq('v1_launch', true);

            if (fetchErr) {
              console.error('Failed to fetch V1 products:', fetchErr);
            } else if (launchProducts && launchProducts.length > 0) {
              for (const lp of launchProducts) {
                const { error } = await supabase
                  .from('si_purchases')
                  .upsert({
                    user_id: userId,
                    product_id: lp.id,
                    stripe_session_id: session.id,
                    source: 'launch_edition',
                    purchased_at: new Date().toISOString(),
                  }, { onConflict: 'user_id,product_id' });

                if (error) console.error(`Launch Edition purchase insert error (${lp.id}):`, error);
              }
              console.log(`Launch Edition: ${launchProducts.length} packs granted to user=${userId}`);
            }
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

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        // Look up the subscription to get user_id and plan
        const { data: subRow, error: subErr } = await supabase
          .from('si_subscriptions')
          .select('user_id, plan')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (subErr || !subRow) {
          console.error('invoice.paid: subscription lookup failed:', subErr);
          break;
        }

        const userId = subRow.user_id;
        const plan = subRow.plan || 'pro_monthly';
        const cap = plan === 'pro_annual' ? 5 : 3;

        // Calculate current credit balance: (earned + bonus) - redeemed
        const { data: credits, error: credErr } = await supabase
          .from('si_credits')
          .select('type')
          .eq('user_id', userId);

        if (credErr) {
          console.error('invoice.paid: credit query failed:', credErr);
          break;
        }

        const earned = (credits || []).filter(c => c.type === 'earned' || c.type === 'bonus').length;
        const redeemed = (credits || []).filter(c => c.type === 'redeemed').length;
        const balance = earned - redeemed;

        // Issue 1 earned credit if under cap
        if (balance < cap) {
          const { error: insertErr } = await supabase
            .from('si_credits')
            .insert({
              user_id: userId,
              type: 'earned',
              note: `Monthly renewal (invoice ${invoice.id})`,
            });

          if (insertErr) console.error('Credit insert error:', insertErr);
          else console.log(`Credit issued: user=${userId}, balance=${balance + 1}/${cap}`);
        } else {
          console.log(`Credit cap reached: user=${userId}, balance=${balance}/${cap}`);
        }

        // Annual bonus: 3 credits on first invoice only
        if (plan === 'pro_annual') {
          const existingBonus = (credits || []).filter(c => c.type === 'bonus').length;
          if (existingBonus === 0) {
            const bonusRows = Array.from({ length: 3 }, (_, i) => ({
              user_id: userId,
              type: 'bonus',
              note: `Annual bonus credit ${i + 1}/3`,
            }));

            const { error: bonusErr } = await supabase
              .from('si_credits')
              .insert(bonusRows);

            if (bonusErr) console.error('Annual bonus insert error:', bonusErr);
            else console.log(`Annual bonus: 3 credits issued to user=${userId}`);
          }
        }

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
