import path from 'node:path';

export const PUBLIC_RECORD_FIELDS = [
  'icon_id',
  'source_library',
  'source_name',
  'label',
  'depicts',
  'semantic_tags',
  'synonyms',
  'use_when',
  'avoid_when',
];

export function toPublicRecord(record) {
  const output = {};
  for (const field of PUBLIC_RECORD_FIELDS) {
    output[field] = record[field];
  }
  return output;
}

function screenshotFileForStyle(item, style) {
  return (item.screenshot_files || []).find((fileName) => fileName.includes(`_${style}.png`));
}

export function buildReviewPacket({ library, batchId, selectedItems, liveRecords, screenshotRoot }) {
  const liveById = new Map(liveRecords.map((record) => [record.icon_id, record]));

  return {
    schema_version: '1.0.0',
    library,
    batch_id: batchId,
    review_mode: 'depicts_only',
    agent_allowed_fields: ['depicts'],
    non_depicts_fields_must_match_live: true,
    items: selectedItems.map((item) => {
      const live = liveById.get(item.icon_id);
      if (!live) {
        throw new Error(`No live record found for selected icon: ${item.icon_id}`);
      }

      const lineFile = screenshotFileForStyle(item, 'line') || screenshotFileForStyle(item, 'outline');
      const fillFile = screenshotFileForStyle(item, 'fill') || screenshotFileForStyle(item, 'solid');

      return {
        icon_id: item.icon_id,
        source_name: item.source_name,
        line_screenshot: lineFile ? path.join(screenshotRoot, lineFile).replaceAll(path.sep, '/') : null,
        fill_screenshot: fillFile ? path.join(screenshotRoot, fillFile).replaceAll(path.sep, '/') : null,
        screenshot_files: item.screenshot_files,
        current_live_record: toPublicRecord(live),
        agent_allowed_fields: ['depicts'],
        non_depicts_fields_must_match_live: true,
      };
    }),
  };
}

export function buildFinalRecordsFromDepictsOnly({ liveRecords, agentDepicts, expectedIconIds = null }) {
  const liveById = new Map(liveRecords.map((record) => [record.icon_id, record]));
  const expected = expectedIconIds ? new Set(expectedIconIds) : null;
  const seen = new Set();

  const records = agentDepicts.map((item) => {
    if (seen.has(item.icon_id)) {
      throw new Error(`Agent output contains duplicate icon: ${item.icon_id}`);
    }
    seen.add(item.icon_id);

    if (expected && !expected.has(item.icon_id)) {
      throw new Error(`Agent output references icon outside packet: ${item.icon_id}`);
    }

    const live = liveById.get(item.icon_id);
    if (!live) {
      throw new Error(`Agent output references unknown icon: ${item.icon_id}`);
    }
    if (!item.depicts || typeof item.depicts !== 'string') {
      throw new Error(`Agent output missing depicts for ${item.icon_id}`);
    }

    return {
      ...toPublicRecord(live),
      depicts: item.depicts.trim(),
    };
  });

  if (expected && records.length !== expected.size) {
    const missing = [...expected].filter((iconId) => !seen.has(iconId));
    throw new Error(`Agent output missing ${missing.length} icon(s): ${missing.join(', ')}`);
  }

  return records;
}
