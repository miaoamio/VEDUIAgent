import { ComponentInstance } from './types';
import { COMPONENT_REGISTRY } from './registry';
import { getDefaultParams } from './registry.helpers';
import type { ComponentDefinition } from './registry.types';
import { FULL_RERENDER_COMPONENT_IDS } from './editability';
import { applyEnvelopeUnknown } from './engine/applyEnvelope';
import {
  createFigmaComponentInstance,
  discoverFigmaComponentSchema,
  inspectFigmaComponentStructure,
  parseVariantCriteria,
  VariantCriteria
} from './figmaComponent';
import { resolveColorTokenProfile } from './theme.color-tokens';
import { resolveTypographyTokenProfile } from './theme.typography-tokens';
import {
  BASE_COMPONENT_TOKEN_PACK,
  SEMANTIC_COMPONENT_TOKEN_PACK,
  resolveComponentTokenProfile
} from './theme.component-tokens';
import { createInspectDrivenTagFallbackNode } from './tag.fallback';

const COMPONENT_DEFS = COMPONENT_REGISTRY.components;

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 398, height: 680 });

const FONT_LOAD_CACHE = new Map<string, Promise<void>>();
const FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE = new Map<string, InstanceNode>();
const TAG_TEMPLATE_CACHE = new Map<string, SceneNode>();
const TABLE_CELL_PREWARM_STATE = {
  scheduled: false,
  inFlight: false,
  warmedFonts: false,
  warmedTokens: new Set<string>(),
  warmedDefaultTag: false
};

const TABLE_CELL_PREWARM_TOKENS = [
  'table.cell.icon.edit',
  'table.cell.icon.delete',
  'table.cell.icon.actionMore',
  'lib-data-display-avataricon',
  'table.header.icon',
  'table.rowAction.text',
  'table.rowAction.checkbox',
  'table.rowAction.radio',
  'table.rowAction.drag',
  'table.rowAction.expand',
  'table.rowAction.switch',
  'table.rowAction.header'
];

function loadFontCached(font: FontName): Promise<void> {
  const key = `${font.family}:${font.style}`;
  const cached = FONT_LOAD_CACHE.get(key);
  if (cached) return cached;
  const pending = figma.loadFontAsync(font).catch((e) => {
    console.warn('[Font] failed to load', font, e);
  });
  FONT_LOAD_CACHE.set(key, pending);
  return pending;
}

async function ensureInterFontsLoaded(): Promise<void> {
  await Promise.all([
    loadFontCached({ family: 'Inter', style: 'Regular' }),
    loadFontCached({ family: 'Inter', style: 'Bold' }),
    loadFontCached({ family: 'Inter', style: 'Medium' })
  ]);
}

function serializeVariantCriteria(
  criteria?: VariantCriteria | Record<string, string> | ((variant: ComponentNode) => boolean)
): string | null {
  if (!criteria) return '';
  if (typeof criteria === 'function') return null;
  const keys = Object.keys(criteria).sort();
  if (keys.length === 0) return '';
  try {
    return JSON.stringify(criteria, keys);
  } catch {
    return null;
  }
}

function buildTokenCacheKey(
  token: string,
  criteria?: VariantCriteria | ((variant: ComponentNode) => boolean)
): string | null {
  const serialized = serializeVariantCriteria(criteria);
  if (serialized === null) return null;
  return serialized ? `${token}::${serialized}` : token;
}

function buildTagTemplateCacheKey(componentKey: string, criteria?: Record<string, string>): string {
  const serialized = serializeVariantCriteria(criteria);
  if (!serialized) return `${componentKey}::default`;
  return `${componentKey}::${serialized}`;
}

async function prewarmTableCellAssets(): Promise<void> {
  if (TABLE_CELL_PREWARM_STATE.inFlight) return;
  TABLE_CELL_PREWARM_STATE.inFlight = true;
  try {
    if (!TABLE_CELL_PREWARM_STATE.warmedFonts) {
      await ensureInterFontsLoaded();
      TABLE_CELL_PREWARM_STATE.warmedFonts = true;
    }

    for (const token of TABLE_CELL_PREWARM_TOKENS) {
      if (TABLE_CELL_PREWARM_STATE.warmedTokens.has(token)) continue;
      const instance = await createFigmaComponentInstanceByToken(token, { visible: false });
      if (instance) {
        try {
          instance.visible = false;
          instance.x = -100000;
          instance.y = -100000;
        } catch {}
        try {
          instance.remove();
        } catch {}
      }
      TABLE_CELL_PREWARM_STATE.warmedTokens.add(token);
    }

    if (!TABLE_CELL_PREWARM_STATE.warmedDefaultTag) {
      const tagDefaults = getDefaultParams('table-cell-tag');
      if (tagDefaults && COMPONENT_DEFS['tag']) {
        const normalizedTagParams = buildTableCellTagParams(tagDefaults);
        const templateNode = await createTagFromFigmaTemplate(COMPONENT_DEFS['tag'], normalizedTagParams);
        if (templateNode) {
          try {
            templateNode.visible = false;
            templateNode.x = -100000;
            templateNode.y = -100000;
          } catch {}
          try {
            templateNode.remove();
          } catch {}
        }
      }
      TABLE_CELL_PREWARM_STATE.warmedDefaultTag = true;
    }
  } finally {
    TABLE_CELL_PREWARM_STATE.inFlight = false;
  }
}

function scheduleTableCellPrewarm(): void {
  if (TABLE_CELL_PREWARM_STATE.scheduled || TABLE_CELL_PREWARM_STATE.inFlight) return;
  TABLE_CELL_PREWARM_STATE.scheduled = true;
  setTimeout(() => {
    TABLE_CELL_PREWARM_STATE.scheduled = false;
    void prewarmTableCellAssets();
  }, 0);
}

function findAiComponentNode(node: SceneNode | null): SceneNode | null {
  let current: BaseNode | null = node;
  while (current && current.type !== 'PAGE') {
    if ('getPluginData' in current && current.getPluginData('is-ai-component') === 'true') {
      return current as SceneNode;
    }
    current = current.parent;
  }
  return null;
}

type CanvasHint = 'table' | 'form' | 'chart' | 'mixed';

// Helper to check selection and notify UI
function checkSelection() {
  const selection = figma.currentPage.selection;
  const canvasHint: CanvasHint = 'mixed';
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'selection-cleared', data: { count: 0, canvasHint } });
    return;
  }
  if (selection.length > 1) {
    figma.ui.postMessage({ type: 'selection-multi-update', data: { count: selection.length, canvasHint } });
    return;
  }
  if (selection.length === 1) {
    const node = selection[0];
    const targetNode =
      node.getPluginData('is-ai-component') === 'true' ? node : findAiComponentNode(node);
    if (targetNode && targetNode.getPluginData('is-ai-component') === 'true') {
      const componentId = targetNode.getPluginData('component-id');
      const params = targetNode.getPluginData('params');
      if (componentId && params) {
        let childComponentId;
        if (componentId === 'table-column' && targetNode.type === 'FRAME') {
            const storedCellType = targetNode.getPluginData('cellType');
            if (storedCellType) {
                childComponentId = storedCellType;
            } else {
                const firstCell = targetNode.children.find(child => {
                    const cid = child.getPluginData('component-id');
                    return cid && cid !== 'table-header-cell';
                });
                if (firstCell) {
                    childComponentId = firstCell.getPluginData('component-id');
                }
            }
        }

        const parsedParams = JSON.parse(params);
        const normalizedParams =
          componentId === 'tag'
            ? normalizeUnifiedTagParams(parsedParams)
            : parsedParams;

        if (isTableCellComponentId(componentId)) {
          const column = findTableColumnFromNode(targetNode);
          if (column) {
            const columnParams = readNodeParams(column);
            const merged = { ...columnParams, ...normalizedParams };
            normalizedParams.columnWidthMode = merged.columnWidthMode ?? normalizedParams.columnWidthMode;
            normalizedParams.width = merged.width ?? normalizedParams.width;
            normalizedParams.textAlign = merged.textAlign ?? normalizedParams.textAlign;
            normalizedParams.textDisplay = merged.textDisplay ?? normalizedParams.textDisplay;
          }
        }

        if (componentId.startsWith('table')) {
          scheduleTableCellPrewarm();
        }

        figma.ui.postMessage({ 
          type: 'selection-update', 
          data: {
            selectionCount: selection.length,
            canvasHint,
            componentId,
            params: normalizedParams,
            childComponentId, // Optional: for columns
            nodeName: targetNode.name
          }
        });
        return;
      }
    }
  }
  // Clear selection if not an AI container
  figma.ui.postMessage({ type: 'selection-cleared', data: { count: 0, canvasHint } });
}

// Listen for selection changes
figma.on('selectionchange', checkSelection);

let tableRowSyncInProgress = false;
let tableRowSyncTimer: number | null = null;
let pendingTableRowSync = new Map<
  string,
  { table: FrameNode; rowIndex: number; sourceNodes: SceneNode[] }
>();

figma.on('documentchange', async (event) => {
  if (tableRowSyncInProgress) return;

  for (const change of event.documentChanges) {
    if (change.type !== 'PROPERTY_CHANGE') continue;
    const node = change.node;
    if (!node || node.removed) continue;

    const properties = change.properties || [];
    const isSizeChange = properties.includes('height') || properties.includes('width') || properties.includes('size') || properties.includes('resize');
    if (!isSizeChange) continue;

    const cell = findTableCellFromNode(node);
    if (!cell) continue;
    const column = cell.parent;
    if (!isTableColumnNode(column)) continue;
    const table = findTableFrameFromNode(column);
    if (!table) continue;

    const rowIndex = column.children.indexOf(cell as SceneNode);
    if (rowIndex < 0) continue;

    const key = `${table.id}:${rowIndex}`;
    const existing = pendingTableRowSync.get(key);
    if (existing) {
      if (!existing.sourceNodes.includes(cell)) {
        existing.sourceNodes.push(cell);
      }
    } else {
      pendingTableRowSync.set(key, { table, rowIndex, sourceNodes: [cell] });
    }
  }

  if (pendingTableRowSync.size === 0) return;
  if (tableRowSyncTimer !== null) return;
  tableRowSyncTimer = setTimeout(() => {
    tableRowSyncInProgress = true;
    const rowsToSync = pendingTableRowSync;
    pendingTableRowSync = new Map();
    tableRowSyncTimer = null;
    try {
      for (const { table, rowIndex, sourceNodes } of rowsToSync.values()) {
        alignTableRowHeights(table, rowIndex, sourceNodes);
      }
    } finally {
      tableRowSyncInProgress = false;
    }
  }, 120);
});

// Define Theme Tokens
const THEME_TOKENS: { [key: string]: { light: string, dark: string } } = {
    'bg-base': { light: '#FFFFFF', dark: '#1F1F1F' },
    'bg-secondary': { light: '#F5F5F5', dark: '#2C2C2C' },
    'text-primary': { light: '#0C0D0E', dark: '#FFFFFF' },
    'text-secondary': { light: '#42464E', dark: '#A0A0A0' },
    'border-base': { light: '#EAEDF1', dark: '#333333' },
    'brand-primary': { light: '#1664FF', dark: '#3D7EFF' },
    'success-bg': { light: '#F6FFED', dark: '#135200' },
    'success-text': { light: '#52C41A', dark: '#73D13D' }
};

const THEME_CONSTANTS: { [key: string]: { [key: string]: number } } = {
    'input': {
        'cornerRadius': 6,
        'paddingLeft': 12,
        'paddingRight': 12,
        'fontSize': 13
    },
    'button': {
        'cornerRadius': 6,
        'paddingTop': 8,
        'paddingBottom': 8,
        'paddingLeft': 16,
        'paddingRight': 16,
        'fontSize': 13
    },
    'card': {
        'cornerRadius': 8,
        'padding': 20
    }
};

const TABLE_DEFAULT_HEADER_HEIGHT = 40;
const TABLE_DEFAULT_BODY_HEIGHT = 40;
const TABLE_SIZE_PRESETS: Record<string, number> = {
    mini: 32,
    default: 40,
    medium: 48,
    large: 56
};
const FORM_FIELD_HORIZONTAL_COMPONENT_KEY = '621ab3ad5d95d291cb6d31438dbad667594ae098';

function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveTableSizeHeight(params: Record<string, any>): number | null {
    const size = typeof params.size === 'string' ? params.size.trim().toLowerCase() : '';
    const height = TABLE_SIZE_PRESETS[size];
    return typeof height === 'number' ? height : null;
}

function resolveTableHeaderHeight(params: Record<string, any>): number {
    return resolveTableSizeHeight(params)
        ?? toPositiveNumber(params.height)
        ?? toPositiveNumber(params.headerHeight)
        ?? TABLE_DEFAULT_HEADER_HEIGHT;
}

function resolveTableBodyHeight(params: Record<string, any>): number {
    return resolveTableSizeHeight(params)
        ?? toPositiveNumber(params.height)
        ?? toPositiveNumber(params.bodyHeight)
        ?? toPositiveNumber(params.rowHeight)
        ?? TABLE_DEFAULT_BODY_HEIGHT;
}

const TABLE_CELL_COMPONENT_PREFIX = 'table-cell';

type TableHeaderElementType = 'none' | 'filter' | 'sort' | 'search' | 'info';

const TABLE_HEADER_ICON_PLUGIN_KEY = 'table-header-icon-type';

function normalizeTableHeaderElementType(value: unknown): TableHeaderElementType {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw || raw === 'none') return 'none';
    if (raw === 'filter') return 'filter';
    if (raw === 'sort') return 'sort';
    if (raw === 'search') return 'search';
    if (raw === 'info') return 'info';
    return 'none';
}

function getTableHeaderIconTypeCandidates(type: TableHeaderElementType): string[] {
    if (type === 'filter') return ['Filter 筛选', 'Filter', '筛选'];
    if (type === 'sort') return ['Sort 排序', 'Sort', '排序', 'S\bort 排序'];
    if (type === 'search') return ['Search 搜索', 'Search', 'search', 'search 搜索', '搜索'];
    if (type === 'info') return ['info-circle 提示', 'Info', 'Info 提示', '提示', 'info'];
    return [];
}

const TABLE_HEADER_ICON_STATE_CANDIDATES = ['Default 默认', 'Default', '默认'];

function tryApplyTableHeaderIconVariant(instance: InstanceNode, type: TableHeaderElementType): void {
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

async function createTableHeaderIconInstance(type: TableHeaderElementType): Promise<InstanceNode | null> {
    if (type === 'none') return null;
    const icon = await createFigmaComponentInstanceByToken('table.header.icon');
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

function findTableHeaderIconInstance(headerCell: FrameNode): InstanceNode | null {
    const icon = headerCell.children.find(
        (child) => child.type === 'INSTANCE' && child.getPluginData(TABLE_HEADER_ICON_PLUGIN_KEY)
    );
    return icon && icon.type === 'INSTANCE' ? (icon as InstanceNode) : null;
}

function findDirectTextChild(node: FrameNode): TextNode | null {
    const text = node.children.find((child) => child.type === 'TEXT');
    return text && text.type === 'TEXT' ? (text as TextNode) : null;
}

async function applyTableHeaderElementToHeaderCell(
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
        iconToUse = await createTableHeaderIconInstance(desired);
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

function isTableCellComponentId(componentId?: string | null): boolean {
    if (!componentId) return false;
    return componentId === 'table-header-cell' || componentId.startsWith(TABLE_CELL_COMPONENT_PREFIX);
}

function isTableColumnNode(node: BaseNode | null | undefined): node is FrameNode {
    return !!node && node.type === 'FRAME' && node.getPluginData('component-id') === 'table-column';
}

function isTableNode(node: BaseNode | null | undefined): node is FrameNode {
    return !!node && node.type === 'FRAME' && node.getPluginData('component-id') === 'table';
}

function isCellLikeNode(node: SceneNode | null | undefined): boolean {
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

function looksLikeTableColumnFrame(node: SceneNode | null | undefined): node is FrameNode {
    if (!node || node.removed) return false;
    if (node.type !== 'FRAME') return false;
    if (node.layoutMode !== 'VERTICAL') return false;
    if (node.children.length < 2) return false;
    const cellLikeCount = node.children.filter((child) => isCellLikeNode(child as SceneNode)).length;
    return cellLikeCount >= Math.max(2, Math.floor(node.children.length * 0.5));
}

function findTableFrameFromNode(node: BaseNode | null | undefined): FrameNode | null {
    let current = node;
    while (current && current.type !== 'PAGE') {
        if (isTableNode(current)) return current;
        current = current.parent;
    }
    return null;
}

function findTableCellFromNode(node: BaseNode | null | undefined): FrameNode | InstanceNode | null {
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

function getTableColumns(table: FrameNode): FrameNode[] {
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

function hasDirectTableColumns(node: FrameNode): boolean {
    return node.children.some((child) => {
        // Exclude managed table parts (filter, pagination, stack) from column detection
        if ('getPluginData' in child && child.getPluginData('table-role')) return false;
        return isTableColumnNode(child) || looksLikeTableColumnFrame(child as SceneNode);
    });
}

function resolveTableContentFrame(table: FrameNode): FrameNode {
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

function findPaginationRow(tableRoot: FrameNode): FrameNode | null {
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

async function ensurePaginationRow(tableRoot: FrameNode, width: number) {
    const existing = findPaginationRow(tableRoot);
    if (existing) {
        existing.visible = true;
        existing.fills = [];
        existing.clipsContent = false;
        existing.layoutAlign = 'STRETCH';
        existing.primaryAxisAlignItems = 'MAX';
        existing.primaryAxisSizingMode = 'FIXED';
        existing.counterAxisSizingMode = 'AUTO';
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

    const paginationNode = await renderComponent({
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

function removePaginationRow(tableRoot: FrameNode) {
    const existing = findPaginationRow(tableRoot);
    if (!existing) return;
    try {
        existing.remove();
    } catch {
        // ignore
    }
}

function findTableContentStack(tableRoot: FrameNode): FrameNode | null {
    const existing = tableRoot.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'content-stack'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

function ensureTableContentStack(tableRoot: FrameNode, tableContent: FrameNode): FrameNode {
    const width = tableContent.width;
    let stack = findTableContentStack(tableRoot);
    if (!stack) {
        stack = figma.createFrame();
        stack.setPluginData('table-role', 'content-stack');
        stack.name = 'Table Content';
        stack.layoutMode = 'VERTICAL';
        stack.primaryAxisSizingMode = 'AUTO';
        stack.counterAxisSizingMode = 'FIXED';
        stack.itemSpacing = 20;
        stack.layoutAlign = 'STRETCH';
        stack.fills = [];
        stack.clipsContent = false;
        stack.resize(width, 1);
        // Some Figma versions reset sizing modes when resize() is called.
        stack.primaryAxisSizingMode = 'AUTO';
        stack.counterAxisSizingMode = 'FIXED';
        if ('layoutSizingHorizontal' in stack) {
            try {
                (stack as any).layoutSizingHorizontal = 'FILL';
            } catch {
                // ignore
            }
        }
        if ('layoutSizingVertical' in stack) {
            try {
                (stack as any).layoutSizingVertical = 'HUG';
            } catch {
                // ignore
            }
        }

        const paginationRow = findPaginationRow(tableRoot);
        const insertionIndex = paginationRow ? tableRoot.children.indexOf(paginationRow) : tableRoot.children.length;
        tableRoot.insertChild(insertionIndex >= 0 ? insertionIndex : tableRoot.children.length, stack);
    } else {
        // Keep stack config stable.
        stack.layoutMode = 'VERTICAL';
        stack.primaryAxisSizingMode = 'AUTO';
        stack.counterAxisSizingMode = 'FIXED';
        stack.itemSpacing = 20;
        stack.layoutAlign = 'STRETCH';
        stack.fills = [];
        stack.clipsContent = false;
        if (Number.isFinite(width) && width > 0) {
            try {
                stack.resize(width, stack.height);
            } catch {
                // ignore
            }
        }
        if ('layoutSizingHorizontal' in stack) {
            try {
                (stack as any).layoutSizingHorizontal = 'FILL';
            } catch {
                // ignore
            }
        }
        if ('layoutSizingVertical' in stack) {
            try {
                (stack as any).layoutSizingVertical = 'HUG';
            } catch {
                // ignore
            }
        }
    }

    if (tableContent.parent !== stack) {
        try {
            stack.appendChild(tableContent);
        } catch {
            // ignore
        }
    }

    // Ensure the inner table expands horizontally inside the stack.
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

    return stack;
}

function findManagedTableFilterGroup(contentStack: FrameNode): FrameNode | null {
    const existing = contentStack.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

function findManagedTableFilterGroupInParent(parent: FrameNode): FrameNode | null {
    const existing = parent.children.find(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

async function ensureTableFilterGroup(contentStack: FrameNode, width: number, filterTexts?: string) {
    const existing = findManagedTableFilterGroup(contentStack);
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
            }
        }
        if ('layoutSizingHorizontal' in existing) {
            try {
                (existing as any).layoutSizingHorizontal = 'FILL';
            } catch {
            }
        }
        if ('layoutSizingVertical' in existing) {
            try {
                (existing as any).layoutSizingVertical = 'HUG';
            } catch {
            }
        }
        
        // Update params if filterTexts is provided
        if (filterTexts) {
            const currentParams = readNodeParams(existing);
            if (currentParams.itemsText !== filterTexts) {
                 const newParams = { ...currentParams, itemsText: filterTexts };
                 // Re-render the filter group content
                 const replacement = await renderComponent({
                    id: existing.getPluginData('component-id') || `filter-${Date.now()}`,
                    componentId: 'filter-group',
                    params: newParams
                 }, { isRoot: false });
                 
                 // Copy properties to replacement
                 replacement.layoutAlign = 'STRETCH';
                 if ('layoutSizingHorizontal' in replacement) (replacement as any).layoutSizingHorizontal = 'FILL';
                 if ('layoutSizingVertical' in replacement) (replacement as any).layoutSizingVertical = 'HUG';
                 try { replacement.setPluginData('table-role', 'filter-group'); } catch {}
                 
                 // Replace existing
                 const index = contentStack.children.indexOf(existing);
                 contentStack.insertChild(index, replacement);
                 existing.remove();
                 return;
            }
        }

        const index = contentStack.children.indexOf(existing);
        if (index > 0) {
            try {
                contentStack.insertChild(0, existing);
            } catch {
                // ignore
            }
        }
        return;
    }

    const filterNode = await renderComponent(
        {
            id: `table-filter-${Date.now()}`,
            componentId: 'filter-group',
            params: { width, ...(filterTexts ? { itemsText: filterTexts } : {}) }
        },
        { isRoot: false }
    );

    try {
        filterNode.setPluginData('table-role', 'filter-group');
    } catch {
    }
    if (filterNode.type === 'FRAME') {
        filterNode.layoutAlign = 'STRETCH';
        if ('layoutSizingHorizontal' in filterNode) {
            try {
                (filterNode as any).layoutSizingHorizontal = 'FILL';
            } catch {
            }
        }
        if ('layoutSizingVertical' in filterNode) {
            try {
                (filterNode as any).layoutSizingVertical = 'HUG';
            } catch {
            }
        }
    }

    contentStack.insertChild(0, filterNode);
}

async function ensureTableFilterGroupInParent(parent: FrameNode, tableRoot: FrameNode, width: number) {
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

    const filterNode = await renderComponent(
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

function removeTableFilterGroup(contentStack: FrameNode) {
    const nodes = contentStack.children.filter(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
    ) as FrameNode[];
    for (const node of nodes) {
        try {
            node.remove();
        } catch {
        }
    }
}

function removeTableFilterGroupFromParent(parent: FrameNode) {
    const nodes = parent.children.filter(
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'filter-group'
    ) as FrameNode[];
    for (const node of nodes) {
        try {
            node.remove();
        } catch {
            // ignore
        }
    }
}

function clearNodeStrokes(node: SceneNode) {
    try {
        if ('strokes' in node) {
            (node as any).strokes = [];
        }
        if ('strokeWeight' in node) {
            (node as any).strokeWeight = 0;
        }
        if ('strokeTopWeight' in node) {
            (node as any).strokeTopWeight = 0;
        }
        if ('strokeRightWeight' in node) {
            (node as any).strokeRightWeight = 0;
        }
        if ('strokeBottomWeight' in node) {
            (node as any).strokeBottomWeight = 0;
        }
        if ('strokeLeftWeight' in node) {
            (node as any).strokeLeftWeight = 0;
        }
    } catch {
        // ignore
    }
}

function createTableWrapperFromTableFrame(tableFrame: FrameNode, params: Record<string, any>): FrameNode | null {
    // Prevent re-wrapping if the frame is already a wrapper (has managed children)
    if (tableFrame.children.some((child) => 
        child.type === 'FRAME' && 
        ['filter-group', 'content-stack', 'pagination-row'].includes(child.getPluginData('table-role'))
    )) {
        return tableFrame;
    }

    const parent = tableFrame.parent;
    if (!parent || !('insertChild' in parent) || !('children' in parent)) return null;

    const wrapper = figma.createFrame();
    wrapper.name = tableFrame.name;
    wrapper.layoutMode = 'VERTICAL';
    wrapper.primaryAxisSizingMode = 'AUTO';
    wrapper.counterAxisSizingMode = 'FIXED';
    wrapper.itemSpacing = 16;
    wrapper.fills = [];
    wrapper.clipsContent = false;
    wrapper.layoutAlign = tableFrame.layoutAlign;
    wrapper.resize(tableFrame.width, 1);
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

    lockGeneratedContainerNode(wrapper, 'table');

    return wrapper;
}

function alignTableRowHeights(table: FrameNode, rowIndex: number, sourceNodes: SceneNode[] = []) {
    const columns = getTableColumns(table);
    if (columns.length === 0) return;

    let maxHeight = 0;

    // Prefer heights from nodes that actually changed. This allows shrinking rows.
    if (sourceNodes.length > 0) {
        for (const node of sourceNodes) {
            if (!node || node.removed) continue;
            const column = node.parent;
            if (!isTableColumnNode(column)) continue;
            if (column.parent !== table) continue;
            const index = column.children.indexOf(node as SceneNode);
            if (index !== rowIndex) continue;
            if (node.type === 'FRAME' || node.type === 'INSTANCE') {
                if (node.height > maxHeight) maxHeight = node.height;
            }
        }
    }

    // Fallback: compute max height from the entire row.
    if (maxHeight <= 0) {
        for (const column of columns) {
            if (rowIndex >= column.children.length) continue;
            const cell = column.children[rowIndex];
            if (cell.removed) continue;
            if (cell.type === 'FRAME' || cell.type === 'INSTANCE') {
                if (cell.height > maxHeight) maxHeight = cell.height;
            }
        }
    }

    if (!Number.isFinite(maxHeight) || maxHeight <= 0) return;

    for (const column of columns) {
        if (rowIndex >= column.children.length) continue;
        const cell = column.children[rowIndex];
        if (cell.removed) continue;
        if (cell.type === 'FRAME' || cell.type === 'INSTANCE') {
            if (Math.abs(cell.height - maxHeight) > 0.1) {
                try {
                    cell.resize(cell.width, maxHeight);
                } catch (e) {
                    // Ignore resize failures for non-resizable nodes.
                }
            }
        }
    }
}

function alignAllTableRows(table: FrameNode) {
    const columns = getTableColumns(table);
    if (columns.length === 0) return;

    let rowCount = 0;
    for (const column of columns) {
        if (column.children.length > rowCount) rowCount = column.children.length;
    }

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        alignTableRowHeights(table, rowIndex);
    }
}

function findTableColumnFromNode(node: BaseNode | null | undefined): FrameNode | null {
    let current = node;
    while (current && current.type !== 'PAGE') {
        if (isTableColumnNode(current)) return current;
        if (current.type === 'FRAME' && looksLikeTableColumnFrame(current)) {
            const parent = current.parent;
            if (parent && parent.type === 'FRAME') {
                // Only treat it as a column if it sits in a table-like container.
                if (isTableNode(parent) || parent.layoutMode === 'HORIZONTAL') {
                    return current;
                }
            }
        }
        current = current.parent;
    }
    return null;
}

function getTableHeaderOffset(column: FrameNode): number {
    const first = column.children[0];
    if (!first) return 0;
    const id = first.getPluginData('component-id');
    return id === 'table-header-cell' ? 1 : 0;
}

function getTableRowCountFromColumn(column: FrameNode): number {
    const offset = getTableHeaderOffset(column);
    return Math.max(0, column.children.length - offset);
}

function getTableRowCount(table: FrameNode): number {
    const columns = getTableColumns(table);
    if (columns.length === 0) return 0;
    return getTableRowCountFromColumn(columns[0]);
}

async function updateTableRowCount(table: FrameNode, targetRows: number) {
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
            const templateIndex = offset + currentRows - 1;
            const template =
                templateIndex >= offset ? (column.children[templateIndex] as SceneNode | undefined) : undefined;
            const columnParams = readNodeParams(column);
            const bodyHeight = resolveTableBodyHeight(columnParams);
            for (let i = currentRows; i < safeTarget; i += 1) {
                let newCell: SceneNode | null = null;
                if (template) {
                    newCell = template.clone();
                } else {
                    const cellInstance: ComponentInstance = {
                        id: `cell-${Date.now()}-${i}`,
                        componentId: 'table-cell',
                        params: { text: `Cell ${i + 1}`, width: column.width, height: bodyHeight }
                    };
	                    newCell = await renderComponent(cellInstance, { isRoot: false });
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

function applyTableSizeToCells(table: FrameNode, headerHeight: number, bodyHeight: number) {
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

async function applyRowActionColumn(table: FrameNode, action: string) {
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
        if (desired === 'multiple') return 'table.rowAction.checkbox';
        if (desired === 'single') return 'table.rowAction.radio';
        if (desired === 'drag') return 'table.rowAction.drag';
        if (desired === 'expand') return 'table.rowAction.expand';
        if (desired === 'switch') return 'table.rowAction.switch';
        return null;
    };

	    const createHeaderControl = async (): Promise<InstanceNode | null> => {
	        const token = 'table.rowAction.header';
	        const resolved = resolveComponentTokenProfile(token);
	        const componentKey = resolved?.profile.componentKey || '';
	        if (!componentKey) return null;
	        try {
	            const inst = await createFigmaComponentInstance({
	                componentKey,
	                fallbackName: resolved?.profile.displayName || 'Row Action Header',
	                variantCriteria: {
	                    'Check 多选': desired === 'multiple',
	                    'Expand 展开': desired === 'expand',
	                    'Size 尺寸': resolveSizeVariant(headerHeight)
	                }
	            });
	            try {
	                const findPropKey = (candidates: string[]): string | null => {
	                    for (const candidate of candidates) {
	                        const found = findInstanceComponentPropertyName(inst, candidate);
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
	                            return toVariantBoolean(value);
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
        const resolved = resolveComponentTokenProfile(token);
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

        try {
            const inst = await createFigmaComponentInstance({
                componentKey,
                fallbackName: resolved?.profile.displayName || `Row Action ${desired}`,
                variantCriteria
            });

            // Hide labels where applicable (best-effort)
            if (desired === 'multiple' || desired === 'single' || desired === 'switch') {
                const labelKeyCandidates = ['label 标签', 'Label 标签'];
                for (const candidate of labelKeyCandidates) {
                    const propName = findInstanceComponentPropertyName(inst, candidate);
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

    const columnNode = await renderComponent(columnInstance, { isRoot: false });
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

type ColorVariableHint = {
    keyCandidates?: string[];
    idCandidates?: string[];
    nameCandidates?: string[];
};

type ResolveColorVariableOptions = {
    allowCreateToken?: boolean;
};

type ColorVariableBindingIndexEntry = ColorVariableHint & {
    enabled: boolean;
    token?: string;
    baseToken?: string;
    variableRef?: string;
};

type TypographyBindingHint = {
    keyCandidates?: string[];
    idCandidates?: string[];
    nameCandidates?: string[];
};

type TypographyBindingIndexEntry = TypographyBindingHint & {
    enabled: boolean;
    token?: string;
    baseToken?: string;
    textStyleRef?: string;
};

let COLOR_VARIABLE_BINDING_INDEX: Record<string, ColorVariableBindingIndexEntry> | null = null;
const COLOR_VARIABLE_CACHE = new Map<string, Variable | null>();
let LOCAL_COLOR_VARIABLES_CACHE: Variable[] | null = null;
const TOKEN_COLOR_COLLECTION_NAME = 'UI Agent Theme Tokens';
let TOKEN_COLOR_COLLECTION_CACHE: VariableCollection | null | undefined = undefined;
let TYPOGRAPHY_BINDING_INDEX: Record<string, TypographyBindingIndexEntry> | null = null;
const TEXT_STYLE_CACHE = new Map<string, TextStyle | null>();
let LOCAL_TEXT_STYLES_CACHE: TextStyle[] | null = null;
const EFFECT_STYLE_CACHE = new Map<string, EffectStyle | null>();
let LOCAL_EFFECT_STYLES_CACHE: EffectStyle[] | null = null;

let currentTheme: 'light' | 'dark' = 'light'; // Default theme

let generationLockEnabled = false;
const generationLockedNodeIds = new Set<string>();
const LOCKABLE_COMPONENT_IDS = new Set(['page', 'layout', 'card', 'table', 'table-column']);

function lockGeneratedContainerNode(node: BaseNode, componentId?: string) {
  if (!generationLockEnabled) return;
  if (!componentId || !LOCKABLE_COMPONENT_IDS.has(componentId)) return;
  if (!('locked' in node)) return;

  try {
    node.locked = true;
    if ('id' in node) {
      generationLockedNodeIds.add(node.id);
    }
  } catch (e) {
    console.warn('Failed to lock generated container node:', e);
  }
}

function unlockGeneratedContainerNodes() {
  generationLockedNodeIds.forEach((id) => {
    const node = figma.getNodeById(id);
    if (!node || !('locked' in node)) return;
    try {
      node.locked = false;
    } catch (e) {
      console.warn('Failed to unlock generated container node:', e);
    }
  });
  generationLockedNodeIds.clear();
}

function mergeUnique(base: string[] | undefined, incoming: string[] | undefined): string[] | undefined {
    const merged = new Set<string>();
    (base || []).forEach((value) => {
        const normalized = String(value || '').trim();
        if (normalized) merged.add(normalized);
    });
    (incoming || []).forEach((value) => {
        const normalized = String(value || '').trim();
        if (normalized) merged.add(normalized);
    });
    return merged.size > 0 ? Array.from(merged) : undefined;
}

function normalizeFormLayout(value: unknown): 'horizontal' | 'vertical' | 'inline' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'vertical' || normalized === 'inline') return normalized;
    return 'horizontal';
}

function normalizeInputSize(value: unknown): 'mini' | 'small' | 'default' | 'large' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('24') || normalized.includes('mini')) return 'mini';
    if (normalized.includes('28') || normalized.includes('small')) return 'small';
    if (normalized.includes('36') || normalized.includes('large')) return 'large';
    return 'default';
}

function normalizeInputState(value: unknown): 'default' | 'hover' | 'active' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬浮') || normalized.includes('悬停')) return 'hover';
    if (normalized.includes('active') || normalized.includes('激活')) return 'active';
    return 'default';
}

function resolveInputMetrics(value: unknown): {
    height: number;
    paddingX: number;
    paddingY: number;
    fontSize: number;
    cornerRadius: number;
} {
    switch (normalizeInputSize(value)) {
        case 'mini':
            return { height: 24, paddingX: 8, paddingY: 3, fontSize: 12, cornerRadius: 4 };
        case 'small':
            return { height: 28, paddingX: 10, paddingY: 4, fontSize: 12, cornerRadius: 4 };
        case 'large':
            return { height: 36, paddingX: 12, paddingY: 7, fontSize: 14, cornerRadius: 4 };
        default:
            return { height: 32, paddingX: 12, paddingY: 5, fontSize: 13, cornerRadius: 4 };
    }
}

function hasInputAffix(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function resolveInputOutlineSpec(
    disabled: boolean,
    error: boolean,
    state: 'default' | 'hover' | 'active'
): { variableKey: string; fallbackHex: string } {
    if (error) return { variableKey: 'input-error-border-key', fallbackHex: '#D7312A' };
    if (!disabled && state === 'active') return { variableKey: 'input-active-border-key', fallbackHex: '#1664FF' };
    if (!disabled && state === 'hover') return { variableKey: 'input-hover-border-key', fallbackHex: '#86909C' };
    return { variableKey: 'input-border-key', fallbackHex: '#DDE2E9' };
}

function buildInputOutlineEffects(outlineHex: string): Effect[] {
    return [{
        type: 'DROP_SHADOW',
        color: { ...parseColor(outlineHex), a: 1 },
        offset: { x: 0, y: 0 },
        radius: 0,
        spread: 1,
        visible: true,
        showShadowBehindNode: true,
        blendMode: 'NORMAL'
    }];
}

const INPUT_DEFAULT_EFFECT_STYLE_REF = 'S:82fec6b68b028ee54ac2b41d28db6dbfa88ac472,163518:1';
const INPUT_DEFAULT_EFFECT_STYLE_NAMES = [
    'shadow/Assembly/Data entry/Default 默认',
    'shadow/Assembly/Data entry/default'
];

function toVariantBoolean(value: boolean): 'True' | 'False' {
    return value ? 'True' : 'False';
}

function resolveInputSizeVariantLabel(value: unknown): 'Mini 24' | 'Small 28' | 'Default 32' | 'Large 36' {
    switch (normalizeInputSize(value)) {
        case 'mini':
            return 'Mini 24';
        case 'small':
            return 'Small 28';
        case 'large':
            return 'Large 36';
        default:
            return 'Default 32';
    }
}

function resolveInputStateVariantLabel(value: unknown): 'Default 默认' | 'Hover 悬浮' | 'Active 激活' {
    switch (normalizeInputState(value)) {
        case 'hover':
            return 'Hover 悬浮';
        case 'active':
            return 'Active 激活';
        default:
            return 'Default 默认';
    }
}

function resolveButtonTypeVariantLabel(value: unknown): 'Primary 主要' | 'Secondary 次要' | 'Outline 线框' | 'Text 文字' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('secondary') || normalized.includes('次要')) return 'Secondary 次要';
    if (normalized.includes('outline') || normalized.includes('线框')) return 'Outline 线框';
    if (normalized.includes('text') || normalized.includes('文字')) return 'Text 文字';
    return 'Primary 主要';
}

function resolveButtonThemeVariantLabel(value: unknown): 'Default 默认' | 'Danger 危险' | 'Success 成功' | 'Warning 警示' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('danger') || normalized.includes('危险')) return 'Danger 危险';
    if (normalized.includes('success') || normalized.includes('成功')) return 'Success 成功';
    if (normalized.includes('warning') || normalized.includes('警示')) return 'Warning 警示';
    return 'Default 默认';
}

function resolveButtonStateVariantLabel(
    value: unknown,
    disabled: boolean
): 'Default 默认' | 'Hover 悬停' | 'Active 激活' | 'Disabled 禁用' {
    if (disabled) return 'Disabled 禁用';
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬停') || normalized.includes('悬浮')) {
        return 'Hover 悬停';
    }
    if (normalized.includes('active') || normalized.includes('激活')) return 'Active 激活';
    if (normalized.includes('disabled') || normalized.includes('禁用')) return 'Disabled 禁用';
    return 'Default 默认';
}

function resolveButtonLanguageVariantLabel(value: unknown): 'CN' | 'EN' {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized.includes('en') ? 'EN' : 'CN';
}

function resolveSelectTypeVariantLabel(value: unknown): 'Default 默认' | 'Label 内置标签' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('label') || normalized.includes('内置标签')) {
        return 'Label 内置标签';
    }
    return 'Default 默认';
}

function normalizeTagSize(value: unknown): 'mini' | 'small' | 'default' | 'large' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('16') || normalized.includes('mini')) return 'mini';
    if (normalized.includes('18') || normalized.includes('small')) return 'small';
    if (normalized.includes('24') || normalized.includes('large')) return 'large';
    return 'default';
}

function normalizeTagType(value: unknown): 'default' | 'solid' | 'outline' | 'text' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('solid') || normalized.includes('面型')) return 'solid';
    if (normalized.includes('outline') || normalized.includes('线型')) return 'outline';
    if (normalized.includes('text') || normalized.includes('文字')) return 'text';
    return 'default';
}

type TagComponentFamily = 'default' | 'other' | 'status';
type OtherTagType = 'marketing' | 'group';

const TAG_COMPONENT_TOKEN = 'lib-data-display-tag';
const OTHER_TAG_COMPONENT_TOKEN = 'lib-data-display-other-tag';
const STATUS_TAG_COMPONENT_TOKEN = 'lib-data-display-status-tag';

function resolveTagComponentFamily(componentToken: unknown): TagComponentFamily {
    const normalized = String(componentToken || '').trim();
    const baseToken = normalized
        ? resolveComponentTokenProfile(normalized)?.baseToken || normalized
        : '';
    if (baseToken === STATUS_TAG_COMPONENT_TOKEN || baseToken === 'library.data-display.status-tag') {
        return 'status';
    }
    if (baseToken === OTHER_TAG_COMPONENT_TOKEN || baseToken === 'library.data-display.other-tag') {
        return 'other';
    }
    return 'default';
}

function isDefaultTagTypeValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return (
        normalized.includes('default') ||
        normalized.includes('默认') ||
        normalized.includes('solid') ||
        normalized.includes('面型') ||
        normalized.includes('outline') ||
        normalized.includes('线型') ||
        normalized.includes('text') ||
        normalized.includes('文字')
    );
}

function isOtherTagTypeValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return (
        normalized.includes('marketing') ||
        normalized.includes('营销') ||
        normalized.includes('taggroup') ||
        normalized.includes('标签组') ||
        normalized === 'group' ||
        normalized.includes('group')
    );
}

function isStatusTagTypeValue(value: unknown): boolean {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (!normalized) return false;
    return normalized.includes('status') || normalized.includes('状态标签') || normalized.includes('状态');
}

function normalizeUnifiedTagParams(params: Record<string, any>): Record<string, any> {
    const next = { ...params };
    const rawTagType = next.tagType ?? next.type;
    const rawOtherTagType = next.otherTagType;
    const componentToken = typeof next.componentToken === 'string' ? next.componentToken.trim() : '';
    const resolvedToken = componentToken ? resolveComponentTokenProfile(componentToken) : undefined;
    const baseToken = resolvedToken?.baseToken;
    const isTokenStatus = baseToken === STATUS_TAG_COMPONENT_TOKEN;
    const isTokenOther = baseToken === OTHER_TAG_COMPONENT_TOKEN;
    const isTokenDefault = baseToken === TAG_COMPONENT_TOKEN;
    const isKnownToken = isTokenStatus || isTokenOther || isTokenDefault;

    const hasExplicitDefaultTagType = rawTagType !== undefined && isDefaultTagTypeValue(rawTagType);
    const hasExplicitOtherTagType = rawTagType !== undefined && isOtherTagTypeValue(rawTagType);
    const hasExplicitStatusTagType = rawTagType !== undefined && isStatusTagTypeValue(rawTagType);
    let unifiedType: unknown = rawTagType;
    if (!unifiedType && rawOtherTagType) {
        unifiedType = rawOtherTagType;
    }
    if (
        rawOtherTagType &&
        (!unifiedType || (!isDefaultTagTypeValue(unifiedType) && !isOtherTagTypeValue(unifiedType)))
    ) {
        unifiedType = rawOtherTagType;
    }
    if (isTokenOther && rawOtherTagType && !hasExplicitDefaultTagType && !hasExplicitStatusTagType) {
        unifiedType = rawOtherTagType;
    }
    if (!unifiedType && isTokenStatus && !hasExplicitDefaultTagType && !hasExplicitOtherTagType) {
        unifiedType = 'StatusTag 状态标签';
    }

    if (unifiedType !== undefined) {
        next.tagType = unifiedType;
    }

    const shouldUseStatus =
        isStatusTagTypeValue(unifiedType) ||
        (isTokenStatus && !hasExplicitDefaultTagType && !hasExplicitOtherTagType && !isOtherTagTypeValue(unifiedType));
    const shouldUseOther =
        !shouldUseStatus &&
        (isOtherTagTypeValue(unifiedType) ||
            (isTokenOther && !isDefaultTagTypeValue(unifiedType) && !isStatusTagTypeValue(unifiedType)));

    if (shouldUseStatus) {
        next.tagType = 'StatusTag 状态标签';
        delete next.otherTagType;
    } else if (shouldUseOther && unifiedType) {
        const normalizedOtherLabel = resolveOtherTagTypeVariantLabel(unifiedType);
        next.tagType = normalizedOtherLabel;
        next.otherTagType = normalizedOtherLabel;
    } else if (unifiedType) {
        next.tagType = resolveTagTypeVariantLabel(unifiedType);
        delete next.otherTagType;
    } else if (!shouldUseOther) {
        delete next.otherTagType;
    }

    if (!componentToken || isKnownToken) {
        next.componentToken = shouldUseStatus
            ? STATUS_TAG_COMPONENT_TOKEN
            : shouldUseOther
                ? OTHER_TAG_COMPONENT_TOKEN
                : TAG_COMPONENT_TOKEN;
    }

    return next;
}

function buildTableCellTagParams(params: Record<string, any>): Record<string, any> {
    const label = String(params.tagText || params.text || 'Tag');
    const kind = String(params.tagKind ?? params.kind ?? '').trim().toLowerCase();
    const isTypeTag = kind.includes('type');

    const explicitToken =
        typeof params.componentToken === 'string' && String(params.componentToken).trim().length > 0;
    const requestedToken = explicitToken
        ? String(params.componentToken).trim()
        : isTypeTag
            ? TAG_COMPONENT_TOKEN
            : STATUS_TAG_COMPONENT_TOKEN;

    const legacyTagColor = String(params.tagColor ?? '').trim().toLowerCase();
    const legacyStatusTheme =
        legacyTagColor === 'green'
            ? 'Success 成功'
            : legacyTagColor === 'orange' || legacyTagColor === 'yellow'
                ? 'Warning 告警'
                : legacyTagColor === 'red'
                    ? 'Error 错误'
                    : legacyTagColor === 'gray' || legacyTagColor === 'grey'
                        ? 'Stop 停止'
                        : legacyTagColor === 'blue'
                            ? 'Processing 等待中'
                            : undefined;

    const tagParams: Record<string, any> = {
        text: label,
        componentToken: requestedToken,
        tagType: params.tagType,
        size: params.size,
        state: params.state,
        disabled: params.disabled,
        showIcon: params.showIcon,
        showDot: params.showDot,
        showDropdown: params.showDropdown,
        closable: params.closable,
        statusTheme: params.statusTheme ?? params.theme ?? legacyStatusTheme,
        statusType: params.statusType ?? params.statusLevel ?? params.level,
        statusState: params.statusState
    };

    if (isTypeTag && !tagParams.tagType) {
        tagParams.tagType = 'Outline 线型标签';
    }

    const normalizedTagParams = normalizeUnifiedTagParams(tagParams);
    const family = resolveTagComponentFamily(normalizedTagParams.componentToken);
    if (family === 'status' && !normalizedTagParams.statusType) {
        normalizedTagParams.statusType = 'L2 二级标签';
    }
    if (family === 'status' && !normalizedTagParams.statusTheme) {
        normalizedTagParams.statusTheme = 'Success 成功';
    }

    return normalizedTagParams;
}

function normalizeOtherTagType(value: unknown): OtherTagType {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('taggroup') || normalized.includes('标签组') || normalized.includes('group')) {
        return 'group';
    }
    return 'marketing';
}

function resolveOtherTagTypeVariantLabel(value: unknown): 'TagGroup 标签组' | 'MarketingTag 营销标签' {
    return normalizeOtherTagType(value) === 'group' ? 'TagGroup 标签组' : 'MarketingTag 营销标签';
}

function resolveStatusTagTypeVariantLabel(value: unknown): 'L1 一级标签' | 'L2 二级标签' | 'L3 三级标签' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('l3') || normalized.includes('三级') || normalized.endsWith('3')) return 'L3 三级标签';
    if (normalized.includes('l2') || normalized.includes('二级') || normalized.endsWith('2')) return 'L2 二级标签';
    return 'L1 一级标签';
}

function resolveStatusTagThemeVariantLabel(
    value: unknown
):
    | 'Success 成功'
    | 'Warning 告警'
    | 'Error 错误'
    | 'Stop 停止'
    | 'Processing 等待中'
    | 'Loading 加载中'
    | 'Waiting 待启用' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('warning') || normalized.includes('告警')) return 'Warning 告警';
    if (normalized.includes('error') || normalized.includes('错误')) return 'Error 错误';
    if (normalized.includes('stop') || normalized.includes('停止')) return 'Stop 停止';
    if (normalized.includes('processing') || normalized.includes('等待')) return 'Processing 等待中';
    if (normalized.includes('loading') || normalized.includes('加载')) return 'Loading 加载中';
    if (normalized.includes('waiting') || normalized.includes('待启用')) return 'Waiting 待启用';
    return 'Success 成功';
}

function resolveStatusTagStateVariantLabel(value: unknown): 'Default 默认' | 'Hover 悬浮' | 'Active 点击' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬浮') || normalized.includes('悬停')) return 'Hover 悬浮';
    if (normalized.includes('active') || normalized.includes('点击') || normalized.includes('激活')) return 'Active 点击';
    return 'Default 默认';
}

function resolveOtherTagColorVariantLabel(value: unknown): 'Default 默认' | 'Red 红' | 'Yellow 黄' | 'Grey 灰' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('red') || normalized.includes('红')) return 'Red 红';
    if (normalized.includes('yellow') || normalized.includes('黄')) return 'Yellow 黄';
    if (normalized.includes('grey') || normalized.includes('gray') || normalized.includes('灰')) return 'Grey 灰';
    return 'Default 默认';
}

function resolveTagSizeVariantLabel(value: unknown): 'Mini 16' | 'Small 18' | 'Default 20' | 'Large 24' {
    switch (normalizeTagSize(value)) {
        case 'mini':
            return 'Mini 16';
        case 'small':
            return 'Small 18';
        case 'large':
            return 'Large 24';
        default:
            return 'Default 20';
    }
}

function resolveTagStateVariantLabel(value: unknown): 'Default 默认' | 'Hover 悬停' | 'Active 激活' {
    switch (normalizeInputState(value)) {
        case 'hover':
            return 'Hover 悬停';
        case 'active':
            return 'Active 激活';
        default:
            return 'Default 默认';
    }
}

function resolveTagTypeVariantLabel(value: unknown): 'Default 默认标签' | 'Solid 面型标签' | 'Outline 线型标签' | 'Text 文字标签' {
    switch (normalizeTagType(value)) {
        case 'solid':
            return 'Solid 面型标签';
        case 'outline':
            return 'Outline 线型标签';
        case 'text':
            return 'Text 文字标签';
        default:
            return 'Default 默认标签';
    }
}

function resolveTagDisabledVariantLabel(value: unknown): 'On' | 'Off' {
    return hasInputAffix(value) ? 'On' : 'Off';
}

function resolveTagMetrics(value: unknown): {
    height: number;
    paddingX: number;
    fontSize: number;
    iconSize: number;
    dotSize: number;
    glyphSize: number;
    cornerRadius: number;
} {
    switch (normalizeTagSize(value)) {
        case 'mini':
            return { height: 16, paddingX: 6, fontSize: 10, iconSize: 10, dotSize: 4, glyphSize: 9, cornerRadius: 4 };
        case 'small':
            return { height: 18, paddingX: 6, fontSize: 10, iconSize: 10, dotSize: 4, glyphSize: 10, cornerRadius: 4 };
        case 'large':
            return { height: 24, paddingX: 6, fontSize: 12, iconSize: 12, dotSize: 6, glyphSize: 12, cornerRadius: 4 };
        default:
            return { height: 20, paddingX: 6, fontSize: 12, iconSize: 12, dotSize: 6, glyphSize: 10, cornerRadius: 4 };
    }
}

function findVariantPropertyName(
    variantProps: Record<string, string> | undefined,
    criteriaKey: string
): string | undefined {
    if (!variantProps) return undefined;
    const normalizedKey = String(criteriaKey || '').trim().toLowerCase();
    return Object.keys(variantProps).find((key) => {
        const normalizedProp = String(key || '').trim().toLowerCase();
        return normalizedProp === normalizedKey || normalizedProp.includes(normalizedKey);
    });
}

function matchesVariantProps(
    variantProps: Record<string, string> | undefined,
    criteria: Record<string, string>
): boolean {
    if (!variantProps) return false;
    return Object.entries(criteria).every(([key, value]) => {
        const propName = findVariantPropertyName(variantProps, key);
        if (!propName) return false;
        return String(variantProps[propName] || '').trim().toLowerCase() === String(value || '').trim().toLowerCase();
    });
}

function dedupeVariantCriteriaCandidates(candidates: Array<Record<string, string>>): Array<Record<string, string>> {
    return candidates.filter((candidate, index) => {
        const serialized = JSON.stringify(candidate);
        return candidates.findIndex((item) => JSON.stringify(item) === serialized) === index;
    });
}

function buildTagVariantCriteriaCandidates(
    params: Record<string, any>,
    family: TagComponentFamily
): Array<Record<string, string>> {
    if (family === 'status') {
        const exact: Record<string, string> = {
            'Type 类型': resolveStatusTagTypeVariantLabel(params.statusType ?? params.statusLevel ?? params.type),
            'Theme 主题': resolveStatusTagThemeVariantLabel(params.statusTheme ?? params.theme),
            'Size 尺寸': resolveTagSizeVariantLabel(params.size),
            'Icon 图标': toVariantBoolean(hasInputAffix(params.showIcon ?? params.icon)),
            'Dropdown 下拉选择': toVariantBoolean(hasInputAffix(params.showDropdown ?? params.dropdown)),
            'State 状态': resolveStatusTagStateVariantLabel(params.statusState ?? params.state),
            'Disabled 禁用': toVariantBoolean(hasInputAffix(params.disabled))
        };

        const requestedToggles = Object.fromEntries(
            Object.entries(exact).filter(([key, value]) => {
                if (
                    key === 'Type 类型' ||
                    key === 'Theme 主题' ||
                    key === 'Size 尺寸' ||
                    key === 'State 状态' ||
                    key === 'Disabled 禁用'
                ) {
                    return false;
                }
                return value === 'True';
            })
        );

        return dedupeVariantCriteriaCandidates([
            exact,
            {
                ...exact,
                'State 状态': 'Default 默认'
            },
            {
                'Type 类型': exact['Type 类型'],
                'Theme 主题': exact['Theme 主题'],
                'Size 尺寸': exact['Size 尺寸'],
                'Disabled 禁用': exact['Disabled 禁用'],
                ...requestedToggles
            },
            {
                'Type 类型': exact['Type 类型'],
                'Theme 主题': exact['Theme 主题'],
                'Size 尺寸': exact['Size 尺寸'],
                'Disabled 禁用': exact['Disabled 禁用']
            },
            {
                'Type 类型': exact['Type 类型'],
                'Theme 主题': exact['Theme 主题'],
                'Size 尺寸': exact['Size 尺寸']
            }
        ]);
    }
    if (family === 'other') {
        const exact: Record<string, string> = {
            'Type 类型': resolveOtherTagTypeVariantLabel(params.otherTagType ?? params.tagType ?? params.type),
            'Size 尺寸': resolveTagSizeVariantLabel(params.size),
            'Color 颜色': resolveOtherTagColorVariantLabel(params.colorScheme ?? params.color ?? params.tagColor)
        };

        return dedupeVariantCriteriaCandidates([
            exact,
            {
                'Type 类型': exact['Type 类型'],
                'Size 尺寸': exact['Size 尺寸']
            },
            {
                'Type 类型': exact['Type 类型'],
                'Color 颜色': exact['Color 颜色']
            },
            {
                'Type 类型': exact['Type 类型']
            },
            {
                'Size 尺寸': exact['Size 尺寸']
            }
        ]);
    }

    const exact: Record<string, string> = {
        'Type 类型': resolveTagTypeVariantLabel(params.tagType ?? params.type),
        'Size 尺寸': resolveTagSizeVariantLabel(params.size),
        'State 状态': resolveTagStateVariantLabel(params.state),
        'Icon 图标': toVariantBoolean(hasInputAffix(params.showIcon ?? params.icon)),
        'Dot 点': toVariantBoolean(hasInputAffix(params.showDot ?? params.dot)),
        'Dropdown 下拉': toVariantBoolean(hasInputAffix(params.showDropdown ?? params.dropdown)),
        'Close 关闭': toVariantBoolean(hasInputAffix(params.closable ?? params.close)),
        'Disabled 禁用': resolveTagDisabledVariantLabel(params.disabled)
    };

    const requestedToggles = Object.fromEntries(
        Object.entries(exact).filter(([key, value]) => {
            if (key === 'Type 类型' || key === 'Size 尺寸' || key === 'State 状态' || key === 'Disabled 禁用') {
                return false;
            }
            return value === 'True';
        })
    );

    return dedupeVariantCriteriaCandidates([
        exact,
        {
            ...exact,
            'State 状态': 'Default 默认'
        },
        {
            'Type 类型': exact['Type 类型'],
            'Size 尺寸': exact['Size 尺寸'],
            'State 状态': exact['State 状态'],
            'Disabled 禁用': exact['Disabled 禁用'],
            ...requestedToggles
        },
        {
            'Type 类型': exact['Type 类型'],
            'Size 尺寸': exact['Size 尺寸'],
            'Disabled 禁用': exact['Disabled 禁用'],
            ...requestedToggles
        },
        {
            'Type 类型': exact['Type 类型'],
            'Size 尺寸': exact['Size 尺寸'],
            'Disabled 禁用': exact['Disabled 禁用']
        }
    ]);
}

async function doesInstanceMatchVariantCriteria(
    instance: InstanceNode,
    criteria: Record<string, string>
): Promise<boolean> {
    const mainComponent = await resolveInstanceMainComponentNode(instance);
    return matchesVariantProps(mainComponent?.variantProperties || undefined, criteria);
}

function findPreferredTextNode(root: SceneNode, preferredNames: string[]): TextNode | null {
    const preferred = preferredNames.map((name) => String(name || '').trim());
    const allTextNodes =
        'findAll' in root
            ? (root.findAll((node) => node.type === 'TEXT') as TextNode[])
            : root.type === 'TEXT'
                ? [root]
                : [];

    const preferredMatch = allTextNodes.find((node) => {
        const nodeName = String(node.name || '').trim();
        return preferred.includes(nodeName) || preferred.includes(String(node.characters || '').trim());
    });

    return preferredMatch || allTextNodes[0] || null;
}

function resolvePrimaryTagText(params: Record<string, any>): string {
    const raw = String(params.text ?? params.label ?? '').trim();
    return raw || '标签';
}

function resolveTagGroupTexts(params: Record<string, any>): string[] {
    const groupTextsRaw =
        typeof params.groupTexts === 'string' && params.groupTexts.trim()
            ? params.groupTexts
            : params.text;
    const primaryText = resolvePrimaryTagText(params);
    const fallback =
        primaryText && primaryText !== '标签'
            ? [primaryText]
            : ['内', '荐'];
    return parseDelimitedText(groupTextsRaw, fallback);
}

function findOtherTagGroupItems(root: SceneNode): SceneNode[] {
    if (!('children' in root)) return [];
    const directItems = root.children.filter((child) => {
        if (!('findOne' in child)) return false;
        return Boolean(child.findOne((node) => node.type === 'TEXT'));
    });
    return directItems.length > 0 ? directItems : [];
}

async function applyOtherTagGroupTexts(root: SceneNode, labels: string[]): Promise<void> {
    if (!('children' in root)) {
        const labelNode = findPreferredTextNode(root, labels);
        if (labelNode) {
            await updateTextNodeCharacters(labelNode, labels[0] || '内');
        }
        return;
    }

    let items = findOtherTagGroupItems(root);
    if (items.length === 0) {
        const labelNode = findPreferredTextNode(root, labels);
        if (labelNode) {
            await updateTextNodeCharacters(labelNode, labels[0] || '内');
        }
        return;
    }

    const nextLabels = labels.length > 0 ? labels : ['内', '荐'];
    const templateItem = items[items.length - 1];
    if ('clone' in templateItem && items.length < nextLabels.length) {
        for (let index = items.length; index < nextLabels.length; index += 1) {
            root.appendChild(templateItem.clone());
        }
    }

    items = findOtherTagGroupItems(root);
    if (items.length > nextLabels.length) {
        items.slice(nextLabels.length).forEach((item) => item.remove());
        items = findOtherTagGroupItems(root);
    }

    for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const label = nextLabels[index];
        if (!label) break;
        const labelNode = findPreferredTextNode(item, ['内', '荐', label]);
        if (labelNode) {
            await updateTextNodeCharacters(labelNode, label);
        }
    }
}

async function applyTagTemplateContent(
    root: SceneNode,
    params: Record<string, any>,
    family: TagComponentFamily
): Promise<void> {
    if (family === 'status') {
        const explicitLabel =
            typeof params.text === 'string' && params.text.trim()
                ? params.text.trim()
                : typeof params.label === 'string' && params.label.trim()
                    ? params.label.trim()
                    : '';
        if (explicitLabel) {
            const labelNode = findPreferredTextNode(root, [explicitLabel, 'Success', 'Warning', 'Error']);
            if (labelNode) {
                await updateTextNodeCharacters(labelNode, explicitLabel);
            }
        }
        return;
    }
    if (family === 'other' && normalizeOtherTagType(params.otherTagType ?? params.tagType ?? params.type) === 'group') {
        await applyOtherTagGroupTexts(root, resolveTagGroupTexts(params));
        return;
    }

    const label = resolvePrimaryTagText(params);
    const labelNode = findPreferredTextNode(root, ['标签', '自定义', '荐', '内', label]);
    if (labelNode) {
        await updateTextNodeCharacters(labelNode, label);
    }
}

async function createTagFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const componentToken = String(params.componentToken || '').trim();
    const componentKeyFromToken = componentToken
        ? resolveComponentTokenProfile(componentToken)?.profile.componentKey || ''
        : '';
    const componentKey = componentKeyFromToken || String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const family = resolveTagComponentFamily(componentToken || def.figmaPropertySnapshot?.token);
    const criteriaCandidates = buildTagVariantCriteriaCandidates(params, family);

    for (let index = 0; index < criteriaCandidates.length; index += 1) {
        const criteria = criteriaCandidates[index];
        const cacheKey = buildTagTemplateCacheKey(componentKey, criteria);
        const cachedTemplate = TAG_TEMPLATE_CACHE.get(cacheKey);
        if (cachedTemplate) {
            try {
                const cloned = cachedTemplate.clone();
                cloned.visible = true;
                await applyTagTemplateContent(cloned, params, family);
                cloned.name = def.name;
                return cloned;
            } catch (e) {
                console.warn('[TagTemplate] failed to clone cached template', e);
            }
        }
        let importedInstance: InstanceNode | null = null;

        try {
            importedInstance = await createFigmaComponentInstance({
                componentKey,
                fallbackName: def.name,
                variantCriteria: criteria,
                visible: false
            });

            if (!(await doesInstanceMatchVariantCriteria(importedInstance, criteria))) {
                importedInstance.remove();
                continue;
            }

            const detached = importedInstance.detachInstance();
            try {
                const template = detached.clone();
                template.visible = false;
                template.x = -100000;
                TAG_TEMPLATE_CACHE.set(cacheKey, template);
            } catch (e) {
                console.warn('[TagTemplate] failed to cache template', e);
            }
            await applyTagTemplateContent(detached, params, family);
            detached.name = def.name;
            detached.visible = true;
            return detached;
        } catch (e) {
            if (importedInstance) {
                try {
                    importedInstance.remove();
                } catch {
                    // ignore cleanup failure
                }
            }
            console.warn('[TagTemplate] failed to create tag from original Figma component', e);
        }
    }

    try {
        const fallbackKey = buildTagTemplateCacheKey(componentKey);
        const cachedFallback = TAG_TEMPLATE_CACHE.get(fallbackKey);
        if (cachedFallback) {
            const cloned = cachedFallback.clone();
            cloned.visible = true;
            await applyTagTemplateContent(cloned, params, family);
            cloned.name = def.name;
            return cloned;
        }
        const fallbackInstance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: def.name,
            visible: false
        });
        const detached = fallbackInstance.detachInstance();
        try {
            const template = detached.clone();
            template.visible = false;
            template.x = -100000;
            TAG_TEMPLATE_CACHE.set(fallbackKey, template);
        } catch (e) {
            console.warn('[TagTemplate] failed to cache fallback template', e);
        }
        await applyTagTemplateContent(detached, params, family);
        detached.name = def.name;
        detached.visible = true;
        return detached;
    } catch (e) {
        console.warn('[TagTemplate] failed to create fallback tag instance without criteria', e);
        return null;
    }
}

async function createTagGlyphNode(
    characters: string,
    fontSize: number,
    bindingKey: string,
    fallbackHex: string
): Promise<TextNode> {
    const text = figma.createText();
    await applyTextStyleBinding(text, 'tag-text-style-key', { family: 'Inter', style: 'Regular', size: fontSize });
    text.characters = characters;
    text.fontSize = fontSize;
    text.lineHeight = { value: fontSize, unit: 'PIXELS' };
    await applyColorVariable(text, bindingKey, fallbackHex);
    return text;
}

async function createTagFallbackNode(params: Record<string, any>): Promise<FrameNode> {
    return createInspectDrivenTagFallbackNode(params);
}

async function updateTextNodeCharacters(node: TextNode, value: string): Promise<boolean> {
    try {
        if (node.fontName !== figma.mixed) {
            await figma.loadFontAsync(node.fontName as FontName);
        }
        node.characters = String(value || '');
        return true;
    } catch (e) {
        console.warn('[InputTemplate] failed to update text node', e);
        return false;
    }
}

async function createButtonFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const componentKey = String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const disabled = Boolean(params.disabled);
    const iconOnly = Boolean(params.iconOnly);
    const showPrefixIcon = Boolean(params.showPrefixIcon ?? params.prefixIcon);
    const showSuffixIcon = Boolean(params.showSuffixIcon ?? params.suffixIcon);
    const width = toPositiveNumber(params.width);

    try {
        const importedInstance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: def.name,
            variantCriteria: {
                'Disable 禁用': toVariantBoolean(disabled),
                'IconOnly 仅图标': toVariantBoolean(iconOnly),
                'Language': resolveButtonLanguageVariantLabel(params.language),
                'Size 尺寸': resolveInputSizeVariantLabel(params.size),
                'State 状态': resolveButtonStateVariantLabel(params.state, disabled),
                'Theme 主题': resolveButtonThemeVariantLabel(params.theme),
                'Type 类型': resolveButtonTypeVariantLabel(params.variant ?? params.type)
            }
        });

        const nextProps: Record<string, string | boolean> = {};
        const prefixIconProperty = findInstanceComponentPropertyName(importedInstance, 'PrefixIcon 前置图标');
        const suffixIconProperty = findInstanceComponentPropertyName(importedInstance, 'SuffixIcon 后置图标');
        if (prefixIconProperty) nextProps[prefixIconProperty] = showPrefixIcon;
        if (suffixIconProperty) nextProps[suffixIconProperty] = showSuffixIcon;
        if (Object.keys(nextProps).length > 0) {
            importedInstance.setProperties(nextProps);
        }

        const detached = importedInstance.detachInstance();
        const labelNode =
            detached.findOne((node) => node.type === 'TEXT' && String(node.name || '').includes('Button Title')) ||
            detached.findOne((node) => node.type === 'TEXT');
        if (labelNode && labelNode.type === 'TEXT' && !iconOnly) {
            await updateTextNodeCharacters(labelNode, String(params.label || 'Button'));
        }

        if (width) {
            detached.resize(width, detached.height);
        }

        detached.name = def.name;
        return detached;
    } catch (e) {
        console.warn('[ButtonTemplate] failed to create button from original Figma component', e);
        return null;
    }
}

async function createInputFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const componentKey = String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const width = Number(params.width) > 0 ? Number(params.width) : 240;
    const disabled = Boolean(params.disabled);
    const error = Boolean(params.error);
    const showPrefix = hasInputAffix(params.showPrefix ?? params.prefix);
    const showSuffix = hasInputAffix(params.showSuffix ?? params.suffix);
    const hasValue = String(params.value ?? '').length > 0;
    const filled = Boolean(params.filled) || hasValue;

    try {
        const importedInstance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: def.name,
            variantCriteria: {
                'Disable 禁用': toVariantBoolean(disabled),
                'Error 错误': toVariantBoolean(error),
                'Filled 已填': toVariantBoolean(filled),
                'Prefix 前缀': toVariantBoolean(showPrefix),
                'Size 尺寸': resolveInputSizeVariantLabel(params.size),
                'State 状态': resolveInputStateVariantLabel(params.state),
                'Suffix 后缀': toVariantBoolean(showSuffix)
            }
        });

        importedInstance.resize(width, importedInstance.height);
        const detached = importedInstance.detachInstance();

        const textNodes = detached.findAll((node) => node.type === 'TEXT') as TextNode[];
        const mainTextNode =
            textNodes.find((node) => String(node.name || '').trim().toLowerCase() === 'text') ||
            textNodes[textNodes.length - 1];
        const nextValue = hasValue ? String(params.value) : String(params.placeholder || '请输入');
        if (mainTextNode) {
            await updateTextNodeCharacters(mainTextNode, nextValue);
        }

        const sideTextNodes = textNodes.filter((node) => node !== mainTextNode);
        const prefixText = String(params.prefixText || '').trim();
        const suffixText = String(params.suffixText || '').trim();
        if (showPrefix && prefixText && sideTextNodes[0]) {
            await updateTextNodeCharacters(sideTextNodes[0], prefixText);
        }
        if (showSuffix && suffixText) {
            const suffixNode = sideTextNodes[sideTextNodes.length - 1];
            if (suffixNode && suffixNode !== sideTextNodes[0]) {
                await updateTextNodeCharacters(suffixNode, suffixText);
            }
        }

        detached.name = def.name;
        return detached;
    } catch (e) {
        console.warn('[InputTemplate] failed to create input from original Figma component', e);
        return null;
    }
}

function findSelectDisplayTextNode(root: SceneNode): TextNode | null {
    if ('children' in root) {
        const directText = root.children.find((child) => child.type === 'TEXT') as TextNode | undefined;
        if (directText) return directText;

        const firstChild = root.children[0];
        if (firstChild && 'findOne' in firstChild) {
            const nested = firstChild.findOne((node) => node.type === 'TEXT');
            if (nested && nested.type === 'TEXT') {
                return nested;
            }
        }
    }
    return null;
}

function isSelectDropdownItemNode(node: SceneNode): boolean {
    const name = String(node.name || '').trim();
    return name.includes('_components/dropdown_item') || name.includes('dropdown_item');
}

async function updateSelectDropdownItemLabel(node: SceneNode, label: string): Promise<void> {
    if (node.type === 'INSTANCE') {
        const textPropertyName = Object.keys(node.componentProperties || {}).find((key) => key === 'Text' || key.startsWith('Text#'));
        if (textPropertyName) {
            node.setProperties({ [textPropertyName]: label });
            return;
        }
    }

    if (!('findOne' in node)) return;
    const labelNode = node.findOne(
        (child) =>
            child.type === 'TEXT' &&
            (String(child.name || '').trim() === 'Row Label' || String(child.name || '').trim() === label)
    );
    if (labelNode && labelNode.type === 'TEXT') {
        await updateTextNodeCharacters(labelNode, label);
        return;
    }

    const fallbackTextNode = node.findOne((child) => child.type === 'TEXT');
    if (fallbackTextNode && fallbackTextNode.type === 'TEXT') {
        await updateTextNodeCharacters(fallbackTextNode, label);
    }
}

async function applySelectDropdownOptions(root: SceneNode, optionsText: unknown): Promise<void> {
    const options = parseDelimitedText(optionsText, []);
    if (options.length === 0) return;
    if (!('findOne' in root)) return;

    let dropdownRoot = root.findOne((node) => String(node.name || '').includes('Dropdown 下拉菜单'));
    if (!dropdownRoot) return;

    if (dropdownRoot.type === 'INSTANCE') {
        const detachedDropdown = dropdownRoot.detachInstance();
        replaceSceneNode(dropdownRoot, detachedDropdown);
        dropdownRoot = detachedDropdown;
    }

    if (!('children' in dropdownRoot)) return;

    let dropdownItems = dropdownRoot.children.filter(isSelectDropdownItemNode);
    if (dropdownItems.length === 0) return;

    const templateItem = dropdownItems[dropdownItems.length - 1];
    if ('clone' in templateItem && dropdownItems.length < options.length) {
        const lastItemIndex = dropdownRoot.children.indexOf(templateItem);
        for (let index = dropdownItems.length; index < options.length; index += 1) {
            const nextItem = templateItem.clone();
            dropdownRoot.insertChild(lastItemIndex + (index - dropdownItems.length) + 1, nextItem);
        }
    }

    dropdownItems = dropdownRoot.children.filter(isSelectDropdownItemNode);
    if (dropdownItems.length > options.length) {
        dropdownItems
            .slice(options.length)
            .forEach((item) => item.remove());
        dropdownItems = dropdownRoot.children.filter(isSelectDropdownItemNode);
    }

    for (let index = 0; index < dropdownItems.length; index += 1) {
        const nextLabel = options[index];
        if (!nextLabel) break;
        await updateSelectDropdownItemLabel(dropdownItems[index], nextLabel);
    }
}

async function createSelectFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const componentKey = String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const width = Number(params.width) > 0 ? Number(params.width) : 240;
    const currentValue = String(params.value || '').trim();
    const placeholder = String(params.placeholder || '请选择');
    const hasValue = currentValue.length > 0;
    const filled = Boolean(params.filled) || hasValue;
    const disabled = Boolean(params.disabled);
    const multiple = Boolean(params.multiple);

    try {
        const importedInstance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: def.name,
            variantCriteria: {
                'Type 类型': resolveSelectTypeVariantLabel(params.selectType ?? params.type),
                'Size 尺寸': resolveInputSizeVariantLabel(params.size),
                'State 状态': resolveInputStateVariantLabel(params.state),
                'Filled 填写': toVariantBoolean(filled),
                'Multiple 多选': toVariantBoolean(multiple),
                'Disabled 禁用': toVariantBoolean(disabled)
            }
        });

        importedInstance.resize(width, importedInstance.height);
        const detached = importedInstance.detachInstance();
        const displayTextNode = findSelectDisplayTextNode(detached);
        if (displayTextNode) {
            await updateTextNodeCharacters(displayTextNode, hasValue ? currentValue : placeholder);
        }
        await applySelectDropdownOptions(detached, params.optionsText);

        detached.name = def.name;
        return detached;
    } catch (e) {
        console.warn('[SelectTemplate] failed to create select from original Figma component', e);
        return null;
    }
}

type FilterGroupItemType = 'select' | 'input' | 'search';

type FilterGroupItemSpec = {
    label: string;
    type: FilterGroupItemType;
};

function normalizeFilterGroupItemType(value: unknown): FilterGroupItemType {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('search') || normalized.includes('搜索')) return 'search';
    if (normalized.includes('input') || normalized.includes('输入')) return 'input';
    return 'select';
}

function parseFilterGroupItems(value: unknown): FilterGroupItemSpec[] {
    const fallback: FilterGroupItemSpec[] = [
        { label: '状态', type: 'select' },
        { label: '城市', type: 'select' },
        { label: '关键词', type: 'search' }
    ];

    const raw = String(value || '').trim();
    if (!raw) return fallback;

    const chunks = raw.split(/[\n\r,，]/).map((item) => item.trim()).filter(Boolean);
    const items: FilterGroupItemSpec[] = [];

    chunks.forEach((chunk) => {
        const parts = chunk.split(':').map((p) => p.trim()).filter(Boolean);
        if (parts.length === 0) return;
        if (parts.length === 1) {
            items.push({ label: parts[0], type: 'select' });
            return;
        }

        const label = parts.slice(0, -1).join(':').trim();
        const typeRaw = parts[parts.length - 1];
        if (!label) return;
        items.push({ label, type: normalizeFilterGroupItemType(typeRaw) });
    });

    return items.length > 0 ? items : fallback;
}

function getNodeApproxX(node: SceneNode): number {
    const bb = node.absoluteBoundingBox;
    if (bb && typeof bb.x === 'number') return bb.x;

    let x = typeof node.x === 'number' ? node.x : 0;
    let current: BaseNode | null = node.parent;
    while (current && current.type !== 'PAGE') {
        const currentNode = current as SceneNode;
        if (typeof currentNode.x === 'number') x += currentNode.x;
        current = currentNode.parent;
    }
    return x;
}

function findFilterGroupSelectTextNodes(root: SceneNode): { labelNode?: TextNode; displayNode?: TextNode } {
    if (!('findAll' in root)) {
        return root.type === 'TEXT' ? { displayNode: root as TextNode } : {};
    }

    const nodes = root.findAll((node) => node.type === 'TEXT' && (node as TextNode).visible) as TextNode[];
    nodes.sort((a, b) => getNodeApproxX(a) - getNodeApproxX(b));

    if (nodes.length >= 2) {
        return { labelNode: nodes[0], displayNode: nodes[1] };
    }
    if (nodes.length === 1) {
        return { displayNode: nodes[0] };
    }
    return {};
}

function findIconVariantPropertyKey(instance: InstanceNode): string | null {
    const keys = Object.keys(instance.componentProperties || {});
    if (keys.length === 0) return null;

    const byExact = keys.find((key) => key === 'Icon' || key.startsWith('Icon#'));
    if (byExact) return byExact;

    const byLower = keys.find((key) => key.split('#')[0].trim().toLowerCase() === 'icon');
    if (byLower) return byLower;

    const byCn = keys.find((key) => key.includes('图标'));
    return byCn || null;
}

function findFilterGroupSelectIconNode(root: SceneNode): SceneNode | null {
    if (!('findAll' in root)) return null;

    const all = root.findAll((node) => {
        if (!(node as SceneNode).visible) return false;
        if (node.type === 'TEXT') return false;
        return node.type === 'INSTANCE' || node.type === 'VECTOR';
    }) as SceneNode[];

    if (all.length === 0) return null;

    const instanceWithIconProp = all.filter((node) => {
        if (node.type !== 'INSTANCE') return false;
        return Boolean(findIconVariantPropertyKey(node as InstanceNode));
    });

    const candidates = instanceWithIconProp.length > 0 ? instanceWithIconProp : all;
    candidates.sort((a, b) => getNodeApproxX(b) - getNodeApproxX(a));
    return candidates[0] || null;
}

function trySetIconVariant(instance: InstanceNode, value: string): boolean {
    const key = findIconVariantPropertyKey(instance);
    if (!key) return false;
    try {
        instance.setProperties({ [key]: value });
        return true;
    } catch {
        return false;
    }
}

async function applyFilterGroupItemToSelectNode(
    selectNode: SceneNode,
    item: FilterGroupItemSpec
): Promise<void> {
    const prefix = item.type === 'input' ? '请输入' : item.type === 'search' ? '请搜索' : '请选择';
    const { labelNode, displayNode } = findFilterGroupSelectTextNodes(selectNode);

    if (labelNode) {
        await updateTextNodeCharacters(labelNode, item.label);
    }
    if (displayNode) {
        await updateTextNodeCharacters(displayNode, `${prefix}${item.label}`);
    }

    const iconNode = findFilterGroupSelectIconNode(selectNode);
    if (!iconNode) return;

    if (item.type === 'input') {
        iconNode.visible = false;
        return;
    }

    iconNode.visible = true;
    if (item.type === 'search' && iconNode.type === 'INSTANCE') {
        const ok =
            trySetIconVariant(iconNode as InstanceNode, 'search') ||
            trySetIconVariant(iconNode as InstanceNode, 'Search') ||
            trySetIconVariant(iconNode as InstanceNode, 'Search 搜索') ||
            trySetIconVariant(iconNode as InstanceNode, 'search 搜索');
        if (!ok) {
            // Keep default icon if variant swap fails.
        }
    }
}

function findInstanceComponentPropertyName(instance: InstanceNode, displayName: string): string | null {
    return (
        Object.keys(instance.componentProperties || {}).find(
            (key) => key === displayName || key.startsWith(`${displayName}#`)
        ) || null
    );
}

function findCheckboxLabelTextNode(root: SceneNode): TextNode | null {
    if (!('children' in root)) return null;
    const directText = root.children.find((child) => child.type === 'TEXT');
    return directText && directText.type === 'TEXT' ? directText : null;
}

async function createCheckboxFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const componentKey = String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const label = String(params.label || '选项一');
    const showLabel = params.showLabel !== false;

    try {
        const importedInstance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: def.name,
            variantCriteria: {
                'Checked 已选': toVariantBoolean(Boolean(params.checked)),
                'Indeterminate 半选': toVariantBoolean(Boolean(params.indeterminate)),
                'Hover 悬浮': toVariantBoolean(Boolean(params.hover)),
                'Disabled 禁用': toVariantBoolean(Boolean(params.disabled))
            }
        });

        const labelPropertyName = Object.keys(importedInstance.componentProperties || {}).find(
            (key) => key === 'label 标签' || key.startsWith('label 标签#')
        );
	        if (labelPropertyName) {
	            importedInstance.setProperties({ [labelPropertyName]: showLabel });
	        }

	        const detached = importedInstance.detachInstance();
	        setNodeClipsContent(detached, false);
	        if (showLabel) {
	            const labelNode = findCheckboxLabelTextNode(detached);
	            if (labelNode) {
	                await updateTextNodeCharacters(labelNode, label);
            }
        }

        detached.name = def.name;
        return detached;
    } catch (e) {
        console.warn('[CheckboxTemplate] failed to create checkbox from original Figma component', e);
        return null;
    }
}

async function createCheckboxGroupFromCheckboxComponents(
    params: Record<string, any>
): Promise<FrameNode> {
    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    const checkedValues = new Set(parseDelimitedText(params.checkedValues, []));
    const direction =
        String(params.direction || 'horizontal').trim().toLowerCase() === 'vertical'
            ? 'VERTICAL'
            : 'HORIZONTAL';

    const frame = figma.createFrame();
    frame.layoutMode = direction;
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
	    frame.counterAxisAlignItems = direction === 'VERTICAL' ? 'MIN' : 'CENTER';
	    frame.itemSpacing = Number(params.gap) > 0 ? Number(params.gap) : 24;
	    frame.fills = [];
	    // Layout-only container: avoid clipping child checkbox borders.
	    frame.clipsContent = false;

	    for (const option of options) {
	        const checkboxNode = await renderComponent({
	            componentId: 'checkbox',
	            params: {
	                label: option,
	                showLabel: true,
	                checked: checkedValues.has(option),
	                indeterminate: false,
	                hover: false,
	                disabled: Boolean(params.disabled)
	            }
	        }, { isRoot: false });
        frame.appendChild(checkboxNode);
    }

    return frame;
}

function resolveCheckboxGroupLayoutVariantLabel(value: unknown): 'Horizontal 横向' | 'Vertical 纵向' {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'vertical' || normalized.includes('vertical') || normalized.includes('纵向')
        ? 'Vertical 纵向'
        : 'Horizontal 横向';
}

function isCheckboxGroupItemNode(node: SceneNode): boolean {
    return String(node.name || '').includes('Checkbox 复选框');
}

async function updateCheckboxGroupItemNode(
    node: SceneNode,
    label: string,
    checked: boolean,
    disabled: boolean
): Promise<void> {
    if (node.type === 'INSTANCE') {
        const labelToggleProperty = findInstanceComponentPropertyName(node, 'label 标签');
        const checkedProperty = findInstanceComponentPropertyName(node, 'Checked 已选');
        const indeterminateProperty = findInstanceComponentPropertyName(node, 'Indeterminate 半选');
        const hoverProperty = findInstanceComponentPropertyName(node, 'Hover 悬浮');
        const disabledProperty = findInstanceComponentPropertyName(node, 'Disabled 禁用');
        const nextProps: Record<string, string | boolean> = {};

        if (labelToggleProperty) nextProps[labelToggleProperty] = true;
        if (checkedProperty) nextProps[checkedProperty] = toVariantBoolean(checked);
        if (indeterminateProperty) nextProps[indeterminateProperty] = 'False';
        if (hoverProperty) nextProps[hoverProperty] = 'False';
        if (disabledProperty) nextProps[disabledProperty] = toVariantBoolean(disabled);

        if (Object.keys(nextProps).length > 0) {
            node.setProperties(nextProps);
        }
    }

    if (!('findOne' in node)) return;
    const labelNode =
        node.findOne((child) => child.type === 'TEXT' && String(child.name || '').trim() === '选项一') ||
        node.findOne((child) => child.type === 'TEXT');

    if (labelNode && labelNode.type === 'TEXT') {
        await updateTextNodeCharacters(labelNode, label);
    }
}

async function applyCheckboxGroupItems(root: SceneNode, params: Record<string, any>): Promise<void> {
    if (!('children' in root)) return;

    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    const checkedValues = new Set(parseDelimitedText(params.checkedValues, []));
    const disabled = Boolean(params.disabled);

    let itemNodes = root.children.filter(isCheckboxGroupItemNode);
    if (itemNodes.length === 0) return;

    const templateNode = itemNodes[itemNodes.length - 1];
    if ('clone' in templateNode && itemNodes.length < options.length) {
        for (let index = itemNodes.length; index < options.length; index += 1) {
            root.appendChild(templateNode.clone());
        }
    }

    itemNodes = root.children.filter(isCheckboxGroupItemNode);
    if (itemNodes.length > options.length) {
        itemNodes.slice(options.length).forEach((item) => item.remove());
        itemNodes = root.children.filter(isCheckboxGroupItemNode);
    }

    if ('layoutMode' in root && root.layoutMode !== 'NONE' && Number(params.gap) > 0) {
        root.itemSpacing = Number(params.gap);
    }

    for (let index = 0; index < itemNodes.length; index += 1) {
        const label = options[index];
        if (!label) break;
        await updateCheckboxGroupItemNode(itemNodes[index], label, checkedValues.has(label), disabled);
    }
}

async function createCheckboxGroupFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    try {
        return await createCheckboxGroupFromCheckboxComponents(params);
    } catch (e) {
        console.warn('[CheckboxGroupTemplate] failed to compose from checkbox component', e);
    }

    const componentKey = String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    const itemCount = Math.min(8, Math.max(2, options.length));

    try {
	        const importedInstance = await createFigmaComponentInstance({
	            componentKey,
	            fallbackName: def.name,
	            variantCriteria: {
	                'Layout 布局': resolveCheckboxGroupLayoutVariantLabel(params.direction),
                'Items 数量': String(itemCount)
	            }
	        });

	        setNodeClipsContent(importedInstance, false);
	        await applyCheckboxGroupItems(importedInstance, params);
	        importedInstance.name = def.name;
	        return importedInstance;
	    } catch (e) {
	        console.warn('[CheckboxGroupTemplate] failed to create checkbox group from original Figma component', e);
        return null;
    }
}

function resolveRadioGroupLanguageVariantLabel(value: unknown): 'CN' | 'EN' {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === 'EN' ? 'EN' : 'CN';
}

function isRadioGroupItemNode(node: SceneNode): boolean {
    return String(node.name || '').includes('Radio 单选框');
}

async function updateRadioGroupItemNode(
    node: SceneNode,
    label: string,
    selected: boolean,
    disabled: boolean,
    language: 'CN' | 'EN'
): Promise<void> {
    if (node.type === 'INSTANCE') {
        const labelToggleProperty = findInstanceComponentPropertyName(node, 'Label 标签');
        const checkedProperty = findInstanceComponentPropertyName(node, 'Checked 已选');
        const hoverProperty = findInstanceComponentPropertyName(node, 'Hover 悬浮');
        const disabledProperty = findInstanceComponentPropertyName(node, 'Disabled 禁用');
        const languageProperty = findInstanceComponentPropertyName(node, 'Language');
        const nextProps: Record<string, string | boolean> = {};

        if (labelToggleProperty) nextProps[labelToggleProperty] = true;
        if (checkedProperty) nextProps[checkedProperty] = toVariantBoolean(selected);
        if (hoverProperty) nextProps[hoverProperty] = 'False';
        if (disabledProperty) nextProps[disabledProperty] = toVariantBoolean(disabled);
        if (languageProperty) nextProps[languageProperty] = language;

        if (Object.keys(nextProps).length > 0) {
            node.setProperties(nextProps);
        }
    }

    if (!('findOne' in node)) return;
    const labelNode =
        node.findOne((child) => child.type === 'TEXT' && String(child.name || '').trim() === '选项一') ||
        node.findOne((child) => child.type === 'TEXT');

    if (labelNode && labelNode.type === 'TEXT') {
        await updateTextNodeCharacters(labelNode, label);
    }
}

async function applyRadioGroupItems(root: SceneNode, params: Record<string, any>): Promise<void> {
    if (!('children' in root)) return;

    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    const selectedValue = String(params.value || options[0] || '').trim();
    const disabled = Boolean(params.disabled);
    const language = resolveRadioGroupLanguageVariantLabel(params.language);

    let itemNodes = root.children.filter(isRadioGroupItemNode);
    if (itemNodes.length === 0) return;

    const templateNode = itemNodes[itemNodes.length - 1];
    if ('clone' in templateNode && itemNodes.length < options.length) {
        for (let index = itemNodes.length; index < options.length; index += 1) {
            root.appendChild(templateNode.clone());
        }
    }

    itemNodes = root.children.filter(isRadioGroupItemNode);
    if (itemNodes.length > options.length) {
        itemNodes.slice(options.length).forEach((item) => item.remove());
        itemNodes = root.children.filter(isRadioGroupItemNode);
    }

    if ('layoutMode' in root && root.layoutMode !== 'NONE' && Number(params.gap) > 0) {
        root.itemSpacing = Number(params.gap);
    }

    for (let index = 0; index < itemNodes.length; index += 1) {
        const label = options[index];
        if (!label) break;
        await updateRadioGroupItemNode(itemNodes[index], label, label === selectedValue, disabled, language);
    }
}

async function createRadioGroupFromFigmaTemplate(
    def: ComponentDefinition,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const componentKey = String(def.figmaPropertySnapshot?.componentKey || '').trim();
    if (!componentKey) return null;

    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    const itemCount = Math.min(8, Math.max(2, options.length));

    try {
	        const importedInstance = await createFigmaComponentInstance({
	            componentKey,
	            fallbackName: def.name,
	            variantCriteria: {
	                'Layout 布局': resolveCheckboxGroupLayoutVariantLabel(params.direction),
                'Items 数量': String(itemCount),
                'Language': resolveRadioGroupLanguageVariantLabel(params.language)
	            }
	        });

	        setNodeClipsContent(importedInstance, false);
	        await applyRadioGroupItems(importedInstance, params);
	        importedInstance.name = def.name;
	        return importedInstance;
	    } catch (e) {
	        console.warn('[RadioGroupTemplate] failed to create radio group from original Figma component', e);
        return null;
    }
}

async function resolveInstanceMainComponentNode(instance: InstanceNode): Promise<ComponentNode | null> {
    const asyncGetter = (instance as unknown as {
        getMainComponentAsync?: () => Promise<ComponentNode | null>;
    }).getMainComponentAsync;

    if (typeof asyncGetter === 'function') {
        try {
            return await asyncGetter.call(instance);
        } catch {
            // fall back to sync accessor
        }
    }

    return instance.mainComponent || null;
}

function resolveFormAlignVariantLabel(value: unknown): 'Top 顶部对齐' | 'Left 左对齐' | 'Right 右对齐' {
    switch (normalizeFormAlign(value)) {
        case 'top':
            return 'Top 顶部对齐';
        case 'right':
            return 'Right 右对齐';
        default:
            return 'Left 左对齐';
    }
}

function resolveFormLabelWidthVariantLabel(params: Record<string, any>): 'Fill 跟随输入域' | 'Default 80' | 'Medium 120' | 'Large 160' {
    switch (normalizeFormLabelWidthPreset(params.labelWidthPreset)) {
        case 'fill':
            return 'Fill 跟随输入域';
        case 'medium-120':
            return 'Medium 120';
        case 'large-160':
            return 'Large 160';
        case 'default-80':
            return 'Default 80';
        default: {
            const explicit = Number(params.labelWidth);
            if (Number.isFinite(explicit) && explicit >= 150) return 'Large 160';
            if (Number.isFinite(explicit) && explicit >= 110) return 'Medium 120';
            return 'Default 80';
        }
    }
}

function normalizeFormFieldControlType(controlType: unknown): string {
    const normalized = String(controlType || '').trim().toLowerCase();
    if (!normalized) return 'input';
    if (normalized.includes('select') || normalized.includes('选择')) return 'select';
    if (normalized.includes('checkbox') || normalized.includes('多选')) return 'checkbox-group';
    if (normalized.includes('radio') || normalized.includes('单选')) return 'radio-group';
    if (normalized.includes('datepicker') || normalized.includes('日期')) return 'datepicker';
    if (normalized.includes('inputnumber') || normalized.includes('数字')) return 'inputnumber';
    if (normalized.includes('slider') || normalized.includes('滑动')) return 'slider';
    if (normalized.includes('switch') || normalized.includes('开关')) return 'switch';
    if (normalized.includes('textarea') || normalized.includes('多行')) return 'textarea';
    if (normalized.includes('timepicker') || normalized.includes('时间')) return 'timepicker';
    if (normalized.includes('upload') || normalized.includes('上传')) return 'upload';
    if (normalized.includes('button') || normalized.includes('按钮')) return 'button';
    if (normalized.includes('figma-component') || normalized.includes('figma')) return 'figma-component';
    if (normalized.includes('text') || normalized.includes('文本')) return 'text';
    return 'input';
}

function resolveFormFieldTemplateTypeLabel(controlType: unknown): string {
    switch (normalizeFormFieldControlType(controlType)) {
        case 'select':
            return 'Select 选择框';
        case 'checkbox-group':
            return 'Checkbox 多选';
        case 'radio-group':
            return 'Radio 单选';
        case 'datepicker':
            return 'DatePicker 日期选择';
        case 'inputnumber':
            return 'Inputnumber 数字输入';
        case 'slider':
            return 'Slider 滑动';
        case 'switch':
            return 'Switch 开关';
        case 'textarea':
            return 'Textarea 多行文本';
        case 'timepicker':
            return 'TimePicker 时间选择';
        case 'upload':
            return 'Upload 上传';
        default:
            return 'Input 输入框';
    }
}

function resolveHorizontalFormTemplateTypeCandidates(controlType: unknown): string[] {
    const normalized = normalizeFormFieldControlType(controlType);
    if (normalized === 'select') return ['Select 选择框', 'Input 输入框'];
    if (normalized === 'checkbox-group') return ['Checkbox 多选'];
    if (normalized === 'radio-group') return ['Radio 单选'];
    return [resolveFormFieldTemplateTypeLabel(normalized)];
}

function isFormFieldTemplateInstance(node: SceneNode, layout: 'vertical' | 'horizontal'): node is InstanceNode {
    if (node.type !== 'INSTANCE') return false;
    const name = String(node.name || '').trim();
    return layout === 'vertical'
        ? name.includes('Vertical Form 纵向表单')
        : name.includes('Horizontal Form 横向表单');
}

function isFormFieldLabelInstance(node: SceneNode): node is InstanceNode {
    return node.type === 'INSTANCE' && String(node.name || '').includes('Lable 表单文字标签');
}

function isFormFieldDescriptionInstance(node: SceneNode): boolean {
    return String(node.name || '').includes('Description 解释说明');
}

function isLikelyFormFieldControlNode(node: SceneNode): boolean {
    const name = String(node.name || '').trim();
    return (
        name.includes('Input 输入框') ||
        name.includes('Select 选择器') ||
        name.includes('Checkbox Group 复选框组') ||
        name.includes('Radio Group 单选框组') ||
        name.includes('Checkbox 复选框') ||
        name.includes('Radio 单选框')
    );
}

function getFormFieldMessageText(params: Record<string, any>): string {
    const errorText = String(params.errorText || '').trim();
    if (errorText) return errorText;
    return String(params.descriptionText || params.helpText || '').trim();
}

function hasFormFieldDescription(params: Record<string, any>): boolean {
    return !String(params.errorText || '').trim() && Boolean(getFormFieldMessageText(params));
}

function hasFormFieldError(params: Record<string, any>): boolean {
    return Boolean(String(params.errorText || '').trim());
}

function findFormFieldContentContainer(root: SceneNode): (SceneNode & ChildrenMixin) | null {
    if (!('children' in root)) return null;
    const directChildren = root.children;
    if (directChildren.some(isFormFieldLabelInstance)) {
        return root as SceneNode & ChildrenMixin;
    }

    for (const child of directChildren) {
        if ('children' in child && child.children.some(isFormFieldLabelInstance)) {
            return child as SceneNode & ChildrenMixin;
        }
    }

    return root as SceneNode & ChildrenMixin;
}

function setNodeClipsContent(node: SceneNode, enabled: boolean): void {
    if (!('clipsContent' in node)) return;
    try {
        (node as FrameNode | ComponentNode | InstanceNode).clipsContent = enabled;
    } catch {
        // ignore nodes that cannot be mutated in the current context
    }
}

function relaxFormFieldTemplateClipping(root: SceneNode): void {
    setNodeClipsContent(root, false);
    const contentContainer = findFormFieldContentContainer(root);
    if (contentContainer && contentContainer !== root) {
        setNodeClipsContent(contentContainer, false);
    }
}

async function updateFormFieldLabelTemplate(root: SceneNode, params: Record<string, any>): Promise<void> {
    const contentContainer = findFormFieldContentContainer(root);
    if (!contentContainer) return;

    const labelInstance = contentContainer.children.find(isFormFieldLabelInstance);
    if (!labelInstance) return;

    const requiredProperty = findInstanceComponentPropertyName(labelInstance, 'Required 必填');
    const helpProperty = findInstanceComponentPropertyName(labelInstance, 'Help 解释说明');
    const nextProps: Record<string, string | boolean> = {};
    if (requiredProperty) nextProps[requiredProperty] = Boolean(params.required);
    if (helpProperty) nextProps[helpProperty] = false;
    if (Object.keys(nextProps).length > 0) {
        labelInstance.setProperties(nextProps);
    }

    const labelTextNode =
        labelInstance.findOne((child) => child.type === 'TEXT' && String(child.name || '').trim() === 'Lable') ||
        labelInstance.findOne((child) => child.type === 'TEXT');
    if (labelTextNode && labelTextNode.type === 'TEXT') {
        await updateTextNodeCharacters(labelTextNode, String(params.label || '字段').trim() || '字段');
    }
}

async function updateFormFieldMessageTemplate(root: SceneNode, params: Record<string, any>): Promise<void> {
    if (!('children' in root)) return;
    const messageNode = root.children.find((child) => isFormFieldDescriptionInstance(child));
    if (!messageNode) return;

    if (messageNode.type === 'INSTANCE') {
        const typeProperty = findInstanceComponentPropertyName(messageNode, 'Type 类型');
        if (typeProperty) {
            messageNode.setProperties({ [typeProperty]: hasFormFieldError(params) ? 'Error 报错' : 'Default 默认' });
        }
    }

    const messageText = getFormFieldMessageText(params);
    if (!messageText) return;

    const textNode =
        ('findOne' in messageNode && messageNode.findOne((child) => child.type === 'TEXT')) || null;
    if (textNode && textNode.type === 'TEXT') {
        await updateTextNodeCharacters(textNode, messageText);
    }
}

async function updateInputControlTemplateInPlace(node: SceneNode, params: Record<string, any>): Promise<boolean> {
    if (node.type !== 'INSTANCE') return false;

    const disabled = Boolean(params.disabled);
    const error = Boolean(params.error);
    const showPrefix = hasInputAffix(params.showPrefix ?? params.prefix);
    const showSuffix = hasInputAffix(params.showSuffix ?? params.suffix);
    const hasValue = String(params.value ?? '').length > 0;
    const filled = Boolean(params.filled) || hasValue;

    const nextProps: Record<string, string | boolean> = {};
    const mappings: Array<[string, string | boolean]> = [
        ['Disable 禁用', toVariantBoolean(disabled)],
        ['Error 错误', toVariantBoolean(error)],
        ['Filled 已填', toVariantBoolean(filled)],
        ['Prefix 前缀', toVariantBoolean(showPrefix)],
        ['Size 尺寸', resolveInputSizeVariantLabel(params.size)],
        ['State 状态', resolveInputStateVariantLabel(params.state)],
        ['Suffix 后缀', toVariantBoolean(showSuffix)]
    ];
    for (const [displayName, value] of mappings) {
        const propertyName = findInstanceComponentPropertyName(node, displayName);
        if (propertyName) nextProps[propertyName] = value;
    }
    if (Object.keys(nextProps).length > 0) {
        node.setProperties(nextProps);
    }

    const width = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    if (width) {
        node.resize(width, node.height);
    }

    const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
    const mainTextNode =
        textNodes.find((child) => String(child.name || '').trim().toLowerCase() === 'text') ||
        textNodes[textNodes.length - 1];
    const nextValue = hasValue ? String(params.value) : String(params.placeholder || '请输入');
    if (mainTextNode) {
        await updateTextNodeCharacters(mainTextNode, nextValue);
    }

    const sideTextNodes = textNodes.filter((child) => child !== mainTextNode);
    const prefixText = String(params.prefixText || '').trim();
    const suffixText = String(params.suffixText || '').trim();
    if (showPrefix && prefixText && sideTextNodes[0]) {
        await updateTextNodeCharacters(sideTextNodes[0], prefixText);
    }
    if (showSuffix && suffixText) {
        const suffixNode = sideTextNodes[sideTextNodes.length - 1];
        if (suffixNode && suffixNode !== sideTextNodes[0]) {
            await updateTextNodeCharacters(suffixNode, suffixText);
        }
    }

    return true;
}

async function updateSelectControlTemplateInPlace(node: SceneNode, params: Record<string, any>): Promise<boolean> {
    if (node.type !== 'INSTANCE') return false;

    const currentValue = String(params.value || '').trim();
    const placeholder = String(params.placeholder || '请选择');
    const hasValue = currentValue.length > 0;
    const filled = Boolean(params.filled) || hasValue;
    const disabled = Boolean(params.disabled);
    const multiple = Boolean(params.multiple);

    const nextProps: Record<string, string | boolean> = {};
    const mappings: Array<[string, string | boolean]> = [
        ['Type 类型', resolveSelectTypeVariantLabel(params.selectType ?? params.type)],
        ['Size 尺寸', resolveInputSizeVariantLabel(params.size)],
        ['State 状态', resolveInputStateVariantLabel(params.state)],
        ['Filled 填写', toVariantBoolean(filled)],
        ['Multiple 多选', toVariantBoolean(multiple)],
        ['Disabled 禁用', toVariantBoolean(disabled)]
    ];
    for (const [displayName, value] of mappings) {
        const propertyName = findInstanceComponentPropertyName(node, displayName);
        if (propertyName) nextProps[propertyName] = value;
    }
    if (Object.keys(nextProps).length > 0) {
        node.setProperties(nextProps);
    }

    const width = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    if (width) {
        node.resize(width, node.height);
    }

    const displayTextNode = findSelectDisplayTextNode(node);
    if (displayTextNode) {
        await updateTextNodeCharacters(displayTextNode, hasValue ? currentValue : placeholder);
    }
    await applySelectDropdownOptions(node, params.optionsText);
    return true;
}

async function updateCheckboxGroupControlTemplateInPlace(node: SceneNode, params: Record<string, any>): Promise<boolean> {
    if (node.type !== 'INSTANCE') return false;
    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    if (options.length > 8) return false;

    const nextProps: Record<string, string | boolean> = {};
    const layoutProperty = findInstanceComponentPropertyName(node, 'Layout 布局');
    const itemsProperty = findInstanceComponentPropertyName(node, 'Items 数量');
    if (layoutProperty) nextProps[layoutProperty] = resolveCheckboxGroupLayoutVariantLabel(params.direction);
    if (itemsProperty) nextProps[itemsProperty] = String(Math.min(8, Math.max(2, options.length)));
    if (Object.keys(nextProps).length > 0) {
        node.setProperties(nextProps);
    }

    await applyCheckboxGroupItems(node, params);
    return true;
}

async function updateRadioGroupControlTemplateInPlace(node: SceneNode, params: Record<string, any>): Promise<boolean> {
    if (node.type !== 'INSTANCE') return false;
    const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
    if (options.length > 8) return false;

    const nextProps: Record<string, string | boolean> = {};
    const layoutProperty = findInstanceComponentPropertyName(node, 'Layout 布局');
    const itemsProperty = findInstanceComponentPropertyName(node, 'Items 数量');
    const languageProperty = findInstanceComponentPropertyName(node, 'Language');
    if (layoutProperty) nextProps[layoutProperty] = resolveCheckboxGroupLayoutVariantLabel(params.direction);
    if (itemsProperty) nextProps[itemsProperty] = String(Math.min(8, Math.max(2, options.length)));
    if (languageProperty) nextProps[languageProperty] = resolveRadioGroupLanguageVariantLabel(params.language);
    if (Object.keys(nextProps).length > 0) {
        node.setProperties(nextProps);
    }

    await applyRadioGroupItems(node, params);
    return true;
}

async function updateFormFieldControlTemplateInPlace(root: SceneNode, params: Record<string, any>): Promise<boolean> {
    const contentContainer = findFormFieldContentContainer(root);
    if (!contentContainer) return false;

    const existingControlNode = contentContainer.children.find(
        (child) => !isFormFieldLabelInstance(child) && !isFormFieldDescriptionInstance(child)
    ) || contentContainer.children.find(isLikelyFormFieldControlNode);
    if (!existingControlNode) return false;

    setNodeClipsContent(existingControlNode, false);

    const controlType = normalizeFormFieldControlType(params.controlType);
    if (controlType === 'input') {
        return await updateInputControlTemplateInPlace(existingControlNode, params);
    }
    if (controlType === 'select') {
        return await updateSelectControlTemplateInPlace(existingControlNode, params);
    }
    if (controlType === 'checkbox-group') {
        return await updateCheckboxGroupControlTemplateInPlace(existingControlNode, params);
    }
    if (controlType === 'radio-group') {
        return await updateRadioGroupControlTemplateInPlace(existingControlNode, params);
    }
    return true;
}

async function replaceFormFieldControlTemplate(
    root: SceneNode,
    instance: ComponentInstance,
    params: Record<string, any>
): Promise<void> {
    const contentContainer = findFormFieldContentContainer(root);
    if (!contentContainer) return;

    const existingControlNode = contentContainer.children.find(
        (child) => !isFormFieldLabelInstance(child) && !isFormFieldDescriptionInstance(child)
    ) || contentContainer.children.find(isLikelyFormFieldControlNode);
    if (!existingControlNode) return;

    const nextControlWidth =
        toPositiveNumber(params.controlWidth) ??
        toPositiveNumber(params.width) ??
        Math.round(existingControlNode.width);

    const controlInstance =
        instance.children && instance.children.length > 0
            ? instance.children[0]
            : createControlInstanceFromFormFieldParams({
                ...params,
                controlWidth: nextControlWidth
            });

    const controlNode = await renderComponent(controlInstance, { isRoot: false });
    setNodeClipsContent(controlNode, false);
    replaceSceneNode(existingControlNode, controlNode);
}

async function extractHorizontalFormFieldShell(
    params: Record<string, any>
): Promise<InstanceNode | null> {
    const importedForm = await createFigmaComponentInstance({
        componentKey: FORM_FIELD_HORIZONTAL_COMPONENT_KEY,
        fallbackName: 'Horizontal Form 横向表单',
        variantCriteria: {
            'Label 标签长度': resolveFormLabelWidthVariantLabel(params),
            'Type 类型': resolveFormFieldTemplateTypeLabel(params.controlType),
            'Description 描述': toVariantBoolean(hasFormFieldDescription(params)),
            'Error 报错': toVariantBoolean(hasFormFieldError(params))
        }
    });

    try {
        return importedForm;
    } finally {
        // caller takes ownership when returning instance successfully
    }
}

async function createFormFieldFromFigmaTemplate(
    instance: ComponentInstance,
    params: Record<string, any>
): Promise<SceneNode | null> {
    const layout = resolveFormFieldLayout(params);
    const controlType = normalizeFormFieldControlType(params.controlType);
    const supportsTemplateControl =
        controlType === 'input' ||
        controlType === 'select' ||
        controlType === 'checkbox-group' ||
        controlType === 'radio-group' ||
        controlType === 'datepicker' ||
        controlType === 'inputnumber' ||
        controlType === 'slider' ||
        controlType === 'switch' ||
        controlType === 'textarea' ||
        controlType === 'timepicker' ||
        controlType === 'upload';
    if (!supportsTemplateControl) return null;

    let templateInstance: InstanceNode | null = null;
    try {
        if (layout === 'vertical') {
            const fieldDef = COMPONENT_DEFS['form-field'];
            const componentKey = String(fieldDef?.figmaPropertySnapshot?.componentKey || '').trim();
            if (!componentKey) return null;
            templateInstance = await createFigmaComponentInstance({
                componentKey,
                fallbackName: fieldDef?.name,
                variantCriteria: {
                    'Type 类型': resolveFormFieldTemplateTypeLabel(controlType),
                    'Description 描述': toVariantBoolean(hasFormFieldDescription(params)),
                    'Error 报错': toVariantBoolean(hasFormFieldError(params))
                }
            });
        } else {
            templateInstance = await extractHorizontalFormFieldShell(params);
        }

        if (!templateInstance) return null;

        relaxFormFieldTemplateClipping(templateInstance);
        await updateFormFieldLabelTemplate(templateInstance, params);
        const updatedInPlace = !instance.children?.length
            ? await updateFormFieldControlTemplateInPlace(templateInstance, params)
            : false;
        await updateFormFieldMessageTemplate(templateInstance, params);
        if (updatedInPlace) {
            templateInstance.name = COMPONENT_DEFS['form-field']?.name || '表单字段';
            return templateInstance;
        }

        const detached = templateInstance.detachInstance();
        relaxFormFieldTemplateClipping(detached);
        await updateFormFieldLabelTemplate(detached, params);
        await replaceFormFieldControlTemplate(detached, instance, params);
        await updateFormFieldMessageTemplate(detached, params);
        detached.name = COMPONENT_DEFS['form-field']?.name || '表单字段';
        return detached;
    } catch (e) {
        console.warn('[FormFieldTemplate] failed to create form field from original Figma template', e);
        try {
            templateInstance?.remove();
        } catch {}
        return null;
    }
}

async function createInputAffixNode(
    textValue: unknown,
    disabled: boolean,
    fontSize: number
): Promise<SceneNode> {
    const text = String(textValue || '').trim();
    if (text) {
        const affixText = figma.createText();
        await applyTextStyleBinding(affixText, 'input-text-style-key', { family: 'Inter', style: 'Regular', size: fontSize });
        affixText.characters = text;
        if (disabled) {
            await applyColorVariable(affixText, 'input-disabled-text-key', '#C9CDD4');
        } else {
            await applyColorVariable(affixText, 'input-affix-key', '#737A87');
        }
        return affixText;
    }

    const icon = figma.createFrame();
    icon.layoutMode = 'VERTICAL';
    icon.primaryAxisSizingMode = 'FIXED';
    icon.counterAxisSizingMode = 'FIXED';
    icon.primaryAxisAlignItems = 'CENTER';
    icon.counterAxisAlignItems = 'CENTER';
    icon.resize(12, 12);
    icon.cornerRadius = 6;
    if (disabled) {
        await applyColorVariable(icon, 'input-disabled-text-key', '#C9CDD4');
    } else {
        await applyColorVariable(icon, 'input-affix-key', '#737A87');
    }
    return icon;
}

function normalizeFormAlign(value: unknown): 'top' | 'left' | 'right' {
    const normalized = String(value || '').trim().toLowerCase();
    if (
        normalized.includes('top') ||
        normalized.includes('顶部') ||
        normalized.includes('vertical') ||
        normalized.includes('纵向')
    ) {
        return 'top';
    }
    if (normalized.includes('right') || normalized.includes('右')) return 'right';
    return 'left';
}

function normalizeFormLabelWidthPreset(value: unknown): 'fill' | 'default-80' | 'medium-120' | 'large-160' | 'custom' {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || normalized === 'custom') return 'custom';
    if (normalized.includes('fill') || normalized.includes('跟随')) return 'fill';
    if (normalized.includes('160') || normalized.includes('large')) return 'large-160';
    if (normalized.includes('120') || normalized.includes('medium')) return 'medium-120';
    if (normalized.includes('80') || normalized.includes('default')) return 'default-80';
    return 'custom';
}

function resolveFormFieldLayout(params: Record<string, any>): 'horizontal' | 'vertical' | 'inline' {
    const explicitLayout = String(params.layout || '').trim();
    if (explicitLayout) {
        return normalizeFormLayout(explicitLayout);
    }
    return normalizeFormAlign(params.align) === 'top' ? 'vertical' : 'horizontal';
}

function resolveFormLabelWidth(params: Record<string, any>): number {
    const explicit = Number(params.labelWidth);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    switch (normalizeFormLabelWidthPreset(params.labelWidthPreset)) {
        case 'default-80':
            return 80;
        case 'medium-120':
            return 120;
        case 'large-160':
            return 160;
        default:
            return 96;
    }
}

function parseDelimitedText(value: unknown, fallback: string[]): string[] {
    const raw = String(value || '').trim();
    const items = raw
        ? raw.split(/[\n\r,，|]/).map((item) => item.trim()).filter(Boolean)
        : [];
    return items.length > 0 ? items : fallback;
}

function inheritFormFieldParams(
    formParams: Record<string, any>,
    instance: ComponentInstance
): ComponentInstance {
    if (instance.componentId === 'form-field') {
        const currentParams = instance.params || {};
        const inheritedAlign = normalizeFormAlign(formParams.align || currentParams.align);
        const inferredLayout =
            String(currentParams.layout || '').trim()
                ? currentParams.layout
                : inheritedAlign === 'top'
                    ? 'vertical'
                    : normalizeFormLayout(formParams.layout || 'horizontal');
        const nextParams = {
            align: inheritedAlign,
            layout: inferredLayout,
            labelAlign: currentParams.labelAlign || (inheritedAlign === 'right' ? 'right' : 'left'),
            labelWidthPreset: currentParams.labelWidthPreset || formParams.labelWidthPreset || 'custom',
            labelWidth: currentParams.labelWidth ?? formParams.labelWidth,
            controlWidth: currentParams.controlWidth ?? formParams.controlWidth,
            showColon: currentParams.showColon ?? formParams.showColon,
            ...currentParams
        };
        if (formParams.requiredMark === false) {
            nextParams.required = false;
        }
        return { ...instance, params: nextParams };
    }

    if (instance.componentId === 'form-row' && Array.isArray(instance.children)) {
        return {
            ...instance,
            children: instance.children.map((child) => inheritFormFieldParams(formParams, child))
        };
    }

    return instance;
}

function inheritRowFormFieldParams(
    rowParams: Record<string, any>,
    instance: ComponentInstance
): ComponentInstance {
    if (instance.componentId !== 'form-field') return instance;
    const currentParams = instance.params || {};
    const nextParams = { ...rowParams, ...currentParams };
    delete nextParams.spacing;
    delete nextParams.paddingBottom;
    delete nextParams.align;
    delete nextParams.width;
    return { ...instance, params: nextParams };
}

const FORM_INHERITED_PARAM_KEYS = [
    'align',
    'layout',
    'labelAlign',
    'labelWidthPreset',
    'labelWidth',
    'controlWidth',
    'showColon'
];
const FORM_FIELD_DEFAULTS: Record<string, any> = {
    layout: 'horizontal',
    labelAlign: 'left',
    labelWidthPreset: 'custom',
    labelWidth: 96,
    controlWidth: 240,
    showColon: false
};

function patchFormInstanceSnapshot(
    snapshot: ComponentInstance,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): ComponentInstance {
    const oldColumnSpacing = toPositiveNumber(prevParams.columnSpacing);
    const newColumnSpacing = toPositiveNumber(nextParams.columnSpacing);

    const shouldInheritValue = (current: unknown, previous: unknown): boolean =>
        current === undefined || current === previous;

    const patchChild = (child: ComponentInstance): ComponentInstance => {
        let nextChild = child;
        if (child.componentId === 'form-row') {
            const rowParams = { ...(child.params || {}) };
            const currentSpacing = toPositiveNumber(rowParams.spacing);
            const inheritedSpacing =
                currentSpacing === null ||
                currentSpacing === oldColumnSpacing ||
                (oldColumnSpacing === null && currentSpacing === 16);
            if (newColumnSpacing !== null && inheritedSpacing) {
                rowParams.spacing = newColumnSpacing;
            }
            nextChild = { ...child, params: rowParams };
        }

        if (child.componentId === 'form-field') {
            const fieldParams = { ...(child.params || {}) };
            FORM_INHERITED_PARAM_KEYS.forEach((key) => {
                const inheritsByDefault =
                    prevParams[key] === undefined &&
                    FORM_FIELD_DEFAULTS[key] !== undefined &&
                    fieldParams[key] === FORM_FIELD_DEFAULTS[key];
                if (shouldInheritValue(fieldParams[key], prevParams[key]) || inheritsByDefault) {
                    delete fieldParams[key];
                }
            });
            nextChild = { ...child, params: fieldParams };
        }

        if (Array.isArray(nextChild.children)) {
            nextChild = { ...nextChild, children: nextChild.children.map(patchChild) };
        }
        return nextChild;
    };

    const next: ComponentInstance = {
        ...snapshot,
        componentId: 'form',
        params: nextParams
    };
    if (Array.isArray(snapshot.children)) {
        next.children = snapshot.children.map(patchChild);
    }
    return next;
}

function mapFormRowAlignment(value: unknown): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'CENTER';
    if (normalized === 'end' || normalized === 'right') return 'MAX';
    if (normalized === 'between' || normalized === 'space-between') return 'SPACE_BETWEEN';
    return 'MIN';
}

function createControlInstanceFromFormFieldParams(params: Record<string, any>): ComponentInstance {
    const controlType = normalizeFormFieldControlType(params.controlType);
    const controlWidth = Number(params.controlWidth);
    const width = Number.isFinite(controlWidth) && controlWidth > 0 ? controlWidth : undefined;

    if (controlType === 'select') {
        return {
            id: 'form-field-control',
            componentId: 'select',
            params: {
                placeholder: params.placeholder || '请选择',
                value: params.value || '',
                width,
                size: params.size || 'Default 32',
                state: params.state || 'Default 默认',
                filled: Boolean(params.filled),
                disabled: Boolean(params.disabled),
                multiple: Boolean(params.multiple),
                selectType: params.selectType || 'Default 默认',
                optionsText: params.optionsText || '选项一,选项二'
            }
        };
    }

    if (controlType === 'checkbox-group') {
        return {
            id: 'form-field-control',
            componentId: 'checkbox-group',
            params: {
                optionsText: params.optionsText || '选项一,选项二',
                checkedValues: params.checkedValues || params.value || '选项一',
                direction: params.direction || 'horizontal',
                gap: params.gap,
                disabled: Boolean(params.disabled)
            }
        };
    }

    if (controlType === 'radio-group') {
        return {
            id: 'form-field-control',
            componentId: 'radio-group',
            params: {
                optionsText: params.optionsText || '选项一,选项二',
                value: params.value || '选项一',
                direction: params.direction || 'horizontal',
                language: params.language || 'CN',
                gap: params.gap,
                disabled: Boolean(params.disabled)
            }
        };
    }

    if (controlType === 'button') {
        return {
            id: 'form-field-control',
            componentId: 'button',
            params: {
                label: params.buttonLabel || params.value || '按钮',
                variant: params.buttonVariant || 'secondary',
                theme: params.theme || 'default',
                size: params.size || 'Default 32',
                state: params.state || 'Default 默认',
                disabled: Boolean(params.disabled),
                iconOnly: Boolean(params.iconOnly),
                showPrefixIcon: Boolean(params.showPrefixIcon ?? params.prefixIcon),
                showSuffixIcon: Boolean(params.showSuffixIcon ?? params.suffixIcon),
                language: params.language || 'CN',
                width
            }
        };
    }

    if (controlType === 'figma-component') {
        return {
            id: 'form-field-control',
            componentId: 'figma-component',
            params: {
                componentToken: params.componentToken || '',
                componentKey: params.componentKey || '',
                variantCriteria: params.variantCriteria || '',
                width
            }
        };
    }

    if (controlType === 'text') {
        return {
            id: 'form-field-control',
            componentId: 'text',
            params: {
                text: params.text || params.value || 'Text'
            }
        };
    }

    return {
        id: 'form-field-control',
        componentId: 'input',
        params: {
            placeholder: params.placeholder || '请输入',
            value: params.value || '',
            width,
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            filled: Boolean(params.filled),
            error: Boolean(params.error),
            disabled: Boolean(params.disabled),
            showPrefix: Boolean(params.showPrefix ?? params.prefix),
            prefixText: params.prefixText || '',
            showSuffix: Boolean(params.showSuffix ?? params.suffix),
            suffixText: params.suffixText || ''
        }
    };
}

function replaceSceneNode(oldNode: SceneNode, newNode: SceneNode): boolean {
    const parent = oldNode.parent;
    if (
        !parent ||
        (
            parent.type !== 'PAGE' &&
            parent.type !== 'FRAME' &&
            parent.type !== 'GROUP' &&
            parent.type !== 'COMPONENT' &&
            parent.type !== 'INSTANCE' &&
            parent.type !== 'SECTION'
        )
    ) {
        return false;
    }

    const index = parent.children.indexOf(oldNode);
    const parentUsesAutoLayout = 'layoutMode' in parent && parent.layoutMode !== 'NONE';
    const preserveAbsolutePosition =
        !parentUsesAutoLayout ||
        ('layoutPositioning' in oldNode && oldNode.layoutPositioning === 'ABSOLUTE');
    const oldX = oldNode.x;
    const oldY = oldNode.y;
    const oldRotation = 'rotation' in oldNode ? oldNode.rotation : 0;
    const oldVisible = oldNode.visible;
    const oldLocked = oldNode.locked;
    const oldName = oldNode.name;

    if ('layoutGrow' in oldNode && 'layoutGrow' in newNode) {
        newNode.layoutGrow = oldNode.layoutGrow;
    }
    if ('layoutAlign' in oldNode && 'layoutAlign' in newNode) {
        newNode.layoutAlign = oldNode.layoutAlign;
    }
    if ('layoutPositioning' in oldNode && 'layoutPositioning' in newNode) {
        newNode.layoutPositioning = oldNode.layoutPositioning;
    }
    if ('constraints' in oldNode && 'constraints' in newNode) {
        newNode.constraints = oldNode.constraints;
    }

    newNode.visible = false;
    parent.insertChild(index, newNode);

    if (preserveAbsolutePosition) {
        newNode.x = oldX;
        newNode.y = oldY;
    }
    if ('rotation' in newNode) {
        newNode.rotation = oldRotation;
    }
    newNode.name = oldName;
    newNode.locked = oldLocked;
    newNode.visible = oldVisible;

    oldNode.remove();
    return true;
}

function getColorVariableBindingIndex(): Record<string, ColorVariableBindingIndexEntry> {
    if (COLOR_VARIABLE_BINDING_INDEX) {
        return COLOR_VARIABLE_BINDING_INDEX;
    }

    const index: Record<string, ColorVariableBindingIndexEntry> = {};

    Object.values(COMPONENT_DEFS).forEach((def) => {
        const bindings = def.colorVariableBindings || {};
        Object.entries(bindings).forEach(([semanticKey, binding]) => {
            const key = String(semanticKey || '').trim();
            if (!key) return;
            const tokenResolved = binding.token ? resolveColorTokenProfile(binding.token) : undefined;
            const tokenProfile = tokenResolved?.profile;

            const existing = index[key];
            const normalizedEntry: ColorVariableBindingIndexEntry = {
                enabled: Boolean(binding.enabled),
                token: binding.token,
                baseToken: tokenResolved?.baseToken,
                variableRef: binding.variableRef || tokenProfile?.variableRef,
                keyCandidates: mergeUnique(tokenProfile?.keyCandidates, binding.keyCandidates),
                idCandidates: mergeUnique(tokenProfile?.idCandidates, binding.idCandidates),
                nameCandidates: mergeUnique(tokenProfile?.nameCandidates, binding.nameCandidates)
            };

            if (!existing) {
                index[key] = normalizedEntry;
                return;
            }

            index[key] = {
                enabled: existing.enabled || normalizedEntry.enabled,
                token: existing.token || normalizedEntry.token,
                baseToken: existing.baseToken || normalizedEntry.baseToken,
                variableRef: existing.variableRef || normalizedEntry.variableRef,
                keyCandidates: mergeUnique(existing.keyCandidates, normalizedEntry.keyCandidates),
                idCandidates: mergeUnique(existing.idCandidates, normalizedEntry.idCandidates),
                nameCandidates: mergeUnique(existing.nameCandidates, normalizedEntry.nameCandidates)
            };
        });
    });

    COLOR_VARIABLE_BINDING_INDEX = index;
    return COLOR_VARIABLE_BINDING_INDEX;
}

function getTypographyBindingIndex(): Record<string, TypographyBindingIndexEntry> {
    if (TYPOGRAPHY_BINDING_INDEX) {
        return TYPOGRAPHY_BINDING_INDEX;
    }

    const index: Record<string, TypographyBindingIndexEntry> = {};

    Object.values(COMPONENT_DEFS).forEach((def) => {
        const bindings = def.typographyBindings || {};
        Object.entries(bindings).forEach(([semanticKey, binding]) => {
            const key = String(semanticKey || '').trim();
            if (!key) return;
            const tokenResolved = binding.token ? resolveTypographyTokenProfile(binding.token) : undefined;
            const tokenProfile = tokenResolved?.profile;

            const existing = index[key];
            const normalizedEntry: TypographyBindingIndexEntry = {
                enabled: Boolean(binding.enabled),
                token: binding.token,
                baseToken: tokenResolved?.baseToken,
                textStyleRef: binding.textStyleRef || tokenProfile?.textStyleRef,
                keyCandidates: mergeUnique(tokenProfile?.keyCandidates, binding.keyCandidates),
                idCandidates: mergeUnique(tokenProfile?.idCandidates, binding.idCandidates),
                nameCandidates: mergeUnique(tokenProfile?.nameCandidates, binding.nameCandidates)
            };

            if (!existing) {
                index[key] = normalizedEntry;
                return;
            }

            index[key] = {
                enabled: existing.enabled || normalizedEntry.enabled,
                token: existing.token || normalizedEntry.token,
                baseToken: existing.baseToken || normalizedEntry.baseToken,
                textStyleRef: existing.textStyleRef || normalizedEntry.textStyleRef,
                keyCandidates: mergeUnique(existing.keyCandidates, normalizedEntry.keyCandidates),
                idCandidates: mergeUnique(existing.idCandidates, normalizedEntry.idCandidates),
                nameCandidates: mergeUnique(existing.nameCandidates, normalizedEntry.nameCandidates)
            };
        });
    });

    TYPOGRAPHY_BINDING_INDEX = index;
    return TYPOGRAPHY_BINDING_INDEX;
}

function findComponentVariableKey(
    componentId: string,
    preferred: string[],
    fuzzyIncludes: string[]
): string | null {
    const def = COMPONENT_DEFS[componentId];
    const bindings = def?.colorVariableBindings;
    if (!bindings) return null;

    for (const key of preferred) {
        if (bindings[key]?.enabled) return key;
    }

    for (const [key, binding] of Object.entries(bindings)) {
        if (!binding?.enabled) continue;
        const normalized = key.toLowerCase();
        if (fuzzyIncludes.some((token) => normalized.includes(token.toLowerCase()))) {
            return key;
        }
    }

    return null;
}

function findComponentTypographyKey(
    componentId: string,
    preferred: string[],
    fuzzyIncludes: string[]
): string | null {
    const def = COMPONENT_DEFS[componentId];
    const bindings = def?.typographyBindings;
    if (!bindings) return null;

    for (const key of preferred) {
        if (bindings[key]?.enabled) return key;
    }

    for (const [key, binding] of Object.entries(bindings)) {
        if (!binding?.enabled) continue;
        const normalized = key.toLowerCase();
        if (fuzzyIncludes.some((token) => normalized.includes(token.toLowerCase()))) {
            return key;
        }
    }

    return null;
}

function normalizeVariableRef(raw: string): string {
    let key = String(raw || '').trim();
    if (!key) return '';

    const commaIndex = key.indexOf(',');
    if (commaIndex >= 0) key = key.slice(0, commaIndex);

    if (key.startsWith('VariableID:')) {
        key = key.slice('VariableID:'.length);
        const slashIndex = key.indexOf('/');
        if (slashIndex > 0) key = key.slice(0, slashIndex);
    }

    if (key.startsWith('S:')) {
        key = key.slice(2);
    }

    return key.trim();
}

function toLowerTrim(value: string): string {
    return value.trim().toLowerCase();
}

async function getLocalColorVariables(): Promise<Variable[]> {
    if (LOCAL_COLOR_VARIABLES_CACHE) {
        return LOCAL_COLOR_VARIABLES_CACHE;
    }

    if (typeof figma.variables === 'undefined') {
        LOCAL_COLOR_VARIABLES_CACHE = [];
        return LOCAL_COLOR_VARIABLES_CACHE;
    }

    try {
        const variables = await figma.variables.getLocalVariablesAsync();
        LOCAL_COLOR_VARIABLES_CACHE = variables.filter(v => v.resolvedType === 'COLOR');
        return LOCAL_COLOR_VARIABLES_CACHE;
    } catch (e) {
        console.warn('Failed to read local color variables:', e);
        LOCAL_COLOR_VARIABLES_CACHE = [];
        return LOCAL_COLOR_VARIABLES_CACHE;
    }
}

async function getOrCreateTokenColorCollection(): Promise<VariableCollection | null> {
    if (TOKEN_COLOR_COLLECTION_CACHE !== undefined) {
        return TOKEN_COLOR_COLLECTION_CACHE;
    }
    if (typeof figma.variables === 'undefined') {
        TOKEN_COLOR_COLLECTION_CACHE = null;
        return TOKEN_COLOR_COLLECTION_CACHE;
    }

    try {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        const existing = collections.find((collection) => collection.name === TOKEN_COLOR_COLLECTION_NAME);
        if (existing) {
            TOKEN_COLOR_COLLECTION_CACHE = existing;
            return TOKEN_COLOR_COLLECTION_CACHE;
        }

        const created = figma.variables.createVariableCollection(TOKEN_COLOR_COLLECTION_NAME);
        TOKEN_COLOR_COLLECTION_CACHE = created;
        return TOKEN_COLOR_COLLECTION_CACHE;
    } catch (e) {
        console.warn('[ColorVar] failed to get/create token collection', e);
        TOKEN_COLOR_COLLECTION_CACHE = null;
        return TOKEN_COLOR_COLLECTION_CACHE;
    }
}

async function ensureTokenColorVariable(token: string, fallbackHex: string): Promise<Variable | null> {
    if (typeof figma.variables === 'undefined') return null;

    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) return null;

    const localVariables = await getLocalColorVariables();
    const tokenNames = [normalizedToken, `UIAgent/${normalizedToken}`].map(toLowerTrim);
    const existing = localVariables.find((variable) => tokenNames.includes(toLowerTrim(variable.name)));
    if (existing) return existing;

    const collection = await getOrCreateTokenColorCollection();
    if (!collection) return null;
    if (!collection.modes || collection.modes.length === 0) return null;

    try {
        const variable = figma.variables.createVariable(normalizedToken, collection, 'COLOR');
        const fallbackColor = parseColor(fallbackHex);
        const colorValue: RGBA = { ...fallbackColor, a: 1 };
        collection.modes.forEach((mode) => {
            variable.setValueForMode(mode.modeId, colorValue);
        });

        if (LOCAL_COLOR_VARIABLES_CACHE) {
            LOCAL_COLOR_VARIABLES_CACHE = [...LOCAL_COLOR_VARIABLES_CACHE, variable];
        }
        return variable;
    } catch (e) {
        console.warn(`[ColorVar] failed to create local token variable "${normalizedToken}"`, e);
        return null;
    }
}

async function resolveColorVariable(
    variableKey: string,
    fallbackHex?: string,
    options?: ResolveColorVariableOptions
): Promise<Variable | null> {
    const allowCreateToken = options?.allowCreateToken !== false;
    const cacheKey = allowCreateToken ? variableKey : `${variableKey}::strict`;
    const cacheHit = COLOR_VARIABLE_CACHE.get(cacheKey);
    if (cacheHit !== undefined) return cacheHit;

    if (typeof figma.variables === 'undefined') {
        console.warn(`[ColorVar] figma.variables unavailable; skip binding for "${variableKey}"`);
        COLOR_VARIABLE_CACHE.set(cacheKey, null);
        return null;
    }

    const binding = getColorVariableBindingIndex()[variableKey];
    if (!binding || !binding.enabled) {
        console.warn(`[ColorVar] binding missing or disabled for "${variableKey}"`);
        COLOR_VARIABLE_CACHE.set(cacheKey, null);
        return null;
    }

    const sourceRef = binding.variableRef || '';
    const rawCandidates = new Set<string>([
        ...(sourceRef ? [sourceRef] : []),
        ...(binding.keyCandidates || []),
        ...(binding.idCandidates || [])
    ]);

    for (const raw of rawCandidates) {
        const candidate = normalizeVariableRef(raw);
        if (!candidate) continue;

        try {
            const imported = await figma.variables.importVariableByKeyAsync(candidate);
            if (imported && imported.resolvedType === 'COLOR') {
                COLOR_VARIABLE_CACHE.set(cacheKey, imported);
                return imported;
            }
        } catch {
            // ignore import failures
        }

        try {
            const byId = await figma.variables.getVariableByIdAsync(raw);
            if (byId && byId.resolvedType === 'COLOR') {
                COLOR_VARIABLE_CACHE.set(cacheKey, byId);
                return byId;
            }
        } catch {
            // ignore id failures
        }

        if (candidate !== raw) {
            try {
                const byNormalizedId = await figma.variables.getVariableByIdAsync(candidate);
                if (byNormalizedId && byNormalizedId.resolvedType === 'COLOR') {
                    COLOR_VARIABLE_CACHE.set(cacheKey, byNormalizedId);
                    return byNormalizedId;
                }
            } catch {
                // ignore id failures
            }
        }
    }

    const nameCandidates = [
        ...(binding.nameCandidates || []),
        variableKey
    ]
      .map(toLowerTrim)
      .filter(Boolean);

    let localColorsCount = 0;
    if (nameCandidates.length > 0) {
        const localColors = await getLocalColorVariables();
        localColorsCount = localColors.length;

        // exact match first
        for (const name of nameCandidates) {
            const exact = localColors.find(v => toLowerTrim(v.name) === name);
            if (exact) {
                COLOR_VARIABLE_CACHE.set(cacheKey, exact);
                return exact;
            }
        }

        // then includes match
        for (const name of nameCandidates) {
            const fuzzy = localColors.find(v => toLowerTrim(v.name).includes(name));
            if (fuzzy) {
                COLOR_VARIABLE_CACHE.set(cacheKey, fuzzy);
                return fuzzy;
            }
        }
    }

    if (allowCreateToken && (binding.baseToken || binding.token) && fallbackHex) {
        const tokenForCreate = binding.baseToken || binding.token!;
        const created = await ensureTokenColorVariable(tokenForCreate, fallbackHex);
        if (created && created.resolvedType === 'COLOR') {
            COLOR_VARIABLE_CACHE.set(cacheKey, created);
            console.info(`[ColorVar] created local variable for token "${tokenForCreate}" (semantic=${binding.token || '-'}) and bound to "${variableKey}"`);
            return created;
        }
    }

    console.warn(
        `[ColorVar] failed to resolve "${variableKey}" token=${binding.token || '-'} base=${binding.baseToken || '-'} ref=${sourceRef || '-'} localColors=${localColorsCount} key=${(binding.keyCandidates || []).join('|')} id=${(binding.idCandidates || []).join('|')} names=${(binding.nameCandidates || []).join('|')}`
    );
    COLOR_VARIABLE_CACHE.set(cacheKey, null);
    return null;
}

function normalizeTextStyleRef(raw: string): string {
    let value = String(raw || '').trim();
    if (!value) return '';

    const commaIndex = value.indexOf(',');
    if (commaIndex >= 0) value = value.slice(0, commaIndex);

    if (value.startsWith('S:')) {
        value = value.slice('S:'.length);
    }

    return value.trim();
}

function getLocalTextStyles(): TextStyle[] {
    if (LOCAL_TEXT_STYLES_CACHE) {
        return LOCAL_TEXT_STYLES_CACHE;
    }
    try {
        LOCAL_TEXT_STYLES_CACHE = figma.getLocalTextStyles();
        return LOCAL_TEXT_STYLES_CACHE;
    } catch (e) {
        console.warn('[Typography] failed to read local text styles', e);
        LOCAL_TEXT_STYLES_CACHE = [];
        return LOCAL_TEXT_STYLES_CACHE;
    }
}

function getLocalEffectStyles(): EffectStyle[] {
    if (LOCAL_EFFECT_STYLES_CACHE) {
        return LOCAL_EFFECT_STYLES_CACHE;
    }
    try {
        LOCAL_EFFECT_STYLES_CACHE = figma.getLocalEffectStyles();
        return LOCAL_EFFECT_STYLES_CACHE;
    } catch (e) {
        console.warn('[EffectStyle] failed to read local effect styles', e);
        LOCAL_EFFECT_STYLES_CACHE = [];
        return LOCAL_EFFECT_STYLES_CACHE;
    }
}

async function resolveEffectStyle(bindingKey: string, refs: string[], names: string[] = []): Promise<EffectStyle | null> {
    const cacheKey = [bindingKey, ...refs, ...names].join('|');
    const cacheHit = EFFECT_STYLE_CACHE.get(cacheKey);
    if (cacheHit !== undefined) return cacheHit;

    const rawCandidates = new Set<string>(refs.filter(Boolean));
    for (const raw of rawCandidates) {
        const keyCandidate = normalizeTextStyleRef(raw);
        if (!keyCandidate) continue;

        try {
            const imported = await figma.importStyleByKeyAsync(keyCandidate);
            if (imported && imported.type === 'EFFECT') {
                const effectStyle = imported as EffectStyle;
                EFFECT_STYLE_CACHE.set(cacheKey, effectStyle);
                return effectStyle;
            }
        } catch {
            // ignore
        }

        try {
            const localByRaw = figma.getStyleById(raw) || figma.getStyleById(keyCandidate);
            if (localByRaw && localByRaw.type === 'EFFECT') {
                const effectStyle = localByRaw as EffectStyle;
                EFFECT_STYLE_CACHE.set(cacheKey, effectStyle);
                return effectStyle;
            }
        } catch {
            // ignore
        }
    }

    const nameCandidates = names
      .map(toLowerTrim)
      .filter(Boolean);
    if (nameCandidates.length > 0) {
        const localStyles = getLocalEffectStyles();
        for (const name of nameCandidates) {
            const exact = localStyles.find((style) => toLowerTrim(style.name) === name);
            if (exact) {
                EFFECT_STYLE_CACHE.set(cacheKey, exact);
                return exact;
            }
        }
        for (const name of nameCandidates) {
            const fuzzy = localStyles.find((style) => toLowerTrim(style.name).includes(name));
            if (fuzzy) {
                EFFECT_STYLE_CACHE.set(cacheKey, fuzzy);
                return fuzzy;
            }
        }
    }

    EFFECT_STYLE_CACHE.set(cacheKey, null);
    return null;
}

async function applyEffectStyleRef(
    node: SceneNode,
    bindingKey: string,
    refs: string[],
    names: string[] = []
): Promise<boolean> {
    const effectStyle = await resolveEffectStyle(bindingKey, refs, names);
    if (!effectStyle) return false;
    try {
        (node as SceneNode & { effectStyleId?: string }).effectStyleId = effectStyle.id;
        return true;
    } catch (e) {
        console.warn(`[EffectStyle] failed to apply "${bindingKey}"`, e);
        return false;
    }
}

async function resolveTextStyle(bindingKey: string): Promise<TextStyle | null> {
    const cacheHit = TEXT_STYLE_CACHE.get(bindingKey);
    if (cacheHit !== undefined) return cacheHit;

    const binding = getTypographyBindingIndex()[bindingKey];
    if (!binding || !binding.enabled) {
        TEXT_STYLE_CACHE.set(bindingKey, null);
        return null;
    }

    const sourceRef = binding.textStyleRef || '';
    const rawCandidates = new Set<string>([
        ...(sourceRef ? [sourceRef] : []),
        ...(binding.keyCandidates || []),
        ...(binding.idCandidates || [])
    ]);

    for (const raw of rawCandidates) {
        const keyCandidate = normalizeTextStyleRef(raw);
        if (!keyCandidate) continue;

        try {
            const imported = await figma.importStyleByKeyAsync(keyCandidate);
            if (imported && imported.type === 'TEXT') {
                const textStyle = imported as TextStyle;
                TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                return textStyle;
            }
        } catch {
            // ignore
        }

        try {
            const localByRaw = figma.getStyleById(raw);
            if (localByRaw && localByRaw.type === 'TEXT') {
                const textStyle = localByRaw as TextStyle;
                TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                return textStyle;
            }
        } catch {
            // ignore
        }

        if (keyCandidate !== raw) {
            try {
                const localByKey = figma.getStyleById(keyCandidate);
                if (localByKey && localByKey.type === 'TEXT') {
                    const textStyle = localByKey as TextStyle;
                    TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                    return textStyle;
                }
            } catch {
                // ignore
            }
        }
    }

    const nameCandidates = [
        ...(binding.nameCandidates || []),
        bindingKey
    ]
      .map(toLowerTrim)
      .filter(Boolean);

    if (nameCandidates.length > 0) {
        const localStyles = getLocalTextStyles();
        for (const name of nameCandidates) {
            const exact = localStyles.find((style) => toLowerTrim(style.name) === name);
            if (exact) {
                TEXT_STYLE_CACHE.set(bindingKey, exact);
                return exact;
            }
        }
        for (const name of nameCandidates) {
            const fuzzy = localStyles.find((style) => toLowerTrim(style.name).includes(name));
            if (fuzzy) {
                TEXT_STYLE_CACHE.set(bindingKey, fuzzy);
                return fuzzy;
            }
        }
    }

    console.warn(
        `[Typography] failed to resolve "${bindingKey}" token=${binding.token || '-'} base=${binding.baseToken || '-'} ref=${sourceRef || '-'} key=${(binding.keyCandidates || []).join('|')} id=${(binding.idCandidates || []).join('|')} names=${(binding.nameCandidates || []).join('|')}`
    );
    TEXT_STYLE_CACHE.set(bindingKey, null);
    return null;
}

async function applyTextStyleBinding(
    node: TextNode,
    bindingKey: string,
    fallback?: { family: string; style: string; size?: number }
): Promise<boolean> {
    const style = await resolveTextStyle(bindingKey);
    if (style) {
        try {
            if (style.fontName !== figma.mixed) {
                await figma.loadFontAsync(style.fontName as FontName);
            }
            await node.setTextStyleIdAsync(style.id);
            return true;
        } catch (e) {
            console.warn(`[Typography] failed to apply style for "${bindingKey}"`, e);
        }
    }

    if (fallback) {
        try {
            const fontName: FontName = { family: fallback.family, style: fallback.style };
            await figma.loadFontAsync(fontName);
            node.fontName = fontName;
            if (typeof fallback.size === 'number') {
                node.fontSize = fallback.size;
            }
        } catch (e) {
            console.warn(`[Typography] fallback font load failed for "${bindingKey}"`, e);
        }
    }

    return false;
}

async function createFigmaTagInstanceByToken(token: string): Promise<InstanceNode | null> {
    const normalized = String(token || '').trim();
    if (!normalized) return null;
    const resolved = resolveComponentTokenProfile(normalized);
    if (!resolved?.profile?.componentKey) {
        return null;
    }
    try {
        return await createFigmaComponentInstance({
            componentKey: resolved.profile.componentKey,
            fallbackName: resolved.profile.displayName
        });
    } catch (e) {
        console.warn(`[FigmaTag] failed to create instance for token="${normalized}"`, e);
        return null;
    }
}

async function createFigmaComponentInstanceByToken(
    token: string,
    options?: {
        variantCriteria?: VariantCriteria | ((variant: ComponentNode) => boolean);
        visible?: boolean;
    }
): Promise<InstanceNode | null> {
    const normalized = String(token || '').trim();
    if (!normalized) return null;
    const resolved = resolveComponentTokenProfile(normalized);
    if (!resolved?.profile?.componentKey) return null;

    const cacheKey = buildTokenCacheKey(normalized, options?.variantCriteria);
    if (cacheKey) {
        const cached = FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.get(cacheKey);
        if (cached) {
            try {
                const clone = cached.clone();
                if (options?.visible === false) {
                    clone.visible = false;
                } else {
                    clone.visible = true;
                }
                return clone;
            } catch (e) {
                console.warn('[FigmaComponent] failed to clone cached instance', e);
            }
        }
    }

    try {
        const instance = await createFigmaComponentInstance({
            componentKey: resolved.profile.componentKey,
            fallbackName: resolved.profile.displayName,
            variantCriteria: options?.variantCriteria,
            visible: options?.visible
        });
        if (cacheKey && instance) {
            try {
                const template = instance.clone();
                template.visible = false;
                template.x = -100000;
                FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.set(cacheKey, template);
            } catch (e) {
                console.warn('[FigmaComponent] failed to cache instance', e);
            }
        }
        return instance;
    } catch (e) {
        console.warn(`[FigmaComponent] failed to create instance for token="${normalized}"`, e);
        return null;
    }
}

async function trySetFirstTextInInstance(instance: InstanceNode, text: string): Promise<boolean> {
    const nextText = String(text || '');
    if (!nextText) return false;
    const textNodes = instance.findAll((node) => node.type === 'TEXT') as TextNode[];
    for (const textNode of textNodes) {
        try {
            if (textNode.fontName !== figma.mixed) {
                await figma.loadFontAsync(textNode.fontName as FontName);
            }
            textNode.characters = nextText;
            return true;
        } catch {
            // try next node
        }
    }
    return false;
}

function resolveThemeFallbackHex(variableKey: string, fallbackHex: string): string {
    if (variableKey === 'bg-var-key' || variableKey === 'layout-bg-key') {
        if (fallbackHex === '#F5F5F5') return THEME_TOKENS['bg-secondary'][currentTheme];
        if (fallbackHex === '#FFFFFF') return THEME_TOKENS['bg-base'][currentTheme];
        return fallbackHex;
    }
    if (variableKey === 'layout-border-key' || variableKey === 'input-border-key' || variableKey === 'select-border-key') {
        return fallbackHex === '#EAEDF1' ? THEME_TOKENS['border-base'][currentTheme] : fallbackHex;
    }
    if (variableKey === 'text-primary-key' || variableKey === 'table-cell-text-key') {
        return fallbackHex === '#0C0D0E' ? THEME_TOKENS['text-primary'][currentTheme] : fallbackHex;
    }
    if (variableKey === 'text-secondary-key' || variableKey === 'table-header-text-key') {
        return fallbackHex === '#42464E' ? THEME_TOKENS['text-secondary'][currentTheme] : fallbackHex;
    }
    if (variableKey === 'btn-primary-bg') {
        return fallbackHex === '#1890FF' ? THEME_TOKENS['brand-primary'][currentTheme] : fallbackHex;
    }
    if (variableKey === 'table-action-primary-key') {
        return THEME_TOKENS['brand-primary'][currentTheme];
    }
    if (variableKey === 'table-action-icon-key') {
        return THEME_TOKENS['text-secondary'][currentTheme];
    }
    if (variableKey === 'table-cell-bg-key') {
        return fallbackHex === '#FFFFFF' ? THEME_TOKENS['bg-base'][currentTheme] : fallbackHex;
    }
    if (variableKey === 'table-header-bg-key') {
        return fallbackHex === '#F5F5F5' ? THEME_TOKENS['bg-secondary'][currentTheme] : fallbackHex;
    }
    if (variableKey === 'table-border-key') {
        return fallbackHex === '#EAEDF1' ? THEME_TOKENS['border-base'][currentTheme] : fallbackHex;
    }
    return fallbackHex;
}

type PaintProperty = 'fills' | 'strokes';
type PaintBindingNode = SceneNode & {
    fills?: readonly Paint[] | PluginAPI['mixed'];
    strokes?: readonly Paint[] | PluginAPI['mixed'];
};
type EffectBindingNode = SceneNode & {
    effects?: readonly Effect[] | PluginAPI['mixed'];
};

async function bindVariableToPaintProperty(
    node: SceneNode,
    variableKey: string,
    property: PaintProperty,
    fallbackColor: RGB,
    fallbackHex: string
): Promise<boolean> {
    if (typeof figma.variables === 'undefined') return false;

    const paintNode = node as PaintBindingNode;
    if (!(property in paintNode)) return false;

    const variable = await resolveColorVariable(variableKey, fallbackHex);
    if (!variable) return false;

    try {
        const currentPaints = (paintNode[property] === figma.mixed || !paintNode[property])
            ? []
            : [...(paintNode[property] as Paint[])];
        const paints = currentPaints.length > 0
            ? currentPaints
            : [{ type: 'SOLID', color: fallbackColor } as SolidPaint];

        const boundPaints = paints.map((paint) => {
            if (paint.type === 'SOLID') {
                return figma.variables.setBoundVariableForPaint(paint, 'color', variable);
            }
            return paint;
        });

        (paintNode as any)[property] = boundPaints;
        return true;
    } catch (e) {
        console.warn(`Failed to bind variable ${variableKey} to ${property}:`, e);
        return false;
    }
}

// Helper to apply color variable or fallback hex (fills)
async function applyColorVariable(node: SceneNode, variableKey: string, fallbackHex: string) {
    const colorHex = resolveThemeFallbackHex(variableKey, fallbackHex);
    const color = parseColor(colorHex);
    const bound = await bindVariableToPaintProperty(node, variableKey, 'fills', color, colorHex);
    if (bound) return;

    if ('fills' in node) {
        (node as any).fills = [{ type: 'SOLID', color }];
    }
}

// Helper to apply color variable or fallback hex (strokes)
async function applyStrokeColorVariable(node: SceneNode, variableKey: string, fallbackHex: string) {
    const colorHex = resolveThemeFallbackHex(variableKey, fallbackHex);
    const color = parseColor(colorHex);
    const bound = await bindVariableToPaintProperty(node, variableKey, 'strokes', color, colorHex);
    if (bound) return;

    if ('strokes' in node) {
        (node as any).strokes = [{ type: 'SOLID', color }];
    }
}

async function bindVariableToEffectProperty(
    node: SceneNode,
    effectIndex: number,
    variableKey: string,
    fallbackHex: string
): Promise<boolean> {
    if (typeof figma.variables === 'undefined') return false;

    const effectNode = node as EffectBindingNode;
    if (!('effects' in effectNode)) return false;

    const variable = await resolveColorVariable(variableKey, fallbackHex, { allowCreateToken: false });
    if (!variable) return false;

    try {
        const currentEffects = (effectNode.effects === figma.mixed || !effectNode.effects)
            ? []
            : [...(effectNode.effects as Effect[])];
        const currentEffect = currentEffects[effectIndex];
        if (!currentEffect) return false;

        currentEffects[effectIndex] = figma.variables.setBoundVariableForEffect(currentEffect, 'color', variable);
        (effectNode as any).effects = currentEffects;
        return true;
    } catch (e) {
        console.warn(`Failed to bind variable ${variableKey} to effects[${effectIndex}].color:`, e);
        return false;
    }
}

async function applyEffectColorVariable(
    node: SceneNode,
    effectIndex: number,
    variableKey: string,
    fallbackHex: string
) {
    const colorHex = resolveThemeFallbackHex(variableKey, fallbackHex);
    const color = parseColor(colorHex);
    const bound = await bindVariableToEffectProperty(node, effectIndex, variableKey, colorHex);
    if (bound) return;

    const effectNode = node as EffectBindingNode;
    if (!('effects' in effectNode)) return;
    const currentEffects = (effectNode.effects === figma.mixed || !effectNode.effects)
        ? []
        : [...(effectNode.effects as Effect[])];
    const currentEffect = currentEffects[effectIndex];
    if (!currentEffect || !('color' in currentEffect)) return;

    const alpha = typeof currentEffect.color?.a === 'number' ? currentEffect.color.a : 1;
    currentEffects[effectIndex] = {
        ...currentEffect,
        color: { ...color, a: alpha }
    } as Effect;
    (effectNode as any).effects = currentEffects;
}

// Helper to parse color
function parseColor(hex: string): RGB {
  if (!hex) return { r: 0, g: 0, b: 0 };
  hex = hex.replace('#', '');
  if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

function readNodeParams(node: BaseNode): Record<string, any> {
  if (!('getPluginData' in node)) return {};
  const raw = node.getPluginData('params');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const COMPONENT_INSTANCE_KEY = 'component-instance';

function shouldStoreComponentInstance(instance: ComponentInstance): boolean {
  return FULL_RERENDER_COMPONENT_IDS.has(instance.componentId);
}

function collectChildComponentNodes(root: SceneNode): SceneNode[] {
  const results: SceneNode[] = [];
  const stack: SceneNode[] = [];
  if ('children' in root) {
    stack.push(...root.children);
  }
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    if ('getPluginData' in current && current.getPluginData('component-id')) {
      results.push(current);
      continue;
    }
    if ('children' in current) {
      stack.push(...current.children);
    }
  }
  return results;
}

function buildComponentInstanceFromNode(node: SceneNode): ComponentInstance | null {
  if (!('getPluginData' in node)) return null;
  const componentId = node.getPluginData('component-id');
  if (!componentId) return null;
  const params = readNodeParams(node);
  const instance: ComponentInstance = {
    id: node.id,
    componentId,
    params
  };
  const childComponentNodes = collectChildComponentNodes(node);
  if (childComponentNodes.length > 0) {
    const children = childComponentNodes
      .map((child) => buildComponentInstanceFromNode(child))
      .filter(Boolean) as ComponentInstance[];
    if (children.length > 0) {
      instance.children = children;
    }
  }
  return instance;
}

function readComponentInstanceSnapshot(node: BaseNode): ComponentInstance | null {
  if (!('getPluginData' in node)) return null;
  const raw = node.getPluginData(COMPONENT_INSTANCE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.componentId || !parsed.params) return null;
    return parsed as ComponentInstance;
  } catch {
    return null;
  }
}

function writeComponentInstanceSnapshot(node: BaseNode, instance: ComponentInstance) {
  if (!('setPluginData' in node)) return;
  try {
    node.setPluginData(COMPONENT_INSTANCE_KEY, JSON.stringify(instance));
  } catch (e) {
    console.warn('Failed to write component instance snapshot', e);
  }
}

function writeNodeParams(node: BaseNode, nextParams: Record<string, any>) {
  if (!('setPluginData' in node)) return;
  try {
    node.setPluginData('params', JSON.stringify(nextParams));
  } catch (e) {
    console.warn('Failed to write node params', e);
  }
}

function mergeNodeParams(node: BaseNode, patch: Record<string, any>) {
  const current = readNodeParams(node);
  writeNodeParams(node, { ...current, ...patch });
}

function applyNodeSize(node: SceneNode, width: number | null, height: number | null) {
  const nextWidth = typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : node.width;
  const nextHeight = typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : node.height;
  if ('resize' in node && (nextWidth !== node.width || nextHeight !== node.height)) {
    try {
      node.resize(nextWidth, nextHeight);
    } catch {
      // ignore
    }
  }

  if ('layoutMode' in node && node.layoutMode !== 'NONE') {
    const isHorizontal = node.layoutMode === 'HORIZONTAL';
    if (typeof width === 'number' && Number.isFinite(width) && width > 0) {
      if (isHorizontal && 'primaryAxisSizingMode' in node) {
        node.primaryAxisSizingMode = 'FIXED';
      } else if (!isHorizontal && 'counterAxisSizingMode' in node) {
        node.counterAxisSizingMode = 'FIXED';
      }
    }
    if (typeof height === 'number' && Number.isFinite(height) && height > 0) {
      if (!isHorizontal && 'primaryAxisSizingMode' in node) {
        node.primaryAxisSizingMode = 'FIXED';
      } else if (isHorizontal && 'counterAxisSizingMode' in node) {
        node.counterAxisSizingMode = 'FIXED';
      }
    }
  }
}

function collectTextNodes(root: SceneNode): TextNode[] {
  const results: TextNode[] = [];
  const stack: SceneNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === 'TEXT') {
      results.push(node);
    }
    if ('children' in node) {
      for (const child of node.children) {
        stack.push(child);
      }
    }
  }
  return results;
}

async function applyCellAlignment(cell: SceneNode, align: 'left' | 'right' | 'center') {
  if ((cell.type === 'FRAME' || cell.type === 'INSTANCE') && 'primaryAxisAlignItems' in cell) {
    if (align === 'right') {
      cell.primaryAxisAlignItems = 'MAX';
    } else if (align === 'center') {
      cell.primaryAxisAlignItems = 'CENTER';
    } else {
      cell.primaryAxisAlignItems = 'MIN';
    }
  }
  const textNodes = collectTextNodes(cell);
  for (const textNode of textNodes) {
    try {
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

function applyCellTextDisplay(cell: SceneNode, mode: 'ellipsis' | 'lineBreak') {
  const textNodes = collectTextNodes(cell);
  for (const textNode of textNodes) {
    try {
      if (mode === 'lineBreak') {
        textNode.textAutoResize = 'HEIGHT';
        textNode.textTruncation = 'NONE';
      } else {
        textNode.textAutoResize = 'NONE';
        textNode.textTruncation = 'ENDING';
      }
    } catch (e) {
      console.warn('Failed to apply text display mode', e);
    }
  }
  mergeNodeParams(cell, { textDisplay: mode });
}

function applyColumnWidthMode(column: FrameNode, mode: 'FIXED' | 'HUG' | 'FILL', width?: number) {
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

function isTableActionCellComponentId(componentId: string): boolean {
  return componentId === 'table-cell-action-text' || componentId === 'table-cell-action-icon';
}

async function setSceneText(node: SceneNode, text: string) {
  const nextText = String(text ?? '');
  const textNodes = collectTextNodes(node);
  const target = textNodes[0];
  if (!target) return;
  try {
    await figma.loadFontAsync(target.fontName as FontName);
    target.characters = nextText;
  } catch (e) {
    console.warn('Failed to set text', e);
  }
}

async function ensureOperationColumnHeader(column: FrameNode) {
  mergeNodeParams(column, { headerText: '操作' });
  const headerCell = column.children.find((child) => child.getPluginData('component-id') === 'table-header-cell');
  if (!headerCell) return;
  mergeNodeParams(headerCell, { text: '操作' });
  await setSceneText(headerCell as SceneNode, '操作');
}

// Helper to swap component type
async function swapComponent(node: SceneNode, newComponentId: string): Promise<SceneNode | null> {
    const currentParamsStr = node.getPluginData('params');
    const currentParams = currentParamsStr ? JSON.parse(currentParamsStr) : {};
    
    // Get new defaults
    const defaultParams = getDefaultParams(newComponentId);
    
    const newParams: any = { ...defaultParams };
    
    // Check what keys are valid for the new component
    const newDef = COMPONENT_DEFS[newComponentId];
    if (!newDef) return null;
    
    for (const key in currentParams) {
        // If the new component definition has this param, use the current value
        if (newDef.params[key]) {
             newParams[key] = currentParams[key];
        }
    }

    const isActionCell = isTableActionCellComponentId(newComponentId);
    if (isActionCell) {
        newParams.width = 0;
    }
    
    // Special handling for text content mapping
    if (currentParams.text && newDef.params.tagText) {
        const defaultTagText = defaultParams.tagText;
        if (!newParams.tagText || newParams.tagText === defaultTagText) {
            newParams.tagText = currentParams.text;
        }
    }
    if (currentParams.text && newDef.params.value && !newParams.value) { // for input
        newParams.value = currentParams.text;
    }
    if (currentParams.tagText && newDef.params.text && !newParams.text) {
        newParams.text = currentParams.tagText;
    }
    
    const instance: ComponentInstance = {
        id: 'temp-swap',
        componentId: newComponentId,
        params: newParams
    };
    
    const columnToUpdate = isActionCell ? findTableColumnFromNode(node) : null;
    const newNode = await renderComponent(instance);
    if (!replaceSceneNode(node, newNode)) return null;
    if (columnToUpdate) {
        applyColumnWidthMode(columnToUpdate, 'HUG');
        mergeNodeParams(columnToUpdate, { width: undefined });
    }
    return newNode;
}

// Recursive function to render a component
async function renderComponent(
  instance: ComponentInstance,
  options: { isRoot?: boolean } = {}
): Promise<SceneNode> {
  const isRoot = options.isRoot ?? true;
  const def = COMPONENT_DEFS[instance.componentId];
  if (!def) throw new Error(`Unknown component type: ${instance.componentId}`);

  let node: SceneNode;
  
  // Merge defaults with instance params
  const defaultParams = getDefaultParams(instance.componentId);
  const params = { ...defaultParams, ...instance.params };

  // --- FIGMA COMPONENT INSTANCE ---
  if (instance.componentId === 'figma-component') {
    const componentKeyFromParam = typeof params.componentKey === 'string' ? params.componentKey.trim() : '';
    const componentToken = typeof params.componentToken === 'string' ? params.componentToken.trim() : '';
    const componentKeyFromToken = componentToken ? resolveComponentTokenProfile(componentToken)?.profile.componentKey || '' : '';
    const componentKey = componentKeyFromParam || componentKeyFromToken;
    if (!componentKey) {
      throw new Error('figma-component requires params.componentToken or params.componentKey');
    }

    const fallbackName =
      typeof params.fallbackName === 'string' && params.fallbackName.trim()
        ? params.fallbackName.trim()
        : undefined;

    const variantCriteria = parseVariantCriteria(params.variantCriteria);
    const importedInstance = await createFigmaComponentInstance({
      componentKey,
      fallbackName,
      variantCriteria
    });

    const width = Number(params.width);
    const height = Number(params.height);
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      importedInstance.resize(width, height);
    } else if (Number.isFinite(width) && width > 0) {
      importedInstance.resize(width, importedInstance.height);
    } else if (Number.isFinite(height) && height > 0) {
      importedInstance.resize(importedInstance.width, height);
    }

    node = importedInstance;
  }
  // --- PAGE ---
  else if (instance.componentId === 'page') {
    // 1. Root Frame
    const frame = figma.createFrame();
    frame.resize(params.width || 1440, params.height || 900);
    // REMOVE Auto Layout from Root
    // frame.layoutMode = 'VERTICAL'; 
    frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White bg
    
    // 2. Side Nav (Render first to be at bottom/middle z-index)
    const sideNav = figma.createFrame();
    sideNav.name = "Side Nav";
    sideNav.layoutMode = 'VERTICAL';
    // Calculate height: Total Height - Top Nav Height (48)
    const sideNavHeight = (params.height || 900) - 48;
    sideNav.resize(200, sideNavHeight); 
    sideNav.fills = [{ type: 'SOLID', color: { r: 0.964, g: 0.972, b: 0.98 } }];
    
    // Position Side Nav at (0, 48)
    sideNav.x = 0;
    sideNav.y = 48;
    
    frame.appendChild(sideNav);

    // 3. Content Area (Render second)
    const contentArea = figma.createFrame();
    contentArea.name = "Content Area";
    contentArea.layoutMode = 'VERTICAL';
    // Calculate width: Total Width - Side Nav Width (200)
    const contentWidth = (params.width || 1440) - 200;
    const contentHeight = (params.height || 900) - 48;
    contentArea.resize(contentWidth, contentHeight);
    
    contentArea.paddingLeft = 32;
    contentArea.paddingRight = 32;
    contentArea.paddingTop = 32;
    contentArea.paddingBottom = 32;
    contentArea.itemSpacing = 20;
    contentArea.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    
    // Position Content Area at (200, 48)
    contentArea.x = 200;
    contentArea.y = 48;
    
    // Add children to Content Area
    if (instance.children) {
      for (const child of instance.children) {
        const childNode = await renderComponent(child, { isRoot: false });
        // Ensure child fills the content area width if it's a block element
        if (childNode.type === 'FRAME') {
             childNode.layoutAlign = 'STRETCH';
        }
        contentArea.appendChild(childNode);
      }
    }
    frame.appendChild(contentArea);

    // 4. Top Nav (Render LAST to be on TOP z-index)
    const topNav = figma.createFrame();
    topNav.name = "Top Nav";
    topNav.layoutMode = 'HORIZONTAL';
    topNav.resize(1440, 48);
    topNav.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    topNav.paddingLeft = 20;
    topNav.counterAxisAlignItems = 'CENTER';
    
    // Position Top Nav at (0, 0)
    topNav.x = 0;
    topNav.y = 0;
    
    // Add Drop Shadow
    topNav.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.08 },
        offset: { x: 0, y: 2 },
        radius: 6,
        visible: true,
        blendMode: 'NORMAL'
    }];
    
    if (params.title) {
        const titleText = figma.createText();
        await applyTextStyleBinding(titleText, 'page-title-text-style-key', { family: 'Inter', style: 'Bold', size: 16 });
        titleText.characters = params.title;
        topNav.appendChild(titleText);
    }
    frame.appendChild(topNav);
    
    node = frame;
  }
  // --- LAYOUT ---
  else if (instance.componentId === 'layout') {
    const frame = figma.createFrame();
    frame.layoutMode = params.direction === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    
    // Spacing & Padding
    if (params.spacing) frame.itemSpacing = params.spacing;
    
    const pTop = params.paddingTop ?? params.padding ?? 0;
    const pBottom = params.paddingBottom ?? params.padding ?? 0;
    const pLeft = params.paddingLeft ?? params.padding ?? 0;
    const pRight = params.paddingRight ?? params.padding ?? 0;
    
    frame.paddingTop = pTop;
    frame.paddingBottom = pBottom;
    frame.paddingLeft = pLeft;
    frame.paddingRight = pRight;

    // Background
    if (params.backgroundColor) {
      await applyColorVariable(frame, 'layout-bg-key', params.backgroundColor);
    } else {
        frame.fills = []; // Transparent by default if not set
    }

    // Border
    if (params.borderWidth && params.borderWidth > 0) {
        await applyStrokeColorVariable(frame, 'layout-border-key', params.borderColor || '#EAEDF1');
        
        if (params.borderBottomOnly) {
            frame.strokeWeight = 0;
            frame.strokeBottomWeight = params.borderWidth;
        } else {
            frame.strokeWeight = params.borderWidth;
        }
    }

    // Corner Radius
    if (params.cornerRadius) {
        frame.cornerRadius = params.cornerRadius;
    }
    frame.clipsContent = Boolean(params.clipsContent);
    
    // Width override
    if (params.width && params.width > 0) {
        frame.resize(params.width, frame.height);
        frame.primaryAxisSizingMode = 'FIXED';
    }

    // Children
    if (instance.children) {
      for (const child of instance.children) {
        const childNode = await renderComponent(child, { isRoot: false });
        frame.appendChild(childNode);
      }
    }
    node = frame;

  } 
  // --- FORM ---
  else if (instance.componentId === 'form') {
    const frame = figma.createFrame();
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = Number(params.rowSpacing) > 0 ? Number(params.rowSpacing) : (normalizeFormAlign(params.align) === 'top' ? 24 : 12);
    frame.fills = [];
    frame.clipsContent = false;
    const columnSpacing = toPositiveNumber(params.columnSpacing);

    const width = Number(params.width);
    if (Number.isFinite(width) && width > 0) {
        frame.resize(width, 100);
        frame.counterAxisSizingMode = 'FIXED';
    }

    if (params.title) {
        const titleNode = figma.createText();
        await applyTextStyleBinding(titleNode, 'card-title-text-style-key', { family: 'Inter', style: 'Bold', size: 16 });
        titleNode.characters = String(params.title);
        await applyColorVariable(titleNode, 'card-title', '#0C0D0E');
        frame.appendChild(titleNode);
    }

    if (instance.children) {
        for (const child of instance.children) {
            let processedChild = child;
            if (child.componentId === 'form-row' && Array.isArray(child.children) && child.children.length === 1 && child.children[0].componentId === 'form-field') {
                processedChild = child.children[0];
                processedChild.params = {
                    ...child.params,
                    ...processedChild.params
                };
            } else if (child.componentId === 'form-row' && columnSpacing !== null) {
                processedChild = {
                    ...child,
                    params: {
                        ...(child.params || {}),
                        spacing:
                            toPositiveNumber((child.params || {}).spacing) === null
                                ? columnSpacing
                                : (child.params || {}).spacing
                    }
                };
            }
            const childNode = await renderComponent(inheritFormFieldParams(params, processedChild), { isRoot: false });
            if ((childNode.type === 'FRAME' || childNode.type === 'INSTANCE') && frame.counterAxisSizingMode === 'FIXED') {
                childNode.layoutAlign = 'STRETCH';
            }
            frame.appendChild(childNode);
        }
    }
    node = frame;
  }
  // --- FORM ROW ---
  else if (instance.componentId === 'form-row') {
    const frame = figma.createFrame();
    frame.layoutMode = 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.itemSpacing = Number(params.spacing) > 0 ? Number(params.spacing) : 16;
    frame.primaryAxisAlignItems = mapFormRowAlignment(params.align);
    frame.counterAxisAlignItems = 'MIN';
    frame.paddingBottom = Number(params.paddingBottom) > 0 ? Number(params.paddingBottom) : 0;
    frame.fills = [];
    frame.clipsContent = false;

    const width = Number(params.width);
    if (Number.isFinite(width) && width > 0) {
        frame.resize(width, 100);
        frame.counterAxisSizingMode = 'FIXED';
    }

    if (instance.children) {
        for (const child of instance.children) {
            const childNode = await renderComponent(inheritRowFormFieldParams(params, child), { isRoot: false });
            frame.appendChild(childNode);
        }
    }
    node = frame;
  }
  // --- FORM FIELD ---
  else if (instance.componentId === 'form-field') {
    const templateNode = await createFormFieldFromFigmaTemplate(instance, params);
    if (templateNode) {
        node = templateNode;
    } else {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

    const layout = resolveFormFieldLayout(params);
    const labelAlign = String(params.labelAlign || '').trim().toLowerCase() === 'right' ? 'right' : 'left';
    const frame = figma.createFrame();
    frame.layoutMode = layout === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.counterAxisAlignItems = layout === 'vertical' ? 'MIN' : 'CENTER';
    frame.itemSpacing = layout === 'vertical' ? 8 : 8;
    frame.fills = [];
    frame.clipsContent = false;

    const label = String(params.label || '').trim();
    if (label) {
        const labelWrap = figma.createFrame();
        labelWrap.layoutMode = 'HORIZONTAL';
        labelWrap.primaryAxisSizingMode = layout === 'vertical' ? 'AUTO' : 'FIXED';
        labelWrap.counterAxisSizingMode = 'AUTO';
        labelWrap.counterAxisAlignItems = 'CENTER';
        labelWrap.primaryAxisAlignItems = layout === 'vertical' ? 'MIN' : (labelAlign === 'right' ? 'MAX' : 'MIN');
        labelWrap.itemSpacing = 4;
        labelWrap.fills = [];
        labelWrap.clipsContent = false;

        const labelWidth = resolveFormLabelWidth(params);
        if (layout !== 'vertical' && Number.isFinite(labelWidth) && labelWidth > 0) {
            labelWrap.resize(labelWidth, 20);
        }

        if (params.required) {
            const requiredNode = figma.createText();
            await applyTextStyleBinding(requiredNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            requiredNode.characters = '*';
            await applyColorVariable(requiredNode, 'form-required-text', '#F5222D');
            labelWrap.appendChild(requiredNode);
        }

        const labelNode = figma.createText();
        await applyTextStyleBinding(labelNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
        labelNode.characters = `${label}${params.showColon === false ? '' : '：'}`;
        await applyColorVariable(labelNode, 'form-label-text', '#42464E');
        if (layout !== 'vertical') {
            labelNode.layoutGrow = 1;
        }
        labelWrap.appendChild(labelNode);
        frame.appendChild(labelWrap);
    }

    const controlColumn = figma.createFrame();
    controlColumn.layoutMode = 'VERTICAL';
    controlColumn.primaryAxisSizingMode = 'AUTO';
    controlColumn.counterAxisSizingMode = 'AUTO';
    controlColumn.itemSpacing = 4;
    controlColumn.fills = [];
    controlColumn.clipsContent = false;

    const controlNode = instance.children && instance.children.length > 0
      ? await renderComponent(instance.children[0], { isRoot: false })
      : await renderComponent(createControlInstanceFromFormFieldParams(params), { isRoot: false });
    controlColumn.appendChild(controlNode);

    const messageText = String(params.errorText || params.descriptionText || params.helpText || '').trim();
    if (messageText) {
        const helpNode = figma.createText();
        await applyTextStyleBinding(helpNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 12 });
        helpNode.characters = messageText;
        if (String(params.errorText || '').trim()) {
            helpNode.fills = [{ type: 'SOLID', color: parseColor('#F5222D') }];
        } else {
            await applyColorVariable(helpNode, 'form-help-text', '#737A87');
        }
        controlColumn.appendChild(helpNode);
    }

    frame.appendChild(controlColumn);
    node = frame;
    }
  }
  // --- TABLE ---
  else if (instance.componentId === 'table') {
      const frame = figma.createFrame();
      frame.layoutMode = 'HORIZONTAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'AUTO';
      frame.layoutAlign = 'STRETCH';
      const headerHeight = resolveTableHeaderHeight(params);
      const bodyHeight = resolveTableBodyHeight(params);
      const wantsPagination = params.hasPagination === true;
      const wantsFilter = params.hasFilter === true;
      frame.resize(params.width || 1176, 100);
      frame.cornerRadius = params.cornerRadius || 0;
      frame.clipsContent = true;
      if (!wantsPagination && params.borderWidth && params.borderWidth > 0) {
          await applyStrokeColorVariable(frame, 'table-border-key', params.borderColor || '#EAEDF1');
          frame.strokeWeight = params.borderWidth;
      } else if (wantsPagination) {
          clearNodeStrokes(frame);
      }
      if (instance.children && instance.children.length > 0) {
          for (const child of instance.children) {
              const childNode = await renderComponent({
                ...child,
                params: {
                  ...(child.params || {}),
                  headerHeight: toPositiveNumber(child.params?.headerHeight) ?? headerHeight,
                  bodyHeight: toPositiveNumber(child.params?.bodyHeight) ?? bodyHeight
                }
              }, { isRoot: false });
              frame.appendChild(childNode);
              if (childNode.type === 'FRAME' && childNode.getPluginData('component-id') === 'table-column') {
                  const colParams = readNodeParams(childNode);
                  if (typeof colParams.columnWidthMode === 'string') {
                      applyColumnWidthMode(
                          childNode,
                          colParams.columnWidthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL',
                          colParams.width
                      );
                  }
              }
          }
      } else {
          const colCount = params.columnCount || 3;
          for (let i = 0; i < colCount; i++) {
              const colInstance: ComponentInstance = {
                  id: `col-${i}`,
                  componentId: 'table-column',
                      params: {
                          headerText: `Header ${i+1}`,
                      rowCount: params.rowCount || 10,
                      width: 150,
                      headerHeight,
                      bodyHeight
                  }
              };
              const colNode = await renderComponent(colInstance, { isRoot: false });
              frame.appendChild(colNode);
              if (colNode.type === 'FRAME' && colNode.getPluginData('component-id') === 'table-column') {
                  const colParams = readNodeParams(colNode);
                  if (typeof colParams.columnWidthMode === 'string') {
                      applyColumnWidthMode(
                          colNode,
                          colParams.columnWidthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL',
                          colParams.width
                      );
                  }
              }
          }
      }
      alignAllTableRows(frame);
      if (params.rowAction) {
          await applyRowActionColumn(frame, String(params.rowAction));
      }
        if (wantsPagination || wantsFilter) {
          const wrapper = createTableWrapperFromTableFrame(frame, params) || frame.parent as FrameNode;
          const contentStack = ensureTableContentStack(wrapper, frame);

          if (wantsFilter) {
              await ensureTableFilterGroup(contentStack, wrapper.width);
          } else {
              removeTableFilterGroup(contentStack);
          }

          if (wantsPagination) {
              await ensurePaginationRow(wrapper, wrapper.width);
          } else {
              removePaginationRow(wrapper);
          }
          node = wrapper;
      } else {
          // Cleanup if needed (remove wrapper/pagination/filter if they exist but are disabled)
          const stack = findTableContentStack(frame.parent as FrameNode);
          if (stack) {
             removeTableFilterGroup(stack);
             // If stack becomes empty or only has table, we might want to unwrap (omitted for safety)
          }
          removePaginationRow(frame.parent as FrameNode);
          node = frame;
      }
  }
  // --- TABLE COLUMN ---
	  else if (instance.componentId === 'table-column') {
	      const frame = figma.createFrame();
	      frame.layoutMode = 'VERTICAL';
	      frame.primaryAxisSizingMode = 'AUTO';
      frame.counterAxisSizingMode = 'FIXED';
      frame.layoutGrow = 1; // Fill available width in table
      const columnWidth = params.width || 150;
      const headerHeight = resolveTableHeaderHeight(params);
      const bodyHeight = resolveTableBodyHeight(params);
      const autoHeightMode =
        params.textDisplay === 'lineBreak' ||
        params.height === 0 ||
        params.height === 'auto' ||
        params.height === 'AUTO' ||
        params.rowHeight === 0 ||
        params.rowHeight === 'auto' ||
        params.rowHeight === 'AUTO' ||
        params.headerHeight === 0 ||
        params.headerHeight === 'auto' ||
        params.headerHeight === 'AUTO' ||
        params.bodyHeight === 0 ||
        params.bodyHeight === 'auto' ||
        params.bodyHeight === 'AUTO';
	      frame.resize(columnWidth, 100);
	      frame.fills = [];
	      frame.clipsContent = false;
	      const widthMode = typeof params.columnWidthMode === 'string' ? params.columnWidthMode : 'FILL';
      
      // If children are provided, render them (prioritize children over params)
      if (instance.children && instance.children.length > 0) {
          for (const child of instance.children) {
              const isHeaderChild = child.componentId === 'table-header-cell';
              const widthParam = (child.params as any)?.width;
              const explicitHugWidth = widthParam === 0 || widthParam === '0';
              const childNode = await renderComponent({
                ...child,
                params: {
                  ...(child.params || {}),
                  width: explicitHugWidth ? 0 : (toPositiveNumber((child.params as any)?.width) ?? columnWidth),
                  height: autoHeightMode ? 0 : (toPositiveNumber(child.params?.height) ?? (isHeaderChild ? headerHeight : bodyHeight)),
                  paddingTop: child.params?.paddingTop ?? 0,
                  paddingBottom: child.params?.paddingBottom ?? 0
                }
              }, { isRoot: false });
              frame.appendChild(childNode);
          }
      } else {
          // Fallback: Auto-generate based on params
          
          // Header
          const headerInstance: ComponentInstance = {
              id: 'header',
              componentId: 'table-header-cell',
              params: { text: params.headerText || 'Header', width: columnWidth, height: autoHeightMode ? 0 : headerHeight }
          };
          const headerNode = await renderComponent(headerInstance, { isRoot: false });
          frame.appendChild(headerNode);
          
          // Rows
          const rowCount = params.rowCount || 10;
	          for (let i = 0; i < rowCount; i++) {
	               const cellInstance: ComponentInstance = {
	                  id: `cell-${i}`,
	                  componentId: 'table-cell',
                  params: { text: `Cell ${i+1}`, width: columnWidth, height: autoHeightMode ? 0 : bodyHeight }
	              };
	              const cellNode = await renderComponent(cellInstance, { isRoot: false });
	              frame.appendChild(cellNode);
	          }
	      }

	      const headerCellNode = frame.children.find(
	          (child) => child.getPluginData('component-id') === 'table-header-cell'
	      ) as SceneNode | undefined;
	      await applyTableHeaderElementToHeaderCell(headerCellNode, params.headerType);
        applyColumnWidthMode(frame, widthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL', columnWidth);

	      node = frame;
	  }
  // --- TABLE CELL / HEADER CELL / VARIANTS ---
  else if (instance.componentId === 'table-cell' || 
           instance.componentId === 'table-header-cell' ||
           instance.componentId === 'table-cell-tag' ||
           instance.componentId === 'table-cell-avatar' ||
           instance.componentId === 'table-cell-input' ||
           instance.componentId === 'table-cell-action-text' ||
           instance.componentId === 'table-cell-action-icon') {
    const isHeader = instance.componentId === 'table-header-cell';
    const cellHeight = isHeader ? resolveTableHeaderHeight(params) : resolveTableBodyHeight(params);
    const autoHeightMode =
      params.textDisplay === 'lineBreak' ||
      params.height === 0 ||
      params.height === 'auto' ||
      params.height === 'AUTO' ||
      params.rowHeight === 0 ||
      params.rowHeight === 'auto' ||
      params.rowHeight === 'AUTO' ||
      params.headerHeight === 0 ||
      params.headerHeight === 'auto' ||
      params.headerHeight === 'AUTO' ||
      params.bodyHeight === 0 ||
      params.bodyHeight === 'auto' ||
      params.bodyHeight === 'AUTO';
    const widthParam = (params as any)?.width;
    const explicitHugWidth = widthParam === 0 || widthParam === '0';
    const cellWidth = toPositiveNumber(widthParam) ?? 150;
    const frame = figma.createFrame();
    frame.layoutMode = 'HORIZONTAL';
    frame.counterAxisSizingMode = autoHeightMode ? 'AUTO' : 'FIXED';
    frame.primaryAxisSizingMode = explicitHugWidth ? 'AUTO' : 'FIXED';
    frame.layoutAlign = 'STRETCH';
    frame.itemSpacing = 8;
    frame.counterAxisAlignItems = 'CENTER';
    frame.paddingLeft = params.paddingLeft ?? 16;
    frame.paddingRight = params.paddingRight ?? (isHeader ? 8 : 16);
    frame.paddingTop = params.paddingTop ?? 0;
    frame.paddingBottom = params.paddingBottom ?? 0;
    frame.resize(explicitHugWidth ? 1 : cellWidth, autoHeightMode ? 1 : cellHeight);
    if (autoHeightMode && 'layoutSizingVertical' in frame) {
      try {
        (frame as any).layoutSizingVertical = 'HUG';
      } catch {
        // ignore
      }
    }
    
    // Background Color
    const cellFallbackBg = params.backgroundColor || (isHeader ? '#F5F5F5' : '#FFFFFF');
    await applyColorVariable(frame, isHeader ? 'table-header-bg-key' : 'table-cell-bg-key', cellFallbackBg);

    // Border
    const borderWidth = params.borderWidth ?? 0;
    if (borderWidth > 0) {
        // Important: Figma needs strokes array to be present before setting weights
        await applyStrokeColorVariable(frame, 'table-border-key', params.borderColor || '#EAEDF1');
        
        if (params.borderBottomOnly) {
             // For individual strokes, strokeWeight must be set first, or handled via individual props
             frame.strokeWeight = 0; 
             frame.strokeBottomWeight = borderWidth;
             frame.strokeTopWeight = 0;
             frame.strokeLeftWeight = 0;
             frame.strokeRightWeight = 0;
        } else {
             frame.strokeWeight = borderWidth;
        }
    } else {
        frame.strokeWeight = 0;
    }

    // Load fonts before creating text nodes (memoized).
    await ensureInterFontsLoaded();

    // --- Content based on type ---

    // 1. Tag Cell
    if (instance.componentId === 'table-cell-tag') {
        const normalizedTagParams = buildTableCellTagParams(params);
        const tagDef = COMPONENT_DEFS['tag'];
        const templateNode = await createTagFromFigmaTemplate(tagDef, normalizedTagParams);
        frame.appendChild(templateNode ? templateNode : await createTagFallbackNode(normalizedTagParams));
    }
    // 2. Avatar Cell
    else if (instance.componentId === 'table-cell-avatar') {
        const avatarInstance = await createFigmaComponentInstanceByToken('lib-data-display-avataricon');
        if (avatarInstance) {
            try {
                avatarInstance.resize(20, 20);
            } catch {
                // ignore
            }
            frame.appendChild(avatarInstance);
        } else {
            const avatar = figma.createEllipse();
            avatar.resize(20, 20);
            avatar.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
            frame.appendChild(avatar);
        }

        const textNode = figma.createText();
        await applyTextStyleBinding(textNode, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
        const displayText = params.text || params.name || params.label || 'User';
        textNode.characters = displayText;
        await applyColorVariable(textNode, "table-cell-text-key", "#0C0D0E");
        textNode.layoutGrow = 1;
        frame.appendChild(textNode);
    }
    // 3. Input Cell
    else if (instance.componentId === 'table-cell-input') {
        const inputFrame = figma.createFrame();
        inputFrame.layoutMode = 'HORIZONTAL';
        inputFrame.primaryAxisSizingMode = 'FIXED';
        inputFrame.counterAxisSizingMode = 'AUTO';
        inputFrame.layoutGrow = 1;
        inputFrame.resize(100, 24);
        inputFrame.paddingLeft = 8;
        inputFrame.paddingRight = 8;
        inputFrame.cornerRadius = 4;
        await applyStrokeColorVariable(inputFrame, 'table-border-key', '#EAEDF1');
        inputFrame.strokeWeight = 1;
        inputFrame.counterAxisAlignItems = 'CENTER';

        const inputText = figma.createText();
        await applyTextStyleBinding(inputText, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
        
        if (params.value) {
            inputText.characters = params.value;
            await applyColorVariable(inputText, 'table-cell-text-key', '#0C0D0E');
        } else {
            inputText.characters = params.placeholder || 'Enter text';
            await applyColorVariable(inputText, 'text-secondary-key', '#999999');
        }
        
        inputFrame.appendChild(inputText);
        frame.appendChild(inputFrame);
    }
    // 4. Action Text Cell
    else if (instance.componentId === 'table-cell-action-text') {
        const rawText = String(params.text || '').trim() || '编辑 删除 …';
        const parts = rawText
          .split(/[\s,，、]+/)
          .map((part) => part.trim())
          .filter(Boolean);

        frame.itemSpacing = 16;

        const ellipsisIndex = parts.findIndex((part) => part === '…' || part === '...' || part === '更多');
        const showMore = ellipsisIndex !== -1 || parts.length > 3;
        const visibleParts = showMore
          ? ellipsisIndex !== -1
            ? parts.slice(0, ellipsisIndex)
            : parts.slice(0, 2)
          : parts;

        for (const part of visibleParts) {
            const textNode = figma.createText();
            await applyTextStyleBinding(textNode, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            textNode.characters = part;
            const isDelete = part.includes('删除') || part.toLowerCase().includes('delete');
            await applyColorVariable(
                textNode,
                isDelete ? 'table-action-danger-key' : 'table-action-primary-key',
                isDelete ? '#D7312A' : '#1664FF'
            );
            frame.appendChild(textNode);
        }

        if (showMore) {
            const moreIcon = await createFigmaComponentInstanceByToken('table.cell.icon.actionMore');
            if (moreIcon) {
                try {
                    moreIcon.resize(16, 16);
                } catch {
                    // ignore
                }
                try {
                    const vectorNodes = moreIcon.findAll((node) =>
                      node.type === 'VECTOR' ||
                      node.type === 'BOOLEAN_OPERATION' ||
                      node.type === 'STAR' ||
                      node.type === 'LINE' ||
                      node.type === 'ELLIPSE' ||
                      node.type === 'POLYGON'
                    ) as SceneNode[];
                    for (const node of vectorNodes) {
                        await applyColorVariable(node, 'table-action-primary-key', '#1664FF');
                    }
                } catch {
                    // ignore
                }
                frame.appendChild(moreIcon);
            } else {
                const moreText = figma.createText();
                await applyTextStyleBinding(moreText, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
                moreText.characters = '…';
                await applyColorVariable(moreText, 'table-action-primary-key', '#1664FF');
                frame.appendChild(moreText);
            }
        }
    }
    // 5. Action Icon Cell
    else if (instance.componentId === 'table-cell-action-icon') {
        frame.itemSpacing = 24;

        const iconTokens = ['table.cell.icon.edit', 'table.cell.icon.delete', 'table.cell.icon.actionMore'];
        for (const token of iconTokens) {
            const icon = await createFigmaComponentInstanceByToken(token);
            if (!icon) continue;
            try {
                icon.resize(16, 16);
            } catch {
                // ignore
            }
            try {
                const vectorNodes = icon.findAll((node) =>
                  node.type === 'VECTOR' ||
                  node.type === 'BOOLEAN_OPERATION' ||
                  node.type === 'STAR' ||
                  node.type === 'LINE' ||
                  node.type === 'ELLIPSE' ||
                  node.type === 'POLYGON'
                ) as SceneNode[];
                for (const node of vectorNodes) {
                    await applyColorVariable(node, 'table-action-icon-key', '#42464E');
                }
            } catch {
                // ignore
            }
            frame.appendChild(icon);
        }

        if (frame.children.length === 0) {
            const placeholder = figma.createText();
            await applyTextStyleBinding(placeholder, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            placeholder.characters = '…';
            await applyColorVariable(placeholder, 'table-action-icon-key', '#42464E');
            frame.appendChild(placeholder);
        }
    }
    // 6. Standard Cell (Text)
    else {
        const textNode = figma.createText();
        const typographyKey = isHeader ? 'table-header-text-style-key' : 'table-cell-text-style-key';
        const fallbackStyle =
          isHeader || params.fontWeight === 'Bold'
            ? 'Bold'
            : params.fontWeight === 'Medium'
              ? 'Medium'
              : 'Regular';
        await applyTextStyleBinding(textNode, typographyKey, { family: 'Inter', style: fallbackStyle, size: 13 });
        
        // Set characters AFTER setting the font (allow empty string)
        if (params.text !== undefined && params.text !== null) {
            textNode.characters = String(params.text);
        } else {
            textNode.characters = isHeader ? 'Header' : 'Cell';
        }
        if (typeof params.fontSize === 'number' && params.fontSize > 0) {
            textNode.fontSize = params.fontSize;
        }

        // Text Color
        const textColor = isHeader ? '#42464E' : '#0C0D0E';
        await applyColorVariable(textNode, isHeader ? 'table-header-text-key' : 'table-cell-text-key', textColor);
        
        if (!explicitHugWidth && !isHeader) {
            textNode.layoutGrow = 1;
        }
        frame.appendChild(textNode);
    }

    if (typeof params.textAlign === 'string') {
        await applyCellAlignment(frame, params.textAlign as 'left' | 'right' | 'center');
    }
    if (typeof params.textDisplay === 'string') {
        applyCellTextDisplay(frame, params.textDisplay as 'ellipsis' | 'lineBreak');
    }
    node = frame;
  }
  // --- TEXT ---
  else if (instance.componentId === 'text') {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      await figma.loadFontAsync({ family: "Inter", style: "Bold" });
      await figma.loadFontAsync({ family: "Inter", style: "Medium" });

      const textNode = figma.createText();
      const fallbackStyle =
        params.fontWeight === 'Bold'
          ? 'Bold'
          : params.fontWeight === 'Medium'
            ? 'Medium'
            : 'Regular';
      await applyTextStyleBinding(textNode, 'text-style-key', { family: 'Inter', style: fallbackStyle, size: params.fontSize || 13 });
      
      // Set characters AFTER setting the font
      textNode.characters = params.text || 'Text';
      if (params.fontSize) textNode.fontSize = params.fontSize;
      if (params.lineHeight && Number(params.lineHeight) > 0) {
          textNode.lineHeight = { value: Number(params.lineHeight), unit: 'PIXELS' };
      }
      
      if (params.color) {
          await applyColorVariable(textNode, "text-custom-key", params.color);
          // textNode.fills = [{ type: 'SOLID', color: parseColor(params.color) }];
      } else {
          // Default color
          await applyColorVariable(textNode, "text-primary-key", "#0C0D0E");
          // textNode.fills = [{ type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.05 } }];
      }
      node = textNode;
  }
  // --- TAG ---
  else if (instance.componentId === 'tag') {
    const normalizedParams = normalizeUnifiedTagParams(params);
    Object.assign(params, normalizedParams);
    const templateNode = await createTagFromFigmaTemplate(def, normalizedParams);
    if (templateNode) {
        node = templateNode;
    } else {
        node = await createTagFallbackNode(normalizedParams);
    }
  }
  // --- BUTTON ---
  else if (instance.componentId === 'button') {
    const templateNode = await createButtonFromFigmaTemplate(def, params);
    if (templateNode) {
        node = templateNode;
	    } else {
	        const frame = figma.createFrame();
	        frame.layoutMode = 'HORIZONTAL';
	        frame.primaryAxisSizingMode = 'AUTO';
	        frame.counterAxisSizingMode = 'AUTO';
	        // Buttons should not clip their own stroke/effects in auto-layout.
	        frame.clipsContent = false;
	        frame.paddingTop = THEME_CONSTANTS['button'].paddingTop;
	        frame.paddingBottom = THEME_CONSTANTS['button'].paddingBottom;
	        frame.paddingLeft = THEME_CONSTANTS['button'].paddingLeft;
	        frame.paddingRight = THEME_CONSTANTS['button'].paddingRight;
	        frame.cornerRadius = THEME_CONSTANTS['button'].cornerRadius;
	        frame.itemSpacing = 8;

        if (params.variant === 'secondary') {
            await applyColorVariable(frame, "btn-secondary-bg", "#E6E6E6");
	        } else if (params.variant === 'outline') {
	            frame.fills = [];
	            frame.strokes = [{ type: 'SOLID', color: { r: 0.09, g: 0.63, b: 0.98 } }];
	            frame.strokeWeight = 1;
	            frame.strokesIncludedInLayout = true;
	        } else if (params.variant === 'text') {
	            frame.fills = [];
	            frame.strokes = [];
	            frame.strokeWeight = 0;
        } else {
            await applyColorVariable(frame, "btn-primary-bg", "#1890FF");
        }

        await figma.loadFontAsync({ family: "Inter", style: "Medium" });
        const text = figma.createText();
        await applyTextStyleBinding(text, 'button-text-style-key', { family: 'Inter', style: 'Medium', size: THEME_CONSTANTS['button'].fontSize });
        text.characters = params.label || 'Button';
        if (!text.fontSize) text.fontSize = THEME_CONSTANTS['button'].fontSize;

        if (params.variant === 'secondary') {
             await applyColorVariable(text, "btn-secondary-text", "#333333");
        } else if (params.variant === 'outline' || params.variant === 'text') {
             await applyColorVariable(text, "btn-outline-text", "#1890FF");
        } else {
             await applyColorVariable(text, "btn-primary-text", "#FFFFFF");
        }

        frame.appendChild(text);

        if (params.width && params.width > 0) {
            frame.resize(params.width, frame.height);
            frame.primaryAxisSizingMode = 'FIXED';
            frame.primaryAxisAlignItems = 'CENTER';
        }
        node = frame;
    }
  }
  // --- INPUT ---
  else if (instance.componentId === 'input') {
    const templateNode = await createInputFromFigmaTemplate(def, params);
    if (templateNode) {
        node = templateNode;
    } else {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        const metrics = resolveInputMetrics(params.size);
        const width = Number(params.width) > 0 ? Number(params.width) : 240;
        const disabled = Boolean(params.disabled);
        const error = Boolean(params.error);
        const state = normalizeInputState(params.state);
        const hasValue = String(params.value ?? '').length > 0;
        const filled = Boolean(params.filled) || hasValue;
        const showPrefix = hasInputAffix(params.showPrefix ?? params.prefix);
        const showSuffix = hasInputAffix(params.showSuffix ?? params.suffix);
        const outlineSpec = resolveInputOutlineSpec(disabled, error, state);

        const frame = figma.createFrame();
        frame.layoutMode = 'HORIZONTAL';
        frame.primaryAxisSizingMode = 'FIXED';
        frame.counterAxisSizingMode = 'AUTO';
        frame.resize(width, metrics.height);
        frame.fills = [];
        frame.clipsContent = false;

        const wrapper = figma.createFrame();
        wrapper.name = 'wrapper';
        wrapper.layoutMode = 'HORIZONTAL';
        wrapper.primaryAxisSizingMode = 'FIXED';
        wrapper.counterAxisSizingMode = 'AUTO';
        wrapper.counterAxisAlignItems = 'CENTER';
        wrapper.itemSpacing = 10;
        wrapper.paddingTop = metrics.paddingY;
        wrapper.paddingRight = metrics.paddingX;
        wrapper.paddingBottom = metrics.paddingY;
        wrapper.paddingLeft = metrics.paddingX;
        wrapper.resize(width, metrics.height);
        wrapper.cornerRadius = metrics.cornerRadius;
        wrapper.strokes = [];
        wrapper.strokeWeight = 1;
        wrapper.clipsContent = false;

        if (disabled) {
            await applyColorVariable(wrapper, 'input-disabled-bg-key', '#F2F3F5');
        } else if (error) {
            await applyColorVariable(wrapper, 'input-error-bg-key', '#FFF2F0');
        } else {
            await applyColorVariable(wrapper, 'input-bg', '#FFFFFF');
        }
        if (!error && state === 'default') {
            await applyStrokeColorVariable(wrapper, 'select-border-key', '#EAEDF1');
        } else {
            await applyStrokeColorVariable(wrapper, outlineSpec.variableKey, outlineSpec.fallbackHex);
        }

        if (showPrefix) {
            wrapper.appendChild(await createInputAffixNode(params.prefixText, disabled, metrics.fontSize));
        }

        const text = figma.createText();
        text.name = 'text';
        await applyTextStyleBinding(text, 'input-text-style-key', { family: 'Inter', style: 'Regular', size: metrics.fontSize });
        text.characters = hasValue ? String(params.value) : (params.placeholder || '请输入');
        if (!text.fontSize) text.fontSize = metrics.fontSize;
        text.layoutGrow = 1;

        if (disabled) {
            await applyColorVariable(text, 'input-disabled-text-key', '#C9CDD4');
        } else if (!filled) {
            await applyColorVariable(text, 'input-placeholder', '#737A87');
        } else {
            await applyColorVariable(text, 'input-text', '#0C0D0E');
        }
        wrapper.appendChild(text);

        if (showSuffix) {
            wrapper.appendChild(await createInputAffixNode(params.suffixText, disabled, metrics.fontSize));
        }

        frame.appendChild(wrapper);
        node = frame;
    }
  }
  // --- SELECT ---
  else if (instance.componentId === 'select') {
    const templateNode = await createSelectFromFigmaTemplate(def, params);
    if (templateNode) {
        node = templateNode;
    } else {
        await figma.loadFontAsync({ family: "Inter", style: "Regular" });

        const width = Number(params.width) > 0 ? Number(params.width) : 240;
        const currentValue = String(params.value || '').trim();
        const placeholder = String(params.placeholder || '请选择');
        const hasValue = currentValue.length > 0;
        const disabled = Boolean(params.disabled);

        const metrics = resolveInputMetrics(params.size);

        const frame = figma.createFrame();
        frame.layoutMode = 'HORIZONTAL';
        frame.primaryAxisSizingMode = 'FIXED';
        frame.counterAxisSizingMode = 'AUTO';
        frame.resize(width, metrics.height);
        frame.fills = [];
        frame.clipsContent = false;

        const wrapper = figma.createFrame();
        wrapper.name = 'wrapper';
        wrapper.layoutMode = 'HORIZONTAL';
        wrapper.primaryAxisSizingMode = 'FIXED';
        wrapper.counterAxisSizingMode = 'AUTO';
        wrapper.counterAxisAlignItems = 'CENTER';
        wrapper.itemSpacing = 10;
        wrapper.paddingTop = metrics.paddingY;
        wrapper.paddingRight = metrics.paddingX + 8;
        wrapper.paddingBottom = metrics.paddingY;
        wrapper.paddingLeft = metrics.paddingX;
        wrapper.resize(width, metrics.height);
        wrapper.cornerRadius = metrics.cornerRadius;
        wrapper.strokes = [];
        wrapper.strokeWeight = 1;
        wrapper.clipsContent = false;

        if (disabled) {
            await applyColorVariable(wrapper, 'input-disabled-bg-key', '#F2F3F5');
        } else {
            await applyColorVariable(wrapper, 'input-bg', '#FFFFFF');
        }
        await applyStrokeColorVariable(wrapper, 'select-border-key', '#EAEDF1');

        const text = figma.createText();
        await applyTextStyleBinding(text, 'select-text-style-key', { family: 'Inter', style: 'Regular', size: metrics.fontSize });
        text.characters = hasValue ? currentValue : placeholder;
        if (!text.fontSize) text.fontSize = metrics.fontSize;
        if (disabled) {
            await applyColorVariable(text, 'input-disabled-text-key', '#C9CDD4');
        } else {
            await applyColorVariable(text, hasValue ? 'input-text' : 'input-placeholder', hasValue ? '#0C0D0E' : '#737A87');
        }
        text.layoutGrow = 1;
        wrapper.appendChild(text);

        const icon = figma.createVector();
        icon.vectorPaths = [{
            windingRule: "NONZERO",
            data: "M 0 0 L 4 4 L 8 0"
        }];
        icon.strokeWeight = 1.5;
        icon.strokeCap = "ROUND";
        icon.strokeJoin = "ROUND";
        if (disabled) {
            await applyStrokeColorVariable(icon, 'input-disabled-text-key', '#C9CDD4');
        } else {
            await applyStrokeColorVariable(icon, 'select-icon', '#737A87');
        }
        wrapper.appendChild(icon);
        frame.appendChild(wrapper);
        node = frame;
    }
  }
	  // --- FILTER GROUP ---
	  else if (instance.componentId === 'filter-group') {
	    const frame = figma.createFrame();
	    frame.layoutMode = 'HORIZONTAL';
	    frame.primaryAxisSizingMode = 'AUTO';
	    frame.counterAxisSizingMode = 'AUTO';
	    frame.counterAxisAlignItems = 'CENTER';
	    frame.itemSpacing = Number(params.gap) > 0 ? Number(params.gap) : 12;
	    frame.fills = [];
	    frame.clipsContent = false;

	    const widthExplicit = Boolean(
	      instance.params && Object.prototype.hasOwnProperty.call(instance.params, 'width')
	    );
	    const widthFromParams = Number(params.width);
	    const width = isRoot && !widthExplicit ? 1000 : widthFromParams;
	    if (isRoot && !widthExplicit) {
	      (params as any).width = width;
	    }
	    if (Number.isFinite(width) && width > 0) {
	      frame.primaryAxisSizingMode = 'FIXED';
	      frame.resize(width, frame.height);
	    }

	    const itemWidthRaw = Number(params.itemWidth);
	    const hasFixedItemWidth = Number.isFinite(itemWidthRaw) && itemWidthRaw > 0;
	    const items = parseFilterGroupItems(params.itemsText ?? params.items);

	    for (let index = 0; index < items.length; index += 1) {
	      const item = items[index];
	      const selectNode = await renderComponent(
	        {
	          id: `${instance.id}-filter-${index}`,
	          componentId: 'select',
	          params: {
	            ...(hasFixedItemWidth ? { width: itemWidthRaw } : {}),
	            size: params.size,
	            state: params.state,
	            disabled: Boolean(params.disabled),
	            selectType: 'Label 内置标签',
	            value: ''
	          }
	        },
	        { isRoot: false }
	      );

	      await applyFilterGroupItemToSelectNode(selectNode, item);
	      if (!hasFixedItemWidth) {
	        try {
	          (selectNode as any).layoutGrow = 1;
	        } catch {}
	        try {
	          (selectNode as any).layoutSizingHorizontal = 'FILL';
	        } catch {}
	      }
	      frame.appendChild(selectNode);
	    }

	    node = frame;
	  }
  // --- CHECKBOX ---
  else if (instance.componentId === 'checkbox') {
    const templateNode = await createCheckboxFromFigmaTemplate(def, params);
    if (templateNode) {
        node = templateNode;
    } else {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

        const checked = Boolean(params.checked);
        const indeterminate = Boolean(params.indeterminate);
        const disabled = Boolean(params.disabled);
        const showLabel = params.showLabel !== false;
        const label = String(params.label || '选项一');

        const frame = figma.createFrame();
        frame.layoutMode = 'HORIZONTAL';
        frame.primaryAxisSizingMode = 'AUTO';
	        frame.counterAxisSizingMode = 'AUTO';
	        frame.counterAxisAlignItems = 'CENTER';
	        frame.itemSpacing = 8;
	        frame.fills = [];
	        frame.clipsContent = false;

	        const box = figma.createFrame();
	        box.layoutMode = 'VERTICAL';
	        box.primaryAxisSizingMode = 'FIXED';
	        box.counterAxisSizingMode = 'FIXED';
        box.primaryAxisAlignItems = 'CENTER';
	        box.counterAxisAlignItems = 'CENTER';
	        box.resize(14, 14);
	        box.cornerRadius = 2;
	        box.clipsContent = false;
	        box.strokesIncludedInLayout = true;

        const checkedNow = checked || indeterminate;
        if (checkedNow) {
            await applyColorVariable(box, 'checkbox-checked-bg', disabled ? '#85B2FF' : '#1664FF');
            box.strokes = [];

            const mark = figma.createText();
            await applyTextStyleBinding(mark, 'text-style-key', { family: 'Inter', style: 'Medium', size: 10 });
            mark.characters = indeterminate ? '−' : '✓';
            await applyColorVariable(mark, 'checkbox-checkmark', '#FFFFFF');
            box.appendChild(mark);
        } else {
            await applyColorVariable(box, 'checkbox-bg', '#FFFFFF');
            await applyStrokeColorVariable(box, 'checkbox-border', '#EAEDF1');
            box.strokeWeight = 1;
        }
        frame.appendChild(box);

        if (showLabel) {
            const labelNode = figma.createText();
            await applyTextStyleBinding(labelNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            labelNode.characters = label;
            await applyColorVariable(labelNode, 'checkbox-label', disabled ? '#737A87' : '#0C0D0E');
            frame.appendChild(labelNode);
        }

        node = frame;
    }
  }
  // --- CHECKBOX GROUP ---
  else if (instance.componentId === 'checkbox-group') {
    const templateNode = await createCheckboxGroupFromFigmaTemplate(def, params);
    if (templateNode) {
        node = templateNode;
    } else {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
        await figma.loadFontAsync({ family: 'Inter', style: 'Medium' });

        const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
        const checked = new Set(parseDelimitedText(params.checkedValues, []));
        const frame = figma.createFrame();
        frame.layoutMode = String(params.direction || 'horizontal').trim().toLowerCase() === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
        frame.primaryAxisSizingMode = 'AUTO';
	        frame.counterAxisSizingMode = 'AUTO';
	        frame.counterAxisAlignItems = 'MIN';
	        frame.itemSpacing = Number(params.gap) > 0 ? Number(params.gap) : 24;
	        frame.fills = [];
	        frame.clipsContent = false;

	        for (const option of options) {
	            const item = figma.createFrame();
	            item.layoutMode = 'HORIZONTAL';
	            item.primaryAxisSizingMode = 'AUTO';
            item.counterAxisSizingMode = 'AUTO';
	            item.counterAxisAlignItems = 'CENTER';
	            item.itemSpacing = 8;
	            item.fills = [];
	            item.clipsContent = false;

            const checkedNow = checked.has(option);
            const box = figma.createFrame();
            box.layoutMode = 'VERTICAL';
            box.primaryAxisSizingMode = 'FIXED';
            box.counterAxisSizingMode = 'FIXED';
            box.primaryAxisAlignItems = 'CENTER';
            box.counterAxisAlignItems = 'CENTER';
	            box.resize(14, 14);
	            box.cornerRadius = 3;
	            box.strokeWeight = 1;
	            box.clipsContent = false;
	            box.strokesIncludedInLayout = true;
            if (checkedNow) {
                await applyColorVariable(box, 'checkbox-checked-bg', '#1664FF');
                box.strokes = [];

                const mark = figma.createText();
                await applyTextStyleBinding(mark, 'text-style-key', { family: 'Inter', style: 'Medium', size: 10 });
                mark.characters = '✓';
                await applyColorVariable(mark, 'checkbox-checkmark', '#FFFFFF');
                box.appendChild(mark);
            } else {
                await applyColorVariable(box, 'checkbox-bg', '#FFFFFF');
                await applyStrokeColorVariable(box, 'checkbox-border', '#EAEDF1');
            }
            item.appendChild(box);

            const labelNode = figma.createText();
            await applyTextStyleBinding(labelNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            labelNode.characters = option;
            await applyColorVariable(labelNode, 'checkbox-label', '#0C0D0E');
            item.appendChild(labelNode);

            if (params.disabled) {
                item.opacity = 0.45;
            }
            frame.appendChild(item);
        }

        node = frame;
    }
  }
  // --- RADIO GROUP ---
  else if (instance.componentId === 'radio-group') {
    const templateNode = await createRadioGroupFromFigmaTemplate(def, params);
    if (templateNode) {
        node = templateNode;
    } else {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });

        const options = parseDelimitedText(params.optionsText, ['选项一', '选项二']);
        const selectedValue = String(params.value || options[0] || '').trim();
        const frame = figma.createFrame();
        frame.layoutMode = String(params.direction || 'horizontal').trim().toLowerCase() === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
        frame.primaryAxisSizingMode = 'AUTO';
	        frame.counterAxisSizingMode = 'AUTO';
	        frame.counterAxisAlignItems = 'MIN';
	        frame.itemSpacing = Number(params.gap) > 0 ? Number(params.gap) : 24;
	        frame.fills = [];
	        frame.clipsContent = false;

	        for (const option of options) {
	            const item = figma.createFrame();
	            item.layoutMode = 'HORIZONTAL';
	            item.primaryAxisSizingMode = 'AUTO';
            item.counterAxisSizingMode = 'AUTO';
	            item.counterAxisAlignItems = 'CENTER';
	            item.itemSpacing = 8;
	            item.fills = [];
	            item.clipsContent = false;

            const selectedNow = option === selectedValue;
            const circle = figma.createFrame();
            circle.layoutMode = 'VERTICAL';
            circle.primaryAxisSizingMode = 'FIXED';
            circle.counterAxisSizingMode = 'FIXED';
            circle.primaryAxisAlignItems = 'CENTER';
            circle.counterAxisAlignItems = 'CENTER';
	            circle.resize(14, 14);
	            circle.cornerRadius = 7;
	            circle.strokeWeight = 1;
	            circle.clipsContent = false;
	            circle.strokesIncludedInLayout = true;
            await applyColorVariable(circle, 'radio-bg', '#FFFFFF');
            await applyStrokeColorVariable(circle, selectedNow ? 'radio-selected-border' : 'radio-border', selectedNow ? '#1664FF' : '#EAEDF1');

            if (selectedNow) {
                const dot = figma.createEllipse();
                dot.resize(6, 6);
                await applyColorVariable(dot, 'radio-dot', '#1664FF');
                circle.appendChild(dot);
            }
            item.appendChild(circle);

            const labelNode = figma.createText();
            await applyTextStyleBinding(labelNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            labelNode.characters = option;
            await applyColorVariable(labelNode, 'radio-label', '#0C0D0E');
            item.appendChild(labelNode);

            if (params.disabled) {
                item.opacity = 0.45;
            }
            frame.appendChild(item);
        }

        node = frame;
    }
  }
  // --- CARD ---
  else if (instance.componentId === 'card') {
    const frame = figma.createFrame();
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'FIXED';
    frame.resize(params.width || 300, 100);
    frame.paddingLeft = params.padding || THEME_CONSTANTS['card'].padding;
    frame.paddingRight = params.padding || THEME_CONSTANTS['card'].padding;
    frame.paddingTop = params.padding || THEME_CONSTANTS['card'].padding;
    frame.paddingBottom = params.padding || THEME_CONSTANTS['card'].padding;
    frame.itemSpacing = 16;
    frame.cornerRadius = THEME_CONSTANTS['card'].cornerRadius;
    frame.clipsContent = false;
    // frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    await applyColorVariable(frame, "card-bg", "#FFFFFF");
    
    frame.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 2 },
        radius: 8,
        visible: true,
        blendMode: 'NORMAL'
    }];

    if (params.title) {
        const title = figma.createText();
        await applyTextStyleBinding(title, 'card-title-text-style-key', { family: 'Inter', style: 'Bold', size: 16 });
        title.characters = params.title;
        if (!title.fontSize) title.fontSize = 16;
        await applyColorVariable(title, "card-title", "#000000");
        frame.appendChild(title);
    }
    
    // Recursively render children
    if (instance.children) {
      for (const child of instance.children) {
        const childNode = await renderComponent(child, { isRoot: false });
        frame.appendChild(childNode);
      }
    }
    node = frame;
  }
  else {
    // Fallback
    node = figma.createRectangle();
    node.resize(100, 100);
    // node.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
    await applyColorVariable(node, "fallback-color", "#CCCCCC");
  }

  node.name = def.name;
  
  // Store metadata
  node.setPluginData('is-ai-component', 'true');
  node.setPluginData('component-id', instance.componentId);
  node.setPluginData('params', JSON.stringify(params));
  if (shouldStoreComponentInstance(instance)) {
    writeComponentInstanceSnapshot(node, instance);
  }

  return node;
}

function toStringList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function resolveInspectionTargets(payload: any): Array<{
  token?: string;
  componentKey: string;
  fallbackName?: string;
}> {
  const mode = String(payload?.mode || '').trim().toLowerCase();
  const includeAll = payload?.all === true || mode === 'all';
  const requestedTokens = toStringList(payload?.tokens);
  const requestedKeys = toStringList(payload?.keys);

  const targets: Array<{ token?: string; componentKey: string; fallbackName?: string }> = [];
  const pushToken = (token: string) => {
    const resolved = resolveComponentTokenProfile(token);
    if (!resolved) return;
    targets.push({
      token,
      componentKey: resolved.profile.componentKey,
      fallbackName: resolved.profile.displayName
    });
  };

  if (includeAll) {
    Object.entries(SEMANTIC_COMPONENT_TOKEN_PACK).forEach(([token, semantic]) => {
      const base = BASE_COMPONENT_TOKEN_PACK[semantic.baseToken];
      if (!base?.componentKey) return;
      targets.push({
        token,
        componentKey: base.componentKey,
        fallbackName: base.displayName
      });
    });
  } else if (requestedTokens.length > 0 || requestedKeys.length > 0) {
    requestedTokens.forEach(pushToken);
    requestedKeys.forEach((key) => {
      const normalized = String(key || '').trim();
      if (!normalized) return;
      const resolved = resolveComponentTokenProfile(normalized);
      if (!resolved) return;
      targets.push({
        token: resolved.token,
        componentKey: resolved.profile.componentKey,
        fallbackName: resolved.profile.displayName
      });
    });
  } else {
    Object.entries(SEMANTIC_COMPONENT_TOKEN_PACK).forEach(([token]) => pushToken(token));
  }

  const dedup = new Set<string>();
  const uniqueTargets: Array<{ token?: string; componentKey: string; fallbackName?: string }> = [];
  targets.forEach((target) => {
    const key = `${target.token || ''}|${target.componentKey}`;
    if (!target.componentKey || dedup.has(key)) return;
    dedup.add(key);
    uniqueTargets.push(target);
  });

  return uniqueTargets;
}

function resolveAppendParent(parentId?: string): BaseNode | null {
  if (!parentId) return null;
  const raw = String(parentId).trim();
  if (!raw) return null;

  const parentNode = figma.getNodeById(raw);
  if (!parentNode) return null;

  if (parentNode.type === 'FRAME' && parentNode.getPluginData('component-id') === 'page') {
    const contentArea = parentNode.children.find(
      (child) => child.type === 'FRAME' && child.name === 'Content Area'
    );
    if (contentArea) return contentArea;
  }

  return parentNode;
}

async function drawAiChart(data: any, options: any) {
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' });

  const frame = figma.createFrame();
  frame.name = 'AI Chart';
  frame.layoutMode = 'VERTICAL';
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.paddingLeft = 16;
  frame.paddingRight = 16;
  frame.paddingTop = 16;
  frame.paddingBottom = 16;
  frame.itemSpacing = 16;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  frame.cornerRadius = 8;
  frame.effects = [{
    type: 'DROP_SHADOW',
    color: { r: 0, g: 0, b: 0, a: 0.1 },
    offset: { x: 0, y: 2 },
    radius: 10,
    visible: true,
    blendMode: 'NORMAL'
  }];

  const chartArea = figma.createFrame();
	  chartArea.name = 'Chart Area';
	  chartArea.resize(600, 300);
	  chartArea.layoutMode = 'NONE';
	  chartArea.fills = [];
	  chartArea.clipsContent = false;
	  frame.appendChild(chartArea);

  let maxVal = -Infinity;
  let minVal = Infinity;
  data.datasets.forEach((ds: any) => {
    ds.data.forEach((v: number) => {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });

  const niceMax = Math.ceil(maxVal / 10) * 10;
  const niceMin = Math.floor(minVal / 10) * 10;
  const range = niceMax - niceMin;

  const width = 600;
  const height = 300;
  const padding = 16;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const value = niceMin + (range * i) / gridSteps;
    const y = height - padding - (i / gridSteps) * graphHeight;

    const line = figma.createLine();
    line.resize(graphWidth, 0);
    line.x = padding;
    line.y = y;
    line.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    line.strokeCap = 'ROUND';
    line.dashPattern = [4, 4];
    chartArea.appendChild(line);

    const label = figma.createText();
    label.characters = Math.round(value).toString();
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    label.x = 0;
    label.y = y - 6;
    label.resize(padding - 8, 12);
    label.textAlignHorizontal = 'RIGHT';
    chartArea.appendChild(label);
  }

  const stepX = graphWidth / (data.labels.length - 1);
  data.labels.forEach((text: string, i: number) => {
    const x = padding + i * stepX;
    const label = figma.createText();
    label.characters = text;
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } }];
    label.x = x - 20;
    label.y = height - padding + 8;
    label.resize(40, 12);
    label.textAlignHorizontal = 'CENTER';
    chartArea.appendChild(label);
  });

  data.datasets.forEach((ds: any) => {
    const pathData = ds.data.map((val: number, i: number) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - niceMin) / (range || 1)) * graphHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    const vector = figma.createVector();
    vector.vectorPaths = [{
      windingRule: 'NONZERO',
      data: pathData
    }];
    const rgb = hexToRgb(ds.color);
    vector.strokes = [{ type: 'SOLID', color: rgb }];
    vector.strokeWeight = 2;
    vector.strokeJoin = 'ROUND';
    vector.strokeCap = 'ROUND';
    chartArea.appendChild(vector);

    ds.data.forEach((val: number, i: number) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val - niceMin) / (range || 1)) * graphHeight;
      const dot = figma.createEllipse();
      dot.resize(6, 6);
      dot.x = x - 3;
      dot.y = y - 3;
      dot.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
      dot.strokes = [{ type: 'SOLID', color: rgb }];
      dot.strokeWeight = 2;
      chartArea.appendChild(dot);
    });
  });

  if (options.type === 'threshold') {
    const thresholdY = height - padding - 0.8 * graphHeight;
    const line = figma.createLine();
    line.resize(graphWidth, 0);
    line.x = padding;
    line.y = thresholdY;
    line.strokes = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    line.dashPattern = [4, 4];
    chartArea.appendChild(line);

    const label = figma.createText();
    label.characters = 'Threshold';
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    label.x = width - padding + 4;
    label.y = thresholdY - 6;
    chartArea.appendChild(label);
  }

  const legendFrame = figma.createFrame();
	  legendFrame.layoutMode = 'HORIZONTAL';
	  legendFrame.counterAxisSizingMode = 'AUTO';
	  legendFrame.itemSpacing = 16;
	  legendFrame.fills = [];
	  legendFrame.clipsContent = false;

  data.datasets.forEach((ds: any, i: number) => {
    const item = figma.createFrame();
    item.layoutMode = 'HORIZONTAL';
	    item.counterAxisSizingMode = 'AUTO';
	    item.itemSpacing = 8;
	    item.fills = [];
	    item.clipsContent = false;
	    item.verticalPadding = 4;
	    item.horizontalPadding = 4;

    const rect = figma.createRectangle();
    rect.resize(12, 12);
    rect.cornerRadius = 2;
    rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
    item.appendChild(rect);

    const label = figma.createText();
    label.characters = `Series ${i + 1}`;
    label.fontSize = 12;
    item.appendChild(label);

    legendFrame.appendChild(item);
  });
  frame.appendChild(legendFrame);

  figma.currentPage.selection = [frame];
  figma.viewport.scrollAndZoomIntoView([frame]);
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0, g: 0, b: 0 };
}

function appendToResolvedParent(node: SceneNode, parentId?: string): boolean {
  const appendParent = resolveAppendParent(parentId);
  if (!appendParent) return false;
  if (
    appendParent.type !== 'FRAME' &&
    appendParent.type !== 'GROUP' &&
    appendParent.type !== 'COMPONENT'
  ) {
    return false;
  }
  if (node === appendParent || node.parent === appendParent) return true;

  (appendParent as FrameNode).appendChild(node);
  // If parent is a vertical auto-layout frame and child is block-like, stretch it.
  if (
    appendParent.type !== 'GROUP' &&
    appendParent.layoutMode === 'VERTICAL' &&
    (node.type === 'FRAME' || node.type === 'INSTANCE') &&
    node.getPluginData('component-id') !== 'figma-component'
  ) {
    node.layoutAlign = 'STRETCH';
  }
  return true;
}

function centerNodeInViewport(node: SceneNode): void {
  const width = typeof (node as any).width === 'number' ? (node as any).width : 0;
  const height = typeof (node as any).height === 'number' ? (node as any).height : 0;
  node.x = figma.viewport.center.x - width / 2;
  node.y = figma.viewport.center.y - height / 2;
}

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }

  if (msg.type === 'apply-envelope') {
    const mode = msg.mode === 'best_effort' ? 'best_effort' : 'strict';
    const result = await applyEnvelopeUnknown(msg.envelope, { mode });
    const requestedParentId =
      typeof msg.parentId === 'string' && msg.parentId.trim() ? msg.parentId.trim() : undefined;

    if (result.ok && result.rootNodeId) {
      const rootNode = figma.getNodeById(result.rootNodeId);
      let appendedToParent = false;
      if (requestedParentId && rootNode && rootNode.type !== 'PAGE') {
        appendedToParent = appendToResolvedParent(rootNode as SceneNode, requestedParentId);
      }
      if (result.intent === 'create' && !appendedToParent && rootNode && rootNode.type !== 'PAGE') {
        centerNodeInViewport(rootNode as SceneNode);
      }
      if (rootNode && 'getPluginData' in rootNode) {
        const rootComponentId = rootNode.getPluginData('component-id') || undefined;
        lockGeneratedContainerNode(rootNode, rootComponentId);
      }
      if (rootNode && 'id' in rootNode) {
        figma.currentPage.selection = [rootNode as SceneNode];
        figma.viewport.scrollAndZoomIntoView([rootNode as SceneNode]);
      }
      checkSelection();
    }

    figma.ui.postMessage({ type: 'apply-result', result });
  }

  if (msg.type === 'generate-chart') {
    const { data, options } = msg;
    await drawAiChart(data, options);
  }

  if (msg.type === 'switch-theme') {
      const { theme } = msg;
      if (theme === 'light' || theme === 'dark') {
          currentTheme = theme;
          figma.ui.postMessage({ type: 'action-done', message: `Switched to ${theme} theme. (Note: Only new components will apply)` });
      }
  }

  if (msg.type === 'set-generation-lock') {
    generationLockEnabled = Boolean(msg.enabled);
    if (!generationLockEnabled) {
      unlockGeneratedContainerNodes();
    }
  }

  if (msg.type === 'ui-ready') {
    checkSelection();
  }

  if (msg.type === 'inspect-figma-component-props') {
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
    const maxCountRaw = Number(payload.maxCount);
    const maxCount = Number.isFinite(maxCountRaw) && maxCountRaw > 0 ? Math.floor(maxCountRaw) : 200;
    const includeErrors = payload.includeErrors !== false;

    const targets = resolveInspectionTargets(payload);
    const scanned = targets.slice(0, maxCount);
    const results: any[] = [];

    for (let index = 0; index < scanned.length; index += 1) {
      const target = scanned[index];
      const discovered = await discoverFigmaComponentSchema({
        token: target.token,
        componentKey: target.componentKey,
        fallbackName: target.fallbackName
      });

      if (discovered.status === 'ok' || includeErrors) {
        results.push(discovered);
      }

      if ((index + 1) % 10 === 0 || index + 1 === scanned.length) {
        figma.ui.postMessage({
          type: 'inspect-figma-component-props-progress',
          data: {
            done: index + 1,
            total: scanned.length
          }
        });
      }
    }

    const successCount = results.filter((item) => item.status === 'ok').length;
    const errorCount = results.filter((item) => item.status === 'error').length;

    figma.ui.postMessage({
      type: 'inspect-figma-component-props-result',
      data: {
        requested: targets.length,
        processed: scanned.length,
        truncated: targets.length > scanned.length,
        maxCount,
        summary: {
          success: successCount,
          failed: errorCount
        },
        results
      }
    });
  }

  if (msg.type === 'inspect-figma-component-structure') {
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
    const maxDepthRaw = Number(payload.maxDepth);
    const maxDepth = Number.isFinite(maxDepthRaw) && maxDepthRaw > 0 ? Math.floor(maxDepthRaw) : 5;
    const maxChildrenRaw = Number(payload.maxChildren);
    const maxChildren = Number.isFinite(maxChildrenRaw) && maxChildrenRaw > 0 ? Math.floor(maxChildrenRaw) : 24;
    const includeErrors = payload.includeErrors !== false;

    const targets = resolveInspectionTargets(payload);
    const results: any[] = [];

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const discovered = await inspectFigmaComponentStructure({
        token: target.token,
        componentKey: target.componentKey,
        fallbackName: target.fallbackName,
        variantCriteria: payload.variantCriteria,
        maxDepth,
        maxChildren
      });

      if (discovered.status === 'ok' || includeErrors) {
        results.push(discovered);
      }
    }

    const successCount = results.filter((item) => item.status === 'ok').length;
    const errorCount = results.filter((item) => item.status === 'error').length;

    figma.ui.postMessage({
      type: 'inspect-figma-component-structure-result',
      data: {
        requested: targets.length,
        processed: targets.length,
        summary: {
          success: successCount,
          failed: errorCount
        },
        results
      }
    });
  }

  if (msg.type === 'create-component') {
    const { component, parentId } = msg;
    // Reset theme on new creation for consistency, or read from UI settings
    // currentTheme = 'light'; 
    try {
      const node = await renderComponent(component);
      if (!appendToResolvedParent(node, parentId)) {
          // Center in viewport if no parent
          node.x = figma.viewport.center.x - node.width / 2;
          node.y = figma.viewport.center.y - node.height / 2;
          figma.currentPage.appendChild(node);
          figma.currentPage.selection = [node];
          figma.viewport.scrollAndZoomIntoView([node]);
      }
      
      lockGeneratedContainerNode(node, component.componentId);
      figma.ui.postMessage({ type: 'create-success', nodeId: node.id, componentId: component.componentId });
    } catch (e) {
      figma.ui.postMessage({ type: 'error', message: String(e) });
    }
  }

  if (msg.type === 'update-component') {
    const { params } = msg;
    const selection = figma.currentPage.selection;
    if (selection.length === 1) {
      let node = selection[0] as SceneNode;
      if (node.getPluginData('is-ai-component') !== 'true') {
        const resolved = findAiComponentNode(node);
        if (resolved) {
          node = resolved;
        }
      }
      const componentId = node.getPluginData('component-id');
      
      if (componentId) {
        if (FULL_RERENDER_COMPONENT_IDS.has(componentId)) {
          const previousParams = readNodeParams(node);
          let snapshot = readComponentInstanceSnapshot(node);
          if (!snapshot) {
            snapshot = buildComponentInstanceFromNode(node);
            if (snapshot) {
              writeComponentInstanceSnapshot(node, snapshot);
            }
          }
          const baseInstance: ComponentInstance = snapshot
            ? { ...snapshot, componentId, params }
            : { id: `update-${Date.now()}`, componentId, params };
          const instanceToRender =
            componentId === 'form' && snapshot
              ? patchFormInstanceSnapshot(snapshot, previousParams, params)
              : baseInstance;
          const replacement = await renderComponent(instanceToRender);

          if (replaceSceneNode(node, replacement)) {
            figma.currentPage.selection = [replacement];
            checkSelection();
            figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
            return;
          }
        }

        node.setPluginData('params', JSON.stringify(params));
        
        // Simplified update for demo: just update basic props if possible
        // A real system would need to re-render or carefully patch properties
        if (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT') {
             const isTableComponent = componentId === 'table' || componentId.startsWith('table-');
             if (params.spacing !== undefined) node.itemSpacing = params.spacing;
             
             const pTop = params.paddingTop ?? params.padding;
             const pBottom = params.paddingBottom ?? params.padding;
             const pLeft = params.paddingLeft ?? params.padding;
             const pRight = params.paddingRight ?? params.padding;
             
             if (pTop !== undefined) node.paddingTop = pTop;
             if (pBottom !== undefined) node.paddingBottom = pBottom;
             if (pLeft !== undefined) node.paddingLeft = pLeft;
             if (pRight !== undefined) node.paddingRight = pRight;

             if (params.backgroundColor) {
                const preferredBgKey = findComponentVariableKey(
                  componentId,
                  ['table-header-bg-key', 'table-cell-bg-key', 'layout-bg-key', 'card-bg', 'input-bg', 'select-bg', 'chart-bg'],
                  ['bg']
                );
                const fillKey =
                  componentId === 'table-header-cell'
                    ? 'table-header-bg-key'
                    : isTableComponent
                      ? 'table-cell-bg-key'
                      : preferredBgKey || 'layout-bg-key';
                await applyColorVariable(node, fillKey, params.backgroundColor);
             }
             const nextWidth = toPositiveNumber(params.width);
             const nextHeight = toPositiveNumber(params.height);
             if (nextWidth !== null || nextHeight !== null) {
                 applyNodeSize(node, nextWidth, nextHeight);
             }
             if (params.cornerRadius !== undefined) {
                 node.cornerRadius = params.cornerRadius;
             }
             if (params.borderWidth !== undefined) {
                 const weight = params.borderWidth;
                 if (weight > 0) {
                     const preferredBorderKey = findComponentVariableKey(
                       componentId,
                       ['table-border-key', 'layout-border-key', 'input-border-key', 'select-border-key'],
                       ['border', 'stroke']
                     );
                     if (isTableComponent || preferredBorderKey) {
                         await applyStrokeColorVariable(
                           node,
                           isTableComponent ? 'table-border-key' : (preferredBorderKey as string),
                           params.borderColor || '#EAEDF1'
                         );
                     } else {
                         const borderColor = params.borderColor ? parseColor(params.borderColor) : {r:0, g:0, b:0};
                         node.strokes = [{ type: 'SOLID', color: borderColor }];
                     }
                     if (params.borderBottomOnly) {
                         node.strokeWeight = 0;
                         node.strokeBottomWeight = weight;
                     } else {
                         node.strokeWeight = weight;
                     }
                 } else {
                     node.strokeWeight = 0;
                 }
             }
        }

        if (componentId === 'layout' && node.type === 'FRAME') {
            const direction = String(params.direction || '').trim().toLowerCase() === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
            node.layoutMode = direction;
            if (params.clipsContent !== undefined) {
                node.clipsContent = Boolean(params.clipsContent);
            }
        }

        if (componentId === 'form-row' && node.type === 'FRAME') {
            node.primaryAxisAlignItems = mapFormRowAlignment(params.align);
        }
        
        if (node.type === 'TEXT') {
            const typographyKey = findComponentTypographyKey(
              componentId,
              ['text-style-key', 'table-header-text-style-key', 'table-cell-text-style-key'],
              ['text', 'typography', 'style']
            );
            if (typographyKey) {
              const fallbackStyle =
                params.fontWeight === 'Bold'
                  ? 'Bold'
                  : params.fontWeight === 'Medium'
                    ? 'Medium'
                    : 'Regular';
              await applyTextStyleBinding(node, typographyKey, { family: 'Inter', style: fallbackStyle, size: params.fontSize || 13 });
            }
            if (params.text) {
                await figma.loadFontAsync(node.fontName as FontName);
                node.characters = params.text;
            }
            if (params.fontSize) node.fontSize = params.fontSize;
            if (params.lineHeight && Number(params.lineHeight) > 0) {
                node.lineHeight = { value: Number(params.lineHeight), unit: 'PIXELS' };
            }
            if (params.color) {
                // node.fills = [{ type: 'SOLID', color: parseColor(params.color) }];
                await applyColorVariable(node, "text-custom-key", params.color);
            }
        }

	        if (componentId === 'table' && node.type === 'FRAME') {
	            let tableRoot = node;
	            let tableContent = resolveTableContentFrame(tableRoot);

	            // Keep inner table params in sync so sizing / row-action helpers read correct values.
	            if (tableContent !== tableRoot) {
	                writeNodeParams(tableContent, params);
	            }

	            const wantsPagination = params.hasPagination === true;
	            const wantsFilter = params.hasFilter === true;
            if ((wantsPagination || wantsFilter) && hasDirectTableColumns(tableRoot)) {
                // If we have an existing filter group in the parent, we should clean it up before wrapping
                // because the new filter will be placed inside the wrapper's content stack.
                if (tableRoot.parent && tableRoot.parent.type === 'FRAME') {
                    removeTableFilterGroupFromParent(tableRoot.parent as FrameNode);
                }

                const wrapped = createTableWrapperFromTableFrame(tableRoot, params);
                if (wrapped) {
                    tableRoot = wrapped;
                    tableContent = resolveTableContentFrame(tableRoot);
                    figma.currentPage.selection = [tableRoot];
                } else {
                    figma.ui.postMessage({
                        type: 'action-done',
                        message: '无法为表格添加分页器/筛选器：缺少可写入的父容器'
                    });
                }
            }

            if (wantsFilter) {
                tableContent = resolveTableContentFrame(tableRoot);
                if (tableContent !== tableRoot) {
                    const contentStack = ensureTableContentStack(tableRoot, tableContent);
                    await ensureTableFilterGroup(contentStack, tableContent.width, params.filterTexts);
                } else if (tableRoot.parent && tableRoot.parent.type === 'FRAME') {
                    // Fallback: If wrapping failed or wasn't triggered (shouldn't happen with above logic),
                    // try inserting in parent. But we prefer wrapping.
                    await ensureTableFilterGroupInParent(tableRoot.parent as FrameNode, tableRoot, tableRoot.width);
                } else {
                    figma.ui.postMessage({ type: 'action-done', message: '无法为表格添加筛选器：缺少可写入的父容器' });
                }
            } else {
                const contentStack = findTableContentStack(tableRoot);
                if (contentStack) {
                    removeTableFilterGroup(contentStack);
                }
                if (tableRoot.parent && tableRoot.parent.type === 'FRAME') {
                    removeTableFilterGroupFromParent(tableRoot.parent as FrameNode);
                }
            }

	            if (wantsPagination) {
	                // Ensure footer pagination exists under the vertical wrapper.
	                if (tableContent !== tableRoot) {
	                    await ensurePaginationRow(tableRoot, tableContent.width);
	                }
	            } else {
	                removePaginationRow(tableRoot);
	            }

		            // Re-resolve after structural updates.
		            tableContent = resolveTableContentFrame(tableRoot);
		            writeNodeParams(tableContent, params);
		            if (tableContent !== tableRoot) {
		                // Ensure wrapper hugs content height (avoid 1px-height table wrappers).
		                tableRoot.primaryAxisSizingMode = 'AUTO';
		                tableRoot.counterAxisSizingMode = 'FIXED';
		                tableRoot.clipsContent = false;
		                tableRoot.fills = [];
		                if ('layoutSizingHorizontal' in tableRoot) {
		                    try {
		                        (tableRoot as any).layoutSizingHorizontal = 'FILL';
		                    } catch {
		                        // ignore
		                    }
		                }
		                if ('layoutSizingVertical' in tableRoot) {
		                    try {
		                        (tableRoot as any).layoutSizingVertical = 'HUG';
		                    } catch {
		                        // ignore
		                    }
		                }
		            }

		            if (params.size || params.headerHeight || params.bodyHeight || params.rowHeight || params.height) {
		                const headerHeight = resolveTableHeaderHeight(params);
		                const bodyHeight = resolveTableBodyHeight(params);
		                applyTableSizeToCells(tableContent, headerHeight, bodyHeight);
	            }
	            if (params.rowCount !== undefined) {
	                const nextRowCount = Number(params.rowCount);
	                if (Number.isFinite(nextRowCount)) {
	                    await updateTableRowCount(tableContent, nextRowCount);
	                }
	            }
	            if (params.rowAction !== undefined) {
	                await applyRowActionColumn(tableContent, String(params.rowAction || 'none'));
	            }

	            // Pagination rule: when pagination is enabled, the table should not render an outer border.
	            if (wantsPagination) {
	                clearNodeStrokes(tableRoot);
	                clearNodeStrokes(tableContent);
	            } else {
	                // Keep wrapper layout-only (no border), and apply border to the inner table frame.
	                if (tableContent !== tableRoot) {
	                    clearNodeStrokes(tableRoot);
	                }

	                const borderWidth = Number(params.borderWidth ?? 0);
	                if (Number.isFinite(borderWidth) && borderWidth > 0) {
	                    await applyStrokeColorVariable(tableContent, 'table-border-key', params.borderColor || '#EAEDF1');
	                    tableContent.strokeWeight = borderWidth;
	                } else {
	                    clearNodeStrokes(tableContent);
	                }
	            }

	            checkSelection();
	        }

	        if (componentId === 'table-column' && node.type === 'FRAME') {
	            if (typeof params.columnWidthMode === 'string') {
	                applyColumnWidthMode(node, params.columnWidthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL', params.width);
	            }
	            if (typeof params.textAlign === 'string' || typeof params.textDisplay === 'string') {
                const children = node.children.filter((child) => {
                    const id = child.getPluginData('component-id');
                    return isTableCellComponentId(id);
                });
                for (const child of children) {
                    if (typeof params.textAlign === 'string') {
                        await applyCellAlignment(child, params.textAlign as 'left' | 'right' | 'center');
                    }
                    if (typeof params.textDisplay === 'string') {
                        applyCellTextDisplay(child, params.textDisplay as 'ellipsis' | 'lineBreak');
	                    }
	                }
	            }
            if (params.headerText !== undefined) {
                const headerCellNode = node.children.find(
                    (child) => child.getPluginData('component-id') === 'table-header-cell'
                ) as SceneNode | undefined;
                const nextHeaderText = String(params.headerText ?? '');
                mergeNodeParams(node, { headerText: nextHeaderText });
                if (headerCellNode) {
                    mergeNodeParams(headerCellNode, { text: nextHeaderText });
                    await setSceneText(headerCellNode, nextHeaderText);
                }
            }
            if (params.headerType !== undefined) {
                const headerCellNode = node.children.find(
                    (child) => child.getPluginData('component-id') === 'table-header-cell'
                ) as SceneNode | undefined;
                await applyTableHeaderElementToHeaderCell(headerCellNode, params.headerType);
            }
	        }

        if (isTableCellComponentId(componentId)) {
            if (typeof params.textAlign === 'string') {
                await applyCellAlignment(node as SceneNode, params.textAlign as 'left' | 'right' | 'center');
            }
            if (typeof params.textDisplay === 'string') {
                applyCellTextDisplay(node as SceneNode, params.textDisplay as 'ellipsis' | 'lineBreak');
            }
            if (typeof params.columnWidthMode === 'string') {
                const column = findTableColumnFromNode(node);
                if (column) {
                    applyColumnWidthMode(column, params.columnWidthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL', params.width);
                }
            }
        }
      }
    }
  }

  if (msg.type === 'apply-column-settings') {
    const { componentId, textAlign, textDisplay, columnWidthMode, width } = msg;
    const selection = figma.currentPage.selection;
    if (selection.length === 1) {
      const node = selection[0];
      const column = isTableColumnNode(node) ? node : findTableColumnFromNode(node);
      if (column) {
        const columnParamPatch: Record<string, any> = {};
        const isActionCell = typeof componentId === 'string' && isTableActionCellComponentId(componentId);
        if (componentId && typeof componentId === 'string') {
          let sourceCell: SceneNode | null = node as SceneNode;
          if (sourceCell === column) {
            const offset = getTableHeaderOffset(column);
            sourceCell = (column.children[offset] as SceneNode) || null;
          } else {
            while (sourceCell && sourceCell.parent && sourceCell.parent !== column) {
              sourceCell = sourceCell.parent as SceneNode;
            }
          }

          const templateComponentId = sourceCell?.getPluginData?.('component-id') || componentId;
          if (sourceCell && templateComponentId === componentId) {
            const offset = getTableHeaderOffset(column);
            const children = [...column.children];
            for (let index = offset; index < children.length; index += 1) {
              const child = children[index];
              if (child === sourceCell) continue;
              const cloned = sourceCell.clone();
              column.insertChild(index, cloned);
              child.remove();
            }
            column.setPluginData('cellType', templateComponentId);
          } else {
            const children = [...column.children];
            for (const child of children) {
              const childId = child.getPluginData('component-id');
              const isBodyCell = isTableCellComponentId(childId) && childId !== 'table-header-cell';
              if (isBodyCell) {
                const newNode = await swapComponent(child, componentId);
                if (newNode) {
                  newNode.setPluginData('cellType', componentId);
                  if (newNode.parent !== column) {
                    column.insertChild(column.children.indexOf(child), newNode);
                  }
                }
              }
            }
            column.setPluginData('cellType', componentId);
          }
        }

        if (isActionCell) {
          await ensureOperationColumnHeader(column);
        }

        const alignToApply = typeof textAlign === 'string' ? textAlign : undefined;
        const displayToApply = typeof textDisplay === 'string' ? textDisplay : undefined;
        if (alignToApply || displayToApply) {
          const children = column.children.filter((child) => {
            const id = child.getPluginData('component-id');
            return isTableCellComponentId(id);
          });
          for (const child of children) {
            if (alignToApply) {
              await applyCellAlignment(child, alignToApply as 'left' | 'right' | 'center');
            }
            if (displayToApply) {
              applyCellTextDisplay(child, displayToApply as 'ellipsis' | 'lineBreak');
            }
          }
        }

        if (typeof columnWidthMode === 'string') {
          applyColumnWidthMode(column, columnWidthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL', width);
        } else if (isActionCell) {
          applyColumnWidthMode(column, 'HUG');
        }

        if (alignToApply) columnParamPatch.textAlign = alignToApply;
        if (displayToApply) columnParamPatch.textDisplay = displayToApply;
        if (typeof columnWidthMode === 'string') {
          columnParamPatch.columnWidthMode = columnWidthMode.toUpperCase();
        }
        if (typeof width === 'number' && width > 0) {
          columnParamPatch.width = width;
        }
        if (isActionCell && typeof columnWidthMode !== 'string') {
          columnParamPatch.columnWidthMode = 'HUG';
          columnParamPatch.width = undefined;
        }
        if (Object.keys(columnParamPatch).length > 0) {
          mergeNodeParams(column, columnParamPatch);
        }

        const table = findTableFrameFromNode(column);
        if (table) {
          alignAllTableRows(table);
        }

        checkSelection();
        figma.ui.postMessage({ type: 'action-done', message: 'Applied column settings' });
      } else {
        figma.ui.postMessage({ type: 'action-done', message: 'Applied column settings (no column found)' });
      }
    }
  }

  if (msg.type === 'swap-component') {
    const { componentId } = msg;
    const selection = figma.currentPage.selection;
    if (selection.length === 1) {
      const node = selection[0];
      const currentId = node.getPluginData('component-id');
      
      if (currentId) {
          // If it's a column, swap all its children (except header)
          if (currentId === 'table-column' && node.type === 'FRAME') {
              // Iterate over children
              const children = [...node.children];
              let swappedCount = 0;
              for (const child of children) {
                  const childId = child.getPluginData('component-id');
                  const childDef = COMPONENT_DEFS[childId];
                  // Only swap if it's a data cell (part of table-cell family but not header)
                  if (childDef && childDef.family === 'table-cell' && childId !== 'table-header-cell') {
                      const newNode = await swapComponent(child, componentId);
                      if (newNode) {
                        newNode.setPluginData('cellType', componentId);
                        if (newNode.parent !== node) {
                          node.insertChild(node.children.indexOf(child), newNode);
                        }
                      }
                      swappedCount++;
                  }
              }
              node.setPluginData('cellType', componentId);
              if (typeof componentId === 'string' && isTableActionCellComponentId(componentId)) {
                  await ensureOperationColumnHeader(node);
                  applyColumnWidthMode(node, 'HUG');
                  mergeNodeParams(node, { width: undefined });
              }
              figma.ui.postMessage({ type: 'action-done', message: `Updated ${swappedCount} cells in column` });
          } 
          // Single component swap
          else {
              const newNode = await swapComponent(node, componentId);
              if (newNode) {
                  figma.currentPage.selection = [newNode];
                  figma.ui.postMessage({ type: 'action-done', message: 'Swapped component type' });
              }
          }
      }
    }
  }
};
