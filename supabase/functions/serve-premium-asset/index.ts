// Supericons: Serve Premium Asset (SVG/CSS preview + authenticated download)
// Supabase Edge Function (Deno)
// GET /functions/v1/serve-premium-asset?slug=ai-agentic&file=ai-help.svg
//
// Two modes:
// 1. Preview (no auth or unverified): returns the asset for grid preview
//    but sets Cache-Control: no-store to prevent caching.
// 2. Authenticated (JWT + purchase): returns the asset for customize/export.
//
// Why serve previews without purchase verification:
// Non-purchasers need to see the icon animations to make a buying decision.
// The protection model is friction-based deterrence, not access control:
// - Files are not at predictable public URLs (no /packs/ in production)
// - The manifest is still public (needed for the grid UI)
// - A determined scraper with the manifest could still enumerate assets
// - This is accepted as a business tradeoff for a $5 product

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    const file = url.searchParams.get('file');

    if (!slug || !file) {
      return new Response(JSON.stringify({ error: 'Missing slug or file parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file parameter (prevent path traversal)
    if (file.includes('..') || file.includes('/') || file.includes('\\')) {
      return new Response(JSON.stringify({ error: 'Invalid file parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client to read from private storage
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check if caller is authenticated and has purchased
    let isPurchased = false;
    const authHeader = req.headers.get('Authorization');

    if (authHeader && authHeader !== `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`) {
      // Create a user-scoped client to verify identity
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await userClient.auth.getUser();

      if (user) {
        // Look up product UUID from slug
        const { data: product } = await adminClient
          .from('si_products')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (product) {
          // Check purchase record
          const { data: purchase } = await adminClient
            .from('si_purchases')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', product.id)
            .maybeSingle();

          if (purchase) {
            isPurchased = true;
          }
        }

        // Pro subscribers have access to all packs
        if (!isPurchased) {
          const { data: sub } = await adminClient
            .from('si_subscriptions')
            .select('status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle();

          if (sub) isPurchased = true;
        }
      }
    }

    // Fetch the file from private storage
    const storagePath = `${slug}/${file}`;
    const { data: fileData, error: storageError } = await adminClient
      .storage
      .from('premium-icons')
      .download(storagePath);

    if (storageError || !fileData) {
      return new Response(JSON.stringify({ error: 'Asset not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine content type
    const contentType = file.endsWith('.css')
      ? 'text/css; charset=utf-8'
      : 'image/svg+xml; charset=utf-8';

    // Different cache headers based on purchase status
    const cacheControl = isPurchased
      ? 'private, max-age=3600'   // Purchased: cache for 1 hour
      : 'no-store';               // Preview: don't cache

    const content = await fileData.text();

    return new Response(content, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
        'X-Premium-Status': isPurchased ? 'purchased' : 'preview',
      },
    });
  } catch (err) {
    console.error('Serve premium asset error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
