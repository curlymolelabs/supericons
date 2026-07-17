import { x402Client } from "npm:@x402/core@2.17.0/client";
import {
  decodePaymentRequiredHeader,
  decodePaymentResponseHeader,
  encodePaymentSignatureHeader,
} from "npm:@x402/core@2.17.0/http";
import { registerExactEvmScheme } from "npm:@x402/evm@2.17.0/exact/client";
import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { privateKeyToAccount } from "npm:viem@2.54.5/accounts";

type CheckResult = {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  detail: string;
};

const results: CheckResult[] = [];

function record(name: string, status: CheckResult["status"], detail: string) {
  results.push({ name, status, detail });
  console.log(`[${status}] ${name}: ${detail}`);
}

function fail(message: string): never {
  throw new Error(message);
}

function loadEnvFile(path: string) {
  let text = "";
  try {
    text = Deno.readTextFileSync(path);
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (Deno.env.get(key)) continue;
    const value = rawValue.trim().replace(/^["']|["']$/g, "");
    Deno.env.set(key, value);
  }
}

function env(name: string, fallback = "") {
  return Deno.env.get(name)?.trim() || fallback;
}

function requiredEnv(name: string) {
  const value = env(name);
  if (!value) fail(`Missing ${name}`);
  return value;
}

function endpointUrl(icon = "x402-pay") {
  const base = env(
    "X402_TEST_ENDPOINT_URL",
    "http://127.0.0.1:54321/functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay",
  );
  const url = new URL(base);
  url.searchParams.set("pack", "agentic-motion");
  url.searchParams.set("icon", icon);
  return url.toString();
}

function verifyResourceUrl(paymentRequired: unknown) {
  const resourceUrl = (paymentRequired as { resource?: { url?: string } })?.resource?.url;
  if (!resourceUrl) fail("PAYMENT-REQUIRED resource.url is missing.");

  let parsed: URL;
  try {
    parsed = new URL(resourceUrl);
  } catch {
    fail(`PAYMENT-REQUIRED resource.url is not a valid URL: ${resourceUrl}`);
  }

  if (!parsed.pathname.endsWith("/functions/v1/x402-premium-icon")) {
    fail(`PAYMENT-REQUIRED resource.url has wrong path: ${resourceUrl}`);
  }
  if (parsed.searchParams.get("pack") !== "agentic-motion") {
    fail(`PAYMENT-REQUIRED resource.url has wrong pack query: ${resourceUrl}`);
  }
  if (parsed.searchParams.get("icon") !== "x402-pay") {
    fail(`PAYMENT-REQUIRED resource.url has wrong icon query: ${resourceUrl}`);
  }

  const expectedUrl = env("X402_EXPECTED_RESOURCE_URL");
  const requestUrl = new URL(endpointUrl());
  const shouldMatchRequestUrl = requestUrl.hostname.endsWith(".supabase.co");
  if (expectedUrl && resourceUrl !== expectedUrl) {
    fail(`PAYMENT-REQUIRED resource.url mismatch. Expected ${expectedUrl}, got ${resourceUrl}`);
  }
  if (shouldMatchRequestUrl && resourceUrl !== requestUrl.toString()) {
    fail(`PAYMENT-REQUIRED resource.url mismatch. Expected ${requestUrl.toString()}, got ${resourceUrl}`);
  }
  if ((expectedUrl || shouldMatchRequestUrl) && parsed.protocol !== "https:") {
    fail(`PAYMENT-REQUIRED resource.url must use https for hosted checks: ${resourceUrl}`);
  }

  record("resource-url", "PASS", "PAYMENT-REQUIRED resource.url points at the public x402 endpoint.");
}

function assertLocalOrExplicitRemoteMutation() {
  const supabaseUrl = requiredEnv("SUPABASE_URL");
  const allowHosted = env("X402_ALLOW_HOSTED_DB_MUTATION") === "1";
  if (supabaseUrl.includes(".supabase.co") && !allowHosted) {
    fail(
      "Refusing to mutate hosted Supabase DB. Use a local/test SUPABASE_URL or set X402_ALLOW_HOSTED_DB_MUTATION=1 deliberately.",
    );
  }
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function createPaymentHeader(paymentRequired: unknown) {
  const privateKey = requiredEnv("X402_TEST_BUYER_PRIVATE_KEY");
  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    fail("X402_TEST_BUYER_PRIVATE_KEY must be 0x plus 64 hex characters.");
  }
  const network = requiredEnv("X402_NETWORK");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = new x402Client();
  registerExactEvmScheme(client, {
    signer: account,
    networks: [network as `${string}:${string}`],
  });
  const payload = await client.createPaymentPayload(paymentRequired as never);
  return {
    payload,
    header: encodePaymentSignatureHeader(payload),
  };
}

async function getPaymentRequired() {
  const res = await fetch(endpointUrl(), {
    headers: {
      Accept: "application/json",
    },
  });
  const paymentRequiredHeader = res.headers.get("PAYMENT-REQUIRED");
  if (res.status !== 402) {
    const text = await res.text();
    fail(`Expected unpaid 402, got ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!paymentRequiredHeader) fail("Missing PAYMENT-REQUIRED header.");
  const paymentRequired = decodePaymentRequiredHeader(paymentRequiredHeader);
  verifyResourceUrl(paymentRequired);
  record("unpaid-402", "PASS", "Endpoint returned 402 with PAYMENT-REQUIRED.");
  return paymentRequired;
}

async function verifyEndpointDisabled() {
  const res = await fetch(endpointUrl(), {
    headers: {
      Accept: "application/json",
    },
  });
  const paymentRequiredHeader = res.headers.get("PAYMENT-REQUIRED");
  const body = await res.json().catch(() => null);

  if (res.status !== 503) {
    fail(`Expected disabled endpoint 503, got ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  if (paymentRequiredHeader) {
    fail("Disabled endpoint must not return PAYMENT-REQUIRED.");
  }
  if (body?.error !== "endpoint_disabled" || body?.charged !== false) {
    fail(`Disabled endpoint returned the wrong error contract: ${JSON.stringify(body).slice(0, 300)}`);
  }

  record("endpoint-disabled", "PASS", "Endpoint returned 503 without payment terms while disabled.");
}

async function verifyCorsDeny() {
  const res = await fetch(endpointUrl(), {
    method: "GET",
    headers: {
      Origin: "https://blocked.example",
      Accept: "application/json",
    },
  });
  if (res.status !== 403) {
    const text = await res.text();
    fail(`Expected disallowed browser origin 403, got ${res.status}: ${text.slice(0, 300)}`);
  }
  record("origin-allowlist", "PASS", "Disallowed browser origin is rejected before payment handling.");
}

async function paidRequest(paymentHeader: string, icon = "x402-pay") {
  return await fetch(endpointUrl(icon), {
    headers: {
      Accept: "application/json",
      "PAYMENT-SIGNATURE": paymentHeader,
    },
  });
}

async function updateRedeliveryExpiry(paymentHeader: string) {
  assertLocalOrExplicitRemoteMutation();

  const signedHash = await sha256Hex(paymentHeader.trim());
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

  const table = supabase.from("si_x402_icon_payments") as any;
  const { error } = await table
    .update({
      redelivery_expires_at: new Date(Date.now() - 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("signed_payment_payload_hash", signedHash);

  if (error) fail(`Failed to force redelivery expiry: ${error.message}`);
  record("force-redelivery-expiry", "PASS", "Updated audit row expiry in local/test DB.");
}

function redactLongHex(value: string) {
  return value.replace(/0x[0-9a-fA-F]{96,}/g, "0x[hex-redacted]");
}

async function auditDiagnosticForPayment(paymentHeader: string) {
  const signedHash = await sha256Hex(paymentHeader.trim());
  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const table = supabase.from("si_x402_icon_payments") as any;
  const { data, error } = await table
    .select("status, charged, last_error_code, last_error_message, settlement_reference, transaction_hash")
    .eq("signed_payment_payload_hash", signedHash)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return `audit lookup failed: ${error.message}`;
  const row = data?.[0];
  if (!row) return "audit row not found";
  return redactLongHex(JSON.stringify(row));
}

async function main() {
  loadEnvFile("supabase/.env.local");

  const challengeOnly = Deno.args.includes("--challenge-only");
  const expectDisabled = Deno.args.includes("--expect-disabled");
  console.log("[x402-paid-path] Endpoint:", endpointUrl());
  console.log(
    "[x402-paid-path] Mode:",
    expectDisabled ? "expect-disabled" : challengeOnly ? "challenge-only" : "full paid path",
  );

  if (!expectDisabled) {
    requiredEnv("X402_NETWORK");
    requiredEnv("X402_FACILITATOR_URL");
    requiredEnv("X402_RECEIVING_ADDRESS");
  }

  await verifyCorsDeny();
  if (expectDisabled) {
    await verifyEndpointDisabled();
    return;
  }

  const paymentRequired = await getPaymentRequired();
  if (challengeOnly) {
    record("paid-path", "SKIP", "Challenge-only mode does not sign or settle a payment.");
    return;
  }

  const { header } = await createPaymentHeader(paymentRequired);
  record("payment-signature", "PASS", "Created PAYMENT-SIGNATURE from local testnet wallet.");

  const paid = await paidRequest(header);
  const paymentResponseHeader = paid.headers.get("PAYMENT-RESPONSE");
  const paidBody = await paid.json().catch(() => null);
  if (paid.status !== 200) {
    const auditDiagnostic = await auditDiagnosticForPayment(header);
    fail(
      `Expected paid 200, got ${paid.status}: ${
        redactLongHex(JSON.stringify(paidBody)).slice(0, 500)
      }. Audit: ${auditDiagnostic.slice(0, 1000)}`,
    );
  }
  if (!paymentResponseHeader) fail("Paid response missing PAYMENT-RESPONSE header.");
  decodePaymentResponseHeader(paymentResponseHeader);
  if (!paidBody?.svg?.includes("<svg") || !paidBody?.css || paidBody?.icon !== "x402-pay") {
    fail("Paid response did not include the expected single-icon SVG/CSS payload.");
  }
  if (paidBody?.license_url !== "/terms/#single-icon-license") {
    fail(`Paid response returned the wrong license_url: ${paidBody?.license_url}`);
  }
  record("paid-delivery", "PASS", "Settlement returned one icon payload and PAYMENT-RESPONSE.");

  const replay = await paidRequest(header);
  if (replay.status !== 200) {
    const body = await replay.text();
    fail(`Expected redelivery 200, got ${replay.status}: ${body.slice(0, 500)}`);
  }
  record("redelivery", "PASS", "Same signed payment redelivered inside retry window.");

  const wrongIcon = await paidRequest(header, "tool-call");
  if (wrongIcon.status !== 409) {
    const body = await wrongIcon.text();
    fail(`Expected different-resource 409, got ${wrongIcon.status}: ${body.slice(0, 500)}`);
  }
  record("different-resource-replay", "PASS", "Same signed payment cannot buy a different icon.");

  await updateRedeliveryExpiry(header);
  const expiredReplay = await paidRequest(header);
  if (expiredReplay.status !== 410) {
    const body = await expiredReplay.text();
    fail(`Expected expired replay 410, got ${expiredReplay.status}: ${body.slice(0, 500)}`);
  }
  record("expired-redelivery", "PASS", "Expired retry window returned 410.");
}

try {
  await main();
  const failed = results.filter((result) => result.status === "FAIL");
  if (failed.length) Deno.exit(1);
} catch (error) {
  record("run", "FAIL", error instanceof Error ? error.message : String(error));
  Deno.exit(1);
}
