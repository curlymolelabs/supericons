export const X402_SINGLE_ICON_CONFIG = Object.freeze({
  packSlug: "agentic-motion",
  iconName: "x402-pay",
  displayName: "x402 Pay",
  priceUsd: "1.00",
  currency: "USDC",
  testnetNetwork: "eip155:84532",
  mainnetNetwork: "eip155:8453",
  testnetFacilitatorUrl: "https://x402.org/facilitator",
  cdpFacilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
  supportEmail: "support@supericons.dev",
  redeliveryWindowSeconds: 30 * 60,
  assetPath: "agentic-motion/x402-pay.svg",
  // Source stylesheet used to extract only the purchased icon's scoped CSS.
  // The x402 endpoint must never serve this full pack stylesheet raw.
  cssPath: "agentic-motion/agentic-motion.css",
  licenseUrlPath: "/legal/supericons-single-icon-license",
} as const);

export type X402SingleIconConfig = typeof X402_SINGLE_ICON_CONFIG;
