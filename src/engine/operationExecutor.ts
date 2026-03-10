import type { SceneOperation } from "../protocol/scene";
import { syncSubtreeMetadata } from "./metadataSync";
import {
  isComponentAllowedInSlot,
  isOperationAllowed,
  resolveComponentDefinition,
  resolveSlotDefinition,
  toInvalidSlotError,
  toUnknownComponentError
} from "./registryResolver";
import {
  applyLayoutToFigmaNode,
  applyPropsToFigmaNode,
  applyStyleToFigmaNode,
  insertChildNode,
  renderSceneSubtree
} from "./renderSceneNode";
import { captureNodePosition } from "./transaction";
import type { ApplyContext, ApplyError, ExecuteOperationResult, ParentLink } from "./types";

type ParentContainer = BaseNode & ChildrenMixin;

function isParentContainer(node: BaseNode | null): node is ParentContainer {
  return Boolean(node && typeof (node as ParentContainer).appendChild === "function");
}

function makeError(
  code: string,
  message: string,
  operationIndex: number,
  recoverable: boolean,
  path?: string
): ApplyError {
  return {
    code,
    message,
    operationIndex,
    recoverable,
    path
  };
}

function collectSubtreeIds(rootId: string, parentMap: Map<string, ParentLink>): string[] {
  const stack: string[] = [rootId];
  const all: string[] = [];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    all.push(current);

    for (const [candidateId, link] of parentMap.entries()) {
      if (link.parentId === current) {
        stack.push(candidateId);
      }
    }
  }

  return all;
}

function removeSubtreeFromContext(sceneNodeId: string, ctx: ApplyContext): void {
  const ids = collectSubtreeIds(sceneNodeId, ctx.parentMap);
  ids.forEach((id) => {
    ctx.nodeMap.delete(id);
    ctx.sceneMap.delete(id);
    ctx.parentMap.delete(id);
  });
}

function wouldCreateCycle(nodeId: string, newParentId: string, ctx: ApplyContext): boolean {
  let current: string | undefined = newParentId;
  while (current) {
    if (current === nodeId) return true;
    current = ctx.parentMap.get(current)?.parentId;
  }
  return false;
}

function ensureNodeExists(sceneNodeId: string, ctx: ApplyContext, operationIndex: number): ExecuteOperationResult {
  if (!ctx.nodeMap.has(sceneNodeId) || !ctx.sceneMap.has(sceneNodeId)) {
    return {
      ok: false,
      error: makeError(
        "NODE_NOT_FOUND",
        `Node '${sceneNodeId}' not found`,
        operationIndex,
        true
      )
    };
  }
  return { ok: true };
}

async function executeAddNode(
  operation: Extract<SceneOperation, { op: "add_node" }>,
  ctx: ApplyContext,
  operationIndex: number
): Promise<ExecuteOperationResult> {
  if (ctx.nodeMap.has(operation.node.nodeId)) {
    return {
      ok: false,
      error: makeError(
        "NODE_ID_CONFLICT",
        `Node '${operation.node.nodeId}' already exists`,
        operationIndex,
        true
      )
    };
  }

  const parentExists = ensureNodeExists(operation.parentId, ctx, operationIndex);
  if (!parentExists.ok) return parentExists;

  const parentScene = ctx.sceneMap.get(operation.parentId)!;
  const parentDef = resolveComponentDefinition(ctx.registry, parentScene.componentId);
  if (!parentDef) {
    return {
      ok: false,
      error: toUnknownComponentError(parentScene.componentId, `patch.operations[${operationIndex}]`)
    };
  }

  if (!isOperationAllowed(parentDef, operation)) {
    return {
      ok: false,
      error: makeError(
        "INVALID_OPERATION",
        `Component '${parentDef.id}' does not allow adding children`,
        operationIndex,
        true
      )
    };
  }

  if (parentDef.slots && !resolveSlotDefinition(parentDef, operation.slot)) {
    return { ok: false, error: toInvalidSlotError(parentDef.id, operation.slot, `patch.operations[${operationIndex}]`) };
  }

  if (!isComponentAllowedInSlot(parentDef, operation.node.componentId, operation.slot)) {
    return {
      ok: false,
      error: makeError(
        "INVALID_SLOT",
        `Component '${operation.node.componentId}' is not allowed in slot '${operation.slot ?? "default"}'`,
        operationIndex,
        true
      )
    };
  }

  const parentNode = ctx.nodeMap.get(operation.parentId)!;
  const rendered = await renderSceneSubtree(operation.node, ctx, {
    parentNode,
    parentSceneId: operation.parentId,
    slot: operation.slot,
    index: operation.index
  });

  ctx.transaction.pushUndo(() => {
    removeSubtreeFromContext(operation.node.nodeId, ctx);
    rendered.remove();
  });

  return { ok: true };
}

async function executeRemoveNode(
  operation: Extract<SceneOperation, { op: "remove_node" }>,
  ctx: ApplyContext,
  operationIndex: number
): Promise<ExecuteOperationResult> {
  if (operation.nodeId === ctx.rootSceneNodeId) {
    return {
      ok: false,
      error: makeError("INVALID_OPERATION", "Cannot remove root node", operationIndex, false)
    };
  }

  const exists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!exists.ok) return exists;

  const figmaNode = ctx.nodeMap.get(operation.nodeId)!;
  const position = captureNodePosition(figmaNode);
  const snapshot = figmaNode.clone();

  figmaNode.remove();
  removeSubtreeFromContext(operation.nodeId, ctx);

  ctx.transaction.pushUndo(() => {
    if (position.parent && isParentContainer(position.parent)) {
      const restoreIndex =
        position.index >= 0 && position.index <= position.parent.children.length
          ? position.index
          : position.parent.children.length;
      position.parent.insertChild(restoreIndex, snapshot);
    }
  });

  return { ok: true };
}

async function executeMoveNode(
  operation: Extract<SceneOperation, { op: "move_node" }>,
  ctx: ApplyContext,
  operationIndex: number
): Promise<ExecuteOperationResult> {
  if (operation.nodeId === ctx.rootSceneNodeId) {
    return {
      ok: false,
      error: makeError("INVALID_OPERATION", "Cannot move root node", operationIndex, false)
    };
  }

  const sourceExists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!sourceExists.ok) return sourceExists;

  const targetExists = ensureNodeExists(operation.newParentId, ctx, operationIndex);
  if (!targetExists.ok) return targetExists;

  if (wouldCreateCycle(operation.nodeId, operation.newParentId, ctx)) {
    return {
      ok: false,
      error: makeError("CYCLE_DETECTED", "move_node would create a cycle", operationIndex, false)
    };
  }

  const movingNode = ctx.nodeMap.get(operation.nodeId)!;
  const newParentNode = ctx.nodeMap.get(operation.newParentId)!;
  const oldPosition = captureNodePosition(movingNode);
  const oldLink = ctx.parentMap.get(operation.nodeId);

  const inserted = insertChildNode(newParentNode, movingNode, operation.index);
  if (!inserted) {
    return {
      ok: false,
      error: makeError(
        "INVALID_OPERATION",
        `Target parent '${operation.newParentId}' does not support children`,
        operationIndex,
        true
      )
    };
  }

  ctx.parentMap.set(operation.nodeId, {
    parentId: operation.newParentId,
    slot: operation.slot,
    index: operation.index
  });
  syncSubtreeMetadata(operation.nodeId, ctx);

  ctx.transaction.pushUndo(() => {
    if (oldPosition.parent && isParentContainer(oldPosition.parent)) {
      const restoreIndex =
        oldPosition.index >= 0 && oldPosition.index <= oldPosition.parent.children.length
          ? oldPosition.index
          : oldPosition.parent.children.length;
      oldPosition.parent.insertChild(restoreIndex, movingNode);
    }
    if (oldLink) {
      ctx.parentMap.set(operation.nodeId, oldLink);
    } else {
      ctx.parentMap.delete(operation.nodeId);
    }
  });

  return { ok: true };
}

async function executeSetProps(
  operation: Extract<SceneOperation, { op: "set_props" }>,
  ctx: ApplyContext,
  operationIndex: number
): Promise<ExecuteOperationResult> {
  const exists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!exists.ok) return exists;

  const sceneNode = ctx.sceneMap.get(operation.nodeId)!;
  const componentDef = resolveComponentDefinition(ctx.registry, sceneNode.componentId);
  if (!componentDef) {
    return { ok: false, error: toUnknownComponentError(sceneNode.componentId) };
  }
  if (!isOperationAllowed(componentDef, operation)) {
    return {
      ok: false,
      error: makeError(
        "INVALID_OPERATION",
        `Component '${componentDef.id}' does not allow set_props`,
        operationIndex,
        true
      )
    };
  }

  const previousProps = { ...sceneNode.props };
  const nextProps = operation.merge === false ? { ...operation.props } : { ...sceneNode.props, ...operation.props };
  sceneNode.props = nextProps;

  await applyPropsToFigmaNode(ctx.nodeMap.get(operation.nodeId)!, sceneNode.props, ctx);
  syncSubtreeMetadata(operation.nodeId, ctx);

  ctx.transaction.pushUndo(async () => {
    sceneNode.props = previousProps;
    await applyPropsToFigmaNode(ctx.nodeMap.get(operation.nodeId)!, sceneNode.props, ctx);
    syncSubtreeMetadata(operation.nodeId, ctx);
  });

  return { ok: true };
}

function executeSetLayout(
  operation: Extract<SceneOperation, { op: "set_layout" }>,
  ctx: ApplyContext,
  operationIndex: number
): ExecuteOperationResult {
  const exists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!exists.ok) return exists;

  const sceneNode = ctx.sceneMap.get(operation.nodeId)!;
  const previousLayout = sceneNode.layout ? { ...sceneNode.layout } : undefined;
  sceneNode.layout = { ...operation.layout };

  applyLayoutToFigmaNode(ctx.nodeMap.get(operation.nodeId)!, sceneNode.layout);
  syncSubtreeMetadata(operation.nodeId, ctx);

  ctx.transaction.pushUndo(() => {
    sceneNode.layout = previousLayout;
    applyLayoutToFigmaNode(ctx.nodeMap.get(operation.nodeId)!, sceneNode.layout);
    syncSubtreeMetadata(operation.nodeId, ctx);
  });

  return { ok: true };
}

async function executeSetStyle(
  operation: Extract<SceneOperation, { op: "set_style" }>,
  ctx: ApplyContext,
  operationIndex: number
): Promise<ExecuteOperationResult> {
  const exists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!exists.ok) return exists;

  const sceneNode = ctx.sceneMap.get(operation.nodeId)!;
  const previousStyle = sceneNode.style ? { ...sceneNode.style } : undefined;
  sceneNode.style = { ...operation.style };

  await applyStyleToFigmaNode(ctx.nodeMap.get(operation.nodeId)!, sceneNode.style, ctx);
  syncSubtreeMetadata(operation.nodeId, ctx);

  ctx.transaction.pushUndo(async () => {
    sceneNode.style = previousStyle;
    await applyStyleToFigmaNode(ctx.nodeMap.get(operation.nodeId)!, sceneNode.style, ctx);
    syncSubtreeMetadata(operation.nodeId, ctx);
  });

  return { ok: true };
}

function executeSwapVariant(
  operation: Extract<SceneOperation, { op: "swap_variant" }>,
  ctx: ApplyContext,
  operationIndex: number
): ExecuteOperationResult {
  const exists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!exists.ok) return exists;

  const sceneNode = ctx.sceneMap.get(operation.nodeId)!;
  const currentDef = resolveComponentDefinition(ctx.registry, sceneNode.componentId);
  if (!currentDef) {
    return { ok: false, error: toUnknownComponentError(sceneNode.componentId) };
  }
  if (!isOperationAllowed(currentDef, operation)) {
    return {
      ok: false,
      error: makeError(
        "INVALID_OPERATION",
        `Component '${currentDef.id}' does not allow swap_variant`,
        operationIndex,
        true
      )
    };
  }

  const nextDef = resolveComponentDefinition(ctx.registry, operation.componentId);
  if (!nextDef) {
    return { ok: false, error: toUnknownComponentError(operation.componentId) };
  }

  const previousComponentId = sceneNode.componentId;
  const previousVariant = sceneNode.variant;
  const previousProps = { ...sceneNode.props };

  sceneNode.componentId = operation.componentId;
  sceneNode.variant = operation.variant;
  if (!operation.carryProps) {
    sceneNode.props = {};
  }

  const figmaNode = ctx.nodeMap.get(operation.nodeId)!;
  figmaNode.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
  syncSubtreeMetadata(operation.nodeId, ctx);

  ctx.transaction.pushUndo(() => {
    sceneNode.componentId = previousComponentId;
    sceneNode.variant = previousVariant;
    sceneNode.props = previousProps;
    figmaNode.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
    syncSubtreeMetadata(operation.nodeId, ctx);
  });

  return { ok: true };
}

function executeBindData(
  operation: Extract<SceneOperation, { op: "bind_data" }>,
  ctx: ApplyContext,
  operationIndex: number
): ExecuteOperationResult {
  const exists = ensureNodeExists(operation.nodeId, ctx, operationIndex);
  if (!exists.ok) return exists;

  const sceneNode = ctx.sceneMap.get(operation.nodeId)!;
  const previousBindings = sceneNode.bindings ? [...sceneNode.bindings] : undefined;
  const nextBindings = operation.replace
    ? [...operation.bindings]
    : [...(sceneNode.bindings ?? []), ...operation.bindings];
  sceneNode.bindings = nextBindings;

  syncSubtreeMetadata(operation.nodeId, ctx);

  ctx.transaction.pushUndo(() => {
    sceneNode.bindings = previousBindings;
    syncSubtreeMetadata(operation.nodeId, ctx);
  });

  return { ok: true };
}

export async function executeOperation(
  operation: SceneOperation,
  ctx: ApplyContext,
  operationIndex: number
): Promise<ExecuteOperationResult> {
  switch (operation.op) {
    case "add_node":
      return executeAddNode(operation, ctx, operationIndex);
    case "remove_node":
      return executeRemoveNode(operation, ctx, operationIndex);
    case "move_node":
      return executeMoveNode(operation, ctx, operationIndex);
    case "set_props":
      return executeSetProps(operation, ctx, operationIndex);
    case "set_layout":
      return executeSetLayout(operation, ctx, operationIndex);
    case "set_style":
      return executeSetStyle(operation, ctx, operationIndex);
    case "swap_variant":
      return executeSwapVariant(operation, ctx, operationIndex);
    case "bind_data":
      return executeBindData(operation, ctx, operationIndex);
    default:
      return {
        ok: false,
        error: makeError(
          "INVALID_OPERATION",
          `Unsupported operation '${(operation as { op: string }).op}'`,
          operationIndex,
          true
        )
      };
  }
}
