import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditFinalRecords } from '../lib/screenshot-quality/quality-audit.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const approvedPath = path.join(repoRoot, 'data', 'si-registry', 'automation', 'mingcute', 'approved-records.json');
const outputPath = path.join(repoRoot, 'data', 'si-registry', 'generated', 'mingcute-quality-recovery-inventory.json');

function baseFamily(sourceName) {
  return String(sourceName || '')
    .replace(/_(add|off|x|ai|rotate|time|month|day|week)$/g, '')
    .replace(/_[0-9]+$/g, '');
}

function countBy(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const approvedRecords = await readJson(approvedPath);
const issues = auditFinalRecords({ records: approvedRecords });
const recordsById = new Map(approvedRecords.map((record) => [record.icon_id, record]));
const issuesByIconId = new Map();

for (const issue of issues) {
  if (!issuesByIconId.has(issue.icon_id)) {
    issuesByIconId.set(issue.icon_id, []);
  }
  issuesByIconId.get(issue.icon_id).push(issue);
}

const blockerIcons = [...issuesByIconId.entries()]
  .map(([iconId, iconIssues]) => {
    const record = recordsById.get(iconId);
    return {
      icon_id: iconId,
      source_name: record?.source_name || null,
      label: record?.label || null,
      family: baseFamily(record?.source_name || ''),
      issue_codes: [...new Set(iconIssues.map((issue) => issue.code))].sort(),
      issues: iconIssues.map((issue) => ({
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
      })),
    };
  })
  .sort((left, right) => {
    const leftName = String(left.source_name || left.icon_id);
    const rightName = String(right.source_name || right.icon_id);
    return leftName.localeCompare(rightName) || left.icon_id.localeCompare(right.icon_id);
  });

const countsByCode = countBy(issues.map((issue) => issue.code));
const familyCounts = [...new Set(blockerIcons.map((item) => item.family))]
  .map((family) => ({
    family,
    blocker_icons: blockerIcons.filter((item) => item.family === family).length,
  }))
  .sort((left, right) => right.blocker_icons - left.blocker_icons || left.family.localeCompare(right.family));

const inventory = {
  library: 'mingcute',
  approved_records_path: path.relative(repoRoot, approvedPath).replaceAll(path.sep, '/'),
  generated_at: new Date().toISOString(),
  total_records: approvedRecords.length,
  issue_count: issues.length,
  blocker_count: issues.filter((issue) => issue.severity === 'blocker').length,
  counts_by_code: countsByCode,
  family_counts: familyCounts,
  blocker_icons: blockerIcons,
  next_batch_candidates: blockerIcons.slice(0, 25).map((item) => ({
    icon_id: item.icon_id,
    source_name: item.source_name,
    label: item.label,
    family: item.family,
    issue_codes: item.issue_codes,
  })),
};

await writeJson(outputPath, inventory);

console.log(
  JSON.stringify(
    {
      wrote: path.relative(repoRoot, outputPath).replaceAll(path.sep, '/'),
      issue_count: inventory.issue_count,
      blocker_count: inventory.blocker_count,
      distinct_families: inventory.family_counts.length,
      counts_by_code: inventory.counts_by_code,
    },
    null,
    2
  )
);
