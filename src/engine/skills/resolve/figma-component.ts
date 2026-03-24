import {
  createFigmaComponentInstanceFromRef,
  isDateTimePickerToken,
  parseVariantCriteria,
  resolveComponentKeyFromToken
} from "../../../figmaComponent";

function normalizeTimepickerIconHitArea(root: SceneNode): void {
  if (typeof (root as any).findAll !== "function") return;
  const targets = (root as any).findAll((node: SceneNode) => {
    if (node.type !== "RECTANGLE" && node.type !== "SLICE") return false;
    const width = "width" in node ? (node as any).width : 0;
    const height = "height" in node ? (node as any).height : 0;
    if (!(width > 24 || height > 24)) return false;
    const fills = "fills" in node ? (node as any).fills : [];
    const strokes = "strokes" in node ? (node as any).strokes : [];
    const hasVisibleFill = Array.isArray(fills) && fills.some((fill) => fill?.visible !== false);
    const hasVisibleStroke = Array.isArray(strokes) && strokes.some((stroke) => stroke?.visible !== false);
    if (hasVisibleFill || hasVisibleStroke) return false;
    return true;
  });
  targets.forEach((node: SceneNode) => {
    const width = (node as any).width;
    const height = (node as any).height;
    const centerX = (node as any).x + width / 2;
    const centerY = (node as any).y + height / 2;
    if (typeof (node as any).resize === "function") {
      (node as any).resize(16, 16);
    } else {
      (node as any).width = 16;
      (node as any).height = 16;
    }
    (node as any).x = centerX - 8;
    (node as any).y = centerY - 8;
  });
}

export async function renderFigmaComponentInstance(
  params: Record<string, any>,
  options?: {
    onApplyProps?: (instance: InstanceNode, params: Record<string, any>) => void;
  }
): Promise<SceneNode> {
  const componentKeyFromParam = typeof params.componentKey === "string" ? params.componentKey.trim() : "";
  const componentToken = typeof params.componentToken === "string" ? params.componentToken.trim() : "";
  const componentKeyFromToken = componentToken ? resolveComponentKeyFromToken(componentToken) : "";
  const componentKey = componentKeyFromParam || componentKeyFromToken;
  if (!componentKey) {
    const tokenLabel = componentToken || componentKeyFromParam || "unknown";
    throw new Error(`[Render] Missing component key for token: ${tokenLabel}`);
  }
  const fallbackName =
    typeof params.fallbackName === "string" && params.fallbackName.trim()
      ? params.fallbackName.trim()
      : undefined;
  const tokenOrKey = componentToken || componentKeyFromParam;
  const parsedCriteria = parseVariantCriteria(params.variantCriteria);
  const importedInstance = await createFigmaComponentInstanceFromRef({
    componentKey,
    componentToken,
    fallbackName,
    variantCriteria: parsedCriteria,
    params,
    tokenOrKey
  });
  if (options?.onApplyProps) {
    options.onApplyProps(importedInstance, params);
  }
  const width = Number(params.width);
  const height = Number(params.height);
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    importedInstance.resize(width, height);
  } else if (Number.isFinite(width) && width > 0) {
    importedInstance.resize(width, importedInstance.height);
  } else if (Number.isFinite(height) && height > 0) {
    importedInstance.resize(importedInstance.width, height);
  }
  let renderedNode: SceneNode = importedInstance;
  if (isDateTimePickerToken(tokenOrKey)) {
    try {
      const detached = importedInstance.detachInstance();
      normalizeTimepickerIconHitArea(detached);
      renderedNode = detached;
    } catch {
      renderedNode = importedInstance;
    }
  } else if (componentToken === "lib-data-input-textarea") {
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
  return renderedNode;
}
