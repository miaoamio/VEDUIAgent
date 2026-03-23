type TagComponentFamily = "default" | "other";
type DefaultTagType = "default" | "solid" | "outline" | "text";
type OtherTagType = "marketing" | "group";
type TagSize = "mini" | "small" | "default" | "large";
type OtherTagColor = "default" | "red" | "yellow" | "grey";

type TagMetrics = {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  lineHeight: number;
  cornerRadius: number;
  gap: number;
  iconSize: number;
  dotSize: number;
  glyphSize: number;
};

type TagPalette = {
  fill?: string;
  stroke?: string;
  text: string;
};

const DEFAULT_TAG_METRICS: Record<TagSize, TagMetrics> = {
  mini: { height: 16, paddingX: 6, paddingY: 1, fontSize: 10, lineHeight: 16, cornerRadius: 4, gap: 4, iconSize: 10, dotSize: 4, glyphSize: 9 },
  small: { height: 18, paddingX: 6, paddingY: 1, fontSize: 10, lineHeight: 18, cornerRadius: 4, gap: 4, iconSize: 10, dotSize: 4, glyphSize: 10 },
  default: { height: 20, paddingX: 6, paddingY: 1, fontSize: 12, lineHeight: 20, cornerRadius: 4, gap: 4, iconSize: 12, dotSize: 6, glyphSize: 10 },
  large: { height: 24, paddingX: 6, paddingY: 0, fontSize: 12, lineHeight: 24, cornerRadius: 4, gap: 4, iconSize: 12, dotSize: 6, glyphSize: 12 }
};

const DEFAULT_TAG_PALETTES: Record<DefaultTagType, TagPalette> = {
  default: { fill: "#F2F3F5", text: "#4E5969" },
  solid: { fill: "#1664FF", text: "#FFFFFF" },
  outline: { stroke: "#C9CDD4", text: "#4E5969" },
  text: { text: "#1664FF" }
};

const DISABLED_TAG_PALETTES: Record<DefaultTagType, TagPalette> = {
  default: { fill: "#F2F3F5", text: "#C9CDD4" },
  solid: { fill: "#E5E6EB", text: "#C9CDD4" },
  outline: { stroke: "#C9CDD4", text: "#C9CDD4" },
  text: { text: "#C9CDD4" }
};

const MARKETING_TAG_METRICS: Record<TagSize, TagMetrics> = {
  mini: { height: 16, paddingX: 4, paddingY: 2, fontSize: 10, lineHeight: 12, cornerRadius: 4, gap: 10, iconSize: 10, dotSize: 4, glyphSize: 9 },
  small: { height: 18, paddingX: 5, paddingY: 2.5, fontSize: 10, lineHeight: 13, cornerRadius: 4, gap: 10, iconSize: 10, dotSize: 4, glyphSize: 10 },
  default: { height: 20, paddingX: 6, paddingY: 3, fontSize: 12, lineHeight: 14, cornerRadius: 4, gap: 10, iconSize: 12, dotSize: 6, glyphSize: 10 },
  large: { height: 24, paddingX: 6, paddingY: 4, fontSize: 12, lineHeight: 16, cornerRadius: 4, gap: 10, iconSize: 12, dotSize: 6, glyphSize: 12 }
};

const GROUP_TAG_METRICS: Record<TagSize, TagMetrics> = {
  mini: { height: 16, paddingX: 8, paddingY: 0, fontSize: 10, lineHeight: 16, cornerRadius: 4, gap: 4, iconSize: 10, dotSize: 4, glyphSize: 9 },
  small: { height: 18, paddingX: 8, paddingY: 0, fontSize: 10, lineHeight: 18, cornerRadius: 4, gap: 4, iconSize: 10, dotSize: 4, glyphSize: 10 },
  default: { height: 20, paddingX: 8, paddingY: 0, fontSize: 12, lineHeight: 20, cornerRadius: 4, gap: 4, iconSize: 12, dotSize: 6, glyphSize: 10 },
  large: { height: 24, paddingX: 8, paddingY: 0, fontSize: 12, lineHeight: 24, cornerRadius: 4, gap: 4, iconSize: 12, dotSize: 6, glyphSize: 12 }
};

const MARKETING_TAG_PALETTES: Record<OtherTagColor, TagPalette> = {
  default: { fill: "#1664FF", text: "#FFFFFF" },
  red: { fill: "#F53F3F", text: "#FFFFFF" },
  yellow: { fill: "#FFF3E8", text: "#733E0F" },
  grey: { fill: "#F2F3F5", text: "#4E5969" }
};

const GROUP_TAG_PALETTE: TagPalette = {
  fill: "#F6F8FA",
  text: "#42464E"
};

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

function normalizeTagSize(value: unknown): TagSize {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("16") || normalized.includes("mini")) return "mini";
  if (normalized.includes("18") || normalized.includes("small")) return "small";
  if (normalized.includes("24") || normalized.includes("large")) return "large";
  return "default";
}

function normalizeTagType(value: unknown): DefaultTagType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("solid") || normalized.includes("面型")) return "solid";
  if (normalized.includes("outline") || normalized.includes("线型")) return "outline";
  if (normalized.includes("text") || normalized.includes("文字")) return "text";
  return "default";
}

function normalizeOtherTagType(value: unknown): OtherTagType {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("taggroup") || normalized.includes("group") || normalized.includes("标签组")) {
    return "group";
  }
  return "marketing";
}

function normalizeOtherTagColor(value: unknown): OtherTagColor {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.includes("red") || normalized.includes("红")) return "red";
  if (normalized.includes("yellow") || normalized.includes("黄")) return "yellow";
  if (normalized.includes("grey") || normalized.includes("gray") || normalized.includes("灰")) return "grey";
  return "default";
}

function resolveTagComponentFamily(componentToken: unknown): TagComponentFamily {
  const normalized = String(componentToken ?? "").trim().toLowerCase();
  return normalized.includes("other-tag") ? "other" : "default";
}

function resolvePrimaryTagText(params: Record<string, unknown>): string {
  const raw = String(params.text ?? params.label ?? "").trim();
  return raw || "标签";
}

function resolveTagGroupTexts(params: Record<string, unknown>): string[] {
  const primaryText = resolvePrimaryTagText(params);
  return parseDelimitedText(params.groupTexts ?? params.text, primaryText && primaryText !== "标签" ? [primaryText] : ["内", "荐"]);
}

async function createTextNode(text: string, fontSize: number, lineHeight: number, colorHex: string): Promise<TextNode> {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const textNode = figma.createText();
  textNode.fontName = { family: "Inter", style: "Regular" };
  textNode.fontSize = fontSize;
  textNode.lineHeight = { value: lineHeight, unit: "PIXELS" };
  textNode.characters = text;
  textNode.textAutoResize = "WIDTH_AND_HEIGHT";
  const color = parseColor(colorHex);
  if (color) {
    textNode.fills = [{ type: "SOLID", color }];
  }
  return textNode;
}

function applyFramePalette(frame: FrameNode, palette: TagPalette): void {
  const fillColor = parseColor(palette.fill);
  if (fillColor) {
    frame.fills = [{ type: "SOLID", color: fillColor }];
  } else {
    frame.fills = [];
  }

  const strokeColor = parseColor(palette.stroke);
  if (strokeColor) {
    frame.strokes = [{ type: "SOLID", color: strokeColor }];
    frame.strokeWeight = 1;
  } else {
    frame.strokes = [];
    frame.strokeWeight = 0;
  }
}

function createGlyphPlaceholder(size: number, colorHex: string, opacity = 0.14): FrameNode {
  const node = figma.createFrame();
  node.primaryAxisSizingMode = "FIXED";
  node.counterAxisSizingMode = "FIXED";
  node.layoutMode = "HORIZONTAL";
  node.counterAxisAlignItems = "CENTER";
  node.primaryAxisAlignItems = "CENTER";
  node.resize(size, size);
  node.cornerRadius = Math.min(4, size / 2);
  const fillColor = parseColor(colorHex);
  node.fills = fillColor
    ? [{ type: "SOLID", color: fillColor, opacity }]
    : [];
  return node;
}

async function createDefaultTagFallback(params: Record<string, unknown>): Promise<FrameNode> {
  const size = normalizeTagSize(params.size);
  const metrics = DEFAULT_TAG_METRICS[size];
  const type = normalizeTagType(params.tagType ?? params.type);
  const disabled = parseBooleanFlag(params.disabled);
  const palette = disabled ? DISABLED_TAG_PALETTES[type] : DEFAULT_TAG_PALETTES[type];

  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = metrics.gap;
  frame.paddingLeft = metrics.paddingX;
  frame.paddingRight = metrics.paddingX;
  frame.paddingTop = metrics.paddingY;
  frame.paddingBottom = metrics.paddingY;
  frame.cornerRadius = metrics.cornerRadius;
  applyFramePalette(frame, palette);

  if (parseBooleanFlag(params.showIcon ?? params.icon)) {
    frame.appendChild(createGlyphPlaceholder(metrics.iconSize, palette.text, type === "solid" ? 0.22 : 0.14));
  }

  if (parseBooleanFlag(params.showDot ?? params.dot)) {
    const dot = figma.createEllipse();
    dot.resize(metrics.dotSize, metrics.dotSize);
    const dotColor = parseColor("#737A87");
    if (dotColor) {
      dot.fills = [{ type: "SOLID", color: dotColor }];
    }
    frame.appendChild(dot);
  }

  frame.appendChild(await createTextNode(resolvePrimaryTagText(params), metrics.fontSize, metrics.lineHeight, palette.text));

  if (parseBooleanFlag(params.showDropdown ?? params.dropdown)) {
    frame.appendChild(await createTextNode("⌄", metrics.glyphSize, metrics.glyphSize, palette.text));
  }

  if (parseBooleanFlag(params.closable ?? params.close)) {
    frame.appendChild(await createTextNode("×", metrics.glyphSize, metrics.glyphSize, palette.text));
  }

  return frame;
}

async function createMarketingTagFallback(params: Record<string, unknown>): Promise<FrameNode> {
  const size = normalizeTagSize(params.size);
  const metrics = MARKETING_TAG_METRICS[size];
  const palette = MARKETING_TAG_PALETTES[normalizeOtherTagColor(params.colorScheme ?? params.color ?? params.tagColor)];

  const frame = figma.createFrame();
  frame.layoutMode = "HORIZONTAL";
  frame.primaryAxisSizingMode = "AUTO";
  frame.counterAxisSizingMode = "AUTO";
  frame.counterAxisAlignItems = "CENTER";
  frame.itemSpacing = metrics.gap;
  frame.paddingLeft = metrics.paddingX;
  frame.paddingRight = metrics.paddingX;
  frame.paddingTop = metrics.paddingY;
  frame.paddingBottom = metrics.paddingY;
  frame.cornerRadius = metrics.cornerRadius;
  applyFramePalette(frame, palette);
  frame.appendChild(await createTextNode(resolvePrimaryTagText(params), metrics.fontSize, metrics.lineHeight, palette.text));
  return frame;
}

async function createGroupTagFallback(params: Record<string, unknown>): Promise<FrameNode> {
  const size = normalizeTagSize(params.size);
  const metrics = GROUP_TAG_METRICS[size];
  const root = figma.createFrame();
  root.layoutMode = "HORIZONTAL";
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "AUTO";
  root.counterAxisAlignItems = "CENTER";
  root.itemSpacing = metrics.gap;
  root.fills = [];

  const labels = resolveTagGroupTexts(params);
  for (const label of labels) {
    const item = figma.createFrame();
    item.layoutMode = "HORIZONTAL";
    item.primaryAxisSizingMode = "AUTO";
    item.counterAxisSizingMode = "AUTO";
    item.counterAxisAlignItems = "CENTER";
    item.paddingLeft = metrics.paddingX;
    item.paddingRight = metrics.paddingX;
    item.paddingTop = metrics.paddingY;
    item.paddingBottom = metrics.paddingY;
    item.cornerRadius = metrics.cornerRadius;
    applyFramePalette(item, GROUP_TAG_PALETTE);
    item.appendChild(await createTextNode(label, metrics.fontSize, metrics.lineHeight, GROUP_TAG_PALETTE.text));
    root.appendChild(item);
  }

  return root;
}

export async function createInspectDrivenTagFallbackNode(params: Record<string, unknown>): Promise<FrameNode> {
  const family = resolveTagComponentFamily(params.componentToken);
  if (family === "other") {
    return normalizeOtherTagType(params.otherTagType ?? params.tagType ?? params.type) === "group"
      ? createGroupTagFallback(params)
      : createMarketingTagFallback(params);
  }
  return createDefaultTagFallback(params);
}
