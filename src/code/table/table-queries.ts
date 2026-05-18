import { getDefaultParams, getRegistrySizeMetrics } from '../../registry.helpers';
import { readNodeParams } from '../utils/nodeSnapshot';

// ── local helpers (duplicated to avoid circular deps with code.ts) ──

function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

// ── constants & types ───────────────────────────────────────────────

const TABLE_DEFAULT_PARAMS = getDefaultParams('table');

export const TABLE_CELL_COMPONENT_PREFIX = 'table-cell';

export type TableHeaderElementType = 'none' | 'filter' | 'sort' | 'search' | 'info';

export const TABLE_HEADER_ICON_PLUGIN_KEY = 'table-header-icon-type';

// ── pure query / detection functions ────────────────────────────────

export function resolveTableSizeHeight(params: Record<string, any>): number | null {
    const metrics = getRegistrySizeMetrics('table', params.size);
    const height = metrics?.height;
    return typeof height === 'number' ? height : null;
}

export function resolveTableHeaderHeight(params: Record<string, any>): number {
    const explicitHeaderHeight = toPositiveNumber(params.headerHeight);
    if (explicitHeaderHeight) return explicitHeaderHeight;
    const explicitHeight = toPositiveNumber(params.height);
    if (explicitHeight) return explicitHeight;
    const bodyHeight =
        resolveTableSizeHeight(params)
        ?? explicitHeight
        ?? toPositiveNumber(getRegistrySizeMetrics('table', params.size)?.height);
    if (bodyHeight) {
        return bodyHeight <= 32 ? 32 : 40;
    }
    return toPositiveNumber(TABLE_DEFAULT_PARAMS.headerHeight) ?? 0;
}

export function resolveTableBodyHeight(params: Record<string, any>): number {
    const explicitHeight = toPositiveNumber(params.height);
    if (explicitHeight) return explicitHeight;
    return toPositiveNumber(params.bodyHeight)
        ?? toPositiveNumber(params.rowHeight)
        ?? resolveTableSizeHeight(params)
        ?? toPositiveNumber(getRegistrySizeMetrics('table', params.size)?.height)
        ?? toPositiveNumber(TABLE_DEFAULT_PARAMS.bodyHeight)
        ?? 0;
}

export function getTableHeaderDepthFromParams(params: Record<string, any>): number {
    const planDepth = Number((params as any)?.tableRenderPlan?.headerDepth);
    if (Number.isInteger(planDepth) && planDepth > 0) return planDepth;
    if (Array.isArray((params as any)?.headerRows) && (params as any).headerRows.length > 0) {
        return (params as any).headerRows.length;
    }
    return 1;
}

export function hasMultiLevelTableHeaderParams(params: Record<string, any>): boolean {
    return getTableHeaderDepthFromParams(params) > 1;
}

export function normalizeTableHeaderElementType(value: unknown): TableHeaderElementType {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw || raw === 'none') return 'none';
    if (raw === 'filter') return 'filter';
    if (raw === 'sort') return 'sort';
    if (raw === 'search') return 'search';
    if (raw === 'info') return 'info';
    return 'none';
}

export function getTableHeaderIconTypeCandidates(type: TableHeaderElementType): string[] {
    if (type === 'filter') return ['Filter 筛选', 'Filter', '筛选'];
    if (type === 'sort') return ['Sort 排序', 'Sort', '排序', 'S\bort 排序'];
    if (type === 'search') return ['Search 搜索', 'Search', 'search', 'search 搜索', '搜索'];
    if (type === 'info') return ['info-circle 提示', 'Info', 'Info 提示', '提示', 'info'];
    return [];
}

export function findTableHeaderIconInstance(headerCell: FrameNode): InstanceNode | null {
    const icon = headerCell.children.find(
        (child) => child.type === 'INSTANCE' && child.getPluginData(TABLE_HEADER_ICON_PLUGIN_KEY)
    );
    return icon && icon.type === 'INSTANCE' ? (icon as InstanceNode) : null;
}

export function isTableCellComponentId(componentId?: string | null): boolean {
    if (!componentId) return false;
    return componentId === 'table-header-cell' || componentId.startsWith(TABLE_CELL_COMPONENT_PREFIX);
}

export function isTableTextContext(node: BaseNode | null | undefined): boolean {
    let current = node;
    while (current && current.type !== 'PAGE') {
        if ('getPluginData' in current) {
            const componentId = current.getPluginData('component-id');
            if (isTableCellComponentId(componentId)) return true;
        }
        current = current.parent;
    }
    return false;
}

export function isTableColumnNode(node: BaseNode | null | undefined): node is FrameNode {
    return !!node && node.type === 'FRAME' && node.getPluginData('component-id') === 'table-column';
}

export function isTableNode(node: BaseNode | null | undefined): node is FrameNode {
    return !!node && node.type === 'FRAME' && node.getPluginData('component-id') === 'table';
}

export function isCellLikeNode(node: SceneNode | null | undefined): boolean {
    if (!node || node.removed) return false;
    const componentId = 'getPluginData' in node ? node.getPluginData('component-id') : '';
    if (isTableCellComponentId(componentId)) return true;
    if (node.type === 'TEXT') return true;
    if ((node.type === 'FRAME' || node.type === 'INSTANCE') && 'findOne' in node) {
        try {
            return Boolean((node as FrameNode | InstanceNode).findOne((n) => n.type === 'TEXT'));
        } catch (e) {
            return false;
        }
    }
    return false;
}

export function looksLikeTableColumnFrame(node: SceneNode | null | undefined): node is FrameNode {
    if (!node || node.removed) return false;
    if (node.type !== 'FRAME') return false;
    if (node.layoutMode !== 'VERTICAL') return false;
    if (node.children.length < 2) return false;
    const cellLikeCount = node.children.filter((child) => isCellLikeNode(child as SceneNode)).length;
    return cellLikeCount >= Math.max(2, Math.floor(node.children.length * 0.5));
}

export function findTableFrameFromNode(node: BaseNode | null | undefined): FrameNode | null {
    let current = node;
    while (current && current.type !== 'PAGE') {
        if (isTableNode(current)) return current;
        current = current.parent;
    }
    return null;
}

export function findTableCellFromNode(node: BaseNode | null | undefined): FrameNode | InstanceNode | null {
    let current = node;
    while (current && current.type !== 'PAGE') {
        const componentId = current.getPluginData('component-id');
        if (isTableCellComponentId(componentId)) {
            return current as FrameNode | InstanceNode;
        }
        current = current.parent;
    }
    return null;
}

export function getTableColumns(table: FrameNode): FrameNode[] {
    const direct = table.children.filter((child): child is FrameNode => isTableColumnNode(child));
    if (direct.length > 0) return direct;

    // Fallback for older tables / manually edited structures: look for column-like vertical frames.
    const directFrames = table.children.filter((child): child is FrameNode => child.type === 'FRAME') as FrameNode[];
    const fallback = directFrames.filter((child) => looksLikeTableColumnFrame(child));
    if (fallback.length > 0) return fallback;

    // If the table is wrapped (e.g. a scroll container), try one level deeper.
    for (const frame of directFrames) {
        const nestedStrict = frame.children.filter((child): child is FrameNode => isTableColumnNode(child));
        if (nestedStrict.length > 0) return nestedStrict;
        const nestedFrames = frame.children.filter((child): child is FrameNode => child.type === 'FRAME') as FrameNode[];
        const nestedFallback = nestedFrames.filter((child) => looksLikeTableColumnFrame(child));
        if (nestedFallback.length > 0) return nestedFallback;
    }

    return [];
}

export function hasDirectTableColumns(node: FrameNode): boolean {
    return node.children.some((child) => {
        // Exclude managed table parts (filter, pagination, stack) from column detection
        if ('getPluginData' in child && child.getPluginData('table-role')) return false;
        return isTableColumnNode(child) || looksLikeTableColumnFrame(child as SceneNode);
    });
}

export function resolveTableContentFrame(table: FrameNode): FrameNode {
    if (hasDirectTableColumns(table)) return table;
    const directFrames = table.children.filter((child): child is FrameNode => child.type === 'FRAME') as FrameNode[];
    for (const frame of directFrames) {
        if (hasDirectTableColumns(frame)) return frame;
    }
    try {
        const nested = table.findOne((n) => {
            if (n.type !== 'FRAME') return false;
            return hasDirectTableColumns(n as FrameNode);
        });
        if (nested && nested.type === 'FRAME') return nested as FrameNode;
    } catch {
        // ignore
    }
    return table;
}

function isFigmaComponentWithToken(node: BaseNode, token: string): boolean {
    if (!node || !('getPluginData' in node)) return false;
    if (node.getPluginData('component-id') !== 'figma-component') return false;
    const params = readNodeParams(node);
    return params.componentToken === token;
}

export function findPaginationRow(tableRoot: FrameNode): FrameNode | null {
    // Prefer explicit marker (newer tables).
    const marked = tableRoot.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'pagination-row'
    );
    if (marked && marked.type === 'FRAME') return marked as FrameNode;

    // Heuristic: a frame containing the pagination figma-component instance.
    for (const child of tableRoot.children) {
        if (child.type !== 'FRAME') continue;
        if (child.children.some((n) => isFigmaComponentWithToken(n, 'lib-navigation-pagination'))) {
            return child as FrameNode;
        }
    }

    try {
        const paginationNode = tableRoot.findOne((n) => isFigmaComponentWithToken(n as BaseNode, 'lib-navigation-pagination'));
        if (paginationNode && paginationNode.parent && paginationNode.parent.type === 'FRAME') {
            return paginationNode.parent as FrameNode;
        }
    } catch {
        // ignore
    }

    return null;
}

export function findTableContentStack(tableRoot: FrameNode): FrameNode | null {
    const existing = tableRoot.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'table-content'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

export function detectTableActualState(tableRoot: FrameNode): {
    hasButtonGroup: boolean;
    hasFilter: boolean;
    hasTabs: boolean;
    hasPagination: boolean;
} {
    const result = {
        hasButtonGroup: false,
        hasFilter: false,
        hasTabs: false,
        hasPagination: false
    };

    const toolbar = tableRoot.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'toolbar'
    ) as FrameNode | undefined;
    if (toolbar) {
        result.hasButtonGroup = toolbar.children.some(c => c.getPluginData('table-role') === 'button-group');
        result.hasFilter = toolbar.children.some(c => c.getPluginData('table-role') === 'filter-group');
        result.hasTabs = toolbar.children.some(c => c.getPluginData('table-role') === 'tabs');
    }

    result.hasPagination = !!findPaginationRow(tableRoot);

    return result;
}

export function findManagedTableFilterGroup(contentStack: FrameNode): FrameNode | null {
    const existing = contentStack.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

export function findManagedTableFilterGroupInParent(parent: FrameNode): FrameNode | null {
    const existing = parent.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

export function findTableColumnFromNode(node: BaseNode | null | undefined): FrameNode | null {
    let current = node;
    while (current && current.type !== 'PAGE') {
        if (isTableColumnNode(current)) return current;
        if ((current as any).type === 'FRAME' && looksLikeTableColumnFrame(current as unknown as FrameNode)) {
            const parent = (current as any).parent;
            if (parent && (parent as any).type === 'FRAME') {
                // Only treat it as a column if it sits in a table-like container.
                if (isTableNode(parent) || (parent as FrameNode).layoutMode === 'HORIZONTAL') {
                    return current as unknown as FrameNode;
                }
            }
        }
        current = current.parent;
    }
    return null;
}

export function getTableHeaderOffset(column: FrameNode): number {
    const first = column.children[0];
    if (!first) return 0;
    const id = first.getPluginData('component-id');
    return id === 'table-header-cell' ? 1 : 0;
}

export function getTableRowCountFromColumn(column: FrameNode): number {
    const offset = getTableHeaderOffset(column);
    return Math.max(0, column.children.length - offset);
}

export function getTableRowCount(table: FrameNode): number {
    const columns = getTableColumns(table);
    if (columns.length === 0) return 0;
    return getTableRowCountFromColumn(columns[0]);
}

function countLeafNodes(root: SceneNode, limit = 2): number {
  const stack: SceneNode[] = [root];
  let count = 0;
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    const hasChildren = 'children' in node && node.children.length > 0;
    if (node !== root && (!hasChildren || (node as any).type === 'TEXT')) {
      count += 1;
      if (count >= limit) return count;
    }
    if ('children' in node) {
      for (const child of node.children) {
        stack.push(child);
      }
    }
  }
  return count;
}

export function isMultiElementCell(cell: SceneNode, textNodeCount: number): boolean {
  if (textNodeCount <= 0) return false;
  if (textNodeCount > 1) return true;
  return countLeafNodes(cell, 2) >= 2;
}

export function isTableActionCellComponentId(componentId: string): boolean {
  return componentId === 'table-cell-action-text' || componentId === 'table-cell-action-icon';
}
