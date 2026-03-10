import { COMPONENT_REGISTRY } from "./registry";
import type { ComponentParam } from "./types";
import {
  DEFAULT_CAPABILITIES_V2,
  type ColorVariableBindingV2,
  type ComponentCategory,
  type ComponentDefinitionV2,
  type ComponentRegistryV2,
  type FigmaPropertySnapshotV2,
  type LegacyRegistryV1,
  type ParamDefinitionV2,
  type TypographyBindingV2,
  REGISTRY_V2_VERSION
} from "./registry.v2.types";

const LEGACY_DEFAULT_SLOT = "default";

export type RegistryValidationCode =
  | "REGISTRY_INVALID_SHAPE"
  | "REGISTRY_INVALID_VERSION"
  | "REGISTRY_COMPONENT_ID_MISMATCH"
  | "REGISTRY_PARAM_DEFAULT_TYPE_MISMATCH"
  | "REGISTRY_SELECT_PARAM_INVALID"
  | "REGISTRY_SLOT_INVALID";

export interface RegistryValidationIssue {
  code: RegistryValidationCode;
  message: string;
  path?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeCategory(category?: string): ComponentCategory {
  if (
    category === "Layout" ||
    category === "Basic" ||
    category === "Form" ||
    category === "Table" ||
    category === "Data" ||
    category === "Other"
  ) {
    return category;
  }
  return "Other";
}

function convertLegacyParam(param: ComponentParam): ParamDefinitionV2 {
  const normalized: ParamDefinitionV2 = {
    type: param.type === "select" ? "select" : param.type,
    default: param.default,
    description: param.description
  };

  if (param.type === "select" && param.options) {
    normalized.enumValues = [...param.options];
  }

  return normalized;
}

function normalizeFigmaPropertySnapshot(
  snapshot: LegacyRegistryV1[string]["figmaPropertySnapshot"]
): FigmaPropertySnapshotV2 | undefined {
  if (!snapshot) return undefined;

  const componentKey = typeof snapshot.componentKey === "string" ? snapshot.componentKey.trim() : "";
  const inspectedAt = typeof snapshot.inspectedAt === "string" ? snapshot.inspectedAt.trim() : "";
  if (!componentKey || !inspectedAt || snapshot.source !== "discover_component_props") {
    return undefined;
  }

  const token = typeof snapshot.token === "string" && snapshot.token.trim() ? snapshot.token.trim() : undefined;
  const properties: FigmaPropertySnapshotV2["properties"] = [];

  (Array.isArray(snapshot.properties) ? snapshot.properties : []).forEach((prop) => {
    const propertyName = typeof prop.propertyName === "string" ? prop.propertyName.trim() : "";
    const type = typeof prop.type === "string" ? prop.type.trim() : "";
    if (!propertyName || !type) return;

    properties.push({
      propertyName,
      displayName: typeof prop.displayName === "string" ? prop.displayName : undefined,
      type,
      defaultValue:
        typeof prop.defaultValue === "string" || typeof prop.defaultValue === "boolean"
          ? prop.defaultValue
          : undefined,
      options: Array.isArray(prop.options) ? prop.options.map((item) => String(item)) : undefined
    });
  });

  return {
    token,
    componentKey,
    inspectedAt,
    source: "discover_component_props",
    properties
  };
}

function inferNodeType(def: ComponentDefinitionV2): "FRAME" | "TEXT" | "INSTANCE" {
  if (def.id === "figma-component") {
    return "INSTANCE";
  }
  if (def.id === "text" || def.category === "Basic") {
    return def.id === "text" ? "TEXT" : "FRAME";
  }
  return "FRAME";
}

export function normalizeRegistryV1ToV2(v1Registry: LegacyRegistryV1): ComponentRegistryV2 {
  const components: Record<string, ComponentDefinitionV2> = {};

  for (const [id, legacyDef] of Object.entries(v1Registry)) {
    const params: ComponentDefinitionV2["params"] = {};
    for (const [paramKey, paramDef] of Object.entries(legacyDef.params)) {
      params[paramKey] = convertLegacyParam(paramDef);
    }

    const slots =
      legacyDef.allowedChildren && legacyDef.allowedChildren.length > 0
        ? {
            [LEGACY_DEFAULT_SLOT]: {
              displayName: "Default",
              allowedComponents: legacyDef.allowedChildren,
              required: false,
              minItems: 0,
              ordered: true
            }
          }
        : undefined;

    const nodeType = inferNodeType({
      id,
      name: legacyDef.name,
      category: normalizeCategory(legacyDef.category),
      description: legacyDef.description,
      schemaVersion: "2.0.0",
      params
    });

    const figmaBinding: ComponentDefinitionV2["figmaBinding"] = {
      nodeType,
      preferredLayoutMode: "VERTICAL"
    };

    if (legacyDef.id !== "figma-component") {
      figmaBinding.renderKey = legacyDef.id;
    }

    const colorVariableBindings: Record<string, ColorVariableBindingV2> = {};
    if (legacyDef.variableBindings) {
      for (const [semanticKey, binding] of Object.entries(legacyDef.variableBindings)) {
        colorVariableBindings[semanticKey] = {
          enabled: Boolean(binding.enabled),
          token: binding.token,
          variableRef: binding.variableRef,
          keyCandidates: binding.keyCandidates ? [...binding.keyCandidates] : undefined,
          idCandidates: binding.idCandidates ? [...binding.idCandidates] : undefined,
          nameCandidates: binding.nameCandidates ? [...binding.nameCandidates] : undefined
        };
      }
    }

    const typographyBindings: Record<string, TypographyBindingV2> = {};
    if (legacyDef.typographyBindings) {
      for (const [semanticKey, binding] of Object.entries(legacyDef.typographyBindings)) {
        typographyBindings[semanticKey] = {
          enabled: Boolean(binding.enabled),
          token: binding.token,
          textStyleRef: binding.textStyleRef,
          keyCandidates: binding.keyCandidates ? [...binding.keyCandidates] : undefined,
          idCandidates: binding.idCandidates ? [...binding.idCandidates] : undefined,
          nameCandidates: binding.nameCandidates ? [...binding.nameCandidates] : undefined
        };
      }
    }

    const figmaPropertySnapshot = normalizeFigmaPropertySnapshot(legacyDef.figmaPropertySnapshot);

    components[id] = {
      id: legacyDef.id,
      name: legacyDef.name,
      category: normalizeCategory(legacyDef.category),
      description: legacyDef.description,
      schemaVersion: "2.0.0",
      family: legacyDef.family,
      prompts: legacyDef.agentPrompt
        ? {
            description: legacyDef.description,
            usage: legacyDef.agentPrompt,
            examples: legacyDef.examples
          }
        : undefined,
      params,
      slots,
      capabilities: {
        ...DEFAULT_CAPABILITIES_V2,
        allowChildren: Boolean(legacyDef.allowedChildren && legacyDef.allowedChildren.length > 0)
      },
      figmaBinding,
      figmaPropertySnapshot,
      colorVariableBindings: Object.keys(colorVariableBindings).length > 0 ? colorVariableBindings : undefined,
      typographyBindings: Object.keys(typographyBindings).length > 0 ? typographyBindings : undefined
    };
  }

  return {
    version: REGISTRY_V2_VERSION,
    components,
    meta: {
      updatedAt: new Date().toISOString(),
      owner: "figma-ui-agent",
      description: "Normalized from legacy registry v1"
    }
  };
}

export function isRegistryV2(value: unknown): value is ComponentRegistryV2 {
  return (
    isObject(value) &&
    value.version === REGISTRY_V2_VERSION &&
    isObject(value.components)
  );
}

function isDefaultTypeCompatible(param: ParamDefinitionV2): boolean {
  if (param.default === null || param.default === undefined) {
    return true;
  }

  switch (param.type) {
    case "string":
    case "color":
    case "enum":
    case "select":
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

export function validateRegistryV2(registry: ComponentRegistryV2): RegistryValidationIssue[] {
  const issues: RegistryValidationIssue[] = [];

  if (registry.version !== REGISTRY_V2_VERSION) {
    issues.push({
      code: "REGISTRY_INVALID_VERSION",
      message: `Unsupported registry version '${registry.version}'`,
      path: "version"
    });
    return issues;
  }

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

export function loadRegistryV2(source?: ComponentRegistryV2 | LegacyRegistryV1): ComponentRegistryV2 {
  if (!source) {
    return normalizeRegistryV1ToV2(COMPONENT_REGISTRY);
  }

  if (isRegistryV2(source)) {
    return source;
  }

  return normalizeRegistryV1ToV2(source);
}

export function getComponentDefinitionById(
  registry: ComponentRegistryV2,
  componentId: string
): ComponentDefinitionV2 | null {
  return registry.components[componentId] ?? null;
}
