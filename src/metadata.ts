import type { DataBinding, LayoutSpec, StyleSpec } from "./protocol/scene";

export const METADATA_VERSION = "1.0" as const;
export const METADATA_PREFIX = "uia";

const MAX_PLUGIN_DATA_VALUE_LENGTH = 8500;

const META_KEY = {
  nodeId: `${METADATA_PREFIX}.nodeId`,
  componentId: `${METADATA_PREFIX}.componentId`,
  version: `${METADATA_PREFIX}.version`,
  variant: `${METADATA_PREFIX}.variant`,
  props: `${METADATA_PREFIX}.props`,
  layout: `${METADATA_PREFIX}.layout`,
  style: `${METADATA_PREFIX}.style`,
  path: `${METADATA_PREFIX}.path`,
  bindings: `${METADATA_PREFIX}.bindings`,
  rootId: `${METADATA_PREFIX}.rootId`,
  updatedAt: `${METADATA_PREFIX}.updatedAt`
} as const;

export type MetadataErrorCode =
  | "METADATA_MISSING_REQUIRED_FIELD"
  | "METADATA_INVALID_JSON"
  | "METADATA_UNSUPPORTED_VERSION"
  | "METADATA_NODE_ID_CONFLICT"
  | "METADATA_PATH_MISMATCH"
  | "METADATA_LEGACY_UNSUPPORTED"
  | "METADATA_WRITE_FAILED"
  | "METADATA_READ_FAILED";

export interface MetadataError {
  code: MetadataErrorCode;
  message: string;
  key?: string;
}

export interface MetadataWarning {
  code: "METADATA_VALUE_TRUNCATED" | "METADATA_LEGACY_FALLBACK";
  message: string;
  key?: string;
}

export interface NodeMetadataV1 {
  nodeId: string;
  componentId: string;
  version: typeof METADATA_VERSION;
  variant?: string;
  props?: Record<string, unknown>;
  layout?: LayoutSpec;
  style?: StyleSpec;
  path?: string;
  bindings?: DataBinding[];
  rootId?: string;
  updatedAt?: string;
}

export interface SelectionContext {
  nodeId: string;
  componentId: string;
  rootId?: string;
  path?: string;
  props?: Record<string, unknown>;
  layout?: LayoutSpec;
  style?: StyleSpec;
  bindings?: DataBinding[];
}

export type MetadataResult<T> =
  | { ok: true; data: T; warnings?: MetadataWarning[] }
  | { ok: false; error: MetadataError; warnings?: MetadataWarning[] };

type PluginDataNode = BaseNode & PluginDataMixin;

function isPluginDataNode(node: BaseNode | null): node is PluginDataNode {
  if (!node) return false;
  return typeof (node as PluginDataNode).getPluginData === "function";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeParseJson<T>(raw: string, key: string): MetadataResult<T> {
  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      error: {
        code: "METADATA_INVALID_JSON",
        message: `Failed to parse metadata JSON for key '${key}'`,
        key
      }
    };
  }
}

function stringifyWithLimit(value: unknown, key: string): MetadataResult<string> {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= MAX_PLUGIN_DATA_VALUE_LENGTH) {
      return { ok: true, data: serialized };
    }
    return {
      ok: true,
      data: serialized.slice(0, MAX_PLUGIN_DATA_VALUE_LENGTH),
      warnings: [
        {
          code: "METADATA_VALUE_TRUNCATED",
          key,
          message: `Metadata value for '${key}' was truncated to fit pluginData limits`
        }
      ]
    };
  } catch {
    return {
      ok: false,
      error: {
        code: "METADATA_WRITE_FAILED",
        message: `Metadata value for '${key}' is not serializable`,
        key
      }
    };
  }
}

function setPluginDataSafe(node: PluginDataNode, key: string, value: string): MetadataResult<null> {
  try {
    node.setPluginData(key, value);
    return { ok: true, data: null };
  } catch {
    return {
      ok: false,
      error: {
        code: "METADATA_WRITE_FAILED",
        message: `Failed to write metadata key '${key}'`,
        key
      }
    };
  }
}

function normalizeLegacyMeta(raw: Record<string, string>, fallbackNodeId?: string): NodeMetadataV1 | null {
  const componentId = raw["component-id"];
  if (!componentId) return null;

  let props: Record<string, unknown> | undefined;
  if (raw.params) {
    const parsed = safeParseJson<Record<string, unknown>>(raw.params, "params");
    if (parsed.ok && isObject(parsed.data)) {
      props = parsed.data;
    }
  }

  return {
    nodeId: fallbackNodeId ?? `legacy_${componentId}`,
    componentId,
    version: METADATA_VERSION,
    props,
    updatedAt: new Date().toISOString()
  };
}

function readComplexField<T>(
  node: PluginDataNode,
  key: string
): MetadataResult<T | undefined> {
  const raw = node.getPluginData(key);
  if (!raw) return { ok: true, data: undefined };
  return safeParseJson<T>(raw, key);
}

function ensureRequired(meta: Partial<NodeMetadataV1>): MetadataResult<null> {
  if (!meta.nodeId || !meta.componentId) {
    return {
      ok: false,
      error: {
        code: "METADATA_MISSING_REQUIRED_FIELD",
        message: "Metadata requires nodeId and componentId"
      }
    };
  }
  if (meta.version && meta.version !== METADATA_VERSION) {
    return {
      ok: false,
      error: {
        code: "METADATA_UNSUPPORTED_VERSION",
        message: `Unsupported metadata version '${meta.version}'`
      }
    };
  }
  return { ok: true, data: null };
}

export function readNodeMeta(node: BaseNode | null): MetadataResult<NodeMetadataV1 | null> {
  if (!isPluginDataNode(node)) {
    return { ok: true, data: null };
  }

  const nodeId = node.getPluginData(META_KEY.nodeId);
  const componentId = node.getPluginData(META_KEY.componentId);
  const version = node.getPluginData(META_KEY.version);

  if (!nodeId || !componentId) {
    const legacy = normalizeLegacyMeta(
      {
        "component-id": node.getPluginData("component-id"),
        params: node.getPluginData("params"),
        "is-ai-component": node.getPluginData("is-ai-component")
      },
      node.id
    );

    if (!legacy) {
      return { ok: true, data: null };
    }

    return {
      ok: true,
      data: legacy,
      warnings: [
        {
          code: "METADATA_LEGACY_FALLBACK",
          message: "Node metadata loaded from legacy keys"
        }
      ]
    };
  }

  if (version && version !== METADATA_VERSION) {
    return {
      ok: false,
      error: {
        code: "METADATA_UNSUPPORTED_VERSION",
        message: `Unsupported metadata version '${version}'`
      }
    };
  }

  const props = readComplexField<Record<string, unknown>>(node, META_KEY.props);
  if (!props.ok) return props;

  const layout = readComplexField<LayoutSpec>(node, META_KEY.layout);
  if (!layout.ok) return layout;

  const style = readComplexField<StyleSpec>(node, META_KEY.style);
  if (!style.ok) return style;

  const bindings = readComplexField<DataBinding[]>(node, META_KEY.bindings);
  if (!bindings.ok) return bindings;

  const meta: NodeMetadataV1 = {
    nodeId,
    componentId,
    version: METADATA_VERSION,
    variant: node.getPluginData(META_KEY.variant) || undefined,
    path: node.getPluginData(META_KEY.path) || undefined,
    rootId: node.getPluginData(META_KEY.rootId) || undefined,
    updatedAt: node.getPluginData(META_KEY.updatedAt) || undefined,
    props: props.data,
    layout: layout.data,
    style: style.data,
    bindings: bindings.data
  };

  return { ok: true, data: meta };
}

function writeLegacyMirror(node: PluginDataNode, meta: NodeMetadataV1): MetadataResult<null> {
  const paramsSerialized = stringifyWithLimit(meta.props ?? {}, "params");
  if (!paramsSerialized.ok) return paramsSerialized;

  const writes = [
    setPluginDataSafe(node, "is-ai-component", "true"),
    setPluginDataSafe(node, "component-id", meta.componentId),
    setPluginDataSafe(node, "params", paramsSerialized.data)
  ];

  for (const result of writes) {
    if (!result.ok) return result;
  }

  return { ok: true, data: null, warnings: paramsSerialized.warnings };
}

export function writeNodeMeta(node: BaseNode, meta: NodeMetadataV1): MetadataResult<null> {
  if (!isPluginDataNode(node)) {
    return {
      ok: false,
      error: {
        code: "METADATA_WRITE_FAILED",
        message: "Target node does not support pluginData writes"
      }
    };
  }

  const requiredCheck = ensureRequired(meta);
  if (!requiredCheck.ok) return requiredCheck;

  const warnings: MetadataWarning[] = [];
  const nextMeta: NodeMetadataV1 = {
    ...meta,
    version: METADATA_VERSION,
    updatedAt: meta.updatedAt ?? new Date().toISOString()
  };

  const primitiveWrites = [
    setPluginDataSafe(node, META_KEY.nodeId, nextMeta.nodeId),
    setPluginDataSafe(node, META_KEY.componentId, nextMeta.componentId),
    setPluginDataSafe(node, META_KEY.version, nextMeta.version),
    setPluginDataSafe(node, META_KEY.variant, nextMeta.variant ?? ""),
    setPluginDataSafe(node, META_KEY.path, nextMeta.path ?? ""),
    setPluginDataSafe(node, META_KEY.rootId, nextMeta.rootId ?? ""),
    setPluginDataSafe(node, META_KEY.updatedAt, nextMeta.updatedAt ?? "")
  ];

  for (const result of primitiveWrites) {
    if (!result.ok) return result;
  }

  const complexWrites: Array<[string, unknown]> = [
    [META_KEY.props, nextMeta.props ?? {}],
    [META_KEY.layout, nextMeta.layout ?? {}],
    [META_KEY.style, nextMeta.style ?? {}],
    [META_KEY.bindings, nextMeta.bindings ?? []]
  ];

  for (const [key, value] of complexWrites) {
    const serialized = stringifyWithLimit(value, key);
    if (!serialized.ok) return serialized;
    if (serialized.warnings) warnings.push(...serialized.warnings);
    const writeResult = setPluginDataSafe(node, key, serialized.data);
    if (!writeResult.ok) return writeResult;
  }

  const legacyResult = writeLegacyMirror(node, nextMeta);
  if (!legacyResult.ok) return legacyResult;
  if (legacyResult.warnings) warnings.push(...legacyResult.warnings);

  return {
    ok: true,
    data: null,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

export function updateNodeMeta(
  node: BaseNode,
  patch: Partial<NodeMetadataV1>
): MetadataResult<NodeMetadataV1> {
  const existing = readNodeMeta(node);
  if (!existing.ok) return existing;
  if (!existing.data) {
    return {
      ok: false,
      error: {
        code: "METADATA_READ_FAILED",
        message: "Cannot update metadata on node without existing metadata"
      }
    };
  }

  const merged: NodeMetadataV1 = {
    ...existing.data,
    ...patch,
    version: METADATA_VERSION,
    updatedAt: new Date().toISOString()
  };

  const writeResult = writeNodeMeta(node, merged);
  if (!writeResult.ok) return writeResult;

  return {
    ok: true,
    data: merged,
    warnings: writeResult.warnings
  };
}

export function buildSelectionContext(startNode: BaseNode | null): SelectionContext | null {
  let cursor: BaseNode | null = startNode;

  while (cursor) {
    const readResult = readNodeMeta(cursor);
    if (!readResult.ok) return null;
    if (readResult.data) {
      return {
        nodeId: readResult.data.nodeId,
        componentId: readResult.data.componentId,
        rootId: readResult.data.rootId,
        path: readResult.data.path,
        props: readResult.data.props,
        layout: readResult.data.layout,
        style: readResult.data.style,
        bindings: readResult.data.bindings
      };
    }
    cursor = cursor.parent;
  }

  return null;
}
