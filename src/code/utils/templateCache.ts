import type { VariantCriteria } from '../../figmaComponent';

export const FIGMA_COMPONENT_INSTANCE_TEMPLATE_CACHE = new Map<string, InstanceNode>();
export const FIGMA_COMPONENT_INSTANCE_FAILURE_CACHE = new Map<string, number>();
export const FIGMA_COMPONENT_INSTANCE_FAILURE_TTL = 5 * 60 * 1000;
export const FAST_FAIL_COMPONENT_TOKENS = new Set<string>();
export const TAG_TEMPLATE_CACHE = new Map<string, SceneNode>();

export const TEMPLATE_CACHE_FRAME_KEY = 'uia-template-cache-frame';
export const TEMPLATE_CACHE_NODE_KEY = 'uia-template-cache-node';
export const TEMPLATE_CACHE_NODE_CACHE_KEY = 'uia-template-cache-key';
export const TEMPLATE_CACHE_NODE_KIND = 'uia-template-cache-kind';
export const STATUS_TAG_LABEL_NODE_KEY = 'uia-status-tag-label-node';
export type TemplateCacheKind = 'component-instance' | 'tag-template';

export const TABLE_CELL_PREWARM_STATE = {
  scheduled: false,
  inFlight: false,
  warmedFonts: false,
  warmedTokens: new Set<string>(),
  warmedDefaultTag: false
};

export const TABLE_CELL_PREWARM_TOKENS = [
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

export function serializeVariantCriteria(
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

export function buildTokenCacheKey(
  token: string,
  criteria?: VariantCriteria | ((variant: ComponentNode) => boolean)
): string | null {
  const serialized = serializeVariantCriteria(criteria);
  if (serialized === null) return null;
  return serialized ? `${token}::${serialized}` : token;
}

export function buildTagTemplateCacheKey(componentKey: string, criteria?: Record<string, string>): string {
  const serialized = serializeVariantCriteria(criteria);
  if (!serialized) return `${componentKey}::default`;
  return `${componentKey}::${serialized}`;
}

export function getTemplateCacheFrame(): FrameNode {
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

export function registerTemplateNode(cacheKey: string, kind: TemplateCacheKind, node: SceneNode): void {
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

export function clearTemplateNodeMarker(node: SceneNode): void {
  try {
    node.setPluginData(TEMPLATE_CACHE_NODE_KEY, '');
    node.setPluginData(TEMPLATE_CACHE_NODE_CACHE_KEY, '');
    node.setPluginData(TEMPLATE_CACHE_NODE_KIND, '');
  } catch {}
}

export function markStatusTagLabelNode(root: SceneNode, target: TextNode | null): void {
    const allTextNodes =
        'findAll' in root
            ? (root.findAll((node) => node.type === 'TEXT') as TextNode[])
            : root.type === 'TEXT'
                ? [root]
                : [];
    allTextNodes.forEach((node) => {
        try {
            node.setPluginData(STATUS_TAG_LABEL_NODE_KEY, node === target ? 'true' : '');
        } catch {}
    });
}
