import { validateSceneEnvelope } from "../protocol/scene";
import { loadRegistryV2, validateRegistryV2 } from "../registry.loader";
import { syncSubtreeMetadata } from "./metadataSync";
import { renderSceneSubtree } from "./renderSceneNode";
import { EngineTransaction } from "./transaction";
import {
  buildNodeIdMap,
  mapProtocolErrorToApplyError,
  type ApplyContext,
  type ApplyCreateOptions,
  type ApplyResult
} from "./types";

function createContext(options: ApplyCreateOptions = {}): ApplyContext {
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

export async function applyCreate(
  envelope: Extract<import("../protocol/scene").AiSceneEnvelope, { intent: "create" }>,
  options: ApplyCreateOptions = {}
): Promise<ApplyResult> {
  const start = Date.now();
  const ctx = createContext(options);

  const protocolErrors = validateSceneEnvelope(envelope);
  if (protocolErrors.length > 0) {
    return {
      ok: false,
      intent: "create",
      errors: protocolErrors.map(mapProtocolErrorToApplyError),
      durationMs: Date.now() - start
    };
  }

  const registryIssues = validateRegistryV2(ctx.registry);
  if (registryIssues.length > 0) {
    return {
      ok: false,
      intent: "create",
      errors: registryIssues.map((issue) => ({
        code: issue.code,
        message: issue.message,
        path: issue.path,
        recoverable: false
      })),
      durationMs: Date.now() - start
    };
  }

  if (ctx.cancelToken?.isCancelled()) {
    return {
      ok: false,
      intent: "create",
      errors: [
        {
          code: "CANCELLED",
          message: "Create was cancelled before execution",
          recoverable: true
        }
      ],
      durationMs: Date.now() - start
    };
  }

  try {
    const rootScene = envelope.scene.root;
    ctx.rootSceneNodeId = rootScene.nodeId;

    const rootFigmaNode = await renderSceneSubtree(rootScene, ctx, {
      path: rootScene.componentId
    });

    if (options.appendToPage !== false) {
      figma.currentPage.appendChild(rootFigmaNode);
      ctx.transaction.pushUndo(() => rootFigmaNode.remove());
    }

    ctx.rootFigmaNode = rootFigmaNode;
    syncSubtreeMetadata(rootScene.nodeId, ctx, rootScene.componentId);
    ctx.transaction.clear();

    return {
      ok: true,
      intent: "create",
      rootNodeId: rootFigmaNode.id,
      nodeMap: buildNodeIdMap(ctx.nodeMap),
      warnings: ctx.warnings,
      durationMs: Date.now() - start
    };
  } catch (error) {
    await ctx.transaction.rollback();
    return {
      ok: false,
      intent: "create",
      errors: [
        {
          code: "APPLY_FAILED",
          message:
            error instanceof Error ? error.message : "Unknown error during create execution",
          recoverable: false
        }
      ],
      warnings: ctx.warnings,
      durationMs: Date.now() - start
    };
  }
}
