import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconLabRoot = path.join(repoRoot, "data", "supericons", "icon-lab");
const schemaRoot = path.join(iconLabRoot, "schemas");
const packId = "agentic-ai-core-kit-001";
const packRoot = path.join(iconLabRoot, "packs", `${packId}.sipack`);
const stagingRoot = path.join(repoRoot, "output", "supericons", "icon-lab", "staging", packId);
const verificationPath = path.join(repoRoot, "references", "verification", "icons-lab-static-core-2026-06-19.md");

const previewSizes = [16, 20, 24, 32, 48, 128];
const previewThemes = [
  { id: "light", foreground: "#111827", background: "#ffffff" },
  { id: "dark", foreground: "#f8fafc", background: "#111827" },
];

const outlineRecipe = {
  schemaVersion: "1.0.0",
  id: "si-outline-rounded-24",
  name: "Supericons Outline Rounded 24",
  purpose: "Default static-core recipe for agentic AI outline icons.",
  canvas: { viewBox: "0 0 24 24", width: 24, height: 24, safeArea: 2 },
  stroke: { width: 1.5, color: "currentColor", linecap: "round", linejoin: "round" },
  fill: { default: "none", allowedValues: ["none"] },
  density: { target: "medium", maxShapeElements: 10 },
  variants: ["outline"],
  allowedElements: ["svg", "title", "desc", "g", "path", "line", "rect", "circle", "polyline", "polygon", "ellipse"],
  exportRules: {
    requireCurrentColor: true,
    requireAccessibleTitle: true,
    disallowRasterEmbeds: true,
    disallowForeignObject: true,
    disallowTextElements: true,
  },
};

const styleRecipes = [
  outlineRecipe,
  {
    schemaVersion: "1.0.0",
    id: "si-filled-rounded-24",
    name: "Supericons Filled Rounded 24",
    purpose: "Filled static variant template for later pack expansion.",
    canvas: { viewBox: "0 0 24 24", width: 24, height: 24, safeArea: 2 },
    stroke: { width: 0, color: "none", linecap: "round", linejoin: "round" },
    fill: { default: "currentColor", allowedValues: ["currentColor", "none"] },
    density: { target: "medium", maxShapeElements: 8 },
    variants: ["filled"],
    allowedElements: ["svg", "title", "desc", "g", "path", "rect", "circle", "polyline", "polygon", "ellipse"],
    exportRules: {
      requireCurrentColor: true,
      requireAccessibleTitle: true,
      disallowRasterEmbeds: true,
      disallowForeignObject: true,
      disallowTextElements: true,
    },
  },
  {
    schemaVersion: "1.0.0",
    id: "si-duotone-rounded-24",
    name: "Supericons Duotone Rounded 24",
    purpose: "Duotone static variant template for premium icon sets.",
    canvas: { viewBox: "0 0 24 24", width: 24, height: 24, safeArea: 2 },
    stroke: { width: 1.5, color: "currentColor", linecap: "round", linejoin: "round" },
    fill: { default: "currentColor", allowedValues: ["currentColor", "none"] },
    density: { target: "medium", maxShapeElements: 12 },
    variants: ["duotone"],
    allowedElements: ["svg", "title", "desc", "g", "path", "line", "rect", "circle", "polyline", "polygon", "ellipse"],
    exportRules: {
      requireCurrentColor: true,
      requireAccessibleTitle: true,
      disallowRasterEmbeds: true,
      disallowForeignObject: true,
      disallowTextElements: true,
    },
  },
];

const concepts = [
  {
    slug: "agent-core",
    name: "Agent Core",
    depicts: "The central reasoning loop of an AI agent.",
    useCase: "Use for agent runtimes, orchestration centers, autonomous workers, and AI core settings.",
    category: "agentic-ai",
    assetType: "workflow-icon",
    primaryMetaphor: "A center node with four balanced orbit points.",
    avoidMetaphors: ["robot face", "sparkles", "generic brain"],
    siblingConcepts: ["tool-call", "memory-checkpoint", "trace-span"],
    searchTerms: ["agent", "ai agent", "agent core", "orchestration", "autonomous worker", "reasoning loop"],
    body: `
  <circle cx="12" cy="12" r="3.5" />
  <circle cx="6" cy="12" r="1.2" />
  <circle cx="18" cy="12" r="1.2" />
  <circle cx="12" cy="6" r="1.2" />
  <circle cx="12" cy="18" r="1.2" />
  <path d="M8 12 H10" />
  <path d="M14 12 H16" />
  <path d="M12 8 V10" />
  <path d="M12 14 V16" />`,
  },
  {
    slug: "tool-call",
    name: "Tool Call",
    depicts: "An agent invoking an external tool.",
    useCase: "Use for function calls, API actions, MCP tools, browser actions, and agent tool execution.",
    category: "agentic-ai",
    assetType: "action-icon",
    primaryMetaphor: "A connector line from an intent point into a tool module.",
    avoidMetaphors: ["phone call", "hammer", "wrench"],
    siblingConcepts: ["tool-result", "approval-gate", "trace-span"],
    searchTerms: ["tool call", "function call", "mcp tool", "api action", "agent action", "external tool"],
    body: `
  <rect x="14" y="5" width="5" height="5" rx="1.2" />
  <circle cx="6" cy="18" r="1.4" />
  <path d="M7.5 16.5 L10.5 13.5 H15.5 V10" />
  <path d="M16.5 6.8 V8.2" />
  <path d="M15.8 7.5 H17.2" />`,
  },
  {
    slug: "tool-result",
    name: "Tool Result",
    depicts: "A completed response returned from a tool.",
    useCase: "Use for returned payloads, command output, tool observations, and result cards.",
    category: "agentic-ai",
    assetType: "state-icon",
    primaryMetaphor: "A small output card receiving a checked result.",
    avoidMetaphors: ["clipboard only", "database only", "checkmark-only status"],
    siblingConcepts: ["tool-call", "eval-run", "trace-span"],
    searchTerms: ["tool result", "tool output", "observation", "agent result", "response payload", "result card"],
    body: `
  <rect x="4" y="6" width="6" height="5" rx="1.2" />
  <rect x="14" y="12" width="6" height="6" rx="1.2" />
  <path d="M10 8.5 H13.5" />
  <path d="M12.5 8.5 V15" />
  <path d="M15.8 15 L17 16.2 L19 14" />`,
  },
  {
    slug: "context-window",
    name: "Context Window",
    depicts: "The active context available to an AI model or agent.",
    useCase: "Use for context length, prompt windows, session memory, and visible working set controls.",
    category: "agentic-ai",
    assetType: "system-icon",
    primaryMetaphor: "A bounded document window with aligned context rows.",
    avoidMetaphors: ["browser window", "chat bubble", "file-only metaphor"],
    siblingConcepts: ["context-compaction", "memory-checkpoint", "token-meter"],
    searchTerms: ["context window", "context length", "prompt context", "working memory", "session context", "model context"],
    body: `
  <rect x="5" y="4" width="14" height="16" rx="2" />
  <path d="M8 8 H16" />
  <path d="M8 11 H15" />
  <path d="M8 14 H16" />
  <path d="M8 17 H12" />`,
  },
  {
    slug: "context-compaction",
    name: "Context Compaction",
    depicts: "A long context being summarized into a smaller usable state.",
    useCase: "Use for summarization, context compression, session handoff, and memory reduction.",
    category: "agentic-ai",
    assetType: "workflow-icon",
    primaryMetaphor: "Three full rows converging into a compact capsule.",
    avoidMetaphors: ["trash", "zip file", "collapse chevron only"],
    siblingConcepts: ["context-window", "memory-checkpoint", "agent-handoff"],
    searchTerms: ["context compaction", "summarization", "context compression", "memory reduction", "compact context", "session summary"],
    body: `
  <path d="M4 7 H12" />
  <path d="M4 12 H12" />
  <path d="M4 17 H12" />
  <path d="M13 8 L18 12 L13 16" />
  <path d="M16 12 H20" />`,
  },
  {
    slug: "memory-checkpoint",
    name: "Memory Checkpoint",
    depicts: "A saved memory state that an agent can return to.",
    useCase: "Use for checkpoints, saved state, durable memory, resume points, and session snapshots.",
    category: "agentic-ai",
    assetType: "state-icon",
    primaryMetaphor: "A saved note anchored by a checkpoint marker.",
    avoidMetaphors: ["cloud sync", "hard drive", "generic bookmark only"],
    siblingConcepts: ["context-window", "context-compaction", "agent-handoff"],
    searchTerms: ["memory checkpoint", "saved state", "agent memory", "resume point", "snapshot", "checkpoint"],
    body: `
  <rect x="7" y="4" width="10" height="13" rx="1.5" />
  <path d="M9.5 8 H14.5" />
  <path d="M9.5 11 H13" />
  <circle cx="12" cy="19" r="2" />
  <path d="M11 19 L12 20 L14 18" />`,
  },
  {
    slug: "agent-handoff",
    name: "Agent Handoff",
    depicts: "One agent passing work to another agent or human.",
    useCase: "Use for handoffs, delegation, human escalation, specialist agent routing, and workflow transfer.",
    category: "agentic-ai",
    assetType: "workflow-icon",
    primaryMetaphor: "Two participants connected by a small transfer channel.",
    avoidMetaphors: ["handshake", "people-only icon", "arrow-only transfer"],
    siblingConcepts: ["approval-gate", "context-compaction", "memory-checkpoint"],
    searchTerms: ["agent handoff", "handoff", "delegation", "human escalation", "agent routing", "workflow transfer"],
    body: `
  <circle cx="7" cy="12" r="3" />
  <circle cx="17" cy="12" r="3" />
  <rect x="10" y="9" width="4" height="6" rx="1.2" />
  <path d="M9 12 H15" />
  <path d="M12 10.5 L13.5 12 L12 13.5" />`,
  },
  {
    slug: "approval-gate",
    name: "Approval Gate",
    depicts: "A human or policy decision point before an agent continues.",
    useCase: "Use for permission prompts, review gates, confirmation steps, and guarded automation.",
    category: "agentic-ai",
    assetType: "state-icon",
    primaryMetaphor: "A gate panel with a check path inside.",
    avoidMetaphors: ["padlock only", "security shield only", "generic check circle"],
    siblingConcepts: ["policy-guardrail", "agent-handoff", "tool-call"],
    searchTerms: ["approval gate", "permission", "human approval", "review gate", "confirmation", "guarded action"],
    body: `
  <rect x="6" y="5" width="12" height="14" rx="2" />
  <path d="M9 13 L11 15 L15 10" />
  <path d="M6 9 H18" />`,
  },
  {
    slug: "policy-guardrail",
    name: "Policy Guardrail",
    depicts: "A boundary that keeps an agent inside allowed behavior.",
    useCase: "Use for safety rules, policy checks, compliance boundaries, protected actions, and blocked flows.",
    category: "agentic-ai",
    assetType: "system-icon",
    primaryMetaphor: "A shield-like lane with two horizontal guardrails.",
    avoidMetaphors: ["warning triangle only", "police badge", "wall"],
    siblingConcepts: ["approval-gate", "trace-span", "eval-run"],
    searchTerms: ["policy guardrail", "guardrail", "safety policy", "compliance", "blocked action", "protected flow"],
    body: `
  <path d="M6 20 V9 L12 5 L18 9 V20" />
  <path d="M8 12 H16" />
  <path d="M8 16 H16" />`,
  },
  {
    slug: "trace-span",
    name: "Trace Span",
    depicts: "A timed operation inside an agent trace.",
    useCase: "Use for logs, spans, traces, observability, debugging, and execution timelines.",
    category: "agentic-ai",
    assetType: "system-icon",
    primaryMetaphor: "Offset timeline rows with marked span endpoints.",
    avoidMetaphors: ["clock only", "terminal only", "analytics chart"],
    siblingConcepts: ["tool-call", "tool-result", "eval-run"],
    searchTerms: ["trace span", "trace", "observability", "execution timeline", "agent logs", "debug span"],
    body: `
  <path d="M5 7 H19" />
  <path d="M5 12 H15" />
  <path d="M5 17 H12" />
  <circle cx="8" cy="7" r="1.2" />
  <circle cx="15" cy="12" r="1.2" />
  <circle cx="12" cy="17" r="1.2" />`,
  },
  {
    slug: "eval-run",
    name: "Eval Run",
    depicts: "A repeatable test run for agent quality.",
    useCase: "Use for evaluation suites, benchmark runs, quality tests, prompt tests, and model checks.",
    category: "agentic-ai",
    assetType: "workflow-icon",
    primaryMetaphor: "A test card with a diagonal quality mark.",
    avoidMetaphors: ["school exam", "trophy", "speedometer"],
    siblingConcepts: ["trace-span", "tool-result", "policy-guardrail"],
    searchTerms: ["eval run", "evaluation", "benchmark", "quality test", "prompt test", "agent eval"],
    body: `
  <rect x="5" y="5" width="14" height="14" rx="2" />
  <path d="M8 9 H16" />
  <path d="M8 12 H13" />
  <path d="M8 15 L10 17 L16 10" />`,
  },
  {
    slug: "token-meter",
    name: "Token Meter",
    depicts: "A compact meter for token usage or budget.",
    useCase: "Use for token budgets, usage limits, context spend, cost indicators, and model capacity.",
    category: "agentic-ai",
    assetType: "metric-icon",
    primaryMetaphor: "A small segmented meter with three token bars.",
    avoidMetaphors: ["coin stack", "battery only", "gas gauge"],
    siblingConcepts: ["context-window", "context-compaction", "eval-run"],
    searchTerms: ["token meter", "token budget", "usage", "context spend", "model capacity", "rate limit"],
    body: `
  <rect x="5" y="7" width="14" height="10" rx="2" />
  <rect x="8" y="10" width="2" height="4" rx="0.8" />
  <rect x="11" y="10" width="2" height="4" rx="0.8" />
  <rect x="14" y="10" width="2" height="4" rx="0.8" />
  <path d="M5 20 H19" />`,
  },
];

const schemas = {
  "pack.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://supericons.dev/schemas/icon-lab/pack.schema.json",
    title: "Icons Lab Pack",
    type: "object",
    required: ["schemaVersion", "id", "name", "description", "status", "defaultRecipeId", "concepts"],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "string" },
      id: { type: "string", pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]{3}$" },
      name: { type: "string" },
      description: { type: "string" },
      status: { enum: ["draft", "owner_review", "approved", "archived"] },
      defaultRecipeId: { type: "string" },
      targetCount: { type: "integer", minimum: 1 },
      targetQualityLevel: { enum: ["L1 usable", "L2 benchmark", "L3 Supericons grade", "L4 signature"] },
      accessTier: { enum: ["free_candidate", "premium_candidate", "internal"] },
      concepts: { type: "array", items: { type: "string", pattern: "^si:[a-z0-9]+(?:-[a-z0-9]+)*$" } },
      sourcePackage: { type: "string" },
    },
  },
  "style-recipe.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://supericons.dev/schemas/icon-lab/style-recipe.schema.json",
    title: "Icons Lab Style Recipe",
    type: "object",
    required: ["schemaVersion", "id", "name", "canvas", "stroke", "fill", "density", "variants", "allowedElements", "exportRules"],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "string" },
      id: { type: "string" },
      name: { type: "string" },
      purpose: { type: "string" },
      canvas: {
        type: "object",
        required: ["viewBox", "width", "height", "safeArea"],
        additionalProperties: false,
        properties: {
          viewBox: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          safeArea: { type: "number" },
        },
      },
      stroke: {
        type: "object",
        required: ["width", "color", "linecap", "linejoin"],
        additionalProperties: false,
        properties: {
          width: { type: "number" },
          color: { type: "string" },
          linecap: { type: "string" },
          linejoin: { type: "string" },
        },
      },
      fill: {
        type: "object",
        required: ["default", "allowedValues"],
        additionalProperties: false,
        properties: {
          default: { type: "string" },
          allowedValues: { type: "array", items: { type: "string" } },
        },
      },
      density: {
        type: "object",
        required: ["target", "maxShapeElements"],
        additionalProperties: false,
        properties: {
          target: { type: "string" },
          maxShapeElements: { type: "integer" },
        },
      },
      variants: { type: "array", items: { type: "string" } },
      allowedElements: { type: "array", items: { type: "string" } },
      exportRules: { type: "object" },
    },
  },
  "concept.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://supericons.dev/schemas/icon-lab/concept.schema.json",
    title: "Icons Lab Concept Brief",
    type: "object",
    required: ["schemaVersion", "id", "packId", "slug", "name", "depicts", "useCase", "primaryMetaphor", "avoidMetaphors", "siblingConcepts", "searchTerms", "targetSizes", "status"],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "string" },
      id: { type: "string", pattern: "^si:[a-z0-9]+(?:-[a-z0-9]+)*$" },
      packId: { type: "string" },
      slug: { type: "string" },
      name: { type: "string" },
      depicts: { type: "string" },
      useCase: { type: "string" },
      category: { type: "string" },
      assetType: { type: "string" },
      primaryMetaphor: { type: "string" },
      avoidMetaphors: { type: "array", items: { type: "string" } },
      siblingConcepts: { type: "array", items: { type: "string" } },
      searchTerms: { type: "array", items: { type: "string" } },
      targetSizes: { type: "array", items: { type: "integer" } },
      status: { enum: ["brief_ready", "variant_ready", "owner_review", "approved", "archived"] },
    },
  },
  "static-variant.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://supericons.dev/schemas/icon-lab/static-variant.schema.json",
    title: "Icons Lab Static Variant",
    type: "object",
    required: ["schemaVersion", "id", "conceptId", "variantType", "styleRecipeId", "svgPath", "targetSizes", "qualityLevel", "reviewState"],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "string" },
      id: { type: "string" },
      conceptId: { type: "string" },
      variantType: { enum: ["outline", "filled", "duotone", "mono"] },
      styleRecipeId: { type: "string" },
      svgPath: { type: "string" },
      targetSizes: { type: "array", items: { type: "integer" } },
      strokeEditable: { type: "boolean" },
      qualityLevel: { enum: ["L1 usable", "L2 benchmark", "L3 Supericons grade", "L4 signature"] },
      reviewState: { enum: ["owner_review_required", "approved", "changes_requested"] },
    },
  },
  "qa-report.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://supericons.dev/schemas/icon-lab/qa-report.schema.json",
    title: "Icons Lab QA Report",
    type: "object",
    required: ["schemaVersion", "conceptId", "variantId", "status", "checks", "issues", "warnings"],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "string" },
      conceptId: { type: "string" },
      variantId: { type: "string" },
      status: { enum: ["pass", "fail"] },
      checks: { type: "object" },
      metrics: { type: "object" },
      issues: { type: "array", items: { type: "string" } },
      warnings: { type: "array", items: { type: "string" } },
    },
  },
  "human-review-decision.schema.json": {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://supericons.dev/schemas/icon-lab/human-review-decision.schema.json",
    title: "Icons Lab Human Review Decision",
    type: "object",
    required: ["schemaVersion", "conceptId", "variantId", "decision", "reviewerRole", "notes", "decidedAt"],
    additionalProperties: false,
    properties: {
      schemaVersion: { type: "string" },
      conceptId: { type: "string" },
      variantId: { type: "string" },
      decision: { enum: ["pending_review", "approved", "changes_requested", "rejected"] },
      reviewerRole: { enum: ["human_owner", "design_lead"] },
      notes: { type: "string" },
      decidedAt: { type: ["string", "null"] },
    },
  },
};

async function main() {
  const command = process.argv[2] ?? "verify";

  if (command === "scaffold") {
    await scaffold();
    console.log(`Scaffolded ${packId} at ${relative(packRoot)}`);
    return;
  }

  if (command === "qa") {
    await runQa({ writeReports: true, failOnIssue: true });
    console.log(`QA passed for ${concepts.length} outline variants.`);
    return;
  }

  if (command === "render-previews") {
    await renderPreviews();
    console.log(`Rendered ${concepts.length * previewSizes.length * previewThemes.length} preview PNG files.`);
    return;
  }

  if (command === "export-staging") {
    await exportStaging();
    console.log(`Prepared export staging at ${relative(stagingRoot)}`);
    return;
  }

  if (command === "verify") {
    await verify();
    console.log(`Verified Icons Lab static core. Evidence: ${relative(verificationPath)}`);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function scaffold() {
  await fs.mkdir(schemaRoot, { recursive: true });
  await fs.mkdir(path.join(packRoot, "style-recipes"), { recursive: true });
  await fs.mkdir(path.dirname(verificationPath), { recursive: true });

  await Promise.all(Object.entries(schemas).map(([filename, schema]) => writeJson(path.join(schemaRoot, filename), schema)));
  await Promise.all(styleRecipes.map((recipe) => writeJson(path.join(packRoot, "style-recipes", `${recipe.id}.json`), recipe)));

  await writeJson(path.join(packRoot, "pack.json"), {
    schemaVersion: "1.0.0",
    id: packId,
    name: "Agentic AI Core Kit 001",
    description: "A first static source pack for agentic AI product concepts.",
    status: "owner_review",
    defaultRecipeId: outlineRecipe.id,
    targetCount: concepts.length,
    targetQualityLevel: "L3 Supericons grade",
    accessTier: "premium_candidate",
    concepts: concepts.map((concept) => `si:${concept.slug}`),
    sourcePackage: `data/supericons/icon-lab/packs/${packId}.sipack`,
  });

  for (const concept of concepts) {
    const conceptRoot = conceptDir(concept.slug);
    await fs.mkdir(path.join(conceptRoot, "variants"), { recursive: true });
    await fs.mkdir(path.join(conceptRoot, "previews"), { recursive: true });
    await fs.mkdir(path.join(conceptRoot, "qa"), { recursive: true });
    await fs.mkdir(path.join(conceptRoot, "review"), { recursive: true });

    await writeJson(path.join(conceptRoot, "concept.json"), conceptJson(concept));
    await fs.writeFile(path.join(conceptRoot, "brief.md"), conceptBrief(concept), "utf8");
    await fs.writeFile(path.join(conceptRoot, "variants", "outline.svg"), iconSvg(concept), "utf8");
    await writeJson(path.join(conceptRoot, "variants", "outline.variant.json"), variantJson(concept));
    await writeJson(path.join(conceptRoot, "review", "human-review-decision.json"), reviewJson(concept));
  }
}

async function runQa({ writeReports, failOnIssue }) {
  const recipe = await readJson(path.join(packRoot, "style-recipes", `${outlineRecipe.id}.json`));
  const results = [];

  for (const concept of concepts) {
    const report = await analyzeConceptVariant(concept, recipe);
    results.push(report);
    if (writeReports) {
      await writeJson(path.join(conceptDir(concept.slug), "qa", "outline.qa.json"), report);
    }
  }

  const failing = results.filter((result) => result.status !== "pass");
  if (failOnIssue && failing.length > 0) {
    const lines = failing.flatMap((result) => result.issues.map((issue) => `${result.conceptId}: ${issue}`));
    throw new Error(`Static QA failed:\n${lines.join("\n")}`);
  }

  return results;
}

async function analyzeConceptVariant(concept, recipe) {
  const svgPath = path.join(conceptDir(concept.slug), "variants", "outline.svg");
  const svg = await fs.readFile(svgPath, "utf8");
  const issues = [];
  const warnings = [];
  const checks = {};

  checks.viewBox = /viewBox="0 0 24 24"/.test(svg) ? "pass" : "fail";
  if (checks.viewBox === "fail") issues.push("SVG must use viewBox=\"0 0 24 24\".");

  checks.currentColor = svg.includes("currentColor") ? "pass" : "fail";
  if (checks.currentColor === "fail") issues.push("SVG must use currentColor for themeable color.");

  const strokeWidth = svg.match(/\bstroke-width="([^"]+)"/)?.[1];
  checks.strokeWidth = Number(strokeWidth) === recipe.stroke.width ? "pass" : "fail";
  if (checks.strokeWidth === "fail") issues.push(`SVG stroke width must be ${recipe.stroke.width}.`);

  checks.strokeLinecap = new RegExp(`stroke-linecap="${recipe.stroke.linecap}"`).test(svg) ? "pass" : "fail";
  if (checks.strokeLinecap === "fail") issues.push(`SVG stroke-linecap must be ${recipe.stroke.linecap}.`);

  checks.strokeLinejoin = new RegExp(`stroke-linejoin="${recipe.stroke.linejoin}"`).test(svg) ? "pass" : "fail";
  if (checks.strokeLinejoin === "fail") issues.push(`SVG stroke-linejoin must be ${recipe.stroke.linejoin}.`);

  checks.fill = /fill="none"/.test(svg) && !/fill="(?!none")[^"]+"/.test(svg) ? "pass" : "fail";
  if (checks.fill === "fail") issues.push("Outline SVG must only use fill=\"none\".");

  checks.rasterEmbeds = /<image\b|data:image\//i.test(svg) ? "fail" : "pass";
  if (checks.rasterEmbeds === "fail") issues.push("SVG must not contain raster embeds.");

  checks.foreignObject = /<foreignObject\b/i.test(svg) ? "fail" : "pass";
  if (checks.foreignObject === "fail") issues.push("SVG must not contain foreignObject.");

  checks.hiddenText = /<text\b/i.test(svg) ? "fail" : "pass";
  if (checks.hiddenText === "fail") issues.push("SVG must not contain text elements.");

  checks.accessibleTitle = /<title>[^<]+<\/title>/.test(svg) && /<desc>[^<]+<\/desc>/.test(svg) ? "pass" : "fail";
  if (checks.accessibleTitle === "fail") warnings.push("SVG should include title and desc elements.");

  const shapeCount = (svg.match(/<(path|line|rect|circle|polyline|polygon|ellipse)\b/gi) ?? []).length;
  checks.shapeElementCount = shapeCount <= recipe.density.maxShapeElements ? "pass" : "fail";
  if (checks.shapeElementCount === "fail") {
    issues.push(`SVG has ${shapeCount} shape elements; recipe allows ${recipe.density.maxShapeElements}.`);
  }

  const safeArea = collectSafeAreaEvidence(svg);
  checks.safeArea = safeArea.min >= recipe.canvas.safeArea && safeArea.max <= recipe.canvas.width - recipe.canvas.safeArea ? "pass" : "fail";
  if (checks.safeArea === "fail") {
    issues.push(`SVG coordinates must stay inside safe area ${recipe.canvas.safeArea}-${recipe.canvas.width - recipe.canvas.safeArea}. Found ${safeArea.min}-${safeArea.max}.`);
  }

  checks.fixedColors = /#[0-9a-f]{3,8}|rgb\(|hsl\(/i.test(svg) ? "fail" : "pass";
  if (checks.fixedColors === "fail") issues.push("SVG must not contain fixed colors.");

  return {
    schemaVersion: "1.0.0",
    conceptId: `si:${concept.slug}`,
    variantId: `variant-${concept.slug}-outline-001`,
    status: issues.length === 0 ? "pass" : "fail",
    checks,
    metrics: {
      shapeElementCount: shapeCount,
      coordinateMin: safeArea.min,
      coordinateMax: safeArea.max,
    },
    issues,
    warnings,
  };
}

function collectSafeAreaEvidence(svg) {
  const values = [];
  for (const match of svg.matchAll(/\b(?:x|x1|x2|cx|y|y1|y2|cy)="(-?\d+(?:\.\d+)?)"/g)) {
    values.push(Number(match[1]));
  }

  for (const match of svg.matchAll(/\sd="([^"]+)"/g)) {
    const numbers = match[1].match(/-?\d+(?:\.\d+)?/g) ?? [];
    values.push(...numbers.map(Number));
  }

  for (const match of svg.matchAll(/<circle\b[^>]*\bcx="(-?\d+(?:\.\d+)?)"[^>]*\bcy="(-?\d+(?:\.\d+)?)"[^>]*\br="(-?\d+(?:\.\d+)?)"/g)) {
    const cx = Number(match[1]);
    const cy = Number(match[2]);
    const r = Number(match[3]);
    values.push(cx - r, cx + r, cy - r, cy + r);
  }

  for (const match of svg.matchAll(/<rect\b[^>]*\bx="(-?\d+(?:\.\d+)?)"[^>]*\by="(-?\d+(?:\.\d+)?)"[^>]*\bwidth="(-?\d+(?:\.\d+)?)"[^>]*\bheight="(-?\d+(?:\.\d+)?)"/g)) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const width = Number(match[3]);
    const height = Number(match[4]);
    values.push(x, y, x + width, y + height);
  }

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

async function renderPreviews() {
  for (const concept of concepts) {
    const svg = await fs.readFile(path.join(conceptDir(concept.slug), "variants", "outline.svg"), "utf8");
    for (const size of previewSizes) {
      for (const theme of previewThemes) {
        const renderSvg = previewSvg(svg, size, theme);
        const png = new Resvg(renderSvg, {
          fitTo: { mode: "width", value: size },
          background: "transparent",
        }).render().asPng();
        await fs.writeFile(path.join(conceptDir(concept.slug), "previews", `outline-${size}-${theme.id}.png`), png);
      }
    }
  }
}

function previewSvg(svg, size, theme) {
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <rect x="0" y="0" width="24" height="24" rx="3" fill="${theme.background}" />
  <g color="${theme.foreground}" fill="none" stroke="currentColor" stroke-width="${outlineRecipe.stroke.width}" stroke-linecap="round" stroke-linejoin="round">
${inner}
  </g>
</svg>`;
}

async function exportStaging({ refresh = true } = {}) {
  if (refresh) {
    await runQa({ writeReports: true, failOnIssue: true });
    await renderPreviews();
  }

  const svgDir = path.join(stagingRoot, "svg");
  const previewDir = path.join(stagingRoot, "previews");
  const metadataDir = path.join(stagingRoot, "metadata");
  await fs.rm(stagingRoot, { recursive: true, force: true });
  await fs.mkdir(svgDir, { recursive: true });
  await fs.mkdir(previewDir, { recursive: true });
  await fs.mkdir(metadataDir, { recursive: true });

  const publicRecords = [];

  for (const concept of concepts) {
    const sourceSvg = path.join(conceptDir(concept.slug), "variants", "outline.svg");
    const targetSvg = path.join(svgDir, `${concept.slug}.svg`);
    await fs.copyFile(sourceSvg, targetSvg);

    const stagedPreviews = [];
    for (const size of previewSizes) {
      for (const theme of previewThemes) {
        const filename = `${concept.slug}-outline-${size}-${theme.id}.png`;
        await fs.copyFile(
          path.join(conceptDir(concept.slug), "previews", `outline-${size}-${theme.id}.png`),
          path.join(previewDir, filename),
        );
        stagedPreviews.push(`previews/${filename}`);
      }
    }

    publicRecords.push({
      id: `si:${concept.slug}`,
      slug: concept.slug,
      name: concept.name,
      description: concept.useCase,
      category: concept.category,
      assetType: concept.assetType,
      packId,
      accessTier: "premium_candidate",
      styleRecipeId: outlineRecipe.id,
      searchTerms: concept.searchTerms,
      variants: [
        {
          type: "outline",
          svg: `svg/${concept.slug}.svg`,
          previews: stagedPreviews,
        },
      ],
    });
  }

  await writeJson(path.join(metadataDir, "public-metadata.json"), publicRecords);
  await writeJson(path.join(stagingRoot, "manifest.json"), {
    schemaVersion: "1.0.0",
    packId,
    name: "Agentic AI Core Kit 001",
    iconCount: publicRecords.length,
    status: "staged_for_owner_review",
    sourcePackage: `data/supericons/icon-lab/packs/${packId}.sipack`,
    styleRecipeId: outlineRecipe.id,
    previewSizes,
    previewThemes: previewThemes.map((theme) => theme.id),
    assets: {
      svgDirectory: "svg",
      previewDirectory: "previews",
      publicMetadata: "metadata/public-metadata.json",
    },
    publicSafety: {
      excludesReviewNotes: true,
      excludesQaReports: true,
      excludesInternalProcessMetadata: true,
    },
  });
}

async function verify() {
  await assertSchemas();
  await assertSourcePackage();
  const qaReports = await runQa({ writeReports: true, failOnIssue: true });
  await renderPreviews();
  await exportStaging({ refresh: false });
  await assertPreviews();
  await assertStaging();
  await writeVerificationReport(qaReports);
}

async function assertSchemas() {
  for (const filename of Object.keys(schemas)) {
    await assertFile(path.join(schemaRoot, filename), `Missing schema: ${filename}`);
  }
}

async function assertSourcePackage() {
  await assertFile(path.join(packRoot, "pack.json"), "Missing pack.json.");
  for (const recipe of styleRecipes) {
    await assertFile(path.join(packRoot, "style-recipes", `${recipe.id}.json`), `Missing style recipe ${recipe.id}.`);
  }

  for (const concept of concepts) {
    const root = conceptDir(concept.slug);
    await assertFile(path.join(root, "concept.json"), `Missing concept.json for ${concept.slug}.`);
    await assertFile(path.join(root, "brief.md"), `Missing brief.md for ${concept.slug}.`);
    await assertFile(path.join(root, "variants", "outline.svg"), `Missing outline.svg for ${concept.slug}.`);
    await assertFile(path.join(root, "variants", "outline.variant.json"), `Missing outline.variant.json for ${concept.slug}.`);
    await assertFile(path.join(root, "review", "human-review-decision.json"), `Missing human-review-decision.json for ${concept.slug}.`);
  }
}

async function assertPreviews() {
  for (const concept of concepts) {
    for (const size of previewSizes) {
      for (const theme of previewThemes) {
        await assertFile(path.join(conceptDir(concept.slug), "previews", `outline-${size}-${theme.id}.png`), `Missing ${concept.slug} ${size}px ${theme.id} preview.`);
      }
    }
  }
}

async function assertStaging() {
  await assertFile(path.join(stagingRoot, "manifest.json"), "Missing staging manifest.");
  await assertFile(path.join(stagingRoot, "metadata", "public-metadata.json"), "Missing public metadata.");

  const manifest = await readJson(path.join(stagingRoot, "manifest.json"));
  if (manifest.assets.svgDirectory !== "svg") throw new Error("Staging manifest svgDirectory is invalid.");
  if (manifest.assets.publicMetadata !== "metadata/public-metadata.json") throw new Error("Staging manifest public metadata path is invalid.");

  const metadata = await readJson(path.join(stagingRoot, "metadata", "public-metadata.json"));
  if (metadata.length !== concepts.length) throw new Error(`Expected ${concepts.length} public metadata records; found ${metadata.length}.`);

  const forbiddenKeys = ["reviewer_model", "reviewer_reasoning_effort", "prompt_notes", "workflow_trace", "agent_notes", "private_confidence_rationale"];
  const metadataText = JSON.stringify(metadata);
  for (const key of forbiddenKeys) {
    if (metadataText.includes(key)) throw new Error(`Public metadata contains forbidden process key: ${key}`);
  }

  for (const concept of concepts) {
    await assertFile(path.join(stagingRoot, "svg", `${concept.slug}.svg`), `Missing staged SVG for ${concept.slug}.`);
  }
}

async function writeVerificationReport(qaReports) {
  const report = `# Icons Lab Static Core Verification

Date: 2026-06-19

## Scope Verified

- Source package: \`data/supericons/icon-lab/packs/${packId}.sipack\`
- Schemas: \`data/supericons/icon-lab/schemas\`
- Export staging: \`output/supericons/icon-lab/staging/${packId}\`

## Commands

- \`npm run icon-lab:scaffold\`
- \`npm run icon-lab:qa\`
- \`npm run icon-lab:render-previews\`
- \`npm run icon-lab:export-staging\`
- \`npm run verify:icon-lab-static-core\`

## Result

- Schemas present: ${Object.keys(schemas).length}
- Concepts present: ${concepts.length}
- Style recipes present: ${styleRecipes.length}
- QA reports passing: ${qaReports.filter((report) => report.status === "pass").length}/${qaReports.length}
- Preview PNG files expected: ${concepts.length * previewSizes.length * previewThemes.length}
- Preview sizes: ${previewSizes.join(", ")}
- Public metadata records: ${concepts.length}

## Boundary Check

- Existing public app files were not required for this static-core foundation.
- Existing production registry files were not required for this static-core foundation.
- Export staging keeps QA reports and human review decisions out of public metadata.

## Remaining Risk

The first 12 SVGs are scaffold variants. They pass technical static QA, but they still need founder taste review before being treated as final Supericons-grade icons.
`;
  await fs.mkdir(path.dirname(verificationPath), { recursive: true });
  await fs.writeFile(verificationPath, report, "utf8");
}

async function assertFile(filePath, message) {
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat?.isFile()) throw new Error(message);
  if (stat.size === 0) throw new Error(`${message} File is empty.`);
}

function conceptJson(concept) {
  return {
    schemaVersion: "1.0.0",
    id: `si:${concept.slug}`,
    packId,
    slug: concept.slug,
    name: concept.name,
    depicts: concept.depicts,
    useCase: concept.useCase,
    category: concept.category,
    assetType: concept.assetType,
    primaryMetaphor: concept.primaryMetaphor,
    avoidMetaphors: concept.avoidMetaphors,
    siblingConcepts: concept.siblingConcepts,
    searchTerms: concept.searchTerms,
    targetSizes: previewSizes,
    status: "owner_review",
  };
}

function variantJson(concept) {
  return {
    schemaVersion: "1.0.0",
    id: `variant-${concept.slug}-outline-001`,
    conceptId: `si:${concept.slug}`,
    variantType: "outline",
    styleRecipeId: outlineRecipe.id,
    svgPath: "outline.svg",
    targetSizes: previewSizes,
    strokeEditable: true,
    qualityLevel: "L2 benchmark",
    reviewState: "owner_review_required",
  };
}

function reviewJson(concept) {
  return {
    schemaVersion: "1.0.0",
    conceptId: `si:${concept.slug}`,
    variantId: `variant-${concept.slug}-outline-001`,
    decision: "pending_review",
    reviewerRole: "human_owner",
    notes: "Scaffold variant requires founder taste review before public release.",
    decidedAt: null,
  };
}

function conceptBrief(concept) {
  return `# ${concept.name}

## Meaning

${concept.depicts}

## Use Case

${concept.useCase}

## Metaphor

Primary metaphor: ${concept.primaryMetaphor}

Avoid: ${concept.avoidMetaphors.join(", ")}

## Pack Context

Sibling concepts: ${concept.siblingConcepts.join(", ")}

## Search Terms

${concept.searchTerms.join(", ")}

## Human Taste Questions

1. Does the metaphor read correctly at 16px?
2. Is it too generic compared with the rest of the pack?
3. Should this stay outline-only or become a filled or duotone candidate?
`;
}

function iconSvg(concept) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-labelledby="${concept.slug}-title ${concept.slug}-desc">
  <title id="${concept.slug}-title">${escapeXml(concept.name)}</title>
  <desc id="${concept.slug}-desc">${escapeXml(concept.depicts)}</desc>
${concept.body}
</svg>
`;
}

function conceptDir(slug) {
  return path.join(packRoot, "concepts", `${slug}.siicon`);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function relative(targetPath) {
  return path.relative(repoRoot, targetPath).replaceAll(path.sep, "/");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
