# Figma AI 助手实现思路总览

## 文档定位
本文件只负责描述项目的高层目标、架构边界和核心原则，不承载具体协议与实现细节。

## 项目目标
将当前可用的“表格生成能力”升级为“通用页面生成能力”，支持：

1. 从自然语言生成页面级组件树（页面、区块、表单、图表、表格）。
2. 对已生成结构进行增量编辑，而不是每次整页重建。
3. 支持复杂嵌套关系与组件变体切换，保持可扩展和可维护。

## 高层架构
- 前端（React UI）：对话交互、Agent 循环、Prompt 装配、属性编辑器。
- 后端（Figma Plugin Sandbox）：节点渲染、节点查询、增量修改、元数据同步。
- AI 层（LLM）：需求理解、结构规划、输出结构化协议（create/edit）。

## 核心原则
1. 协议优先：先定义可验证的数据协议，再实现渲染和编辑执行器。
2. 注册表驱动：组件能力由 Registry 声明，Agent 与 Renderer 都依赖同一份定义。
3. 增量优先：优先用 patch 操作编辑现有结构，必要时才做全量替换。
4. 可回放：所有关键节点保留稳定元数据，支持上下文恢复与二次编辑。
5. 兼容演进：协议版本化，允许旧格式输入被归一化后继续执行。

## 文档导航
先看文档关系边界（避免重复阅读）：
[DOCS_LOGIC_CN.md](DOCS_LOGIC_CN.md)

按角色进入：
1. AI 运行主规范：
[AI_RUNTIME_SPEC_CODING_CN.md](../../for-runtime-ai/AI_RUNTIME_SPEC_CODING_CN.md)
2. 设计师 Spec 写作：
[DESIGNER_SPEC_WORKFLOW_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/designer/DESIGNER_SPEC_WORKFLOW_CN.md)
3. 测试执行：
[MANUAL_TEST_FLOW_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/testing/MANUAL_TEST_FLOW_CN.md)
4. 细节规范集合入口：
[docs/ai/README_CN.md](../../for-dev-ai/README_CN.md)

## 当前落地状态（2026-03-03）
已完成第一版“协议执行骨架”代码落地（不破坏现有主流程）：

1. Scene 协议类型与校验：
[src/protocol/scene.ts](/Users/bytedance/Desktop/figmaUIagent/src/protocol/scene.ts)
2. Registry v2 类型与加载器：
[src/registry.v2.types.ts](/Users/bytedance/Desktop/figmaUIagent/src/registry.v2.types.ts)
[src/registry.loader.ts](/Users/bytedance/Desktop/figmaUIagent/src/registry.loader.ts)
3. Metadata 统一读写（`uia.*` + legacy 兼容）：
[src/metadata.ts](/Users/bytedance/Desktop/figmaUIagent/src/metadata.ts)
4. Render Engine 最小执行链路：
[src/engine/types.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/types.ts)
[src/engine/registryResolver.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/registryResolver.ts)
[src/engine/metadataSync.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/metadataSync.ts)
[src/engine/transaction.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/transaction.ts)
[src/engine/renderSceneNode.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/renderSceneNode.ts)
[src/engine/operationExecutor.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/operationExecutor.ts)
[src/engine/applyCreate.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/applyCreate.ts)
[src/engine/applyPatch.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/applyPatch.ts)
[src/engine/applyEnvelope.ts](/Users/bytedance/Desktop/figmaUIagent/src/engine/applyEnvelope.ts)
5. AI Spec-as-Code 校验与烟测生成（不依赖低代码）：
[src/specAuthoring.ts](/Users/bytedance/Desktop/figmaUIagent/src/specAuthoring.ts)
[SPEC_AUTHORING_AI_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/designer/SPEC_AUTHORING_AI_CN.md)
6. 表格专用动作落地（减少冗余 JSON）：
- Agent Prompt 强制“新建表格优先 `draw_table/draw_tabl`”。
- `read_specs(table*)` 回传 ActionHint。
- `apply_scene` 收到 `table` create 时自动重定向到 `draw_table` 一次性创建。
- `create_node` 收到 `table` 冗长子树时自动重定向到 `draw_table` 一次性创建。
7. Agent 计划队列（外部状态机）已接入 UI 循环：
- 新增 `set_plan / plan_next / update_plan` 动作。
- 新增 `execute_task / run_task`：按 task.type 调用内置执行器（`create_shell/expand_table_block/expand_chart_block/expand_form_block/expand_tabs_block`）。
- 5 种 block 执行器统一解析入口：优先 `payload.block.container/header/body/footer`，同时兼容旧字段。
- `expand_table_block` 执行器支持区块化输入：`header.tabs/actions + body.filters.items + body.table + footer.pagination`。
- `expand_chart_block` 执行器支持区块化输入：`header.tabs/actions + body.charts[] + footer.notes`。
- `expand_form_block` 执行器支持区块化输入：`body.rows[][]/body.fields[] + footer.actions`。
- `expand_tabs_block` 执行器支持区块化输入：`body.tabs[] + header.actions + footer.actions/notes`（不再硬编码固定 tabs）。
- 每轮把 Plan 快照作为系统上下文注入，避免模型遗忘待办。
- 支持 `taskId` 绑定执行动作，自动回写 `in_progress/done/failed`。
- `execute_task` 支持父节点自动解析（`payload.parentId -> task.targetNodeId -> dependsOn.targetNodeId -> shell`），实现定向下钻。
- 对已完成任务默认跳过（防重复生成），可通过 `payload.force=true` 强制重跑。
- `finish` 在存在未完成任务时会被阻断。
- Chat 面板新增 Plan 可视化与人工接管：显示任务计数、Next task、任务列表，并支持手动改状态、执行下一步与清空计划。
- 复杂请求支持 Auto Plan：系统可自动初始化计划队列（外壳任务 + 区块下钻任务）。
- 任务失败支持自动阈值阻断：失败重试超限后自动标记 `blocked`。
8. 组件 Spec 驱动的色彩 Token 绑定（Figma Variable 优先）已落地：
- 上色核心函数：`applyColorVariable`（fills）与 `applyStrokeColorVariable`（strokes）。
- 变量解析函数：`resolveColorVariable`（支持 key/id/name 候选 + 缓存 + 回退）。
- 绑定索引函数：`getColorVariableBindingIndex`（从 `COMPONENT_REGISTRY[*].variableBindings` 构建）。
- 代码锚点：
[src/code.ts:145](/Users/bytedance/Desktop/figmaUIagent/src/code.ts:145)
[src/code.ts:231](/Users/bytedance/Desktop/figmaUIagent/src/code.ts:231)
[src/code.ts:397](/Users/bytedance/Desktop/figmaUIagent/src/code.ts:397)
[src/code.ts:409](/Users/bytedance/Desktop/figmaUIagent/src/code.ts:409)
- 组件 spec 新增字段：`variableBindings`（声明是否绑定变量 + token/variableRef/candidates）。
- 组件 spec 新增字段：`typographyBindings`（声明是否绑定 TextStyle + token/textStyleRef/candidates）。
- 主题色彩 token 包：`src/theme.color-tokens.ts`（集中维护 VariableID/Key，支持批量替换主题映射）。
- 主题排版 token 包：`src/theme.typography-tokens.ts`（集中维护 TextStyle Key/ID，支持批量替换排版主题映射）。
- 主题组件 token 包：`src/theme.component-tokens.ts`（集中登记表格与组件库的 Figma component key，支持用 `componentToken` 代替硬编码 key）。
- 组件库主组件清单：`src/theme.component-library-tokens.ts`（由 `Figma组件库词汇表_ComponentSets.json` 过滤生成，已剔除 `_components/.*/Panel_*` 等内部/辅助组件）。
- 新增反向探测动作：`discover_component_props`（按 `componentToken/componentKey` 读取 Figma `componentPropertyDefinitions` 与变体选项，支持 `{ all: true }` 批量扫描；失败时回退“只摆组件本体”策略，禁止瞎猜字段）。
- 渲染层变体匹配改为严格模式：`variantCriteria` 出现未知字段时不再静默忽略，直接回退默认变体，避免“猜字段”产生错误命中。
- 组件导入策略升级：优先 `importComponentSetByKeyAsync`（组件集），再回退 `importComponentByKeyAsync`（单组件）；样式/变量继续分别使用 `importStyleByKeyAsync` 与 `importVariableByKeyAsync`。
- 已对齐的 VariableID：`text-1`、`text-2`、`color-bg-4`、`primary-6/link-6`、`danger-6`。
- `color-bg-1/2/3`、`color-border-1/2`、`text-3` 默认 `variableId` 为空；当前实现会在未命中时自动创建本地 token 变量并绑定。

下一阶段建议：
1. 在 `src/code.ts` 的 Agent 执行路径接入 `applyEnvelope`（已完成，新增 `apply-envelope` 消息与 `apply-result` 回传）。
2. 让 UI 侧输出从 `create_node` 工具调用切换到 `AiSceneEnvelope`（已完成第一步：支持 `apply_scene/apply_envelope` 动作，保留 `create_node` 兼容）。
3. 增加协议与执行器单测（优先 `add_node/set_props/remove_node`）。
4. 建立“AI 产出 Spec -> 自动校验 -> 自动回喂修复”流水线。

## 运行与排障经验
1. 插件环境加载失败（An error occurred while loading the plugin environment）：
   - 原因：执行 `npm run build:ui` 时清空了 `dist/`，导致 `dist/code.js` 被删除，Figma 插件入口丢失。
   - 修复：在 `vite.config.ts` 中设置 `build.emptyOutDir=false`，并确保 `build:main` 生成 `dist/code.js` 后再加载插件。
