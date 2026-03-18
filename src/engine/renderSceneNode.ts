import type { LayoutSpec, SceneNode as ProtocolSceneNode, StyleSpec } from "../protocol/scene";
import type { ComponentDefinition } from "../registry.types";
import { createFigmaComponentInstance, parseVariantCriteria } from "../figmaComponent";
import { createInspectDrivenTagFallbackNode } from "../tag.fallback";
import { resolveComponentTokenProfile } from "../theme.component-tokens";
import { buildScenePath, syncSingleNodeMetadata } from "./metadataSync";
import { resolveComponentDefinition, toUnknownComponentError } from "./registryResolver";
import type { ApplyContext } from "./types";

type ParentContainer = BaseNode & ChildrenMixin;

function isParentContainer(node: BaseNode | null): node is ParentContainer {
  return Boolean(node && typeof (node as ParentContainer).appendChild === "function");
}

function isFrameNode(node: SceneNode): node is FrameNode {
  return node.type === "FRAME";
}

function isTextNode(node: SceneNode): node is TextNode {
  return node.type === "TEXT";
}

type ResizableSceneNode = SceneNode & {
  width: number;
  height: number;
  resize: (width: number, height: number) => void;
};

function isResizableSceneNode(node: SceneNode): node is ResizableSceneNode {
  return (
    typeof (node as ResizableSceneNode).resize === "function" &&
    typeof (node as ResizableSceneNode).width === "number" &&
    typeof (node as ResizableSceneNode).height === "number"
  );
}

function parseHexChannel(channel: string): number {
  return parseInt(channel, 16) / 255;
}

function parseColor(value?: string): RGB | null {
  if (!value || typeof value !== "string") return null;

  const normalized = value.trim();
  if (!normalized.startsWith("#")) return null;

  let hex = normalized.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  if (hex.length !== 6) return null;

  return {
    r: parseHexChannel(hex.slice(0, 2)),
    g: parseHexChannel(hex.slice(2, 4)),
    b: parseHexChannel(hex.slice(4, 6))
  };
}

function parseBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function toVariantBoolean(value: boolean): "True" | "False" {
  return value ? "True" : "False";
}

type TagComponentFamily = "default" | "other" | "status";

const TAG_COMPONENT_TOKEN = "lib-data-display-tag";
const OTHER_TAG_COMPONENT_TOKEN = "lib-data-display-other-tag";
const STATUS_TAG_COMPONENT_TOKEN = "lib-data-display-status-tag";

function normalizeTagSizeVariant(value: unknown): "Mini 16" | "Small 18" | "Default 20" | "Large 24" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("16") || normalized.includes("mini")) return "Mini 16";
  if (normalized.includes("18") || normalized.includes("small")) return "Small 18";
  if (normalized.includes("24") || normalized.includes("large")) return "Large 24";
  return "Default 20";
}

function normalizeTagTypeVariant(
  value: unknown
): "Default 默认标签" | "Solid 面型标签" | "Outline 线型标签" | "Text 文字标签" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("solid") || normalized.includes("面型")) return "Solid 面型标签";
  if (normalized.includes("outline") || normalized.includes("线型")) return "Outline 线型标签";
  if (normalized.includes("text") || normalized.includes("文字")) return "Text 文字标签";
  return "Default 默认标签";
}

function normalizeTagStateVariant(value: unknown): "Default 默认" | "Hover 悬停" | "Active 激活" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("hover") || normalized.includes("悬停") || normalized.includes("悬浮")) {
    return "Hover 悬停";
  }
  if (normalized.includes("active") || normalized.includes("激活")) return "Active 激活";
  return "Default 默认";
}

function resolveTagComponentFamily(componentToken: unknown): TagComponentFamily {
  const normalized = String(componentToken ?? "").trim();
  const baseToken = normalized
    ? resolveComponentTokenProfile(normalized)?.baseToken || normalized
    : "";
  if (baseToken === STATUS_TAG_COMPONENT_TOKEN || baseToken === "library.data-display.status-tag") {
    return "status";
  }
  if (baseToken === OTHER_TAG_COMPONENT_TOKEN || baseToken === "library.data-display.other-tag") {
    return "other";
  }
  return "default";
}

function normalizeOtherTagTypeVariant(value: unknown): "TagGroup 标签组" | "MarketingTag 营销标签" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("taggroup") || normalized.includes("group") || normalized.includes("标签组")) {
    return "TagGroup 标签组";
  }
  return "MarketingTag 营销标签";
}

function normalizeStatusTagTypeVariant(value: unknown): "L1 一级标签" | "L2 二级标签" | "L3 三级标签" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("l3") || normalized.includes("三级") || normalized.endsWith("3")) return "L3 三级标签";
  if (normalized.includes("l2") || normalized.includes("二级") || normalized.endsWith("2")) return "L2 二级标签";
  return "L1 一级标签";
}

function normalizeStatusTagThemeVariant(
  value: unknown
):
  | "Success 成功"
  | "Warning 告警"
  | "Error 错误"
  | "Stop 停止"
  | "Processing 等待中"
  | "Loading 加载中"
  | "Waiting 待启用" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("warning") || normalized.includes("告警")) return "Warning 告警";
  if (normalized.includes("error") || normalized.includes("错误")) return "Error 错误";
  if (normalized.includes("stop") || normalized.includes("停止")) return "Stop 停止";
  if (normalized.includes("processing") || normalized.includes("等待")) return "Processing 等待中";
  if (normalized.includes("loading") || normalized.includes("加载")) return "Loading 加载中";
  if (normalized.includes("waiting") || normalized.includes("待启用")) return "Waiting 待启用";
  return "Success 成功";
}

function normalizeStatusTagStateVariant(value: unknown): "Default 默认" | "Hover 悬浮" | "Active 点击" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("hover") || normalized.includes("悬浮") || normalized.includes("悬停")) {
    return "Hover 悬浮";
  }
  if (normalized.includes("active") || normalized.includes("点击") || normalized.includes("激活")) {
    return "Active 点击";
  }
  return "Default 默认";
}

function isDefaultTagTypeValue(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("default") ||
    normalized.includes("默认") ||
    normalized.includes("solid") ||
    normalized.includes("面型") ||
    normalized.includes("outline") ||
    normalized.includes("线型") ||
    normalized.includes("text") ||
    normalized.includes("文字")
  );
}

function isOtherTagTypeValue(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("marketing") ||
    normalized.includes("营销") ||
    normalized.includes("taggroup") ||
    normalized.includes("标签组") ||
    normalized === "group" ||
    normalized.includes("group")
  );
}

function isStatusTagTypeValue(value: unknown): boolean {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized.includes("status") || normalized.includes("状态标签") || normalized.includes("状态");
}

function normalizeUnifiedTagProps(props: Record<string, unknown>): Record<string, unknown> {
  const next = { ...props };
  const rawTagType = next.tagType ?? next.type;
  const rawOtherTagType = next.otherTagType;
  const componentToken = typeof next.componentToken === "string" ? next.componentToken.trim() : "";
  const resolvedToken = componentToken ? resolveComponentTokenProfile(componentToken) : undefined;
  const baseToken = resolvedToken?.baseToken;
  const isTokenStatus = baseToken === STATUS_TAG_COMPONENT_TOKEN;
  const isTokenOther = baseToken === OTHER_TAG_COMPONENT_TOKEN;
  const isTokenDefault = baseToken === TAG_COMPONENT_TOKEN;
  const isKnownToken = isTokenStatus || isTokenOther || isTokenDefault;

  const hasExplicitDefaultTagType = rawTagType !== undefined && isDefaultTagTypeValue(rawTagType);
  const hasExplicitOtherTagType = rawTagType !== undefined && isOtherTagTypeValue(rawTagType);
  const hasExplicitStatusTagType = rawTagType !== undefined && isStatusTagTypeValue(rawTagType);
  let unifiedType: unknown = rawTagType;
  if (!unifiedType && rawOtherTagType) {
    unifiedType = rawOtherTagType;
  }
  if (
    rawOtherTagType &&
    (!unifiedType || (!isDefaultTagTypeValue(unifiedType) && !isOtherTagTypeValue(unifiedType)))
  ) {
    unifiedType = rawOtherTagType;
  }
  if (isTokenOther && rawOtherTagType && !hasExplicitDefaultTagType && !hasExplicitStatusTagType) {
    unifiedType = rawOtherTagType;
  }
  if (!unifiedType && isTokenStatus && !hasExplicitDefaultTagType && !hasExplicitOtherTagType) {
    unifiedType = "StatusTag 状态标签";
  }

  if (unifiedType !== undefined) {
    next.tagType = unifiedType as any;
  }

  const shouldUseStatus =
    isStatusTagTypeValue(unifiedType) ||
    (isTokenStatus && !hasExplicitDefaultTagType && !hasExplicitOtherTagType && !isOtherTagTypeValue(unifiedType));
  const shouldUseOther =
    !shouldUseStatus &&
    (isOtherTagTypeValue(unifiedType) ||
      (isTokenOther && !isDefaultTagTypeValue(unifiedType) && !isStatusTagTypeValue(unifiedType)));

  if (shouldUseStatus) {
    next.tagType = "StatusTag 状态标签" as any;
    delete (next as any).otherTagType;
  } else if (shouldUseOther && unifiedType) {
    const normalizedOtherLabel = normalizeOtherTagTypeVariant(unifiedType);
    next.tagType = normalizedOtherLabel as any;
    next.otherTagType = normalizedOtherLabel as any;
  } else if (unifiedType) {
    next.tagType = normalizeTagTypeVariant(unifiedType) as any;
    delete (next as any).otherTagType;
  } else if (!shouldUseOther) {
    delete (next as any).otherTagType;
  }

  if (!componentToken || isKnownToken) {
    next.componentToken = (shouldUseStatus
      ? STATUS_TAG_COMPONENT_TOKEN
      : shouldUseOther
        ? OTHER_TAG_COMPONENT_TOKEN
        : TAG_COMPONENT_TOKEN) as any;
  }

  return next;
}

function normalizeOtherTagColorVariant(value: unknown): "Default 默认" | "Red 红" | "Yellow 黄" | "Grey 灰" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("red") || normalized.includes("红")) return "Red 红";
  if (normalized.includes("yellow") || normalized.includes("黄")) return "Yellow 黄";
  if (normalized.includes("grey") || normalized.includes("gray") || normalized.includes("灰")) return "Grey 灰";
  return "Default 默认";
}

function parseDelimitedText(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const fromArray = value.map((item) => String(item ?? "").trim()).filter(Boolean);
    return fromArray.length > 0 ? fromArray : fallback;
  }
  const normalized = String(value ?? "")
    .split(/[\n\r,，、|\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : fallback;
}

function matchVariantPropertyName(
  variantProps: Record<string, string> | undefined,
  criteriaKey: string
): string | undefined {
  if (!variantProps) return undefined;
  const normalizedKey = String(criteriaKey || "").trim().toLowerCase();
  return Object.keys(variantProps).find((key) => {
    const normalizedProp = String(key || "").trim().toLowerCase();
    return normalizedProp === normalizedKey || normalizedProp.includes(normalizedKey);
  });
}

function matchesVariantProps(
  variantProps: Record<string, string> | undefined,
  criteria: Record<string, string>
): boolean {
  if (!variantProps) return false;
  return Object.entries(criteria).every(([key, value]) => {
    const propName = matchVariantPropertyName(variantProps, key);
    if (!propName) return false;
    return String(variantProps[propName] || "").trim().toLowerCase() === String(value || "").trim().toLowerCase();
  });
}

function buildTagVariantCriteriaCandidates(
  props: Record<string, unknown>,
  family: TagComponentFamily
): Array<Record<string, string>> {
  if (family === "status") {
    const exact: Record<string, string> = {
      "Type 类型": normalizeStatusTagTypeVariant(props.statusType ?? props.statusLevel ?? props.type),
      "Theme 主题": normalizeStatusTagThemeVariant(props.statusTheme ?? props.theme),
      "Size 尺寸": normalizeTagSizeVariant(props.size),
      "Icon 图标": toVariantBoolean(parseBooleanFlag(props.showIcon ?? props.icon)),
      "Dropdown 下拉选择": toVariantBoolean(parseBooleanFlag(props.showDropdown ?? props.dropdown)),
      "State 状态": normalizeStatusTagStateVariant(props.statusState ?? props.state),
      "Disabled 禁用": toVariantBoolean(parseBooleanFlag(props.disabled))
    };
    return [
      exact,
      { ...exact, "State 状态": "Default 默认" },
      {
        "Type 类型": exact["Type 类型"],
        "Theme 主题": exact["Theme 主题"],
        "Size 尺寸": exact["Size 尺寸"],
        "Disabled 禁用": exact["Disabled 禁用"]
      },
      { "Type 类型": exact["Type 类型"], "Theme 主题": exact["Theme 主题"], "Size 尺寸": exact["Size 尺寸"] }
    ];
  }
  if (family === "other") {
    const exact: Record<string, string> = {
      "Type 类型": normalizeOtherTagTypeVariant(props.otherTagType ?? props.tagType ?? props.type),
      "Size 尺寸": normalizeTagSizeVariant(props.size),
      "Color 颜色": normalizeOtherTagColorVariant(props.colorScheme ?? props.color ?? props.tagColor)
    };
    return [
      exact,
      { "Type 类型": exact["Type 类型"], "Size 尺寸": exact["Size 尺寸"] },
      { "Type 类型": exact["Type 类型"], "Color 颜色": exact["Color 颜色"] },
      { "Type 类型": exact["Type 类型"] }
    ];
  }

  return [
    {
      "Type 类型": normalizeTagTypeVariant(props.tagType ?? props.type),
      "Size 尺寸": normalizeTagSizeVariant(props.size),
      "State 状态": normalizeTagStateVariant(props.state),
      "Icon 图标": toVariantBoolean(parseBooleanFlag(props.showIcon ?? props.icon)),
      "Dot 点": toVariantBoolean(parseBooleanFlag(props.showDot ?? props.dot)),
      "Dropdown 下拉": toVariantBoolean(parseBooleanFlag(props.showDropdown ?? props.dropdown)),
      "Close 关闭": toVariantBoolean(parseBooleanFlag(props.closable ?? props.close)),
      "Disabled 禁用": parseBooleanFlag(props.disabled) ? "On" : "Off"
    }
  ];
}

function findFirstTextNode(root: SceneNode): TextNode | null {
  const textNodes =
    "findAll" in root ? (root.findAll((node) => node.type === "TEXT") as TextNode[]) : [];
  return textNodes[0] || null;
}

async function applyTagTexts(root: SceneNode, props: Record<string, unknown>, family: TagComponentFamily): Promise<void> {
  if (family === "status") {
    const explicitLabel =
      typeof props.text === "string" && props.text.trim()
        ? props.text
        : typeof props.label === "string" && props.label.trim()
          ? props.label
          : "";
    if (explicitLabel) {
      await updateFirstTextNode(root, explicitLabel);
    }
    return;
  }
  if (
    family === "other" &&
    normalizeOtherTagTypeVariant(props.otherTagType ?? props.tagType ?? props.type) === "TagGroup 标签组" &&
    "children" in root
  ) {
    const labels = parseDelimitedText(props.groupTexts ?? props.text, ["内", "荐"]);
    let items = root.children.filter((child) => "findOne" in child && Boolean(child.findOne((node) => node.type === "TEXT")));
    const templateItem = items[items.length - 1];
    if (templateItem && "clone" in templateItem && items.length < labels.length) {
      for (let index = items.length; index < labels.length; index += 1) {
        root.appendChild(templateItem.clone());
      }
      items = root.children.filter((child) => "findOne" in child && Boolean(child.findOne((node) => node.type === "TEXT")));
    }
    if (items.length > labels.length) {
      items.slice(labels.length).forEach((item) => item.remove());
      items = root.children.filter((child) => "findOne" in child && Boolean(child.findOne((node) => node.type === "TEXT")));
    }
    for (let index = 0; index < items.length; index += 1) {
      const textNode = findFirstTextNode(items[index]);
      if (!textNode) continue;
      try {
        if (textNode.fontName !== figma.mixed) {
          await figma.loadFontAsync(textNode.fontName as FontName);
        }
        textNode.characters = labels[index] || textNode.characters;
        textNode.textAutoResize = "WIDTH_AND_HEIGHT";
      } catch {
        // ignore text mutation failures
      }
    }
    return;
  }

  const label =
    typeof props.text === "string" && props.text.trim()
      ? props.text
      : typeof props.label === "string" && props.label.trim()
        ? props.label
        : "标签";
  await updateFirstTextNode(root, label);
}

async function updateFirstTextNode(root: SceneNode, value: string): Promise<void> {
  const textNodes =
    "findAll" in root ? (root.findAll((node) => node.type === "TEXT") as TextNode[]) : [];
  const target =
    textNodes.find((node) => String(node.name || "").trim() === "标签") ||
    textNodes[0];
  if (!target) return;

  try {
    if (target.fontName !== figma.mixed) {
      await figma.loadFontAsync(target.fontName as FontName);
    }
    target.characters = value;
    target.textAutoResize = "WIDTH_AND_HEIGHT";
  } catch {
    // keep original text when font mutation fails
  }
}

function normalizeStyleRef(raw: string): string {
  let normalized = String(raw || "").trim();
  if (!normalized) return "";
  const commaIndex = normalized.indexOf(",");
  if (commaIndex >= 0) normalized = normalized.slice(0, commaIndex);
  if (normalized.startsWith("S:")) normalized = normalized.slice(2);
  return normalized.trim();
}

async function applyTextStyleRef(node: TextNode, ref: string, ctx?: ApplyContext): Promise<boolean> {
  const normalized = normalizeStyleRef(ref);
  if (!normalized) return false;

  try {
    const imported = await figma.importStyleByKeyAsync(normalized);
    if (imported && imported.type === "TEXT") {
      const textStyle = imported as TextStyle;
      if (textStyle.fontName !== figma.mixed) {
        await figma.loadFontAsync(textStyle.fontName as FontName);
      }
      await node.setTextStyleIdAsync(textStyle.id);
      return true;
    }
  } catch {
    // ignore
  }

  try {
    const local = figma.getStyleById(ref) || figma.getStyleById(normalized);
    if (local && local.type === "TEXT") {
      const textStyle = local as TextStyle;
      if (textStyle.fontName !== figma.mixed) {
        await figma.loadFontAsync(textStyle.fontName as FontName);
      }
      await node.setTextStyleIdAsync(textStyle.id);
      return true;
    }
  } catch {
    // ignore
  }

  if (ctx) {
    ctx.warnings.push({
      code: "TEXT_STYLE_RESOLVE_FAILED",
      message: `Failed to resolve textStyleRef '${ref}'`
    });
  }
  return false;
}

function setSolidFill(node: SceneNode, color: RGB): void {
  if (isFrameNode(node) || isTextNode(node)) {
    node.fills = [{ type: "SOLID", color }];
  }
}

function setSolidStroke(node: SceneNode, color: RGB): void {
  if (!isFrameNode(node)) return;
  node.strokes = [{ type: "SOLID", color }];
}

function applySizeFromProps(node: SceneNode, props: Record<string, unknown>): void {
  const width = typeof props.width === "number" ? props.width : undefined;
  const height = typeof props.height === "number" ? props.height : undefined;

  if (!isResizableSceneNode(node)) return;

  const nextWidth = width && width > 0 ? width : node.width;
  const nextHeight = height && height > 0 ? height : node.height;
  node.resize(nextWidth, nextHeight);
}

async function applyTextProps(node: TextNode, props: Record<string, unknown>, ctx: ApplyContext): Promise<void> {
  const fontStyleByWeight: Record<string, string> = {
    Regular: "Regular",
    Medium: "Medium",
    Bold: "Bold"
  };

  const desiredStyleRaw = String(props.fontWeight ?? "Regular");
  const desiredStyle = fontStyleByWeight[desiredStyleRaw] ?? "Regular";
  const fontName: FontName = { family: "Inter", style: desiredStyle };

  try {
    await figma.loadFontAsync(fontName);
    node.fontName = fontName;
  } catch {
    ctx.warnings.push({
      code: "FONT_LOAD_FAILED",
      message: `Failed to load font Inter ${desiredStyle}, fallback to default`
    });
  }

  if (typeof props.text === "string") {
    node.characters = props.text;
  }
  if (typeof props.fontSize === "number") {
    node.fontSize = props.fontSize;
  }
  if (typeof props.lineHeight === "number") {
    node.lineHeight = { value: props.lineHeight, unit: "PIXELS" };
  }
  if (typeof props.color === "string") {
    const color = parseColor(props.color);
    if (color) {
      setSolidFill(node, color);
    }
  }
}

export async function applyPropsToFigmaNode(
  figmaNode: SceneNode,
  props: Record<string, unknown>,
  ctx: ApplyContext
): Promise<void> {
  if (isTextNode(figmaNode)) {
    await applyTextProps(figmaNode, props, ctx);
    return;
  }

  applySizeFromProps(figmaNode, props);

  if (isFrameNode(figmaNode)) {
    const backgroundColor = typeof props.backgroundColor === "string" ? parseColor(props.backgroundColor) : null;
    if (backgroundColor) {
      setSolidFill(figmaNode, backgroundColor);
    }

    const cornerRadius = typeof props.cornerRadius === "number" ? props.cornerRadius : undefined;
    if (cornerRadius !== undefined) {
      figmaNode.cornerRadius = cornerRadius;
    }

    if (typeof props.spacing === "number") {
      figmaNode.itemSpacing = props.spacing;
    }

    const padding = typeof props.padding === "number" ? props.padding : undefined;
    if (padding !== undefined) {
      figmaNode.paddingTop = padding;
      figmaNode.paddingRight = padding;
      figmaNode.paddingBottom = padding;
      figmaNode.paddingLeft = padding;
    }

    if (typeof props.paddingTop === "number") figmaNode.paddingTop = props.paddingTop;
    if (typeof props.paddingRight === "number") figmaNode.paddingRight = props.paddingRight;
    if (typeof props.paddingBottom === "number") figmaNode.paddingBottom = props.paddingBottom;
    if (typeof props.paddingLeft === "number") figmaNode.paddingLeft = props.paddingLeft;

    const direction = typeof props.direction === "string" ? props.direction.toLowerCase() : undefined;
    if (direction === "horizontal") {
      figmaNode.layoutMode = "HORIZONTAL";
    } else if (direction === "vertical") {
      figmaNode.layoutMode = "VERTICAL";
    }
  }
}

export function applyLayoutToFigmaNode(figmaNode: SceneNode, layout?: LayoutSpec): void {
  if (!layout || !isFrameNode(figmaNode)) return;

  if (layout.mode) {
    figmaNode.layoutMode =
      layout.mode === "horizontal"
        ? "HORIZONTAL"
        : layout.mode === "vertical"
          ? "VERTICAL"
          : "NONE";
  }

  if (typeof layout.gap === "number") {
    figmaNode.itemSpacing = layout.gap;
  }

  if (layout.padding) {
    figmaNode.paddingTop = layout.padding.top ?? figmaNode.paddingTop;
    figmaNode.paddingRight = layout.padding.right ?? figmaNode.paddingRight;
    figmaNode.paddingBottom = layout.padding.bottom ?? figmaNode.paddingBottom;
    figmaNode.paddingLeft = layout.padding.left ?? figmaNode.paddingLeft;
  }

  const width = layout.width?.type === "fixed" ? layout.width.value : undefined;
  const height = layout.height?.type === "fixed" ? layout.height.value : undefined;
  if (width !== undefined || height !== undefined) {
    figmaNode.resize(width ?? figmaNode.width, height ?? figmaNode.height);
  }
}

export async function applyStyleToFigmaNode(
  figmaNode: SceneNode,
  style?: StyleSpec,
  ctx?: ApplyContext
): Promise<void> {
  if (!style) return;

  if (style.fill) {
    const fill = parseColor(style.fill);
    if (fill) {
      setSolidFill(figmaNode, fill);
    }
  }

  if (style.textColor && isTextNode(figmaNode)) {
    const textColor = parseColor(style.textColor);
    if (textColor) {
      setSolidFill(figmaNode, textColor);
    }
  }

  if (style.textStyleRef && isTextNode(figmaNode)) {
    await applyTextStyleRef(figmaNode, style.textStyleRef, ctx);
  }

  if (style.borderColor && isFrameNode(figmaNode)) {
    const stroke = parseColor(style.borderColor);
    if (stroke) {
      setSolidStroke(figmaNode, stroke);
    }
  }

  if (isFrameNode(figmaNode)) {
    if (typeof style.borderWidth === "number") {
      figmaNode.strokeWeight = style.borderWidth;
    }
    if (typeof style.cornerRadius === "number") {
      figmaNode.cornerRadius = style.cornerRadius;
    }
    if (style.effect === "shadow") {
      figmaNode.effects = [
        {
          type: "DROP_SHADOW",
          color: { r: 0, g: 0, b: 0, a: 0.15 },
          offset: { x: 0, y: 4 },
          radius: 8,
          spread: 0,
          visible: true,
          blendMode: "NORMAL"
        }
      ];
    }
  }
}

function createFallbackFrameNode(sceneNode: ProtocolSceneNode): FrameNode {
  const frame = figma.createFrame();
  frame.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
  frame.layoutMode = "VERTICAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.fills = [];
  // Layout-only fallback containers should not clip child strokes/effects.
  frame.clipsContent = false;
  return frame;
}

async function createFigmaNode(
  definition: ComponentDefinition,
  sceneNode: ProtocolSceneNode,
  ctx: ApplyContext
): Promise<SceneNode> {
  if (sceneNode.componentId === "tag") {
    const normalizedProps = normalizeUnifiedTagProps(sceneNode.props);
    const componentTokenFromProps =
      typeof normalizedProps.componentToken === "string" ? normalizedProps.componentToken.trim() : "";
    const resolvedFromToken = componentTokenFromProps
      ? resolveComponentTokenProfile(componentTokenFromProps)
      : undefined;
    const componentKey =
      resolvedFromToken?.profile.componentKey ||
      (typeof definition.figmaPropertySnapshot?.componentKey === "string"
        ? definition.figmaPropertySnapshot.componentKey.trim()
        : "");

    if (componentKey) {
      const family = resolveTagComponentFamily(componentTokenFromProps || definition.figmaPropertySnapshot?.token);
      try {
        const criteriaCandidates = buildTagVariantCriteriaCandidates(normalizedProps, family);
        let instance: InstanceNode | null = null;
        for (const criteria of criteriaCandidates) {
          instance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: definition.name,
            variantCriteria: criteria
          });
          if (matchesVariantProps(instance.mainComponent?.variantProperties || undefined, criteria)) {
            break;
          }
          instance.remove();
          instance = null;
        }
        if (!instance) {
          instance = await createFigmaComponentInstance({
            componentKey,
            fallbackName: definition.name
          });
        }
        const detached = instance.detachInstance();
        await applyTagTexts(detached, normalizedProps, family);
        detached.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
        return detached;
      } catch (error) {
        ctx.warnings.push({
          code: "INSTANCE_CREATE_FAILED",
          message: `Failed to create instance for '${sceneNode.componentId}': ${String(error)}`
        });
        const fallback = await createInspectDrivenTagFallbackNode(normalizedProps);
        fallback.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
        return fallback;
      }
    }

    const fallback = await createInspectDrivenTagFallbackNode(normalizedProps);
    fallback.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
    return fallback;
  }

  const nodeType = definition.figmaBinding?.nodeType ?? (sceneNode.componentId === "text" ? "TEXT" : "FRAME");

  if (nodeType === "INSTANCE") {
    const componentKeyFromProps =
      typeof sceneNode.props.componentKey === "string" ? sceneNode.props.componentKey.trim() : "";
    const componentTokenFromProps =
      typeof sceneNode.props.componentToken === "string" ? sceneNode.props.componentToken.trim() : "";
    const resolvedFromToken = componentTokenFromProps
      ? resolveComponentTokenProfile(componentTokenFromProps)
      : undefined;
    const componentKeyFromToken = resolvedFromToken?.profile.componentKey || "";
    const componentKeyFromBinding =
      typeof definition.figmaBinding?.renderKey === "string" ? definition.figmaBinding.renderKey.trim() : "";
    const componentKey = componentKeyFromProps || componentKeyFromToken || componentKeyFromBinding;
    const fallbackName =
      typeof sceneNode.props.fallbackName === "string" && sceneNode.props.fallbackName.trim()
        ? sceneNode.props.fallbackName.trim()
        : definition.name;
    const variantCriteria = parseVariantCriteria(sceneNode.props.variantCriteria);

    if (componentTokenFromProps && !resolvedFromToken) {
      ctx.warnings.push({
        code: "INSTANCE_COMPONENT_TOKEN_UNKNOWN",
        message: `Unknown componentToken '${componentTokenFromProps}' for '${sceneNode.componentId}'`,
        path: buildScenePath(sceneNode)
      });
    }

    if (!componentKey) {
      ctx.warnings.push({
        code: "INSTANCE_COMPONENT_KEY_MISSING",
        message: `Component '${sceneNode.componentId}' requires props.componentToken or props.componentKey for instance rendering`,
        path: buildScenePath(sceneNode)
      });
      return createFallbackFrameNode(sceneNode);
    }

    try {
      const instance = await createFigmaComponentInstance({
        componentKey,
        fallbackName,
        variantCriteria
      });
      const textOverride =
        typeof sceneNode.props.text === "string" && sceneNode.props.text.trim()
          ? sceneNode.props.text.trim()
          : typeof sceneNode.props.title === "string" && sceneNode.props.title.trim()
            ? sceneNode.props.title.trim()
            : "";
      if (sceneNode.componentId === "figma-component" && textOverride) {
        await updateFirstTextNode(instance, textOverride);
      }
      instance.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
      return instance;
    } catch (error) {
      ctx.warnings.push({
        code: "INSTANCE_CREATE_FAILED",
        message: `Failed to create instance for '${sceneNode.componentId}': ${String(error)}`
      });
      return createFallbackFrameNode(sceneNode);
    }
  }

  if (nodeType === "TEXT") {
    const textNode = figma.createText();
    textNode.characters = "";
    textNode.name = `${sceneNode.componentId}:${sceneNode.nodeId}`;
    return textNode;
  }

  return createFallbackFrameNode(sceneNode);
}

export function insertChildNode(parent: SceneNode, child: SceneNode, index?: number): boolean {
  if (!isParentContainer(parent)) {
    return false;
  }

  if (index === undefined || index < 0 || index >= parent.children.length) {
    parent.appendChild(child);
    return true;
  }

  parent.insertChild(index, child);
  return true;
}

export async function renderSceneSubtree(
  sceneNode: ProtocolSceneNode,
  ctx: ApplyContext,
  options?: {
    parentNode?: SceneNode;
    parentSceneId?: string;
    slot?: string;
    index?: number;
    path?: string;
  }
): Promise<SceneNode> {
  const definition = resolveComponentDefinition(ctx.registry, sceneNode.componentId);
  if (!definition) {
    const error = toUnknownComponentError(sceneNode.componentId, options?.path);
    throw new Error(`${error.code}:${error.message}`);
  }

  const figmaNode = await createFigmaNode(definition, sceneNode, ctx);

  await applyPropsToFigmaNode(figmaNode, sceneNode.props, ctx);
  applyLayoutToFigmaNode(figmaNode, sceneNode.layout);
  await applyStyleToFigmaNode(figmaNode, sceneNode.style, ctx);

  if (options?.parentNode) {
    const inserted = insertChildNode(options.parentNode, figmaNode, options.index);
    if (!inserted) {
      ctx.warnings.push({
        code: "PARENT_NOT_CONTAINER",
        message: `Parent node '${options.parentSceneId}' does not support children`,
        path: options.path
      });
    }
  }

  ctx.nodeMap.set(sceneNode.nodeId, figmaNode);
  ctx.sceneMap.set(sceneNode.nodeId, sceneNode);

  if (options?.parentSceneId) {
    ctx.parentMap.set(sceneNode.nodeId, {
      parentId: options.parentSceneId,
      slot: options.slot,
      index: options.index
    });
  }

  const nodePath =
    options?.path ??
    buildScenePath(sceneNode, undefined, options?.slot, options?.index);
  syncSingleNodeMetadata(sceneNode, ctx, nodePath);

  const slots = sceneNode.slots ?? {};
  for (const [slotKey, slotChildren] of Object.entries(slots)) {
    for (let i = 0; i < slotChildren.length; i += 1) {
      const child = slotChildren[i];
      const childPath = buildScenePath(child, nodePath, slotKey, i);
      await renderSceneSubtree(child, ctx, {
        parentNode: figmaNode,
        parentSceneId: sceneNode.nodeId,
        slot: slotKey,
        index: i,
        path: childPath
      });
    }
  }

  const children = sceneNode.children ?? [];
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    const childPath = buildScenePath(child, nodePath, undefined, i);
    await renderSceneSubtree(child, ctx, {
      parentNode: figmaNode,
      parentSceneId: sceneNode.nodeId,
      index: i,
      path: childPath
    });
  }

  return figmaNode;
}
