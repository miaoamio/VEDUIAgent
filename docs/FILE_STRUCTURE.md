# 文件结构规范

> 本文档回答一个问题：**这段代码/这份规范，应该放在哪个文件里？**
>
> 本文档是 [NORTH_STAR.md](NORTH_STAR.md) 三层架构的落地实现，与之配套阅读。
>
> **注意**：本文档同时描述「当前实际状态」和「目标架构」。标注 `【目标】` 的部分为规划中尚未实现的结构。

---

## 一、整体目录结构

### 当前实际结构

```
src/
├── registry.ts                ← Layer 1（当前）：所有组件定义在单一文件（5300 行）
│
├── registry/                  ← ✅ 目录骨架已建，但尚未拆分组件定义
│   ├── index.ts               ← 仅转发 export，指向 registry.ts
│   ├── registry.types.ts      ← 占位文件（空）
│   ├── registry.loader.ts     ← 占位文件（空）
│   ├── registry.helpers.ts    ← 占位文件（空）
│   └── components/
│       └── index.ts           ← 占位文件（空），各组件文件尚未创建
│
├── theme/                     ← ✅ Layer 2: 主题包（已完成）
│   ├── types.ts                  Theme / ColorTheme / SpacingTheme / ComponentsTheme 类型
│   ├── active.ts                 当前激活主题导出（换主题改这一行）
│   └── volcengine-design/        VOLCENGINE DESIGN 主题（当前默认）
│       ├── index.ts               合并导出
│       ├── colors.ts              color token → variableRef + fallbackHex
│       ├── spacing.ts             圆角/间距/字体尺寸（SpacingTheme 结构）
│       └── components.ts          Figma 组件 key（ComponentsTheme，125+ 组件）
│
├── engine/
│   ├── applyCreate.ts / applyEnvelope.ts / applyPatch.ts
│   ├── operationExecutor.ts / renderSceneNode.ts / ...
│   └── skills/                ← ✅ 执行层 Skill 目录（已建立）
│       ├── block.helpers.ts   ← ✅ 共用 Utils（isObject / getBlockSource / toButtonFromItem / ...）
│       ├── form.skill.ts      ← ✅ Skill: buildFormComponentFromPayload()（draw_form 完整逻辑）
│       └── table.skill.ts     ← ✅ Skill: buildTableComponentFromPayload()（draw_tabl 完整逻辑）
│
├── App.tsx                    ← draw_form/draw_tabl handler 已改为调用 skills；原闭包函数已清除
├── code.ts                    ← 插件主线程（Figma API 调用）
│
├── theme.color-tokens.ts      ← 颜色 token（已被 theme/volcengine-design/colors.ts 取代，待清理）
├── theme.component-tokens.ts  ← 组件 token（已被 theme/volcengine-design/components.ts 取代；form.skill.ts 仍引用用于 token 校验，待替换）
├── theme.component-library-tokens.ts ← 已合并入 components.ts，待清理
│
├── protocol/ / ui/ / metadata.ts / figmaComponent.ts / ...（不变）
└── ui.html / ui.tsx / ai-chart-ui.html
```

### 目标结构（规划中）

```
src/
├── registry/                  ← 【TODO】Layer 1: 将 registry.ts 拆分为 components/ 下每组件独立文件
│   ├── index.ts
│   ├── registry.types.ts      ← 【TODO】迁入类型定义
│   ├── registry.loader.ts     ← 【TODO】迁入 loadRegistry / buildSpecsInfo 等
│   ├── registry.helpers.ts    ← 【TODO】迁入 getRegistryRuntime / getComponentDefinition 等
│   └── components/
│       ├── table.ts / form.ts / chart.ts / button.ts / ...  ← 【TODO】各组件独立文件
│
├── theme/                     ← ✅ 已完成（见当前结构）
│
├── engine/skills/             ← 执行层（持续建设中）
│   ├── block.helpers.ts       ← ✅ 已完成
│   ├── form.skill.ts          ← ✅ 已完成
│   ├── table.skill.ts         ← ✅ 已完成
│   └── resolve/               ← 【TODO】细粒度 Utils（从 code.ts 迁入）
│       ├── size.ts            ← 【TODO】getSizeMetrics(componentId, size)
│       ├── color.ts           ← 【TODO】applyColorVariable(node, token)
│       └── layout.ts          ← 【TODO】setFillWidth(node)
│
├── App.tsx / code.ts          ← 目标：精简到只做 dispatch 和 Figma API 调用
```

---

## 二、Layer 1 — registry.ts（结构规范）

### 当前状态

所有组件定义集中在 `registry.ts`（单文件）。目标是拆分为 `registry/components/` 下每组件独立文件，但尚未执行。

### 每个组件定义包含的字段（当前和目标结构相同）

```
params          组件参数及默认值
slots           槽位结构
constraints     约束规则
capabilities    能力开关
figmaBinding    Figma 节点映射
runtime         渲染规格（尺寸/间距/圆角，从 code.ts 迁入的目标位置）
renderNotes     给 Agent 读的渲染注意事项
colorVariableBindings   只写 token key，不写实际值
typographyBindings      只写 token key，不写实际值
figmaPropertySnapshot   Figma 组件属性快照
prompts         AI 选择/使用提示
migrations      版本迁移规则
```

### runtime 字段的目标写法

```ts
// registry.ts 中（目标：未来拆分到 registry/components/table.ts）
runtime: {
  sizeMetrics: {
    mini:    { height: 32, paddingX: 8,  paddingY: 4,  fontSize: 12, cornerRadius: 4 },
    default: { height: 40, paddingX: 12, paddingY: 8,  fontSize: 13, cornerRadius: 4 },
    medium:  { height: 48, paddingX: 12, paddingY: 10, fontSize: 14, cornerRadius: 4 },
    large:   { height: 56, paddingX: 16, paddingY: 12, fontSize: 14, cornerRadius: 4 },
  },
  defaultSize: 'default',
  spacing: {
    cellPaddingX: 12,
    cellPaddingY: 0,
  }
}
```

`code.ts` 里的 `TABLE_DEFAULT_HEADER_HEIGHT = 40` 等常量的迁移目标是从 registry 读取，尚未完成。

---

## 三、Layer 2 — theme/（主题包）

### 核心原则

**registry 里只写 token key（语义名），theme 里写实际值。**

```
registry 写：  "table.border"  （语义，不会变）
theme 写：     "table.border" → variableRef + fallbackHex  （实现，可以换）
```

### theme/active.ts — 唯一的切换点

```ts
// src/theme/active.ts
// 换主题只改这一行
export { volcengineDesignTheme as activeTheme } from './volcengine-design';
```

### theme/volcengine-design/colors.ts 的格式

```ts
// src/theme/volcengine-design/colors.ts
import type { ColorTheme } from '../types';

export const volcengineDesignColors: ColorTheme = {
  'table.border':         { variableRef: 'VariableID:xxx/174345:560', fallbackHex: '#EAEDF1' },
  'table.header-bg':      { variableRef: 'VariableID:yyy/174345:562', fallbackHex: '#F7F8FA' },
  // ...
};
```

### theme/volcengine-design/spacing.ts 的实际格式

```ts
// src/theme/volcengine-design/spacing.ts
export interface SpacingTheme {
  cornerRadius: {
    small: number;    // 2
    default: number;  // 4
    medium: number;   // 8
    large: number;    // 16
    circle: number;   // 9999
  };
  spacing: { xs: 4; sm: 8; md: 12; lg: 16; xl: 24; xxl: 32 };
  fontSize:   { xs: 10; sm: 12; md: 13; lg: 14; xl: 16; xxl: 20 };
  lineHeight: { tight: 1.2; normal: 1.5; loose: 1.8 };
}
```

调用方通过 `activeTheme.spacing.cornerRadius.default` 读取，不再在 code.ts 里硬编码数字。

### theme/volcengine-design/components.ts 的格式

```ts
// src/theme/volcengine-design/components.ts
export type ComponentsTheme = Record<string, string>;

export const volcengineDesignComponents: ComponentsTheme = {
  // token key → Figma componentKey（hash）
  'table-header-main':       '3361bff9b5e21071cb4fb3b86caa40a6709674ac',
  'lib-data-input-input':    'f04bea11a4ef73f626b7402aac670a94ad32faf0',
  // 共 125+ 条目（26 个表格组件 + 99 个通用库组件）
};
```

### 现有 theme.*.ts 文件的迁移状态

| 现在 | 目标位置 | 状态 |
|------|--------|------|
| `theme.color-tokens.ts` | `theme/volcengine-design/colors.ts` | ✅ 已完成，旧文件待清理 |
| `theme.component-tokens.ts` | `theme/volcengine-design/components.ts` | ✅ 渲染引擎已迁移；`form.skill.ts` 仍引用用于 token 校验（待替换为 `activeTheme.components` 查询），旧文件仅供过渡期使用 |
| `theme.component-library-tokens.ts` | `theme/volcengine-design/components.ts`（已合并） | ✅ 已完成，旧文件待清理 |
| `theme.typography-tokens.ts` | `theme/volcengine-design/typography.ts` | ✅ 已完成 |
| `tag.fallback.ts` | `theme/volcengine-design/tag-fallback.ts` | 🔲 待迁移 |
| `spec.component-token-map.ts` | `registry/component-token-map.ts` | 🔲 待迁移 |

> **迁移进度**：`code.ts` 和 `renderSceneNode.ts` 已完全迁移到 `activeTheme.components`，不再使用 `resolveComponentTokenProfile()`。App.tsx 的 admin UI 面板（token 浏览器）仍引用旧文件，待 App.tsx 完成迁移后清理。

---

## 四、Spec 推送机制：三层按需发送

### buildSpecsInfo 接口（App.tsx，已实现）

```ts
buildSpecsInfo(ids: string[], options?: {
  level?: 'index' | 'params' | 'runtime',  // 默认 'params'
  cache?: Set<string>,
  forceRead?: boolean
})
```

三层输出格式（均为 Markdown）：

| Level | 输出格式 | 用途 |
|-------|---------|------|
| `index` | `**Params:** key1, key2, ...` | 规划阶段：快速了解组件有哪些参数 |
| `params`（默认） | Params 表格 + Slots 行 + RenderNotes bullets + Usage/Examples | 生成阶段：完整生成所需信息 |
| `runtime` | Runtime JSON + FigmaPropertySnapshot JSON | 调试/渲染阶段：底层尺寸和属性映射 |

**params level 输出格式示例：**
```markdown
## Component: form
> 自定义表单容器...

**Params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| layout | vertical \| horizontal | vertical | 表单布局方式 |
...

**RenderNotes:**
- **Action:** 新建表单用 draw_form...
- **Rules:** layout: vertical（默认）| horizontal | ...
- **Errors:** 按钮放进 rows | ...

**Usage:**
## draw_form 使用规则
...
```

当前调用方需显式指定 level。Phase 2 目标：AI 自主选层（见 NORTH_STAR.md）。

### 表单 Spec 预推送（当用户 prompt 包含"表单"关键词时）

```ts
// 仅推送 form + form-field（精简，去掉 form-row/input/select）
buildSpecsInfo(["form", "form-field"], { level: "params" })
```

精简原则：form-row 不需要手动创建（draw_form 自动处理）；input/select 的完整 spec 对 draw_form 来说是噪音，rows 里用 componentId 直接指定即可。

---

## 五、执行层 — 概念分类与文件映射

> 见 [NORTH_STAR.md 第五节](NORTH_STAR.md) 的完整定义。下面只列文件归属。

### 四层概念对应文件

| 层级 | 概念 | 当前位置 | 目标位置 | 状态 |
|------|------|---------|---------|------|
| 0 | Utils / Helpers（工具函数） | `code.ts` 内部散落 / `App.tsx` 闭包 | `engine/skills/resolve/*.ts` | 🔲 待迁移（block.helpers.ts 已建） |
| 1 | Tool / Action（动作实现） | `App.tsx` action dispatch switch/case | `App.tsx`（精简后只做 dispatch） | 🔲 进行中 |
| 2 | Skill（技能包） | `App.tsx` 内部大函数 | `engine/skills/*.skill.ts` | ✅ form.skill.ts 已完成；table 待迁移 |
| 3 | Agentic Recovery（自愈规则） | — | `registry.ts` 各组件 `renderNotes.commonErrors` | ✅ 各组件已填充 |

### 目标目录结构

```
engine/skills/
├── block.helpers.ts       ← ✅ 已完成：共用 Utils（isObject / getBlockSource / toButtonFromItem / buildHeaderSectionChildren / ...）
├── form.skill.ts          ← ✅ 已完成：Skill: buildFormComponentFromPayload()
├── table.skill.ts         ← 【TODO】Skill: buildTableComponentFromPayload()
└── resolve/               ← 【TODO】细粒度 Utils（从 code.ts 迁入）
    ├── size.ts            ← 【TODO】getSizeMetrics(componentId, size)
    ├── color.ts           ← 【TODO】applyColorVariable(node, token)
    └── layout.ts          ← 【TODO】setFillWidth(node), setFixedWidth(node, w)
```

### 各层的文件职责边界

| 文件/层 | 允许 | 禁止 |
|---------|------|------|
| `engine/skills/resolve/*.ts`（Utils） | 读 registry + theme，返回解析值 | 调用 Figma API；暴露给 AI |
| `engine/skills/*.skill.ts`（Skill） | 调用 Utils + 构造 scene 树，完成完整任务 | 硬编码数字/颜色；直接调用 Figma API |
| `App.tsx` action dispatch（Tool 实现） | 调用 Skill，返回结果给 AI | 写 payload 解析逻辑（迁到 Skill） |
| `registry.ts` renderNotes（Agentic Recovery 素材） | 写常见错误、判断规则 | 写 Figma API 调用；写实际渲染逻辑 |

---

## 六、各文件的职责边界

| 文件 | 允许 | 禁止 |
|------|------|------|
| `registry.ts`（当前）/ `registry/components/*.ts`（目标） | 定义组件结构、runtime、renderNotes | 引入 Figma API；写 variableRef 实际值 |
| `theme/volcengine-design/colors.ts` | 写 token → variableRef + fallbackHex | 写组件结构；写业务逻辑 |
| `theme/volcengine-design/spacing.ts` | 写全局设计 token（圆角/间距/字体） | 写颜色；写组件映射 |
| `theme/volcengine-design/components.ts` | 写 Figma componentKey 映射 | 写颜色；写 runtime |
| `engine/skills/resolve/*.ts`（目标） | 读 registry + theme，返回解析值 | 调用 Figma API；写 UI 逻辑 |
| `engine/skills/*.skill.ts` | 构造 scene 节点树，调用 Utils | 调用 Figma API；硬编码数字/颜色 |
| `code.ts` | 接收消息，调用渲染逻辑，返回结果 | 硬编码尺寸数字；硬编码 hex 颜色 |
| `App.tsx` | Action dispatch，调用 skills，发消息 | 写 payload 解析逻辑（迁到 engine/skills/） |

---

## 七、过渡期的文件共存规则

> 迁移是渐进的，不是一次性大重构。过渡期两套文件会同时存在。

**规则**：

1. **新增规范只在新位置写**。不要在 `code.ts` 里再加新的硬编码数字。
2. **旧文件不要删，先引用新位置**。`code.ts` 里的常量先改为从 registry 读，常量本身先保留但标注 `// @deprecated → registry.ts runtime 字段`。
3. **完成迁移后再删旧代码**。删之前确认没有其他地方引用。

---

## 八、新增一个组件的标准流程

1. 在 `registry.ts` 添加组件 `ComponentDefinition`（含 `runtime` 和 `renderNotes`）。
2. 如果有颜色 token，在 `theme/volcengine-design/colors.ts` 添加对应 token。
3. 如果有 Figma 组件 key，在 `theme/volcengine-design/components.ts` 添加对应条目。
4. 如果有 draw_xxx 动作，在 `engine/skills/` 新增对应 `xxx.skill.ts`，再在 `App.tsx` 的 action dispatch 里 import 并调用。
5. 在 App.tsx 的 `buildSpecsInfo` 覆盖范围内确认组件 ID 正确。

---

## 九、待执行工作（TODO 清单）

> 按优先级排序，前一项完成后再开始下一项。

| 优先级 | 工作项 | 说明 |
|--------|--------|------|
| ✅ 完成 | `form.skill.ts` | `buildFormComponentFromPayload` 已迁移，App.tsx 闭包已清除 |
| ✅ 完成 | `table.skill.ts` | `buildTableComponentFromPayload` 已迁移，App.tsx 闭包已清除 |
| ✅ 完成 | `block.helpers.ts` | 共用 Utils 已建立 |
| ✅ 完成 | `form.skill.ts` 的 token 校验改用 `activeTheme.components` | 已替换 `BASE_COMPONENT_TOKEN_PACK` 为 `activeTheme.components` 查询；旧 `theme.component-tokens.ts` 不再被 form.skill 引用 |
| ✅ 完成 | `applyFigmaComponentProps` + `propertyMap`（Step 6） | `registry.types.ts` 新增 `FigmaPropertyMap` 类型；`input`/`select`/`switch` 的 `figmaPropertySnapshot.propertyMap` 已填充；`code.ts` 新增 `applyFigmaComponentProps()`；`updateInputControlTemplateInPlace`/`updateSelectControlTemplateInPlace`/`updateSwitchControlTemplateInPlace` 已改用通用函数，同时修复 switch 的 `'Status 状态'` → `'Checked 开关'` bug |
| 🟡 中 | `engine/skills/resolve/` 目录 | 注：`applyColorVariable`、`setFillWidth` 调用 Figma API，无法迁入 resolve/（该层禁止 Figma API）；真正可迁入的是纯解析函数（如 `resolveThemeFallbackHex`），待 `activeTheme.colors` 全面替换后再迁 |
| 🟢 低 | `registry/` 骨架文件补充实现 | `registry.types.ts`、`registry.loader.ts`、`registry.helpers.ts` 当前为空占位 |
| 🟢 低 | `registry/components/` 组件拆分 | 将 `registry.ts` 按组件拆分为独立文件 |
| 🟢 低 | 旧 `theme.*.ts` 文件清理 | 等各引用方都迁移完后删除 |
