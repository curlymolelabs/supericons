#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Set(process.argv.slice(2));
const packageRoot = process.cwd();
const packageJsonPath = path.join(packageRoot, 'package.json');

if (!existsSync(packageJsonPath)) {
  console.error('[public-safety] package.json not found in current directory.');
  process.exit(1);
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const packageName = packageJson.name || '(unnamed package)';
const extraForbiddenTerms = (process.env.SUPERICONS_PUBLIC_SAFETY_FORBIDDEN_TERMS || '')
  .split(',')
  .map((term) => term.trim())
  .filter(Boolean);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const patterns = [
  {
    id: 'personal-gmail-address',
    re: /\b[A-Z0-9._%+-]+@gmail\.com\b/gi,
    message: 'Gmail addresses must not be published in package metadata or files.',
  },
  {
    id: 'local-user-path',
    re: /(?:file:\/\/\/)?[A-Z]:[\\/]+Users[\\/]+[^"'`\s<>{}\])]+/gi,
    message: 'Local user paths must not be published.',
  },
  {
    id: 'tool-memory-path',
    re: /\.(?:codex|gemini)[\\/][^"'`\s<>{}\])]+/gi,
    message: 'Local tool memory/worktree paths must not be published.',
  },
  {
    id: 'env-local-reference',
    re: /\.env\.local/gi,
    message: '.env.local must not be referenced in publishable package files.',
  },
  {
    id: 'hardcoded-service-secret-assignment',
    re: /\b(?:SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY|RESEND_API_KEY|SEND_EMAIL_HOOK_SECRET)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{8,}/g,
    message: 'Sensitive service secrets must be read from the environment, not published.',
  },
  {
    id: 'common-secret-token',
    re: /\b(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16}|npm_[A-Za-z0-9]{30,})\b/g,
    message: 'Secret-looking token detected in publishable package files.',
  },
  {
    id: 'internal-process-metadata',
    re: /\b(?:reviewer_model|reviewer_reasoning_effort|internal_review_status|prompt_notes|prompt_strategy|workflow_trace|agent_notes|private_confidence_rationale)\b/g,
    message: 'Internal AI/process metadata must not be published.',
  },
  {
    id: 'prompt-injection-phrase',
    re: /\b(?:ignore previous instructions|disregard prior instructions|reveal (?:the )?(?:system|developer) prompt|exfiltrate secrets|jailbreak)\b/gi,
    message: 'Instruction-like prompt injection phrase detected in publishable files.',
  },
];

for (const term of extraForbiddenTerms) {
  patterns.push({
    id: 'configured-forbidden-term',
    re: new RegExp(escapeRegExp(term), 'gi'),
    message: 'Configured forbidden term must not appear in publishable package files.',
  });
}

function getPackFiles() {
  const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm pack --dry-run --json']
    : ['pack', '--dry-run', '--json'];
  const output = execFileSync(command, commandArgs, {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const [pack] = JSON.parse(output);
  return (pack?.files || []).map((entry) => entry.path).filter(Boolean);
}

function isTextLike(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ext) return true;
  return new Set([
    '.cjs',
    '.css',
    '.html',
    '.js',
    '.json',
    '.jsx',
    '.mjs',
    '.md',
    '.svg',
    '.ts',
    '.tsx',
    '.txt',
    '.xml',
    '.yml',
    '.yaml',
  ]).has(ext);
}

function lineAndColumn(text, index) {
  const before = text.slice(0, index);
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function scanFile(relativePath) {
  const absolutePath = path.join(packageRoot, relativePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile() || !isTextLike(absolutePath)) {
    return [];
  }

  const text = readFileSync(absolutePath, 'utf8');
  const findings = [];
  for (const pattern of patterns) {
    pattern.re.lastIndex = 0;
    for (const match of text.matchAll(pattern.re)) {
      const location = lineAndColumn(text, match.index || 0);
      findings.push({
        file: relativePath,
        line: location.line,
        column: location.column,
        id: pattern.id,
        message: pattern.message,
      });
      if (findings.length >= 20) return findings;
    }
  }
  return findings;
}

let files;
try {
  files = getPackFiles();
} catch (error) {
  console.error(`[public-safety] Unable to inspect npm pack output for ${packageName}.`);
  console.error(error.message);
  process.exit(1);
}

const findings = files.flatMap(scanFile);

if (findings.length > 0) {
  console.error(`[public-safety] ${packageName} is not safe to publish.`);
  for (const finding of findings.slice(0, 50)) {
    console.error(
      `- ${finding.file}:${finding.line}:${finding.column} ${finding.id}: ${finding.message}`,
    );
  }
  if (findings.length > 50) {
    console.error(`- ${findings.length - 50} additional findings omitted.`);
  }
  process.exit(1);
}

if (args.has('--verbose')) {
  console.log(`[public-safety] ${packageName}: scanned ${files.length} packed files.`);
} else {
  console.log(`[public-safety] ${packageName}: publishable files passed privacy/security scan.`);
}
