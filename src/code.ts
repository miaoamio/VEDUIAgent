import { ComponentInstance } from './types';
import { COMPONENT_REGISTRY } from './registry';
import { getDefaultParams, getRegistrySizeMetrics } from './registry.helpers';
import type { ComponentDefinition } from './registry.types';
import { FULL_RERENDER_COMPONENT_IDS } from './editability';
import { applyEnvelopeUnknown } from './engine/applyEnvelope';
import { renderFigmaComponentInstance } from './engine/skills/resolve/figma-component';
import { renderChartInstance } from './engine/skills/resolve/chart';
import { resolveFormLayoutParamsUpdate } from './engine/skills/form.skill';
import {
  createFigmaComponentInstanceFromRef,
  discoverFigmaComponentSchema,
  discoverFigmaComponentSchemaFromSelection,
  inspectFigmaComponentStructure,
  inspectSelectionVariables,
  resolveComponentKeyFromToken,
  resolveInputSizeVariantLabel,
  VariantCriteria
} from './figmaComponent';
import { resolveTypographyTokenProfile } from './theme/volcengine-design/typography';
import {
  BASE_COMPONENT_TOKEN_PACK,
  resolveComponentTokenProfile
} from './theme/volcengine-design/component-tokens';
import { createInspectDrivenTagFallbackNode } from './theme/volcengine-design/tag-fallback';
import {
  applyColorVariable,
  applyEffectColorVariable,
  applyStrokeColorVariable,
  parseColor,
  setCurrentTheme
} from './engine/skills/resolve/color';
import { setFillWidthPreserveHeight, setFixedWidth } from './engine/skills/resolve/layout';

const COMPONENT_DEFS = COMPONENT_REGISTRY.components;

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 398, height: 680 });

const FONT_LOAD_CACHE = new Map<string, Promise<void>>();
const FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE = new Map<string, InstanceNode>();
const FIGMA_COMPONENT_INSTANCE_FAILURE_CACHE = new Map<string, number>();
const FIGMA_COMPONENT_INSTANCE_FAILURE_TTL = 5 * 60 * 1000;
const FAST_FAIL_COMPONENT_TOKENS = new Set<string>();
const TAG_TEMPLATE_CACHE = new Map<string, SceneNode>();
const TEMPLATE_CACHE_FRAME_KEY = 'uia-template-cache-frame';
const TEMPLATE_CACHE_NODE_KEY = 'uia-template-cache-node';
const TEMPLATE_CACHE_NODE_CACHE_KEY = 'uia-template-cache-key';
const TEMPLATE_CACHE_NODE_KIND = 'uia-template-cache-kind';
type TemplateCacheKind = 'component-instance' | 'tag-template';
const TABLE_CELL_PREWARM_STATE = {
  scheduled: false,
  inFlight: false,
  warmedFonts: false,
  warmedTokens: new Set<string>(),
  warmedDefaultTag: false
};

const TABLE_CELL_PREWARM_TOKENS = [
  'table-cell-icon-edit',
  'table-cell-icon-delete',
  'table-cell-icon-more',
  'table-cell-icon-action-more',
  'lib-data-display-avataricon',
  'table-header-icon',
  'table-row-action-text',
  'table-row-action-checkbox',
  'table-row-action-radio',
  'table-row-action-drag',
  'table-row-action-expand',
  'table-row-action-switch',
  'table-row-action-header'
];

let strictRenderMode = false;

const resolveComponentDisplayNameFromToken = (token: string): string | undefined => {
  const normalized = String(token || '').trim();
  if (!normalized) return undefined;
  return resolveComponentTokenProfile(normalized)?.profile.displayName;
};

const resolveComponentIdFromToken = (token: string): string | null => {
  const normalized = String(token || '').trim();
  if (!normalized) return null;
  const resolved = resolveComponentTokenProfile(normalized);
  const candidates = [normalized, resolved?.baseToken].filter(Boolean) as string[];
  for (const candidate of candidates) {
    for (const [componentId, def] of Object.entries(COMPONENT_DEFS)) {
      const snapshot = (def as any)?.figmaPropertySnapshot as any;
      const snapshotToken = typeof snapshot?.token === 'string' ? snapshot.token.trim() : '';
      if (snapshotToken && snapshotToken === candidate) {
        return componentId;
      }
    }
  }
  return null;
};


const isComponentOrSetNode = (node: BaseNode | PageNode | DocumentNode | null): node is ComponentNode | ComponentSetNode =>
  Boolean(node && (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'));



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

function getTemplateCacheFrame(): FrameNode {
  const existing = figma.currentPage.findAll((node) => {
    if (node.type !== 'FRAME') return false;
    if (!('getPluginData' in node)) return false;
    return node.getPluginData(TEMPLATE_CACHE_FRAME_KEY) === 'true';
  }) as FrameNode[];
  const primary = existing[0];
  if (primary) {
    for (let index = 1; index < existing.length; index += 1) {
      try {
        existing[index].remove();
      } catch {}
    }
    return primary;
  }
  const frame = figma.createFrame();
  frame.name = 'UIA Template Cache';
  frame.visible = false;
  frame.x = -100000;
  frame.y = -100000;
  frame.resizeWithoutConstraints(1, 1);
  frame.setPluginData(TEMPLATE_CACHE_FRAME_KEY, 'true');
  return frame;
}

function registerTemplateNode(cacheKey: string, kind: TemplateCacheKind, node: SceneNode): void {
  const frame = getTemplateCacheFrame();
  node.setPluginData(TEMPLATE_CACHE_NODE_KEY, 'true');
  node.setPluginData(TEMPLATE_CACHE_NODE_CACHE_KEY, cacheKey);
  node.setPluginData(TEMPLATE_CACHE_NODE_KIND, kind);
  node.visible = false;
  if (node.parent !== frame) {
    frame.appendChild(node);
  }
  node.x = 0;
  node.y = 0;
}

function cleanupLegacyPrewarmTemplates(): void {
  const componentKeyToToken = new Map<string, string>();
  for (const token of TABLE_CELL_PREWARM_TOKENS) {
    const componentKey = resolveComponentTokenProfile(token)?.profile.componentKey;
    if (componentKey && !componentKeyToToken.has(componentKey)) {
      componentKeyToToken.set(componentKey, token);
    }
  }
  if (componentKeyToToken.size === 0) return;
  const candidates = figma.currentPage.findAll((node) => node.type === 'INSTANCE') as InstanceNode[];
  for (const node of candidates) {
    if (node.getPluginData(TEMPLATE_CACHE_NODE_KEY) === 'true') continue;
    if (node.visible || node.x > -99999 || node.y > -99999) continue;
    const componentKey = node.mainComponent?.key;
    if (!componentKey) continue;
    const token = componentKeyToToken.get(componentKey);
    if (!token) continue;
    const cacheKey = buildTokenCacheKey(token);
    if (!cacheKey) continue;
    if (FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.has(cacheKey)) {
      try {
        node.remove();
      } catch {}
      continue;
    }
    registerTemplateNode(cacheKey, 'component-instance', node);
    FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.set(cacheKey, node);
  }
}

function hydrateTemplateCaches(): void {
  const frame = getTemplateCacheFrame();
  const existing = figma.currentPage.findAll((node) => {
    if (!('getPluginData' in node)) return false;
    return node.getPluginData(TEMPLATE_CACHE_NODE_KEY) === 'true';
  }) as SceneNode[];
  for (const node of existing) {
    const cacheKey = node.getPluginData(TEMPLATE_CACHE_NODE_CACHE_KEY);
    const kind = node.getPluginData(TEMPLATE_CACHE_NODE_KIND) as TemplateCacheKind;
    if (!cacheKey || (kind !== 'component-instance' && kind !== 'tag-template')) {
      try {
        node.remove();
      } catch {}
      continue;
    }
    if (kind === 'component-instance') {
      if (node.type !== 'INSTANCE') {
        try {
          node.remove();
        } catch {}
        continue;
      }
      if (FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.has(cacheKey)) {
        try {
          node.remove();
        } catch {}
        continue;
      }
      if (node.parent !== frame) {
        frame.appendChild(node);
      }
      node.visible = false;
      FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.set(cacheKey, node as InstanceNode);
      continue;
    }
    if (TAG_TEMPLATE_CACHE.has(cacheKey)) {
      try {
        node.remove();
      } catch {}
      continue;
    }
    if (node.parent !== frame) {
      frame.appendChild(node);
    }
    node.visible = false;
    TAG_TEMPLATE_CACHE.set(cacheKey, node);
  }
  cleanupLegacyPrewarmTemplates();
}

hydrateTemplateCaches();

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

function findAncestorFormFrame(node: SceneNode | null): FrameNode | null {
  let current: BaseNode | null = node?.parent || null;
  while (current && current.type !== 'PAGE') {
    if (
      current.type === 'FRAME' &&
      'getPluginData' in current &&
      current.getPluginData('component-id') === 'form'
    ) {
      return current as FrameNode;
    }
    current = current.parent;
  }
  return null;
}

function findAncestorFormFieldNode(node: SceneNode | null): SceneNode | null {
  let current: BaseNode | null = node?.parent || null;
  while (current && current.type !== 'PAGE') {
    if ('getPluginData' in current && current.getPluginData('component-id') === 'form-field') {
      return current as SceneNode;
    }
    current = current.parent;
  }
  return null;
}

function isFormFieldLayoutAffecting(prev: Record<string, any>, next: Record<string, any>): boolean {
     const keys = [
         'label',
         'required',
         'showHelpIcon',
         'showColon'
     ];
     return keys.some((k) => String(prev[k] || '') !== String(next[k] || ''));
 }

function getFormFieldLabelWrapWidth(node: SceneNode): number | null {
    if (node.type !== 'FRAME' && node.type !== 'INSTANCE') return null;
    const findWrap = (n: SceneNode): FrameNode | null => {
        if (isFormLabelWrapNode(n)) return n as FrameNode;
        if ('children' in n) {
            for (const child of n.children) {
                const res = findWrap(child as SceneNode);
                if (res) return res;
            }
        }
        return null;
    };
    const wrap = findWrap(node);
    return wrap ? wrap.width : null;
}

type CanvasHint = 'table' | 'form' | 'chart' | 'mixed';

let selectionUpdateSuppressed = false;

// Helper to check selection and notify UI
function checkSelection() {
  if (selectionUpdateSuppressed) {
    return;
  }
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
    let targetNode =
      node.getPluginData('is-ai-component') === 'true' ? node : findAiComponentNode(node);
      
    let effectiveTarget = targetNode || 
      (node.type === 'INSTANCE' && node.getPluginData('component-id') ? node : null);

    if (effectiveTarget) {
      const formFieldAncestor = findAncestorFormFieldNode(effectiveTarget);
      if (formFieldAncestor) {
        effectiveTarget = formFieldAncestor;
      }
    }

    if (effectiveTarget) {
        const componentId = effectiveTarget.getPluginData('component-id');
        const params = effectiveTarget.getPluginData('params');
        if (componentId && params) {
          let childComponentId;
        if (componentId === 'table-column' && effectiveTarget.type === 'FRAME') {
            const storedCellType = effectiveTarget.getPluginData('cellType');
            if (storedCellType) {
                childComponentId = storedCellType;
            } else {
                const firstCell = effectiveTarget.children.find(child => {
                    const cid = child.getPluginData('component-id');
                    return cid && cid !== 'table-header-cell';
                });
                if (firstCell) {
                    childComponentId = firstCell.getPluginData('component-id');
                }
            }
        }

        const parsedParams = JSON.parse(params);
        const liveInstance = buildComponentInstanceFromNode(effectiveTarget);
        const liveParams = liveInstance?.params && typeof liveInstance.params === 'object'
          ? liveInstance.params
          : parsedParams;
        const normalizedParams =
          componentId === 'tag'
            ? normalizeUnifiedTagParams(liveParams)
            : liveParams;
        if (componentId === 'figma-component') {
          const paramKey = typeof normalizedParams.componentKey === 'string' ? normalizedParams.componentKey.trim() : '';
          const componentToken = typeof normalizedParams.componentToken === 'string' ? normalizedParams.componentToken.trim() : '';
          const tokenKey = componentToken ? resolveComponentTokenProfile(componentToken)?.profile.componentKey || '' : '';
          if (!paramKey && tokenKey) {
            normalizedParams.componentKey = tokenKey;
          }
        }

        if (isTableCellComponentId(componentId)) {
          const column = findTableColumnFromNode(effectiveTarget);
          if (column) {
            const columnParams = readNodeParams(column);
            const merged = { ...columnParams, ...normalizedParams };
            normalizedParams.columnWidthMode = merged.columnWidthMode ?? normalizedParams.columnWidthMode;
            normalizedParams.width = merged.width ?? normalizedParams.width;
            normalizedParams.textAlign = merged.textAlign ?? normalizedParams.textAlign;
            normalizedParams.textDisplay = merged.textDisplay ?? normalizedParams.textDisplay;
          }
        }

        if (componentId === 'form') {
          const formInstance = buildComponentInstanceFromNode(effectiveTarget);
          const itemCount = formInstance ? countFormItemInstances(formInstance) : 0;
          if (itemCount > 0) {
            normalizedParams.itemCount = itemCount;
          }
          if (effectiveTarget.type === 'FRAME') {
            const actualState = detectFormActualState(effectiveTarget as FrameNode);
            normalizedParams.showActionArea = actualState.showActionArea;
          }
        }

        if (componentId === 'table' && effectiveTarget.type === 'FRAME') {
          scheduleTableCellPrewarm();
          const actualState = detectTableActualState(effectiveTarget as FrameNode);
          normalizedParams.hasButtonGroup = actualState.hasButtonGroup;
          normalizedParams.hasFilter = actualState.hasFilter;
          normalizedParams.hasTabs = actualState.hasTabs;
          normalizedParams.hasPagination = actualState.hasPagination;
        }

        figma.ui.postMessage({
          type: 'selection-update',
          data: {
            selectionCount: selection.length,
            canvasHint,
            componentId,
            params: normalizedParams,
            childComponentId, // Optional: for columns
            nodeName: effectiveTarget.name
          }
        });

        // Also emit figma-instance-info so the Docs tab can show the Figma key.
        // For figma-component, read from params; for other INSTANCE nodes, read from mainComponent.
        if (effectiveTarget.type === 'INSTANCE') {
          const inst = effectiveTarget as InstanceNode;
          const key = inst.mainComponent?.key ?? '';
          const compName = inst.mainComponent?.name ?? '';
          const setName = inst.mainComponent?.parent?.type === 'COMPONENT_SET'
            ? (inst.mainComponent.parent as ComponentSetNode).name
            : '';
          if (key) {
            figma.ui.postMessage({
              type: 'figma-instance-info',
              data: { componentKey: key, componentName: compName, componentSetName: setName, nodeName: inst.name, componentNodeId: inst.id }
            });
          }
        } else if (componentId === 'figma-component') {
          // AI-managed figma-component stored as FRAME — get key from params
          const storedKey = typeof normalizedParams.componentKey === 'string' ? normalizedParams.componentKey.trim() : '';
          const storedToken = typeof normalizedParams.componentToken === 'string' ? normalizedParams.componentToken.trim() : '';
          const resolvedKey = storedKey || (storedToken ? resolveComponentTokenProfile(storedToken)?.profile.componentKey || '' : '');
          if (resolvedKey) {
            figma.ui.postMessage({
              type: 'figma-instance-info',
              data: { componentKey: resolvedKey, componentName: normalizedParams.componentToken || resolvedKey, componentSetName: '', nodeName: effectiveTarget.name }
            });
          }
        }

        return;
      }
    }
  }
  // Clear selection if not an AI container
  figma.ui.postMessage({ type: 'selection-cleared', data: { count: 0, canvasHint } });

  // If the selected node is a plain Figma INSTANCE (not AI-managed), send its key info
  if (selection.length === 1 && selection[0].type === 'INSTANCE') {
    const inst = selection[0] as InstanceNode;
    const key = inst.mainComponent?.key ?? '';
    const compName = inst.mainComponent?.name ?? '';
    const setName = inst.mainComponent?.parent?.type === 'COMPONENT_SET'
      ? (inst.mainComponent.parent as ComponentSetNode).name
      : '';
    figma.ui.postMessage({
      type: 'figma-instance-info',
      data: { componentKey: key, componentName: compName, componentSetName: setName, nodeName: inst.name, componentNodeId: inst.id }
    });
  }
}

// Listen for selection changes
figma.on('selectionchange', checkSelection);

let tableRowSyncInProgress = false;
let tableRowSyncTimer: number | null = null;
let tableRowSyncMuteUntil = 0;
let pendingTableRowSync = new Map<
  string,
  { table: FrameNode; rowIndex: number; sourceNodes: SceneNode[] }
>();

let formLabelSyncInProgress = false;
let formLabelSyncTimer: number | null = null;
let formLabelSyncMuteUntil = 0;
let pendingFormLabelSync = new Map<
  string,
  { form: FrameNode; sourceNodes: SceneNode[] }
>();

function findFormFrameFromNode(node: BaseNode | null | undefined): FrameNode | null {
  let current = node;
  while (current && current.type !== 'PAGE') {
    if ('getPluginData' in current) {
      const componentId = current.getPluginData('component-id');
      if (componentId === 'form') {
        return current as FrameNode;
      }
    }
    current = current.parent;
  }
  return null;
}

function isFormLabelWrapNode(node: SceneNode | null | undefined): boolean {
  if (!node || node.type !== 'FRAME') return false;
  if (!('getPluginData' in node)) return false;
  return node.getPluginData('form-label-wrap') === 'true';
}

function alignFormLabelWidths(form: FrameNode, sourceNodes: SceneNode[] = []) {
  const labelWraps: FrameNode[] = [];
  
  const collectLabelWraps = (node: SceneNode) => {
    if (isFormLabelWrapNode(node)) {
      labelWraps.push(node as FrameNode);
    }
    if ('children' in node) {
      for (const child of node.children) {
        collectLabelWraps(child as SceneNode);
      }
    }
  };
  
  collectLabelWraps(form);
  if (labelWraps.length <= 1) return;
  
  // 始终取所有标签容器中的最大宽度
  let maxWidth = 0;
  for (const wrap of labelWraps) {
    if (wrap.width > maxWidth) maxWidth = wrap.width;
  }
  
  if (!Number.isFinite(maxWidth) || maxWidth <= 0) return;
  
  // 只把宽度小于最大值的标签扩展到最大值
  for (const wrap of labelWraps) {
    if (wrap.width < maxWidth - 0.1) {
      try {
        wrap.resize(maxWidth, wrap.height);
      } catch {}
    }
  }
}

figma.on('documentchange', async (event) => {
  for (const change of event.documentChanges) {
    if (change.type !== 'PROPERTY_CHANGE') continue;
    const node = change.node;
    if (!node || node.removed) continue;

    const properties = change.properties || [];
    const isSizeChange = properties.includes('height') || properties.includes('width');
    const isTextChange = properties.includes('characters');
    if (!isSizeChange && !isTextChange) continue;

    // 处理表单标签文本变化（不受表格同步状态影响）
    if (isTextChange && node.type === 'TEXT') {
      const parent = node.parent;
      if (parent && parent.type === 'FRAME') {
        const isLabelWrap = parent.getPluginData('form-label-wrap') === 'true';
        if (isLabelWrap && parent.getPluginData('form-label-auto-resize') === 'true') {
          const minWidthStr = parent.getPluginData('form-label-min-width');
          const minWidth = minWidthStr ? Number(minWidthStr) : 0;
          if (Number.isFinite(minWidth) && minWidth > 0) {
            try {
              parent.primaryAxisSizingMode = 'AUTO';
              await new Promise(r => setTimeout(r, 0));
              const autoWidth = parent.width;
              parent.primaryAxisSizingMode = 'FIXED';
              parent.resize(Math.max(minWidth, autoWidth), parent.height);
              
              const form = findFormFrameFromNode(parent);
              if (form) {
                const key = form.id;
                const existing = pendingFormLabelSync.get(key);
                if (existing) {
                  if (!existing.sourceNodes.includes(parent)) {
                    existing.sourceNodes.push(parent);
                  }
                } else {
                  pendingFormLabelSync.set(key, { form, sourceNodes: [parent] });
                }
              }
            } catch (e) {
              console.warn('form-label-wrap resize failed', e);
            }
          }
        }
      }
    }
  }

  // 表单标签宽度同步
  if (!formLabelSyncInProgress && Date.now() >= formLabelSyncMuteUntil && pendingFormLabelSync.size > 0) {
    if (formLabelSyncTimer === null) {
      formLabelSyncTimer = setTimeout(() => {
        formLabelSyncInProgress = true;
        const formsToSync = pendingFormLabelSync;
        pendingFormLabelSync = new Map();
        formLabelSyncTimer = null;
        try {
          for (const { form, sourceNodes } of formsToSync.values()) {
            alignFormLabelWidths(form, sourceNodes);
          }
        } finally {
          formLabelSyncInProgress = false;
          formLabelSyncMuteUntil = Date.now() + 200;
        }
      }, 120);
    }
  }

  // 表格行同步逻辑（保持原有检查）
  if (tableRowSyncInProgress) return;
  if (Date.now() < tableRowSyncMuteUntil) return;

  for (const change of event.documentChanges) {
    if (change.type !== 'PROPERTY_CHANGE') continue;
    const node = change.node;
    if (!node || node.removed) continue;

    const properties = change.properties || [];
    const isSizeChange = properties.includes('height') || properties.includes('width');
    const isTextChange = properties.includes('characters');
    if (!isSizeChange && !isTextChange) continue;

    const cell = findTableCellFromNode(node);
    if (!cell) continue;
    const column = cell.parent;
    if (!isTableColumnNode(column)) continue;
    const table = findTableFrameFromNode(column);
    if (!table) continue;

    const rowIndex = column.children.indexOf(cell as SceneNode);
    if (rowIndex < 0) continue;
    if (isTextChange) {
      const cellParams = readNodeParams(cell);
      if (cellParams.textDisplay === 'lineBreak') {
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
      }
    }

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
      tableRowSyncMuteUntil = Date.now() + 200;
    }
  }, 120);
});

const TABLE_DEFAULT_PARAMS = getDefaultParams('table');

function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveTableSizeHeight(params: Record<string, any>): number | null {
    const metrics = getRegistrySizeMetrics('table', params.size);
    const height = metrics?.height;
    return typeof height === 'number' ? height : null;
}

function resolveTableHeaderHeight(params: Record<string, any>): number {
    return resolveTableSizeHeight(params)
        ?? toPositiveNumber(params.height)
        ?? toPositiveNumber(params.headerHeight)
        ?? toPositiveNumber(getRegistrySizeMetrics('table', params.size)?.height)
        ?? toPositiveNumber(TABLE_DEFAULT_PARAMS.headerHeight)
        ?? 0;
}

function resolveTableBodyHeight(params: Record<string, any>): number {
    return resolveTableSizeHeight(params)
        ?? toPositiveNumber(params.height)
        ?? toPositiveNumber(params.bodyHeight)
        ?? toPositiveNumber(params.rowHeight)
        ?? toPositiveNumber(getRegistrySizeMetrics('table', params.size)?.height)
        ?? toPositiveNumber(TABLE_DEFAULT_PARAMS.bodyHeight)
        ?? 0;
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
    const icon = await createFigmaComponentInstanceByToken('table-header-icon');
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

function isTableTextContext(node: BaseNode | null | undefined): boolean {
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
    const tableRuntime = COMPONENT_DEFS['table']?.runtime as any;
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
        (child) => child.type === 'FRAME' && (child as FrameNode).getPluginData('table-role') === 'table-content'
    );
    return existing && existing.type === 'FRAME' ? (existing as FrameNode) : null;
}

function ensureTableContentStack(tableRoot: FrameNode, tableContent: FrameNode): FrameNode {
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

function detectTableActualState(tableRoot: FrameNode): {
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

function detectFormActualState(formRoot: FrameNode): {
    showActionArea: boolean;
} {
    const instance = buildComponentInstanceFromNode(formRoot);
    if (!instance || !Array.isArray(instance.children)) {
        return { showActionArea: false };
    }
    const isButtonRow = (child: any) => child.componentId === 'form-row'
        && Array.isArray(child.children)
        && child.children.length > 0
        && child.children.every((item: any) => item.componentId === 'button');
    const isActionAreaChild = (child: any) => child.componentId === 'button'
        || isButtonRow(child)
        || (
            child.componentId === 'layout'
            && Array.isArray(child.children)
            && child.children.length > 0
            && child.children.every((item: any) => item.componentId === 'button' || isButtonRow(item))
        );
    return {
        showActionArea: instance.children.some(isActionAreaChild)
    };
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

async function ensureTableToolbar(contentStack: FrameNode, width: number, options: { hasFilter?: boolean, hasTabs?: boolean, hasButtonGroup?: boolean, filterTexts?: string, primaryButtonText?: string, secondaryButtonText?: string }) {
    const tableRuntime = COMPONENT_DEFS['table']?.runtime as any;
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
        // If no toolbar but legacy filter exists, migrate it
        if (legacyFilter && !options.hasFilter && !options.hasTabs && !options.hasButtonGroup) {
            // Nothing to do, just let legacy filter stay or remove it?
            // If options are all false, we should remove everything.
            // But let's assume if we are here, we might want to create toolbar.
        }

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
        clearNodeStrokes(toolbar);
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
            tabsNode = await renderComponent({
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
             filterNode = await renderComponent({
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
                  const replacement = await renderComponent({
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
            
            const btn1 = await renderComponent({
                id: `btn-1-${Date.now()}`,
                componentId: 'button',
                params: {
                    label: options.secondaryButtonText || '次要按钮',
                    variant: 'outline'
                }
            }, { isRoot: false });
            
            const btn2 = await renderComponent({
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

function removeTableToolbar(contentStack: FrameNode) {
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

function removeTableToolbarFromParent(parent: FrameNode) {
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

    lockGeneratedContainerNode(wrapper, 'table');

    return wrapper;
}

function alignTableRowHeights(table: FrameNode, rowIndex: number, sourceNodes: SceneNode[] = []) {
    const columns = getTableColumns(table);
    if (columns.length === 0) return;

    let maxHeight = 0;
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
    const normalizeLineBreakAfterAlign = (cell: SceneNode) => {
        if (!isLineBreakCell(cell)) return;
        if ('counterAxisSizingMode' in cell) {
            try {
                (cell as any).counterAxisSizingMode = 'FIXED';
            } catch {}
        }
        if ('layoutSizingVertical' in cell) {
            try {
                (cell as any).layoutSizingVertical = 'FIXED';
            } catch {}
        }
    };

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
                ensureLineBreakMeasure(node);
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
                ensureLineBreakMeasure(cell);
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
            normalizeLineBreakAfterAlign(cell);
        }
    }
}

function alignAllTableRows(table: FrameNode) {
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

function findTableColumnFromNode(node: BaseNode | null | undefined): FrameNode | null {
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
        if (desired === 'multiple') return 'table-row-action-checkbox';
        if (desired === 'single') return 'table-row-action-radio';
        if (desired === 'drag') return 'table-row-action-drag';
        if (desired === 'expand') return 'table-row-action-expand';
        if (desired === 'switch') return 'table-row-action-switch';
        return null;
    };

	    const createHeaderControl = async (): Promise<InstanceNode | null> => {
	        const token = 'table-row-action-header';
	        const resolved = resolveComponentTokenProfile(token);
	        const componentKey = resolved?.profile.componentKey || '';
	        if (!componentKey) return null;
	        try {
            const inst = await createFigmaComponentInstanceFromRef({
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

        const getFallbackName = (action: string) => {
            if (action === 'multiple') return 'Checkbox';
            if (action === 'single') return 'Radio';
            if (action === 'drag') return 'Drag';
            if (action === 'expand') return 'Expand';
            if (action === 'switch') return 'Switch';
            return `Row Action ${action}`;
        };

        try {
            const inst = await createFigmaComponentInstanceFromRef({
                componentKey,
                fallbackName: getFallbackName(desired),
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
let TYPOGRAPHY_BINDING_INDEX: Record<string, TypographyBindingIndexEntry> | null = null;
const TEXT_STYLE_CACHE = new Map<string, TextStyle | null>();
let LOCAL_TEXT_STYLES_CACHE: TextStyle[] | null = null;
const EFFECT_STYLE_CACHE = new Map<string, EffectStyle | null>();
let LOCAL_EFFECT_STYLES_CACHE: EffectStyle[] | null = null;

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

function toLowerTrim(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeFormLayout(value: unknown): 'horizontal' | 'vertical' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'vertical') return normalized;
    return 'horizontal';
}

function normalizeInputState(value: unknown): 'default' | 'hover' | 'active' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('hover') || normalized.includes('悬浮') || normalized.includes('悬停')) return 'hover';
    if (normalized.includes('active') || normalized.includes('激活')) return 'active';
    return 'default';
}

function hasInputAffix(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function toVariantBoolean(value: boolean): 'True' | 'False' {
    return value ? 'True' : 'False';
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
    if (baseToken === STATUS_TAG_COMPONENT_TOKEN || baseToken === 'lib-data-display-status-tag') {
        return 'status';
    }
    if (baseToken === OTHER_TAG_COMPONENT_TOKEN || baseToken === 'lib-data-display-other-tag') {
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
    const componentKey = componentKeyFromToken
        || (def.figmaPropertySnapshot?.token ? resolveComponentKeyFromToken(def.figmaPropertySnapshot.token) : '')
        || String((def.figmaPropertySnapshot as any)?.componentKey || '').trim();
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
            importedInstance = await createFigmaComponentInstanceFromRef({
                componentKey,
                fallbackName: def.figmaPropertySnapshot?.componentSetName || def.name,
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
                registerTemplateNode(cacheKey, 'tag-template', template);
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
        const fallbackInstance = await createFigmaComponentInstanceFromRef({
            componentKey,
            fallbackName: def.figmaPropertySnapshot?.componentSetName || def.name,
            visible: false
        });
        const detached = fallbackInstance.detachInstance();
        try {
            const template = detached.clone();
            registerTemplateNode(fallbackKey, 'tag-template', template);
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
    const componentKey = (def.figmaPropertySnapshot?.token ? resolveComponentKeyFromToken(def.figmaPropertySnapshot.token) : '')
        || String((def.figmaPropertySnapshot as any)?.componentKey || def.figmaBinding?.renderKey || '').trim();
    if (!componentKey) return null;

    const disabled = Boolean(params.disabled);
    const iconOnly = Boolean(params.iconOnly);
    const showPrefixIcon = Boolean(params.showPrefixIcon ?? params.prefixIcon);
    const showSuffixIcon = Boolean(params.showSuffixIcon ?? params.suffixIcon);
    const width = toPositiveNumber(params.width);

    try {
        const importedInstance = await createFigmaComponentInstanceFromRef({
            componentKey,
            fallbackName: def.figmaPropertySnapshot?.componentSetName || def.name,
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
    const errorMessage = JSON.stringify({
        errorType: 'RenderError',
        componentId: 'filter-group',
        field: 'items',
        where: '输出 JSON 中 component.params.itemsText 或 component.params.items 为空或无有效条目',
        reason: 'empty',
        sourceFields: ['component.params.itemsText', 'component.params.items'],
        format: '标签[:type]',
        separators: ['逗号', '换行'],
        allowedTypes: ['select', 'input', 'search'],
        examples: {
            itemsText: '状态:select, 城市:select, 关键词:search',
            items: [
                { label: '状态', type: 'select' },
                { label: '城市', type: 'select' },
                { label: '关键词', type: 'search' }
            ]
        },
        correctExampleJson: {
            id: 'filter-group-1',
            componentId: 'filter-group',
            params: {
                itemsText: '状态:select, 城市:select, 关键词:search'
            }
        }
    });
    const raw = String(value || '').trim();
    if (!raw) {
        throw new Error(errorMessage);
    }

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

    if (items.length === 0) {
        throw new Error(errorMessage);
    }

    return items;
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

/**
 * 通用 Figma 组件属性应用函数（Step 6）
 *
 * 读取 registry.figmaPropertySnapshot.propertyMap，将 params 映射为 Figma variant/boolean 属性，
 * 调用 instance.setProperties()。不再为每个组件单独硬编码属性名。
 *
 * transform 支持：
 *   'boolean'  — boolean → 'True'/'False'
 *   (undefined) — 直接使用 params 值（需与 Figma variant 枚举值完全一致）
 */
function applyFigmaComponentProps(
    instance: InstanceNode,
    componentId: string,
    params: Record<string, any>
): void {
    const def = COMPONENT_DEFS[componentId];
    const propertyMap = (def?.figmaPropertySnapshot as any)?.propertyMap as
        | Record<string, { sourceParam: string; transform?: string }>
        | undefined;
    if (!propertyMap) return;

    const propertiesSnapshot = (def?.figmaPropertySnapshot as any)?.properties as Array<{ propertyName: string, type: string }> | undefined;
    const propertyTypes: Record<string, string> = {};
    if (propertiesSnapshot) {
        propertiesSnapshot.forEach(p => {
            propertyTypes[p.propertyName] = p.type;
        });
    }

    const nextProps: Record<string, string | boolean> = {};
    for (const [displayName, binding] of Object.entries(propertyMap)) {
        const rawValue = params[binding.sourceParam];
        if (rawValue === undefined || rawValue === null) continue;
        const propName = findInstanceComponentPropertyName(instance, displayName);
        if (!propName) continue;
        
        const propType = propertyTypes[propName] || propertyTypes[displayName];
        let value: string | boolean;

        if (binding.transform === 'boolean') {
            if (propType === 'BOOLEAN') {
                value = Boolean(rawValue);
            } else {
                value = toVariantBoolean(Boolean(rawValue));
            }
        } else if (binding.transform === 'string:boolean') {
            // non-empty string → 'True', empty → 'False'
            if (propType === 'BOOLEAN') {
                value = String(rawValue).trim().length > 0;
            } else {
                value = toVariantBoolean(String(rawValue).trim().length > 0);
            }
        } else if (binding.transform === 'number') {
            value = String(Number(rawValue) || 0);
        } else if (binding.transform === 'list:length') {
            // count comma/newline-separated items
            const items = String(rawValue).split(/[,，\n\r]/).map((s) => s.trim()).filter(Boolean);
            value = String(Math.max(2, items.length));
        } else if (binding.transform && binding.transform.startsWith('boolean:')) {
            // e.g. "boolean:Disabled?Default"
            const parts = binding.transform.replace('boolean:', '').split('?');
            value = Boolean(rawValue) ? (parts[0] || 'True') : (parts[1] || 'False');
        } else if (binding.transform && binding.transform.startsWith('variant:')) {
            // e.g. "variant:Hover?Default"
            const parts = binding.transform.replace('variant:', '').split('?');
            value = Boolean(rawValue) ? (parts[0] || 'True') : (parts[1] || 'Default');
        } else {
            value = String(rawValue);
        }
        nextProps[propName] = value;
    }
    if (Object.keys(nextProps).length > 0) {
        try {
            instance.setProperties(nextProps);
        } catch (e) {
            console.warn(`[applyFigmaComponentProps] failed to set properties for ${componentId}:`, e, nextProps);
        }
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

function getFormLabelWidthRuntimeConfig(): {
    defaultWidth: number | null;
    presets: Record<string, number>;
    variantThresholds: { medium?: number; large?: number };
} {
    const formDef = COMPONENT_DEFS['form'] as any;
    const runtime = formDef?.runtime?.labelWidth;
    const presets = runtime?.presets && typeof runtime.presets === 'object' ? runtime.presets : {};
    const variantThresholds =
        runtime?.variantThresholds && typeof runtime.variantThresholds === 'object'
            ? runtime.variantThresholds
            : {};
    const defaultWidth =
        toPositiveNumber(runtime?.default) ?? toPositiveNumber(formDef?.params?.labelWidth?.default);
    return {
        defaultWidth: defaultWidth ?? null,
        presets,
        variantThresholds
    };
}

function resolveFormLabelWidthVariantLabel(params: Record<string, any>): 'Fill 跟随输入域' | 'Default 80' | 'Medium 120' | 'Large 160' {
    const preset = normalizeFormLabelWidthPreset(params.labelWidthPreset);
    switch (preset) {
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
            const { variantThresholds } = getFormLabelWidthRuntimeConfig();
            const largeThreshold = toPositiveNumber(variantThresholds.large);
            const mediumThreshold = toPositiveNumber(variantThresholds.medium);
            if (Number.isFinite(explicit) && largeThreshold !== null && explicit >= largeThreshold) return 'Large 160';
            if (Number.isFinite(explicit) && mediumThreshold !== null && explicit >= mediumThreshold) return 'Medium 120';
            return 'Default 80';
        }
    }
}

function normalizeFormFieldControlType(controlType: unknown): string {
    const normalized = String(controlType || '').trim().toLowerCase();
    if (!normalized) return 'input';
    if (normalized.includes('checkbox') || normalized.includes('多选')) return 'checkbox-group';
    if (normalized.includes('radio') || normalized.includes('单选')) return 'radio-group';
    if (normalized.includes('datepicker') || normalized.includes('日期')) return 'datepicker';
    if (normalized.includes('inputnumber') || normalized.includes('数字')) return 'inputnumber';
    if (normalized.includes('slider') || normalized.includes('滑动')) return 'slider';
    if (normalized.includes('switch') || normalized.includes('开关')) return 'switch';
    if (normalized.includes('textarea') || normalized.includes('多行')) return 'textarea';
    if (normalized.includes('timepicker') || normalized.includes('时间')) return 'timepicker';
    if (normalized.includes('segmented') || normalized.includes('分段')) return 'segmented-picker';
    if (normalized.includes('select') || normalized.includes('选择')) return 'select';
    if (normalized.includes('upload') || normalized.includes('上传')) return 'upload';
    if (normalized.includes('button') || normalized.includes('按钮')) return 'button';
    if (normalized.includes('figma-component') || normalized.includes('figma')) return 'figma-component';
    return 'input';
}

function isFormFieldLabelInstance(node: SceneNode): node is InstanceNode {
    return node.type === 'INSTANCE' && String(node.name || '').includes('Lable 表单文字标签');
}

function isFormFieldDescriptionInstance(node: SceneNode): boolean {
    return String(node.name || '').includes('Description 解释说明');
}

function isFormFieldControlNode(node: SceneNode): boolean {
    if ('getPluginData' in node) {
        const role = node.getPluginData('form-field-role');
        if (role === 'control') return true;
        const componentId = node.getPluginData('component-id');
        if (
            componentId === 'input' ||
            componentId === 'select' ||
            componentId === 'checkbox-group' ||
            componentId === 'radio-group' ||
            componentId === 'checkbox' ||
            componentId === 'radio' ||
            componentId === 'switch' ||
            componentId === 'textarea' ||
            componentId === 'datepicker' ||
            componentId === 'timepicker' ||
            componentId === 'inputnumber' ||
            componentId === 'slider' ||
            componentId === 'segmented-picker' ||
            componentId === 'upload' ||
            componentId === 'button' ||
            componentId === 'figma-component'
        ) {
            return true;
        }
    }
    const name = String(node.name || '').trim();
    return (
        name.includes('Input 输入框') ||
        name.includes('Select 选择器') ||
        name.includes('DatePicker 日期') ||
        name.includes('TimePicker 时间') ||
        name.includes('InputNumber 数字') ||
        name.includes('Slider 滑动') ||
        name.includes('Segmented Picker') ||
        name.includes('Upload 上传') ||
        name.includes('Checkbox Group 复选框组') ||
        name.includes('Radio Group 单选框组') ||
        name.includes('Checkbox 复选框') ||
        name.includes('Radio 单选框') ||
        name.includes('Switch 开关') ||
        name.includes('TextArea 文本域') ||
        name.includes('Textarea 文本域') ||
        name.includes('Textarea') ||
        name.includes('多行文本') ||
        name.includes('多行')
    );
}

function findFormFieldControlNode(container: SceneNode & ChildrenMixin): SceneNode | null {
    // 优先通过 pluginData 查找深度嵌套的控件节点
    if ('findAll' in container) {
        const markedNode = container.findAll(n => n.getPluginData('form-field-role') === 'control')[0];
        if (markedNode) return markedNode;
    }

    // 其次通过特定组件 ID 查找
    if ('findAll' in container) {
        const knownComponentNode = container.findAll(n => {
            const componentId = n.getPluginData('component-id');
            return !!componentId && componentId !== 'form-field' && componentId !== 'form-row' && componentId !== 'form';
        })[0];
        if (knownComponentNode) return knownComponentNode;
    }

    // 再次通过名称关键字查找
    if ('findAll' in container) {
        const matchedByName = container.findAll(n => isLikelyFormFieldControlNode(n))[0];
        if (matchedByName) return matchedByName;
    }

    // 兜底：查找非标签、非描述的第一个有意义节点
    const candidates = container.children.filter(child => {
        if (isFormFieldLabelInstance(child)) return false;
        if (isFormFieldDescriptionInstance(child)) return false;
        return true;
    });

    return candidates[0] || null;
}

function isLikelyFormFieldControlNode(node: SceneNode): boolean {
    const name = String(node.name || '').trim();
    const componentId = node.getPluginData('component-id');
    
    const knownIds = [
        'input', 'select', 'checkbox-group', 'radio-group', 'checkbox', 'radio', 
        'switch', 'textarea', 'datepicker', 'timepicker', 'inputnumber', 
        'slider', 'segmented-picker', 'upload', 'button', 'figma-component'
    ];
    if (componentId && knownIds.includes(componentId)) return true;

    const keywords = [
        'Input 输入框', 'Select 选择器', 'DatePicker 日期', 'TimePicker 时间', 
        'InputNumber 数字', 'Slider 滑动', 'Segmented Picker', 'Upload 上传', 
        'Checkbox Group 复选框组', 'Radio Group 单选框组', 'Checkbox 复选框', 
        'Radio 单选框', 'Switch 开关', 'TextArea 文本域', 'Textarea 文本域', 
        'Textarea', '多行文本', '多行', 'Control'
    ];
    
    return keywords.some(k => name.includes(k));
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

function normalizeFormFieldLabelText(value: string): string {
    return value.replace(/[：:]\s*$/, '').trim();
}

function readFormFieldLabelTextFromNode(node: SceneNode): string | null {
    const contentContainer = findFormFieldContentContainer(node);
    if (!contentContainer) return null;
    const labelInstance = contentContainer.children.find(isFormFieldLabelInstance);
    if (labelInstance && 'findOne' in labelInstance) {
        const labelTextNode =
            labelInstance.findOne((child) => child.type === 'TEXT' && String(child.name || '').trim() === 'Lable') ||
            labelInstance.findOne((child) => child.type === 'TEXT');
        if (labelTextNode && labelTextNode.type === 'TEXT') {
            return normalizeFormFieldLabelText(labelTextNode.characters || '');
        }
    }
    if ('findAll' in node) {
        const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
        const candidate =
            textNodes.find((text) => String(text.name || '').trim() === 'Lable') ||
            textNodes.find((text) => /[：:]\s*$/.test(text.characters || '')) ||
            textNodes.find((text) => typeof text.fontSize === 'number' && text.fontSize >= 13);
        if (candidate) {
            return normalizeFormFieldLabelText(candidate.characters || '');
        }
    }
    return null;
}

function readFirstMeaningfulTextFromNode(node: SceneNode): string | null {
    if (!('findAll' in node)) return null;
    const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
    const preferred = textNodes.find((text) => {
        const value = String(text.characters || '').trim();
        return Boolean(value) && value !== '✓' && value !== '−';
    });
    if (preferred) return String(preferred.characters || '').trim();
    const fallback = textNodes.find((text) => String(text.characters || '').trim().length > 0);
    return fallback ? String(fallback.characters || '').trim() : null;
}

function readInputMainTextNode(root: SceneNode): TextNode | null {
    if (!('findAll' in root)) return null;
    const textNodes = root.findAll((child) => child.type === 'TEXT') as TextNode[];
    return (
        textNodes.find((child) => String(child.name || '').trim().toLowerCase() === 'text') ||
        textNodes[textNodes.length - 1] ||
        null
    );
}

function matchInputAffixName(value: string, kind: 'prefix' | 'suffix'): boolean {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return false;
    if (kind === 'prefix') return normalized.includes('prefix') || normalized.includes('前缀');
    return normalized.includes('suffix') || normalized.includes('后缀');
}

function findInputAffixTextNodes(
    textNodes: TextNode[],
    mainTextNode?: TextNode | null
): { prefixNode: TextNode | null; suffixNode: TextNode | null } {
    const candidates = textNodes.filter((node) => node !== mainTextNode);
    if (candidates.length === 0) return { prefixNode: null, suffixNode: null };

    let prefixNode: TextNode | null = null;
    let suffixNode: TextNode | null = null;
    for (const node of candidates) {
        const combined = `${String(node.name || '')} ${String(node.parent?.name || '')}`.toLowerCase();
        if (!prefixNode && matchInputAffixName(combined, 'prefix')) {
            prefixNode = node;
        }
        if (!suffixNode && matchInputAffixName(combined, 'suffix')) {
            suffixNode = node;
        }
        if (prefixNode && suffixNode) break;
    }

    const sortedByX = [...candidates].sort((a, b) => {
        const ax = a.absoluteBoundingBox?.x ?? 0;
        const bx = b.absoluteBoundingBox?.x ?? 0;
        return ax - bx;
    });
    const fallbackPrefix = sortedByX[0] ?? null;
    const fallbackSuffix = sortedByX.length > 1 ? sortedByX[sortedByX.length - 1] : null;

    const finalPrefix = prefixNode ?? fallbackPrefix;
    let finalSuffix = suffixNode ?? fallbackSuffix;
    if (finalPrefix && finalSuffix && finalPrefix.id === finalSuffix.id) {
        finalSuffix = null;
    }
    return { prefixNode: finalPrefix, suffixNode: finalSuffix };
}

function readInstanceBooleanProperty(instance: InstanceNode, displayNames: string[]): boolean | null {
    for (const displayName of displayNames) {
        const key = findInstanceComponentPropertyName(instance, displayName);
        if (!key) continue;
        const prop = instance.componentProperties?.[key];
        if (!prop) continue;
        if (prop.type === 'BOOLEAN' && typeof prop.value === 'boolean') {
            return prop.value;
        }
        const raw = String(prop.value ?? '').trim().toLowerCase();
        if (!raw) continue;
        if (raw === 'true' || raw === 'yes' || raw === 'on' || raw === 'checked' || raw === 'selected') {
            return true;
        }
        if (raw === 'false' || raw === 'no' || raw === 'off' || raw === 'unchecked' || raw === 'unselected') {
            return false;
        }
    }
    return null;
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

function readSelectDropdownOptionTexts(root: SceneNode): string[] {
    if (!('findOne' in root)) return [];
    const dropdownRoot = root.findOne((node) => String(node.name || '').includes('Dropdown 下拉菜单'));
    if (!dropdownRoot || !('children' in dropdownRoot)) return [];

    const optionTexts: string[] = [];
    const optionNodes = dropdownRoot.children.filter(isSelectDropdownItemNode);
    for (const optionNode of optionNodes) {
        if (!('findOne' in optionNode)) continue;
        const labelNode =
            optionNode.findOne(
                (child) =>
                    child.type === 'TEXT' &&
                    String(child.name || '').trim() === 'Row Label'
            ) ||
            optionNode.findOne((child) => child.type === 'TEXT');
        if (!labelNode || labelNode.type !== 'TEXT') continue;
        const text = String(labelNode.characters || '').trim();
        if (text) optionTexts.push(text);
    }
    return optionTexts;
}

function isCheckboxGroupItemNode(node: SceneNode): boolean {
    return String(node.name || '').includes('Checkbox 复选框');
}

function isRadioGroupItemNode(node: SceneNode): boolean {
    return String(node.name || '').includes('Radio 单选框');
}

function collectCheckboxGroupItemNodes(root: SceneNode): SceneNode[] {
    if ('children' in root) {
        const directChildren = root.children.filter(isCheckboxGroupItemNode);
        if (directChildren.length > 0) return directChildren;
    }
    if (!('findAll' in root)) return [];
    return root.findAll(isCheckboxGroupItemNode) as SceneNode[];
}

function collectRadioGroupItemNodes(root: SceneNode): SceneNode[] {
    if ('children' in root) {
        const directChildren = root.children.filter(isRadioGroupItemNode);
        if (directChildren.length > 0) return directChildren;
    }
    if (!('findAll' in root)) return [];
    return root.findAll(isRadioGroupItemNode) as SceneNode[];
}

function readCheckboxLikeItemLabel(node: SceneNode): string | null {
    if (node.type === 'TEXT') {
        const direct = String(node.characters || '').trim();
        return direct && direct !== '✓' && direct !== '−' ? direct : null;
    }
    return readFirstMeaningfulTextFromNode(node);
}

function readCheckboxLikeItemChecked(node: SceneNode): boolean | null {
    if (node.type === 'INSTANCE') {
        const fromProp = readInstanceBooleanProperty(node, ['Checked 已选', 'Checked']);
        if (fromProp !== null) return fromProp;
    }
    if ('children' in node) {
        const firstChild = node.children[0];
        if (firstChild && 'children' in firstChild) {
            return firstChild.children.length > 0;
        }
    }
    if (!('findOne' in node)) return null;
    return Boolean(
        node.findOne(
            (child) =>
                child.type === 'TEXT' &&
                (String(child.characters || '').trim() === '✓' || String(child.characters || '').trim() === '−')
        )
    );
}

function readRadioLikeItemSelected(node: SceneNode): boolean | null {
    if (node.type === 'INSTANCE') {
        const fromProp = readInstanceBooleanProperty(node, ['Checked 已选', 'Checked']);
        if (fromProp !== null) return fromProp;
    }
    if ('children' in node) {
        const firstChild = node.children[0];
        if (firstChild && 'children' in firstChild) {
            return firstChild.children.some((child) => child.type === 'ELLIPSE');
        }
    }
    return null;
}

function syncInputParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const mainTextNode = readInputMainTextNode(node);
    if (!mainTextNode) return currentParams;

    const nextParams = { ...currentParams };
    const displayText = String(mainTextNode.characters || '');
    const placeholder = String(currentParams.placeholder || '请输入');
    
    // Check actual variant property if it's an instance
    let isFilledVariant = currentParams.filled === true;
    if (node.type === 'INSTANCE') {
        const fromProp = readInstanceBooleanProperty(node, ['Fill 已填', 'Filled 已填', 'Filled']);
        if (fromProp !== null) isFilledVariant = fromProp;
    }

    if (displayText === placeholder && !isFilledVariant) {
        nextParams.value = '';
        nextParams.filled = false;
    } else {
        nextParams.value = displayText;
        if (displayText) nextParams.cachedValue = displayText;
        nextParams.filled = isFilledVariant;
    }

    if ('findAll' in node) {
        const textNodes = node.findAll((child) => child.type === 'TEXT') as TextNode[];
        const { prefixNode, suffixNode } = findInputAffixTextNodes(textNodes, mainTextNode);
        if (prefixNode && prefixNode.id !== mainTextNode.id) {
            nextParams.prefixText = String(prefixNode.characters || '').trim();
        }
        if (suffixNode && suffixNode.id !== mainTextNode.id) {
            nextParams.suffixText = String(suffixNode.characters || '').trim();
        }
    }

    if (node.type === 'INSTANCE') {
        const errorProp = readInstanceBooleanProperty(node, ['Error 错误', 'Error']);
        if (errorProp !== null) {
            nextParams.error = errorProp;
        }
        const disabledProp = readInstanceBooleanProperty(node, ['Disable 禁用', 'Disabled 禁用', 'Disable', 'Disabled']);
        if (disabledProp !== null) {
            nextParams.disabled = disabledProp;
        }
    }

    if (nextParams.disabled === true) {
        nextParams.state = 'Disabled 禁用';
    } else if (nextParams.error === true) {
        nextParams.state = 'Error 错误';
    } else if (nextParams.state === 'Disabled 禁用' || nextParams.state === 'Error 错误') {
        nextParams.state = 'Default 默认';
    }

    return nextParams;
}

function syncSelectParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const displayTextNode = findSelectDisplayTextNode(node);
    const placeholder = String(currentParams.placeholder || '请选择');
    if (displayTextNode) {
        const displayText = String(displayTextNode.characters || '').trim();
        
        let isFilledVariant = currentParams.filled === true;
        if (node.type === 'INSTANCE') {
            const fromProp = readInstanceBooleanProperty(node, ['Fill 已填', 'Filled 已填', 'Filled']);
            if (fromProp !== null) isFilledVariant = fromProp;
        }

        if (displayText === placeholder && !isFilledVariant) {
            nextParams.value = '';
            nextParams.filled = false;
        } else {
            nextParams.value = displayText;
            nextParams.filled = isFilledVariant;
        }
    }

    const options = readSelectDropdownOptionTexts(node);
    if (options.length > 0) {
        nextParams.optionsText = options.join(',');
    }
    return nextParams;
}

function syncCheckboxGroupParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const itemNodes = collectCheckboxGroupItemNodes(node);
    if (itemNodes.length === 0) return nextParams;

    const options: string[] = [];
    const checkedValues: string[] = [];
    for (const itemNode of itemNodes) {
        const label = readCheckboxLikeItemLabel(itemNode);
        if (!label) continue;
        options.push(label);
        if (readCheckboxLikeItemChecked(itemNode)) {
            checkedValues.push(label);
        }
    }

    if (options.length > 0) nextParams.optionsText = options.join(',');
    nextParams.checkedValues = checkedValues.join(',');
    return nextParams;
}

function syncRadioGroupParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const itemNodes = collectRadioGroupItemNodes(node);
    if (itemNodes.length === 0) return nextParams;

    const options: string[] = [];
    let selectedValue = '';
    for (const itemNode of itemNodes) {
        const label = readCheckboxLikeItemLabel(itemNode);
        if (!label) continue;
        options.push(label);
        if (!selectedValue && readRadioLikeItemSelected(itemNode)) {
            selectedValue = label;
        }
    }

    if (options.length > 0) nextParams.optionsText = options.join(',');
    if (selectedValue) nextParams.value = selectedValue;
    return nextParams;
}

function syncStandaloneComponentParamsFromNode(
    componentId: string,
    currentParams: Record<string, any>,
    node: SceneNode
): Record<string, any> {
    if (componentId === 'input') {
        return syncInputParamsFromNode(currentParams, node);
    }
    if (componentId === 'select') {
        return syncSelectParamsFromNode(currentParams, node);
    }
    if (componentId === 'checkbox-group') {
        return syncCheckboxGroupParamsFromNode(currentParams, node);
    }
    if (componentId === 'radio-group') {
        return syncRadioGroupParamsFromNode(currentParams, node);
    }
    return currentParams;
}

function syncFormFieldParamsFromNode(currentParams: Record<string, any>, node: SceneNode): Record<string, any> {
    const nextParams = { ...currentParams };
    const labelFromNode = readFormFieldLabelTextFromNode(node);
    if (labelFromNode) {
        nextParams.label = labelFromNode;
    }

    const contentContainer = findFormFieldContentContainer(node);
    if (!contentContainer) return nextParams;
    const controlNode = findFormFieldControlNode(contentContainer);
    if (!controlNode) return nextParams;

    const controlType = normalizeFormFieldControlType(currentParams.controlType);
    if (controlType === 'input') {
        return syncInputParamsFromNode(nextParams, controlNode);
    }

    if (controlType === 'select') {
        return syncSelectParamsFromNode(nextParams, controlNode);
    }
    if (controlType === 'checkbox-group') {
        return syncCheckboxGroupParamsFromNode(nextParams, controlNode);
    }
    if (controlType === 'radio-group') {
        return syncRadioGroupParamsFromNode(nextParams, controlNode);
    }
    return nextParams;
}

function syncComponentParamsFromNode(
    componentId: string,
    currentParams: Record<string, any>,
    node: SceneNode
): Record<string, any> {
    if (componentId === 'form-field') {
        return syncFormFieldParamsFromNode(currentParams, node);
    }
    return syncStandaloneComponentParamsFromNode(componentId, currentParams, node);
}

function setNodeClipsContent(node: SceneNode, enabled: boolean): void {
    if (!('clipsContent' in node)) return;
    try {
        (node as FrameNode | ComponentNode | InstanceNode).clipsContent = enabled;
    } catch {
        // ignore nodes that cannot be mutated in the current context
    }
}

function applyFormControlWidthModeToNode(node: SceneNode, params: Record<string, any>): void {
    const mode = resolveFormControlWidthMode(params);
    if (mode === 'fill') {
        setFillWidthPreserveHeight(node);
        return;
    }
    const width = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    if (width !== null) {
        setFixedWidth(node, width);
        return;
    }
    if ('layoutSizingHorizontal' in node) {
        try {
            (node as any).layoutSizingHorizontal = 'FIXED';
        } catch {}
    }
    if ('layoutGrow' in node) {
        try {
            (node as any).layoutGrow = 0;
        } catch {}
    }
    if ('layoutAlign' in node) {
        try {
            (node as any).layoutAlign = 'MIN';
        } catch {}
    }
}

function normalizeFormControlVerticalSizing(node: SceneNode): void {
    if ('layoutSizingVertical' in node) {
        try {
            (node as any).layoutSizingVertical = 'FIXED';
        } catch {}
    }
    if ('layoutAlign' in node) {
        try {
            (node as any).layoutAlign = 'MIN';
        } catch {}
    }
}

function preserveNodeHeight(node: SceneNode, height: number | null): void {
    if (!height || !Number.isFinite(height) || height <= 0) return;
    if ('resize' in node) {
        try {
            const width = 'width' in node ? node.width : (node as any).width;
            (node as any).resize(width, height);
        } catch {}
    }
}


function shouldUseChildControlInstance(
    instance: ComponentInstance,
    params: Record<string, any>
): boolean {
    if (!Array.isArray(instance.children) || instance.children.length === 0) return false;
    const child = instance.children[0];
    if (!child) return false;
    const controlType = normalizeFormFieldControlType(params.controlType);
    if (controlType === 'input') return child.componentId === 'input' || child.componentId === 'figma-component';
    if (controlType === 'select') return child.componentId === 'select' || child.componentId === 'figma-component';
    if (controlType === 'textarea') return child.componentId === 'textarea' || child.componentId === 'figma-component';
    if (controlType === 'checkbox-group') return child.componentId === 'checkbox-group' || child.componentId === 'figma-component';
    if (controlType === 'radio-group') return child.componentId === 'radio-group' || child.componentId === 'figma-component';
    if (controlType === 'button') return child.componentId === 'button' || child.componentId === 'figma-component';
    if (controlType === 'figma-component') {
        const token = String(params.componentToken || '').trim();
        const key = String(params.componentKey || '').trim();
        const criteria = String(params.variantCriteria || '').trim();
        if (token || key || criteria) return false;
        return child.componentId === 'figma-component';
    }
    return false;
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

function normalizeFormControlWidthMode(value: unknown): 'fixed' | 'fill' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized.includes('fill') || normalized.includes('充满')) return 'fill';
    return 'fixed';
}

function getFormFieldControlWidthModeOverrides(): Record<string, string[]> {
    const runtime = (COMPONENT_DEFS['form-field'] as any)?.runtime;
    const overrides = runtime?.controlWidthModeOverrides;
    return overrides && typeof overrides === 'object' ? overrides : {};
}

// 受 controlWidthMode 影响的输入框类控件类型
const INPUT_LIKE_CONTROL_TYPES = new Set([
    'input', 'select', 'datepicker', 'inputnumber', 'textarea', 'timepicker'
]);

function resolveFormControlWidthMode(params: Record<string, any>): 'fixed' | 'fill' {
    const controlType = normalizeFormFieldControlType(params.controlType);
    // 只有输入框类控件受 controlWidthMode 影响
    if (!INPUT_LIKE_CONTROL_TYPES.has(controlType)) return 'fixed';
    return normalizeFormControlWidthMode(params.controlWidthMode);
}

function resolveFormFieldLayout(params: Record<string, any>): 'horizontal' | 'vertical' {
    const explicitLayout = String(params.layout || '').trim();
    if (explicitLayout) {
        return normalizeFormLayout(explicitLayout);
    }
    return normalizeFormAlign(params.align) === 'top' ? 'vertical' : 'horizontal';
}

function resolveFormLabelWidth(params: Record<string, any>): number {
    const explicit = Number(params.labelWidth);
    if (Number.isFinite(explicit) && explicit > 0) return explicit;

    const { defaultWidth, presets } = getFormLabelWidthRuntimeConfig();
    const preset = normalizeFormLabelWidthPreset(params.labelWidthPreset);
    const presetWidth = toPositiveNumber(presets[preset]);
    if (presetWidth !== null) return presetWidth;
    if (defaultWidth !== null) return defaultWidth;
    return 0;
}

function resolveFormLabelControlSpacing(params: Record<string, any>, layout: 'horizontal' | 'vertical'): number {
    const explicitSpacing = Number(params.labelControlSpacing);
    if (Number.isFinite(explicitSpacing) && explicitSpacing > 0) return explicitSpacing;
    return layout === 'vertical' ? 8 : 20;
}

function resolveFormControlWidth(params: Record<string, any>): number {
    const controlWidthMode = normalizeFormControlWidthMode(params.controlWidthMode);
    const explicitWidth = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    if (explicitWidth !== null) return explicitWidth;
    if (controlWidthMode === 'fill') return FORM_FIELD_DEFAULTS.controlWidth;
    return FORM_FIELD_DEFAULTS.controlWidth;
}

function collectFormFieldInstances(instance: ComponentInstance): ComponentInstance[] {
    if (instance.componentId === 'form-field') return [instance];
    if (!Array.isArray(instance.children)) return [];
    const result: ComponentInstance[] = [];
    instance.children.forEach((child) => {
        result.push(...collectFormFieldInstances(child));
    });
    return result;
}

function hasFormFieldInstance(instance: ComponentInstance): boolean {
    if (instance.componentId === 'form-field') return true;
    if (!Array.isArray(instance.children)) return false;
    return instance.children.some((child) => hasFormFieldInstance(child));
}

function isFormItemInstance(instance: ComponentInstance): boolean {
    if (instance.componentId === 'form-field') return true;
    if (instance.componentId === 'form-row') {
        return Array.isArray(instance.children) && instance.children.some((child) => hasFormFieldInstance(child));
    }
    return false;
}

function countFormItemInstances(instance: ComponentInstance): number {
    if (!Array.isArray(instance.children)) return 0;
    return instance.children.filter((child) => isFormItemInstance(child)).length;
}

function normalizeFormItemCount(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const rounded = Math.round(parsed);
    return rounded <= 0 ? 1 : rounded;
}

function cloneComponentInstance(instance: ComponentInstance, suffix: string): ComponentInstance {
    const baseId = instance.id || instance.componentId || 'instance';
    const cloned: ComponentInstance = {
        id: `${baseId}-${suffix}`,
        componentId: instance.componentId,
        params: { ...(instance.params || {}) }
    };
    if (Array.isArray(instance.children)) {
        cloned.children = instance.children.map((child, index) =>
            cloneComponentInstance(child, `${suffix}-${index}`)
        );
    }
    return cloned;
}

function applyFormItemLabel(instance: ComponentInstance, label: string): ComponentInstance {
    if (instance.componentId === 'form-field') {
        return {
            ...instance,
            params: {
                ...(instance.params || {}),
                label
            }
        };
    }
    if (!Array.isArray(instance.children)) return instance;
    let updated = false;
    const nextChildren = instance.children.map((child) => {
        if (!updated && hasFormFieldInstance(child)) {
            const nextChild = applyFormItemLabel(child, label);
            if (nextChild !== child) updated = true;
            return nextChild;
        }
        return child;
    });
    if (!updated) return instance;
    return { ...instance, children: nextChildren };
}

function createDefaultFormItem(index: number): ComponentInstance {
    return {
        id: `form-item-${Date.now()}-${index}`,
        componentId: 'form-field',
        params: {
            label: `字段${index}`,
            controlType: 'input',
            placeholder: '请输入'
        }
    };
}

function adjustFormItemChildren(
    children: ComponentInstance[] | undefined,
    targetCount: number
): ComponentInstance[] | undefined {
    if (!Array.isArray(children)) {
        if (targetCount <= 0) return children;
        return Array.from({ length: targetCount }, (_, index) => createDefaultFormItem(index + 1));
    }
    const nextChildren = [...children];
    const itemIndices = nextChildren.reduce((acc, child, index) => {
        if (isFormItemInstance(child)) acc.push(index);
        return acc;
    }, [] as number[]);
    const currentCount = itemIndices.length;
    if (currentCount === targetCount) return nextChildren;

    if (targetCount < currentCount) {
        let remaining = targetCount;
        return nextChildren.filter((child) => {
            if (!isFormItemInstance(child)) return true;
            if (remaining > 0) {
                remaining -= 1;
                return true;
            }
            return false;
        });
    }

    const template = currentCount > 0 ? nextChildren[itemIndices[itemIndices.length - 1]] : createDefaultFormItem(1);
    const insertAt = currentCount > 0 ? itemIndices[itemIndices.length - 1] + 1 : nextChildren.length;
    const additions: ComponentInstance[] = [];
    for (let i = 0; i < targetCount - currentCount; i += 1) {
        const index = currentCount + i + 1;
        const cloned = cloneComponentInstance(template, `auto-${Date.now()}-${i}`);
        additions.push(applyFormItemLabel(cloned, `字段${index}`));
    }
    nextChildren.splice(insertAt, 0, ...additions);
    return nextChildren;
}

function stripFormItemCount(params: Record<string, any>): Record<string, any> {
    const { itemCount: _itemCount, ...rest } = params || {};
    return rest;
}

function areFormParamsEquivalent(prevParams: Record<string, any>, nextParams: Record<string, any>): boolean {
    const prev = stripFormItemCount(prevParams);
    const next = stripFormItemCount(nextParams);
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(next);
    if (prevKeys.length !== nextKeys.length) return false;
    for (const key of prevKeys) {
        if (prev[key] !== next[key]) return false;
    }
    return true;
}

function isFormItemNode(node: SceneNode): boolean {
    if (!('getPluginData' in node)) return false;
    const componentId = node.getPluginData('component-id');
    if (componentId === 'form-field') return true;
    if (componentId !== 'form-row') return false;
    if (!('children' in node)) return false;
    return node.children.some((child) => 'getPluginData' in child && child.getPluginData('component-id') === 'form-field');
}

function collectFormItemNodes(frame: FrameNode): SceneNode[] {
    return frame.children.filter((child) => isFormItemNode(child));
}

function normalizeFormChildInstance(
    child: ComponentInstance,
    columnSpacing: number | null
): ComponentInstance {
    if (child.componentId === 'form-row' && Array.isArray(child.children) && child.children.length === 1 && child.children[0].componentId === 'form-field') {
        const field = child.children[0];
        return {
            ...field,
            params: {
                ...(child.params || {}),
                ...(field.params || {})
            }
        };
    }
    if (child.componentId === 'form-row' && columnSpacing !== null) {
        const childParams = child.params || {};
        const spacing = toPositiveNumber(childParams.spacing);
        return {
            ...child,
            params: {
                ...childParams,
                spacing: spacing === null ? columnSpacing : childParams.spacing
            }
        };
    }
    return child;
}

function syncFormItemLabelsFromNode(
    instance: ComponentInstance,
    node: SceneNode | null
): ComponentInstance {
    if (!node) return instance;
    if (instance.componentId === 'form-field') {
        const currentParams = instance.params || {};
        // Sync full form-field params (label + control text) from the live canvas node,
        // so that layout-only re-renders (e.g. required/label change triggering label-width
        // realignment) do not reset user-edited input text in sibling fields.
        const syncedParams = syncFormFieldParamsFromNode(currentParams, node);
        const hasChanges = Object.keys(syncedParams).some(
            (key) => syncedParams[key] !== currentParams[key]
        );
        if (!hasChanges) return instance;
        return {
            ...instance,
            params: syncedParams
        };
    }
    if (instance.componentId === 'form-row' && Array.isArray(instance.children) && 'children' in node) {
        const fieldNodes = node.children.filter(
            (child) => 'getPluginData' in child && child.getPluginData('component-id') === 'form-field'
        );
        return {
            ...instance,
            children: instance.children.map((child, index) =>
                syncFormItemLabelsFromNode(child, (fieldNodes[index] as SceneNode) || null)
            )
        };
    }
    if (Array.isArray(instance.children)) {
        return {
            ...instance,
            children: instance.children.map((child) => syncFormItemLabelsFromNode(child, null))
        };
    }
    return instance;
}

async function resolveFormParamsForRender(
    formParams: Record<string, any>,
    instance: ComponentInstance
): Promise<Record<string, any>> {
    const fields = Array.isArray(instance.children) ? instance.children.flatMap((child) => collectFormFieldInstances(child)) : [];
    const hasHorizontalLabel = fields.some((field) => {
        const inherited = inheritFormFieldParams(formParams, field);
        const fieldParams = inherited.params || {};
        const layout = resolveFormFieldLayout(fieldParams);
        const label = String(fieldParams.label || '').trim();
        return layout !== 'vertical' && label.length > 0;
    });
    const resolvedFormParams = hasHorizontalLabel ? { ...formParams } : formParams;
    if (hasHorizontalLabel) {
        const maxLabelWidth = await resolveAutoFormLabelWidth(formParams, instance);
        console.log('[DEBUG resolveFormParams] maxLabelWidth:', maxLabelWidth, 'current:', resolvedFormParams.labelWidth);
        if (maxLabelWidth > 0) {
            const currentLabelWidth = Number(resolvedFormParams.labelWidth);
            const mergedLabelWidth =
                Number.isFinite(currentLabelWidth) && currentLabelWidth > 0
                    ? Math.max(currentLabelWidth, maxLabelWidth)
                    : maxLabelWidth;
            resolvedFormParams.labelWidth = mergedLabelWidth;
            resolvedFormParams.labelWidthPreset = 'custom';
            console.log('[DEBUG resolveFormParams] mergedLabelWidth:', mergedLabelWidth);
        }
    }
    return resolvedFormParams;
}

async function renderFormItemNode(
    formFrame: FrameNode,
    formParams: Record<string, any>,
    instance: ComponentInstance,
    columnSpacing: number | null,
    resolvedFormParams: Record<string, any>
): Promise<SceneNode> {
    const processedChild = normalizeFormChildInstance(instance, columnSpacing);
    if (processedChild.componentId === 'form-field' && resolvedFormParams && resolvedFormParams.labelWidth > 0) {
        delete processedChild.params?.labelWidth;
    }
    const node = await renderComponent(inheritFormFieldParams(resolvedFormParams, processedChild), { isRoot: false });
    if ((node.type === 'FRAME' || node.type === 'INSTANCE') && formFrame.counterAxisSizingMode === 'FIXED') {
        node.layoutAlign = 'STRETCH';
    }
    return node;
}

async function updateFormItemCount(
    formFrame: FrameNode,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): Promise<boolean> {
    const targetCount = normalizeFormItemCount(nextParams.itemCount);
    if (targetCount === null) return false;
    let snapshot = buildComponentInstanceFromNode(formFrame);
    if (!snapshot) {
        snapshot = readComponentInstanceSnapshot(formFrame);
    }
    if (!snapshot) return false;
    const normalizedParams: Record<string, any> = { ...nextParams, itemCount: targetCount };
    const patchedInstance = patchFormInstanceSnapshot(snapshot, prevParams, normalizedParams);
    const nextItemInstances = Array.isArray(patchedInstance.children)
        ? patchedInstance.children.filter((child) => isFormItemInstance(child))
        : [];
    const itemNodes = collectFormItemNodes(formFrame);
    const currentCount = itemNodes.length;
    if (targetCount < currentCount) {
        for (let i = currentCount - 1; i >= targetCount; i -= 1) {
            itemNodes[i].remove();
        }
    } else if (targetCount > currentCount) {
        const columnSpacing = toPositiveNumber(normalizedParams.columnSpacing);
        const resolvedFormParams = await resolveFormParamsForRender(normalizedParams, patchedInstance);
        const newInstances = nextItemInstances.slice(currentCount);
        let insertIndex = formFrame.children.length;
        if (currentCount > 0) {
            const lastNode = itemNodes[currentCount - 1];
            const lastIndex = formFrame.children.indexOf(lastNode);
            insertIndex = lastIndex >= 0 ? lastIndex + 1 : formFrame.children.length;
        }
        for (const instance of newInstances) {
            const childNode = await renderFormItemNode(formFrame, normalizedParams, instance, columnSpacing, resolvedFormParams);
            formFrame.insertChild(insertIndex, childNode);
            insertIndex += 1;
        }
    }
    writeNodeParams(formFrame, normalizedParams);
    writeComponentInstanceSnapshot(formFrame, patchedInstance);
    return true;
}

async function updateFormLayoutParams(
    formFrame: FrameNode,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): Promise<boolean> {
    if (prevParams.showActionArea !== nextParams.showActionArea) return false;
    let snapshot = buildComponentInstanceFromNode(formFrame);
    if (!snapshot) {
        snapshot = readComponentInstanceSnapshot(formFrame);
    }
    if (!snapshot) return false;
    const nextItemCount = normalizeFormItemCount(nextParams.itemCount);
    const normalizedParams: Record<string, any> = resolveFormLayoutParamsUpdate(
        prevParams,
        nextItemCount !== null ? { ...nextParams, itemCount: nextItemCount } : { ...nextParams }
    );

    const patchedInstance = patchFormInstanceSnapshot(snapshot, prevParams, normalizedParams);
    const itemNodes = collectFormItemNodes(formFrame);
    const nextItemInstances = Array.isArray(patchedInstance.children)
        ? patchedInstance.children.filter((child) => isFormItemInstance(child))
        : [];
    console.log('[DEBUG updateFormLayout] itemNodes:', itemNodes.length, 'nextItemInstances:', nextItemInstances.length, 'patchedChildren:', patchedInstance.children?.length);
    if (itemNodes.length !== nextItemInstances.length) {
        console.log('[DEBUG updateFormLayout] COUNT MISMATCH - returning false!');
        return false;
    }

    const rowSpacing = Number(normalizedParams.rowSpacing);
    const resolvedRowSpacing =
        Number.isFinite(rowSpacing) && rowSpacing > 0
            ? rowSpacing
            : (normalizeFormAlign(normalizedParams.align) === 'top' ? 24 : 12);
    formFrame.itemSpacing = resolvedRowSpacing;

    const title = String(normalizedParams.title || '').trim();
    const existingTitleNode = formFrame.children.find((child) => child.type === 'TEXT') as TextNode | undefined;
    if (title) {
        if (existingTitleNode) {
            existingTitleNode.characters = title;
        } else {
            const titleNode = figma.createText();
            await applyTextStyleBinding(titleNode, 'card-title-text-style-key', { family: 'Inter', style: 'Bold', size: 16 });
            titleNode.characters = title;
            await applyColorVariable(titleNode, 'card-title', '#0C0D0E');
            formFrame.insertChild(0, titleNode);
        }
    } else if (existingTitleNode) {
        existingTitleNode.remove();
    }

    const columnSpacing = toPositiveNumber(normalizedParams.columnSpacing);
    const resolvedFormParams = await resolveFormParamsForRender(normalizedParams, patchedInstance);
    const computedWidth = toPositiveNumber(normalizedParams.width);
    if (computedWidth !== null) {
        applyNodeSize(formFrame, computedWidth, null);
        formFrame.counterAxisSizingMode = 'FIXED';
    } else {
        formFrame.counterAxisSizingMode = 'AUTO';
    }
    for (let index = 0; index < itemNodes.length; index += 1) {
        const itemNode = itemNodes[index];
        const itemInstance = nextItemInstances[index];
        const syncedInstance = syncFormItemLabelsFromNode(itemInstance, itemNode);
        const childNode = await renderFormItemNode(
            formFrame,
            normalizedParams,
            syncedInstance,
            columnSpacing,
            resolvedFormParams
        );
        replaceSceneNode(itemNode, childNode);
    }

    writeNodeParams(formFrame, normalizedParams);
    writeComponentInstanceSnapshot(formFrame, patchedInstance);
    return true;
}

async function resolveAutoFormLabelWidth(
    formParams: Record<string, any>,
    instance: ComponentInstance
): Promise<number> {
    if (!Array.isArray(instance.children)) return 0;
    const fields = instance.children.flatMap((child) => collectFormFieldInstances(child));
    if (fields.length === 0) return 0;

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const tempText = figma.createText();
    tempText.visible = false;
    tempText.fontName = { family: 'Inter', style: 'Regular' };
    tempText.fontSize = 13;
    figma.currentPage.appendChild(tempText);
    tempText.textAutoResize = 'WIDTH_AND_HEIGHT';

    let maxWidth = 0;
    for (const field of fields) {
        const inherited = inheritFormFieldParams(formParams, field);
        const fieldParams = inherited.params || {};
        const layout = resolveFormFieldLayout(fieldParams);
        if (layout === 'vertical') continue;
        const label = String(fieldParams.label || '').trim();
        if (!label) continue;
        const textValue = `${label}${fieldParams.showColon === false ? '' : '：'}`;
        tempText.characters = textValue;
        
        let fieldWidth = tempText.width;
        if (fieldParams.required) {
            fieldWidth += 14 + 4; // Add width for the required asterisk icon and spacing
        }
        if (fieldWidth > maxWidth) maxWidth = fieldWidth;
    }

    tempText.remove();
    // Add a 2px safety buffer to ensure alignment doesn't break due to sub-pixel rounding
    return Math.ceil(maxWidth) + 2;
}

async function resolveFormContentWidth(
    instance: ComponentInstance,
    resolvedFormParams: Record<string, any>
): Promise<number | null> {
    if (!Array.isArray(instance.children)) return null;
    const fields = instance.children.flatMap((child) => collectFormFieldInstances(child));
    if (fields.length === 0) return null;

    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    const tempText = figma.createText();
    tempText.visible = false;
    tempText.fontName = { family: 'Inter', style: 'Regular' };
    tempText.fontSize = 13;
    figma.currentPage.appendChild(tempText);
    tempText.textAutoResize = 'WIDTH_AND_HEIGHT';

    let maxWidth = 0;
    for (const field of fields) {
        const inherited = inheritFormFieldParams(resolvedFormParams, field);
        const fieldParams = inherited.params || {};
        const layout = resolveFormFieldLayout(fieldParams);
        const label = String(fieldParams.label || '').trim();
        let labelTextWidth = 0;
        if (label) {
            tempText.characters = `${label}${fieldParams.showColon === false ? '' : '：'}`;
            labelTextWidth = tempText.width;
            if (fieldParams.required) {
                labelTextWidth += 14 + 4; // Add width for the required asterisk icon and spacing
            }
        }
        const controlWidth = resolveFormControlWidth(fieldParams);
        if (layout === 'vertical') {
            maxWidth = Math.max(maxWidth, Math.ceil(Math.max(labelTextWidth, controlWidth)));
        } else {
            if (!label) {
                maxWidth = Math.max(maxWidth, Math.ceil(controlWidth));
                continue;
            }
            const labelWidth = resolveFormLabelWidth(fieldParams);
            const spacing = resolveFormLabelControlSpacing(fieldParams, layout);
            maxWidth = Math.max(maxWidth, Math.ceil(labelWidth + spacing + controlWidth));
        }
    }

    tempText.remove();
    return maxWidth > 0 ? maxWidth : null;
}

function parseDelimitedText(value: unknown, fallback: string[]): string[] {
    const raw = String(value || '').trim();
    const items = raw
        ? raw.split(/[\n\r,，、|\s]+/).map((item) => item.trim()).filter(Boolean)
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
        const formLayoutRaw = String(formParams.layout || '').trim();
        const inferredLayout =
            String(currentParams.layout || '').trim()
                ? currentParams.layout
                : formLayoutRaw
                    ? normalizeFormLayout(formParams.layout)
                    : inheritedAlign === 'top'
                        ? 'vertical'
                        : 'horizontal';
        const nextParams = {
            ...currentParams,
            align: inheritedAlign,
            layout: inferredLayout,
            labelAlign: currentParams.labelAlign || (inheritedAlign === 'right' ? 'right' : 'left'),
            labelWidthPreset: currentParams.labelWidthPreset || formParams.labelWidthPreset || 'custom',
            labelWidth: formParams.labelWidth ?? currentParams.labelWidth,
            controlWidth: currentParams.controlWidth ?? formParams.controlWidth,
            controlWidthMode: currentParams.controlWidthMode ?? formParams.controlWidthMode,
            showColon: currentParams.showColon ?? formParams.showColon,
            ...(formParams.requiredMark === false ? { required: false } : {})
        };
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
    'controlWidthMode',
    'showColon'
  ];
  
  const FORM_FIELD_LABEL_WIDTH_DEFAULT =
    toPositiveNumber((COMPONENT_DEFS['form-field'] as any)?.params?.labelWidth?.default) ?? 0;
const FORM_FIELD_DEFAULTS: Record<string, any> = {
    layout: 'horizontal',
    labelAlign: 'left',
    labelWidthPreset: 'custom',
    labelWidth: FORM_FIELD_LABEL_WIDTH_DEFAULT,
    controlWidth: 240,
    controlWidthMode: 'fixed',
    showColon: false
};

function patchFormInstanceSnapshot(
    snapshot: ComponentInstance,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): ComponentInstance {
    const oldColumnSpacing = toPositiveNumber(prevParams.columnSpacing);
    const newColumnSpacing = toPositiveNumber(nextParams.columnSpacing);
    const nextItemCount = normalizeFormItemCount(nextParams.itemCount);

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
            // ── labelAlign 派生清除 ──
            // labelAlign 由 form.align 衍生（right→right, 否则 left），但 form 级
            // params 没有 labelAlign 字段，通用继承判断无法清除残留值。
            // 若子节点 labelAlign 等于从 prevParams.align 衍生的值，说明是继承而来，
            // 应清除以便 inheritFormFieldParams 用新 align 重新计算。
            if (fieldParams.labelAlign !== undefined && prevParams.labelAlign === undefined) {
                const prevDerivedLabelAlign = normalizeFormAlign(prevParams.align) === 'right' ? 'right' : 'left';
                if (fieldParams.labelAlign === prevDerivedLabelAlign) {
                    delete fieldParams.labelAlign;
                }
            }
            nextChild = { ...child, params: fieldParams };
        }

        if (Array.isArray(nextChild.children)) {
            nextChild = { ...nextChild, children: nextChild.children.map(patchChild) };
        }
        return nextChild;
    };

    const normalizedParams = nextItemCount !== null
        ? { ...nextParams, itemCount: nextItemCount }
        : nextParams;
    const next: ComponentInstance = {
        ...snapshot,
        componentId: 'form',
        params: normalizedParams
    };
    let patchedChildren = Array.isArray(snapshot.children)
        ? snapshot.children.map(patchChild)
        : snapshot.children;
    if (nextItemCount !== null) {
        patchedChildren = adjustFormItemChildren(patchedChildren, nextItemCount) || patchedChildren;
    }
    if (patchedChildren) {
        next.children = patchedChildren;
    }
    return next;
}

function shouldResetFormFieldChildren(
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): boolean {
    const prevType = normalizeFormFieldControlType(prevParams.controlType);
    const nextType = normalizeFormFieldControlType(nextParams.controlType);
    if (prevType !== nextType) return true;

    if (nextType === 'figma-component') {
        const prevToken = String(prevParams.componentToken || '').trim();
        const nextToken = String(nextParams.componentToken || '').trim();
        const prevKey = String(prevParams.componentKey || '').trim();
        const nextKey = String(nextParams.componentKey || '').trim();
        const prevCriteria = String(prevParams.variantCriteria || '').trim();
        const nextCriteria = String(nextParams.variantCriteria || '').trim();
        if (prevToken !== nextToken || prevKey !== nextKey || prevCriteria !== nextCriteria) {
            return true;
        }
    }

    return false;
}

function patchFormFieldInstanceSnapshot(
    snapshot: ComponentInstance,
    prevParams: Record<string, any>,
    nextParams: Record<string, any>
): ComponentInstance {
    const nextInstance: ComponentInstance = {
        ...snapshot,
        componentId: 'form-field',
        params: nextParams
    };
    if (shouldResetFormFieldChildren(prevParams, nextParams)) {
        const { children: _unused, ...rest } = nextInstance;
        return rest;
    }
    return nextInstance;
}

function mapFormRowAlignment(value: unknown): 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'center') return 'CENTER';
    if (normalized === 'end' || normalized === 'right') return 'MAX';
    if (normalized === 'between' || normalized === 'space-between') return 'SPACE_BETWEEN';
    return 'MIN';
}

function resolveComponentTokenForControl(componentId: string): string {
    const def = COMPONENT_DEFS[componentId] as any;
    const token = typeof def?.figmaPropertySnapshot?.token === 'string' ? def.figmaPropertySnapshot.token.trim() : '';
    return token;
}

function buildFigmaControlInstance(componentId: string, params: Record<string, any>): ComponentInstance {
    const explicitToken = typeof params.componentToken === 'string' ? params.componentToken.trim() : '';
    const componentToken = explicitToken || resolveComponentTokenForControl(componentId);
    if (!componentToken) {
        return {
            id: 'form-field-control',
            componentId,
            params
        };
    }
    return {
        id: 'form-field-control',
        componentId: 'figma-component',
        params: {
            ...params,
            componentToken
        }
    };
}

function createControlInstanceFromFormFieldParams(params: Record<string, any>): ComponentInstance {
    const controlType = normalizeFormFieldControlType(params.controlType);
    const controlWidthMode = resolveFormControlWidthMode(params);
    const explicitControlWidth = toPositiveNumber(params.controlWidth) ?? toPositiveNumber(params.width);
    const width = controlWidthMode === 'fill' ? undefined : (explicitControlWidth !== null ? explicitControlWidth : undefined);

    if (controlType === 'input') {
        const rawState = String(params.state || 'Default 默认');
        const normalizedState = rawState.trim().toLowerCase();
        const isErrorState = normalizedState.includes('error') || normalizedState.includes('错误');
        const isDisabledState = normalizedState.includes('disabled') || normalizedState.includes('禁用');
        const resolvedState = isErrorState || isDisabledState ? 'Default 默认' : rawState;
        const error = Boolean(params.error) || isErrorState;
        const disabled = Boolean(params.disabled) || isDisabledState;
        return buildFigmaControlInstance('input', {
            placeholder: params.placeholder || '请输入',
            value: params.value || '',
            width,
            size: params.size || 'Default 32',
            state: resolvedState,
            filled: Boolean(params.filled),
            error,
            disabled,
            showPrefix: Boolean(params.showPrefix ?? params.prefix),
            prefixText: params.prefixText || '',
            showSuffix: Boolean(params.showSuffix ?? params.suffix),
            suffixText: params.suffixText || '',
            forceFigmaKey: true
        });
    }

    if (controlType === 'textarea') {
        return buildFigmaControlInstance('textarea', {
            placeholder: params.placeholder || '请输入内容',
            value: params.value || '',
            wordLimit: params.wordLimit,
            resizable: params.resizable,
            filled: Boolean(params.filled),
            error: Boolean(params.error),
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'select') {
        return buildFigmaControlInstance('select', {
            placeholder: params.placeholder || '请选择',
            value: params.value || '',
            width,
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            filled: Boolean(params.filled),
            disabled: Boolean(params.disabled),
            multiple: Boolean(params.multiple),
            selectType: params.selectType || 'Default 默认',
            optionsText: params.optionsText || '选项一,选项二',
            forceFigmaKey: true
        });
    }

    if (controlType === 'checkbox-group') {
        return buildFigmaControlInstance('checkbox-group', {
            optionsText: params.optionsText || '选项一,选项二',
            checkedValues: params.checkedValues || params.value || '选项一',
            direction: params.direction || 'horizontal',
            gap: params.gap,
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'radio-group') {
        return buildFigmaControlInstance('radio-group', {
            optionsText: params.optionsText || '选项一,选项二',
            value: params.value || '选项一',
            direction: params.direction || 'horizontal',
            language: params.language || 'CN',
            gap: params.gap,
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'button') {
        return buildFigmaControlInstance('button', {
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
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'datepicker') {
        return buildFigmaControlInstance('datepicker', {
            placeholder: params.placeholder || '请选择日期',
            value: params.value || '',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'inputnumber') {
        return buildFigmaControlInstance('inputnumber', {
            placeholder: params.placeholder || '请输入数字',
            value: params.value || '',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'slider') {
        return buildFigmaControlInstance('slider', {
            value: Number(params.value) || 50,
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'switch') {
        return buildFigmaControlInstance('switch', {
            checked: Boolean(params.checked),
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'textarea') {
        return buildFigmaControlInstance('textarea', {
            placeholder: params.placeholder || '请输入内容',
            value: params.value || '',
            wordLimit: params.wordLimit,
            resizable: params.resizable,
            filled: Boolean(params.filled),
            error: Boolean(params.error),
            state: params.state,
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'timepicker') {
        return buildFigmaControlInstance('timepicker', {
            placeholder: params.placeholder || '请选择时间',
            value: params.value || '',
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'segmented-picker') {
        return buildFigmaControlInstance('segmented-picker', {
            optionsText: params.optionsText || '选项一,选项二',
            value: params.value || '选项一',
            size: params.size || 'Default 32',
            disabled: Boolean(params.disabled),
            width,
            forceFigmaKey: true
        });
    }

    if (controlType === 'upload') {
        return buildFigmaControlInstance('upload', {
            uploadType: params.uploadType,
            disabled: Boolean(params.disabled),
            forceFigmaKey: true
        });
    }

    if (controlType === 'figma-component') {
        return {
            id: 'form-field-control',
            componentId: 'figma-component',
            params: {
                componentToken: params.componentToken || '',
                componentKey: params.componentKey || '',
                variantCriteria: params.variantCriteria || '',
                disabled: Boolean(params.disabled),
                width,
                forceFigmaKey: true
            }
        };
    }

    const rawValue = String(params.value ?? '');
    const hasValue = rawValue.length > 0;
    const filled = Boolean(params.filled) || hasValue;

    return {
        id: 'form-field-control',
        componentId: 'input',
        params: {
            placeholder: params.placeholder ?? '请输入',
            value: rawValue,
            width,
            size: params.size || 'Default 32',
            state: params.state || 'Default 默认',
            filled,
            error: Boolean(params.error),
            disabled: Boolean(params.disabled),
            showPrefix: Boolean(params.showPrefix ?? params.prefix),
            prefixText: params.prefixText || '',
            showSuffix: Boolean(params.showSuffix ?? params.suffix),
            suffixText: params.suffixText || '',
            forceFigmaKey: true
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
    const oldLayoutSizingHorizontal =
        'layoutSizingHorizontal' in oldNode ? (oldNode as any).layoutSizingHorizontal : undefined;
    const oldLayoutSizingVertical =
        'layoutSizingVertical' in oldNode ? (oldNode as any).layoutSizingVertical : undefined;
    const oldWidthSizingMode =
        'layoutMode' in oldNode && oldNode.layoutMode !== 'NONE'
            ? (oldNode.layoutMode === 'HORIZONTAL'
                ? ('primaryAxisSizingMode' in oldNode ? oldNode.primaryAxisSizingMode : undefined)
                : ('counterAxisSizingMode' in oldNode ? oldNode.counterAxisSizingMode : undefined))
            : undefined;
    const oldHeightSizingMode =
        'layoutMode' in oldNode && oldNode.layoutMode !== 'NONE'
            ? (oldNode.layoutMode === 'HORIZONTAL'
                ? ('counterAxisSizingMode' in oldNode ? oldNode.counterAxisSizingMode : undefined)
                : ('primaryAxisSizingMode' in oldNode ? oldNode.primaryAxisSizingMode : undefined))
            : undefined;

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
    if (oldLayoutSizingHorizontal !== undefined && 'layoutSizingHorizontal' in newNode) {
        try {
            (newNode as any).layoutSizingHorizontal = oldLayoutSizingHorizontal;
        } catch {
            // ignore unsupported sizing transitions
        }
    }
    
    // 对于表单控件，不从旧节点继承垂直尺寸模式（避免从模板占位符继承 100px 固定高度）
    const isFormFieldControl = oldName === 'form-field-control' || newNode.name === 'form-field-control' || oldNode.getPluginData('component-id') === 'form-field-control' || newNode.getPluginData('component-id') === 'form-field-control';

    if (!isFormFieldControl && oldLayoutSizingVertical !== undefined && 'layoutSizingVertical' in newNode) {
        try {
            (newNode as any).layoutSizingVertical = oldLayoutSizingVertical;
        } catch {
            // ignore unsupported sizing transitions
        }
    }
    if (
        !isFormFieldControl &&
        ('layoutSizingHorizontal' in newNode) === false &&
        'layoutMode' in newNode &&
        newNode.layoutMode !== 'NONE'
    ) {
        if (oldWidthSizingMode && newNode.layoutMode === 'HORIZONTAL' && 'primaryAxisSizingMode' in newNode) {
            newNode.primaryAxisSizingMode = oldWidthSizingMode;
        } else if (oldWidthSizingMode && newNode.layoutMode !== 'HORIZONTAL' && 'counterAxisSizingMode' in newNode) {
            newNode.counterAxisSizingMode = oldWidthSizingMode;
        }

        if (oldHeightSizingMode && newNode.layoutMode === 'HORIZONTAL' && 'counterAxisSizingMode' in newNode) {
            newNode.counterAxisSizingMode = oldHeightSizingMode;
        } else if (oldHeightSizingMode && newNode.layoutMode !== 'HORIZONTAL' && 'primaryAxisSizingMode' in newNode) {
            newNode.primaryAxisSizingMode = oldHeightSizingMode;
        }
    }

    newNode.visible = false;
    parent.insertChild(index, newNode);

    if (preserveAbsolutePosition) {
        newNode.x = oldX;
        newNode.y = oldY;
    } else {
        // 当插入自动布局容器时重置坐标，防止保留创建时的远端坐标导致“掉在画布外”
        newNode.x = 0;
        newNode.y = 0;
    }
    if ('rotation' in newNode) {
        newNode.rotation = oldRotation;
    }
    if (!isFormFieldControl) {
        newNode.name = oldName;
    }
    newNode.locked = oldLocked;
    newNode.visible = oldVisible;

    oldNode.remove();
    return true;
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

const TEXT_STYLE_IMPORT_FAILED_CACHE = new Map<string, number>();
const TEXT_STYLE_IMPORT_FAILURE_TTL_MS = 5 * 60 * 1000;

async function resolveTextStyle(bindingKey: string): Promise<TextStyle | null> {
    const cacheHit = TEXT_STYLE_CACHE.get(bindingKey);
    if (cacheHit !== undefined) return cacheHit;

    const failedAt = TEXT_STYLE_IMPORT_FAILED_CACHE.get(bindingKey);
    if (failedAt && Date.now() - failedAt < TEXT_STYLE_IMPORT_FAILURE_TTL_MS) {
        return null;
    }

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

        try {
            const imported = await figma.importStyleByKeyAsync(keyCandidate);
            if (imported && imported.type === 'TEXT') {
                const textStyle = imported as TextStyle;
                TEXT_STYLE_CACHE.set(bindingKey, textStyle);
                return textStyle;
            }
        } catch {
            TEXT_STYLE_IMPORT_FAILED_CACHE.set(bindingKey, Date.now());
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
            if (typeof style.fontName !== 'symbol') {
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
    const componentKey = resolveComponentKeyFromToken(normalized);
    if (!componentKey) {
        return null;
    }
    try {
        return await createFigmaComponentInstanceFromRef({
            componentKey,
            fallbackName: resolveComponentDisplayNameFromToken(normalized)
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
    const componentKey = resolveComponentKeyFromToken(normalized);
    if (!componentKey) {
        return null;
    }
    if (FAST_FAIL_COMPONENT_TOKENS.has(normalized)) {
        const localComponent = figma.root.findOne(
            (node) => isComponentOrSetNode(node) && node.key === componentKey
        ) as ComponentNode | ComponentSetNode | null;
        if (localComponent) {
            const sourceNode = localComponent.type === 'COMPONENT_SET'
                ? (localComponent.defaultVariant || localComponent.children[0])
                : localComponent;
            if (sourceNode && sourceNode.type === 'COMPONENT') {
                const instance = sourceNode.createInstance();
                return instance;
            }
        }
        return null;
    }
    const cachedFailureAt = FIGMA_COMPONENT_INSTANCE_FAILURE_CACHE.get(componentKey);
    if (cachedFailureAt && Date.now() - cachedFailureAt < FIGMA_COMPONENT_INSTANCE_FAILURE_TTL) {
        return null;
    }

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
        const instance = await createFigmaComponentInstanceFromRef({
            componentKey,
            componentToken: normalized,
            fallbackName: resolveComponentDisplayNameFromToken(normalized),
            variantCriteria: options?.variantCriteria,
            visible: options?.visible
        });
        if (instance) {
            FIGMA_COMPONENT_INSTANCE_FAILURE_CACHE.delete(componentKey);
        }
        if (cacheKey && instance) {
            try {
                const template = instance.clone();
                registerTemplateNode(cacheKey, 'component-instance', template);
                FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE.set(cacheKey, template);
            } catch (e) {
                console.warn('[FigmaComponent] failed to cache instance', e);
            }
        }
        return instance;
    } catch (e) {
        FIGMA_COMPONENT_INSTANCE_FAILURE_CACHE.set(componentKey, Date.now());
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

type AvatarContainerNode = SceneNode & {
    width: number;
    height: number;
    resize: (width: number, height: number) => void;
    findAll: (callback: (node: SceneNode) => boolean) => SceneNode[];
};

const CHINESE_SURNAME_INITIAL_MAP: Record<string, string> = {
    '赵': 'Z', '钱': 'Q', '孙': 'S', '李': 'L', '周': 'Z', '吴': 'W', '郑': 'Z', '王': 'W',
    '冯': 'F', '陈': 'C', '褚': 'C', '卫': 'W', '蒋': 'J', '沈': 'S', '韩': 'H', '杨': 'Y',
    '朱': 'Z', '秦': 'Q', '尤': 'Y', '许': 'X', '何': 'H', '吕': 'L', '施': 'S', '张': 'Z',
    '孔': 'K', '曹': 'C', '严': 'Y', '华': 'H', '金': 'J', '魏': 'W', '陶': 'T', '姜': 'J',
    '戚': 'Q', '谢': 'X', '邹': 'Z', '喻': 'Y', '柏': 'B', '水': 'S', '窦': 'D', '章': 'Z',
    '云': 'Y', '苏': 'S', '潘': 'P', '葛': 'G', '奚': 'X', '范': 'F', '彭': 'P', '郎': 'L',
    '鲁': 'L', '韦': 'W', '昌': 'C', '马': 'M', '苗': 'M', '凤': 'F', '花': 'H', '方': 'F',
    '俞': 'Y', '任': 'R', '袁': 'Y', '柳': 'L', '唐': 'T', '罗': 'L', '薛': 'X', '伍': 'W',
    '余': 'Y', '米': 'M', '贝': 'B', '姚': 'Y', '孟': 'M', '顾': 'G', '尹': 'Y', '江': 'J',
    '钟': 'Z', '徐': 'X', '邱': 'Q', '骆': 'L', '高': 'G', '夏': 'X', '蔡': 'C', '田': 'T',
    '樊': 'F', '胡': 'H', '凌': 'L', '霍': 'H', '虞': 'Y', '万': 'W', '支': 'Z', '柯': 'K',
    '昝': 'Z', '管': 'G', '卢': 'L', '莫': 'M', '经': 'J', '房': 'F', '裘': 'Q', '缪': 'M',
    '干': 'G', '解': 'X', '应': 'Y', '宗': 'Z', '宣': 'X', '丁': 'D', '贲': 'B', '邓': 'D',
    '郁': 'Y', '单': 'S', '杭': 'H', '洪': 'H', '包': 'B', '诸': 'Z', '左': 'Z', '石': 'S',
    '崔': 'C', '吉': 'J', '龚': 'G', '程': 'C', '邢': 'X', '裴': 'P', '陆': 'L', '荣': 'R',
    '翁': 'W', '荀': 'X', '羊': 'Y', '于': 'Y', '惠': 'H', '甄': 'Z', '曲': 'Q', '家': 'J',
    '封': 'F', '芮': 'R', '羿': 'Y', '储': 'C', '靳': 'J', '汲': 'J', '邴': 'B', '糜': 'M',
    '松': 'S', '井': 'J', '段': 'D', '富': 'F', '巫': 'W', '乌': 'W', '焦': 'J', '巴': 'B',
    '弓': 'G', '牧': 'M', '隗': 'K', '山': 'S', '谷': 'G', '车': 'C', '侯': 'H', '宓': 'M',
    '蓬': 'P', '全': 'Q', '郗': 'X', '班': 'B', '仰': 'Y', '秋': 'Q', '仲': 'Z', '伊': 'Y',
    '宫': 'G', '宁': 'N', '仇': 'Q', '栾': 'L', '暴': 'B', '甘': 'G', '钭': 'T', '厉': 'L',
    '戎': 'R', '祖': 'Z', '武': 'W', '符': 'F', '刘': 'L', '邵': 'S', '湛': 'Z', '汪': 'W',
    '雷': 'L', '戴': 'D', '傅': 'F', '宋': 'S', '齐': 'Q', '康': 'K', '黎': 'L',
    '熊': 'X', '邰': 'T', '尧': 'Y', '覃': 'Q', '谭': 'T', '廖': 'L', '曾': 'Z'
};

function resolveAvatarInitialFromName(value: unknown): string {
    const raw = String(value ?? '').trim();
    if (!raw) return 'U';
    const first = Array.from(raw)[0] || 'U';
    if (/[a-z]/i.test(first)) return first.toUpperCase();
    if (/[\u3400-\u9fff]/.test(first)) return CHINESE_SURNAME_INITIAL_MAP[first] || 'U';
    return 'U';
}

async function createCenteredAvatarFallback(initial: string, size = 20): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.layoutMode = 'NONE';
    frame.resize(size, size);
    frame.cornerRadius = size / 2;
    frame.clipsContent = true;
    frame.fills = [{ type: 'SOLID', color: { r: 0.992, g: 0.922, b: 0.922 } }];

    const textNode = figma.createText();
    try {
        textNode.setPluginData('avatar-initial', 'true');
    } catch {
        // ignore
    }
    await ensureInterFontsLoaded();
    await applyTextStyleBinding(textNode, 'table-cell-text-style-key', { family: 'Inter', style: 'Bold', size: 14 });
    textNode.characters = initial;
    await applyColorVariable(textNode, 'text-danger-key', '#B91C1C');
    try {
        textNode.textAutoResize = 'NONE';
    } catch {
        // ignore
    }
    try {
        textNode.resize(size, size);
    } catch {
        // ignore
    }
    try {
        textNode.textAlignHorizontal = 'CENTER';
        textNode.textAlignVertical = 'CENTER';
    } catch {
        // ignore
    }
    textNode.x = 0;
    textNode.y = 0;
    frame.appendChild(textNode);
    return frame;
}

async function tryCenterAvatarIconText(container: AvatarContainerNode, initial: string): Promise<void> {
    const width = container.width;
    const height = container.height;
    const textNodes = container.findAll((node) => node.type === 'TEXT') as TextNode[];
    let fallbackFill: SolidPaint | null = null;
    for (const textNode of textNodes) {
        const raw = String(textNode.characters || '').trim();
        if (raw.length === 0 || raw.length > 2) continue;
        if (!fallbackFill && Array.isArray(textNode.fills) && textNode.fills.length > 0) {
            const candidate = textNode.fills[0];
            if (candidate && candidate.type === 'SOLID') fallbackFill = candidate as SolidPaint;
        }
        try {
            textNode.opacity = 0;
        } catch {
            // ignore
        }
    }

    const ellipseCandidates = container.findAll((node) => node.type === 'ELLIPSE') as EllipseNode[];
    const circle = ellipseCandidates
        .filter((node) => Math.abs(node.width - node.height) <= 1)
        .sort((a, b) => b.width - a.width)[0];

    const resolveOverlayHost = (): { host: AvatarContainerNode; bounds: { x: number; y: number; width: number; height: number } } => {
        if (circle && circle.parent && 'appendChild' in circle.parent) {
            const parent = circle.parent as unknown as AvatarContainerNode;
            return { host: parent, bounds: { x: circle.x, y: circle.y, width: circle.width, height: circle.height } };
        }
        if (circle && 'absoluteBoundingBox' in circle && 'absoluteBoundingBox' in container) {
            const circleBox = (circle as any).absoluteBoundingBox as { x: number; y: number; width: number; height: number } | null;
            const containerBox = (container as any).absoluteBoundingBox as { x: number; y: number; width: number; height: number } | null;
            if (circleBox && containerBox) {
                return {
                    host: container,
                    bounds: {
                        x: circleBox.x - containerBox.x,
                        y: circleBox.y - containerBox.y,
                        width: circleBox.width,
                        height: circleBox.height
                    }
                };
            }
        }
        return { host: container, bounds: { x: 0, y: 0, width, height } };
    };

    const { host, bounds } = resolveOverlayHost();

    const overlayFrame = figma.createFrame();
    overlayFrame.layoutMode = 'NONE';
    overlayFrame.fills = [];
    overlayFrame.strokes = [];
    overlayFrame.resize(bounds.width, bounds.height);
    overlayFrame.x = bounds.x;
    overlayFrame.y = bounds.y;
    overlayFrame.name = 'avatar-text-overlay';
    if ('layoutPositioning' in overlayFrame) {
        try {
            overlayFrame.layoutPositioning = 'ABSOLUTE';
        } catch {
            // ignore
        }
    }

    const overlayText = figma.createText();
    await ensureInterFontsLoaded();
    await applyTextStyleBinding(overlayText, 'table-cell-text-style-key', { family: 'Inter', style: 'Bold', size: 14 });
    overlayText.characters = initial;
    try {
        overlayText.textAutoResize = 'NONE';
    } catch {
        // ignore
    }
    try {
        overlayText.resize(bounds.width, bounds.height);
    } catch {
        // ignore
    }
    try {
        overlayText.textAlignHorizontal = 'CENTER';
        overlayText.textAlignVertical = 'CENTER';
    } catch {
        // ignore
    }
    overlayText.x = 0;
    overlayText.y = 0;
    try {
        overlayText.fills = fallbackFill ? [fallbackFill] : [{ type: 'SOLID', color: { r: 0.725, g: 0.11, b: 0.11 } }];
    } catch {
        // ignore
    }
    overlayFrame.appendChild(overlayText);
    try {
        (host as unknown as FrameNode).appendChild(overlayFrame);
    } catch {
        (container as unknown as FrameNode).appendChild(overlayFrame);
    }
}

// Helper to parse color
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
  const params = syncComponentParamsFromNode(componentId, readNodeParams(node), node);
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

function collectTextNodes(root: SceneNode, options: { skipInstances?: boolean } = { skipInstances: false }): TextNode[] {
  const results: TextNode[] = [];
  const stack: SceneNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;
    if (node.type === 'TEXT') {
      results.push(node);
    }
    if ('children' in node) {
      if (node === root || !options.skipInstances || node.type !== 'INSTANCE') {
        for (const child of node.children) {
          stack.push(child);
        }
      }
    }
  }
  return results;
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

function isMultiElementCell(cell: SceneNode, textNodeCount: number): boolean {
  if (textNodeCount <= 0) return false;
  if (textNodeCount > 1) return true;
  return countLeafNodes(cell, 2) >= 2;
}

function applyCellAutoWidth(cell: SceneNode) {
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

function applyCellAutoWidthIfMultiElement(cell: SceneNode) {
  const textNodes = collectTextNodes(cell);
  if (!isMultiElementCell(cell, textNodes.length)) return;
  applyCellAutoWidth(cell);
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

function applyCellTextDisplay(cell: SceneNode, mode: 'ellipsis' | 'lineBreak') {
  const componentId = 'getPluginData' in cell ? cell.getPluginData('component-id') : '';
  const isMixedContentCell =
    componentId === 'table-cell-tag' ||
    componentId === 'table-cell-avatar' ||
    componentId === 'table-cell-input' ||
    componentId === 'table-cell-select' ||
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
    if (layoutMode === 'lineBreak') {
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
    if (isTableTextContext(node) || isTableTextContext(target)) {
      const cell = findTableCellFromNode(node) || findTableCellFromNode(target);
      const cellComponentId = cell ? cell.getPluginData('component-id') : '';
      if (cellComponentId === 'table-header-cell') {
        target.textAutoResize = 'WIDTH_AND_HEIGHT';
      } else {
        const cellParams = cell ? readNodeParams(cell) : {};
        const displayMode = String(cellParams.textDisplay || '').trim();
        if (displayMode === 'lineBreak') {
          target.textAutoResize = 'WIDTH_AND_HEIGHT';
        } else if (displayMode === 'ellipsis') {
          target.textAutoResize = 'NONE';
        }
      }
    }
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

async function createMissingFigmaComponentFrame(
    tokenOrName: string,
    width?: number,
    height?: number
): Promise<FrameNode> {
    const label = String(tokenOrName || 'Unknown Component').trim() || 'Unknown Component';
    const errorFrame = figma.createFrame();
    errorFrame.name = `MISSING: ${label}`;
    errorFrame.layoutMode = 'HORIZONTAL';
    errorFrame.primaryAxisAlignItems = 'CENTER';
    errorFrame.counterAxisAlignItems = 'CENTER';
    const frameWidth = Number.isFinite(width) && Number(width) > 0 ? Number(width) : 100;
    const frameHeight = Number.isFinite(height) && Number(height) > 0 ? Number(height) : 32;
    errorFrame.resize(frameWidth, frameHeight);
    errorFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 0.95, b: 0.95 } }];
    errorFrame.strokes = [{ type: 'SOLID', color: { r: 1, g: 0.5, b: 0.5 } }];
    errorFrame.strokeWeight = 1;

    const errorText = figma.createText();
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
    errorText.characters = `? ${label.split('.').pop() || 'Missing'}`;
    errorText.fontSize = 10;
    errorText.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.2, b: 0.2 } }];
    errorFrame.appendChild(errorText);

    return errorFrame;
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
    // Early viewport movement for root component
    if (isRoot) {
      // Create a temp node just to calculate position if needed, 
      // or we can't really do it until we have the instance.
      // But importedInstance is created below.
      // We can't easily move viewport before creation for figma-component because size is unknown until import.
      // But we can do it immediately after creation below.
    }

    const componentToken = typeof params.componentToken === 'string' ? params.componentToken.trim() : '';
    node = await renderFigmaComponentInstance(params, {
      onApplyProps: (importedInstance, nextParams) => {
        if (nextParams.forceFigmaKey && componentToken) {
          const resolvedComponentId = resolveComponentIdFromToken(componentToken);
          if (resolvedComponentId) {
            applyFigmaComponentProps(importedInstance, resolvedComponentId, nextParams);
          }
        }
      }
    });
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
    const rowSpacing = Number(params.rowSpacing) > 0 ? Number(params.rowSpacing) : (normalizeFormAlign(params.align) === 'top' ? 24 : 12);
    frame.itemSpacing = rowSpacing;
    frame.fills = [];
    frame.clipsContent = false;
    const columnSpacing = toPositiveNumber(params.columnSpacing);
    const resolvedFormParams = await resolveFormParamsForRender(params, instance);
    const computedWidth = toPositiveNumber(params.width);

    if (params.title) {
        const titleNode = figma.createText();
        await applyTextStyleBinding(titleNode, 'card-title-text-style-key', { family: 'Inter', style: 'Bold', size: 16 });
        titleNode.characters = String(params.title);
        await applyColorVariable(titleNode, 'card-title', '#0C0D0E');
        frame.appendChild(titleNode);
    }

    const shouldStretchChildren = computedWidth !== null;
    const showActionArea = params.showActionArea !== false;
    const isButtonRow = (child: any) => child.componentId === 'form-row'
        && Array.isArray(child.children)
        && child.children.length > 0
        && child.children.every((item: any) => item.componentId === 'button');
    const isActionAreaChild = (child: any) => child.componentId === 'button'
        || isButtonRow(child)
        || (
            child.componentId === 'layout'
            && Array.isArray(child.children)
            && child.children.length > 0
            && child.children.every((item: any) => item.componentId === 'button' || isButtonRow(item))
        );
    const hasActionAreaChild = Array.isArray(instance.children) && instance.children.some(isActionAreaChild);
    if (instance.children) {
        for (const child of instance.children) {
            if (!showActionArea && isActionAreaChild(child)) {
                continue;
            }
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
            const childNode = await renderComponent(inheritFormFieldParams(resolvedFormParams, processedChild), { isRoot: false });
            if ((childNode.type === 'FRAME' || childNode.type === 'INSTANCE') && shouldStretchChildren) {
                childNode.layoutAlign = 'STRETCH';
            }
            frame.appendChild(childNode);
        }
    }
    if (showActionArea && !hasActionAreaChild) {
        const actionPaddingTop = Math.max(32 - rowSpacing, 0);
        const actionRowInstance = {
            id: `form-action-${Date.now()}`,
            componentId: 'form-row',
            params: { spacing: 8, align: 'end' },
            children: [
                {
                    id: `form-action-primary-${Date.now()}`,
                    componentId: 'button',
                    params: { label: '确认', variant: 'primary' }
                },
                {
                    id: `form-action-secondary-${Date.now()}`,
                    componentId: 'button',
                    params: { label: '取消', variant: 'secondary' }
                }
            ]
        };
        const actionLayoutInstance = {
            id: `form-action-layout-${Date.now()}`,
            componentId: 'layout',
            params: { direction: 'vertical', paddingTop: actionPaddingTop },
            children: [inheritFormFieldParams(resolvedFormParams, actionRowInstance)]
        };
        const actionNode = await renderComponent(actionLayoutInstance, { isRoot: false });
        if ((actionNode.type === 'FRAME' || actionNode.type === 'INSTANCE') && shouldStretchChildren) {
            actionNode.layoutAlign = 'STRETCH';
        }
        frame.appendChild(actionNode);
    }
    if (computedWidth !== null) {
        setFixedWidth(frame, computedWidth);
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

    const rowControlWidthMode = normalizeFormControlWidthMode(params.controlWidthMode);
    if (instance.children) {
        for (const child of instance.children) {
            const childNode = await renderComponent(inheritRowFormFieldParams(params, child), { isRoot: false });
            // fill 模式下：form-field 子节点等分 form-row 宽度
            if (rowControlWidthMode === 'fill' && child.componentId === 'form-field' && (childNode.type === 'FRAME' || childNode.type === 'INSTANCE')) {
                childNode.layoutGrow = 1;
            }
            frame.appendChild(childNode);
        }
    }
    if (Number.isFinite(width) && width > 0) {
        setFixedWidth(frame, width);
    }
    node = frame;
  }
  // --- FORM FIELD ---
  else if (instance.componentId === 'form-field') {
    const layout = resolveFormFieldLayout(params);
    const labelAlign = String(params.labelAlign || '').trim().toLowerCase() === 'right' ? 'right' : 'left';
    const controlType = normalizeFormFieldControlType(params.controlType);
    const isTextarea = controlType === 'textarea';

    const descriptionText = params.showDescriptionText ? String(params.descriptionText || '描述文字') : '';
    const messageText = String(params.errorText || descriptionText || params.helpText || '').trim();
    const hasMessageText = messageText.length > 0;
    const shouldTopAlign = isTextarea || hasMessageText;

    const frame = figma.createFrame();
    frame.layoutMode = layout === 'vertical' ? 'VERTICAL' : 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.counterAxisAlignItems = layout === 'vertical' ? 'MIN' : (shouldTopAlign ? 'MIN' : 'CENTER');
    const explicitSpacing = Number(params.labelControlSpacing);
    const resolvedSpacing =
        Number.isFinite(explicitSpacing) && explicitSpacing > 0 ? explicitSpacing : (layout === 'vertical' ? 8 : 20);
    frame.itemSpacing = resolvedSpacing;
    frame.fills = [];
    frame.clipsContent = false;

    const label = String(params.label || '').trim();
    if (label) {
        const labelWrap = figma.createFrame();
        labelWrap.layoutMode = 'HORIZONTAL';
        labelWrap.primaryAxisSizingMode = 'AUTO';
        labelWrap.counterAxisSizingMode = 'AUTO';
        labelWrap.counterAxisAlignItems = 'CENTER';
        labelWrap.primaryAxisAlignItems = layout === 'vertical' ? 'MIN' : (labelAlign === 'right' ? 'MAX' : 'MIN');
        labelWrap.itemSpacing = 4;
        labelWrap.fills = [];
        labelWrap.clipsContent = false;
        if (layout !== 'vertical' && shouldTopAlign) {
            labelWrap.paddingTop = isTextarea ? 3 : 5;
        }

        if (params.required) {
            const requiredIconDef = COMPONENT_DEFS['icon-asterisk'];
            const requiredToken = String(requiredIconDef?.figmaPropertySnapshot?.token || '').trim();
            const requiredIcon = requiredToken
                ? await createFigmaComponentInstanceByToken(requiredToken)
                : null;
            labelWrap.appendChild(requiredIcon || await createMissingFigmaComponentFrame('icon-asterisk'));
        }

        const labelNode = figma.createText();
        await applyTextStyleBinding(labelNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
        labelNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        labelNode.characters = `${label}${params.showColon === false ? '' : '：'}`;
        await applyColorVariable(labelNode, 'form-label-text', '#42464E');
        labelWrap.appendChild(labelNode);
        if (params.showHelpIcon) {
            const helpIconStart = Date.now();
            const helpIconDef = COMPONENT_DEFS['icon-info'];
            const helpToken = String(helpIconDef?.figmaPropertySnapshot?.token || '').trim();
            const helpKey = helpToken ? resolveComponentKeyFromToken(helpToken) : '';
            try {
                const helpIcon = helpToken ? await createFigmaComponentInstanceByToken(helpToken) : null;
                const resolvedHelpIcon = helpIcon || await createMissingFigmaComponentFrame('icon-info');
                if ('resize' in resolvedHelpIcon) {
                    resolvedHelpIcon.resize(14, 14);
                }
                if (helpIcon) {
                    const vectorNodes = helpIcon.findAll((node) => 
                        node.name === '形状' || 
                        node.type === 'VECTOR' || 
                        node.type === 'BOOLEAN_OPERATION' || 
                        node.type === 'STAR' || 
                        node.type === 'LINE' || 
                        node.type === 'ELLIPSE' || 
                        node.type === 'POLYGON'
                    );
                    for (const node of vectorNodes) {
                        await applyColorVariable(node, 'form-help-text', '#737A87');
                    }
                }
                labelWrap.appendChild(resolvedHelpIcon);
            } catch {
                const helpIcon = await createMissingFigmaComponentFrame('icon-info');
                if ('resize' in helpIcon) {
                    helpIcon.resize(14, 14);
                }
                labelWrap.appendChild(helpIcon);
            }
        }
        const labelWidth = resolveFormLabelWidth(params);
        console.log('[DEBUG form-field-render] label:', params.label, 'params.labelWidth:', params.labelWidth, 'resolvedLabelWidth:', labelWidth, 'layout:', layout);
        if (layout !== 'vertical' && Number.isFinite(labelWidth) && labelWidth > 0) {
            labelWrap.primaryAxisSizingMode = 'FIXED';
            // Use the provided labelWidth directly to ensure alignment. 
            // The resolveAutoFormLabelWidth function is responsible for ensuring this width is sufficient.
            labelWrap.resize(labelWidth, labelWrap.height);
            labelWrap.setPluginData('form-label-wrap', 'true');
            labelWrap.setPluginData('form-label-min-width', String(labelWidth));
            labelWrap.setPluginData('form-label-auto-resize', 'true');
        }
        frame.appendChild(labelWrap);
    }

    const controlWidthMode = resolveFormControlWidthMode(params);
    
    // 直接渲染控件节点，不再包裹 controlColumn
    // FIX: Always use createControlInstanceFromFormFieldParams(params) to ensure
    // child control gets the LATEST params from the parent form-field.
    // Previously, when instance.children[0] existed (preserved from snapshot),
    // the child retained stale params (old placeholder/value/filled), causing
    // text edits and toggle changes in the property panel to not propagate.
    const controlInstanceToRender = createControlInstanceFromFormFieldParams(params);
    const controlNode = await renderComponent(controlInstanceToRender, { isRoot: false });
    
    // 对于多选/自适应高度的组件，不要强制固定高度
    // 这里如果强制重置高度，会导致多行组件（如多选 select、checkbox-group 等）被强行截断为 32px
    const controlDef = COMPONENT_DEFS[controlType];
    const defaultHeight = controlDef?.runtime?.fallback?.height ?? null;
    const recordedHeight = 'height' in controlNode ? controlNode.height : 0;
    const targetHeight = recordedHeight > 1 ? recordedHeight : ((defaultHeight && defaultHeight > 1) ? defaultHeight : 32);

    frame.appendChild(controlNode);

    if (hasMessageText) {
        // 如果有错误信息，包裹在一个单独的垂直容器中以保持流向
        const wrap = figma.createFrame();
        wrap.layoutMode = 'VERTICAL';
        wrap.primaryAxisSizingMode = 'AUTO';
        wrap.counterAxisSizingMode = 'AUTO';
        wrap.fills = [];
        wrap.clipsContent = false;
        wrap.itemSpacing = 4;
        
        if (controlWidthMode === 'fill') {
            if (layout !== 'vertical') {
                wrap.layoutGrow = 1;
            } else {
                wrap.layoutAlign = 'STRETCH';
            }
        }
        
        // 把控件移到包裹里
        wrap.appendChild(controlNode);
        
        const helpNode = figma.createText();
        const isErrorText = String(params.errorText || '').trim().length > 0;
        const isDescriptionText = !isErrorText && descriptionText.trim().length > 0;
        if (isDescriptionText) {
            await applyTextStyleBinding(helpNode, 'form-description-text-style-key', { family: 'Inter', style: 'Regular', size: 14 });
        } else {
            await applyTextStyleBinding(helpNode, 'text-style-key', { family: 'Inter', style: 'Regular', size: 12 });
        }
        helpNode.characters = messageText;
        if (isErrorText) {
            helpNode.fills = [{ type: 'SOLID', color: parseColor('#F5222D') }];
        } else if (isDescriptionText) {
            await applyColorVariable(helpNode, 'form-help-text', '#737A87');
        } else {
            await applyColorVariable(helpNode, 'form-help-text', '#737A87');
        }
        wrap.appendChild(helpNode);
        frame.appendChild(wrap);
    }

    if (INPUT_LIKE_CONTROL_TYPES.has(controlType)) {
        applyFormControlWidthModeToNode(controlNode, params);
    }

    // 只在确实需要调整高度时才去调整（例如兜底节点）
    // 不要强制将 layoutSizingVertical 设为 FIXED，否则会破坏 textarea、多选组件、checkbox-group 等的自适应高度
    if ('resize' in controlNode && recordedHeight <= 1) {
        try {
            (controlNode as any).resize(controlNode.width, targetHeight);
        } catch {}
    }

    node = frame;
  }
  // --- TABLE ---
  else if (instance.componentId === 'table') {
      const frame = figma.createFrame();
      frame.fills = [];
      clearNodeStrokes(frame);

      // Early viewport movement for better UX
      if (options?.isRoot) {
          const { x, y, width, height } = figma.viewport.bounds;
          frame.x = x + width / 2 - (params.width || 1176) / 2;
          frame.y = y + height / 2 - 200; // Offset slightly up
          figma.currentPage.appendChild(frame);
          figma.viewport.scrollAndZoomIntoView([frame]);
      }

      lockGeneratedContainerNode(frame, 'table');

      frame.layoutMode = 'HORIZONTAL';
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'AUTO';
      frame.layoutAlign = 'STRETCH';
      const headerHeight = resolveTableHeaderHeight(params);
      const bodyHeight = resolveTableBodyHeight(params);
      const wantsPagination = params.hasPagination === true;
      const wantsFilter = params.hasFilter === true;
      const wantsTabs = params.hasTabs === true;
      const wantsButtonGroup = params.hasButtonGroup === true;
      frame.resize(params.width || 1176, 100);
      frame.cornerRadius = params.cornerRadius || 0;
      frame.clipsContent = true;
      frame.name = 'Table Content';
      frame.setPluginData('table-role', 'table-content');
      const tableColumnInstances: ComponentInstance[] =
          instance.children && instance.children.length > 0
              ? instance.children
              : Array.from({ length: params.columnCount || 3 }).map((_, i) => ({
                    id: `col-${i}`,
                    componentId: 'table-column',
                    params: {
                        headerText: `Header ${i + 1}`,
                        rowCount: params.rowCount || 10,
                        width: 150
                    }
                }));

      const columnDef = COMPONENT_DEFS['table-column'];
      const columnData = tableColumnInstances.map((colInstance) => {
          const mergedParams: Record<string, any> = {
              ...getDefaultParams('table-column'),
              ...(colInstance.params || {}),
              headerHeight: toPositiveNumber(colInstance.params?.headerHeight) ?? headerHeight,
              bodyHeight: toPositiveNumber(colInstance.params?.bodyHeight) ?? bodyHeight
          };
          const columnWidth = toPositiveNumber(mergedParams.width) ?? 150;
          const frameNode = figma.createFrame();
          frameNode.layoutMode = 'VERTICAL';
          frameNode.primaryAxisSizingMode = 'AUTO';
          frameNode.counterAxisSizingMode = 'FIXED';
          frameNode.layoutGrow = 1;
          frameNode.resize(columnWidth, 100);
          frameNode.fills = [];
          frameNode.clipsContent = false;
          if (columnDef) {
              frameNode.name = columnDef.name;
          }
          frameNode.setPluginData('is-ai-component', 'true');
          frameNode.setPluginData('component-id', 'table-column');
          frameNode.setPluginData('params', JSON.stringify(mergedParams));
          const normalizedInstance: ComponentInstance = {
              ...colInstance,
              componentId: 'table-column',
              params: mergedParams
          };
          if (shouldStoreComponentInstance(normalizedInstance)) {
              writeComponentInstanceSnapshot(frameNode, normalizedInstance);
          }
          frame.appendChild(frameNode);
          return {
              frameNode,
              mergedParams,
              columnWidth,
              autoHeightMode:
                  mergedParams.textDisplay === 'lineBreak' ||
                  mergedParams.height === 0 ||
                  mergedParams.height === 'auto' ||
                  mergedParams.height === 'AUTO' ||
                  mergedParams.rowHeight === 0 ||
                  mergedParams.rowHeight === 'auto' ||
                  mergedParams.rowHeight === 'AUTO' ||
                  mergedParams.headerHeight === 0 ||
                  mergedParams.headerHeight === 'auto' ||
                  mergedParams.headerHeight === 'AUTO' ||
                  mergedParams.bodyHeight === 0 ||
                  mergedParams.bodyHeight === 'auto' ||
                  mergedParams.bodyHeight === 'AUTO',
              widthMode:
                  typeof mergedParams.columnWidthMode === 'string'
                      ? mergedParams.columnWidthMode
                      : 'FILL',
              headerChild:
                  Array.isArray(colInstance.children)
                      ? colInstance.children.find((child) => child.componentId === 'table-header-cell')
                      : undefined,
              bodyChildren:
                  Array.isArray(colInstance.children)
                      ? colInstance.children.filter((child) => child.componentId !== 'table-header-cell')
                      : []
          };
      });

      for (const col of columnData) {
        const headerChild = col.headerChild;
          const headerWidthParam = (headerChild?.params as any)?.width;
          const headerExplicitHugWidth = headerWidthParam === 0 || headerWidthParam === '0';
          const headerNode = await renderComponent(
              headerChild
                  ? {
                        ...headerChild,
                        params: {
                            ...(headerChild.params || {}),
                            width: headerExplicitHugWidth ? 0 : (toPositiveNumber(headerWidthParam) ?? col.columnWidth),
                            height: col.autoHeightMode ? 0 : (toPositiveNumber(headerChild.params?.height) ?? headerHeight),
                            paddingTop: headerChild.params?.paddingTop ?? 0,
                            paddingBottom: headerChild.params?.paddingBottom ?? 0
                        }
                    }
                  : {
                        id: 'header',
                        componentId: 'table-header-cell',
                        params: {
                            text: col.mergedParams.headerText || 'Header',
                            width: col.columnWidth,
                            height: col.autoHeightMode ? 0 : headerHeight
                        }
                    },
              { isRoot: false }
          );
          col.frameNode.appendChild(headerNode);
        await applyTableHeaderElementToHeaderCell(headerNode, col.mergedParams.headerType);
      }

      const maxRowCount = columnData.reduce((count, col) => {
          const columnRowCount =
              col.bodyChildren.length > 0 ? col.bodyChildren.length : (col.mergedParams.rowCount || 10);
          return Math.max(count, columnRowCount);
      }, 0);

      for (let rowIndex = 0; rowIndex < maxRowCount; rowIndex++) {
          for (const col of columnData) {
              const hasCustomRows = col.bodyChildren.length > 0;
              const bodyChild = col.bodyChildren[rowIndex];
              if (hasCustomRows && !bodyChild) {
                  continue;
              }
              const widthParam = (bodyChild?.params as any)?.width;
              const explicitHugWidth = widthParam === 0 || widthParam === '0';
              const cellNode = await renderComponent(
                  bodyChild
                      ? {
                            ...bodyChild,
                            params: {
                                ...(bodyChild.params || {}),
                                width: explicitHugWidth ? 0 : (toPositiveNumber(widthParam) ?? col.columnWidth),
                                height: col.autoHeightMode ? 0 : (toPositiveNumber(bodyChild.params?.height) ?? bodyHeight),
                                paddingTop: bodyChild.params?.paddingTop ?? 0,
                                paddingBottom: bodyChild.params?.paddingBottom ?? 0
                            }
                        }
                      : {
                            id: `cell-${rowIndex}`,
                            componentId: 'table-cell',
                            params: {
                                text: `Cell ${rowIndex + 1}`,
                                width: col.columnWidth,
                                height: col.autoHeightMode ? 0 : bodyHeight
                            }
                        },
                  { isRoot: false }
              );
              col.frameNode.appendChild(cellNode);
        }
    }

      for (const col of columnData) {
          applyColumnWidthMode(
              col.frameNode,
              col.widthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL',
              col.columnWidth
          );
      }
      alignAllTableRows(frame);
      if (params.rowAction) {
          await applyRowActionColumn(frame, String(params.rowAction));
      }
      if (wantsPagination || wantsFilter || wantsTabs || wantsButtonGroup) {
          const wrapper = createTableWrapperFromTableFrame(frame, params) || frame.parent as FrameNode;
          ensureTableContentStack(wrapper, frame);

          if (wantsFilter || wantsTabs || wantsButtonGroup) {
              await ensureTableToolbar(wrapper, wrapper.width, {
                  hasFilter: wantsFilter,
                  hasTabs: wantsTabs,
                  hasButtonGroup: wantsButtonGroup,
                  filterTexts: params.filterTexts,
                  primaryButtonText: params.primaryButtonText,
                  secondaryButtonText: params.secondaryButtonText
              });
          } else {
              removeTableToolbarFromParent(wrapper);
          }

          if (wantsPagination) {
              await ensurePaginationRow(wrapper, wrapper.width);
          } else {
              removePaginationRow(wrapper);
          }
          node = wrapper;
      } else {
          // Cleanup if needed (remove wrapper/pagination/filter if they exist but are disabled)
          if (frame.parent && frame.parent.type === 'FRAME') {
              removeTableToolbarFromParent(frame.parent as FrameNode);
              removePaginationRow(frame.parent as FrameNode);
          }
          node = frame;
      }
      const borderWidth = Number(params.borderWidth ?? 0);
      if (Number.isFinite(borderWidth) && borderWidth > 0) {
          await applyStrokeColorVariable(frame, 'table-border-key', params.borderColor || '#EAEDF1');
          frame.strokeWeight = borderWidth;
      } else {
          clearNodeStrokes(frame);
      }
      if (node !== frame) {
          clearNodeStrokes(node as FrameNode);
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
           instance.componentId === 'table-cell-select' ||
           instance.componentId === 'table-cell-action-text' ||
           instance.componentId === 'table-cell-action-icon') {
    const isHeader = instance.componentId === 'table-header-cell';
    const cellHeight = isHeader ? resolveTableHeaderHeight(params) : resolveTableBodyHeight(params);
    const autoHeightMode =
      (!isHeader && params.textDisplay === 'lineBreak') ||
      params.height === 0 ||
      params.height === 'auto' ||
      params.height === 'AUTO' ||
      params.rowHeight === 0 ||
      params.rowHeight === 'auto' ||
      params.rowHeight === 'AUTO' ||
      (!isHeader && (params.headerHeight === 0 ||
      params.headerHeight === 'auto' ||
      params.headerHeight === 'AUTO')) ||
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
        const displayText = params.text || params.name || params.label || 'User';
        const initial = resolveAvatarInitialFromName(displayText);
        let avatarInstance: SceneNode | null = null;
        try {
            avatarInstance = await renderFigmaComponentInstance({
                componentToken: 'lib-data-display-avataricon',
                variantCriteria: { 'Size 尺寸': 'Default 20' }
            });
        } catch (e) {
            console.warn('[AvatarCell] render figma component failed', e);
        }

        if (avatarInstance) {
            frame.appendChild(avatarInstance);
        } else {
            frame.appendChild(await createCenteredAvatarFallback(initial, 20));
        }

        const textNode = figma.createText();
        await applyTextStyleBinding(textNode, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
        textNode.characters = displayText;
        await applyColorVariable(textNode, "table-cell-text-key", "#0C0D0E");
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
    else if (instance.componentId === 'table-cell-select') {
        const displayText = params.text || params.value || params.placeholder || '请选择';
        const selectInstance = await createFigmaComponentInstanceByToken('table-cell-select', {
            variantCriteria: { 'Size 尺寸': 'Mini 24' }
        });
        if (selectInstance) {
            selectInstance.layoutGrow = 1;
            const sizePropName = findInstanceComponentPropertyName(selectInstance, 'Size 尺寸');
            if (sizePropName) {
                selectInstance.setProperties({ [sizePropName]: 'Mini 24' });
            }
            await trySetFirstTextInInstance(selectInstance, displayText);
            frame.appendChild(selectInstance);
        } else {
            const selectFrame = figma.createFrame();
            selectFrame.layoutMode = 'HORIZONTAL';
            selectFrame.primaryAxisSizingMode = 'FIXED';
            selectFrame.counterAxisSizingMode = 'AUTO';
            selectFrame.layoutGrow = 1;
            selectFrame.resize(100, 24);
            selectFrame.paddingLeft = 8;
            selectFrame.paddingRight = 8;
            selectFrame.cornerRadius = 4;
            await applyStrokeColorVariable(selectFrame, 'table-border-key', '#EAEDF1');
            selectFrame.strokeWeight = 1;
            selectFrame.counterAxisAlignItems = 'CENTER';

            const selectText = figma.createText();
            await applyTextStyleBinding(selectText, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            selectText.characters = displayText;
            await applyColorVariable(selectText, 'table-cell-text-key', '#0C0D0E');
            selectFrame.appendChild(selectText);
            frame.appendChild(selectFrame);
        }
    }
    // 4. Action Text Cell
    else if (instance.componentId === 'table-cell-action-text') {
        const rawText = String(params.text || '').trim() || '编辑 删除 …';
        const parts = rawText
          .split(/[\s,，、\/]+/)
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
            const moreIcon =
              (await createFigmaComponentInstanceByToken('table-cell-icon-more')) ||
              (await createFigmaComponentInstanceByToken('table-cell-icon-action-more'));
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

        const iconTokens = ['table-cell-icon-edit', 'table-cell-icon-delete', 'table-cell-icon-more'];
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
        
        // Set characters AFTER setting the font
        const allowEmptyText = params.allowEmptyText === true;
        if (
            params.text !== undefined &&
            params.text !== null &&
            (allowEmptyText || String(params.text).trim() !== '')
        ) {
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
        textNode.textAutoResize = 'WIDTH_AND_HEIGHT';
        frame.appendChild(textNode);
    }

    if (
      instance.componentId !== 'table-cell' &&
      instance.componentId !== 'table-header-cell' &&
      instance.componentId !== 'table-cell-select'
    ) {
        applyCellAutoWidth(frame);
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
      
      const defaultTextColor = '#42464E';
      if (params.color && params.color !== defaultTextColor) {
          await applyColorVariable(textNode, "text-custom-key", params.color);
      } else {
          await applyColorVariable(textNode, "text-secondary-key", defaultTextColor);
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
        if (strictRenderMode) {
          throw new Error(`[Render] Missing button component for token: ${def.figmaPropertySnapshot?.token || def.name}`);
        }
        const width = Number(params.width) > 0 ? Number(params.width) : 100;
        node = await createMissingFigmaComponentFrame(def.figmaPropertySnapshot?.token || def.name, width, 32);
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
      frame.primaryAxisSizingMode = 'FIXED';
      frame.counterAxisSizingMode = 'AUTO';
      try { (frame as any).layoutSizingHorizontal = 'FILL'; } catch {}
      try { (frame as any).layoutSizingVertical = 'HUG'; } catch {}
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
  // --- INPUT / SELECT / CHECKBOX / GROUP / RADIO / TEXTAREA / SWITCH / DATEPICKER / TIMEPICKER / INPUTNUMBER / SLIDER / SEGMENTED-PICKER / UPLOAD ---
  else if ([
    'input',
    'select',
    'checkbox',
    'checkbox-group',
    'radio-group',
    'textarea',
    'switch',
    'datepicker',
    'timepicker',
    'inputnumber',
    'slider',
    'segmented-picker',
    'upload'
  ].includes(instance.componentId)) {
    const snapshot = def.figmaPropertySnapshot as any;
    const componentKey = (snapshot?.token ? resolveComponentKeyFromToken(snapshot.token) : '') || String(snapshot?.componentKey || '').trim();
    const fallbackWidth = Number(params.width) > 0 ? Number(params.width) : def.runtime?.fallback?.width;
    const fallbackHeight = def.runtime?.fallback?.height;
    const canFallback =
      Number.isFinite(fallbackWidth) ||
      Number.isFinite(fallbackHeight);
    if (componentKey) {
      try {
        const importedInstance = await createFigmaComponentInstanceFromRef({
          componentKey,
          fallbackName: snapshot?.componentSetName || def.name,
          variantCriteria: {}
        });
        applyFigmaComponentProps(importedInstance, instance.componentId, params);
        const targetWidth = Number(params.width) > 0 ? Number(params.width) : importedInstance.width;
        importedInstance.resize(targetWidth, importedInstance.height);
        node = importedInstance;
      } catch (e) {
        if (strictRenderMode || !canFallback) {
          throw new Error(`[Render] Failed to create ${instance.componentId} for token: ${snapshot?.token || def.name}`);
        }
        console.warn(`[FigmaUI] failed to create ${instance.componentId} from Figma component`, e);
        node = await createMissingFigmaComponentFrame(snapshot?.token || def.name, fallbackWidth, fallbackHeight);
      }
    } else {
      if (strictRenderMode || !canFallback) {
        throw new Error(`[Render] Missing ${instance.componentId} component key for token: ${snapshot?.token || def.name}`);
      }
      node = await createMissingFigmaComponentFrame(snapshot?.token || def.name, fallbackWidth, fallbackHeight);
    }
  }
  // --- CARD ---
  else if (instance.componentId === 'card') {
    const cardDefaults = getDefaultParams('card');
    const cardMetrics =
      getRegistrySizeMetrics('card', params.size)
      ?? getRegistrySizeMetrics('card', cardDefaults.size);
    const cardPadding =
      toPositiveNumber(params.padding)
      ?? cardMetrics?.paddingX
      ?? toPositiveNumber(cardDefaults.padding)
      ?? 0;
    const cardCornerRadius = cardMetrics?.cornerRadius ?? 0;
    const frame = figma.createFrame();
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'FIXED';
    frame.resize(params.width || 300, 100);
    frame.paddingLeft = cardPadding;
    frame.paddingRight = cardPadding;
    frame.paddingTop = cardPadding;
    frame.paddingBottom = cardPadding;
    frame.itemSpacing = 16;
    frame.cornerRadius = cardCornerRadius;
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
  else if (instance.componentId.startsWith('chart-')) {
    const snapshot = def.figmaPropertySnapshot as any;
    const token = snapshot?.token || '';
    try {
      const importedInstance = await renderChartInstance({ definition: def, params });
      node = importedInstance;
    } catch (e) {
      console.warn(`[FigmaUI] failed to create ${instance.componentId} from Figma component`, e);
      node = await createMissingFigmaComponentFrame(
        token || def.name,
        undefined,
        Number(params.height) > 0 ? Number(params.height) : 220
      );
    }
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
  componentKey?: string;
  componentNodeId?: string;
  fallbackName?: string;
}> {
  const mode = String(payload?.mode || '').trim().toLowerCase();
  const includeAll = payload?.all === true || mode === 'all';
  const requestedTokens = toStringList(payload?.tokens);
  const requestedKeys = toStringList(payload?.keys);
  const requestedNodeIds = toStringList(payload?.nodeIds);

  const targets: Array<{ token?: string; componentKey?: string; componentNodeId?: string; fallbackName?: string }> = [];
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
    Object.entries(BASE_COMPONENT_TOKEN_PACK).forEach(([token, base]) => {
      if (!base?.componentKey) return;
      targets.push({
        token,
        componentKey: base.componentKey,
        fallbackName: base.displayName
      });
    });
  } else if (requestedTokens.length > 0 || requestedKeys.length > 0 || requestedNodeIds.length > 0) {
    requestedTokens.forEach(pushToken);

    // If exactly one key and one nodeId are provided together, merge them into one target
    // so discoverFigmaComponentSchemaFromSelection can traverse sub-component exposed properties
    if (requestedKeys.length === 1 && requestedNodeIds.length === 1 && requestedTokens.length === 0) {
      const key = String(requestedKeys[0] || '').trim();
      const nodeId = String(requestedNodeIds[0] || '').trim();
      if (key && nodeId) {
        const resolved = resolveComponentTokenProfile(key);
        targets.push({
          token: resolved?.token,
          componentKey: resolved?.profile.componentKey || key,
          componentNodeId: nodeId,
          fallbackName: resolved?.profile.displayName
        });
      }
    } else {
      requestedKeys.forEach((key) => {
        const normalized = String(key || '').trim();
        if (!normalized) return;
        const resolved = resolveComponentTokenProfile(normalized);
        if (resolved) {
          targets.push({
            token: resolved.token,
            componentKey: resolved.profile.componentKey,
            fallbackName: resolved.profile.displayName
          });
        } else {
          targets.push({ componentKey: normalized });
        }
      });
      requestedNodeIds.forEach((nodeId) => {
        const normalized = String(nodeId || '').trim();
        if (!normalized) return;
        targets.push({ componentNodeId: normalized });
      });
    }
  } else {
    Object.entries(BASE_COMPONENT_TOKEN_PACK).forEach(([token]) => pushToken(token));
  }

  const dedup = new Set<string>();
  const uniqueTargets: Array<{ token?: string; componentKey?: string; componentNodeId?: string; fallbackName?: string }> = [];
  targets.forEach((target) => {
    const key = `${target.token || ''}|${target.componentKey || ''}|${target.componentNodeId || ''}`;
    if ((!target.componentKey && !target.componentNodeId) || dedup.has(key)) return;
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

function formatYValue(val: number): string {
  if (Math.abs(val) >= 1000000000) {
    return (val / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (Math.abs(val) >= 1000000) {
    return (val / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (Math.abs(val) >= 10000) {
    return (val / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return Math.round(val).toString();
}

async function drawAiChart(data: any, options: any) {
  // Validate input
  if (!data || !data.datasets) {
    console.error("Invalid data provided");
    figma.notify("Invalid data");
    return;
  }

  // Load fonts - Critical Step
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
  } catch (e) {
    console.error("Failed to load Inter font", e);
    figma.notify("Failed to load standard fonts");
    return;
  }
  
  // Load PingFang SC Medium for Title (Optional)
  try {
    await figma.loadFontAsync({ family: "PingFang SC", style: "Medium" });
  } catch (e) {
    console.log("PingFang SC Medium not available, falling back");
  }
  try {
    await figma.loadFontAsync({ family: "PingFang SC", style: "Regular" });
  } catch (e) {
    console.log("PingFang SC Regular not available, falling back");
  }

  let frame: FrameNode | null = null;
  let width = 600;
  let height = 300;
  let useSelection = false;

  // Check selection - support RECTANGLE, FRAME, GROUP
  if (figma.currentPage.selection.length > 0) {
    const node = figma.currentPage.selection[0];
    if (node.type === 'RECTANGLE' || node.type === 'FRAME' || node.type === 'GROUP') {
      useSelection = true;
      width = node.width;
      height = node.height;
      
      if (node.type === 'FRAME') {
        frame = node;
        frame.clipsContent = false; // Ensure existing frame doesn't clip labels
        const existing = node.findChild((n: SceneNode) => n.name === "AI Chart Container");
        if (existing) existing.remove();
      } else {
        frame = figma.createFrame();
        frame.x = node.x;
        frame.y = node.y;
        frame.resize(width, height);
        frame.name = "AI Chart";
        
        if (node.type === 'RECTANGLE' && node.fills) {
          frame.fills = node.fills;
        } else {
          frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        }
        
        const parent = node.parent;
        if (parent) {
          parent.insertChild(parent.children.indexOf(node) + 1, frame);
        }
      }
    }
  }

  if (!frame) {
    frame = figma.createFrame();
    frame.name = "AI Chart";
    frame.resize(600, 300);
    frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    frame.cornerRadius = 8;
    frame.clipsContent = false; // Prevent clipping of labels
    frame.effects = [{
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.1 },
      offset: { x: 0, y: 2 },
      radius: 10,
      visible: true,
      blendMode: "NORMAL"
    }];
  }

  // Create AI Chart Container inside the frame
  const chartContainer = figma.createFrame();
  chartContainer.name = "AI Chart Container";
  chartContainer.layoutMode = "VERTICAL";
  chartContainer.primaryAxisSizingMode = "AUTO"; 
  chartContainer.clipsContent = false; // Prevent clipping
  
  // Set Padding on Chart Container to ensure internal spacing
  chartContainer.paddingLeft = 16;
  chartContainer.paddingRight = 16;
  chartContainer.paddingTop = 16;
  chartContainer.paddingBottom = 16;

  // If frame is AutoLayout:
  if (frame.layoutMode !== "NONE") {
    chartContainer.layoutAlign = "STRETCH";
    chartContainer.layoutGrow = 1;
  } else {
    // Frame is FIXED/NONE. Use Constraints.
    chartContainer.resize(frame.width, frame.height); // Fill completely
    chartContainer.x = 0;
    chartContainer.y = 0;
    chartContainer.constraints = { horizontal: "STRETCH", vertical: "STRETCH" };
  }
  
  chartContainer.fills = [];
  chartContainer.itemSpacing = 8; // Default spacing between items
  frame.appendChild(chartContainer);

  // 1. Title
  if (options.title && options.title.length > 0) {
    const titleLabel = figma.createText();
    titleLabel.characters = options.title;
    titleLabel.fontSize = 14;
    try {
      titleLabel.fontName = { family: "PingFang SC", style: "Medium" };
    } catch (e) {
      titleLabel.fontName = { family: "Inter", style: "Bold" };
    }
    titleLabel.fills = [{ type: 'SOLID', color: hexToRgb('#0C0D0E') }];
    chartContainer.appendChild(titleLabel);
  }

  // 2. Chart Body (Holds Plot and Axes)
  const chartBody = figma.createFrame();
  chartBody.name = "Chart Body";
  chartBody.layoutMode = "VERTICAL"; // AutoLayout Vertical
  chartBody.primaryAxisSizingMode = "AUTO"; // Allow it to grow/shrink
  chartBody.counterAxisSizingMode = "AUTO"; // Fill width
  chartBody.fills = [];
  chartBody.layoutAlign = "STRETCH"; // Fill Width
  chartBody.layoutGrow = 1; // Fill Remaining Height
  chartBody.clipsContent = false; // Prevent clipping
  chartContainer.appendChild(chartBody);
  
  // Calculate Data Range
  let maxVal = -Infinity;
  let minVal = Infinity;
  
  data.datasets.forEach((ds: any) => {
    ds.data.forEach((v: number) => {
      if (v > maxVal) maxVal = v;
      if (v < minVal) minVal = v;
    });
  });

  if (maxVal === -Infinity) maxVal = 100;
  if (minVal === Infinity) minVal = 0;

  let niceMax = Math.ceil(maxVal / 10) * 10;
  let niceMin = Math.floor(minVal / 10) * 10;
  
  if (niceMax === niceMin) {
    niceMax += 10;
    niceMin -= 10;
  }
  
  if (minVal >= 0) niceMin = 0;
  
  // Adaptive Grid Steps
  const showLegend = data.datasets.length > 0; 
  const legendHeight = showLegend ? 20 : 0;
  const hasTitle = options.title && options.title.length > 0;
  const estimatedHeight = (height - 32) - (hasTitle ? 30 : 0) - (legendHeight > 0 ? (legendHeight + 8) : 0);
  
  // Adaptive Grid Steps
  const targetIntervalHeight = 30;
  let gridSteps = Math.max(2, Math.floor(estimatedHeight / targetIntervalHeight));
  
  let roughInterval = (niceMax - niceMin) / gridSteps;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
  const normalized = roughInterval / magnitude;
  
  let niceInterval: number;
  if (normalized < 1.5) niceInterval = 1 * magnitude;
  else if (normalized < 3) niceInterval = 2 * magnitude; 
  else if (normalized < 7) niceInterval = 5 * magnitude;
  else niceInterval = 10 * magnitude;
  
  niceMin = Math.floor(niceMin / niceInterval) * niceInterval;
  niceMax = Math.ceil(niceMax / niceInterval) * niceInterval;
  
  if (niceMax === niceMin) niceMax += niceInterval;
  
  gridSteps = Math.round((niceMax - niceMin) / niceInterval);
  
  const range = niceMax - niceMin;

  // Calculate Layout Dimensions
  const tempText = figma.createText();
  tempText.fontSize = 10;
  tempText.fontName = { family: "Inter", style: "Regular" }; 
  tempText.visible = false;
  chartContainer.appendChild(tempText); 
  
  let maxLabelW = 0;
  for (let i = 0; i <= gridSteps; i++) {
    const val = niceMin + (range * i) / gridSteps;
    let txt = formatYValue(val);
    if (options.unit) txt += options.unit;
    tempText.characters = txt;
    if (tempText.width > maxLabelW) maxLabelW = tempText.width;
  }
  tempText.remove();
  
  const plotX = maxLabelW + 4; // Exact width + 4px gap
  const rightMargin = 0; 
  const xAxisHeight = 16; 
  const topSpacerHeight = hasTitle ? 6 : 0;

  // Top Spacer
  if (topSpacerHeight > 0) {
    const topSpacer = figma.createFrame();
    topSpacer.name = "Top Spacer";
    topSpacer.resize(1, topSpacerHeight);
    topSpacer.layoutMode = "NONE";
    topSpacer.layoutAlign = "STRETCH";
    topSpacer.fills = [];
    chartBody.appendChild(topSpacer);
  }

  // Plot Frame
  const plotFrame = figma.createFrame();
  plotFrame.name = "Plot Frame";
  plotFrame.layoutMode = "HORIZONTAL"; 
  plotFrame.itemSpacing = 0;
  plotFrame.fills = [];
  plotFrame.clipsContent = false;
  plotFrame.layoutAlign = "STRETCH";
  plotFrame.layoutGrow = 1;
  
  const currentBodyW = width - 32;
  const chartBodyH = estimatedHeight; 
  const plotH = Math.max(10, chartBodyH - xAxisHeight - topSpacerHeight);
  const fullPlotW = currentBodyW;
  
  plotFrame.resize(fullPlotW, plotH);
  chartBody.appendChild(plotFrame);

  // Y-Axis Frame
  const yAxisFrame = figma.createFrame();
  yAxisFrame.name = "Y Axis Labels";
  yAxisFrame.layoutMode = "NONE";
  yAxisFrame.resize(plotX, plotH);
  yAxisFrame.layoutSizingHorizontal = "FIXED";
  yAxisFrame.layoutAlign = "STRETCH"; 
  yAxisFrame.fills = [];
  yAxisFrame.clipsContent = false;
  plotFrame.appendChild(yAxisFrame);

  // Data Frame
  const dataFrame = figma.createFrame();
  dataFrame.name = "Data Area";
  dataFrame.layoutMode = "NONE";
  const drawW = Math.max(0.01, fullPlotW - plotX - rightMargin);
  dataFrame.resize(drawW, plotH); 
  dataFrame.layoutGrow = 1; 
  dataFrame.layoutAlign = "STRETCH"; 
  dataFrame.fills = [];
  dataFrame.clipsContent = false;
  plotFrame.appendChild(dataFrame);

  // Draw Grid & Y-Axis Labels
  const labelColor = hexToRgb('#737A87');
  const labelFontSize = 10;
  
  for (let i = 0; i <= gridSteps; i++) {
    const value = niceMin + (range * i) / gridSteps;
    const normalizedY = (i / gridSteps); 
    const y = plotH - normalizedY * plotH;

    // Grid Line
    const line = figma.createLine();
    line.resize(drawW, 0);
    line.x = 0;
    line.y = y;
    
    if (i === 0) {
      line.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]; 
      line.strokeCap = "ROUND";
    } else {
      line.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
      line.strokeCap = "ROUND";
      line.dashPattern = [2, 2];
    }
    
    line.constraints = { horizontal: "SCALE", vertical: "SCALE" };
    dataFrame.appendChild(line);

    // Label
    const label = figma.createText();
    let labelText = formatYValue(value);
    if (options.unit) labelText += options.unit;
    
    label.characters = labelText;
    label.fontSize = labelFontSize;
    label.fills = [{ type: 'SOLID', color: labelColor }];
    
    label.textAutoResize = "WIDTH_AND_HEIGHT"; 
    const naturalWidth = label.width;
    label.textAutoResize = "NONE";
    label.resize(naturalWidth, 12); 
    label.textAlignVertical = "CENTER";
    label.textAlignHorizontal = "RIGHT";
    label.x = plotX - naturalWidth - 4;
    label.y = y - 6; 
    
    label.constraints = { horizontal: "MAX", vertical: "SCALE" }; 
    yAxisFrame.appendChild(label);
  }

  // X-Axis Frame
  const xAxisFrame = figma.createFrame();
  xAxisFrame.name = "X Axis";
  xAxisFrame.layoutMode = "HORIZONTAL"; 
  xAxisFrame.itemSpacing = 0;
  xAxisFrame.primaryAxisSizingMode = "FIXED"; 
  xAxisFrame.counterAxisSizingMode = "FIXED"; 
  xAxisFrame.resize(fullPlotW, xAxisHeight); 
  xAxisFrame.layoutAlign = "STRETCH"; 
  xAxisFrame.fills = [];
  xAxisFrame.clipsContent = false;
  chartBody.appendChild(xAxisFrame);

  // X Spacer
  const xSpacer = figma.createFrame();
  xSpacer.name = "Spacer";
  xSpacer.layoutMode = "NONE";
  xSpacer.resize(plotX, xAxisHeight);
  xSpacer.layoutSizingHorizontal = "FIXED";
  xSpacer.layoutAlign = "STRETCH"; 
  xSpacer.fills = [];
  xAxisFrame.appendChild(xSpacer);

  // X Labels Container
  const xLabelsContainer = figma.createFrame();
  xLabelsContainer.name = "Labels Container";
  xLabelsContainer.layoutMode = "NONE";
  xLabelsContainer.resize(drawW, xAxisHeight);
  xLabelsContainer.layoutGrow = 1; 
  xLabelsContainer.layoutAlign = "STRETCH"; 
  xLabelsContainer.fills = [];
  xLabelsContainer.clipsContent = false;
  xAxisFrame.appendChild(xLabelsContainer);

  const count = data.labels.length;
  const isBarChart = options.type === 'bar';
  
  // 根据图表类型选择不同的X轴标签布局
  let labelPositions: number[] = [];
  
  let stepX = count > 1 ? drawW / (count - 1) : drawW;
  if (isBarChart) {
    // 柱状图：使用boundaryGap=true的布局
    const barCategoryGap = 0.3;
    const categorySlotWidth = count > 0 ? drawW / (count + barCategoryGap) : drawW;

    for (let i = 0; i < count; i++) {
      const centerX = categorySlotWidth / 2 + i * categorySlotWidth;
      labelPositions.push(centerX);
    }
  } else {
    // 折线图：使用原有的等距布局
    stepX = count > 1 ? drawW / (count - 1) : drawW;
    for (let i = 0; i < count; i++) {
      labelPositions.push(count === 1 ? drawW / 2 : i * stepX);
    }
  }

  // Draw X-Axis Labels (Aligned with PlotFrame structure)
  const showXLabels = true; 
  if (showXLabels) {
    // 1. Measure all labels
    const labelWidths: number[] = [];
    const tempText = figma.createText();
    tempText.fontSize = labelFontSize; 
    try {
      tempText.fontName = { family: "Inter", style: "Regular" };
    } catch(e) {}
    
    data.labels.forEach((l: string) => {
      tempText.characters = l;
      labelWidths.push(tempText.width);
    });
    tempText.remove(); 
    
    // 2. Find best number of labels to show
    const isCategorical = false;
    
    const rotateLabels = false;
    let finalIndices: number[] = [];
    let finalMaxLabelW = drawW;
    
    // Combined Loop Strategy - Optimized for Density & Uniformity
    const minGap = 12; 
    finalIndices = [0, count - 1]; 
    finalMaxLabelW = drawW;
    
    let bestS = -1;
    let bestMaxW = 0;
    
    // Calculate Max Label Width from data
    let maxLW = 0;
    if (labelWidths && labelWidths.length > 0) {
      maxLW = Math.max(...labelWidths);
    }
    
    // Iterate all possible steps to find the smallest s (most labels)
    for (let s = 1; s < count; s++) {
      // 计算步长间距
      let currentStepDistance = 0;
      if (labelPositions.length > 1) {
        const stepIndex = Math.min(s, labelPositions.length - 1);
        currentStepDistance = Math.abs(labelPositions[stepIndex] - labelPositions[0]);
      }
      
      const limitW = (currentStepDistance > 0 ? currentStepDistance : drawW) - minGap;
      
      // 1. Strict Width Constraint (36px)
      if (limitW < 36) continue;
      
      // 2. Check against actual label width to avoid overlap (with 20% tolerance)
      if (maxLW > 0 && limitW < maxLW * 0.8) continue; 
      
      // Found the smallest valid s (since we iterate up)
      bestS = s;
      bestMaxW = limitW;
      break; 
    }
    
    // Fallback if nothing fits
    if (bestS === -1) {
      // Force a step that gives ~40px
      bestS = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(drawW / 40))));
      bestMaxW = Math.max(36, drawW / Math.max(1, count / bestS) - minGap);
    }
    
    if (bestS !== -1) {
      const indices: number[] = [];
      for (let i = 0; i < count; i += bestS) {
        indices.push(i);
      }
      // Do NOT force last index to ensure strict spatial uniformity
      finalIndices = indices;
      finalMaxLabelW = bestMaxW;
    } else {
      finalIndices = [0, count - 1];
      finalMaxLabelW = Math.max(1, (drawW - minGap) / 2);
    }

    // Render Labels
    finalIndices.forEach((i: number, index: number) => {
      const text = data.labels[i];
      const isLast = index === finalIndices.length - 1;
      const isFirst = index === 0;
      
      const x = labelPositions[i];
      
      const label = figma.createText();
      label.characters = text;
      label.fontSize = labelFontSize;
      label.fills = [{ type: 'SOLID', color: labelColor }];
      
      // Enable Truncation - Use NONE (Fixed Size) to support single-line truncation
      label.textAutoResize = "NONE"; 
      
      // Attempt to set truncation safely
      try {
        (label as any).textTruncation = "ENDING"; // Ends with ...
      } catch (e) {
        // Fallback for older Figma API versions or if property is not supported
      }
      
      if (rotateLabels) {
        // Rotated Logic - not used in default mode
      } else {
        // Standard Horizontal Logic - 所有标签都居中对齐
        label.textAlignHorizontal = "CENTER";
        label.x = x - (finalMaxLabelW / 2);
        label.y = 0; 
        
        // Set width to strict limit to ensure no collision
        if (finalMaxLabelW > 0.01) {
          label.resize(finalMaxLabelW, label.height); 
        } else {
          label.resize(0.01, label.height);
        }
      }
      
      label.constraints = { horizontal: "SCALE", vertical: "MIN" };
      
      xLabelsContainer.appendChild(label);
    });
  }

  // Draw Chart Data (Lines or Bars)
  const barType = options.barType || 'simple';
  
  if (isBarChart) {
    // 绘制柱状图 - 严格遵循SKILL规范
    const numCategories = data.labels.length;
    const numSeries = data.datasets.length;
    
    // SKILL规范配置
    const barCategoryGap = 0.3; // 30%
    const barGap = barType === 'grouped' ? 0.2 : 0; // 分组时20%，其他0%
    const barWidthPercent = numCategories > 10 ? 0.5 : 0.7; // >10类目50%，否则70%
    
    // 使用boundaryGap=true的布局：两端各留半个类目宽度的空间
    const totalCategoriesWidth = drawW;
    // 计算每个类目的可用宽度（包含barCategoryGap）
    const categorySlotWidth = numCategories > 0 ? totalCategoriesWidth / (numCategories + barCategoryGap) : totalCategoriesWidth;
    // 计算柱子实际占用的宽度（不包含barCategoryGap）
    const categoryUsableWidth = categorySlotWidth * (1 - barCategoryGap);
    
    if (barType === 'simple') {
      // 基础柱状图
      data.datasets.forEach((ds: any, seriesIndex: number) => {
        ds.data.forEach((val: number, i: number) => {
          const normalizedY = (val - niceMin) / (range || 1);
          const barHeight = normalizedY * plotH;
          const barY = plotH - barHeight;
          
          // 计算柱子中心位置 - boundaryGap=true布局
          const categoryCenterX = categorySlotWidth / 2 + i * categorySlotWidth;
          // 柱子宽度
          const barW = categoryUsableWidth * barWidthPercent;
          const barX = categoryCenterX - barW / 2;
          
          // 确保柱子不超出画布
          const safeBarX = Math.max(0, Math.min(barX, drawW - barW));
          
          const rect = figma.createRectangle();
          rect.resize(barW, barHeight);
          rect.x = safeBarX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
        });
      });
    } else if (barType === 'grouped') {
      // 分组柱状图
      data.datasets.forEach((ds: any, seriesIndex: number) => {
        ds.data.forEach((val: number, i: number) => {
          const normalizedY = (val - niceMin) / (range || 1);
          const barHeight = normalizedY * plotH;
          const barY = plotH - barHeight;
          
          // 计算分组中心位置 - boundaryGap=true布局
          const categoryCenterX = categorySlotWidth / 2 + i * categorySlotWidth;
          // 分组内所有柱子的总宽度（包含间距）
          const groupTotalWidth = categoryUsableWidth;
          // 分组内柱子间距总宽度
          const totalGapInGroup = (numSeries - 1) * groupTotalWidth * barGap;
          // 单根柱子宽度
          const singleBarWidth = (groupTotalWidth - totalGapInGroup) / numSeries;
          // 分组起始位置
          const groupStartX = categoryCenterX - groupTotalWidth / 2;
          // 当前柱子位置
          const barX = groupStartX + seriesIndex * (singleBarWidth + groupTotalWidth * barGap);
          
          // 确保柱子不超出画布
          const safeBarX = Math.max(0, Math.min(barX, drawW - singleBarWidth));
          
          const rect = figma.createRectangle();
          rect.resize(singleBarWidth, barHeight);
          rect.x = safeBarX;
          rect.y = barY;
          rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
          rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
          dataFrame.appendChild(rect);
        });
      });
    } else if (barType === 'stacked') {
      // 堆叠柱状图
      // 先计算每个位置的累积值
      const stackedValues: number[][] = [];
      for (let i = 0; i < numCategories; i++) {
        stackedValues[i] = [];
        let cumulative = 0;
        for (let j = 0; j < numSeries; j++) {
          stackedValues[i][j] = cumulative;
          cumulative += data.datasets[j].data[i];
        }
      }
      
      // 找到所有数据的最大值和最小值来正确缩放
      let allMin = Infinity;
      let allMax = -Infinity;
      data.datasets.forEach((ds: any) => {
        ds.data.forEach((v: number) => {
          if (v < allMin) allMin = v;
          if (v > allMax) allMax = v;
        });
      });
      
      // 计算每个位置的总累积值
      const totalStacked: number[] = [];
      for (let i = 0; i < numCategories; i++) {
        let total = 0;
        for (let j = 0; j < numSeries; j++) {
          total += data.datasets[j].data[i];
        }
        totalStacked[i] = total;
        if (total > allMax) allMax = total;
      }
      
      if (allMin === Infinity) allMin = 0;
      if (allMax === -Infinity) allMax = 100;
      if (allMin >= 0) allMin = 0;
      
      const stackedRange = allMax - allMin || 1;
      
      data.datasets.forEach((ds: any, seriesIndex: number) => {
        ds.data.forEach((val: number, i: number) => {
          const baseValue = stackedValues[i][seriesIndex];
          const normalizedBase = (baseValue - allMin) / stackedRange;
          const normalizedTop = (baseValue + val - allMin) / stackedRange;
          
          const barHeight = (normalizedTop - normalizedBase) * plotH;
          const barY = plotH - normalizedTop * plotH;
          
          // 计算柱子中心位置 - boundaryGap=true布局
          const categoryCenterX = categorySlotWidth / 2 + i * categorySlotWidth;
          // 柱子宽度
          const barW = categoryUsableWidth * barWidthPercent;
          const barX = categoryCenterX - barW / 2;
          
          // 确保柱子不超出画布
          const safeBarX = Math.max(0, Math.min(barX, drawW - barW));
          
          if (barHeight > 0.1) {
            const rect = figma.createRectangle();
            rect.resize(barW, barHeight);
            rect.x = safeBarX;
            rect.y = barY;
            rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
            rect.constraints = { horizontal: "SCALE", vertical: "SCALE" };
            dataFrame.appendChild(rect);
          }
        });
      });
    }
  } else {
    // 绘制折线图（保持原有逻辑）
    data.datasets.forEach((ds: any) => {
      const pathData = ds.data.map((val: number, i: number) => {
        const x = i * stepX;
        const normalizedY = (val - niceMin) / (range || 1);
        const y = plotH - normalizedY * plotH;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      }).join(' ');

      const vector = figma.createVector();
      vector.vectorPaths = [{
        windingRule: "NONZERO",
        data: pathData
      }];
      const rgb = hexToRgb(ds.color);
      vector.strokes = [{ type: 'SOLID', color: rgb }];
      vector.strokeWeight = 2;
      vector.strokeJoin = "ROUND";
      vector.strokeCap = "ROUND";
      vector.constraints = { horizontal: "SCALE", vertical: "SCALE" };
      dataFrame.appendChild(vector);
    });
  }

  // Legend Area
  if (showLegend) {
    const legendFrame = figma.createFrame();
    legendFrame.layoutMode = "HORIZONTAL";
    legendFrame.counterAxisSizingMode = "AUTO";
    legendFrame.itemSpacing = 16;
    legendFrame.layoutAlign = "STRETCH";
    legendFrame.fills = [];
    
    data.datasets.forEach((ds: any, i: number) => {
      const item = figma.createFrame();
      item.layoutMode = "HORIZONTAL";
      item.counterAxisSizingMode = "AUTO";
      item.itemSpacing = 8;
      item.fills = [];
      item.verticalPadding = 4;
      item.horizontalPadding = 4;

      const rect = figma.createRectangle();
      rect.resize(12, 12);
      rect.cornerRadius = 2;
      rect.fills = [{ type: 'SOLID', color: hexToRgb(ds.color) }];
      item.appendChild(rect);

      const label = figma.createText();
      label.characters = ds.name || `Series ${i+1}`;
      label.fontSize = 12;
      label.fills = [{ type: 'SOLID', color: labelColor }];
      item.appendChild(label);

      legendFrame.appendChild(item);
    });
    chartContainer.appendChild(legendFrame);
  }

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
  // #endregion
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
    // #endregion
    figma.ui.postMessage({ type: 'apply-result', result });
  }

  if (msg.type === 'generate-chart') {
    const { data, options } = msg;
    await drawAiChart(data, options);
  }

  if (msg.type === 'switch-theme') {
      const { theme } = msg;
      if (theme === 'light' || theme === 'dark') {
          setCurrentTheme(theme);
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
      const hasNodeId = typeof target.componentNodeId === 'string' && target.componentNodeId.trim().length > 0;
      const discovered = hasNodeId
        ? await discoverFigmaComponentSchemaFromSelection({
            token: target.token,
            componentKey: target.componentKey || '',
            componentNodeId: target.componentNodeId,
            fallbackName: target.fallbackName
          })
        : await discoverFigmaComponentSchema({
            token: target.token,
            componentKey: target.componentKey || '',
            componentNodeId: target.componentNodeId,
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
        componentKey: target.componentKey || '',
        componentNodeId: target.componentNodeId,
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

  if (msg.type === 'inspect-selection-variables') {
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
    const maxDepthRaw = Number(payload.maxDepth);
    const maxDepth = Number.isFinite(maxDepthRaw) && maxDepthRaw > 0 ? Math.floor(maxDepthRaw) : 6;
    const maxChildrenRaw = Number(payload.maxChildren);
    const maxChildren = Number.isFinite(maxChildrenRaw) && maxChildrenRaw > 0 ? Math.floor(maxChildrenRaw) : 80;
    const selection = Array.from(figma.currentPage.selection);
    const result = await inspectSelectionVariables(selection, { maxDepth, maxChildren });
    figma.ui.postMessage({
      type: 'inspect-selection-variables-result',
      data: result
    });
  }

  if (msg.type === 'create-component') {
    const { component, parentId } = msg;
    // Reset theme on new creation for consistency, or read from UI settings
    // currentTheme = 'light'; 
    try {
      strictRenderMode = true;
      // Explicitly pass isRoot: true to trigger early viewport movement
      const node = await renderComponent(component, { isRoot: true });
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
    } finally {
      strictRenderMode = false;
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
      
      const formFieldAncestor = findAncestorFormFieldNode(node);
      if (formFieldAncestor) {
        node = formFieldAncestor;
      }

      const componentId = node.getPluginData('component-id');
      console.log('[DEBUG update-component] resolved componentId:', componentId, 'nodeId:', node.id, 'nodeName:', node.name);
      
      if (componentId) {
        let shouldRefreshSelection = true;
        if (FULL_RERENDER_COMPONENT_IDS.has(componentId)) {
          const previousParams = readNodeParams(node);
          if (componentId === 'form' && node.type === 'FRAME' && areFormParamsEquivalent(previousParams, params)) {
            const updated = await updateFormItemCount(node, previousParams, params);
            if (updated) {
              figma.currentPage.selection = [node];
              checkSelection();
              figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
              return;
            }
          }
          // ── controlWidthMode fixed→fill 切换：锁定当前容器宽度 ──
          if (
            componentId === 'form' &&
            node.type === 'FRAME' &&
            normalizeFormControlWidthMode(previousParams.controlWidthMode) === 'fixed' &&
            normalizeFormControlWidthMode(params.controlWidthMode) === 'fill'
          ) {
            const currentFrameWidth = Math.round(node.width);
            if (currentFrameWidth > 0) {
              params.width = currentFrameWidth;
            }
          }
          // ── controlWidthMode fill→fixed 切换：清除容器宽度锁定 ──
          if (
            componentId === 'form' &&
            node.type === 'FRAME' &&
            normalizeFormControlWidthMode(previousParams.controlWidthMode) === 'fill' &&
            normalizeFormControlWidthMode(params.controlWidthMode) === 'fixed'
          ) {
            params.width = 0;
          }
          if (componentId === 'form' && node.type === 'FRAME') {
            console.log('[DEBUG form-path] calling updateFormLayoutParams for form');
            const updated = await updateFormLayoutParams(node, previousParams, params);
            console.log('[DEBUG form-path] updateFormLayoutParams returned:', updated);
            if (updated) {
              figma.currentPage.selection = [node];
              checkSelection();
              figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
              return;
            }
          }
          let snapshot = buildComponentInstanceFromNode(node);
          if (!snapshot) {
            snapshot = readComponentInstanceSnapshot(node);
          }
          if (snapshot) {
            writeComponentInstanceSnapshot(node, snapshot);
          }
          const baseInstance: ComponentInstance = snapshot
            ? { ...snapshot, componentId, params }
            : { id: `update-${Date.now()}`, componentId, params };
          
          // Optimization: If it's a form-field and not layout-affecting, preserve existing label width
          // to avoid flickering or misaligned render before updateFormLayoutParams.
          let isLayoutChange = true;
          if (componentId === 'form-field') {
            isLayoutChange = isFormFieldLayoutAffecting(previousParams, params);
            console.log('[DEBUG form-field-update] isLayoutChange:', isLayoutChange, 'prevLabel:', previousParams.label, 'nextLabel:', params.label);
            if (!isLayoutChange) {
              const existingLabelWidth = getFormFieldLabelWrapWidth(node);
              if (existingLabelWidth) {
                params.labelWidth = existingLabelWidth;
              }
            }
          }

          const instanceToRender =
            componentId === 'form' && snapshot
              ? patchFormInstanceSnapshot(snapshot, previousParams, params)
              : componentId === 'form-field' && snapshot
                ? patchFormFieldInstanceSnapshot(snapshot, previousParams, params)
                : baseInstance;
          const replacement = await renderComponent(instanceToRender);

          if (replaceSceneNode(node, replacement)) {
            if (componentId === 'form-field' && isLayoutChange) {
              const formFrame = findAncestorFormFrame(replacement as SceneNode);
              console.log('[DEBUG label-align] isLayoutChange=true, formFrame found:', !!formFrame);
              if (formFrame) {
                const formParams = readNodeParams(formFrame);
                const fieldNodes = collectFormItemNodes(formFrame);
                const fieldIndex = fieldNodes.indexOf(replacement as SceneNode);
                console.log('[DEBUG label-align] fieldNodes.length:', fieldNodes.length, 'fieldIndex:', fieldIndex, 'formParams.labelWidth:', formParams.labelWidth);
                const updated = await updateFormLayoutParams(formFrame, formParams, formParams);
                console.log('[DEBUG label-align] updateFormLayoutParams returned:', updated);
                if (updated) {
                  const nextFieldNodes = collectFormItemNodes(formFrame);
                  const nextSelection = nextFieldNodes[fieldIndex] || formFrame;
                  figma.currentPage.selection = [nextSelection];
                  checkSelection();
                  figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
                  return;
                }
              }
            }
            figma.currentPage.selection = [replacement];
            checkSelection();
            figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
            return;
          }
        }

        node.setPluginData('params', JSON.stringify(params));
        
        // --- 业务属性应用 (针对 Figma Key 控件) ---
        if (node.type === 'INSTANCE') {
          // 严格遵循注册表中的 propertyMap 进行映射
          applyFigmaComponentProps(node, componentId, params);

          // Handle manual text sync for input/select if not fully re-rendered
          if (componentId === 'input' || componentId === 'select' || componentId === 'textarea' || componentId === 'datepicker' || componentId === 'timepicker') {
            let mainTextNode: TextNode | null = null;
            if (componentId === 'input' || componentId === 'textarea' || componentId === 'datepicker' || componentId === 'timepicker') {
              mainTextNode = readInputMainTextNode(node);
            } else if (componentId === 'select') {
              mainTextNode = findSelectDisplayTextNode(node);
            }
            if (mainTextNode) {
              let targetText = params.filled ? params.value : params.placeholder;
              if (!targetText) {
                targetText = componentId === 'select' ? '请选择' : '请输入';
              }
              if (String(mainTextNode.characters) !== String(targetText)) {
                if (mainTextNode.fontName !== figma.mixed) {
                  await figma.loadFontAsync(mainTextNode.fontName as FontName);
                }
                mainTextNode.characters = String(targetText);
              }
            }
          }
        }
        
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
                if (isTableTextContext(node)) {
                    node.textAutoResize = 'WIDTH_AND_HEIGHT';
                }
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
              let suppressedSelection = false;

	            // Keep inner table params in sync so sizing / row-action helpers read correct values.
	            if (tableContent !== tableRoot) {
	                writeNodeParams(tableContent, params);
            } else {
                tableRoot.name = 'Table Content';
                tableRoot.setPluginData('table-role', 'table-content');
	            }

	            const wantsPagination = params.hasPagination === true;
	            const wantsFilter = params.hasFilter === true;
	            const wantsTabs = params.hasTabs === true;
	            const wantsButtonGroup = params.hasButtonGroup === true;
            if ((wantsPagination || wantsFilter || wantsTabs || wantsButtonGroup) && hasDirectTableColumns(tableRoot)) {
                // If we have an existing filter group in the parent, we should clean it up before wrapping
                // because the new filter will be placed inside the wrapper's content stack.
                if (tableRoot.parent && tableRoot.parent.type === 'FRAME') {
                    removeTableToolbarFromParent(tableRoot.parent as FrameNode);
                }

                const wrapped = createTableWrapperFromTableFrame(tableRoot, params);
                if (wrapped) {
                    tableRoot = wrapped;
                    tableContent = resolveTableContentFrame(tableRoot);
                    selectionUpdateSuppressed = true;
                    suppressedSelection = true;
                    figma.currentPage.selection = [tableRoot];
                } else {
                    figma.ui.postMessage({
                        type: 'action-done',
                        message: '无法为表格添加分页器/筛选器：缺少可写入的父容器'
                    });
                }
            }

            if (wantsFilter || wantsTabs || wantsButtonGroup) {
                tableContent = resolveTableContentFrame(tableRoot);
                if (tableContent !== tableRoot) {
                    ensureTableContentStack(tableRoot, tableContent);
                    await ensureTableToolbar(tableRoot, tableContent.width, {
                        hasFilter: wantsFilter,
                        hasTabs: wantsTabs,
                        hasButtonGroup: wantsButtonGroup,
                        filterTexts: params.filterTexts,
                        primaryButtonText: params.primaryButtonText,
                        secondaryButtonText: params.secondaryButtonText
                    });
                } else if (tableRoot.parent && tableRoot.parent.type === 'FRAME') {
                    // Fallback: If wrapping failed or wasn't triggered (shouldn't happen with above logic),
                    // try inserting in parent. But we prefer wrapping.
                    if (wantsFilter) {
                         await ensureTableFilterGroupInParent(tableRoot.parent as FrameNode, tableRoot, tableRoot.width);
                    }
                } else {
                    figma.ui.postMessage({ type: 'action-done', message: '无法为表格添加工具栏：缺少可写入的父容器' });
                }
            } else {
                removeTableToolbarFromParent(tableRoot);
                if (tableRoot.parent && tableRoot.parent.type === 'FRAME') {
                    removeTableToolbarFromParent(tableRoot.parent as FrameNode);
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

            const borderWidth = Number(params.borderWidth ?? 0);
            if (Number.isFinite(borderWidth) && borderWidth > 0) {
                await applyStrokeColorVariable(tableContent, 'table-border-key', params.borderColor || '#EAEDF1');
                tableContent.strokeWeight = borderWidth;
            } else {
                clearNodeStrokes(tableContent);
            }
            if (tableContent !== tableRoot) {
                clearNodeStrokes(tableRoot);
            }

            if (suppressedSelection) {
                selectionUpdateSuppressed = false;
            }
	            checkSelection();
            shouldRefreshSelection = false;
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
                if (typeof params.textDisplay === 'string') {
                    const table = findTableFrameFromNode(node);
                    if (table) {
                        alignAllTableRows(table);
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
            if (typeof params.textDisplay === 'string') {
                const cell = findTableCellFromNode(node);
                const column = findTableColumnFromNode(node);
                if (cell && column) {
                    const table = findTableFrameFromNode(column);
                    const rowIndex = column.children.indexOf(cell as SceneNode);
                    if (table && rowIndex >= 0) {
                        alignTableRowHeights(table, rowIndex, [cell as SceneNode]);
                    }
                }
            }
        }
        if (shouldRefreshSelection) {
            checkSelection();
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
        let didClone = false;
        const previousCellType = column.getPluginData('cellType');
        const wasActionCell =
          typeof previousCellType === 'string' && isTableActionCellComponentId(previousCellType);
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
            didClone = true;
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
        let displayToApply = typeof textDisplay === 'string' ? textDisplay : undefined;
        if (didClone) {
          displayToApply = undefined;
        }
        if (!didClone && !displayToApply && componentId === 'table-cell') {
          const defaultDisplay = getDefaultParams('table-cell').textDisplay;
          displayToApply = typeof defaultDisplay === 'string' ? defaultDisplay : 'ellipsis';
          columnParamPatch.textDisplay = displayToApply;
        }
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
        const cellsToNormalize = column.children.filter((child) => {
          const id = child.getPluginData('component-id');
          return isTableCellComponentId(id);
        });
        for (const child of cellsToNormalize) {
          applyCellAutoWidthIfMultiElement(child);
        }

        if (typeof columnWidthMode === 'string') {
          applyColumnWidthMode(column, columnWidthMode.toUpperCase() as 'FIXED' | 'HUG' | 'FILL', width);
        } else if (isActionCell) {
          applyColumnWidthMode(column, 'HUG');
        } else if (wasActionCell && !isActionCell) {
          applyColumnWidthMode(column, 'FILL');
          columnParamPatch.columnWidthMode = 'FILL';
          columnParamPatch.width = undefined;
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
              const previousCellType = node.getPluginData('cellType');
              const wasActionCell =
                typeof previousCellType === 'string' && isTableActionCellComponentId(previousCellType);
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
              } else if (wasActionCell && typeof componentId === 'string') {
                  applyColumnWidthMode(node, 'FILL');
                  mergeNodeParams(node, { width: undefined });
              }
              checkSelection();
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
