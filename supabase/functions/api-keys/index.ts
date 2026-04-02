// Supericons: API Key Management
// Supabase Edge Function (Deno)
// POST /functions/v1/api-keys (generate)
// DELETE /functions/v1/api-keys (revoke)
// GET /functions/v1/api-keys (list)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SHA-256 hash helper
async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a secure random hex key with si_ prefix
function generateApiKey(): string {
  const bytes = new Uint8Array(16); // 32 hex chars
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `si_${hex}`;
}

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

    // Admin client for writes
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── GET: List keys (any authenticated user) ──────────────
    if (req.method === 'GET') {
      const { data: keys, error: listErr } = await adminClient
        .from('si_api_keys')
        .select('id, key_prefix, label, created_at, last_used, revoked')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (listErr) {
        return new Response(JSON.stringify({ error: 'Failed to list keys' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ keys }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE: Revoke key (any authenticated user) ─────────
    if (req.method === 'DELETE') {
      const { key_id } = await req.json();
      if (!key_id) {
        return new Response(JSON.stringify({ error: 'Missing key_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: revokeErr } = await adminClient
        .from('si_api_keys')
        .update({ revoked: true })
        .eq('id', key_id)
        .eq('user_id', user.id); // Ensure ownership

      if (revokeErr) {
        return new Response(JSON.stringify({ error: 'Failed to revoke key' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── POST: Generate key (Pro or Pack buyer) ─────────────
    if (req.method === 'POST') {
      // Verify: active Pro subscription OR at least one purchase
      const { data: sub } = await adminClient
        .from('si_subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (!sub) {
        // Check for purchases (single pack or launch bundle)
        const { data: purchases } = await adminClient
          .from('si_purchases')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (!purchases || purchases.length === 0) {
          return new Response(JSON.stringify({ error: 'Active subscription or pack purchase required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Check active key limit (max 3)
      const { data: existing, error: countErr } = await adminClient
        .from('si_api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('revoked', false);

      if (countErr) {
        return new Response(JSON.stringify({ error: 'Failed to check existing keys' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if ((existing || []).length >= 3) {
        return new Response(JSON.stringify({ error: 'Maximum 3 active API keys allowed. Revoke an existing key first.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const body = await req.json().catch(() => ({}));
      const label = (body as Record<string, string>).label || 'Default';

      // Generate key
      const fullKey = generateApiKey();
      const keyHash = await sha256(fullKey);
      const keyPrefix = fullKey.substring(0, 11); // 'si_' + first 8 hex chars

      const { error: insertErr } = await adminClient
        .from('si_api_keys')
        .insert({
          user_id: user.id,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          label,
        });

      if (insertErr) {
        return new Response(JSON.stringify({ error: 'Failed to create API key' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Return full key exactly once
      return new Response(JSON.stringify({
        key: fullKey,
        key_prefix: keyPrefix,
        label,
        message: 'Store this key securely. It will not be shown again.',
      }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('API Keys error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
