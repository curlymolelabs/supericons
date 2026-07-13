import type { CandidateRow } from './types.ts';

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
