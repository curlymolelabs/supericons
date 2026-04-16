# Supericons Launch Checklist

> [!NOTE]
> This is the raw historical superset checklist.
>
> For the current launch-ready status and the real outstanding items, use:
> - [launch-checklist-status.md](./launch-checklist-status.md)
> - [launch-jtbd.md](./launch-jtbd.md)

## 1. Domain + DNS (Cloudflare)

- [ ] Register/transfer `supericons.dev` to Cloudflare (if not done)
- [ ] Set Cloudflare as the authoritative DNS for `supericons.dev`
- [ ] Add DNS records:
  - [ ] `supericons.dev` (root) CNAME to Netlify site (e.g., `supericons-prod.netlify.app`)
  - [ ] `www.supericons.dev` CNAME to Netlify site (redirect to root)
  - [ ] `api.supericons.dev` CNAME to Railway service (if using a subdomain for API/services)
- [ ] Set SSL/TLS mode to **Full (Strict)** in Cloudflare
- [ ] Enable HSTS in Cloudflare SSL/TLS > Edge Certificates
- [ ] Enable **Always Use HTTPS**
- [ ] Enable **Auto Minify** (optional, Vite already handles this)
- [ ] Set caching rules:
  - [ ] Browser cache TTL for static assets: 1 month
  - [ ] Bypass cache for `/functions/` or API paths
- [ ] Verify domain propagation with `dig supericons.dev` or `nslookup`

## 2. Frontend Hosting (Netlify)

- [ ] Create Netlify site linked to the Git repo (or manual deploy of `dist/`)
- [ ] Set build command: `npm run build`
- [ ] Set publish directory: `dist`
- [ ] Add custom domain `supericons.dev` in Netlify > Domain Management
- [ ] Verify DNS challenge and SSL provisioning completes
- [ ] Add `_redirects` or `netlify.toml` for SPA routing:
  ```toml
  # netlify.toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```
- [ ] Set environment variables in Netlify (if any build-time env vars needed)
- [ ] Enable **Asset Optimization** (optional)
- [ ] Test production build: visit `https://supericons.dev`
- [ ] Verify all pages load: landing, app, pricing, MCP docs, terms
- [ ] Verify static assets: favicon, OG image, fonts

## 3. Backend Services (Railway)

- [ ] Create Railway project for any backend services
- [ ] Deploy MCP-related or backend services (if applicable)
- [ ] Configure custom domain (e.g., `api.supericons.dev`) in Railway
- [ ] Set environment variables:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (name only, never the value)
  - [ ] `STRIPE_SECRET_KEY` (name only)
  - [ ] `STRIPE_WEBHOOK_SECRET` (name only)
- [ ] Verify Railway health check endpoint

## 4. Database + Auth (Supabase)

### 4a. Database
- [ ] Verify all migrations are applied: `supabase db push` or check dashboard
- [ ] Tables to verify exist:
  - [ ] `si_subscriptions` (Pro subscription tracking)
  - [ ] Any purchases/downloads tracking tables
  - [ ] API keys table (for MCP auth)
- [ ] RLS policies enabled on all public-facing tables
- [ ] Run security advisor: check for missing RLS

### 4b. Auth Configuration
- [ ] Verify Site URL is set to `https://supericons.dev` in Supabase > Auth > URL Configuration
- [ ] Add redirect URLs:
  - [ ] `https://supericons.dev`
  - [ ] `https://supericons.dev/**` (for OAuth callback)
  - [ ] `http://localhost:5173` (for dev, keep or remove post-launch)
- [ ] Verify email templates (Supabase > Auth > Email Templates):
  - [ ] Confirmation email: branded Supericons template
  - [ ] Password reset email: branded template
  - [ ] Magic link email (if used): branded template
- [ ] Test sign-up flow end-to-end
- [ ] Test sign-in flow end-to-end
- [ ] Test password reset flow

### 4c. Resend (Email Provider)
- [ ] Domain verified in Resend (`supericons.dev` or `curlymolelabs.com`)
- [ ] Add DNS records for Resend in Cloudflare:
  - [ ] SPF record (TXT)
  - [ ] DKIM record (CNAME)
  - [ ] Optional: DMARC record
- [ ] Resend API key configured in Supabase > Auth > SMTP Settings:
  - [ ] SMTP host: `smtp.resend.com`
  - [ ] SMTP port: `465`
  - [ ] SMTP user: `resend`
  - [ ] SMTP pass: Resend API key (name only)
  - [ ] Sender name: `Supericons`
  - [ ] Sender email: `noreply@supericons.dev` (or `noreply@curlymolelabs.com`)
- [ ] Send test email to verify delivery
- [ ] Check email does not land in spam

### 4d. Google OAuth
- [ ] Google Cloud Console > APIs & Services > Credentials
- [ ] Create or update OAuth 2.0 Client ID (Web application)
- [ ] Set authorized JavaScript origins:
  - [ ] `https://supericons.dev`
  - [ ] `http://localhost:5173` (dev)
- [ ] Set authorized redirect URIs:
  - [ ] `https://kcjmkakdhsqplvasgkjv.supabase.co/auth/v1/callback`
- [ ] Configure OAuth Consent Screen:
  - [ ] App name: `Supericons`
  - [ ] User support email: `hello@supericons.dev`
  - [ ] App logo: upload Supericons logo
  - [ ] App homepage: `https://supericons.dev`
  - [ ] Privacy policy: `https://supericons.dev` (link to terms page)
  - [ ] Terms of service: `https://supericons.dev` (link to terms page)
  - [ ] Developer contact: `hello@supericons.dev`
- [ ] Scopes: `email`, `profile`, `openid` (defaults, no additional needed)
- [ ] Publishing status: set to **Production** (not Testing) for public access
- [ ] Copy Client ID and Client Secret to Supabase > Auth > Providers > Google
- [ ] Test Google OAuth sign-in end-to-end

### 4e. Edge Functions
- [ ] Deploy all edge functions to production:
  - [ ] `api-keys`
  - [ ] `claim-status`
  - [ ] `create-checkout`
  - [ ] `create-portal`
  - [ ] `download-pack`
  - [ ] `redeem-credit`
  - [ ] `serve-material-snapshot`
  - [ ] `serve-premium-asset`
  - [ ] `stripe-webhook`
  - [ ] `validate-mcp-key`
- [ ] Set edge function secrets:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] Any other edge function-specific secrets
- [ ] Test critical edge functions:
  - [ ] `create-checkout`: creates Stripe session
  - [ ] `stripe-webhook`: handles payment events
  - [ ] `download-pack`: serves premium assets to authorized users
  - [ ] `validate-mcp-key`: authenticates MCP server requests

## 5. Payments (Stripe)

- [ ] Stripe account is in **Live Mode** (not test mode)
- [ ] Product description updated (see `stripe-description.md`)
- [ ] Products created:
  - [ ] Pro subscription product (monthly recurring)
  - [ ] Individual collection products (one-time)
- [ ] Prices attached to each product
- [ ] Stripe webhook endpoint configured:
  - [ ] URL: `https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/stripe-webhook`
  - [ ] Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Webhook signing secret saved in Supabase edge function secrets
- [ ] Customer portal enabled and configured:
  - [ ] Cancellation allowed
  - [ ] Plan switching (if multiple tiers)
  - [ ] Invoice history visible
- [ ] Test checkout flow end-to-end (use Stripe test mode first, then live)
- [ ] Verify subscription status syncs to `si_subscriptions` table

## 6. Analytics + Monitoring

- [ ] Umami analytics verified (script tag in `index.html`, website ID correct)
- [ ] Verify page views are being tracked
- [ ] Set up uptime monitoring (optional: UptimeRobot, Betterstack)

## 7. SEO + Social

- [ ] OG image deployed at `https://supericons.dev/og-image.png`
- [ ] Verify meta tags render correctly (use https://metatags.io or similar)
- [ ] Submit sitemap to Google Search Console (if applicable)
- [ ] Test Twitter card preview
- [ ] Test LinkedIn/Facebook share preview

## 8. Legal

- [ ] Terms of Service page accessible
- [ ] Privacy Policy page accessible (if separate)
- [ ] Cookie consent (if required by jurisdiction)

## 9. MCP Server (npm)

- [ ] `supericons-mcp` published to npm
- [ ] `npx -y supericons-mcp` runs correctly
- [ ] MCP docs page at `/mcp/index.html` is accurate
- [ ] Setup guides for Claude Code, Codex, Cursor, etc. are up to date

## 10. Pre-launch Smoke Test

- [ ] Fresh browser (incognito): load `https://supericons.dev`
- [ ] Landing page renders correctly with icon rain effect
- [ ] Click "Start searching": app loads, icons appear
- [ ] Search works (e.g., "heart", "download", "github")
- [ ] Customize panel works (color, size, stroke)
- [ ] Export works (SVG, PNG, React copy)
- [ ] Sign up with email: receive confirmation email
- [ ] Sign in with Google: redirects correctly, avatar appears
- [ ] Visit pricing page: all tiers display
- [ ] Purchase a collection: Stripe checkout opens
- [ ] Pro subscription: Stripe checkout opens, status syncs
- [ ] Premium collection: icons display with animations
- [ ] MCP: `npx -y supericons-mcp` works, search returns results
- [ ] Mobile responsive: test on phone-sized viewport
- [ ] Dark/light theme toggle works
- [ ] Footer links work (Terms, Pricing, MCP, Contact, GitHub)
