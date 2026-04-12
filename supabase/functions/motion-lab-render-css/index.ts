import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import { buildJsonResponse, motionLabCorsHeaders } from '../_shared/motion-lab/cors.ts';
import { buildMotionLabErrorResponse } from '../_shared/motion-lab/errors.ts';
import { requireMotionLabSession } from '../_shared/motion-lab/auth.ts';
import { buildHostedCssRenderResponse, parseHostedCssRequest } from '../_shared/motion-lab/runtime.ts';
import { enforceMotionLabRateLimit } from '../_shared/motion-lab/rate-limit.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: motionLabCorsHeaders });
  }

  if (req.method !== 'POST') {
    return buildJsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const session = await requireMotionLabSession(req);
    await enforceMotionLabRateLimit({
      bucket: 'motion-lab-render-css',
      subject: session.userId,
    });
    const body = await req.json();
    const request = parseHostedCssRequest(body);
    return buildJsonResponse(buildHostedCssRenderResponse(request));
  } catch (error) {
    return buildMotionLabErrorResponse(error);
  }
});
