# Scene 协议规范（Spec Coding）

## 1. 文档目标
定义 `figmaUIagent` 的统一场景协议（Scene Protocol），作为 LLM 输出、前端解析、后端执行三方的唯一契约。

本规范用于替代“自由 JSON + 临时解析”的方式，保证以下能力：

1. 全量创建（create）可验证。
2. 增量编辑（edit/patch）可回放。
3. 协议版本可演进并兼容旧格式。

说明：`Scene Protocol` 是通用协议。对于“新建表格”这类高频独立组件，优先使用专用动作 `draw_table`（compact payload），而不是构造冗长 `table` 子树。

## 2. 术语

1. `Scene`: 页面级语义树，描述完整结构。
2. `SceneNode`: 语义节点，映射到一个组件实例。
3. `Patch`: 基于节点 ID 的增量操作集合。
4. `nodeId`: 协议级稳定 ID，不等于 Figma 原生节点 ID。
5. `slot`: 命名槽位（如 `header`、`body`、`footer`）。

## 3. 协议总览

```ts
type SceneProtocolVersion = "1.0";

type AiSceneEnvelope =
  | {
      version: SceneProtocolVersion;
      intent: "create";
      scene: SceneSchema;
      requestId?: string;
      meta?: EnvelopeMeta;
    }
  | {
      version: SceneProtocolVersion;
      intent: "edit";
      patch: ScenePatch;
      requestId?: string;
      target?: { rootNodeId?: string };
      meta?: EnvelopeMeta;
    };
```

## 4. 数据模型

### 4.1 EnvelopeMeta

```ts
interface EnvelopeMeta {
  locale?: string;                // 如 zh-CN
  theme?: string;                 // 如 light/dark
  source?: "user" | "agent";
  generatedAt?: string;           // ISO8601
}
```

### 4.2 SceneSchema

```ts
interface SceneSchema {
  root: SceneNode;
  variables?: VariableBinding[];
  constraints?: SceneConstraint[];
}
```

### 4.3 SceneNode

```ts
interface SceneNode {
  nodeId: string;                           // 必填，协议内唯一
  componentId: string;                      // 必填，必须存在于 Registry
  variant?: string;                         // 可选，组件变体
  props: Record<string, unknown>;           // 必填，可为空对象
  layout?: LayoutSpec;                      // 可选
  style?: StyleSpec;                        // 可选
  slots?: Record<string, SceneNode[]>;      // 可选，命名槽位子树
  children?: SceneNode[];                   // 可选，普通子树
  bindings?: DataBinding[];                 // 可选，数据绑定
  meta?: {
    role?: string;                          // 如 section/title/control
    path?: string;                          // 如 page.main.table[0]
    lock?: boolean;                         // 渲染后可锁定
  };
}
```

### 4.4 LayoutSpec

```ts
interface LayoutSpec {
  mode?: "horizontal" | "vertical" | "none";
  width?: { type: "fixed"; value: number } | { type: "fill" } | { type: "hug" };
  height?: { type: "fixed"; value: number } | { type: "fill" } | { type: "hug" };
  align?: "start" | "center" | "end" | "stretch";
  gap?: number;
  padding?: { top?: number; right?: number; bottom?: number; left?: number };
}
```

### 4.5 StyleSpec

```ts
interface StyleSpec {
  fill?: string;                  // hex/rgb/tokenRef
  textColor?: string;
  borderColor?: string;
  borderWidth?: number;
  cornerRadius?: number;
  effect?: "none" | "shadow";
  textStyleRef?: string;
  paintStyleRef?: string;
}
```

### 4.6 DataBinding / VariableBinding

```ts
interface DataBinding {
  key: string;                    // props 中的目标字段
  source: string;                 // 数据来源路径，如 table.rows[0].name
  transform?: string;             // 可选转换标记
}

interface VariableBinding {
  id: string;
  target: "color" | "typography" | "space" | "radius";
  ref: string;                    // Figma variable/style id
}
```

### 4.7 SceneConstraint

```ts
interface SceneConstraint {
  type: "maxDepth" | "maxNodeCount";
  value: number;
}
```

## 5. Patch 模型

```ts
interface ScenePatch {
  baseVersion?: string;           // 可选，做冲突检测
  operations: SceneOperation[];   // 必填，至少 1 条
}
```

```ts
type SceneOperation =
  | {
      op: "add_node";
      parentId: string;
      node: SceneNode;
      index?: number;
      slot?: string;
    }
  | {
      op: "remove_node";
      nodeId: string;
    }
  | {
      op: "move_node";
      nodeId: string;
      newParentId: string;
      index?: number;
      slot?: string;
    }
  | {
      op: "set_props";
      nodeId: string;
      props: Record<string, unknown>;
      merge?: boolean;            // 默认 true
    }
  | {
      op: "set_layout";
      nodeId: string;
      layout: LayoutSpec;
    }
  | {
      op: "set_style";
      nodeId: string;
      style: StyleSpec;
    }
  | {
      op: "swap_variant";
      nodeId: string;
      componentId: string;
      variant?: string;
      carryProps?: boolean;       // 默认 true
    }
  | {
      op: "bind_data";
      nodeId: string;
      bindings: DataBinding[];
      replace?: boolean;          // 默认 false（追加）
    };
```

## 6. 语义约束（必须）

1. `version` 必须存在，当前仅允许 `"1.0"`。
2. `intent=create` 必须包含 `scene`，且不得包含 `patch`。
3. `intent=edit` 必须包含 `patch`，且 `operations.length >= 1`。
4. `nodeId` 在同一 `SceneSchema` 中必须唯一。
5. 同一 `SceneNode` 中 `slots` 与 `children` 可并存，但执行顺序固定为 `slots` 后 `children`。
6. `componentId` 必须在 Registry 中存在，否则直接拒绝执行。
7. `slot` 存在时，必须是目标组件声明过的合法槽位。
8. `add_node` 的 `node.nodeId` 不能与现有节点冲突。
9. `remove_node` 不允许删除当前 `root`（除非通过 full create 替换）。
10. `move_node` 不允许将节点移动到其后代下（禁止成环）。

## 7. 执行语义

### 7.1 Create 执行

1. 校验 `scene` 结构。
2. 自顶向下渲染 `root`。
3. 每个节点渲染后写入元数据（`uia.nodeId` 等）。
4. 渲染完成后回传 `rootNodeId` 与节点映射表（可选）。

### 7.2 Edit 执行

1. 定位目标语义树（选区 root 或 `target.rootNodeId`）。
2. 顺序执行 `operations`（默认串行）。
3. 单条操作失败且 `recoverable=true` 时，记录错误并继续后续操作。
4. 单条操作失败且 `recoverable=false` 时，立即停止并返回失败。
5. 全部执行结束后统一做一次 metadata sync。

## 8. 错误模型

```ts
interface SceneProtocolError {
  code:
    | "INVALID_ENVELOPE"
    | "UNSUPPORTED_VERSION"
    | "UNKNOWN_COMPONENT"
    | "INVALID_SLOT"
    | "NODE_NOT_FOUND"
    | "NODE_ID_CONFLICT"
    | "CYCLE_DETECTED"
    | "INVALID_OPERATION"
    | "APPLY_FAILED";
  message: string;
  path?: string;                  // JSON 路径，例如 patch.operations[2].slot
  operationIndex?: number;        // 针对 edit patch
  recoverable: boolean;
}
```

返回原则：

1. 结构错误：`INVALID_ENVELOPE`，`recoverable=false`。
2. 单条 patch 参数错误：`INVALID_OPERATION`，通常 `recoverable=true`。
3. 运行时异常：`APPLY_FAILED`，按上下文决定是否可恢复。

## 9. 兼容策略

1. 入口先做 `extract -> normalize`，将旧格式转换为 `AiSceneEnvelope@1.0`。
2. normalize 仅做“结构归一化”，不做业务猜测。
3. 无法可靠转换时直接报错，不隐式改写用户意图。

## 10. 示例

### 10.1 Create 示例

```json
{
  "version": "1.0",
  "intent": "create",
  "scene": {
    "root": {
      "nodeId": "page_root",
      "componentId": "page",
      "props": { "title": "运营看板" },
      "children": [
        {
          "nodeId": "card_1",
          "componentId": "card",
          "props": { "title": "核心指标", "width": 420 },
          "children": [
            {
              "nodeId": "chart_1",
              "componentId": "figma-component",
              "props": { "componentToken": "lib-data-display-toplist", "fallbackName": "近7天趋势", "height": 220 }
            }
          ]
        }
      ]
    }
  }
}
```

### 10.2 Edit 示例

```json
{
  "version": "1.0",
  "intent": "edit",
  "patch": {
    "operations": [
      {
        "op": "set_props",
        "nodeId": "card_1",
        "props": { "title": "核心指标（更新）" },
        "merge": true
      },
      {
        "op": "add_node",
        "parentId": "page_root",
        "index": 1,
        "node": {
          "nodeId": "table_1",
          "componentId": "table",
          "props": { "columnCount": 4, "rowCount": 6 }
        }
      }
    ]
  }
}
```

## 11. 与代码层的映射要求

1. UI 与 Sandbox 必须共享同一份协议类型定义。
2. 解析层必须独立为 `parser/normalize/validate`，禁止散落在 UI 事件逻辑里。
3. 执行层必须独立为 `applyCreate(scene)` 与 `applyPatch(patch)`。
4. metadata 写入统一走 `writeNodeMeta(node, sceneNode)`。

## 12. 验收标准（Protocol DoD）

1. 能正确拒绝非法 envelope（含错误码和路径）。
2. `create -> edit -> edit` 连续三次执行后，`nodeId` 仍可稳定定位。
3. 任意 `UNKNOWN_COMPONENT` 错误不会造成半成品脏状态扩散。
4. 至少覆盖 20 条协议单测（含失败用例）。
