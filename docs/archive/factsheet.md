# Supericons Factsheet

## One-liner
20,000+ free SVG icons from 10 libraries, with AI search, framework export, and premium animated collections.

## Product
| | |
|---|---|
| **Name** | Supericons |
| **URL** | [supericons.dev](https://supericons.dev) |
| **Type** | Web application (SPA) |
| **Version** | 0.1.0 |
| **Made by** | [Curly Mole Labs](https://curlymolelabs.com) |
| **Contact** | hello@supericons.dev |

## What it does
Supericons aggregates 20,000+ open-source SVG icons from 10 popular libraries into one searchable interface. It provides AI-powered semantic search, real-time customization (color, size, stroke, containers), and one-click export as SVG, PNG, React, Vue, or Svelte components.

For AI-assisted development, Supericons ships a dedicated MCP server (`supericons-mcp`) that lets coding agents search and paste icons directly into code.

## Free Tier
- Access to 20,000+ icons from 10 open-source libraries
- AI semantic search across all libraries
- Real-time customization (color, size, stroke, fill, containers)
- Export as SVG, PNG, React, Vue, Svelte components
- Multi-select and batch ZIP export
- Favorites, recents, compare drawer
- Light/dark theme
- MCP server (search + retrieve)

## Pro Subscription
- All free features
- Premium animated icon collections (8 collections, CSS-only hover animations)
- Motion Lab: preview and export animation presets
- Converter: PNG-to-SVG conversion tool
- 30-day rolling collection claim (1 collection per billing cycle)
- Stripe Customer Portal for subscription management

## Premium Collections (also available individually)
- 8 curated animated icon packs
- CSS-only hover animations (no JavaScript dependencies)
- Protected delivery via Supabase Edge Functions
- DRM: individual SVGs served from secure storage, not bundled in build

## Icon Libraries (10)
| Library | Type |
|---|---|
| Lucide | General purpose |
| Tabler | General purpose |
| Phosphor | General purpose |
| Heroicons | General purpose |
| Bootstrap Icons | General purpose |
| Iconoir | General purpose |
| Ionicons | General purpose |
| Material Symbols | Variable (weight, fill, grade, optical size) |
| MingCute | Designer icons |
| Simple Icons | 3,400+ brand logos |

## MCP Server
- Package: `supericons-mcp` (npm)
- Install: `npx -y supericons-mcp`
- Compatible with: Claude Code, Codex, Cursor, OpenCode, Cline, GitHub Copilot, Windsurf, Antigravity
- Capabilities: search icons, get icon by ID, list libraries

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML/CSS/JS, Vite |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Email | Resend (transactional auth emails) |
| Database | Supabase (PostgreSQL) |
| Edge Functions | Supabase (Deno) |
| Payments | Stripe (subscriptions + one-time purchases) |
| Hosting | Netlify (frontend), Railway (services) |
| Domain | Cloudflare (DNS + CDN) |
| Analytics | Umami |
| MCP Server | Node.js (npm package) |

## Key Features
- **AI Semantic Search**: natural language queries across all icon libraries
- **Variable Font Axes**: full Material Symbols support (weight, fill, grade, optical size)
- **Framework Export**: copy-paste React, Vue, Svelte components
- **Container Preview**: preview icons inside buttons, cards, nav bars
- **Multi-select**: batch select, compare, and export as ZIP
- **Motion Lab**: preview and customize CSS animation presets
- **Converter**: drag-and-drop PNG-to-SVG conversion
- **MCP Integration**: AI coding agents can search and use icons without a browser

## Pricing
| Plan | Price | Includes |
|---|---|---|
| Free | $0 | 20,000+ icons, AI search, export, customization |
| Pro | Subscription (monthly) | All free + premium collections, Motion Lab, Converter, MCP |
| Collections | Individual purchase | Buy specific animated icon packs |
