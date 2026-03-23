# 文件结构规范

> 本文档回答一个问题：**这段代码/这份规范，应该放在哪个文件里？**
>
> 本文档是 [NORTH_STAR.md](NORTH_STAR.md) 三层架构的落地实现，与之配套阅读。

---

## 一、整体目录结构

```
src/
├── registry.ts                ← Layer 1（当前）：所有组件定义在单一文件（5300 行）
│
├── registry/                  ← 目录骨架已建，但尚未拆分组件定义
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
│       ├── typography.ts          字体 token
│       └── components.ts          Figma 组件 key（ComponentsTheme，125+ 组件）
│
├── engine/
│   ├── applyCreate.ts / applyEnvelope.ts / applyPatch.ts
│   ├── operationExecutor.ts / renderSceneNode.ts / ...
│   └── skills/                ← ✅ 执行层 Skill 目录（已建立）
│       ├── block.helpers.ts   ← ✅ 共用 E0 Utils（isObject / getBlockSource / toButtonFromItem / ...）
│       ├── form.skill.ts      ← ✅ E2 Skill: buildFormComponentFromPayload()
│       ├── table.skill.ts     ← ✅ E2 Skill: buildTableComponentFromPayload()
│       └── resolve/           ← ✅ 细粒度 E0 Utils
│           ├── size.ts        ← getSizeMetrics(componentId, size)
│           ├── color.ts       ← applyColorVariable(node, token)（调用 Figma API）
│           └── layout.ts      ← setFillWidth(node), setFixedWidth(node, w)（调用 Figma API）
│
├── App.tsx                    ← draw_form/draw_tabl handler 已改为调用 skills；原闭包函数已清除
├── code.ts                    ← 插件主线程（Figma API 调用）；applyFigmaComponentProps() 在此
│
├── theme.color-tokens.ts      ← 已被 theme/volcengine-design/colors.ts 取代，待清理
├── theme.component-tokens.ts  ← 已被 theme/volcengine-design/components.ts 取代，待清理
├── theme.component-library-tokens.ts ← 已合并入 components.ts，待清理
│
├── protocol/ / ui/ / metadata.ts / figmaComponent.ts / ...（不变）
└── ui.html / ui.tsx / ai-chart-ui.html
```

---

## 二、Layer 1 — registry.ts（结构规范）

### 每个组件定义包含的字段

```
params          组件参数及默认值
slots           槽位结构
constraints     约束规则
capabilities    能力开关
figmaBinding    Figma 节点映射
runtime         渲染规格（尺寸/间距/圆角）
renderNotes     给 Agent 读的渲染注意事项
colorVariableBindings   只写 token key，不写实际值
typographyBindings      只写 token key，不写实际值
figmaPropertySnapshot   Figma 组件属性快照（含 propertyMap）
prompts         AI 选择/使用提示
migrations      版本迁移规则
```

### runtime 字段写法

```ts
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

`code.ts` 里的 `TABLE_DEFAULT_HEADER_HEIGHT = 40` 等常量目标是从 registry 读取，尚未完成。

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
import type { ColorTheme } from '../types';

export const volcengineDesignColors: ColorTheme = {
  'table.border':         { variableRef: 'VariableID:xxx/174345:560', fallbackHex: '#EAEDF1' },
  'table.header-bg':      { variableRef: 'VariableID:yyy/174345:562', fallbackHex: '#F7F8FA' },
  // ...
};
```

### theme/volcengine-design/components.ts 的格式

```ts
export const volcengineDesignComponents: ComponentsTheme = {
  // token key → Figma componentKey（hash）
  'table-header-main':       '3361bff9b5e21071cb4fb3b86caa40a6709674ac',
  'lib-data-input-input':    'f04bea11a4ef73f626b7402aac670a94ad32faf0',
  // 共 125+ 条目
};
```

### 旧 theme.*.ts 文件清理状态

| 文件 | 状态 |
|------|------|
| `theme.color-tokens.ts` | ✅ 已迁移到 `theme/volcengine-design/colors.ts`，旧文件待清理 |
| `theme.component-tokens.ts` | ✅ 已迁移；渲染引擎和 form.skill.ts 均已改用 `activeTheme.components`，旧文件待清理 |
| `theme.component-library-tokens.ts` | ✅ 已合并入 components.ts，旧文件待清理 |
| `theme.typography-tokens.ts` | ✅ 已迁移到 `theme/volcengine-design/typography.ts` |
| `tag.fallback.ts` | 🔲 待迁移到 `theme/volcengine-design/tag-fallback.ts` |
| `spec.component-token-map.ts` | 🔲 待迁移到 `registry/component-token-map.ts` |

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

| Level | 输出格式 | 用途 |
|-------|---------|------|
| `index` | `**Params:** key1, key2, ...` | 规划阶段 |
| `params`（默认） | Params 表格 + Slots + RenderNotes bullets + Usage | 生成阶段 |
| `runtime` | Runtime JSON + FigmaPropertySnapshot JSON | 调试/渲染阶段 |

---

## 五、执行层（Engine）— E0–E3 概念与文件映射

> 完整定义见 [NORTH_STAR.md 第五节](NORTH_STAR.md)。下面只列文件归属。

### 当前状态

| 层级 | 概念 | 文件位置 | 状态 |
|------|------|---------|------|
| E0 | Utils / Helpers | `engine/skills/block.helpers.ts`, `engine/skills/resolve/*.ts` | ✅ 已就位 |
| E1 | Tool / Action | `App.tsx` action dispatch switch/case | ✅ 已精简为只做 dispatch |
| E2 | Skill | `engine/skills/form.skill.ts`, `engine/skills/table.skill.ts` | ✅ 已完成 |
| E3 | Agentic Recovery | `registry.ts` 各组件 `renderNotes.commonErrors` | ✅ 已覆盖主要组件 |

### engine/skills/ 目录

```
engine/skills/
├── block.helpers.ts       ← ✅ E0 共用 Utils
├── form.skill.ts          ← ✅ E2 Skill: buildFormComponentFromPayload()
├── table.skill.ts         ← ✅ E2 Skill: buildTableComponentFromPayload()
└── resolve/
    ├── size.ts            ← ✅ E0: getSizeMetrics(componentId, size)
    ├── color.ts           ← ✅ E0: applyColorVariable（调用 Figma API，主线程使用）
    └── layout.ts          ← ✅ E0: setFillWidth / setFixedWidth（调用 Figma API）
```

### 各层的文件职责边界

| 文件/层 | 允许 | 禁止 |
|---------|------|------|
| `engine/skills/resolve/*.ts`（E0 Utils） | 读 registry + theme，返回解析值；color/layout 可调 Figma API | 暴露给 AI |
| `engine/skills/*.skill.ts`（E2 Skill） | 调用 Utils + 构造 scene 树，完成完整任务 | 硬编码数字/颜色；直接调用 Figma API |
| `App.tsx` action dispatch（E1 Tool 实现） | 调用 Skill，返回结果给 AI | 写 payload 解析逻辑（迁到 Skill） |
| `registry.ts` renderNotes（E3 素材） | 写常见错误、判断规则 | 写 Figma API 调用；写实际渲染逻辑 |

---

## 六、各文件的职责边界

| 文件 | 允许 | 禁止 |
|------|------|------|
| `registry.ts` | 定义组件结构、runtime、renderNotes | 引入 Figma API；写 variableRef 实际值 |
| `theme/volcengine-design/colors.ts` | 写 token → variableRef + fallbackHex | 写组件结构；写业务逻辑 |
| `theme/volcengine-design/spacing.ts` | 写全局设计 token（圆角/间距/字体） | 写颜色；写组件映射 |
| `theme/volcengine-design/components.ts` | 写 Figma componentKey 映射 | 写颜色；写 runtime |
| `engine/skills/*.skill.ts` | 构造 scene 节点树，调用 Utils | 调用 Figma API；硬编码数字/颜色 |
| `code.ts` | 接收消息，调用渲染逻辑，返回结果；`applyFigmaComponentProps()` | 硬编码尺寸数字；硬编码 hex 颜色 |
| `App.tsx` | Action dispatch，调用 skills，发消息 | 写 payload 解析逻辑（迁到 engine/skills/） |

---

## 七、过渡期的文件共存规则

1. **新增规范只在新位置写**。不要在 `code.ts` 里再加新的硬编码数字。
2. **旧文件不要删，先引用新位置**。旧常量标注 `// @deprecated → registry.ts runtime 字段`。
3. **完成迁移后再删旧代码**。删之前确认没有其他地方引用。

---

## 八、新增一个组件的标准流程

1. 在 `registry.ts` 添加组件 `ComponentDefinition`（含 `runtime` 和 `renderNotes`）。
2. 如果有颜色 token，在 `theme/volcengine-design/colors.ts` 添加对应 token。
3. 如果有 Figma 组件 key，在 `theme/volcengine-design/components.ts` 添加对应条目。
4. 如果是 Figma library 组件，在 `figmaPropertySnapshot.propertyMap` 声明属性映射。
5. 如果有 draw_xxx 动作，在 `engine/skills/` 新增对应 `xxx.skill.ts`，再在 `App.tsx` 的 action dispatch 里 import 并调用。

---

## 九、待执行工作

| 优先级 | 工作项 | 说明 |
|--------|--------|------|
| 🔲 进行中 | `renderNotes` 持续填充 | 每次发现 AI 犯错模式立刻写入；当前已覆盖 table/form/form-field 等主要组件 |
| 🔲 低 | 旧 `theme.*.ts` 文件清理 | `theme.color-tokens.ts` / `theme.component-tokens.ts` / `theme.component-library-tokens.ts` 均已迁移，可删除 |
| 🔲 低 | `tag.fallback.ts` 迁移 | 迁入 `theme/volcengine-design/tag-fallback.ts` |
| 🔲 低 | `registry/` 骨架文件实现 | `registry.types.ts`、`registry.loader.ts`、`registry.helpers.ts` 当前为空占位 |
| 🔲 低 | `registry/components/` 组件拆分 | 将 `registry.ts`（5300 行）按组件拆分为独立文件 |
| 🔲 低 | `code.ts` 硬编码常量迁入 registry | `TABLE_DEFAULT_HEADER_HEIGHT` 等常量改为从 `registry.runtime` 读取 |
