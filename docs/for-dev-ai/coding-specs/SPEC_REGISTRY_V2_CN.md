# Registry v2 规范（Spec Coding）

## 1. 文档目标
定义组件注册表的 v2 结构，使 Registry 成为以下能力的统一事实来源：

1. Agent 组件选择与参数生成。
2. Renderer 渲染映射与节点执行。
3. Patch 执行时的结构约束校验。
4. 组件扩展时的兼容迁移与版本控制。

## 2. 设计范围

### 2.1 In Scope
1. 组件元数据结构（定义层）。
2. 槽位（slot）与结构约束表达。
3. 能力声明（capabilities）与执行支持矩阵。
4. Registry 校验规则与错误码。
5. 与 v1 的映射与迁移策略。

### 2.2 Out of Scope
1. LLM Prompt 具体文案。
2. Figma API 具体渲染代码实现细节。
3. 业务数据源接入实现。

## 3. v1 现状与问题
当前 v1（`src/types.ts` + `src/registry.ts`）主要字段有：

1. `params`
2. `allowedChildren`
3. `family`
4. `agentPrompt/examples`

痛点：

1. `allowedChildren` 只能表达“可嵌套类型”，不能表达“嵌套在哪个语义位置”。
2. 缺少组件能力声明（是否支持 `swap_variant`、`bind_data`、`set_layout`）。
3. 缺少渲染映射声明，导致 Registry 与 Renderer 强耦合。
4. 缺少组件定义版本，无法做平滑迁移。
5. `params.default` 为 `any`，缺少可验证约束。

## 4. Registry v2 顶层结构

```ts
type RegistryVersion = "2.0";

interface ComponentRegistryV2 {
  version: RegistryVersion;
  components: Record<string, ComponentDefinitionV2>;
  meta?: {
    updatedAt?: string;         // ISO8601
    owner?: string;
    description?: string;
  };
}
```

## 5. ComponentDefinition v2

```ts
interface ComponentDefinitionV2 {
  id: string;                              // 必填，全局唯一
  name: string;                            // 必填
  category: "Layout" | "Basic" | "Form" | "Table" | "Data" | "Other";
  description: string;                     // 必填
  schemaVersion: string;                   // 组件定义版本，如 "2.0.0"

  family?: string;                         // 变体族，如 table-cell
  tags?: string[];                         // 检索标签

  prompts?: {
    description: string;                   // L1 选择提示（短）
    usage?: string;                        // L2 使用说明（长）
    examples?: string[];                   // JSON 片段示例
  };

  params: Record<string, ParamDefinitionV2>;
  slots?: Record<string, SlotDefinitionV2>;
  constraints?: ConstraintDefinitionV2[];
  capabilities?: CapabilityDefinitionV2;
  figmaBinding?: FigmaBindingV2;
  figmaPropertySnapshot?: FigmaPropertySnapshotV2; // 开发文档上下文字段（非运行时必需）
  colorVariableBindings?: Record<string, ColorVariableBindingV2>;
  migrations?: MigrationRuleV2[];
}
```

## 6. 参数定义（ParamDefinition v2）

```ts
type ParamType =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "select"
  | "enum"
  | "object"
  | "array";

interface ParamDefinitionV2 {
  type: ParamType;
  default: unknown;
  description: string;
  required?: boolean;                      // 默认 false

  enumValues?: string[];                   // type=select/enum
  min?: number;                            // number
  max?: number;                            // number
  step?: number;                           // number
  pattern?: string;                        // string 正则

  ui?: {
    control?: "input" | "textarea" | "switch" | "color" | "select";
    group?: string;                        // 属性面板分组
    order?: number;
  };
}
```

参数约束规则：

1. `default` 必须与 `type` 匹配。
2. `required=true` 时，`default` 仍建议存在（用于回填）。
3. `type=select/enum` 时，`enumValues` 必须非空，且 `default` 必须在列表中。

## 7. 槽位定义（SlotDefinition v2）

```ts
interface SlotDefinitionV2 {
  displayName?: string;                    // 如 Header / Body / Footer
  allowedComponents: string[];             // 允许的 componentId
  required?: boolean;                      // 默认 false
  minItems?: number;                       // 默认 0
  maxItems?: number;                       // 默认 Infinity
  ordered?: boolean;                       // 默认 true
}
```

槽位语义：

1. `slots` 用于命名语义结构（例如 `page.header`, `form.fields`）。
2. 若组件声明了 `slots`，建议优先通过 `slots` 建树，而不是 `children`。
3. `children` 仍可用于无语义容器，但不能突破 `constraints`。

## 8. 约束定义（ConstraintDefinition v2）

```ts
type ConstraintDefinitionV2 =
  | { type: "forbid_children"; components: string[] }
  | { type: "require_slot"; slot: string }
  | { type: "mutually_exclusive_params"; params: string[] }
  | { type: "requires_param_when"; whenParam: string; whenValue: unknown; requiredParam: string }
  | { type: "max_depth"; value: number }
  | { type: "custom"; key: string; payload?: Record<string, unknown> };
```

## 9. 能力定义（CapabilityDefinition v2）

```ts
interface CapabilityDefinitionV2 {
  allowChildren?: boolean;                 // 默认 true
  allowSwapVariant?: boolean;              // 默认 false
  allowSetProps?: boolean;                 // 默认 true
  allowSetLayout?: boolean;                // 默认 true
  allowSetStyle?: boolean;                 // 默认 true
  allowBindData?: boolean;                 // 默认 false
  allowRemove?: boolean;                   // 默认 true
}
```

用途：

1. Agent 可根据 capabilities 决定可用 patch 动作。
2. 执行器在 apply patch 时做前置校验，提前拒绝非法操作。

## 10. Figma 映射定义（FigmaBinding v2）

```ts
interface FigmaBindingV2 {
  nodeType?: "FRAME" | "TEXT" | "INSTANCE" | "GROUP";
  renderKey?: string;                      // 对应 renderer key
  preferredLayoutMode?: "HORIZONTAL" | "VERTICAL" | "NONE";
  styleMapper?: string;                    // 样式映射器标识
  propMapper?: string;                     // 参数映射器标识
}
```

原则：

1. Registry 只声明映射入口，不内嵌执行代码。
2. Renderer 通过 `renderKey/mapper` 动态路由，降低硬编码分支。

### 10.1 Figma 属性快照（开发上下文）

```ts
interface FigmaPropertySnapshotV2 {
  token?: string;                          // 例如 lib-data-display-status-tag
  componentKey: string;
  inspectedAt: string;                     // ISO8601
  source: "discover_component_props";
  properties: Array<{
    propertyName: string;
    displayName?: string;
    type: string;                          // VARIANT/BOOLEAN/TEXT/INSTANCE_SWAP...
    defaultValue?: string | boolean;
    options?: string[];                    // VARIANT/BOOLEAN 候选值
  }>;
}
```

约束：
1. 该字段用于“沟通上下文与维护”，不作为运行时必填。
2. 所有 `variantCriteria` 相关 spec，必须先基于 `discover_component_props` 的真实结果更新此快照。
3. 快照过期（组件库升级）时，应重新探测并更新时间。

推荐流程：
1. `read_specs(['figma-component'])` 先确认 token。
2. `discover_component_props` 探测目标组件属性。
3. 将输出摘要写入对应组件 spec 的 `figmaPropertySnapshot`。
4. 再编写/更新 `agentPrompt`、`examples`、`variantCriteria` 使用说明。

## 11. 颜色变量绑定定义（ColorVariableBinding v2）

```ts
interface ColorVariableBindingV2 {
  enabled: boolean;                       // false = 不尝试变量绑定
  token?: string;                         // 逻辑 token 名（推荐）
  variableRef?: string;                   // 首选 variable key/id
  keyCandidates?: string[];               // 备选 key
  idCandidates?: string[];                // 备选 id
  nameCandidates?: string[];              // 本地变量名候选
}
```

用途：

1. 由组件 spec 声明“是否用变量”和“用哪个变量”。
2. 渲染器按 `semanticKey -> binding` 决定绑定策略，失败回退 hex。
3. 替代在渲染代码里硬编码 token 规则。
4. 推荐在 spec 中只写 `token`，VariableID/Key 统一维护在主题 token 包：`src/theme.color-tokens.ts`。
5. Figma 实例组件同理，建议在 `figma-component` 参数使用 `componentToken`，由 `src/theme.component-tokens.ts` 统一映射到 `componentKey`（主组件库来源：`src/theme.component-library-tokens.ts`）。

## 12. 迁移规则（MigrationRule v2）

```ts
interface MigrationRuleV2 {
  fromVersion: string;
  toVersion: string;
  description?: string;
  renameParams?: Record<string, string>;   // old -> new
  dropParams?: string[];
  defaults?: Record<string, unknown>;      // 新增参数默认值
}
```

## 13. v1 到 v2 映射策略

1. `agentPrompt` -> `prompts.usage`
2. `description` -> `description` + `prompts.description`（按需复制）
3. `examples` -> `prompts.examples`
4. `allowedChildren` -> 若无命名槽位，映射到隐式槽位 `default`
5. `family` -> `family`（保持不变）
6. `params` -> `params`（补齐类型约束）

兼容期策略：

1. 优先读取 v2。
2. 若发现 v1，先走 `normalizeRegistryV1ToV2` 再进入主流程。
3. 禁止业务代码同时直接消费 v1 和 v2 两套字段。

## 14. 示例（Page + Table + Form）

```json
{
  "id": "page",
  "name": "页面容器",
  "category": "Layout",
  "description": "标准页面根容器",
  "schemaVersion": "2.0.0",
  "prompts": {
    "description": "用于生成完整页面",
    "usage": "包含 header/sidebar/content 等结构",
    "examples": [
      "{ \"componentId\": \"page\", \"props\": { \"title\": \"Dashboard\" } }"
    ]
  },
  "params": {
    "title": { "type": "string", "default": "页面标题", "description": "页面标题" }
  },
  "slots": {
    "header": {
      "displayName": "Header",
      "allowedComponents": ["layout", "text", "button"],
      "required": false,
      "minItems": 0,
      "maxItems": 3
    },
    "content": {
      "displayName": "Content",
      "allowedComponents": ["layout", "card", "table", "chart-bar", "input", "select"],
      "required": true,
      "minItems": 1
    }
  },
  "capabilities": {
    "allowChildren": true,
    "allowSwapVariant": false,
    "allowSetProps": true,
    "allowSetLayout": true,
    "allowSetStyle": true,
    "allowBindData": false
  },
  "figmaBinding": {
    "nodeType": "FRAME",
    "renderKey": "page",
    "preferredLayoutMode": "VERTICAL",
    "propMapper": "pagePropMapper",
    "styleMapper": "defaultStyleMapper"
  }
}
```

## 14. Registry 校验与错误码

```ts
type RegistryErrorCode =
  | "REGISTRY_INVALID_SCHEMA"
  | "REGISTRY_DUPLICATE_COMPONENT_ID"
  | "REGISTRY_UNKNOWN_ALLOWED_COMPONENT"
  | "REGISTRY_INVALID_PARAM_DEFAULT"
  | "REGISTRY_INVALID_SLOT_RULE"
  | "REGISTRY_INVALID_CONSTRAINT"
  | "REGISTRY_INVALID_CAPABILITY"
  | "REGISTRY_UNSUPPORTED_VERSION";
```

最小校验清单：

1. `id` 唯一。
2. 所有 `allowedComponents` 必须在 registry 中存在。
3. 参数默认值类型匹配。
4. `slots.required=true` 时 `minItems >= 1`。
5. `minItems <= maxItems`。
6. 迁移规则版本链可达。

## 15. 实施建议（代码层）

1. 新增 `src/registry.v2.types.ts`：只放类型。
2. 新增 `src/registry.v2.ts`：只放数据定义。
3. 新增 `src/registry.loader.ts`：负责 v1/v2 归一化与校验。
4. `App.tsx` 与 `code.ts` 不直接依赖裸 registry，统一走 loader 输出。

## 16. 验收标准（Registry DoD）

1. 新增组件时仅改 registry 数据，不改 Agent 主循环。
2. slot 违规输入能在执行前被拒绝并定位到字段路径。
3. 至少有 15 条 registry 校验单测，覆盖成功与失败路径。
4. v1 registry 可无损归一化到 v2（字段语义一致）。
