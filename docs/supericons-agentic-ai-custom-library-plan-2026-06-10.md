# Supericons Agentic AI Custom Library Plan

Date: 2026-06-10

## Summary

Supericons should add a curated first-party library named `supericons` for icons, logos, animated assets, and AI interface states that developers, AI builders, and vibe coders search for but cannot reliably find in common free icon libraries.

The first focus should be agentic AI and modern AI product workflows. Recent search misses show that some queries are not search-quality problems. They are coverage gaps. Concept queries such as `ai studio` or `ai agent robot brain` can be improved with aliases and fallback results, but product-specific queries such as `higgsfield`, `kimi`, and `google ai studio` need actual logo or app icon assets. Other high-demand queries, such as smart loaders and agent states, need custom static or animated icons.

## Working Library Name

Recommended name: `supericons`

Reasons:

- It matches the product name and can become the main first-party library.
- It is broad enough for logos, original concept icons, UI states, and animated assets.
- Distinct from existing generic icon packs.
- Flexible enough to cover AI tools, developer tools, SaaS apps, agentic interface patterns, and other high-demand assets.

The library should not be limited to logos. It should become the curated Supericons-native answer to new demand that existing libraries do not cover quickly enough.

## Why This Matters

Supericons search should not end at "no results" for high-intent developer searches. When a developer searches for a newer AI tool, an agent platform, or a common vibe-coding app, they are usually trying to ship a real UI quickly.

Common missing-result patterns include:

- Latest AI app and agent-tool logos.
- AI model and AI studio product marks.
- Smart loader, generation-state, and waiting-state icons.
- Agentic workflow icons such as planning, tool use, memory, context, reasoning, and retrieval.
- App-builder and vibe-coding tool marks.
- Country or platform symbols that do not fit existing icon libraries.

The goal is to make Supericons feel current and useful for the work developers are doing now, not only the stable icons that large open-source libraries already include.

## Initial Scope

Start with a small pilot instead of a huge library.

Recommended pilot: 50 to 100 assets for agentic AI, AI app, and developer-tool demand.

Candidate groups:

- AI assistants and model companies.
- AI studio and prompt-workbench products.
- Agent-builder and automation tools.
- AI video, image, audio, and multimodal apps.
- Vibe-coding and app-generation tools.
- AI developer infrastructure and observability tools.
- Smart loading and generation-state icons for AI interfaces.
- Static agentic UI icons.
- Dynamic or animated agentic UI icons.

Examples raised during discussion:

- Higgsfield
- Kimi
- Google AI Studio
- Perplexity
- Mistral
- Other current AI and developer tools that appear in zero-result or low-result search logs

These examples should be treated as candidates, not final approved assets, until the source, usage rights, and asset quality are reviewed.

## Search Strategy

Search improvements and library expansion should work together.

Use search repair for concept misses:

- `ai studio`
- `ai agent robot brain`
- `smart loader`
- `agent workflow`
- `model studio`
- `ai generation`

Use custom library coverage for asset misses:

- Specific AI company names.
- Specific app names.
- Product logos not available in Simple Icons or other included libraries.
- New tools that are popular before open-source libraries have added them.
- AI interface states that do not have good generic icon equivalents.
- Animated states such as smart loaders, reasoning indicators, and tool-use activity.

Every zero-result or low-result query should be classified before fixing it:

- `needs_alias`
- `needs_logo`
- `needs_concept_icon`
- `needs_flag_or_region_symbol`
- `typo_or_partial_name`
- `library_filter_mismatch`
- `not_supported`

This turns the admin dashboard into a demand queue.

## Asset Intake Workflow

Recommended workflow:

1. Capture demand from zero-result and low-result searches.
2. Normalize the query into a candidate brand, app, concept, or symbol.
3. Check existing libraries first, especially Simple Icons.
4. Decide whether the asset is a logo, static icon, animated icon, loader, flag, or UI state.
5. For logos, find the official source for the logo or app icon.
6. Prefer official SVG assets for logos.
7. Use official PNG assets only when SVG is unavailable.
8. Convert PNG to SVG only after source approval.
9. For original icons and animated assets, create Supericons-native source artwork.
10. Normalize the SVG or animation to Supericons size and visual standards.
11. Add metadata, aliases, category tags, source links, and access tier.
12. Run visual QA and search QA before publishing.

Do not scrape random logo images as production assets. For logos, the source matters as much as the image.

## Metadata Requirements

Each custom asset record should include:

- `id`
- `name`
- `library`
- `asset_type`
- `category`
- `aliases`
- `related_terms`
- `source_url`
- `source_type`
- `usage_note`
- `access_tier`
- `asset_status`
- `review_status`

Recommended `asset_type` values:

- `logo`
- `static_icon`
- `animated_icon`
- `loader`
- `state_icon`
- `flag_or_region_symbol`

Recommended `access_tier` values:

- `free`
- `premium`
- `internal_review`

Avoid internal process metadata in public records. Keep the records focused on the asset, source, category, usage guidance, and public access tier.

## Legal And Brand Safety

Logos need stricter handling than generic icons.

Important rules:

- Prefer official brand pages, official press kits, official app stores, or official product repositories.
- Keep the source URL with every asset.
- Keep trademark and usage notes where available.
- Avoid altering brand logos beyond size, cleanup, and technical normalization.
- Provide a way to remove or update a logo if the owner objects or changes guidelines.
- Make it clear that brand logos remain trademarks of their owners.

## Premium Access Model

After the `supericons` library is built, selected assets can be marked as premium.

Good premium candidates:

- Original Supericons static icons.
- Original Supericons animated icons.
- Smart loaders and AI interface states.
- Curated agentic workflow icons.
- High-polish variants, motion-ready assets, and app-specific UI states.

Logo assets need extra care. Brand marks may have trademark rules that limit how they can be sold, modified, or bundled. If logo access is gated, the product should frame the value as curation, search, convenience, and implementation-ready formatting, not ownership of the brand mark.

## Smart Loader And Agentic UI Icons

Not every missing asset is a logo. Agentic AI products also need modern UI state icons that free libraries often lack.

Potential non-logo additions:

- Smart loader
- Thinking loader
- Tool-use loader
- Agent running
- Agent paused
- Agent waiting for approval
- Multi-agent handoff
- Context loading
- Memory update
- Retrieval in progress
- Model switching
- Prompt compiling
- Generation queued
- Eval running
- Guardrail check

These should live in the `supericons` library alongside logos and other high-demand AI/developer assets. Each asset can be static, animated, free, or premium depending on quality, source, and product strategy.

## Recommended First Release

Build `supericons` v0.1 with:

- 50 to 100 AI and developer-tool assets.
- A mix of logos, static icons, smart loaders, and animated agentic UI states.
- Source URL for every asset.
- Search aliases for product names, common abbreviations, and partial queries.
- Categories such as `ai_assistant`, `ai_video`, `ai_coding`, `ai_studio`, `developer_tool`, `agent_platform`, `smart_loader`, and `agent_state`.
- Access tiers for free and premium candidates.
- A small QA fixture set based on real zero-result searches.

Also build a backlog for future additions that are not ready for the first release.

## Success Metrics

The library is working if:

- High-intent AI brand searches stop returning zero results.
- Partial-name searches such as short product names and abbreviations return relevant results.
- Admin dashboard zero-result queries decrease for AI and developer-tool categories.
- Users can find product logos, static concept icons, and animated interface states for modern agentic AI interfaces.
- New additions have clean source links and public-safe metadata.
- Premium candidates are clearly marked before any access gating is enabled.

## Next Step

Create a pilot backlog from admin search logs:

1. Top AI and developer-tool zero-result queries.
2. Top low-result queries that should have more relevant results.
3. Specific product/logo searches missing from existing libraries.
4. Agentic UI state concepts that need custom static or animated icons.
5. Smart loaders and dynamic AI interaction states that could become premium assets.

Then select the first 25 candidates for source review and asset testing.
