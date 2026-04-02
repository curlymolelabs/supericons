// Supericons: Download Pack (Signed URL + License)
// Supabase Edge Function (Deno)
// POST /functions/v1/download-pack

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// License templates
const SINGLE_PROJECT_LICENSE = `SUPERICONS LICENSE - SINGLE PROJECT
====================================

Copyright (c) 2026 Curly Mole Labs. All rights reserved.

GRANT: You are granted a non-exclusive, non-transferable license
to use the icon assets in this collection in ONE (1) project
(website, application, or product).

PERMITTED:
- Use in one commercial or personal project
- Modify colors, sizes, and styles for your project
- Use in client work (one end product)

NOT PERMITTED:
- Redistribute the raw SVG/CSS source files
- Use in multiple projects (purchase additional licenses)
- Resell or sublicense the icon assets
- Include in open-source projects as bundled assets
- Use in tools that generate or redistribute icons

AI USAGE: Icons retrieved via the MCP server or API may be used
in AI-generated code output for the licensed project only.

This license is perpetual for the licensed project.
For questions: support@supericons.dev
`;

const UNLIMITED_LICENSE = `SUPERICONS LICENSE - UNLIMITED PROJECTS
========================================

Copyright (c) 2026 Curly Mole Labs. All rights reserved.

GRANT: You are granted a non-exclusive, non-transferable license
to use the icon assets in this collection in UNLIMITED projects
(websites, applications, or products).

PERMITTED:
- Use in unlimited commercial or personal projects
- Modify colors, sizes, and styles
- Use in client work (unlimited end products)
- Use across teams within your organization

NOT PERMITTED:
- Redistribute the raw SVG/CSS source files
- Resell or sublicense the icon assets
- Include in open-source projects as bundled assets
- Use in tools that generate or redistribute icons

AI USAGE: Icons retrieved via the MCP server or API may be used
in AI-generated code output for any of your licensed projects.

This license is perpetual for all projects.
For questions: support@supericons.dev
`;

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

    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: 'Missing product_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client for verification
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify purchase exists and get acquisition method
    const { data: purchase, error: purchaseError } = await adminClient
      .from('si_purchases')
      .select('id, source')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (purchaseError || !purchase) {
      return new Response(JSON.stringify({ error: 'Purchase not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get product CSS filename
    const { data: product, error: productError } = await adminClient
      .from('si_products')
      .select('slug, css_filename')
      .eq('id', product_id)
      .single();

    if (productError || !product || !product.css_filename) {
      return new Response(JSON.stringify({ error: 'Pack file not available' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine license tier
    // Pro subscribers and Launch Edition buyers get unlimited license
    // A-la-carte and credit redemptions get single-project license
    let licenseType = 'single';
    let licenseText = SINGLE_PROJECT_LICENSE;

    // Check if user has active Pro subscription
    const { data: sub } = await adminClient
      .from('si_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (sub) {
      licenseType = 'unlimited';
      licenseText = UNLIMITED_LICENSE;
    }

    // Check if acquired via Launch Edition (bundle purchase)
    if (purchase.source === 'launch_edition' || purchase.source === 'bundle') {
      licenseType = 'unlimited';
      licenseText = UNLIMITED_LICENSE;
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedUrl, error: urlError } = await adminClient
      .storage
      .from('pack-files')
      .createSignedUrl(product.css_filename, 3600);

    if (urlError || !signedUrl) {
      return new Response(JSON.stringify({ error: 'Failed to generate download link' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      url: signedUrl.signedUrl,
      license: {
        type: licenseType,
        text: licenseText,
      },
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Download error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
