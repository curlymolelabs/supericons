# Natural Language Intent Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a broader curated natural-language intent dictionary so SuperIcons can handle vague, emotional, judgment, aesthetic, and product-domain search words without stuffing non-literal words into icon registry tags.

**Architecture:** Use external lexical resources only as offline suggestion inputs. The production source of truth will be a curated SuperIcons intent dictionary that compiles into `lib/search-intent-core.js` and is verified by deterministic fixtures before browser or MCP search uses it.

**Tech Stack:** JavaScript, JSON fixtures, existing `lib/search-intent-core.js`, existing hosted search functions, optional offline lexical suggestion scripts, Node verification scripts.

---

## Core Decision

Do not make live search depend on WordNet, ConceptNet, Datamuse, or embeddings at request time.

Use them only to help generate candidate mappings offline. Humans or maintainers approve the final mappings before they affect production search.

This prevents the search engine from becoming random, noisy, slow, license-risky, or hard to explain.

---

## Vocabulary Scope

Start with a practical intent pack, not the whole English dictionary.

Initial categories:

- Aesthetic: `beautiful`, `pretty`, `elegant`, `modern`, `stylish`, `minimal`, `clean`, `premium`
- Emotion: `happy`, `sad`, `angry`, `funny`, `playful`, `calm`, `excited`
- Judgment: `smart`, `stupid`, `bad`, `good`, `wrong`, `correct`, `useful`, `useless`
- Risk and state: `dangerous`, `safe`, `broken`, `suspicious`, `blocked`, `confused`
- Product work: `analyze`, `review`, `optimize`, `monitor`, `deploy`, `evaluate`, `compare`
- Tone: `professional`, `friendly`, `serious`, `creative`, `simple`

Each word maps to search concepts, preferred icon patterns, avoided icon patterns, and optional notes.

Example:

```json
{
  "term": "stupid",
  "category": "judgment",
  "variants": ["mistake", "error", "confused", "warning", "bug", "brain off"],
  "prefer": ["bug", "triangle-alert", "circle-alert", "x-circle", "brain", "face-frown"],
  "avoid": ["brain-circuit", "check", "badge-check"],
  "notes": "Treat as a negative or confused-state query, not as an insult target."
}
```

---

## File Structure

**Create:**

- `data/search-intent-dictionary/search-intent-dictionary.json`
  Curated production dictionary. Public-safe. No source-specific license text embedded in each row.

- `data/search-intent-dictionary/search-intent-dictionary.schema.json`
  JSON schema for dictionary shape.

- `data/search-intent-dictionary/search-intent-dictionary-fixtures.json`
  Test fixtures for expected variants and ranking behavior.

- `scripts/verify-search-intent-dictionary.mjs`
  Validates schema rules, duplicate terms, category names, unsafe empty mappings, and fixture coverage.

- `scripts/build-search-intent-core-from-dictionary.mjs`
  Compiles approved dictionary entries into the runtime map used by `lib/search-intent-core.js`.

- `scripts/suggest-search-intent-candidates.mjs`
  Optional offline helper that reads seed words and writes suggestion files under ignored or archived output folders. It must not update production dictionary directly.

- `docs/audits/2026-05-03-natural-language-intent-dictionary-policy.md`
  Short policy describing why external lexical sources are suggestion-only.

**Modify:**

- `lib/search-intent-core.js`
  Load or import generated intent rules from dictionary-derived data instead of hardcoding all rules inline.

- `package.json`
  Add scripts for dictionary verification, build, and suggestion generation.

- `docs/superpowers/plans/2026-05-03-search-intent-expansion-and-ranking-plan.md`
  Add a short note linking this plan as Phase 2.

**Do Not Modify:**

- `public/registry/records.json`
- `mcp/public/registry-records.json`
- Supabase registry tables
- `depicts`, unless a specific icon description is factually wrong

---

## Task 1: Add Dictionary Schema And Seed Dictionary

**Files:**

- Create: `data/search-intent-dictionary/search-intent-dictionary.schema.json`
- Create: `data/search-intent-dictionary/search-intent-dictionary.json`

- [ ] **Step 1: Create schema**

Create `data/search-intent-dictionary/search-intent-dictionary.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SuperIcons Search Intent Dictionary",
  "type": "object",
  "required": ["version", "categories", "entries"],
  "properties": {
    "version": { "type": "integer", "minimum": 1 },
    "categories": {
      "type": "array",
      "items": { "type": "string", "minLength": 1 },
      "uniqueItems": true
    },
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["term", "category", "variants", "prefer", "avoid"],
        "properties": {
          "term": { "type": "string", "minLength": 1 },
          "category": { "type": "string", "minLength": 1 },
          "variants": {
            "type": "array",
            "items": { "type": "string", "minLength": 1 },
            "minItems": 1,
            "uniqueItems": true
          },
          "prefer": {
            "type": "array",
            "items": { "type": "string", "minLength": 1 },
            "minItems": 1,
            "uniqueItems": true
          },
          "avoid": {
            "type": "array",
            "items": { "type": "string", "minLength": 1 },
            "uniqueItems": true
          },
          "avoid_unless": {
            "type": "array",
            "items": { "type": "string", "minLength": 1 },
            "uniqueItems": true
          },
          "notes": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Create seed dictionary**

Create `data/search-intent-dictionary/search-intent-dictionary.json`:

```json
{
  "version": 1,
  "categories": [
    "aesthetic",
    "emotion",
    "judgment",
    "risk_state",
    "product_work",
    "tone"
  ],
  "entries": [
    {
      "term": "beautiful",
      "category": "aesthetic",
      "variants": ["design theme", "palette", "swatch", "sparkles", "star", "heart", "flower"],
      "prefer": ["palette", "swatch", "sparkles", "star", "heart", "flower"],
      "avoid": [],
      "notes": "Aesthetic positive search; prefer visual customization and delight icons."
    },
    {
      "term": "stupid",
      "category": "judgment",
      "variants": ["mistake", "error", "confused", "warning", "bug", "brain off"],
      "prefer": ["bug", "triangle-alert", "circle-alert", "x-circle", "brain", "face-frown"],
      "avoid": ["brain-circuit", "check", "badge-check"],
      "notes": "Treat as negative or confused-state intent, not as a person-targeting insult."
    },
    {
      "term": "smart",
      "category": "judgment",
      "variants": ["ai", "brain", "brain circuit", "sparkles", "lightbulb"],
      "prefer": ["brain-circuit", "brain", "sparkles", "lightbulb"],
      "avoid": ["bug", "x-circle", "triangle-alert"],
      "notes": "Positive intelligence or clever automation intent."
    },
    {
      "term": "broken",
      "category": "risk_state",
      "variants": ["error", "bug", "warning", "x circle", "wrench"],
      "prefer": ["bug", "triangle-alert", "circle-alert", "x-circle", "wrench"],
      "avoid": ["check", "badge-check"],
      "notes": "Failure, bug, or repair intent."
    },
    {
      "term": "professional",
      "category": "tone",
      "variants": ["briefcase", "building office", "shield check", "badge check"],
      "prefer": ["briefcase", "building", "shield", "badge"],
      "avoid": ["party", "smile", "game"],
      "notes": "Business or enterprise tone."
    }
  ]
}
```

- [ ] **Step 3: Verify file is valid JSON**

Run:

```powershell
node -e "JSON.parse(require('fs').readFileSync('data/search-intent-dictionary/search-intent-dictionary.json','utf8')); JSON.parse(require('fs').readFileSync('data/search-intent-dictionary/search-intent-dictionary.schema.json','utf8')); console.log('json ok')"
```

Expected:

```text
json ok
```

---

## Task 2: Add Dictionary Verifier

**Files:**

- Create: `scripts/verify-search-intent-dictionary.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create verifier**

Create `scripts/verify-search-intent-dictionary.mjs`:

```js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dictionaryPath = resolve('data/search-intent-dictionary/search-intent-dictionary.json');
const dictionary = JSON.parse(readFileSync(dictionaryPath, 'utf8'));

const allowedCategories = new Set(dictionary.categories || []);
const terms = new Set();
const failures = [];

assert.equal(typeof dictionary.version, 'number', 'dictionary.version must be a number');
assert.ok(Array.isArray(dictionary.categories), 'dictionary.categories must be an array');
assert.ok(Array.isArray(dictionary.entries), 'dictionary.entries must be an array');

for (const entry of dictionary.entries) {
  const term = String(entry.term || '').trim().toLowerCase();
  if (!term) failures.push('entry has empty term');
  if (terms.has(term)) failures.push(`duplicate term: ${term}`);
  terms.add(term);

  if (!allowedCategories.has(entry.category)) {
    failures.push(`${term}: unknown category "${entry.category}"`);
  }

  for (const field of ['variants', 'prefer', 'avoid']) {
    if (!Array.isArray(entry[field])) {
      failures.push(`${term}: ${field} must be an array`);
      continue;
    }
  }

  if ((entry.variants || []).length === 0) {
    failures.push(`${term}: variants must not be empty`);
  }

  if ((entry.prefer || []).length === 0) {
    failures.push(`${term}: prefer must not be empty`);
  }

  const allTerms = [...entry.variants, ...entry.prefer, ...(entry.avoid || []), ...(entry.avoid_unless || [])];
  for (const value of allTerms) {
    if (String(value || '').trim().length === 0) {
      failures.push(`${term}: contains an empty mapping string`);
    }
  }
}

if (failures.length > 0) {
  console.error('verify-search-intent-dictionary: failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-search-intent-dictionary: ok');
```

- [ ] **Step 2: Add package script**

Add to `package.json` scripts:

```json
"verify:search-intent-dictionary": "node scripts/verify-search-intent-dictionary.mjs"
```

- [ ] **Step 3: Run verifier**

Run:

```powershell
npm run verify:search-intent-dictionary
```

Expected:

```text
verify-search-intent-dictionary: ok
```

---

## Task 3: Compile Dictionary Into Runtime Intent Rules

**Files:**

- Create: `scripts/build-search-intent-core-from-dictionary.mjs`
- Create: `lib/generated-search-intent-rules.js`
- Modify: `lib/search-intent-core.js`
- Modify: `package.json`

- [ ] **Step 1: Create build script**

Create `scripts/build-search-intent-core-from-dictionary.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toPatternSource(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (/^[a-z0-9-]+$/i.test(normalized)) {
    return normalized.includes('-')
      ? normalized.split('-').map(escapeRegExp).join('[-_ ]')
      : escapeRegExp(normalized);
  }
  return escapeRegExp(normalized).replace(/\\ /g, '[-_ ]');
}

const dictionary = JSON.parse(readFileSync(resolve('data/search-intent-dictionary/search-intent-dictionary.json'), 'utf8'));
const entries = {};

for (const entry of dictionary.entries) {
  entries[entry.term] = {
    variants: entry.variants,
    prefer: entry.prefer.map((value) => toPatternSource(value)).filter(Boolean),
    avoid: entry.avoid.map((value) => toPatternSource(value)).filter(Boolean),
    avoidUnless: entry.avoid_unless || [],
  };
}

const output = `// Generated by scripts/build-search-intent-core-from-dictionary.mjs
// Do not edit by hand. Edit data/search-intent-dictionary/search-intent-dictionary.json instead.

export const GENERATED_INTENT_RULES = Object.freeze(${JSON.stringify(entries, null, 2)});
`;

writeFileSync(resolve('lib/generated-search-intent-rules.js'), output);
console.log('build-search-intent-core-from-dictionary: ok');
```

- [ ] **Step 2: Modify runtime core**

Modify `lib/search-intent-core.js`:

```js
import { GENERATED_INTENT_RULES } from './generated-search-intent-rules.js';
```

Then merge generated rules with any local emergency rules:

```js
function compileRule(rule) {
  return {
    variants: rule.variants || [],
    prefer: (rule.prefer || []).map((source) => new RegExp(source, 'i')),
    avoid: (rule.avoid || []).map((source) => new RegExp(source, 'i')),
    avoidUnless: rule.avoidUnless || rule.avoid_unless || []
  };
}

const INTENT_RULES = Object.freeze(
  Object.fromEntries(
    Object.entries(GENERATED_INTENT_RULES).map(([term, rule]) => [term, compileRule(rule)])
  )
);
```

Keep `normalizeIntentText`, `tokenizeIntentText`, `buildSearchIntentProfile`, `buildIntentQueryVariants`, and `getIntentCandidateAdjustment` behavior unchanged.

- [ ] **Step 3: Add package script**

Add:

```json
"build:search-intent-dictionary": "node scripts/build-search-intent-core-from-dictionary.mjs"
```

- [ ] **Step 4: Build generated file**

Run:

```powershell
npm run build:search-intent-dictionary
```

Expected:

```text
build-search-intent-core-from-dictionary: ok
```

- [ ] **Step 5: Verify existing intent expansion**

Run:

```powershell
npm run verify:search-intent-expansion
npm run verify:search-intent-dictionary
```

Expected:

```text
verify-search-intent-expansion: ok
verify-search-intent-dictionary: ok
```

---

## Task 4: Add Broader Fixture Coverage

**Files:**

- Create: `data/search-intent-dictionary/search-intent-dictionary-fixtures.json`
- Modify: `scripts/verify-search-intent-dictionary.mjs`

- [ ] **Step 1: Create fixture file**

Create `data/search-intent-dictionary/search-intent-dictionary-fixtures.json`:

```json
{
  "version": 1,
  "fixtures": [
    {
      "query": "stupid",
      "expected_variants": ["mistake", "error", "confused", "warning", "bug"],
      "expected_prefer": ["bug", "triangle-alert", "x-circle"],
      "expected_avoid": ["brain-circuit", "check"]
    },
    {
      "query": "smart",
      "expected_variants": ["ai", "brain", "brain circuit", "sparkles", "lightbulb"],
      "expected_prefer": ["brain-circuit", "brain", "lightbulb"],
      "expected_avoid": ["bug", "x-circle"]
    },
    {
      "query": "broken",
      "expected_variants": ["error", "bug", "warning", "x circle", "wrench"],
      "expected_prefer": ["bug", "triangle-alert", "wrench"],
      "expected_avoid": ["check"]
    },
    {
      "query": "professional",
      "expected_variants": ["briefcase", "building office", "shield check", "badge check"],
      "expected_prefer": ["briefcase", "building", "shield"],
      "expected_avoid": ["party", "smile"]
    }
  ]
}
```

- [ ] **Step 2: Extend verifier**

Modify `scripts/verify-search-intent-dictionary.mjs` to also:

1. Load `data/search-intent-dictionary/search-intent-dictionary-fixtures.json`.
2. Import `buildIntentQueryVariants`, `buildSearchIntentProfile`, and `getIntentCandidateAdjustment` from `../lib/search-intent-core.js`.
3. Assert each fixture expected variant appears in `buildIntentQueryVariants(query)`.
4. Assert a fake preferred candidate gets `boost > 0`.
5. Assert a fake avoided candidate gets `penalty > 0`.

Add this code after dictionary shape checks:

```js
const fixtures = JSON.parse(readFileSync(resolve('data/search-intent-dictionary/search-intent-dictionary-fixtures.json'), 'utf8'));
const { buildIntentQueryVariants, buildSearchIntentProfile, getIntentCandidateAdjustment } = await import('../lib/search-intent-core.js');

function includesVariant(variants, expected) {
  return variants.some((variant) => variant === expected || variant.includes(expected) || expected.includes(variant));
}

for (const fixture of fixtures.fixtures || []) {
  const variants = buildIntentQueryVariants(fixture.query);
  for (const expected of fixture.expected_variants || []) {
    if (!includesVariant(variants, expected)) {
      failures.push(`${fixture.query}: missing expected variant "${expected}"`);
    }
  }

  const profile = buildSearchIntentProfile(fixture.query);
  for (const preferred of fixture.expected_prefer || []) {
    const adjustment = getIntentCandidateAdjustment({ icon_id: `test:${preferred}`, name: preferred }, profile);
    if (adjustment.boost <= 0) failures.push(`${fixture.query}: expected ${preferred} to be boosted`);
  }
  for (const avoided of fixture.expected_avoid || []) {
    const adjustment = getIntentCandidateAdjustment({ icon_id: `test:${avoided}`, name: avoided }, profile);
    if (adjustment.penalty <= 0) failures.push(`${fixture.query}: expected ${avoided} to be penalized`);
  }
}
```

- [ ] **Step 3: Verify**

Run:

```powershell
npm run build:search-intent-dictionary
npm run verify:search-intent-dictionary
npm run verify:search-intent-expansion
```

Expected all three commands to pass.

---

## Task 5: Add Offline Suggestion Helper

**Files:**

- Create: `scripts/suggest-search-intent-candidates.mjs`
- Modify: `.gitignore` if needed
- Modify: `package.json`

- [ ] **Step 1: Create suggestion script**

Create `scripts/suggest-search-intent-candidates.mjs`:

```js
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const terms = process.argv.slice(2).map((term) => term.trim()).filter(Boolean);
if (terms.length === 0) {
  console.error('Usage: node scripts/suggest-search-intent-candidates.mjs stupid smart broken');
  process.exit(1);
}

async function getDatamuseSuggestions(term) {
  const url = `https://api.datamuse.com/words?ml=${encodeURIComponent(term)}&max=20`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Datamuse request failed for ${term}: ${response.status}`);
  const rows = await response.json();
  return rows.map((row) => row.word).filter(Boolean);
}

const output = {
  generated_at: new Date().toISOString(),
  source: 'datamuse_ml_suggestions',
  note: 'Suggestion-only file. Do not use directly in production search.',
  terms: []
};

for (const term of terms) {
  const suggestions = await getDatamuseSuggestions(term);
  output.terms.push({ term, suggestions });
}

const outputDir = resolve('output/search-intent-suggestions');
mkdirSync(outputDir, { recursive: true });
const outputPath = resolve(outputDir, `suggestions-${Date.now()}.json`);
writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`suggest-search-intent-candidates: ${outputPath}`);
```

- [ ] **Step 2: Confirm output folder is ignored**

Check `.gitignore` includes `output/`. If not, add:

```text
output/
```

- [ ] **Step 3: Add package script**

Add:

```json
"suggest:search-intent-candidates": "node scripts/suggest-search-intent-candidates.mjs"
```

- [ ] **Step 4: Test suggestion helper**

Run:

```powershell
npm run suggest:search-intent-candidates -- stupid smart broken
```

Expected:

```text
suggest-search-intent-candidates: <path-to-output-json>
```

Do not commit generated output suggestion files.

---

## Task 6: Document Policy And Operating Workflow

**Files:**

- Create: `docs/audits/2026-05-03-natural-language-intent-dictionary-policy.md`
- Modify: `docs/superpowers/plans/2026-05-03-search-intent-expansion-and-ranking-plan.md`

- [ ] **Step 1: Create policy doc**

Create `docs/audits/2026-05-03-natural-language-intent-dictionary-policy.md`:

```markdown
# Natural Language Intent Dictionary Policy

## Purpose

SuperIcons search should understand natural human words that do not literally appear in icon names or registry tags.

Examples include aesthetic words such as `beautiful`, judgment words such as `stupid`, and product words such as `deployment`.

## Source Of Truth

The production source of truth is `data/search-intent-dictionary/search-intent-dictionary.json`.

External lexical resources may suggest candidates, but they do not publish directly into search behavior.

## External Sources

Allowed suggestion sources:

- WordNet-style lexical relations
- Datamuse related-word suggestions
- ConceptNet-style conceptual associations
- Embedding similarity checks

These sources are used only during offline maintenance.

## Approval Rule

Every production mapping must be reviewed for:

- Does the mapped icon concept make sense to a normal human?
- Could the word have a harmful or insulting interpretation?
- Does the mapping improve search without hiding better literal matches?
- Does the mapping avoid polluting `depicts` or literal icon tags?

## Example

`stupid` should map to mistake/error/confused-state icons, not to a person or identity.

Good concepts:

- bug
- warning
- x circle
- confused face
- brain off

Avoid concepts:

- user
- profile
- check
- brain circuit
```

- [ ] **Step 2: Link Phase 2 plan**

Append to `docs/superpowers/plans/2026-05-03-search-intent-expansion-and-ranking-plan.md`:

```markdown
## Phase 2 Link

The broad natural-language dictionary expansion is planned in `docs/superpowers/plans/2026-05-03-natural-language-intent-dictionary-plan.md`.
```

---

## Task 7: Verification And Deployment

**Files:**

- No additional files.

- [ ] **Step 1: Run local verification**

Run:

```powershell
npm run build:search-intent-dictionary
npm run verify:search-intent-dictionary
npm run verify:search-intent-expansion
npm run verify:hosted-search-engine
npm run verify:si-registry
```

Expected:

```text
build-search-intent-core-from-dictionary: ok
verify-search-intent-dictionary: ok
verify-search-intent-expansion: ok
verify-hosted-search-engine: ok
verify-si-registry-projections: ok
```

- [ ] **Step 2: Deploy hosted search functions**

Run:

```powershell
npx supabase functions deploy search-icons --project-ref kcjmkakdhsqplvasgkjv
npx supabase functions deploy mcp-search --project-ref kcjmkakdhsqplvasgkjv --no-verify-jwt
```

Expected:

```text
Deployed Functions on project kcjmkakdhsqplvasgkjv: search-icons
Deployed Functions on project kcjmkakdhsqplvasgkjv: mcp-search
```

- [ ] **Step 3: Run live checks**

Add or extend `scripts/verify-hosted-search-intent-live.mjs` to include:

```js
{ query: 'stupid', expectAny: ['bug', 'alert', 'warning', 'x-circle', 'brain'] },
{ query: 'smart', expectAny: ['brain', 'brain-circuit', 'lightbulb', 'sparkles'] },
{ query: 'broken', expectAny: ['bug', 'alert', 'warning', 'x-circle', 'wrench'] },
{ query: 'professional', expectAny: ['briefcase', 'building', 'shield', 'badge'] }
```

Run:

```powershell
npm run verify:hosted-search-intent-live
```

Expected:

```text
verify-hosted-search-intent-live: ok
```

- [ ] **Step 4: Browser spot check**

In the browser search input, test:

```text
stupid
smart
broken
professional
beautiful
dataset
monitoring
```

Expected:

- `stupid` returns error, bug, warning, confused-state, or negative-state icons.
- `smart` returns AI, brain, lightbulb, or sparkle-style icons.
- `broken` returns bug, warning, repair, or error-state icons.
- `professional` returns business, office, badge, shield, or enterprise-tone icons.
- Previously working terms still work.

---

## Rollback Plan

If search quality becomes worse:

1. Revert changes to:
   - `data/search-intent-dictionary/`
   - `lib/generated-search-intent-rules.js`
   - `lib/search-intent-core.js`
   - dictionary verifier/build scripts
2. Redeploy previous `search-icons` and `mcp-search` functions.
3. Keep registry data unchanged. This plan must not mutate icon records.

---

## Success Criteria

- The intent dictionary covers at least 25 non-literal words in the first production pass.
- All dictionary entries are verified by fixtures.
- Browser search and MCP search share the same dictionary behavior.
- External sources are suggestion-only and never become production search behavior automatically.
- No registry `depicts` field is changed for abstract human intent words.
- Live search returns meaningful results for `stupid`, `smart`, `broken`, `professional`, `beautiful`, `dataset`, and `monitoring`.

---

## Self-Review

Spec coverage:

- Uses open/online resources without depending on them live: covered by Tasks 5 and 6.
- Avoids building all words by hand: covered by offline suggestion helper.
- Keeps SuperIcons source of truth curated: covered by dictionary files and verifier.
- Handles `stupid` and similar vague terms: covered by seed dictionary and fixtures.
- Protects registry quality: explicit do-not-modify boundaries and rollback plan.

Placeholder scan:

- No open-ended implementation placeholders remain.

Type consistency:

- Dictionary fields match verifier and build script fields.
- Generated rule field names match `lib/search-intent-core.js` expectations.
