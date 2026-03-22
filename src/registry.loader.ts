import { COMPONENT_REGISTRY } from "./registry";
import {
  type ComponentDefinition,
  type ComponentRegistry,
  type ParamDefinition
} from "./registry.types";

export type RegistryValidationCode =
  | "REGISTRY_INVALID_SHAPE"
  | "REGISTRY_COMPONENT_ID_MISMATCH"
  | "REGISTRY_PARAM_DEFAULT_TYPE_MISMATCH"
  | "REGISTRY_SELECT_PARAM_INVALID"
  | "REGISTRY_RUNTIME_SPEC_INVALID"
  | "REGISTRY_SLOT_INVALID";

export interface RegistryValidationIssue {
  code: RegistryValidationCode;
  message: string;
  path?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isRegistry(value: unknown): value is ComponentRegistry {
  return (
    isObject(value) &&
    isObject(value.components)
  );
}

function isDefaultTypeCompatible(param: ParamDefinition): boolean {
  if (param.default === null || param.default === undefined) {
    return true;
  }

  switch (param.type) {
    case "string":
    case "color":
    case "enum":
    case "select":
    case "segmented":
      return typeof param.default === "string";
    case "number":
      return typeof param.default === "number" && Number.isFinite(param.default);
    case "boolean":
      return typeof param.default === "boolean";
    case "object":
      return isObject(param.default);
    case "array":
      return Array.isArray(param.default);
    default:
      return false;
  }
}

function isPositiveFiniteNumber(value: unknown): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function validateRegistry(registry: ComponentRegistry): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = [];

  for (const [componentKey, def] of Object.entries(registry.components)) {
    const componentPath = `components.${componentKey}`;

    if (!def.id || def.id !== componentKey) {
      issues.push({
        code: "REGISTRY_COMPONENT_ID_MISMATCH",
        message: "Component id must match object key",
        path: `${componentPath}.id`
      });
    }

    for (const [paramKey, paramDef] of Object.entries(def.params)) {
      if (!isDefaultTypeCompatible(paramDef)) {
        issues.push({
          code: "REGISTRY_PARAM_DEFAULT_TYPE_MISMATCH",
          message: `Param '${paramKey}' default does not match declared type '${paramDef.type}'`,
          path: `${componentPath}.params.${paramKey}.default`
        });
      }

      if ((paramDef.type === "select" || paramDef.type === "enum") && !paramDef.enumValues?.length) {
        issues.push({
          code: "REGISTRY_SELECT_PARAM_INVALID",
          message: `Param '${paramKey}' requires non-empty enumValues`,
          path: `${componentPath}.params.${paramKey}.enumValues`
        });
      }

      if (
        (paramDef.type === "select" || paramDef.type === "enum") &&
        paramDef.enumValues &&
        !paramDef.enumValues.includes(String(paramDef.default))
      ) {
        issues.push({
          code: "REGISTRY_SELECT_PARAM_INVALID",
          message: `Param '${paramKey}' default must be included in enumValues`,
          path: `${componentPath}.params.${paramKey}.default`
        });
      }
    }

    if (def.runtime?.sizeMetrics || def.runtime?.sizeMetricsRef) {
      const sizeParam = def.params.size;
      if (!sizeParam || (sizeParam.type !== "select" && sizeParam.type !== "enum")) {
        issues.push({
          code: "REGISTRY_RUNTIME_SPEC_INVALID",
          message: "runtime.sizeMetrics requires a select/enum size param",
          path: `${componentPath}.runtime`
        });
      }

      if (def.runtime?.sizeMetricsRef) {
        const referenced = registry.components[def.runtime.sizeMetricsRef];
        if (!referenced) {
          issues.push({
            code: "REGISTRY_RUNTIME_SPEC_INVALID",
            message: `runtime.sizeMetricsRef '${def.runtime.sizeMetricsRef}' does not exist`,
            path: `${componentPath}.runtime.sizeMetricsRef`
          });
        }
      }

      if (def.runtime?.sizeMetrics) {
        const metricEntries = Object.entries(def.runtime.sizeMetrics);
        if (metricEntries.length === 0) {
          issues.push({
            code: "REGISTRY_RUNTIME_SPEC_INVALID",
            message: "runtime.sizeMetrics must not be empty",
            path: `${componentPath}.runtime.sizeMetrics`
          });
        }

        const enumValues = Array.isArray(sizeParam?.enumValues) ? sizeParam.enumValues : [];
        for (const [sizeKey, metrics] of metricEntries) {
          if (enumValues.length > 0 && !enumValues.includes(sizeKey)) {
            issues.push({
              code: "REGISTRY_RUNTIME_SPEC_INVALID",
              message: `runtime.sizeMetrics key '${sizeKey}' must exist in params.size.enumValues`,
              path: `${componentPath}.runtime.sizeMetrics.${sizeKey}`
            });
          }
          if (!isObject(metrics)) {
            issues.push({
              code: "REGISTRY_RUNTIME_SPEC_INVALID",
              message: `runtime.sizeMetrics '${sizeKey}' must be an object`,
              path: `${componentPath}.runtime.sizeMetrics.${sizeKey}`
            });
            continue;
          }
          for (const metricKey of ["height", "paddingX", "paddingY", "fontSize", "cornerRadius"]) {
            if (!isPositiveFiniteNumber(metrics[metricKey])) {
              issues.push({
                code: "REGISTRY_RUNTIME_SPEC_INVALID",
                message: `runtime.sizeMetrics '${sizeKey}.${metricKey}' must be a positive number`,
                path: `${componentPath}.runtime.sizeMetrics.${sizeKey}.${metricKey}`
              });
            }
          }
        }

        if (sizeParam?.default !== undefined && !def.runtime.sizeMetrics[String(sizeParam.default)]) {
          issues.push({
            code: "REGISTRY_RUNTIME_SPEC_INVALID",
            message: "params.size.default must exist in runtime.sizeMetrics",
            path: `${componentPath}.runtime.sizeMetrics`
          });
        }
      }
    }

    if (def.slots) {
      for (const [slotKey, slotDef] of Object.entries(def.slots)) {
        if (!slotDef.allowedComponents || slotDef.allowedComponents.length === 0) {
          issues.push({
            code: "REGISTRY_SLOT_INVALID",
            message: `Slot '${slotKey}' must declare allowedComponents`,
            path: `${componentPath}.slots.${slotKey}.allowedComponents`
          });
        }

        if (slotDef.minItems !== undefined && slotDef.maxItems !== undefined && slotDef.minItems > slotDef.maxItems) {
          issues.push({
            code: "REGISTRY_SLOT_INVALID",
            message: `Slot '${slotKey}' has minItems > maxItems`,
            path: `${componentPath}.slots.${slotKey}`
          });
        }
      }
    }
  }

  return issues;
}

export function loadRegistry(source?: ComponentRegistry): ComponentRegistry {
  if (!source) {
    return COMPONENT_REGISTRY;
  }
  return source;
}

export function getComponentDefinitionById(
  registry: ComponentRegistry,
  componentId: string
): ComponentDefinition | null {
  return registry.components[componentId] ?? null;
}
