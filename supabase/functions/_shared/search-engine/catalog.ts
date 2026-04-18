import { indexRowsByIconId } from '../../../../lib/hosted-search-core.js';

import type { PrivateFeatureRow, PrivateManifestRow } from './types.ts';

export function buildPrivateRowMaps(
  manifests: PrivateManifestRow[] = [],
  features: PrivateFeatureRow[] = [],
) {
  return {
    manifestsById: indexRowsByIconId(manifests),
    featuresById: indexRowsByIconId(features),
  };
}
