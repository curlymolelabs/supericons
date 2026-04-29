export const VARIANT_STYLES = Object.freeze({
  ANY: 'any',
  OUTLINE: 'outline',
  SOLID: 'solid',
});

const DEFAULT_STRATEGY = Object.freeze({
  kind: 'none',
  supportsSolid: false,
});

const VARIANT_STRATEGIES = Object.freeze({
  material: Object.freeze({
    kind: 'material-fill-axis',
    supportsSolid: true,
  }),
  tabler: Object.freeze({
    kind: 'same-id-style-pair',
    supportsSolid: true,
    assetSeparator: 'hyphen',
  }),
  phosphor: Object.freeze({
    kind: 'fill-suffix-pair',
    supportsSolid: true,
    solidSuffix: '-fill',
    assetSeparator: 'hyphen',
  }),
  heroicons: Object.freeze({
    kind: 'same-id-style-pair',
    supportsSolid: true,
    assetSeparator: 'hyphen',
  }),
  bootstrap: Object.freeze({
    kind: 'fill-suffix-pair',
    supportsSolid: true,
    solidSuffix: '-fill',
    assetSeparator: 'hyphen',
  }),
  ionicons: Object.freeze({
    kind: 'outline-suffix-pair',
    supportsSolid: true,
    outlineSuffix: '-outline',
    assetSeparator: 'hyphen',
  }),
  iconoir: Object.freeze({
    kind: 'same-id-style-pair',
    supportsSolid: true,
    assetSeparator: 'hyphen',
  }),
  mingcute: Object.freeze({
    kind: 'line-fill-suffix-pair',
    supportsSolid: true,
    outlineSuffix: '_line',
    solidSuffix: '_fill',
  }),
});

export const MCP_VARIANT_CAPABLE_LIBRARIES = Object.freeze(
  Object.fromEntries(
    Object.entries(VARIANT_STRATEGIES)
      .filter(([, strategy]) => strategy.supportsSolid)
      .map(([library, strategy]) => [library, strategy])
  )
);

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}

export function normalizeRequestedStyle(style) {
  const normalized = String(style || VARIANT_STYLES.ANY).trim().toLowerCase();
  if (normalized === VARIANT_STYLES.OUTLINE || normalized === VARIANT_STYLES.SOLID) {
    return normalized;
  }
  return VARIANT_STYLES.ANY;
}

export function getVariantStrategyForLibrary(library) {
  return VARIANT_STRATEGIES[library] || DEFAULT_STRATEGY;
}

export function librarySupportsSolid(library) {
  return Boolean(getVariantStrategyForLibrary(library).supportsSolid);
}

export function getVariantConceptId(library, id) {
  const normalizedId = String(id || '').trim();
  const strategy = getVariantStrategyForLibrary(library);

  if (!normalizedId) return normalizedId;

  if (strategy.kind === 'fill-suffix-pair') {
    return normalizedId.replace(new RegExp(`${strategy.solidSuffix}$`, 'i'), '');
  }

  if (strategy.kind === 'outline-suffix-pair') {
    return normalizedId.replace(new RegExp(`${strategy.outlineSuffix}$`, 'i'), '');
  }

  if (strategy.kind === 'line-fill-suffix-pair') {
    return normalizedId
      .replace(new RegExp(`${strategy.outlineSuffix}$`, 'i'), '')
      .replace(new RegExp(`${strategy.solidSuffix}$`, 'i'), '');
  }

  return normalizedId;
}

export function buildVariantLookupCandidates({ library, id, style = VARIANT_STYLES.ANY }) {
  const normalizedStyle = normalizeRequestedStyle(style);
  const rawId = String(id || '').trim();
  const strategy = getVariantStrategyForLibrary(library);
  const normalizedId = strategy.assetSeparator === 'hyphen' ? rawId.replace(/_/g, '-') : rawId;

  if (!normalizedId) return [];

  const candidates = [normalizedId];

  if (strategy.kind === 'fill-suffix-pair') {
    const baseId = getVariantConceptId(library, normalizedId);
    const solidId = `${baseId}${strategy.solidSuffix}`;

    if (normalizedStyle === VARIANT_STYLES.OUTLINE) {
      candidates.push(baseId);
    } else if (normalizedStyle === VARIANT_STYLES.SOLID) {
      candidates.push(solidId);
    } else if (!normalizedId.endsWith(strategy.solidSuffix)) {
      candidates.push(solidId);
    } else {
      candidates.push(baseId);
    }
  }

  if (strategy.kind === 'outline-suffix-pair') {
    const baseId = getVariantConceptId(library, normalizedId);
    const outlineId = `${baseId}${strategy.outlineSuffix}`;

    if (normalizedStyle === VARIANT_STYLES.OUTLINE) {
      candidates.push(outlineId);
    } else if (normalizedStyle === VARIANT_STYLES.SOLID) {
      candidates.push(baseId);
    } else if (!normalizedId.endsWith(strategy.outlineSuffix)) {
      candidates.push(outlineId);
    } else {
      candidates.push(baseId);
    }
  }

  if (strategy.kind === 'line-fill-suffix-pair') {
    const baseId = getVariantConceptId(library, normalizedId);
    const outlineId = `${baseId}${strategy.outlineSuffix}`;
    const solidId = `${baseId}${strategy.solidSuffix}`;

    if (normalizedStyle === VARIANT_STYLES.OUTLINE) {
      candidates.push(outlineId);
    } else if (normalizedStyle === VARIANT_STYLES.SOLID) {
      candidates.push(solidId);
    } else if (normalizedId.endsWith(strategy.outlineSuffix)) {
      candidates.push(solidId);
    } else if (normalizedId.endsWith(strategy.solidSuffix)) {
      candidates.push(outlineId);
    } else {
      candidates.push(outlineId, solidId);
    }
  }

  return dedupe(candidates);
}

export function getBaseSemanticIdsForVariant({ library, id }) {
  const normalizedId = String(id || '').trim();
  const conceptId = getVariantConceptId(library, normalizedId);
  const strategy = getVariantStrategyForLibrary(library);
  const normalizedIdUnderscore = normalizedId.replace(/-/g, '_');
  const conceptIdUnderscore = conceptId.replace(/-/g, '_');

  const ids = [`${library}:${normalizedId}`];

  if (conceptId && conceptId !== normalizedId) {
    ids.push(`${library}:${conceptId}`);
  }

  if (normalizedIdUnderscore && normalizedIdUnderscore !== normalizedId) {
    ids.push(`${library}:${normalizedIdUnderscore}`);
  }

  if (conceptIdUnderscore && conceptIdUnderscore !== conceptId) {
    ids.push(`${library}:${conceptIdUnderscore}`);
  }

  if (strategy.kind === 'outline-suffix-pair' && conceptId) {
    ids.push(`${library}:${conceptId}${strategy.outlineSuffix}`);
    ids.push(`${library}:${conceptIdUnderscore}${strategy.outlineSuffix.replace(/-/g, '_')}`);
  }

  return dedupe(ids);
}

export function iconMatchesRequestedStyle(icon, requestedStyle) {
  const normalizedStyle = normalizeRequestedStyle(requestedStyle);
  if (normalizedStyle === VARIANT_STYLES.ANY) return true;

  if (icon?.lib === 'material') {
    return true;
  }

  return icon?.style === normalizedStyle;
}

export function getConceptKeyForIcon(icon) {
  if (!icon) return null;
  const library = icon.lib || icon.library;
  const id = icon.id || icon.source_name;
  if (!library || !id) return null;
  return `${library}:${getVariantConceptId(library, id)}`;
}

export function compareVariantPreference(left, right, requestedStyle = VARIANT_STYLES.ANY) {
  const style = normalizeRequestedStyle(requestedStyle);

  if (style === VARIANT_STYLES.OUTLINE) {
    const leftScore = left?.style === VARIANT_STYLES.OUTLINE || left?.lib === 'material' ? 1 : 0;
    const rightScore = right?.style === VARIANT_STYLES.OUTLINE || right?.lib === 'material' ? 1 : 0;
    return rightScore - leftScore;
  }

  if (style === VARIANT_STYLES.SOLID) {
    const leftScore = left?.style === VARIANT_STYLES.SOLID || left?.lib === 'material' ? 1 : 0;
    const rightScore = right?.style === VARIANT_STYLES.SOLID || right?.lib === 'material' ? 1 : 0;
    return rightScore - leftScore;
  }

  const leftScore = left?.style === VARIANT_STYLES.OUTLINE || left?.lib === 'material' ? 1 : 0;
  const rightScore = right?.style === VARIANT_STYLES.OUTLINE || right?.lib === 'material' ? 1 : 0;
  return rightScore - leftScore;
}
