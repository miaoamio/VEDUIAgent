# Figma UI Agent — 北极星文档

> **这是唯一的指导思想文档。**
> 当你不知道"应该怎么做"、"这个东西放哪里"、"这两个文档哪个对"时，答案在这里。
> 其他所有文档都是这份文档某一个方面的细化，不得与本文档矛盾。

---

## 一、这个项目是什么

一个 Figma 插件。设计师用自然语言描述需求，AI Agent 自动绘制出**符合设计规范**的 UI 组件（表格、表单、图表等）。

**核心价值**：AI 不是在"猜"设计规范，而是在"读规范、执行规范"。

---

## 二、当前最核心的问题

### 规范存在于三个地方，彼此没有绑定

```
registry.ts          ← Agent 读这里做决策（组件参数、结构）
code.ts              ← 渲染时真正执行（尺寸、间距、颜色的硬编码）
App.tsx system prompt ← Agent 行为约束（重复了部分 registry 内容）
```

**后果**：
- 改了 registry，code.ts 不一定跟着变 → 规范没有真正生效
- 改了 code.ts，Agent 看不到 → AI 还是按旧理解生成
- 改了 prompt，registry 没更新 → 两边不一致
- vibe coding 过程中反复对话才能生效，但"生效到了哪里"无法追踪
- 主题替换（换一套色彩/圆角）需要全文搜索，极易遗漏

### 根本矛盾

> **规范的定义者（registry）和规范的执行者（code.ts）是分离的。**

---

## 三、指导思想：Registry 是唯一事实来源

**一句话原则：所有设计规范只在 Registry 里定义一次，其他地方只读取，不重复定义。**

这意味着：

| 过去 | 目标 |
|------|------|
| `code.ts` 里写死 `headerHeight = 40` | `registry.ts` 里写，`code.ts` 读 |
| `code.ts` 里写死 `cornerRadius = 6` | `registry.ts` 里写，`code.ts` 读 |
| `code.ts` 里散落 `'#1664FF'` | `theme` 层统一管，`code.ts` 不出现 hex |
| Agent 靠 prompt 猜默认值 | Agent 读 `read_specs` 看到真实默认值 |
| 换主题需要全文搜索 | 替换一个 theme 文件 |
| "生效到哪里"不知道 | 改 registry → 渲染自动跟随 |

---

## 四、架构：三层分离

> 每一层的具体文件结构、放什么、禁止什么，见 [FILE_STRUCTURE.md](FILE_STRUCTURE.md)。

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Component Spec（组件结构规范）                   │
│                                                          │
│  定义"组件是什么"：                                        │
│  - params（参数及默认值）                                  │
│  - slots（槽位结构）                                       │
│  - constraints（约束）                                    │
│  - capabilities（能力声明）                               │
│  - runtime（尺寸/间距/圆角等渲染规格）  ← 新增，从code.ts迁入 │
│  - renderNotes（给 Agent 读的渲染注意事项）← 新增           │
│                                                          │
│  稳定，设计师可读可改，AI 按需加载                          │
└──────────────────────┬───────────────────────────────────┘
                       │ 引用 token key（不含实际值）
┌──────────────────────▼───────────────────────────────────┐
│  Layer 2: Theme Package（主题包）                         │
│                                                          │
│  定义"用哪套视觉"：                                        │
│  - color token → variableRef + fallbackHex               │
│  - typography token → textStyleRef                       │
│  - spacing token → 圆角/间距实际数值                      │
│                                                          │
│  可整包替换。换主题 = 换一个文件                            │
│  code.ts 不再出现任何 hex 颜色值                           │
└──────────────────────┬───────────────────────────────────┘
                       │ 运行时合并（registry resolver）
┌──────────────────────▼───────────────────────────────────┐
│  Layer 3: Skill（技能包）                                  │
│                                                          │
│  定义"怎么执行"：                                          │
│  - draw_table / draw_form 等动作的完整执行逻辑             │
│  - 分步计划模板                                            │
│  - 错误恢复策略                                            │
│                                                          │
│  分两种形态（见第五节）                                     │
└──────────────────────────────────────────────────────────┘
```

### 数据流

```
用户自然语言
    ↓
Agent 读 read_specs（Layer 1 的 params + renderNotes）
    ↓
Agent 输出结构化协议（draw_table / apply_scene）
    ↓
渲染引擎读 Layer 1 runtime + Layer 2 theme，执行渲染
    ↓
Figma 节点落地
```

---

## 五、执行层概念分类

> 这一节用第一性原理回答：代码层面的各种"函数/动作/技能"分别叫什么、各自的边界在哪里。

### 四层概念速查

| 层级 | 名称 | 定义 | 是否经过 AI | 例子 |
|------|------|------|------------|------|
| E0 | **Utils / Helpers（工具函数）** | 纯函数，不暴露给 AI | 否 | `setFillWidth(node)`, `applyColorVariable(node, token)`, `resolveTableHeaderHeight(params)` |
| E1 | **Tool / Action（动作）** | AI 可调用的最小执行单元，via `action.type` | AI 触发，代码执行 | `draw_table`, `draw_form`, `apply_scene`, `create_node`, `read_specs` |
| E2 | **Skill（技能包）** | 封装完整业务逻辑的代码单元，可被 Tool 调用 | 否 | `buildTableComponentFromPayload()`, `buildFormComponentFromPayload()` |
| E3 | **Agentic Recovery（Agent 自愈）** | AI 读错误信息 → 推理 → 重新调用 Tool，自动修复 | AI 主导 | 遇到 "columnWidths mismatch" 错误后自动修正后重试 |

---

### E0 — Utils / Helpers（工具函数）

**定义**：纯粹的工具函数。不暴露给 AI，只被 Skill 或 code.ts 内部调用。

```
典型例子：
- setFillWidth(node)               — 设置节点宽度为充满父容器
- applyColorVariable(node, token)  — 应用颜色变量到节点
- resolveTableHeaderHeight(params) — 读 registry.runtime，计算行高
- getThemeColor(token)             — 读 theme/active，返回颜色值
```

**写法原则**：参数来自 registry / theme，不硬编码数字或颜色。

```ts
// 目标写法：从 registry 读，不硬编码
function resolveTableHeaderHeight(params: any) {
  const metrics = getRegistrySizeMetrics('table', params.size ?? 'default');
  return params.headerHeight ?? metrics.height;
}
```

**文件位置**：`engine/skills/resolve/*.ts`（调用 Figma API 的除外，留在 `code.ts`）

---

### E1 — Tool / Action（动作）

**定义**：AI 可以调用的最小执行单元。AI 通过输出 `action.type` 触发，代码负责执行。是 AI 和代码层的**唯一接口边界**。

```
当前已有的 Tool：
- draw_table / draw_tabl    — 创建表格
- draw_form                 — 创建表单
- apply_scene               — 提交场景树/增量修改
- create_node               — 创建单个节点
- read_specs                — 读取组件规格
- discover_component_props  — 探测 Figma 组件属性
- finish                    — 结束当前任务
```

**设计原则**：
- 每个 Tool 有清晰的 `payload` schema，在 `renderNotes.actionHint` 里声明用途
- Tool 内部调用 Skill 或 Utils 完成实际工作，Tool 本身只做 dispatch
- Tool 的错误信息要对 AI 可读：`"columnWidths 总和 600 ≠ tableWidth 800"` 而不是 `"Error: assertion failed"`

---

### E2 — Skill（技能包）

**定义**：封装完整业务逻辑的代码单元。有语义名称，对应一类完整任务。被 Tool 的 case handler 调用，不直接暴露给 AI。

```
当前已有的 Skill：
- buildTableComponentFromPayload()   — 表格完整渲染逻辑（engine/skills/table.skill.ts）
- buildFormComponentFromPayload()    — 表单完整渲染逻辑（engine/skills/form.skill.ts）
- applyFigmaComponentProps()         — 通用 Figma 组件属性应用（code.ts，读 figmaPropertySnapshot.propertyMap）
```

**和 Utils 的区别**：Utils 是通用小函数，Skill 是有业务语义的完整任务包。`applyColorVariable` 是 Utils；`buildFormComponentFromPayload` 是 Skill。

**文件位置**：`engine/skills/*.skill.ts`

---

### E3 — Agentic Recovery（Agent 自愈）

**定义**：AI 遇到错误时，读取错误信息 → 推理原因 → 重新调用 Tool 修复，形成 Reason + Act 循环。这不是你需要写的代码，是 AI 在 good tooling 下的自然能力。

```
触发条件：Tool 返回包含语义的错误信息
AI 行为：thought → 找到原因 → 修正 payload → 重新 draw_table/apply_scene

例子：
- draw_table 返回 "columnWidths 总和 600 ≠ tableWidth 800，差值 200"
  AI 自动: thought: "修正 columnWidths" → 重新调用，补齐差值
- apply_scene 返回 "nodeId xxx 不存在"
  AI 自动: thought: "先查询节点" → discover → 重新提交
```

**如何启用**：
1. Tool 的错误信息要有语义，告诉 AI"哪里错了、差多少"
2. `renderNotes.commonErrors` 提前告知 AI 常见错误模式
3. 不需要写特殊代码 — AI 的 ReAct 能力在正确的 prompt + 准确的 spec 下自然触发

---

### 判断速查

| 我要写的是... | 它叫 | 放哪里 |
|-------------|------|--------|
| `setFillWidth(node)` | E0 Utils | `engine/skills/resolve/` 或 `code.ts` 内部 |
| `applyColorVariable(node, token)` | E0 Utils | `engine/skills/resolve/color.ts` |
| `draw_form` case handler | E1 Tool（的实现） | `App.tsx` action dispatch |
| `buildFormComponentFromPayload()` | E2 Skill | `engine/skills/form.skill.ts` |
| AI 遇错自动修复 | E3 Agentic Recovery | 无需写代码，靠好的 Tool 错误信息 |
| `renderNotes.commonErrors` | 给 AI 的 Spec | `registry.ts` |

---

## 六、主题可替换的实现方式

### 核心原则

**`code.ts` 里不允许出现任何 hex 颜色值。**

所有颜色通过两步解析：
1. `token key`（语义名，写在 registry）
2. `token key → variableRef + fallbackHex`（写在 theme 文件）

### 换主题的操作

```
theme/
  volcengine-design/    ← 当前主题
  ant/                  ← 备用主题
  custom/               ← 自定义主题
```

换主题 = 在 `theme/active.ts` 里换一行：`export { antTheme as activeTheme } from './ant'`。

### Registry 里只写 token key，不写实际值

```ts
// registry.ts — 只写 key，不写实际 variableRef
"colorVariableBindings": {
  "table.border":     { "enabled": true },
  "table.header-bg":  { "enabled": true },
  "card.bg":          { "enabled": true }
}

// theme/volcengine-design/colors.ts — 写实际值
"table.border":    { variableRef: "VariableID:xxx", fallbackHex: "#EAEDF1" },
"table.header-bg": { variableRef: "VariableID:yyy", fallbackHex: "#F7F8FA" },
"card.bg":         { variableRef: "VariableID:zzz", fallbackHex: "#FFFFFF" }
```

---

## 七、registry.ts 的字段职责

> registry.ts 的每个字段只做一件事，不重叠。

| 字段 | 职责 | 读者 |
|------|------|------|
| `params` | 组件参数定义和默认值 | Agent + 属性面板 |
| `slots` | 槽位结构约束 | Agent + 渲染引擎 |
| `constraints` | 组合规则约束 | 渲染引擎校验 |
| `capabilities` | 能力开关 | 属性面板 + 渲染引擎 |
| `figmaBinding` | Figma 节点映射方式 | 渲染引擎 |
| `runtime` | 尺寸/间距/圆角/布局等渲染规格 | **渲染引擎**（从 code.ts 迁入） |
| `renderNotes` | 渲染注意事项和常见错误 | **Agent**（新增） |
| `colorVariableBindings` | 颜色 token key 声明 | 渲染引擎（实际值在 theme） |
| `typographyBindings` | 字体 token key 声明 | 渲染引擎（实际值在 theme） |
| `figmaPropertySnapshot` | Figma library 组件的属性名映射 | 渲染引擎 + Agent |
| `prompts` | AI 选择/使用提示 | Agent |
| `migrations` | 版本迁移规则 | 渲染引擎向前兼容 |

**`runtime` 字段的完整子字段**：

`runtime` 负责所有"渲染时需要的数字和规则"，按组件类型取用对应子字段：

```ts
"runtime": {
  // ── 1. 自身尺寸规格（叶子组件 / Figma library 组件）──────────────
  "sizeMetrics": {
    // key 与 params.size 的 enumValues 一一对应
    "default": { "height": 32, "paddingX": 12, "paddingY": 5, "fontSize": 13, "cornerRadius": 4 },
    "large":   { "height": 36, "paddingX": 12, "paddingY": 7, "fontSize": 14, "cornerRadius": 4 }
  },
  "defaultSize": "default",

  // ── 2. 容器对子控件的布局规格（容器组件，如 form-field / form）────
  "layoutModes": {
    // key 与 params.layout（或 params.direction）的 enumValues 一一对应
    "vertical": {
      "direction":   "VERTICAL",    // Figma layoutMode
      "gap":         8,             // 字段之间的间距
      "paddingX":    0,
      "paddingY":    0
    },
    "horizontal": {
      "direction":   "HORIZONTAL",
      "gap":         16,            // 横向排列时字段间距更大
      "paddingX":    0,
      "paddingY":    0
    }
  },
  "defaultLayout": "vertical",

  // ── 3. 容器对子控件的默认行为（容器组件）────────────────────────
  "controlDefaults": {
    "widthMode":  "fill",   // 子控件默认撑满父容器宽度（'fill' | 'fixed'）
    "labelGap":   4         // label 与控件之间的间距
  },

  // ── 4. 容器按子控件类型决定的裁剪规则（容器组件）────────────────
  "controlClipRules": {
    "default": false,       // 大多数控件不裁剪
    "override": {
      "select":      true,  // 下拉框裁剪
      "textarea":    true,
      "inputnumber": true,
      "timepicker":  true
    }
  },

  // ── 5. 其他间距常量（按需添加）──────────────────────────────────
  "spacing": {
    "cellPaddingX": 12,
    "cellPaddingY": 0
  }
}
```

**选哪些子字段**取决于组件类型：

| 组件类型 | 用到的 runtime 子字段 |
|----------|----------------------|
| 叶子控件（input / button / tag） | `sizeMetrics`, `defaultSize` |
| 控件容器（form-field） | `controlDefaults`, `controlClipRules` |
| 布局容器（form / form-group） | `layoutModes`, `defaultLayout`, `spacing` |
| 复合组件（table） | `sizeMetrics`, `spacing` |

> **原则**：只写当前组件真正需要的子字段，不要把所有子字段都填进去。

---

## 八、两类组件的规范归属

> 项目里的组件分为两种，规范的写法和读法不同。搞清楚这个，就知道每条规范该放哪里。

### 类型 A：自定义组件（Custom Component）

**定义**：由渲染引擎从零用 Figma API 构建节点树的组件。例如 `form-field`、`table`、`form`。

**规范怎么写**：完全在 registry 里声明，渲染引擎按 registry 执行。

```
registry.runtime.sizeMetrics      → 自身尺寸
registry.runtime.layoutModes      → 布局方向和间距（横/纵向切换就改这里）
registry.runtime.controlDefaults  → 对子控件的默认要求（宽度模式等）
registry.runtime.controlClipRules → 对子控件的裁剪规则
registry.colorVariableBindings    → 颜色 token key
```

**渲染引擎怎么读**：`getRegistryRuntime(componentId)` 拿到上述数据，不含任何硬编码数字。

---

### 类型 B：Figma Library 组件（Figma Component）

**定义**：Figma 设计系统里已有的组件，通过 `componentKey` 创建实例，再通过 `setProperties()` 配置属性。例如 input、button、tag、select。

**核心特点**：这类组件的"外观"由 Figma 组件库控制，我们只能配置它开放的属性（variant、boolean property 等），不能直接改节点尺寸。

**规范怎么写**：

```
registry.figmaPropertySnapshot.propertyMap  → Figma 属性名 ↔ 我方 params 名的映射
registry.figmaPropertySnapshot.textNodeMap  → 哪个文本节点对应哪个 param
registry.runtime.sizeMetrics               → 各尺寸档位的实际像素高度（供父容器参考）
theme/volcengine-design/components.ts      → 组件 componentKey（属于主题，可替换）
```

**渲染引擎怎么读**：通过通用函数 `applyFigmaComponentProps(instance, componentId, params)` 驱动，不再为每个 Figma 组件单独写一个更新函数。

```ts
// 通用写法：
function applyFigmaComponentProps(instance, componentId, params) {
  const { propertyMap } = getComponentDefinition(componentId).figmaPropertySnapshot;
  const props: Record<string, any> = {};
  for (const [figmaPropName, binding] of Object.entries(propertyMap)) {
    const value = params[binding.sourceParam];
    if (value !== undefined) props[figmaPropName] = value;
  }
  instance.setProperties(props);
}
```

---

### 容器的布局模式（横向/纵向切换）

表单支持横向/纵向切换时，**排列方向和间距**属于"容器的布局规格"，写在容器组件（`form` 或 `form-group`）的 `runtime.layoutModes` 里：

```ts
// registry/components/form.ts
runtime: {
  layoutModes: {
    vertical: {
      direction: "VERTICAL",
      gap: 16,
      paddingX: 0,
      paddingY: 0
    },
    horizontal: {
      direction: "HORIZONTAL",
      gap: 24,
      paddingX: 0,
      paddingY: 0,
      labelWidth: 80
    }
  },
  defaultLayout: "vertical"
}
```

**为什么不写在 `params` 里**：`params.layout` 是"用户选的值"，`runtime.layoutModes` 是"这个值对应的渲染数字"。两者分离，换设计规范时只改 runtime，不动 params 定义。

---

### 一张归属速查表

| 规范内容 | 归属位置 | 理由 |
|----------|----------|------|
| input 各尺寸档位的高度 | `input` registry → `runtime.sizeMetrics` | input 自身属性，与放在哪无关 |
| form-field 子控件默认撑满宽度 | `form-field` registry → `runtime.controlDefaults.widthMode` | form-field 对子控件的布局要求 |
| form-field 按 controlType 决定是否裁剪 | `form-field` registry → `runtime.controlClipRules` | form-field 的渲染决策 |
| form 横/纵向切换的间距 | `form` registry → `runtime.layoutModes` | 容器的布局规格 |
| input 的 Figma 属性名（Size/State/…） | `input` registry → `figmaPropertySnapshot.propertyMap` | 固化"Figma 叫什么 vs 我们叫什么" |
| 组件库的 componentKey | `theme/volcengine-design/components.ts` | 属于主题，不同主题用不同组件库 |
| 颜色值 | `theme/volcengine-design/colors.ts` | 主题层，可整包替换 |

---

## 九、Spec 推送机制：分层按需发送

> 改造原则：**系统知道用户要做什么时，主动推送精准的那一层；AI 需要更深信息时，自己按需读取下一层。**

### 三层 Spec 定义

每个组件的规范按用途分三层，`read_specs` 可按层级返回：

```
Layer A — 选择层（index）
  发送内容：description + params 参数名列表（不含完整定义）
  触发时机：Plan 模式的任务规划阶段

Layer B — 生成层（params）← 当前默认
  发送内容：完整 params 定义 + Slots + renderNotes
  触发时机：AI 调用 read_specs，或系统意图明确时预推送

Layer C — 渲染层（runtime）
  发送内容：runtime（尺寸/间距/布局规格）+ figmaPropertySnapshot
  触发时机：AI 主动读取调试/渲染细节时
```

### 当前状态（三层均已实现）

`buildSpecsInfo` 接口：

```ts
buildSpecsInfo(ids: string[], options?: {
  level?: 'index' | 'params' | 'runtime',  // 默认 'params'
  cache?: Set<string>,
  forceRead?: boolean
})
```

三层的实际输出内容：

- `level='index'`：`ParamKeys: [...]`（参数名列表，供规划阶段快速查阅）
- `level='params'`（默认）：`Params: {...}` + `Slots: {...}` + `RenderNotes: {...}`
- `level='runtime'`：`Runtime: {...}` + `FigmaPropertySnapshot: {...}`（含 propertyMap、textNodeMap）

其他已完成：
- App.tsx 里所有 ActionHint 硬编码块已删除，全部迁移到各组件 `renderNotes`
- AI 收到的 spec 不含 `capabilities`、`figmaBinding` 原始 JSON

### Phase 2：AI 主动按需读取（未来规划）

目标：复杂多组件任务，AI 在执行计划时自己决定读哪层：

```
用户：生成一个带筛选和列表的数据页面
    ↓
AI 分析意图，规划任务：[筛选器, 表格, 分页]
    ↓
执行筛选器任务前：read_specs(['filter-group'], level='params')
执行表格任务前：  read_specs(['table'], level='params')        ← 已缓存则跳过
执行复杂调试时：  read_specs(['table'], level='runtime')       ← 主动拉取渲染层
```

---

### renderNotes 字段规范

renderNotes 是**"把 vibe coding 踩过的坑固化下来"**的地方。

**写法规范**：

```ts
renderNotes: {
  actionHint: "新建表格必须用 draw_tabl，禁止用 apply_scene 输出子树",
  paramRules: [
    "columnWidths 总和必须等于 tableWidth，否则出现错位",
    "columnTypes 长度必须和 headers 长度一致"
  ],
  commonErrors: [
    "draw_tabl payload 禁止包含 children/nodeId 等树字段",
  ],
  agentHints: [
    "行数不足时系统自动补空行到 minRowCount=10"
  ]
}
```

**维护规则**：
- 每次发现 AI 反复犯某个错，立刻写进 `commonErrors`，而不是去 App.tsx 加 if 判断
- `actionHint` 只写"用哪个 action"的决策规则，不写参数细节（参数细节在 params 定义里）
- renderNotes 控制在 ~200 token 以内，超出则拆成两个组件分别描述

---

## 十、文档结构与职责

> 现有文档已经很多，这里明确每份文档的唯一职责，避免重复。

### 真源文档（Source of Truth）

改规则只改这里，其他地方只能链接。

| 文档 | 职责 | 位置 |
|------|------|------|
| **本文档** | 指导思想、架构决策、所有文档的元规则 | `docs/NORTH_STAR.md` |
| `AI_RUNTIME_SPEC_CODING_CN.md` | 运行时 AI 的动作规则（what to do） | `docs/for-runtime-ai/` |
| `SPEC_REGISTRY_CN.md` | Registry 数据结构规范 | `docs/for-dev-ai/coding-specs/` |
| `SPEC_RENDER_ENGINE_CN.md` | 渲染引擎执行规范 | `docs/for-dev-ai/coding-specs/` |
| `SPEC_PROTOCOL_SCENE_CN.md` | Scene 协议字段规范 | `docs/for-runtime-ai/specs/` |
| `SPEC_AGENT_PLANNER_CN.md` | 计划队列规范 | `docs/for-runtime-ai/specs/` |

### 说明文档（参考，不写规则）

| 文档 | 职责 |
|------|------|
| `IMPLEMENTATION_SUMMARY_CN.md` | 项目整体现状说明（不写规则） |
| `DOCS_LOGIC_CN.md` | 文档之间的关系说明 |
| `DESIGNER_SPEC_WORKFLOW_CN.md` | 设计师如何维护 spec 的流程 |
| `MANUAL_TEST_FLOW_CN.md` | 测试流程 |

### 维护规则

1. **同一规则只在一个真源出现**，其他地方只链接。
2. **本文档不写字段细节**，字段细节在对应真源文档里。
3. **发现矛盾时以本文档为准**，然后修正矛盾的那份文档。
4. **新能力接入时，先更新本文档的架构部分**，再动代码。

---

## 十一、待完成事项

> 顺序即优先级。

### Step 3：renderNotes 持续填充（进行中）

每次 vibe coding 发现新的 AI 犯错模式，立刻补进对应组件的 `renderNotes.commonErrors`。
当前已覆盖：table / form / form-field / figma-component / filter-group / checkbox-group。
优先级：table > form > button/tag（按出错频率排序）。

### Step 7：多主题切换（未来）

支持运行时切换：`activeTheme = antTheme`。前提：theme 层完整，无旧文件残留。

### Step 8：Phase 2 — AI 自主选层读取（未来）

`buildSpecsInfo` 三层接口均已实现。Phase 2 目标是让 AI 在多步任务中自主决定读哪层，而不是由调用方显式指定 level。前提：Step 3 全部完成（registry 规范准确，AI 读到的是真实数据）。

---

## 十二、决策日志

> 记录重要架构决策，避免以后再绕回来争论。

### 2026-03-22：确立 Registry 为唯一事实来源

**背景**：vibe coding 过程中规范散落三处（registry/code/prompt），改了一处不知道另一处有没有跟上。

**决策**：所有设计规范只在 Registry 定义一次。`code.ts` 只读 registry，不重新定义规范数字。

### 2026-03-22：Skill 分两种形态，不强制统一

**决策**：不强制统一。需要 AI 判断的用 `renderNotes`（文档型），不需要判断的用读 registry 的函数（代码型）。判断标准：是否需要 AI 理解意图。

### 2026-03-22：主题替换通过 theme 文件整包替换

**决策**：registry 只存 token key（语义），不存 variableRef 和 fallbackHex。实际值放在 theme 文件里。换主题只换 theme 文件，registry 不动。

### 2026-03-22：runtime 按组件类型分子字段，不强制统一格式

**决策**：`runtime` 字段按需取用子字段：叶子控件 → `sizeMetrics`；控件容器 → `controlDefaults` + `controlClipRules`；布局容器 → `layoutModes` + `defaultLayout`。

**关键判断**：`params.layout = 'horizontal'` 是"用户选的值"，`runtime.layoutModes.horizontal.gap = 24` 是"这个值对应的渲染数字"。前者在 params，后者在 runtime。

### 2026-03-22：Figma library 组件属性映射写入 figmaPropertySnapshot.propertyMap

**背景**：`updateInputControlTemplateInPlace` 等函数把 Figma 属性名硬写在函数体里，无处查阅且容易出错（switch 的 `'Status 状态'` 实际不存在，正确是 `'Checked 开关'`）。

**决策**：在 registry 的 `figmaPropertySnapshot.propertyMap` 里声明映射。渲染引擎改用通用函数 `applyFigmaComponentProps(instance, componentId, params)` 驱动。input / select / switch 已完成。checkbox-group / radio-group 保留原有写法（动态 items，不适合纯映射）。

### 2026-03-22：执行层概念分类（E0–E3）

**决策**：采用四层命名（见第五节）：E0 Utils / E1 Tool / E2 Skill / E3 Agentic Recovery。
文档（NORTH_STAR.md §5 + FILE_STRUCTURE.md §5）和系统 prompt（App.tsx）均已更新术语。

### 2026-03-22：Skill 层落地（form.skill.ts + table.skill.ts）

**决策**：建立 `src/engine/skills/` 目录，form 和 table 的完整执行逻辑从 App.tsx 迁出，原有 ~1500 行闭包函数全部删除。App.tsx 的 draw_form / draw_tabl case handler 只保留 dispatch 逻辑。

### 2026-03-22：Spec 推送分两阶段，Phase 1 系统主动推送，Phase 2 AI 主动读取

**决策**：Phase 1（当前）系统识别意图主动推 `params + renderNotes`；Phase 2（未来）AI 主动按需读层。App.tsx 里所有 ActionHint 硬编码迁移到各组件 `renderNotes`，App.tsx 只做统一序列化。

### 2026-03-22：Spec 序列化格式从 JSON 改为 Markdown

**决策**：params-level 输出改为 Markdown 表格 + bullet points，减少约 40-60% token，格式更易读。

### 2026-03-22：表单按钮区作为独立 footer.actions，不放进 rows

**决策**：与表格的 `footer.pagination` 一致，表单操作按钮通过 `footer.actions` 独立声明，追加在所有字段行之后。

### 2026-03-22：表单默认单列，禁止在 rows 子数组放多个字段（除非用户明确要求）

**决策**：写入 `renderNotes.paramRules`，AI 不再自作主张双列排列。
