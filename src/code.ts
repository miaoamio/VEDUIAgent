import { ComponentInstance } from './types';
import { COMPONENT_REGISTRY } from './registry';
import { getDefaultParams, getRegistrySizeMetrics } from './registry.helpers';
import type { ComponentDefinition } from './registry.types';
import { FULL_RERENDER_COMPONENT_IDS } from './editability';
import { applyEnvelopeUnknown } from './engine/applyEnvelope';
import { renderFigmaComponentInstance } from './engine/skills/resolve/figma-component';
import { renderChartInstance } from './engine/skills/resolve/chart';
import { resolveFormLayoutParamsUpdate } from './engine/skills/form.skill';
import { drawAiChart, hexToRgb } from './code/chart.renderer';
import {
  findFormFrameFromNode,
  isFormLabelWrapNode,
  findAncestorFormFrame,
  findAncestorFormFieldNode,
  syncFormFieldParamsFromNode,
  syncInputParamsFromNode,
  syncSelectParamsFromNode,
  syncStandaloneComponentParamsFromNode,
  syncComponentParamsFromNode,
  readInputMainTextNode,
  findSelectDisplayTextNode,
  normalizeFormFieldControlType,
  isFormFieldLayoutAffecting,
  isFormFieldLabelInstance,
  isFormFieldDescriptionInstance,
  isFormFieldControlNode,
  isLikelyFormFieldControlNode,
  findFormFieldControlNode,
  findFormFieldContentContainer,
  normalizeFormFieldLabelText,
  readFormFieldLabelTextFromNode,
  getFormFieldMessageText,
  hasFormFieldDescription,
  hasFormFieldError,
  normalizeFormAlign,
  normalizeFormLabelWidthPreset,
  normalizeFormControlWidthMode,
  getFormLabelWidthRuntimeConfig,
  resolveFormAlignVariantLabel,
  resolveFormLabelWidthVariantLabel,
  getFormFieldControlWidthModeOverrides,
  INPUT_LIKE_CONTROL_TYPES,
  resolveFormControlWidthMode,
  resolveFormFieldLayout,
  resolveFormLabelWidth,
  resolveFormLabelControlSpacing,
  resolveFormControlWidth,
  collectFormFieldInstances,
  hasFormFieldInstance,
  isFormItemInstance,
  countFormItemInstances,
  normalizeFormItemCount,
  isFormItemNode,
  collectFormItemNodes,
  stripFormItemCount,
  areFormParamsEquivalent,
  mapFormRowAlignment,
  shouldUseChildControlInstance,
  buildFigmaControlInstance,
  createControlInstanceFromFormFieldParams,
  adjustFormItemChildren,
  normalizeFormChildInstance,
  syncFormItemLabelsFromNode,
  createDefaultFormItem,
  applyFormItemLabel,
  FORM_INHERITED_PARAM_KEYS,
  FORM_FIELD_DEFAULTS,
  inheritFormFieldParams,
  inheritRowFormFieldParams,
  patchFormInstanceSnapshot,
  shouldResetFormFieldChildren,
  patchFormFieldInstanceSnapshot,
  detectFormActualState,
  getFormFieldLabelWrapWidth,
} from './code/form/form-queries';
import {
  alignFormLabelWidths,
  applyFormControlWidthModeToNode,
  normalizeFormControlVerticalSizing,
  setNodeClipsContent,
  preserveNodeHeight,
  type FormLayoutContext,
} from './code/form/form-layout';
import {
  type FormOperationContext,
  resolveAutoFormLabelWidth,
  resolveFormContentWidth,
  resolveFormParamsForRender,
  renderFormItemNode,
  updateFormItemCount as updateFormItemCountOp,
  updateFormLayoutParams as updateFormLayoutParamsOp,
} from './code/form/form-operations';
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
import {
  initStyleBindingDefs,
  loadFontCached,
  ensureInterFontsLoaded,
  getTypographyBindingIndex,
  findComponentVariableKey,
  findComponentTypographyKey,
  resolveEffectStyle,
  applyEffectStyleRef,
  resolveTextStyle,
  applyTextStyleBinding,
} from './code/utils/styleBinding';
import type { TypographyBindingIndexEntry } from './code/utils/styleBinding';
import {
  BASE_COMPONENT_TOKEN_PACK,
  resolveComponentTokenProfile
} from './theme/volcengine-design/component-tokens';
import { createInspectDrivenTagFallbackNode } from './theme/volcengine-design/tag-fallback';
import {
  resolveStatusTagThemeFromSemantic
} from './statusTagSemantic';
import {
  applyColorVariable,
  applyEffectColorVariable,
  applyStrokeColorVariable,
  parseColor,
  setCurrentTheme
} from './engine/skills/resolve/color';
import { setFillWidth, setFillWidthPreserveHeight, setFixedWidth } from './engine/skills/resolve/layout';
import {
  normalizeFormLayout,
  toVariantBoolean,
  resolveButtonTypeVariantLabel,
  resolveButtonThemeVariantLabel,
  resolveButtonStateVariantLabel,
  resolveButtonLanguageVariantLabel,
  STATUS_TAG_COMPONENT_TOKEN,
  resolveTagComponentFamily,
  normalizeUnifiedTagParams,
  buildTableCellTagParams,
  normalizeOtherTagType,
  resolveStatusTagThemeVariantLabel,
  resolveTagMetrics,
  matchesVariantProps,
  buildTagVariantCriteriaCandidates,
} from './code/utils/variantNormalize';
import type {
  TagComponentFamily,
} from './code/utils/variantNormalize';
import {
  readNodeParams,
  writeNodeParams,
  mergeNodeParams,
  readComponentInstanceSnapshot,
  writeComponentInstanceSnapshot,
  collectTextNodes,
} from './code/utils/nodeSnapshot';
import {
  FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE,
  FIGMA_COMPONENT_INSTANCE_FAILURE_CACHE,
  FIGMA_COMPONENT_INSTANCE_FAILURE_TTL,
  FAST_FAIL_COMPONENT_TOKENS,
  TAG_TEMPLATE_CACHE,
  TEMPLATE_CACHE_FRAME_KEY,
  TEMPLATE_CACHE_NODE_KEY,
  TEMPLATE_CACHE_NODE_CACHE_KEY,
  TEMPLATE_CACHE_NODE_KIND,
  STATUS_TAG_LABEL_NODE_KEY,
  TABLE_CELL_PREWARM_STATE,
  TABLE_CELL_PREWARM_TOKENS,
  serializeVariantCriteria,
  buildTokenCacheKey,
  buildTagTemplateCacheKey,
  getTemplateCacheFrame,
  registerTemplateNode,
  clearTemplateNodeMarker,
  markStatusTagLabelNode,
} from './code/utils/templateCache';
import type { TemplateCacheKind } from './code/utils/templateCache';
import {
  clearNodeStrokes,
  findInstanceComponentPropertyName,
  findIconVariantPropertyKey,
  trySetIconVariant,
} from './code/utils/figmaNodeUtils';
import {
  tableRowSyncInProgress,
  setTableRowSyncInProgress,
  alignTableRowHeights,
  alignAllTableRows,
  applyTableSizeToCells,
  restoreMergedAnchorCellHeight,
  applyColumnWidthMode,
  applyCellAlignment,
  applyCellTextDisplay,
  applyCellAutoWidth,
  applyCellAutoWidthIfMultiElement,
  tryApplyTableHeaderIconVariant,
  ensureTableContentStack,
  removeTableToolbar,
  removeTableToolbarFromParent,
  removePaginationRow,
  createTableWrapperFromTableFrame,
  type TableHeaderElementType,
} from './code/table/table-layout';
import {
  type TableOperationContext,
  createTableHeaderIconInstance as createTableHeaderIconInstanceOp,
  applyTableHeaderElementToHeaderCell as applyTableHeaderElementToHeaderCellOp,
  ensurePaginationRow as ensurePaginationRowOp,
  ensureTableToolbar as ensureTableToolbarOp,
  ensureTableFilterGroupInParent as ensureTableFilterGroupInParentOp,
  updateTableRowCount as updateTableRowCountOp,
  applyRowActionColumn as applyRowActionColumnOp,
  ensureOperationColumnHeader as ensureOperationColumnHeaderOp,
  mergeSelectedColumnCells,
  unmergeAnchorCell,
} from './code/table/table-operations';
import {
  resolveTableSizeHeight,
  resolveTableHeaderHeight,
  resolveTableBodyHeight,
  normalizeTableHeaderElementType,
  getTableHeaderIconTypeCandidates,
  findTableHeaderIconInstance,
  isTableCellComponentId,
  isTableTextContext,
  isTableColumnNode,
  isTableNode,
  isCellLikeNode,
  looksLikeTableColumnFrame,
  findTableFrameFromNode,
  findTableCellFromNode,
  getTableColumns,
  hasDirectTableColumns,
  resolveTableContentFrame,
  findPaginationRow,
  findTableContentStack,
  detectTableActualState,
  findManagedTableFilterGroup,
  findManagedTableFilterGroupInParent,
  findTableColumnFromNode,
  getTableHeaderOffset,
  getTableRowCountFromColumn,
  getTableRowCount,
  isTableActionCellComponentId,
  isMultiElementCell as isMultiElementCellQuery,
  TABLE_CELL_COMPONENT_PREFIX,
  TABLE_HEADER_ICON_PLUGIN_KEY,
} from './code/table/table-queries';
import { normalizeNumberUnitLabel as normalizeTableNumberUnitLabel } from './code/table/table-number-unit';
import {
  buildNormalizedTableGrid,
  type NormalizedTableMergeSpec,
} from './code/table/table-merge-model';
import { validateNormalizedTableGrid } from './code/table/table-merge-validate';
import { buildTableRenderPlan } from './code/table/table-render-grid';

const COMPONENT_DEFS = COMPONENT_REGISTRY.components;
initStyleBindingDefs(COMPONENT_DEFS);

function buildTableOpCtx(): TableOperationContext {
  return {
    renderComponent,
    createFigmaComponentInstanceByToken,
    createFigmaComponentInstanceFromRef,
    COMPONENT_DEFS,
    setSceneText,
    clearNodeStrokes,
    findInstanceComponentPropertyName,
    toVariantBoolean,
    resolveComponentTokenProfile,
  };
}

function buildFormOpCtx(): FormOperationContext {
  return {
    renderComponent,
    replaceSceneNode,
    applyNodeSize,
    applyColorVariable,
    buildComponentInstanceFromNode,
    readComponentInstanceSnapshot,
    writeComponentInstanceSnapshot,
    resolveFormLayoutParamsUpdate,
  };
}

function buildFormLayoutCtx(): FormLayoutContext {
  return {
    setFillWidthPreserveHeight,
    setFixedWidth,
  };
}

// Opt-in to incremental loading performance improvements and fix documentchange error
figma.skipInvisibleInstanceChildren = true;

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 398, height: 680 });


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



async function cleanupLegacyPrewarmTemplates(): Promise<void> {
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
    const mainComponent = await resolveInstanceMainComponentNode(node);
    const componentKey = mainComponent?.key;
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

async function hydrateTemplateCaches(): Promise<void> {
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
  await cleanupLegacyPrewarmTemplates();
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

function findMergeRoleFromNode(node: SceneNode | null): string {
  let current: BaseNode | null = node;
  while (current && current.type !== 'PAGE') {
    if ('getPluginData' in current) {
      const role = (current as SceneNode).getPluginData('merge-role');
      if (role === 'merge-anchor' || role === 'merge-hidden') {
        try { console.log('[merge] findMergeRoleFromNode hit', role, 'on', (current as any).name, (current as any).id); } catch {}
        return role;
      }
    }
    current = current.parent;
  }
  return '';
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

function extractFirstTextContent(node: SceneNode): string {
  if (node.type === 'TEXT') return (node as TextNode).characters || '';
  if ('children' in node) {
    for (const child of (node as any).children) {
      const text = extractFirstTextContent(child);
      if (text) return text;
    }
  }
  return '';
}

// 缓存最近一次有效的表格上下文，用于用户点击输入框导致选区清空时兜底
let lastTableContextCache: {
  headers: string[];
  data: string[][];
  selectedColumnIndex?: number;
  selectionKind: string;
  selectionLabel: string;
  tableNodeId: string;
} | null = null;

type CanvasHint = 'table' | 'form' | 'chart' | 'mixed';

let selectionUpdateSuppressed = false;

// Helper to check selection and notify UI
async function checkSelection() {
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
            const actualState = detectFormActualState(effectiveTarget as FrameNode, buildComponentInstanceFromNode);
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

        // Build tableContext for table-related selections
        let tableContext: {
          headers: string[];
          data: string[][];
          selectedColumnIndex?: number;
          selectionKind: string;
          selectionLabel: string;
          tableNodeId: string;
        } | undefined;

        if (componentId === 'table' || componentId === 'table-column' || isTableCellComponentId(componentId)) {
          try {
          let tableFrame: FrameNode | null = null;
          let selectedColIdx: number | undefined;

          if (componentId === 'table' && effectiveTarget.type === 'FRAME') {
            tableFrame = effectiveTarget as FrameNode;
          } else {
            tableFrame = findTableFrameFromNode(effectiveTarget);
          }

          if (tableFrame) {
            const columns = getTableColumns(tableFrame);
            const headers: string[] = [];
            const rows: string[][] = [];
            let maxRows = 0;

            for (let ci = 0; ci < columns.length; ci++) {
              const col = columns[ci];
              if (componentId === 'table-column' && effectiveTarget.id === col.id) {
                selectedColIdx = ci;
              }
              if (isTableCellComponentId(componentId)) {
                const cellColumn = findTableColumnFromNode(effectiveTarget);
                if (cellColumn && cellColumn.id === col.id) {
                  selectedColIdx = ci;
                }
              }

              if (col.children.length > 0) {
                headers.push(extractFirstTextContent(col.children[0]));
                const dataCellCount = col.children.length - 1;
                if (dataCellCount > maxRows) maxRows = dataCellCount;
              }
            }

            for (let ri = 0; ri < maxRows; ri++) {
              const row: string[] = [];
              for (const col of columns) {
                const cellIndex = ri + 1;
                if (cellIndex < col.children.length) {
                  row.push(extractFirstTextContent(col.children[cellIndex]));
                } else {
                  row.push('');
                }
              }
              rows.push(row);
            }

            let selKind = 'table';
            let selLabel = '当前选中：表格';
            if (typeof selectedColIdx === 'number') {
              if (isTableCellComponentId(componentId)) {
                selKind = 'cell';
                selLabel = `当前选中：${headers[selectedColIdx] || '列' + selectedColIdx} 列的单元格`;
              } else {
                selKind = 'column';
                selLabel = `当前选中：${headers[selectedColIdx] || '列' + selectedColIdx} 列`;
              }
            }

            tableContext = {
              headers,
              data: rows,
              selectedColumnIndex: selectedColIdx,
              selectionKind: selKind,
              selectionLabel: selLabel,
              tableNodeId: tableFrame.id
            };
          } else {
            // tableFrame 未找到，提供基础上下文
            tableContext = {
              headers: [],
              data: [],
              selectionKind: componentId === 'table-column' ? 'column' : 'table',
              selectionLabel: `当前选中：${effectiveTarget.name}`,
              tableNodeId: effectiveTarget.parent?.type === 'FRAME' ? effectiveTarget.parent.id : effectiveTarget.id
            };
          }
          } catch (e) {
            console.error('[tableContext] Failed to build tableContext:', e);
            // 即使出错也提供基础上下文
            tableContext = {
              headers: [],
              data: [],
              selectionKind: componentId === 'table-column' ? 'column' : 'table',
              selectionLabel: `当前选中：${effectiveTarget.name}`,
              tableNodeId: effectiveTarget.parent?.type === 'FRAME' ? effectiveTarget.parent.id : effectiveTarget.id
            };
          }
        }

        // 缓存有效的表格上下文，供 handleRequestTableContext 在选区清空时兜底
        // 保留 selectedColumnIndex：edit_table 后 Figma 可能自动重选整表（无列索引），不覆盖之前的列索引
        if (tableContext && tableContext.headers.length > 0) {
          if (typeof lastTableContextCache?.selectedColumnIndex === 'number' &&
              typeof tableContext.selectedColumnIndex !== 'number') {
            tableContext.selectedColumnIndex = lastTableContextCache.selectedColumnIndex;
          }
          lastTableContextCache = tableContext;
        }

        figma.ui.postMessage({
          type: 'selection-update',
          data: {
            selectionCount: selection.length,
            canvasHint,
            componentId,
            params: normalizedParams,
            childComponentId, // Optional: for columns
            nodeName: effectiveTarget.name,
            tableContext,
            mergeRole: findMergeRoleFromNode(node),
            isAiGeneratedMergedCell: isAiGeneratedMergedCellSelection(node)
          }
        });

        // Also emit figma-instance-info so the Docs tab can show the Figma key.
        // For figma-component, read from params; for other INSTANCE nodes, read from mainComponent.
        if (effectiveTarget.type === 'INSTANCE') {
          const inst = effectiveTarget as InstanceNode;
          const mainComponent = await resolveInstanceMainComponentNode(inst);
          const key = mainComponent?.key ?? '';
          const compName = mainComponent?.name ?? '';
          const setName = mainComponent?.parent?.type === 'COMPONENT_SET'
            ? (mainComponent.parent as ComponentSetNode).name
            : '';
          if (key) {
            figma.ui.postMessage({
              type: 'figma-instance-info',
              data: { componentKey: key, componentName: compName, componentSetName: setName, nodeName: inst.name, componentNodeId: inst.id }
            });
          } else {
            figma.ui.postMessage({ type: 'figma-instance-info', data: null });
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
          } else {
            figma.ui.postMessage({ type: 'figma-instance-info', data: null });
          }
        } else {
          let sentInstanceInfo = false;
          if (node.type === 'INSTANCE') {
            const inst = node as InstanceNode;
            const mainComponent = await resolveInstanceMainComponentNode(inst);
            const key = mainComponent?.key ?? '';
            const compName = mainComponent?.name ?? '';
            const setName = mainComponent?.parent?.type === 'COMPONENT_SET'
              ? (mainComponent.parent as ComponentSetNode).name
              : '';
            if (key) {
              figma.ui.postMessage({
                type: 'figma-instance-info',
                data: { componentKey: key, componentName: compName, componentSetName: setName, nodeName: inst.name, componentNodeId: inst.id }
              });
              sentInstanceInfo = true;
            }
          }
          if (!sentInstanceInfo) {
            figma.ui.postMessage({ type: 'figma-instance-info', data: null });
          }
        }

        return;
      }
    }
  }
  // Clear selection if not an AI container
  figma.ui.postMessage({ type: 'selection-cleared', data: { count: 0, canvasHint } });

  // If the selected node is a plain Figma INSTANCE/COMPONENT (not AI-managed), send its key info
  if (selection.length === 1 && (selection[0].type === 'INSTANCE' || selection[0].type === 'COMPONENT' || selection[0].type === 'COMPONENT_SET')) {
    const node = selection[0];
    let key = '';
    let compName = node.name;
    let setName = '';

    if (node.type === 'INSTANCE') {
      const inst = node as InstanceNode;
      const mainComponent = await resolveInstanceMainComponentNode(inst);
      key = mainComponent?.key ?? '';
      compName = mainComponent?.name ?? '';
      setName = mainComponent?.parent?.type === 'COMPONENT_SET'
        ? (mainComponent.parent as ComponentSetNode).name
        : '';
    } else if (node.type === 'COMPONENT') {
      key = (node as ComponentNode).key;
      setName = node.parent?.type === 'COMPONENT_SET'
        ? (node.parent as ComponentSetNode).name
        : '';
    } else if (node.type === 'COMPONENT_SET') {
      key = (node as ComponentSetNode).key;
      setName = node.name;
    }

    figma.ui.postMessage({
      type: 'figma-instance-info',
      data: { componentKey: key, componentName: compName, componentSetName: setName, nodeName: node.name, componentNodeId: node.id }
    });
  } else {
    figma.ui.postMessage({
      type: 'figma-instance-info',
      data: null
    });
  }
}

// Listen for selection changes
figma.on('selectionchange', checkSelection);

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

let allPagesReadyPromise: Promise<void> | null = null;

function ensureAllPagesLoaded(): Promise<void> {
  if (!allPagesReadyPromise) {
    allPagesReadyPromise = figma.loadAllPagesAsync();
  }
  return allPagesReadyPromise;
}


// Wrap in async init to support dynamic-page mode (same pattern as SmartTable)
async function initDocumentChangeListener() {
  await ensureAllPagesLoaded();
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
        
        (async () => {
          try {
            for (const { form, sourceNodes } of formsToSync.values()) {
              await alignFormLabelWidths(form, sourceNodes);
            }
          } finally {
            formLabelSyncInProgress = false;
            formLabelSyncMuteUntil = Date.now() + 200;
          }
        })();
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
    const isLayoutChange = properties.includes('layoutGrow') || properties.includes('counterAxisSizingMode') || properties.includes('primaryAxisSizingMode');
    const isTextChange = properties.includes('characters');
    if (!isSizeChange && !isTextChange && !isLayoutChange) continue;

    const cell = findTableCellFromNode(node);

    if (!cell && (properties.includes('width') || isLayoutChange)) {
      let table: FrameNode | null = null;
      if (isTableColumnNode(node)) {
        table = findTableFrameFromNode(node);
      } else if (isTableNode(node)) {
        table = node as FrameNode;
      }
      if (table) {
        const columns = getTableColumns(table);
        for (const col of columns) {
          for (let ri = 0; ri < col.children.length; ri++) {
            const child = col.children[ri];
            if (!child || child.removed) continue;
            if (child.type !== 'FRAME' && child.type !== 'INSTANCE') continue;
            const mergeRole = child.getPluginData('merge-role');
            if (mergeRole === 'merge-anchor') {
              restoreMergedAnchorCellHeight(child as SceneNode);
              continue;
            }
            if (mergeRole === 'merge-hidden') continue;
            const cellParams = readNodeParams(child);
            if (cellParams.textDisplay !== 'lineBreak') continue;
            if ('counterAxisSizingMode' in child) {
              try { (child as any).counterAxisSizingMode = 'AUTO'; } catch {}
            }
            if ('layoutSizingVertical' in child) {
              try { (child as any).layoutSizingVertical = 'HUG'; } catch {}
            }
            const key = `${table.id}:${ri}`;
            const existing = pendingTableRowSync.get(key);
            if (existing) {
              if (!existing.sourceNodes.includes(child)) {
                existing.sourceNodes.push(child);
              }
            } else {
              pendingTableRowSync.set(key, { table, rowIndex: ri, sourceNodes: [child] });
            }
          }
        }
        continue;
      }
    }

    if (!cell) continue;
    const column = cell.parent;
    if (!isTableColumnNode(column)) continue;
    const table = findTableFrameFromNode(column);
    if (!table) continue;

    const rowIndex = column.children.indexOf(cell as SceneNode);
    if (rowIndex < 0) continue;

    const hasHeightChange = properties.includes('height');
    const hasWidthOnly = !hasHeightChange && properties.includes('width');
    const cellParams = readNodeParams(cell);
    const isCellLineBreak = cellParams.textDisplay === 'lineBreak';
    const mergeRole = cell.getPluginData('merge-role');

    if (mergeRole === 'merge-anchor') {
      restoreMergedAnchorCellHeight(cell as SceneNode);
      continue;
    }
    if (mergeRole === 'merge-hidden') {
      continue;
    }

    if (hasWidthOnly && !isCellLineBreak) continue;

    if (isCellLineBreak && (isTextChange || hasWidthOnly)) {
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
    setTableRowSyncInProgress(true);
    const rowsToSync = pendingTableRowSync;
    pendingTableRowSync = new Map();
    tableRowSyncTimer = null;
    try {
      for (const { table, rowIndex, sourceNodes } of rowsToSync.values()) {
        alignTableRowHeights(table, rowIndex, sourceNodes);
      }
    } finally {
      setTableRowSyncInProgress(false);
      tableRowSyncMuteUntil = Date.now() + 200;
    }
  }, 120);

});  // end figma.on documentchange
}
initDocumentChangeListener();


function toPositiveNumber(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
}


let generationLockEnabled = false;
const generationLockedNodeIds = new Set<string>();

const LOCKABLE_COMPONENT_IDS = new Set(['page', 'layout', 'card', 'table', 'table-column']);

function lockGeneratedContainerNode(node: BaseNode, componentId?: string) {
  // Lock mechanism temporarily disabled for debugging
  if (!generationLockEnabled) return;
  if (!componentId || !LOCKABLE_COMPONENT_IDS.has(componentId)) return;
  if (!('locked' in node)) return;

  // Skip actual locking — just track the ID for debugging
  if ('id' in node) {
    generationLockedNodeIds.add(node.id);
  }
}

async function unlockGeneratedContainerNodes() {
  // Helper: recursively unlock a node and all its descendants.
  let deepUnlockCount = 0;
  const deepUnlock = (node: BaseNode) => {
    if ('locked' in node && (node as SceneNode).locked) {
      try { (node as SceneNode).locked = false; deepUnlockCount++; } catch {}
    }
    if ('children' in node) {
      for (const child of (node as any).children) {
        deepUnlock(child);
      }
    }
  };

  const ids = Array.from(generationLockedNodeIds);
  generationLockedNodeIds.clear();

  // 1. Unlock tracked nodes by ID (deep — unlock children too).
  await Promise.all(
    ids.map(async (id) => {
      let node: BaseNode | null = null;
      try {
        node = await figma.getNodeByIdAsync(id);
      } catch (e) {
        console.warn('Failed to resolve generated container node:', e);
        return;
      }
      if (!node) return;
      deepUnlock(node);
    })
  );
  
  console.log('[gen-lock] deep unlocked', deepUnlockCount, 'nodes');

  // 2. Fallback: scan current page for any AI-component nodes that are still locked.
  try {
    const lockedAiNodes = figma.currentPage.findAll((n) =>
      'locked' in n && (n as SceneNode).locked &&
      'getPluginData' in n && (n as SceneNode).getPluginData('is-ai-component') === 'true'
    );
    for (const n of lockedAiNodes) {
      deepUnlock(n);
    }
  } catch (e) {
    console.warn('Fallback unlock scan failed:', e);
  }
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

function getTextNodeFontNames(node: TextNode): FontName[] {
    const unique = new Map<string, FontName>();
    const add = (font: FontName) => {
        unique.set(`${font.family}::${font.style}`, font);
    };
    if (node.fontName !== figma.mixed) {
        add(node.fontName as FontName);
        return Array.from(unique.values());
    }
    const len = node.characters.length;
    if (len <= 0) {
        add({ family: 'Inter', style: 'Regular' });
        return Array.from(unique.values());
    }
    for (let i = 0; i < len; i += 1) {
        const font = node.getRangeFontName(i, i + 1);
        if (font !== figma.mixed) add(font as FontName);
    }
    if (unique.size === 0) {
        add({ family: 'Inter', style: 'Regular' });
    }
    return Array.from(unique.values());
}

function findStatusTagLabelNode(root: SceneNode, preferredLabel: string): TextNode | null {
    const allTextNodes =
        'findAll' in root
            ? (root.findAll((node) => node.type === 'TEXT') as TextNode[])
            : root.type === 'TEXT'
                ? [root]
                : [];
    if (allTextNodes.length === 0) return null;

    const normalizedPreferred = String(preferredLabel || '').trim();
    const markedNode = allTextNodes.find((node) => {
        try {
            return node.getPluginData(STATUS_TAG_LABEL_NODE_KEY) === 'true';
        } catch {
            return false;
        }
    });
    if (markedNode) return markedNode;

    const reservedTokens = new Set([
        'success', 'warning', 'error', 'stop', 'processing', 'loading', 'waiting',
        'default', 'hover', 'active', 'true', 'false',
        'l1', 'l2', 'l3',
        'success 成功', 'warning 告警', 'error 错误', 'stop 停止',
        'processing 等待中', 'loading 加载中', 'waiting 待启用',
        'default 默认', 'hover 悬浮', 'active 点击',
        'l1 一级标签', 'l2 二级标签', 'l3 三级标签'
    ]);
    const normalizeToken = (value: unknown) => String(value || '').trim().toLowerCase();

    if (normalizedPreferred) {
        const match = allTextNodes.find((node) => {
            const nodeName = String(node.name || '').trim();
            const nodeChars = String(node.characters || '').trim();
            return nodeName === normalizedPreferred || nodeChars === normalizedPreferred;
        });
        if (match) return match;
    }

    let bestNode: TextNode | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const node of allTextNodes) {
        const nodeName = String(node.name || '').trim();
        const nodeChars = String(node.characters || '').trim();
        const normalizedName = normalizeToken(nodeName);
        const normalizedChars = normalizeToken(nodeChars);
        let score = 0;
        if (normalizedPreferred) {
            const normalizedPreferredToken = normalizeToken(normalizedPreferred);
            if (normalizedChars === normalizedPreferredToken) score += 1000;
            if (normalizedName === normalizedPreferredToken) score += 900;
            if (normalizedName.includes(normalizedPreferredToken)) score += 120;
            if (normalizedChars.includes(normalizedPreferredToken)) score += 80;
        }
        if (normalizedName.includes('label') || normalizedName.includes('text') || normalizedName.includes('content')) score += 80;
        if (nodeChars.length > 0) score += Math.min(nodeChars.length, 24);
        if (nodeChars.length > 1) score += 24;
        if (reservedTokens.has(normalizedChars)) score -= 400;
        if (reservedTokens.has(normalizedName)) score -= 300;
        if (nodeChars.length === 1) score -= 40;
        if (score > bestScore) {
            bestScore = score;
            bestNode = node;
        }
    }

    return bestNode || allTextNodes[0] || null;
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
        const labelNode = findStatusTagLabelNode(root, explicitLabel);
        const nextLabel = explicitLabel || resolvePrimaryTagText(params);
        if (labelNode) {
            await updateTextNodeCharacters(labelNode, nextLabel);
            markStatusTagLabelNode(root, labelNode);
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
    const statusThemeLabel = family === 'status'
        ? (
            resolveStatusTagThemeFromSemantic(
                params.statusSemantic ??
                params.statusIntent ??
                params.semantic ??
                params.intent
            ) ||
            resolveStatusTagThemeFromSemantic(resolvePrimaryTagText(params)) ||
            resolveStatusTagThemeVariantLabel(params.statusTheme ?? params.theme)
        )
        : null;
    if (family === 'status' && statusThemeLabel === 'Waiting 待启用') {
        return createTagFallbackNode({
            ...params,
            componentToken: componentToken || STATUS_TAG_COMPONENT_TOKEN
        });
    }
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
                clearTemplateNodeMarker(cloned as SceneNode);
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
            await applyTagTemplateContent(detached, params, family);
            try {
                const template = detached.clone();
                registerTemplateNode(cacheKey, 'tag-template', template);
                TAG_TEMPLATE_CACHE.set(cacheKey, template);
            } catch (e) {
                console.warn('[TagTemplate] failed to cache template', e);
            }
            detached.name = def.name;
            detached.visible = true;
            clearTemplateNodeMarker(detached as SceneNode);
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

    if (family === 'status') {
        return createTagFallbackNode({
            ...params,
            componentToken: componentToken || STATUS_TAG_COMPONENT_TOKEN
        });
    }

    try {
        const fallbackKey = buildTagTemplateCacheKey(componentKey);
        const cachedFallback = TAG_TEMPLATE_CACHE.get(fallbackKey);
        if (cachedFallback) {
            const cloned = cachedFallback.clone();
            cloned.visible = true;
            await applyTagTemplateContent(cloned, params, family);
            cloned.name = def.name;
            clearTemplateNodeMarker(cloned as SceneNode);
            return cloned;
        }
        const fallbackInstance = await createFigmaComponentInstanceFromRef({
            componentKey,
            fallbackName: def.figmaPropertySnapshot?.componentSetName || def.name,
            visible: false
        });
        const detached = fallbackInstance.detachInstance();
        await applyTagTemplateContent(detached, params, family);
        try {
            const template = detached.clone();
            registerTemplateNode(fallbackKey, 'tag-template', template);
            TAG_TEMPLATE_CACHE.set(fallbackKey, template);
        } catch (e) {
            console.warn('[TagTemplate] failed to cache fallback template', e);
        }
        detached.name = def.name;
        detached.visible = true;
        clearTemplateNodeMarker(detached as SceneNode);
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

function resolveStatusTagFallbackPalette(value: unknown): {
    fill: string;
    text: string;
    stroke?: string;
} {
    const theme = resolveStatusTagThemeVariantLabel(value);
    switch (theme) {
        case 'Warning 告警':
            return { fill: '#FFF7E8', text: '#FF7D00' };
        case 'Error 错误':
            return { fill: '#FFECE8', text: '#F53F3F' };
        case 'Stop 停止':
            return { fill: '#F2F3F5', text: '#4E5969' };
        case 'Processing 等待中':
            return { fill: '#E8F3FF', text: '#1664FF' };
        case 'Loading 加载中':
            return { fill: '#E8F3FF', text: '#1664FF' };
        case 'Waiting 待启用':
            return { fill: '#F2F3F5', text: '#4E5969' };
        default:
            return { fill: '#E8FFEA', text: '#00B42A' };
    }
}

async function createStatusTagFallbackNode(params: Record<string, any>): Promise<FrameNode> {
    const metrics = resolveTagMetrics(params.size);
    const label = resolvePrimaryTagText(params);
    const theme =
        resolveStatusTagThemeFromSemantic(
            params.statusSemantic ??
            params.statusIntent ??
            params.semantic ??
            params.intent
        ) ||
        resolveStatusTagThemeFromSemantic(label) ||
        resolveStatusTagThemeVariantLabel(params.statusTheme ?? params.theme);
    const palette = resolveStatusTagFallbackPalette(theme);

    const frame = figma.createFrame();
    frame.layoutMode = 'HORIZONTAL';
    frame.primaryAxisSizingMode = 'AUTO';
    frame.counterAxisSizingMode = 'AUTO';
    frame.counterAxisAlignItems = 'CENTER';
    frame.primaryAxisAlignItems = 'CENTER';
    frame.itemSpacing = 4;
    frame.paddingLeft = metrics.paddingX;
    frame.paddingRight = metrics.paddingX;
    frame.paddingTop = 0;
    frame.paddingBottom = 0;
    frame.cornerRadius = metrics.cornerRadius;
    frame.minHeight = metrics.height;
    frame.fills = [{ type: 'SOLID', color: hexToRgb(palette.fill) }];
    frame.strokes = palette.stroke ? [{ type: 'SOLID', color: hexToRgb(palette.stroke) }] : [];
    frame.strokeWeight = palette.stroke ? 1 : 0;

    const text = figma.createText();
    text.characters = label;
    let appliedTextStyle = false;
    if (theme !== 'Waiting 待启用') {
        appliedTextStyle = await applyTextStyleBinding(text, 'status-tag-text-medium-style-key', { family: 'Inter', style: 'Medium', size: metrics.fontSize });
    }
    if (!appliedTextStyle) {
        const fallbackFont: FontName = theme === 'Waiting 待启用'
            ? { family: 'PingFang SC', style: 'Medium' }
            : { family: 'Inter', style: 'Medium' };
        await figma.loadFontAsync(fallbackFont);
        text.fontName = fallbackFont;
        text.fontSize = metrics.fontSize;
        text.lineHeight = { value: metrics.height, unit: 'PIXELS' };
    }
    text.textAutoResize = 'WIDTH_AND_HEIGHT';
    text.fills = [{ type: 'SOLID', color: hexToRgb(palette.text) }];
    frame.appendChild(text);
    return frame;
}

async function createTagFallbackNode(params: Record<string, any>): Promise<FrameNode> {
    if (resolveTagComponentFamily(params.componentToken) === 'status') {
        return createStatusTagFallbackNode(params);
    }
    return createInspectDrivenTagFallbackNode(params);
}

async function updateTextNodeCharacters(node: TextNode, value: string): Promise<boolean> {
    try {
        const fonts = getTextNodeFontNames(node);
        await Promise.all(fonts.map((font) => figma.loadFontAsync(font)));
        if (node.fontName === figma.mixed && node.characters.length === 0 && fonts[0]) {
            node.fontName = fonts[0];
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
        } else if (binding.transform === 'direction:layout') {
            // "horizontal" → "Horizontal 横向", "vertical" → "Vertical 纵向"
            const dir = String(rawValue).trim().toLowerCase();
            value = dir === 'vertical' ? 'Vertical 纵向' : 'Horizontal 横向';
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

    try {
        return instance.mainComponent || null;
    } catch {
        return null;
    }
}

// [Extracted to code/form/form-queries.ts: resolveFormAlignVariantLabel, getFormLabelWidthRuntimeConfig, resolveFormLabelWidthVariantLabel]

// [Extracted to code/form/form-queries.ts: normalizeFormFieldControlType]

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
            const childNode = await renderFormItemNode(buildFormOpCtx(), formFrame, normalizedParams, instance, columnSpacing, resolvedFormParams);
            formFrame.insertChild(insertIndex, childNode);
            insertIndex += 1;
        }
    }
    // Re-align label-wrap widths after adding/removing form items.
    await alignFormLabelWidths(formFrame);
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
    if (itemNodes.length !== nextItemInstances.length) {
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
            buildFormOpCtx(),
            formFrame,
            normalizedParams,
            syncedInstance,
            columnSpacing,
            resolvedFormParams
        );
        replaceSceneNode(itemNode, childNode);
        // replaceSceneNode inherits layoutGrow/layoutAlign/layoutSizingHorizontal
        // from the OLD node, which overwrites what renderFormItemNode just set.
        // Re-apply fill-mode properties after replacement.
        if (childNode.type === 'FRAME' || childNode.type === 'INSTANCE') {
            // Use inherited params to determine fill mode. syncedInstance.params
            // does NOT have controlWidthMode (it's inherited from form level).
            const inheritedParams = inheritFormFieldParams(resolvedFormParams, syncedInstance).params || {};
            const childIsRow = syncedInstance.componentId === 'form-row';
            const childFillMode = childIsRow
                ? normalizeFormControlWidthMode(inheritedParams.controlWidthMode)
                : resolveFormControlWidthMode(inheritedParams);
            // replaceSceneNode copies old layoutAlign/layoutGrow/layoutSizingHorizontal
            // which overwrites what renderFormItemNode set. Re-apply:
            // 1. STRETCH: when form has FIXED width, ALL children (not just fill) must STRETCH.
            //    Also set layoutSizingHorizontal='FILL' because replaceSceneNode may have
            //    set it to 'HUG' which conflicts with STRETCH.
            if (formFrame.counterAxisSizingMode === 'FIXED' || childFillMode === 'fill') {
                childNode.layoutAlign = 'STRETCH';
                try { (childNode as any).layoutSizingHorizontal = 'FILL'; } catch {}
            }
            // 2. Fill-specific: restore layoutSizingHorizontal, layoutGrow, axis sizing
            if (childFillMode === 'fill') {
                try { (childNode as any).layoutSizingHorizontal = 'FILL'; } catch {}
                childNode.layoutGrow = 1;
                if ('layoutMode' in childNode && childNode.layoutMode === 'HORIZONTAL') {
                    childNode.primaryAxisSizingMode = 'FIXED';
                } else if ('layoutMode' in childNode && childNode.layoutMode === 'VERTICAL') {
                    childNode.counterAxisSizingMode = 'FIXED';
                }
            }
            // 3. Height must always be HUG content. replaceSceneNode may have
            //    inherited a FIXED height from the old node (especially when
            //    switching between horizontal/vertical layouts where the axis
            //    semantics of primaryAxisSizingMode / counterAxisSizingMode swap).
            if ('layoutMode' in childNode && childNode.layoutMode !== 'NONE') {
                try { (childNode as any).layoutSizingVertical = 'HUG'; } catch {}
            }

        }
    }


    // After all replaceSceneNode calls, label-wrap widths may have been reset
    // to content width by Figma layout recalculation. Re-align them immediately
    // instead of waiting for documentchange debounce.
    await alignFormLabelWidths(formFrame);
    writeNodeParams(formFrame, normalizedParams);
    writeComponentInstanceSnapshot(formFrame, patchedInstance);
    return true;
}

function parseDelimitedText(value: unknown, fallback: string[]): string[] {
    if (Array.isArray(value)) {
        const fromArray = value.map((item) => {
            if (item && typeof item === 'object') {
                return String((item as any).label || (item as any).name || (item as any).text || (item as any).value || '').trim();
            }
            return String(item || '').trim();
        }).filter(Boolean);
        return fromArray.length > 0 ? fromArray : fallback;
    }
    if (value && typeof value === 'object') {
        const extracted = String((value as any).label || (value as any).name || (value as any).text || (value as any).value || '').trim();
        return extracted ? [extracted] : fallback;
    }
    const raw = String(value || '').trim();
    const items = raw
        ? raw.split(/[\n\r,，、|\s]+/).map((item) => item.trim()).filter(Boolean)
        : [];
    return items.length > 0 ? items : fallback;
}

function resolveComponentTokenForControl(componentId: string): string {
    const def = COMPONENT_DEFS[componentId] as any;
    const token = typeof def?.figmaPropertySnapshot?.token === 'string' ? def.figmaPropertySnapshot.token.trim() : '';
    return token;
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
    
    // 对于表单相关节点，不从旧节点继承垂直尺寸模式。
    // form-field-control: 避免从模板占位符继承 100px 固定高度
    // form-field / form-row: 切换横向/纵向布局时，layoutMode 改变导致高度轴与宽度轴互换，
    //   旧节点的 layoutSizingVertical / heightSizingMode 映射到新节点会把高度从 HUG 改为 FIXED。
    const formComponentId = oldNode.getPluginData('component-id') || newNode.getPluginData('component-id') || '';
    const isFormFieldControl = oldName === 'form-field-control' || newNode.name === 'form-field-control'
        || formComponentId === 'form-field-control'
        || formComponentId === 'form-field'
        || formComponentId === 'form-row';

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
        await ensureAllPagesLoaded();
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

const COMPONENT_INSTANCE_KEY = 'component-instance';

function shouldStoreComponentInstance(instance: ComponentInstance): boolean {
  return FULL_RERENDER_COMPONENT_IDS.has(instance.componentId);
}

function deepCloneComponentInstance(instance: ComponentInstance): ComponentInstance {
  return JSON.parse(JSON.stringify(instance)) as ComponentInstance;
}

function isAiMergedTableParams(params: Record<string, any> | null | undefined): boolean {
  if (!params || typeof params !== 'object') return false;
  const plan = params.tableRenderPlan;
  return Boolean(
    plan &&
    typeof plan === 'object' &&
    (
      Boolean((plan as any).hasMultiLevelHeader) ||
      (Array.isArray(params.merges) && params.merges.length > 0)
    )
  );
}

function getCellMetaFromSelection(node: BaseNode | null | undefined): { rowIndex: number | null; colIndex: number | null; cell: SceneNode | null } {
  const cell = findTableCellFromNode(node) as SceneNode | null;
  if (!cell) return { rowIndex: null, colIndex: null, cell: null };
  const rawRow = cell.getPluginData('table-cell-row-index');
  const rawCol = cell.getPluginData('table-cell-column-index');
  const rowIndex = Number.isInteger(Number(rawRow)) ? Number(rawRow) : null;
  const colIndex = Number.isInteger(Number(rawCol)) ? Number(rawCol) : null;
  return { rowIndex, colIndex, cell };
}

function getMergeAnchorSnapshot(node: SceneNode): {
  isMergeAnchor: boolean;
  mergeData: Record<string, string>;
  mergedHeight: number;
  anchorWidth: number;
  layoutPositioning: string | null;
  layoutSizingVertical: string | null;
  layoutSizingHorizontal: string | null;
  layoutAlign: string | null;
  counterAxisSizingMode: string | null;
  primaryAxisSizingMode: string | null;
} {
  const mergeData: Record<string, string> = {};
  const explicitRole = node.getPluginData('merge-role');
  const parentColumn = node.parent && node.parent.type === 'FRAME' ? (node.parent as FrameNode) : null;
  const hiddenSiblings = parentColumn
    ? parentColumn.children.filter((child) =>
        child !== node &&
        child.getPluginData('merge-role') === 'merge-hidden' &&
        child.getPluginData('merge-anchor-id') === node.id
      )
    : [];
  const isMergeAnchor = explicitRole === 'merge-anchor' || hiddenSiblings.length > 0;
  if (!isMergeAnchor) {
    return {
      isMergeAnchor: false,
      mergeData,
      mergedHeight: 0,
      anchorWidth: 0,
      layoutPositioning: null,
      layoutSizingVertical: null,
      layoutSizingHorizontal: null,
      layoutAlign: null,
      counterAxisSizingMode: null,
      primaryAxisSizingMode: null,
    };
  }

  const directKeys = [
    'merge-role',
    'merge-row-span',
    'merge-start-index',
    'merge-end-index',
    'merge-original-y',
    'merge-original-height',
    'merge-original-sizing-v',
    'merge-original-layout-align',
    'merge-hidden-ids'
  ];
  for (const key of directKeys) {
    const value = node.getPluginData(key);
    if (value) mergeData[key] = value;
  }

  const rowSpan = Math.max(
    1,
    Number(mergeData['merge-row-span'] || hiddenSiblings.length + 1 || 1)
  );
  const fallbackOriginalHeight = (() => {
    const hiddenHeight = hiddenSiblings.find((child) => 'height' in child && (child as any).height > 0);
    if (hiddenHeight && 'height' in hiddenHeight) {
      return Math.max(1, Math.round((hiddenHeight as any).height || 0));
    }
    const itemSpacing = parentColumn && parentColumn.layoutMode === 'VERTICAL'
      ? Math.max(0, Math.round(Number(parentColumn.itemSpacing || 0)))
      : 0;
    const currentHeight = Math.max(1, Math.round((node as any).height || 1));
    return Math.max(1, Math.round((currentHeight - itemSpacing * (rowSpan - 1)) / rowSpan));
  })();

  mergeData['merge-role'] = 'merge-anchor';
  mergeData['merge-row-span'] = String(rowSpan);
  if (!mergeData['merge-original-height']) {
    mergeData['merge-original-height'] = String(fallbackOriginalHeight);
  }
  if (!mergeData['merge-hidden-ids']) {
    mergeData['merge-hidden-ids'] = JSON.stringify(hiddenSiblings.map((child) => child.id));
  }

  return {
    isMergeAnchor: true,
    mergeData,
    mergedHeight: ('height' in node) ? Math.max(0, Math.round((node as any).height || 0)) : 0,
    anchorWidth: ('width' in node) ? Math.max(0, Math.round((node as any).width || 0)) : 0,
    layoutPositioning: 'layoutPositioning' in node ? String((node as any).layoutPositioning || '') : null,
    layoutSizingVertical: 'layoutSizingVertical' in node ? String((node as any).layoutSizingVertical || '') : null,
    layoutSizingHorizontal: 'layoutSizingHorizontal' in node ? String((node as any).layoutSizingHorizontal || '') : null,
    layoutAlign: 'layoutAlign' in node ? String((node as any).layoutAlign || '') : null,
    counterAxisSizingMode: 'counterAxisSizingMode' in node ? String((node as any).counterAxisSizingMode || '') : null,
    primaryAxisSizingMode: 'primaryAxisSizingMode' in node ? String((node as any).primaryAxisSizingMode || '') : null,
  };
}

function reapplyMergeAnchorFrameSnapshot(
  node: SceneNode,
  snapshot: ReturnType<typeof getMergeAnchorSnapshot> | null | undefined
) {
  if (!snapshot?.isMergeAnchor) return;
  try {
    if ('layoutPositioning' in node && snapshot.layoutPositioning) {
      (node as any).layoutPositioning = snapshot.layoutPositioning;
    }
  } catch {}
  try {
    if ('layoutSizingVertical' in node && snapshot.layoutSizingVertical) {
      (node as any).layoutSizingVertical = snapshot.layoutSizingVertical;
    }
  } catch {}
  try {
    if ('layoutSizingHorizontal' in node && snapshot.layoutSizingHorizontal) {
      (node as any).layoutSizingHorizontal = snapshot.layoutSizingHorizontal;
    }
  } catch {}
  try {
    if ('layoutAlign' in node && snapshot.layoutAlign) {
      (node as any).layoutAlign = snapshot.layoutAlign;
    }
  } catch {}
  try {
    if ('counterAxisSizingMode' in node && snapshot.counterAxisSizingMode) {
      (node as any).counterAxisSizingMode = snapshot.counterAxisSizingMode;
    }
  } catch {}
  try {
    if ('primaryAxisSizingMode' in node && snapshot.primaryAxisSizingMode) {
      (node as any).primaryAxisSizingMode = snapshot.primaryAxisSizingMode;
    }
  } catch {}
  try {
    if ('resize' in node) {
      const width = Math.max(1, snapshot.anchorWidth || Math.round((node as any).width || 1));
      const height = Math.max(1, snapshot.mergedHeight || Math.round((node as any).height || 1));
      (node as any).resize(width, height);
    }
  } catch {}
  restoreMergedAnchorCellHeight(node);
}

function isAiGeneratedMergedCellSelection(node: BaseNode | null | undefined): boolean {
  const tableRoot = findTableFrameFromNode(node as SceneNode | null | undefined);
  if (!tableRoot) return false;
  const tableParams = readNodeParams(tableRoot);
  if (!isAiMergedTableParams(tableParams)) return false;

  const { rowIndex, colIndex } = getCellMetaFromSelection(node);
  if (rowIndex === null || colIndex === null) return false;

  const bodyCells = Array.isArray((tableParams as any)?.tableRenderPlan?.bodyCells)
    ? ((tableParams as any).tableRenderPlan.bodyCells as any[])
    : [];
  for (const cell of bodyCells) {
    if (!cell || cell.isMergeHidden) continue;
    const startRow = Number(cell.row ?? 0);
    const startCol = Number(cell.col ?? 0);
    const rowspan = Math.max(1, Number(cell.rowspan || 1));
    const colspan = Math.max(1, Number(cell.colspan || 1));
    if (rowspan <= 1 && colspan <= 1) continue;
    if (
      rowIndex >= startRow &&
      rowIndex < startRow + rowspan &&
      colIndex >= startCol &&
      colIndex < startCol + colspan
    ) {
      return true;
    }
  }

  const merges = Array.isArray((tableParams as any)?.merges) ? ((tableParams as any).merges as any[]) : [];
  return merges.some((merge) => {
    if (!merge || String(merge.section || 'body') !== 'body') return false;
    const startRow = Number(merge.row ?? 0);
    const startCol = Number(merge.col ?? 0);
    const rowspan = Math.max(1, Number(merge.rowspan || 1));
    const colspan = Math.max(1, Number(merge.colspan || 1));
    if (rowspan <= 1 && colspan <= 1) return false;
    return (
      rowIndex >= startRow &&
      rowIndex < startRow + rowspan &&
      colIndex >= startCol &&
      colIndex < startCol + colspan
    );
  });
}

type AiTableCellRef = {
  row: number;
  col: number;
  cell: SceneNode;
};

type AiMergePatchResult =
  | { ok: true; snapshot: ComponentInstance; row: number; col: number; message: string }
  | { ok: false; reason: string };

const getMergeRowEnd = (merge: Pick<NormalizedTableMergeSpec, 'row' | 'rowspan'>): number =>
  merge.row + Math.max(1, Number(merge.rowspan || 1)) - 1;

const getMergeColEnd = (merge: Pick<NormalizedTableMergeSpec, 'col' | 'colspan'>): number =>
  merge.col + Math.max(1, Number(merge.colspan || 1)) - 1;

const makeMergeIdentity = (merge: Pick<NormalizedTableMergeSpec, 'section' | 'row' | 'col' | 'rowspan' | 'colspan' | 'id'>): string =>
  `${merge.section}:${merge.id || ''}:${merge.row}:${merge.col}:${merge.rowspan}:${merge.colspan}`;

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart <= bEnd && bStart <= aEnd;

const getSnapshotColumns = (snapshot: ComponentInstance): ComponentInstance[] =>
  Array.isArray(snapshot.children)
    ? snapshot.children.filter((child) => child?.componentId === 'table-column')
    : [];

const getSnapshotBodyChildren = (column: ComponentInstance): ComponentInstance[] =>
  Array.isArray(column.children)
    ? column.children.filter((child) => child?.componentId !== 'table-header-cell')
    : [];

function extractTableCellValueFromParams(params: Record<string, any> | undefined): unknown {
  if (!params || typeof params !== 'object') return '';
  if (params.text !== undefined) return params.text;
  if (params.value !== undefined) return params.value;
  if (params.label !== undefined) return params.label;
  if (params.content !== undefined) return params.content;
  if (params.tagText !== undefined) return params.tagText;
  return '';
}

function normalizeCellText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const record = value as Record<string, any>;
    return String(record.text ?? record.value ?? record.label ?? record.content ?? record.tagText ?? '');
  }
  return String(value);
}

function setCellParamsText(params: Record<string, any>, value: unknown): Record<string, any> {
  const text = normalizeCellText(value);
  const next = { ...params };
  if ('text' in next || !('value' in next)) next.text = text;
  if ('value' in next) next.value = text;
  if ('label' in next) next.label = text;
  if ('content' in next) next.content = text;
  if ('tagText' in next) next.tagText = text;
  return next;
}

function extractRowsFromTableSnapshot(snapshot: ComponentInstance): unknown[][] {
  const columns = getSnapshotColumns(snapshot);
  const bodyChildrenByColumn = columns.map(getSnapshotBodyChildren);
  const rowCount = Math.max(
    Number(snapshot.params?.rowCount || 0),
    ...bodyChildrenByColumn.map((children) => children.length),
    0
  );
  const rows: unknown[][] = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    rows.push(bodyChildrenByColumn.map((children) => extractTableCellValueFromParams(children[rowIndex]?.params)));
  }
  return rows;
}

function getColumnTypesFromTableSnapshot(snapshot: ComponentInstance): string[] {
  const mapComponentId = (componentId: string | undefined): string => {
    if (componentId === 'table-cell-input') return 'Input';
    if (componentId === 'table-cell-select') return 'Select';
    if (componentId === 'table-cell-action-icon') return 'ActionIcon';
    if (componentId === 'table-cell-action-text') return 'ActionText';
    if (componentId === 'table-cell-avatar') return 'Avatar';
    if (componentId === 'table-cell-tag') return 'StatusTag';
    if (componentId === 'table-cell-number-unit') return 'Number(unit)';
    return 'Text';
  };
  return getSnapshotColumns(snapshot).map((column) => {
    const firstBody = getSnapshotBodyChildren(column)[0];
    return mapComponentId(firstBody?.componentId);
  });
}

function getColumnWidthsFromTableSnapshot(snapshot: ComponentInstance): number[] {
  return getSnapshotColumns(snapshot).map((column) => Number(column.params?.width || 0));
}

function writeRowsToTableSnapshot(snapshot: ComponentInstance, rows: unknown[][]): ComponentInstance {
  const nextSnapshot = deepCloneComponentInstance(snapshot);
  const columns = getSnapshotColumns(nextSnapshot);
  columns.forEach((column, colIndex) => {
    const bodyChildren = getSnapshotBodyChildren(column);
    bodyChildren.forEach((child, rowIndex) => {
      const nextValue = rows[rowIndex]?.[colIndex] ?? '';
      child.params = setCellParamsText(child.params || {}, nextValue);
    });
  });
  return nextSnapshot;
}

function normalizeTableMergeSpecs(rawMerges: unknown): NormalizedTableMergeSpec[] {
  if (!Array.isArray(rawMerges)) return [];
  return rawMerges
    .filter((item): item is Record<string, any> => Boolean(item) && typeof item === 'object')
    .map((item, index) => {
      const section = String(item.section || '').trim().toLowerCase() === 'header' ? 'header' : 'body';
      const row = Number.isInteger(Number(item.row)) ? Math.max(0, Number(item.row)) : 0;
      const col = Number.isInteger(Number(item.col)) ? Math.max(0, Number(item.col)) : 0;
      const rowspan = Number.isInteger(Number(item.rowspan)) ? Math.max(1, Number(item.rowspan)) : 1;
      const colspan = Number.isInteger(Number(item.colspan)) ? Math.max(1, Number(item.colspan)) : 1;
      const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `merge-${section}-${index + 1}`;
      return {
        ...item,
        section,
        row,
        col,
        rowspan,
        colspan,
        id,
      } as NormalizedTableMergeSpec;
    });
}

function findCoveringBodyMerge(
  merges: NormalizedTableMergeSpec[],
  row: number,
  col: number
): NormalizedTableMergeSpec | null {
  return merges.find((merge) => {
    if (merge.section !== 'body') return false;
    if (merge.rowspan <= 1 && merge.colspan <= 1) return false;
    return (
      row >= merge.row &&
      row <= getMergeRowEnd(merge) &&
      col >= merge.col &&
      col <= getMergeColEnd(merge)
    );
  }) || null;
}

function isContinuousIntegerSet(values: Set<number>, start: number, end: number): boolean {
  for (let value = start; value <= end; value += 1) {
    if (!values.has(value)) return false;
  }
  return true;
}

function patchAiTableSnapshotForMerge(
  snapshot: ComponentInstance,
  tableParams: Record<string, any>,
  selectedRefs: AiTableCellRef[]
): AiMergePatchResult {
  if (selectedRefs.length < 2) {
    return { ok: false, reason: '请至少选中 2 个单元格。' };
  }

  const rows = extractRowsFromTableSnapshot(snapshot);
  const headerRows = Array.isArray(tableParams.headerRows) && tableParams.headerRows.length > 0
    ? tableParams.headerRows
    : Array.isArray(tableParams.headers)
      ? [tableParams.headers]
      : [];
  const allMerges = normalizeTableMergeSpecs(tableParams.merges);
  const bodyMerges = allMerges.filter((merge) => merge.section === 'body');
  const selectedMergeMap = new Map<string, NormalizedTableMergeSpec>();
  for (const ref of selectedRefs) {
    const covering = findCoveringBodyMerge(bodyMerges, ref.row, ref.col);
    if (covering) selectedMergeMap.set(makeMergeIdentity(covering), covering);
  }

  let targetRowStart: number;
  let targetRowEnd: number;
  let targetColStart: number;
  let targetColEnd: number;
  let baseMerge: NormalizedTableMergeSpec | null = null;

  if (selectedMergeMap.size > 1) {
    return { ok: false, reason: '暂不支持一次合并多个已有合并块，请分步处理。' };
  }

  if (selectedMergeMap.size === 1) {
    baseMerge = Array.from(selectedMergeMap.values())[0];
    const baseRowStart = baseMerge.row;
    const baseRowEnd = getMergeRowEnd(baseMerge);
    targetColStart = baseMerge.col;
    targetColEnd = getMergeColEnd(baseMerge);
    targetRowStart = Math.min(baseRowStart, ...selectedRefs.map((ref) => ref.row));
    targetRowEnd = Math.max(baseRowEnd, ...selectedRefs.map((ref) => ref.row));

    const selectedOutsideRows = new Set(
      selectedRefs
        .map((ref) => ref.row)
        .filter((row) => row < baseRowStart || row > baseRowEnd)
    );
    if (selectedOutsideRows.size === 0) {
      return { ok: false, reason: '没有选中需要并入的新行。' };
    }
    if (targetRowStart < baseRowStart) {
      if (!selectedOutsideRows.has(baseRowStart - 1) || !isContinuousIntegerSet(selectedOutsideRows, targetRowStart, baseRowStart - 1)) {
        return { ok: false, reason: '只能把相邻且连续的行并入已有合并块。' };
      }
    }
    if (targetRowEnd > baseRowEnd) {
      if (!selectedOutsideRows.has(baseRowEnd + 1) || !isContinuousIntegerSet(selectedOutsideRows, baseRowEnd + 1, targetRowEnd)) {
        return { ok: false, reason: '只能把相邻且连续的行并入已有合并块。' };
      }
    }
  } else {
    targetRowStart = Math.min(...selectedRefs.map((ref) => ref.row));
    targetRowEnd = Math.max(...selectedRefs.map((ref) => ref.row));
    targetColStart = Math.min(...selectedRefs.map((ref) => ref.col));
    targetColEnd = Math.max(...selectedRefs.map((ref) => ref.col));
    if ((targetRowEnd - targetRowStart + 1) * (targetColEnd - targetColStart + 1) !== selectedRefs.length) {
      return { ok: false, reason: '请选择完整且连续的矩形区域。' };
    }
  }

  const targetRowspan = targetRowEnd - targetRowStart + 1;
  const targetColspan = targetColEnd - targetColStart + 1;
  if (targetRowspan <= 1 && targetColspan <= 1) {
    return { ok: false, reason: '请选择至少 2 个单元格进行合并。' };
  }

  const baseLabel = baseMerge
    ? (rows[baseMerge.row]?.[baseMerge.col] ?? '')
    : (rows[targetRowStart]?.[targetColStart] ?? '');
  const trimmedMergeLabels: Array<{ row: number; col: number; value: unknown }> = [];
  const nextBodyMerges: NormalizedTableMergeSpec[] = [];
  const baseIdentity = baseMerge ? makeMergeIdentity(baseMerge) : '';

  for (const merge of bodyMerges) {
    if (baseMerge && makeMergeIdentity(merge) === baseIdentity) continue;

    const mergeRowStart = merge.row;
    const mergeRowEnd = getMergeRowEnd(merge);
    const mergeColStart = merge.col;
    const mergeColEnd = getMergeColEnd(merge);
    const intersectsTarget =
      rangesOverlap(mergeRowStart, mergeRowEnd, targetRowStart, targetRowEnd) &&
      rangesOverlap(mergeColStart, mergeColEnd, targetColStart, targetColEnd);

    if (!intersectsTarget) {
      nextBodyMerges.push(merge);
      continue;
    }

    if (mergeColStart !== targetColStart || mergeColEnd !== targetColEnd) {
      return { ok: false, reason: '目标区域会部分覆盖其它合并单元格，请选择完整的合并块。' };
    }

    const overlapStart = Math.max(mergeRowStart, targetRowStart);
    const overlapEnd = Math.min(mergeRowEnd, targetRowEnd);
    if (overlapStart <= mergeRowStart && overlapEnd >= mergeRowEnd) {
      continue;
    }
    if (overlapStart === mergeRowStart) {
      const nextRow = overlapEnd + 1;
      const nextRowspan = mergeRowEnd - nextRow + 1;
      if (nextRowspan >= 1) {
        trimmedMergeLabels.push({ row: nextRow, col: merge.col, value: rows[merge.row]?.[merge.col] ?? '' });
      }
      if (nextRowspan > 1) {
        nextBodyMerges.push({
          ...merge,
          row: nextRow,
          rowspan: nextRowspan,
        });
      }
      continue;
    }
    if (overlapEnd === mergeRowEnd) {
      const nextRowspan = overlapStart - mergeRowStart;
      if (nextRowspan > 1) {
        nextBodyMerges.push({
          ...merge,
          rowspan: nextRowspan,
        });
      }
      continue;
    }
    return { ok: false, reason: '不能从已有合并块中间切出单独行，请选择相邻边缘行。' };
  }

  const nextMerge: NormalizedTableMergeSpec = {
    ...(baseMerge || {}),
    section: 'body',
    row: targetRowStart,
    col: targetColStart,
    rowspan: targetRowspan,
    colspan: targetColspan,
    id: baseMerge?.id || `manual-body-${Date.now()}`,
    source: 'manual-ai-merge',
  };
  nextBodyMerges.push(nextMerge);

  for (let row = targetRowStart; row <= targetRowEnd; row += 1) {
    if (!rows[row]) rows[row] = [];
    for (let col = targetColStart; col <= targetColEnd; col += 1) {
      if (row === targetRowStart && col === targetColStart) continue;
      rows[row][col] = '';
    }
  }
  if (!rows[targetRowStart]) rows[targetRowStart] = [];
  rows[targetRowStart][targetColStart] = baseLabel;
  for (const item of trimmedMergeLabels) {
    if (!rows[item.row]) rows[item.row] = [];
    rows[item.row][item.col] = item.value;
  }

  const nextMerges = [
    ...allMerges.filter((merge) => merge.section === 'header'),
    ...nextBodyMerges.sort((a, b) => a.row - b.row || a.col - b.col),
  ];
  const normalizedGrid = buildNormalizedTableGrid({
    headerRows,
    rows,
    columnTypes: Array.isArray(tableParams.columnTypes) ? tableParams.columnTypes : getColumnTypesFromTableSnapshot(snapshot),
    columnWidths: Array.isArray(tableParams.columnWidths) ? tableParams.columnWidths : getColumnWidthsFromTableSnapshot(snapshot),
    ...(tableParams.rowAction ? { rowAction: tableParams.rowAction } : {}),
    merges: nextMerges,
    autoMergeRules: Array.isArray(tableParams.autoMergeRules) ? tableParams.autoMergeRules : [],
  });
  const validationErrors = validateNormalizedTableGrid(normalizedGrid);
  if (validationErrors.length > 0) {
    return { ok: false, reason: validationErrors[0]?.message || '合并区域校验失败。' };
  }

  const patchedSnapshot = writeRowsToTableSnapshot(snapshot, rows);
  patchedSnapshot.params = {
    ...patchedSnapshot.params,
    columnCount: normalizedGrid.columnCount,
    rowCount: normalizedGrid.bodyRowCount,
    headers: normalizedGrid.leafHeaders,
    headerRows: normalizedGrid.headerRows,
    merges: normalizedGrid.merges,
    autoMergeRules: normalizedGrid.autoMergeRules,
    tableRenderPlan: buildTableRenderPlan(normalizedGrid),
  };

  return {
    ok: true,
    snapshot: patchedSnapshot,
    row: targetRowStart,
    col: targetColStart,
    message: baseMerge ? '已扩展 AI 合并单元格' : '已合并 AI 表格单元格',
  };
}

async function mergeSelectedAiTableCells(cellNodes: SceneNode[]): Promise<{
  handled: boolean;
  ok: boolean;
  reason?: string;
  anchorCell?: SceneNode;
}> {
  const refs: AiTableCellRef[] = [];
  let tableRoot: FrameNode | null = null;
  for (const node of cellNodes) {
    const currentTable = findTableFrameFromNode(node);
    if (!currentTable) return { handled: false, ok: false };
    const tableParams = readNodeParams(currentTable);
    if (!isAiMergedTableParams(tableParams)) return { handled: false, ok: false };
    if (!tableRoot) {
      tableRoot = currentTable;
    } else if (tableRoot.id !== currentTable.id) {
      return { handled: true, ok: false, reason: '请选择同一张 AI 合并表格内的单元格。' };
    }
    const { rowIndex, colIndex, cell } = getCellMetaFromSelection(node);
    if (rowIndex === null || colIndex === null || !cell) {
      return { handled: true, ok: false, reason: '未能识别选中单元格的逻辑行列。' };
    }
    refs.push({ row: rowIndex, col: colIndex, cell });
  }

  if (!tableRoot) return { handled: false, ok: false };
  const tableParams = readNodeParams(tableRoot);
  const snapshot = readComponentInstanceSnapshot(tableRoot);
  if (!snapshot || snapshot.componentId !== 'table') {
    return { handled: true, ok: false, reason: '当前 AI 合并表格缺少可重建快照，请重新生成后再试。' };
  }

  const patch = patchAiTableSnapshotForMerge(snapshot, tableParams, refs);
  if (!patch.ok) {
    return { handled: true, ok: false, reason: patch.reason };
  }

  const newRoot = await renderComponent(patch.snapshot, { isRoot: false });
  writeComponentInstanceSnapshot(newRoot, patch.snapshot);
  writeNodeParams(newRoot, patch.snapshot.params || {});
  if (!replaceSceneNode(tableRoot, newRoot)) {
    try { newRoot.remove(); } catch {}
    return { handled: true, ok: false, reason: '表格重建未成功。' };
  }

  const anchorCell = findLogicalBodyCellNode(newRoot, patch.row, patch.col) || newRoot;
  figma.currentPage.selection = [anchorCell];
  checkSelection();
  return { handled: true, ok: true, anchorCell, reason: patch.message };
}

function copyPluginDataKeys(source: SceneNode, target: SceneNode, keys: string[]) {
  for (const key of keys) {
    const value = source.getPluginData(key);
    if (value) {
      target.setPluginData(key, value);
    } else {
      target.setPluginData(key, '');
    }
  }
}

function syncTableCellFrameFromRenderedSource(target: FrameNode, source: FrameNode) {
  try { target.layoutMode = source.layoutMode; } catch {}
  try { target.primaryAxisSizingMode = source.primaryAxisSizingMode; } catch {}
  try { target.counterAxisSizingMode = source.counterAxisSizingMode; } catch {}
  try { target.primaryAxisAlignItems = source.primaryAxisAlignItems; } catch {}
  try { target.counterAxisAlignItems = source.counterAxisAlignItems; } catch {}
  try { target.itemSpacing = source.itemSpacing; } catch {}
  try { target.paddingLeft = source.paddingLeft; } catch {}
  try { target.paddingRight = source.paddingRight; } catch {}
  try { target.paddingTop = source.paddingTop; } catch {}
  try { target.paddingBottom = source.paddingBottom; } catch {}
  try { target.layoutWrap = source.layoutWrap; } catch {}
  try { target.fills = JSON.parse(JSON.stringify(source.fills)); } catch {}
  try { target.strokes = JSON.parse(JSON.stringify(source.strokes)); } catch {}
  try { target.strokeWeight = source.strokeWeight; } catch {}
  try { target.strokeTopWeight = source.strokeTopWeight; } catch {}
  try { target.strokeRightWeight = source.strokeRightWeight; } catch {}
  try { target.strokeBottomWeight = source.strokeBottomWeight; } catch {}
  try { target.strokeLeftWeight = source.strokeLeftWeight; } catch {}
  try { target.strokeAlign = source.strokeAlign; } catch {}
  try { target.dashPattern = [...source.dashPattern]; } catch {}
  try { target.cornerRadius = source.cornerRadius; } catch {}
  try { target.topLeftRadius = source.topLeftRadius; } catch {}
  try { target.topRightRadius = source.topRightRadius; } catch {}
  try { target.bottomLeftRadius = source.bottomLeftRadius; } catch {}
  try { target.bottomRightRadius = source.bottomRightRadius; } catch {}
  try { target.clipsContent = source.clipsContent; } catch {}
  try { target.effects = JSON.parse(JSON.stringify(source.effects)); } catch {}
  try { target.opacity = source.opacity; } catch {}
  try { target.visible = source.visible; } catch {}
  try { target.locked = source.locked; } catch {}

  while (target.children.length > 0) {
    try {
      target.children[0].remove();
    } catch {
      break;
    }
  }
  while (source.children.length > 0) {
    try {
      target.appendChild(source.children[0]);
    } catch {
      break;
    }
  }
}

function extractTableCellParamText(params: Record<string, any> | null | undefined): string {
  if (!params || typeof params !== 'object') return '';
  const candidates = [params.text, params.tagText, params.value, params.label, params.content];
  for (const value of candidates) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function parseTableNumberUnitText(rawValue: unknown): { value: string; unit: string } {
  const text = String(rawValue ?? '').trim();
  if (!text) return { value: '0', unit: '' };

  const prefixCurrencyMatch = text.match(/^(HK\$|US\$|[¥￥$€£])\s*([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
  if (prefixCurrencyMatch) {
    const value = (prefixCurrencyMatch[2] || '').trim() || text;
    const trailingUnit = normalizeTableNumberUnitLabel(prefixCurrencyMatch[3] || '');
    const currencyUnit = normalizeTableNumberUnitLabel(prefixCurrencyMatch[1] || '');
    return { value, unit: trailingUnit || currencyUnit };
  }

  const numberFirstMatch = text.match(/^([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
  if (!numberFirstMatch) {
    return { value: text, unit: '' };
  }

  const value = (numberFirstMatch[1] || '').trim() || text;
  const unit = normalizeTableNumberUnitLabel(numberFirstMatch[2] || '');
  return { value, unit };
}

function buildColumnApplyParamsForCell(
  targetCellParams: Record<string, any>,
  templateParams: Record<string, any>,
  nextComponentId: string
): Record<string, any> | null {
  const def = COMPONENT_DEFS[nextComponentId];
  if (!def) return null;
  const nextParams: Record<string, any> = { ...getDefaultParams(nextComponentId) };
  for (const [key, value] of Object.entries(templateParams || {})) {
    if (def.params[key]) {
      nextParams[key] = value;
    }
  }

  const currentText = extractTableCellParamText(targetCellParams);
  if (currentText) {
    if (nextComponentId === 'table-cell-number-unit') {
      const parsed = parseTableNumberUnitText(currentText);
      if (def.params.value) {
        nextParams.value = parsed.value;
      }
      if (def.params.unit) {
        nextParams.unit = parsed.unit;
      }
      if (def.params.text) {
        nextParams.text = parsed.unit ? `${parsed.value} ${parsed.unit}` : parsed.value;
      }
    } else {
      if (def.params.text) {
        nextParams.text = currentText;
      }
      if (def.params.tagText) {
        nextParams.tagText = currentText;
      }
      if (def.params.value && !nextParams.value) {
        nextParams.value = currentText;
      }
    }
  }
  if (!currentText && targetCellParams.value !== undefined && def.params.value) {
    nextParams.value = targetCellParams.value;
  }
  if (isTableActionCellComponentId(nextComponentId)) {
    nextParams.width = 0;
  }
  return nextParams;
}

function patchMergedTableInstanceForColumnApply(
  tableInstance: ComponentInstance,
  columnIndex: number,
  options: {
    componentId?: string;
    textAlign?: string;
    textDisplay?: string;
    columnWidthMode?: string;
    width?: number;
    templateParams?: Record<string, any>;
  }
): ComponentInstance | null {
  if (!Array.isArray(tableInstance.children)) return null;
  if (!Number.isInteger(columnIndex) || columnIndex < 0 || columnIndex >= tableInstance.children.length) return null;

  const nextInstance = deepCloneComponentInstance(tableInstance);
  const targetColumn = nextInstance.children?.[columnIndex];
  if (!targetColumn || targetColumn.componentId !== 'table-column') return null;

  const templateParams = options.templateParams || {};
  const nextComponentId = typeof options.componentId === 'string' && options.componentId
    ? options.componentId
    : undefined;
  const alignToApply = typeof options.textAlign === 'string' ? options.textAlign : undefined;
  const displayToApply = typeof options.textDisplay === 'string' ? options.textDisplay : undefined;

  targetColumn.params = { ...(targetColumn.params || {}) };
  if (nextComponentId) {
    targetColumn.params.cellType = nextComponentId;
  }
  if (alignToApply) {
    targetColumn.params.textAlign = alignToApply;
  }
  if (displayToApply) {
    targetColumn.params.textDisplay = displayToApply;
  }
  if (typeof options.columnWidthMode === 'string' && options.columnWidthMode) {
    targetColumn.params.columnWidthMode = options.columnWidthMode.toUpperCase();
  }
  if (options.width !== undefined) {
    targetColumn.params.width = options.width;
  }
  if (nextComponentId && isTableActionCellComponentId(nextComponentId) && !targetColumn.params.columnWidthMode) {
    targetColumn.params.columnWidthMode = 'HUG';
  }

  const leafHeaders = Array.isArray((nextInstance.params as any)?.headers) ? (nextInstance.params as any).headers : [];
  targetColumn.children = (targetColumn.children || []).map((child) => {
    const nextChild = deepCloneComponentInstance(child);
    nextChild.params = { ...(nextChild.params || {}) };

    if (nextChild.componentId === 'table-header-cell') {
      if (alignToApply) {
        nextChild.params.textAlign = alignToApply;
      }
      if (nextComponentId && isTableActionCellComponentId(nextComponentId)) {
        nextChild.params.text = '操作';
      } else if (Array.isArray(leafHeaders) && leafHeaders[columnIndex]) {
        nextChild.params.text = String(leafHeaders[columnIndex]);
      }
      return nextChild;
    }

    if (nextComponentId) {
      const patchedParams = buildColumnApplyParamsForCell(nextChild.params || {}, templateParams, nextComponentId);
      if (patchedParams) {
        nextChild.componentId = nextComponentId;
        nextChild.params = patchedParams;
      }
    }
    if (alignToApply) {
      nextChild.params.textAlign = alignToApply;
    }
    if (displayToApply) {
      nextChild.params.textDisplay = displayToApply;
    }
    return nextChild;
  });

  return nextInstance;
}

function findLogicalBodyCellNode(root: SceneNode, rowIndex: number | null, colIndex: number | null): SceneNode | null {
  if (rowIndex === null || colIndex === null || !('findOne' in root)) return null;
  try {
    const found = root.findOne((node) => {
      if (!('getPluginData' in node)) return false;
      return (
        node.getPluginData('table-cell-row-index') === String(rowIndex) &&
        node.getPluginData('table-cell-column-index') === String(colIndex)
      );
    });
    return (found as SceneNode | null) || null;
  } catch {
    return null;
  }
}

async function applyMergedTableColumnSettings(msg: any, selectedNode: SceneNode): Promise<boolean> {
  const tableRoot = findTableFrameFromNode(selectedNode);
  if (!tableRoot) return false;
  const tableParams = readNodeParams(tableRoot);
  if (!isAiMergedTableParams(tableParams)) return false;

  const snapshot = readComponentInstanceSnapshot(tableRoot);
  if (!snapshot || snapshot.componentId !== 'table') {
    figma.notify('当前 AI 合并表格缺少可重建快照，请重新生成后再试。', { error: true });
    return true;
  }

  const { rowIndex, colIndex, cell } = getCellMetaFromSelection(selectedNode);
  if (colIndex === null) {
    figma.notify('未能定位当前单元格所在列，暂时无法应用到整列。', { error: true });
    return true;
  }

  const sourceCell = cell || selectedNode;
  const templateParams = readNodeParams(sourceCell);
  const nextComponentId =
    typeof msg.componentId === 'string' && msg.componentId
      ? msg.componentId
      : sourceCell.getPluginData('component-id') || undefined;

  const patchedInstance = patchMergedTableInstanceForColumnApply(snapshot, colIndex, {
    componentId: nextComponentId,
    textAlign: msg.textAlign,
    textDisplay: msg.textDisplay,
    columnWidthMode: msg.columnWidthMode,
    width: msg.width,
    templateParams,
  });
  if (!patchedInstance) {
    figma.notify('应用到整列失败：无法重建目标列。', { error: true });
    return true;
  }

  const newRoot = await renderComponent(patchedInstance, { isRoot: false });
  if (!replaceSceneNode(tableRoot, newRoot)) {
    try { newRoot.remove(); } catch {}
    figma.notify('应用到整列失败：表格重建未成功。', { error: true });
    return true;
  }

  const nextSelection = findLogicalBodyCellNode(newRoot, rowIndex, colIndex) || newRoot;
  figma.currentPage.selection = [nextSelection];
  checkSelection();
  return true;
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

function applyNodeSize(node: SceneNode, width: number | null, height: number | null) {
  const isMergeAnchor = 'getPluginData' in node && node.getPluginData('merge-role') === 'merge-anchor';
  const nextWidth = typeof width === 'number' && Number.isFinite(width) && width > 0 ? width : node.width;
  const nextHeight = !isMergeAnchor && typeof height === 'number' && Number.isFinite(height) && height > 0 ? height : node.height;
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
  if (isMergeAnchor) {
    restoreMergedAnchorCellHeight(node);
  }
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
    if (newComponentId === 'table-cell-number-unit') {
        const currentText = extractTableCellParamText(currentParams).trim();
        if (currentText) {
            const defaultValue = defaultParams.value;
            const defaultUnit = defaultParams.unit;
            const parsed = parseTableNumberUnitText(currentText);
            const parsedValue = parsed.value;
            const parsedUnit = parsed.unit;
            if (!newParams.value || newParams.value === defaultValue) {
                newParams.value = parsedValue;
            }
            if (newParams.unit === undefined || newParams.unit === null || newParams.unit === defaultUnit) {
                newParams.unit = parsedUnit;
            }
            if (!newParams.text || newParams.text === defaultParams.text) {
                newParams.text = parsedUnit ? `${parsedValue} ${parsedUnit}` : parsedValue;
            }
        }
    }
    
    // 保留合并状态：若旧节点是合并 anchor，记录其 merge-* plugin data 与当前合并高度，
    // swap 完成后回写到新节点，并把同列 hidden 占位的 merge-anchor-id 指向新节点。
    const MERGE_KEYS = [
      'merge-role',
      'merge-row-span',
      'merge-start-index',
      'merge-end-index',
      'merge-original-y',
      'merge-original-height',
      'merge-original-sizing-v',
      'merge-original-layout-align',
      'merge-hidden-ids'
    ];
    const TABLE_META_KEYS = [
      'table-cell-section',
      'table-cell-row-index',
      'table-cell-column-index',
      'table-cell-column-id',
      'table-cell-key'
    ];
    const mergeSnapshot = getMergeAnchorSnapshot(node);
    const oldMergeData: Record<string, string> = {};
    let oldMergedHeight = 0;
    let oldAnchorWidth = 0;
    let oldLayoutSizingHorizontal: string | null = null;
    let oldLayoutAlign: string | null = null;
    let oldPrimaryAxisSizingMode: string | null = null;
    if (mergeSnapshot.isMergeAnchor) {
      for (const key of MERGE_KEYS) {
        const value = mergeSnapshot.mergeData[key];
        if (value) oldMergeData[key] = value;
      }
      oldMergedHeight = mergeSnapshot.mergedHeight;
      oldAnchorWidth = mergeSnapshot.anchorWidth;
      oldLayoutSizingHorizontal = mergeSnapshot.layoutSizingHorizontal;
      oldLayoutAlign = mergeSnapshot.layoutAlign;
      oldPrimaryAxisSizingMode = mergeSnapshot.primaryAxisSizingMode;
      if (oldAnchorWidth > 0) {
        newParams.width = oldAnchorWidth;
      }
    }

    const instance: ComponentInstance = {
        id: 'temp-swap',
        componentId: newComponentId,
        params: newParams
    };
    
    const columnToUpdate =
      isActionCell && !mergeSnapshot.isMergeAnchor
        ? findTableColumnFromNode(node)
        : null;

    const oldNodeId = node.id;

    const newNode = await renderComponent(instance);
    const shouldPreserveMergeAnchorRoot =
      mergeSnapshot.isMergeAnchor &&
      node.type === 'FRAME' &&
      newNode.type === 'FRAME' &&
      isTableCellComponentId(node.getPluginData('component-id')) &&
      isTableCellComponentId(newComponentId);

    if (shouldPreserveMergeAnchorRoot) {
      syncTableCellFrameFromRenderedSource(node as FrameNode, newNode as FrameNode);
      reapplyMergeAnchorFrameSnapshot(node as SceneNode, mergeSnapshot);
      copyPluginDataKeys(newNode, node, ['is-ai-component', 'component-id', 'params']);
      try {
        const snapshot = readComponentInstanceSnapshot(newNode);
        if (snapshot) {
          writeComponentInstanceSnapshot(node, snapshot);
        }
      } catch {}
      try { newNode.remove(); } catch {}
    } else {
      if (!replaceSceneNode(node, newNode)) return null;
      copyPluginDataKeys(node, newNode, TABLE_META_KEYS);
    }
    const effectiveNode = shouldPreserveMergeAnchorRoot ? node : newNode;
    if (columnToUpdate) {
        applyColumnWidthMode(columnToUpdate, 'HUG');
        mergeNodeParams(columnToUpdate, { width: undefined });
    }

    // 回写合并 anchor 信息到新节点：保留高度、plugin data、并修复同列 hidden 占位指向
    if (mergeSnapshot.isMergeAnchor) {
      for (const key of MERGE_KEYS) {
        if (oldMergeData[key]) effectiveNode.setPluginData(key, oldMergeData[key]);
      }
      try { (effectiveNode as any).layoutPositioning = 'AUTO'; } catch {}
      if (oldLayoutSizingHorizontal && 'layoutSizingHorizontal' in effectiveNode) {
        try { (effectiveNode as any).layoutSizingHorizontal = oldLayoutSizingHorizontal; } catch {}
      }
      if (oldLayoutAlign && 'layoutAlign' in effectiveNode) {
        try { (effectiveNode as any).layoutAlign = oldLayoutAlign; } catch {}
      }
      if (oldPrimaryAxisSizingMode && 'primaryAxisSizingMode' in effectiveNode) {
        try { (effectiveNode as any).primaryAxisSizingMode = oldPrimaryAxisSizingMode; } catch {}
      }
      try { if ('layoutSizingVertical' in effectiveNode) (effectiveNode as any).layoutSizingVertical = 'FIXED'; } catch {}
      if (oldMergedHeight > 0 && 'resize' in effectiveNode) {
        const w = Math.max(1, Math.round(oldAnchorWidth || (effectiveNode as any).width || 1));
        (effectiveNode as any).resize(w, oldMergedHeight);
      }
      const parentColumn = effectiveNode.parent;
      if (parentColumn && parentColumn.type === 'FRAME') {
        for (const sibling of (parentColumn as FrameNode).children) {
          if (
            sibling !== effectiveNode &&
            sibling.getPluginData('merge-role') === 'merge-hidden' &&
            sibling.getPluginData('merge-anchor-id') === oldNodeId
          ) {
            sibling.setPluginData('merge-anchor-id', effectiveNode.id);
          }
        }
      }
      restoreMergedAnchorCellHeight(effectiveNode as SceneNode);
      if (oldAnchorWidth > 0 && 'resize' in effectiveNode) {
        try { (effectiveNode as any).resize(oldAnchorWidth, Math.max(1, Math.round((effectiveNode as any).height || oldMergedHeight || 1))); } catch {}
      }
    }

    return effectiveNode;
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

// --- Sub-renderers for renderComponent ---

interface RenderSubContext {
  instance: ComponentInstance;
  params: Record<string, any>;
  def: any;
  isRoot: boolean;
  options: { isRoot?: boolean };
}

async function renderFigmaComponentSubRenderer(
  ctx: RenderSubContext
): Promise<SceneNode> {
  const { params, isRoot } = ctx;
    // Early viewport movement for root component
    if (isRoot) {
      // Create a temp node just to calculate position if needed, 
      // or we can't really do it until we have the instance.
      // But importedInstance is created below.
      // We can't easily move viewport before creation for figma-component because size is unknown until import.
      // But we can do it immediately after creation below.
    }

    const componentToken = typeof params.componentToken === 'string' ? params.componentToken.trim() : '';
    const node = await renderFigmaComponentInstance(params, {
      onApplyProps: (importedInstance, nextParams) => {
        if (nextParams.forceFigmaKey && componentToken) {
          const resolvedComponentId = resolveComponentIdFromToken(componentToken);
          if (resolvedComponentId) {
            applyFigmaComponentProps(importedInstance, resolvedComponentId, nextParams);
          }
        }
      }
    });
    return node;
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
    node = await renderFigmaComponentSubRenderer({ instance, params, def, isRoot, options });
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
    const formControlWidthMode = normalizeFormControlWidthMode(resolvedFormParams.controlWidthMode);
    const fallbackFormWidth = isRoot && computedWidth === null && formControlWidthMode === 'fill' ? 720 : null;
    const shouldStretchChildren = computedWidth !== null || formControlWidthMode === 'fill';
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
    } else if (fallbackFormWidth !== null) {
        setFixedWidth(frame, fallbackFormWidth);
    } else if (formControlWidthMode === 'fill') {
        setFillWidth(frame);
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
    } else if (rowControlWidthMode === 'fill') {
        // When controlWidthMode is 'fill', the form-row itself must also stretch
        // to fill the parent form container. In a VERTICAL form, this means STRETCH;
        // the form-row children (form-fields) then use layoutGrow to divide space.
        try {
            (frame as any).layoutSizingHorizontal = 'FILL';
            frame.layoutAlign = 'STRETCH';
            // CRITICAL: primaryAxisSizingMode must be 'FIXED' for layoutGrow on
            // children to work — 'AUTO' wraps to content, leaving no extra space.
            frame.primaryAxisSizingMode = 'FIXED';
        } catch {}
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
                wrap.primaryAxisSizingMode = 'AUTO';
            } else {
                wrap.layoutAlign = 'STRETCH';
            }
            // The wrap is VERTICAL, so horizontal is the counter axis.
            // Set it to FIXED so children with STRETCH fill the wrap width.
            try { (wrap as any).layoutSizingHorizontal = 'FILL'; } catch {}
            wrap.counterAxisSizingMode = 'FIXED';
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
        applyFormControlWidthModeToNode(buildFormLayoutCtx(), controlNode, params);
    } else {
        // 对于 switch、checkbox-group 等非输入框组件，强制不拉伸，维持原始宽度
        if ('layoutAlign' in controlNode) {
            try { (controlNode as any).layoutAlign = 'INHERIT'; } catch {}
        }
        if ('layoutGrow' in controlNode) {
            try { (controlNode as any).layoutGrow = 0; } catch {}
        }
        if ('layoutSizingHorizontal' in controlNode) {
            try {
                const current = (controlNode as any).layoutSizingHorizontal;
                if (current === 'FILL') {
                    // 优先尝试 HUG（适应内容），如果报错则忽略（保持 FIXED）
                    (controlNode as any).layoutSizingHorizontal = 'HUG';
                }
            } catch {
                try { (controlNode as any).layoutSizingHorizontal = 'FIXED'; } catch {}
            }
        }
    }

    // When controlWidthMode is "fill", the form-field frame itself must also
    // stretch to fill the parent form container, otherwise layoutGrow on the
    // control node has no effect (parent is AUTO-sized and provides no space).
    if (controlWidthMode === 'fill') {
        try {
            (frame as any).layoutSizingHorizontal = 'FILL';
            frame.layoutGrow = 1;
            if (layout === 'vertical') {
                // VERTICAL form-field: horizontal is the counter axis.
                // counterAxisSizingMode must be FIXED so that children with
                // layoutAlign='STRETCH' stretch to the frame's actual width
                // (resolved from the parent form container), not just to
                // the widest sibling.
                frame.counterAxisSizingMode = 'FIXED';
            } else {
                // HORIZONTAL form-field: horizontal is the primary axis.
                // primaryAxisSizingMode must be FIXED so that layoutGrow on
                // children distributes real space instead of AUTO-wrapping.
                frame.primaryAxisSizingMode = 'FIXED';
            }
        } catch {}
    }

    // 只在确实需要调整高度时才去调整（例如兜底节点）
    // 不要强制将 layoutSizingVertical 设为 FIXED，否则会破坏 textarea、多选组件、checkbox-group 等的自适应高度
    if ('resize' in controlNode && recordedHeight <= 1) {
        try {
            (controlNode as any).resize(controlNode.width, targetHeight);
        } catch {}
        // resize() resets layoutSizingHorizontal to FIXED — re-apply fill if needed.
        if (controlWidthMode === 'fill' && INPUT_LIKE_CONTROL_TYPES.has(controlType)) {
            applyFormControlWidthModeToNode(buildFormLayoutCtx(), controlNode, params);
        }
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
      const tableRenderPlan = params.tableRenderPlan && typeof params.tableRenderPlan === 'object'
        ? params.tableRenderPlan as any
        : null;
      const wantsMergedRender = Boolean(
        tableRenderPlan && (
          tableRenderPlan.hasMultiLevelHeader ||
          (Array.isArray(params.merges) && params.merges.length > 0)
        )
      );

      if (wantsMergedRender) {
          frame.layoutMode = 'VERTICAL';
          frame.primaryAxisSizingMode = 'AUTO';
          frame.counterAxisSizingMode = 'FIXED';
          try { (frame as any).layoutSizingVertical = 'HUG'; } catch {}
          frame.itemSpacing = 0;
          frame.cornerRadius = Number(params.cornerRadius ?? 4);
          frame.clipsContent = true;
          const mergedBorderWidth = Number(params.borderWidth ?? 1);
          const mergedBorderColor = String(params.borderColor || '#EAEDF1');

          const mergedColumnDef = COMPONENT_DEFS['table-column'];
          const lightweightColumnData = tableColumnInstances.map((colInstance) => {
              const mergedParams: Record<string, any> = {
                  ...getDefaultParams('table-column'),
                  ...(colInstance.params || {}),
                  headerHeight: toPositiveNumber(colInstance.params?.headerHeight) ?? headerHeight,
                  bodyHeight: toPositiveNumber(colInstance.params?.bodyHeight) ?? bodyHeight
              };
              const columnWidth = toPositiveNumber(mergedParams.width) ?? 150;
              return {
                  colInstance,
                  mergedParams,
                  columnWidth,
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

          const effectiveColumnWidths = lightweightColumnData.map((col) => col.columnWidth);
          const contentWidth = effectiveColumnWidths.reduce((sum, width) => sum + width, 0) || (params.width || 1176);
          frame.resize(contentWidth, 1);
          const topLevelSegments = Array.isArray(tableRenderPlan.topLevelSegments) ? tableRenderPlan.topLevelSegments : [];
          const groupedSegments = topLevelSegments.filter((segment: any) => Number(segment.colspan || 1) > 1);
          const groupBoundaryStartCols = new Set<number>(
              groupedSegments.length > 1
                  ? groupedSegments
                        .map((segment: any) => Number(segment.startCol))
                        .filter((value: number) => Number.isInteger(value) && value > 0)
                  : []
          );
          const resolveColumnX = (colIndex: number) =>
              effectiveColumnWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0);
          const resolveSpanWidth = (startCol: number, colspan: number) =>
              effectiveColumnWidths.slice(startCol, startCol + colspan).reduce((sum, width) => sum + width, 0);
          const applyMergedCellBorders = async (
              node: SceneNode,
              options: { leftBoundary?: boolean; bottom?: boolean }
          ) => {
              if (node.type !== 'FRAME') return;
              if (!Number.isFinite(mergedBorderWidth) || mergedBorderWidth <= 0) {
                  clearNodeStrokes(node);
                  return;
              }
              await applyStrokeColorVariable(node, 'table-border-key', mergedBorderColor);
              node.strokeWeight = 0;
              node.strokeTopWeight = 0;
              node.strokeRightWeight = 0;
              node.strokeLeftWeight = options.leftBoundary ? mergedBorderWidth : 0;
              node.strokeBottomWeight = options.bottom === false ? 0 : mergedBorderWidth;
          };

          const headerFrame = figma.createFrame();
          headerFrame.name = 'Table Header Grid';
          headerFrame.layoutMode = 'HORIZONTAL';
          headerFrame.primaryAxisSizingMode = 'FIXED';
          headerFrame.counterAxisSizingMode = 'FIXED';
          headerFrame.itemSpacing = 0;
          headerFrame.fills = [];
          headerFrame.clipsContent = false;
          headerFrame.setPluginData('table-role', 'table-header-grid');
          const headerDepth = Number(tableRenderPlan.headerDepth || 1);
          const headerFrameHeight = Math.max(1, headerDepth * headerHeight);
          headerFrame.resize(contentWidth, headerFrameHeight);
          frame.appendChild(headerFrame);

          const headerCells = Array.isArray(tableRenderPlan.headerCells) ? tableRenderPlan.headerCells : [];

          const renderSingleHeaderCell = async (cell: any, opts: { width: number; height: number; vertical: 'fixed' | 'fill'; center?: boolean }) => {
              const colspan = Number(cell.colspan || 1);
              const shouldCenterHeader = opts.center ?? colspan > 1;
              // 取 skill 已构造好的 headerChild（含 textAlign='right' 等），仅在 colspan===1 的叶子表头才用
              const leafColForHeader = Number(cell.col ?? 0);
              const reachedLeaf = colspan === 1 && Boolean(cell.reachesLeaf);
              const headerChild = reachedLeaf ? lightweightColumnData[leafColForHeader]?.headerChild : undefined;
              const headerChildParams: any = headerChild ? { ...(headerChild.params || {}) } : {};
              const finalTextAlign = shouldCenterHeader ? 'center' : (headerChildParams.textAlign as any);
              const finalText = String(cell.text || headerChildParams.text || '');
              // 调试：表头 anchor 文案为空时报告位置，便于排查 payload 缺字段
              try {
                  if (!finalText.trim()) {
                      figma.notify(`[header empty] row=${cell.row} col=${cell.col} colspan=${colspan} rowspan=${cell.rowspan ?? 1}`, { timeout: 3000, error: true });
                  }
              } catch {}
              const node = await renderComponent(
                  {
                      id: String(cell.key || `header-${cell.row}-${cell.col}`),
                      componentId: 'table-header-cell',
                      params: {
                          ...headerChildParams,
                          text: finalText,
                          width: opts.width,
                          height: opts.height,
                          disableStretch: true,
                          ...(finalTextAlign ? { textAlign: finalTextAlign } : {}),
                          borderBottomOnly: true,
                          borderWidth: mergedBorderWidth,
                          borderColor: mergedBorderColor,
                          paddingTop: 0,
                          paddingBottom: 0
                      }
                  },
                  { isRoot: false }
              );
              try {
                  if ('layoutPositioning' in node) {
                      (node as any).layoutPositioning = 'AUTO';
                  }
                  (node as any).layoutGrow = 0;
                  if ('layoutSizingHorizontal' in node) {
                      (node as any).layoutSizingHorizontal = 'FIXED';
                  }
                  if (opts.vertical === 'fill') {
                      (node as any).layoutAlign = 'STRETCH';
                      if ('layoutSizingVertical' in node) {
                          (node as any).layoutSizingVertical = 'FILL';
                      }
                  } else {
                      (node as any).layoutAlign = 'INHERIT';
                      if ('layoutSizingVertical' in node) {
                          (node as any).layoutSizingVertical = 'FIXED';
                      }
                  }
              } catch {}
              const leafColumnStart = Number(cell.leafColumnStart ?? cell.col ?? 0);
              await applyMergedCellBorders(node, {
                  leftBoundary: groupBoundaryStartCols.has(leafColumnStart),
                  bottom: true
              });

              const leafColIndex = Number(cell.col ?? 0);
              const shouldApplyHeaderElement = colspan === 1 && Boolean(cell.reachesLeaf);
              if (shouldApplyHeaderElement && lightweightColumnData[leafColIndex]) {
                  await applyTableHeaderElementToHeaderCellOp(
                      buildTableOpCtx(),
                      node,
                      lightweightColumnData[leafColIndex].mergedParams.headerType
                  );
              }
              return node;
          };

          // 收集 row=0 的 anchor cells，按 leafColumnStart 排序作为顶层段落
          const topRowCells = headerCells
              .filter((c: any) => Number(c.row ?? 0) === 0)
              .sort((a: any, b: any) => Number(a.leafColumnStart ?? a.col ?? 0) - Number(b.leafColumnStart ?? b.col ?? 0));

          for (const topCell of topRowCells) {
              const colspan = Number(topCell.colspan || 1);
              const rowspan = Number(topCell.rowspan || 1);
              const leafStart = Number(topCell.leafColumnStart ?? topCell.col ?? 0);
              const leafEnd = leafStart + colspan - 1;
              const groupWidth = resolveSpanWidth(leafStart, colspan);

              if (colspan === 1) {
                  // 普通单列表头：vertical FILL，撑满 Table Header Grid 高度
                  const node = await renderSingleHeaderCell(topCell, {
                      width: groupWidth,
                      height: headerFrameHeight,
                      vertical: 'fill'
                  });
                  headerFrame.appendChild(node);
                  continue;
              }

              // 复合表头组：Vertical AL → [顶层 anchor cell, 下层 Horizontal AL（子表头）]
              const groupFrame = figma.createFrame();
              groupFrame.name = 'merged_header_group';
              groupFrame.layoutMode = 'VERTICAL';
              groupFrame.primaryAxisSizingMode = 'FIXED';
              groupFrame.counterAxisSizingMode = 'FIXED';
              groupFrame.itemSpacing = 0;
              groupFrame.fills = [];
              groupFrame.clipsContent = false;
              groupFrame.setPluginData('table-role', 'merged-header-group');
              groupFrame.resize(groupWidth, headerFrameHeight);
              try { (groupFrame as any).layoutAlign = 'INHERIT'; } catch {}

              // 上层：在线计算 anchor，宽 = group 宽，高 = rowspan * headerHeight
              const topNode = await renderSingleHeaderCell(topCell, {
                  width: groupWidth,
                  height: Math.max(1, rowspan * headerHeight),
                  vertical: 'fixed',
                  center: true
              });
              groupFrame.appendChild(topNode);

              // 下层：从 row = rowspan 开始，找在 [leafStart, leafEnd] 范围内的 cells
              const childRowsCount = headerDepth - rowspan;
              if (childRowsCount > 0) {
                  const subFrame = figma.createFrame();
                  subFrame.name = 'merged_header_sub_row';
                  subFrame.layoutMode = 'HORIZONTAL';
                  subFrame.primaryAxisSizingMode = 'FIXED';
                  subFrame.counterAxisSizingMode = 'FIXED';
                  subFrame.itemSpacing = 0;
                  subFrame.fills = [];
                  subFrame.clipsContent = false;
                  subFrame.setPluginData('table-role', 'merged-header-sub-row');
                  subFrame.resize(groupWidth, Math.max(1, childRowsCount * headerHeight));
                  try { (subFrame as any).layoutAlign = 'INHERIT'; } catch {}

                  const childCells = headerCells
                      .filter((c: any) => {
                          const r = Number(c.row ?? 0);
                          const ls = Number(c.leafColumnStart ?? c.col ?? 0);
                          return r >= rowspan && ls >= leafStart && ls <= leafEnd;
                      })
                      .sort((a: any, b: any) => Number(a.leafColumnStart ?? a.col ?? 0) - Number(b.leafColumnStart ?? b.col ?? 0));

                  for (const cc of childCells) {
                      const cs = Number(cc.colspan || 1);
                      const rs = Number(cc.rowspan || 1);
                      const ls = Number(cc.leafColumnStart ?? cc.col ?? 0);
                      const w = resolveSpanWidth(ls, cs);
                      const h = Math.max(1, rs * headerHeight);
                      const childNode = await renderSingleHeaderCell(cc, {
                          width: w,
                          height: h,
                          vertical: rs >= childRowsCount ? 'fill' : 'fixed'
                      });
                      subFrame.appendChild(childNode);
                  }
                  groupFrame.appendChild(subFrame);
              }

              headerFrame.appendChild(groupFrame);
          }

          const bodyCells = Array.isArray(tableRenderPlan.bodyCells) ? tableRenderPlan.bodyCells : [];
          const columnCount = lightweightColumnData.length;
          const bodyRowCount = bodyCells.reduce((max: number, cell: any) => {
              const row = Number(cell.row ?? 0);
              const rowspan = Number(cell.rowspan || 1);
              return Math.max(max, row + rowspan);
          }, Math.max(0, Number(params.rowCount || 0)));

          // 合计行/汇总行检测：
          //   1) 优先按“每一行第一列实际识别出的文本”判定，避免被 merge plan 结构影响
          //   2) 再用 body merge anchor 兜底（如最后一行横向 colspan 的合计行）
          // 满足任一即把该行整行（被合并段 + 右侧汇总值单元格）涂成 color-bg-3。
          const TOTAL_ROW_REGEX = /^(合计|小计|总计|总和|汇总|合\s*计|小\s*计|总\s*计|汇\s*总|total|subtotal|summary|sum)$/i;
          const TOTAL_ROW_BG_HEX = '#F7F8FA';
          const totalRowSet = new Set<number>();
          const extractCellText = (cellLike: any): string => {
              if (cellLike == null) return '';
              if (typeof cellLike === 'string') return cellLike;
              if (typeof cellLike === 'number' || typeof cellLike === 'boolean') return String(cellLike);
              if (typeof cellLike === 'object') {
                  return String(
                      (cellLike as any).text ??
                          (cellLike as any).value ??
                          (cellLike as any).label ??
                          (cellLike as any).content ??
                          ''
                  );
              }
              return String(cellLike);
          };
          const firstColumnBodyChildren = Array.isArray(lightweightColumnData[0]?.bodyChildren)
              ? lightweightColumnData[0].bodyChildren
              : [];
          const extractFirstColumnTextForRow = (rowIndex: number): string => {
              // 先找第一列里覆盖该行的 merge/body cell
              const coveringCell = bodyCells.find((c: any) => {
                  if (!c || Number(c.col ?? -1) !== 0) return false;
                  if (c.isMergeHidden) return false;
                  const startRow = Number(c.row ?? 0);
                  const rowspan = Math.max(1, Number(c.rowspan || 1));
                  return rowIndex >= startRow && rowIndex < startRow + rowspan;
              });
              const coveringText = extractCellText(coveringCell?.value).trim();
              if (coveringText) return coveringText;

              // 再回退到第一列原始识别出的 body child params
              const bodyChild = firstColumnBodyChildren[rowIndex];
              const paramsText = extractCellText((bodyChild?.params as any)?.text).trim();
              if (paramsText) return paramsText;
              const paramsValue = extractCellText((bodyChild?.params as any)?.value).trim();
              if (paramsValue) return paramsValue;
              const paramsLabel = extractCellText((bodyChild?.params as any)?.label).trim();
              if (paramsLabel) return paramsLabel;
              const paramsContent = extractCellText((bodyChild?.params as any)?.content).trim();
              if (paramsContent) return paramsContent;
              return '';
          };
          for (let rowIndex = 0; rowIndex < bodyRowCount; rowIndex += 1) {
              const firstColumnText = extractFirstColumnTextForRow(rowIndex);
              if (TOTAL_ROW_REGEX.test(firstColumnText)) {
                  totalRowSet.add(rowIndex);
              }
          }
          // 兜底：横向合计行常表现为首格 colspan>1 的 merge anchor
          for (const c of bodyCells) {
              if (!c?.isMergeAnchor) continue;
              const colspan = Number(c.colspan || 1);
              if (colspan <= 1) continue;
              const valueText = extractCellText(c.value).trim();
              if (!TOTAL_ROW_REGEX.test(valueText)) continue;
              totalRowSet.add(Number(c.row ?? 0));
          }
          try {
              if (totalRowSet.size > 0) {
                  figma.notify(`[total row] highlight rows: ${Array.from(totalRowSet).join(',')}`, { timeout: 2500 });
              }
          } catch {}

          // 单个 body cell 渲染 helper：保持 cell 的最小约束（fixed 宽 + 高=bodyHeight*rowspan 或 FILL）。
          // 不再使用绝对定位；母体 cell 通过 vertical='fill' 让 Auto Layout 自动撑开。
          const renderBodyCellNode = async (
              cell: any,
              options: { vertical?: 'fixed' | 'fill' }
          ): Promise<{ node: SceneNode; cellWidth: number; cellHeight: number }> => {
              const colIndex = Number(cell.col ?? 0);
              const col = lightweightColumnData[colIndex];
              const rowIndex = Number(cell.row ?? 0);
              const bodyChild = col?.bodyChildren[rowIndex];
              const leafColumnStart = Number(cell.leafColumnStart ?? colIndex);
              const rowspan = Number(cell.rowspan || 1);
              const colspan = Number(cell.colspan || 1);
              const cellWidth = resolveSpanWidth(leafColumnStart, colspan);
              const cellHeight = Math.max(1, bodyHeight * rowspan);
              const widthParam = (bodyChild?.params as any)?.width;
              const explicitHugWidth = widthParam === 0 || widthParam === '0';
              const isMerged = rowspan > 1 || colspan > 1;
              // 关键：尽量保留 skill 已推断好的 cellComponentId（table-cell-number-unit / table-cell-avatar / table-cell-tag / table-cell-action-* 等）
              // bodyChild 不存在时再回退到 table-cell。
              const baseComponentId = bodyChild?.componentId || 'table-cell';
              const baseParams: any = bodyChild ? { ...(bodyChild.params || {}) } : {};
              if (!bodyChild) {
                  baseParams.text = String(cell.value ?? '');
                  if (col?.mergedParams.textAlign) baseParams.textAlign = col.mergedParams.textAlign;
              }
              // 合并母体（rowspan>1 或 colspan>1）：覆盖宽高，并让宽高都是 fixed
              if (isMerged) {
                  baseParams.width = cellWidth;
                  baseParams.height = cellHeight;
              } else {
                  baseParams.width = explicitHugWidth ? 0 : cellWidth;
                  baseParams.height = bodyHeight;
              }
              baseParams.disableStretch = true;
              baseParams.borderBottomOnly = true;
              baseParams.borderWidth = mergedBorderWidth;
              baseParams.borderColor = mergedBorderColor;
              if (baseParams.paddingTop === undefined) baseParams.paddingTop = 0;
              if (baseParams.paddingBottom === undefined) baseParams.paddingBottom = 0;
              // 合计/汇总行：整行底色改为 color-bg-3
              if (totalRowSet.has(rowIndex)) {
                  baseParams.backgroundColor = TOTAL_ROW_BG_HEX;
              }

              const node = await renderComponent(
                  {
                      id: bodyChild?.id || (isMerged ? `merged-cell-${rowIndex}-${colIndex}` : `cell-${rowIndex}-${colIndex}`),
                      componentId: baseComponentId,
                      params: baseParams,
                      ...(bodyChild?.children ? { children: bodyChild.children } : {})
                  } as any,
                  { isRoot: false }
              );
              try {
                  if ('layoutPositioning' in node) {
                      (node as any).layoutPositioning = 'AUTO';
                  }
                  (node as any).layoutGrow = 0;
                  if ('layoutSizingHorizontal' in node) {
                      (node as any).layoutSizingHorizontal = 'FIXED';
                  }
                  if (options.vertical === 'fill') {
                      // 母体 cell：在 Horizontal Auto Layout 父节点中，Vertical Resizing = FILL
                      (node as any).layoutAlign = 'STRETCH';
                      if ('layoutSizingVertical' in node) {
                          (node as any).layoutSizingVertical = 'FILL';
                      }
                  } else {
                      (node as any).layoutAlign = 'INHERIT';
                      if ('layoutSizingVertical' in node) {
                          (node as any).layoutSizingVertical = 'FIXED';
                      }
                  }
              } catch {}
              await applyMergedCellBorders(node, {
                  leftBoundary: groupBoundaryStartCols.has(leafColumnStart),
                  bottom: true
              });
              // 合计行：通过变量绑定到源力 color-bg-3，避免被 cell painter 内的 variable bind 覆盖回白色
              if (totalRowSet.has(rowIndex)) {
                  try {
                      await applyColorVariable(node, 'table-total-row-bg-key', TOTAL_ROW_BG_HEX);
                  } catch {}
              }
              try {
                  node.setPluginData('table-cell-section', 'body');
                  node.setPluginData('table-cell-row-index', String(rowIndex));
                  node.setPluginData('table-cell-column-index', String(colIndex));
                  node.setPluginData('table-cell-key', `body:${rowIndex}:${colIndex}`);
                  if (col?.colInstance?.id) {
                      node.setPluginData('table-cell-column-id', String(col.colInstance.id));
                  }
              } catch {}
              return { node, cellWidth, cellHeight };
          };

          const createRowFrame = (rowWidth: number, rowHeight: number): FrameNode => {
              const rowFrame = figma.createFrame();
              rowFrame.name = 'Table Body Row';
              rowFrame.layoutMode = 'HORIZONTAL';
              rowFrame.primaryAxisSizingMode = 'FIXED';
              rowFrame.counterAxisSizingMode = 'FIXED';
              rowFrame.itemSpacing = 0;
              rowFrame.fills = [];
              rowFrame.clipsContent = false;
              rowFrame.setPluginData('table-role', 'table-body-row');
              rowFrame.resize(Math.max(1, rowWidth), Math.max(1, rowHeight));
              return rowFrame;
          };

          // 切分行段：当某行存在 rowspan>1 的 anchor 时，整段一起渲染为 merged_block
          const cellByKey: Map<string, any> = new Map();
          for (const c of bodyCells) {
              cellByKey.set(`${Number(c.row ?? 0)}:${Number(c.col ?? 0)}`, c);
          }
          // 仅处理纵向合并（rowspan>1）作为段切分；横向合并（colspan>1, rowspan=1）在普通行里直接吃掉宽度
          const anchorList = bodyCells.filter(
              (c: any) => c.isMergeAnchor && Number(c.rowspan || 1) > 1
          );
          // 用于跳过被合并覆盖的位置：bodyCells 已过滤掉 covered cell（render-grid 不会输出它们），
          // 因此根据 anchor 的 rowspan/colspan 自行重建被覆盖位置集合
          const coveredCellKeys = new Set<string>();
          for (const c of bodyCells) {
              if (!c?.isMergeAnchor) continue;
              const rs = Number(c.rowspan || 1);
              const cs = Number(c.colspan || 1);
              if (rs <= 1 && cs <= 1) continue;
              const r0 = Number(c.row ?? 0);
              const c0 = Number(c.col ?? 0);
              for (let dr = 0; dr < rs; dr += 1) {
                  for (let dc = 0; dc < cs; dc += 1) {
                      if (dr === 0 && dc === 0) continue;
                      coveredCellKeys.add(`${r0 + dr}:${c0 + dc}`);
                  }
              }
          }
          const isCovered = (row: number, col: number): boolean => {
              return coveredCellKeys.has(`${row}:${col}`);
          };
          const findCoveringAnchor = (row: number, col: number): any | null => {
              for (const c of bodyCells) {
                  if (!c?.isMergeAnchor) continue;
                  const r0 = Number(c.row ?? 0);
                  const c0 = Number(c.col ?? 0);
                  const rs = Number(c.rowspan || 1);
                  const cs = Number(c.colspan || 1);
                  if (row >= r0 && row < r0 + rs && col >= c0 && col < c0 + cs) {
                      return c;
                  }
              }
              return null;
          };

          const bodyFrame = figma.createFrame();
          bodyFrame.name = 'Table Body';
          bodyFrame.layoutMode = 'VERTICAL';
          bodyFrame.primaryAxisSizingMode = 'AUTO';
          bodyFrame.counterAxisSizingMode = 'FIXED';
          bodyFrame.itemSpacing = 0;
          bodyFrame.fills = [];
          bodyFrame.clipsContent = false;
          bodyFrame.setPluginData('table-role', 'table-body');
          bodyFrame.resize(contentWidth, 1);
          frame.appendChild(bodyFrame);
          try { (bodyFrame as any).layoutSizingVertical = 'HUG'; } catch {}

          // 范围宽度计算
          const resolveRangeWidth = (colStart: number, colEnd: number) =>
              effectiveColumnWidths
                  .slice(colStart, colEnd + 1)
                  .reduce((sum, w) => sum + w, 0);

          // 在 [rowStart, rowEnd] × [colStart, colEnd] 范围内切分行段
          // 段定义：该段内存在 rowspan>1 的 anchor，整段被纵向合并覆盖
          const computeRowSegments = (rowStart: number, rowEnd: number, colStart: number, colEnd: number) => {
              const segments: Array<{ startRow: number; endRow: number; hasMerge: boolean }> = [];
              let r = rowStart;
              while (r <= rowEnd) {
                  // 找到从 r 开始、col 在 [colStart, colEnd] 的 anchors
                  let maxRowspan = 0;
                  for (const a of anchorList) {
                      const ar = Number(a.row ?? 0);
                      const ac = Number(a.col ?? 0);
                      const aspan = Number(a.rowspan || 1);
                      if (ar === r && ac >= colStart && ac <= colEnd) {
                          maxRowspan = Math.max(maxRowspan, aspan);
                      }
                  }
                  if (maxRowspan > 1) {
                      let endRow = Math.min(r + maxRowspan - 1, rowEnd);
                      // 中间行也可能有更长的 anchor，扩展段尾
                      for (let r2 = r + 1; r2 <= endRow; r2 += 1) {
                          for (const a of anchorList) {
                              const ar = Number(a.row ?? 0);
                              const ac = Number(a.col ?? 0);
                              const aspan = Number(a.rowspan || 1);
                              if (ar === r2 && ac >= colStart && ac <= colEnd) {
                                  endRow = Math.max(endRow, Math.min(r2 + aspan - 1, rowEnd));
                              }
                          }
                      }
                      segments.push({ startRow: r, endRow, hasMerge: true });
                      r = endRow + 1;
                  } else {
                      segments.push({ startRow: r, endRow: r, hasMerge: false });
                      r += 1;
                  }
              }
              return segments;
          };

          // 普通行：把 [colStart, colEnd] 的 cell 装成一个 Table Body Row
          // 支持横向合并（colspan>1, rowspan=1）：anchor cell 吃掉合并范围内的总宽度，covered cell 跳过
          const createCoveredCellSpacer = (width: number): FrameNode => {
              const spacer = figma.createFrame();
              spacer.name = 'covered_cell_spacer';
              spacer.layoutMode = 'NONE';
              spacer.primaryAxisSizingMode = 'FIXED';
              spacer.counterAxisSizingMode = 'FIXED';
              spacer.fills = [];
              spacer.strokes = [];
              spacer.clipsContent = false;
              spacer.resize(Math.max(1, width), Math.max(1, bodyHeight));
              try { (spacer as any).layoutSizingVertical = 'FIXED'; } catch {}
              try { (spacer as any).layoutAlign = 'INHERIT'; } catch {}
              return spacer;
          };
          const buildPlainRow = async (rowIndex: number, colStart: number, colEnd: number): Promise<FrameNode> => {
              const rowWidth = resolveRangeWidth(colStart, colEnd);
              const rowFrame = createRowFrame(rowWidth, bodyHeight);
              for (let col = colStart; col <= colEnd; col += 1) {
                  if (isCovered(rowIndex, col)) {
                      const anchor = findCoveringAnchor(rowIndex, col);
                      const anchorRow = Number(anchor?.row ?? rowIndex);
                      // If a vertical merge anchor was not lifted into a merged_block for this range,
                      // keep the column slot so later cells do not collapse left.
                      if (anchor && anchorRow < rowIndex) {
                          rowFrame.appendChild(createCoveredCellSpacer(resolveRangeWidth(col, col)));
                      }
                      continue;
                  }
                  const cell = cellByKey.get(`${rowIndex}:${col}`);
                  if (!cell) continue;
                  const { node } = await renderBodyCellNode(cell, {});
                  rowFrame.appendChild(node);
              }
              try { (rowFrame as any).layoutAlign = 'INHERIT'; } catch {}
              return rowFrame;
          };

          // 递归构建任意 [rowStart, rowEnd] × [colStart, colEnd] 矩形区域
          // 返回单个 Frame，会自动按需切分为 Vertical AL（多段）或单 merged_block / Table Body Row
          const buildRange = async (rowStart: number, rowEnd: number, colStart: number, colEnd: number): Promise<FrameNode> => {
              const segments = computeRowSegments(rowStart, rowEnd, colStart, colEnd);

              // 把多个段聚合到一个 Vertical AL（right_side_content）下
              if (segments.length > 1) {
                  const vFrame = figma.createFrame();
                  vFrame.name = 'right_side_content';
                  vFrame.layoutMode = 'VERTICAL';
                  vFrame.primaryAxisSizingMode = 'AUTO';
                  vFrame.counterAxisSizingMode = 'FIXED';
                  vFrame.itemSpacing = 0;
                  vFrame.fills = [];
                  vFrame.clipsContent = false;
                  vFrame.setPluginData('table-role', 'right-side-content');
                  vFrame.resize(Math.max(1, resolveRangeWidth(colStart, colEnd)), 1);
                  try { (vFrame as any).layoutSizingVertical = 'HUG'; } catch {}
                  try { (vFrame as any).layoutAlign = 'INHERIT'; } catch {}
                  for (const seg of segments) {
                      const child = await buildSegment(seg.startRow, seg.endRow, colStart, colEnd);
                      vFrame.appendChild(child);
                  }
                  return vFrame;
              }

              // 单段
              const seg = segments[0];
              return await buildSegment(seg.startRow, seg.endRow, colStart, colEnd);
          };

          // 单个段（连续行 + 列范围）的渲染
          const buildSegment = async (rowStart: number, rowEnd: number, colStart: number, colEnd: number): Promise<FrameNode> => {
              const segLen = rowEnd - rowStart + 1;
              // 识别该段内"母体合并列"：anchor 起点在 rowStart，rowspan 等于段长度，col 在 [colStart, colEnd]
              const mergedAnchors: Array<{ col: number; cell: any }> = [];
              for (const a of anchorList) {
                  const ar = Number(a.row ?? 0);
                  const ac = Number(a.col ?? 0);
                  const aspan = Number(a.rowspan || 1);
                  if (ar === rowStart && aspan === segLen && ac >= colStart && ac <= colEnd) {
                      mergedAnchors.push({ col: ac, cell: a });
                  }
              }
              mergedAnchors.sort((a, b) => a.col - b.col);

              // 没有合并：直接产出 Table Body Row（单行）或 Vertical AL（多行普通）
              if (mergedAnchors.length === 0) {
                  if (segLen === 1) {
                      return await buildPlainRow(rowStart, colStart, colEnd);
                  }
                  const vFrame = figma.createFrame();
                  vFrame.name = 'right_side_content';
                  vFrame.layoutMode = 'VERTICAL';
                  vFrame.primaryAxisSizingMode = 'AUTO';
                  vFrame.counterAxisSizingMode = 'FIXED';
                  vFrame.itemSpacing = 0;
                  vFrame.fills = [];
                  vFrame.clipsContent = false;
                  vFrame.setPluginData('table-role', 'right-side-content');
                  vFrame.resize(Math.max(1, resolveRangeWidth(colStart, colEnd)), 1);
                  try { (vFrame as any).layoutSizingVertical = 'HUG'; } catch {}
                  try { (vFrame as any).layoutAlign = 'INHERIT'; } catch {}
                  for (let r = rowStart; r <= rowEnd; r += 1) {
                      const rowFrame = await buildPlainRow(r, colStart, colEnd);
                      vFrame.appendChild(rowFrame);
                  }
                  return vFrame;
              }

              // 取最左侧的合并列作为本层 merged_block 的"母体"
              const leftMerged = mergedAnchors[0];
              const leftCol = leftMerged.col;

              const mergedBlock = figma.createFrame();
              mergedBlock.name = 'merged_block';
              mergedBlock.layoutMode = 'HORIZONTAL';
              mergedBlock.primaryAxisSizingMode = 'FIXED';
              mergedBlock.counterAxisSizingMode = 'AUTO';
              mergedBlock.itemSpacing = 0;
              mergedBlock.fills = [];
              mergedBlock.clipsContent = false;
              mergedBlock.setPluginData('table-role', 'merged-block');
              mergedBlock.resize(resolveRangeWidth(colStart, colEnd), Math.max(1, segLen * bodyHeight));
              try { (mergedBlock as any).layoutSizingVertical = 'HUG'; } catch {}
              try { (mergedBlock as any).layoutAlign = 'INHERIT'; } catch {}

              // 1. 母体左侧若有非合并列：递归构建一个 right_side_content（每行单独 row）
              if (leftCol > colStart) {
                  const leadingFrame = await buildRange(rowStart, rowEnd, colStart, leftCol - 1);
                  mergedBlock.appendChild(leadingFrame);
              }

              // 2. 母体合并 cell（FILL 高度）
              const { node: mergedCellNode } = await renderBodyCellNode(leftMerged.cell, { vertical: 'fill' });
              mergedBlock.appendChild(mergedCellNode);

              // 3. 母体右侧的内容：递归 buildRange，可能再次出现合并 → 嵌套 merged_block
              if (leftCol < colEnd) {
                  const rightFrame = await buildRange(rowStart, rowEnd, leftCol + 1, colEnd);
                  mergedBlock.appendChild(rightFrame);
              }

              return mergedBlock;
          };

          // 顶层：构建整个 body
          const segments = computeRowSegments(0, bodyRowCount - 1, 0, columnCount - 1);
          for (const seg of segments) {
              const segNode = await buildSegment(seg.startRow, seg.endRow, 0, columnCount - 1);
              bodyFrame.appendChild(segNode);
          }
          try {
              frame.primaryAxisSizingMode = 'AUTO';
              if ('layoutSizingVertical' in frame) {
                  (frame as any).layoutSizingVertical = 'HUG';
              }
              frame.resize(contentWidth, Math.max(1, headerFrame.height + bodyFrame.height));
          } catch {}
      } else {
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
            await applyTableHeaderElementToHeaderCellOp(buildTableOpCtx(), headerNode, col.mergedParams.headerType);
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
              await applyRowActionColumnOp(buildTableOpCtx(), frame, String(params.rowAction));
          }
      }
      if (wantsPagination || wantsFilter || wantsTabs || wantsButtonGroup) {
          const wrapper = createTableWrapperFromTableFrame(frame, params, lockGeneratedContainerNode) || frame.parent as FrameNode;
          ensureTableContentStack(wrapper, frame);

          if (wantsFilter || wantsTabs || wantsButtonGroup) {
              await ensureTableToolbarOp(buildTableOpCtx(), wrapper, wrapper.width, {
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
              await ensurePaginationRowOp(buildTableOpCtx(), wrapper, wrapper.width);
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
      const borderWidth = Number(params.borderWidth ?? (wantsMergedRender ? 1 : 0));
      if (Number.isFinite(borderWidth) && borderWidth > 0) {
          await applyStrokeColorVariable(frame, 'table-border-key', params.borderColor || '#EAEDF1');
          frame.strokeWeight = borderWidth;
      } else {
          clearNodeStrokes(frame);
      }
      if (node !== frame) {
          clearNodeStrokes(node as FrameNode);
      }
      writeComponentInstanceSnapshot(frame, instance);
      if (node !== frame) {
          writeComponentInstanceSnapshot(node, instance);
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
	      await applyTableHeaderElementToHeaderCellOp(buildTableOpCtx(), headerCellNode, params.headerType);
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
           instance.componentId === 'table-cell-number-unit' ||
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
    const disableStretch = params.disableStretch === true;
    const cellWidth = toPositiveNumber(widthParam) ?? 150;
    const frame = figma.createFrame();
    frame.layoutMode = 'HORIZONTAL';
    frame.counterAxisSizingMode = autoHeightMode ? 'AUTO' : 'FIXED';
    frame.primaryAxisSizingMode = explicitHugWidth ? 'AUTO' : 'FIXED';
    frame.layoutAlign = disableStretch ? 'INHERIT' : 'STRETCH';
    frame.itemSpacing = 8;
    frame.counterAxisAlignItems = 'CENTER';
    frame.paddingLeft = params.paddingLeft ?? 16;
    frame.paddingRight = params.paddingRight ?? (isHeader ? 8 : 16);
    frame.paddingTop = params.paddingTop ?? 0;
    frame.paddingBottom = params.paddingBottom ?? 0;
    frame.resize(explicitHugWidth ? 1 : cellWidth, autoHeightMode ? 1 : cellHeight);
    if (disableStretch && 'layoutSizingHorizontal' in frame) {
      try {
        (frame as any).layoutSizingHorizontal = 'FIXED';
      } catch {
        // ignore
      }
    }
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
        const avatarCellRuntime = COMPONENT_DEFS['table-cell-avatar']?.runtime as
          | { spacing?: { avatarSize?: number; avatarTextGap?: number } }
          | undefined;
        const avatarSize = avatarCellRuntime?.spacing?.avatarSize ?? 20;
        const avatarTextGap = avatarCellRuntime?.spacing?.avatarTextGap ?? 4;
        let avatarInstance: SceneNode | null = null;
        frame.itemSpacing = avatarTextGap;
        try {
            avatarInstance = await renderFigmaComponentInstance({
                componentToken: 'lib-data-display-avataricon',
                variantCriteria: { 'Size 尺寸': `Default ${avatarSize}` }
            });
        } catch (e) {
            console.warn('[AvatarCell] render figma component failed', e);
        }

        if (avatarInstance) {
            frame.appendChild(avatarInstance);
        } else {
            frame.appendChild(await createCenteredAvatarFallback(initial, avatarSize));
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
    // 4. Number + Unit Cell
    else if (instance.componentId === 'table-cell-number-unit') {
        const rawValue = params.value ?? params.number ?? params.num;
        const rawUnit = params.unit ?? params.suffix;
        const rawText = params.text ?? params.label ?? params.content;
        const normalizedText =
          rawText === undefined || rawText === null ? '' : String(rawText).trim();
        let valueText =
          rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
        let unitText =
          rawUnit === undefined || rawUnit === null ? '' : String(rawUnit).trim();

        if (!valueText && normalizedText) {
            const match = normalizedText.match(/^([+-]?\d[\d,]*(?:\.\d+)?)(?:\s*)(.*)$/);
            if (match) {
                valueText = (match[1] || '').trim();
                unitText = unitText || (match[2] || '').trim();
            } else {
                valueText = normalizedText;
            }
        }

        if (!valueText) {
            valueText = '0';
        }

        const numberUnitRuntime = COMPONENT_DEFS['table-cell-number-unit']?.runtime as
          | { spacing?: { numberUnitGap?: number } }
          | undefined;
        frame.itemSpacing = numberUnitRuntime?.spacing?.numberUnitGap ?? 0;

        const valueFrame = figma.createFrame();
        valueFrame.layoutMode = 'HORIZONTAL';
        valueFrame.primaryAxisSizingMode = 'AUTO';
        valueFrame.counterAxisSizingMode = 'AUTO';
        valueFrame.fills = [];
        valueFrame.itemSpacing = 0;
        valueFrame.counterAxisAlignItems = 'CENTER';

        const unitFrame = figma.createFrame();
        unitFrame.layoutMode = 'HORIZONTAL';
        unitFrame.primaryAxisSizingMode = 'AUTO';
        unitFrame.counterAxisSizingMode = 'AUTO';
        unitFrame.fills = [];
        unitFrame.itemSpacing = 0;
        unitFrame.counterAxisAlignItems = 'CENTER';

        const valueNode = figma.createText();
        await applyTextStyleBinding(valueNode, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
        valueNode.characters = valueText;
        await applyColorVariable(valueNode, 'table-cell-text-key', '#0C0D0E');
        valueFrame.appendChild(valueNode);
        frame.appendChild(valueFrame);

        if (unitText) {
            const unitNode = figma.createText();
            await applyTextStyleBinding(unitNode, 'table-cell-text-style-key', { family: 'Inter', style: 'Regular', size: 13 });
            unitNode.characters = unitText;
            await applyColorVariable(unitNode, 'table-cell-unit-text-key', '#737A87');
            unitFrame.appendChild(unitNode);
            frame.appendChild(unitFrame);
        }
    }
    // 5. Action Text Cell
    else if (instance.componentId === 'table-cell-action-text') {
        const rawText = String(params.text || '').trim() || '编辑 删除 …';
        const parts = rawText
          .split(/[\s,，、\/]+/)
          .map((part) => part.trim())
          .filter(Boolean);

        frame.itemSpacing = 16;

        const ellipsisIndex = parts.findIndex((part) => part === '…' || part === '...' || part === '更多' || part.toLowerCase() === 'more');
        const showMore = true;
        const visibleParts = ellipsisIndex !== -1
          ? parts.slice(0, ellipsisIndex)
          : parts.length > 3
            ? parts.slice(0, 2)
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
            let moreIcon: InstanceNode | null = null;
            try {
                const moreComponent = await figma.importComponentByKeyAsync('27e130c675fe44532f717656d04b2597eb05a67d');
                if (moreComponent) {
                    moreIcon = moreComponent.createInstance();
                }
            } catch {
            }
            if (!moreIcon) {
                moreIcon =
                  (await createFigmaComponentInstanceByToken('table-cell-icon-action-more')) ||
                  (await createFigmaComponentInstanceByToken('table-cell-icon-more'));
            }
            if (moreIcon) {
                try {
                    moreIcon.resize(16, 16);
                } catch {
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
    // 6. Action Icon Cell
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
    // 7. Standard Cell (Text)
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
        
        const allowEmptyText = params.allowEmptyText === true;
        const resolvedText = params.text ?? params.value ?? params.label ?? params.content;
        if (
            resolvedText !== undefined &&
            resolvedText !== null &&
            (allowEmptyText || String(resolvedText).trim() !== '')
        ) {
            textNode.characters = String(resolvedText);
        } else {
            textNode.characters = isHeader ? 'Header' : '—';
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
        try {
            if ('layoutSizingHorizontal' in importedInstance) {
                importedInstance.layoutSizingHorizontal = 'FIXED';
            }
        } catch (e) {}
        try {
            importedInstance.resize(targetWidth, importedInstance.height);
        } catch (e) {
            console.warn("Failed to resize", e);
        }
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

async function resolveAppendParentAsync(parentId?: string): Promise<BaseNode | null> {
  if (!parentId) return null;
  const raw = String(parentId).trim();
  if (!raw) return null;

  const parentNode = await figma.getNodeByIdAsync(raw);
  if (!parentNode) return null;

  if (parentNode.type === 'FRAME' && parentNode.getPluginData('component-id') === 'page') {
    const contentArea = parentNode.children.find(
      (child) => child.type === 'FRAME' && child.name === 'Content Area'
    );
    if (contentArea) return contentArea;
  }

  return parentNode;
}

// formatYValue, drawAiChart, hexToRgb moved to ./code/chart.renderer.ts

async function appendToResolvedParent(node: SceneNode, parentId?: string): Promise<boolean> {
  const appendParent = await resolveAppendParentAsync(parentId);
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

// ── Named message handlers ──────────────────────────────────────────
async function handleCancel(_msg: any) {
  figma.closePlugin();
}

async function handleApplyEnvelope(msg: any) {
  const mode = msg.mode === 'best_effort' ? 'best_effort' : 'strict';
  const result = await applyEnvelopeUnknown(msg.envelope, { mode });
  const requestedParentId =
    typeof msg.parentId === 'string' && msg.parentId.trim() ? msg.parentId.trim() : undefined;

  if (result.ok && result.rootNodeId) {
    const rootNode = await figma.getNodeByIdAsync(result.rootNodeId);
    let appendedToParent = false;
    if (requestedParentId && rootNode && rootNode.type !== 'PAGE') {
      appendedToParent = await appendToResolvedParent(rootNode as SceneNode, requestedParentId);
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

async function handleGenerateChart(msg: any) {
  const { data, options } = msg;
  await drawAiChart(data, options);
}

async function handleSwitchTheme(msg: any) {
  const { theme } = msg;
  if (theme === 'light' || theme === 'dark') {
    setCurrentTheme(theme);
    figma.ui.postMessage({ type: 'action-done', message: `Switched to ${theme} theme. (Note: Only new components will apply)` });
  }
}

async function handleSetGenerationLock(msg: any) {
  generationLockEnabled = Boolean(msg.enabled);
  console.log('[gen-lock]', generationLockEnabled ? 'LOCKED' : 'UNLOCKED', 'tracked:', generationLockedNodeIds.size);
  if (!generationLockEnabled) {
    await unlockGeneratedContainerNodes();
  }
}

async function handleUiReady(_msg: any) {
  checkSelection();
}

async function handleInspectProps(msg: any) {
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

async function handleInspectStructure(msg: any) {
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

async function handleInspectVariables(msg: any) {
  const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload : {};
  const maxDepthRaw = Number(payload.maxDepth);
  const maxDepth = Number.isFinite(maxDepthRaw) && maxDepthRaw > 0 ? Math.floor(maxDepthRaw) : 6;
  const maxChildrenRaw = Number(payload.maxChildren);
  const maxChildren = Number.isFinite(maxChildrenRaw) && maxChildrenRaw > 0 ? Math.floor(maxChildrenRaw) : 80;
  const selection = Array.from(figma.currentPage.selection);
  const result = await inspectSelectionVariables(selection, { maxDepth, maxChildren });
  // 调试：直接读取 fillStyleId / strokeStyleId / boundVariables 并通过 figma.notify 把关键字段弹出来
  // 同时收集成纯文本，让 UI 端写入剪贴板。
  const inspectLines: string[] = [];
  try {
      for (const node of selection) {
          inspectLines.push(`# node: ${node.name} (${node.type}) id=${node.id}`);
          const fillStyleId = (node as any).fillStyleId;
          const strokeStyleId = (node as any).strokeStyleId;
          const boundVars = (node as any).boundVariables;
          let fillStyleKey = '';
          let strokeStyleKey = '';
          if (typeof fillStyleId === 'string' && fillStyleId.trim()) {
              try {
                  const style = await figma.getStyleByIdAsync(fillStyleId);
                  fillStyleKey = style ? `${style.name} | key=${style.key}` : fillStyleId;
              } catch {
                  fillStyleKey = fillStyleId;
              }
              inspectLines.push(`[fillStyle] ${fillStyleKey}`);
          }
          if (typeof strokeStyleId === 'string' && strokeStyleId.trim()) {
              try {
                  const style = await figma.getStyleByIdAsync(strokeStyleId);
                  strokeStyleKey = style ? `${style.name} | key=${style.key}` : strokeStyleId;
              } catch {
                  strokeStyleKey = strokeStyleId;
              }
              inspectLines.push(`[strokeStyle] ${strokeStyleKey}`);
          }
          if (boundVars) {
              try {
                  inspectLines.push(`[boundVariables] ${JSON.stringify(boundVars)}`);
              } catch {}
          }
          if (fillStyleKey) figma.notify(`[fillStyle] ${fillStyleKey}`, { timeout: 12000 });
          if (strokeStyleKey) figma.notify(`[strokeStyle] ${strokeStyleKey}`, { timeout: 12000 });
          if (!fillStyleKey && !strokeStyleKey && !boundVars) {
              const line = `[inspect] node "${node.name}" has no styleId / boundVariables`;
              inspectLines.push(line);
              figma.notify(line, { timeout: 6000 });
          }
      }
  } catch (e) {
      const line = `[inspect] error: ${String((e as any)?.message || e)}`;
      inspectLines.push(line);
      figma.notify(line, { timeout: 6000, error: true });
  }
  // 把全部纯文本结果发到 UI 端，UI 端会写入剪贴板并在聊天里显示
  figma.ui.postMessage({
    type: 'inspect-selection-variables-clipboard',
    data: { text: inspectLines.join('\n') }
  });
  if (inspectLines.length > 0) {
      figma.notify('[inspect] 已复制完整结果到剪贴板，可直接粘贴', { timeout: 6000 });
  }
  figma.ui.postMessage({
    type: 'inspect-selection-variables-result',
    data: result
  });
}

async function handleCreateComponent(msg: any) {
    const { component, parentId } = msg;
    // Reset theme on new creation for consistency, or read from UI settings
    // currentTheme = 'light'; 
    try {
      strictRenderMode = true;
      // Explicitly pass isRoot: true to trigger early viewport movement
      const node = await renderComponent(component, { isRoot: true });
      if (!(await appendToResolvedParent(node, parentId))) {
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

async function handleUpdateComponent(msg: any) {
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
      const previousParams = componentId ? readNodeParams(node) : {};
      
      if (componentId) {
        let shouldRefreshSelection = true;
        if (FULL_RERENDER_COMPONENT_IDS.has(componentId)) {
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
            const updated = await updateFormLayoutParams(node, previousParams, params);
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
          selectionUpdateSuppressed = true;
          const replaced = replaceSceneNode(node, replacement);
          if (replaced) {
            if (componentId === 'form-field' && isLayoutChange) {
              const formFrame = findAncestorFormFrame(replacement as SceneNode);
              if (formFrame) {
                const formParams = readNodeParams(formFrame);
                const fieldNodes = collectFormItemNodes(formFrame);
                const fieldIndex = fieldNodes.indexOf(replacement as SceneNode);
                const updated = await updateFormLayoutParams(formFrame, formParams, formParams);
                if (updated) {
                  const nextFieldNodes = collectFormItemNodes(formFrame);
                  const nextSelection = nextFieldNodes[fieldIndex] || formFrame;
                  figma.currentPage.selection = [nextSelection];
                  selectionUpdateSuppressed = false;
                  checkSelection();
                  figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
                  return;
                }
              }
            }
            figma.currentPage.selection = [replacement];
            selectionUpdateSuppressed = false;
            checkSelection();
            figma.ui.postMessage({ type: 'action-done', message: `Updated ${componentId}` });
            return;
          }
          selectionUpdateSuppressed = false;
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
             restoreMergedAnchorCellHeight(node);
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

                const wrapped = createTableWrapperFromTableFrame(tableRoot, params, lockGeneratedContainerNode);
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
                    await ensureTableToolbarOp(buildTableOpCtx(), tableRoot, tableContent.width, {
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
                         await ensureTableFilterGroupInParentOp(buildTableOpCtx(), tableRoot.parent as FrameNode, tableRoot, tableRoot.width);
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
	                    await ensurePaginationRowOp(buildTableOpCtx(), tableRoot, tableContent.width);
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

		            const isMergedTableUpdate = Boolean(
		                (params.tableRenderPlan && typeof params.tableRenderPlan === 'object' &&
		                  ((params.tableRenderPlan as any).hasMultiLevelHeader ||
		                   (Array.isArray((params.tableRenderPlan as any).bodyCells) && (params.tableRenderPlan as any).bodyCells.length > 0))) ||
		                (Array.isArray(params.merges) && params.merges.length > 0)
		            );

		            if (!isMergedTableUpdate && (params.size || params.headerHeight || params.bodyHeight || params.rowHeight || params.height)) {
		                const headerHeight = resolveTableHeaderHeight(params);
		                const bodyHeight = resolveTableBodyHeight(params);
		                applyTableSizeToCells(tableContent, headerHeight, bodyHeight);
	            }
	            if (!isMergedTableUpdate && params.rowCount !== undefined) {
	                const nextRowCount = Number(params.rowCount);
	                if (Number.isFinite(nextRowCount)) {
	                    await updateTableRowCountOp(buildTableOpCtx(), tableContent, nextRowCount);
	                }
	            }
	            if (params.rowAction !== undefined) {
	                await applyRowActionColumnOp(buildTableOpCtx(), tableContent, String(params.rowAction || 'none'));
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
                    restoreMergedAnchorCellHeight(child as SceneNode);
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
                await applyTableHeaderElementToHeaderCellOp(buildTableOpCtx(), headerCellNode, params.headerType);
            }
	        }

        if (isTableCellComponentId(componentId)) {
            // 合并 anchor：在更新前快照合并高度，更新后强制还原，避免任何子操作隐式改高度
            const cellAsScene = node as SceneNode;
            const mergeSnapshot = getMergeAnchorSnapshot(cellAsScene);
            const shouldRerenderNumberUnitContent =
              componentId === 'table-cell-number-unit' &&
              node.type === 'FRAME' &&
              (
                previousParams.unit !== params.unit ||
                previousParams.suffix !== params.suffix ||
                previousParams.value !== params.value ||
                previousParams.number !== params.number ||
                previousParams.num !== params.num ||
                previousParams.text !== params.text
              );
            if (shouldRerenderNumberUnitContent) {
                const rerenderedCell = await renderComponent({
                    id: node.id,
                    componentId,
                    params
                }, { isRoot: false });
                if (rerenderedCell && rerenderedCell.type === 'FRAME') {
                    syncTableCellFrameFromRenderedSource(node as FrameNode, rerenderedCell as FrameNode);
                    reapplyMergeAnchorFrameSnapshot(node as SceneNode, mergeSnapshot);
                    copyPluginDataKeys(rerenderedCell as SceneNode, node as SceneNode, ['is-ai-component', 'component-id', 'params']);
                    try { rerenderedCell.remove(); } catch {}
                }
            }
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
            // 强制还原 anchor 合并高度，覆盖任何隐式变化
            if (mergeSnapshot.isMergeAnchor) {
                reapplyMergeAnchorFrameSnapshot(cellAsScene, mergeSnapshot);
            }
            restoreMergedAnchorCellHeight(cellAsScene);
        }
        if (shouldRefreshSelection) {
            checkSelection();
        }
      }
    }
}

async function handleApplyColumnSettings(msg: any) {
    const { componentId, textAlign, textDisplay, columnWidthMode, width } = msg;
    const selection = figma.currentPage.selection;
    if (selection.length === 1) {
      const node = selection[0];
      if (isAiGeneratedMergedCellSelection(node)) {
        figma.notify('AI生成的合并单元格暂不支持应用到整列', { error: true });
        return;
      }
      const handledMergedTable = await applyMergedTableColumnSettings(msg, node);
      if (handledMergedTable) {
        return;
      }
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
              // 合并产生的 anchor / hidden 占位不能被克隆替换：
              //   - anchor：保留合并高度与 plugin data
              //   - hidden：visible=false 占位，必须保留以维持列高
              const role = child.getPluginData('merge-role');
              if (role === 'merge-anchor' || role === 'merge-hidden') continue;
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
                // 合并 hidden 占位不需要 swap：visible=false，类型保持原样不影响渲染
                const role = child.getPluginData('merge-role');
                if (role === 'merge-hidden') continue;
                const newNode = await swapComponent(child, componentId);
                if (newNode) {
                  newNode.setPluginData('cellType', componentId);
                  if (newNode.parent !== column) {
                    column.insertChild(column.children.indexOf(child), newNode);
                  }
                  restoreMergedAnchorCellHeight(newNode as SceneNode);
                }
              }
            }
            column.setPluginData('cellType', componentId);
          }
        }

        if (isActionCell) {
          await ensureOperationColumnHeaderOp(buildTableOpCtx(), column);
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
            if (!isTableCellComponentId(id)) return false;
            // 合并 hidden 占位 visible=false，跳过避免内部重排
            const role = child.getPluginData('merge-role');
            if (role === 'merge-hidden') return false;
            return true;
          });
          for (const child of children) {
            if (alignToApply) {
              await applyCellAlignment(child, alignToApply as 'left' | 'right' | 'center');
            }
            if (displayToApply) {
              applyCellTextDisplay(child, displayToApply as 'ellipsis' | 'lineBreak');
            }
            restoreMergedAnchorCellHeight(child as SceneNode);
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
        for (const child of column.children) {
          restoreMergedAnchorCellHeight(child as SceneNode);
        }

        checkSelection();
        figma.ui.postMessage({ type: 'action-done', message: 'Applied column settings' });
      } else {
        figma.ui.postMessage({ type: 'action-done', message: 'Applied column settings (no column found)' });
      }
    }
}

async function handleSwapComponent(msg: any) {
    const { componentId } = msg;
    const selection = figma.currentPage.selection;
    if (selection.length === 1) {
      const rawNode = selection[0] as SceneNode;
      let node = rawNode;
      const selectedCell = findTableCellFromNode(node);
      if (selectedCell && isTableCellComponentId(selectedCell.getPluginData('component-id'))) {
        node = selectedCell as SceneNode;
      } else if (node.getPluginData('is-ai-component') !== 'true') {
        const resolved = findAiComponentNode(node);
        if (resolved) {
          node = resolved;
        }
      }

      const formFieldAncestor = findAncestorFormFieldNode(node);
      if (formFieldAncestor) {
        node = formFieldAncestor;
      }

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
                      if (child.getPluginData('merge-role') === 'merge-hidden') continue;
                      const newNode = await swapComponent(child, componentId);
                      if (newNode) {
                        newNode.setPluginData('cellType', componentId);
                        if (newNode.parent !== node) {
                          node.insertChild(node.children.indexOf(child), newNode);
                        }
                        restoreMergedAnchorCellHeight(newNode as SceneNode);
                      }
                      swappedCount++;
                  }
              }
              node.setPluginData('cellType', componentId);
              if (typeof componentId === 'string' && isTableActionCellComponentId(componentId)) {
                  await ensureOperationColumnHeaderOp(buildTableOpCtx(), node);
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
                  checkSelection();
                  figma.ui.postMessage({ type: 'action-done', message: 'Swapped component type' });
              }
          }
      }
    }
}

// ── request-table-context handler ────────────────────────────────────
// 主动从当前选区读取表格上下文，不依赖 selectionchange 事件。
async function handleRequestTableContext() {
  try {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      // 选区已清空（用户点击了输入框），使用缓存兜底
      figma.ui.postMessage({ type: 'table-context-result', tableContext: lastTableContextCache });
      return;
    }

    // 从选中节点向上找表格
    let tableFrame: FrameNode | null = null;
    let selectedColIdx: number | undefined;
    let selectionKind = 'table';

    // 遍历选中节点，找到第一个表格相关节点
    for (const node of selection) {
      // 先尝试当前节点本身
      let current: BaseNode | null = node;
      while (current && current.type !== 'PAGE') {
        if ('getPluginData' in current) {
          const cid = (current as SceneNode).getPluginData('component-id');
          if (cid === 'table' && current.type === 'FRAME') {
            tableFrame = current as FrameNode;
            break;
          }
          if (cid === 'table-column' && !tableFrame) {
            // 找到列，继续向上找表格
            const tf = findTableFrameFromNode(current as SceneNode);
            if (tf) {
              tableFrame = tf;
              // 确定列索引
              const columns = getTableColumns(tf);
              for (let ci = 0; ci < columns.length; ci++) {
                if (columns[ci].id === current.id) {
                  selectedColIdx = ci;
                  selectionKind = 'column';
                  break;
                }
              }
              break;
            }
          }
          if (isTableCellComponentId(cid)) {
            const tf = findTableFrameFromNode(current as SceneNode);
            if (tf) {
              tableFrame = tf;
              selectionKind = 'cell';
              const col = findTableColumnFromNode(current as SceneNode);
              if (col) {
                const columns = getTableColumns(tf);
                for (let ci = 0; ci < columns.length; ci++) {
                  if (columns[ci].id === col.id) {
                    selectedColIdx = ci;
                    break;
                  }
                }
              }
              break;
            }
          }
        }
        current = current.parent;
      }
      if (tableFrame) break;
    }

    if (!tableFrame) {
      // 选区中找不到表格，使用缓存兜底
      figma.ui.postMessage({ type: 'table-context-result', tableContext: lastTableContextCache });
      return;
    }

    // 读取表格数据
    const columns = getTableColumns(tableFrame);
    const headers: string[] = [];
    const rows: string[][] = [];
    let maxRows = 0;

    for (const col of columns) {
      if (col.children.length > 0) {
        headers.push(extractFirstTextContent(col.children[0]));
        const dataCellCount = col.children.length - 1;
        if (dataCellCount > maxRows) maxRows = dataCellCount;
      } else {
        headers.push('');
      }
    }

    for (let ri = 0; ri < maxRows; ri++) {
      const row: string[] = [];
      for (const col of columns) {
        const cellIndex = ri + 1;
        if (cellIndex < col.children.length) {
          row.push(extractFirstTextContent(col.children[cellIndex]));
        } else {
          row.push('');
        }
      }
      rows.push(row);
    }

    let selLabel = '当前选中：表格';
    if (typeof selectedColIdx === 'number') {
      selLabel = selectionKind === 'cell'
        ? `当前选中：${headers[selectedColIdx] || '列' + selectedColIdx} 列的单元格`
        : `当前选中：${headers[selectedColIdx] || '列' + selectedColIdx} 列`;
    }

    const resultContext = {
        headers,
        data: rows,
        selectedColumnIndex: selectedColIdx,
        selectionKind,
        selectionLabel: selLabel,
        tableNodeId: tableFrame.id
    };
    // 保留 selectedColumnIndex：如果当前结果没有列索引但缓存有，继承缓存的列索引
    if (typeof resultContext.selectedColumnIndex !== 'number' &&
        typeof lastTableContextCache?.selectedColumnIndex === 'number') {
      resultContext.selectedColumnIndex = lastTableContextCache.selectedColumnIndex;
    }
    // 更新缓存
    lastTableContextCache = resultContext;
    figma.ui.postMessage({
      type: 'table-context-result',
      tableContext: resultContext
    });
  } catch (e) {
    console.error('[request-table-context] Error:', e);
    // 出错时也用缓存兜底
    figma.ui.postMessage({ type: 'table-context-result', tableContext: lastTableContextCache });
  }
}

// ── edit-table-cells handler ────────────────────────────────────────
// 直接修改现有表格的单元格文本，不经过 apply_scene。
// msg: { type:'edit-table-cells', tableNodeId: string, updates: { columnIndex:number, texts:string[] }[] }
async function handleEditTableCells(msg: any) {
  try {
    const { tableNodeId, updates } = msg;
    const tableNode = await figma.getNodeByIdAsync(tableNodeId);
    if (!tableNode || tableNode.removed || tableNode.type !== 'FRAME') {
      figma.ui.postMessage({ type: 'edit-table-cells-result', ok: false, error: `表格节点 ${tableNodeId} 不存在或已被删除` });
      return;
    }
    const columns = getTableColumns(tableNode as FrameNode);
    if (columns.length === 0) {
      figma.ui.postMessage({ type: 'edit-table-cells-result', ok: false, error: '未找到表格列' });
      return;
    }

    let modifiedCount = 0;

    for (const update of updates) {
      const { columnIndex, texts } = update;
      if (columnIndex < 0 || columnIndex >= columns.length) continue;
      const col = columns[columnIndex];

      // texts[0] = 表头, texts[1..] = 数据行
      // 如果 LLM 只给了部分行，自动循环填充到列的全部行
      const totalCells = col.children.length; // 表头 + 数据行

      // 先写表头
      if (totalCells > 0 && texts.length > 0) {
        const headerCell = col.children[0];
        if (headerCell && !headerCell.removed) {
          const replaced = await replaceAllTextInNode(headerCell, texts[0]);
          if (replaced) modifiedCount++;
        }
      }

      // 数据行：用 texts[1..] 循环填充所有剩余行
      const dataTexts = texts.slice(1);
      if (dataTexts.length > 0) {
        for (let ri = 1; ri < totalCells; ri++) {
          const cell = col.children[ri];
          if (!cell || cell.removed) continue;
          const dataIdx = (ri - 1) % dataTexts.length;
          const replaced = await replaceAllTextInNode(cell, dataTexts[dataIdx]);
          if (replaced) modifiedCount++;
        }
      }
    }

    figma.ui.postMessage({
      type: 'edit-table-cells-result',
      ok: true,
      modifiedCount
    });
  } catch (e: any) {
    figma.ui.postMessage({ type: 'edit-table-cells-result', ok: false, error: String(e?.message || e) });
  }
}

// 递归替换节点内第一个 TEXT 节点的文本
async function replaceAllTextInNode(node: SceneNode, newText: string): Promise<boolean> {
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    await figma.loadFontAsync(textNode.fontName as FontName);
    textNode.characters = newText;
    return true;
  }
  if ('children' in node) {
    for (const child of (node as any).children) {
      const ok = await replaceAllTextInNode(child, newText);
      if (ok) return true;
    }
  }
  return false;
}

async function handleMergeSelectedCells(_msg: any) {
  try {
    const selection = Array.from(figma.currentPage.selection) as SceneNode[];
    if (selection.length < 2) {
      figma.notify('请在画布中多选同一列里连续的 ≥2 个 body 单元格', { error: true, timeout: 5000 });
      figma.ui.postMessage({ type: 'merge-selected-cells-result', ok: false, reason: 'selection<2' });
      return;
    }
    const aiMergeResult = await mergeSelectedAiTableCells(selection);
    if (aiMergeResult.handled) {
      if (!aiMergeResult.ok) {
        figma.notify(aiMergeResult.reason || '合并失败', { error: true, timeout: 5000 });
      } else {
        figma.notify(aiMergeResult.reason || '已合并选中单元格', { timeout: 3000 });
      }
      figma.ui.postMessage({
        type: 'merge-selected-cells-result',
        ok: aiMergeResult.ok,
        reason: aiMergeResult.reason,
        anchorCellId: aiMergeResult.anchorCell?.id
      });
      return;
    }
    const result = mergeSelectedColumnCells(selection);
    if (!result.ok) {
      figma.notify(result.reason || '合并失败', { error: true, timeout: 5000 });
    } else {
      figma.notify('已合并选中单元格', { timeout: 3000 });
      if (result.anchorCell) figma.currentPage.selection = [result.anchorCell];
    }
    figma.ui.postMessage({
      type: 'merge-selected-cells-result',
      ok: result.ok,
      reason: result.reason,
      anchorCellId: result.anchorCell?.id
    });
  } catch (e: any) {
    figma.notify(`合并失败：${String(e?.message || e)}`, { error: true, timeout: 5000 });
    figma.ui.postMessage({ type: 'merge-selected-cells-result', ok: false, reason: String(e?.message || e) });
  }
}

async function handleUnmergeSelectedCells(_msg: any) {
  try {
    const selection = Array.from(figma.currentPage.selection) as SceneNode[];
    // 收集所有 anchor：直接选中 anchor、或选中带 merge-anchor-id 的隐藏占位时回溯到对应 anchor
    const anchors: SceneNode[] = [];
    const seen = new Set<string>();
    const pushAnchor = (node: SceneNode | null | undefined) => {
      if (!node || node.removed) return;
      if (seen.has(node.id)) return;
      seen.add(node.id);
      anchors.push(node);
    };
    for (const node of selection) {
      const role = node.getPluginData('merge-role');
      if (role === 'merge-anchor') {
        pushAnchor(node);
      } else if (role === 'merge-hidden') {
        const anchorId = node.getPluginData('merge-anchor-id');
        if (anchorId) {
          const anchorNode = (await figma.getNodeByIdAsync(anchorId)) as SceneNode | null;
          pushAnchor(anchorNode);
        }
      }
    }
    if (anchors.length === 0) {
      figma.notify('请先选中已合并的母体单元格（合并锚点）', { error: true, timeout: 5000 });
      figma.ui.postMessage({ type: 'unmerge-selected-cells-result', ok: false, reason: 'no-anchor' });
      return;
    }
    let okCount = 0;
    const failures: string[] = [];
    const restored: SceneNode[] = [];
    for (const anchor of anchors) {
      const result = unmergeAnchorCell(anchor);
      if (result.ok) {
        okCount += 1;
        restored.push(anchor);
      } else if (result.reason) {
        failures.push(result.reason);
      }
    }
    if (okCount > 0) {
      figma.notify(`已取消 ${okCount} 个合并`, { timeout: 3000 });
      figma.currentPage.selection = restored;
    } else {
      figma.notify(failures[0] || '取消合并失败', { error: true, timeout: 5000 });
    }
    figma.ui.postMessage({
      type: 'unmerge-selected-cells-result',
      ok: okCount > 0,
      okCount,
      reason: failures[0]
    });
  } catch (e: any) {
    figma.notify(`取消合并失败：${String(e?.message || e)}`, { error: true, timeout: 5000 });
    figma.ui.postMessage({ type: 'unmerge-selected-cells-result', ok: false, reason: String(e?.message || e) });
  }
}

// ── Thin message dispatcher ─────────────────────────────────────────
figma.ui.onmessage = async (msg) => {
  const handlers: Record<string, (m: any) => Promise<void> | void> = {
    'cancel': handleCancel,
    'apply-envelope': handleApplyEnvelope,
    'generate-chart': handleGenerateChart,
    'switch-theme': handleSwitchTheme,
    'set-generation-lock': handleSetGenerationLock,
    'ui-ready': handleUiReady,
    'inspect-figma-component-props': handleInspectProps,
    'inspect-figma-component-structure': handleInspectStructure,
    'inspect-selection-variables': handleInspectVariables,
    'create-component': handleCreateComponent,
    'update-component': handleUpdateComponent,
    'apply-column-settings': handleApplyColumnSettings,
    'swap-component': handleSwapComponent,
    'edit-table-cells': handleEditTableCells,
    'request-table-context': handleRequestTableContext,
    'merge-selected-cells': handleMergeSelectedCells,
    'unmerge-selected-cells': handleUnmergeSelectedCells,
  };
  const handler = handlers[msg.type];
  if (handler) await handler(msg);
};
