// Supericons: Serve Premium Asset (licensed delivery)
// Supabase Edge Function (Deno)
// GET /functions/v1/serve-premium-asset?slug=ai-agentic&file=ai-help.svg
//
// Contract:
// - Public previews are served from /packs/<slug>/... in the app.
// - This endpoint serves licensed source only.
// - A signed-in user must own the pack through si_purchases.
// - Active Pro alone does not grant pack ownership.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function contentTypeFor(file: string) {
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.svg')) return 'image/svg+xml; charset=utf-8';
  return 'application/octet-stream';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const file = url.searchParams.get('file');

    if (!slug || !file) {
      return jsonResponse('Missing slug or file parameter', 400);
    }

    // Validate file parameter (prevent path traversal)
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      return jsonResponse('Invalid file parameter', 400);
    }

    // Admin client to read from private storage
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify a real user token. The anon key is not enough for licensed assets.
    const authHeader = req.headers.get('Authorization');
    const anonAuthHeader = `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`;

    if (!authHeader || authHeader === anonAuthHeader) {
      return jsonResponse('Sign in required', 401);
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError) {
      console.warn('Premium asset auth failed:', userError);
    }

    if (!user) {
      return jsonResponse('Sign in required', 401);
    }

    const { data: product, error: productError } = await adminClient
      .from('si_products')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (productError) {
      console.error('Premium asset product lookup error:', productError);
      return jsonResponse('Internal server error', 500);
    }

    if (!product) {
      return jsonResponse('Product not found', 404);
    }

    const { data: purchase, error: purchaseError } = await adminClient
      .from('si_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle();

    if (purchaseError) {
      console.error('Premium asset purchase lookup error:', purchaseError);
      return jsonResponse('Internal server error', 500);
    }

    if (!purchase) {
      return jsonResponse('Purchase required', 403);
    }

    // Fetch the file from private storage
    const storagePath = `${slug}/${file}`;
    const { data: fileData, error: storageError } = await adminClient
      .storage
      .from('premium-icons')
      .download(storagePath);

    if (storageError || !fileData) {
      return jsonResponse('Asset not found', 404);
    }

    const content = await fileData.text();

    return new Response(content, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentTypeFor(file),
        'Cache-Control': 'private, max-age=3600',
        'X-Premium-Status': 'purchased',
      },
    });
  } catch (err) {
    console.error('Serve premium asset error:', err);
    return jsonResponse('Internal server error', 500);
  }
});
