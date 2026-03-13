import { COMPONENT_REGISTRY } from "./registry";
import type { ComponentDefinition, ComponentRegistry } from "./registry.types";

export function getRegistry(source?: ComponentRegistry): ComponentRegistry {
  return source ?? COMPONENT_REGISTRY;
}

export function getComponentDefinition(
  componentId: string,
  registry: ComponentRegistry = COMPONENT_REGISTRY
): ComponentDefinition | null {
  return registry.components[componentId] ?? null;
}

export function getDefaultParams(
  componentId: string,
  registry: ComponentRegistry = COMPONENT_REGISTRY
): Record<string, unknown> {
  const def = registry.components[componentId];
  if (!def) return {};
  const params: Record<string, unknown> = {};
  for (const [key, paramDef] of Object.entries(def.params)) {
    params[key] = paramDef.default;
  }
  return params;
}
