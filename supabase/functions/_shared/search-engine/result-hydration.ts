import type { CandidateRow } from './types.ts';
import { SearchEngineHttpError } from './rate-limit.ts';
import type { MaterialAssetRow, MaterialVariant } from './material-serving.ts';

export interface FinalSvgRow {
  icon_id: string;
  svg: string | null;
}

export function hydrateFinalSvgRows(
  rankedRows: CandidateRow[],
  svgRows: FinalSvgRow[],
): CandidateRow[] {
  const svgById = new Map(svgRows.map((row) => [row.icon_id, row.svg]));

  return rankedRows.map((row) => {
    if (!svgById.has(row.icon_id)) {
      throw new Error(`Final SVG row is missing for ${row.icon_id}.`);
    }
    return {
      ...row,
      svg: svgById.get(row.icon_id) ?? null,
    };
  });
}

export function hydrateServingSvgRows(
  rankedRows: CandidateRow[],
  {
    catalogSvgRows = null,
    materialSvgRows = [],
    materialVariant,
  }: {
    catalogSvgRows?: FinalSvgRow[] | null;
    materialSvgRows?: MaterialAssetRow[];
    materialVariant: MaterialVariant;
  },
): CandidateRow[] {
  const catalogSvgById = catalogSvgRows === null
    ? null
    : new Map(catalogSvgRows.map((row) => [row.icon_id, row.svg]));
  const materialSvgById = new Map(
    materialSvgRows
      .filter((row) => row.variant === materialVariant)
      .map((row) => [row.icon_id, row.svg]),
  );

  return rankedRows.map((row) => {
    if (row.source_library === 'material') {
      const svg = materialSvgById.get(row.icon_id);
      if (typeof svg !== 'string' || svg.trim().length === 0) {
        throw new SearchEngineHttpError(`Material SVG is unavailable for ${row.icon_id}.`, {
          status: 503,
          code: 'material_asset_unavailable',
          hint: 'Retry after the Material asset store is restored.',
          retryable: true,
          details: { icon_id: row.icon_id, variant: materialVariant },
        });
      }
      return {
        ...row,
        icon_type: 'svg',
        style: materialVariant,
        svg,
      };
    }

    if (catalogSvgById === null) return row;
    if (!catalogSvgById.has(row.icon_id)) {
      throw new Error(`Final SVG row is missing for ${row.icon_id}.`);
    }
    return {
      ...row,
      svg: catalogSvgById.get(row.icon_id) ?? null,
    };
  });
}
