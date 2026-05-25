/**
 * Table layout / mutation helpers (Category B).
 * These functions modify Figma node properties but do NOT call renderComponent.
 * Extracted from code.ts.
 */

import {
  readNodeParams,
  writeNodeParams,
  mergeNodeParams,
  collectTextNodes,
} from '../utils/nodeSnapshot';
import {
  clearNodeStrokes,
  findInstanceComponentPropertyName,
  trySetIconVariant,
} from '../utils/figmaNodeUtils';
import {
  getTableColumns,
  getTableHeaderOffset,
  findPaginationRow,
  findTableFrameFromNode,
  resolveTableHeaderHeight,
  resolveTableBodyHeight,
  getTableHeaderIconTypeCandidates,
  isMultiElementCell,
} from './table-queries';
export type { TableHeaderElementType } from './table-queries';
export { isMultiElementCell } from './table-queries';

import type { TableHeaderElementType } from './table-queries';

const TABLE_HEADER_ICON_STATE_CANDIDATES = ['Default 默认', 'Default', '默认'];

// ---------------------------------------------------------------------------
// Global state for row-height sync
// ---------------------------------------------------------------------------

export let tableRowSyncInProgress = false;

export function setTableRowSyncInProgress(value: boolean) {
  tableRowSyncInProgress = value;
}

// ---------------------------------------------------------------------------
// Exported layout / mutation functions
// ---------------------------------------------------------------------------

export function tryApplyTableHeaderIconVariant(instance: InstanceNode, type: TableHeaderElementType): void {
    const candidates = getTableHeaderIconTypeCandidates(type);
    if (candidates.length === 0) return;

    const typeProperty =
        findInstanceComponentPropertyName(instance, 'Type 类型') ||
        findInstanceComponentPropertyName(instance, 'Type') ||
        findInstanceComponentPropertyName(instance, '类型');
    const stateProperty =
        findInstanceComponentPropertyName(instance, 'State 状态') ||
        findInstanceComponentPropertyName(instance, 'State') ||
        findInstanceComponentPropertyName(instance, '状态') ||
        findInstanceComponentPropertyName(instance, 'Status 状态') ||
        findInstanceComponentPropertyName(instance, 'Status');

    const trySetProps = (props: Record<string, string>) => {
        try {
            instance.setProperties(props);
            return true;
        } catch {
            return false;
        }
    };

    if (typeProperty) {
        for (const candidate of candidates) {
            if (stateProperty) {
                for (const stateCandidate of TABLE_HEADER_ICON_STATE_CANDIDATES) {
                    if (trySetProps({ [typeProperty]: candidate, [stateProperty]: stateCandidate })) {
                        return;
                    }
                }
            }
            if (trySetProps({ [typeProperty]: candidate })) return;
        }
    }

    // Fallback: some icons expose "Icon" property instead of "Type".
    for (const candidate of candidates) {
        if (trySetIconVariant(instance, candidate)) return;
    }
}

export function ensureTableContentStack(tableRoot: FrameNode, tableContent: FrameNode): FrameNode {
    clearNodeStrokes(tableRoot);
    if (tableContent !== tableRoot) {
        clearNodeStrokes(tableContent);
    }
    tableRoot.layoutMode = 'VERTICAL';
    tableRoot.primaryAxisSizingMode = 'AUTO';
    tableRoot.counterAxisSizingMode = 'FIXED';
    tableRoot.itemSpacing = 0;
    tableRoot.layoutAlign = 'STRETCH';
    tableRoot.fills = [];
    tableRoot.clipsContent = false;
    if ('layoutSizingHorizontal' in tableRoot) {
        try {
            (tableRoot as any).layoutSizingHorizontal = 'FILL';
        } catch {
        }
    }
    if ('layoutSizingVertical' in tableRoot) {
        try {
            (tableRoot as any).layoutSizingVertical = 'HUG';
        } catch {
        }
    }

    if (tableContent.parent !== tableRoot) {
        const paginationRow = findPaginationRow(tableRoot);
        const insertionIndex = paginationRow ? tableRoot.children.indexOf(paginationRow) : tableRoot.children.length;
        tableRoot.insertChild(insertionIndex >= 0 ? insertionIndex : tableRoot.children.length, tableContent);
    }

    if (tableContent !== tableRoot) {
        tableRoot.name = 'Table';
        tableContent.name = 'Table Content';
        tableContent.setPluginData('table-role', 'table-content');
    }

    // Ensure the inner table expands horizontally inside the root.
    try {
        tableContent.layoutAlign = 'STRETCH';
    } catch {
        // ignore
    }
    if ('layoutSizingHorizontal' in tableContent) {
        try {
            (tableContent as any).layoutSizingHorizontal = 'FILL';
        } catch {
            // ignore
        }
    }
    if ('layoutSizingVertical' in tableContent) {
        try {
            (tableContent as any).layoutSizingVertical = 'HUG';
        } catch {
            // ignore
        }
    }

    return tableRoot;
}

export function removePaginationRow(tableRoot: FrameNode) {
    const existing = findPaginationRow(tableRoot);
    if (!existing) return;
    try {
        existing.remove();
    } catch {
        // ignore
    }
}

export function removeTableToolbar(contentStack: FrameNode) {
    const nodes = contentStack.children.filter(
        (child) => child.type === 'FRAME' && ((child as FrameNode).getPluginData('table-role') === 'filter-group' || (child as FrameNode).getPluginData('table-role') === 'toolbar')
    ) as FrameNode[];
    for (const node of nodes) {
        try {
            node.remove();
        } catch {
        }
    }
}

export function removeTableToolbarFromParent(parent: FrameNode) {
    const nodes = parent.children.filter(
        (child) => child.type === 'FRAME' && ((child as FrameNode).getPluginData('table-role') === 'filter-group' || (child as FrameNode).getPluginData('table-role') === 'toolbar')
    ) as FrameNode[];
    for (const node of nodes) {
        try {
            node.remove();
        } catch {
            // ignore
        }
    }
}

export function createTableWrapperFromTableFrame(
    tableFrame: FrameNode,
    params: Record<string, any>,
    lockNode?: (node: BaseNode, componentId?: string) => void,
): FrameNode | null {
    // Prevent re-wrapping if the frame is already a wrapper (has managed children)
    if (tableFrame.children.some((child) => 
        child.type === 'FRAME' && 
        ['filter-group', 'toolbar', 'pagination-row', 'table-content'].includes(child.getPluginData('table-role'))
    )) {
        return tableFrame;
    }

    const parent = tableFrame.parent;
    if (!parent || !('insertChild' in parent) || !('children' in parent)) return null;

    const wrapper = figma.createFrame();
    wrapper.name = 'Table';
    wrapper.layoutMode = 'VERTICAL';
    wrapper.primaryAxisSizingMode = 'AUTO';
    wrapper.counterAxisSizingMode = 'FIXED';
    wrapper.itemSpacing = 0;
    wrapper.fills = [];
    clearNodeStrokes(wrapper);
    wrapper.clipsContent = false;
    wrapper.layoutAlign = tableFrame.layoutAlign;
    wrapper.resize(tableFrame.width, 1);
    wrapper.cornerRadius = params.cornerRadius || 0;
    // Some Figma versions reset sizing modes when resize() is called.
    wrapper.primaryAxisSizingMode = 'AUTO';
    wrapper.counterAxisSizingMode = 'FIXED';
    if ('layoutSizingHorizontal' in wrapper) {
        try {
            (wrapper as any).layoutSizingHorizontal = 'FILL';
        } catch {
            // ignore
        }
    }
    if ('layoutSizingVertical' in wrapper) {
        try {
            (wrapper as any).layoutSizingVertical = 'HUG';
        } catch {
            // ignore
        }
    }

    try {
        wrapper.x = tableFrame.x;
        wrapper.y = tableFrame.y;
    } catch {
        // ignore (e.g. autolayout parent)
    }

    const index = (parent as any).children.indexOf(tableFrame);
    (parent as any).insertChild(index >= 0 ? index : (parent as any).children.length, wrapper);

    // Move existing table frame into the wrapper.
    wrapper.appendChild(tableFrame);
    // Ensure the inner table expands horizontally and does not collapse its height.
    tableFrame.layoutAlign = 'STRETCH';
    if (tableFrame.layoutMode !== 'NONE') {
        tableFrame.counterAxisSizingMode = 'AUTO';
    }
    if ('layoutSizingHorizontal' in tableFrame) {
        try {
            (tableFrame as any).layoutSizingHorizontal = 'FILL';
        } catch {
            // ignore
        }
    }
    if ('layoutSizingVertical' in tableFrame) {
        try {
            (tableFrame as any).layoutSizingVertical = 'HUG';
        } catch {
            // ignore
        }
    }
    // Re-assert wrapper hug height after child insertion.
    wrapper.primaryAxisSizingMode = 'AUTO';
    if ('layoutSizingVertical' in wrapper) {
        try {
            (wrapper as any).layoutSizingVertical = 'HUG';
        } catch {
            // ignore
        }
    }

    // Keep the inner table addressable as a "table" for helpers, but avoid double "AI component" roots.
    try {
        tableFrame.setPluginData('is-ai-component', '');
    } catch {}

    // Wrapper becomes the new AI component root.
    try {
        wrapper.setPluginData('is-ai-component', 'true');
        wrapper.setPluginData('component-id', 'table');
        wrapper.setPluginData('params', JSON.stringify(params));
    } catch {}

    // Keep inner params in sync for table helpers.
    writeNodeParams(tableFrame, params);

    if (lockNode) {
        lockNode(wrapper, 'table');
    }

    return wrapper;
}

export function alignTableRowHeights(table: FrameNode, rowIndex: number, sourceNodes: SceneNode[] = []) {
    const columns = getTableColumns(table);
    if (columns.length === 0) return;

    const tableParams = readNodeParams(table);
    const isHeaderRow = rowIndex === 0 && columns.some(c => {
        const first = c.children[0];
        return first && first.getPluginData('component-id') === 'table-header-cell';
    });
    const defaultRowHeight = isHeaderRow
        ? resolveTableHeaderHeight(tableParams)
        : resolveTableBodyHeight(tableParams);

    let maxHeight = defaultRowHeight > 0 ? defaultRowHeight : 0;

    const isLineBreakCell = (cell: SceneNode): boolean => {
        if (!cell || cell.removed) return false;
        const params = readNodeParams(cell);
        return params.textDisplay === 'lineBreak';
    };
    const ensureLineBreakMeasure = (cell: SceneNode) => {
        if (!isLineBreakCell(cell)) return;
        if ('counterAxisSizingMode' in cell) {
            try {
                (cell as any).counterAxisSizingMode = 'AUTO';
            } catch {}
        }
        if ('layoutSizingVertical' in cell) {
            try {
                (cell as any).layoutSizingVertical = 'HUG';
            } catch {}
        }
    };

    const sourceNodeSet = new Set(sourceNodes);

    // 手动合并产生的 anchor / hidden cell 不参与同行高度联动：
    //   - merge-anchor：高度等于 N 行总高，吸纳了 hidden cell 的空间，不能拿来做"该行高度"基准
    //   - merge-hidden：visible=false，仅作为占位，高度是合并前的原始 height，不应被改写
    const isMergeNeutralCell = (cell: SceneNode): boolean => {
        if (!cell || cell.removed) return false;
        const role = cell.getPluginData('merge-role');
        return role === 'merge-anchor' || role === 'merge-hidden';
    };

    for (const column of columns) {
        if (rowIndex >= column.children.length) continue;
        const cell = column.children[rowIndex];
        if (!cell || cell.removed) continue;
        if (cell.type !== 'FRAME' && cell.type !== 'INSTANCE') continue;
        if (isMergeNeutralCell(cell)) continue;

        if (isLineBreakCell(cell)) {
            ensureLineBreakMeasure(cell);
            if (cell.height > maxHeight) maxHeight = cell.height;
        } else if (sourceNodes.length === 0 || sourceNodeSet.has(cell)) {
            if (cell.height > maxHeight) maxHeight = cell.height;
        }
    }

    if (!Number.isFinite(maxHeight) || maxHeight <= 0) {
        maxHeight = defaultRowHeight > 0 ? defaultRowHeight : 40;
    }

    for (const column of columns) {
        if (rowIndex >= column.children.length) continue;
        const cell = column.children[rowIndex];
        if (cell.removed) continue;
        if (isMergeNeutralCell(cell)) continue;
        if (cell.type === 'FRAME' || cell.type === 'INSTANCE') {
            const lineBreak = isLineBreakCell(cell);
            if (lineBreak) {
                if (Math.abs(cell.height - maxHeight) <= 0.1) {
                    if ('layoutSizingVertical' in cell) {
                        try { (cell as any).layoutSizingVertical = 'HUG'; } catch {}
                    }
                    if ('counterAxisSizingMode' in cell) {
                        try { (cell as any).counterAxisSizingMode = 'AUTO'; } catch {}
                    }
                } else {
                    if ('layoutSizingVertical' in cell) {
                        try { (cell as any).layoutSizingVertical = 'FIXED'; } catch {}
                    }
                    if ('counterAxisSizingMode' in cell) {
                        try { (cell as any).counterAxisSizingMode = 'FIXED'; } catch {}
                    }
                    try { cell.resize(cell.width, maxHeight); } catch {}
                }
            } else {
                if ('layoutSizingVertical' in cell) {
                    try { (cell as any).layoutSizingVertical = 'FIXED'; } catch {}
                }
                if (Math.abs(cell.height - maxHeight) > 0.1) {
                    try { cell.resize(cell.width, maxHeight); } catch {}
                }
            }
        }
    }
}

export function alignAllTableRows(table: FrameNode) {
    const wasSyncing = tableRowSyncInProgress;
    tableRowSyncInProgress = true;
    try {
    const columns = getTableColumns(table);
    if (columns.length === 0) return;

    let rowCount = 0;
    for (const column of columns) {
        if (column.children.length > rowCount) rowCount = column.children.length;
    }

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        alignTableRowHeights(table, rowIndex);
    }
    } finally {
        tableRowSyncInProgress = wasSyncing;
    }
}

export function restoreMergedAnchorCellHeight(cell: SceneNode): boolean {
    if (!cell || cell.removed || cell.getPluginData('merge-role') !== 'merge-anchor') return false;
    if (!('resize' in cell)) return false;
    const column = cell.parent;
    if (!column || column.type !== 'FRAME') return false;

    const rowSpan = Math.max(1, Math.floor(Number(cell.getPluginData('merge-row-span') || '1') || 1));
    if (rowSpan <= 1) return false;

    const originalHeight = Math.max(
        1,
        Math.round(Number(cell.getPluginData('merge-original-height') || '0') || (cell as any).height || 1)
    );
    const hiddenCells = (column as FrameNode).children.filter((child) => {
        return (
            child.getPluginData('merge-role') === 'merge-hidden' &&
            child.getPluginData('merge-anchor-id') === cell.id
        );
    });
    const hiddenCount = Math.max(rowSpan - 1, hiddenCells.length);
    let hiddenHeightSum = 0;
    for (let i = 0; i < hiddenCount; i += 1) {
        const hidden = hiddenCells[i];
        const h = hidden && 'height' in hidden ? Math.round((hidden as any).height || 0) : 0;
        hiddenHeightSum += h > 0 ? h : originalHeight;
    }
    const itemSpacing = Math.max(
        0,
        Math.round((column as FrameNode).layoutMode === 'VERTICAL' ? Number((column as FrameNode).itemSpacing || 0) : 0)
    );
    const targetHeight = Math.max(1, originalHeight + hiddenHeightSum + itemSpacing * (rowSpan - 1));

    try { (cell as any).layoutPositioning = 'AUTO'; } catch {}
    try {
        if ('layoutSizingVertical' in cell) (cell as any).layoutSizingVertical = 'FIXED';
    } catch {}
    try {
        if ('counterAxisSizingMode' in cell) (cell as any).counterAxisSizingMode = 'FIXED';
    } catch {}
    try {
        const w = Math.max(1, Math.round((cell as any).width || 1));
        (cell as any).resize(w, targetHeight);
        return true;
    } catch {
        return false;
    }
}

export function applyTableSizeToCells(table: FrameNode, headerHeight: number, bodyHeight: number) {
    const columns = getTableColumns(table);
    // Ensure the table can grow/shrink when row heights change.
    if (table.layoutMode !== 'NONE') {
        table.counterAxisSizingMode = 'AUTO';
    }
    if ('layoutSizingVertical' in table) {
        try {
            (table as any).layoutSizingVertical = 'HUG';
        } catch (e) {
            // ignore
        }
    }
    for (const column of columns) {
        const offset = getTableHeaderOffset(column);
        if (column.layoutMode !== 'NONE') {
            column.primaryAxisSizingMode = 'AUTO';
        }
        if ('layoutSizingVertical' in column) {
            try {
                (column as any).layoutSizingVertical = 'HUG';
            } catch (e) {
                // ignore
            }
        }
        mergeNodeParams(column, { headerHeight, bodyHeight });
        column.children.forEach((child, index) => {
            if (!('resize' in child)) return;
            const mergeRole = child.getPluginData('merge-role');
            if (mergeRole === 'merge-anchor') {
                restoreMergedAnchorCellHeight(child as SceneNode);
                return;
            }
            if (mergeRole === 'merge-hidden') return;
            const isHeader = offset > 0 && index === 0 && child.getPluginData('component-id') === 'table-header-cell';
            const nextHeight = isHeader ? headerHeight : bodyHeight;
            const childParams = readNodeParams(child);
            const isLineBreak = String(childParams.textDisplay || '').trim().toLowerCase() === 'linebreak';
            if (isLineBreak) {
                if (child.type === 'FRAME') {
                    child.counterAxisSizingMode = 'AUTO';
                }
                if ('layoutSizingVertical' in child) {
                    try {
                        (child as any).layoutSizingVertical = 'HUG';
                    } catch (e) {
                        // ignore
                    }
                }
                mergeNodeParams(child, { height: nextHeight });
                return;
            }
            if (child.type === 'FRAME') {
                child.counterAxisSizingMode = 'FIXED';
            }
            if ('layoutSizingVertical' in child) {
                try {
                    (child as any).layoutSizingVertical = 'FIXED';
                } catch (e) {
                    // ignore
                }
            }
            try {
                child.resize(child.width, nextHeight);
            } catch (e) {
                // Ignore resize failures for non-resizable nodes.
            }
            mergeNodeParams(child, { height: nextHeight });
        });
    }
    alignAllTableRows(table);
}

export function applyCellAutoWidth(cell: SceneNode) {
  const textNodes = collectTextNodes(cell);
  for (const textNode of textNodes) {
    try {
      textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
      if ('layoutGrow' in textNode) {
        try {
          (textNode as any).layoutGrow = 0;
        } catch {}
      }
      if ('layoutSizingHorizontal' in textNode) {
        try {
          (textNode as any).layoutSizingHorizontal = 'HUG';
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to apply auto width', e);
    }
  }
}

export function applyCellAutoWidthIfMultiElement(cell: SceneNode) {
  // Select 单元格的布局是 text(FILL) + icon(固定右侧)，不应改为 HUG
  const componentId = 'getPluginData' in cell ? cell.getPluginData('component-id') : '';
  if (componentId === 'table-cell-select') return;
  const textNodes = collectTextNodes(cell);
  if (!isMultiElementCell(cell, textNodes.length)) return;
  applyCellAutoWidth(cell);
}

export async function applyCellAlignment(cell: SceneNode, align: 'left' | 'right' | 'center') {
  if ((cell.type === 'FRAME' || cell.type === 'INSTANCE') && 'primaryAxisAlignItems' in cell) {
    if (align === 'right') {
      cell.primaryAxisAlignItems = 'MAX';
    } else if (align === 'center') {
      cell.primaryAxisAlignItems = 'CENTER';
    } else {
      cell.primaryAxisAlignItems = 'MIN';
    }
  }
  const textNodes = collectTextNodes(cell, { skipInstances: true });
  for (const textNode of textNodes) {
    try {
      if (textNode.getPluginData('avatar-initial') === 'true') {
        continue;
      }
      await figma.loadFontAsync(textNode.fontName as FontName);
      if (align === 'right') {
        textNode.textAlignHorizontal = 'RIGHT';
      } else if (align === 'center') {
        textNode.textAlignHorizontal = 'CENTER';
      } else {
        textNode.textAlignHorizontal = 'LEFT';
      }
    } catch (e) {
      console.warn('Failed to apply text alignment', e);
    }
  }
  mergeNodeParams(cell, { textAlign: align });
}

export function applyCellTextDisplay(cell: SceneNode, mode: 'ellipsis' | 'lineBreak') {
  const componentId = 'getPluginData' in cell ? cell.getPluginData('component-id') : '';
  // 合并 anchor cell：快照高度，函数末尾强制还原，确保任何内部子节点 sizing 调整都不会改变合并高度
  const isMergeAnchorCell = 'getPluginData' in cell && cell.getPluginData('merge-role') === 'merge-anchor';
  const anchorSnapshot = isMergeAnchorCell
    ? {
        width: Math.max(1, Math.round((cell as any).width || 1)),
        height: Math.max(1, Math.round((cell as any).height || 1))
      }
    : null;
  const isMixedContentCell =
    componentId === 'table-cell-tag' ||
    componentId === 'table-cell-avatar' ||
    componentId === 'table-cell-input' ||
    componentId === 'table-cell-select' ||
    componentId === 'table-cell-number-unit' ||
    componentId === 'table-cell-action-text' ||
    componentId === 'table-cell-action-icon';
  const useAutoWidth = componentId === 'table-cell' || componentId === 'table-header-cell' || isMixedContentCell;
  const isTagCell = componentId === 'table-cell-tag';
  const cellParams = 'getPluginData' in cell ? readNodeParams(cell) : {};
  const table = findTableFrameFromNode(cell);
  const tableParams = table ? readNodeParams(table) : {};
  const sizingParams = { ...tableParams, ...cellParams };
  const isHeader = componentId === 'table-header-cell';
  const layoutMode = isHeader ? 'ellipsis' : mode;
  const targetHeight = isHeader
    ? resolveTableHeaderHeight(sizingParams)
    : resolveTableBodyHeight(sizingParams);
  const paddingTop =
    typeof sizingParams.paddingTop === 'number' ? sizingParams.paddingTop : undefined;
  const paddingBottom =
    typeof sizingParams.paddingBottom === 'number' ? sizingParams.paddingBottom : undefined;
  const resolvedPaddingTop =
    paddingTop !== undefined
      ? paddingTop
      : 'paddingTop' in cell
        ? Number((cell as any).paddingTop || 0)
        : 0;
  const resolvedPaddingBottom =
    paddingBottom !== undefined
      ? paddingBottom
      : 'paddingBottom' in cell
        ? Number((cell as any).paddingBottom || 0)
        : 0;
  const textNodes = collectTextNodes(cell, { skipInstances: true });
  const multiElementCell = isMultiElementCell(cell, textNodes.length);
  for (const textNode of textNodes) {
    try {
      if (isTagCell) {
        textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        textNode.textTruncation = 'DISABLED';
      } else if (isMixedContentCell || multiElementCell) {
        textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        textNode.textTruncation = 'DISABLED';
        if ('layoutGrow' in textNode) {
          try {
            (textNode as any).layoutGrow = 0;
          } catch {}
        }
        if ('layoutSizingHorizontal' in textNode) {
          try {
            (textNode as any).layoutSizingHorizontal = 'HUG';
          } catch {}
        }
        if ('layoutSizingVertical' in textNode) {
          try {
            (textNode as any).layoutSizingVertical = 'HUG';
          } catch {}
        }
      } else if (layoutMode === 'lineBreak') {
        textNode.textAutoResize = useAutoWidth ? 'WIDTH_AND_HEIGHT' : 'HEIGHT';
        textNode.textTruncation = 'DISABLED';
        if ('layoutSizingHorizontal' in textNode) {
          try {
            (textNode as any).layoutSizingHorizontal = 'FILL';
          } catch {}
        }
        if ('layoutSizingVertical' in textNode) {
          try {
            (textNode as any).layoutSizingVertical = 'HUG';
          } catch {}
        }
      } else {
        if (isHeader) {
          textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
          textNode.textTruncation = 'DISABLED';
          if ('layoutSizingHorizontal' in textNode) {
            try {
              (textNode as any).layoutSizingHorizontal = 'HUG';
            } catch {}
          }
        } else {
          textNode.textAutoResize = 'HEIGHT';
          textNode.textTruncation = 'ENDING';
          if ('layoutSizingHorizontal' in textNode) {
            try {
              (textNode as any).layoutSizingHorizontal = 'FILL';
            } catch {}
          }
        }
        if ('layoutSizingVertical' in textNode) {
          try {
            (textNode as any).layoutSizingVertical = 'HUG';
          } catch {}
        }
      }
    } catch (e) {
      console.warn('Failed to apply text display mode', e);
    }
  }
  if (!multiElementCell && 'counterAxisSizingMode' in cell) {
    // 合并 anchor 已用 FIXED + 显式高度（如 80）保持合并状态；
    // 切换 ellipsis/lineBreak 时不能改它的垂直 sizing 和高度，否则会回到标准 body 高
    const mergeRole = 'getPluginData' in cell ? cell.getPluginData('merge-role') : '';
    const isMergeAnchor = mergeRole === 'merge-anchor';
    if (isMergeAnchor) {
      // 仅根据需要更新 padding，保持高度与 FIXED 不变
      if (layoutMode === 'lineBreak') {
        if ('paddingTop' in cell) {
          try { (cell as any).paddingTop = 8; } catch {}
        }
        if ('paddingBottom' in cell) {
          try { (cell as any).paddingBottom = 8; } catch {}
        }
      } else {
        if (paddingTop !== undefined && 'paddingTop' in cell) {
          try { (cell as any).paddingTop = paddingTop; } catch {}
        }
        if (paddingBottom !== undefined && 'paddingBottom' in cell) {
          try { (cell as any).paddingBottom = paddingBottom; } catch {}
        }
      }
    } else if (layoutMode === 'lineBreak') {
      try {
        (cell as any).counterAxisSizingMode = 'AUTO';
      } catch {}
      if ('layoutSizingVertical' in cell) {
        try {
          (cell as any).layoutSizingVertical = 'HUG';
        } catch {}
      }
      if ('paddingTop' in cell) {
        try {
          (cell as any).paddingTop = 8;
        } catch {}
      }
      if ('paddingBottom' in cell) {
        try {
          (cell as any).paddingBottom = 8;
        } catch {}
      }
    } else {
      try {
        (cell as any).counterAxisSizingMode = 'FIXED';
      } catch {}
      if (Number.isFinite(targetHeight) && targetHeight > 0 && 'resize' in cell) {
        try {
          (cell as any).resize((cell as any).width, targetHeight);
        } catch {}
      }
      if ('layoutSizingVertical' in cell) {
        try {
          (cell as any).layoutSizingVertical = 'FIXED';
        } catch {}
      }
      if (paddingTop !== undefined && 'paddingTop' in cell) {
        try {
          (cell as any).paddingTop = paddingTop;
        } catch {}
      }
      if (paddingBottom !== undefined && 'paddingBottom' in cell) {
        try {
          (cell as any).paddingBottom = paddingBottom;
        } catch {}
      }
    }
  }
  mergeNodeParams(cell, { textDisplay: mode });

  // 合并 anchor cell：函数末尾强制还原 FIXED + 原始合并高度，覆盖前面任何隐式高度变化
  if (isMergeAnchorCell && anchorSnapshot) {
    try { (cell as any).layoutPositioning = 'AUTO'; } catch {}
    try {
      if ('layoutSizingVertical' in cell) (cell as any).layoutSizingVertical = 'FIXED';
    } catch {}
    try {
      if ('counterAxisSizingMode' in cell) (cell as any).counterAxisSizingMode = 'FIXED';
    } catch {}
    if ('resize' in cell) {
      try {
        const w = Math.max(1, Math.round((cell as any).width || anchorSnapshot.width));
        (cell as any).resize(w, anchorSnapshot.height);
      } catch {}
    }
  }
  restoreMergedAnchorCellHeight(cell);
}

export function applyColumnWidthMode(column: FrameNode, mode: 'FIXED' | 'HUG' | 'FILL', width?: number) {
  const normalized = String(mode || 'FIXED').toUpperCase() as 'FIXED' | 'HUG' | 'FILL';
  const isAutoLayoutContainer = (node: BaseNode | null): boolean => {
    if (!node) return false;
    return 'layoutMode' in node && (node as any).layoutMode !== 'NONE';
  };
  const canSetFillSizing = (node: BaseNode): boolean => {
    return isAutoLayoutContainer((node as any).parent as BaseNode | null);
  };
  const applyChildrenFill = () => {
    for (const child of column.children) {
      if ('layoutSizingHorizontal' in child) {
        if (canSetFillSizing(child as any)) {
          try {
            (child as any).layoutSizingHorizontal = 'FILL';
          } catch (e) {
            // ignore
          }
        }
        if ('layoutAlign' in child) {
          (child as any).layoutAlign = 'STRETCH';
        }
        if (child.type === 'FRAME') {
          child.primaryAxisSizingMode = 'FIXED';
        }
      }
    }
  };
  if (normalized === 'FILL') {
    column.layoutGrow = 1;
    column.counterAxisSizingMode = 'FIXED';
    if (canSetFillSizing(column)) {
      try {
        (column as any).layoutSizingHorizontal = 'FILL';
      } catch (e) {
        // ignore
      }
    }
    applyChildrenFill();
  } else if (normalized === 'HUG') {
    column.layoutGrow = 0;
    column.counterAxisSizingMode = 'AUTO';
    try {
      (column as any).layoutSizingHorizontal = 'HUG';
    } catch (e) {
      // ignore
    }
    for (const child of column.children) {
      if ('layoutSizingHorizontal' in child) {
        try {
          (child as any).layoutSizingHorizontal = 'HUG';
        } catch (e) {
          // ignore
        }
        if (child.type === 'FRAME') {
          child.primaryAxisSizingMode = 'AUTO';
        }
      }
    }
    const naturalWidth = column.width;
    column.layoutGrow = 0;
    column.counterAxisSizingMode = 'FIXED';
    try {
      (column as any).layoutSizingHorizontal = 'FIXED';
    } catch (e) {
      // ignore
    }
    column.resize(naturalWidth, column.height);
    applyChildrenFill();
  } else {
    column.layoutGrow = 0;
    column.counterAxisSizingMode = 'FIXED';
    try {
      (column as any).layoutSizingHorizontal = 'FIXED';
    } catch (e) {
      // ignore
    }
    if (typeof width === 'number' && width > 0) {
      column.resize(width, column.height);
    }
    applyChildrenFill();
  }
  mergeNodeParams(column, { columnWidthMode: normalized });
}
