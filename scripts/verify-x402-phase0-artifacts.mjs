import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const files = {
  prd: 'docs/supericons-x402-single-icon-payment-prd-2026-07-06.md',
  spike: 'docs/x402-phase-0-technical-spike-2026-07-06.md',
  license: 'docs/legal/supericons-single-icon-license-draft-2026-07-06.md',
  config: 'supabase/functions/_shared/x402-single-icon-config.ts',
  supabaseConfig: 'supabase/config.toml',
  migration: 'supabase/migrations/20260706_x402_single_icon_payments.sql',
  visual: 'docs/assets/x402-single-icon-payment/x402-single-icon-payment-flow-concept.png',
};

function readRequired(label, relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`${label} missing: ${relativePath}`);
  }
  if (relativePath.endsWith('.png')) {
    return '';
  }
  return readFileSync(absolutePath, 'utf8');
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`${label} missing expected text: ${expected}`);
  }
}

function assertMatches(label, text, pattern) {
  if (!pattern.test(text)) {
    throw new Error(`${label} missing expected pattern: ${pattern}`);
  }
}

console.log('[x402-phase0] Verifying Phase 0 artifacts');

const prd = readRequired('PRD', files.prd);
const spike = readRequired('Phase 0 spike report', files.spike);
const license = readRequired('License draft', files.license);
const config = readRequired('Shared x402 config', files.config);
const supabaseConfig = readRequired('Supabase config', files.supabaseConfig);
const migration = readRequired('Migration draft', files.migration);
readRequired('Visual concept', files.visual);

assertIncludes('PRD', prd, 'Draft v3');
assertIncludes('PRD', prd, 'error-contract');
assertIncludes('PRD', prd, 'support contact for settlement disputes');
assertMatches(
  'PRD signed payload concurrency index',
  prd,
  /status in \('settlement_pending', 'settled', 'delivery_failed', 'redelivered'\)/,
);

assertIncludes('Phase 0 spike report', spike, 'PAYMENT-SIGNATURE');
assertIncludes('Phase 0 spike report', spike, '@x402/core@2.17.0');
assertIncludes('Phase 0 spike report', spike, 'eip155:84532');
assertIncludes('Phase 0 spike report', spike, 'support@supericons.dev');

assertIncludes('License draft', license, 'not legal advice');
assertIncludes('License draft', license, 'agent');
assertIncludes('License draft', license, 'wallet');
assertIncludes('License draft', license, 'support@supericons.dev');

assertIncludes('Shared x402 config', config, 'agentic-motion');
assertIncludes('Shared x402 config', config, 'x402-pay');
assertIncludes('Shared x402 config', config, '1.00');
assertIncludes('Shared x402 config', config, 'eip155:84532');
assertIncludes('Shared x402 config', config, 'https://x402.org/facilitator');
assertIncludes('Shared x402 config', config, 'must never serve this full pack stylesheet raw');

assertIncludes('Supabase config', supabaseConfig, '[functions.x402-premium-icon]');
assertMatches('Supabase config', supabaseConfig, /\[functions\.x402-premium-icon\]\s+verify_jwt = false/);

assertIncludes('Migration draft', migration, 'enable row level security');
assertIncludes('Migration draft', migration, 'si_x402_icon_payments_signed_payload_uidx');
assertIncludes('Migration draft', migration, 'settlement_pending');
assertIncludes('Migration draft', migration, 'si_x402_rate_limit_counters');
assertIncludes('Migration draft', migration, 'redelivery_expires_at');
assertIncludes('Migration draft', migration, 'transaction_hash');
assertIncludes('Migration draft', migration, "'duplicate'");

console.log('[x402-phase0] PASS');
