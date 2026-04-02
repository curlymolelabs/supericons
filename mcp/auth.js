/**
 * SuperIcons MCP: API Key Authentication
 * Validates SUPERICONS_API_KEY env var via the validate-mcp-key Edge Function.
 * Returns auth tier: anonymous, authenticated (free), pack buyer, or Pro.
 */

const SUPABASE_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_slbcWcnrQ45rkJPONFD7pw_hW0WpvBi';

/**
 * Validate API key and determine auth tier.
 * @returns {{ authenticated: boolean, isPro: boolean, purchasedSlugs: string[], userId: string|null, error: string|null }}
 */
export async function validateApiKey() {
  const apiKey = process.env.SUPERICONS_API_KEY;

  // No key: anonymous tier (free icons only)
  if (!apiKey) {
    return { authenticated: false, isPro: false, purchasedSlugs: [], userId: null, error: null };
  }

  try {
    // SHA-256 hash the key (never send the raw key over the network)
    const { createHash } = await import('crypto');
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Validate via Edge Function (server-side, bypasses RLS)
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/validate-mcp-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
        },
        body: JSON.stringify({ key_hash: keyHash }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return { authenticated: false, isPro: false, purchasedSlugs: [], userId: null, error: `Validation failed (${res.status}): ${body}` };
    }

    const result = await res.json();
    return {
      authenticated: result.authenticated ?? false,
      isPro: result.isPro ?? false,
      purchasedSlugs: result.purchasedSlugs ?? [],
      userId: result.userId ?? null,
      error: result.error ?? null,
    };
  } catch (err) {
    console.error('[Auth] API key validation failed:', err.message);
    return { authenticated: false, isPro: false, purchasedSlugs: [], userId: null, error: err.message };
  }
}
