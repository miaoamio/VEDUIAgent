# 手工测试流程（Block 统一版）

## 1. 当前五种 Block（执行器）
1. `create_shell`
2. `expand_table_block`
3. `expand_form_block`
4. `expand_chart_block`
5. `expand_tabs_block`

## 2. 测试目标
验证三件事：
1. 五种 block 都走统一 payload 结构：`block.container/header/body/footer`（旧字段仍兼容）。
2. 计划队列（Plan）能稳定驱动“先外壳再下钻”。
3. 表格仍保持专用快路径（`draw_tabl/draw_table`）。

## 3. 环境准备
1. 在项目根目录运行 `npm run build`（或开发态 `npm run watch`）。
2. 在 Figma 中加载插件并打开聊天面板（`对话 & 编辑`）。
3. 清空历史响应，保证每个用例独立观察。

## 4. 用例清单

### 用例 A：纯表格专用链路
输入（自然语言）：
```text
生成一个三列表格，列是姓名/年龄/城市，包含3行数据。
```
预期：
1. AI 先读 table 系列 specs。
2. AI 使用 `draw_tabl`（或 `draw_table`）创建表格。
3. 不应出现 `apply_scene(table subtree)` 冗长结构。
4. 不应自动进入 Plan 模式（不应出现 Auto plan initialized）。

通过标准：
1. 响应日志出现 `draw_table success`。
2. 没有 `INVALID_ENVELOPE` 的 table 子树报错。
3. 画布中直接生成表格主体，不出现“下钻列表/表格区”标题卡片。

### 用例 B：复杂页面 Auto Plan
输入（自然语言）：
```text
生成一个客户管理页面，包含筛选区、tab切换区、客户列表表格和趋势图表。
```
预期：
1. 系统自动初始化 plan（出现 `Auto plan initialized`）。
2. Plan 面板出现 `t_shell + 4 个下钻任务`。
3. `Next` 指向可执行任务，状态在 `pending/in_progress/done` 间流转。

通过标准：
1. Plan 面板计数变化与执行日志一致。
2. 所有任务完成前，`finish` 会被阻断。

### 用例 C：五种 block 执行器逐个验证
输入（自然语言）：
```text
先创建页面外壳，然后依次执行表单区、tab区、表格区、图表区，每一步都用 execute_task。
```
操作：
1. 点击右下角 `计划岛台` 展开计划面板。
2. 点击 Plan 面板 `执行下一步`，直到无可执行任务。

预期：
1. 依次出现 `create_shell / expand_form_block / expand_tabs_block / expand_table_block / expand_chart_block` 成功日志（顺序可略有差异，取决于任务列表）。
2. 每个任务完成后写入 `targetNodeId`。

通过标准：
1. 五类执行器均至少成功一次。
2. Plan 计数最终 `done` 覆盖全部任务。

### 用例 D：依赖阻断
输入（建议让 AI 设置计划）：
```text
初始化一个计划：t_table 依赖 t_shell，然后先执行 t_table。
```
预期：
1. 返回 `execute_task blocked: dependency ... not done`。
2. 任务状态进入 `blocked`。

通过标准：
1. Plan 中目标任务状态显示 `blocked`。

### 用例 E：done 跳过 + force 重跑
操作：
1. 选择一个已 `done` 的任务，再次执行同一 `taskId`。
2. 再执行一次，带 `payload.force=true`。

预期：
1. 第一次返回 `already done ... skipped`。
2. 第二次成功重跑并返回新的执行成功日志。

通过标准：
1. 跳过与强制重跑行为都符合预期。

### 用例 F：失败重试阈值到 blocked
输入（建议构造非法 task type）：
```text
set_plan 一个任务 t_bad，type=expand_unknown_block，然后连续 execute_task t_bad 两次。
```
预期：
1. 第一次失败：状态 `failed`，`retries=1`。
2. 第二次失败：自动转 `blocked`（阈值 `TASK_MAX_RETRIES=2`）。

通过标准：
1. Plan 面板显示该任务最终为 `blocked`。

### 用例 G：人工接管恢复
操作：
1. 对 `blocked` 任务点击 `待处理`。
2. 点击 `执行下一步`。

预期：
1. `notes` 带 `manual override` / `manual run`。
2. 任务重新进入执行流程。

通过标准：
1. 人工改状态后可再次推进。

### 用例 H：统一 payload 结构兼容性
输入（自然语言）：
```text
执行一个 expand_tabs_block，使用 block.container/header/body/footer 格式；再执行一个 expand_form_block，使用旧 rows/fields 格式。
```
预期：
1. 两种输入都可成功创建。
2. 新格式优先，旧格式不报错。

通过标准：
1. 日志均为 success，无 payload invalid 报错。

### 用例 I：表格色彩变量绑定回归
输入（自然语言）：
```text
生成一个三列表格，列是姓名/年龄/城市，包含3行数据。
```
操作：
1. 选中表格任意表头单元格与数据单元格。
2. 在 Figma 右侧 Dev/变量信息中检查填充与描边是否绑定 Color Variable（不是纯色值）。
3. 在插件属性面板修改表格边框颜色、单元格背景颜色后再次检查绑定状态。

预期：
1. 表头、单元格、边线优先绑定变量。
2. 修改属性后仍保持变量绑定策略（不退化成纯 hex）。

通过标准：
1. 可观察到 `fills/strokes` 的变量绑定存在。
2. 若当前文件没有对应变量，仍可正常渲染为 fallback hex（不报错不中断）。

### 用例 J：Spec 开关生效（enabled=false）
操作：
1. 在 [registry.ts](/Users/bytedance/Desktop/figmaUIagent/src/registry.ts) 将某个键的 `enabled` 改为 `false`（例如 `table-border-key`）。
2. 重新 build 并生成同样的表格。
3. 检查同一位置颜色是否改为纯色 fallback（不再绑定变量）。

预期：
1. 不改渲染代码，只改 spec 即可切换“变量绑定/纯色回退”行为。
2. `enabled=false` 时不再尝试变量绑定。

通过标准：
1. 行为变化仅由 spec 控制，代码无需改动。
2. 打开 `enabled=true` 后行为可恢复。

### 用例 K：一键全量反查组件属性并导出快照
操作：
1. 打开插件 `组件库` 标签页。
2. 在 `Figma 属性反查自动化` 卡片点击 `全量反查组件属性`。
3. 反查完成后点击 `复制 Markdown` 或 `下载 Markdown`。

预期：
1. 显示统计摘要：`success/failed/processed/requested`。
2. 生成 Markdown 快照，包含：
- Summary 表（token/componentKey/nodeType/variantCount/properties）。
- Snapshot JSON（可回填到 spec 的 `figmaPropertySnapshot` 字段）。

通过标准：
1. 不需要手动输入 `discover_component_props` JSON 指令即可完成全量反查。
2. 导出的 Markdown 可直接用于组件 spec 文档维护与评审。

### 用例 L：定向反查 + Spec Patch JSON
操作：
1. 打开 `组件库` 标签页，在 `Figma 属性反查自动化` 输入 token（例如 `lib-data-display-status-tag`）。
2. 点击 `定向反查`。
3. 点击 `复制 Spec Patch JSON` 或 `下载 Spec Patch JSON`。
4. 执行 `npm run spec:snapshot:apply -- <Spec Patch JSON 路径>`；若 JSON 已在剪贴板，可执行 `pbpaste | npm run spec:snapshot:apply -- --stdin`。

预期：
1. 仅扫描输入 token 对应组件。
2. 生成 `patches[]` 结构，包含 `figmaPropertySnapshot`，可用于回填 spec。
3. 脚本会把对应 `figmaPropertySnapshot` 写入 `src/registry.ts`。

通过标准：
1. `Spec Patch JSON` 包含 `generatedAt/source/patches` 字段。
2. `patches` 内每项包含 `componentKey` 与 `figmaPropertySnapshot.properties`。
3. 回填脚本输出 `applied/changed/components` 摘要，且目标组件写回成功。

### 用例 M：read_specs 可读快照字段
操作：
1. 先确保某个组件已回填 `figmaPropertySnapshot`（如 `button`）。
2. 在聊天中触发 `read_specs(["button"])`。

预期：
1. 返回中包含 `FigmaPropertySnapshotMeta`。
2. 返回中包含 `FigmaPropertySnapshotProperties`。

通过标准：
1. 能看到 `token/componentKey/inspectedAt/propertyCount`。
2. 能看到完整 `properties[]` 列表。

### 用例 N：登记进度巡检
操作：
1. 在项目根目录执行 `npm run spec:snapshot:status`。

预期：
1. 输出汇总：`totalComponents/withSnapshot/withoutSnapshot`。
2. 输出每个组件的 `hasSnapshot` 与 `mappedTokens`。

通过标准：
1. 已登记组件的 `hasSnapshot` 为 `yes`。
2. 映射补齐后的组件可看到对应 token。

## 5. 回归检查（每次改动后）
1. `npx tsc --noEmit`
2. `npm run build`
3. 重新执行用例 A + B + F + I + J + K + L + M + N（最小高价值回归集）。
