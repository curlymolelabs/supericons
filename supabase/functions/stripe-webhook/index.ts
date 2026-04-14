// Supericons: Stripe Webhook Handler
// Supabase Edge Function (Deno)
// POST /functions/v1/stripe-webhook

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

type LaunchGrantResult = {
  totalCount: number;
  grantedCount: number;
  hadErrors: boolean;
};

type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

type BillingNotificationKind = 'subscription_cancel_scheduled' | 'subscription_ended';
type SupabaseAdminClient = any;

const DEFAULT_APP_BASE_URL = 'https://supericons.dev';
const DEFAULT_SUPPORT_EMAIL = 'hello@supericons.dev';
const DEFAULT_FROM_EMAIL = 'Supericons <receipts@auth.supericons.dev>';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getAppBaseUrl() {
  return (Deno.env.get('APP_BASE_URL') || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return null;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${(currency || 'usd').toUpperCase()}`;
  }
}

function toIsoFromUnixSeconds(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function getSubscriptionPeriodEndIso(subscription: Stripe.Subscription) {
  const itemPeriodEnds = Array.isArray(subscription.items?.data)
    ? subscription.items.data
      .map((item: Stripe.SubscriptionItem) => (item as Stripe.SubscriptionItem & { current_period_end?: number | null }).current_period_end)
      .filter((value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value))
    : [];

  const subscriptionPeriodEnd = typeof subscription.current_period_end === 'number'
    && Number.isFinite(subscription.current_period_end)
    ? subscription.current_period_end
    : null;

  const periodEnd = itemPeriodEnds.length > 0
    ? Math.min(...itemPeriodEnds)
    : subscriptionPeriodEnd;

  return toIsoFromUnixSeconds(periodEnd);
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
}

function buildBillingStatusEmail({
  recipientEmail,
  subject,
  kicker,
  heading,
  intro,
  details,
  ctaLabel,
  ctaUrl,
}: {
  recipientEmail: string;
  subject: string;
  kicker: string;
  heading: string;
  intro: string;
  details: string[];
  ctaLabel: string;
  ctaUrl: string;
}): EmailContent {
  const escapedEmail = escapeHtml(recipientEmail);
  const escapedHeading = escapeHtml(heading);
  const escapedIntro = escapeHtml(intro);
  const text = [
    heading,
    '',
    intro,
    ...details.map((detail) => detail.trim()),
    '',
    `${ctaLabel}: ${ctaUrl}`,
    `Questions? Reply to ${DEFAULT_SUPPORT_EMAIL}`,
  ].filter(Boolean).join('\n');

  const detailMarkup = details
    .filter(Boolean)
    .map((detail) => `<p style="margin:0 0 12px;color:#cccaca;font-size:14px;line-height:1.6;">${escapeHtml(detail)}</p>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;">
  <div style="padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-align:center;">
    <div style="max-width:480px;margin:0 auto;">
      <a href="${escapeHtml(getAppBaseUrl())}" style="display:inline-flex;align-items:center;justify-content:center;gap:2px;margin-bottom:32px;text-decoration:none;">
        <img src="${escapeHtml(getAppBaseUrl())}/logo_email_header.png" alt="Supericons" height="34" style="display:block;border:0;outline:none;text-decoration:none;" />
      </a>

      <div style="background-color:#131313;border:1px solid #262626;border-radius:16px;padding:48px 40px;box-shadow:0 10px 30px rgba(0,0,0,0.4);text-align:left;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FF4F00;margin-bottom:12px;text-align:center;">${escapeHtml(kicker)}</div>
        <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;text-align:center;">${escapedHeading}</h1>
        <p style="margin:0 0 24px;color:#cccaca;font-size:15px;line-height:1.6;text-align:center;">${escapedIntro}</p>

        <div style="background:#171717;border:1px solid #262626;border-radius:14px;padding:18px 18px 16px;margin-bottom:24px;">
          ${detailMarkup}
        </div>

        <div style="text-align:center;">
          <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background-color:#FF4F00;color:#000000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
        </div>
      </div>

      <div style="margin-top:28px;color:#666;font-size:12px;line-height:1.6;">
        This email was sent to ${escapedEmail}.<br />
        Questions? Reply to <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="color:#FF8A50;text-decoration:none;">${DEFAULT_SUPPORT_EMAIL}</a>.<br />
        &copy; 2026 Curly Mole Labs
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    text,
    html,
  };
}

function buildCancellationScheduledEmail({
  recipientEmail,
  currentPeriodEnd,
  dashboardUrl,
}: {
  recipientEmail: string;
  currentPeriodEnd: string | null;
  dashboardUrl: string;
}): EmailContent {
  const periodEndLabel = formatDateLabel(currentPeriodEnd);
  const timelineCopy = periodEndLabel
    ? `Your subscription stays active until ${periodEndLabel}. After that, billing stops and your account returns to the free experience.`
    : 'Your subscription stays active until the end of your current billing period. After that, billing stops and your account returns to the free experience.';

  return buildBillingStatusEmail({
    recipientEmail,
    subject: 'Your Supericons Pro cancellation is scheduled',
    kicker: 'Supericons billing',
    heading: 'Cancellation confirmed',
    intro: 'Your Supericons Pro cancellation is scheduled.',
    details: [
      timelineCopy,
      'You do not need to do anything else right now.',
    ],
    ctaLabel: 'Manage account',
    ctaUrl: dashboardUrl,
  });
}

function buildSubscriptionEndedEmail({
  recipientEmail,
  dashboardUrl,
}: {
  recipientEmail: string;
  dashboardUrl: string;
}): EmailContent {
  return buildBillingStatusEmail({
    recipientEmail,
    subject: 'Your Supericons Pro subscription has ended',
    kicker: 'Supericons billing',
    heading: 'Subscription ended',
    intro: 'Your Supericons Pro subscription has ended.',
    details: [
      'Your account is still available, and free icons remain accessible.',
      'You can resubscribe anytime if you want Pro tools again.',
    ],
    ctaLabel: 'Open Supericons',
    ctaUrl: dashboardUrl,
  });
}

function buildPurchaseEmail({
  recipientEmail,
  productName,
  productDescription,
  amountLabel,
  mode,
  downloadsUrl,
  dashboardUrl,
}: {
  recipientEmail: string;
  productName: string;
  productDescription?: string | null;
  amountLabel?: string | null;
  mode: 'payment' | 'subscription';
  downloadsUrl: string;
  dashboardUrl: string;
}): EmailContent {
  const escapedEmail = escapeHtml(recipientEmail);
  const escapedProductName = escapeHtml(productName);
  const escapedDescription = escapeHtml(productDescription || '');
  const amountLine = amountLabel ? `<p style="margin: 0 0 12px; color: #cccaca; font-size: 14px; line-height: 1.6;"><strong style="color:#ffffff;">Amount:</strong> ${escapeHtml(amountLabel)}</p>` : '';
  const appLabel = mode === 'subscription' ? 'Open Supericons' : 'Open My Collection';
  const appUrl = mode === 'subscription' ? dashboardUrl : downloadsUrl;
  const heading = mode === 'subscription' ? 'Your Pro access is ready' : 'Your purchase is ready';
  const intro = mode === 'subscription'
    ? `Your ${escapedProductName} plan is now active on your Supericons account.`
    : `${escapedProductName} has been added to your Supericons account.`;
  const nextStep = mode === 'subscription'
    ? 'Open Supericons to manage your account, access Pro tools, and continue where you left off.'
    : 'Open My Collection to access your purchase, downloads, and future updates.';

  const text = [
    heading,
    '',
    `${productName}`,
    productDescription || '',
    amountLabel ? `Amount: ${amountLabel}` : '',
    intro.replace(/<[^>]+>/g, ''),
    nextStep,
    '',
    `${appLabel}: ${appUrl}`,
    `Questions? Reply to ${DEFAULT_SUPPORT_EMAIL}`,
  ].filter(Boolean).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0e0e0e;">
  <div style="padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-align:center;">
    <div style="max-width:480px;margin:0 auto;">
      <a href="${escapeHtml(getAppBaseUrl())}" style="display:inline-flex;align-items:center;justify-content:center;gap:2px;margin-bottom:32px;text-decoration:none;">
        <img src="${escapeHtml(getAppBaseUrl())}/logo_email_header.png" alt="Supericons" height="34" style="display:block;border:0;outline:none;text-decoration:none;" />
      </a>

      <div style="background-color:#131313;border:1px solid #262626;border-radius:16px;padding:48px 40px;box-shadow:0 10px 30px rgba(0,0,0,0.4);text-align:left;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FF4F00;margin-bottom:12px;text-align:center;">Supericons purchase</div>
        <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;text-align:center;">${heading}</h1>
        <p style="margin:0 0 24px;color:#cccaca;font-size:15px;line-height:1.6;text-align:center;">${intro}</p>

        <div style="background:#171717;border:1px solid #262626;border-radius:14px;padding:18px 18px 16px;margin-bottom:24px;">
          <p style="margin:0 0 8px;color:#ffffff;font-size:16px;font-weight:700;">${escapedProductName}</p>
          ${escapedDescription ? `<p style="margin:0 0 12px;color:#9c9c9c;font-size:14px;line-height:1.6;">${escapedDescription}</p>` : ''}
          ${amountLine}
          <p style="margin:0;color:#cccaca;font-size:14px;line-height:1.6;">${nextStep}</p>
        </div>

        <div style="text-align:center;">
          <a href="${escapeHtml(appUrl)}" style="display:inline-block;background-color:#FF4F00;color:#000000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px;">${appLabel}</a>
        </div>
      </div>

      <div style="margin-top:28px;color:#666;font-size:12px;line-height:1.6;">
        This email was sent to ${escapedEmail}.<br />
        Questions? Reply to <a href="mailto:${DEFAULT_SUPPORT_EMAIL}" style="color:#FF8A50;text-decoration:none;">${DEFAULT_SUPPORT_EMAIL}</a>.<br />
        &copy; 2026 Curly Mole Labs
      </div>
    </div>
  </div>
</body>
</html>`;

  return {
    subject: mode === 'subscription'
      ? `Your ${productName} is active`
      : `Your ${productName} purchase is ready`,
    text,
    html,
  };
}

async function resolveUserEmail(
  supabase: SupabaseAdminClient,
  userId: string,
  session: Stripe.Checkout.Session,
) {
  const sessionEmail = session.customer_details?.email || session.customer_email || '';
  if (sessionEmail) return sessionEmail;

  return resolveAuthUserEmail(supabase, userId);
}

async function resolveAuthUserEmail(
  supabase: SupabaseAdminClient,
  userId: string,
) {
  if (!userId) return '';

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.error('Failed to resolve purchase email via auth admin:', error);
      return '';
    }
    return data.user?.email || '';
  } catch (err) {
    console.error('Unexpected error resolving purchase email:', err);
    return '';
  }
}

async function resolveSubscriptionUserEmail(
  supabase: SupabaseAdminClient,
  stripeSubscriptionId: string,
) {
  const { data, error } = await supabase
    .from('si_subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();

  if (error) {
    console.error('Failed to resolve subscription email context:', error);
    return { userId: '', email: '' };
  }

  const userId = data?.user_id || '';
  if (!userId) return { userId: '', email: '' };

  const email = await resolveAuthUserEmail(supabase, userId);
  return { userId, email };
}

async function fetchProductSummary(
  supabase: SupabaseAdminClient,
  productId: string,
) {
  const { data, error } = await supabase
    .from('si_products')
    .select('name, description')
    .eq('id', productId)
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch product summary:', error);
    return { name: 'Supericons purchase', description: '' };
  }

  return {
    name: data?.name || 'Supericons purchase',
    description: data?.description || '',
  };
}

async function sendBillingEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    console.warn('Skipping purchase confirmation email: RESEND_API_KEY is not configured.');
    return;
  }

  const from = Deno.env.get('PURCHASE_EMAIL_FROM') || DEFAULT_FROM_EMAIL;
  const replyTo = Deno.env.get('PURCHASE_EMAIL_REPLY_TO') || DEFAULT_SUPPORT_EMAIL;

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: replyTo,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    console.error(`Billing email failed (${response.status}):`, body);
    return;
  }

  console.log(`Billing email sent to ${to}`);
}

async function reserveBillingNotification({
  supabase,
  userId,
  stripeSubscriptionId,
  stripeEventId,
  eventKind,
  eventContext,
}: {
  supabase: SupabaseAdminClient;
  userId: string;
  stripeSubscriptionId: string;
  stripeEventId: string;
  eventKind: BillingNotificationKind;
  eventContext: Record<string, unknown>;
}) {
  const { error } = await supabase
    .from('si_billing_notifications')
    .insert({
      user_id: userId,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_event_id: stripeEventId,
      event_kind: eventKind,
      event_context: eventContext,
    });

  if (!error) return true;
  if (error.code === '23505') {
    console.log(`Billing notification already processed: ${stripeEventId}`);
    return false;
  }

  console.error('Billing notification reservation failed:', error);
  return false;
}

async function grantLaunchProducts(
  supabase: SupabaseAdminClient,
  userId: string,
  source: string,
  stripeReference: string | null,
): Promise<LaunchGrantResult> {
  const { data: launchProducts, error: fetchErr } = await supabase
    .from('si_products')
    .select('id')
    .eq('v1_launch', true);

  if (fetchErr) {
    console.error('Failed to fetch V1 products:', fetchErr);
    return { totalCount: 0, grantedCount: 0, hadErrors: true };
  }

  if (!launchProducts || launchProducts.length === 0) {
    return { totalCount: 0, grantedCount: 0, hadErrors: false };
  }

  let grantedCount = 0;
  let hadErrors = false;

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
      hadErrors = true;
    } else {
      grantedCount += 1;
    }
  }

  console.log(`${source}: ${launchProducts.length} packs granted to user=${userId}`);
  return { totalCount: launchProducts.length, grantedCount, hadErrors };
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
      const message = err instanceof Error ? err.message : String(err);
      console.error('Webhook signature verification failed:', message);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
    }

    // Admin client for writes (bypasses RLS)
    const supabase = createClient<any>(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const appBaseUrl = getAppBaseUrl();
    const downloadsUrl = `${appBaseUrl}/?view=downloads`;
    const dashboardUrl = `${appBaseUrl}/?view=dashboard`;

    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const productId = session.metadata?.product_id;

        if (userId && productId && session.mode === 'payment') {
          let shouldSendPurchaseEmail = false;
          let emailPayload: EmailContent | null = null;

          // Launch Edition: bulk-insert all V1 packs
          if (productId === 'launch_edition') {
            const { data: existingLaunchGrant } = await supabase
              .from('si_purchases')
              .select('id')
              .eq('user_id', userId)
              .eq('stripe_session_id', session.id)
              .maybeSingle();

            const launchResult = await grantLaunchProducts(supabase, userId, 'launch_edition', session.id);
            shouldSendPurchaseEmail = !existingLaunchGrant && launchResult.grantedCount > 0 && !launchResult.hadErrors;

            if (shouldSendPurchaseEmail) {
              const recipientEmail = await resolveUserEmail(supabase, userId, session);
              if (recipientEmail) {
                emailPayload = buildPurchaseEmail({
                  recipientEmail,
                  productName: 'Launch Edition',
                  productDescription: 'All 8 launch packs have been added to your Supericons account.',
                  amountLabel: formatMoney(session.amount_total, session.currency),
                  mode: 'payment',
                  downloadsUrl,
                  dashboardUrl,
                });
                await sendBillingEmail({
                  to: recipientEmail,
                  subject: emailPayload.subject,
                  text: emailPayload.text,
                  html: emailPayload.html,
                });
              }
            }
          } else {
            const { data: existingPurchase } = await supabase
              .from('si_purchases')
              .select('id')
              .eq('user_id', userId)
              .eq('product_id', productId)
              .maybeSingle();

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
            else {
              console.log(`Purchase recorded: user=${userId}, product=${productId}`);
              shouldSendPurchaseEmail = !existingPurchase;
            }

            if (shouldSendPurchaseEmail) {
              const recipientEmail = await resolveUserEmail(supabase, userId, session);
              if (recipientEmail) {
                const product = await fetchProductSummary(supabase, productId);
                emailPayload = buildPurchaseEmail({
                  recipientEmail,
                  productName: product.name,
                  productDescription: product.description,
                  amountLabel: formatMoney(session.amount_total, session.currency),
                  mode: 'payment',
                  downloadsUrl,
                  dashboardUrl,
                });
                await sendBillingEmail({
                  to: recipientEmail,
                  subject: emailPayload.subject,
                  text: emailPayload.text,
                  html: emailPayload.html,
                });
              }
            }
          }
        }

        if (userId && session.mode === 'subscription') {
          // Handle subscription creation
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          let shouldSendSubscriptionEmail = false;

          // Determine plan type from price
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const plan = sub.items.data[0]?.price?.recurring?.interval === 'year'
            ? 'pro_annual' : 'pro_monthly';
          const currentPeriodEnd = getSubscriptionPeriodEndIso(sub);

          const { data: existingSubscription } = await supabase
            .from('si_subscriptions')
            .select('id')
            .eq('stripe_subscription_id', subscriptionId)
            .maybeSingle();

          const { error } = await supabase
            .from('si_subscriptions')
            .upsert({
              user_id: userId,
              stripe_subscription_id: subscriptionId,
              stripe_customer_id: customerId,
              status: 'active',
              plan,
              current_period_end: currentPeriodEnd,
            }, { onConflict: 'user_id' });

          if (error) console.error('Subscription insert error:', error);
          else {
            console.log(`Subscription created: user=${userId}, plan=${plan}`);
            shouldSendSubscriptionEmail = !existingSubscription;
          }

          if (plan === 'pro_annual') {
            await grantLaunchProducts(supabase, userId, 'pro_annual_grant', subscriptionId);
          }

          if (shouldSendSubscriptionEmail) {
            const recipientEmail = await resolveUserEmail(supabase, userId, session);
            if (recipientEmail) {
              const productName = plan === 'pro_annual' ? 'Supericons Pro Annual' : 'Supericons Pro Monthly';
              const description = plan === 'pro_annual'
                ? 'Your annual Pro plan is active. Open Supericons to manage your account and access Pro tools.'
                : 'Your monthly Pro plan is active. Claim collections, use Pro tools, and manage billing from your account.';
              const emailPayload = buildPurchaseEmail({
                recipientEmail,
                productName,
                productDescription: description,
                amountLabel: formatMoney(session.amount_total, session.currency),
                mode: 'subscription',
                downloadsUrl,
                dashboardUrl,
              });
              await sendBillingEmail({
                to: recipientEmail,
                subject: emailPayload.subject,
                text: emailPayload.text,
                html: emailPayload.html,
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const previousAttributes = (event.data as { previous_attributes?: Record<string, unknown> }).previous_attributes;
        const cancelAtPeriodEndChanged = Boolean(
          previousAttributes && Object.prototype.hasOwnProperty.call(previousAttributes, 'cancel_at_period_end')
        );
        const plan = subscription.items.data[0]?.price?.recurring?.interval === 'year'
          ? 'pro_annual' : 'pro_monthly';
        const currentPeriodEnd = getSubscriptionPeriodEndIso(subscription);
        const { error } = await supabase
          .from('si_subscriptions')
          .update({
            status: subscription.status,
            plan,
            current_period_end: currentPeriodEnd,
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) console.error('Subscription update error:', error);

        if (!cancelAtPeriodEndChanged || subscription.cancel_at_period_end !== true) {
          break;
        }

        const { userId, email } = await resolveSubscriptionUserEmail(supabase, subscription.id);
        if (!userId || !email) {
          console.warn(`Skipping cancellation scheduled email: missing user context for subscription ${subscription.id}`);
          break;
        }

        const shouldSendCancellationScheduledEmail = await reserveBillingNotification({
          supabase,
          userId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          eventKind: 'subscription_cancel_scheduled',
          eventContext: {
            cancel_at_period_end: true,
            current_period_end: currentPeriodEnd,
            status: subscription.status,
          },
        });

        if (!shouldSendCancellationScheduledEmail) {
          break;
        }

        const emailPayload = buildCancellationScheduledEmail({
          recipientEmail: email,
          currentPeriodEnd,
          dashboardUrl,
        });

        await sendBillingEmail({
          to: email,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from('si_subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        if (error) console.error('Subscription cancel error:', error);

        const { userId, email } = await resolveSubscriptionUserEmail(supabase, subscription.id);
        if (!userId || !email) {
          console.warn(`Skipping subscription ended email: missing user context for subscription ${subscription.id}`);
          break;
        }

        const shouldSendSubscriptionEndedEmail = await reserveBillingNotification({
          supabase,
          userId,
          stripeSubscriptionId: subscription.id,
          stripeEventId: event.id,
          eventKind: 'subscription_ended',
          eventContext: {
            status: subscription.status,
            canceled_at: subscription.canceled_at,
          },
        });

        if (!shouldSendSubscriptionEndedEmail) {
          break;
        }

        const emailPayload = buildSubscriptionEndedEmail({
          recipientEmail: email,
          dashboardUrl,
        });

        await sendBillingEmail({
          to: email,
          subject: emailPayload.subject,
          text: emailPayload.text,
          html: emailPayload.html,
        });
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
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
