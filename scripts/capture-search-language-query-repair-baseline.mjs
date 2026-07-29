import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function readArgument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

const serverRoot = resolve(readArgument('server-root') || 'mcp');
const corpusPath = resolve(
  readArgument('corpus') || 'data/search-intent-fixtures/language-query-repair-corpus.json',
);
const outputPath = resolve(readArgument('output') || '.tmp/search-language-query-repair-baseline.json');
const label = readArgument('label') || 'unspecified';
const sourceRevision = readArgument('source-revision');
const packageArchiveSha256 = readArgument('package-archive-sha256');

const corpusBytes = readFileSync(corpusPath);
const corpus = JSON.parse(corpusBytes);
const packageJson = JSON.parse(readFileSync(join(serverRoot, 'package.json'), 'utf8'));

function normalizeRef(result) {
  const library = result?.library || result?.lib || '';
  const id = result?.id || '';
  const style = result?.style ? `:${result.style}` : '';
  return `${library}:${id}${style}`.toLowerCase();
}

function evaluate(testCase, refs) {
  if (testCase.expected_decision === 'expected_zero') {
    return {
      passed: refs.length === 0,
      reason: refs.length === 0 ? 'honest_zero' : 'unexpected_results',
    };
  }

  const topRefs = refs.slice(0, 3);
  const required = testCase.required_ref_fragments.map((value) => value.toLowerCase());
  const forbidden = testCase.forbidden_ref_fragments.map((value) => value.toLowerCase());
  const relevantTopThree = topRefs.some((ref) => required.some((fragment) => ref.includes(fragment)));
  const forbiddenTopThree = topRefs.some((ref) => forbidden.some((fragment) => ref.includes(fragment)));
  const strictLibraryPassed = testCase.library_mode !== 'strict'
    || refs.every((ref) => ref.startsWith(`${testCase.library}:`));

  return {
    passed: refs.length > 0 && relevantTopThree && !forbiddenTopThree && strictLibraryPassed,
    reason: refs.length === 0
      ? 'false_zero'
      : !relevantTopThree
        ? 'top_three_not_relevant'
        : forbiddenTopThree
          ? 'forbidden_top_three'
          : !strictLibraryPassed
            ? 'strict_library_violated'
            : 'relevant_positive',
  };
}

class StdioMcpClient {
  constructor(root) {
    this.root = root;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = '';
    this.stderr = '';
  }

  async start() {
    this.child = spawn(process.execPath, [join(this.root, 'index.js')], {
      cwd: this.root,
      env: {
        ...process.env,
        SUPERICONS_API_KEY: '',
        SUPERICONS_DISABLE_TELEMETRY: '1',
        SUPERICONS_MCP_LOG_STARTUP: '0',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    this.child.stdout.setEncoding('utf8');
    this.child.stdout.on('data', (chunk) => {
      this.buffer += chunk;
      let newline = this.buffer.indexOf('\n');
      while (newline !== -1) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, '');
        this.buffer = this.buffer.slice(newline + 1);
        if (line.trim()) this.handleMessage(line);
        newline = this.buffer.indexOf('\n');
      }
    });
    this.child.stderr.setEncoding('utf8');
    this.child.stderr.on('data', (chunk) => {
      this.stderr += chunk;
    });
    this.child.once('exit', (code) => {
      const error = new Error(`MCP server exited with code ${code}. ${this.stderr.slice(-500)}`);
      for (const entry of this.pending.values()) entry.reject(error);
      this.pending.clear();
    });

    await this.request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: {
        name: 'supericons-language-query-baseline',
        version: '1.0.0',
      },
    });
    this.notify('notifications/initialized', {});
  }

  handleMessage(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.id === undefined) return;
    const entry = this.pending.get(message.id);
    if (!entry) return;
    this.pending.delete(message.id);
    clearTimeout(entry.timeout);
    if (message.error) {
      entry.reject(new Error(`${message.error.code}: ${message.error.message}`));
    } else {
      entry.resolve(message.result);
    }
  }

  send(message) {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  request(method, params) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolvePromise, rejectPromise) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectPromise(new Error(`Timed out waiting for ${method}`));
      }, 30000);
      this.pending.set(id, { resolve: resolvePromise, reject: rejectPromise, timeout });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method, params) {
    this.send({ jsonrpc: '2.0', method, params });
  }

  async search(testCase) {
    return this.request('tools/call', {
      name: 'search_icons',
      arguments: {
        query: testCase.query,
        library_mode: testCase.library_mode,
        style: testCase.style,
        limit: testCase.limit,
        ...(testCase.library ? { library: testCase.library } : {}),
        ...(testCase.locale ? { locale: testCase.locale } : {}),
      },
    });
  }

  async close() {
    if (!this.child) return;
    this.child.stdin.end();
    await new Promise((resolvePromise) => {
      const timeout = setTimeout(() => {
        this.child.kill();
        resolvePromise();
      }, 2000);
      this.child.once('exit', () => {
        clearTimeout(timeout);
        resolvePromise();
      });
    });
  }
}

function parseToolPayload(result) {
  const text = result?.content?.find((entry) => entry?.type === 'text')?.text;
  if (typeof text !== 'string') return { parse_error: 'missing_text_payload', results: [] };
  try {
    return JSON.parse(text);
  } catch {
    return { parse_error: 'invalid_json_payload', results: [] };
  }
}

const client = new StdioMcpClient(serverRoot);
const observations = [];

try {
  await client.start();
  for (const testCase of corpus.cases) {
    const startedAt = Date.now();
    try {
      const toolResult = await client.search(testCase);
      const payload = parseToolPayload(toolResult);
      const refs = Array.isArray(payload.results) ? payload.results.map(normalizeRef) : [];
      observations.push({
        case_id: testCase.case_id,
        defect_class: testCase.defect_class,
        query: testCase.query,
        locale: testCase.locale,
        library: testCase.library,
        library_mode: testCase.library_mode,
        style: testCase.style,
        limit: testCase.limit,
        expected_decision: testCase.expected_decision,
        duration_ms: Date.now() - startedAt,
        result_count: refs.length,
        result_refs: refs,
        response_code: payload.code || null,
        parse_error: payload.parse_error || null,
        evaluation: evaluate(testCase, refs),
      });
    } catch (error) {
      observations.push({
        case_id: testCase.case_id,
        defect_class: testCase.defect_class,
        query: testCase.query,
        locale: testCase.locale,
        library: testCase.library,
        library_mode: testCase.library_mode,
        style: testCase.style,
        limit: testCase.limit,
        expected_decision: testCase.expected_decision,
        duration_ms: Date.now() - startedAt,
        result_count: 0,
        result_refs: [],
        call_error: error instanceof Error ? error.message : String(error),
        evaluation: { passed: false, reason: 'call_error' },
      });
    }
  }
} finally {
  await client.close();
}

const failures = observations.filter((entry) => !entry.evaluation.passed);
const report = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  label,
  server_root: serverRoot,
  package_name: packageJson.name,
  package_version: packageJson.version,
  source_revision: sourceRevision || null,
  package_archive_sha256: packageArchiveSha256 || null,
  corpus_fixture_id: corpus.fixture_id,
  corpus_sha256: createHash('sha256').update(corpusBytes).digest('hex'),
  telemetry_disabled: true,
  case_count: observations.length,
  passing_case_count: observations.length - failures.length,
  failing_case_count: failures.length,
  failures: failures.map((entry) => ({
    case_id: entry.case_id,
    reason: entry.evaluation.reason,
    result_refs: entry.result_refs.slice(0, 3),
  })),
  observations,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: 'baseline_captured',
  label,
  package_version: packageJson.version,
  case_count: observations.length,
  passing_case_count: report.passing_case_count,
  failing_case_count: report.failing_case_count,
  output: outputPath,
}, null, 2));
