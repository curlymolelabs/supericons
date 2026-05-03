import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildIntentQueryVariants,
  buildSearchIntentProfile,
  getIntentCandidateAdjustment,
} from '../lib/search-intent-core.js';

const fixturePath = resolve('data/search-intent-fixtures/search-intent-fixtures.json');
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8'));
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
