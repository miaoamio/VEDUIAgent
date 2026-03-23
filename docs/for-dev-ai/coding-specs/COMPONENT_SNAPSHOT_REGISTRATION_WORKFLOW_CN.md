# 组件快照登记流程

> **读者**：开发者 / Claude Code 等开发 AI
> **前置阅读**：[反查指令参考](INSPECT_COMMANDS_CN.md)

---

## 登记位置

| 组件类别 | 登记文件 | 是否需要 propertyMap |
|----------|----------|----------------------|
| 表单控件（input / select / datepicker 等） | `src/registry/components/input.ts` | ✅ 需要 |
| 基础组件（tag / button） | `src/registry/components/basic.ts` | ✅ 需要 |
| 图表（chart-pie / chart-toplist 等） | `src/registry/components/chart.ts` | ❌ 不需要 |
| 布局 / 容器 | `src/registry/components/layout.ts` | ❌ 不适用 |

**严禁**把图表快照挂在 `basic.ts` 的 `figma-component` 条目下——`figma-component` 是通用组件容器，图表必须有自己的独立条目。

---

## 标准登记步骤

### 第一步：反查属性

在 Figma 画布中选中目标组件实例（推荐，能读到子组件暴露属性），发送：

```
/inspect
```

或已知 token 时（只读顶层属性）：

```
/inspect lib-data-input-xxx
```

输出示例：
```json
{
  "token": "lib-data-input-select",
  "componentKey": "d124dbe0576b8dfd900897124bd14e888e4db6f3",
  "componentSetName": "Select 选择框",
  "inspectedAt": "2026-03-23T10:00:00.000Z",
  "properties": [
    { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Mini 24", "Default 32", "Large 36"] },
    { "propertyName": "Disable 禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False", "True"] }
  ]
}
```

### 第二步：填入 figmaPropertySnapshot

把输出复制到对应文件的 `figmaPropertySnapshot` 字段。

**只保留这些字段**：
- `token`、`componentKey`、`componentSetName`（可选）、`inspectedAt`、`source`、`properties`

**不要写入**：`sourceNodeId`、`sourceNodeType`、`componentName`（已从所有文件清理）

### 第三步（仅表单控件）：补写 propertyMap

```ts
"propertyMap": {
  "Size 尺寸":   { "sourceParam": "size" },
  "Disable 禁用": { "sourceParam": "disabled", "transform": "boolean" },
  "Filled 已填":  { "sourceParam": "filled",   "transform": "boolean" }
}
```

- `sourceParam`：我方 `params` 里的字段名
- `transform: "boolean"`：把布尔值转成 `"True"/"False"` 字符串（Figma VARIANT 要求字符串）

**图表组件不写 `propertyMap`**，它的 `params` 字段名直接与 Figma propertyName 对齐，渲染时自动打包成 `variantCriteria`。

### 第四步：同步 params（图表组件）

在图表的 `params` 里添加与 `properties` 对应的字段：

```ts
"params": {
  "类型 Type": {
    "type": "string",
    "default": "饼图 PieChart",
    "description": "饼图 PieChart | 环形图 DonutChart",
    "options": ["饼图 PieChart", "环形图 DonutChart"]
  },
  "分类数量 Item": {
    "type": "number",
    "default": 2,
    "description": "分类数量，取值 2–10"
  }
}
```

字段名必须与 Figma `propertyName` 完全一致（含中文和空格），因为它会直接作为 `variantCriteria` 的 key 传给 Figma。

### 第五步：验证

```bash
npm run build
```

build 通过即完成。

---

## 新增图表组件完整流程

1. 在 `src/theme/volcengine-design/component-library-tokens.ts` 注册 token
2. 在 Figma 画布选中目标图表组件，发送 `/inspect`
3. 在 `src/registry/components/chart.ts` 新增组件条目（参考已有条目格式）
4. 填写 `figmaPropertySnapshot.properties`（从第 2 步输出复制）
5. 填写 `params`（字段名与 Figma propertyName 完全一致）
6. 在 `src/App.tsx` 的 `getChartToken` 函数里添加关键词匹配
7. `npm run build` 验证

---

## 快照格式速查

```ts
// 表单控件（有 propertyMap）
figmaPropertySnapshot: {
  token: 'lib-data-input-select',
  componentKey: 'xxx',
  componentSetName: 'Select 选择框',
  inspectedAt: '2026-03-23T10:00:00.000Z',
  source: 'discover_component_props',
  properties: [
    { propertyName: 'Size 尺寸', type: 'VARIANT', defaultValue: 'Default 32', options: [...] }
  ],
  propertyMap: {
    'Size 尺寸': { sourceParam: 'size' }
  }
}

// 图表（无 propertyMap）
figmaPropertySnapshot: {
  token: 'lib-data-display-component-piechart',
  componentKey: 'yyy',
  componentSetName: 'Component/PieChart',
  inspectedAt: '2026-03-23T10:00:00.000Z',
  source: 'discover_component_props',
  properties: [
    { propertyName: '类型 Type', type: 'VARIANT', defaultValue: '饼图 PieChart', options: [...] }
  ]
  // 无 propertyMap
}
```
