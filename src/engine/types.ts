import type { AiSceneEnvelope, SceneProtocolError, SceneNode as ProtocolSceneNode } from "../protocol/scene";
import type { ComponentRegistry } from "../registry.types";

export type ApplyMode = "strict" | "best_effort";

export interface ApplyWarning {
  code: string;
  message: string;
  path?: string;
}

export interface ApplyError {
  code: string;
  message: string;
  path?: string;
  operationIndex?: number;
  recoverable: boolean;
}

export interface ApplyResult {
  ok: boolean;
  intent: "create" | "edit";
  rootNodeId?: string;
  nodeMap?: Record<string, string>;
  appliedOperations?: number;
  errors?: ApplyError[];
  warnings?: ApplyWarning[];
  durationMs: number;
}

export interface CancelToken {
  isCancelled(): boolean;
}

export type UndoAction = () => void | Promise<void>;

export interface TransactionLike {
  pushUndo(action: UndoAction): void;
  rollback(): Promise<void>;
  clear(): void;
}

export interface ParentLink {
  parentId?: string;
  slot?: string;
  index?: number;
}

export interface ApplyContext {
  mode: ApplyMode;
  registry: ComponentRegistry;
  nodeMap: Map<string, SceneNode>;
  sceneMap: Map<string, ProtocolSceneNode>;
  parentMap: Map<string, ParentLink>;
  warnings: ApplyWarning[];
  errors: ApplyError[];
  transaction: TransactionLike;
  cancelToken?: CancelToken;
  rootSceneNodeId?: string;
  rootFigmaNode?: SceneNode;
}

export interface ExecuteOperationResult {
  ok: boolean;
  error?: ApplyError;
}

export interface ApplyEnvelopeOptions {
  registry?: ComponentRegistry;
  mode?: ApplyMode;
  cancelToken?: CancelToken;
}

export interface ApplyCreateOptions extends ApplyEnvelopeOptions {
  appendToPage?: boolean;
}

export interface ApplyPatchOptions extends ApplyEnvelopeOptions {
  targetRootSceneId?: string;
}

export function mapProtocolErrorToApplyError(error: SceneProtocolError): ApplyError {
  return {
    code: error.code,
    message: error.message,
    path: error.path,
    operationIndex: error.operationIndex,
    recoverable: error.recoverable
  };
}

export function buildNodeIdMap(nodeMap: Map<string, SceneNode>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [sceneNodeId, figmaNode] of nodeMap.entries()) {
    result[sceneNodeId] = figmaNode.id;
  }
  return result;
}

export function isCreateEnvelope(
  envelope: AiSceneEnvelope
): envelope is Extract<AiSceneEnvelope, { intent: "create" }> {
  return envelope.intent === "create";
}

export function isEditEnvelope(
  envelope: AiSceneEnvelope
): envelope is Extract<AiSceneEnvelope, { intent: "edit" }> {
  return envelope.intent === "edit";
}
