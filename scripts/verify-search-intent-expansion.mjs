import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from '../lib/search-intent-core.js';

const fixturePath = resolve('data/search-intent-fixtures/search-intent-fixtures.json');
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'));
const realQueryGapFixturePath = resolve('data/search-intent-fixtures/real-query-gaps.json');
const realQueryGapFixtures = JSON.parse(readFileSync(realQueryGapFixturePath, 'utf8'));
const failures = [];

function variantMatches(variants, expected) {
  const normalizedExpected = String(expected || '').toLowerCase();
  return variants.some((variant) => {
    const normalizedVariant = String(variant || '').toLowerCase();
    return normalizedVariant === normalizedExpected
      || normalizedVariant.includes(normalizedExpected)
      || normalizedExpected.includes(normalizedVariant);
  });
}

for (const fixture of fixtures.queries || []) {
  const variants = buildIntentQueryVariants(fixture.query);

  if (variants.length > 8) {
    failures.push(`${fixture.query}: expected at most 8 variants, found ${variants.length}`);
  }

  for (const expected of fixture.expected_variants || []) {
    if (!variantMatches(variants, expected)) {
      failures.push(`${fixture.query}: missing expected variant "${expected}" in ${JSON.stringify(variants)}`);
    }
  }
}

for (const fixture of realQueryGapFixtures.queries || []) {
  const variants = buildIntentQueryVariants(fixture.query, {
    maxVariants: fixture.max_variants || 10,
  });

  for (const expected of fixture.expected_variants || []) {
    if (!variantMatches(variants, expected)) {
      failures.push(`${fixture.query}: missing real-query gap variant "${expected}" in ${JSON.stringify(variants)}`);
    }
  }

  for (const forbidden of fixture.forbidden_variants || []) {
    if (variants.includes(String(forbidden).toLowerCase())) {
      failures.push(`${fixture.query}: included forbidden real-query gap variant "${forbidden}" in ${JSON.stringify(variants)}`);
    }
  }
}

const keywordBackoffChecks = [
  {
    query: 'license plate',
    expected: ['license plate', 'vehicle scan', 'camera scan', 'camera', 'scan', 'car'],
    forbidden: ['license', 'plate'],
  },
  {
    query: 'license plate recognition camera scan car',
    expected: ['camera', 'scan', 'car'],
  },
  {
    query: 'neck pain person',
    expected: ['person', 'neck', 'pain'],
  },
  {
    query: 'dream interpretation moon star eye mystical',
    expected: ['moon', 'star', 'eye'],
  },
  {
    query: 'cursor ai code editor logo',
    expected: ['code editor', 'cursor', 'code'],
    forbidden: ['logo'],
  },
  {
    query: 'xai artificial intelligence logo',
    expected: ['xai'],
    forbidden: ['logo', 'artificial', 'intelligence', 'intelligence logo'],
  },
];

for (const check of keywordBackoffChecks) {
  const variants = buildIntentQueryVariants(check.query, { maxVariants: 10 });

  for (const expected of check.expected || []) {
    if (!variants.includes(expected)) {
      failures.push(`${check.query}: missing keyword backoff variant "${expected}" in ${JSON.stringify(variants)}`);
    }
  }

  for (const forbidden of check.forbidden || []) {
    if (variants.includes(forbidden)) {
      failures.push(`${check.query}: should not include generic single-token variant "${forbidden}" in ${JSON.stringify(variants)}`);
    }
  }
}

const profileAdjustments = [
  {
    query: 'user profile',
    preferred: { icon_id: 'lucide:user-circle', name: 'user circle' },
    avoided: { icon_id: 'lucide:user-x', name: 'user x' },
  },
  {
    query: 'monitoring',
    preferred: { icon_id: 'lucide:chart-line', name: 'chart line' },
    avoided: { icon_id: 'lucide:eye-closed', name: 'eye closed' },
  },
  {
    query: 'prompt',
    preferred: { icon_id: 'lucide:message-square-text', name: 'message square text' },
    avoided: { icon_id: 'lucide:eye', name: 'eye' },
  },
  {
    query: 'beautiful',
    preferred: { icon_id: 'bootstrap:palette', name: 'palette' },
    avoided: { icon_id: 'lucide:server', name: 'server' },
  },
  {
    query: 'license plate',
    preferred: { icon_id: 'mingcute:scan_line', name: 'scan' },
    avoided: { icon_id: 'tabler:license', name: 'license' },
  },
];

for (const check of profileAdjustments) {
  const profile = buildSearchIntentProfile(check.query);
  const preferred = getIntentCandidateAdjustment(check.preferred, profile);
  const avoided = getIntentCandidateAdjustment(check.avoided, profile);

  if (preferred.boost <= 0) {
    failures.push(`${check.query}: expected preferred candidate to receive a boost`);
  }

  if (check.query !== 'beautiful' && avoided.penalty <= 0) {
    failures.push(`${check.query}: expected avoided candidate to receive a penalty`);
  }
}

if (failures.length > 0) {
  console.error('verify-search-intent-expansion: failed');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('verify-search-intent-expansion: ok');
