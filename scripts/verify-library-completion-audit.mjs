import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const libraryId = process.argv[2];
assert(libraryId, 'Usage: node scripts/verify-library-completion-audit.mjs <library_id>');

const reportPath = path.join(repoRoot, 'data', 'si-registry', 'generated', `${libraryId}-completion-audit.json`);
assert(await exists(reportPath), `Missing library completion audit report for ${libraryId}`);

const report = await readJson(reportPath);
assert(report.library_id === libraryId, `Audit report library mismatch: expected ${libraryId}`);
assert(report.coverage.processed_matches_source_total === true, `${libraryId} audit must match the official library size`);
assert(report.projection.matches_expected_public_registry_count === true, `${libraryId} audit must match the expected public registry count`);
assert(report.metadata_safety.banned_field_hit_count === 0, `${libraryId} audit must not find banned workflow fields`);
assert(typeof report.quality_signals.generic_placeholder_record_count === 'number', `${libraryId} audit must report placeholder-approved record count`);

const markdownPath = path.join(repoRoot, report.report_paths.markdown);
const htmlPath = path.join(repoRoot, report.report_paths.html);
assert(await exists(markdownPath), `Missing markdown audit report for ${libraryId}`);
assert(await exists(htmlPath), `Missing HTML audit report for ${libraryId}`);

if (
  report.coverage.hold_records > 0 ||
  report.coverage.reviewed_drafts > 0 ||
  report.quality_signals.generic_placeholder_record_count > 0
) {
  assert(
    report.verdict.status === 'incomplete_needs_follow_up',
    `${libraryId} audit should mark follow-up when hold, draft, or placeholder-approved records remain`
  );
} else {
  assert(
    report.verdict.status === 'fully_approved_complete',
    `${libraryId} audit should mark full approval when no hold or draft records remain`
  );
}

console.log(
  `verify-library-completion-audit: ${libraryId} | verdict=${report.verdict.status} | processed=${report.coverage.processed_total}/${report.coverage.source_total_icons}`
);
