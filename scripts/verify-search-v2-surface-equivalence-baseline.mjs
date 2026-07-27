import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { searchIcons } from '../mcp/search.js';

const captureBaseline = process.argv.includes('--capture-baseline');
const hostedArgument = process.argv.find((argument) => argument.startsWith('--hosted-url='));
const hostedUrl = hostedArgument ? hostedArgument.slice('--hosted-url='.length).replace(/\/+$/, '') : null;

const corpusBytes = readFileSync('data/semantic-search-v2/surface-equivalence-corpus.json');
const corpus = JSON.parse(corpusBytes);
const icons = JSON.parse(readFileSync('mcp/public/icon-index.json', 'utf8')).icons;
const synonyms = JSON.parse(readFileSync('mcp/public/synonyms.json', 'utf8'));

function normalizeRef(result) {
  return String(
    result?.icon_id
      || result?.icon_ref
      || `${result?.lib || result?.library || result?.source_library || ''}:${result?.id || ''}`,
  ).toLowerCase();
}

function evaluate(testCase, results, status = 200) {
  const refs = results.map(normalizeRef);
  const topThree = refs.slice(0, 3);
  if (testCase.expected_decision === 'expected_error') {
    return {
      passed: status >= 400,
      reason: status >= 400 ? 'expected_error_visible' : 'expected_error_hidden',
      refs,
    };
  }
  if (testCase.expected_decision === 'expected_zero') {
    return {
      passed: status === 200 && refs.length === 0,
      reason: refs.length === 0 ? 'honest_zero' : 'fabricated_or_unexpected_results',
      refs,
    };
  }
  const relevant = topThree.some((ref) =>
    testCase.relevant_any.some((expected) => ref.includes(String(expected).toLowerCase())),
  );
  const strictLibraryPassed = testCase.library_mode !== 'strict'
    || refs.every((ref) => ref.startsWith(`${testCase.library}:`));
  return {
    passed: status === 200 && refs.length > 0 && relevant && strictLibraryPassed,
    reason: status !== 200
      ? 'unexpected_error'
      : refs.length === 0
        ? 'false_zero'
        : !relevant
          ? 'top_three_not_relevant'
          : !strictLibraryPassed
            ? 'strict_library_violated'
            : 'relevant_positive',
    refs,
  };
}

function runLocal(testCase) {
  if (testCase.expected_decision === 'expected_error') {
    return { skipped: true, reason: 'hosted_error_fixture' };
  }
  const results = searchIcons(testCase.query, icons, synonyms, {
    library: testCase.library || null,
    libraryMode: testCase.library_mode || 'all',
    style: testCase.style || 'any',
    locale: testCase.locale || null,
    limit: testCase.limit || 8,
  });
  return evaluate(testCase, results);
}

async function runHosted(testCase) {
  if (!hostedUrl) return null;
  const response = await fetch(`${hostedUrl}/search-icons`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'supericons-surface-equivalence-baseline/1.0',
    },
    body: JSON.stringify({
      query: testCase.query,
      library: testCase.library || null,
      library_mode: testCase.library_mode || 'all',
      style: testCase.style || 'any',
      locale: testCase.locale || null,
      limit: testCase.limit || 8,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  return evaluate(testCase, Array.isArray(payload.results) ? payload.results : [], response.status);
}

const observations = [];
for (const testCase of corpus.cases) {
  observations.push({
    case_id: testCase.case_id,
    expected_decision: testCase.expected_decision,
    local: runLocal(testCase),
    ...(hostedUrl ? { hosted: await runHosted(testCase) } : {}),
  });
}

const failures = observations.flatMap((observation) =>
  ['local', 'hosted']
    .filter((surface) => observation[surface] && !observation[surface].skipped && !observation[surface].passed)
    .map((surface) => ({
      case_id: observation.case_id,
      surface,
      reason: observation[surface].reason,
      top_refs: observation[surface].refs.slice(0, 3),
    })),
);

const output = {
  status: failures.length === 0 ? 'passed' : captureBaseline ? 'failing_baseline_captured' : 'failed',
  fixture_id: corpus.fixture_id,
  fixture_sha256: createHash('sha256').update(corpusBytes).digest('hex'),
  evaluated_cases: observations.length,
  failure_count: failures.length,
  failures,
  observations,
};

console.log(JSON.stringify(output, null, 2));

if (captureBaseline) {
  if (failures.length === 0) {
    throw new Error('Expected the pre-fix baseline to contain at least one failure.');
  }
} else if (failures.length > 0) {
  process.exitCode = 1;
}
