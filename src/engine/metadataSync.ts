import { writeNodeMeta } from "../metadata";
import type { SceneNode as ProtocolSceneNode } from "../protocol/scene";
import type { ApplyContext, ApplyWarning } from "./types";

function asWarning(code: string, message: string, path?: string): ApplyWarning {
  return { code, message, path };
}

export function buildScenePath(
  sceneNode: ProtocolSceneNode,
  parentPath?: string,
  slot?: string,
  index?: number
): string {
  const childLabel = `${sceneNode.componentId}${index !== undefined ? `[${index}]` : ""}`;
  if (!parentPath) {
    return childLabel;
  }
  if (slot) {
    return `${parentPath}.${slot}.${childLabel}`;
  }
  return `${parentPath}.${childLabel}`;
}

function getSortedChildrenIds(sceneNodeId: string, ctx: ApplyContext): string[] {
  const children: Array<{ id: string; index: number }> = [];

  for (const [candidateId, link] of ctx.parentMap.entries()) {
    if (link.parentId !== sceneNodeId) continue;
    children.push({ id: candidateId, index: link.index ?? Number.MAX_SAFE_INTEGER });
  }

  children.sort((a, b) => a.index - b.index);
  return children.map((item) => item.id);
}

export function syncSingleNodeMetadata(
  sceneNode: ProtocolSceneNode,
  ctx: ApplyContext,
  path: string
): void {
  const figmaNode = ctx.nodeMap.get(sceneNode.nodeId);
  if (!figmaNode) {
    ctx.warnings.push(
      asWarning(
        "METADATA_SYNC_SKIPPED",
        `Cannot sync metadata for missing node '${sceneNode.nodeId}'`,
        path
      )
    );
    return;
  }

  const writeResult = writeNodeMeta(figmaNode, {
    nodeId: sceneNode.nodeId,
    componentId: sceneNode.componentId,
    version: "1.0",
    variant: sceneNode.variant,
    props: sceneNode.props,
    layout: sceneNode.layout,
    style: sceneNode.style,
    bindings: sceneNode.bindings,
    path,
    rootId: ctx.rootSceneNodeId
  });

  if (!writeResult.ok) {
    ctx.warnings.push(
      asWarning(
        writeResult.error.code,
        `Metadata sync failed: ${writeResult.error.message}`,
        path
      )
    );
    return;
  }

  if (writeResult.warnings) {
    for (const warning of writeResult.warnings) {
      ctx.warnings.push(
        asWarning(warning.code, warning.message, path)
      );
    }
  }
}

export function syncSubtreeMetadata(sceneNodeId: string, ctx: ApplyContext, path?: string): void {
  const sceneNode = ctx.sceneMap.get(sceneNodeId);
  if (!sceneNode) return;

  const parentLink = ctx.parentMap.get(sceneNodeId);
  const computedPath = path ?? buildScenePath(sceneNode, undefined, parentLink?.slot, parentLink?.index);
  syncSingleNodeMetadata(sceneNode, ctx, computedPath);

  const childIds = getSortedChildrenIds(sceneNodeId, ctx);
  childIds.forEach((childId, index) => {
    const childNode = ctx.sceneMap.get(childId);
    if (!childNode) return;

    const link = ctx.parentMap.get(childId);
    const childPath = buildScenePath(
      childNode,
      computedPath,
      link?.slot,
      link?.index ?? index
    );
    syncSubtreeMetadata(childId, ctx, childPath);
  });
}
