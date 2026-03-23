# 图表组件登记与使用流程

## 1. 当前架构概览

图表组件使用**独立 componentId** 方式登记（chart-toplist / chart-pie / chart-line / chart-bar / chart-area），
每个图表类型是 `src/registry/components/chart.ts` 中的独立 `ComponentDefinition`。

> ⚠️ 旧文档中描述的 `figma-component` + `figmaPropertySnapshotCatalog` 方式已废弃。
> 现在图表不走 `figma-component` 通用路径，而是通过 `expand_chart_block` 工具落地。

## 2. 已登记的图表组件

| componentId    | Figma token                                | 说明           |
|----------------|--------------------------------------------|----------------|
| chart-toplist  | lib-data-display-toplist                   | 横向条形图     |
| chart-pie      | lib-data-display-component-piechart        | 饼图/环形图    |
| chart-line     | lib-data-display-component-linechart       | 折线图         |
| chart-bar      | lib-data-display-component-barchart        | 纵向柱状图     |
| chart-area     | lib-data-display-component-areachart       | 面积图         |

## 3. 核心文件职责

| 文件 | 职责 |
|------|------|
| `src/registry/components/chart.ts` | 图表组件规范（params、figmaPropertySnapshot、renderNotes） |
| `src/engine/skills/chart.skill.ts` | E2 Skill：`buildChartBlockComponentFromPayload()`，含 `CHART_COMPONENT_TOKEN_MAP` |
| `src/App.tsx` → `CHART_EXTRA_OPTIONS` | UI 快捷选项，key/label/options 必须与 registry params 对齐 |
| `src/App.tsx` → `expand_chart_block` case | E1 Tool 实现，调用 chart.skill |

## 4. 新增图表组件流程

1. 在 Figma 中执行 `discover_component_props` 获取属性列表。
2. 在 `chart.ts` 新增 `ComponentDefinition`：
   - `params`：只列关键 variant 属性（数量/类型/开关），**属性名必须与 Figma propertyName 完全一致（含空格）**
   - `figmaPropertySnapshot`：填 token、componentKey、properties 完整列表
   - `renderNotes`：说明属性名注意事项（空格、大小写）
3. 在 `chart.skill.ts` 的 `CHART_COMPONENT_TOKEN_MAP` 添加 `'chart-xxx': 'lib-xxx-token'`。
4. 如有 UI 快捷按钮，在 `App.tsx` 的 `CHART_EXTRA_OPTIONS` 添加对应条目，
   **`label` 必须是 Figma propertyName，`options` 必须是真实 enumValues**。

## 5. expand_chart_block payload 格式

```json
{
  "block": {
    "container": { "title": "图表区" },
    "header": { "tabs": [], "actions": [] },
    "body": {
      "charts": [
        {
          "componentId": "chart-pie",
          "props": {
            "类型 Type": "环形图 DonutChart",
            "分类数量 Item": "5",
            "数值标注 Data Annotation": "On"
          }
        }
      ]
    },
    "footer": { "notes": "" }
  }
}
```

**关键规则**：
- `body.charts[].componentId` 必须是已登记的 chart 组件 ID
- `body.charts[].props` 中属性名必须与 Figma variant propertyName 完全一致（含空格和中英文混排）
- 属性值必须是 registry `params.enumValues` 中的真实枚举值

## 6. 常见错误与修复

| 错误现象 | 原因 | 修复 |
|----------|------|------|
| 分类数量不对 | props 中用了 `"分类数量": 5` | 改为 `"分类数量 Item": "5"` |
| 数值标注开启不生效 | 用了 `"数值标注": "开启"` | 改为 `"数值标注 Data Annotation": "On"` |
| 折线数量不对 | chart-line 用了 `"数量 ": "3"` | 改为 `"线数量": "3"` |
| 面积图线数不对 | chart-area 用了 `"线数量": "3"` | 改为 `"线数量 "（末尾有空格）: "3"` |
| 图表类型选错 | tokenHint 关键字匹配失败 | 在 props 中明确指定 `componentId`，skill 优先查 `CHART_COMPONENT_TOKEN_MAP` |
