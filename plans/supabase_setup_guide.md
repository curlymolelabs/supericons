# Supabase Setup Guide: Premium Icon Storage

Your Supabase project: `https://kcjmkakdhsqplvasgkjv.supabase.co`

## Step 1: Create the Storage Bucket

1. Go to **Supabase Dashboard** > your project > **Storage** (left sidebar)
2. Click **New Bucket**
3. Settings:
   - **Name:** `premium-icons`
   - **Public:** OFF (unchecked, this must be private)
   - **File size limit:** 50KB (icons are tiny)
   - **Allowed MIME types:** `image/svg+xml, text/css`
4. Click **Create bucket**

## Step 2: Upload Files

Inside the `premium-icons` bucket, create folders and upload files for each collection.
The folder structure must match how the Edge Function looks them up: `{slug}/{filename}`

### Folder structure to create:

```
premium-icons/
  ai-agentic/
    ai-agentic.css
    agent.svg
    agent-group.svg
    agent-loop.svg
    ... (all 50 SVGs)
  data-charts/
    data-charts.css
    ... (all 50 SVGs)
  ecommerce/
    e-commerce.css          <-- note: filename differs from slug
    shopping-cart.svg
    ... (all 50 SVGs)
  media-playback/
    media-playback.css
    ... (all 50 SVGs)
  navigation-menus/
    navigation-menu.css     <-- note: filename differs from slug
    menu.svg
    ... (all 50 SVGs)
  security-auth/
    security-auth.css
    ... (all 50 SVGs)
  social-communication/
    social-communication.css
    ... (all 50 SVGs)
  status-feedback/
    status-feedback.css
    ... (all 50 SVGs + any extra CSS files)
```

### How to upload:

For each collection:
1. Click into the `premium-icons` bucket
2. Click **Create folder** > type the slug (e.g., `ai-agentic`)
3. Click into that folder
4. Click **Upload files** > select ALL files from the local folder:
   `public/packs/ai-agentic/` (50 SVGs + 1 CSS)
5. Repeat for all 8 collections

### Local file locations:

| Collection | Local path | Files |
|-----------|-----------|-------|
| ai-agentic | `public/packs/ai-agentic/` | 50 SVGs + `ai-agentic.css` |
| data-charts | `public/packs/data-charts/` | 50 SVGs + `data-charts.css` |
| ecommerce | `public/packs/ecommerce/` | 50 SVGs + `e-commerce.css` |
| media-playback | `public/packs/media-playback/` | 50 SVGs + `media-playback.css` |
| navigation-menus | `public/packs/navigation-menus/` | 50 SVGs + `navigation-menu.css` |
| security-auth | `public/packs/security-auth/` | 50 SVGs + `security-auth.css` |
| social-communication | `public/packs/social-communication/` | 50 SVGs + `social-communication.css` |
| status-feedback | `public/packs/status-feedback/` | 50 SVGs + `status-feedback.css` (+ 2 extra CSS) |

**Total: ~400 SVGs + 8 CSS files across 8 folders**

## Step 3: Deploy the Edge Function

### Option A: Install Supabase CLI (recommended)

```powershell
# Install via npm
npm install -g supabase

# Login
supabase login

# Link to your project
cd supericons
supabase link --project-ref kcjmkakdhsqplvasgkjv

# Deploy the function
supabase functions deploy serve-premium-asset --no-verify-jwt
```

The `--no-verify-jwt` flag is needed because the function handles its own JWT
verification (it needs to accept both authenticated and anonymous requests).

### Option B: Deploy from Dashboard

1. Go to **Edge Functions** in the Supabase dashboard
2. Click **New Function**
3. Name: `serve-premium-asset`
4. Paste the contents of `supabase/functions/serve-premium-asset/index.ts`
5. Click **Deploy**
6. After deployment, go to the function settings and disable **JWT Verification**
   (the function handles auth internally)

## Step 4: Verify

### Test 1: Edge Function responds

Open in browser (should return 400, missing params):
```
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/serve-premium-asset
```

### Test 2: Asset retrieval works

Open in browser (should return the CSS file):
```
https://kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/serve-premium-asset?slug=ai-agentic&file=ai-agentic.css
```

### Test 3: Full integration

1. Run the app locally: `npm run dev`
2. Navigate to Store > Collections > Agentic AI
3. Icons should load (via Edge Function, not local files)
4. Check browser Network tab: requests should go to
   `kcjmkakdhsqplvasgkjv.supabase.co/functions/v1/serve-premium-asset?...`

## Step 5: Remove Public Files (after verification)

Once the Edge Function serves all assets correctly, delete the premium files
from the public directory:

```powershell
# ONLY after verifying Edge Function works
Remove-Item -Recurse public/packs/ai-agentic/*.svg
Remove-Item -Recurse public/packs/ai-agentic/*.css
# ... repeat for all 8 collections
```

Keep the `manifest.json` (with icon names/metadata) but remove the actual
SVG/CSS files. Non-purchasers still need icon names for the grid.

## Troubleshooting

### CORS errors
The Edge Function includes `Access-Control-Allow-Origin: *`.
If you still see CORS errors, check that the function is deployed and
JWT verification is disabled.

### 404 on asset fetch
Verify the file exists in the Storage bucket at the exact path:
`premium-icons/{slug}/{filename}`

### Auth issues
The function creates a user-scoped Supabase client using the Authorization
header. If purchase check fails, verify:
- `si_products` has a row with matching `slug`
- `si_purchases` has a row linking `user_id` to `product_id`
