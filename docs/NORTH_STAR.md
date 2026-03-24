# Figma UI Agent — 北极星文档

> **这是唯一的指导思想文档。**
> 当你不知道"应该怎么做"、"这个东西放哪里"、"这两个文档哪个对"时，答案在这里。
> 其他所有文档都是这份文档某一个方面的细化，不得与本文档矛盾。

---

## 一、这个项目是什么

一个 Figma 插件。设计师用自然语言描述需求，AI Agent 自动绘制出**符合设计规范**的 UI 组件（表格、表单、图表等）。

**核心价值**：AI 不是在"猜"设计规范，而是在"读规范、执行规范"。

---

## 二、指导思想：Registry 是唯一事实来源

**一句话原则：所有设计规范只在 Registry 里定义一次，其他地方只读取，不重复定义。**

这意味着：

| 过去 | 目标 |
|------|------|
| `code.ts` 里写死 `headerHeight = 40` | `registry` 里写，`code.ts` 读 |
| `code.ts` 里写死 `cornerRadius = 6` | `registry` 里写，`code.ts` 读 |
| `code.ts` 里散落 `'#1664FF'` | `theme` 层统一管，`code.ts` 不出现 hex |
| Agent 靠 prompt 猜默认值 | Agent 读 `read_specs` 看到真实默认值 |
| 换主题需要全文搜索 | 替换一个 theme 文件 |
| "生效到哪里"不知道 | 改 registry → 渲染自动跟随 |

---

## 三、架构：三层分离

> 每一层的具体文件结构、放什么、禁止什么，见 [FILE_STRUCTURE.md](FILE_STRUCTURE.md)。

### 整体流程（从用户说话到 Figma 落地）

```
设计师说：「帮我画一个用户管理表格」
        │
        ▼
   ┌─────────────┐
   │ VED UI Agent│  理解需求，规划步骤，决定调用哪些工具
   └──────┬──────┘
          │  读规范：「table 组件有哪些参数？」
          │  ──────────────────────────────────────────────────────►  ┌──────────────────────────────────────────┐
          │                                                            │  规范库（只读，AI 和执行层共同参考）          │
          │  ◄──────────────────────────────────────────────────────  │                                          │
          │  获得规范：列宽、行高、支持的 columnType…                    │  Layer 1 — 组件规范（registry/）           │
          │                                                            │    每个组件「是什么」：参数定义、尺寸规格、   │
          │  输出指令：draw_table({ headers, rows, … })                │    渲染注意事项（AI 可读）                  │
          │                                                            │                                          │
          ▼                                                            │  Layer 2 — 主题包（theme/）               │
   ┌─────────────────────────────────────────────────────┐            │    「用哪套视觉」：颜色 token、间距数值、     │
   │  执行层（Layer 3 — engine/）                          │◄──────────│    Figma 组件 key                        │
   │                                                     │  读取数值   └──────────────────────────────────────────┘
   │  接口层：接收 AI 指令，分发给对应的技能包               │
   │    draw_table → table.skill.ts                      │
   │    draw_form  → form.skill.ts                       │
   │                                                     │
   │  技能包：封装完整业务逻辑，组装节点结构，不直接操作 Figma │
   │  工具函数：解析尺寸、应用颜色、计算布局                  │
   └───────────────────────┬─────────────────────────────┘
                           │  postMessage（跨线程）
        ═══════════════════╪═════════════════════════════════════════
        Figma 沙盒边界       │   上方 = 网页环境  /  下方 = Figma 专属环境
        ═══════════════════╪═════════════════════════════════════════
                           ▼
   ┌─────────────────────────────────────────────────────┐
   │  主线程（code.ts）— 唯一能直接操作 Figma API 的地方   │
   │                                                     │
   │  解析指令 → 递归渲染节点树 → 应用组件属性              │
   └───────────┬──────────────────────┬──────────────────┘
               │                      │
               ▼                      ▼
   ┌──────────────────┐    ┌─────────────────────────┐
   │  代码自绘          │    │  Figma 组件库实例         │
   │  从零构建节点树     │    │  通过 componentKey 导入   │
   │  table / form /  │    │  button / tag / input /  │
   │  layout 等        │    │  icon 等设计系统组件       │
   └──────────────────┘    └─────────────────────────┘
               └──────────────────────┘
                        Figma 画布
```

### 三层各自的职责

| 层 | 存放什么 | 谁来读 | 换了会怎样 |
|----|---------|--------|-----------|
| **Layer 1 — 组件规范** | 每个组件的参数、尺寸规格、渲染注意事项 | AI（决策）+ 执行层（执行）| 所有调用方自动跟随，无需改其他代码 |
| **Layer 2 — 主题包** | 颜色值、间距数值、Figma 组件 key | 执行层（渲染时取值）| 整包替换即可换一套视觉风格 |
| **Layer 3 — 执行层** | 如何把 AI 指令转成 Figma 操作的逻辑 | 由 AI 指令触发 | 业务逻辑变更只改这里 |

**核心原则**：Layer 1 和 Layer 2 只存"规则和数值"，不包含任何执行逻辑。执行逻辑全在 Layer 3。

---

## 四、执行层概念分类（E0–E3）

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

**和 Utils 的区别**：Utils 是通用小函数，Skill 是有业务语义的完整任务包。

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
| `renderNotes.commonErrors` | 给 AI 的 Spec | `registry/components/*.ts` |

---

## 五、主题可替换的实现方式

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
// registry — 只写 key，不写实际 variableRef
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

## 六、registry 的字段职责

> 每个字段只做一件事，不重叠。

| 字段 | 职责 | 读者 |
|------|------|------|
| `params` | 组件参数定义和默认值 | Agent + 属性面板 |
| `slots` | 槽位结构约束 | Agent + 渲染引擎 |
| `constraints` | 组合规则约束 | 渲染引擎校验 |
| `capabilities` | 能力开关 | 属性面板 + 渲染引擎 |
| `figmaBinding` | Figma 节点映射方式 | 渲染引擎 |
| `runtime` | 尺寸/间距/圆角/布局等渲染规格 | 渲染引擎 |
| `renderNotes` | 渲染注意事项和常见错误 | Agent |
| `colorVariableBindings` | 颜色 token key 声明 | 渲染引擎（实际值在 theme） |
| `typographyBindings` | 字体 token key 声明 | 渲染引擎（实际值在 theme） |
| `figmaPropertySnapshot` | Figma library 组件的属性名映射 | 渲染引擎 + Agent |
| `prompts` | AI 选择/使用提示 | Agent |
| `migrations` | 版本迁移规则 | 渲染引擎向前兼容 |

**`runtime` 字段的完整子字段**：

```ts
"runtime": {
  // ── 1. 自身尺寸规格（叶子组件 / Figma library 组件）──────────────
  "sizeMetrics": {
    "default": { "height": 32, "paddingX": 12, "paddingY": 5, "fontSize": 13, "cornerRadius": 4 },
    "large":   { "height": 36, "paddingX": 12, "paddingY": 7, "fontSize": 14, "cornerRadius": 4 }
  },
  "defaultSize": "default",

  // ── 2. 容器对子控件的布局规格（容器组件，如 form-field / form）────
  "layoutModes": {
    "vertical":   { "direction": "VERTICAL",   "gap": 8,  "paddingX": 0, "paddingY": 0 },
    "horizontal": { "direction": "HORIZONTAL",  "gap": 16, "paddingX": 0, "paddingY": 0 }
  },
  "defaultLayout": "vertical",

  // ── 3. 容器对子控件的默认行为（容器组件）────────────────────────
  "controlDefaults": {
    "widthMode": "fill",   // 'fill' | 'fixed'
    "labelGap":  4
  },

  // ── 4. 容器按子控件类型决定的裁剪规则（容器组件）────────────────
  "controlClipRules": {
    "default": false,
    "override": { "select": true, "textarea": true }
  },

  // ── 5. 其他间距常量（按需添加）──────────────────────────────────
  "spacing": { "cellPaddingX": 12, "cellPaddingY": 0 }
}
```

**选哪些子字段**取决于组件类型：

| 组件类型 | 用到的 runtime 子字段 |
|----------|----------------------|
| 叶子控件（input / button / tag） | `sizeMetrics`, `defaultSize` |
| 控件容器（form-field） | `controlDefaults`, `controlClipRules` |
| 布局容器（form / form-group） | `layoutModes`, `defaultLayout`, `spacing` |
| 复合组件（table） | `sizeMetrics`, `spacing` |

---

## 七、两类组件的规范归属

### 类型 A：自定义组件（Custom Component）

**定义**：由渲染引擎从零用 Figma API 构建节点树的组件。例如 `form-field`、`table`、`form`。

**规范怎么写**：完全在 registry 里声明，渲染引擎按 registry 执行。

```
registry.runtime.sizeMetrics      → 自身尺寸
registry.runtime.layoutModes      → 布局方向和间距
registry.runtime.controlDefaults  → 对子控件的默认要求
registry.runtime.controlClipRules → 对子控件的裁剪规则
registry.colorVariableBindings    → 颜色 token key
```

---

### 类型 B：Figma Library 组件（Figma Component）

**定义**：Figma 设计系统里已有的组件，通过 `componentKey` 创建实例，再通过 `setProperties()` 配置属性。例如 input、button、tag、select。

**规范怎么写**：

```
registry.figmaPropertySnapshot.propertyMap  → Figma 属性名 ↔ 我方 params 名的映射
registry.figmaPropertySnapshot.textNodeMap  → 哪个文本节点对应哪个 param
registry.runtime.sizeMetrics               → 各尺寸档位的实际像素高度（供父容器参考）
theme/volcengine-design/components.ts      → 组件 componentKey（属于主题，可替换）
```

**渲染引擎怎么读**：通过通用函数 `applyFigmaComponentProps(instance, componentId, params)` 驱动。

---

### 一张归属速查表

| 规范内容 | 归属位置 |
|----------|----------|
| input 各尺寸档位的高度 | `input` registry → `runtime.sizeMetrics` |
| form-field 子控件默认撑满宽度 | `form-field` registry → `runtime.controlDefaults.widthMode` |
| form-field 按 controlType 决定是否裁剪 | `form-field` registry → `runtime.controlClipRules` |
| form 横/纵向切换的间距 | `form` registry → `runtime.layoutModes` |
| input 的 Figma 属性名（Size/State/…） | `input` registry → `figmaPropertySnapshot.propertyMap` |
| 组件库的 componentKey | `theme/volcengine-design/components.ts` |
| 颜色值 | `theme/volcengine-design/colors.ts` |

---

## 八、Spec 推送机制：分层按需发送

> 改造原则：**系统知道用户要做什么时，主动推送精准的那一层；AI 需要更深信息时，自己按需读取下一层。**

每个组件的规范按用途分三层，`read_specs` 可按层级返回：

```
Layer A — 选择层（index）
  发送内容：description + params 参数名列表
  触发时机：Plan 模式的任务规划阶段

Layer B — 生成层（params）← 当前默认
  发送内容：完整 params 定义 + Slots + renderNotes
  触发时机：AI 调用 read_specs，或系统意图明确时预推送

Layer C — 渲染层（runtime）
  发送内容：runtime + figmaPropertySnapshot
  触发时机：AI 主动读取调试/渲染细节时
```

三层均已实现，详见 `buildSpecsInfo` 接口（App.tsx）。

---

### renderNotes 字段规范

renderNotes 是**"把 vibe coding 踩过的坑固化下来"**的地方。

```ts
renderNotes: {
  actionHint: "新建表格必须用 draw_tabl，禁止用 apply_scene 输出子树",
  paramRules: [
    "columnWidths 总和必须等于 tableWidth，否则出现错位",
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
- renderNotes 控制在 ~200 token 以内，超出则拆成两个组件分别描述

---

## 九、文档结构与职责

### 真源文档（Source of Truth）

| 文档 | 职责 | 位置 |
|------|------|------|
| **本文档** | 指导思想、架构决策、所有文档的元规则 | `docs/NORTH_STAR.md` |
| `AI_RUNTIME_SPEC_CODING_CN.md` | 运行时 AI 的动作规则（what to do） | `docs/for-runtime-ai/` |
| `SPEC_REGISTRY_CN.md` | Registry 数据结构规范 | `docs/for-dev-ai/coding-specs/` |
| `SPEC_RENDER_ENGINE_CN.md` | 渲染引擎执行规范 | `docs/for-dev-ai/coding-specs/` |
| `SPEC_PROTOCOL_SCENE_CN.md` | Scene 协议字段规范 | `docs/for-runtime-ai/specs/` |
| `SPEC_AGENT_PLANNER_CN.md` | 计划队列规范 | `docs/for-runtime-ai/specs/` |

### 维护规则

1. **同一规则只在一个真源出现**，其他地方只链接。
2. **本文档不写字段细节**，字段细节在对应真源文档里。
3. **发现矛盾时以本文档为准**，然后修正矛盾的那份文档。
4. **新能力接入时，先更新本文档的架构部分**，再动代码。

---

## 十、待完成事项

| 项目 | 说明 |
|------|------|
| renderNotes 持续填充 | 每次 vibe coding 发现新的 AI 犯错模式，立刻补进对应组件的 `renderNotes.commonErrors` |
| Phase 2：AI 自主选层读取 | `buildSpecsInfo` 三层已实现；未来让 AI 在多步任务中自主决定读哪层，而不是调用方显式指定 level |
| 多主题切换 | 支持运行时切换 `activeTheme`，前提是 theme 层完整无旧文件残留 |

---

## 十一、决策日志

> 记录重要架构决策，避免以后再绕回来争论。

### 2026-03-22：确立 Registry 为唯一事实来源

**背景**：vibe coding 过程中规范散落三处（registry/code/prompt），改了一处不知道另一处有没有跟上。

**决策**：所有设计规范只在 Registry 定义一次。`code.ts` 只读 registry，不重新定义规范数字。

### 2026-03-22：Skill 分两种形态，不强制统一

**决策**：不强制统一。需要 AI 判断的用 `renderNotes`（文档型），不需要判断的用读 registry 的函数（代码型）。判断标准：是否需要 AI 理解意图。

### 2026-03-22：主题替换通过 theme 文件整包替换

**决策**：registry 只存 token key（语义），不存 variableRef 和 fallbackHex。实际值放在 theme 文件里。换主题只换 theme 文件，registry 不动。

### 2026-03-22：runtime 按组件类型分子字段，不强制统一格式

**决策**：`runtime` 字段按需取用子字段。`params.layout = 'horizontal'` 是"用户选的值"，`runtime.layoutModes.horizontal.gap = 24` 是"这个值对应的渲染数字"。前者在 params，后者在 runtime。

### 2026-03-22：Figma library 组件属性映射写入 figmaPropertySnapshot.propertyMap

**决策**：在 registry 的 `figmaPropertySnapshot.propertyMap` 里声明映射。渲染引擎改用通用函数 `applyFigmaComponentProps(instance, componentId, params)` 驱动。

### 2026-03-22：执行层概念分类（E0–E3）

**决策**：采用四层命名（见第四节）：E0 Utils / E1 Tool / E2 Skill / E3 Agentic Recovery。

### 2026-03-22：Skill 层落地（form.skill.ts + table.skill.ts）

**决策**：建立 `src/engine/skills/` 目录，form 和 table 的完整执行逻辑从 App.tsx 迁出，原有 ~1500 行闭包函数全部删除。App.tsx 的 draw_form / draw_tabl case handler 只保留 dispatch 逻辑。

### 2026-03-22：Spec 推送分两阶段，Phase 1 系统主动推送，Phase 2 AI 主动读取

**决策**：Phase 1（当前）系统识别意图主动推 `params + renderNotes`；Phase 2（未来）AI 主动按需读层。

### 2026-03-23：spec.component-token-map.ts 迁移至 registry/

**决策**：将 `src/spec.component-token-map.ts` 迁移到 `src/registry/component-token-map.ts`，旧文件删除。App.tsx 改用新路径导入。

**决策**：所有 Figma library 组件 token 统一使用 `lib-{category}-{name}` 格式（如 `lib-data-input-datepicker`）。代码中禁止使用 `library.xxx.yyy` 点分格式。源文件全部完成替换，`component-library-tokens.ts` 中的 `library.xxx` 别名已删除。
