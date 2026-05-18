import type {
  NormalizedTableGrid,
  NormalizedTableMergeSpec,
  TableGridCellRef,
  TableMergeSection,
} from './table-merge-model';
import { expandMergeCells } from './table-merge-model';

export interface TableRenderPlanCell {
  key: string;
  section: TableMergeSection;
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  isMergeAnchor: boolean;
  mergeId?: string;
  text?: string;
  value?: unknown;
  columnType?: string;
  leafColumnStart: number;
  leafColumnEnd: number;
  reachesLeaf: boolean;
}

export interface TableTopLevelGroupSegment {
  key: string;
  startCol: number;
  endCol: number;
  label: string;
  colspan: number;
  rowspan: number;
  isGrouped: boolean;
  mergeId?: string;
}

export interface TableRenderPlan {
  headerDepth: number;
  columnCount: number;
  hasMultiLevelHeader: boolean;
  coveredCellKeys: string[];
  anchorCellKeys: string[];
  headerCells: TableRenderPlanCell[];
  bodyCells: TableRenderPlanCell[];
  topLevelSegments: TableTopLevelGroupSegment[];
}

type MergeAnchorLookup = Map<string, NormalizedTableMergeSpec>;

const makeCellKey = (section: TableMergeSection, row: number, col: number) => `${section}:${row}:${col}`;

const buildMergeLookups = (merges: NormalizedTableMergeSpec[]) => {
  const anchorLookup: MergeAnchorLookup = new Map();
  const allCellToAnchorLookup: MergeAnchorLookup = new Map();
  const coveredKeys = new Set<string>();

  merges.forEach((merge) => {
    const anchorKey = makeCellKey(merge.section, merge.row, merge.col);
    anchorLookup.set(anchorKey, merge);
    expandMergeCells(merge).forEach((cell) => {
      const key = makeCellKey(cell.section, cell.row, cell.col);
      allCellToAnchorLookup.set(key, merge);
      if (cell.row !== merge.row || cell.col !== merge.col) {
        coveredKeys.add(key);
      }
    });
  });

  return {
    anchorLookup,
    allCellToAnchorLookup,
    coveredKeys,
  };
};

export const getHeaderDepth = (grid: NormalizedTableGrid): number => Math.max(1, grid.headerRowCount);

export const isCoveredCell = (
  section: TableMergeSection,
  row: number,
  col: number,
  coveredCellKeys: Set<string>
): boolean => coveredCellKeys.has(makeCellKey(section, row, col));

export const getMergeAnchor = (
  section: TableMergeSection,
  row: number,
  col: number,
  anchorLookup: MergeAnchorLookup
): NormalizedTableMergeSpec | null => anchorLookup.get(makeCellKey(section, row, col)) || null;

export const buildHeaderRenderPlan = (grid: NormalizedTableGrid): {
  cells: TableRenderPlanCell[];
  coveredCellKeys: Set<string>;
  anchorCellKeys: Set<string>;
  topLevelSegments: TableTopLevelGroupSegment[];
} => {
  const { anchorLookup, coveredKeys } = buildMergeLookups(grid.merges.filter((item) => item.section === 'header'));
  const cells: TableRenderPlanCell[] = [];
  const anchorCellKeys = new Set<string>();
  const headerDepth = getHeaderDepth(grid);

  for (let rowIndex = 0; rowIndex < grid.headerRowCount; rowIndex += 1) {
    for (let colIndex = 0; colIndex < grid.columnCount; colIndex += 1) {
      if (isCoveredCell('header', rowIndex, colIndex, coveredKeys)) continue;
      const mergeAnchor = getMergeAnchor('header', rowIndex, colIndex, anchorLookup);
      const rowspan = mergeAnchor?.rowspan ?? 1;
      const colspan = mergeAnchor?.colspan ?? 1;
      const key = makeCellKey('header', rowIndex, colIndex);
      if (mergeAnchor) anchorCellKeys.add(key);
      // 文案兜底：如果是横向合并 anchor 但起点格为空，扫描该 anchor 覆盖范围找第一个非空文案
      let anchorText = String(grid.headerRows[rowIndex]?.[colIndex] || '');
      if (colspan > 1 && anchorText.trim() === '') {
        for (let scanRow = rowIndex; scanRow < rowIndex + rowspan; scanRow += 1) {
          for (let scanCol = colIndex; scanCol < colIndex + colspan; scanCol += 1) {
            const candidate = String(grid.headerRows[scanRow]?.[scanCol] || '');
            if (candidate.trim() !== '') {
              anchorText = candidate;
              break;
            }
          }
          if (anchorText.trim() !== '') break;
        }
      }
      cells.push({
        key,
        section: 'header',
        row: rowIndex,
        col: colIndex,
        rowspan,
        colspan,
        isMergeAnchor: Boolean(mergeAnchor),
        ...(mergeAnchor?.id ? { mergeId: mergeAnchor.id } : {}),
        text: anchorText,
        leafColumnStart: colIndex,
        leafColumnEnd: colIndex + colspan - 1,
        reachesLeaf: rowIndex + rowspan >= headerDepth,
      });
    }
  }

  const topLevelSegments = cells
    .filter((cell) => cell.row === 0)
    .map((cell) => ({
      key: cell.key,
      startCol: cell.col,
      endCol: cell.col + cell.colspan - 1,
      label: String(cell.text || ''),
      colspan: cell.colspan,
      rowspan: cell.rowspan,
      isGrouped: cell.colspan > 1,
      ...(cell.mergeId ? { mergeId: cell.mergeId } : {}),
    }));

  return {
    cells,
    coveredCellKeys: coveredKeys,
    anchorCellKeys,
    topLevelSegments,
  };
};

export const buildBodyRenderPlan = (grid: NormalizedTableGrid): {
  cells: TableRenderPlanCell[];
  coveredCellKeys: Set<string>;
  anchorCellKeys: Set<string>;
} => {
  const explicitBodyMerges = grid.merges.filter((item) => item.section === 'body');
  const inferredBodyMerges = inferBodyRowspanMergesFromBlankRuns(grid, explicitBodyMerges);
  const { anchorLookup, coveredKeys } = buildMergeLookups([...explicitBodyMerges, ...inferredBodyMerges]);
  const cells: TableRenderPlanCell[] = [];
  const anchorCellKeys = new Set<string>();

  for (let rowIndex = 0; rowIndex < grid.bodyRowCount; rowIndex += 1) {
    for (let colIndex = 0; colIndex < grid.columnCount; colIndex += 1) {
      if (isCoveredCell('body', rowIndex, colIndex, coveredKeys)) continue;
      const mergeAnchor = getMergeAnchor('body', rowIndex, colIndex, anchorLookup);
      const rowspan = mergeAnchor?.rowspan ?? 1;
      const colspan = mergeAnchor?.colspan ?? 1;
      const key = makeCellKey('body', rowIndex, colIndex);
      if (mergeAnchor) anchorCellKeys.add(key);
      cells.push({
        key,
        section: 'body',
        row: rowIndex,
        col: colIndex,
        rowspan,
        colspan,
        isMergeAnchor: Boolean(mergeAnchor),
        ...(mergeAnchor?.id ? { mergeId: mergeAnchor.id } : {}),
        value: grid.bodyRows[rowIndex]?.[colIndex],
        columnType: grid.columnTypes[colIndex] || 'Text',
        leafColumnStart: colIndex,
        leafColumnEnd: colIndex + colspan - 1,
        reachesLeaf: true,
      });
    }
  }

  return {
    cells,
    coveredCellKeys: coveredKeys,
    anchorCellKeys,
  };
};

const isBlankBodyCell = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

const inferBodyRowspanMergesFromBlankRuns = (
  grid: NormalizedTableGrid,
  existingBodyMerges: Array<{ row: number; col: number; rowspan: number; colspan: number }>
) => {
  const hasHeaderMergeContext =
    grid.headerRowCount > 1 || grid.merges.some((item) => item.section === 'header');
  if (!hasHeaderMergeContext) return [];

  const inferred = [];
  for (let colIndex = 0; colIndex < grid.columnCount; colIndex += 1) {
    let rowIndex = 0;
    while (rowIndex < grid.bodyRowCount) {
      const current = grid.bodyRows[rowIndex]?.[colIndex];
      if (isBlankBodyCell(current)) {
        rowIndex += 1;
        continue;
      }

      let rowspan = 1;
      while (rowIndex + rowspan < grid.bodyRowCount) {
        const next = grid.bodyRows[rowIndex + rowspan]?.[colIndex];
        if (!isBlankBodyCell(next)) break;
        rowspan += 1;
      }

      if (rowspan > 1) {
        const isAlreadyCovered = existingBodyMerges.some((merge) => {
          const rowEnd = merge.row + merge.rowspan - 1;
          const colEnd = merge.col + merge.colspan - 1;
          return rowIndex >= merge.row && rowIndex <= rowEnd && colIndex >= merge.col && colIndex <= colEnd;
        });
        if (isAlreadyCovered) {
          rowIndex += rowspan;
          continue;
        }
        inferred.push({
          section: 'body' as const,
          row: rowIndex,
          col: colIndex,
          rowspan,
          colspan: 1,
          id: `inferred-body-${rowIndex}-${colIndex}`,
          source: 'render-plan-empty-run',
        });
      }
      rowIndex += rowspan;
    }
  }
  return inferred;
};

export const buildTableRenderPlan = (grid: NormalizedTableGrid): TableRenderPlan => {
  const header = buildHeaderRenderPlan(grid);
  const body = buildBodyRenderPlan(grid);
  return {
    headerDepth: getHeaderDepth(grid),
    columnCount: grid.columnCount,
    hasMultiLevelHeader: getHeaderDepth(grid) > 1,
    coveredCellKeys: Array.from(new Set([...header.coveredCellKeys, ...body.coveredCellKeys])),
    anchorCellKeys: Array.from(new Set([...header.anchorCellKeys, ...body.anchorCellKeys])),
    headerCells: header.cells,
    bodyCells: body.cells,
    topLevelSegments: header.topLevelSegments,
  };
};
