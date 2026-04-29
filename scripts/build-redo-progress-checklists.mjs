import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import iconIndex from '../public/icon-index.json' with { type: 'json' };
import restartOrder from '../data/si-registry/manual-redo/restart-order.json' with { type: 'json' };
import { resolveReviewPolicy, trackIdFromStage } from '../lib/si-registry/review-batch-policy.js';
import { loadScreenshotQualityState } from '../lib/screenshot-quality/state.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const checklistsDir = path.join(repoRoot, 'docs', 'superpowers', 'plans', 'checklists');
const generatedDir = path.join(repoRoot, 'data', 'si-registry', 'generated');
const publicRegistryPath = path.join(repoRoot, 'public', 'registry', 'records.json');
const purposeApprovedPath = path.join(repoRoot, 'data', 'si-registry', 'pilot', 'purpose-chip', 'approved-records.json');
const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');
const summaryOutputPath = path.join(generatedDir, 'redo-progress-summary.json');
const indexOutputPath = path.join(checklistsDir, 'index.md');

const PUBLIC_FIELDS = Object.freeze([
  'source_library',
  'source_name',
  'label',
  'depicts',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when'
]);

const CHECKLIST_CHUNK_SIZE = 100;

function parseBatchSortValue(batchSlug) {
  const match = String(batchSlug).match(/batch-(\d+)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[1], 10);
}

function buildSourceNameVariants(libraryId, rawId) {
  const normalized = String(rawId).replace(/-/g, '_');
  const lowerNormalized = normalized.toLowerCase();
  const variants = new Set([normalized, lowerNormalized, String(rawId), String(rawId).toLowerCase()]);

  if (libraryId === 'mingcute') {
    variants.add(normalized.replace(/_line$/, ''));
    variants.add(lowerNormalized.replace(/_line$/, ''));
    variants.add(normalized.replace(/_fill$/, ''));
    variants.add(lowerNormalized.replace(/_fill$/, ''));
  }

  if (libraryId === 'heroicons') {
    variants.add(normalized.replace(/_solid$/, ''));
    variants.add(lowerNormalized.replace(/_solid$/, ''));
  }

  return [...variants];
}

function preferredSourceName(libraryId, rawId) {
  const normalized = String(rawId).replace(/-/g, '_').toLowerCase();
  if (libraryId === 'mingcute') {
    return normalized.replace(/_line$/, '').replace(/_fill$/, '');
  }
  if (libraryId === 'heroicons') {
    return normalized.replace(/_solid$/, '');
  }
  return normalized;
}

function matchesLivePublic(candidateRecord, liveRecord) {
  if (!liveRecord) return false;
  return PUBLIC_FIELDS.every((field) => JSON.stringify(candidateRecord[field]) === JSON.stringify(liveRecord[field]));
}

function formatTimestamp() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date()).replace(',', '');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${value.trimEnd()}\n`, 'utf8');
}

async function loadFinalCandidatesByTrack() {
  const entries = await fs.readdir(manualRedoDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('-final-records.json'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const candidatesByTrack = new Map();

  for (const fileName of files) {
    const match = fileName.match(/^(.*)-manual-redo-(.*)-final-records\.json$/);
    if (!match) continue;

    const [, trackId, batchSlug] = match;
    const batchSort = parseBatchSortValue(batchSlug);
    const records = await readJson(path.join(manualRedoDir, fileName));
    const trackMap = candidatesByTrack.get(trackId) ?? new Map();

    for (const record of records) {
      const previous = trackMap.get(record.icon_id);
      if (!previous || batchSort >= previous.batch_sort) {
        trackMap.set(record.icon_id, {
          record,
          file_name: fileName,
          batch_slug: batchSlug,
          batch_sort: batchSort
        });
      }
    }

    candidatesByTrack.set(trackId, trackMap);
  }

  return candidatesByTrack;
}

function buildPurposeSourceItems(records) {
  return records.map((record, index) => ({
    order: index + 1,
    icon_id: record.icon_id,
    source_library: record.source_library,
    source_name: record.source_name,
    display_name: record.label
  }));
}

function buildLibrarySourceItems(libraryId, liveSourceNames) {
  return iconIndex.icons
    .filter((icon) => icon.lib === libraryId)
    .map((icon, index) => ({
      order: index + 1,
      icon_id: `${libraryId}:${buildSourceNameVariants(libraryId, icon.id).find((candidate) => liveSourceNames.has(candidate)) ?? preferredSourceName(libraryId, icon.id)}`,
      source_library: libraryId,
      source_name: buildSourceNameVariants(libraryId, icon.id).find((candidate) => liveSourceNames.has(candidate)) ?? preferredSourceName(libraryId, icon.id),
      display_name: icon.name
    }));
}

function noteForItem(status, item) {
  if (item.note) {
    return item.note;
  }
  if (status === 'redo_promoted') {
    return `latest reviewed output is live (${item.candidate.file_name})`;
  }
  if (status === 'redo_pending_promotion') {
    return `reviewed in ${item.candidate.file_name}, but the live public registry still differs`;
  }
  if (item.live_public_record) {
    return 'legacy live only; not yet redone under the deterministic process';
  }
  return 'not live in the public registry and not yet redone under the deterministic process';
}

function chunkItems(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function renderNextList(items) {
  if (items.length === 0) {
    return '- None';
  }

  return items
    .map((item, index) => `${index + 1}. \`${item.icon_id}\` - ${noteForItem(item.status, item)}`)
    .join('\n');
}

function renderChecklistItems(items) {
  const chunks = chunkItems(items, CHECKLIST_CHUNK_SIZE);
  return chunks
    .map((chunk) => {
      const start = chunk[0].order;
      const end = chunk[chunk.length - 1].order;
      const lines = chunk
        .map((item) => `- [${item.status === 'redo_promoted' ? 'x' : ' '}] \`${item.icon_id}\` - ${noteForItem(item.status, item)}`)
        .join('\n');
      return `### Icons ${start}-${end}\n\n${lines}`;
    })
    .join('\n\n');
}

function buildChecklistMarkdown(trackSummary, generatedAt, repoRelativeScopePath) {
  const scopeLine = trackSummary.scope_source_target_total && trackSummary.scope_source_target_total !== trackSummary.scope_current_total
    ? `Current checklist scope: ${trackSummary.scope_current_total} icons from \`${repoRelativeScopePath}\`.\nRestart-order target still says ${trackSummary.scope_source_target_total} icons, so this checklist uses the real file count, not the older target count.`
    : `Current checklist scope: ${trackSummary.scope_current_total} icons from \`${repoRelativeScopePath}\`.`;
  const unmappedLine = trackSummary.unresolved_unmapped_count > 0
    ? `- Screenshot-backed concepts still unresolved in the unmapped backlog: ${trackSummary.unresolved_unmapped_count}`
    : '';
  const completionLine = trackSummary.library_complete
    ? '- The screenshot workflow marks this library as complete.'
    : '- The screenshot workflow does not mark this library as complete yet.';

  return `
# ${trackSummary.label} Progress Checklist

Generated: ${generatedAt} SGT

${scopeLine}

## How To Read This Checklist

- \`[x]\` means the latest deterministic redo output is already live in the public registry.
- \`[ ]\` means the icon is still incomplete under the deterministic redo process.
- If an unchecked icon says \`reviewed in ... but the live public registry still differs\`, that is a blocker we should clear before moving further down the list.
- If an unchecked icon says \`legacy live only\`, it already exists in the public registry from older work, but it has not passed the current deterministic redo process.

## Status Summary

- Live public registry coverage in this scope: ${trackSummary.live_public_count}/${trackSummary.scope_current_total}
- Deterministic redo promoted to live public registry: ${trackSummary.redo_promoted_count}/${trackSummary.scope_current_total}
- Deterministic redo reviewed but not yet promoted: ${trackSummary.redo_pending_count}/${trackSummary.scope_current_total}
- Remaining not yet redone: ${trackSummary.not_redone_count}/${trackSummary.scope_current_total}
- Remaining legacy-live-only icons: ${trackSummary.legacy_live_only_count}
- Remaining not-live-yet icons: ${trackSummary.not_live_not_redone_count}
- Resolved unmapped concepts: ${trackSummary.resolved_unmapped_count}
${unmappedLine}
${completionLine}

## Current Review Policy

- Phase: ${trackSummary.review_phase}
- Batch size: ${trackSummary.current_batch_size}
- Approval scope: ${trackSummary.approval_scope}

## Blocking Icons Before New Work

${renderNextList(trackSummary.blocking_icons)}

## Next Untouched Icons After Blockers Are Cleared

${renderNextList(trackSummary.next_untouched_icons)}

## Checklist

${renderChecklistItems(trackSummary.items)}
  `;
}

const generatedAt = formatTimestamp();
const publicRegistry = await readJson(publicRegistryPath);
const purposeApprovedRecords = await readJson(purposeApprovedPath);
const liveById = new Map(publicRegistry.map((record) => [record.icon_id, record]));
const finalCandidatesByTrack = await loadFinalCandidatesByTrack();
const liveSourceNamesByLibrary = new Map();

for (const record of publicRegistry) {
  const currentSet = liveSourceNamesByLibrary.get(record.source_library) ?? new Set();
  currentSet.add(record.source_name);
  liveSourceNamesByLibrary.set(record.source_library, currentSet);
}

const trackSummaries = [];

for (const stage of restartOrder.stages) {
  const trackId = trackIdFromStage(stage.stage_id);
  const reviewPolicy = resolveReviewPolicy(restartOrder, trackId);
  const screenshotMappingPath = path.join(repoRoot, 'output', 'icon_screenshot', trackId, 'screenshot-mapping.json');
  const screenshotSnapshot = trackId === 'purpose-chip' || !(await fs.access(screenshotMappingPath).then(() => true).catch(() => false))
    ? null
    : loadScreenshotQualityState({ repoRoot, library: trackId });
  const sourceItems = trackId === 'purpose-chip'
    ? buildPurposeSourceItems(purposeApprovedRecords)
    : buildLibrarySourceItems(trackId, liveSourceNamesByLibrary.get(trackId) ?? new Set());

  const candidatesById = finalCandidatesByTrack.get(trackId) ?? new Map();
  const items = sourceItems.map((sourceItem) => {
    const livePublicRecord = liveById.get(sourceItem.icon_id) ?? null;
    const candidate = candidatesById.get(sourceItem.icon_id) ?? null;
    const status = candidate
      ? (matchesLivePublic(candidate.record, livePublicRecord) ? 'redo_promoted' : 'redo_pending_promotion')
      : 'not_redone';

    return {
      ...sourceItem,
      live_public_record: livePublicRecord,
      candidate,
      status
    };
  });

  const livePublicCount = items.filter((item) => item.live_public_record).length;
  const redoPromotedCount = items.filter((item) => item.status === 'redo_promoted').length;
  const redoPendingCount = items.filter((item) => item.status === 'redo_pending_promotion').length;
  const notRedoneCount = items.filter((item) => item.status === 'not_redone').length;
  const legacyLiveOnlyCount = items.filter((item) => item.status === 'not_redone' && item.live_public_record).length;
  const notLiveNotRedoneCount = items.filter((item) => item.status === 'not_redone' && !item.live_public_record).length;
  const unresolvedUnmappedCount = screenshotSnapshot?.completionState.unresolved_unmapped_count ?? 0;
  const resolvedUnmappedCount = screenshotSnapshot?.completionState.resolved_unmapped_count ?? 0;
  const libraryComplete = screenshotSnapshot?.completionState.library_complete ?? false;
  const blockingIcons = items.filter((item) => item.status !== 'redo_promoted').slice(0, reviewPolicy.batch_size);
  const nextUntouchedIcons = items.filter((item) => item.status === 'not_redone').slice(0, reviewPolicy.batch_size);

  const checklistFileName = `${trackId}-progress.md`;
  const checklistPath = path.join(checklistsDir, checklistFileName);
  const scopeSourcePath = trackId === 'purpose-chip'
    ? purposeApprovedPath
    : path.join(repoRoot, 'public', 'icon-index.json');

  const summary = {
    stage_order: stage.order,
    stage_id: stage.stage_id,
    track_id: trackId,
    label: stage.label,
    restart_order_status: stage.status,
    review_policy: reviewPolicy,
    current_batch_size: reviewPolicy.batch_size,
    review_phase: reviewPolicy.phase,
    approval_scope: reviewPolicy.approval_scope,
    scope_source_target_total: stage.source_total_icons,
    scope_current_total: screenshotSnapshot?.completionState.concept_scope_total ?? items.length,
    live_public_count: livePublicCount,
    redo_promoted_count: redoPromotedCount,
    redo_pending_count: redoPendingCount,
    not_redone_count: notRedoneCount,
    legacy_live_only_count: legacyLiveOnlyCount,
    not_live_not_redone_count: notLiveNotRedoneCount,
    resolved_unmapped_count: resolvedUnmappedCount,
    unresolved_unmapped_count: unresolvedUnmappedCount,
    library_complete: libraryComplete,
    blocking_icons: blockingIcons.map((item) => ({
      icon_id: item.icon_id,
      note: noteForItem(item.status, item)
    })),
    next_untouched_icons: nextUntouchedIcons.map((item) => ({
      icon_id: item.icon_id,
      note: noteForItem(item.status, item)
    })),
    checklist_path: path.relative(repoRoot, checklistPath).replaceAll(path.sep, '/'),
    scope_source_path: path.relative(repoRoot, scopeSourcePath).replaceAll(path.sep, '/'),
    items: items.map((item) => ({
      order: item.order,
      icon_id: item.icon_id,
      source_name: item.source_name,
      display_name: item.display_name,
      status: item.status,
      live_public: Boolean(item.live_public_record),
      latest_review_file: item.candidate?.file_name ?? null,
      note: noteForItem(item.status, item)
    }))
  };

  await writeText(
    checklistPath,
    buildChecklistMarkdown(summary, generatedAt, summary.scope_source_path)
  );

  trackSummaries.push(summary);
}

const indexMarkdown = `
# Deterministic Redo Checklist Index

Generated: ${generatedAt} SGT

This index tracks progress for the deterministic redo process. A checklist is only counted as complete when the latest reviewed output is already live in the actual public registry.

| Order | Track | Scope | Live Public | Redo Promoted | Redo Pending | Remaining | Checklist |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
${trackSummaries
  .map((summary) => `| ${summary.stage_order} | ${summary.label} | ${summary.scope_current_total} | ${summary.live_public_count} | ${summary.redo_promoted_count} | ${summary.redo_pending_count} | ${summary.not_redone_count} | [Open](./${path.basename(summary.checklist_path)}) |`)
  .join('\n')}
`;

await writeText(indexOutputPath, indexMarkdown);
await writeJson(summaryOutputPath, {
  generated_at: generatedAt,
  tracks: trackSummaries
});

console.log(
  `build-redo-progress-checklists: wrote ${path.relative(repoRoot, summaryOutputPath).replaceAll(path.sep, '/')} and ${trackSummaries.length + 1} checklist markdown files`
);
