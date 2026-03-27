import {
  createFigmaComponentInstanceFromRef,
  parseVariantCriteria,
  resolveComponentKeyFromToken
} from "../../../figmaComponent";
import { COMPONENT_REGISTRY } from "../../../registry";
import type { ComponentDefinition } from "../../../registry.types";

function resolveRegistryDefinition(params: Record<string, any>): ComponentDefinition | undefined {
  const componentId = typeof params.componentId === "string" ? params.componentId.trim() : "";
  if (componentId && COMPONENT_REGISTRY.components[componentId]) {
    return COMPONENT_REGISTRY.components[componentId];
  }
  const token = typeof params.componentToken === "string" ? params.componentToken.trim() : "";
  if (!token) return undefined;
  const entries = Object.values(COMPONENT_REGISTRY.components);
  return entries.find((def) => {
    const snapshot = (def as any).figmaPropertySnapshot as any;
    const snapshotToken = typeof snapshot?.token === "string" ? snapshot.token.trim() : "";
    return snapshotToken && snapshotToken === token;
  });
}

export function buildSnapshotDrivenCriteria(options: {
  params: Record<string, any>;
  snapshot?: {
    properties?: Array<{ propertyName: string; type: string }>;
  };
}): {
  variantCriteria?: Record<string, string>;
  booleanProps: Record<string, boolean>;
} {
  const { params, snapshot } = options;
  const knownVariantProps = new Set<string>();
  const knownBooleanProps = new Set<string>();
  if (Array.isArray(snapshot?.properties)) {
    snapshot?.properties?.forEach((p) => {
      const name = String(p.propertyName || "").trim().toLowerCase();
      if (!name) return;
      if (p.type === "VARIANT") {
        knownVariantProps.add(name);
      } else if (p.type === "BOOLEAN") {
        knownBooleanProps.add(name);
      }
    });
  }
  const explicitCriteria =
    (parseVariantCriteria(params.variantCriteria) as Record<string, string | boolean> | undefined) || {};
  const variantOnlyCriteria: Record<string, string> = {};
  const booleanProps: Record<string, boolean> = {};
  const reserved = new Set(["height", "componentToken", "componentKey", "fallbackName", "variantCriteria", "componentId"]);
  const processParam = (key: string, value: any) => {
    const normalizedKey = key.trim();
    const keyLower = normalizedKey.toLowerCase();
    if (typeof value === "boolean") {
      if (knownBooleanProps.size === 0 || knownBooleanProps.has(keyLower)) {
        booleanProps[normalizedKey] = value;
      }
      return;
    }
    const strValue = String(value).trim();
    const lowerValue = strValue.toLowerCase();
    if ((lowerValue === "true" || lowerValue === "false") && knownBooleanProps.has(keyLower)) {
      booleanProps[normalizedKey] = lowerValue === "true";
      return;
    }
    if (knownVariantProps.size === 0 || knownVariantProps.has(keyLower)) {
      variantOnlyCriteria[normalizedKey] = strValue;
    }
  };
  Object.entries(explicitCriteria).forEach(([key, value]) => processParam(key, value));
  Object.entries(params).forEach(([key, value]) => {
    if (reserved.has(key) || value === undefined || value === null) return;
    processParam(key, value);
  });
  return {
    variantCriteria: Object.keys(variantOnlyCriteria).length > 0 ? variantOnlyCriteria : undefined,
    booleanProps
  };
}

export async function renderFigmaComponentInstance(
  params: Record<string, any>,
  options?: {
    onApplyProps?: (instance: InstanceNode, params: Record<string, any>) => void;
  }
): Promise<SceneNode> {
  const definition = resolveRegistryDefinition(params);
  const snapshot = (definition as any)?.figmaPropertySnapshot as any;
  const componentKeyFromParam = typeof params.componentKey === "string" ? params.componentKey.trim() : "";
  const componentToken = typeof params.componentToken === "string" ? params.componentToken.trim() : "";
  const componentKeyFromToken = componentToken ? resolveComponentKeyFromToken(componentToken) : "";
  const componentKeyFromSnapshot =
    typeof snapshot?.componentKey === "string" ? snapshot.componentKey.trim() : "";
  const componentKey = componentKeyFromParam || componentKeyFromToken || componentKeyFromSnapshot;
  if (!componentKey) {
    const tokenLabel = componentToken || componentKeyFromParam || "unknown";
    throw new Error(`[Render] Missing component key for token: ${tokenLabel}`);
  }
  const fallbackName =
    typeof params.fallbackName === "string" && params.fallbackName.trim()
      ? params.fallbackName.trim()
      : snapshot?.componentSetName || definition?.name || undefined;
  const tokenOrKey = componentToken || componentKeyFromParam;
  const { variantCriteria, booleanProps } = buildSnapshotDrivenCriteria({ params, snapshot });
  const importedInstance = await createFigmaComponentInstanceFromRef({
    componentKey,
    componentToken,
    fallbackName,
    variantCriteria,
    params,
    tokenOrKey
  });
  if (Object.keys(booleanProps).length > 0) {
    try {
      importedInstance.setProperties(booleanProps);
    } catch (e) {
      console.warn("[Render] setProperties failed", e);
    }
  }
  if (options?.onApplyProps) {
    options.onApplyProps(importedInstance, params);
  }
  const width = Number(params.width);
  const height = Number(params.height);

  try {
    if ('layoutSizingHorizontal' in importedInstance && Number.isFinite(width) && width > 0) {
      importedInstance.layoutSizingHorizontal = 'FIXED';
    }
    if ('layoutSizingVertical' in importedInstance && Number.isFinite(height) && height > 0) {
      importedInstance.layoutSizingVertical = 'FIXED';
    }
  } catch (e) {}

  try {
    if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
      importedInstance.resize(width, height);
    } else if (Number.isFinite(width) && width > 0) {
      importedInstance.resize(width, importedInstance.height);
    } else if (Number.isFinite(height) && height > 0) {
      importedInstance.resize(importedInstance.width, height);
    }
  } catch (e) {
    console.warn("[Render] Failed to resize figma component instance", e);
  }

  let renderedNode: SceneNode = importedInstance;
  if (componentToken === "lib-data-input-textarea") {
    // TextArea 文本更新逻辑
    const rawValue = String(params.value ?? "");
    const placeholder = String(params.placeholder ?? "请输入内容");
    const textToDisplay = rawValue || placeholder;

    const textNode = importedInstance.findOne((n) => n.type === "TEXT") as TextNode;
    if (textNode) {
      try {
        await figma.loadFontAsync(textNode.fontName as FontName);
        textNode.characters = textToDisplay;
      } catch (e) {
        console.warn("[Render] Failed to update textarea text", e);
      }
    }
  }

  // Radio-group / Checkbox-group: overwrite option labels from optionsText
  if (
    componentToken === "lib-data-input-radio-group" ||
    componentToken === "lib-data-input-checkbox-group"
  ) {
    const optionsRaw = String(params.optionsText ?? "");
    const options = optionsRaw.split(/[,，\n\r]/).map((s: string) => s.trim()).filter(Boolean);
    if (options.length > 0) {
      // Each option is a child instance (Radio 单选框 / Checkbox 复选框) containing a TEXT node.
      // Collect all direct/nested child instances that contain a text node with option-like text.
      const optionInstances: InstanceNode[] = [];
      const collectOptionInstances = (node: SceneNode) => {
        if (node.type === "INSTANCE") {
          // Check if this instance looks like a radio/checkbox option (has a text child)
          const hasText = node.findOne((n) => n.type === "TEXT");
          if (hasText) {
            optionInstances.push(node);
            return; // Don't recurse into option instances
          }
        }
        if ("children" in node) {
          for (const child of (node as any).children) {
            collectOptionInstances(child);
          }
        }
      };
      for (const child of importedInstance.children) {
        collectOptionInstances(child as SceneNode);
      }

      // Overwrite text in each option instance, matching by index
      for (let i = 0; i < Math.min(options.length, optionInstances.length); i++) {
        const optInst = optionInstances[i];
        const textNode = optInst.findOne((n) => n.type === "TEXT") as TextNode | null;
        if (textNode) {
          try {
            await figma.loadFontAsync(textNode.fontName as FontName);
            textNode.characters = options[i];
          } catch (e) {
            console.warn(`[Render] Failed to update option text [${i}]`, e);
          }
        }
      }
    }
  }

  return renderedNode;
}
