import type { ComponentInstance } from '../../types';

const COMPONENT_INSTANCE_KEY = 'component-instance';

export function readNodeParams(node: BaseNode): Record<string, any> {
  if (!('getPluginData' in node)) return {};
  const raw = node.getPluginData('params');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function writeNodeParams(node: BaseNode, nextParams: Record<string, any>) {
  if (!('setPluginData' in node)) return;
  try {
    node.setPluginData('params', JSON.stringify(nextParams));
  } catch (e) {
    console.warn('Failed to write node params', e);
  }
}

export function mergeNodeParams(node: BaseNode, patch: Record<string, any>) {
  const current = readNodeParams(node);
  writeNodeParams(node, { ...current, ...patch });
}

export function readComponentInstanceSnapshot(node: BaseNode): ComponentInstance | null {
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

export function writeComponentInstanceSnapshot(node: BaseNode, instance: ComponentInstance) {
  if (!('setPluginData' in node)) return;
  try {
    node.setPluginData(COMPONENT_INSTANCE_KEY, JSON.stringify(instance));
  } catch (e) {
    console.warn('Failed to write component instance snapshot', e);
  }
}

export function collectTextNodes(root: SceneNode, options: { skipInstances?: boolean } = { skipInstances: false }): TextNode[] {
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
