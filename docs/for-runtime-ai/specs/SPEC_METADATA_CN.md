# Metadata 规范（Spec Coding）

## 1. 目标
定义插件节点元数据（`pluginData`）的统一协议，用于：

1. 语义恢复：从选中节点恢复 Scene 语义节点。
2. 增量编辑：按 `nodeId` 精准定位并执行 patch。
3. 兼容迁移：支持版本演进与历史数据读取。
4. 调试审计：保留最小可追踪信息。

## 2. 命名空间
统一使用 `uia.*` 前缀，禁止散乱 key。

基础键（必须）：

1. `uia.nodeId`
2. `uia.componentId`
3. `uia.version`

扩展键（推荐）：

1. `uia.variant`
2. `uia.props`
3. `uia.layout`
4. `uia.style`
5. `uia.path`
6. `uia.bindings`
7. `uia.rootId`
8. `uia.updatedAt`

## 3. 字段定义

```ts
interface NodeMetadataV1 {
  nodeId: string;                          // 对应 SceneNode.nodeId
  componentId: string;                     // 对应组件定义 id
  version: "1.0";                          // metadata 协议版本
  variant?: string;
  props?: Record<string, unknown>;         // 可序列化
  layout?: Record<string, unknown>;        // 可序列化
  style?: Record<string, unknown>;         // 可序列化
  path?: string;                           // 可读路径，如 page.content.card[0]
  bindings?: Array<{ key: string; source: string; transform?: string }>;
  rootId?: string;                         // 当前语义树根 nodeId
  updatedAt?: string;                      // ISO8601
}
```

## 4. 序列化约束

1. `props/layout/style/bindings` 统一 JSON 字符串存储。
2. 存储前必须做可序列化校验，禁止函数/循环引用。
3. 单字段超长时可裁剪并写入 warning，不允许 silent fail。
4. 读取失败时返回结构化错误，不能直接吞掉异常。

## 5. 写入时机

### 5.1 Create
每个节点创建完成后立即写入 `uia.nodeId/uia.componentId/uia.version`，其余字段在节点渲染完成后补齐。

### 5.2 Edit
每条 patch 操作成功后局部更新相关 metadata，批量操作结束后做一次全树对账。

### 5.3 Swap/Move
`swap_variant/move_node` 后必须重写：

1. `uia.path`
2. `uia.updatedAt`
3. 受影响子树的 `rootId`（如有变更）

## 6. 读取与恢复流程

1. 用户选中节点。
2. 向上遍历父节点，找到最近存在 `uia.nodeId` 的合法节点。
3. 读取 `uia.*` 形成 `SelectionContext`。
4. 若需要全量上下文，按 `rootId` 或父链恢复语义子树快照。

```ts
interface SelectionContext {
  nodeId: string;
  componentId: string;
  rootId?: string;
  path?: string;
  props?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  style?: Record<string, unknown>;
  bindings?: Array<{ key: string; source: string; transform?: string }>;
}
```

## 7. 一致性对账

每次 create/edit 后执行最小对账：

1. Scene 映射中的 `nodeId` 在画布上都能找到对应节点。
2. 节点的 `componentId` 与 Registry 兼容。
3. `path` 与当前父子结构一致。
4. `version` 在支持范围内。

对账失败时：

1. 标记 warning 并上报 UI。
2. 必要时触发 `metadata repair`（重写可推导字段）。

## 8. 兼容策略

1. 读取时支持旧键（如 `component-id`、`params`）。
2. `normalizeMetadataLegacy` 将旧键转换为 `uia.*`。
3. 对不可恢复旧数据，返回 `METADATA_LEGACY_UNSUPPORTED`。

## 9. 错误码

```ts
type MetadataErrorCode =
  | "METADATA_MISSING_REQUIRED_FIELD"
  | "METADATA_INVALID_JSON"
  | "METADATA_UNSUPPORTED_VERSION"
  | "METADATA_NODE_ID_CONFLICT"
  | "METADATA_PATH_MISMATCH"
  | "METADATA_LEGACY_UNSUPPORTED"
  | "METADATA_WRITE_FAILED"
  | "METADATA_READ_FAILED";
```

## 10. API 建议

```ts
function writeNodeMeta(figmaNodeId: string, meta: NodeMetadataV1): void;
function readNodeMeta(figmaNodeId: string): NodeMetadataV1 | null;
function updateNodeMeta(figmaNodeId: string, patch: Partial<NodeMetadataV1>): void;
function normalizeLegacyMeta(raw: Record<string, string>): NodeMetadataV1 | null;
function buildSelectionContext(figmaNodeId: string): SelectionContext | null;
```

## 11. 安全与隐私

1. metadata 仅存结构与样式语义，不存敏感业务数据原文。
2. 若绑定源包含敏感标识，使用脱敏路径（如 `dataset.user.name`）。

## 12. 验收标准（Metadata DoD）

1. 任意 AI 节点可通过 `uia.nodeId` 逆向定位 SceneNode。
2. 连续 `create -> edit -> edit` 后 metadata 仍一致。
3. 至少 15 条单测覆盖读写、兼容、损坏恢复与错误码。
4. 旧版节点在一次编辑后可自动迁移为 `uia.*` 键空间。
