# 思考与执行过程展示规范（UI）

本规范用于统一插件对话区内“思考（thought）与执行（action/system）过程”的展示规则与样式。后续实现或调整 UI 时，应以本文件为唯一准则。

## 1. 范围与目标

- 范围：左侧 AI 消息气泡内的逐行过程展示（思考、规范读取提示、系统回执、流式过程、异常兜底）、以及“附件内容解析”在 AI 流程侧的提示与折叠内容。
- 目标：
  - 让用户能清晰区分“意图/计划”“正在执行”“执行结果/错误”“附件解析”等信息类型。
  - 所有状态在输出期间可见（避免空白等待）。
  - 文案与图标稳定不抖动（左对齐、固定间距、单行/多行对齐一致）。

## 2. 数据来源与解析规则

AI 气泡展示以“文本日志行”为输入，按行解析并分类渲染。关键前缀：

- `[AI]:`：模型 thought（意图/计划/说明）
- `[System]:`：运行时系统回执（执行结果、错误、状态）
- `[Streaming]:`：流式过程行（过程态）
- `[Raw]:`：解析失败兜底（原始内容）
- `[JSON]:`：模型动作 JSON

当前默认展示策略：

- `[JSON]:`、`[Streaming]:`、`[Raw]:` 默认**不直接展示给用户**。
- `[Streaming]:` 在默认隐藏时，不应让对话区出现空白；UI 需要把隐藏的流式阶段转译成一条对用户可见的简短过程文案，例如：
  - `生成表格`
  - `生成表单`
  - `生成图表`
  - `处理中`
- 上述默认隐藏行为支持通过运行时全局变量或 Vite 环境变量打开，便于调试：
  - `__FIGMA_AGENT_SHOW_ACTION_JSON__` / `VITE_FIGMA_AGENT_SHOW_ACTION_JSON`
  - `__FIGMA_AGENT_SHOW_STREAMING__` / `VITE_FIGMA_AGENT_SHOW_STREAMING`
  - `__FIGMA_AGENT_SHOW_CODE_BLOCKS__` / `VITE_FIGMA_AGENT_SHOW_CODE_BLOCKS`
  - `__FIGMA_AGENT_SHOW_RAW_LINES__` / `VITE_FIGMA_AGENT_SHOW_RAW_LINES`

实现参考：
- 行解析与分类：`buildAiDisplayItems(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L866-L1047)）
- UI 渲染：Chat 区 AI 分支（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L10247-L10404)）

## 3. 信息类型与展示样式

### A 类：Thought（模型意图）

用于显示模型“要做什么/下一步是什么”。

- 图标规则（16×16）：
  - **搜索类 thought**：涉及“读取/了解 spec、读取目录、了解组件、探测组件属性”等语义 → 搜索图标
  - **画布新增内容类 thought**：涉及“生成/创建/绘制（会在 Figma 画布新增节点）”等语义 → frame 图标
  - 其它 → 大脑图标
- 文字：
  - 字号：13px
  - 颜色：使用 secondary（以现有变量/实现为准）
  - 左对齐，不省略换行（允许多行）

### E 类：Spec Hint（运行时注入提示）

用于区分运行时注入的“规范相关提示”，与模型 thought 语义不同，但展示在同一信息层级。

- 图标：搜索图标（16×16）
- 文字：
  - 字号：13px
  - 颜色：secondary
- 展示：默认不折叠
- 呼吸点：遵循“呼吸点规则”（见第 5 节）

### C 类：System（运行时系统回执）

用于显示动作执行结果（成功/失败/中性信息）。系统回执文字统一中文化，去掉“系统：”前缀，ID 仍保留英文格式。

- 成功（success）：
  - 图标：circle-check（16×16）
  - 图标颜色：`#16A34A`
  - 文字颜色：`var(--ved-text-primary)`
- 失败（error）：
  - 图标：circle-x（16×16）
  - 图标颜色：`#DC2626`
  - 文字颜色：`var(--ved-text-primary)`
- 其它（neutral）：
  - 不显示图标
  - 文字颜色：`var(--ved-text-primary)`

系统回执中文化参考：
- `translateSystemLine(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L328-L353)）

### D 类：Streaming（流式过程）

用于显示过程态（逐行输出的事件）。

- 默认策略：**不直接展示**
- 调试打开时：
  - 文本：13px，tertiary 文本色
  - 光标：闪烁 `_`（loading 指示）
- 用户态兜底：
  - 若 Streaming 被隐藏，则必须在 AI 气泡内输出一条用户可见的简短过程状态，避免“读取规范”与“创建成功”之间出现空白。

### F 类：Raw（兜底原始输出）

用于 JSON 解析失败或非预期内容的可视化兜底。

- 默认策略：**不直接展示**
- 调试打开时：
  - 边框：`1px dashed`（默认边框色）
  - 文字：13px

## 4. 全局视觉与布局规范

- 字号：整体以 13px 为基准（过程展示相关行）
- 图标：
  - 尺寸：16×16
  - 颜色：
    - 除 System 成功/失败 与 Raw/异常外，其它图标统一：`var(--ved-icon-tertiary)`
- 间距：
  - 图标与文字间距：8px
- 对齐：
  - **单行文本**：图标与文字垂直居中
  - **多行文本**：图标与第一行文字对齐
  - 文字整体左对齐，避免抖动
- 最大宽度：
  - AI 气泡最大宽度距右侧 32px：`max-width: calc(100% - 32px)`

样式实现参考：
- [styles.css](file:///Users/bytedance/VEDUIAgent/src/styles.css#L1050-L1319)

## 5. 呼吸点（...）与状态提示规则

### 5.1 基础规则

- 仅在“仍在运行中（loading）”时显示呼吸点。
- 同一时刻只允许**一行**显示呼吸点，避免多行同时闪烁。
- “流程推进行”包含 Thought 与 Spec Hint。
- 呼吸点应**稳定挂在最后一个可见的过程状态行**上，而不是在多条历史行之间来回跳转。
- 当最后一条可见过程行为“读取表格规范”“读取表单规范”等 Spec Hint 时，也需要能显示呼吸点，避免看起来卡住。

### 5.2 稳定性要求

- 不允许因为隐藏 `[Streaming]` / `[JSON]` / `[Raw]` 而让状态区出现 1–2 秒的无提示空白。
- 若真实流式内容被隐藏，仍必须有一条可见状态承接流程推进。
- 不允许通过在消息列表底部反复插入/移除临时状态行的方式制造明显的上下跳动。

## 9. 常见问题与处理

### 9.1 “读取表格规范”行不显示呼吸点

现象：
- AI 气泡出现“读取表格规范”（Spec Hint）后，界面没有 `...` 呼吸点，看起来像停住。

原因：
- UI 呼吸点逻辑如果只把 `thought` 视为“过程行”，而“读取表格规范”会被解析为 `spec_hint`，就会导致最后一行是 `spec_hint` 时无法挂载呼吸点。

解决方式：
- 呼吸点应绑定到“过程行”，过程行包含 `thought` 与 `spec_hint`。
- 当前实现进一步要求：呼吸点只挂在**最后一个可见过程行**上。

### 9.2 读取规范后“后面一直没有动静”

现象：
- 执行到 `read_specs` 后不再继续执行后续步骤，或看起来停止更新。

高概率原因：
- 下一轮模型输出未给出可解析的 `{thought, action}`（例如输出了纯文本、或 JSON 缺少 `action` 字段），旧逻辑会直接结束本次循环，导致 UI 停在最后一条“读取规范”提示上。
- 或者：下一阶段真正写入的是 `[Streaming]: ...`，但该类输出在 UI 默认被隐藏，且没有转译成可见过程文案，于是用户会看到“读取规范...”之后短暂空白。

解决方式：
- 遇到“缺少 action”的模型输出，不应直接结束；需要向模型追加系统纠错提示并进入下一轮，要求其输出规范的 `{thought, action}` 后继续。
- `read_specs` 属于工具型动作，处理完应显式 `continue`，避免后续逻辑调整导致意外提前结束。
- 当 `[Streaming]` 默认隐藏时，应转译成一条用户可见的简短状态，如“生成表格 / 生成表单 / 生成图表 / 处理中”。

### 9.3 状态提示抖动

现象：
- “思考 Xs”“读取规范”“生成表格/生成表单”之间会出现位置跳动，或呼吸点在多条历史消息之间来回切换。

高概率原因：
- 呼吸点目标不是“最后一个可见过程状态”，而是根据不同类型行动态漂移。
- 或者通过额外插入/移除临时状态行来补齐空白，导致消息流整体重排。

解决方式：
- 保留历史状态行上的 `...`，但只允许它稳定挂在**最后一个可见过程状态**上。
- 隐藏机器流输出时，不新增用户无感知价值的调试块；只补一条简洁、可见的过程文案承接状态。

## 6. 附件内容解析（AI 流程侧）

### 6.1 位置

“附件内容解析”不跟随用户消息附件区展示，而作为 AI 流程的一部分展示在 AI 气泡内，用于提示“系统正在处理附件输入”。

### 6.2 交互

- 默认显示：`附件内容解析`
- 运行态显示（附件解析等待下一条 thought 前）：`附件内容解析中...`
- 当出现下一条 thought 时：去掉呼吸点，同时文案回到 `附件内容解析`（“中”也去掉）
- 图标状态：
  - 默认：activity
  - hover：chevron-right
  - 展开：chevron-down
- 展开后显示解析内容：
  - 当前策略：图片使用一行纯文本输出文件名（如 `图片：a.png, b.jpg`）；表格显示 `previewLines`
- 左对齐稳定：展开/收起不应导致标题行整体右移

## 7. 动效规范

- 新行微动效（Action/Streaming 阶段）：
  - 当收到新的 `[Streaming]`（或动作相关）行触发一次轻量向上位移动效
  - 目标：提示“有新数据流入”
  - 动画：`translateY(4px) → 0`，160ms，ease-out

## 8. 当前实现锚点（便于维护）

- 解析与分类：`buildAiDisplayItems(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L866-L1047)）
- 隐藏/显示配置：`UI_SHOW_ACTION_JSON / UI_SHOW_STREAMING / UI_SHOW_CODE_BLOCKS / UI_SHOW_RAW_LINES`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L6730-L6749)）
- 隐藏 Streaming 时的用户态转译：`resolveHiddenStreamingStatusText(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L6950-L6956)）
- 系统回执翻译：`translateSystemLine(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L328-L353)）
- 呼吸点挂载与过程状态渲染：AI 消息渲染段（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx#L10247-L10404)）
- 样式：过程展示相关 class（[styles.css](file:///Users/bytedance/VEDUIAgent/src/styles.css#L1050-L1319)）
