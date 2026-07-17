#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const npmCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';

function runNpmPack(cwd) {
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npm pack --dry-run --json']
    : ['pack', '--dry-run', '--json'];
  const output = execFileSync(npmCommand, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output)[0];
}

function fail(message) {
  console.error(`[public-boundaries] ${message}`);
  process.exitCode = 1;
}

function assertNoPrivatePaths(label, files) {
  const privatePrefixes = [
    'archive/',
    'docs/archive/',
    'docs/audits/',
    'docs/superpowers/',
    'docs/vision-deck/',
    'plans/',
    'strategy/',
    'output/',
    'video/',
    '.env',
    '.agents/',
    '.vscode/',
  ];
  const hits = files.filter((file) => privatePrefixes.some((prefix) => file === prefix || file.startsWith(prefix)));
  if (hits.length > 0) {
    fail(`${label} includes private/generated paths: ${hits.slice(0, 20).join(', ')}`);
  }
}

const rootPackage = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
if (rootPackage.private !== true) {
  fail('root package.json must remain private.');
}

const rootPack = runNpmPack(repoRoot);
const rootFiles = rootPack.files.map((file) => file.path);
if (rootFiles.length !== 1 || rootFiles[0] !== 'package.json') {
  fail(`root npm pack must contain only package.json; saw ${rootFiles.length} files.`);
}
assertNoPrivatePaths('root npm pack', rootFiles);

const mcpRoot = path.join(repoRoot, 'mcp');
if (!existsSync(path.join(mcpRoot, 'package.json'))) {
  fail('mcp/package.json not found.');
} else {
  const mcpPack = runNpmPack(mcpRoot);
  const mcpFiles = mcpPack.files.map((file) => file.path);
  assertNoPrivatePaths('mcp npm pack', mcpFiles);
  if (!mcpFiles.includes('package.json') || !mcpFiles.includes('index.js') || !mcpFiles.includes('remote-server.js')) {
    fail('mcp npm pack is missing expected runtime files.');
  }
  console.log(`[public-boundaries] root pack: ${rootFiles.length} file; MCP pack: ${mcpFiles.length} files.`);
}

if (!process.exitCode) {
  console.log('[public-boundaries] public/private package boundaries passed.');
}
