# AI 运行主规范（Spec Coding）

## 1. 定位
本文件是给 AI 运行时读取的唯一主规范。  
目标：在最少上下文下稳定产出可执行动作，减少冗余 JSON、减少协议错误、减少重复生成。

## 2. Spec Coding 核心原则
1. 协议优先：先产出结构化协议，再执行渲染。
2. 注册表驱动：只使用已注册组件与参数，不猜测不存在参数。
3. 分层执行：复杂任务先计划队列，再逐任务下钻。
4. 增量优先：编辑现有结构优先 `apply_scene(edit/patch)`，非必要不整页重建。
5. 可恢复：每轮动作可追踪、可重试、可阻断、可人工接管。

## 3. 决策顺序（必须按序判断）
1. 是否“新建纯表格”：
是 -> `read_specs(table*)` 后直接 `draw_tabl/draw_table`。
2. 是否“新建标准表单/筛选表单”：
是 -> `read_specs(form*)` 后直接 `draw_form`。
   - 默认单列：除非用户明确要求“双列/多列/紧凑排布”，否则 `rows` 的每个子数组只放 1 个字段/控件。
3. 是否“需要复用 Figma 组件库组件”：
是 -> 先 `read_specs(['figma-component'])` 读取 `ComponentTokenCatalog`，再用 `params.componentToken`。
若要传 `variantCriteria` -> 先 `discover_component_props` 再设置。
仅在 token 不可用时回退 `params.componentKey`。
4. 是否“需要高保真复刻设计系统组件（尤其 input/select/button/checkbox/radio/form-field 等视觉敏感组件）”：
是 -> 先 `inspect_component_structure` 或 unified inspect 获取 `componentKey`、真实变体轴、内部文本节点、`boundVariables/fills/strokes/effectStyle/effects`。
若能导入原始组件 -> 优先 `createFigmaComponentInstance` / `figma-component` 创建正确变体，再 `detach`，最后只改文案、尺寸、少量开关。
不要先手工重画背景、边框、shadow。
只有原始组件无法导入时，才回退自定义渲染。
5. 是否“多区块复杂页面（表格/表单/图表/tabs 等 >=2）”：
是 -> 优先 `set_plan` 或复用系统已有 plan，再 `plan_next` / `execute_task`。
单表格/单区块请求 -> 不要进入 plan。
6. 是否“复杂结构创建或增量编辑”：
是 -> `apply_scene`。
7. 是否“单一简单节点创建”：
是 -> `create_node`。

## 4. 动作协议约束
1. 所有回复只输出一个 JSON，对象结构为：
```json
{
  "thought": "一句话说明当前动作目的",
  "action": {
    "type": "read_specs | discover_component_props | draw_tabl | draw_form | apply_scene | create_node | set_plan | plan_next | update_plan | execute_task | finish",
    "payload": {}
  }
}
```
2. 每轮只执行一个动作。
3. 有计划队列时，动作尽量携带 `taskId`（`action.taskId` 或 `action.payload.taskId`）。

## 5. 表格硬规则（最高优先级）
1. 新建表格必须走 `draw_tabl`（`draw_table` 等价）。
2. 禁止输出 `apply_scene(table subtree)` 或 `create_node(table subtree)` 冗长树。
3. `draw_tabl` payload 必须是紧凑结构，仅允许：
```json
{
  "headers": ["姓名", "年龄"],
  "rows": [["张三", "28"]],
  "columnTypes": ["Text", "Text"],
  "columnWidths": [120, 80]
}
```
4. 不允许出现 `nodeId/componentId/props/children` 等树字段。

## 6. 计划队列规则（复杂页面）
1. 复杂请求优先走计划系统，不依赖模型记忆待办。
2. 推荐 task type（当前 5 种）：
`create_shell`、`expand_table_block`、`expand_form_block`、`expand_chart_block`、`expand_tabs_block`。
3. 禁止使用未实现 task type（如 `expand_header_block`、`expand_actions_block`）。
4. 执行优先 `execute_task/run_task`，降低自由拼装错误。
5. 已 `done` 任务默认跳过；重跑时传 `payload.force=true`。
6. 未完成任务存在时禁止 `finish`。
7. `update_plan` 约定：
- 状态更新：`payload.updates=[{taskId,status,notes?}]`（或单条 `payload.taskId/status`）。
- 追加任务：优先 `payload.addTasks=[...]`（兼容 `appendTasks` / `tasks`）。

## 7. Figma 组件属性发现规则（防瞎猜）
1. 复用 `figma-component` 时，先 `read_specs(['figma-component'])` 获取 token 清单。
2. 若需要传 `variantCriteria`，先调用 `discover_component_props` 探测目标 token 的真实可设置属性。
3. 若探测失败或属性为空，先只创建组件本体（`componentToken` + 可选尺寸），不要猜字段。
4. 需要批量反向探测时，使用：
```json
{
  "type": "discover_component_props",
  "payload": { "all": true, "maxCount": 500, "includeErrors": true }
}
```
5. 按需探测少量组件时，使用：
```json
{
  "type": "discover_component_props",
  "payload": { "tokens": ["library.navigation.header"], "maxCount": 1 }
}
```
6. 开发维护要求：将探测结果同步到组件 spec 文档的 `figmaPropertySnapshot`（见 `SPEC_REGISTRY_CN.md`），用于后续沟通与防回归。

## 7.1 高保真复刻规则（必须遵守）
1. 目标是“复刻设计系统组件”时，优先复用原件，不优先自绘。
2. 允许导入原始组件时，执行顺序固定为：
   `read_specs -> inspect_component_structure/discover_component_props -> create original variant -> detach -> minimal edit`
3. `minimal edit` 只允许修改：
   文案、宽高、少量实例开关、必要的子文本替换。
4. 下列视觉属性默认继承原件，不应手工猜测：
   背景 fill、描边、effect、effectStyle、变量绑定、圆角、内部间距。
5. 只有“原始组件无法导入”时，才允许回退自绘。
6. 回退自绘时，优先使用 inspect 结果里的原始字段：
   `boundVariables`、`fills`、`strokes`、`effectStyle`、`effects`。
7. 若只拿到语义 token、没有拿到原始样式引用，不得宣称“1:1 复刻”，应视为近似实现。
8. effect 颜色绑定不得自动创建本地 token 变量来伪装成原始变量；读不到真实变量时，回退 raw color。

## 8. 统一 Block Payload（新格式）
所有 block 下钻优先使用：
```json
{
  "taskId": "t_xxx",
  "block": {
    "container": { "title": "区块标题", "width": 980 },
    "header": {
      "tabs": [{ "label": "全部", "active": true }],
      "actions": [{ "props": { "label": "导出", "variant": "secondary" } }]
    },
    "body": {},
    "footer": {}
  }
}
```
兼容说明：旧字段 `title/width/header/rows/charts/table/footer` 仍可被系统兼容，但新增能力请优先新格式。

## 9. `apply_scene` 约束
1. envelope 必须包含 `version: "1.0"` 与 `intent: "create" | "edit"`。
2. `scene.root` 节点必须有 `nodeId` 与 `props`（对象）。
3. 纯表格新建不要用 `apply_scene`，回到第 5 条。

## 10. 错误恢复策略
1. 参数/结构错误：先 `read_specs` 再重试。
2. 包络错误（`INVALID_ENVELOPE`）：修正字段名和必填字段，不要换工具乱试。
3. 计划阻塞：先解决依赖任务，再执行当前任务。
4. 连续失败：允许 `update_plan` 补充修复任务，不直接 `finish`。

## 11. 反模式（禁止）
1. 未读 spec 就猜参数。
2. 复杂请求不建 plan 直接多步硬拼。
3. 已有 active plan 时重复创建冲突 plan。
4. 明知任务未完成仍 `finish`。
5. 在 `draw_tabl` payload 里混入节点树字段。
6. 未读取 `ComponentTokenCatalog` 就臆造 `componentKey`。
7. 未调用 `discover_component_props` 就猜 `variantCriteria` 字段。
8. 已能导入原始组件，却仍手工重画视觉敏感组件。
9. 用语义 token 猜背景/描边/effect，并把结果当作原始设计系统样式。

## 12. 最小执行模板
1. 新建表格：
`read_specs(table*) -> draw_tabl -> finish`
2. 新建表单：
`read_specs(form*) -> draw_form -> finish`
3. 页面级复杂请求：
`set_plan(或复用 auto plan) -> plan_next -> execute_task -> update_plan(必要时) -> ... -> finish`
4. 简单节点：
`read_specs -> create_node -> finish`

## 13. 参考文档（按需读取）
1. 计划系统详规：
[SPEC_AGENT_PLANNER_CN.md](specs/SPEC_AGENT_PLANNER_CN.md)
2. 场景协议详规：
[SPEC_PROTOCOL_SCENE_CN.md](specs/SPEC_PROTOCOL_SCENE_CN.md)
3. Registry 详规：
[SPEC_REGISTRY_CN.md](../../for-dev-ai/coding-specs/SPEC_REGISTRY_CN.md)
