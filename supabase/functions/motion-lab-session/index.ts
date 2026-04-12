import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

import { buildJsonResponse, motionLabCorsHeaders } from '../_shared/motion-lab/cors.ts';
import { buildMotionLabErrorResponse } from '../_shared/motion-lab/errors.ts';
import { mintMotionLabSession, validateMotionLabApiKeyHash } from '../_shared/motion-lab/auth.ts';
import { enforceMotionLabRateLimit } from '../_shared/motion-lab/rate-limit.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: motionLabCorsHeaders });
  }

  if (req.method !== 'POST') {
    return buildJsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json();
    const apiKeyHash = typeof body?.api_key_hash === 'string' ? body.api_key_hash : '';
    await enforceMotionLabRateLimit({
      bucket: 'motion-lab-session',
      subject: apiKeyHash,
    });
    const { userId, isPro } = await validateMotionLabApiKeyHash(apiKeyHash);
    const session = await mintMotionLabSession(userId);

    return buildJsonResponse({
      session_token: session.sessionToken,
      token_type: 'Bearer',
      expires_at: session.expiresAt,
      user: {
        user_id: userId,
        is_pro: isPro,
      },
      capabilities: {
        motion_lab: true,
      },
    });
  } catch (error) {
    return buildMotionLabErrorResponse(error);
  }
});
