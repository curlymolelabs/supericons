import { createHash } from 'node:crypto';

import { resolveHostedSearchRegistryIconId } from './hosted-search-core.js';

const DOCUMENT_TYPE_ORDER = [
  'identity',
  'meaning',
  'visual',
  'domain',
  'negative',
];

const FIELD_LABELS = {
  identity: 'Identity',
  meaning: 'Meaning',
  visual: 'Visual',
  domain: 'Domain',
  negative: 'Avoid',
};

const PUBLIC_UNSAFE_FIELD_PATTERNS = [
  /svg/i,
  /reviewer/i,
  /reasoning/i,
  /internal/i,
  /workflow_trace/i,
  /prompt_notes/i,
  /private_confidence/i,
];

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[_:]+/g, ' ')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanValues(values = []) {
  const seen = new Set();
  const output = [];

  for (const value of values.flat(Infinity)) {
    if (value === null || value === undefined) continue;
    const text = normalizeText(value);
    if (!text) continue;
    if (/^<svg[\s>]/i.test(text) || /<\/svg>/i.test(text)) continue;

    const key = normalizeKey(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(text);
  }

  return output;
}

function firstText(...values) {
  return cleanValues(values)[0] || '';
}

function hashContent(value) {
  return createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function normalizeRecordArray(rawRegistry) {
  if (Array.isArray(rawRegistry)) return rawRegistry;
  if (Array.isArray(rawRegistry?.records)) return rawRegistry.records;
  if (Array.isArray(rawRegistry?.icons)) return rawRegistry.icons;
  return [];
}

function normalizeIconArray(rawIconIndex) {
  if (Array.isArray(rawIconIndex)) return rawIconIndex;
  if (Array.isArray(rawIconIndex?.icons)) return rawIconIndex.icons;
  return [];
}

function indexIconsByIconId(icons = []) {
  const map = new Map();
  for (const icon of icons) {
    const lib = normalizeText(icon?.lib);
    const id = normalizeText(icon?.id);
    if (!lib || !id) continue;
    map.set(`${lib}:${id}`, icon);
  }
  return map;
}

function getRecordPayload(record = {}) {
  return record.record && typeof record.record === 'object' && !Array.isArray(record.record)
    ? record.record
    : {};
}

function getField(record = {}, icon = {}, fieldName, iconFieldName = fieldName) {
  const payload = getRecordPayload(record);
  return record[fieldName] ?? payload[fieldName] ?? icon[iconFieldName];
}

function getArrayField(record = {}, icon = {}, fieldName, iconFieldName = fieldName) {
  const value = getField(record, icon, fieldName, iconFieldName);
  return Array.isArray(value) ? value : value ? [value] : [];
}

function getIconId(record = {}, icon = {}) {
  return firstText(
    record.icon_id,
    getRecordPayload(record).icon_id,
    icon.lib && icon.id ? `${icon.lib}:${icon.id}` : '',
  );
}

function getSourceLibrary(record = {}, icon = {}) {
  return firstText(
    record.source_library,
    getRecordPayload(record).source_library,
    icon.lib,
    getIconId(record, icon).split(':')[0],
  );
}

function getSourceName(record = {}, icon = {}) {
  return firstText(
    record.source_name,
    getRecordPayload(record).source_name,
    icon.id,
    getIconId(record, icon).split(':')[1],
  );
}

function getLabel(record = {}, icon = {}) {
  return firstText(
    getField(record, icon, 'label'),
    getField(record, icon, 'name'),
    icon.name,
    getSourceName(record, icon),
  );
}

function buildContent(label, values = []) {
  const clean = cleanValues(values);
  if (clean.length === 0) return '';
  return `${label}: ${clean.join('; ')}`;
}

function buildDocumentContent(type, record, icon) {
  const label = getLabel(record, icon);
  const sourceName = getSourceName(record, icon);
  const iconId = getIconId(record, icon);

  if (type === 'identity') {
    return buildContent(FIELD_LABELS[type], [
      label,
      getField(record, icon, 'name'),
      sourceName,
      icon?.name,
      icon?.id,
      iconId,
      ...getArrayField(record, icon, 'aliases'),
      ...getArrayField(record, icon, 'synonyms'),
      ...getArrayField(icon, icon, 'aliases'),
      ...getArrayField(icon, icon, 'synonyms'),
      ...getArrayField(icon, icon, 'searchTerms'),
    ]);
  }

  if (type === 'meaning') {
    return buildContent(FIELD_LABELS[type], [
      label,
      getField(record, icon, 'meaning'),
      icon?.meaning,
      getField(record, icon, 'purpose'),
      getField(record, icon, 'use_when'),
    ]);
  }

  if (type === 'visual') {
    return buildContent(FIELD_LABELS[type], [
      label,
      getField(record, icon, 'depicts'),
      getField(record, icon, 'asset_type', 'assetType'),
      icon?.style,
      icon?.type,
      ...getArrayField(record, icon, 'semantic_tags', 'semanticTags'),
      ...getArrayField(icon, icon, 'semanticTags'),
    ]);
  }

  if (type === 'domain') {
    return buildContent(FIELD_LABELS[type], [
      label,
      getField(record, icon, 'category'),
      getField(record, icon, 'job_category', 'jobCategory'),
      getField(record, icon, 'ai_category', 'aiCategory'),
      getField(record, icon, 'ai_category_label', 'aiCategoryLabel'),
      getField(record, icon, 'pack'),
      ...getArrayField(record, icon, 'secondary_categories', 'secondaryCategories'),
      ...getArrayField(record, icon, 'filter_tags', 'filterTags'),
      ...getArrayField(record, icon, 'ai_filter_tags', 'aiFilterTags'),
      ...getArrayField(record, icon, 'search_terms', 'searchTerms'),
      ...getArrayField(icon, icon, 'filterTags'),
      ...getArrayField(icon, icon, 'aiFilterTags'),
      ...getArrayField(icon, icon, 'secondaryCategories'),
    ]);
  }

  if (type === 'negative') {
    return buildContent(FIELD_LABELS[type], [
      label,
      getField(record, icon, 'avoid_when'),
      ...getArrayField(record, icon, 'contraindications'),
    ]);
  }

  return '';
}

function assertPublicSafeRecord(record = {}) {
  for (const key of Object.keys(record)) {
    if (PUBLIC_UNSAFE_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      throw new Error(`Unsafe semantic document field: ${key}`);
    }
  }
}

export function buildSemanticSearchDocuments(rawIconIndex, rawRegistry, options = {}) {
  const locale = normalizeText(options.locale || 'en') || 'en';
  const icons = normalizeIconArray(rawIconIndex);
  const records = normalizeRecordArray(rawRegistry);
  const iconsById = indexIconsByIconId(icons);
  const catalogIconIds = new Set(iconsById.keys());
  const documents = [];
  const skipped = [];
  const seenResolvedIconIds = new Set();

  for (const record of records) {
    const originalIconId = getIconId(record);
    if (!originalIconId) {
      skipped.push({ reason: 'missing_icon_id', icon_id: null });
      continue;
    }

    const resolvedIconId = resolveHostedSearchRegistryIconId(record, catalogIconIds);
    if (!resolvedIconId) {
      skipped.push({ reason: 'unresolved_catalog_icon_id', icon_id: originalIconId });
      continue;
    }
    if (seenResolvedIconIds.has(resolvedIconId)) {
      skipped.push({
        reason: 'duplicate_resolved_catalog_icon_id',
        icon_id: originalIconId,
        resolved_icon_id: resolvedIconId,
      });
      continue;
    }
    seenResolvedIconIds.add(resolvedIconId);

    const resolvedRecord = {
      ...record,
      icon_id: resolvedIconId,
    };
    const icon = iconsById.get(resolvedIconId) || {};
    const sourceLibrary = getSourceLibrary(resolvedRecord, icon);
    const sourceName = getSourceName(resolvedRecord, icon);
    const label = getLabel(resolvedRecord, icon);

    for (const documentType of DOCUMENT_TYPE_ORDER) {
      const content = buildDocumentContent(documentType, resolvedRecord, icon);
      if (!content) continue;

      const contentHash = hashContent([
        resolvedIconId,
        documentType,
        locale,
        content,
      ].join('\n'));

      const document = {
        document_id: `${resolvedIconId}#${documentType}#${locale}`,
        icon_id: resolvedIconId,
        source_library: sourceLibrary,
        source_name: sourceName,
        label,
        document_type: documentType,
        locale,
        content,
        content_hash: contentHash,
      };

      assertPublicSafeRecord(document);
      documents.push(document);
    }
  }

  documents.sort((left, right) =>
    left.icon_id.localeCompare(right.icon_id)
    || DOCUMENT_TYPE_ORDER.indexOf(left.document_type) - DOCUMENT_TYPE_ORDER.indexOf(right.document_type)
    || left.locale.localeCompare(right.locale)
  );

  return {
    schema_version: 'semantic-search-documents-1',
    source: {
      icon_count: icons.length,
      registry_record_count: records.length,
      locale,
    },
    documents,
    skipped,
  };
}

export function summarizeSemanticSearchDocuments(payload = {}) {
  const documents = Array.isArray(payload.documents) ? payload.documents : [];
  const byType = Object.fromEntries(DOCUMENT_TYPE_ORDER.map((type) => [type, 0]));
  const byLibrary = {};

  for (const document of documents) {
    byType[document.document_type] = (byType[document.document_type] || 0) + 1;
    byLibrary[document.source_library] = (byLibrary[document.source_library] || 0) + 1;
  }

  return {
    document_count: documents.length,
    by_type: byType,
    by_library: byLibrary,
    skipped_count: Array.isArray(payload.skipped) ? payload.skipped.length : 0,
  };
}

export { DOCUMENT_TYPE_ORDER };
