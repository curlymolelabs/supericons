import fs from 'node:fs';
import path from 'node:path';

import {
  isRecognizedScreenshotFinalRecordsFile,
  loadScreenshotQualityState,
  PUBLIC_FIELDS,
  readJson,
  samePublicFields,
} from '../lib/screenshot-quality/state.js';

const repoRoot = process.cwd();
const PUBLIC_ALLOWED_FIELDS = new Set([
  'icon_id',
  'source_library',
  'source_name',
  ...PUBLIC_FIELDS,
]);
const STRUCTURAL_FIELDS = [
  'access_tier',
  'projection_policy',
  'purpose',
  'category',
  'version',
  'status',
  'review_state',
  'evidence',
  'source_group',
  'is_premium',
];

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function listScreenshotLibraries() {
  const screenshotRoot = path.join(repoRoot, 'output', 'icon_screenshot');
  if (!fs.existsSync(screenshotRoot)) {
    return [];
  }

  return fs
    .readdirSync(screenshotRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((library) => fs.existsSync(path.join(screenshotRoot, library, 'screenshot-mapping.json')))
    .sort();
}

function verifyLibrary(library) {
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');
  const finalFiles = fs
    .readdirSync(manualRedoDir)
    .filter((fileName) => isRecognizedScreenshotFinalRecordsFile(fileName, library))
    .sort();
  const liveRecords = snapshot.liveRecords.filter((record) => record.source_library === library);
  const liveById = new Map(liveRecords.map((record) => [record.icon_id, record]));
  const approvedRecords = snapshot.approvedRecords;
  const pendingPublicByIcon = new Map();

  for (const fileName of finalFiles) {
    const records = readJson(path.join(manualRedoDir, fileName));
    const seenInFile = new Set();

    for (const record of records) {
      assert(!seenInFile.has(record.icon_id), `${fileName} contains duplicate ${record.icon_id}`);
      seenInFile.add(record.icon_id);

      for (const field of Object.keys(record)) {
        assert(PUBLIC_ALLOWED_FIELDS.has(field), `${fileName} exposes non-public field "${field}"`);
      }

      const live = liveById.get(record.icon_id);
      if (!live || samePublicFields(record, live)) {
        continue;
      }

      const stable = JSON.stringify(record);
      if (!pendingPublicByIcon.has(record.icon_id)) {
        pendingPublicByIcon.set(record.icon_id, { stable, fileName });
      } else {
        const existing = pendingPublicByIcon.get(record.icon_id);
        assert(
          existing.stable === stable,
          `${record.icon_id} has conflicting pending final records: ${existing.fileName} and ${fileName}`
        );
      }
    }
  }

  for (const completed of snapshot.reviewState.completed_live) {
    assert(
      completed.reviewed_files.length > 0,
      `${library}: ${completed.icon_id} is completed_live without a matching artifact`
    );
  }

  for (const record of approvedRecords) {
    if (record.source_library !== library) continue;
    for (const field of STRUCTURAL_FIELDS) {
      assert(field in record, `${library}: ${record.icon_id} missing structural field ${field}`);
    }
  }

  const untouched = new Set(snapshot.reviewState.untouched.map((item) => item.icon_id));
  for (const pending of snapshot.reviewState.reviewed_pending) {
    assert(!untouched.has(pending.icon_id), `${library}: ${pending.icon_id} appears in both reviewed_pending and untouched`);
  }

  if (
    snapshot.reviewState.reviewed_pending.length === 0 &&
    snapshot.reviewState.untouched.length === 0
  ) {
    assert(
      snapshot.completionState.unresolved_unmapped_count === 0,
      `${library}: mapped review work is exhausted, but ${snapshot.completionState.unresolved_unmapped_count} unresolved unmapped concepts remain`
    );
    assert(
      snapshot.completionState.move_to_next_library_allowed === true,
      `${library}: library_complete should unlock the next library`
    );
  }

  return {
    library,
    finalFileCount: finalFiles.length,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const libraries = options.library ? [options.library] : listScreenshotLibraries();

  assert(libraries.length > 0, 'No screenshot-mapped libraries found to verify.');

  const results = libraries.map((library) => verifyLibrary(library));
  const totalFinalFiles = results.reduce((sum, result) => sum + result.finalFileCount, 0);

  console.log(
    `verify-screenshot-quality-workflow: ok (${libraries.length} libraries checked, ${totalFinalFiles} recognized final-records files checked)`
  );
}

main();
