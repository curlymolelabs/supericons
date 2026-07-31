import assert from 'node:assert/strict';

import {
  SEARCH_TOOL_SERVER_INSTRUCTIONS,
  buildSearchFailurePresentation,
  buildSearchMatchPresentation,
  buildSearchNoResultPresentation,
  normalizeSearchToolArguments,
} from '../mcp/search-tool-shell.js';
import { buildPreviewTextPayload } from '../mcp/preview-icons.js';

const noLibrary = normalizeSearchToolArguments({
  query: 'OpenAI logo',
});
assert.equal(noLibrary.library, undefined);
assert.equal(noLibrary.library_mode, 'all');
assert.deepEqual(noLibrary.warnings, []);

const namedLibrary = normalizeSearchToolArguments({
  query: 'external SSO',
  library: 'tabler',
});
assert.equal(namedLibrary.library, 'tabler');
assert.equal(namedLibrary.library_mode, 'strict');
assert.deepEqual(namedLibrary.warnings, []);

const preferWithoutLibrary = normalizeSearchToolArguments({
  query: 'OpenAI logo',
  library_mode: 'prefer',
});
assert.equal(preferWithoutLibrary.library, undefined);
assert.equal(preferWithoutLibrary.library_mode, 'all');
assert.match(preferWithoutLibrary.warnings.join(' '), /prefer.*named library/i);

const literalAllLibrary = normalizeSearchToolArguments({
  query: 'OpenAI logo',
  library: 'all',
  library_mode: 'prefer',
});
assert.equal(literalAllLibrary.library, undefined);
assert.equal(literalAllLibrary.library_mode, 'all');
assert.match(literalAllLibrary.warnings.join(' '), /all libraries/i);

assert.match(SEARCH_TOOL_SERVER_INSTRUCTIONS, /did not name a library.*all libraries/i);
assert.match(SEARCH_TOOL_SERVER_INSTRUCTIONS, /Never infer si/i);
assert.match(SEARCH_TOOL_SERVER_INSTRUCTIONS, /two or more named UI slots.*recommend_icons/i);
assert.match(SEARCH_TOOL_SERVER_INSTRUCTIONS, /exact returned ref/i);
assert.match(SEARCH_TOOL_SERVER_INSTRUCTIONS, /preview_url/i);

const previewUrl = 'https://supericons.dev/?view=icons&preview=mcp&icons=lucide%3Adatabase';
const imageUrl = 'https://mcp.supericons.dev/preview-icons.png?icons=lucide%3Adatabase';
const markdownImage = `![Supericons preview](${imageUrl})`;
const oneResult = {
  id: 'database',
  name: 'Database',
  library: 'lucide',
  icon_ref: 'lucide:database',
  semantic: {
    purpose: 'Structured data storage.',
  },
};
const matchPresentation = buildSearchMatchPresentation({
  query: 'database',
  results: [oneResult],
  previewUrl,
  imageUrl,
  markdownImage,
});
assert.equal(matchPresentation.outcome_type, 'results');
assert.equal(matchPresentation.result_count, 1);
assert.equal(matchPresentation.top_result_ref, 'lucide:database');
assert.match(matchPresentation.result_interpretation, /single verified result.*not.*weak/i);
assert.doesNotMatch(matchPresentation.result_interpretation, /^low$/i);
assert.match(matchPresentation.suggested_response_markdown, /Structured data storage/);
assert.match(matchPresentation.suggested_response_markdown, /Open the visual preview/);

const noResultPresentation = buildSearchNoResultPresentation({
  query: 'unsupported nonsense',
  hint: 'Try a broader term.',
});
assert.equal(noResultPresentation.outcome_type, 'no_match');
assert.equal(noResultPresentation.result_count, 0);
assert.match(noResultPresentation.result_interpretation, /No verified icon matched/);

const failurePresentation = buildSearchFailurePresentation({
  query: 'database',
  error: Object.assign(new Error('Search dependency unavailable.'), {
    code: 'hosted_search_unavailable',
    retryable: true,
  }),
});
assert.equal(failurePresentation.outcome_type, 'tool_error');
assert.equal(failurePresentation.result_count, 0);
assert.match(failurePresentation.result_interpretation, /not a no-result/i);

const previewPayload = buildPreviewTextPayload({
  icons: [oneResult],
  previewUrl,
  imageUrl,
  markdownImage,
  imageIncluded: true,
});
assert.equal(typeof previewPayload.suggested_response_markdown, 'string');
assert.ok(previewPayload.suggested_response_markdown.includes(markdownImage));
assert.ok(previewPayload.suggested_response_markdown.includes(previewUrl));
assert.match(previewPayload.suggested_response_markdown, /cannot display.*inline/i);
assert.match(previewPayload.suggested_response_markdown, /lucide:database/);

console.log(JSON.stringify({
  status: 'ok',
  default_without_library: noLibrary.library_mode,
  default_with_library: namedLibrary.library_mode,
  normalized_prefer_without_library: preferWithoutLibrary.library_mode,
  match_outcome: matchPresentation.outcome_type,
  no_match_outcome: noResultPresentation.outcome_type,
  failure_outcome: failurePresentation.outcome_type,
  preview_fallback: 'present',
}, null, 2));
