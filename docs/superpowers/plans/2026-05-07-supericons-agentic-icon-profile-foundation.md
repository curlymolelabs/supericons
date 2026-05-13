# Supericons Agentic Icon Profile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first practical Supericons v2 foundation: every custom-library icon can receive a searchable, validated, AI-ready profile that captures meaning, style, usage, states, accessibility, assets, and generation guidance.

**Architecture:** Add AIPS Core as a focused extension beside the existing SI Registry instead of replacing it. Source icon metadata stays in `public/packs/manifest.json` and AIPS profile source files; build scripts generate profile previews and public-safe search projections; validators enforce required profile quality before profiles can be trusted by the app, API, or future model workflows.

**Tech Stack:** Node.js ESM, JSON Schema-style validation implemented with local JavaScript validators, existing Vite app, existing `public/packs/manifest.json`, existing `data/si-registry` conventions, Supabase/Netlify/Railway deferred until the data foundation is stable.

---

## Scope Check

This plan covers the first implementable foundation, not the whole long-term Supericons platform.

Included now:

- AIPS Core schema and controlled vocabulary.
- Profile examples for current custom-library icons.
- Build and verification scripts.
- Search-ready profile projection.
- A small browser UI route for inspecting profiles.
- AI prompt/spec export for icon generation.
- Documentation for the workflow.

Deferred to later dedicated plans:

- Full hosted API deployment.
- Supabase schema and import jobs.
- Netlify/Railway production deployment.
- Fine-tuning or training an open-weight icon model.
- Marketplace, creator payouts, or blockchain anchoring.

NFT-style metadata influence is limited to practical fields such as source, author, license, version, lineage, and file hash. NFT ownership is not part of this implementation plan.

---

## File Structure

Create:

- `data/aips/README.md`: Explains the AIPS source tree and public-safe rules.
- `data/aips/aips-core.schema.json`: Machine-readable field contract for AIPS Core profiles.
- `data/aips/controlled-vocabularies.json`: Small controlled lists for intent, domain, state, mood, style, and review status.
- `data/aips/source/custom-library-profiles.json`: Source profiles for Supericons custom-library icons.
- `data/aips/examples/agent.profile.json`: One complete profile example for an agentic AI icon.
- `data/aips/examples/shield-check.profile.json`: One complete profile example for a security/trust icon.
- `data/aips/generated/profile-preview.json`: Generated internal preview output.
- `data/aips/generated/search-preview.json`: Generated search-focused preview output.
- `public/aips/profile-search.json`: Public-safe profile search projection.
- `lib/aips/profile-shape.js`: Validation and normalization helpers for AIPS Core records.
- `lib/aips/profile-from-pack-manifest.js`: Builder helpers that seed AIPS profiles from `public/packs/manifest.json`.
- `lib/aips/profile-search.js`: Search projection helpers.
- `scripts/build-aips-profiles.mjs`: Build script for source profiles and generated projections.
- `scripts/verify-aips-profiles.mjs`: Verification script for profile shape, vocabulary, projections, and public-safe filtering.
- `scripts/export-aips-generation-prompts.mjs`: Generates prompt/spec packets for AI-assisted icon creation.
- `docs/aips-core-profile-workflow.md`: Human workflow for assigning profiles to icon sheets.

Modify:

- `package.json`: Add build and verify scripts for AIPS profiles.
- `docs-pages.js`: Add the new workflow doc to the docs surface if the docs shell already supports manually listed docs.
- `index.html`, `main.js`, or existing route/view files: Add a minimal profile browser only if current app routing already exposes docs or registry previews in the main app. If the app route structure is unclear during implementation, keep the first pass as public JSON plus docs, and create the browser route in a separate plan.

Do not modify:

- `data/si-registry/source/*` during the first pass.
- Existing generated SI Registry output rules.
- Supabase functions.
- Premium asset access rules.

---

## Milestone 1: Define AIPS Core

### Task 1: Create the AIPS Source Tree

**Files:**

- Create: `data/aips/README.md`
- Create: `data/aips/controlled-vocabularies.json`
- Create: `data/aips/aips-core.schema.json`

- [ ] **Step 1: Create the source tree README**

Create `data/aips/README.md` with:

```markdown
# AIPS Source Tree

This directory contains Supericons Agentic Icon Profile Specification source records and generated previews.

## Purpose

AIPS profiles describe icons as searchable, reusable, AI-ready design objects. A profile captures what an icon means, how it should be used, how it can change across states, and how future tools can generate related icons to the same style.

## Source Files

- `aips-core.schema.json` defines the AIPS Core record shape.
- `controlled-vocabularies.json` defines shared values for profile fields.
- `source/custom-library-profiles.json` contains hand-reviewed profiles for Supericons custom-library icons.
- `examples/` contains complete reference profiles.

## Generated Files

Files under `generated/` are build outputs. Do not edit them by hand.

## Public-Safe Rule

Profiles may become public. Do not include private process notes, model names, hidden review details, prompt strategy, or internal confidence rationale. Keep records focused on the icon and its use.

## NFT Metadata Boundary

AIPS borrows useful metadata ideas such as source, author, version, lineage, and file hash. NFT ownership, token fields, marketplace logic, and blockchain anchoring are not part of AIPS Core.
```

- [ ] **Step 2: Create the controlled vocabulary**

Create `data/aips/controlled-vocabularies.json` with:

```json
{
  "profile_status": [
    "draft",
    "reviewed",
    "approved"
  ],
  "intent": [
    "act",
    "analyze",
    "approve",
    "block",
    "confirm",
    "create",
    "discover",
    "explain",
    "inform",
    "navigate",
    "protect",
    "refine",
    "warn"
  ],
  "domain": [
    "ai_agents",
    "analytics",
    "commerce",
    "communication",
    "creative_tools",
    "developer_tools",
    "media",
    "navigation",
    "security",
    "status_feedback",
    "ui_controls"
  ],
  "state": [
    "idle",
    "active",
    "thinking",
    "tool_call",
    "needs_approval",
    "blocked",
    "complete",
    "error",
    "warning",
    "success"
  ],
  "mood": [
    "calm",
    "confident",
    "focused",
    "friendly",
    "playful",
    "precise",
    "protective",
    "urgent"
  ],
  "style_family": [
    "line",
    "solid",
    "duotone",
    "animated_line",
    "soft_geometric",
    "technical",
    "character"
  ],
  "motion_sensitivity": [
    "safe_static",
    "safe_subtle",
    "requires_reduced_motion_variant"
  ]
}
```

- [ ] **Step 3: Create the AIPS Core schema**

Create `data/aips/aips-core.schema.json` with:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://supericons.dev/schemas/aips-core.schema.json",
  "title": "Supericons AIPS Core Profile",
  "type": "object",
  "required": [
    "profile_id",
    "aips_version",
    "icon",
    "meaning",
    "design",
    "states",
    "accessibility",
    "assets",
    "generation",
    "status"
  ],
  "additionalProperties": false,
  "properties": {
    "profile_id": { "type": "string" },
    "aips_version": { "type": "string" },
    "icon": {
      "type": "object",
      "required": ["source_library", "collection_id", "name", "label"],
      "additionalProperties": false,
      "properties": {
        "source_library": { "type": "string" },
        "collection_id": { "type": "string" },
        "name": { "type": "string" },
        "label": { "type": "string" },
        "source_path": { "type": "string" },
        "license": { "type": "string" },
        "version": { "type": "string" },
        "content_hash": { "type": "string" },
        "lineage": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "meaning": {
      "type": "object",
      "required": ["purpose", "intent", "domain", "semantic_tags", "use_when", "avoid_when"],
      "additionalProperties": false,
      "properties": {
        "purpose": { "type": "string" },
        "intent": { "type": "string" },
        "domain": { "type": "string" },
        "semantic_tags": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "synonyms": {
          "type": "array",
          "items": { "type": "string" }
        },
        "use_when": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "avoid_when": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "related_profiles": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["profile_id", "relationship"],
            "additionalProperties": false,
            "properties": {
              "profile_id": { "type": "string" },
              "relationship": { "type": "string" }
            }
          }
        }
      }
    },
    "design": {
      "type": "object",
      "required": ["style_family", "mood", "visual_rules"],
      "additionalProperties": false,
      "properties": {
        "style_family": { "type": "string" },
        "mood": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "visual_rules": {
          "type": "object",
          "required": ["grid", "stroke", "corner_style", "motion"],
          "additionalProperties": false,
          "properties": {
            "grid": { "type": "string" },
            "stroke": { "type": "string" },
            "corner_style": { "type": "string" },
            "motion": { "type": "string" }
          }
        }
      }
    },
    "states": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["state", "visual_behavior", "accessible_label"],
        "additionalProperties": false,
        "properties": {
          "state": { "type": "string" },
          "visual_behavior": { "type": "string" },
          "accessible_label": { "type": "string" }
        }
      },
      "minItems": 1
    },
    "accessibility": {
      "type": "object",
      "required": ["default_label", "motion_sensitivity", "reduced_motion_behavior"],
      "additionalProperties": false,
      "properties": {
        "default_label": { "type": "string" },
        "motion_sensitivity": { "type": "string" },
        "reduced_motion_behavior": { "type": "string" }
      }
    },
    "assets": {
      "type": "object",
      "required": ["primary_svg", "variants"],
      "additionalProperties": false,
      "properties": {
        "primary_svg": { "type": "string" },
        "variants": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "type", "path"],
            "additionalProperties": false,
            "properties": {
              "id": { "type": "string" },
              "type": { "type": "string" },
              "path": { "type": "string" }
            }
          }
        }
      }
    },
    "generation": {
      "type": "object",
      "required": ["prompt_brief", "must_preserve", "may_modify", "avoid"],
      "additionalProperties": false,
      "properties": {
        "prompt_brief": { "type": "string" },
        "must_preserve": {
          "type": "array",
          "items": { "type": "string" }
        },
        "may_modify": {
          "type": "array",
          "items": { "type": "string" }
        },
        "avoid": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    },
    "status": {
      "type": "object",
      "required": ["profile_status", "reviewed_by_human"],
      "additionalProperties": false,
      "properties": {
        "profile_status": { "type": "string" },
        "reviewed_by_human": { "type": "boolean" }
      }
    }
  }
}
```

- [ ] **Step 4: Commit the AIPS source tree**

Run:

```bash
git add data/aips/README.md data/aips/controlled-vocabularies.json data/aips/aips-core.schema.json
git commit -m "feat: add AIPS core source tree"
```

Expected: commit succeeds with only the three new AIPS source files staged.

---

### Task 2: Add Profile Validation Helpers

**Files:**

- Create: `lib/aips/profile-shape.js`
- Create: `scripts/verify-aips-profiles.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create profile validation helper**

Create `lib/aips/profile-shape.js` with:

```js
import vocabularies from '../../data/aips/controlled-vocabularies.json' with { type: 'json' };

export const REQUIRED_PROFILE_FIELDS = Object.freeze([
  'profile_id',
  'aips_version',
  'icon',
  'meaning',
  'design',
  'states',
  'accessibility',
  'assets',
  'generation',
  'status',
]);

function assertObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Missing or invalid object: ${field}`);
  }
}

function assertString(value, field) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing or invalid string: ${field}`);
  }
}

function assertBoolean(value, field) {
  if (typeof value !== 'boolean') {
    throw new Error(`Missing or invalid boolean: ${field}`);
  }
}

function assertStringArray(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error(`Missing or invalid string array: ${field}`);
  }
}

function assertVocabulary(field, value) {
  const allowed = vocabularies[field];
  if (!allowed) return;
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${field}: ${value}`);
  }
}

function assertVocabularyArray(field, values) {
  assertStringArray(values, field);
  for (const value of values) {
    assertVocabulary(field, value);
  }
}

export function buildAipsProfileId(profile) {
  return `${profile.icon.source_library}:${profile.icon.collection_id}:${profile.icon.name}`;
}

export function validateAipsProfile(profile) {
  assertObject(profile, 'profile');

  for (const field of REQUIRED_PROFILE_FIELDS) {
    if (!(field in profile)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  assertString(profile.profile_id, 'profile_id');
  assertString(profile.aips_version, 'aips_version');

  assertObject(profile.icon, 'icon');
  assertString(profile.icon.source_library, 'icon.source_library');
  assertString(profile.icon.collection_id, 'icon.collection_id');
  assertString(profile.icon.name, 'icon.name');
  assertString(profile.icon.label, 'icon.label');

  const expectedId = buildAipsProfileId(profile);
  if (profile.profile_id !== expectedId) {
    throw new Error(`profile_id does not match derived value: ${profile.profile_id} !== ${expectedId}`);
  }

  assertObject(profile.meaning, 'meaning');
  assertString(profile.meaning.purpose, 'meaning.purpose');
  assertVocabulary('intent', profile.meaning.intent);
  assertVocabulary('domain', profile.meaning.domain);
  assertStringArray(profile.meaning.semantic_tags, 'meaning.semantic_tags');
  assertStringArray(profile.meaning.use_when, 'meaning.use_when');
  assertStringArray(profile.meaning.avoid_when, 'meaning.avoid_when');

  assertObject(profile.design, 'design');
  assertVocabulary('style_family', profile.design.style_family);
  assertVocabularyArray('mood', profile.design.mood);
  assertObject(profile.design.visual_rules, 'design.visual_rules');
  assertString(profile.design.visual_rules.grid, 'design.visual_rules.grid');
  assertString(profile.design.visual_rules.stroke, 'design.visual_rules.stroke');
  assertString(profile.design.visual_rules.corner_style, 'design.visual_rules.corner_style');
  assertString(profile.design.visual_rules.motion, 'design.visual_rules.motion');

  if (!Array.isArray(profile.states) || profile.states.length === 0) {
    throw new Error('Missing or invalid states');
  }
  for (const state of profile.states) {
    assertObject(state, 'states[]');
    assertVocabulary('state', state.state);
    assertString(state.visual_behavior, `states.${state.state}.visual_behavior`);
    assertString(state.accessible_label, `states.${state.state}.accessible_label`);
  }

  assertObject(profile.accessibility, 'accessibility');
  assertString(profile.accessibility.default_label, 'accessibility.default_label');
  assertVocabulary('motion_sensitivity', profile.accessibility.motion_sensitivity);
  assertString(profile.accessibility.reduced_motion_behavior, 'accessibility.reduced_motion_behavior');

  assertObject(profile.assets, 'assets');
  assertString(profile.assets.primary_svg, 'assets.primary_svg');
  if (!Array.isArray(profile.assets.variants)) {
    throw new Error('Missing or invalid assets.variants');
  }

  assertObject(profile.generation, 'generation');
  assertString(profile.generation.prompt_brief, 'generation.prompt_brief');
  assertStringArray(profile.generation.must_preserve, 'generation.must_preserve');
  assertStringArray(profile.generation.may_modify, 'generation.may_modify');
  assertStringArray(profile.generation.avoid, 'generation.avoid');

  assertObject(profile.status, 'status');
  assertVocabulary('profile_status', profile.status.profile_status);
  assertBoolean(profile.status.reviewed_by_human, 'status.reviewed_by_human');

  return profile;
}
```

- [ ] **Step 2: Create the first verifier**

Create `scripts/verify-aips-profiles.mjs` with:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateAipsProfile } from '../lib/aips/profile-shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'aips', 'source', 'custom-library-profiles.json');
const generatedPreviewPath = path.join(repoRoot, 'data', 'aips', 'generated', 'profile-preview.json');
const publicSearchPath = path.join(repoRoot, 'public', 'aips', 'profile-search.json');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

let sourceProfiles = [];
try {
  sourceProfiles = await readJson(sourcePath);
} catch {
  console.error('verify-aips-profiles: missing source profiles. Run: node scripts/build-aips-profiles.mjs');
  process.exit(1);
}

assert.ok(Array.isArray(sourceProfiles), 'source profiles should be an array');

const ids = new Set();
for (const profile of sourceProfiles) {
  validateAipsProfile(profile);
  assert.equal(ids.has(profile.profile_id), false, `duplicate profile_id: ${profile.profile_id}`);
  ids.add(profile.profile_id);
}

try {
  const generatedPreview = await readJson(generatedPreviewPath);
  const publicSearch = await readJson(publicSearchPath);
  assert.equal(generatedPreview.length, sourceProfiles.length, 'generated preview should include every source profile');
  assert.equal(publicSearch.length, sourceProfiles.length, 'public search should include every public-safe source profile in this phase');

  for (const record of publicSearch) {
    for (const key of Object.keys(record)) {
      assert.equal(key.startsWith('internal_'), false, `public search must not include private process fields (${record.profile_id})`);
      assert.equal(key.startsWith('private_'), false, `public search must not include private process fields (${record.profile_id})`);
      assert.equal(key.includes('process'), false, `public search must not include process fields (${record.profile_id})`);
    }
  }
} catch {
  console.error('verify-aips-profiles: generated outputs are missing. Run: node scripts/build-aips-profiles.mjs');
  process.exit(1);
}

console.log('verify-aips-profiles: ok');
```

- [ ] **Step 3: Add package scripts**

Modify `package.json` scripts to include:

```json
"build:aips-profiles": "node scripts/build-aips-profiles.mjs",
"verify:aips-profiles": "node scripts/verify-aips-profiles.mjs"
```

Keep the existing script order unchanged except for adding these two entries near the SI Registry scripts.

- [ ] **Step 4: Run verifier and confirm the expected first failure**

Run:

```bash
npm run verify:aips-profiles
```

Expected: FAIL with a message that source profiles or generated outputs are missing. This proves the verifier is wired before the builder exists.

- [ ] **Step 5: Commit validation wiring**

Run:

```bash
git add lib/aips/profile-shape.js scripts/verify-aips-profiles.mjs package.json package-lock.json
git commit -m "test: add AIPS profile validation"
```

Expected: commit succeeds after the expected failing verification has been observed.

---

## Milestone 2: Seed Profiles From Current Icon Sheets

### Task 3: Create Complete Example Profiles

**Files:**

- Create: `data/aips/examples/agent.profile.json`
- Create: `data/aips/examples/shield-check.profile.json`
- Create: `data/aips/source/custom-library-profiles.json`

- [ ] **Step 1: Create the agent example profile**

Create `data/aips/examples/agent.profile.json` with:

```json
{
  "profile_id": "supericons:ai-agentic:agent",
  "aips_version": "0.1.0",
  "icon": {
    "source_library": "supericons",
    "collection_id": "ai-agentic",
    "name": "agent",
    "label": "Agent",
    "source_path": "public/packs/ai-agentic/bundle.json",
    "license": "Supericons license",
    "version": "0.1.0",
    "content_hash": "",
    "lineage": []
  },
  "meaning": {
    "purpose": "Represents an AI agent presence that can act, respond, or ask for help.",
    "intent": "inform",
    "domain": "ai_agents",
    "semantic_tags": ["agent", "ai", "assistant", "bot", "autonomous"],
    "synonyms": ["assistant", "copilot", "helper"],
    "use_when": ["Showing an AI agent entry point", "Showing an active agent presence"],
    "avoid_when": ["Pure automation without user-facing identity", "Human support staff"],
    "related_profiles": []
  },
  "design": {
    "style_family": "animated_line",
    "mood": ["focused", "friendly"],
    "visual_rules": {
      "grid": "24px icon grid",
      "stroke": "consistent line weight with rounded joins",
      "corner_style": "soft geometric corners",
      "motion": "subtle pulse for active presence"
    }
  },
  "states": [
    {
      "state": "idle",
      "visual_behavior": "Static icon with no pulse.",
      "accessible_label": "AI agent idle"
    },
    {
      "state": "active",
      "visual_behavior": "Soft pulse to show the agent is available or working.",
      "accessible_label": "AI agent active"
    },
    {
      "state": "needs_approval",
      "visual_behavior": "Gentle attention pulse without alarm styling.",
      "accessible_label": "AI agent needs approval"
    }
  ],
  "accessibility": {
    "default_label": "AI agent",
    "motion_sensitivity": "safe_subtle",
    "reduced_motion_behavior": "Use a static icon and text state label instead of pulsing motion."
  },
  "assets": {
    "primary_svg": "public/packs/ai-agentic/bundle.json#agent",
    "variants": [
      {
        "id": "animated",
        "type": "bundle-icon",
        "path": "public/packs/ai-agentic/bundle.json#agent"
      }
    ]
  },
  "generation": {
    "prompt_brief": "Create a friendly but focused AI agent icon in the Supericons animated line style.",
    "must_preserve": ["AI agent identity", "soft geometric line style", "clear small-size silhouette"],
    "may_modify": ["pulse rhythm", "accent details", "state badge"],
    "avoid": ["human face realism", "generic sparkle-only AI symbol", "aggressive warning mood"]
  },
  "status": {
    "profile_status": "draft",
    "reviewed_by_human": true
  }
}
```

- [ ] **Step 2: Create the shield-check example profile**

Create `data/aips/examples/shield-check.profile.json` with:

```json
{
  "profile_id": "supericons:security-auth:shield-check",
  "aips_version": "0.1.0",
  "icon": {
    "source_library": "supericons",
    "collection_id": "security-auth",
    "name": "shield-check",
    "label": "Shield Check",
    "source_path": "public/packs/security-auth/bundle.json",
    "license": "Supericons license",
    "version": "0.1.0",
    "content_hash": "",
    "lineage": []
  },
  "meaning": {
    "purpose": "Represents verified protection, trusted access, or a confirmed security result.",
    "intent": "protect",
    "domain": "security",
    "semantic_tags": ["shield", "verified", "secure", "protected", "trust"],
    "synonyms": ["verified security", "safe", "protected"],
    "use_when": ["Confirming a secure result", "Showing protection is active"],
    "avoid_when": ["Warning about a breach", "Asking the user to delete data"],
    "related_profiles": []
  },
  "design": {
    "style_family": "animated_line",
    "mood": ["confident", "protective", "calm"],
    "visual_rules": {
      "grid": "24px icon grid",
      "stroke": "consistent line weight with clear shield outline",
      "corner_style": "balanced security shape with softened corners",
      "motion": "shield absorbs impact then radiates"
    }
  },
  "states": [
    {
      "state": "idle",
      "visual_behavior": "Static shield with checkmark.",
      "accessible_label": "Security status"
    },
    {
      "state": "success",
      "visual_behavior": "Shield radiates once and settles.",
      "accessible_label": "Security verified"
    },
    {
      "state": "warning",
      "visual_behavior": "Use an amber variant or substitute warning profile instead of changing this icon into danger.",
      "accessible_label": "Security needs review"
    }
  ],
  "accessibility": {
    "default_label": "Security verified",
    "motion_sensitivity": "safe_subtle",
    "reduced_motion_behavior": "Use a static shield and visible status text."
  },
  "assets": {
    "primary_svg": "public/packs/security-auth/bundle.json#shield-check",
    "variants": [
      {
        "id": "animated",
        "type": "bundle-icon",
        "path": "public/packs/security-auth/bundle.json#shield-check"
      }
    ]
  },
  "generation": {
    "prompt_brief": "Create a calm, trustworthy security icon in the Supericons animated line style.",
    "must_preserve": ["shield shape", "verified meaning", "calm trust mood"],
    "may_modify": ["radiance effect", "badge treatment", "success-state accent"],
    "avoid": ["breach alarm styling", "skull or threat imagery", "delete or destructive meaning"]
  },
  "status": {
    "profile_status": "draft",
    "reviewed_by_human": true
  }
}
```

- [ ] **Step 3: Seed the first source profile file**

Create `data/aips/source/custom-library-profiles.json` as an array containing the two example profile objects.

- [ ] **Step 4: Run the verifier**

Run:

```bash
npm run verify:aips-profiles
```

Expected: FAIL because generated outputs are still missing. Profile shape validation should pass before the generated output check fails.

- [ ] **Step 5: Commit example profiles**

Run:

```bash
git add data/aips/examples/agent.profile.json data/aips/examples/shield-check.profile.json data/aips/source/custom-library-profiles.json
git commit -m "feat: seed AIPS example profiles"
```

Expected: commit succeeds with example profiles and source profile file.

---

### Task 4: Build AIPS Profile Projections

**Files:**

- Create: `lib/aips/profile-search.js`
- Create: `scripts/build-aips-profiles.mjs`
- Generate: `data/aips/generated/profile-preview.json`
- Generate: `data/aips/generated/search-preview.json`
- Generate: `public/aips/profile-search.json`

- [ ] **Step 1: Create search projection helper**

Create `lib/aips/profile-search.js` with:

```js
export function buildAipsSearchRecord(profile) {
  return {
    profile_id: profile.profile_id,
    icon: {
      collection_id: profile.icon.collection_id,
      name: profile.icon.name,
      label: profile.icon.label,
    },
    meaning: {
      purpose: profile.meaning.purpose,
      intent: profile.meaning.intent,
      domain: profile.meaning.domain,
      semantic_tags: profile.meaning.semantic_tags,
      synonyms: profile.meaning.synonyms || [],
      use_when: profile.meaning.use_when,
      avoid_when: profile.meaning.avoid_when,
    },
    design: {
      style_family: profile.design.style_family,
      mood: profile.design.mood,
      motion: profile.design.visual_rules.motion,
    },
    states: profile.states.map((state) => ({
      state: state.state,
      accessible_label: state.accessible_label,
    })),
    accessibility: profile.accessibility,
    asset: profile.assets.primary_svg,
    generation_prompt_brief: profile.generation.prompt_brief,
  };
}
```

- [ ] **Step 2: Create builder script**

Create `scripts/build-aips-profiles.mjs` with:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateAipsProfile } from '../lib/aips/profile-shape.js';
import { buildAipsSearchRecord } from '../lib/aips/profile-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'aips', 'source', 'custom-library-profiles.json');
const generatedDir = path.join(repoRoot, 'data', 'aips', 'generated');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const profiles = await readJson(sourcePath);
if (!Array.isArray(profiles)) {
  throw new Error('AIPS source profiles must be an array');
}

for (const profile of profiles) {
  validateAipsProfile(profile);
}

const searchPreview = profiles.map(buildAipsSearchRecord);

const outputFiles = [
  [path.join(generatedDir, 'profile-preview.json'), profiles],
  [path.join(generatedDir, 'search-preview.json'), searchPreview],
  [path.join(repoRoot, 'public', 'aips', 'profile-search.json'), searchPreview],
];

for (const [filePath, value] of outputFiles) {
  await writeJson(filePath, value);
}

console.log(
  `build-aips-profiles: wrote ${outputFiles
    .map(([filePath]) => path.relative(repoRoot, filePath))
    .join(', ')}`
);
```

- [ ] **Step 3: Build AIPS profiles**

Run:

```bash
npm run build:aips-profiles
```

Expected: PASS and log lists:

```text
data/aips/generated/profile-preview.json
data/aips/generated/search-preview.json
public/aips/profile-search.json
```

- [ ] **Step 4: Verify AIPS profiles**

Run:

```bash
npm run verify:aips-profiles
```

Expected: PASS with:

```text
verify-aips-profiles: ok
```

- [ ] **Step 5: Commit profile builder**

Run:

```bash
git add lib/aips/profile-search.js scripts/build-aips-profiles.mjs data/aips/generated/profile-preview.json data/aips/generated/search-preview.json public/aips/profile-search.json
git commit -m "feat: build AIPS profile projections"
```

Expected: commit succeeds with generated AIPS projection files.

---

## Milestone 3: Scale From Two Profiles To Icon Sheets

### Task 5: Create Pack Manifest Profile Seeder

**Files:**

- Create: `lib/aips/profile-from-pack-manifest.js`
- Modify: `scripts/build-aips-profiles.mjs`

- [ ] **Step 1: Create profile seeding helper**

Create `lib/aips/profile-from-pack-manifest.js` with:

```js
const DOMAIN_BY_COLLECTION = Object.freeze({
  'ai-agentic': 'ai_agents',
  'data-charts': 'analytics',
  ecommerce: 'commerce',
  'media-playback': 'media',
  'navigation-menus': 'navigation',
  'security-auth': 'security',
  'social-communication': 'communication',
  'status-feedback': 'status_feedback',
});

const INTENT_BY_CATEGORY = Object.freeze({
  blocked: 'block',
  complete: 'confirm',
  core: 'inform',
  error: 'warn',
  help: 'explain',
  loading: 'inform',
  protection: 'protect',
  secure: 'protect',
  success: 'confirm',
  warning: 'warn',
});

function titleCase(value) {
  return value
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

export function createDraftProfileFromPackIcon(collectionId, collection, icon) {
  const domain = DOMAIN_BY_COLLECTION[collectionId] || 'ui_controls';
  const intent = INTENT_BY_CATEGORY[icon.category] || 'inform';

  return {
    profile_id: `supericons:${collectionId}:${icon.name}`,
    aips_version: '0.1.0',
    icon: {
      source_library: 'supericons',
      collection_id: collectionId,
      name: icon.name,
      label: titleCase(icon.name),
      source_path: `public/packs/${collectionId}/bundle.json`,
      license: 'Supericons license',
      version: '0.1.0',
      content_hash: '',
      lineage: [],
    },
    meaning: {
      purpose: icon.purpose,
      intent,
      domain,
      semantic_tags: icon.tags || [icon.name],
      synonyms: [],
      use_when: [`Use when the interface needs to express ${icon.category || icon.name}.`],
      avoid_when: ['Avoid when the icon meaning could be confused with a higher-risk action.'],
      related_profiles: [],
    },
    design: {
      style_family: 'animated_line',
      mood: domain === 'security' ? ['protective', 'confident'] : ['focused'],
      visual_rules: {
        grid: '24px icon grid',
        stroke: 'consistent line weight with rounded joins',
        corner_style: 'soft geometric corners',
        motion: icon.purpose,
      },
    },
    states: [
      {
        state: 'idle',
        visual_behavior: 'Static icon at rest.',
        accessible_label: titleCase(icon.name),
      },
      {
        state: domain === 'status_feedback' ? 'active' : 'idle',
        visual_behavior: icon.purpose,
        accessible_label: `${titleCase(icon.name)} active`,
      },
    ],
    accessibility: {
      default_label: titleCase(icon.name),
      motion_sensitivity: 'safe_subtle',
      reduced_motion_behavior: 'Use the static icon and visible text state instead of animation.',
    },
    assets: {
      primary_svg: `public/packs/${collectionId}/bundle.json#${icon.name}`,
      variants: [
        {
          id: 'animated',
          type: 'bundle-icon',
          path: `public/packs/${collectionId}/bundle.json#${icon.name}`,
        },
      ],
    },
    generation: {
      prompt_brief: `Create a ${titleCase(icon.name)} icon in the Supericons animated line style. ${icon.purpose}`,
      must_preserve: [titleCase(icon.name), 'Supericons animated line style', 'clear small-size silhouette'],
      may_modify: ['motion timing', 'state accent', 'supporting detail'],
      avoid: ['unclear metaphor', 'overly complex detail', 'style drift from the collection'],
    },
    status: {
      profile_status: 'draft',
      reviewed_by_human: false,
    },
  };
}
```

- [ ] **Step 2: Modify builder to support generated drafts**

Modify `scripts/build-aips-profiles.mjs` to read `public/packs/manifest.json`, seed missing draft profiles, and merge hand-reviewed source profiles over generated drafts:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateAipsProfile } from '../lib/aips/profile-shape.js';
import { createDraftProfileFromPackIcon } from '../lib/aips/profile-from-pack-manifest.js';
import { buildAipsSearchRecord } from '../lib/aips/profile-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const sourcePath = path.join(repoRoot, 'data', 'aips', 'source', 'custom-library-profiles.json');
const manifestPath = path.join(repoRoot, 'public', 'packs', 'manifest.json');
const generatedDir = path.join(repoRoot, 'data', 'aips', 'generated');

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const manifest = await readJson(manifestPath);
const reviewedProfiles = await readJson(sourcePath);
if (!Array.isArray(reviewedProfiles)) {
  throw new Error('AIPS source profiles must be an array');
}

const draftProfiles = [];
for (const [collectionId, collection] of Object.entries(manifest)) {
  for (const icon of collection.icons || []) {
    draftProfiles.push(createDraftProfileFromPackIcon(collectionId, collection, icon));
  }
}

const profilesById = new Map(draftProfiles.map((profile) => [profile.profile_id, profile]));
for (const profile of reviewedProfiles) {
  profilesById.set(profile.profile_id, profile);
}

const profiles = [...profilesById.values()].sort((a, b) => a.profile_id.localeCompare(b.profile_id));

for (const profile of profiles) {
  validateAipsProfile(profile);
}

const searchPreview = profiles.map(buildAipsSearchRecord);

const outputFiles = [
  [path.join(generatedDir, 'profile-preview.json'), profiles],
  [path.join(generatedDir, 'search-preview.json'), searchPreview],
  [path.join(repoRoot, 'public', 'aips', 'profile-search.json'), searchPreview],
];

for (const [filePath, value] of outputFiles) {
  await writeJson(filePath, value);
}

console.log(
  `build-aips-profiles: wrote ${profiles.length} profiles to ${outputFiles
    .map(([filePath]) => path.relative(repoRoot, filePath))
    .join(', ')}`
);
```

- [ ] **Step 3: Build and verify seeded profiles**

Run:

```bash
npm run build:aips-profiles
npm run verify:aips-profiles
```

Expected: both PASS. The build count should match the total icon count across `public/packs/manifest.json`, with reviewed source profiles overriding matching draft profiles.

- [ ] **Step 4: Commit seeder**

Run:

```bash
git add lib/aips/profile-from-pack-manifest.js scripts/build-aips-profiles.mjs data/aips/generated/profile-preview.json data/aips/generated/search-preview.json public/aips/profile-search.json
git commit -m "feat: seed AIPS profiles from icon packs"
```

Expected: commit succeeds with the seeded profile projection.

---

### Task 6: Add Completeness Metrics

**Files:**

- Modify: `lib/aips/profile-search.js`
- Modify: `scripts/build-aips-profiles.mjs`
- Modify: `scripts/verify-aips-profiles.mjs`

- [ ] **Step 1: Add completeness scoring helper**

Modify `lib/aips/profile-search.js` to include:

```js
export function calculateProfileCompleteness(profile) {
  const checks = [
    profile.status.reviewed_by_human === true,
    profile.status.profile_status === 'approved' || profile.status.profile_status === 'reviewed',
    profile.meaning.synonyms && profile.meaning.synonyms.length > 0,
    profile.meaning.use_when.length >= 2,
    profile.meaning.avoid_when.length >= 2,
    profile.states.length >= 3,
    profile.generation.must_preserve.length >= 3,
    profile.generation.avoid.length >= 3,
  ];

  const passed = checks.filter(Boolean).length;
  return {
    passed,
    total: checks.length,
    score: Number((passed / checks.length).toFixed(2)),
  };
}
```

Then modify `buildAipsSearchRecord(profile)` to include:

```js
completeness: calculateProfileCompleteness(profile),
```

- [ ] **Step 2: Verify search records include completeness**

Modify `scripts/verify-aips-profiles.mjs` public search loop to include:

```js
assert.ok(record.completeness, `public search should include completeness (${record.profile_id})`);
assert.equal(typeof record.completeness.score, 'number', `completeness score should be numeric (${record.profile_id})`);
assert.ok(record.completeness.score >= 0 && record.completeness.score <= 1, `completeness score should be 0-1 (${record.profile_id})`);
```

- [ ] **Step 3: Rebuild and verify**

Run:

```bash
npm run build:aips-profiles
npm run verify:aips-profiles
```

Expected: PASS and every public search record includes `completeness`.

- [ ] **Step 4: Commit completeness scoring**

Run:

```bash
git add lib/aips/profile-search.js scripts/verify-aips-profiles.mjs data/aips/generated/search-preview.json public/aips/profile-search.json
git commit -m "feat: score AIPS profile completeness"
```

Expected: commit succeeds.

---

## Milestone 4: Make Profiles Useful For Search And Review

### Task 7: Add Local Profile Search Fixtures

**Files:**

- Create: `data/aips/search-fixtures.json`
- Create: `scripts/verify-aips-search-fixtures.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create search fixtures**

Create `data/aips/search-fixtures.json` with:

```json
[
  {
    "query": "calm verified security icon",
    "expected_profile_ids": ["supericons:security-auth:shield-check"]
  },
  {
    "query": "ai agent active presence",
    "expected_profile_ids": ["supericons:ai-agentic:agent"]
  }
]
```

- [ ] **Step 2: Create fixture verifier**

Create `scripts/verify-aips-search-fixtures.mjs` with:

```js
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const fixturesPath = path.join(repoRoot, 'data', 'aips', 'search-fixtures.json');
const searchPath = path.join(repoRoot, 'public', 'aips', 'profile-search.json');

function tokenize(value) {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreRecord(queryTokens, record) {
  const haystack = [
    record.profile_id,
    record.icon.label,
    record.meaning.purpose,
    record.meaning.intent,
    record.meaning.domain,
    ...record.meaning.semantic_tags,
    ...record.meaning.synonyms,
    ...record.design.mood,
    record.design.motion,
    record.generation_prompt_brief,
  ].join(' ').toLowerCase();

  return queryTokens.filter((token) => haystack.includes(token)).length;
}

const fixtures = JSON.parse(await fs.readFile(fixturesPath, 'utf8'));
const searchRecords = JSON.parse(await fs.readFile(searchPath, 'utf8'));

for (const fixture of fixtures) {
  const queryTokens = tokenize(fixture.query);
  const ranked = searchRecords
    .map((record) => ({ record, score: scoreRecord(queryTokens, record) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => item.record.profile_id);

  for (const expectedId of fixture.expected_profile_ids) {
    assert.ok(ranked.includes(expectedId), `${fixture.query} should rank ${expectedId} in the top 10`);
  }
}

console.log('verify-aips-search-fixtures: ok');
```

- [ ] **Step 3: Add package script**

Modify `package.json` scripts to include:

```json
"verify:aips-search-fixtures": "node scripts/verify-aips-search-fixtures.mjs"
```

- [ ] **Step 4: Run search fixture verification**

Run:

```bash
npm run build:aips-profiles
npm run verify:aips-search-fixtures
```

Expected: PASS with:

```text
verify-aips-search-fixtures: ok
```

- [ ] **Step 5: Commit search fixtures**

Run:

```bash
git add data/aips/search-fixtures.json scripts/verify-aips-search-fixtures.mjs package.json package-lock.json
git commit -m "test: add AIPS search fixtures"
```

Expected: commit succeeds.

---

### Task 8: Add Human Review Workflow Doc

**Files:**

- Create: `docs/aips-core-profile-workflow.md`

- [ ] **Step 1: Write the workflow doc**

Create `docs/aips-core-profile-workflow.md` with:

```markdown
# AIPS Core Profile Workflow

## Purpose

This workflow helps Supericons turn icon sheets into structured profiles that humans, apps, and AI tools can understand.

## Per-Sheet Flow

1. Pick one icon sheet, such as `ai-agentic` or `security-auth`.
2. Build draft profiles from `public/packs/manifest.json`.
3. Review each icon in the sheet.
4. Improve the profile fields that matter most:
   - purpose
   - tags
   - use cases
   - avoid cases
   - states
   - accessibility label
   - generation brief
5. Mark the profile as `reviewed`.
6. Run the AIPS build and verification scripts.
7. Use search fixtures to check whether the icons are findable by natural phrases.

## Profile Quality Bar

A good profile lets someone answer:

- What does this icon mean?
- When should it be used?
- When should it not be used?
- What state can it show?
- What should a screen reader say?
- What must an AI preserve when generating a related icon?

## Public-Safe Rule

Do not include private model names, prompt strategy, hidden review notes, or internal process details. The profile should describe the icon, not how the profile was created.

## First Review Order

1. `ai-agentic`
2. `status-feedback`
3. `security-auth`
4. `data-charts`
5. `navigation-menus`
6. `social-communication`
7. `ecommerce`
8. `media-playback`
```

- [ ] **Step 2: Commit workflow doc**

Run:

```bash
git add docs/aips-core-profile-workflow.md
git commit -m "docs: add AIPS profile workflow"
```

Expected: commit succeeds.

---

## Milestone 5: Export AI-Ready Generation Specs

### Task 9: Add Prompt Packet Export

**Files:**

- Create: `scripts/export-aips-generation-prompts.mjs`
- Generate: `data/aips/generated/generation-prompts.json`
- Modify: `package.json`

- [ ] **Step 1: Create generation prompt exporter**

Create `scripts/export-aips-generation-prompts.mjs` with:

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const profilePath = path.join(repoRoot, 'data', 'aips', 'generated', 'profile-preview.json');
const outputPath = path.join(repoRoot, 'data', 'aips', 'generated', 'generation-prompts.json');

const profiles = JSON.parse(await fs.readFile(profilePath, 'utf8'));

const packets = profiles.map((profile) => ({
  profile_id: profile.profile_id,
  icon_name: profile.icon.name,
  collection_id: profile.icon.collection_id,
  prompt: [
    profile.generation.prompt_brief,
    `Meaning: ${profile.meaning.purpose}`,
    `Use when: ${profile.meaning.use_when.join('; ')}`,
    `Avoid: ${profile.generation.avoid.join('; ')}`,
    `Style: ${profile.design.style_family}; ${profile.design.visual_rules.grid}; ${profile.design.visual_rules.stroke}; ${profile.design.visual_rules.corner_style}`,
    `Motion: ${profile.design.visual_rules.motion}`,
    `Preserve: ${profile.generation.must_preserve.join('; ')}`,
    `Allowed changes: ${profile.generation.may_modify.join('; ')}`,
    `Accessibility: ${profile.accessibility.default_label}; ${profile.accessibility.reduced_motion_behavior}`
  ].join('\n'),
}));

await fs.writeFile(outputPath, `${JSON.stringify(packets, null, 2)}\n`, 'utf8');
console.log(`export-aips-generation-prompts: wrote ${path.relative(repoRoot, outputPath)}`);
```

- [ ] **Step 2: Add package script**

Modify `package.json` scripts to include:

```json
"export:aips-generation-prompts": "node scripts/export-aips-generation-prompts.mjs"
```

- [ ] **Step 3: Export prompt packets**

Run:

```bash
npm run build:aips-profiles
npm run export:aips-generation-prompts
```

Expected: PASS and `data/aips/generated/generation-prompts.json` exists.

- [ ] **Step 4: Add verification to AIPS profile verifier**

Modify `scripts/verify-aips-profiles.mjs` to read `data/aips/generated/generation-prompts.json` and assert:

```js
const generationPromptsPath = path.join(repoRoot, 'data', 'aips', 'generated', 'generation-prompts.json');
const generationPrompts = await readJson(generationPromptsPath);
assert.equal(generationPrompts.length, sourceProfiles.length, 'generation prompt count should match source profiles in reviewed source mode');
for (const packet of generationPrompts) {
  assert.equal(typeof packet.prompt, 'string', `generation prompt should be text (${packet.profile_id})`);
  assert.equal(packet.prompt.includes('Preserve:'), true, `generation prompt should include Preserve section (${packet.profile_id})`);
}
```

If seeded draft profiles are included in generated previews, compare against `generatedPreview.length` instead of `sourceProfiles.length`.

- [ ] **Step 5: Run full AIPS verification**

Run:

```bash
npm run build:aips-profiles
npm run export:aips-generation-prompts
npm run verify:aips-profiles
```

Expected: PASS.

- [ ] **Step 6: Commit generation export**

Run:

```bash
git add scripts/export-aips-generation-prompts.mjs data/aips/generated/generation-prompts.json scripts/verify-aips-profiles.mjs package.json package-lock.json
git commit -m "feat: export AIPS generation prompt packets"
```

Expected: commit succeeds.

---

## Milestone 6: Add A Minimal Profile Browser

### Task 10: Add Static Profile Browser Data First

**Files:**

- Already generated: `public/aips/profile-search.json`
- Modify only after inspection: `docs-pages.js`, `main.js`, `index.html`, or existing route files

- [ ] **Step 1: Inspect current routing**

Run:

```bash
Select-String -Path 'main.js','docs-pages.js','index.html' -Pattern 'docs|route|hash|registry|view' | Select-Object -First 120
```

Expected: output shows whether docs/registry views are controlled in `main.js`, `docs-pages.js`, or static HTML links.

- [ ] **Step 2: Choose the smallest browser surface**

If `docs-pages.js` already lists docs pages manually, add `docs/aips-core-profile-workflow.md` to the docs listing.

If there is already a registry/search route, add a route that fetches `public/aips/profile-search.json`.

If neither pattern is clear, stop this task and write a separate frontend plan. Do not wedge a large UI into the app without understanding routing.

- [ ] **Step 3: Add the minimal profile list UI**

For a simple route implementation, render:

```js
async function renderAipsProfileBrowser(root) {
  const response = await fetch('/aips/profile-search.json');
  const profiles = await response.json();

  root.innerHTML = `
    <section class="aips-browser">
      <header class="aips-browser__header">
        <h1>AIPS Profile Browser</h1>
        <p>Search Supericons by meaning, state, mood, and generation brief.</p>
        <input class="aips-browser__search" type="search" placeholder="Search profiles">
      </header>
      <div class="aips-browser__results"></div>
    </section>
  `;

  const input = root.querySelector('.aips-browser__search');
  const results = root.querySelector('.aips-browser__results');

  function render(query = '') {
    const normalized = query.toLowerCase().trim();
    const filtered = profiles.filter((profile) => {
      const text = [
        profile.profile_id,
        profile.icon.label,
        profile.meaning.purpose,
        profile.meaning.intent,
        profile.meaning.domain,
        ...profile.meaning.semantic_tags,
        ...profile.design.mood,
        profile.generation_prompt_brief,
      ].join(' ').toLowerCase();
      return normalized.length === 0 || text.includes(normalized);
    });

    results.innerHTML = filtered.slice(0, 80).map((profile) => `
      <article class="aips-profile-card">
        <h2>${profile.icon.label}</h2>
        <p>${profile.meaning.purpose}</p>
        <p><strong>Domain:</strong> ${profile.meaning.domain}</p>
        <p><strong>Mood:</strong> ${profile.design.mood.join(', ')}</p>
        <p><strong>States:</strong> ${profile.states.map((state) => state.state).join(', ')}</p>
      </article>
    `).join('');
  }

  input.addEventListener('input', () => render(input.value));
  render();
}
```

Adapt naming and file placement to the app's existing routing conventions.

- [ ] **Step 4: Add CSS**

Add CSS near existing docs or registry styling:

```css
.aips-browser {
  max-width: 1120px;
  margin: 0 auto;
  padding: 32px 20px 72px;
}

.aips-browser__header {
  margin-bottom: 20px;
}

.aips-browser__search {
  width: 100%;
  max-width: 520px;
  min-height: 42px;
  border: 1px solid var(--border, #d8d2c4);
  border-radius: 8px;
  padding: 8px 12px;
  font: inherit;
}

.aips-browser__results {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
}

.aips-profile-card {
  border: 1px solid var(--border, #d8d2c4);
  border-radius: 8px;
  padding: 16px;
  background: var(--surface, #fff);
}

.aips-profile-card h2 {
  margin: 0 0 8px;
  font-size: 1rem;
}
```

- [ ] **Step 5: Run browser build checks**

Run:

```bash
npm run build
```

Expected: PASS. If unrelated existing generated files change, inspect before committing and only stage files owned by this task.

- [ ] **Step 6: Verify in browser**

Run:

```bash
npm run dev
```

Open the local route in the in-app browser. Search for:

- `agent`
- `security`
- `approval`

Expected: relevant profile cards appear and no console errors are visible.

- [ ] **Step 7: Commit profile browser**

Run:

```bash
git add docs-pages.js main.js index.html style.css public/aips/profile-search.json
git commit -m "feat: add AIPS profile browser"
```

Expected: commit includes only files actually changed for the browser route.

---

## Milestone 7: Hardening And Next Plans

### Task 11: Add Final Verification Matrix

**Files:**

- Create: `docs/aips-foundation-verification.md`

- [ ] **Step 1: Create verification report template**

Create `docs/aips-foundation-verification.md` with:

```markdown
# AIPS Foundation Verification

## Required Checks

| Check | Command | Expected |
|---|---|---|
| Build profiles | `npm run build:aips-profiles` | Passes and writes generated AIPS JSON |
| Verify profiles | `npm run verify:aips-profiles` | Passes with `verify-aips-profiles: ok` |
| Verify search fixtures | `npm run verify:aips-search-fixtures` | Passes with `verify-aips-search-fixtures: ok` |
| Export generation prompts | `npm run export:aips-generation-prompts` | Passes and writes prompt packets |
| Full app build | `npm run build` | Passes |

## Manual Review

- Open the profile browser.
- Search for `agent`.
- Search for `security`.
- Search for `approval`.
- Confirm cards show meaning, domain, mood, and states.

## Residual Risks

- Draft profiles are seeded from pack metadata and still need human review.
- Emotional and mood labels are useful design guidance, not tested user research yet.
- Hosted API, Supabase import, and model training are future plans.
```

- [ ] **Step 2: Run verification commands**

Run:

```bash
npm run build:aips-profiles
npm run verify:aips-profiles
npm run verify:aips-search-fixtures
npm run export:aips-generation-prompts
npm run build
```

Expected: all commands pass.

- [ ] **Step 3: Update verification doc with actual command results**

Add a short dated section:

```markdown
## Verification Run: 2026-05-07

- `npm run build:aips-profiles`: passed.
- `npm run verify:aips-profiles`: passed.
- `npm run verify:aips-search-fixtures`: passed.
- `npm run export:aips-generation-prompts`: passed.
- `npm run build`: passed.
```

Only write `passed` after directly observing success in the current implementation session.

- [ ] **Step 4: Commit verification doc**

Run:

```bash
git add docs/aips-foundation-verification.md
git commit -m "docs: add AIPS foundation verification"
```

Expected: commit succeeds.

---

### Task 12: Write Follow-On Plan List

**Files:**

- Create: `docs/aips-next-roadmap.md`

- [ ] **Step 1: Create next roadmap**

Create `docs/aips-next-roadmap.md` with:

```markdown
# AIPS Next Roadmap

## Plan 2: Profile Review Workbench

Build a review interface for improving draft profiles sheet by sheet. The workbench should support filtering by collection, editing profile fields, checking completeness, and exporting reviewed JSON.

## Plan 3: Hosted Profile Search

Move public-safe profile search to hosted infrastructure. Evaluate Supabase for storage/search and Netlify or Railway for hosting API endpoints.

## Plan 4: AI-Assisted Icon Generation

Use AIPS profiles as structured prompts for creating new Supericons icons, variants, states, and animations. Start with prompt packets before considering any model fine-tuning.

## Plan 5: Supericons Icon Specialist Model

After enough reviewed icon/profile pairs exist, evaluate whether an open-weight model, adapter, or retrieval-augmented generation workflow can produce better Supericons-style icons to spec.

## Plan 6: Runtime Agentic Renderer

Build a renderer that maps app or agent states into AIPS icon states with accessible labels and reduced-motion support.
```

- [ ] **Step 2: Commit roadmap**

Run:

```bash
git add docs/aips-next-roadmap.md
git commit -m "docs: add AIPS next roadmap"
```

Expected: commit succeeds.

---

## Final Acceptance Criteria

The foundation is complete when all of these are verified:

- `data/aips/aips-core.schema.json` exists.
- `data/aips/source/custom-library-profiles.json` contains reviewed profiles for at least `agent` and `shield-check`.
- `npm run build:aips-profiles` passes.
- `npm run verify:aips-profiles` passes.
- `npm run verify:aips-search-fixtures` passes.
- `npm run export:aips-generation-prompts` passes.
- `public/aips/profile-search.json` exists and contains public-safe profile search records.
- The profile browser or documented JSON workflow lets a human inspect profile meaning, state, mood, and generation brief.
- `docs/aips-core-profile-workflow.md` explains how to profile each 50-icon sheet.
- No public output includes private model names, prompt strategy, hidden review notes, or internal process metadata.

---

## Execution Order Recommendation

1. Finish Milestones 1-3 first. This turns the dream into real data.
2. Review one full sheet manually, starting with `ai-agentic`.
3. Add search fixtures for that sheet.
4. Build the minimal browser only after the data shape feels right.
5. Export prompt packets and try AI-assisted generation on 5 icons.
6. Decide whether the next plan should be the review workbench, hosted search, or runtime renderer.

---

## Self-Review Notes

- The plan covers the user's stated foundation need: profile every custom icon so it can be searched, tagged, assigned, modified, generated, organized, and later used by tools.
- NFT is explicitly excluded from the implementation path except as practical metadata inspiration.
- The first implementation does not require Supabase, Netlify, Railway, or model training.
- The plan creates a working data foundation before UI, hosting, or AI-specialist-model work.
- The plan follows existing repo patterns: `data/*`, `lib/*`, `scripts/build-*`, `scripts/verify-*`, generated previews, and public-safe projections.
