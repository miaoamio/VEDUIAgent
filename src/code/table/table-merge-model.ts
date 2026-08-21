type UnknownRecord = Record<string, unknown>;

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export type TableMergeSection = 'header' | 'body';
export type BodyMergeInferenceMode = 'off' | 'auto' | 'on';

export interface NormalizedTableMergeSpec {
  section: TableMergeSection;
  row: number;
  col: number;
  rowspan: number;
  colspan: number;
  id?: string;
  source?: string;
  locked?: boolean;
  groupBoundary?: boolean;
}

export interface NormalizedAutoMergeRule {
  section: TableMergeSection;
  column?: number | string;
  mode: string;
}

export interface TableGridCellRef {
  section: TableMergeSection;
  row: number;
  col: number;
}

export interface NormalizedTableGrid {
  headerRows: string[][];
  bodyRows: unknown[][];
  leafHeaders: string[];
  columnCount: number;
  headerRowCount: number;
  bodyRowCount: number;
  columnTypes: string[];
  columnWidths: number[];
  rowAction?: string;
  bodyMergeInference?: BodyMergeInferenceMode;
  merges: NormalizedTableMergeSpec[];
  autoMergeRules: NormalizedAutoMergeRule[];
}

const toNonNegativeInteger = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

const toPositiveInteger = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const normalizeHeaderRowsInput = (source: any, fallbackHeaders: string[] = []): string[][] => {
  const rawHeaderRows = Array.isArray(source?.headerRows) ? source.headerRows : null;
  if (rawHeaderRows && rawHeaderRows.length > 0) {
    const normalized = rawHeaderRows
      .filter((row: unknown) => Array.isArray(row))
      .map((row: any[]) => row.map((cell) => (cell === undefined || cell === null ? '' : String(cell))));
    if (normalized.length > 0) return normalized;
  }
  if (fallbackHeaders.length > 0) {
    return [fallbackHeaders.map((header, index) => String(header || `列${index + 1}`))];
  }
  return [];
};

export const inferLeafHeadersFromHeaderRows = (headerRows: string[][]): string[] => {
  const colCount = headerRows.reduce((max, row) => Math.max(max, row.length), 0);
  if (colCount === 0) return [];
  return Array.from({ length: colCount }).map((_, colIndex) => {
    for (let rowIndex = headerRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
      const text = String(headerRows[rowIndex]?.[colIndex] || '').trim();
      if (text) return text;
    }
    return `列${colIndex + 1}`;
  });
};

export const normalizeMergesInput = (source: any): NormalizedTableMergeSpec[] => {
  if (!Array.isArray(source?.merges)) return [];
  return source.merges
    .filter((item: unknown) => isObject(item))
    .map((item: any, index: number) => {
      // 保留所有 merge 项（即使 row/col 非法），让 validateMergeBounds 在验证阶段统一报告 OUT_OF_BOUNDS。
      // 非法的 row/col 用 -1 兜底，触发 validateMergeBounds 内部 `merge.row < 0 || merge.col < 0` 的越界判定。
      const row = toNonNegativeInteger(item.row) ?? -1;
      const col = toNonNegativeInteger(item.col) ?? -1;
      const rowspan = toPositiveInteger(item.rowspan) ?? 1;
      const colspan = toPositiveInteger(item.colspan) ?? 1;
      const rawSection = String(item.section || '').trim().toLowerCase();
      const section: TableMergeSection = rawSection === 'header' ? 'header' : 'body';
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `merge-${section}-${index + 1}`;
      const sourceValue = typeof item.source === 'string' && item.source.trim() ? item.source.trim() : undefined;
      return {
        section,
        row,
        col,
        rowspan,
        colspan,
        id,
        ...(sourceValue ? { source: sourceValue } : {}),
        ...(item.locked === true ? { locked: true } : {}),
        ...(item.groupBoundary === true ? { groupBoundary: true } : {})
      };
    }) as NormalizedTableMergeSpec[];
};

export const normalizeAutoMergeRulesInput = (source: any): NormalizedAutoMergeRule[] => {
  if (!Array.isArray(source?.autoMergeRules)) return [];
  return source.autoMergeRules
    .filter((item: unknown) => isObject(item))
    .map((item: any) => {
      const rawSection = String(item.section || '').trim().toLowerCase();
      const section: TableMergeSection = rawSection === 'header' ? 'header' : 'body';
      const mode = typeof item.mode === 'string' && item.mode.trim() ? item.mode.trim() : 'same-value';
      const column =
        typeof item.column === 'number' || typeof item.column === 'string'
          ? item.column
          : typeof item.columnKey === 'string' && item.columnKey.trim()
            ? item.columnKey.trim()
            : undefined;
      return {
        section,
        mode,
        ...(column !== undefined ? { column } : {})
      };
    });
};

const isImplicitMergeBlank = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

const findTopHeaderCoveringMerge = (
  headerMerges: NormalizedTableMergeSpec[],
  colIndex: number
): NormalizedTableMergeSpec | null =>
  headerMerges.find((merge: NormalizedTableMergeSpec) => {
    if (merge.section !== 'header' || merge.row !== 0) return false;
    return colIndex >= merge.col && colIndex < merge.col + merge.colspan;
  }) || null;

const isLeafOnlyTopHeaderColumn = (headerRows: string[][], colIndex: number): boolean => {
  const topText = String(headerRows[0]?.[colIndex] || '').trim();
  if (!topText) return false;
  for (let rowIndex = 1; rowIndex < headerRows.length; rowIndex += 1) {
    if (String(headerRows[rowIndex]?.[colIndex] || '').trim()) return false;
  }
  return true;
};

const isEligibleImplicitMergeColumn = (
  headerRows: string[][],
  headerMerges: NormalizedTableMergeSpec[],
  colIndex: number
): boolean => {
  if (headerRows.length <= 1) return true;
  const coveringMerge = findTopHeaderCoveringMerge(headerMerges, colIndex);
  if (coveringMerge) {
    return coveringMerge.col === colIndex && coveringMerge.colspan === 1 && coveringMerge.rowspan >= headerRows.length;
  }
  return isLeafOnlyTopHeaderColumn(headerRows, colIndex);
};

export const inferImplicitBodyMerges = (input: {
  headerRows: string[][];
  rows: unknown[][];
  merges?: NormalizedTableMergeSpec[];
}): NormalizedTableMergeSpec[] => {
  const explicitMerges = Array.isArray(input.merges) ? input.merges : [];
  const explicitBodyMerges = explicitMerges.filter((item: NormalizedTableMergeSpec) => item.section === 'body');
  if (explicitBodyMerges.length > 0) return [];

  const hasMergeContext =
    (Array.isArray(input.headerRows) && input.headerRows.length > 1) ||
    explicitMerges.some((item: NormalizedTableMergeSpec) => item.section === 'header');
  if (!hasMergeContext) return [];

  const rows = Array.isArray(input.rows) ? input.rows : [];
  const headerMerges = explicitMerges.filter((item) => item.section === 'header');
  const columnCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
  const inferred: NormalizedTableMergeSpec[] = [];

  for (let colIndex = 0; colIndex < columnCount; colIndex += 1) {
    if (!isEligibleImplicitMergeColumn(input.headerRows, headerMerges, colIndex)) continue;
    let rowIndex = 0;
    while (rowIndex < rows.length) {
      const current = Array.isArray(rows[rowIndex]) ? rows[rowIndex][colIndex] : undefined;
      if (isImplicitMergeBlank(current)) {
        rowIndex += 1;
        continue;
      }

      let runLength = 1;
      while (rowIndex + runLength < rows.length) {
        const next = Array.isArray(rows[rowIndex + runLength]) ? rows[rowIndex + runLength][colIndex] : undefined;
        if (!isImplicitMergeBlank(next)) break;
        runLength += 1;
      }

      if (runLength > 1) {
        inferred.push({
          section: 'body',
          row: rowIndex,
          col: colIndex,
          rowspan: runLength,
          colspan: 1,
          id: `implicit-body-${rowIndex}-${colIndex}`,
          source: 'implicit-empty-run',
        });
      }

      rowIndex += runLength;
    }
  }

  return inferred;
};

const normalizeGridRows = <T>(rows: T[][], columnCount: number, fillValue: T): T[][] => {
  if (columnCount <= 0) return rows.map((row) => [...row]);
  return rows.map((row) => {
    const normalized = Array.isArray(row) ? [...row] : [];
    while (normalized.length < columnCount) normalized.push(fillValue);
    return normalized.slice(0, columnCount);
  });
};

const normalizeColumnTypes = (columnTypes: string[], columnCount: number): string[] => {
  const normalized = Array.isArray(columnTypes) ? columnTypes.map((item) => String(item || 'Text')) : [];
  while (normalized.length < columnCount) normalized.push('Text');
  return normalized.slice(0, columnCount);
};

const normalizeColumnWidths = (columnWidths: number[], columnCount: number): number[] => {
  const normalized = Array.isArray(columnWidths)
    ? columnWidths.map((item) => {
        const n = Number(item);
        return Number.isFinite(n) ? n : 0;
      })
    : [];
  while (normalized.length < columnCount) normalized.push(0);
  return normalized.slice(0, columnCount);
};

export const expandMergeCells = (merge: NormalizedTableMergeSpec): TableGridCellRef[] => {
  const refs: TableGridCellRef[] = [];
  for (let rowOffset = 0; rowOffset < merge.rowspan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < merge.colspan; colOffset += 1) {
      refs.push({
        section: merge.section,
        row: merge.row + rowOffset,
        col: merge.col + colOffset
      });
    }
  }
  return refs;
};

export const buildNormalizedTableGrid = (input: {
  headerRows: string[][];
  rows: unknown[][];
  columnTypes?: string[];
  columnWidths?: number[];
  rowAction?: string;
  bodyMergeInference?: BodyMergeInferenceMode;
  merges?: NormalizedTableMergeSpec[];
  autoMergeRules?: NormalizedAutoMergeRule[];
}): NormalizedTableGrid => {
  const rawHeaderRows = Array.isArray(input.headerRows) ? input.headerRows : [];
  const rawBodyRows = Array.isArray(input.rows) ? input.rows : [];
  const leafHeaders = inferLeafHeadersFromHeaderRows(rawHeaderRows);
  const columnCount = Math.max(
    leafHeaders.length,
    rawHeaderRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0),
    rawBodyRows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0)
  );

  const headerRows = normalizeGridRows(
    rawHeaderRows.length > 0 ? rawHeaderRows.map((row) => row.map((cell) => String(cell || ''))) : [leafHeaders],
    columnCount,
    ''
  );
  const bodyRows = normalizeGridRows(
    rawBodyRows.map((row) => (Array.isArray(row) ? [...row] : [])),
    columnCount,
    ''
  );
  const normalizedMerges: NormalizedTableMergeSpec[] = Array.isArray(input.merges)
    ? input.merges.map((item) => ({ ...item }))
    : [];

  if (input.bodyMergeInference === 'auto') {
    for (const merge of normalizedMerges) {
      if (merge.section !== 'body') continue;
      const rowspan = toPositiveInteger(merge.rowspan) ?? 1;
      const colspan = toPositiveInteger(merge.colspan) ?? 1;
      for (let r = merge.row; r < merge.row + rowspan; r += 1) {
        for (let c = merge.col; c < merge.col + colspan; c += 1) {
          if (r === merge.row && c === merge.col) continue;
          if (r >= 0 && r < bodyRows.length && c >= 0 && c < columnCount) {
            bodyRows[r][c] = '';
          }
        }
      }
    }
  }

  const normalizedLeafHeaders =
    leafHeaders.length === columnCount
      ? leafHeaders
      : inferLeafHeadersFromHeaderRows(headerRows);

  return {
    headerRows,
    bodyRows,
    leafHeaders: normalizedLeafHeaders,
    columnCount,
    headerRowCount: headerRows.length,
    bodyRowCount: bodyRows.length,
    columnTypes: normalizeColumnTypes(input.columnTypes || [], columnCount),
    columnWidths: normalizeColumnWidths(input.columnWidths || [], columnCount),
    ...(input.rowAction ? { rowAction: input.rowAction } : {}),
    ...(input.bodyMergeInference ? { bodyMergeInference: input.bodyMergeInference } : {}),
    merges: normalizedMerges,
    autoMergeRules: Array.isArray(input.autoMergeRules) ? input.autoMergeRules.map((item) => ({ ...item })) : []
  };
};
