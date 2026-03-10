import { buildSelectionContext, readNodeMeta } from "../metadata";
import type { NodeMetadataV1 } from "../metadata";
import type { AiSceneEnvelope, SceneNode as ProtocolSceneNode } from "../protocol/scene";
import { validateSceneEnvelope } from "../protocol/scene";
import { loadRegistryV2, validateRegistryV2 } from "../registry.loader";
import { syncSubtreeMetadata } from "./metadataSync";
import { executeOperation } from "./operationExecutor";
import { EngineTransaction } from "./transaction";
import {
  buildNodeIdMap,
  mapProtocolErrorToApplyError,
  type ApplyContext,
  type ApplyPatchOptions,
  type ApplyResult
} from "./types";

type ParentContainer = BaseNode & ChildrenMixin;

function isParentContainer(node: BaseNode | null): node is ParentContainer {
  return Boolean(node && typeof (node as ParentContainer).appendChild === "function");
}

function createContext(options: ApplyPatchOptions = {}): ApplyContext {
  return {
    mode: options.mode ?? "strict",
    registry: loadRegistryV2(options.registry),
    nodeMap: new Map(),
    sceneMap: new Map(),
    parentMap: new Map(),
    warnings: [],
    errors: [],
    transaction: new EngineTransaction(),
    cancelToken: options.cancelToken
  };
}

function iterateSubtree(root: SceneNode): SceneNode[] {
  const nodes: SceneNode[] = [];
  const stack: SceneNode[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    nodes.push(current);

    if (isParentContainer(current)) {
      for (let i = current.children.length - 1; i >= 0; i -= 1) {
        const child = current.children[i];
        stack.push(child);
      }
    }
  }

  return nodes;
}

function findNodeBySceneId(sceneNodeId: string): SceneNode | null {
  const roots = [...figma.currentPage.children];
  const stack: SceneNode[] = roots;

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) continue;

    const meta = readNodeMeta(node);
    if (meta.ok && meta.data?.nodeId === sceneNodeId) {
      return node;
    }

    if (isParentContainer(node)) {
      stack.push(...node.children);
    }
  }

  return null;
}

function toSceneSnapshot(meta: NodeMetadataV1): ProtocolSceneNode {
  return {
    nodeId: meta.nodeId,
    componentId: meta.componentId,
    variant: meta.variant,
    props: meta.props ?? {},
    layout: meta.layout,
    style: meta.style,
    bindings: meta.bindings,
    children: []
  };
}

function indexExistingTree(rootNode: SceneNode, ctx: ApplyContext): void {
  const allNodes = iterateSubtree(rootNode);

  for (const node of allNodes) {
    const metaResult = readNodeMeta(node);
    if (!metaResult.ok || !metaResult.data) continue;
    const snapshot = toSceneSnapshot(metaResult.data);
    ctx.nodeMap.set(snapshot.nodeId, node);
    ctx.sceneMap.set(snapshot.nodeId, snapshot);
  }

  for (const [sceneNodeId, figmaNode] of ctx.nodeMap.entries()) {
    const parent = figmaNode.parent;
    if (!isParentContainer(parent)) continue;

    const parentMeta = readNodeMeta(parent);
    if (!parentMeta.ok || !parentMeta.data) continue;

    const index = parent.children.indexOf(figmaNode);
    ctx.parentMap.set(sceneNodeId, {
      parentId: parentMeta.data.nodeId,
      index
    });
  }
}

function resolvePatchRoot(
  envelope: Extract<AiSceneEnvelope, { intent: "edit" }>,
  options: ApplyPatchOptions
): { rootNode: SceneNode; rootSceneId: string } | null {
  const explicitRootId = options.targetRootSceneId ?? envelope.target?.rootNodeId;
  if (explicitRootId) {
    const explicitRoot = findNodeBySceneId(explicitRootId);
    if (!explicitRoot) return null;
    return { rootNode: explicitRoot, rootSceneId: explicitRootId };
  }

  const selection = figma.currentPage.selection;
  if (selection.length !== 1) {
    return null;
  }

  const selectionContext = buildSelectionContext(selection[0]);
  if (!selectionContext) {
    return null;
  }

  const rootSceneId = selectionContext.rootId ?? selectionContext.nodeId;
  const rootNode = findNodeBySceneId(rootSceneId);
  if (!rootNode) {
    return null;
  }

  return { rootNode, rootSceneId };
}

export async function applyPatch(
  envelope: Extract<AiSceneEnvelope, { intent: "edit" }>,
  options: ApplyPatchOptions = {}
): Promise<ApplyResult> {
  const start = Date.now();
  const ctx = createContext(options);

  const protocolErrors = validateSceneEnvelope(envelope);
  if (protocolErrors.length > 0) {
    return {
      ok: false,
      intent: "edit",
      errors: protocolErrors.map(mapProtocolErrorToApplyError),
      durationMs: Date.now() - start
    };
  }

  const registryIssues = validateRegistryV2(ctx.registry);
  if (registryIssues.length > 0) {
    return {
      ok: false,
      intent: "edit",
      errors: registryIssues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path,
        recoverable: false
      })),
      durationMs: Date.now() - start
    };
  }

  const resolvedRoot = resolvePatchRoot(envelope, options);
  if (!resolvedRoot) {
    return {
      ok: false,
      intent: "edit",
      errors: [
        {
          code: "NODE_NOT_FOUND",
          message: "Cannot locate patch root. Select an AI node or provide target.rootNodeId",
          recoverable: false
        }
      ],
      durationMs: Date.now() - start
    };
  }

  ctx.rootSceneNodeId = resolvedRoot.rootSceneId;
  ctx.rootFigmaNode = resolvedRoot.rootNode;

  indexExistingTree(resolvedRoot.rootNode, ctx);

  let appliedOperations = 0;

  for (let i = 0; i < envelope.patch.operations.length; i += 1) {
    if (ctx.cancelToken?.isCancelled()) {
      ctx.errors.push({
        code: "CANCELLED",
        message: "Patch execution cancelled",
        operationIndex: i,
        recoverable: true
      });
      break;
    }

    const operation = envelope.patch.operations[i];
    const execResult = await executeOperation(operation, ctx, i);

    if (!execResult.ok && execResult.error) {
      ctx.errors.push(execResult.error);

      const shouldStop = ctx.mode === "strict" || !execResult.error.recoverable;
      if (shouldStop) {
        await ctx.transaction.rollback();
        return {
          ok: false,
          intent: "edit",
          rootNodeId: resolvedRoot.rootNode.id,
          nodeMap: buildNodeIdMap(ctx.nodeMap),
          appliedOperations,
          errors: ctx.errors,
          warnings: ctx.warnings,
          durationMs: Date.now() - start
        };
      }

      continue;
    }

    appliedOperations += 1;
  }

  const rootSnapshot = ctx.sceneMap.get(resolvedRoot.rootSceneId);
  syncSubtreeMetadata(
    resolvedRoot.rootSceneId,
    ctx,
    rootSnapshot?.componentId ?? resolvedRoot.rootSceneId
  );
  ctx.transaction.clear();

  return {
    ok: ctx.errors.length === 0,
    intent: "edit",
    rootNodeId: resolvedRoot.rootNode.id,
    nodeMap: buildNodeIdMap(ctx.nodeMap),
    appliedOperations,
    errors: ctx.errors.length > 0 ? ctx.errors : undefined,
    warnings: ctx.warnings,
    durationMs: Date.now() - start
  };
}
