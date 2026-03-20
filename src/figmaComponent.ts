export type VariantCriteria = Record<string, string | boolean>;

interface FigmaComponentLoadOptions {
  componentKey: string;
  fallbackName?: string;
}

interface CreateFigmaComponentInstanceOptions extends FigmaComponentLoadOptions {
  variantCriteria?: VariantCriteria | ((variant: ComponentNode) => boolean);
  visible?: boolean;
}

const FIGMA_COMPONENT_KEY_ALIASES: Record<string, string> = {
  pie: 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
  donut: 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
  piechart: 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
  'component/piechart': 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
  'lib-data-display-component-piechart': 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
  'library.data-display.component-piechart': 'ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e',
  toplist: '6acea515cbcd1ae970ef5627425bd55cbda137ff',
  'lib-data-display-toplist': '6acea515cbcd1ae970ef5627425bd55cbda137ff',
  'library.data-display.toplist': '6acea515cbcd1ae970ef5627425bd55cbda137ff'
};

function normalizeFigmaComponentKey(raw: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return trimmed;
  if (/^[0-9a-f]{40}$/i.test(trimmed)) return trimmed;
  const normalized = trimmed.toLowerCase();
  return FIGMA_COMPONENT_KEY_ALIASES[normalized] || trimmed;
}

export interface DiscoveredComponentProperty {
  propertyName: string;
  displayName: string;
  type: ComponentPropertyType;
  defaultValue: string | boolean;
  variantOptions?: string[];
  preferredValues?: Array<{
    type: 'COMPONENT' | 'COMPONENT_SET';
    key: string;
  }>;
}

export interface DiscoveredComponentSchema {
  status: 'ok' | 'error';
  token?: string;
  componentKey: string;
  componentName?: string;
  componentSetName?: string;
  nodeType?: 'COMPONENT' | 'COMPONENT_SET';
  variantCount?: number;
  sampleVariantProperties?: Record<string, string>;
  properties?: DiscoveredComponentProperty[];
  error?: string;
}

export interface InspectedComponentStructureNode {
  nodeType: SceneNode['type'];
  name: string;
  width: number;
  height: number;
  visible?: boolean;
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomLeftRadius?: number;
  bottomRightRadius?: number;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  characters?: string;
  componentKey?: string;
  componentName?: string;
  componentSetName?: string;
  variantProperties?: Record<string, string>;
  componentProperties?: Record<string, {
    type: string;
    value: string | boolean;
  }>;
  boundVariables?: Record<string, InspectedVariableReference | InspectedVariableReference[]>;
  fills?: InspectedPaintInfo[];
  strokes?: InspectedPaintInfo[];
  effectStyle?: InspectedStyleReference;
  effects?: InspectedEffectInfo[];
  children?: InspectedComponentStructureNode[];
  truncatedChildren?: number;
}

export interface InspectedVariableReference {
  aliasId: string;
  variableId?: string;
  key?: string;
  name?: string;
  collectionId?: string;
  collectionKey?: string;
  collectionName?: string;
  remote?: boolean;
  resolvedType?: string;
  resolvedValue?: string | number | boolean;
}

export interface InspectedPaintInfo {
  type: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  color?: string;
  gradientStops?: string[];
  boundVariables?: Array<{
    field: string;
    variable: InspectedVariableReference;
  }>;
}

export interface InspectedStyleReference {
  id: string;
  key?: string;
  name?: string;
  type?: string;
  remote?: boolean;
}

export interface InspectedEffectInfo {
  type: string;
  visible?: boolean;
  radius?: number;
  spread?: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
  blendMode?: string;
}

export interface InspectedComponentStructureResult {
  status: 'ok' | 'error';
  token?: string;
  componentKey: string;
  componentName?: string;
  componentSetName?: string;
  nodeType?: 'COMPONENT' | 'COMPONENT_SET';
  variantCount?: number;
  sampleVariantProperties?: Record<string, string>;
  properties?: DiscoveredComponentProperty[];
  variants?: Array<{
    name: string;
    variantProperties?: Record<string, string>;
  }>;
  structure?: InspectedComponentStructureNode;
  variantStructures?: Array<{
    name: string;
    variantProperties?: Record<string, string>;
    structure: InspectedComponentStructureNode;
  }>;
  variantStructuresTruncated?: boolean;
  error?: string;
}

const figmaComponentCache = new Map<string, ComponentNode | ComponentSetNode>();
const variableInfoCache = new Map<string, Promise<InspectedVariableReference>>();
const variableCollectionCache = new Map<string, Promise<VariableCollection | null>>();

function toHexChannel(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0').toUpperCase();
}

function colorToHex(color: RGB | RGBA, opacity?: number): string {
  const alphaFromColor = typeof (color as RGBA).a === 'number' ? (color as RGBA).a : undefined;
  const alpha = typeof alphaFromColor === 'number' ? alphaFromColor : opacity;
  const hex =
    `#${toHexChannel(color.r * 255)}` +
    `${toHexChannel(color.g * 255)}` +
    `${toHexChannel(color.b * 255)}`;
  if (typeof alpha === 'number' && alpha >= 0 && alpha < 1) {
    return `${hex}${toHexChannel(alpha * 255)}`;
  }
  return hex;
}

function normalizeResolvedVariableValue(value: VariableValue): string | number | boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value && typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
    return `VARIABLE_ALIAS:${value.id}`;
  }
  return colorToHex(value as RGB | RGBA);
}

async function getVariableCollectionByIdCached(id: string): Promise<VariableCollection | null> {
  const normalized = String(id || '').trim();
  if (!normalized) return null;
  const cached = variableCollectionCache.get(normalized);
  if (cached) return cached;
  const pending = figma.variables.getVariableCollectionByIdAsync(normalized).catch(() => null);
  variableCollectionCache.set(normalized, pending);
  return pending;
}

async function resolveVariableAliasInfo(
  alias: VariableAlias,
  consumer: SceneNode
): Promise<InspectedVariableReference> {
  const aliasId = String(alias?.id || '').trim();
  if (!aliasId) {
    return { aliasId: '' };
  }

  const cached = variableInfoCache.get(aliasId);
  if (cached) return cached;

  const pending = (async (): Promise<InspectedVariableReference> => {
    const info: InspectedVariableReference = {
      aliasId,
      variableId: aliasId
    };

    try {
      const variable = await figma.variables.getVariableByIdAsync(aliasId);
      if (!variable) return info;

      info.variableId = variable.id;
      info.key = variable.key;
      info.name = variable.name;
      info.collectionId = variable.variableCollectionId;
      info.remote = variable.remote;
      info.resolvedType = variable.resolvedType;

      try {
        const resolved = variable.resolveForConsumer(consumer);
        info.resolvedType = resolved.resolvedType;
        info.resolvedValue = normalizeResolvedVariableValue(resolved.value);
      } catch {
        // Ignore unresolved mode issues and still return base metadata.
      }

      if (variable.variableCollectionId) {
        const collection = await getVariableCollectionByIdCached(variable.variableCollectionId);
        if (collection) {
          info.collectionName = collection.name;
          info.collectionKey = collection.key;
        }
      }
    } catch {
      // Keep aliasId-only fallback when variable metadata cannot be resolved.
    }

    return info;
  })();

  variableInfoCache.set(aliasId, pending);
  return pending;
}

function flattenVariableAliases(raw: unknown): VariableAlias[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    const output: VariableAlias[] = [];
    raw.forEach((item) => {
      output.push(...flattenVariableAliases(item));
    });
    return output;
  }
  if (typeof raw === 'object' && raw !== null && 'type' in raw && (raw as VariableAlias).type === 'VARIABLE_ALIAS') {
    return [raw as VariableAlias];
  }
  return [];
}

async function inspectBoundVariablesMap(
  raw: unknown,
  consumer: SceneNode
): Promise<InspectedVariableReference | InspectedVariableReference[] | undefined> {
  const aliases = flattenVariableAliases(raw);
  if (aliases.length === 0) return undefined;
  const resolved = await Promise.all(aliases.map((alias) => resolveVariableAliasInfo(alias, consumer)));
  return resolved.length === 1 ? resolved[0] : resolved;
}

async function inspectNodeBoundVariables(node: SceneNode): Promise<InspectedComponentStructureNode['boundVariables']> {
  const raw = (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables;
  if (!raw || typeof raw !== 'object') return undefined;

  const output: Record<string, InspectedVariableReference | InspectedVariableReference[]> = {};
  const entries = Object.entries(raw);
  for (const [field, value] of entries) {
    const inspected = await inspectBoundVariablesMap(value, node);
    if (inspected) {
      output[field] = inspected;
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}

async function inspectPaintArray(
  node: SceneNode,
  property: 'fills' | 'strokes'
): Promise<InspectedPaintInfo[] | undefined> {
  const rawPaints = (node as SceneNode & {
    fills?: readonly Paint[] | PluginAPI['mixed'];
    strokes?: readonly Paint[] | PluginAPI['mixed'];
  })[property];
  if (!rawPaints || rawPaints === figma.mixed || !Array.isArray(rawPaints) || rawPaints.length === 0) {
    return undefined;
  }

  const nodeBoundPaints = flattenVariableAliases(
    (node as SceneNode & { boundVariables?: Record<string, unknown> }).boundVariables?.[property]
  );

  const results: InspectedPaintInfo[] = [];
  for (let index = 0; index < rawPaints.length; index += 1) {
    const paint = rawPaints[index];
    const info: InspectedPaintInfo = {
      type: paint.type
    };

    if ('visible' in paint && typeof paint.visible === 'boolean') {
      info.visible = paint.visible;
    }
    if ('opacity' in paint && typeof paint.opacity === 'number') {
      info.opacity = paint.opacity;
    }
    if ('blendMode' in paint && typeof paint.blendMode === 'string') {
      info.blendMode = paint.blendMode;
    }
    if (paint.type === 'SOLID') {
      info.color = colorToHex(paint.color, paint.opacity);
    } else if ('gradientStops' in paint && Array.isArray(paint.gradientStops)) {
      info.gradientStops = paint.gradientStops.map((stop) => colorToHex(stop.color));
    }

    const bindings: Array<{ field: string; variable: InspectedVariableReference }> = [];
    const seen = new Set<string>();
    const paintBound = (paint as Paint & { boundVariables?: Record<string, unknown> }).boundVariables;
    if (paintBound && typeof paintBound === 'object') {
      for (const [field, value] of Object.entries(paintBound)) {
        const aliases = flattenVariableAliases(value);
        for (const alias of aliases) {
          const dedupeKey = `${field}:${alias.id}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          bindings.push({
            field,
            variable: await resolveVariableAliasInfo(alias, node)
          });
        }
      }
    }

    const nodeAlias = nodeBoundPaints[index];
    if (nodeAlias) {
      const dedupeKey = `node:${nodeAlias.id}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        bindings.push({
          field: 'node',
          variable: await resolveVariableAliasInfo(nodeAlias, node)
        });
      }
    }

    if (bindings.length > 0) {
      info.boundVariables = bindings;
    }

    results.push(info);
  }

  return results.length > 0 ? results : undefined;
}

function inspectEffectStyle(node: SceneNode): InspectedStyleReference | undefined {
  const effectStyleId = String((node as SceneNode & { effectStyleId?: string }).effectStyleId || '').trim();
  if (!effectStyleId) return undefined;

  const output: InspectedStyleReference = {
    id: effectStyleId
  };

  try {
    const style = figma.getStyleById(effectStyleId);
    if (style) {
      output.key = style.key;
      output.name = style.name;
      output.type = style.type;
      if ('remote' in style && typeof style.remote === 'boolean') {
        output.remote = style.remote;
      }
    }
  } catch {
    // Keep id-only fallback when effect style metadata cannot be resolved.
  }

  return output;
}

function inspectEffects(node: SceneNode): InspectedEffectInfo[] | undefined {
  const rawEffects = (node as SceneNode & { effects?: readonly Effect[] | PluginAPI['mixed'] }).effects;
  if (!rawEffects || rawEffects === figma.mixed || !Array.isArray(rawEffects) || rawEffects.length === 0) {
    return undefined;
  }

  const results: InspectedEffectInfo[] = [];
  rawEffects.forEach((effect) => {
    const info: InspectedEffectInfo = {
      type: effect.type
    };

    if ('visible' in effect && typeof effect.visible === 'boolean') {
      info.visible = effect.visible;
    }
    if ('radius' in effect && typeof effect.radius === 'number') {
      info.radius = effect.radius;
    }
    if ('spread' in effect && typeof effect.spread === 'number') {
      info.spread = effect.spread;
    }
    if ('blendMode' in effect && typeof effect.blendMode === 'string') {
      info.blendMode = effect.blendMode;
    }
    if ('offset' in effect && effect.offset) {
      info.offsetX = effect.offset.x;
      info.offsetY = effect.offset.y;
    }
    if ('color' in effect && effect.color) {
      info.color = colorToHex(effect.color);
    }

    results.push(info);
  });

  return results.length > 0 ? results : undefined;
}

function isComponentOrSetNode(node: BaseNode | null): node is ComponentNode | ComponentSetNode {
  return Boolean(node && (node.type === "COMPONENT" || node.type === "COMPONENT_SET"));
}

function normalizeVariantOptionValue(value: string | boolean): string {
  if (typeof value === "boolean") return value ? "True" : "False";
  return String(value).trim();
}

function matchVariantOption(
  variantProps: Record<string, string>,
  criteriaKey: string
): string | undefined {
  const normalizedKey = criteriaKey.trim().toLowerCase();
  const propKeys = Object.keys(variantProps);

  return (
    propKeys.find((key) => key.trim().toLowerCase() === normalizedKey) ||
    propKeys.find((key) => key.toLowerCase().includes(normalizedKey))
  );
}

function matchesVariantCriteria(variant: ComponentNode, criteria: VariantCriteria): boolean {
  const props = variant.variantProperties;
  if (!props) return false;

  for (const [key, value] of Object.entries(criteria)) {
    const matchedPropName = matchVariantOption(props, key);
    if (!matchedPropName) return false;

    const actual = String(props[matchedPropName]).trim().toLowerCase();
    const expected = normalizeVariantOptionValue(value).toLowerCase();
    if (actual !== expected) {
      return false;
    }
  }

  return true;
}

function findRepresentativeVariant(
  variants: ComponentNode[],
  preferredCriteria: VariantCriteria,
  fallbackCriteria?: VariantCriteria
): ComponentNode | undefined {
  return (
    (fallbackCriteria ? variants.find((variant) => matchesVariantCriteria(variant, fallbackCriteria)) : undefined) ||
    variants.find((variant) => matchesVariantCriteria(variant, preferredCriteria))
  );
}

function findPropertyDisplayName(
  properties: DiscoveredComponentProperty[],
  candidates: string[]
): string | undefined {
  const lowered = candidates.map((candidate) => candidate.trim().toLowerCase()).filter(Boolean);
  const matched = properties.find((property) => {
    const displayName = String(property.displayName || property.propertyName || '').trim().toLowerCase();
    return lowered.some((candidate) => displayName.includes(candidate));
  });
  return matched ? (matched.displayName || matched.propertyName) : undefined;
}

function selectRepresentativeVariantNodes(
  loaded: ComponentNode | ComponentSetNode,
  variants: ComponentNode[],
  properties: DiscoveredComponentProperty[] | undefined
): { selected: ComponentNode[]; truncated: boolean } {
  if (variants.length <= 12) {
    return { selected: variants, truncated: false };
  }

  const selected: ComponentNode[] = [];
  const selectedIds = new Set<string>();
  const maxSelected = 16;
  const baseline = loaded.type === 'COMPONENT_SET'
    ? ((loaded.defaultVariant as ComponentNode | null) || variants[0])
    : variants[0];
  const baselineProps = baseline?.variantProperties || {};

  const addVariant = (variant?: ComponentNode | null) => {
    if (!variant || selectedIds.has(variant.id) || selected.length >= maxSelected) return;
    selected.push(variant);
    selectedIds.add(variant.id);
  };

  addVariant(baseline);

  (properties || []).forEach((property) => {
    const propertyName = String(property.displayName || property.propertyName || '').trim();
    if (!propertyName || selected.length >= maxSelected) return;
    const options = Array.isArray(property.variantOptions) ? property.variantOptions.map((value) => String(value).trim()).filter(Boolean) : [];
    if (options.length <= 1) return;

    const defaultValue = normalizeVariantOptionValue(property.defaultValue).toLowerCase();
    options.forEach((option) => {
      if (selected.length >= maxSelected) return;
      if (normalizeVariantOptionValue(option).toLowerCase() === defaultValue) return;

      const exactVariant = findRepresentativeVariant(
        variants,
        { [propertyName]: option },
        { ...baselineProps, [propertyName]: option }
      );
      addVariant(exactVariant);
    });
  });

  const errorProperty = findPropertyDisplayName(properties || [], ['error', '错误']);
  const filledProperty = findPropertyDisplayName(properties || [], ['filled', '已填']);
  if (errorProperty && filledProperty && selected.length < maxSelected) {
    const errorFilledVariant = findRepresentativeVariant(
      variants,
      { [errorProperty]: 'True', [filledProperty]: 'True' },
      { ...baselineProps, [errorProperty]: 'True', [filledProperty]: 'True' }
    );
    addVariant(errorFilledVariant);
  }

  return {
    selected,
    truncated: selected.length < variants.length
  };
}

function findComponentByFallbackName(fallbackName: string): ComponentNode | ComponentSetNode | null {
  const normalized = fallbackName.trim().toLowerCase();
  if (!normalized) return null;

  const isTarget = (node: SceneNode | PageNode | DocumentNode) =>
    isComponentOrSetNode(node) &&
    (node.name.toLowerCase() === normalized || node.name.toLowerCase().includes(normalized));

  const fromCurrentPage = figma.currentPage.findOne(isTarget) as ComponentNode | ComponentSetNode | null;
  if (fromCurrentPage) return fromCurrentPage;

  return figma.root.findOne(isTarget) as ComponentNode | ComponentSetNode | null;
}

export async function loadFigmaComponentByKey(
  options: FigmaComponentLoadOptions
): Promise<ComponentNode | ComponentSetNode> {
  const componentKey = options.componentKey.trim();
  if (!componentKey) {
    throw new Error("componentKey is required.");
  }

  const cached = figmaComponentCache.get(componentKey);
  if (cached && !cached.removed) {
    return cached;
  }
  if (cached?.removed) {
    figmaComponentCache.delete(componentKey);
  }

  let componentSetImportError: unknown = null;
  try {
    const importSetAsync = (figma as unknown as {
      importComponentSetByKeyAsync?: (key: string) => Promise<ComponentSetNode>;
    }).importComponentSetByKeyAsync;
    if (typeof importSetAsync === "function") {
      const importedSet = await importSetAsync.call(figma, componentKey);
      figmaComponentCache.set(componentKey, importedSet);
      return importedSet;
    }
  } catch (error) {
    componentSetImportError = error;
  }

  try {
    const imported = await figma.importComponentByKeyAsync(componentKey);
    if (imported.type === "COMPONENT" && imported.parent?.type === "COMPONENT_SET") {
      figmaComponentCache.set(componentKey, imported.parent);
      return imported.parent;
    }

    figmaComponentCache.set(componentKey, imported);
    return imported;
  } catch (error) {
    const localByKey = figma.currentPage.findOne(
      (node) => isComponentOrSetNode(node) && node.key === componentKey
    ) as ComponentNode | ComponentSetNode | null;
    if (localByKey) {
      figmaComponentCache.set(componentKey, localByKey);
      return localByKey;
    }

    if (options.fallbackName) {
      const localByName = findComponentByFallbackName(options.fallbackName);
      if (localByName) {
        figmaComponentCache.set(componentKey, localByName);
        return localByName;
      }
    }

    throw new Error(
      `Failed to load component by key '${componentKey}'${options.fallbackName ? ` (fallbackName: ${options.fallbackName})` : ""}: componentSetImport=${String(componentSetImportError)}; componentImport=${String(error)}`
    );
  }
}

export function findFigmaVariant(
  component: ComponentNode | ComponentSetNode,
  criteria?: VariantCriteria | ((variant: ComponentNode) => boolean)
): ComponentNode {
  if (component.type === "COMPONENT") {
    return component;
  }

  const variants = component.children.filter((child) => child.type === "COMPONENT") as ComponentNode[];
  if (variants.length === 0) {
    throw new Error(`Component set '${component.name}' has no variants.`);
  }

  if (!criteria) {
    return (component.defaultVariant as ComponentNode | null) || variants[0];
  }

  let matched: ComponentNode | undefined;

  if (typeof criteria === "function") {
    matched = variants.find(criteria);
  } else {
    matched = variants.find((variant) => {
      const props = variant.variantProperties;
      if (!props) return false;

      for (const [key, value] of Object.entries(criteria)) {
        const matchedPropName = matchVariantOption(props, key);
        // Strict mode: unknown criteria key means this variant does not match.
        // This prevents silently ignoring guessed fields.
        if (!matchedPropName) return false;

        const actual = String(props[matchedPropName]).trim().toLowerCase();
        const expected = normalizeVariantOptionValue(value).toLowerCase();
        if (actual !== expected) {
          return false;
        }
      }

      return true;
    });
  }

  return matched || (component.defaultVariant as ComponentNode | null) || variants[0];
}

function parseLooseKeyValueCriteria(raw: string): VariantCriteria | undefined {
  const result: VariantCriteria = {};

  const pairs = raw
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);

  pairs.forEach((pair) => {
    const separatorIndex = pair.includes("=") ? pair.indexOf("=") : pair.indexOf(":");
    if (separatorIndex <= 0) return;

    const key = pair.slice(0, separatorIndex).trim();
    const valueRaw = pair.slice(separatorIndex + 1).trim();
    if (!key || !valueRaw) return;

    if (valueRaw.toLowerCase() === "true") {
      result[key] = true;
    } else if (valueRaw.toLowerCase() === "false") {
      result[key] = false;
    } else {
      result[key] = valueRaw;
    }
  });

  return Object.keys(result).length > 0 ? result : undefined;
}

export function parseVariantCriteria(value: unknown): VariantCriteria | undefined {
  if (!value) return undefined;

  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    const result: VariantCriteria = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (!key.trim()) return;
      if (typeof raw === "string" || typeof raw === "boolean") {
        result[key] = raw;
      } else if (typeof raw === "number") {
        result[key] = String(raw);
      }
    });
    return Object.keys(result).length > 0 ? result : undefined;
  }

  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      return parseVariantCriteria(parsed);
    } catch {
      // continue to loose parser
    }
  }

  return parseLooseKeyValueCriteria(trimmed);
}

export async function createFigmaComponentInstance(
  options: CreateFigmaComponentInstanceOptions
): Promise<InstanceNode> {
  const component = await loadFigmaComponentByKey({
    componentKey: normalizeFigmaComponentKey(options.componentKey),
    fallbackName: options.fallbackName
  });

  const target = findFigmaVariant(component, options.variantCriteria);
  const instance = target.createInstance();
  if (options.visible === false) {
    instance.visible = false;
  }
  return instance;
}

function toDisplayPropertyName(propertyName: string): string {
  const normalized = String(propertyName || '').trim();
  if (!normalized) return normalized;
  const hashIndex = normalized.lastIndexOf('#');
  if (hashIndex > 0) return normalized.slice(0, hashIndex);
  return normalized;
}

function collectVariantValueMap(
  component: ComponentNode | ComponentSetNode
): Record<string, Set<string>> {
  const valueMap: Record<string, Set<string>> = {};

  const addProps = (props?: Record<string, string> | null) => {
    if (!props) return;
    Object.entries(props).forEach(([name, value]) => {
      const key = toDisplayPropertyName(name);
      if (!valueMap[key]) valueMap[key] = new Set<string>();
      valueMap[key].add(String(value));
    });
  };

  if (component.type === 'COMPONENT_SET') {
    const variants = component.children.filter(
      (child) => child.type === 'COMPONENT'
    ) as ComponentNode[];
    variants.forEach((variant) => addProps(variant.variantProperties));
    return valueMap;
  }

  addProps(component.variantProperties);
  return valueMap;
}

function truncateText(value: string, maxLength = 160): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

async function resolveInstanceMainComponent(instance: InstanceNode): Promise<ComponentNode | null> {
  const asyncGetter = (instance as unknown as {
    getMainComponentAsync?: () => Promise<ComponentNode | null>;
  }).getMainComponentAsync;

  if (typeof asyncGetter === 'function') {
    try {
      return await asyncGetter.call(instance);
    } catch {
      // fall back to sync accessor
    }
  }

  return instance.mainComponent || null;
}

async function inspectSceneNodeTree(
  node: SceneNode,
  options: { depth: number; maxDepth: number; maxChildren: number }
): Promise<InspectedComponentStructureNode> {
  const info: InspectedComponentStructureNode = {
    nodeType: node.type,
    name: node.name,
    width: Math.round(node.width),
    height: Math.round(node.height),
    visible: node.visible
  };

  const autoLayoutNode = node as SceneNode & {
    cornerRadius?: number | symbol;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomLeftRadius?: number;
    bottomRightRadius?: number;
    layoutMode?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    itemSpacing?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  };

  if (typeof autoLayoutNode.cornerRadius === 'number') {
    info.cornerRadius = Number(autoLayoutNode.cornerRadius);
  }
  if (typeof autoLayoutNode.topLeftRadius === 'number') {
    info.topLeftRadius = Number(autoLayoutNode.topLeftRadius);
  }
  if (typeof autoLayoutNode.topRightRadius === 'number') {
    info.topRightRadius = Number(autoLayoutNode.topRightRadius);
  }
  if (typeof autoLayoutNode.bottomLeftRadius === 'number') {
    info.bottomLeftRadius = Number(autoLayoutNode.bottomLeftRadius);
  }
  if (typeof autoLayoutNode.bottomRightRadius === 'number') {
    info.bottomRightRadius = Number(autoLayoutNode.bottomRightRadius);
  }

  if (typeof autoLayoutNode.layoutMode === 'string' && autoLayoutNode.layoutMode !== 'NONE') {
    info.layoutMode = autoLayoutNode.layoutMode;
    info.primaryAxisSizingMode = autoLayoutNode.primaryAxisSizingMode;
    info.counterAxisSizingMode = autoLayoutNode.counterAxisSizingMode;
    info.itemSpacing = Number(autoLayoutNode.itemSpacing || 0);
    info.paddingTop = Number(autoLayoutNode.paddingTop || 0);
    info.paddingRight = Number(autoLayoutNode.paddingRight || 0);
    info.paddingBottom = Number(autoLayoutNode.paddingBottom || 0);
    info.paddingLeft = Number(autoLayoutNode.paddingLeft || 0);
  }

  if (node.type === 'TEXT') {
    info.characters = truncateText(node.characters || '');
  }

  const nodeBoundVariables = await inspectNodeBoundVariables(node);
  if (nodeBoundVariables) {
    info.boundVariables = nodeBoundVariables;
  }

  const fills = await inspectPaintArray(node, 'fills');
  if (fills) {
    info.fills = fills;
  }

  const strokes = await inspectPaintArray(node, 'strokes');
  if (strokes) {
    info.strokes = strokes;
  }

  const effectStyle = inspectEffectStyle(node);
  if (effectStyle) {
    info.effectStyle = effectStyle;
  }

  const effects = inspectEffects(node);
  if (effects) {
    info.effects = effects;
  }

  if (node.type === 'COMPONENT' && node.variantProperties) {
    info.variantProperties = { ...node.variantProperties };
  }

  if (node.type === 'INSTANCE') {
    const mainComponent = await resolveInstanceMainComponent(node);
    if (mainComponent) {
      info.componentKey = mainComponent.key;
      info.componentName = mainComponent.name;
      if (mainComponent.parent?.type === 'COMPONENT_SET') {
        info.componentSetName = mainComponent.parent.name;
      }
    }

    const componentProperties = node.componentProperties || {};
    const normalizedProperties: InspectedComponentStructureNode['componentProperties'] = {};
    Object.entries(componentProperties).forEach(([propertyName, definition]) => {
      if (!definition) return;
      const value = definition.value;
      if (typeof value !== 'string' && typeof value !== 'boolean') return;
      normalizedProperties[propertyName] = {
        type: definition.type,
        value
      };
    });
    if (Object.keys(normalizedProperties).length > 0) {
      info.componentProperties = normalizedProperties;
    }
  }

  if ('children' in node && options.depth < options.maxDepth) {
    const children = node.children.slice(0, options.maxChildren);
    if (node.children.length > options.maxChildren) {
      info.truncatedChildren = node.children.length - options.maxChildren;
    }
    if (children.length > 0) {
      info.children = [];
      for (const child of children) {
        info.children.push(
          await inspectSceneNodeTree(child, {
            depth: options.depth + 1,
            maxDepth: options.maxDepth,
            maxChildren: options.maxChildren
          })
        );
      }
    }
  }

  return info;
}

export async function discoverFigmaComponentSchema(
  options: FigmaComponentLoadOptions & { token?: string }
): Promise<DiscoveredComponentSchema> {
  const componentKey = String(options.componentKey || '').trim();
  if (!componentKey) {
    return {
      status: 'error',
      token: options.token,
      componentKey: '',
      error: 'componentKey is required'
    };
  }

  try {
    const loaded = await loadFigmaComponentByKey({
      componentKey,
      fallbackName: options.fallbackName
    });

    const nodeType: 'COMPONENT' | 'COMPONENT_SET' = loaded.type;
    const variantCount =
      loaded.type === 'COMPONENT_SET'
        ? loaded.children.filter((child) => child.type === 'COMPONENT').length
        : loaded.variantProperties
          ? 1
          : 0;

    const sampleVariantProperties =
      loaded.type === 'COMPONENT_SET'
        ? loaded.defaultVariant?.variantProperties || undefined
        : loaded.variantProperties || undefined;

    const variantValueMap = collectVariantValueMap(loaded);
    const definitions = loaded.componentPropertyDefinitions || {};

    const properties: DiscoveredComponentProperty[] = Object.entries(definitions).map(
      ([propertyName, definition]) => {
        const displayName = toDisplayPropertyName(propertyName);
        const property: DiscoveredComponentProperty = {
          propertyName,
          displayName,
          type: definition.type,
          defaultValue: definition.defaultValue
        };

        if (definition.type === 'VARIANT') {
          const fromDefinition = Array.isArray(definition.variantOptions)
            ? definition.variantOptions.map((value) => String(value))
            : [];
          const fromVariants = Array.from(variantValueMap[displayName] || []);
          const merged = Array.from(new Set([...fromDefinition, ...fromVariants])).filter(Boolean);
          if (merged.length > 0) {
            property.variantOptions = merged;
          }
        }

        if (definition.type === 'BOOLEAN') {
          property.variantOptions = ['True', 'False'];
        }

        if (
          definition.type === 'INSTANCE_SWAP' &&
          Array.isArray(definition.preferredValues) &&
          definition.preferredValues.length > 0
        ) {
          property.preferredValues = definition.preferredValues.map((value) => ({
            type: value.type,
            key: value.key
          }));
        }

        return property;
      }
    );

    properties.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.displayName.localeCompare(b.displayName);
    });

    return {
      status: 'ok',
      token: options.token,
      componentKey,
      componentName: loaded.type === 'COMPONENT_SET' ? loaded.defaultVariant?.name || loaded.name : loaded.name,
      componentSetName: loaded.type === 'COMPONENT_SET' ? loaded.name : loaded.parent?.type === 'COMPONENT_SET' ? loaded.parent.name : undefined,
      nodeType,
      variantCount,
      sampleVariantProperties,
      properties
    };
  } catch (error) {
    return {
      status: 'error',
      token: options.token,
      componentKey,
      error: String(error)
    };
  }
}

export async function inspectFigmaComponentStructure(
  options: FigmaComponentLoadOptions & {
    token?: string;
    maxDepth?: number;
    maxChildren?: number;
    variantCriteria?: VariantCriteria | string;
  }
): Promise<InspectedComponentStructureResult> {
  const componentKey = String(options.componentKey || '').trim();
  if (!componentKey) {
    return {
      status: 'error',
      token: options.token,
      componentKey: '',
      error: 'componentKey is required'
    };
  }

  try {
    const loaded = await loadFigmaComponentByKey({
      componentKey,
      fallbackName: options.fallbackName
    });
    const schema = await discoverFigmaComponentSchema(options);
    const schemaProperties = schema.status === 'ok' ? schema.properties : undefined;
    const variants =
      loaded.type === 'COMPONENT_SET'
        ? (loaded.children.filter((child) => child.type === 'COMPONENT') as ComponentNode[])
        : [loaded];
    const parsedVariantCriteria = parseVariantCriteria(options.variantCriteria);
    const primaryVariant = loaded.type === 'COMPONENT_SET'
      ? findFigmaVariant(loaded, parsedVariantCriteria)
      : loaded;
    const maxDepth = Number.isFinite(options.maxDepth) && Number(options.maxDepth) > 0 ? Math.floor(Number(options.maxDepth)) : 5;
    const maxChildren = Number.isFinite(options.maxChildren) && Number(options.maxChildren) > 0 ? Math.floor(Number(options.maxChildren)) : 24;

    const autoSelection = parsedVariantCriteria
      ? { selected: [primaryVariant], truncated: false }
      : selectRepresentativeVariantNodes(loaded, variants, schemaProperties);

    if (!autoSelection.selected.some((variant) => variant.id === primaryVariant.id)) {
      autoSelection.selected.unshift(primaryVariant);
      autoSelection.truncated = autoSelection.selected.length < variants.length;
    }

    const variantStructures = [];
    for (const variant of autoSelection.selected) {
      variantStructures.push({
        name: variant.name,
        variantProperties: variant.variantProperties || undefined,
        structure: await inspectSceneNodeTree(variant, {
          depth: 0,
          maxDepth,
          maxChildren
        })
      });
    }

    const structure = variantStructures[0]?.structure;

    return {
      status: 'ok',
      token: options.token,
      componentKey,
      componentName:
        loaded.type === 'COMPONENT_SET'
          ? primaryVariant?.name || loaded.name
          : loaded.name,
      componentSetName:
        loaded.type === 'COMPONENT_SET'
          ? loaded.name
          : loaded.parent?.type === 'COMPONENT_SET'
            ? loaded.parent.name
            : undefined,
      nodeType: loaded.type,
      variantCount: loaded.type === 'COMPONENT_SET' ? variants.length : primaryVariant.variantProperties ? 1 : 0,
      sampleVariantProperties: primaryVariant?.variantProperties || undefined,
      properties: schemaProperties,
      variants: variants.slice(0, 12).map((variant) => ({
        name: variant.name,
        variantProperties: variant.variantProperties || undefined
      })),
      structure,
      variantStructures,
      variantStructuresTruncated: autoSelection.truncated
    };
  } catch (error) {
    return {
      status: 'error',
      token: options.token,
      componentKey,
      error: String(error)
    };
  }
}
