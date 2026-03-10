import type { SceneOperation } from "../protocol/scene";
import { DEFAULT_CAPABILITIES_V2 } from "../registry.v2.types";
import type {
  CapabilityDefinitionV2,
  ComponentDefinitionV2,
  ComponentRegistryV2,
  SlotDefinitionV2
} from "../registry.v2.types";
import type { ApplyError } from "./types";

function capabilityForOperation(operation: SceneOperation): keyof Required<CapabilityDefinitionV2> {
  switch (operation.op) {
    case "set_props":
      return "allowSetProps";
    case "set_layout":
      return "allowSetLayout";
    case "set_style":
      return "allowSetStyle";
    case "swap_variant":
      return "allowSwapVariant";
    case "bind_data":
      return "allowBindData";
    case "remove_node":
      return "allowRemove";
    case "add_node":
    case "move_node":
    default:
      return "allowChildren";
  }
}

export function resolveComponentDefinition(
  registry: ComponentRegistryV2,
  componentId: string
): ComponentDefinitionV2 | null {
  return registry.components[componentId] ?? null;
}

export function resolveSlotDefinition(
  componentDef: ComponentDefinitionV2,
  slot?: string
): SlotDefinitionV2 | null {
  if (!slot) {
    return componentDef.slots?.default ?? null;
  }
  return componentDef.slots?.[slot] ?? null;
}

export function isComponentAllowedInSlot(
  parentDef: ComponentDefinitionV2,
  childComponentId: string,
  slot?: string
): boolean {
  if (!parentDef.slots) {
    return true;
  }

  const slotDef = resolveSlotDefinition(parentDef, slot);
  if (!slotDef) {
    return false;
  }
  return slotDef.allowedComponents.includes(childComponentId);
}

export function isOperationAllowed(componentDef: ComponentDefinitionV2, operation: SceneOperation): boolean {
  const capabilities: Required<CapabilityDefinitionV2> = {
    ...DEFAULT_CAPABILITIES_V2,
    ...(componentDef.capabilities ?? {})
  };
  const key = capabilityForOperation(operation);
  return capabilities[key];
}

export function toUnknownComponentError(componentId: string, path?: string): ApplyError {
  return {
    code: "UNKNOWN_COMPONENT",
    message: `Component '${componentId}' is not declared in registry`,
    path,
    recoverable: false
  };
}

export function toInvalidSlotError(componentId: string, slot?: string, path?: string): ApplyError {
  const slotLabel = slot ?? "default";
  return {
    code: "INVALID_SLOT",
    message: `Slot '${slotLabel}' is invalid for component '${componentId}'`,
    path,
    recoverable: true
  };
}
