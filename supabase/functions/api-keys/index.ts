// Supericons: API Key Management
// Supabase Edge Function (Deno)
// GET /functions/v1/api-keys (list)
// POST /functions/v1/api-keys (generate, revoke, or delete via action payload)
// DELETE /functions/v1/api-keys (legacy revoke fallback)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ACTIVE_KEYS = 5;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// SHA-256 hash helper
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random hex key with si_ prefix
function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `si_${hex}`;
}

async function revokeKey(adminClient: any, userId: string, keyId: unknown) {
  if (typeof keyId !== 'string' || keyId.trim().length === 0) {
    return jsonResponse({ error: 'Missing key_id' }, 400);
  }

  const normalizedKeyId = keyId.trim();
  if (!UUID_REGEX.test(normalizedKeyId)) {
    return jsonResponse({ error: 'Invalid key_id' }, 400);
  }

  const { data: existingKey, error: lookupErr } = await adminClient
    .from('si_api_keys')
    .select('id, revoked')
    .eq('id', normalizedKeyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupErr) {
    console.error('API Keys revoke lookup error:', lookupErr);
    return jsonResponse({ error: 'Failed to look up key' }, 500);
  }

  if (!existingKey) {
    return jsonResponse({ error: 'API key not found' }, 404);
  }

  if (existingKey.revoked) {
    return jsonResponse({ error: 'API key already revoked' }, 409);
  }

  const { data: revokedKey, error: revokeErr } = await adminClient
    .from('si_api_keys')
    .update({ revoked: true })
    .eq('id', normalizedKeyId)
    .eq('user_id', userId)
    .eq('revoked', false)
    .select('id, revoked')
    .maybeSingle();

  if (revokeErr) {
    console.error('API Keys revoke update error:', revokeErr);
    return jsonResponse({ error: 'Failed to revoke key' }, 500);
  }

  if (!revokedKey) {
    return jsonResponse({ error: 'API key could not be revoked' }, 409);
  }

  return jsonResponse({
    success: true,
    key_id: normalizedKeyId,
    revoked: true,
  });
}

async function deleteRevokedKey(adminClient: any, userId: string, keyId: unknown) {
  if (typeof keyId !== 'string' || keyId.trim().length === 0) {
    return jsonResponse({ error: 'Missing key_id' }, 400);
  }

  const normalizedKeyId = keyId.trim();
  if (!UUID_REGEX.test(normalizedKeyId)) {
    return jsonResponse({ error: 'Invalid key_id' }, 400);
  }

  const { data: existingKey, error: lookupErr } = await adminClient
    .from('si_api_keys')
    .select('id, revoked')
    .eq('id', normalizedKeyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (lookupErr) {
    console.error('API Keys delete lookup error:', lookupErr);
    return jsonResponse({ error: 'Failed to look up key' }, 500);
  }

  if (!existingKey) {
    return jsonResponse({ error: 'API key not found' }, 404);
  }

  if (!existingKey.revoked) {
    return jsonResponse({ error: 'Active API keys must be revoked before deletion' }, 409);
  }

  const { data: deletedKey, error: deleteErr } = await adminClient
    .from('si_api_keys')
    .delete()
    .eq('id', normalizedKeyId)
    .eq('user_id', userId)
    .eq('revoked', true)
    .select('id')
    .maybeSingle();

  if (deleteErr) {
    console.error('API Keys delete error:', deleteErr);
    return jsonResponse({ error: 'Failed to delete revoked key record' }, 500);
  }

  if (!deletedKey) {
    return jsonResponse({ error: 'Revoked key record could not be deleted' }, 409);
  }

  return jsonResponse({
    success: true,
    key_id: normalizedKeyId,
    deleted: true,
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (req.method === 'GET') {
      const { data: keys, error: listErr } = await adminClient
        .from('si_api_keys')
        .select('id, key_prefix, label, created_at, last_used, revoked')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listErr) {
        console.error('API Keys list error:', listErr);
        return jsonResponse({ error: 'Failed to list keys' }, 500);
      }

      return jsonResponse({ keys: keys || [] });
    }

    if (req.method === 'DELETE') {
      const body = await req.json().catch(() => ({}));
      const bodyKeyId = (body as Record<string, unknown>).key_id;
      const queryKeyId = new URL(req.url).searchParams.get('key_id');
      return await revokeKey(adminClient, user.id, bodyKeyId ?? queryKeyId);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({})) as Record<string, unknown>;
      const action = typeof body.action === 'string' ? body.action : null;

      if (action === 'revoke') {
        return await revokeKey(adminClient, user.id, body.key_id);
      }

      if (action === 'delete') {
        return await deleteRevokedKey(adminClient, user.id, body.key_id);
      }

      if (action && action !== 'generate') {
        return jsonResponse({ error: 'Unsupported action' }, 400);
      }

      const { data: sub } = await adminClient
        .from('si_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!sub) {
        const { data: purchases } = await adminClient
          .from('si_purchases')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!purchases || purchases.length === 0) {
          return jsonResponse({ error: 'Active subscription or pack purchase required' }, 403);
        }
      }

      const { data: existing, error: countErr } = await adminClient
        .from('si_api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('revoked', false);

      if (countErr) {
        console.error('API Keys count error:', countErr);
        return jsonResponse({ error: 'Failed to check existing keys' }, 500);
      }

      if ((existing || []).length >= MAX_ACTIVE_KEYS) {
        return jsonResponse(
          { error: `Maximum ${MAX_ACTIVE_KEYS} active API keys allowed. Revoke an existing key first.` },
          400,
        );
      }

      const label = typeof body.label === 'string' && body.label.trim()
        ? body.label.trim().slice(0, 50)
        : 'Default';

      const fullKey = generateApiKey();
      const keyHash = await sha256(fullKey);
      const keyPrefix = fullKey.substring(0, 11);

      const { error: insertErr } = await adminClient
        .from('si_api_keys')
        .insert({
          user_id: user.id,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          label,
        });

      if (insertErr) {
        console.error('API Keys insert error:', insertErr);
        return jsonResponse({ error: 'Failed to create API key' }, 500);
      }

      return jsonResponse({
        key: fullKey,
        key_prefix: keyPrefix,
        label,
        message: 'Store this key securely. It will not be shown again.',
      }, 201);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    console.error('API Keys error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
