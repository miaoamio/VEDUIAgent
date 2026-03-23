# Agent 计划队列与分层生成规范（Spec Coding）

> **⚠️ 注意：当前 Plan 流程与 `execute_task` 任务下钻机制已被临时禁用。**
> 等待后续开发成熟后再重新启用。在禁用期间，Agent 应直接使用 `apply_scene`、`create_node`、`draw_tabl` 等命令一次性或分步完成任务，不要调用 `set_plan` 或 `execute_task`。

## 1. 目标
本规范定义“先外壳占位、再区块下钻”的执行机制，保证复杂页面生成可控、可追踪、可恢复。

适用场景：
1. 页面包含多个区块（如表格区、图表区、表单区）。
2. 区块内还存在多层嵌套与后续补全。
3. 需要避免模型遗忘待办或提前 finish。

## 2. 核心结论
1. 可以采用“外层到内层”逐步生成。
2. 不能依赖大模型记忆待办，必须有外部 Plan 队列（系统状态机）。
3. 不建议“所有节点都两阶段”；应采用混合策略：
- 复杂区块：外壳占位 + 下钻补全。
- 简单叶子：一次性生成。

## 3. 混合式生成策略（推荐）
1. Skeleton 阶段：先创建页面骨架和区块占位节点（稳定 `nodeId`）。
2. Drill-down 阶段：按任务队列逐个下钻区块。
3. Leaf 阶段：叶子组件直接一次性创建，不再拆分。

原则：
1. 控制轮次，避免全量占位导致循环过长。
2. 保留可中断/可恢复能力（每个区块独立）。
3. 每轮仅执行一个动作，降低错误面。

## 4. 运行时组件
1. Planner：维护任务清单与状态（source of truth）。
2. Scheduler：根据依赖关系选择下一个可执行任务。
3. Executor：执行具体动作（`read_specs` / `draw_tabl` / `create_node` / `apply_scene`）。
4. Verifier：校验执行结果并写回任务状态。
5. Recovery：失败重试、追加子任务、阻塞检测。

## 5. Plan 数据结构
```ts
type PlanTaskStatus = "pending" | "in_progress" | "done" | "failed" | "blocked";

interface PlanTask {
  taskId: string;
  title: string;
  type: string;                 // create_shell / expand_table_block / expand_chart_block ...
  targetNodeId?: string;
  dependsOn: string[];          // 依赖任务
  requiredSpecs: string[];      // 执行前应读取的 specs
  status: PlanTaskStatus;
  retries: number;
  notes?: string;
}

interface AgentPlanState {
  planId: string;
  rootGoal: string;
  tasks: PlanTask[];
  createdAt: string;
  updatedAt: string;
}
```

## 6. 计划动作协议
### 6.1 `set_plan`
初始化计划队列。

```json
{
  "type": "set_plan",
  "payload": {
    "rootGoal": "生成客户管理页",
    "tasks": [
      { "taskId": "t_shell", "title": "创建页面外壳", "type": "create_shell", "status": "pending" },
      { "taskId": "t_list", "title": "下钻列表区", "type": "expand_table_block", "dependsOn": ["t_shell"], "status": "pending" }
    ]
  }
}
```

### 6.2 `plan_next`
请求系统返回下一个可执行任务（依赖满足且状态可执行）。

```json
{
  "type": "plan_next",
  "payload": {}
}
```

### 6.3 `update_plan`
更新任务状态，可追加新下钻任务。

```json
{
  "type": "update_plan",
  "payload": {
    "updates": [
      { "taskId": "t_shell", "status": "done" }
    ],
    "addTasks": [
      { "taskId": "t_list_filter", "title": "补充筛选区", "type": "expand_filter_bar", "dependsOn": ["t_list"], "status": "pending" }
    ]
  }
}
```

兼容写法：
1. 单条状态更新可直接使用 `payload.taskId + payload.status`。
2. 追加任务除 `addTasks` 外，也兼容 `appendTasks` 与 `tasks`。
3. `payload.tasks` 为混合模式：已存在 `taskId` 视为更新，不存在则视为追加。

### 6.4 自动计划（Auto Plan）
当系统识别到“复杂请求”时，可以自动初始化计划队列（等价于隐式 `set_plan`）：
1. 典型信号：页面级意图 + 多区块关键词（表格/图表/表单）或多条件连接词（“以及/并且/with/and”）。
2. 自动计划最少包含：
- `t_shell`：创建外壳（`create_shell`）
- 一个或多个区块下钻任务（如 `expand_table_block`）
3. 模型收到 PlanState 后应直接按 `plan_next` 执行，不应重复创建冲突计划。

### 6.5 `execute_task` / `run_task`
用于执行已知 task type 的系统内置执行器，降低自由 JSON 拼装风险。

```json
{
  "type": "execute_task",
  "payload": { "taskId": "t_shell" }
}
```

推荐内置 task type：
1. `create_shell`
2. `expand_table_block`
3. `expand_chart_block`
4. `expand_form_block`
5. `expand_tabs_block`

统一推荐 payload（新格式）：
```json
{
  "taskId": "t_block_x",
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

兼容策略：
1. 旧字段（`title/width/header/rows/charts/table/footer`）继续兼容。
2. 新增能力优先写入 `block.container/header/body/footer`。

`expand_table_block` 推荐 payload：
```json
{
  "taskId": "t_list_1",
  "block": {
    "container": { "title": "客户列表", "width": 980 },
    "header": {
      "tabs": [{ "label": "全部", "active": true }, { "label": "我的" }],
      "actions": [{ "props": { "label": "导出", "variant": "secondary" } }]
    },
    "body": {
      "filters": {
        "items": [
          { "componentId": "input", "props": { "placeholder": "搜索..." } },
          { "componentId": "select", "props": { "value": "全部状态" } }
        ]
      },
      "table": {
        "headers": ["姓名", "状态", "城市"],
        "rows": [["张三", { "text": "启用", "statusTheme": "Success 成功" }, "北京"]],
        "columnTypes": ["Text", "StatusTag", "Text"],
        "columnWidths": [140, 100, 120]
      }
    },
    "footer": {
      "pagination": { "page": 1, "total": 100 }
    }
  }
}
```

`expand_chart_block` 推荐 payload：
```json
{
  "taskId": "t_chart_1",
  "block": {
    "container": { "title": "趋势图", "width": 980 },
    "header": {
      "tabs": [{ "label": "近7天", "active": true }, { "label": "近30天" }],
      "actions": [{ "props": { "label": "导出", "variant": "secondary" } }]
    },
    "body": {
      "charts": [
        { "title": "销售趋势", "height": 240 },
        { "title": "新增用户", "height": 200 }
      ]
    },
    "footer": { "notes": "数据更新时间：今天 10:00" }
  }
}
```

`expand_form_block` 推荐 payload：
```json
{
  "taskId": "t_form_1",
  "block": {
    "container": { "title": "筛选区", "width": 980 },
    "header": {
      "actions": [{ "props": { "label": "高级筛选", "variant": "secondary" } }]
    },
    "body": {
      "rows": [
        [
          { "componentId": "input", "props": { "placeholder": "姓名" } },
          { "componentId": "select", "props": { "value": "全部状态" } }
        ],
        [
          { "componentId": "button", "props": { "label": "搜索", "variant": "primary" } },
          { "componentId": "button", "props": { "label": "重置", "variant": "secondary" } }
        ]
      ]
    },
    "footer": {
      "actions": [
        { "props": { "label": "保存筛选", "variant": "secondary" } }
      ]
    }
  }
}
```

`expand_tabs_block` 推荐 payload：
```json
{
  "taskId": "t_tabs_1",
  "block": {
    "container": { "title": "标签切换区", "width": 980 },
    "header": {
      "actions": [{ "props": { "label": "管理标签", "variant": "secondary" } }]
    },
    "body": {
      "tabs": [
        { "label": "全部", "active": true },
        { "label": "我的" },
        { "label": "归档" }
      ]
    },
    "footer": {
      "notes": "点击标签可切换数据视图"
    }
  }
}
```

父节点解析顺序（定向下钻）：
1. `payload.parentId`
2. 当前任务 `task.targetNodeId`
3. 依赖任务中已完成项的 `targetNodeId`
4. `create_shell` 任务的 `targetNodeId`

幂等策略：
1. 若任务已 `done` 且已有 `targetNodeId`，默认跳过，避免重复生成。
2. 如需重跑，显式传 `payload.force=true`。

## 7. 执行动作与任务绑定
对于非计划动作，建议带 `taskId`：
1. `action.taskId = "t_list"`，或
2. `action.payload.taskId = "t_list"`。

系统可自动回写：
1. 开始执行前：`in_progress`。
2. 执行成功：`done`。
3. 执行失败：`failed` + `retries += 1`。

## 8. 调度规则（Scheduler）
选择顺序：
1. 仅选择 `pending/failed` 任务。
2. 所有 `dependsOn` 必须为 `done`。
3. 按任务出现顺序选择第一个可执行任务。

无可执行任务时：
1. 若全部 `done`：允许 `finish`。
2. 若仍有未完成任务：返回阻塞信息，禁止 `finish`。

## 9. 与表格专用动作的关系
1. 新建纯表格始终优先 `draw_tabl`（或 `draw_table`）。
2. `expand_table_block` 由系统执行器一次性创建“卡片外壳 + 筛选 + 表格主体 + 页脚”。
3. 若模型错误输出 `apply_scene(table subtree)` 或 `create_node(table subtree)`，运行时会自动重定向到 `draw_tabl`，并保持任务状态一致。

## 10. 失败与恢复
1. 单任务失败不等于全局失败，先标记 `failed`。
2. 可通过 `update_plan` 追加修复任务（如重新读 specs）。
3. 达到重试阈值后将任务标记 `blocked`，并要求人工或更高层策略介入。
4. 建议实现重试阈值（例如 `TASK_MAX_RETRIES=2`）：`failed` 超限自动转 `blocked`。

## 11. 可观测性与人工接管（Human-in-the-loop）
为了让计划系统稳定运行，UI 应至少提供：
1. Plan 总览（pending/in_progress/done/failed/blocked 计数）。
2. 下一个可执行任务提示（Next executable task）。
3. 任务列表（taskId/title/type/dependsOn/retries/notes）。
4. 手动操作（清空计划、手动改任务状态、执行下一步）。

人工接管规则：
1. 当任务长期 `blocked` 或重复 `failed` 时，允许人工改为 `pending` 后重试。
2. 手动改状态应记录 `notes=manual override`，便于回溯。
3. `finish` 前必须再次检查是否仍有未完成任务。

## 12. 扩展到表单/图表/整页
当前落地 task type（5 种）：
1. `create_shell`
2. `expand_table_block`
3. `expand_form_block`
4. `expand_chart_block`
5. `expand_tabs_block`

未来可扩展 task type（按需）：
1. `bind_data_block`
2. `polish_theme_block`

这样新增组件能力时，优先扩展 task type 和 block executor，而不是改 Agent 主循环。

## 13. Definition of Done
满足以下条件才算计划系统可用：
1. 计划队列可被初始化、更新、查询下一个任务。
2. 非计划动作能绑定并自动回写 task 状态。
3. 存在“finish 阻断机制”：有未完成任务时不能结束。
4. 表格类任务仍走 `draw_tabl` 专用路径。
5. UI 可视化 Plan 状态并支持人工接管。
6. 文档与实现一致，且支持后续组件扩展。
