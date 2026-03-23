# 任务/计划展示规则（对话流 & 任务面板）

本文件汇总“任务/计划（Plan/Task）”在插件对话流中的展示规则与交互约束，用于后续统一实现与回归。

## 1. 适用范围

- 对话气泡内的过程行展示（thought / spec hint / system 回执 / streaming / raw）。
- 对话输入区上方的内联任务面板（任务列表、header、滚动、折叠）。

不包含：图表 Overlay、属性面板等无关 UI。

## 2. 任务面板（内联）规则

### 2.1 出现时机

- 当模型输出 `set_plan` / `init_plan` 并被运行时解析成 `agentPlan` 后，任务面板应立即可见（不应等到整轮执行结束才出现）。
- 执行过程中任务状态变化（pending/in_progress/done/failed/blocked）应实时同步到面板。

实现锚点：
- plan 渲染：[renderPlanPanel](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L8643-L8689)

### 2.2 位置与布局

- 面板渲染在对话输入区中，位于“已选中信息（chat-selection-bar）”上方。
- “任务面板 / 已选中信息 / 输入框”三块之间的纵向间距为 8px（由 `.input-section { gap: 8px }` 统一控制）。

实现锚点：
- 内联插入位置：[App.tsx:L9068-L9097](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L9068-L9097)
- 8px 间距：[styles.css:L59-L64](file:///Users/bytedance/VEDUIAgent/src/styles.css#L59-L64)

### 2.3 自动隐藏

- 当计划存在且仍有未完成任务时显示面板。
- 当任务全部完成（所有任务 `done`）时，任务面板自动收起并隐藏。

实现锚点：
- 显示条件：[App.tsx:L9083-L9085](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L9083-L9085)

### 2.4 Header（Agent bar）样式与交互

- Header 文案：`X/Y 已完成`
- 文案：字重 500，颜色 secondary。
- Chevron 图标：
  - 展开状态：默认 `chevron-down`，hover 不变；点击后收起，变为 `chevron-right`
  - 收起状态：默认 `chevron-right`，hover 不变；点击后展开，变为 `chevron-down`
- 点击区域：点击 Header 左侧区域（icon + 文案）折叠/展开任务列表。

实现锚点：
- Header 交互与 icon：[App.tsx:L8651-L8666](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L8651-L8666)
- Header 样式：[styles.css:L2693-L2727](file:///Users/bytedance/VEDUIAgent/src/styles.css#L2693-L2727)

### 2.5 任务列表展示与滚动

- 任务列表最多可见 5 条，超出部分默认不滚动。
- 鼠标 hover 到面板区域后，任务列表允许滚轮上下滚动查看。
- Header 固定不随列表滚动（header 与 list 分离渲染，list 才有滚动）。

实现锚点：
- 列表高度与 hover 滚动：[styles.css:L2642-L2658](file:///Users/bytedance/VEDUIAgent/src/styles.css#L2642-L2658)

### 2.6 任务列表项样式（仅展示 status + title）

- 内容：仅展示“状态 icon + title”，其它信息隐藏。
- Title：
  - 默认单行，超出截断（ellipsis）
  - 颜色 `var(--ved-text-primary)`
  - 字号 12px，字重 400
- Icon：
  - 尺寸 16×16
  - `done`：circle-check，颜色 `var(--ved-status-success)`
  - `failed`：circle-x，颜色 `var(--ved-status-error)`
  - `in_progress`：loader/spinner，颜色 `var(--ved-status-running)`
  - `pending`：circle-dashed，颜色 `var(--ved-status-pending)`
- 布局：
  - icon 与 title 间距 4px
  - 列表项左对齐

实现锚点：
- 列表项渲染：[App.tsx:L8667-L8686](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L8667-L8686)
- icon 颜色变量：[styles.css:L2912-L2933](file:///Users/bytedance/VEDUIAgent/src/styles.css#L2912-L2933)

## 3. 对话气泡（过程行）规则

### 3.1 行类型与展示

- `[AI]:` → thought 行
- `[System]:` → 系统回执行（执行结果/错误/状态）
- `[Streaming]:` → 流式过程行
- `[Raw]:` → 兜底原始内容
- `[JSON]:` → 动作 JSON（不直接展示；用于运行时解析与调试）

实现锚点：
- 行解析与分类：[buildAiDisplayItems](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L717-L850)

### 3.2 呼吸点（...）规则（与任务/计划相关）

- 呼吸点仅在 `loading` 期间显示，且只挂载在“最后一条过程行”上，避免多行闪烁。
- “过程行”包含：`thought` 与 `spec_hint`（例如“读取表格规范”也必须能显示呼吸点）。
- 当最后一个 item 是 `action_json`（不渲染）时，呼吸点目标应跳过它，找到最后一个可渲染行（否则会出现“明明在跑但看起来没动静”）。

实现锚点：
- 过程行判定与呼吸点目标行选择：[App.tsx:L8709-L8895](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L8709-L8895)

### 3.3 计划/任务控制类回执的展示策略

- 当模型 thought 语义是“初始化/创建/更新 任务/计划”时：
  - 不在对话气泡里额外追加 `Plan initialized / Plan updated` 的系统摘要行
  - 计划变化直接体现在任务面板（任务数量、任务名称、状态变化）

实现锚点：
- set_plan/init_plan 与 update_plan 的对话回执抑制逻辑：[App.tsx:L6552-L6686](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L6552-L6686)

### 3.4 避免重复信息：末尾“任务状态汇总 thought”自动隐藏

在包含任务的对话流中，若最后一条 thought 是“汇总所有任务状态/完成情况”的描述，而紧接着的系统回执会给出结论（例如：任务全部完成/完成被阻止/暂无可执行任务），则该 thought 不展示，避免重复。

覆盖场景：
- 全部任务完成
- 部分任务成功、部分任务失败（导致完成被阻止/暂无可执行任务等）

实现锚点：
- 汇总 thought 的去重：[buildAiDisplayItems](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L821-L849)

### 3.5 “全中文”硬约束

- 与任务/计划相关的系统回执必须用中文输出，避免出现 `execute_task ... success(...)` 等英文句式。
- 若上游产生英文错误信息（例如服务端返回 message），应尽可能包裹为中文提示，并将原始英文作为错误详情（必要时）保留在括号或 JSON 中；但 UI 默认可见文案应保持中文。

实现锚点：
- 系统回执翻译入口：`translateSystemLine`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L284-L299)）
- 任务执行成功/失败文案（已中文化）：[App.tsx:L6070-L6228](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L6070-L6228)
- 任务完成回执（中文）：[App.tsx:L6758-L6771](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L6758-L6771)

## 4. Thought 图标规则（与任务/计划相关）

### 4.1 目标

用户需要通过图标快速区分：
- 读规范/检索类
- 建计划/建任务/更新计划类
- 执行任务/执行计划类
- 画布新增内容类

### 4.2 规则

- 搜索/读规范/探测类 thought → Search icon
- “初始化/创建/更新/建立/建…计划/任务”等计划管理 thought → List 风格 Frame icon（Figma 资源）
- “执行计划/执行任务/下一步/execute_task”等执行语义 thought → Frame icon
- “生成/创建/绘制（画布新增内容）”类 thought → Frame icon
- 其它 → Brain icon

实现锚点：
- 图标语义识别：[App.tsx:L210-L284](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L210-L284)
- PlanFrameIcon（Figma list icon）：[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L495-L580)
- Thought 渲染分支：[App.tsx:L8916-L8933](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L8916-L8933)

## 5. 使用方式（供“调用”）

如果需要在后续迭代中让“对话流展示任务相关内容”遵循统一规则：
- 研发侧：以本文作为 UI 逻辑与样式回归的准绳，修改时优先对照本文各条规则与锚点。
- 运行时侧：若需要让模型遵守“计划控制回执不刷屏/全中文”等展示约束，应把这些规则同步到运行时 prompt（避免模型输出与 UI 展示策略冲突）。

