const DEFAULT_WEBHOOK_URL = 'https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/stripe-webhook';
const webhookUrl = process.env.STRIPE_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const timeoutMs = Number(process.env.STRIPE_WEBHOOK_GATEWAY_TIMEOUT_MS || 10000);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

let response;
let body = '';

try {
  response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
    signal: controller.signal,
  });
  body = await response.text();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[stripe-webhook-gateway] FAIL');
  console.error(`Endpoint: ${webhookUrl}`);
  console.error(`Request failed: ${message}`);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}

const expectedStatus = response.status === 400;
const expectedBody = body.includes('Invalid signature');

if (!expectedStatus || !expectedBody) {
  console.error('[stripe-webhook-gateway] FAIL');
  console.error('Expected an unsigned request to reach the function and fail Stripe signature validation.');
  console.error(`Endpoint: ${webhookUrl}`);
  console.error(`Observed: ${response.status} ${response.statusText}`);
  console.error(`Body: ${body}`);

  if (response.status === 401 || body.includes('UNAUTHORIZED_NO_AUTH_HEADER')) {
    console.error('Supabase is requiring an Authorization header. Turn off JWT verification for stripe-webhook.');
  }

  process.exit(1);
}

console.log('[stripe-webhook-gateway] PASS');
console.log(`Endpoint: ${webhookUrl}`);
console.log(`Observed: ${response.status} ${response.statusText}`);
console.log('The request reached stripe-webhook and was rejected by Stripe signature validation.');
