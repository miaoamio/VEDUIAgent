import { ComponentInstance } from '../../types';
import { readNodeParams, mergeNodeParams } from '../utils/nodeSnapshot';
import {
  TABLE_HEADER_ICON_PLUGIN_KEY,
  normalizeTableHeaderElementType,
  findTableHeaderIconInstance,
  isTableColumnNode,
  getTableColumns,
  getTableHeaderOffset,
  getTableRowCountFromColumn,
  getTableRowCount,
  findPaginationRow,
  findManagedTableFilterGroupInParent,
  resolveTableHeaderHeight,
  resolveTableBodyHeight,
  isTableActionCellComponentId,
} from './table-queries';
import type { TableHeaderElementType } from './table-queries';
import {
  tryApplyTableHeaderIconVariant,
  alignAllTableRows,
  applyColumnWidthMode,
} from './table-layout';

// ---------------------------------------------------------------------------
// Context – dependency injection for functions that need code.ts internals
// ---------------------------------------------------------------------------

export interface TableOperationContext {
  renderComponent: (instance: ComponentInstance, opts?: { isRoot?: boolean }) => Promise<SceneNode>;
  createFigmaComponentInstanceByToken: (
    token: string,
    options?: { variantCriteria?: Record<string, string | boolean> | ((v: any) => boolean); visible?: boolean }
  ) => Promise<InstanceNode | null>;
  createFigmaComponentInstanceFromRef: (opts: any) => Promise<InstanceNode>;
  COMPONENT_DEFS: Record<string, any>;
  setSceneText: (node: SceneNode, text: string) => Promise<void>;
  clearNodeStrokes: (node: SceneNode | FrameNode) => void;
  findInstanceComponentPropertyName: (instance: InstanceNode, displayName: string) => string | null;
  toVariantBoolean: (value: boolean) => string;
  resolveComponentTokenProfile: (token: string) => { profile: { componentKey: string; displayName?: string } } | undefined;
}

// ---------------------------------------------------------------------------
// Local helpers (not exported)
// ---------------------------------------------------------------------------

function findDirectTextChild(node: FrameNode): TextNode | null {
  const text = node.children.find((child) => child.type === 'TEXT');
  return text && text.type === 'TEXT' ? (text as TextNode) : null;
}

// ---------------------------------------------------------------------------
// createTableHeaderIconInstance
// ---------------------------------------------------------------------------

export async function createTableHeaderIconInstance(
  ctx: TableOperationContext,
  type: TableHeaderElementType
): Promise<InstanceNode | null> {
  if (type === 'none') return null;
  const icon = await ctx.createFigmaComponentInstanceByToken('table-header-icon');
  if (!icon) return null;
  icon.name = `HeaderIcon:${type}`;
  try {
    icon.setPluginData(TABLE_HEADER_ICON_PLUGIN_KEY, type);
  } catch {
    // ignore
  }
  tryApplyTableHeaderIconVariant(icon, type);
  try {
    icon.resize(12, 12);
  } catch {
    // ignore
  }
  return icon;
}

// ---------------------------------------------------------------------------
// applyTableHeaderElementToHeaderCell
// ---------------------------------------------------------------------------

export async function applyTableHeaderElementToHeaderCell(
  ctx: TableOperationContext,
  headerCell: SceneNode | null | undefined,
  headerType: unknown
): Promise<void> {
  if (!headerCell || headerCell.removed) return;
  if (headerCell.type !== 'FRAME') return;

  const desired = normalizeTableHeaderElementType(headerType);
  const frame = headerCell as FrameNode;
  const ensureHeaderFill = () => {
    try {
      (frame as any).layoutSizingHorizontal = 'FILL';
    } catch {
      // ignore
    }
    try {
      frame.layoutAlign = 'STRETCH';
    } catch {
      // ignore
    }
  };
  const ensureColumnFill = () => {
    const parent = frame.parent;
    if (!parent || parent.type !== 'FRAME') return;
    if (!isTableColumnNode(parent)) return;
    const columnParams = readNodeParams(parent);
    const mode = String(columnParams.columnWidthMode || '').toUpperCase();
    if (mode && mode !== 'FILL') return;
    parent.layoutGrow = 1;
    parent.counterAxisSizingMode = 'FIXED';
    try {
      (parent as any).layoutSizingHorizontal = 'FILL';
    } catch {
      // ignore
    }
  };

  const existingIcon = findTableHeaderIconInstance(frame);
  const textNode = findDirectTextChild(frame);

  if (desired === 'none') {
    if (existingIcon) {
      try {
        existingIcon.remove();
      } catch {
        // ignore
      }
      try {
        frame.itemSpacing = 8;
      } catch {
        // ignore
      }
    }
    if (textNode) {
      try {
        textNode.layoutGrow = 0;
      } catch {
        // ignore
      }
    }
    ensureHeaderFill();
    ensureColumnFill();
    return;
  }

  if (textNode) {
    try {
      textNode.layoutGrow = 0;
    } catch {
      // ignore
    }
  }

  try {
    frame.itemSpacing = 4;
  } catch {
    // ignore
  }

  const existingType = existingIcon ? existingIcon.getPluginData(TABLE_HEADER_ICON_PLUGIN_KEY) : '';
  if (existingIcon && existingType !== desired) {
    try {
      existingIcon.remove();
    } catch {
      // ignore
    }
  }

  let iconToUse = findTableHeaderIconInstance(frame);
  if (!iconToUse) {
    iconToUse = await createTableHeaderIconInstance(ctx, desired);
    if (iconToUse) {
      if (textNode) {
        const textIndex = frame.children.indexOf(textNode);
        const insertAt = textIndex >= 0 ? Math.min(textIndex + 1, frame.children.length) : frame.children.length;
        frame.insertChild(insertAt, iconToUse);
      } else {
        frame.appendChild(iconToUse);
      }
    }
  } else {
    // best-effort: keep existing instance but ensure variant matches
    try {
      iconToUse.setPluginData(TABLE_HEADER_ICON_PLUGIN_KEY, desired);
    } catch {
      // ignore
    }
    tryApplyTableHeaderIconVariant(iconToUse, desired);
  }
  if (iconToUse) {
    try {
      iconToUse.resize(12, 12);
    } catch {
      // ignore
    }
  }
  ensureHeaderFill();
  ensureColumnFill();
}

// ---------------------------------------------------------------------------
// ensurePaginationRow
// ---------------------------------------------------------------------------

export async function ensurePaginationRow(
  ctx: TableOperationContext,
  tableRoot: FrameNode,
  width: number
) {
  const tableRuntime = ctx.COMPONENT_DEFS['table']?.runtime as any;
  const paginationPaddingTop = tableRuntime?.spacing?.paginationRowPaddingTop ?? 16;

  const existing = findPaginationRow(tableRoot);
  if (existing) {
    existing.visible = true;
    existing.fills = [];
    existing.clipsContent = false;
    existing.layoutAlign = 'STRETCH';
    existing.primaryAxisAlignItems = 'MAX';
    existing.primaryAxisSizingMode = 'FIXED';
    existing.counterAxisSizingMode = 'AUTO';
    existing.paddingTop = paginationPaddingTop;
    if ('layoutSizingHorizontal' in existing) {
      try {
        (existing as any).layoutSizingHorizontal = 'FILL';
      } catch {
        // ignore
      }
    }
    if ('layoutSizingVertical' in existing) {
      try {
        (existing as any).layoutSizingVertical = 'HUG';
      } catch {
        // ignore
      }
    }
    return;
  }

  const paginationRow = figma.createFrame();
  paginationRow.setPluginData('table-role', 'pagination-row');
  paginationRow.name = 'Pagination Row';
  paginationRow.layoutMode = 'HORIZONTAL';
  paginationRow.primaryAxisSizingMode = 'FIXED';
  paginationRow.counterAxisSizingMode = 'AUTO';
  paginationRow.primaryAxisAlignItems = 'MAX';
  paginationRow.layoutAlign = 'STRETCH';
  paginationRow.fills = [];
  paginationRow.paddingTop = paginationPaddingTop;
  // Layout-only container: avoid clipping child strokes/effects.
  paginationRow.clipsContent = false;
  paginationRow.resize(width, 1);
  // Some Figma versions reset sizing modes when resize() is called.
  paginationRow.primaryAxisSizingMode = 'FIXED';
  paginationRow.counterAxisSizingMode = 'AUTO';
  if ('layoutSizingHorizontal' in paginationRow) {
    try {
      (paginationRow as any).layoutSizingHorizontal = 'FILL';
    } catch {
      // ignore
    }
  }
  if ('layoutSizingVertical' in paginationRow) {
    try {
      (paginationRow as any).layoutSizingVertical = 'HUG';
    } catch {
      // ignore
    }
  }

  const paginationNode = await ctx.renderComponent({
    id: `pagination-${Date.now()}`,
    componentId: 'figma-component',
    params: { componentToken: 'lib-navigation-pagination' }
  }, { isRoot: false });
  paginationRow.appendChild(paginationNode);
  // Re-assert hug sizing after child insertion to avoid 1px-height frames.
  paginationRow.counterAxisSizingMode = 'AUTO';
  if ('layoutSizingVertical' in paginationRow) {
    try {
      (paginationRow as any).layoutSizingVertical = 'HUG';
    } catch {
      // ignore
    }
  }
  tableRoot.appendChild(paginationRow);
}

// ---------------------------------------------------------------------------
// ensureTableToolbar
// ---------------------------------------------------------------------------

export async function ensureTableToolbar(
  ctx: TableOperationContext,
  contentStack: FrameNode,
  width: number,
  options: {
    hasFilter?: boolean;
    hasTabs?: boolean;
    hasButtonGroup?: boolean;
    filterTexts?: string;
    primaryButtonText?: string;
    secondaryButtonText?: string;
  }
) {
  const tableRuntime = ctx.COMPONENT_DEFS['table']?.runtime as any;
  const toolbarPaddingBottom = tableRuntime?.spacing?.toolbarPaddingBottom ?? 20;

  // 1. Find existing Toolbar or Legacy Filter Group
  let toolbar = contentStack.children.find(
    (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'toolbar'
  ) as FrameNode;
  const isNewToolbar = !toolbar;

  const legacyFilter = contentStack.children.find(
    (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
  ) as FrameNode;

  // 2. Create/Migrate Toolbar if needed
  if (!toolbar) {
    toolbar = figma.createFrame();
    toolbar.layoutMode = 'HORIZONTAL';
    toolbar.itemSpacing = 20;
    toolbar.primaryAxisSizingMode = 'FIXED';
    toolbar.counterAxisSizingMode = 'AUTO';
    toolbar.layoutAlign = 'STRETCH';
    toolbar.name = 'Table Toolbar';
    toolbar.paddingBottom = toolbarPaddingBottom;
    try { (toolbar as any).layoutSizingHorizontal = 'FILL'; } catch {}
    try { (toolbar as any).layoutSizingVertical = 'HUG'; } catch {}
    toolbar.setPluginData('table-role', 'toolbar');
    toolbar.fills = [];
    ctx.clearNodeStrokes(toolbar);
    toolbar.clipsContent = false;

    if (legacyFilter) {
      toolbar.appendChild(legacyFilter);
    }
  } else {
    toolbar.visible = true;
    toolbar.layoutMode = 'HORIZONTAL';
    toolbar.itemSpacing = 20;
    toolbar.layoutAlign = 'STRETCH';
    toolbar.paddingBottom = toolbarPaddingBottom;
    try { (toolbar as any).layoutSizingHorizontal = 'FILL'; } catch {}
    try { (toolbar as any).layoutSizingVertical = 'HUG'; } catch {}
  }

  // 3. Manage Tabs (Left)
  let tabsNode = toolbar.children.find(c => c.getPluginData('table-role') === 'tabs');
  if (options.hasTabs) {
    if (!tabsNode) {
      tabsNode = await ctx.renderComponent({
        id: `tabs-${Date.now()}`,
        componentId: 'figma-component',
        params: {
          componentToken: 'lib-data-display-othertabs',
          variantCriteria: JSON.stringify({ Type: 'Capsule' })
        }
      }, { isRoot: false });
      tabsNode.setPluginData('table-role', 'tabs');
      toolbar.insertChild(0, tabsNode);
    }
  } else if (tabsNode) {
    tabsNode.remove();
  }

  // 4. Manage Filter (Middle)
  let filterNode = toolbar.children.find(c => c.getPluginData('table-role') === 'filter-group');
  if (options.hasFilter) {
    if (!filterNode) {
      filterNode = await ctx.renderComponent({
        id: `table-filter-${Date.now()}`,
        componentId: 'filter-group',
        params: { width: 300, ...(options.filterTexts ? { itemsText: options.filterTexts } : {}) }
      }, { isRoot: false });
      filterNode.setPluginData('table-role', 'filter-group');
      toolbar.appendChild(filterNode);
    } else if (options.filterTexts) {
      const currentParams = readNodeParams(filterNode);
      if (currentParams.itemsText !== options.filterTexts) {
        const newParams = { ...currentParams, itemsText: options.filterTexts };
        const replacement = await ctx.renderComponent({
          id: filterNode.getPluginData('component-id') || `filter-${Date.now()}`,
          componentId: 'filter-group',
          params: newParams
        }, { isRoot: false });
        replacement.setPluginData('table-role', 'filter-group');
        const index = toolbar.children.indexOf(filterNode);
        toolbar.insertChild(index, replacement);
        filterNode.remove();
        filterNode = replacement;
      }
    }

    if (filterNode.type === 'FRAME') {
      filterNode.layoutMode = 'HORIZONTAL';
      filterNode.counterAxisSizingMode = 'AUTO';
      filterNode.itemSpacing = 12;
      filterNode.layoutGrow = 1;
      filterNode.primaryAxisSizingMode = 'FIXED';
      try { (filterNode as any).layoutSizingHorizontal = 'FILL'; } catch {}
      try { (filterNode as any).layoutSizingVertical = 'HUG'; } catch {}
    }
  } else if (filterNode) {
    filterNode.remove();
  }

  // 5. Manage Button Group (Right)
  let btnGroupNode = toolbar.children.find(c => c.getPluginData('table-role') === 'button-group');

  // Check if we need to migrate from old INSTANCE to new FRAME structure
  if (btnGroupNode && btnGroupNode.type === 'INSTANCE') {
    btnGroupNode.remove();
    btnGroupNode = undefined; // Force recreation
  }

  if (options.hasButtonGroup) {
    if (!btnGroupNode) {
      const container = figma.createFrame();
      container.name = 'Button Group';
      container.layoutMode = 'HORIZONTAL';
      container.counterAxisSizingMode = 'AUTO';
      container.primaryAxisSizingMode = 'AUTO';
      container.itemSpacing = 8;
      container.fills = [];
      container.clipsContent = false;

      const btn1 = await ctx.renderComponent({
        id: `btn-1-${Date.now()}`,
        componentId: 'button',
        params: {
          label: options.secondaryButtonText || '次要按钮',
          variant: 'outline'
        }
      }, { isRoot: false });

      const btn2 = await ctx.renderComponent({
        id: `btn-2-${Date.now()}`,
        componentId: 'button',
        params: {
          label: options.primaryButtonText || '主要按钮',
          variant: 'primary'
        }
      }, { isRoot: false });

      container.appendChild(btn1);
      container.appendChild(btn2);

      btnGroupNode = container;
      btnGroupNode.setPluginData('table-role', 'button-group');
      toolbar.appendChild(btnGroupNode);
    }

    // Ensure properties are correct even if it existed
    if (btnGroupNode && btnGroupNode.type === 'FRAME') {
      btnGroupNode.clipsContent = false;
    }
  } else if (btnGroupNode) {
    btnGroupNode.remove();
  }

  // 6. Reorder: Tabs, Filter, ButtonGroup
  const order = ['tabs', 'filter-group', 'button-group'];
  const children = [...toolbar.children];
  children.sort((a, b) => {
    const ra = a.getPluginData('table-role');
    const rb = b.getPluginData('table-role');
    return order.indexOf(ra) - order.indexOf(rb);
  });
  children.forEach(c => toolbar.appendChild(c));

  // Align based on content
  const hasFilter = children.some(c => c.getPluginData('table-role') === 'filter-group');
  const hasTabs = children.some(c => c.getPluginData('table-role') === 'tabs');
  const hasButtons = children.some(c => c.getPluginData('table-role') === 'button-group');

  if (!hasFilter) {
    if (hasTabs && hasButtons) {
      toolbar.primaryAxisAlignItems = 'SPACE_BETWEEN';
    } else if (hasButtons) {
      toolbar.primaryAxisAlignItems = 'MAX';
    } else {
      toolbar.primaryAxisAlignItems = 'MIN';
    }
  } else {
    toolbar.primaryAxisAlignItems = 'MIN';
  }

  // 7. Insert or remove if empty
  if (toolbar.children.length === 0) {
    if (toolbar.parent) {
      toolbar.remove();
    }
    return;
  }
  if (isNewToolbar || toolbar.parent !== contentStack) {
    contentStack.insertChild(0, toolbar);
  }
}

// ---------------------------------------------------------------------------
// ensureTableFilterGroupInParent
// ---------------------------------------------------------------------------

export async function ensureTableFilterGroupInParent(
  ctx: TableOperationContext,
  parent: FrameNode,
  tableRoot: FrameNode,
  width: number
) {
  const existing = findManagedTableFilterGroupInParent(parent);
  if (existing) {
    existing.visible = true;
    existing.fills = [];
    existing.clipsContent = false;
    existing.layoutAlign = 'STRETCH';
    if (Number.isFinite(width) && width > 0) {
      try {
        existing.primaryAxisSizingMode = 'FIXED';
        existing.resize(width, existing.height);
      } catch {
        // ignore
      }
    }
    if ('layoutSizingHorizontal' in existing) {
      try {
        (existing as any).layoutSizingHorizontal = 'FILL';
      } catch {
        // ignore
      }
    }
    if ('layoutSizingVertical' in existing) {
      try {
        (existing as any).layoutSizingVertical = 'HUG';
      } catch {
        // ignore
      }
    }
    const tableIndex = parent.children.indexOf(tableRoot);
    const currentIndex = parent.children.indexOf(existing);
    if (tableIndex >= 0 && currentIndex !== tableIndex - 1) {
      try {
        parent.insertChild(Math.max(0, tableIndex), existing);
      } catch {
        // ignore
      }
    }
    return;
  }

  const filterNode = await ctx.renderComponent(
    {
      id: `table-filter-${Date.now()}`,
      componentId: 'filter-group',
      params: { width }
    },
    { isRoot: false }
  );

  try {
    filterNode.setPluginData('table-role', 'filter-group');
  } catch {
    // ignore
  }
  if (filterNode.type === 'FRAME') {
    filterNode.layoutAlign = 'STRETCH';
    filterNode.layoutMode = 'HORIZONTAL';
    filterNode.counterAxisSizingMode = 'AUTO';
    filterNode.itemSpacing = 12;
    if ('layoutSizingHorizontal' in filterNode) {
      try {
        (filterNode as any).layoutSizingHorizontal = 'FILL';
      } catch {
        // ignore
      }
    }
    if ('layoutSizingVertical' in filterNode) {
      try {
        (filterNode as any).layoutSizingVertical = 'HUG';
      } catch {
        // ignore
      }
    }
  }

  const tableIndex = parent.children.indexOf(tableRoot);
  if (tableIndex >= 0) {
    parent.insertChild(Math.max(0, tableIndex), filterNode);
  } else {
    parent.appendChild(filterNode);
  }
}

// ---------------------------------------------------------------------------
// updateTableRowCount
// ---------------------------------------------------------------------------

export async function updateTableRowCount(
  ctx: TableOperationContext,
  table: FrameNode,
  targetRows: number
) {
  const columns = getTableColumns(table);
  if (columns.length === 0) return;
  const safeTarget = Math.max(0, Math.floor(targetRows));
  // Ensure the table can grow/shrink to reflect the new row count.
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
    const offset = getTableHeaderOffset(column);
    const currentRows = Math.max(0, column.children.length - offset);
    if (currentRows === safeTarget) continue;

    if (currentRows < safeTarget) {
      // Collect all existing body cells as clone templates.
      const bodyCells: SceneNode[] = [];
      for (let b = offset; b < offset + currentRows; b += 1) {
        const c = column.children[b] as SceneNode | undefined;
        if (c) bodyCells.push(c);
      }
      const columnParams = readNodeParams(column);
      const bodyHeight = resolveTableBodyHeight(columnParams);
      for (let i = currentRows; i < safeTarget; i += 1) {
        let newCell: SceneNode | null = null;
        if (bodyCells.length > 0) {
          // Pick a random body cell to clone so duplicated rows look varied.
          const randomIdx = Math.floor(Math.random() * bodyCells.length);
          newCell = bodyCells[randomIdx].clone();
        } else {
          const cellInstance: ComponentInstance = {
            id: `cell-${Date.now()}-${i}`,
            componentId: 'table-cell',
            params: { text: `Cell ${i + 1}`, width: column.width, height: bodyHeight }
          };
          newCell = await ctx.renderComponent(cellInstance, { isRoot: false });
        }
        if (newCell) {
          if ('layoutSizingHorizontal' in newCell) {
            try {
              (newCell as any).layoutSizingHorizontal = 'FILL';
            } catch (e) {
              // ignore
            }
          }
          if ('layoutSizingVertical' in newCell) {
            try {
              (newCell as any).layoutSizingVertical = 'FIXED';
            } catch (e) {
              // ignore
            }
          }
          if ('resize' in newCell) {
            newCell.resize(column.width, bodyHeight);
          }
          if ('layoutAlign' in newCell) {
            (newCell as any).layoutAlign = 'STRETCH';
          }
          mergeNodeParams(newCell, { height: bodyHeight });
          column.appendChild(newCell);
        }
      }
    } else {
      for (let i = column.children.length - 1; i >= offset + safeTarget; i -= 1) {
        column.children[i].remove();
      }
    }
    mergeNodeParams(column, { rowCount: safeTarget });
  }
  alignAllTableRows(table);
}

// ---------------------------------------------------------------------------
// applyRowActionColumn
// ---------------------------------------------------------------------------

export async function applyRowActionColumn(
  ctx: TableOperationContext,
  table: FrameNode,
  action: string
) {
  const normalize = (value: unknown): 'none' | 'multiple' | 'single' | 'drag' | 'expand' | 'switch' => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized.includes('多选') || normalized.includes('复选')) return 'multiple';
    if (normalized.includes('单选')) return 'single';
    if (normalized.includes('拖拽') || normalized.includes('拖动') || normalized.includes('排序')) return 'drag';
    if (normalized.includes('展开')) return 'expand';
    if (normalized.includes('开关')) return 'switch';
    if (normalized === 'multiple' || normalized === 'multi' || normalized === 'checkbox') return 'multiple';
    if (normalized === 'single' || normalized === 'radio') return 'single';
    if (normalized === 'drag' || normalized === 'draggable') return 'drag';
    if (normalized === 'expand' || normalized === 'expandable') return 'expand';
    if (normalized === 'switch' || normalized === 'toggle') return 'switch';
    return 'none';
  };

  const desired = normalize(action);
  const previous = normalize(table.getPluginData('rowActionType'));
  const shouldAnnounce = previous !== desired;

  const iconMap: Record<string, string> = {
    multiple: '☐',
    single: '◯',
    drag: '≡',
    expand: '›',
    switch: '⏼'
  };
  const iconText = iconMap[desired] || '';

  const isRowActionCandidate = (node: SceneNode): node is FrameNode => {
    if (node.type !== 'FRAME') return false;
    const marked = node.getPluginData('isRowActionColumn') === 'true';
    const byType = normalize(node.getPluginData('rowActionType')) !== 'none';
    const byName = String(node.name || '').trim().toLowerCase().includes('row action column');
    return marked || byType || byName;
  };

  const existingCandidates = table.children.filter(isRowActionCandidate);
  const existingPrimary = existingCandidates[0];
  const existingType = existingPrimary ? normalize(existingPrimary.getPluginData('rowActionType')) : 'none';

  try {
    table.setPluginData('rowActionType', desired);
  } catch {}

  if (desired === 'none') {
    existingCandidates.forEach((node) => {
      try {
        if (!node.removed) node.remove();
      } catch {}
    });
    if (shouldAnnounce) {
      figma.ui.postMessage({ type: 'action-done', message: `[RowAction] ${previous} -> none` });
    }
    return;
  }

  const expectedWidth = desired === 'switch' ? 60 : 35;

  const tableParams = readNodeParams(table);
  const headerHeight = resolveTableHeaderHeight(tableParams);
  const bodyHeight = resolveTableBodyHeight(tableParams);
  const baseColumn = getTableColumns(table).find((col) => !isRowActionCandidate(col));
  const inferredRowCount = baseColumn ? getTableRowCountFromColumn(baseColumn) : getTableRowCount(table);
  const rowCount = Number.isFinite(tableParams.rowCount) ? Number(tableParams.rowCount) : inferredRowCount;

  const sizeVariantMap: Record<number, 'Mini 32' | 'Default 40' | 'Medium 48' | 'Large 56'> = {
    32: 'Mini 32',
    40: 'Default 40',
    48: 'Medium 48',
    56: 'Large 56'
  };
  const resolveSizeVariant = (height: number): 'Mini 32' | 'Default 40' | 'Medium 48' | 'Large 56' => {
    const snapped = [32, 40, 48, 56].reduce((prev, curr) =>
      Math.abs(curr - height) < Math.abs(prev - height) ? curr : prev
    );
    return sizeVariantMap[snapped] || 'Default 40';
  };

  const resolveBodyToken = (): string | null => {
    if (desired === 'multiple') return 'table-row-action-checkbox';
    if (desired === 'single') return 'table-row-action-radio';
    if (desired === 'drag') return 'table-row-action-drag';
    if (desired === 'expand') return 'table-row-action-expand';
    if (desired === 'switch') return 'table-row-action-switch';
    return null;
  };

  const createHeaderControl = async (): Promise<InstanceNode | null> => {
    const token = 'table-row-action-header';
    const resolved = ctx.resolveComponentTokenProfile(token);
    const componentKey = resolved?.profile.componentKey || '';
    if (!componentKey) return null;
    try {
      const inst = await ctx.createFigmaComponentInstanceFromRef({
        componentKey,
        fallbackName: 'Row Action Header',
        variantCriteria: {
          'Check 多选': desired === 'multiple',
          'Expand 展开': desired === 'expand',
          'Size 尺寸': resolveSizeVariant(headerHeight)
        }
      });
      try {
        const findPropKey = (candidates: string[]): string | null => {
          for (const candidate of candidates) {
            const found = ctx.findInstanceComponentPropertyName(inst, candidate);
            if (found) return found;
          }
          return null;
        };
        const resolvePropValue = (key: string, value: string | boolean): string | boolean | undefined => {
          const prop = inst.componentProperties?.[key];
          const type = prop?.type;

          if (type === 'BOOLEAN') {
            return typeof value === 'boolean' ? value : undefined;
          }

          if (typeof value === 'boolean') {
            if (type === 'VARIANT') {
              const current = typeof prop?.value === 'string' ? prop.value.trim().toLowerCase() : '';
              if (current === 'on' || current === 'off') return value ? 'On' : 'Off';
              if (current === 'yes' || current === 'no') return value ? 'Yes' : 'No';
              if (current === 'true' || current === 'false') return value ? 'True' : 'False';
              return ctx.toVariantBoolean(value);
            }
            return value;
          }

          return value;
        };

        const patch: Record<string, any> = {};
        const setPatchValue = (key: string | null, value: string | boolean) => {
          if (!key) return;
          const resolved = resolvePropValue(key, value);
          if (resolved !== undefined) patch[key] = resolved;
        };

        setPatchValue(findPropKey(['Check 多选', 'Check']), desired === 'multiple');
        setPatchValue(findPropKey(['Expand 展开', 'Expand']), desired === 'expand');
        setPatchValue(findPropKey(['Size 尺寸', 'Size']), resolveSizeVariant(headerHeight));
        setPatchValue(findPropKey(['Fixdrow 固定表头', 'Fixdrow']), false);
        setPatchValue(findPropKey(['Align 排列方式', 'Align']), 'Left 左');
        if (Object.keys(patch).length > 0) {
          inst.setProperties(patch);
        }
      } catch {}
      inst.setPluginData('rowActionHeaderType', desired);
      inst.name = `RowActionHeader:${desired}`;
      return inst;
    } catch (e) {
      console.warn('[RowAction] failed to create header control', e);
      return null;
    }
  };

  const createBodyControl = async (): Promise<InstanceNode | null> => {
    const token = resolveBodyToken();
    if (!token) return null;
    const resolved = ctx.resolveComponentTokenProfile(token);
    const componentKey = resolved?.profile.componentKey || '';
    if (!componentKey) return null;

    const variantCriteria: Record<string, string | boolean> | undefined =
      desired === 'multiple'
        ? {
            'Checked 已选': false,
            'Indeterminate 半选': false,
            'Hover 悬浮': false,
            'Disabled 禁用': false
          }
        : desired === 'single'
          ? {
              'Checked 已选': false,
              'Hover 悬浮': false,
              'Disabled 禁用': false
            }
          : desired === 'switch'
            ? {
                'Status 状态': false,
                'Disabled 禁用': false
              }
            : undefined;

    const getFallbackName = (action: string) => {
      if (action === 'multiple') return 'Checkbox';
      if (action === 'single') return 'Radio';
      if (action === 'drag') return 'Drag';
      if (action === 'expand') return 'Expand';
      if (action === 'switch') return 'Switch';
      return `Row Action ${action}`;
    };

    try {
      const inst = await ctx.createFigmaComponentInstanceFromRef({
        componentKey,
        fallbackName: getFallbackName(desired),
        variantCriteria
      });

      // Hide labels where applicable (best-effort)
      if (desired === 'multiple' || desired === 'single' || desired === 'switch') {
        const labelKeyCandidates = ['label 标签', 'Label 标签'];
        for (const candidate of labelKeyCandidates) {
          const propName = ctx.findInstanceComponentPropertyName(inst, candidate);
          if (propName) {
            try {
              inst.setProperties({ [propName]: false });
            } catch {}
            break;
          }
        }
      }

      inst.setPluginData('rowActionControlType', desired);
      inst.name = `RowAction:${desired}`;

      if (desired === 'drag') {
        try {
          inst.resize(14, 14);
        } catch {}
      }

      return inst;
    } catch (e) {
      console.warn('[RowAction] failed to create body control', e);
      return null;
    }
  };

  const existingMatches =
    Boolean(existingPrimary && !existingPrimary.removed) &&
    existingType === desired &&
    Math.abs((existingPrimary as FrameNode).width - expectedWidth) <= 0.5;

  const existingHasBodyControls = (() => {
    if (!existingMatches || !existingPrimary) return false;
    const offset = getTableHeaderOffset(existingPrimary);
    const firstBody = existingPrimary.children[offset] as SceneNode | undefined;
    if (!firstBody || firstBody.removed || firstBody.type !== 'FRAME') return false;
    return Boolean(
      firstBody.children.find(
        (child) => child.type === 'INSTANCE' && child.getPluginData('rowActionControlType') === desired
      )
    );
  })();

  // If we already have a matching action column with controls, skip.
  if (existingHasBodyControls && existingCandidates.length <= 1) {
    if (shouldAnnounce) {
      figma.ui.postMessage({ type: 'action-done', message: `[RowAction] ${previous} -> ${desired} (no-op)` });
    }
    return;
  }

  // Try to create prototypes (one-time). If Figma components are unavailable, we keep icon fallback.
  const headerPrototype = await createHeaderControl();
  const bodyPrototype = await createBodyControl();

  // Remove any existing row-action columns (handles duplicates / old versions).
  existingCandidates.forEach((node) => {
    try {
      if (!node.removed) node.remove();
    } catch {}
  });

  const rowActionPaddingLeft = 16;
  const rowActionPaddingRight = 8;
  const populateColumnCells = async (
    columnNode: FrameNode,
    options: { header?: InstanceNode | null; body?: InstanceNode | null }
  ) => {
    const headerCellNode = columnNode.children[0];
    if (headerCellNode && headerCellNode.type === 'FRAME') {
      headerCellNode.paddingLeft = 0;
      headerCellNode.paddingRight = 0;
      headerCellNode.itemSpacing = 0;
      headerCellNode.primaryAxisAlignItems = 'CENTER';
      headerCellNode.counterAxisAlignItems = 'CENTER';
      [...headerCellNode.children].forEach((child) => child.remove());
      if (options.header) {
        headerCellNode.appendChild(options.header);
        try {
          options.header.layoutAlign = 'CENTER';
        } catch {}
        try {
          (options.header as any).layoutSizingHorizontal = 'FILL';
        } catch {}
        try {
          (options.header as any).layoutGrow = 0;
        } catch {}
      }
    }

    const offset = getTableHeaderOffset(columnNode);
    for (let i = offset; i < columnNode.children.length; i += 1) {
      const cell = columnNode.children[i];
      if (!cell || cell.removed || cell.type !== 'FRAME') continue;
      cell.paddingLeft = rowActionPaddingLeft;
      cell.paddingRight = rowActionPaddingRight;
      cell.itemSpacing = 0;
      cell.primaryAxisAlignItems = 'CENTER';
      cell.counterAxisAlignItems = 'CENTER';

      if (options.body) {
        [...cell.children].forEach((child) => child.remove());
        const cloned = options.body.clone();
        try {
          cloned.layoutAlign = 'CENTER';
        } catch {}
        try {
          (cloned as any).layoutGrow = 0;
        } catch {}
        cell.appendChild(cloned);
      }
    }
  };

  const headerCell: ComponentInstance = {
    id: `action-header-${Date.now()}`,
    componentId: 'table-header-cell',
    params: {
      text: '',
      allowEmptyText: true,
      width: expectedWidth,
      height: 40,
      paddingLeft: 0,
      paddingRight: 0,
      textAlign: 'center'
    }
  };
  const bodyCells: ComponentInstance[] = Array.from({ length: Math.max(0, rowCount) }).map((_, index) => ({
    id: `action-cell-${index}`,
    componentId: 'table-cell',
    params: {
      text: iconText,
      width: expectedWidth,
      height: bodyHeight,
      paddingLeft: rowActionPaddingLeft,
      paddingRight: rowActionPaddingRight,
      textAlign: 'center'
    }
  }));

  const columnInstance: ComponentInstance = {
    id: `row-action-${Date.now()}`,
    componentId: 'table-column',
    params: {
      headerText: '',
      rowCount,
      width: expectedWidth,
      columnWidthMode: 'FIXED',
      textAlign: 'center',
      headerHeight,
      bodyHeight
    },
    children: [headerCell, ...bodyCells]
  };

  const columnNode = await ctx.renderComponent(columnInstance, { isRoot: false });
  if (columnNode.type === 'FRAME') {
    columnNode.name = `Row Action Column (${desired})`;
    columnNode.setPluginData('isRowActionColumn', 'true');
    columnNode.setPluginData('rowActionType', desired);
    mergeNodeParams(columnNode, { rowActionType: desired });
    applyColumnWidthMode(columnNode, 'FIXED', expectedWidth);
    await populateColumnCells(columnNode, { header: headerPrototype, body: bodyPrototype });
  }

  table.insertChild(0, columnNode);
  alignAllTableRows(table);

  if (shouldAnnounce) {
    figma.ui.postMessage({
      type: 'action-done',
      message: `[RowAction] ${previous} -> ${desired} (${bodyPrototype ? 'figma' : 'icon'})`
    });
  }
}

// ---------------------------------------------------------------------------
// ensureOperationColumnHeader
// ---------------------------------------------------------------------------

export async function ensureOperationColumnHeader(
  ctx: TableOperationContext,
  column: FrameNode
) {
  mergeNodeParams(column, { headerText: '操作' });
  const headerCell = column.children.find((child) => child.getPluginData('component-id') === 'table-header-cell');
  if (!headerCell) return;
  mergeNodeParams(headerCell, { text: '操作' });
  await ctx.setSceneText(headerCell as SceneNode, '操作');
}

// ---------------------------------------------------------------------------
// mergeSelectedColumnCells —— "纯列结构 + 流内拉高母体 + 列内隐藏占位"算法
//
// 输入：cellNodes（同一 table-column 内连续行的 N(>=2) 个 body cell 节点）
// 算法（严格保持纯按列布局，不动任何右侧列）：
//   ① 计算 totalHeight = Σ cellHeight + (N-1) * column.itemSpacing
//      —— anchor 拉高后正好吸收原本 N-1 个 spacing 的纵向空间
//   ② anchor 留在 auto-layout 流内（layoutPositioning='AUTO'）：
//      - layoutSizingVertical = 'FIXED'
//      - resize(width, totalHeight)
//   ③ 把 startIndex+1..endIndex 的 N-1 个 cell 设 visible=false
//      —— Figma auto-layout 会自动跳过 visible=false 的 child 以及它前后的 spacing
//      所以 column 整体的"行节奏"和原始一致，与右侧列完美对齐
//   ④ 右侧列完全不动
//
// 反向取消合并请走 unmergeAnchorCell。
// ---------------------------------------------------------------------------

interface MergeSelectionPlan {
  table: FrameNode;
  columns: FrameNode[];
  targetColumnIndex: number;
  startIndex: number;
  endIndex: number;
  existingAnchor?: SceneNode;
}

function resolveSelectionColumn(node: SceneNode): FrameNode | null {
  let cur: BaseNode | null = node.parent;
  while (cur && cur.type !== 'PAGE') {
    if (cur.type === 'FRAME' && (cur as FrameNode).getPluginData('component-id') === 'table-column') {
      return cur as FrameNode;
    }
    cur = cur.parent;
  }
  return null;
}

function resolveMergeSpanForNode(
  node: SceneNode,
  column: FrameNode
): { anchor: SceneNode; startIndex: number; endIndex: number } | null {
  const role = node.getPluginData('merge-role');
  if (role !== 'merge-anchor' && role !== 'merge-hidden') return null;

  let anchor: SceneNode | null = null;
  if (role === 'merge-anchor') {
    anchor = node;
  } else {
    const anchorId = node.getPluginData('merge-anchor-id');
    if (anchorId) {
      const found = column.children.find((child) => child.id === anchorId);
      if (found) anchor = found as SceneNode;
    }
  }
  if (!anchor || anchor.removed || anchor.parent !== column) return null;

  const anchorIndex = column.children.indexOf(anchor);
  if (anchorIndex < 0) return null;
  const startIndexRaw = Number(anchor.getPluginData('merge-start-index'));
  const endIndexRaw = Number(anchor.getPluginData('merge-end-index'));
  const startIndex = Number.isFinite(startIndexRaw) && startIndexRaw >= 0 ? startIndexRaw : anchorIndex;
  const endIndex = Number.isFinite(endIndexRaw) && endIndexRaw >= startIndex ? endIndexRaw : anchorIndex;
  return { anchor, startIndex, endIndex };
}

function resolvePlanFromSelection(cellNodes: SceneNode[]): { ok: true; plan: MergeSelectionPlan } | { ok: false; reason: string } {
  if (!Array.isArray(cellNodes) || cellNodes.length < 2) {
    return { ok: false, reason: '请至少选中 2 个单元格。' };
  }

  let column: FrameNode | null = null;
  const coveredIndices = new Set<number>();
  const encounteredAnchorIds = new Set<string>();
  let existingAnchor: SceneNode | undefined;

  for (const cellNode of cellNodes) {
    const currentColumn = resolveSelectionColumn(cellNode);
    if (!currentColumn) {
      return { ok: false, reason: '只能合并表格同一列中的 body 单元格。' };
    }
    if (!column) {
      column = currentColumn;
    } else if (column !== currentColumn) {
      return { ok: false, reason: '只能合并同一列中的连续单元格。' };
    }
  }
  if (!column) {
    return { ok: false, reason: '未能定位当前选区所在列。' };
  }

  const table = column.parent;
  if (!table || table.type !== 'FRAME') {
    return { ok: false, reason: '当前列不属于有效的表格结构。' };
  }
  const columns = getTableColumns(table as FrameNode);
  if (columns.length === 0) {
    return { ok: false, reason: '未能定位当前表格的列结构。' };
  }
  const targetColumnIndex = columns.indexOf(column);
  if (targetColumnIndex < 0) {
    return { ok: false, reason: '当前选区不在有效表格列中。' };
  }

  const offset = getTableHeaderOffset(column);
  for (const cellNode of cellNodes) {
    if (cellNode.parent !== column) {
      return { ok: false, reason: '只能合并同一列中的连续单元格。' };
    }
    const mergeSpan = resolveMergeSpanForNode(cellNode, column);
    if (mergeSpan) {
      if (mergeSpan.startIndex < offset) {
        return { ok: false, reason: '表头区域不支持手动合并。' };
      }
      encounteredAnchorIds.add(mergeSpan.anchor.id);
      if (!existingAnchor) existingAnchor = mergeSpan.anchor;
      for (let idx = mergeSpan.startIndex; idx <= mergeSpan.endIndex; idx += 1) {
        coveredIndices.add(idx);
      }
      continue;
    }

    const idx = column.children.indexOf(cellNode);
    if (idx < offset) {
      return { ok: false, reason: '表头区域不支持手动合并。' };
    }
    coveredIndices.add(idx);
  }

  if (encounteredAnchorIds.size > 1) {
    return { ok: false, reason: '暂不支持把多个已合并块再次合并，请先取消其中一个合并。' };
  }

  const indices = Array.from(coveredIndices).sort((a, b) => a - b);
  if (indices.length < 2) {
    return { ok: false, reason: '请选中同一列里连续的至少 2 个 body 单元格。' };
  }
  for (let i = 1; i < indices.length; i += 1) {
    if (indices[i] !== indices[i - 1] + 1) {
      return { ok: false, reason: '只能合并同一列中的连续单元格。' };
    }
  }
  return {
    ok: true,
    plan: {
      table: table as FrameNode,
      columns,
      targetColumnIndex,
      startIndex: indices[0],
      endIndex: indices[indices.length - 1],
      ...(existingAnchor ? { existingAnchor } : {})
    }
  };
}

function getCellHeight(cell: SceneNode): number {
  if ('height' in cell) return Math.max(0, Math.round((cell as any).height));
  return 40;
}

export function mergeSelectedColumnCells(cellNodes: SceneNode[]): {
  ok: boolean;
  reason?: string;
  anchorCell?: SceneNode;
} {
  const resolved = resolvePlanFromSelection(cellNodes);
  if (!resolved.ok) {
    return {
      ok: false,
      reason: resolved.reason
    };
  }
  const plan = resolved.plan;
  const { columns, targetColumnIndex, startIndex, endIndex } = plan;
  const targetColumn = columns[targetColumnIndex];
  const segLen = endIndex - startIndex + 1;

  if (plan.existingAnchor) {
    const resetResult = unmergeAnchorCell(plan.existingAnchor);
    if (!resetResult.ok) {
      return {
        ok: false,
        reason: resetResult.reason || '未能重置已有合并单元格。'
      };
    }
  }

  // 检查范围内是否仍存在其他合并标记，避免重复合并造成错乱
  for (let r = startIndex; r <= endIndex; r += 1) {
    const child = targetColumn.children[r];
    if (!child) continue;
    const role = child.getPluginData('merge-role');
    if (role === 'merge-anchor' || role === 'merge-hidden') {
      return {
        ok: false,
        reason: '所选范围内仍存在其他合并单元格，请先取消已有合并。'
      };
    }
  }

  // ① 计算 totalHeight
  const itemSpacing = Math.max(0, Number(targetColumn.itemSpacing) || 0);
  let sumHeights = 0;
  for (let r = startIndex; r <= endIndex; r += 1) {
    const child = targetColumn.children[r];
    if (child) sumHeights += getCellHeight(child);
  }
  const totalHeight = Math.max(1, sumHeights + (segLen - 1) * itemSpacing);

  // ② 锚定 anchor —— 先记录原始几何，但暂不调整高度
  const anchor = targetColumn.children[startIndex];
  if (!anchor) return { ok: false, reason: '未找到母体单元格' };

  const originalHeight = getCellHeight(anchor);
  const originalSizingV: string | null = ('layoutSizingVertical' in anchor)
    ? String((anchor as any).layoutSizingVertical || '')
    : null;
  const originalLayoutAlign: string | null = ('layoutAlign' in anchor)
    ? String((anchor as any).layoutAlign || '')
    : null;

  // 合并前记录 column 总高度，作为目标基准
  const columnHeightBefore = Math.max(0, Math.round((targetColumn as any).height || 0));

  // 写入 plugin data（在动 height 前写好，方便取消时读到）
  anchor.setPluginData('merge-role', 'merge-anchor');
  anchor.setPluginData('merge-row-span', String(segLen));
  anchor.setPluginData('merge-start-index', String(startIndex));
  anchor.setPluginData('merge-end-index', String(endIndex));
  anchor.setPluginData('merge-original-height', String(originalHeight));
  if (originalSizingV) anchor.setPluginData('merge-original-sizing-v', originalSizingV);
  if (originalLayoutAlign) anchor.setPluginData('merge-original-layout-align', originalLayoutAlign);

  // ③ 先隐藏 startIndex+1..endIndex 的 N-1 个 cell（anchor 暂不动高度）
  //    这样隐藏完成后，column 缩短的精确像素 = anchor 真正需要承担的补偿值
  const hiddenIds: string[] = [];
  for (let r = startIndex + 1; r <= endIndex; r += 1) {
    const child = targetColumn.children[r];
    if (!child) continue;
    try { (child as any).visible = false; } catch {}
    child.setPluginData('merge-role', 'merge-hidden');
    child.setPluginData('merge-anchor-id', anchor.id);
    hiddenIds.push(child.id);
  }
  anchor.setPluginData('merge-hidden-ids', JSON.stringify(hiddenIds));

  // ④ 读取隐藏后的 column 高度，把缩短量精确补到 anchor 上
  //    无论 Figma 对 visible=false 的 spacing 处理如何（跳过/保留/部分），
  //    都靠这个"实测差额"修正，保证 column 总高度严格 = columnHeightBefore。
  let columnHeightAfter = Math.max(0, Math.round((targetColumn as any).height || 0));
  let shrink = columnHeightBefore - columnHeightAfter;
  // 若 column 是 STRETCH/FILL 模式，column.height 不会随内容缩短 → fallback：
  // 用理论值 totalHeight 作为 anchor 目标（与原始 N 个 cell 占的连续空间一致）。
  let anchorTargetHeight: number;
  if (Math.abs(shrink) < 0.5) {
    anchorTargetHeight = totalHeight;
  } else {
    anchorTargetHeight = Math.max(1, originalHeight + shrink);
  }

  try { (anchor as any).layoutPositioning = 'AUTO'; } catch {}
  try {
    if ('layoutSizingVertical' in anchor) (anchor as any).layoutSizingVertical = 'FIXED';
  } catch {}
  if ('resize' in anchor) {
    const w = Math.max(1, Math.round((anchor as any).width || targetColumn.width));
    (anchor as any).resize(w, anchorTargetHeight);
  }

  // ⑤ 二次精校：若 column 此时仍偏离 columnHeightBefore，按差额再补一次
  try {
    columnHeightAfter = Math.max(0, Math.round((targetColumn as any).height || 0));
    shrink = columnHeightBefore - columnHeightAfter;
    if (Math.abs(shrink) > 0.5 && 'resize' in anchor) {
      const w = Math.max(1, Math.round((anchor as any).width || targetColumn.width));
      (anchor as any).resize(w, Math.max(1, anchorTargetHeight + shrink));
    }
  } catch {}

  // ⑥ 右侧列完全不动

  return { ok: true, anchorCell: anchor };
}

// ---------------------------------------------------------------------------
// unmergeAnchorCell —— 反向取消"绝对定位悬浮母体"合并
// 输入：母体 cell（带 merge-role=merge-anchor 的 plugin data）
// ---------------------------------------------------------------------------
export function unmergeAnchorCell(anchor: SceneNode): {
  ok: boolean;
  reason?: string;
} {
  if (anchor.getPluginData('merge-role') !== 'merge-anchor') {
    return { ok: false, reason: '该单元格不是合并锚点' };
  }
  const column = anchor.parent;
  if (!column || column.type !== 'FRAME') {
    return { ok: false, reason: '锚点单元格的父级列不存在' };
  }

  // 1. 恢复母体几何
  try { (anchor as any).layoutPositioning = 'AUTO'; } catch {}
  const originalHeight = Number(anchor.getPluginData('merge-original-height') || '0') || 0;
  if (originalHeight > 0 && 'resize' in anchor) {
    const w = Math.max(1, Math.round((anchor as any).width || (column as FrameNode).width));
    (anchor as any).resize(w, originalHeight);
  }
  const originalSizingV = anchor.getPluginData('merge-original-sizing-v');
  if (originalSizingV && 'layoutSizingVertical' in anchor) {
    try { (anchor as any).layoutSizingVertical = originalSizingV; } catch {}
  }
  const originalLayoutAlign = anchor.getPluginData('merge-original-layout-align');
  if (originalLayoutAlign && 'layoutAlign' in anchor) {
    try { (anchor as any).layoutAlign = originalLayoutAlign; } catch {}
  }

  // 2. 恢复隐藏占位
  let hiddenIds: string[] = [];
  try {
    const raw = anchor.getPluginData('merge-hidden-ids');
    if (raw) hiddenIds = JSON.parse(raw);
  } catch {}
  for (const id of hiddenIds) {
    const node = (column as FrameNode).children.find((c) => c.id === id);
    if (!node) continue;
    try { (node as any).visible = true; } catch {}
    node.setPluginData('merge-role', '');
    node.setPluginData('merge-anchor-id', '');
  }

  // 3. 清理母体 plugin data
  anchor.setPluginData('merge-role', '');
  anchor.setPluginData('merge-row-span', '');
  anchor.setPluginData('merge-start-index', '');
  anchor.setPluginData('merge-end-index', '');
  anchor.setPluginData('merge-original-y', '');
  anchor.setPluginData('merge-original-height', '');
  anchor.setPluginData('merge-original-sizing-v', '');
  anchor.setPluginData('merge-original-layout-align', '');
  anchor.setPluginData('merge-hidden-ids', '');

  return { ok: true };
}
