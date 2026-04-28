import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertBatchIdUnused,
  assertNoReviewedPendingOverlap,
  selectNextScreenshotBatch,
} from '../lib/screenshot-quality/batch-selection.js';
import { normalizeResolutionEntries } from '../lib/screenshot-quality/completion-state.js';
import { mergeFinalRecordsIntoApprovedRecords } from '../lib/screenshot-quality/promotion.js';
import { auditFinalRecords } from '../lib/screenshot-quality/quality-audit.js';
import {
  buildFinalRecordsFromDepictsOnlyAgainstBaseline,
  buildFinalRecordsFromDepictsOnly,
  buildReviewPacket,
  toPublicRecord,
} from '../lib/screenshot-quality/review-packet.js';
import { diagnoseUnmappedConcepts } from '../lib/screenshot-quality/unmapped-diagnosis.js';
import {
  applyReviewedPublicFields,
  collectExistingUnmappedPacketIconIds,
  loadUnmappedReviewSourceData,
  moveDecisionEntryToApprove,
  selectNextUnmappedReviewBatch,
  writeReviewedSourceData,
} from '../lib/screenshot-quality/unmapped-review.js';
import {
  PUBLIC_FIELDS,
  loadScreenshotQualityState,
  readJson,
  stateCounts,
  writeJson,
} from '../lib/screenshot-quality/state.js';

const repoRoot = process.cwd();

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return { command, options };
}

function requireOption(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required option --${key}`);
  }
  return value;
}

function manualRedoPath(...parts) {
  return path.join(repoRoot, 'data', 'si-registry', 'manual-redo', ...parts);
}

function generatedPath(...parts) {
  return path.join(repoRoot, 'data', 'si-registry', 'generated', ...parts);
}

function approvedRecordsPath(library) {
  return path.join(repoRoot, 'data', 'si-registry', 'automation', library, 'approved-records.json');
}

function liveRecordsForLibrary(liveRecords, library) {
  return liveRecords.filter((record) => record.source_library === library);
}

function print(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value);
  }
}

function runNpmScript(scriptName) {
  execFileSync('npm', ['run', scriptName], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function libraryApprovedBuildScript(library) {
  return `build:${library}-approved-records`;
}

function libraryApprovedVerifyScript(library) {
  return `verify:${library}-approved-records`;
}

function assertLiveMatchesFinalRecords({ liveRecords, finalRecords }) {
  const liveById = new Map(liveRecords.map((record) => [record.icon_id, record]));
  const mismatches = [];
  for (const record of finalRecords) {
    const live = liveById.get(record.icon_id);
    if (!live || live.depicts !== record.depicts) {
      mismatches.push(record.icon_id);
    }
  }
  if (mismatches.length > 0) {
    throw new Error(`Live registry does not match final records for: ${mismatches.join(', ')}`);
  }
}

function buildCompletionPayload(snapshot) {
  return {
    concept_scope_total: snapshot.completionState.concept_scope_total,
    counts: stateCounts(snapshot.reviewState),
    resolved_unmapped: snapshot.completionState.resolved_unmapped_count,
    unresolved_unmapped: snapshot.completionState.unresolved_unmapped_count,
    library_complete: snapshot.completionState.library_complete,
    move_to_next_library_allowed: snapshot.completionState.move_to_next_library_allowed,
  };
}

function commandStatus(options) {
  const library = requireOption(options, 'library');
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const payload = {
    library,
    counts: stateCounts(snapshot.reviewState),
    next_untouched: snapshot.reviewState.untouched.slice(0, 20).map((item) => item.icon_id),
    reviewed_pending_sample: snapshot.reviewState.reviewed_pending.slice(0, 20).map((item) => ({
      icon_id: item.icon_id,
      reviewed_files: item.reviewed_files,
    })),
    completion: buildCompletionPayload(snapshot),
  };

  print(payload, options.json);
}

function commandCompletionStatus(options) {
  const library = requireOption(options, 'library');
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const payload = {
    library,
    ...buildCompletionPayload(snapshot),
    unresolved_unmapped_sample: snapshot.completionState.unresolved_unmapped.slice(0, 20).map((concept) => ({
      base_concept_ids: concept.base_concept_ids,
      screenshot_files: concept.screenshot_files,
      styles: concept.styles,
      registry_lookup_candidates: concept.registry_lookup_candidates,
    })),
  };

  print(payload, options.json);
}

function commandDiagnoseUnmapped(options) {
  const library = requireOption(options, 'library');
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const diagnosis = diagnoseUnmappedConcepts({
    library,
    unresolvedConcepts: snapshot.completionState.unresolved_unmapped,
    liveRecords: snapshot.liveRecords,
    approvedRecords: snapshot.approvedRecords,
  });
  const outputPath = generatedPath(`${library}-unmapped-diagnosis.json`);
  writeJson(outputPath, diagnosis);
  print(
    {
      wrote: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
      ...diagnosis,
    },
    options.json
  );
}

function commandScaffoldUnmappedResolution(options) {
  const library = requireOption(options, 'library');
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const existingEntries = snapshot.resolutionEntries || [];
  const existingBaseConceptIds = new Set(
    existingEntries.flatMap((entry) => entry.all_base_concept_ids || [entry.base_concept_id])
  );
  const scaffoldEntries = snapshot.completionState.unresolved_unmapped
    .filter((concept) => !concept.base_concept_ids.some((baseConceptId) => existingBaseConceptIds.has(baseConceptId)))
    .map((concept) => ({
      base_concept_id: concept.base_concept_ids[0] || '',
      all_base_concept_ids: concept.base_concept_ids,
      resolution: '',
      target_icon_id: '',
      notes: '',
    }));
  const mergedEntries = normalizeResolutionEntries(existingEntries).concat(scaffoldEntries);

  writeJson(snapshot.unmappedResolutionPath, mergedEntries);
  print(
    {
      wrote: path.relative(repoRoot, snapshot.unmappedResolutionPath).replaceAll(path.sep, '/'),
      existing_entries: existingEntries.length,
      added_entries: scaffoldEntries.length,
      total_entries: mergedEntries.length,
    },
    options.json
  );
}

function commandSelect(options) {
  const library = requireOption(options, 'library');
  const batchId = requireOption(options, 'batch-id');
  const size = Number.parseInt(requireOption(options, 'size'), 10);
  const snapshot = loadScreenshotQualityState({ repoRoot, library });

  if (snapshot.reviewState.untouched.length === 0) {
    if (snapshot.completionState.unresolved_unmapped_count > 0) {
      throw new Error(
        `No untouched mapped concepts remain. Library is still incomplete because ${snapshot.completionState.unresolved_unmapped_count} unresolved unmapped concepts exist. Run diagnose-unmapped and resolve the backlog before moving on.`
      );
    }
    throw new Error(`No untouched mapped concepts remain for ${library}.`);
  }

  assertBatchIdUnused({ batchId, manualRedoDir: snapshot.manualRedoDir });

  const selection = selectNextScreenshotBatch({
    untouched: snapshot.reviewState.untouched,
    size,
  });
  assertNoReviewedPendingOverlap({
    selectedItems: selection.items,
    reviewedPending: snapshot.reviewState.reviewed_pending,
  });

  const screenshotRoot = path.relative(repoRoot, snapshot.screenshotFolder).replaceAll(path.sep, '/');
  const packet = buildReviewPacket({
    library,
    batchId,
    selectedItems: selection.items,
    liveRecords: liveRecordsForLibrary(snapshot.liveRecords, library),
    screenshotRoot,
  });

  const packetPath = manualRedoPath(`${batchId}-packet.json`);
  writeJson(packetPath, packet);

  const payload = {
    wrote: path.relative(repoRoot, packetPath).replaceAll(path.sep, '/'),
    selected: selection.items.length,
    first: selection.items[0]?.icon_id || null,
    last: selection.items.at(-1)?.icon_id || null,
    overlap_with_reviewed_pending: 0,
  };
  print(payload, options.json);
}

function commandSelectUnmapped(options) {
  const library = requireOption(options, 'library');
  const batchId = requireOption(options, 'batch-id');
  const size = Number.parseInt(requireOption(options, 'size'), 10);
  const snapshot = loadScreenshotQualityState({ repoRoot, library });

  if (snapshot.completionState.unresolved_unmapped_count === 0) {
    throw new Error(`No unresolved unmapped concepts remain for ${library}.`);
  }

  assertBatchIdUnused({ batchId, manualRedoDir: snapshot.manualRedoDir });

  const sourceData = loadUnmappedReviewSourceData({ repoRoot, library });
  const blockedIconIds = collectExistingUnmappedPacketIconIds({
    manualRedoDir: snapshot.manualRedoDir,
    library,
  });
  const selection = selectNextUnmappedReviewBatch({
    unresolvedConcepts: snapshot.completionState.unresolved_unmapped,
    sourceData,
    size,
    blockedIconIds,
  });

  if (selection.items.length === 0) {
    throw new Error(
      `No unresolved unmapped draft-backed concepts are currently selectable for ${library}.`
    );
  }

  const screenshotRoot = path.relative(repoRoot, snapshot.screenshotFolder).replaceAll(path.sep, '/');
  const packet = {
    schema_version: '1.0.0',
    library,
    batch_id: batchId,
    review_mode: 'depicts_only_from_reviewed_source',
    agent_allowed_fields: ['depicts'],
    non_depicts_fields_must_match_source: true,
    items: selection.items.map(({ concept, match }) => {
      const lineFile =
        (concept.screenshot_files || []).find((fileName) => fileName.includes('_line.png')) ||
        (concept.screenshot_files || []).find((fileName) => fileName.includes('_outline.png')) ||
        null;
      const fillFile =
        (concept.screenshot_files || []).find((fileName) => fileName.includes('_fill.png')) ||
        (concept.screenshot_files || []).find((fileName) => fileName.includes('_solid.png')) ||
        null;

      return {
        icon_id: match.record.icon_id,
        source_name: match.record.source_name,
        line_screenshot: lineFile ? path.join(screenshotRoot, lineFile).replaceAll(path.sep, '/') : null,
        fill_screenshot: fillFile ? path.join(screenshotRoot, fillFile).replaceAll(path.sep, '/') : null,
        screenshot_files: concept.screenshot_files,
        base_concept_ids: concept.base_concept_ids,
        current_source_record: toPublicRecord(match.record),
        source_batch_id: match.batchId,
        current_decision_status: match.decision?.status || 'unknown',
        agent_allowed_fields: ['depicts'],
        non_depicts_fields_must_match_source: true,
      };
    }),
  };

  const packetPath = manualRedoPath(`${batchId}-packet.json`);
  writeJson(packetPath, packet);

  print(
    {
      wrote: path.relative(repoRoot, packetPath).replaceAll(path.sep, '/'),
      selected: selection.items.length,
      first: selection.items[0]?.match.record.icon_id || null,
      last: selection.items.at(-1)?.match.record.icon_id || null,
      blocked_existing_packets: blockedIconIds.size,
    },
    options.json
  );
}

function commandFinalizeReview(options) {
  const library = requireOption(options, 'library');
  const batchId = requireOption(options, 'batch-id');
  const agentOutputPath = path.resolve(repoRoot, requireOption(options, 'agent-output'));
  const packetPath = manualRedoPath(`${batchId}-packet.json`);
  const finalRecordsPath = manualRedoPath(`${batchId}-final-records.json`);

  const packet = readJson(packetPath);
  const agentDepicts = readJson(agentOutputPath);
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const baselineRecords = packet.items.map(
    (item) => item.current_live_record || item.current_source_record
  );
  const records =
    packet.review_mode === 'depicts_only_from_reviewed_source'
      ? buildFinalRecordsFromDepictsOnlyAgainstBaseline({
          baselineRecords,
          agentDepicts,
          expectedIconIds: packet.items.map((item) => item.icon_id),
        })
      : buildFinalRecordsFromDepictsOnly({
          liveRecords: liveRecordsForLibrary(snapshot.liveRecords, library),
          agentDepicts,
          expectedIconIds: packet.items.map((item) => item.icon_id),
        });

  writeJson(finalRecordsPath, records);
  print(
    {
      wrote: path.relative(repoRoot, finalRecordsPath).replaceAll(path.sep, '/'),
      count: records.length,
      first: records[0]?.icon_id || null,
      last: records.at(-1)?.icon_id || null,
    },
    options.json
  );
}

function commandPromoteUnmapped(options) {
  const library = requireOption(options, 'library');
  const finalRecordsPath = path.resolve(repoRoot, requireOption(options, 'final-records'));
  const finalRecords = readJson(finalRecordsPath);
  const issues = auditFinalRecords({ records: finalRecords });
  const blockerIssues = issues.filter((issue) => issue.severity === 'blocker');
  if (blockerIssues.length > 0 && !options['allow-quality-issues']) {
    throw new Error(
      `Quality audit blocked unmapped promotion with ${blockerIssues.length} blocker issue(s). Run audit-quality for details.`
    );
  }

  const sourceData = loadUnmappedReviewSourceData({ repoRoot, library });
  const updatedFiles = new Set();
  const promotedIds = [];

  for (const finalRecord of finalRecords) {
    const metadata = sourceData.reviewedByIconId.get(finalRecord.icon_id);
    if (!metadata) {
      throw new Error(`Missing reviewed source record for ${finalRecord.icon_id}`);
    }

    if (metadata.decision?.status !== 'draft') {
      throw new Error(
        `Cannot promote unmapped record ${finalRecord.icon_id} because its current decision status is ${metadata.decision?.status || 'missing'}.`
      );
    }

    const reviewedFile = sourceData.reviewedFiles.get(metadata.fileName);
    const reviewedRecord = reviewedFile.reviewedRecords[metadata.recordIndex];
    applyReviewedPublicFields({ reviewedRecord, finalRecord });
    moveDecisionEntryToApprove({
      decisions: sourceData.decisions,
      iconId: finalRecord.icon_id,
      batchId: metadata.batchId,
    });

    updatedFiles.add(metadata.fileName);
    promotedIds.push(finalRecord.icon_id);
  }

  writeReviewedSourceData(sourceData);
  runNpmScript(libraryApprovedBuildScript(library));
  runNpmScript('build:si-registry');
  runNpmScript('verify:pruned-semantic-fields');
  runNpmScript(libraryApprovedVerifyScript(library));

  const liveRecords = readJson(path.join(repoRoot, 'public', 'registry', 'records.json'));
  assertLiveMatchesFinalRecords({ liveRecords, finalRecords });

  print(
    {
      promoted: promotedIds.length,
      final_records: path.relative(repoRoot, finalRecordsPath).replaceAll(path.sep, '/'),
      updated_reviewed_source_files: [...updatedFiles].sort(),
      updated_public_fields: PUBLIC_FIELDS,
    },
    options.json
  );
}

function commandAuditQuality(options) {
  const finalRecordsPath = path.resolve(repoRoot, requireOption(options, 'final-records'));
  const records = readJson(finalRecordsPath);
  const issues = auditFinalRecords({ records });
  const blockerIssues = issues.filter((issue) => issue.severity === 'blocker');
  const payload = {
    final_records: path.relative(repoRoot, finalRecordsPath).replaceAll(path.sep, '/'),
    issue_count: issues.length,
    blocker_count: blockerIssues.length,
    issues,
  };

  print(payload, options.json);
  if (blockerIssues.length > 0) {
    process.exitCode = 1;
  }
}

function commandPromote(options) {
  const library = requireOption(options, 'library');
  const finalRecordsPath = path.resolve(repoRoot, requireOption(options, 'final-records'));
  const finalRecords = readJson(finalRecordsPath);
  const issues = auditFinalRecords({ records: finalRecords });
  const blockerIssues = issues.filter((issue) => issue.severity === 'blocker');
  if (blockerIssues.length > 0 && !options['allow-quality-issues']) {
    throw new Error(
      `Quality audit blocked promotion with ${blockerIssues.length} blocker issue(s). Run audit-quality for details.`
    );
  }

  const approvedPath = approvedRecordsPath(library);
  const approvedRecords = readJson(approvedPath);
  const merged = mergeFinalRecordsIntoApprovedRecords({ approvedRecords, finalRecords });
  writeJson(approvedPath, merged);

  runNpmScript('build:si-registry');
  runNpmScript('verify:pruned-semantic-fields');
  if (library === 'mingcute') {
    runNpmScript('build:mingcute-screenshot-quality-checklist');
  }

  const liveRecords = readJson(path.join(repoRoot, 'public', 'registry', 'records.json'));
  assertLiveMatchesFinalRecords({ liveRecords, finalRecords });

  print(
    {
      promoted: finalRecords.length,
      source: path.relative(repoRoot, approvedPath).replaceAll(path.sep, '/'),
      final_records: path.relative(repoRoot, finalRecordsPath).replaceAll(path.sep, '/'),
    },
    options.json
  );
}

function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command) {
    throw new Error(
      'Missing command. Use status, completion-status, diagnose-unmapped, scaffold-unmapped-resolution, select, select-unmapped, finalize-review, audit-quality, promote, or promote-unmapped.'
    );
  }

  if (command === 'status') return commandStatus(options);
  if (command === 'completion-status') return commandCompletionStatus(options);
  if (command === 'diagnose-unmapped') return commandDiagnoseUnmapped(options);
  if (command === 'scaffold-unmapped-resolution') return commandScaffoldUnmappedResolution(options);
  if (command === 'select') return commandSelect(options);
  if (command === 'select-unmapped') return commandSelectUnmapped(options);
  if (command === 'finalize-review') return commandFinalizeReview(options);
  if (command === 'audit-quality') return commandAuditQuality(options);
  if (command === 'promote') return commandPromote(options);
  if (command === 'promote-unmapped') return commandPromoteUnmapped(options);

  throw new Error(`Unknown command: ${command}`);
}

main();
