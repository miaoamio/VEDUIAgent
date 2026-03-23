# 文件结构规范

> 本文档回答一个问题：**这段代码/这份规范，应该放在哪个文件里？**
>
> 本文档是 [NORTH_STAR.md](NORTH_STAR.md) 三层架构的落地实现，与之配套阅读。

---

## 一、整体目录结构

```
src/
├── registry.ts                ← Layer 1 入口（18 行）：汇总各组件模块
├── registry.types.ts          ← ComponentRegistry / ComponentDefinition 类型定义
│
├── registry/                  ← Layer 1 组件定义（按领域拆分）
│   ├── index.ts               ← 转发 export
│   ├── registry.types.ts      ← 类型占位/扩展
│   ├── registry.loader.ts     ← 运行时加载工具
│   ├── registry.helpers.ts    ← registry 工具函数
│   ├── component-token-map.ts ← Figma library token → componentId 映射（Docs 反查用）
│   └── components/
│       ├── index.ts           ← 汇总 export
│       ├── basic.ts           ← button / tag / icon 等基础组件
│       ├── form.ts            ← form / form-field / form-group 等表单容器
│       ├── icon.ts            ← icon 组件
│       ├── input.ts           ← input / select / datepicker 等输入控件
│       ├── layout.ts          ← layout / divider 等布局组件
│       └── table.ts           ← table / table-header / table-cell 等表格组件
│
├── theme/                     ← Layer 2: 主题包
│   ├── types.ts               ← Theme / ColorTheme / SpacingTheme / ComponentsTheme 类型
│   ├── active.ts              ← 当前激活主题导出（换主题改这一行）
│   └── volcengine-design/     ← VOLCENGINE DESIGN 主题（当前默认）
│       ├── index.ts           ← 合并导出
│       ├── colors.ts          ← color token → variableRef + fallbackHex
│       ├── spacing.ts         ← 圆角/间距/字体尺寸（SpacingTheme 结构）
│       ├── typography.ts      ← 字体 token
│       ├── components.ts      ← Figma 组件 key（ComponentsTheme，125+ 组件）
│       ├── component-tokens.ts          ← 表格系列 component token 映射
│       ├── component-library-tokens.ts  ← library 系列 component token 映射（97+ 条目）
│       ├── color-tokens.ts    ← 颜色变量 token
│       └── tag-fallback.ts    ← Tag 降级渲染配置
│
├── engine/
│   ├── applyCreate.ts / applyEnvelope.ts / applyPatch.ts
│   ├── operationExecutor.ts / renderSceneNode.ts / ...
│   └── skills/                ← Layer 3: 执行层 Skill 目录
│       ├── block.helpers.ts   ← E0 共用 Utils（isObject / getBlockSource / toButtonFromItem / ...）
│       ├── form.skill.ts      ← E2 Skill: buildFormComponentFromPayload()
│       ├── table.skill.ts     ← E2 Skill: buildTableComponentFromPayload()
│       └── resolve/           ← E0 细粒度 Utils
│           ├── size.ts        ← getSizeMetrics(componentId, size)
│           ├── color.ts       ← applyColorVariable(node, token)（调用 Figma API）
│           └── layout.ts      ← setFillWidth(node), setFixedWidth(node, w)（调用 Figma API）
│
├── App.tsx                    ← draw_form/draw_table handler 调用 skills；action dispatch 入口
├── code.ts                    ← 插件主线程（Figma API 调用）；applyFigmaComponentProps() 在此
│
├── protocol/ / ui/ / metadata.ts / figmaComponent.ts / ...（不变）
└── ui.html / ui.tsx / ai-chart-ui.html
```

---

## 二、Layer 1 — registry（组件规范）

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

### Token 命名规范

所有 Figma library 组件 token 统一使用 `lib-{category}-{name}` 格式：

```
lib-data-input-input        ← 输入框
lib-data-input-datepicker   ← 日期选择器
lib-data-display-status-tag ← 状态标签
lib-navigation-header       ← 页头
lib-basic-button            ← 按钮
```

> 代码中禁止使用 `library.xxx.yyy` 点分格式的 token 字符串（figmaComponent.ts 中的向下兼容别名除外）。

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

> 完整定义见 [NORTH_STAR.md 第四节](NORTH_STAR.md)。下面只列文件归属。

| 层级 | 概念 | 文件位置 |
|------|------|---------|
| E0 | Utils / Helpers | `engine/skills/block.helpers.ts`, `engine/skills/resolve/*.ts` |
| E1 | Tool / Action | `App.tsx` action dispatch switch/case |
| E2 | Skill | `engine/skills/form.skill.ts`, `engine/skills/table.skill.ts` |
| E3 | Agentic Recovery | `registry.ts` 各组件 `renderNotes.commonErrors` |

### engine/skills/ 目录

```
engine/skills/
├── block.helpers.ts       ← E0 共用 Utils
├── form.skill.ts          ← E2 Skill: buildFormComponentFromPayload()
├── table.skill.ts         ← E2 Skill: buildTableComponentFromPayload()
└── resolve/
    ├── size.ts            ← E0: getSizeMetrics(componentId, size)
    ├── color.ts           ← E0: applyColorVariable（调用 Figma API，主线程使用）
    └── layout.ts          ← E0: setFillWidth / setFixedWidth（调用 Figma API）
```

### 各层的文件职责边界

| 文件/层 | 允许 | 禁止 |
|---------|------|------|
| `engine/skills/resolve/*.ts`（E0 Utils） | 读 registry + theme，返回解析值；color/layout 可调 Figma API | 暴露给 AI |
| `engine/skills/*.skill.ts`（E2 Skill） | 调用 Utils + 构造 scene 树，完成完整任务 | 硬编码数字/颜色；直接调用 Figma API |
| `App.tsx` action dispatch（E1 Tool 实现） | 调用 Skill，返回结果给 AI | 写 payload 解析逻辑（迁到 Skill） |
| `registry` renderNotes（E3 素材） | 写常见错误、判断规则 | 写 Figma API 调用；写实际渲染逻辑 |

---

## 六、各文件的职责边界

| 文件 | 允许 | 禁止 |
|------|------|------|
| `registry/components/*.ts` | 定义组件结构、runtime、renderNotes | 引入 Figma API；写 variableRef 实际值 |
| `theme/volcengine-design/colors.ts` | 写 token → variableRef + fallbackHex | 写组件结构；写业务逻辑 |
| `theme/volcengine-design/spacing.ts` | 写全局设计 token（圆角/间距/字体） | 写颜色；写组件映射 |
| `theme/volcengine-design/components.ts` | 写 Figma componentKey 映射 | 写颜色；写 runtime |
| `engine/skills/*.skill.ts` | 构造 scene 节点树，调用 Utils | 调用 Figma API；硬编码数字/颜色 |
| `code.ts` | 接收消息，调用渲染逻辑，返回结果；`applyFigmaComponentProps()` | 硬编码尺寸数字；硬编码 hex 颜色 |
| `App.tsx` | Action dispatch，调用 skills，发消息 | 写 payload 解析逻辑（迁到 engine/skills/） |

---

## 七、新增一个组件的标准流程

1. 在 `registry/components/*.ts` 添加组件 `ComponentDefinition`（含 `runtime` 和 `renderNotes`），并在 `registry.ts` 汇总。
2. 如果有颜色 token，在 `theme/volcengine-design/colors.ts` 添加对应 token。
3. 如果有 Figma 组件 key，在 `theme/volcengine-design/components.ts` 添加对应条目（`lib-{category}-{name}` 格式）。
4. 如果是 Figma library 组件，在 `figmaPropertySnapshot.propertyMap` 声明属性映射。
5. 如果有 draw_xxx 动作，在 `engine/skills/` 新增对应 `xxx.skill.ts`，再在 `App.tsx` 的 action dispatch 里 import 并调用。

---

## 八、待执行工作

暂无。
