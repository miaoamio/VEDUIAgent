export const SCENE_PROTOCOL_VERSION = "1.0" as const;

export type SceneProtocolVersion = typeof SCENE_PROTOCOL_VERSION;

export interface EnvelopeMeta {
  locale?: string;
  theme?: string;
  source?: "user" | "agent";
  generatedAt?: string;
}

export interface DataBinding {
  key: string;
  source: string;
  transform?: string;
}

export interface VariableBinding {
  id: string;
  target: "color" | "typography" | "space" | "radius";
  ref: string;
}

export interface SceneConstraint {
  type: "maxDepth" | "maxNodeCount";
  value: number;
}

export interface LayoutSpec {
  mode?: "horizontal" | "vertical" | "none";
  width?: { type: "fixed"; value: number } | { type: "fill" } | { type: "hug" };
  height?: { type: "fixed"; value: number } | { type: "fill" } | { type: "hug" };
  align?: "start" | "center" | "end" | "stretch";
  gap?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}

export interface StyleSpec {
  fill?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  effect?: "none" | "shadow";
  textStyleRef?: string;
  paintStyleRef?: string;
}

export interface SceneNode {
  nodeId: string;
  componentId: string;
  variant?: string;
  props: Record<string, unknown>;
  layout?: LayoutSpec;
  style?: StyleSpec;
  slots?: Record<string, SceneNode[]>;
  children?: SceneNode[];
  bindings?: DataBinding[];
  meta?: {
    role?: string;
    path?: string;
    lock?: boolean;
  };
}

export interface SceneSchema {
  root: SceneNode;
  variables?: VariableBinding[];
  constraints?: SceneConstraint[];
}

export type SceneOperation =
  | {
      op: "add_node";
      parentId: string;
      node: SceneNode;
      index?: number;
      slot?: string;
    }
  | {
      op: "remove_node";
      nodeId: string;
    }
  | {
      op: "move_node";
      nodeId: string;
      newParentId: string;
      index?: number;
      slot?: string;
    }
  | {
      op: "set_props";
      nodeId: string;
      props: Record<string, unknown>;
      merge?: boolean;
    }
  | {
      op: "set_layout";
      nodeId: string;
      layout: LayoutSpec;
    }
  | {
      op: "set_style";
      nodeId: string;
      style: StyleSpec;
    }
  | {
      op: "swap_variant";
      nodeId: string;
      componentId: string;
      variant?: string;
      carryProps?: boolean;
    }
  | {
      op: "bind_data";
      nodeId: string;
      bindings: DataBinding[];
      replace?: boolean;
    };

export interface ScenePatch {
  baseVersion?: string;
  operations: SceneOperation[];
}

export type AiSceneEnvelope =
  | {
      version: SceneProtocolVersion;
      intent: "create";
      scene: SceneSchema;
      requestId?: string;
      meta?: EnvelopeMeta;
    }
  | {
      version: SceneProtocolVersion;
      intent: "edit";
      patch: ScenePatch;
      requestId?: string;
      target?: { rootNodeId?: string };
      meta?: EnvelopeMeta;
    };

export type SceneProtocolErrorCode =
  | "INVALID_ENVELOPE"
  | "UNSUPPORTED_VERSION"
  | "UNKNOWN_COMPONENT"
  | "INVALID_SLOT"
  | "NODE_NOT_FOUND"
  | "NODE_ID_CONFLICT"
  | "CYCLE_DETECTED"
  | "INVALID_OPERATION"
  | "APPLY_FAILED";

export interface SceneProtocolError {
  code: SceneProtocolErrorCode;
  message: string;
  path?: string;
  operationIndex?: number;
  recoverable: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toError(
  code: SceneProtocolErrorCode,
  message: string,
  recoverable = false,
  path?: string,
  operationIndex?: number
): SceneProtocolError {
  return { code, message, recoverable, path, operationIndex };
}

function validateSceneNode(
  node: SceneNode,
  seenNodeIds: Set<string>,
  stack: Set<string>,
  errors: SceneProtocolError[],
  path: string
): void {
  if (!node.nodeId || typeof node.nodeId !== "string") {
    errors.push(toError("INVALID_ENVELOPE", "SceneNode.nodeId is required", false, `${path}.nodeId`));
    return;
  }

  if (stack.has(node.nodeId)) {
    errors.push(toError("CYCLE_DETECTED", `Cycle detected at nodeId '${node.nodeId}'`, false, `${path}.nodeId`));
    return;
  }

  if (seenNodeIds.has(node.nodeId)) {
    errors.push(
      toError("NODE_ID_CONFLICT", `Duplicate nodeId '${node.nodeId}' found in scene`, false, `${path}.nodeId`)
    );
    return;
  }

  if (!node.componentId || typeof node.componentId !== "string") {
    errors.push(toError("INVALID_ENVELOPE", "SceneNode.componentId is required", false, `${path}.componentId`));
  }

  if (!isObject(node.props)) {
    errors.push(toError("INVALID_ENVELOPE", "SceneNode.props must be an object", false, `${path}.props`));
  }

  seenNodeIds.add(node.nodeId);
  stack.add(node.nodeId);

  if (node.slots) {
    if (!isObject(node.slots)) {
      errors.push(toError("INVALID_ENVELOPE", "SceneNode.slots must be an object", false, `${path}.slots`));
    } else {
      for (const [slotKey, slotNodes] of Object.entries(node.slots)) {
        if (!Array.isArray(slotNodes)) {
          errors.push(
            toError("INVALID_ENVELOPE", `Slot '${slotKey}' must be an array`, false, `${path}.slots.${slotKey}`)
          );
          continue;
        }
        slotNodes.forEach((slotNode, index) => {
          validateSceneNode(slotNode, seenNodeIds, stack, errors, `${path}.slots.${slotKey}[${index}]`);
        });
      }
    }
  }

  if (node.children) {
    if (!Array.isArray(node.children)) {
      errors.push(toError("INVALID_ENVELOPE", "SceneNode.children must be an array", false, `${path}.children`));
    } else {
      node.children.forEach((child, index) => {
        validateSceneNode(child, seenNodeIds, stack, errors, `${path}.children[${index}]`);
      });
    }
  }

  stack.delete(node.nodeId);
}

function validateOperationShape(operation: unknown, operationIndex: number): SceneProtocolError[] {
  const errors: SceneProtocolError[] = [];

  if (!isObject(operation) || typeof operation.op !== "string") {
    errors.push(
      toError("INVALID_OPERATION", "Patch operation must be an object with op", false, `patch.operations[${operationIndex}]`, operationIndex)
    );
    return errors;
  }

  switch (operation.op) {
    case "add_node":
      if (typeof operation.parentId !== "string" || !operation.parentId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "add_node.parentId is required",
            false,
            `patch.operations[${operationIndex}].parentId`,
            operationIndex
          )
        );
      }
      if (!isObject(operation.node)) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "add_node.node is required",
            false,
            `patch.operations[${operationIndex}].node`,
            operationIndex
          )
        );
      }
      break;
    case "remove_node":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "remove_node.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      break;
    case "move_node":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "move_node.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      if (typeof operation.newParentId !== "string" || !operation.newParentId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "move_node.newParentId is required",
            false,
            `patch.operations[${operationIndex}].newParentId`,
            operationIndex
          )
        );
      }
      break;
    case "set_props":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "set_props.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      if (!isObject(operation.props)) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "set_props.props must be an object",
            false,
            `patch.operations[${operationIndex}].props`,
            operationIndex
          )
        );
      }
      break;
    case "set_layout":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "set_layout.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      if (!isObject(operation.layout)) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "set_layout.layout must be an object",
            false,
            `patch.operations[${operationIndex}].layout`,
            operationIndex
          )
        );
      }
      break;
    case "set_style":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "set_style.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      if (!isObject(operation.style)) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "set_style.style must be an object",
            false,
            `patch.operations[${operationIndex}].style`,
            operationIndex
          )
        );
      }
      break;
    case "swap_variant":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "swap_variant.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      if (typeof operation.componentId !== "string" || !operation.componentId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "swap_variant.componentId is required",
            false,
            `patch.operations[${operationIndex}].componentId`,
            operationIndex
          )
        );
      }
      break;
    case "bind_data":
      if (typeof operation.nodeId !== "string" || !operation.nodeId) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "bind_data.nodeId is required",
            false,
            `patch.operations[${operationIndex}].nodeId`,
            operationIndex
          )
        );
      }
      if (!Array.isArray(operation.bindings)) {
        errors.push(
          toError(
            "INVALID_OPERATION",
            "bind_data.bindings must be an array",
            false,
            `patch.operations[${operationIndex}].bindings`,
            operationIndex
          )
        );
      }
      break;
    default:
      errors.push(
        toError(
          "INVALID_OPERATION",
          `Unsupported operation '${String(operation.op)}'`,
          false,
          `patch.operations[${operationIndex}].op`,
          operationIndex
        )
      );
  }

  return errors;
}

export function validateSceneEnvelope(envelope: unknown): SceneProtocolError[] {
  const errors: SceneProtocolError[] = [];

  if (!isObject(envelope)) {
    return [toError("INVALID_ENVELOPE", "Envelope must be an object")];
  }

  if (envelope.version !== SCENE_PROTOCOL_VERSION) {
    errors.push(
      toError(
        "UNSUPPORTED_VERSION",
        `Unsupported scene protocol version '${String(envelope.version)}'`
      )
    );
    return errors;
  }

  if (envelope.intent === "create") {
    if (!isObject(envelope.scene) || !isObject(envelope.scene.root)) {
      errors.push(toError("INVALID_ENVELOPE", "Create envelope must include scene.root"));
      return errors;
    }

    const seenNodeIds = new Set<string>();
    const stack = new Set<string>();
    validateSceneNode(envelope.scene.root as unknown as SceneNode, seenNodeIds, stack, errors, "scene.root");
    return errors;
  }

  if (envelope.intent === "edit") {
    if (!isObject(envelope.patch) || !Array.isArray(envelope.patch.operations)) {
      errors.push(toError("INVALID_ENVELOPE", "Edit envelope must include patch.operations"));
      return errors;
    }

    if (envelope.patch.operations.length === 0) {
      errors.push(toError("INVALID_ENVELOPE", "patch.operations cannot be empty"));
      return errors;
    }

    envelope.patch.operations.forEach((operation, index) => {
      errors.push(...validateOperationShape(operation, index));
    });

    return errors;
  }

  errors.push(toError("INVALID_ENVELOPE", "Envelope intent must be 'create' or 'edit'"));
  return errors;
}

export function isAiSceneEnvelope(value: unknown): value is AiSceneEnvelope {
  return validateSceneEnvelope(value).length === 0;
}

export function parseAiSceneEnvelope(value: unknown):
  | { ok: true; data: AiSceneEnvelope }
  | { ok: false; errors: SceneProtocolError[] } {
  const errors = validateSceneEnvelope(value);
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, data: value as AiSceneEnvelope };
}
