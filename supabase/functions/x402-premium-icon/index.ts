// Supericons: x402 single-icon testnet delivery
// Supabase Edge Function (Deno)
//
// GET /functions/v1/x402-premium-icon?pack=agentic-motion&icon=x402-pay
//
// Contract:
// - Testnet-only beta endpoint for one hardcoded Agentic Motion icon.
// - Unpaid requests receive x402 v2 HTTP 402 payment terms.
// - Signed x402 payment payloads are locked by hash before facilitator work.
// - Settled payments can redeliver the same icon for a short retry window.

import { createClient } from "@supabase/supabase-js";
import {
  HTTPFacilitatorClient,
  x402HTTPResourceServer,
  x402ResourceServer,
} from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { serve } from "std/http/server.ts";
import { X402_SINGLE_ICON_CONFIG } from "../_shared/x402-single-icon-config.ts";

type ChargedState = boolean | "unknown";

type AuditRow = {
  id: string;
  request_id: string;
  updated_at?: string;
  pack_slug: string;
  icon_name: string;
  resource_path: string;
  network: string;
  status: string;
  charged: boolean;
  payer_address: string | null;
  payment_identifier: string | null;
  settlement_reference: string | null;
  transaction_hash: string | null;
  signed_payment_payload_hash: string | null;
  payment_response_header: string | null;
  redelivery_expires_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://supericons.dev",
  "https://www.supericons.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
];

const CORS_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type, payment-signature, payment-required, payment-response";
const CORS_EXPOSE_HEADERS = "PAYMENT-REQUIRED, PAYMENT-RESPONSE";

let httpServerPromise: Promise<x402HTTPResourceServer> | null = null;

function env(name: string, fallback = "") {
  return Deno.env.get(name)?.trim() || fallback;
}

function configuredAllowedOrigins() {
  const configured = env("X402_ALLOWED_ORIGINS")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function corsOriginForRequest(req: Request) {
  const origin = req.headers.get("Origin");
  if (!origin) return "";
  const allowedOrigins = configuredAllowedOrigins();
  if (allowedOrigins.includes("*")) return origin;
  return allowedOrigins.includes(origin) ? origin : "";
}

function isDisallowedCorsRequest(req: Request) {
  return Boolean(req.headers.get("Origin") && !corsOriginForRequest(req));
}

function corsHeadersForRequest(req: Request) {
  const allowedOrigins = configuredAllowedOrigins();
  const fallbackOrigin = allowedOrigins.includes("*") ? "*" : allowedOrigins[0];
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": fallbackOrigin,
    "Access-Control-Allow-Headers": CORS_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Expose-Headers": CORS_EXPOSE_HEADERS,
    "Vary": "Origin",
  };
  const origin = corsOriginForRequest(req);
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonHeadersForRequest(req: Request) {
  return {
    ...corsHeadersForRequest(req),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store",
  };
}

function supportEmail() {
  return env("X402_SUPPORT_EMAIL", X402_SINGLE_ICON_CONFIG.supportEmail);
}

function publicResourceUrl() {
  const configuredUrl = env("X402_PUBLIC_RESOURCE_URL");
  if (configuredUrl) return configuredUrl;

  const configuredBase = env("X402_PUBLIC_RESOURCE_BASE_URL");
  const supabaseUrl = env("SUPABASE_URL");
  const baseUrl = configuredBase ||
    (supabaseUrl
      ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/x402-premium-icon`
      : "http://127.0.0.1:54321/functions/v1/x402-premium-icon");

  const url = new URL(baseUrl);
  url.searchParams.set("pack", X402_SINGLE_ICON_CONFIG.packSlug);
  url.searchParams.set("icon", X402_SINGLE_ICON_CONFIG.iconName);
  return url.toString();
}

function requestId() {
  return crypto.randomUUID();
}

function jsonResponse(
  req: Request,
  status: number,
  code: string,
  message: string,
  charged: ChargedState,
  request_id: string,
  extra: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  return new Response(
    JSON.stringify({
      error: code,
      message,
      charged,
      request_id,
      support_email: supportEmail(),
      ...extra,
    }),
    {
      status,
      headers: {
        ...jsonHeadersForRequest(req),
        ...headers,
      },
    },
  );
}

function paidJsonResponse(
  req: Request,
  body: Record<string, unknown>,
  paymentResponseHeader?: string | null,
) {
  const headers: Record<string, string> = { ...jsonHeadersForRequest(req) };
  if (paymentResponseHeader) {
    headers["PAYMENT-RESPONSE"] = paymentResponseHeader;
  }
  return new Response(JSON.stringify(body), { status: 200, headers });
}

function responseFromInstructions(
  req: Request,
  instructions: { status: number; headers: Record<string, string>; body?: unknown; isHtml?: boolean },
) {
  const contentType = instructions.headers["Content-Type"] || instructions.headers["content-type"];
  const body = typeof instructions.body === "string"
    ? instructions.body
    : JSON.stringify(instructions.body ?? {});

  return new Response(body, {
    status: instructions.status,
    headers: {
      ...instructions.headers,
      ...corsHeadersForRequest(req),
      "Content-Type": contentType || "application/json; charset=utf-8",
    },
  });
}

function getPaymentHeader(req: Request) {
  return req.headers.get("PAYMENT-SIGNATURE") || req.headers.get("payment-signature") || "";
}

async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getPayerAddress(paymentPayload: unknown) {
  const payload = paymentPayload as {
    payload?: {
      authorization?: { from?: string };
      permit2Authorization?: { from?: string };
    };
  };
  return payload.payload?.authorization?.from || payload.payload?.permit2Authorization?.from || null;
}

function isTestWallet(address: string | null) {
  if (!address) return false;
  const testWallets = env("X402_TEST_WALLET_ADDRESSES")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return testWallets.includes(address.toLowerCase());
}

function parseQuery(req: Request) {
  const url = new URL(req.url);
  return {
    url,
    pack: url.searchParams.get("pack") || "",
    icon: url.searchParams.get("icon") || "",
  };
}

function isAllowedResource(pack: string, icon: string) {
  return pack === X402_SINGLE_ICON_CONFIG.packSlug && icon === X402_SINGLE_ICON_CONFIG.iconName;
}

function rowResourceMatches(row: AuditRow, pack: string, icon: string) {
  return row.pack_slug === pack && row.icon_name === icon;
}

function isRedeliveryOpen(row: AuditRow) {
  if (!row.redelivery_expires_at) return false;
  return new Date(row.redelivery_expires_at).getTime() > Date.now();
}

function adminClient() {
  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service configuration");
  }
  return createClient<Record<string, unknown>>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

type AdminSupabaseClient = ReturnType<typeof adminClient>;

async function getHttpServer() {
  if (!httpServerPromise) {
    httpServerPromise = (async () => {
      const receivingAddress = env("X402_RECEIVING_ADDRESS");
      if (!receivingAddress) {
        throw new Error("Missing X402_RECEIVING_ADDRESS");
      }

      const network = env("X402_NETWORK", X402_SINGLE_ICON_CONFIG.testnetNetwork);
      const facilitatorUrl = env("X402_FACILITATOR_URL", X402_SINGLE_ICON_CONFIG.testnetFacilitatorUrl);
      const price = env("X402_PRICE_USD", X402_SINGLE_ICON_CONFIG.priceUsd);

      const resourceServer = new x402ResourceServer(
        new HTTPFacilitatorClient({ url: facilitatorUrl }),
      );
      registerExactEvmScheme(resourceServer, { networks: [network as `${string}:${string}`] });

      const httpServer = new x402HTTPResourceServer(resourceServer, {
        "GET *": {
          accepts: {
            scheme: "exact",
            network: network as `${string}:${string}`,
            payTo: receivingAddress,
            price,
            maxTimeoutSeconds: 120,
          },
          resource: publicResourceUrl(),
          description: "Supericons single animated icon license",
          mimeType: "application/json",
          serviceName: "Supericons",
          tags: ["icon", "x402", "USDC"],
          unpaidResponseBody: () => ({
            contentType: "application/json; charset=utf-8",
            body: {
              error: "payment_required",
              message: "Payment is required to deliver this single animated icon.",
              charged: false,
              request_id: requestId(),
              support_email: supportEmail(),
            },
          }),
          settlementFailedResponseBody: (_context: unknown, failure: { errorMessage?: string; errorReason?: string }) => ({
            contentType: "application/json; charset=utf-8",
            body: {
              error: "payment_verification_failed",
              message: failure.errorMessage || failure.errorReason || "Payment could not be settled.",
              charged: false,
              request_id: requestId(),
              support_email: supportEmail(),
            },
          }),
        },
      });
      await httpServer.initialize();
      return httpServer;
    })();
  }
  return await httpServerPromise;
}

function httpAdapter(req: Request) {
  const url = new URL(req.url);
  return {
    getHeader: (name: string) => req.headers.get(name) ?? undefined,
    getMethod: () => req.method,
    getPath: () => url.pathname,
    getUrl: () => req.url,
    getAcceptHeader: () => req.headers.get("accept") || "",
    getUserAgent: () => req.headers.get("user-agent") || "",
    getQueryParams: () => Object.fromEntries(url.searchParams.entries()),
    getQueryParam: (name: string) => url.searchParams.get(name) ?? undefined,
  };
}

async function findAuditRow(client: AdminSupabaseClient, signedHash: string) {
  const table = client.from("si_x402_icon_payments") as any;
  const { data, error } = await table
    .select("*")
    .eq("signed_payment_payload_hash", signedHash)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] ?? null) as AuditRow | null;
}

async function insertPendingRow(
  client: AdminSupabaseClient,
  pack: string,
  icon: string,
  signedHash: string,
  request_id: string,
) {
  const now = new Date().toISOString();
  const table = client.from("si_x402_icon_payments") as any;
  const { data, error } = await table
    .insert({
      request_id,
      pack_slug: pack,
      icon_name: icon,
      resource_path: `${pack}/${icon}.svg`,
      price_amount: Number(X402_SINGLE_ICON_CONFIG.priceUsd),
      price_currency: X402_SINGLE_ICON_CONFIG.currency,
      network: env("X402_NETWORK", X402_SINGLE_ICON_CONFIG.testnetNetwork),
      status: "settlement_pending",
      charged: false,
      payment_identifier: signedHash,
      idempotency_key: signedHash,
      signed_payment_payload_hash: signedHash,
      facilitator_url: env("X402_FACILITATOR_URL", X402_SINGLE_ICON_CONFIG.testnetFacilitatorUrl),
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as AuditRow;
}

async function updateAuditRow(
  client: AdminSupabaseClient,
  id: string,
  patch: Record<string, unknown>,
) {
  const table = client.from("si_x402_icon_payments") as any;
  const { data, error } = await table
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as AuditRow;
}

function positiveIntEnv(name: string, fallback: number) {
  const value = Number.parseInt(env(name), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function requestIpMaterial(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return req.headers.get("cf-connecting-ip") ||
    forwarded ||
    req.headers.get("x-real-ip") ||
    "unknown";
}

async function enforceRateLimit(
  client: AdminSupabaseClient,
  req: Request,
  pack: string,
  icon: string,
  request_id: string,
) {
  if (env("X402_RATE_LIMIT_ENABLED", "1") === "0") return null;

  const windowSeconds = positiveIntEnv("X402_RATE_LIMIT_WINDOW_SECONDS", 60);
  const maxRequests = positiveIntEnv("X402_RATE_LIMIT_MAX_REQUESTS", 30);
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const bucketKey = await sha256Hex([
    "x402-premium-icon",
    requestIpMaterial(req),
    pack || "missing-pack",
    icon || "missing-icon",
  ].join("|"));

  const { data, error } = await (client as any).rpc("si_x402_increment_rate_limit", {
    p_bucket_key: bucketKey,
    p_window_start: windowStart,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("x402 rate-limit increment failed:", error);
    throw error;
  }

  const currentCount = Array.isArray(data)
    ? Number(data[0]?.si_x402_increment_rate_limit ?? data[0] ?? 0)
    : Number(data ?? 0);

  if (currentCount > maxRequests) {
    return jsonResponse(
      req,
      429,
      "rate_limited",
      "Too many x402 requests. Please retry after the current rate-limit window.",
      false,
      request_id,
      { retry_after_seconds: windowSeconds },
      { "Retry-After": String(windowSeconds) },
    );
  }

  return null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isLikelyFacilitatorUnavailable(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return [
    "facilitator",
    "fetch",
    "network",
    "connection",
    "timeout",
    "temporarily unavailable",
    "econn",
    "enotfound",
    "eai_again",
  ].some((needle) => message.includes(needle));
}

function isRetryableFacilitatorPending(row: AuditRow, pack: string, icon: string) {
  return row.status === "settlement_pending" &&
    row.last_error_code === "facilitator_unavailable" &&
    rowResourceMatches(row, pack, icon);
}

async function recordFacilitatorUnavailable(
  client: AdminSupabaseClient,
  row: AuditRow | null,
  error: unknown,
) {
  if (!row) return;
  await updateAuditRow(client, row.id, {
    status: "settlement_pending",
    last_error_code: "facilitator_unavailable",
    last_error_message: errorMessage(error),
  });
}

function facilitatorUnavailableResponse(
  req: Request,
  request_id: string,
  charged: ChargedState,
  row: AuditRow | null = null,
) {
  const extra = row?.payment_identifier ? { payment_identifier: row.payment_identifier } : {};
  return jsonResponse(
    req,
    503,
    "facilitator_unavailable",
    "The payment facilitator is temporarily unavailable. Retry with the same signed payment before creating a new payment.",
    charged,
    request_id,
    extra,
    { "Retry-After": "30" },
  );
}

function extractIconCss(bundleCss: string, svgMarkup: string) {
  const rootMatch = /class="([a-z0-9]+)"/.exec(svgMarkup || "");
  if (!bundleCss || !rootMatch) return "";
  const rootClass = rootMatch[1];

  const blocks = bundleCss.match(/[^{}]+\{[^{}]*\}|@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g) || [];
  const iconBlocks = blocks.filter((block) => !block.startsWith("@keyframes") && block.includes(`.${rootClass}`));
  const animationNames = new Set<string>();

  for (const block of iconBlocks) {
    for (const match of block.matchAll(/animation:\s*([a-z0-9]+)/g)) {
      animationNames.add(match[1]);
    }
  }

  const keyframeBlocks = blocks.filter((block) => {
    const name = /@keyframes\s+([a-z0-9]+)/.exec(block);
    return name && animationNames.has(name[1]);
  });

  return [...iconBlocks, ...keyframeBlocks].join("\n").trim();
}

async function downloadText(
  client: AdminSupabaseClient,
  storagePath: string,
) {
  const { data, error } = await client.storage
    .from("premium-icons")
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Storage asset missing: ${storagePath}`);
  }

  return await data.text();
}

async function buildDeliveryPayload(client: AdminSupabaseClient, row: AuditRow) {
  const [svg, bundleCss] = await Promise.all([
    downloadText(client, X402_SINGLE_ICON_CONFIG.assetPath),
    downloadText(client, X402_SINGLE_ICON_CONFIG.cssPath),
  ]);
  const css = extractIconCss(bundleCss, svg);
  if (!svg.includes("<svg") || !css) {
    throw new Error("Single-icon payload assembly failed");
  }

  return {
    pack: row.pack_slug,
    icon: row.icon_name,
    license: "single-icon-license",
    license_url: X402_SINGLE_ICON_CONFIG.licenseUrlPath,
    svg,
    css,
    receipt: {
      payment_identifier: row.payment_identifier,
      settlement_reference: row.settlement_reference,
      transaction_hash: row.transaction_hash,
      network: row.network,
      token: X402_SINGLE_ICON_CONFIG.currency,
      amount: X402_SINGLE_ICON_CONFIG.priceUsd,
    },
    redelivery: {
      available_until: row.redelivery_expires_at,
    },
  };
}

async function redeliverExisting(
  req: Request,
  client: AdminSupabaseClient,
  row: AuditRow,
  request_id: string,
) {
  if (!isRedeliveryOpen(row)) {
    return jsonResponse(
      req,
      410,
      "redelivery_window_expired",
      "This payment's redelivery window has expired.",
      true,
      request_id,
      {
        payment_identifier: row.payment_identifier,
        settlement_reference: row.settlement_reference,
      },
    );
  }

  try {
    const payload = await buildDeliveryPayload(client, row);
    await updateAuditRow(client, row.id, {
      status: "redelivered",
      delivered_at: new Date().toISOString(),
      delivery_attempts: 1,
    });
    return paidJsonResponse(req, payload, row.payment_response_header);
  } catch (error) {
    console.error("x402 redelivery failed:", error);
    await updateAuditRow(client, row.id, {
      status: "delivery_failed",
      last_error_code: "delivery_failed_after_settlement",
      last_error_message: error instanceof Error ? error.message : "Delivery failed",
    });
    return jsonResponse(
      req,
      503,
      "delivery_failed_after_settlement",
      "Payment was already settled, but the icon could not be delivered.",
      true,
      request_id,
      {
        payment_identifier: row.payment_identifier,
        settlement_reference: row.settlement_reference,
      },
    );
  }
}

async function handleExistingPayment(
  req: Request,
  client: AdminSupabaseClient,
  row: AuditRow,
  pack: string,
  icon: string,
  request_id: string,
) {
  if (!rowResourceMatches(row, pack, icon)) {
    return jsonResponse(
      req,
      409,
      "payment_reused_for_different_resource",
      "This signed payment was already used for a different Supericons resource.",
      row.charged,
      request_id,
      {
        payment_identifier: row.payment_identifier,
        settlement_reference: row.settlement_reference,
      },
    );
  }

  if (row.status === "settlement_pending") {
    return jsonResponse(
      req,
      409,
      "payment_already_processing",
      "This signed payment is already being processed.",
      "unknown",
      request_id,
      {
        payment_identifier: row.payment_identifier,
      },
    );
  }

  if (["settled", "redelivered", "delivery_failed"].includes(row.status)) {
    return await redeliverExisting(req, client, row, request_id);
  }

  return jsonResponse(
    req,
    402,
    "payment_verification_failed",
    row.last_error_message || "This signed payment did not verify.",
    false,
    request_id,
    {
      payment_identifier: row.payment_identifier,
    },
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    if (isDisallowedCorsRequest(req)) {
      return jsonResponse(
        req,
        403,
        "invalid_request",
        "This origin is not allowed to call the x402 endpoint.",
        false,
        requestId(),
      );
    }
    return new Response("ok", { headers: corsHeadersForRequest(req) });
  }

  const request_id = requestId();

  try {
    if (isDisallowedCorsRequest(req)) {
      return jsonResponse(
        req,
        403,
        "invalid_request",
        "This origin is not allowed to call the x402 endpoint.",
        false,
        request_id,
      );
    }

    if (req.method !== "GET") {
      return jsonResponse(req, 405, "invalid_request", "Only GET is supported.", false, request_id);
    }

    const { url, pack, icon } = parseQuery(req);
    const paymentHeader = getPaymentHeader(req);
    const client = adminClient();
    const signedHash = paymentHeader ? await sha256Hex(paymentHeader.trim()) : "";
    const rateLimitResponse = await enforceRateLimit(client, req, pack, icon, request_id);
    if (rateLimitResponse) return rateLimitResponse;

    if (!isAllowedResource(pack, icon)) {
      if (signedHash) {
        const existing = await findAuditRow(client, signedHash);
        if (existing) {
          return await handleExistingPayment(req, client, existing, pack, icon, request_id);
        }
      }
      return jsonResponse(
        req,
        400,
        "invalid_pack_or_icon",
        "This x402 beta only supports agentic-motion/x402-pay.",
        false,
        request_id,
      );
    }

    let pendingRow: AuditRow | null = null;
    if (signedHash) {
      const existing = await findAuditRow(client, signedHash);
      if (existing) {
        if (isRetryableFacilitatorPending(existing, pack, icon)) {
          pendingRow = existing;
        } else {
          return await handleExistingPayment(req, client, existing, pack, icon, request_id);
        }
      }

      if (!pendingRow) {
        try {
          pendingRow = await insertPendingRow(client, pack, icon, signedHash, request_id);
        } catch (error) {
          console.warn("x402 pending insert failed, checking for duplicate:", error);
          const duplicate = await findAuditRow(client, signedHash);
          if (duplicate) {
            return await handleExistingPayment(req, client, duplicate, pack, icon, request_id);
          }
          throw error;
        }
      }
    }

    let httpServer: x402HTTPResourceServer;
    try {
      httpServer = await getHttpServer();
    } catch (error) {
      if (isLikelyFacilitatorUnavailable(error)) {
        await recordFacilitatorUnavailable(client, pendingRow, error);
        return facilitatorUnavailableResponse(req, request_id, false, pendingRow);
      }
      throw error;
    }
    const adapter = httpAdapter(req);
    const context = {
      adapter,
      path: url.pathname,
      method: req.method,
      paymentHeader,
    };
    let paymentResult: Awaited<ReturnType<x402HTTPResourceServer["processHTTPRequest"]>>;
    try {
      paymentResult = await httpServer.processHTTPRequest(context);
    } catch (error) {
      if (isLikelyFacilitatorUnavailable(error)) {
        await recordFacilitatorUnavailable(client, pendingRow, error);
        return facilitatorUnavailableResponse(req, request_id, false, pendingRow);
      }
      throw error;
    }

    if (paymentResult.type === "payment-error") {
      if (pendingRow) {
        await updateAuditRow(client, pendingRow.id, {
          status: "verify_failed",
          last_error_code: "payment_verification_failed",
          last_error_message: "Payment verification failed.",
        });
      }
      return responseFromInstructions(req, paymentResult.response);
    }

    if (paymentResult.type !== "payment-verified") {
      return jsonResponse(req, 500, "internal_error", "Unexpected payment state.", "unknown", request_id);
    }

    if (!pendingRow) {
      return jsonResponse(req, 500, "internal_error", "Missing payment audit lock.", "unknown", request_id);
    }

    const payerAddress = getPayerAddress(paymentResult.paymentPayload);
    const stagedRow = await updateAuditRow(client, pendingRow.id, {
      payer_address: payerAddress,
      is_test_wallet: isTestWallet(payerAddress),
      last_error_code: null,
      last_error_message: null,
    });

    let deliveryPayload: Record<string, unknown>;
    try {
      deliveryPayload = await buildDeliveryPayload(client, stagedRow);
    } catch (error) {
      console.error("x402 pre-settlement asset assembly failed:", error);
      await paymentResult.cancellationDispatcher.cancel({
        reason: "handler_failed",
        error,
        responseStatus: 503,
      });
      await updateAuditRow(client, stagedRow.id, {
        status: "verify_failed",
        last_error_code: "asset_unavailable",
        last_error_message: error instanceof Error ? error.message : "Delivery preflight failed",
      });
      return jsonResponse(
        req,
        503,
        "asset_unavailable",
        "The icon could not be prepared, so settlement was not attempted.",
        false,
        request_id,
      );
    }

    let settlement: Awaited<ReturnType<x402HTTPResourceServer["processSettlement"]>>;
    try {
      settlement = await httpServer.processSettlement(
        paymentResult.paymentPayload,
        paymentResult.paymentRequirements,
        paymentResult.declaredExtensions,
        { request: context },
      );
    } catch (error) {
      if (isLikelyFacilitatorUnavailable(error)) {
        await recordFacilitatorUnavailable(client, stagedRow, error);
        return facilitatorUnavailableResponse(req, request_id, "unknown", stagedRow);
      }
      throw error;
    }

    if (!settlement.success) {
      await updateAuditRow(client, stagedRow.id, {
        status: "verify_failed",
        last_error_code: "payment_verification_failed",
        last_error_message: settlement.errorMessage || settlement.errorReason || "Settlement failed",
      });
      return jsonResponse(
        req,
        402,
        "payment_verification_failed",
        settlement.errorMessage || settlement.errorReason || "Payment could not be settled.",
        false,
        request_id,
        {},
        settlement.headers,
      );
    }

    const now = new Date();
    const redeliveryExpiresAt = new Date(
      now.getTime() + X402_SINGLE_ICON_CONFIG.redeliveryWindowSeconds * 1000,
    ).toISOString();
    const paymentResponseHeader = settlement.headers["PAYMENT-RESPONSE"];

    const settledRow = await updateAuditRow(client, stagedRow.id, {
      status: "settled",
      charged: true,
      paid_at: now.toISOString(),
      delivered_at: now.toISOString(),
      redelivery_expires_at: redeliveryExpiresAt,
      settlement_reference: settlement.transaction,
      transaction_hash: settlement.transaction,
      payment_response_header: paymentResponseHeader,
      facilitator_response: settlement,
      delivery_attempts: 1,
      last_error_code: null,
      last_error_message: null,
    });

    deliveryPayload = {
      ...deliveryPayload,
      receipt: {
        payment_identifier: settledRow.payment_identifier,
        settlement_reference: settledRow.settlement_reference,
        transaction_hash: settledRow.transaction_hash,
        network: settlement.network,
        token: X402_SINGLE_ICON_CONFIG.currency,
        amount: X402_SINGLE_ICON_CONFIG.priceUsd,
      },
      redelivery: {
        available_until: settledRow.redelivery_expires_at,
      },
    };

    return paidJsonResponse(req, deliveryPayload, paymentResponseHeader);
  } catch (error) {
    console.error("x402 premium icon error:", error);
    return jsonResponse(
      req,
      500,
      "internal_error",
      error instanceof Error ? error.message : "Unexpected server error.",
      "unknown",
      request_id,
    );
  }
});
