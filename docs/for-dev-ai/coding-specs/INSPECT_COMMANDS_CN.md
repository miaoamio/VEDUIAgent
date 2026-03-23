# 组件反查指令（开发者调试用）

> **读者**：开发者 / Claude Code 等开发 AI
> **用途**：在插件对话框里直接反查 Figma 组件属性或结构，结果以 JSON 代码块内联显示在对话中。普通用户不感知这些指令。

---

## 两种模式

### 模式 A：属性快照模式（登记用）

**指令**：`/inspect`
**底层**：`inspectFigmaComponentProps` → `discoverFigmaComponentSchema`
**读取范围**：组件顶层的 `componentPropertyDefinitions`（variant / boolean / instance_swap）

> **重要**：按 token 传入时只读顶层属性。**若需读到子组件暴露的属性，必须先在 Figma 画布中选中目标实例，再用无参数 `/inspect`**——此时会额外调用 `discoverFigmaComponentSchemaFromSelection` + `collectNestedInstanceProperties` 遍历子实例，属性更完整。

**输出格式**（单组件直接展开，多组件为数组）：

```json
{
  "token": "lib-data-input-datepicker",
  "componentKey": "75d61442da83762c096571de0f34f56012bea78d",
  "componentSetName": "DatePicker 日期选择器",
  "inspectedAt": "2026-03-23T10:00:00.000Z",
  "properties": [
    { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Mini 24", "Default 32", "Large 36"] },
    { "propertyName": "Disable 禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False", "True"] }
  ]
}
```

**用法**：

| 输入 | 行为 | 读到子属性？ |
|------|------|------------|
| `/inspect lib-data-input-datepicker` | 按 token 读，无 nodeId | ❌ 只读顶层 |
| `/inspect`（选中 Figma 元素时） | key+nodeId 合并为同一 target，走 `discoverFigmaComponentSchemaFromSelection` | ✅ 完整 |
| `/inspect <t1> <t2>` | 批量按 token，无 nodeId | ❌ 只读顶层 |
| `/inspect`（未选中时） | 静默忽略 | — |

**结论：要读到子组件暴露的属性，必须先在 Figma 画布选中目标实例，再发 `/inspect`（无参数）。**

---

### 模式 B：结构反查模式（复刻研究用）

**指令**：`/inspect-style`
**底层**：`inspectFigmaComponentStructure`
**读取范围**：完整节点树（类型、尺寸、fill、stroke、layout，每个 variant）

**用法**：

| 输入 | 行为 |
|------|------|
| `/inspect-style`（选中 Figma 元素时） | 用选中实例反查完整结构 |
| `/inspect-style <componentKey>` | 用指定 key 反查结构 |
| `/inspect-style`（未选中时） | 静默忽略 |

输出体积大，用于研究组件内部层级，不用于登记快照。

---

## 快照字段规范

`figmaPropertySnapshot` 的最小有效结构：

```ts
{
  token: string,           // lib-{category}-{name}
  componentKey: string,    // Figma componentSet 的 key
  componentSetName: string, // 组件集名称（可选，便于识别）
  inspectedAt: string,     // ISO 时间戳
  source: 'discover_component_props',
  properties: [
    {
      propertyName: string,   // Figma 属性名（直接用于 variantCriteria）
      type: 'VARIANT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'TEXT',
      defaultValue?: string | boolean,
      options?: string[]      // VARIANT 类型必填
    }
  ],
  // 仅表单控件需要（图表不需要）：
  propertyMap?: {
    [figmaPropertyName: string]: { sourceParam: string, transform?: 'boolean' }
  }
}
```

**不需要的字段**（已从所有文件中清理）：
- `sourceNodeId` / `sourceNodeType` — 渲染管道不读
- `componentName` — defaultVariant 的完整名，又长又无用
- `properties[].displayName` — 与 `propertyName` 重复

---

## 两类组件的登记方式不同

### 表单控件（input / select / datepicker 等）

需要 `propertyMap`，渲染时 `applyFigmaComponentProps` 读它并调用 `setProperties()`。

登记步骤：
1. `/inspect lib-data-input-xxx` 或选中元素后 `/inspect`
2. 复制输出填入 registry 对应组件的 `figmaPropertySnapshot`
3. 手动补写 `propertyMap`（Figma 属性名 → 我方 param 名的映射）

`propertyMap` 格式：
```ts
"Size 尺寸": { "sourceParam": "size" },
"Disable 禁用": { "sourceParam": "disabled", "transform": "boolean" }
```
`transform: "boolean"` 用于把布尔值转成 `"True"/"False"` 字符串。

### 图表组件（chart-toplist / chart-pie 等）

**不需要 `propertyMap`**。渲染时直接把 `params` 里的键值对打包成 `variantCriteria` 传给 `createFigmaComponentInstance`。

登记步骤：
1. `/inspect lib-data-display-component-xxx` 读出 `properties`
2. 填入 `chart.ts` 对应组件的 `figmaPropertySnapshot.properties`
3. 同时在 `params` 里添加对应字段（字段名与 Figma propertyName 一致，AI 可直接传）
4. **不需要写 `propertyMap`**

图表 `params` 示例：
```ts
"类型 Type": { type: "string", default: "饼图 PieChart", options: ["饼图 PieChart", "环形图 DonutChart"] },
"分类数量 Item": { type: "number", default: 2 }
```

---

## 实现位置

| 指令 | 调用路径 | 格式化函数 |
|------|----------|-----------|
| `/inspect <token>` | `handleInspectCommand` → `inspectFigmaComponentProps` → `discoverFigmaComponentSchema` | `buildInspectPropsJson`（轻量） |
| `/inspect`（无参数，有选中） | inline → `inspectFigmaComponentProps`（带 nodeId）→ `discoverFigmaComponentSchemaFromSelection` | `buildInspectPropsJson`（轻量） |
| `/inspect-style` | `handleInspectByComponentKey` → `inspectFigmaComponentStructure` | `buildComponentInspectJson`（完整） |

两条指令均绕过 AI 直接执行，不消耗 LLM token。
