import type { ComponentRegistry } from "../../registry.types";

/**
 * 图表组件 registry
 *
 * 每个图表是独立的 componentId，通过 componentToken 从 Figma 组件库导入。
 * params 字段直接对应 Figma variant 属性名，渲染时由 buildChartBlockComponentFromPayload
 * 拼装成 variantCriteria 传给 createFigmaComponentInstance。
 *
 * 两类组件的区别：
 *   - 图表：只需 variantCriteria 选变体，不需要 propertyMap（无 setProperties 调用）
 *   - 表单控件：需要 propertyMap 驱动 applyFigmaComponentProps → setProperties
 */

export const chartComponents: ComponentRegistry["components"] = {

  // ── 条形图 / Toplist ─────────────────────────────────────────────────────
  "chart-toplist": {
    "id": "chart-toplist",
    "name": "条形图",
    "category": "Chart",
    "description": "横向条形对比图，支持基础/堆叠/百分比堆叠/分组等类型",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "横向条形图，适合展示多指标排名对比",
      "usage": "用于排行榜、多指标对比场景",
      "examples": [
        "基础条形图: { \"componentId\": \"chart-toplist\", \"params\": { \"数量\": 3 } }",
        "堆叠条形图: { \"componentId\": \"chart-toplist\", \"params\": { \"类型\": \"堆叠 stacked\", \"数量\": 2 } }"
      ]
    },
    "renderNotes": {
      "actionHint": "条形图用 chart-toplist，params 属性名必须与 Figma variant propertyName 完全一致（含空格）",
      "paramRules": [
        "数量  取值 1–4，表示数据系列数（注意属性名末尾有一个空格）",
        "类型 type 默认「基础/分组柱 default」，可选堆叠/百分比堆叠/特殊"
      ],
      "commonErrors": [
        "不要把 chart-toplist 用于饼图或折线图",
        "属性名 '数量 ' 末尾有一个空格，必须保留"
      ]
    },
    "params": {
      "数量 ": {
        "type": "number",
        "default": 1,
        "description": "数据系列数量，取值 1–4（注意属性名末尾有空格）",
        "enumValues": ["1", "2", "3", "4"]
      },
      "类型 type": {
        "type": "string",
        "default": "基础/分组柱 default",
        "description": "柱型：基础/分组柱 default | 堆叠 stacked | 百分比堆叠 stacked part to whole | 特殊 special case",
        "enumValues": ["基础/分组柱 default", "堆叠 stacked", "百分比堆叠 stacked part to whole", "特殊 special case", "特殊 special case 2"]
      },
      "适配方式 responsive": {
        "type": "string",
        "default": "固定柱宽 fixed width",
        "description": "固定柱宽 fixed width | 固定间距 fixed gap",
        "enumValues": ["固定柱宽 fixed width", "固定间距 fixed gap"]
      },
      "Show Legend": {
        "type": "boolean",
        "default": true,
        "description": "是否显示图例"
      },
      "height": {
        "type": "number",
        "default": 0,
        "description": "图表高度（px），0 或不填则保持设计系统原始比例"
      }
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "VERTICAL"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-display-toplist",
      "componentKey": "6acea515cbcd1ae970ef5627425bd55cbda137ff",
      "inspectedAt": "2026-03-23T08:13:16.777Z",
      "source": "discover_component_props",
      "componentSetName": "Toplist 条形图",
      "properties": [
        { "propertyName": "Show Legend", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Threshold", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show VerticalLine", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Warning", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show numbers", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show tooltip", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "复选框 checkbox", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作按钮 action button", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作行 ActionBar", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "数值概览 Summary", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "日期选择器 Datepicker", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "显示标签", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "更多信息 MoreInfo", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选择器 Dropdown", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选项卡 Tabs", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Icon", "type": "INSTANCE_SWAP", "defaultValue": "13:8386" },
        { "propertyName": "Placeholder 占位符", "type": "TEXT", "defaultValue": "请选择" },
        { "propertyName": "Value", "type": "TEXT", "defaultValue": "北京" },
        { "propertyName": "Y right units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "Y units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "value", "type": "TEXT", "defaultValue": "95" },
        { "propertyName": "替换文本", "type": "TEXT", "defaultValue": "Checkbox" },
        { "propertyName": "Digital 数字", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disable  禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disabled 禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 填写", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 已填", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "Item 数量", "type": "VARIANT", "defaultValue": "3", "options": ["2","3","4","5","6","7","8"] },
        { "propertyName": "Multiple 多选", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Property 1", "type": "VARIANT", "defaultValue": "percentage", "options": ["Variant2","percentage","Variant3","Variant4","Variant5","Variant6"] },
        { "propertyName": "Size", "type": "VARIANT", "defaultValue": "Mini 24", "options": ["Small 28","Mini 24","Default 32","Large 36"] },
        { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Small 28","Default 32"] },
        { "propertyName": "State", "type": "VARIANT", "defaultValue": "Focused", "options": ["Default","Focused","Disable"] },
        { "propertyName": "State 状态", "type": "VARIANT", "defaultValue": "Default 默认", "options": ["Default 默认","Hover 悬浮","Active 激活"] },
        { "propertyName": "Type", "type": "VARIANT", "defaultValue": "Date", "options": ["Date","DateTime","Line","RelativeDate","RelativeDateRange","Custom"] },
        { "propertyName": "Type 类型", "type": "VARIANT", "defaultValue": "actionBar", "options": ["actionBar","titleBar"] },
        { "propertyName": "x 轴类型 type", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","双行 double lines","30°","45°","90°","无 x-aixs N/A"] },
        { "propertyName": "位置 Position", "type": "VARIANT", "defaultValue": "顶部 Top", "options": ["顶部 Top","中部 Middle","底部 Bottom","报警线 Warning"] },
        { "propertyName": "位置 position", "type": "VARIANT", "defaultValue": "左 left", "options": ["左 left","右 right","toplist"] },
        { "propertyName": "半选", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "坐标轴标签 label", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "尺寸", "type": "VARIANT", "defaultValue": "12", "options": ["12","14","16","20","24","32","48"] },
        { "propertyName": "悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "数量 ", "type": "VARIANT", "defaultValue": "1", "options": ["1","2","3","4"] },
        { "propertyName": "状态 state", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","悬浮 Hover","聚焦 Focus"] },
        { "propertyName": "禁用", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "等级 level", "type": "VARIANT", "defaultValue": "critical", "options": ["critical","warning","notice"] },
        { "propertyName": "类型 Type", "type": "VARIANT", "defaultValue": "默认 default", "options": ["默认 default","密集 intense","区间 area"] },
        { "propertyName": "类型 type", "type": "VARIANT", "defaultValue": "基础/分组柱 default", "options": ["基础/分组柱 default","堆叠 stacked","百分比堆叠 stacked part to whole","特殊 special case","特殊 special case 2"] },
        { "propertyName": "适配方式 responsive", "type": "VARIANT", "defaultValue": "固定柱宽 fixed width", "options": ["固定柱宽 fixed width","固定间距 fixed gap"] },
        { "propertyName": "选中", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] }
      ]
    }
  },

  // ── 饼图 / 环形图 ─────────────────────────────────────────────────────────
  "chart-pie": {
    "id": "chart-pie",
    "name": "饼图 / 环形图",
    "category": "Chart",
    "description": "饼图或环形图，通过「类型 Type」切换饼图/环形图",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "饼图或环形图，展示占比分布",
      "usage": "用于占比、份额、构成分析场景",
      "examples": [
        "5分类饼图: { \"componentId\": \"chart-pie\", \"params\": { \"分类数量 Item\": 5 } }",
        "环形图: { \"componentId\": \"chart-pie\", \"params\": { \"类型 Type\": \"环形图 DonutChart\", \"分类数量 Item\": 4 } }"
      ]
    },
    "renderNotes": {
      "actionHint": "饼图/环形图用 chart-pie，通过「类型 Type」选饼图或环形图",
      "paramRules": [
        "分类数量 Item 范围 2–10",
        "类型 Type：饼图 PieChart | 环形图 DonutChart"
      ],
      "commonErrors": [
        "不要用 chart-toplist 代替饼图"
      ]
    },
    "params": {
      "类型 Type": {
        "type": "string",
        "default": "饼图 PieChart",
        "description": "饼图 PieChart | 环形图 DonutChart",
        "enumValues": ["饼图 PieChart", "环形图 DonutChart"]
      },
      "分类数量 Item": {
        "type": "number",
        "default": 2,
        "description": "分类数量，取值 2–10"
      },
      "总数值 Sum": {
        "type": "string",
        "default": "Off",
        "description": "是否显示总数值：Off | On",
        "enumValues": ["Off", "On"]
      },
      "数值标注 Data Annotation": {
        "type": "string",
        "default": "Off",
        "description": "是否显示数值标注：Off | On",
        "enumValues": ["Off", "On"]
      },
      "色彩模式 Color mode": {
        "type": "string",
        "default": "常规 Regular",
        "description": "常规 Regular | 轻亮 Light",
        "enumValues": ["常规 Regular", "轻亮 Light"]
      },
      "放大比率 Ratio": {
        "type": "string",
        "default": "2:1",
        "description": "2:1 | 1:1",
        "enumValues": ["2:1", "1:1"]
      },
      "height": {
        "type": "number",
        "default": 0,
        "description": "图表高度（px），0 或不填则保持设计系统原始比例"
      }
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "VERTICAL"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-display-component-piechart",
      "componentKey": "a414c3e671b3619d480d4932b83d9969b7ebbe03",
      "inspectedAt": "2026-03-23T11:11:18.754Z",
      "source": "discover_component_props",
      "componentSetName": "Card/PieChart",
      "properties": [
        { "propertyName": "复选框 checkbox", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作按钮 action button", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "日期选择器 Datepicker", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "更多信息 MoreInfo", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选择器 Dropdown", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选项卡 Tabs", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Icon", "type": "INSTANCE_SWAP", "defaultValue": "13:8386" },
        { "propertyName": "Digital 数字", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disable  禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Item 数量", "type": "VARIANT", "defaultValue": "3", "options": ["2","3","4","5","6","7","8"] },
        { "propertyName": "Layout 布局", "type": "VARIANT", "defaultValue": "横向 Horizental", "options": ["横向 Horizental","纵向 Vertical","Adaptive 自适应"] },
        { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Small 28","Default 32"] },
        { "propertyName": "State 状态", "type": "VARIANT", "defaultValue": "Default 默认", "options": ["Default 默认","Hover 悬浮","Active 激活"] },
        { "propertyName": "Type 类型", "type": "VARIANT", "defaultValue": "titleBar", "options": ["actionBar","titleBar"] },
        { "propertyName": "分类数量 Item", "type": "VARIANT", "defaultValue": "2", "options": ["2","3","4","5","6","7","8","9","10"] },
        { "propertyName": "分页 Pagination", "type": "VARIANT", "defaultValue": "Off", "options": ["Off","On"] },
        { "propertyName": "单位", "type": "VARIANT", "defaultValue": "On", "options": ["On"] },
        { "propertyName": "尺寸", "type": "VARIANT", "defaultValue": "12", "options": ["12","14","16","20","24","32","48"] },
        { "propertyName": "布局 Layout", "type": "VARIANT", "defaultValue": "上下 UP To Down", "options": ["上下 UP To Down","左右 Left To Right"] },
        { "propertyName": "总数值 Sum", "type": "VARIANT", "defaultValue": "Off", "options": ["Off","On"] },
        { "propertyName": "悬浮 Hover", "type": "VARIANT", "defaultValue": "Off", "options": ["Off","On"] },
        { "propertyName": "放大比率 Ratio", "type": "VARIANT", "defaultValue": "2:1", "options": ["2:1","1:1"] },
        { "propertyName": "数值 number", "type": "VARIANT", "defaultValue": "Off", "options": ["Off","On"] },
        { "propertyName": "数值标注 Data Annotation", "type": "VARIANT", "defaultValue": "Off", "options": ["Off","On"] },
        { "propertyName": "数据展示 Statistic", "type": "VARIANT", "defaultValue": "Off", "options": ["On","Off"] },
        { "propertyName": "数量 Item", "type": "VARIANT", "defaultValue": "1", "options": ["2","3","4","5","6","1","7","8","9","10"] },
        { "propertyName": "滚动 Scroll", "type": "VARIANT", "defaultValue": "Off", "options": ["Off","On"] },
        { "propertyName": "状态 State", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","悬浮 Hover"] },
        { "propertyName": "类型 Type", "type": "VARIANT", "defaultValue": "饼图 PieChart", "options": ["饼图 PieChart","环形图 DonutChart"] },
        { "propertyName": "色彩模式 Color mode", "type": "VARIANT", "defaultValue": "常规 Regular", "options": ["常规 Regular","轻亮 Light"] }
      ]
    }
  },

  // ── 折线图 ───────────────────────────────────────────────────────────────
  "chart-line": {
    "id": "chart-line",
    "name": "折线图",
    "category": "Chart",
    "description": "折线图，展示趋势变化",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "折线图，适合展示时序趋势",
      "usage": "用于趋势分析、时序数据场景",
      "examples": [
        "3条折线图: { \"componentId\": \"chart-line\", \"props\": { \"线数量\": \"3\", \"类型 Type\": \"默认 default\" } }",
        "平滑折线图: { \"componentId\": \"chart-line\", \"props\": { \"线数量\": \"2\", \"类型 Type\": \"平滑 smooth\" } }"
      ]
    },
    "renderNotes": {
      "actionHint": "折线图用 chart-line，params 中的属性名必须与 Figma variant propertyName 完全一致（含空格和中英文混排）",
      "paramRules": [
        "线数量 取值 1–6，表示折线条数",
        "类型 Type：默认 default | 平滑 smooth | 大数据 big data",
        "数量  取值 1–6（等价于 线数量，两者选其一即可）"
      ],
      "commonErrors": [
        "不要把 chart-line 用于柱状图或饼图",
        "属性名 '线数量' 和 '数量 ' 注意末尾是否带空格，需与 Figma 组件一致"
      ]
    },
    "params": {
      "线数量": {
        "type": "number",
        "default": 3,
        "description": "折线条数，取值 1–6",
        "enumValues": ["1", "2", "3", "4", "5", "6"]
      },
      "类型 Type": {
        "type": "string",
        "default": "默认 default",
        "description": "折线类型：默认 default | 平滑 smooth | 大数据 big data",
        "enumValues": ["默认 default", "平滑 smooth", "大数据 big data"]
      },
      "Show Legend": {
        "type": "boolean",
        "default": true,
        "description": "是否显示图例"
      },
      "height": {
        "type": "number",
        "default": 0,
        "description": "图表高度（px），0 或不填则保持设计系统原始比例"
      }
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "VERTICAL"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-display-component-linechart",
      "componentKey": "62d6b59603766fdb416ff787eec5d21800264694",
      "inspectedAt": "2026-03-23T08:04:49.525Z",
      "source": "discover_component_props",
      "componentSetName": "折线图",
      "properties": [
        { "propertyName": "Current", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Max", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Mean", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Min", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Legend", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Scale", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Threshold", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Tooltip", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show VerticalLine", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Warning", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show 标题", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "icon", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "下钻操作 Action", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "告警信息 Alert", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "复选框 checkbox", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作按钮 action button", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作行 ActionBar", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "数值概览 Summary", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "数据", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "数据点 Data point", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "日期选择器 Datepicker", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "显示标签", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "更多信息 MoreInfo", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "翻页", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "选择器 Dropdown", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选项卡 Tabs", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Icon", "type": "INSTANCE_SWAP", "defaultValue": "13:8386" },
        { "propertyName": "Placeholder 占位符", "type": "TEXT", "defaultValue": "请选择" },
        { "propertyName": "Value", "type": "TEXT", "defaultValue": "北京" },
        { "propertyName": "Y right units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "Y units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "value", "type": "TEXT", "defaultValue": "0 req/s" },
        { "propertyName": "替换文本", "type": "TEXT", "defaultValue": "Checkbox" },
        { "propertyName": "Active 激活", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Background 背景色", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Border 描边", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "Color/State 颜色/状态", "type": "VARIANT", "defaultValue": "Success 绿", "options": ["Loading 蓝","Processing 蓝","Stop 灰","Warning 黄","Success 绿","Error 红"] },
        { "propertyName": "Digital 数字", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disable  禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disabled 禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Dropdown 下拉", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 填写", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 已填", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "Hover 悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Icon 图标", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Item 数量", "type": "VARIANT", "defaultValue": "3", "options": ["2","3","4","5","6","7","8"] },
        { "propertyName": "Level 级别", "type": "VARIANT", "defaultValue": "三级", "options": ["一级","二级","三级","特殊场景"] },
        { "propertyName": "Multiple 多选", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Property 1", "type": "VARIANT", "defaultValue": "percentage", "options": ["Variant2","percentage","Variant3","Variant4","Variant5","Variant6"] },
        { "propertyName": "Size", "type": "VARIANT", "defaultValue": "Mini 24", "options": ["Small 28","Mini 24","Default 32","Large 36"] },
        { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Small 28","Default 32"] },
        { "propertyName": "State", "type": "VARIANT", "defaultValue": "Focused", "options": ["Default","Focused","Disable"] },
        { "propertyName": "State 状态", "type": "VARIANT", "defaultValue": "Default 默认", "options": ["Default 默认","Hover 悬浮","Active 激活"] },
        { "propertyName": "Tooltip 提示", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Type", "type": "VARIANT", "defaultValue": "Date", "options": ["Date","DateTime","Line","RelativeDate","RelativeDateRange","Custom"] },
        { "propertyName": "Type 类型", "type": "VARIANT", "defaultValue": "actionBar", "options": ["actionBar","titleBar"] },
        { "propertyName": "tooltip 位置 position", "type": "VARIANT", "defaultValue": "右 right", "options": ["右 right","左 left"] },
        { "propertyName": "x 轴类型 type", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","双行 double lines","30°","45°","90°"] },
        { "propertyName": "位置 Position", "type": "VARIANT", "defaultValue": "顶部 Top", "options": ["顶部 Top","中部 Middle","底部 Bottom","报警线 Warning"] },
        { "propertyName": "位置 position", "type": "VARIANT", "defaultValue": "左 left", "options": ["左 left","右 right","toplist"] },
        { "propertyName": "半选", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "双 Y 轴 double Y-aixs", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "双行 twolines", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "图例 legend", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","数值对比 metrics"] },
        { "propertyName": "坐标轴标签 label", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "对比 Compare", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "对齐 alignment", "type": "VARIANT", "defaultValue": "左 换行 left aligned wrap", "options": ["左 left aligned","中 center aligned","左 换行 left aligned wrap"] },
        { "propertyName": "尺寸", "type": "VARIANT", "defaultValue": "12", "options": ["12","14","16","20","24","32","48"] },
        { "propertyName": "尺寸 Size", "type": "VARIANT", "defaultValue": "20 Legend", "options": ["20 Legend","40 双行 doubleline"] },
        { "propertyName": "布局 layout", "type": "VARIANT", "defaultValue": "上下 stacked", "options": ["上下 stacked","左右 side by side"] },
        { "propertyName": "悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "指标数值 Metric value", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "数量 ", "type": "VARIANT", "defaultValue": "1", "options": ["1","2","3","4","5","6"] },
        { "propertyName": "状态 State", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","悬浮 Hover"] },
        { "propertyName": "状态 state", "type": "VARIANT", "defaultValue": "默认 default", "options": ["悬浮  hover","默认 default"] },
        { "propertyName": "禁用", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "等级 level", "type": "VARIANT", "defaultValue": "critical", "options": ["critical","warning","notice"] },
        { "propertyName": "类型 Type", "type": "VARIANT", "defaultValue": "默认 default", "options": ["默认 default","平滑 smooth","大数据 big data"] },
        { "propertyName": "类型 type", "type": "VARIANT", "defaultValue": "复杂 complex", "options": ["复杂 complex","简单 simple"] },
        { "propertyName": "线数量", "type": "VARIANT", "defaultValue": "1", "options": ["1","2","3","4","5","6"] },
        { "propertyName": "虚线 Dotted", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "选中", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "预测 Projection", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "颜色 Color", "type": "VARIANT", "defaultValue": "品牌色 Primary blue", "options": ["品牌色 Primary blue","天蓝 Skybule","橙色 Orange","紫色 Purple","深绿 Dark green","黄 Yellow"] }
      ]
    }
  },

  // ── 柱状图 ───────────────────────────────────────────────────────────────
  "chart-bar": {
    "id": "chart-bar",
    "name": "柱状图",
    "category": "Chart",
    "description": "纵向柱状图，展示分类数值对比",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "纵向柱状图，适合分类对比",
      "usage": "用于分类对比、周期对比场景",
      "examples": [
        "3系列柱状图: { \"componentId\": \"chart-bar\", \"props\": { \"数量 \": \"3\", \"类型 type\": \"基础/分组柱 default\" } }",
        "堆叠柱状图: { \"componentId\": \"chart-bar\", \"props\": { \"数量 \": \"2\", \"类型 type\": \"堆叠 stacked\" } }"
      ]
    },
    "renderNotes": {
      "actionHint": "纵向柱状图用 chart-bar，横向条形/排行榜用 chart-toplist；params 属性名必须与 Figma variant propertyName 完全一致（含空格）",
      "paramRules": [
        "数量  取值 1–4，表示数据系列数（注意属性名末尾有一个空格）",
        "类型 type：基础/分组柱 default | 堆叠 stacked | 百分比堆叠 stacked part to whole"
      ],
      "commonErrors": [
        "chart-bar 是纵向柱状图，横向条形/排行榜用 chart-toplist",
        "属性名 '数量 ' 末尾有一个空格，必须保留"
      ]
    },
    "params": {
      "数量 ": {
        "type": "number",
        "default": 3,
        "description": "数据系列数量，取值 1–4（注意属性名末尾有空格）",
        "enumValues": ["1", "2", "3", "4"]
      },
      "类型 type": {
        "type": "string",
        "default": "基础/分组柱 default",
        "description": "柱型：基础/分组柱 default | 堆叠 stacked | 百分比堆叠 stacked part to whole",
        "enumValues": ["基础/分组柱 default", "堆叠 stacked", "百分比堆叠 stacked part to whole"]
      },
      "Show Legend": {
        "type": "boolean",
        "default": true,
        "description": "是否显示图例"
      },
      "height": {
        "type": "number",
        "default": 0,
        "description": "图表高度（px），0 或不填则保持设计系统原始比例"
      }
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "VERTICAL"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-display-component-barchart",
      "componentKey": "a83efa5b5ba4efbdb96694268b50e43a61bee971",
      "inspectedAt": "2026-03-23T08:06:24.603Z",
      "source": "discover_component_props",
      "componentSetName": "BarChart 柱状图",
      "properties": [
        { "propertyName": "Current", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Max", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Mean", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Min", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Legend", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Scale", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Threshold", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show VerticalLine", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Warning", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show tooltip", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "复选框 checkbox", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作按钮 action button", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作行 ActionBar", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "数值概览 Summary", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "日期选择器 Datepicker", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "显示标签", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "更多信息 MoreInfo", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "翻页", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "选择器 Dropdown", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选项卡 Tabs", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Icon", "type": "INSTANCE_SWAP", "defaultValue": "13:8386" },
        { "propertyName": "Placeholder 占位符", "type": "TEXT", "defaultValue": "请选择" },
        { "propertyName": "Value", "type": "TEXT", "defaultValue": "北京" },
        { "propertyName": "Y right units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "Y units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "替换文本", "type": "TEXT", "defaultValue": "Checkbox" },
        { "propertyName": "Active 激活", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Digital 数字", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disable  禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disabled 禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 填写", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 已填", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "Hover 悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Icon 图标", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Item 数量", "type": "VARIANT", "defaultValue": "3", "options": ["2","3","4","5","6","7","8"] },
        { "propertyName": "Multiple 多选", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Property 1", "type": "VARIANT", "defaultValue": "percentage", "options": ["Variant2","percentage","Variant3","Variant4","Variant5","Variant6"] },
        { "propertyName": "Size", "type": "VARIANT", "defaultValue": "Mini 24", "options": ["Small 28","Mini 24","Default 32","Large 36"] },
        { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Small 28","Default 32"] },
        { "propertyName": "State", "type": "VARIANT", "defaultValue": "Focused", "options": ["Default","Focused","Disable"] },
        { "propertyName": "State 状态", "type": "VARIANT", "defaultValue": "Default 默认", "options": ["Default 默认","Hover 悬浮","Active 激活"] },
        { "propertyName": "Tooltip 提示", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Type", "type": "VARIANT", "defaultValue": "Date", "options": ["Date","DateTime","Line","RelativeDate","RelativeDateRange","Custom"] },
        { "propertyName": "Type 类型", "type": "VARIANT", "defaultValue": "actionBar", "options": ["actionBar","titleBar"] },
        { "propertyName": "x 轴类型 type", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","双行 double lines","30°","45°","90°"] },
        { "propertyName": "位置 Position", "type": "VARIANT", "defaultValue": "顶部 Top", "options": ["顶部 Top","中部 Middle","底部 Bottom","报警线 Warning"] },
        { "propertyName": "位置 position", "type": "VARIANT", "defaultValue": "左 left", "options": ["左 left","右 right","toplist"] },
        { "propertyName": "半选", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "坐标轴标签 label", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "对齐 alignment", "type": "VARIANT", "defaultValue": "左 换行 left aligned wrap", "options": ["左 left aligned","中 center aligned","左 换行 left aligned wrap"] },
        { "propertyName": "尺寸", "type": "VARIANT", "defaultValue": "12", "options": ["12","14","16","20","24","32","48"] },
        { "propertyName": "悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "指标数值 Metric value", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "数量 ", "type": "VARIANT", "defaultValue": "1", "options": ["1","2","3","4"] },
        { "propertyName": "状态 State", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","悬浮 Hover","取消选择 unselected"] },
        { "propertyName": "状态 state", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","悬浮 hover","聚焦 focused"] },
        { "propertyName": "禁用", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "等级 level", "type": "VARIANT", "defaultValue": "critical", "options": ["critical","warning","notice"] },
        { "propertyName": "类型 Type", "type": "VARIANT", "defaultValue": "默认 default", "options": ["默认 default","密集 intense","区间 area"] },
        { "propertyName": "类型 type", "type": "VARIANT", "defaultValue": "基础/分组柱 default", "options": ["百分比堆叠 stacked part to whole","基础/分组柱 default","堆叠 stacked"] },
        { "propertyName": "适配方式 responsive", "type": "VARIANT", "defaultValue": "固定柱宽 fixed width", "options": ["固定柱宽 fixed width","固定间距 fixed gap"] },
        { "propertyName": "选中", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] }
      ]
    }
  },

  // ── 面积图 ───────────────────────────────────────────────────────────────
  "chart-area": {
    "id": "chart-area",
    "name": "面积图",
    "category": "Chart",
    "description": "面积图，展示趋势与量级",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "面积图，趋势+量级展示",
      "usage": "用于趋势对比、累计量展示场景",
      "examples": [
        "3条面积图: { \"componentId\": \"chart-area\", \"props\": { \"线数量 \": \"3\", \"类型 Type\": \"默认 Default\" } }",
        "堆叠面积图: { \"componentId\": \"chart-area\", \"props\": { \"线数量 \": \"2\", \"类型 Type\": \"堆叠 stacked\" } }"
      ]
    },
    "renderNotes": {
      "actionHint": "面积图用 chart-area；params 属性名必须与 Figma variant propertyName 完全一致（含空格和中英文混排）",
      "paramRules": [
        "线数量  取值 1–6，表示面积线条数（注意属性名末尾有一个空格）",
        "类型 Type：默认 Default | 平滑 Smooth | 堆叠 stacked | 百分比 stacked percentage"
      ],
      "commonErrors": [
        "属性名 '线数量 ' 末尾有一个空格，必须保留"
      ]
    },
    "params": {
      "线数量 ": {
        "type": "number",
        "default": 3,
        "description": "面积线条数，取值 1–6（注意属性名末尾有空格）",
        "enumValues": ["1", "2", "3", "4", "5", "6"]
      },
      "类型 Type": {
        "type": "string",
        "default": "默认 Default",
        "description": "面积图类型：默认 Default | 平滑 Smooth | 堆叠 stacked | 百分比 stacked percentage",
        "enumValues": ["默认 Default", "平滑 Smooth", "堆叠 stacked", "百分比 stacked percentage"]
      },
      "Show Legend": {
        "type": "boolean",
        "default": true,
        "description": "是否显示图例"
      },
      "height": {
        "type": "number",
        "default": 0,
        "description": "图表高度（px），0 或不填则保持设计系统原始比例"
      }
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "VERTICAL"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-display-component-areachart",
      "componentKey": "99fdb5caaa7ae3a429f0bb83022f737cd34caa01",
      "inspectedAt": "2026-03-23T08:06:33.280Z",
      "source": "discover_component_props",
      "componentSetName": "AreaChart 面积图",
      "properties": [
        { "propertyName": "Current", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Max", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Mean", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Min", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Legend", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Scale", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show Threshold", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Tooltip", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Show VerticalLine", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show Warning", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "Show 标题", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "icon", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "下钻操作 Action", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "告警信息 Alert", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "复选框 checkbox", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作按钮 action button", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "操作行 ActionBar", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "数值概览 Summary", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "数据", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "数据点 Data point", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "日期选择器 Datepicker", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "显示标签", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "更多信息 MoreInfo", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "翻页", "type": "BOOLEAN", "defaultValue": false, "options": ["True","False"] },
        { "propertyName": "选择器 Dropdown", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "选项卡 Tabs", "type": "BOOLEAN", "defaultValue": true, "options": ["True","False"] },
        { "propertyName": "Icon", "type": "INSTANCE_SWAP", "defaultValue": "13:8386" },
        { "propertyName": "Placeholder 占位符", "type": "TEXT", "defaultValue": "请选择" },
        { "propertyName": "Value", "type": "TEXT", "defaultValue": "北京" },
        { "propertyName": "Y right units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "Y units", "type": "TEXT", "defaultValue": "ms" },
        { "propertyName": "value", "type": "TEXT", "defaultValue": "0 req/s" },
        { "propertyName": "替换文本", "type": "TEXT", "defaultValue": "Checkbox" },
        { "propertyName": "Active 激活", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Background 背景色", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Border 描边", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "Color/State 颜色/状态", "type": "VARIANT", "defaultValue": "Success 绿", "options": ["Loading 蓝","Processing 蓝","Stop 灰","Warning 黄","Success 绿","Error 红"] },
        { "propertyName": "Digital 数字", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disable  禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Disabled 禁用", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Dropdown 下拉", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 填写", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Filled 已填", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "Hover 悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Icon 图标", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Item 数量", "type": "VARIANT", "defaultValue": "3", "options": ["2","3","4","5","6","7","8"] },
        { "propertyName": "Level 级别", "type": "VARIANT", "defaultValue": "三级", "options": ["一级","二级","三级","特殊场景"] },
        { "propertyName": "Multiple 多选", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "Property 1", "type": "VARIANT", "defaultValue": "percentage", "options": ["Variant2","percentage","Variant3","Variant4","Variant5","Variant6"] },
        { "propertyName": "Size", "type": "VARIANT", "defaultValue": "Mini 24", "options": ["Small 28","Mini 24","Default 32","Large 36"] },
        { "propertyName": "Size 尺寸", "type": "VARIANT", "defaultValue": "Default 32", "options": ["Small 28","Default 32"] },
        { "propertyName": "State", "type": "VARIANT", "defaultValue": "Focused", "options": ["Default","Focused","Disable"] },
        { "propertyName": "State 状态", "type": "VARIANT", "defaultValue": "Default 默认", "options": ["Default 默认","Hover 悬浮","Active 激活"] },
        { "propertyName": "Tooltip 提示", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "Type", "type": "VARIANT", "defaultValue": "Date", "options": ["Date","DateTime","Line","RelativeDate","RelativeDateRange","Custom"] },
        { "propertyName": "Type 类型", "type": "VARIANT", "defaultValue": "actionBar", "options": ["actionBar","titleBar"] },
        { "propertyName": "tooltip 位置 position", "type": "VARIANT", "defaultValue": "右 right", "options": ["右 right","左 left"] },
        { "propertyName": "x 轴类型 type", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","双行 double lines","30°","45°","90°"] },
        { "propertyName": "位置 Position", "type": "VARIANT", "defaultValue": "顶部 Top", "options": ["顶部 Top","中部 Middle","底部 Bottom","报警线 Warning"] },
        { "propertyName": "位置 position", "type": "VARIANT", "defaultValue": "左 left", "options": ["左 left","右 right","toplist"] },
        { "propertyName": "半选", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "双 Y 轴 double Y-aixs", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "双行 twolines", "type": "VARIANT", "defaultValue": "False", "options": ["False","True"] },
        { "propertyName": "图例 legend", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","数值对比 metrics"] },
        { "propertyName": "坐标轴标签 label", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "对齐 alignment", "type": "VARIANT", "defaultValue": "左 换行 left aligned wrap", "options": ["左 left aligned","中 center aligned","左 换行 left aligned wrap"] },
        { "propertyName": "尺寸", "type": "VARIANT", "defaultValue": "12", "options": ["12","14","16","20","24","32","48"] },
        { "propertyName": "尺寸 Size", "type": "VARIANT", "defaultValue": "20 Legend", "options": ["20 Legend","40 双行 doubleline"] },
        { "propertyName": "布局 layout", "type": "VARIANT", "defaultValue": "上下 stacked", "options": ["上下 stacked","左右 side by side"] },
        { "propertyName": "悬停", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "指标数值 Metric value", "type": "VARIANT", "defaultValue": "False", "options": ["True","False"] },
        { "propertyName": "数量 ", "type": "VARIANT", "defaultValue": "1", "options": ["1","2","3","4","5","6"] },
        { "propertyName": "状态 State", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","悬浮 Hover"] },
        { "propertyName": "状态 state", "type": "VARIANT", "defaultValue": "默认 default", "options": ["悬浮  hover","默认 default"] },
        { "propertyName": "禁用", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "等级 level", "type": "VARIANT", "defaultValue": "critical", "options": ["critical","warning","notice"] },
        { "propertyName": "类型 Type", "type": "VARIANT", "defaultValue": "默认 Default", "options": ["默认 Default","平滑 Smooth","堆叠 stacked","百分比 stacked percentage"] },
        { "propertyName": "类型 type", "type": "VARIANT", "defaultValue": "复杂 complex", "options": ["复杂 complex","简单 simple"] },
        { "propertyName": "线数量 ", "type": "VARIANT", "defaultValue": "6", "options": ["1","2","3","4","5","6"] },
        { "propertyName": "选中", "type": "VARIANT", "defaultValue": "false", "options": ["false","true"] },
        { "propertyName": "颜色 Color", "type": "VARIANT", "defaultValue": "品牌色 Primary blue", "options": ["品牌色 Primary blue","深绿 Dark green","橙色 Orange","紫色 Purple","黄 Yellow","天蓝 Skybule"] }
      ]
    }
  }
};
