import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertBatchIdUnused,
  assertNoReviewedPendingOverlap,
  selectNextScreenshotBatch,
} from '../lib/screenshot-quality/batch-selection.js';
import { mergeFinalRecordsIntoApprovedRecords } from '../lib/screenshot-quality/promotion.js';
import { auditFinalRecords } from '../lib/screenshot-quality/quality-audit.js';
import {
  buildFinalRecordsFromDepictsOnly,
  buildReviewPacket,
} from '../lib/screenshot-quality/review-packet.js';
import {
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

function commandStatus(options) {
  const library = requireOption(options, 'library');
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const payload = {
    library,
    counts: stateCounts(snapshot.state),
    next_untouched: snapshot.state.untouched.slice(0, 20).map((item) => item.icon_id),
    reviewed_pending_sample: snapshot.state.reviewed_pending.slice(0, 20).map((item) => ({
      icon_id: item.icon_id,
      reviewed_files: item.reviewed_files,
    })),
  };

  print(payload, options.json);
}

function commandSelect(options) {
  const library = requireOption(options, 'library');
  const batchId = requireOption(options, 'batch-id');
  const size = Number.parseInt(requireOption(options, 'size'), 10);
  const snapshot = loadScreenshotQualityState({ repoRoot, library });

  assertBatchIdUnused({ batchId, manualRedoDir: snapshot.manualRedoDir });

  const selection = selectNextScreenshotBatch({
    untouched: snapshot.state.untouched,
    size,
  });
  assertNoReviewedPendingOverlap({
    selectedItems: selection.items,
    reviewedPending: snapshot.state.reviewed_pending,
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

function commandFinalizeReview(options) {
  const library = requireOption(options, 'library');
  const batchId = requireOption(options, 'batch-id');
  const agentOutputPath = path.resolve(repoRoot, requireOption(options, 'agent-output'));
  const packetPath = manualRedoPath(`${batchId}-packet.json`);
  const finalRecordsPath = manualRedoPath(`${batchId}-final-records.json`);

  const packet = readJson(packetPath);
  const agentDepicts = readJson(agentOutputPath);
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const records = buildFinalRecordsFromDepictsOnly({
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
    throw new Error('Missing command. Use status, select, finalize-review, audit-quality, or promote.');
  }

  if (command === 'status') return commandStatus(options);
  if (command === 'select') return commandSelect(options);
  if (command === 'finalize-review') return commandFinalizeReview(options);
  if (command === 'audit-quality') return commandAuditQuality(options);
  if (command === 'promote') return commandPromote(options);

  throw new Error(`Unknown command: ${command}`);
}

main();
