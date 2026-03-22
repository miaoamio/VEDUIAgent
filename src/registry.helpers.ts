import { COMPONENT_REGISTRY } from "./registry";
import type { ComponentDefinition, ComponentRegistry, SizeMetricDefinition } from "./registry.types";

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

function resolveSizeMetricsMap(
  componentId: string,
  registry: ComponentRegistry = COMPONENT_REGISTRY
): Record<string, SizeMetricDefinition> | null {
  const def = registry.components[componentId];
  if (!def) return null;
  if (def.runtime?.sizeMetrics) return def.runtime.sizeMetrics;
  const ref = def.runtime?.sizeMetricsRef;
  if (ref && registry.components[ref]?.runtime?.sizeMetrics) {
    return registry.components[ref].runtime?.sizeMetrics ?? null;
  }
  return null;
}

export function getRegistrySizeMetricsMap(
  componentId: string,
  registry: ComponentRegistry = COMPONENT_REGISTRY
): Record<string, SizeMetricDefinition> | null {
  return resolveSizeMetricsMap(componentId, registry);
}

export function resolveRegistrySizeKey(
  componentId: string,
  size: unknown,
  registry: ComponentRegistry = COMPONENT_REGISTRY
): string | null {
  const metricsMap = resolveSizeMetricsMap(componentId, registry);
  if (!metricsMap) return null;
  const keys = Object.keys(metricsMap);
  if (keys.length === 0) return null;
  const raw = String(size ?? "").trim();
  if (raw) {
    const exact = keys.find((key) => key === raw);
    if (exact) return exact;
    const lower = raw.toLowerCase();
    const caseMatch = keys.find((key) => key.toLowerCase() === lower);
    if (caseMatch) return caseMatch;
    const includeMatch = keys.find((key) => key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase()));
    if (includeMatch) return includeMatch;
  }
  const def = registry.components[componentId];
  const defaultSize = def?.params?.size?.default;
  if (defaultSize !== undefined && metricsMap[String(defaultSize)]) {
    return String(defaultSize);
  }
  return keys[0] ?? null;
}

export function getRegistrySizeMetrics(
  componentId: string,
  size: unknown,
  registry: ComponentRegistry = COMPONENT_REGISTRY
): SizeMetricDefinition | null {
  const metricsMap = resolveSizeMetricsMap(componentId, registry);
  if (!metricsMap) return null;
  const key = resolveRegistrySizeKey(componentId, size, registry);
  if (!key) return null;
  return metricsMap[key] ?? null;
}
