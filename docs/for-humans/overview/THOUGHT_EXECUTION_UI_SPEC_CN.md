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
- `[JSON]:`：模型动作 JSON（当前默认不展示）

实现参考：
- 行解析与分类：`buildAiDisplayItems(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx)）
- UI 渲染：Chat 区 AI 分支（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx)）

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
- `translateSystemLine(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx)）

### D 类：Streaming（流式过程）

用于显示过程态（逐行输出的事件）。

- 文本：13px，tertiary 文本色
- 光标：闪烁 `_`（loading 指示）

### F 类：Raw（兜底原始输出）

用于 JSON 解析失败或非预期内容的可视化兜底。

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
- [styles.css](file:///Users/bytedance/VEDUIAgent/src/styles.css)

## 5. 呼吸点（...）与状态提示规则

### 5.1 基础规则

- 仅在“仍在运行中（loading）”时显示呼吸点。
- 当出现新的一行（流程推进）时，上一行的呼吸点必须移除，避免多行同时闪烁。

### 5.2 画布新增内容类 Thought 的特殊规则

- 若存在“会在画布新增内容”的 frame-thought（生成/创建/绘制），则在其对应的系统回执出现之前，呼吸点应**固定挂在该 frame-thought 上**（不被其它后续行抢占）。
- 一旦出现对应系统回执，frame-thought 的呼吸点应移除。

### 5.3 空白等待兜底：统一显示“思考中...”

当最后一条可见内容是系统回执，且仍处于运行中（loading），但下一条 thought 尚未到达时：

- 在系统回执后追加一条“思考中...”提示（带呼吸点），用于填补空白等待。
- 当下一条 thought 出现时，“思考中...”消失（被新内容替换）。

## 6. 附件内容解析（AI 流程侧）

### 6.1 位置

“附件内容解析”不跟随用户消息附件区展示，而作为 AI 流程的一部分展示在 AI 气泡内，用于提示“系统正在处理附件输入”。

### 6.2 交互

- 默认显示：`附件内容解析` 或 `附件内容解析中`（运行态）
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

- 解析与分类：`buildAiDisplayItems(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx)）
- 系统回执翻译：`translateSystemLine(...)`（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx)）
- 呼吸点与空白兜底逻辑：AI 消息渲染段（[App.tsx](file:///Users/bytedance/VEDUIAgent/src/App.tsx)）
- 样式：过程展示相关 class（[styles.css](file:///Users/bytedance/VEDUIAgent/src/styles.css)）

