# Render Engine 规范（Spec Coding）

## 1. 目标
定义 `figmaUIagent` 的渲染执行层规范，使后端对 Scene 协议的执行具备：

1. 可预测：create/edit 都有固定执行语义。
2. 可恢复：失败时可回滚或最小化污染。
3. 可观测：每次执行都有结构化结果与错误定位。

## 2. 输入与输出契约

### 2.1 输入
渲染引擎只接受已通过 `normalize + validate` 的对象：

1. `AiSceneEnvelope(intent=create)`
2. `AiSceneEnvelope(intent=edit)`

### 2.2 输出

```ts
interface ApplyResult {
  ok: boolean;
  intent: "create" | "edit";
  rootNodeId?: string;                    // Figma root id
  nodeMap?: Record<string, string>;       // sceneNodeId -> figmaNodeId
  appliedOperations?: number;             // edit 成功操作数
  errors?: ApplyError[];
  warnings?: ApplyWarning[];
  durationMs: number;
}

interface ApplyError {
  code: string;
  message: string;
  path?: string;
  operationIndex?: number;
  recoverable: boolean;
}

interface ApplyWarning {
  code: string;
  message: string;
  path?: string;
}
```

## 3. 执行分层

渲染层必须分为 4 层，避免逻辑混杂：

1. `orchestrator`：路由 create/edit，控制事务。
2. `resolver`：基于 Registry 解析组件定义与映射器。
3. `executor`：执行具体节点创建或 patch 操作。
4. `metadata`：统一写入与同步 `uia.*`。

## 4. Create 执行规范

### 4.1 算法流程

1. 初始化上下文：
2. `sceneNodeId -> figmaNodeId` 映射表（空）。
3. 资源缓存（字体、组件实例、样式）。
4. 从 `scene.root` 深度优先渲染：
5. `resolve component` -> `create node` -> `apply props/layout/style`。
6. 写入元数据并登记映射。
7. 递归处理 `slots`，再处理 `children`。
8. 完成后执行一次 `postSync`（布局修正、metadata 对账）。

### 4.2 节点创建要求

1. 不允许无定义组件落地。
2. `slot` 节点插入顺序按定义顺序 + `index`。
3. 所有创建节点必须写入：
4. `uia.nodeId`
5. `uia.componentId`
6. `uia.version`
7. `uia.props`（可序列化）

### 4.3 性能与中断

1. 每 N 个节点 `yield` 一次，防止长任务阻塞。
2. 支持 cancel token，中断后返回 `ok=false` + 已执行进度。

## 5. Edit(Patch) 执行规范

## 5.1 通用规则

1. `operations` 必须按顺序执行。
2. 每条操作执行前，先做 `preCheck`：
3. 目标节点是否存在。
4. capability 是否允许。
5. slot/约束是否合法。
6. 执行后做 `postCheck`：
7. metadata 是否一致。
8. 结构是否出现环或非法层级。

### 5.2 操作语义（最低要求）

1. `add_node`
2. 在指定 parent 的 `slot` 或 `children` 插入新节点。
3. 插入成功后写 metadata 并更新映射。
4. `remove_node`
5. 仅可删除非 root 节点。
6. 删除后清理映射与缓存引用。
7. `move_node`
8. 防止移动到后代形成环。
9. 保持目标容器布局合法。
10. `set_props`
11. `merge=true` 走浅合并；`merge=false` 覆盖。
12. 仅更新 Registry 中声明过的参数。
13. `swap_variant`
14. 保留可迁移参数（按 migration rule）。
15. 渲染器负责替换节点并保留布局锚点。
16. `set_layout/set_style`
17. 只改对应域，不隐式覆盖 props。
18. `bind_data`
19. 更新 `bindings`，并在 metadata 中保留绑定快照。

## 6. 事务与回滚策略

### 6.1 Create
建议采用“临时容器 + 成功后提交”：

1. 所有新节点先挂到临时容器。
2. 全部成功后再替换/插入目标位置。
3. 失败则移除临时容器，避免半成品污染。

### 6.2 Edit
支持两种模式：

1. `strict`：任意不可恢复错误直接停止，回滚本次已执行操作。
2. `best_effort`：可恢复错误记录后继续，最终返回 errors 列表。

回滚最小要求：

1. `add_node` 回滚为删除新增节点。
2. `remove_node` 回滚需依赖快照（删除前克隆）。
3. `set_props/layout/style` 回滚依赖旧值快照。

## 7. Metadata 同步规范

统一写入字段：

1. `uia.nodeId`
2. `uia.componentId`
3. `uia.variant`
4. `uia.version`
5. `uia.props`
6. `uia.layout`
7. `uia.style`
8. `uia.path`

同步策略：

1. 每条操作后做局部同步。
2. 批量操作结束后做全局一致性对账。

## 8. 缓存策略

建议缓存：

1. `componentId -> registryDef`
2. `fontKey -> loaded`
3. `styleRef -> styleNode`
4. `sceneNodeId -> figmaNodeId`

缓存失效条件：

1. 节点被 remove。
2. variant swap 导致 nodeType 变化。
3. registry 版本切换。

## 9. 错误分级

1. `fatal`：结构损坏或事务不可继续，立即停止。
2. `recoverable`：单条操作失败，可继续执行后续操作。
3. `warning`：自动降级处理（如未知样式引用使用 fallback）。

## 10. 推荐目录结构

```txt
src/
  engine/
    applyEnvelope.ts
    applyCreate.ts
    applyPatch.ts
    operationExecutor.ts
    metadataSync.ts
    registryResolver.ts
    transaction.ts
    types.ts
```

## 11. 伪代码示例

### 11.1 applyEnvelope

```ts
export async function applyEnvelope(env: AiSceneEnvelope): Promise<ApplyResult> {
  const start = Date.now();
  if (env.intent === "create") return applyCreate(env, start);
  return applyPatch(env, start);
}
```

### 11.2 applyPatch 主循环

```ts
for (let i = 0; i < patch.operations.length; i++) {
  const op = patch.operations[i];
  const pre = preCheck(op, ctx);
  if (!pre.ok) {
    collectError(pre.error, i);
    if (!pre.error.recoverable || mode === "strict") break;
    continue;
  }

  const exec = await executeOperation(op, ctx);
  if (!exec.ok) {
    collectError(exec.error, i);
    if (!exec.error.recoverable || mode === "strict") {
      await rollback(ctx);
      break;
    }
    continue;
  }

  await syncMetadataFor(op, ctx);
}
```

## 12. 测试要求（Render Engine DoD）

1. create 深层嵌套（>=5 层）可稳定渲染。
2. patch 连续 20 条操作执行后，metadata 与结构一致。
3. strict 模式出现 fatal 错误时，回滚后无新增脏节点。
4. best_effort 模式下，错误可定位到 `operationIndex`。
5. 至少 25 条单测，覆盖 create/edit/rollback/cancel。

## 13. 色彩变量绑定规范（组件 Spec 驱动）

### 13.1 目标
1. 颜色绑定策略由组件 spec 决定，不允许在渲染代码里硬编码“哪些组件用变量”。
2. 仅在变量不可用时，回退到 hex（保证可渲染）。

### 13.2 函数真源（当前实现）
1. `getColorVariableBindingIndex`：从 `COMPONENT_REGISTRY[*].variableBindings` 构建索引。
2. `resolveColorVariable`：按 spec 提供的 `enabled/token/variableRef/keyCandidates/idCandidates/nameCandidates` 解析变量。
3. `applyColorVariable`：给 `fills` 绑定变量；失败时回退颜色。
4. `applyStrokeColorVariable`：给 `strokes` 绑定变量；失败时回退颜色。
5. 代码锚点：
[code.ts:145](src/code.ts:145)
[code.ts:231](src/code.ts:231)
[code.ts:397](src/code.ts:397)
[code.ts:409](src/code.ts:409)

### 13.3 Spec 字段
每个组件可在 spec 中声明：
```ts
variableBindings?: {
  [semanticKey: string]: {
    enabled: boolean;
    token?: string;       // 推荐：逻辑 token 名，映射由主题包统一管理
    variableRef?: string;
    keyCandidates?: string[];
    idCandidates?: string[];
    nameCandidates?: string[];
  };
}

typographyBindings?: {
  [semanticKey: string]: {
    enabled: boolean;
    token?: string;       // 推荐：逻辑字体 token 名
    textStyleRef?: string;
    keyCandidates?: string[];
    idCandidates?: string[];
    nameCandidates?: string[];
  };
}
```

主题 token 包位置：`src/theme.color-tokens.ts`（集中维护 VariableID/Key，可批量替换主题）。
采用两层映射：
1. 基础 token（如 `text-1`、`link-6`）维护真实 VariableID/Key。
2. 语义 token（如 `table.cell.text`）只声明映射到基础 token。

已确认的 VariableID（已同步到 `BASE_COLOR_TOKEN_PACK`）：
1. `text-1` -> `VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560`
2. `text-2` -> `VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562`
3. `color-bg-4` -> `VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586`
4. `primary-6`/`link-6` -> `VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300`
5. `danger-6` -> `VariableID:f60b03f9d134cb4ac3f68fb23b1fda9ba1304745/174345:672`

说明：`color-bg-1/2/3`、`color-border-1/2`、`text-3` 默认配置里存在 token，但 `variableId` 为空。当前渲染层会优先匹配已有变量；若找不到，会自动创建本地 token 变量再绑定。

字体 token 包位置：`src/theme.typography-tokens.ts`（集中维护 TextStyle Key/ID，可批量替换主题排版映射）。
已确认的 TextStyle：
1. `text-body` -> `S:ac8ef12de2cc499e51922d6b5239c26b3645a05a,131052:2`
2. `text-header` -> `S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3`

组件 key token 包位置：`src/theme.component-tokens.ts`（统一聚合表格 + 主组件库）。
主组件库来源：`src/theme.component-library-tokens.ts`（由 `Figma组件库词汇表_ComponentSets.json` 过滤生成）。
采用两层映射：
1. 基础 token（如 `table-header-main`）维护真实 `componentKey`。
2. 语义 token（如 `table.header.main`）映射到基础 token。

`figma-component` 运行时参数约定：
1. 优先 `componentToken`（推荐）。
2. 可直接传 `componentKey`（兼容）。
3. 两者并存时，以 `componentKey` 为准。
4. Agent 调用前应先 `read_specs(['figma-component'])`，读取 `ComponentTokenCatalog` 后再出参。
5. 若需要 `variantCriteria`，先调用 `discover_component_props` 获取真实 `componentPropertyDefinitions`，未知时只创建组件本体不猜字段。
6. 全量反向探测可用 `discover_component_props` + `{ all: true }`；按需探测使用 `{ tokens: [...] }`。
7. Figma 资源导入 API 必须按类型区分：
   - Component Set：`figma.importComponentSetByKeyAsync(key)`（优先）
   - Component：`figma.importComponentByKeyAsync(key)`（回退）
   - Style：`figma.importStyleByKeyAsync(key)`
   - Variable：`figma.variables.importVariableByKeyAsync(key)`

### 13.4 执行要求
1. `enabled=false`：跳过变量绑定，直接使用原始颜色值。
2. `enabled=true`：优先变量绑定，失败时回退 hex。
3. 同一 `semanticKey` 可在多个组件重复声明，渲染层按索引合并候选。
4. 新增组件若需要变量绑定，必须先补 spec 的 `variableBindings`，再接渲染调用。

### 13.5 高保真复刻优先级
1. 当目标是复刻设计系统现成组件时，渲染器优先级必须是：
   导入原始组件变体 > detach 后最小编辑 > inspect 数据驱动自绘 > 语义 token 近似回退。
2. 能导入原始组件时，不应优先手工重建背景、边框、effect、effectStyle。
3. `input/select/button/checkbox/radio/form-field` 一类视觉敏感组件，默认按“高保真复刻”处理。
4. 导入原始组件后，允许的最小编辑包括：
   文案替换、宽高调整、前后缀文字替换、少量实例属性开关。
5. 下列属性应优先继承原件：
   `fills`、`strokes`、`boundVariables`、`effectStyle`、`effects`、圆角、padding、itemSpacing。

### 13.6 自绘回退规则
1. 只有原始组件无法导入、或明确要求改造成独立自定义结构时，才允许自绘。
2. 自绘时，样式真源优先级必须是：
   `inspect_component_structure` 中的原始字段 > spec 中的 `variableBindings/typographyBindings` > 最终 hex fallback。
3. 若 inspect 结果提供了 `effectStyle`，应优先应用 `effectStyleId`，不要仅用单层 `DROP_SHADOW` 近似。
4. 若 inspect 结果提供了 `boundVariables`，应优先按原始变量引用绑定，不要只按语义 token 推断。
5. effect 颜色绑定禁止自动创建本地 token 变量来伪装原始变量。
6. 读不到真实变量时，可以回退 raw color，但应视为“近似实现”，不是高保真复刻。
7. 对 spread 型描边阴影，若 Figma 依赖 visible fill + `clipsContent=true` 才能显示，渲染器必须保留该前提条件。

### 13.7 当前已落地语义键（示例）
1. 表格：`table-cell-bg-key`、`table-header-bg-key`、`table-border-key`、`table-cell-text-key`、`table-header-text-key`。
2. 文本：`text-primary-key`、`text-custom-key`、`text-secondary-key`。
3. 按钮：`btn-primary-bg`、`btn-secondary-bg`、`btn-primary-text`、`btn-secondary-text`、`btn-outline-text`。
4. 输入/下拉：`input-*`、`select-*`。
5. 图表/卡片：`chart-*`、`card-*`。
