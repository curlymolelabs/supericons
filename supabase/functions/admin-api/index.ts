import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

type AuditOutcome = 'started' | 'succeeded' | 'failed';
type JsonRecord = Record<string, unknown>;
type SupabaseClient = any;
type AuthUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  banned_until?: string | null;
  app_metadata?: {
    provider?: string | null;
    providers?: string[] | null;
  } | null;
  user_metadata?: Record<string, unknown> | null;
};

const DEFAULT_ALLOWED_ORIGINS = [
  'https://supericons.dev',
  'http://localhost:5173',
];

const DEFAULT_APP_BASE_URL = 'https://supericons.dev';
const DEFAULT_SUPPORT_EMAIL = 'hello@supericons.dev';
const DEFAULT_FROM_EMAIL = 'Supericons <receipts@auth.supericons.dev>';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const PAGE_SIZE = 25;
const DELETE_CANCELABLE_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid']);

function getAllowedOrigins() {
  const configured = (Deno.env.get('ADMIN_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function getAllowedOrigin(req: Request) {
  const origin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  if (origin && allowedOrigins.includes(origin)) {
    return origin;
  }
  return allowedOrigins[0];
}

function getCorsHeaders(req: Request) {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Access-Control-Allow-Headers': 'content-type, x-admin-secret',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json',
  };
}

function jsonResponse(req: Request, body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(req),
  });
}

function parsePath(req: Request) {
  const url = new URL(req.url);
  const path = url.pathname
    .replace(/^\/functions\/v1\/admin-api/, '')
    .replace(/^\/admin-api/, '')
    || '/';
  const segments = path.split('/').filter(Boolean);
  return { url, path, segments };
}

function getAppBaseUrl() {
  return (Deno.env.get('APP_BASE_URL') || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
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

function buildAccountDeletedEmail({
  recipientEmail,
  dashboardUrl,
}: {
  recipientEmail: string;
  dashboardUrl: string;
}) {
  const escapedEmail = escapeHtml(recipientEmail);
  const escapedDashboardUrl = escapeHtml(dashboardUrl);
  return {
    subject: 'Your Supericons account has been deleted',
    text: [
      'Your Supericons account has been deleted.',
      '',
      'All associated Supericons account data has been removed from our app.',
      `Questions? Reply to ${DEFAULT_SUPPORT_EMAIL}`,
      `Open Supericons: ${dashboardUrl}`,
    ].join('\n'),
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0e0e0e;">
  <div style="padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-align:center;">
    <div style="max-width:480px;margin:0 auto;">
      <a href="${escapedDashboardUrl}" style="display:inline-flex;align-items:center;justify-content:center;margin-bottom:32px;text-decoration:none;">
        <img src="${escapeHtml(getAppBaseUrl())}/logo_email_header.png" alt="Supericons" height="34" style="display:block;border:0;outline:none;text-decoration:none;" />
      </a>
      <div style="background:#131313;border:1px solid #262626;border-radius:16px;padding:48px 40px;box-shadow:0 10px 30px rgba(0,0,0,0.4);text-align:left;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#FF4F00;margin-bottom:12px;text-align:center;">Supericons admin</div>
        <h1 style="font-size:24px;font-weight:700;margin:0 0 16px;color:#ffffff;text-align:center;">Account deleted</h1>
        <p style="margin:0 0 24px;color:#cccaca;font-size:15px;line-height:1.6;text-align:center;">Your Supericons account has been deleted.</p>
        <div style="background:#171717;border:1px solid #262626;border-radius:14px;padding:18px 18px 16px;margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#cccaca;font-size:14px;line-height:1.6;">All associated Supericons account data has been removed from our app.</p>
          <p style="margin:0;color:#cccaca;font-size:14px;line-height:1.6;">Deleting your Supericons account does not delete any external sign-in account such as Google.</p>
        </div>
        <div style="text-align:center;">
          <a href="${escapedDashboardUrl}" style="display:inline-block;background-color:#FF4F00;color:#000000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:999px;">Open Supericons</a>
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
</html>`,
  };
}

async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    return { ok: false, reason: 'missing_resend_api_key' };
  }

  const response = await fetch(RESEND_EMAILS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: DEFAULT_FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: await response.text(),
    };
  }

  return { ok: true };
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === '42P01' || message.toLowerCase().includes('relation') && message.toLowerCase().includes('does not exist');
}

function summarizeProviders(user: AuthUser) {
  const rawProviders = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata?.providers ?? []
    : [];
  const singleProvider = user.app_metadata?.provider ? [user.app_metadata.provider] : [];
  const values = [...new Set([...rawProviders, ...singleProvider].filter(Boolean))];
  return values.length > 0 ? values : ['email'];
}

function formatProviderLabel(user: AuthUser) {
  return summarizeProviders(user)
    .map((value) => value === 'google' ? 'Google' : value === 'email' ? 'Email' : value)
    .join(', ');
}

function getDisplayName(user: AuthUser, profile?: Record<string, unknown> | null) {
  const profileName = typeof profile?.display_name === 'string' ? profile.display_name : null;
  if (profileName) return profileName;
  const metadata = user.user_metadata || {};
  const fullName = typeof metadata.full_name === 'string' ? metadata.full_name : null;
  const name = typeof metadata.name === 'string' ? metadata.name : null;
  if (fullName) return fullName;
  if (name) return name;
  if (user.email) return user.email.split('@')[0];
  return user.id;
}

async function listAllAuthUsers(adminClient: SupabaseClient) {
  const users: AuthUser[] = [];
  let page = 1;
  let total = 0;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) throw error;

    const batch = (data?.users || []) as AuthUser[];
    total = data?.total || total;
    users.push(...batch);

    if (batch.length < 100) break;
    page += 1;
    if (users.length >= total && total > 0) break;
  }

  return { users, total: total || users.length };
}

async function fetchProfiles(adminClient: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Record<string, unknown>>();
  const { data, error } = await adminClient
    .from('si_profiles')
    .select('id, email, display_name, avatar_url, created_at')
    .in('id', userIds);

  if (error) throw error;
  return new Map((data || []).map((row: Record<string, unknown>) => [String(row.id), row]));
}

async function fetchSubscriptions(adminClient: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Record<string, unknown>>();
  const { data, error } = await adminClient
    .from('si_subscriptions')
    .select('id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, plan')
    .in('user_id', userIds);

  if (error) throw error;
  return new Map((data || []).map((row: Record<string, unknown>) => [String(row.user_id), row]));
}

async function fetchPurchaseCounts(adminClient: SupabaseClient, userIds: string[]) {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;

  const { data, error } = await adminClient
    .from('si_purchases')
    .select('user_id')
    .in('user_id', userIds);

  if (error) throw error;

  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id);
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return counts;
}

async function fetchApiKeyCounts(adminClient: SupabaseClient, userIds: string[]) {
  const counts = new Map<string, number>();
  if (userIds.length === 0) return counts;

  const { data, error } = await adminClient
    .from('si_api_keys')
    .select('user_id, revoked')
    .in('user_id', userIds);

  if (error) {
    if (isMissingRelationError(error)) {
      return counts;
    }
    throw error;
  }

  for (const row of (data || []) as Array<Record<string, unknown>>) {
    const userId = String(row.user_id);
    if (row.revoked) continue;
    counts.set(userId, (counts.get(userId) || 0) + 1);
  }

  return counts;
}

async function fetchUserSnapshot(adminClient: SupabaseClient, userId: string) {
  const { data: authUserData, error: authError } = await adminClient.auth.admin.getUserById(userId);
  if (authError) throw authError;
  const user = authUserData?.user as AuthUser | null;
  if (!user) return null;

  const [{ data: profile, error: profileError }, { data: subscription, error: subscriptionError }, { data: purchases, error: purchasesError }, apiKeysResult] = await Promise.all([
    adminClient.from('si_profiles').select('id, email, display_name, avatar_url, created_at').eq('id', userId).maybeSingle(),
    adminClient.from('si_subscriptions').select('id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, plan').eq('user_id', userId).maybeSingle(),
    adminClient.from('si_purchases').select('id, user_id, product_id, stripe_session_id, purchased_at, source, si_products(name, slug)').eq('user_id', userId).order('purchased_at', { ascending: false }),
    adminClient.from('si_api_keys').select('id, key_prefix, label, created_at, last_used, revoked').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);

  if (profileError) throw profileError;
  if (subscriptionError) throw subscriptionError;
  if (purchasesError) throw purchasesError;

  let apiKeys: Record<string, unknown>[] = [];
  if (apiKeysResult.error) {
    if (!isMissingRelationError(apiKeysResult.error)) throw apiKeysResult.error;
  } else {
    apiKeys = (apiKeysResult.data || []) as Record<string, unknown>[];
  }

  const { data: auditLog, error: auditError } = await adminClient
    .from('si_admin_audit_log')
    .select('id, action, outcome, note, error_text, target_id, target_email, payload, created_at')
    .or(`target_id.eq.${userId},target_email.eq.${user.email || ''}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (auditError) throw auditError;

  return {
    user,
    profile: profile || null,
    subscription: subscription || null,
    purchases: purchases || [],
    api_keys: apiKeys,
    audit_log: auditLog || [],
  };
}

async function insertAuditRow(
  adminClient: SupabaseClient,
  action: string,
  targetId: string,
  targetEmail: string | null,
  note: string | null,
  payload: JsonRecord,
) {
  const { data, error } = await adminClient
    .from('si_admin_audit_log')
    .insert({
      action,
      target_id: targetId,
      target_email: targetEmail,
      note,
      payload,
      outcome: 'started',
    })
    .select('id')
    .single();

  if (error) throw error;
  return String((data as Record<string, unknown>).id);
}

async function updateAuditRow(
  adminClient: SupabaseClient,
  auditId: string,
  outcome: AuditOutcome,
  updates: JsonRecord = {},
) {
  const payload = { outcome, ...updates };
  const { error } = await adminClient
    .from('si_admin_audit_log')
    .update(payload)
    .eq('id', auditId);

  if (error) throw error;
}

function summarizeSnapshot(snapshot: Record<string, unknown>) {
  return {
    email: snapshot.user && typeof snapshot.user === 'object' ? (snapshot.user as AuthUser).email || null : null,
    provider: snapshot.user && typeof snapshot.user === 'object' ? formatProviderLabel(snapshot.user as AuthUser) : null,
    has_profile: Boolean(snapshot.profile),
    subscription: snapshot.subscription || null,
    purchases_count: Array.isArray(snapshot.purchases) ? snapshot.purchases.length : 0,
    api_keys_count: Array.isArray(snapshot.api_keys) ? snapshot.api_keys.length : 0,
  };
}

async function cancelStripeSubscription(stripe: Stripe, subscriptionId: string) {
  return await stripe.subscriptions.cancel(subscriptionId);
}

async function deleteStripeCustomer(stripe: Stripe, customerId: string) {
  return await stripe.customers.del(customerId);
}

async function handleStats(req: Request, adminClient: SupabaseClient) {
  const [{ users }, activeProResult, purchasesResult, recentAuditResult] = await Promise.all([
    listAllAuthUsers(adminClient),
    adminClient.from('si_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    adminClient.from('si_purchases').select('id', { count: 'exact', head: true }),
    adminClient.from('si_admin_audit_log').select('id, action, outcome, target_id, target_email, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  if (activeProResult.error) throw activeProResult.error;
  if (purchasesResult.error) throw purchasesResult.error;
  if (recentAuditResult.error) throw recentAuditResult.error;

  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const sortedUsers = [...users].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const newUsers30d = users.filter((user) => {
    const createdAt = new Date(user.created_at || 0).getTime();
    return Number.isFinite(createdAt) && createdAt >= cutoff;
  }).length;

  return jsonResponse(req, {
    stats: {
      total_users: users.length,
      active_pro: activeProResult.count || 0,
      total_purchases: purchasesResult.count || 0,
      new_users_30d: newUsers30d,
      recent_signups: sortedUsers.slice(0, 5).map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        provider: formatProviderLabel(user),
      })),
      recent_audit: recentAuditResult.data || [],
    },
  });
}

async function handleUsersIndex(req: Request, adminClient: SupabaseClient, url: URL) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const planFilter = (url.searchParams.get('plan') || '').trim().toLowerCase();
  const statusFilter = (url.searchParams.get('status') || '').trim().toLowerCase();
  const providerFilter = (url.searchParams.get('provider') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const { users } = await listAllAuthUsers(adminClient);
  const userIds = users.map((user) => user.id);
  const [profiles, subscriptions, purchaseCounts, apiKeyCounts] = await Promise.all([
    fetchProfiles(adminClient, userIds),
    fetchSubscriptions(adminClient, userIds),
    fetchPurchaseCounts(adminClient, userIds),
    fetchApiKeyCounts(adminClient, userIds),
  ]);

  const enriched = users.map((user) => {
    const profile = (profiles.get(user.id) || null) as Record<string, unknown> | null;
    const subscription = (subscriptions.get(user.id) || null) as Record<string, unknown> | null;
    return {
      id: user.id,
      email: user.email || null,
      display_name: getDisplayName(user, profile),
      created_at: user.created_at || null,
      last_sign_in_at: user.last_sign_in_at || null,
      email_confirmed_at: user.email_confirmed_at || null,
      banned_until: user.banned_until || null,
      provider: formatProviderLabel(user),
      providers: summarizeProviders(user),
      plan: subscription?.plan || null,
      subscription_status: subscription?.status || 'free',
      current_period_end: subscription?.current_period_end || null,
      purchase_count: purchaseCounts.get(user.id) || 0,
      api_key_count: apiKeyCounts.get(user.id) || 0,
    };
  });

  const filtered = enriched.filter((user) => {
    if (q) {
      const haystack = [
        user.email,
        user.display_name,
        user.id,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (planFilter) {
      if (planFilter === 'free' && user.plan) return false;
      if (planFilter !== 'free' && String(user.plan || '').toLowerCase() !== planFilter) return false;
    }
    if (statusFilter && String(user.subscription_status || '').toLowerCase() !== statusFilter) return false;
    if (providerFilter && !user.providers.some((provider) => provider.toLowerCase() === providerFilter)) return false;
    return true;
  }).sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;

  return jsonResponse(req, {
    users: filtered.slice(start, start + PAGE_SIZE),
    pagination: {
      page: currentPage,
      page_size: PAGE_SIZE,
      total: filtered.length,
      page_count: pageCount,
    },
    filters: {
      q,
      plan: planFilter,
      status: statusFilter,
      provider: providerFilter,
    },
  });
}

async function handleUserDetail(req: Request, adminClient: SupabaseClient, userId: string) {
  const snapshot = await fetchUserSnapshot(adminClient, userId);
  if (!snapshot) {
    return jsonResponse(req, { error: 'User not found' }, 404);
  }

  return jsonResponse(req, {
    user: {
      id: snapshot.user.id,
      email: snapshot.user.email || null,
      display_name: getDisplayName(snapshot.user, snapshot.profile as Record<string, unknown> | null),
      providers: summarizeProviders(snapshot.user),
      provider_label: formatProviderLabel(snapshot.user),
      created_at: snapshot.user.created_at || null,
      last_sign_in_at: snapshot.user.last_sign_in_at || null,
      email_confirmed_at: snapshot.user.email_confirmed_at || null,
      banned_until: snapshot.user.banned_until || null,
      profile: snapshot.profile,
      subscription: snapshot.subscription,
      purchases: snapshot.purchases,
      api_keys: snapshot.api_keys,
      audit_log: snapshot.audit_log,
    },
  });
}

async function handleAuditLog(req: Request, adminClient: SupabaseClient, url: URL) {
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const actionFilter = (url.searchParams.get('action') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);

  const { data, error } = await adminClient
    .from('si_admin_audit_log')
    .select('id, action, outcome, target_id, target_email, note, error_text, payload, created_at')
    .order('created_at', { ascending: false })
    .limit(250);

  if (error) throw error;

  const filtered = ((data || []) as Array<Record<string, unknown>>).filter((row) => {
    if (actionFilter && String(row.action || '').toLowerCase() !== actionFilter) return false;
    if (q) {
      const haystack = [
        row.target_id,
        row.target_email,
        row.action,
        row.note,
        row.error_text,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;

  return jsonResponse(req, {
    audit_log: filtered.slice(start, start + PAGE_SIZE),
    pagination: {
      page: currentPage,
      page_size: PAGE_SIZE,
      total: filtered.length,
      page_count: pageCount,
    },
  });
}

async function handleSubscriptionCancel(req: Request, adminClient: SupabaseClient, subscriptionId: string) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });

  const { data: subscription, error } = await adminClient
    .from('si_subscriptions')
    .select('id, user_id, stripe_subscription_id, stripe_customer_id, status, current_period_end, plan')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error) throw error;
  const subscriptionRecord = subscription as Record<string, unknown> | null;
  if (!subscriptionRecord) {
    return jsonResponse(req, { error: 'Subscription not found' }, 404);
  }

  const auditId = await insertAuditRow(
    adminClient,
    'subscription.cancel',
    String(subscriptionId),
    null,
    null,
    { subscription: subscriptionRecord },
  );

  try {
    if (!subscriptionRecord.stripe_subscription_id) {
      throw new Error('Subscription row is missing stripe_subscription_id');
    }

    await cancelStripeSubscription(stripe, String(subscriptionRecord.stripe_subscription_id));

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handlePurchaseRevoke(req: Request, adminClient: SupabaseClient, purchaseId: string, note: string | null) {
  const { data: purchase, error } = await adminClient
    .from('si_purchases')
    .select('id, user_id, product_id, stripe_session_id, purchased_at, source, si_products(name, slug)')
    .eq('id', purchaseId)
    .maybeSingle();

  if (error) throw error;
  if (!purchase) {
    return jsonResponse(req, { error: 'Purchase not found' }, 404);
  }

  const auditId = await insertAuditRow(
    adminClient,
    'purchase.revoke',
    purchaseId,
    null,
    note,
    { purchase },
  );

  try {
    const { error: deleteError } = await adminClient
      .from('si_purchases')
      .delete()
      .eq('id', purchaseId);

    if (deleteError) throw deleteError;

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handleApiKeyRevoke(req: Request, adminClient: SupabaseClient, apiKeyId: string, note: string | null) {
  const { data: apiKey, error } = await adminClient
    .from('si_api_keys')
    .select('id, user_id, key_prefix, label, created_at, last_used, revoked')
    .eq('id', apiKeyId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) {
      return jsonResponse(req, { error: 'si_api_keys table is not available in this environment' }, 409);
    }
    throw error;
  }

  const apiKeyRecord = apiKey as Record<string, unknown> | null;
  if (!apiKeyRecord) {
    return jsonResponse(req, { error: 'API key not found' }, 404);
  }

  const auditId = await insertAuditRow(
    adminClient,
    'api_key.revoke',
    apiKeyId,
    null,
    note,
    { api_key: apiKeyRecord },
  );

  try {
    if (apiKeyRecord.revoked) {
      await updateAuditRow(adminClient, auditId, 'succeeded', { note: note || 'API key already revoked' });
      return jsonResponse(req, { success: true, already_revoked: true });
    }

    const { error: updateError } = await adminClient
      .from('si_api_keys')
      .update({ revoked: true })
      .eq('id', apiKeyId)
      .eq('revoked', false);

    if (updateError) throw updateError;

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handleBanToggle(req: Request, adminClient: SupabaseClient, userId: string, banned: boolean, note: string | null) {
  const snapshot = await fetchUserSnapshot(adminClient, userId);
  if (!snapshot) {
    return jsonResponse(req, { error: 'User not found' }, 404);
  }

  const action = banned ? 'user.ban' : 'user.unban';
  const auditId = await insertAuditRow(
    adminClient,
    action,
    userId,
    snapshot.user.email || null,
    note,
    summarizeSnapshot(snapshot),
  );

  try {
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: banned ? '876000h' : 'none',
    });
    if (error) throw error;

    await updateAuditRow(adminClient, auditId, 'succeeded', {});
    return jsonResponse(req, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', { error_text: message });
    return jsonResponse(req, { error: message }, 500);
  }
}

async function handleUserDelete(req: Request, adminClient: SupabaseClient, userId: string, body: JsonRecord) {
  const snapshot = await fetchUserSnapshot(adminClient, userId);
  if (!snapshot) {
    return jsonResponse(req, { error: 'User not found' }, 404);
  }

  const note = typeof body.note === 'string' ? body.note.trim() || null : null;
  const deleteStripeCustomerFlag = body.delete_stripe_customer === true;
  const email = snapshot.user.email || null;
  const auditId = await insertAuditRow(
    adminClient,
    'user.delete',
    userId,
    email,
    note,
    summarizeSnapshot(snapshot),
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2023-10-16',
  });
  const warnings: string[] = [];

  try {
    const subscription = snapshot.subscription as Record<string, unknown> | null;
    const stripeSubscriptionId = typeof subscription?.stripe_subscription_id === 'string'
      ? subscription.stripe_subscription_id
      : null;
    const stripeCustomerId = typeof subscription?.stripe_customer_id === 'string'
      ? subscription.stripe_customer_id
      : null;
    const subscriptionStatus = typeof subscription?.status === 'string'
      ? subscription.status
      : null;

    if (stripeSubscriptionId && subscriptionStatus && DELETE_CANCELABLE_STATUSES.has(subscriptionStatus)) {
      await cancelStripeSubscription(stripe, stripeSubscriptionId);
    }

    if (deleteStripeCustomerFlag && stripeCustomerId) {
      await deleteStripeCustomer(stripe, stripeCustomerId);
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    if (email) {
      const emailResult = await sendEmail({
        to: email,
        ...buildAccountDeletedEmail({
          recipientEmail: email,
          dashboardUrl: getAppBaseUrl(),
        }),
      });
      if (!emailResult.ok) {
        warnings.push(`account_deleted_email_failed:${emailResult.reason}`);
      }
    }

    await updateAuditRow(adminClient, auditId, 'succeeded', {
      payload: {
        ...summarizeSnapshot(snapshot),
        delete_stripe_customer: deleteStripeCustomerFlag,
        warnings,
      },
    });

    return jsonResponse(req, { success: true, warnings });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateAuditRow(adminClient, auditId, 'failed', {
      error_text: message,
      payload: {
        ...summarizeSnapshot(snapshot),
        delete_stripe_customer: deleteStripeCustomerFlag,
        warnings,
      },
    });
    return jsonResponse(req, { error: message }, 500);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }

  const adminSecret = Deno.env.get('ADMIN_SECRET');
  const requestSecret = req.headers.get('x-admin-secret');
  if (!adminSecret || !requestSecret || requestSecret !== adminSecret) {
    return jsonResponse(req, { error: 'Forbidden' }, 403);
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { url, segments } = parsePath(req);

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'stats') {
      return await handleStats(req, adminClient);
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'users') {
      return await handleUsersIndex(req, adminClient, url);
    }

    if (req.method === 'GET' && segments.length === 2 && segments[0] === 'users') {
      return await handleUserDetail(req, adminClient, segments[1]);
    }

    if (req.method === 'GET' && segments.length === 1 && segments[0] === 'audit-log') {
      return await handleAuditLog(req, adminClient, url);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'users' && segments[2] === 'delete') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      return await handleUserDelete(req, adminClient, segments[1], body);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'users' && segments[2] === 'ban') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handleBanToggle(req, adminClient, segments[1], true, note);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'users' && segments[2] === 'unban') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handleBanToggle(req, adminClient, segments[1], false, note);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'subscriptions' && segments[2] === 'cancel') {
      return await handleSubscriptionCancel(req, adminClient, segments[1]);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'purchases' && segments[2] === 'revoke') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handlePurchaseRevoke(req, adminClient, segments[1], note);
    }

    if (req.method === 'POST' && segments.length === 3 && segments[0] === 'api-keys' && segments[2] === 'revoke') {
      const body = await req.json().catch(() => ({})) as JsonRecord;
      const note = typeof body.note === 'string' ? body.note.trim() || null : null;
      return await handleApiKeyRevoke(req, adminClient, segments[1], note);
    }

    return jsonResponse(req, { error: 'Not found' }, 404);
  } catch (error) {
    console.error('admin-api error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(req, { error: message }, 500);
  }
});
