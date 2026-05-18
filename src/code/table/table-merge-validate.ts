import type {
  NormalizedTableGrid,
  NormalizedTableMergeSpec,
  TableGridCellRef,
} from './table-merge-model';
import { expandMergeCells } from './table-merge-model';

export interface TableMergeValidationError {
  code:
    | 'INVALID_SPAN'
    | 'OUT_OF_BOUNDS'
    | 'OVERLAP'
    | 'BODY_COLSPAN_UNSUPPORTED'
    | 'SPECIAL_CELL_HORIZONTAL_MERGE'
    | 'AUTO_RULE_INVALID_COLUMN';
  message: string;
  mergeId?: string;
  section?: 'header' | 'body';
  row?: number;
  col?: number;
}

const SPECIAL_VERTICAL_ONLY_TYPES = new Set([
  'input',
  'select',
  'actionicon',
  'actiontext',
  'avatar',
]);

const toComparableColumnIndex = (column: number | string | undefined, leafHeaders: string[]): number | null => {
  if (typeof column === 'number' && Number.isInteger(column) && column >= 0) return column;
  if (typeof column === 'string') {
    const normalized = column.trim();
    if (!normalized) return null;
    const direct = leafHeaders.findIndex((item) => item === normalized);
    if (direct >= 0) return direct;
    const insensitive = leafHeaders.findIndex((item) => item.trim().toLowerCase() === normalized.toLowerCase());
    if (insensitive >= 0) return insensitive;
  }
  return null;
};

const makeError = (
  error: Omit<TableMergeValidationError, 'message'> & { message: string }
): TableMergeValidationError => error;

const getSectionRowCount = (grid: NormalizedTableGrid, merge: NormalizedTableMergeSpec): number =>
  merge.section === 'header' ? grid.headerRowCount : grid.bodyRowCount;

const isWithinBounds = (grid: NormalizedTableGrid, merge: NormalizedTableMergeSpec): boolean => {
  const rowCount = getSectionRowCount(grid, merge);
  if (merge.row < 0 || merge.col < 0) return false;
  if (merge.rowspan <= 0 || merge.colspan <= 0) return false;
  if (merge.row + merge.rowspan > rowCount) return false;
  if (merge.col + merge.colspan > grid.columnCount) return false;
  return true;
};

export const validateMergeBounds = (grid: NormalizedTableGrid): TableMergeValidationError[] => {
  return grid.merges.flatMap((merge) => {
    if (merge.rowspan <= 0 || merge.colspan <= 0) {
      return [
        makeError({
          code: 'INVALID_SPAN',
          message: `Merge '${merge.id || ''}' has invalid span.`,
          mergeId: merge.id,
          section: merge.section,
          row: merge.row,
          col: merge.col,
        })
      ];
    }
    if (!isWithinBounds(grid, merge)) {
      return [
        makeError({
          code: 'OUT_OF_BOUNDS',
          message: `Merge '${merge.id || ''}' is out of ${merge.section} bounds.`,
          mergeId: merge.id,
          section: merge.section,
          row: merge.row,
          col: merge.col,
        })
      ];
    }
    return [];
  });
};

export const validateMergeOverlap = (grid: NormalizedTableGrid): TableMergeValidationError[] => {
  const seen = new Map<string, TableGridCellRef & { mergeId?: string }>();
  const errors: TableMergeValidationError[] = [];
  grid.merges.forEach((merge) => {
    expandMergeCells(merge).forEach((cell) => {
      const key = `${cell.section}:${cell.row}:${cell.col}`;
      const existing = seen.get(key);
      if (existing) {
        errors.push(makeError({
          code: 'OVERLAP',
          message: `Merge '${merge.id || ''}' overlaps with merge '${existing.mergeId || ''}'.`,
          mergeId: merge.id,
          section: cell.section,
          row: cell.row,
          col: cell.col,
        }));
        return;
      }
      seen.set(key, { ...cell, mergeId: merge.id });
    });
  });
  return errors;
};

export const validateSpecialCellMergeRules = (grid: NormalizedTableGrid): TableMergeValidationError[] => {
  return grid.merges.flatMap((merge) => {
    if (merge.section !== 'body') {
      return [];
    }
    const columnType = String(grid.columnTypes[merge.col] || 'Text').trim().toLowerCase().replace(/[\s_()-]+/g, '');
    if (SPECIAL_VERTICAL_ONLY_TYPES.has(columnType) && merge.colspan > 1) {
      return [
        makeError({
          code: 'SPECIAL_CELL_HORIZONTAL_MERGE',
          message: `Column type '${grid.columnTypes[merge.col]}' only supports vertical merge.`,
          mergeId: merge.id,
          section: merge.section,
          row: merge.row,
          col: merge.col,
        })
      ];
    }
    return [];
  });
};

export const validateAutoMergeRules = (grid: NormalizedTableGrid): TableMergeValidationError[] => {
  return grid.autoMergeRules.flatMap((rule) => {
    if (rule.column === undefined) return [];
    const columnIndex = toComparableColumnIndex(rule.column, grid.leafHeaders);
    if (columnIndex === null || columnIndex >= grid.columnCount) {
      return [
        makeError({
          code: 'AUTO_RULE_INVALID_COLUMN',
          message: `Auto merge rule column '${String(rule.column)}' is invalid.`,
          section: rule.section,
        })
      ];
    }
    return [];
  });
};

export const validateNormalizedTableGrid = (grid: NormalizedTableGrid): TableMergeValidationError[] => {
  return [
    ...validateMergeBounds(grid),
    ...validateMergeOverlap(grid),
    ...validateSpecialCellMergeRules(grid),
    ...validateAutoMergeRules(grid),
  ];
};
