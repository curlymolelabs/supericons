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

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const library = 'mingcute';
  const snapshot = loadScreenshotQualityState({ repoRoot, library });
  const manualRedoDir = path.join(repoRoot, 'data', 'si-registry', 'manual-redo');
  const finalFiles = fs
    .readdirSync(manualRedoDir)
    .filter((fileName) => isRecognizedScreenshotFinalRecordsFile(fileName, library))
    .sort();
  const liveRecords = snapshot.liveRecords.filter((record) => record.source_library === library);
  const liveById = new Map(liveRecords.map((record) => [record.icon_id, record]));
  const approvedRecords = readJson(path.join(repoRoot, 'data', 'si-registry', 'automation', library, 'approved-records.json'));
  const approvedBySourceName = new Map(approvedRecords.map((record) => [record.source_name, record]));
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

    // Quality audit is intentionally a per-batch promotion gate. The repo-level
    // verifier checks workflow invariants without re-blocking historical artifacts
    // when the audit rules become stricter over time.
  }

  for (const completed of snapshot.state.completed_live) {
    assert(
      completed.reviewed_files.length > 0,
      `${completed.icon_id} is completed_live without a matching artifact`
    );
  }

  for (const record of approvedRecords) {
    if (record.source_library !== library) continue;
    for (const field of STRUCTURAL_FIELDS) {
      assert(field in record, `${record.icon_id} missing structural field ${field}`);
    }
  }

  const untouched = new Set(snapshot.state.untouched.map((item) => item.icon_id));
  for (const pending of snapshot.state.reviewed_pending) {
    assert(!untouched.has(pending.icon_id), `${pending.icon_id} appears in both reviewed_pending and untouched`);
  }

  console.log(
    `verify-screenshot-quality-workflow: ok (${finalFiles.length} recognized final-records files checked)`
  );
}

main();
