// Supericons: Serve Material Snapshot
// Supabase Edge Function (Deno)
// GET /functions/v1/serve-material-snapshot?icon=search&fill=0&wght=300&grad=0&opsz=24
//
// Behavior:
// 1. Normalize the requested axes to the export-safe matrix
// 2. Check the owned Supabase Storage cache
// 3. On miss, fetch the upstream Google snapshot server-side
// 4. Normalize and store it in the owned cache
// 5. Return the Supericons-owned SVG payload

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SOURCE = {
  baseUrl: 'https://raw.githubusercontent.com/google/material-design-icons/master/symbols/web',
  styleDir: 'materialsymbolsoutlined',
};

const STORAGE = {
  bucket: Deno.env.get('MATERIAL_SNAPSHOT_BUCKET') ?? 'material-icons',
  styleDir: 'materialsymbolsoutlined',
};

const SUPPORTED_AXES = {
  fill: [0, 1],
  wght: [100, 200, 300, 400, 500, 600, 700],
  grad: [-25, 0, 200],
  opsz: [20, 24, 40, 48],
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function nearest(value: number, supported: number[]) {
  let best = supported[0];
  let bestDistance = Math.abs(value - best);
  for (const candidate of supported) {
    const distance = Math.abs(value - candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function parseInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAxes(url: URL) {
  return {
    fill: nearest(clamp(parseInteger(url.searchParams.get('fill'), 0), 0, 1), SUPPORTED_AXES.fill),
    wght: nearest(clamp(parseInteger(url.searchParams.get('wght'), 300), 100, 700), SUPPORTED_AXES.wght),
    grad: nearest(clamp(parseInteger(url.searchParams.get('grad'), 0), -25, 200), SUPPORTED_AXES.grad),
    opsz: nearest(clamp(parseInteger(url.searchParams.get('opsz'), 24), 20, 48), SUPPORTED_AXES.opsz),
  };
}

function isValidIconId(iconId: string) {
  return /^[a-z0-9_]+$/.test(iconId);
}

function formatUpstreamGradToken(grad: number) {
  if (grad === 200) return 'grad200';
  if (grad === -25) return 'gradN25';
  return '';
}

function buildUpstreamFilename(iconId: string, axes: ReturnType<typeof normalizeAxes>) {
  let suffix = '';
  if (axes.wght !== 400) suffix += `wght${axes.wght}`;
  const gradToken = formatUpstreamGradToken(axes.grad);
  if (gradToken) suffix += gradToken;
  if (axes.fill === 1) suffix += 'fill1';
  return `${iconId}${suffix ? `_${suffix}` : ''}_${axes.opsz}px.svg`;
}

function buildUpstreamUrl(iconId: string, axes: ReturnType<typeof normalizeAxes>) {
  return `${SOURCE.baseUrl}/${encodeURIComponent(iconId)}/${SOURCE.styleDir}/${buildUpstreamFilename(iconId, axes)}`;
}

function buildStoragePath(iconId: string, axes: ReturnType<typeof normalizeAxes>) {
  const gradSegment = axes.grad < 0 ? `grad-neg${Math.abs(axes.grad)}` : `grad-${axes.grad}`;
  return [
    STORAGE.styleDir,
    iconId,
    `fill-${axes.fill}`,
    `wght-${axes.wght}`,
    gradSegment,
    `opsz-${axes.opsz}.svg`,
  ].join('/');
}

function normalizeSvg(rawSvg: string) {
  if (!rawSvg) return rawSvg;
  if (/\bfill="/.test(rawSvg)) return rawSvg;
  return rawSvg.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor">');
}

function svgResponse(svg: string, headers: Record<string, string>) {
  return new Response(svg, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      ...headers,
    },
  });
}

let bucketReady = false;

async function ensureBucket(admin: ReturnType<typeof createClient>) {
  if (bucketReady) return true;

  const existing = await admin.storage.getBucket(STORAGE.bucket);
  if (!existing.error && existing.data) {
    bucketReady = true;
    return true;
  }

  const created = await admin.storage.createBucket(STORAGE.bucket, {
    public: false,
    fileSizeLimit: '1MB',
    allowedMimeTypes: ['image/svg+xml'],
  });

  if (created.error) {
    const message = String(created.error.message || created.error);
    const duplicate =
      /already exists/i.test(message) ||
      /duplicate/i.test(message);

    if (!duplicate) {
      console.error('serve-material-snapshot ensureBucket error:', created.error);
      return false;
    }
  }

  bucketReady = true;
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const iconId = String(url.searchParams.get('icon') || '').trim();

    if (!iconId || !isValidIconId(iconId)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing icon parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const axes = normalizeAxes(url);
    const storagePath = buildStoragePath(iconId, axes);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    await ensureBucket(admin);

    const { data: cached, error: downloadError } = await admin
      .storage
      .from(STORAGE.bucket)
      .download(storagePath);

    if (!downloadError && cached) {
      return svgResponse(await cached.text(), {
        'X-Cache-Status': 'hit',
        'X-Material-Icon': iconId,
        'X-Material-Axes': JSON.stringify(axes),
      });
    }

    const upstreamResponse = await fetch(buildUpstreamUrl(iconId, axes));
    if (!upstreamResponse.ok) {
      return new Response(JSON.stringify({
        error: 'Snapshot not found upstream',
        icon: iconId,
        axes,
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const svg = normalizeSvg(await upstreamResponse.text());
    const upload = await admin.storage.from(STORAGE.bucket).upload(
      storagePath,
      new Blob([svg], { type: 'image/svg+xml; charset=utf-8' }),
      {
        contentType: 'image/svg+xml; charset=utf-8',
        upsert: true,
      },
    );

    if (upload.error) {
      console.error('serve-material-snapshot upload error:', upload.error);
      return svgResponse(svg, {
        'X-Cache-Status': 'miss-not-persisted',
        'X-Material-Icon': iconId,
        'X-Material-Axes': JSON.stringify(axes),
      });
    }

    return svgResponse(svg, {
      'X-Cache-Status': 'filled',
      'X-Material-Icon': iconId,
      'X-Material-Axes': JSON.stringify(axes),
    });
  } catch (err) {
    console.error('serve-material-snapshot error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
