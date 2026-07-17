# Supericons Logo Launch Profile Implementation PRD

Date: 2026-06-26 [SOURCE: docs/supericons-ai-logo-profile-search-prd-2026-06-26.md]

Status: Implemented launch-profile foundation for the 50-logo Agentic AI Tools pack. [SOURCE: public/registry/records.json] [SOURCE: mcp/public/registry-records.json] [SOURCE: public/icon-index.json]

## Problem

Supericons needs the 50 AI-tool logos to be searchable by brand name, alternate name, product context, and practical AI-builder intent. [SOURCE: docs/supericons-ai-logo-profile-search-prd-2026-06-26.md]

Supericons strategy says the product should help humans and AI agents find, choose, customize, and ship the right iconography for modern software. [SOURCE: strategy/latest-strategic-vision-2026-05-15.md]

The Supericons standard says a Supericon should be an asset plus metadata, variants, usage rules, and quality status. [SOURCE: docs/supericons-agentic-icon-library-standard-2026-06-16.md]

## Target User

Primary users are vibe coders, indie developers, design engineers, and AI coding agents working on AI app builders, agent consoles, SaaS tools, model pages, and launch sites. [SOURCE: docs/supericons-ai-logo-profile-search-prd-2026-06-26.md]

Primary user job: when building or generating an AI product UI, find the correct AI-tool logo by name or intent so the UI uses the right brand reference instead of a generic icon. [SOURCE: docs/supericons-ai-logo-profile-search-prd-2026-06-26.md]

Primary agent job: when selecting an icon through MCP or generated search data, use meaning, use guidance, avoid guidance, aliases, and source context to avoid misleading icon choices. [SOURCE: docs/supericons-agentic-icon-library-standard-2026-06-16.md]

## Scope

The launch pack is `agentic-ai-tools-logos-001`. [SOURCE: docs/supericons-agentic-icon-library-standard-2026-06-16.md]

The current Supericons source registry contains 50 `si` logo records. [SOURCE: data/si-registry/source/libraries/supericons.json]

The launch profile sidecar contains one source URL, source trust value, and meaning sentence for each of the 50 `si` logo records. [SOURCE: data/si-registry/source/supericons-logo-profiles-v0.1.json]

The 50 logos remain free at launch. [SOURCE: docs/supericons-library-launch-plan-2026-06-25.md]

## Functional Requirements

FR1: Every `si` logo profile must include stable ID, name, slug, pack, asset type, source URL, source trust, meaning, aliases, search terms, filter tags, category, job category, secondary categories, use guidance, avoid guidance, rights note, free access, variants, and public-safe quality status. [SOURCE: scripts/verify-si-registry-projections.mjs] [SOURCE: scripts/verify-supericons-logo-launch-search.mjs]

FR2: The public registry export and MCP registry export must contain the same 50 `si` profile records. [SOURCE: scripts/verify-supericons-logo-launch-search.mjs]

FR3: The public icon index must expose Supericons logo metadata as app-friendly camelCase fields for web and local search. [SOURCE: scripts/build-icons.js] [SOURCE: public/icon-index.json]

FR4: MCP semantic search must use the same profile meaning fields as the public registry records. [SOURCE: mcp/semantic-registry.js]

FR5: Local fallback search must use Supericons semantic tags, synonyms, aliases, search terms, filter tags, AI filter tags, job category, and secondary categories. [SOURCE: mcp/search.js]

FR6: Hosted search catalog rows and public registry metadata rows must fold profile metadata into the existing searchable text, semantic tags, synonyms, and secondary categories. [SOURCE: lib/hosted-search-core.js]

FR7: Direct logo queries for Bolt, Pinecone, Cartesia, Context7, and OpenAI Codex must rank the intended `si` logo first in both local fallback and MCP semantic registry fixtures. [SOURCE: scripts/verify-supericons-logo-launch-search.mjs]

FR8: Intent queries for AI app builders, browser automation agents, MCP directories, text-to-speech, vector databases, and AI video generators must include the expected Supericons logos in top launch candidates. [SOURCE: scripts/verify-supericons-logo-launch-search.mjs]

## Non-Goals

Do not charge per logo at launch. [SOURCE: docs/supericons-library-launch-plan-2026-06-25.md]

Do not gate the 50 AI-tool logos behind Pro. [SOURCE: docs/supericons-library-launch-plan-2026-06-25.md]

Do not imply endorsement, sponsorship, or partnership with third-party brand owners. [SOURCE: data/si-registry/source/supericons-logo-profiles-v0.1.json]

Do not add motion, agent-state, risk, or protocol-binding fields to static brand-logo profiles unless a future consumer requires them. [SOURCE: docs/supericons-agentic-icon-library-standard-2026-06-16.md]

## Success Metrics

Direct logo fixture coverage passes for the required launch brands. [SOURCE: scripts/verify-supericons-logo-launch-search.mjs]

Intent search fixture coverage passes for the required AI-builder categories. [SOURCE: scripts/verify-supericons-logo-launch-search.mjs]

Registry projection verification passes after profile enrichment. [SOURCE: scripts/verify-si-registry-projections.mjs]

Public safety and package boundary verification pass after the new public fields are generated. [SOURCE: scripts/verify-public-safety.mjs] [SOURCE: scripts/verify-public-boundaries.mjs]

Supabase import dry-run has zero registry quality findings. [SOURCE: scripts/import-registry-to-supabase.mjs]

## Risks

Brand confusion risk remains because third-party logos belong to their respective owners. [SOURCE: data/si-registry/source/supericons-logo-profiles-v0.1.json]

Search overfitting risk exists if brand logos outrank generic icons for non-logo concept searches. [SOURCE: mcp/search.js] [SOURCE: mcp/semantic-registry.js]

Metadata drift risk exists because AI tools and product URLs can change. [SOURCE: docs/supericons-ai-logo-profile-search-prd-2026-06-26.md]

Supabase hosted search can only use newly generated profile data after registry/search sync is run against the hosted database. [SOURCE: scripts/sync-search-catalog-to-supabase.mjs] [ASSUMPTION]

## Open Questions

Should the next launch surface include a dedicated AI tools logo page with deep links for each brand? [SOURCE: docs/supericons-library-launch-plan-2026-06-25.md]

Should a future MCP tool expose a focused `get_supericon_profile` response, or should profile fields remain attached to existing search/get-icon responses? [SOURCE: docs/supericons-ai-logo-profile-search-prd-2026-06-26.md]

Should brand-logo filter tags stay hidden from user-facing filters while remaining available for agent search and scoring? [SOURCE: docs/supericons-agentic-ai-tools-tag-vetting-2026-06-17.md]

Should hosted database migrations add first-class columns for `source_url`, `source_trust`, `meaning`, and `asset_type`, or is JSON-record projection enough for launch? [SOURCE: supabase/migrations/20260501_semantic_registry_source_of_truth.sql] [ASSUMPTION]

## Goal Prompt

```text
Launch-check the Supericons Agentic AI Tools logo pack now that Supericon Profile v0.1 enrichment is implemented.

Verify the generated public registry, MCP registry, public icon index, hosted search row builders, and local/MCP search fixtures. Confirm all 50 `si` logos are free public brand-logo records with source URL, source trust, meaning, aliases, search terms, filter tags, use guidance, avoid guidance, rights note, variants, access `free`, and quality status `ready`.

Then prepare the next launch surface plan: an AI Tools Logos landing page, brand-safe rights copy, request/update/takedown path, sitemap entries, analytics for failed logo searches, and hosted Supabase sync steps. Keep third-party logos free and reserve monetization for original Supericons packs, bundles, Pro workflows, and future agentic icon systems.

Report exact commands run, pass/fail results, changed files, and any remaining launch risks.
```
