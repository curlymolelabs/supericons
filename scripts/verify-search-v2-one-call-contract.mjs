import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

function readArgument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageRoot = resolve(readArgument('--package-root', resolve(repoRoot, 'mcp')));
const sdkClientRoot = join(
  packageRoot,
  'node_modules',
  '@modelcontextprotocol',
  'sdk',
  'dist',
  'esm',
  'client',
);
const { Client } = await import(pathToFileURL(join(sdkClientRoot, 'index.js')).href);
const { StdioClientTransport } = await import(pathToFileURL(join(sdkClientRoot, 'stdio.js')).href);

function parsePayload(result) {
  if (result?.structuredContent) return result.structuredContent;
  const text = result?.content?.find((entry) => entry.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
}

function assertResolvableMarkdownImage(payload) {
  assert.equal(typeof payload.image_url, 'string');
  const imageUrl = new URL(payload.image_url);
  assert.equal(imageUrl.protocol, 'https:');
  assert.ok(imageUrl.pathname.endsWith('/preview-icons.png'));
  assert.equal(typeof payload.markdown_image, 'string');
  assert.ok(payload.markdown_image.includes(payload.image_url));
}

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageRoot, 'index.js')],
  cwd: packageRoot,
  env: {
    ...process.env,
    SUPERICONS_MCP_LOG_STARTUP: '0',
    SUPERICONS_MCP_TELEMETRY_ENABLED: '0',
  },
  stderr: 'pipe',
});
const client = new Client({ name: 'search-v2-one-call-contract', version: '1.0.0' });

try {
  await client.connect(transport);

  const instructions = client.getInstructions();
  assert.match(instructions, /Use search_icons as the main tool/);
  assert.match(instructions, /include it in the final answer/);
  assert.match(instructions, /do not invent an icon/);
  assert.match(instructions, /up to 20 named UI slots/);
  assert.match(instructions, /explain the plain-language reason and follow next_step/);

  const tools = await client.listTools();
  const searchTool = tools.tools.find((tool) => tool.name === 'search_icons');
  const previewTool = tools.tools.find((tool) => tool.name === 'preview_icons');
  assert.match(searchTool.description, /main icon tool/);
  assert.match(searchTool.description, /honest structured no-result/);
  assert.match(previewTool.description, /Use search_icons first/);

  let matchSearchCalls = 0;
  const matchResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'database',
      library_mode: 'unexpected-mode',
      style: 'unexpected-style',
      limit: '3',
    },
  });
  matchSearchCalls += 1;
  const matchPayload = parsePayload(matchResult);
  assert.equal(matchSearchCalls, 1, 'match scenario must make exactly one search call');
  assert.ok(matchPayload.results.length > 0, 'meaningful query must return usable icons');
  assertResolvableMarkdownImage(matchPayload);
  assert.match(matchPayload.suggested_response_markdown, /database/i);
  assert.ok(matchPayload.results.some((icon) => (
    matchPayload.suggested_response_markdown.includes(icon.icon_ref)
  )));
  assert.equal(typeof matchPayload.next_step, 'string');
  assert.equal(matchPayload.warnings.length, 2, 'unsupported optional filters should be ignored with warnings');

  let variantSearchCalls = 0;
  const variantResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'analytics dashboard',
      library: 'tabler',
      library_mode: 'prefer',
      limit: 3,
    },
  });
  variantSearchCalls += 1;
  const variantPayload = parsePayload(variantResult);
  assert.equal(variantSearchCalls, 1, 'variant scenario must make exactly one search call');
  assert.ok(variantPayload.results.length > 0, 'variant scenario must return usable icons');
  assert.ok(
    variantPayload.results.every((icon) => typeof icon.matchedQueryVariant === 'string'),
    'variant fallback results must name the matched query variant',
  );
  assert.ok(
    variantPayload.results.every((icon) => icon.matchKind === 'semantic_fallback'),
    'variant fallback results must label the match kind',
  );
  assertResolvableMarkdownImage(variantPayload);

  let styleSearchCalls = 0;
  const styleResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings solid',
      library: 'material',
      library_mode: 'strict',
      limit: 3,
    },
  });
  styleSearchCalls += 1;
  const stylePayload = parsePayload(styleResult);
  assert.equal(styleSearchCalls, 1, 'style scenario must make exactly one search call');
  assert.ok(stylePayload.results.length > 0, 'style scenario must return usable icons');
  assert.ok(stylePayload.results.every((icon) => icon.style === 'solid'));
  assert.ok(stylePayload.results.every((icon) => icon.matchedQueryVariant === 'settings'));
  assert.ok(stylePayload.results.every((icon) => icon.matchKind === 'normalized_style'));

  let constraintSearchCalls = 0;
  const constraintResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'settings visually distinct 18px',
      library: 'material',
      library_mode: 'strict',
      limit: 3,
    },
  });
  constraintSearchCalls += 1;
  const constraintPayload = parsePayload(constraintResult);
  assert.equal(constraintSearchCalls, 1, 'constraint scenario must make exactly one search call');
  assert.ok(constraintPayload.results.length > 0, 'constraint scenario must return usable icons');
  assert.ok(constraintPayload.results.every((icon) => icon.matchedQueryVariant === 'settings'));
  assert.ok(constraintPayload.results.every((icon) => icon.matchKind === 'normalized_constraints'));

  let noResultSearchCalls = 0;
  const noResult = await client.callTool({
    name: 'search_icons',
    arguments: {
      query: 'zzzzqv unsupported nonsense 918273645',
      library: 'lucide',
      library_mode: 'strict',
      limit: 3,
    },
  });
  noResultSearchCalls += 1;
  const noResultPayload = parsePayload(noResult);
  assert.equal(noResultSearchCalls, 1, 'no-result scenario must make exactly one search call');
  assert.equal(noResultPayload.code, 'no_icons_found');
  assert.deepEqual(noResultPayload.results, undefined);
  assert.equal('image_url' in noResultPayload, false);
  assert.equal('markdown_image' in noResultPayload, false);
  assert.equal(typeof noResultPayload.hint, 'string');
  assert.equal(typeof noResultPayload.next_step, 'string');
  assert.match(noResultPayload.suggested_response_markdown, /No matching icons were found/);

  const longRefs = [
    'lucide:database',
    'lucide:circle-database',
    'lucide:server',
    'lucide:hard-drive',
    'lucide:cloud',
    'lucide:folder',
    'lucide:file',
    'lucide:search',
    'lucide:settings',
    'lucide:user',
    'lucide:home',
    'lucide:heart',
    'lucide:star',
    'lucide:bell',
    'lucide:calendar',
  ];
  const previewResult = await client.callTool({
    name: 'preview_icons',
    arguments: {
      icon_refs: longRefs.join(','),
      include_image: 'false',
      limit: '13',
      style: 'unexpected-style',
    },
  });
  const previewPayload = parsePayload(previewResult);
  assert.equal(previewResult.isError, undefined);
  assert.equal(previewPayload.truncated_from, longRefs.length);
  assert.ok(previewPayload.results.length <= 12);
  assert.ok(previewPayload.results.length > 0);
  assert.equal(previewPayload.image_included, false);
  assert.equal(previewPayload.rendered_count, previewPayload.results.length);
  assert.equal(previewPayload.browser_preview_count, longRefs.length);
  assert.equal(new URL(previewPayload.preview_url).searchParams.get('icons').split(',').length, longRefs.length);
  assert.equal(previewPayload.warnings.length, 2);
  assert.match(previewPayload.warnings.join(' '), /maximum of 12/);
  assert.equal(typeof previewPayload.next_step, 'string');
  assert.match(previewPayload.next_step, /Open preview_url to view all 15/);

  const twentySlotResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose icons for a running application.',
      slots: Array.from({ length: 20 }, () => 'run'),
      response_mode: 'plan',
      limit_per_slot: '1',
    },
  });
  const twentySlotPayload = parsePayload(twentySlotResult);
  assert.equal(twentySlotResult.isError, undefined);
  assert.equal(twentySlotPayload.slot_count, 20);
  assert.equal(twentySlotPayload.results.length, 20);
  assert.equal(twentySlotPayload.needs_clarification, true);

  const overLimitResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      task: 'Choose icons for a fitness application.',
      slots: Array.from({ length: 21 }, (_, index) => `Slot ${index + 1}`),
    },
  });
  const overLimitPayload = parsePayload(overLimitResult);
  assert.equal(overLimitResult.isError, undefined);
  assert.equal(overLimitPayload.code, 'recommendation_slot_limit_exceeded');
  assert.equal(overLimitPayload.details.received_slot_count, 21);
  assert.equal(overLimitPayload.details.maximum_slot_count, 20);
  assert.match(overLimitPayload.next_step, /groups of 20 or fewer/);
  assert.deepEqual(overLimitPayload.results, []);

  const missingTaskResult = await client.callTool({
    name: 'recommend_icons',
    arguments: {
      slots: ['Home'],
    },
  });
  const missingTaskPayload = parsePayload(missingTaskResult);
  assert.equal(missingTaskResult.isError, undefined);
  assert.equal(missingTaskPayload.code, 'recommendation_task_required');
  assert.match(missingTaskPayload.next_step, /task description/);

  console.log(JSON.stringify({
    status: 'ok',
    instructions: 'verified',
    match_search_calls: matchSearchCalls,
    match_result_count: matchPayload.results.length,
    variant_search_calls: variantSearchCalls,
    variant_result_count: variantPayload.results.length,
    style_search_calls: styleSearchCalls,
    style_result_count: stylePayload.results.length,
    constraint_search_calls: constraintSearchCalls,
    constraint_result_count: constraintPayload.results.length,
    no_result_search_calls: noResultSearchCalls,
    no_result_code: noResultPayload.code,
    preview_input_count: longRefs.length,
    preview_result_count: previewPayload.results.length,
    preview_truncated_from: previewPayload.truncated_from,
    preview_browser_count: previewPayload.browser_preview_count,
    recommendation_slot_limit: twentySlotPayload.slot_count,
    recommendation_over_limit_code: overLimitPayload.code,
    recommendation_missing_task_code: missingTaskPayload.code,
  }, null, 2));
} finally {
  await transport.close().catch(() => {});
}
