import fs from "fs";
import path from "path";

import { loadScreenshotQualityState } from "../lib/screenshot-quality/state.js";

const repoRoot = process.cwd();

const SCREENSHOT_FOLDER = path.join(
  repoRoot,
  "output",
  "icon_screenshot",
  "mingcute",
);
const MAPPING_PATH = path.join(SCREENSHOT_FOLDER, "screenshot-mapping.json");
const LIVE_REGISTRY_PATH = path.join(
  repoRoot,
  "public",
  "registry",
  "records.json",
);
const MANUAL_REDO_DIR = path.join(repoRoot, "data", "si-registry", "manual-redo");
const OUTPUT_JSON_PATH = path.join(
  repoRoot,
  "data",
  "si-registry",
  "generated",
  "mingcute-screenshot-quality-summary.json",
);
const OUTPUT_MD_PATH = path.join(
  repoRoot,
  "docs",
  "superpowers",
  "plans",
  "checklists",
  "mingcute-screenshot-quality-progress.md",
);

const PUBLIC_FIELDS = [
  "label",
  "depicts",
  "semantic_tags",
  "synonyms",
  "use_when",
  "avoid_when",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFile(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function stableStringify(value) {
  return JSON.stringify(value);
}

function getTimestampInSingapore(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} SGT`;
}

function comparePublicFields(a, b) {
  return PUBLIC_FIELDS.every(
    (field) => stableStringify(a?.[field]) === stableStringify(b?.[field]),
  );
}

function createCaseInsensitiveMap(records) {
  const grouped = new Map();
  for (const record of records) {
    const key = record.source_name.toLowerCase();
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(record);
  }
  return grouped;
}

function findNormalizedLiveRecord(entry, liveBySourceName, liveByLowerName) {
  const candidates = [
    entry.current_public_registry_source_name,
    entry.registry_source_name_candidate,
    entry.base_concept_id,
    ...(entry.registry_lookup_candidates || []).map((candidate) =>
      candidate.includes(":") ? candidate.split(":").slice(1).join(":") : candidate,
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (liveBySourceName.has(candidate)) {
      return {
        record: liveBySourceName.get(candidate),
        matchedBy: "exact",
        candidate,
      };
    }
  }

  for (const candidate of candidates) {
    const lowerMatches = liveByLowerName.get(candidate.toLowerCase()) || [];
    if (lowerMatches.length === 1) {
      return {
        record: lowerMatches[0],
        matchedBy: "lowercase",
        candidate,
      };
    }
  }

  return null;
}

function groupByRange(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push({
      start: index + 1,
      end: Math.min(index + size, items.length),
      items: items.slice(index, index + size),
    });
  }
  return groups;
}

const mappingData = readJson(MAPPING_PATH);
const mappingEntries = mappingData.entries || [];
const liveRegistry = readJson(LIVE_REGISTRY_PATH).filter(
  (record) => record.source_library === "mingcute",
);
const liveBySourceName = new Map(
  liveRegistry.map((record) => [record.source_name, record]),
);
const liveByLowerName = createCaseInsensitiveMap(liveRegistry);

const conceptMap = new Map();
const normalizationExamples = [];
const normalizationExampleKeys = new Set();

for (const entry of mappingEntries) {
  const resolution = findNormalizedLiveRecord(
    entry,
    liveBySourceName,
    liveByLowerName,
  );

  const conceptKey = resolution?.record?.source_name || `__unmatched__:${entry.base_concept_id}`;
  if (!conceptMap.has(conceptKey)) {
    conceptMap.set(conceptKey, {
      concept_key: conceptKey,
      icon_id: resolution?.record?.icon_id || null,
      source_name: resolution?.record?.source_name || null,
      matched_by: resolution?.matchedBy || null,
      mapping_candidate: resolution?.candidate || null,
      base_concept_ids: new Set(),
      screenshot_files: [],
      styles: new Set(),
      has_live_registry_match: Boolean(resolution?.record),
    });
  }

  const concept = conceptMap.get(conceptKey);
  concept.base_concept_ids.add(entry.base_concept_id);
  concept.screenshot_files.push(entry.recommended_screenshot_file_name);
  concept.styles.add(entry.asset_style);

  if (
    resolution?.matchedBy === "lowercase" &&
    entry.base_concept_id !== resolution.record.source_name &&
    normalizationExamples.length < 20
  ) {
    const exampleKey = `${entry.base_concept_id}=>${resolution.record.source_name}`;
    if (!normalizationExampleKeys.has(exampleKey)) {
      normalizationExampleKeys.add(exampleKey);
      normalizationExamples.push({
        screenshot_base_concept_id: entry.base_concept_id,
        live_registry_source_name: resolution.record.source_name,
      });
    }
  }
}

const conceptRows = [...conceptMap.values()].map((concept) => ({
  ...concept,
  base_concept_ids: [...concept.base_concept_ids].sort(),
  screenshot_files: [...concept.screenshot_files].sort(),
  styles: [...concept.styles].sort(),
}));

const liveConceptsWithScreenshots = conceptRows
  .filter((concept) => concept.has_live_registry_match)
  .sort((a, b) => a.source_name.localeCompare(b.source_name));

const unmatchedScreenshotConcepts = conceptRows
  .filter((concept) => !concept.has_live_registry_match)
  .sort((a, b) => a.base_concept_ids[0].localeCompare(b.base_concept_ids[0]));

const screenshotState = loadScreenshotQualityState({
  repoRoot,
  library: "mingcute",
});
const manualRedoFiles = screenshotState.recognizedArtifacts
  .map((artifact) => artifact.fileName)
  .sort();
const completedRows = screenshotState.state.completed_live;
const reviewedPendingRows = screenshotState.state.reviewed_pending;
const needsRedoRows = screenshotState.state.untouched;

const liveRegistryWithoutScreenshots = liveRegistry
  .filter(
    (record) =>
      !liveConceptsWithScreenshots.some(
        (concept) => concept.icon_id === record.icon_id,
      ),
  )
  .sort((a, b) => a.source_name.localeCompare(b.source_name));

const summary = {
  generated_at: getTimestampInSingapore(),
  library: "mingcute",
  screenshot_folder: "output/icon_screenshot/mingcute",
  reviewed_artifacts_checked: manualRedoFiles,
  counts: {
    screenshot_png_count: fs
      .readdirSync(SCREENSHOT_FOLDER)
      .filter((fileName) => fileName.toLowerCase().endsWith(".png")).length,
    screenshot_capture_targets: mappingEntries.length,
    unique_screenshot_base_concepts: conceptRows.length,
    live_registry_records: liveRegistry.length,
    live_registry_concepts_with_screenshots: liveConceptsWithScreenshots.length,
    screenshot_quality_passed_and_live: completedRows.length,
    reviewed_pending: reviewedPendingRows.length,
    untouched: needsRedoRows.length,
    needs_screenshot_quality_redo: needsRedoRows.length,
    lowercase_normalized_matches: conceptRows.filter(
      (concept) => concept.matched_by === "lowercase",
    ).length,
    unmatched_screenshot_concepts: unmatchedScreenshotConcepts.length,
    live_registry_without_screenshot_match: liveRegistryWithoutScreenshots.length,
  },
  normalization_examples: normalizationExamples,
  completed_live: completedRows,
  reviewed_pending: reviewedPendingRows,
  needs_redo: needsRedoRows,
  unmatched_screenshot_concepts: unmatchedScreenshotConcepts.map((concept) => ({
    base_concept_ids: concept.base_concept_ids,
    screenshot_files: concept.screenshot_files,
  })),
  live_registry_without_screenshot_match: liveRegistryWithoutScreenshots.map(
    (record) => record.icon_id,
  ),
};

const checklistLines = [
  "# MingCute Screenshot Quality Checklist",
  "",
  `Generated: ${summary.generated_at}`,
  "",
  "Current screenshot scope: `3324` PNGs in `output/icon_screenshot/mingcute`.",
  "",
  "## How To Read This Checklist",
  "",
  "- `[x]` means there is a verified screenshot-review artifact for this icon and the approved wording is already live in the public registry.",
  "- `[ ]` means the icon is live in the public registry and backed by screenshots, but it still needs a screenshot-quality redo pass for `depicts` and related fields.",
  "- This checklist is based on one semantic concept per icon. Matching line and fill screenshots are treated as the same concept.",
  "- This checklist uses the screenshot mapping file plus a case-insensitive normalization pass so names like `ABS` and `abs` still resolve to the same MingCute live record.",
  "",
  "## Status Summary",
  "",
  `- Screenshot PNG files found: ${summary.counts.screenshot_png_count}`,
  `- Screenshot capture targets in mapping: ${summary.counts.screenshot_capture_targets}`,
  `- Unique screenshot-backed MingCute concepts: ${summary.counts.unique_screenshot_base_concepts}`,
  `- Live MingCute registry records: ${summary.counts.live_registry_records}`,
  `- Screenshot-backed live MingCute concepts: ${summary.counts.live_registry_concepts_with_screenshots}`,
  `- Screenshot-quality passed and already live: ${summary.counts.screenshot_quality_passed_and_live}/${summary.counts.live_registry_concepts_with_screenshots}`,
  `- Reviewed but not live: ${summary.counts.reviewed_pending}/${summary.counts.live_registry_concepts_with_screenshots}`,
  `- Still needing screenshot-quality redo: ${summary.counts.needs_screenshot_quality_redo}/${summary.counts.live_registry_concepts_with_screenshots}`,
  `- Case-normalized screenshot-to-registry matches: ${summary.counts.lowercase_normalized_matches}`,
  `- Screenshot concepts still unmatched to the live registry: ${summary.counts.unmatched_screenshot_concepts}`,
  `- Live MingCute records without screenshot coverage: ${summary.counts.live_registry_without_screenshot_match}`,
  "",
  "## Already Passed And Live",
  "",
];

if (completedRows.length === 0) {
  checklistLines.push("- None", "");
} else {
  for (const row of completedRows) {
    checklistLines.push(
      `- [x] \`${row.icon_id}\` - screenshot-reviewed and live (${row.reviewed_files.join(", ")})`,
    );
  }
  checklistLines.push("");
}

checklistLines.push("## Reviewed But Not Live", "");

if (reviewedPendingRows.length === 0) {
  checklistLines.push("- None", "");
} else {
  for (const row of reviewedPendingRows) {
    checklistLines.push(
      `- [ ] \`${row.icon_id}\` - reviewed in ${row.reviewed_files.join(", ")}, not promoted`,
    );
  }
  checklistLines.push("");
}

checklistLines.push("## Needs Screenshot-Quality Redo", "");

for (const group of groupByRange(needsRedoRows, 100)) {
  checklistLines.push(`### Icons ${group.start}-${group.end}`, "");
  for (const row of group.items) {
    checklistLines.push(`- [ ] \`${row.icon_id}\``);
  }
  checklistLines.push("");
}

if (normalizationExamples.length > 0) {
  checklistLines.push("## Case-Normalized Screenshot Name Matches", "");
  for (const example of normalizationExamples) {
    checklistLines.push(
      `- \`${example.screenshot_base_concept_id}\` screenshot mapping resolves to live \`${example.live_registry_source_name}\``,
    );
  }
  checklistLines.push("");
}

if (unmatchedScreenshotConcepts.length > 0) {
  checklistLines.push("## Screenshot Concepts Still Unmatched To Live Registry", "");
  for (const concept of unmatchedScreenshotConcepts) {
    checklistLines.push(
      `- \`${concept.base_concept_ids.join(", ")}\``,
    );
  }
  checklistLines.push("");
}

if (liveRegistryWithoutScreenshots.length > 0) {
  checklistLines.push("## Live Registry Records Without Screenshot Coverage", "");
  for (const record of liveRegistryWithoutScreenshots) {
    checklistLines.push(`- \`${record.icon_id}\``);
  }
  checklistLines.push("");
}

writeFile(OUTPUT_JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);
writeFile(OUTPUT_MD_PATH, `${checklistLines.join("\n")}\n`);

console.log(
  JSON.stringify(
    {
      markdown: path.relative(repoRoot, OUTPUT_MD_PATH),
      json: path.relative(repoRoot, OUTPUT_JSON_PATH),
      counts: summary.counts,
    },
    null,
    2,
  ),
);
