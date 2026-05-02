import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');
const outputDir = path.join(repoRoot, 'data/si-registry/staging/supabase-review-queues');
const outputPath = path.join(outputDir, 'registry-review-queue-snapshot.json');

const PAGE_SIZE = 1000;
const SOURCE = 'live_supabase:depicts_visual_quality';

const GENERIC_STARTS = [
  ['generic_icon_showing', /^an? icon showing\b/i],
  ['generic_outline_icon_showing', /^an? outline icon showing\b/i],
];

const ABSTRACT_PATTERNS = [
  ['abstract_used_for', /\bused for\b/i],
  ['abstract_navigation_cue', /\bnavigation cue\b/i],
  ['abstract_interface_use', /\binterface use\b/i],
  ['abstract_system_behavior', /\bsystem behavior\b/i],
  ['abstract_shell_layout_control', /\bshell or layout control\b/i],
  ['abstract_technical_ai_symbol', /\btechnical or ai-oriented symbol\b/i],
  ['abstract_status_attention_symbol', /\bstatus or attention symbol\b/i],
  ['abstract_control_symbol', /\bcontrol symbol\b/i],
  ['abstract_symbol_used', /\bsymbol used\b/i],
];

const DIRECTION_WORDS = ['up', 'down', 'left', 'right', 'back', 'forward'];
const SHAPE_WORDS = ['circle', 'square', 'box', 'rectangle', 'triangle', 'chevron', 'caret', 'arrow', 'slash', 'plus', 'minus'];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Use node --env-file=.env.local or set ${name}.`);
  return value;
}

async function requestSupabase(pathname, options = {}) {
  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const url = new URL(`${supabaseUrl}/rest/v1/${pathname}`);

  for (const [key, value] of Object.entries(options.searchParams || {})) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer || 'return=representation',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Supabase ${options.method || 'GET'} ${pathname} failed (${response.status}): ${text}`);
  }

  return response;
}

async function fetchAllRecords() {
  const records = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const response = await requestSupabase('icon_registry_records', {
      searchParams: {
        select: 'icon_id,library_key,source_name,label,depicts,semantic_tags,synonyms,use_when,avoid_when',
        order: 'icon_id.asc',
      },
      headers: {
        Range: `${from}-${to}`,
      },
    });

    const page = await response.json();
    records.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return records;
}

function summarizeBy(items, field) {
  return items.reduce((counts, item) => {
    const key = item[field] ?? 'unknown';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function severityRank(severity) {
  if (severity === 'blocker') return 4;
  if (severity === 'error') return 3;
  if (severity === 'warning') return 2;
  if (severity === 'info') return 1;
  return 0;
}

function severityForDuplicateCount(count) {
  if (count >= 25) return 'error';
  if (count >= 5) return 'warning';
  return 'info';
}

function priorityForIssues(issues) {
  const highest = issues.reduce((rank, issue) => Math.max(rank, severityRank(issue.severity)), 0);
  const base = highest >= 4 ? 100 : highest === 3 ? 90 : highest === 2 ? 75 : 55;
  return Math.min(100, base + Math.min(10, Math.max(0, issues.length - 1)));
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceTokens(record) {
  return new Set(normalizeText(`${record.source_name} ${record.label}`).split(' ').filter(Boolean));
}

function depictsHasDirection(depicts, direction) {
  const normalized = normalizeText(depicts);
  if (direction === 'back') return /\b(back|backward|left|previous|return)\b/.test(normalized);
  if (direction === 'forward') return /\b(forward|right|next)\b/.test(normalized);
  if (direction === 'up') return /\b(up|upward|upper|above|rising)\b/.test(normalized);
  if (direction === 'down') return /\b(down|downward|lower|below|descending)\b/.test(normalized);
  if (direction === 'left') return /\b(left|back|backward|previous)\b/.test(normalized);
  if (direction === 'right') return /\b(right|forward|next)\b/.test(normalized);
  return new RegExp(`\\b${direction}\\b`).test(normalized);
}

function buildRecordIssues(record, duplicateGroup) {
  const issues = [];
  const depicts = String(record.depicts || '').trim();
  const depictsNorm = normalizeText(depicts);
  const tokens = sourceTokens(record);

  if (!depicts) {
    issues.push({
      code: 'depicts_missing',
      severity: 'blocker',
      field: 'depicts',
      message: 'Depicts is empty; it must describe the visible physical shape of the icon.',
    });
  }

  for (const [code, pattern] of GENERIC_STARTS) {
    if (pattern.test(depicts)) {
      issues.push({
        code,
        severity: 'warning',
        field: 'depicts',
        message: 'Depicts starts with generic wrapper text instead of directly describing the visible icon shapes.',
      });
    }
  }

  for (const [code, pattern] of ABSTRACT_PATTERNS) {
    if (pattern.test(depicts)) {
      issues.push({
        code,
        severity: 'warning',
        field: 'depicts',
        message: 'Depicts contains abstract use-case language; this field should be a literal visual description.',
      });
    }
  }

  if (duplicateGroup && duplicateGroup.length > 1) {
    const examples = duplicateGroup.slice(0, 8).map((item) => item.icon_id).join(', ');
    issues.push({
      code: 'exact_duplicate_depicts',
      severity: severityForDuplicateCount(duplicateGroup.length),
      field: 'depicts',
      message: `Same depicts text is shared by ${duplicateGroup.length} records. Examples: ${examples}.`,
    });
  }

  for (const direction of DIRECTION_WORDS) {
    if (tokens.has(direction) && !depictsHasDirection(depicts, direction)) {
      issues.push({
        code: `missing_direction_${direction}`,
        severity: 'error',
        field: 'depicts',
        message: `Source name or label includes "${direction}", but depicts does not physically describe that direction.`,
      });
    }
  }

  for (const shape of SHAPE_WORDS) {
    if (tokens.has(shape) && !depictsNorm.includes(shape)) {
      issues.push({
        code: `missing_visible_modifier_${shape}`,
        severity: 'warning',
        field: 'depicts',
        message: `Source name or label includes "${shape}", but depicts does not mention that visible modifier.`,
      });
    }
  }

  if (tokens.has('emoji') && /\b(arrow|navigation|back|forward)\b/i.test(depicts)) {
    issues.push({
      code: 'likely_visual_mismatch_emoji_arrow',
      severity: 'blocker',
      field: 'depicts',
      message: 'Emoji icon is described as arrow/navigation; this is likely a visual mismatch.',
    });
  }

  return issues;
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

const records = await fetchAllRecords();
const depictsGroups = new Map();

for (const record of records) {
  const depicts = String(record.depicts || '').trim();
  const groupKey = `${record.library_key}\u0000${depicts}`;
  if (!depictsGroups.has(groupKey)) depictsGroups.set(groupKey, []);
  depictsGroups.get(groupKey).push(record);
}

const findings = [];
const queueRows = [];
const samples = [];

for (const record of records) {
  const duplicateGroup = depictsGroups.get(`${record.library_key}\u0000${String(record.depicts || '').trim()}`) || [];
  const issues = buildRecordIssues(record, duplicateGroup);
  if (issues.length === 0) continue;

  const sortedIssues = [...issues].sort((left, right) => (
    severityRank(right.severity) - severityRank(left.severity)
    || left.code.localeCompare(right.code)
  ));

  queueRows.push({
    icon_id: record.icon_id,
    library_key: record.library_key,
    queue_type: 'depicts_visual_quality',
    priority: priorityForIssues(sortedIssues),
    source_path: SOURCE,
    status: 'open',
  });

  for (const issue of sortedIssues) {
    findings.push({
      icon_id: record.icon_id,
      library_key: record.library_key,
      issue_code: issue.code,
      severity: issue.severity,
      field_name: issue.field,
      message: issue.message,
      source: SOURCE,
      status: 'open',
    });
  }

  if (samples.length < 50) {
    samples.push({
      icon_id: record.icon_id,
      library_key: record.library_key,
      source_name: record.source_name,
      label: record.label,
      depicts: record.depicts,
      issues: sortedIssues.map((issue) => issue.code),
    });
  }
}

queueRows.sort((left, right) => (
  right.priority - left.priority
  || left.library_key.localeCompare(right.library_key)
  || left.icon_id.localeCompare(right.icon_id)
));

findings.sort((left, right) => (
  left.library_key.localeCompare(right.library_key)
  || left.icon_id.localeCompare(right.icon_id)
  || left.issue_code.localeCompare(right.issue_code)
));

const snapshot = {
  schemaVersion: '1.0.0',
  generatedAt: new Date().toISOString(),
  source: {
    sourceTable: 'icon_registry_records',
    source: SOURCE,
    purpose: 'Flag depicts records that are visually generic, duplicated, abstract, or missing visible modifiers.',
  },
  summary: {
    recordsScanned: records.length,
    reviewQueueRows: queueRows.length,
    qualityFindings: findings.length,
    reviewQueueByLibrary: summarizeBy(queueRows, 'library_key'),
    findingsByIssue: summarizeBy(findings, 'issue_code'),
    findingsBySeverity: summarizeBy(findings, 'severity'),
  },
  samples,
  tables: {
    icon_registry_quality_findings: findings,
    icon_registry_review_queue: queueRows,
  },
};

snapshot.contentHash = crypto.createHash('sha256').update(JSON.stringify(snapshot.tables)).digest('hex');

await writeJson(outputPath, snapshot);

console.log('build-depicts-visual-quality-review-queue');
console.log(`snapshot: ${path.relative(repoRoot, outputPath)}`);
console.log(`records scanned: ${snapshot.summary.recordsScanned}`);
console.log(`review queue rows: ${snapshot.summary.reviewQueueRows}`);
console.log(`quality findings: ${snapshot.summary.qualityFindings}`);
console.log(`content hash: ${snapshot.contentHash}`);
console.log('review queue by library:');
for (const [library, count] of Object.entries(snapshot.summary.reviewQueueByLibrary).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${library}: ${count}`);
}
console.log('top finding types:');
for (const [issue, count] of Object.entries(snapshot.summary.findingsByIssue).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  console.log(`  ${issue}: ${count}`);
}
