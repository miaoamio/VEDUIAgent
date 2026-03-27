import type { ComponentRegistry } from "../../registry.types";

const formRowRenderNotes = {
  actionHint: "同一行多个字段时使用，单字段行不需要 form-row。",
  paramRules: [
    "仅在多字段同行时使用。",
    "行内间距使用 spacing 控制。"
  ],
  commonErrors: [
    "单字段行不要包 form-row。"
  ]
};

const switchRenderNotes = {
  actionHint: "开关必须使用 Switch 组件，避免手绘。",
  paramRules: [
    "checked 控制开关状态。",
    "disabled 为 true 时强制使用禁用变体。"
  ],
  commonErrors: [
    "不要用 checkbox 代替 switch。"
  ]
};

const textareaRenderNotes = {
  actionHint: "多行文本使用 TextArea 组件。",
  paramRules: [
    "placeholder/value 仅影响展示文本。"
  ],
  commonErrors: [
    "不要用 input 拉高充当 textarea。"
  ]
};

export const formComponents: ComponentRegistry["components"] = {
  "filter-group": {
    "id": "filter-group",
    "name": "筛选器组",
    "category": "Form",
    "description": "用于表格/列表顶部的一组筛选控件，内部复用 Select（Type=Label 内置标签）并按 smarttable 的交互文案规则生成占位符；search 类型会将下拉 icon 替换为搜索 icon。",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "用于表格/列表顶部的一组筛选控件，内部复用 Select（Type=Label 内置标签）并按 smarttable 的交互文案规则生成占位符；search 类型会将下拉 icon 替换为搜索 icon。",
      "usage": "用于生成筛选条（多个选择器 + 可选搜索项）。通过 itemsText 配置筛选项，格式为用逗号/换行分隔的 `label:type`，其中 type 支持 select/input/search；未写 type 默认 select。内部统一使用 select 组件（selectType=Label 内置标签）。search 类型需要把下拉 icon 替换成 search icon；input 类型默认隐藏下拉 icon。注意：当用户明确要“筛选器组(filter-group)”时，直接创建该组件，不要用 draw_form 代替。",
      "examples": [
        "筛选器组: { \"componentId\": \"filter-group\", \"params\": { \"itemsText\": \"状态:select,城市:select,关键词:search\" } }"
      ]
    },
    "renderNotes": {
      "actionHint": "筛选器组是独立组件；创建它请使用 create_node(componentId=\"filter-group\")，不要用 draw_form 代替（除非用户明确要带字段标签的表单布局）。",
      "paramRules": [
        "itemsText 格式为 逗号/换行分隔的 label:type；type 支持 select/input/search（search 会将下拉 icon 替换为 search icon）"
      ]
    },
    "params": {
      "itemsText": {
        "type": "string",
        "default": "状态:select,城市:select,关键词:search",
        "description": "筛选项配置：逗号/换行分隔 `label:type`；type 支持 select/input/search"
      },
      "gap": {
        "type": "number",
        "default": 12,
        "description": "筛选项间距"
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "筛选器组宽度；0 表示自适应（仅在作为根节点单独生成时默认采用 1000）"
      },
      "itemWidth": {
        "type": "number",
        "default": 0,
        "description": "每个筛选项宽度；0 表示 Fill（内部 select 默认填充父容器）"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸（透传给内部 select.size）",
        "enumValues": [
          "Mini 24",
          "Small 28",
          "Default 32",
          "Large 36"
        ]
      },
      "state": {
        "type": "select",
        "default": "Default 默认",
        "description": "交互状态（透传给内部 select.state）",
        "enumValues": [
          "Default 默认",
          "Hover 悬浮",
          "Active 激活"
        ]
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用（透传给内部 select.disabled）"
      }
    },
    "capabilities": {
      "allowChildren": false,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "FRAME",
      "preferredLayoutMode": "HORIZONTAL",
      "renderKey": "filter-group"
    }
  },
  "radio-group": {
    "id": "radio-group",
    "name": "单选框组",
    "category": "Form",
    "description": "单选框组选项控件，优先按 lib-data-input-radio-group 高保真复刻；会根据 optionsText 调整子项数量并覆写选中状态",
    "isRebuilt": true,
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "单选框组选项控件，优先按 lib-data-input-radio-group 高保真复刻；会根据 optionsText 调整子项数量并覆写选中状态",
      "usage": "当表单字段需要单选能力时使用。通过 optionsText 传入逗号或换行分隔的选项，value 传入默认选中值；优先导入原始 Figma 组组件后做最小编辑。",
      "examples": [
        "横向单选框组: { \"componentId\": \"radio-group\", \"params\": { \"optionsText\": \"选项一,选项二\", \"value\": \"选项一\" } }"
      ]
    },
    "renderNotes": {
      "actionHint": "Checkbox/radio 视觉敏感，优先复用真实 Figma 组件；不要用 vector/svg/path/text 手工绘制勾选或圆点。",
      "paramRules": [
        "多选行优先使用 checkbox-group；单选行使用 radio-group"
      ]
    },
    "params": {
      "optionsText": {
        "type": "string",
        "default": "选项一,选项二",
        "description": "选项文案，支持逗号或换行分隔"
      },
      "value": {
        "type": "string",
        "default": "选项一",
        "description": "默认选中值"
      },
      "direction": {
        "type": "select",
        "default": "horizontal",
        "description": "排列方向",
        "enumValues": [
          "horizontal",
          "vertical"
        ]
      },
      "language": {
        "type": "select",
        "default": "CN",
        "description": "语言变体",
        "enumValues": [
          "CN",
          "EN"
        ]
      },
      "gap": {
        "type": "number",
        "default": 24,
        "description": "选项间距"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      }
    },
    "capabilities": {
      "allowChildren": false,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "FRAME",
      "preferredLayoutMode": "VERTICAL",
      "renderKey": "radio-group"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-radio-group",
      "inspectedAt": "2026-03-09T12:22:45.030Z",
      "source": "discover_component_props",
      "properties": [
        {
          "propertyName": "Items 数量",
          "type": "VARIANT",
          "defaultValue": "2",
          "options": [
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8"
          ]
        },
        {
          "propertyName": "Language",
          "type": "VARIANT",
          "defaultValue": "CN",
          "options": [
            "CN",
            "EN"
          ]
        },
        {
          "propertyName": "Layout 布局",
          "type": "VARIANT",
          "defaultValue": "Horizontal 横向",
          "options": [
            "Horizontal 横向",
            "Vertical 纵向"
          ]
        }
      ]
    },
    "colorVariableBindings": {
      "radio-bg": {
        "enabled": true,
        "token": "radio.bg",
        "variableRef": "VariableID:3b36108b1612c5eeaf85b5f30ae6cb5bcf12e042/174382:780",
        "keyCandidates": [
          "3b36108b1612c5eeaf85b5f30ae6cb5bcf12e042"
        ],
        "idCandidates": [
          "VariableID:3b36108b1612c5eeaf85b5f30ae6cb5bcf12e042/174382:780"
        ],
        "nameCandidates": [
          "color-bg-1",
          "fill/输入类组件填充 @color-bg-white",
          "@color-bg-white"
        ]
      },
      "radio-border": {
        "enabled": true,
        "token": "radio.border",
        "nameCandidates": [
          "color-border-1"
        ]
      },
      "radio-selected-border": {
        "enabled": true,
        "token": "radio.selected.border",
        "variableRef": "VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300",
        "keyCandidates": [
          "75f358d76d414f045a47f128470fcbbde49888dc"
        ],
        "idCandidates": [
          "VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300"
        ],
        "nameCandidates": [
          "link-6"
        ]
      },
      "radio-dot": {
        "enabled": true,
        "token": "radio.dot",
        "variableRef": "VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300",
        "keyCandidates": [
          "75f358d76d414f045a47f128470fcbbde49888dc"
        ],
        "idCandidates": [
          "VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300"
        ],
        "nameCandidates": [
          "link-6"
        ]
      },
      "radio-label": {
        "enabled": true,
        "token": "radio.text",
        "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
        "keyCandidates": [
          "178115a8c3bc7983da5bc10e637208895750dbfd"
        ],
        "idCandidates": [
          "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
        ]
      }
    }
  },
  "form": {
    "id": "form",
    "name": "表单",
    "category": "Form",
    "description": "自定义表单容器，支持横向、纵向布局，也支持对齐方式和标签长度预设",
    "isRebuilt": true,
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "自定义表单容器，支持横向、纵向布局，也支持对齐方式和标签长度预设",
      "usage": "## draw_form 使用规则\n\n**创建/新建表单** → `draw_form(payload)`，**修改已有表单** → `apply_scene`（增量改，不要重新生成）\n\n### payload 结构\n```\n{\n  layout?: 'vertical'(默认) | 'horizontal',\n  align?: 'top'(默认) | 'left' | 'right',\n  labelWidthPreset?: 'fill'(默认) | 'default-80' | 'medium-120' | 'large-160',\n  width?: number,          // 0=自动\n  rowSpacing?: number,     // 默认 24\n  rows: FieldItem[][],     // 每行一个子数组；默认每行只放 1 个字段\n  footer?: {               // 按钮区（独立于 rows，不要放进 rows 里）\n    actions: ActionItem[],\n    align?: 'end'(默认) | 'start' | 'center'\n  }\n}\n```\n\n### FieldItem 字段格式\n```\n{ componentId: 'input'|'select'|'checkbox-group'|'radio-group'|'switch'|\n               'datepicker'|'timepicker'|'inputnumber'|'slider'|'textarea'|'upload',\n  label: string, required?: boolean, placeholder?: string,\n  props?: { optionsText?: string, checkedValues?: string, value?: string, ... } }\n```\n\n### 关键规则\n- **默认单列**：每个 rows 子数组只放 1 个字段，除非用户明确要求双列/多列\n- **按钮独立**：提交/重置等操作按钮放 `footer.actions`，不要放进 rows\n- **不要用 form-row 包单字段**：`form-row` 仅在同一行多字段时自动使用\n- 如果用户要\"筛选器/筛选条\"→ 用 `create_node(\"filter-group\")`，不是 draw_form\n- 图片生成场景：必须用 rows[][] 输出所有识别到的字段，不要省略",
      "examples": [
        "## 示例1：纵向登录表单\n```json\n{ \"layout\": \"vertical\", \"align\": \"top\", \"labelWidthPreset\": \"fill\",\n  \"rows\": [\n    [{ \"componentId\": \"input\", \"label\": \"用户名\", \"required\": true, \"placeholder\": \"请输入用户名\" }],\n    [{ \"componentId\": \"input\", \"label\": \"密码\", \"required\": true, \"placeholder\": \"请输入密码\" }]\n  ],\n  \"footer\": { \"actions\": [{ \"label\": \"登录\", \"variant\": \"primary\" }], \"align\": \"center\" }\n}```",
        "## 示例2：带下拉/复选的纵向编辑表单\n```json\n{ \"layout\": \"vertical\", \"align\": \"top\",\n  \"rows\": [\n    [{ \"componentId\": \"input\", \"label\": \"姓名\", \"required\": true }],\n    [{ \"componentId\": \"select\", \"label\": \"部门\", \"props\": { \"optionsText\": \"产品,研发,设计,运营\" } }],\n    [{ \"componentId\": \"radio-group\", \"label\": \"性别\", \"props\": { \"optionsText\": \"男,女\", \"checkedValues\": \"男\" } }],\n    [{ \"componentId\": \"datepicker\", \"label\": \"入职日期\" }],\n    [{ \"componentId\": \"textarea\", \"label\": \"备注\", \"placeholder\": \"请输入备注\" }],\n    [{ \"componentId\": \"inputnumber\", \"label\": \"数量\", \"disabled\": true }]\n  ],\n  \"footer\": { \"actions\": [{ \"label\": \"保存\", \"variant\": \"primary\" }, { \"label\": \"取消\" }], \"align\": \"end\" }\n}```",
        "## 示例3：横向筛选表单（双列）\n```json\n{ \"layout\": \"horizontal\", \"labelWidthPreset\": \"default-80\",\n  \"rows\": [\n    [{ \"componentId\": \"input\", \"label\": \"关键词\" }, { \"componentId\": \"select\", \"label\": \"状态\", \"props\": { \"optionsText\": \"全部,启用,禁用\" } }],\n    [{ \"componentId\": \"datepicker\", \"label\": \"开始日期\" }, { \"componentId\": \"datepicker\", \"label\": \"结束日期\" }]\n  ],\n  \"footer\": { \"actions\": [{ \"label\": \"搜索\", \"variant\": \"primary\" }, { \"label\": \"重置\" }], \"align\": \"end\" }\n}```",
        "## 示例4：带分组开关的设置表单\n```json\n{ \"layout\": \"vertical\", \"align\": \"top\",\n  \"rows\": [\n    [{ \"componentId\": \"input\", \"label\": \"应用名称\", \"required\": true }],\n    [{ \"componentId\": \"select\", \"label\": \"类型\", \"props\": { \"optionsText\": \"Web应用,移动应用,API\" } }],\n    [{ \"componentId\": \"switch\", \"label\": \"启用通知\" }],\n    [{ \"componentId\": \"checkbox-group\", \"label\": \"权限\", \"props\": { \"optionsText\": \"读取,写入,删除\" } }]\n  ],\n  \"footer\": { \"actions\": [{ \"label\": \"保存设置\", \"variant\": \"primary\" }], \"align\": \"end\" }\n}```"
      ]
    },
    "renderNotes": {
      "actionHint": "新建表单用 draw_form；修改已有表单用 apply_scene（不要重新 draw_form，会丢失控件类型）。",
      "paramRules": [
        "layout: vertical（默认）| horizontal",
        "align: top（默认）| left | right",
        "labelWidthPreset: fill（默认）| default-80 | medium-120 | large-160",
        "rows: 每行一个子数组，默认每行 1 个字段，用户要双列才放 2 个",
        "footer.actions: 按钮组，独立于 rows，渲染在表单底部"
      ],
      "commonErrors": [
        "按钮(提交/重置)放进了 rows 里 → 应放 footer.actions",
        "单字段行用了 form-row 包裹 → form-row 仅用于同行多字段",
        "rows 里直接放控件实例 → 应通过 form-field 统一承载并传递控件参数",
        "图片生成时只输出了部分字段 → 必须输出所有识别到的字段"
      ],
      "agentHints": [
        "控件类型不确定→input，有选项→select/checkbox-group/radio-group，时间日期→datepicker/timepicker，长文→textarea，数字→inputnumber",
        "复选框/单选框/开关优先用真实控件(checkbox-group/radio-group/switch)，不要手工画"
      ]
    },
    "params": {
      "title": {
        "type": "string",
        "default": "",
        "description": "表单标题"
      },
      "layout": {
        "type": "select",
        "default": "vertical",
        "description": "表单布局方式",
        "enumValues": [
          "horizontal",
          "vertical"
        ]
      },
      "align": {
        "type": "select",
        "default": "top",
        "description": "标签对齐方式",
        "enumValues": [
          "top",
          "left",
          "right"
        ]
      },
      "labelWidthPreset": {
        "type": "select",
        "default": "custom",
        "description": "标签长度预设",
        "enumValues": [
          "fill",
          "default-80",
          "medium-120",
          "large-160",
          "custom"
        ]
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "表单宽度 (0为根据内容自动计算)"
      },
      "rowSpacing": {
        "type": "number",
        "default": 24,
        "description": "表单行间距"
      },
      "columnSpacing": {
        "type": "number",
        "default": 16,
        "description": "同一行字段间距"
      },
      "labelWidth": {
        "type": "number",
        "default": 96,
        "description": "标签宽度"
      },
      "controlWidth": {
        "type": "number",
        "default": 240,
        "description": "输入框类控件宽度"
      },
      "controlWidthMode": {
        "type": "segmented",
        "default": "fixed",
        "description": "输入框类控件宽度模式",
        "enumValues": [
          "fixed",
          "fill"
        ]
      },
      "showColon": {
        "type": "boolean",
        "default": false,
        "description": "显示标签冒号"
      },
      "showActionArea": {
        "type": "boolean",
        "default": false,
        "description": "显示按钮区"
      },
      "requiredMark": {
        "type": "boolean",
        "default": true,
        "description": "必填字段显示星号"
      }
    },
    "slots": {
      "default": {
        "displayName": "Default",
        "allowedComponents": [
          "form-row",
          "form-field",
          "button",
          "layout",
          "text"
        ],
        "required": false,
        "minItems": 0,
        "ordered": true
      }
    },
    "capabilities": {
      "allowChildren": true,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "FRAME",
      "preferredLayoutMode": "VERTICAL",
      "renderKey": "form"
    },
    "runtime": {
      "spacing": {
        "rowSpacingTop": 24,
        "rowSpacingDefault": 12
      },
      "labelWidth": {
        "default": 96,
        "presets": {
          "default-80": 80,
          "medium-120": 120,
          "large-160": 160
        },
        "variantThresholds": {
          "medium": 110,
          "large": 150
        }
      }
    }
  },
  "form-row": {
    "id": "form-row",
    "name": "表单行",
    "category": "Form",
    "description": "表单内部的一行容器，用于放置多个表单字段或操作按钮",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表单内部的一行容器，仅用于同一行放多个字段时",
      "usage": "**只在同一行需要多个字段时使用**，单字段行不需要 form-row 包裹（draw_form 会自动处理）。",
      "examples": [
        "双列行: { componentId: 'form-row', params: { spacing: 16 }, children: [field1, field2] }"
      ]
    },
    "params": {
      "spacing": {
        "type": "number",
        "default": 16,
        "description": "子项间距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "底部内边距"
      },
      "align": {
        "type": "select",
        "default": "start",
        "description": "主轴对齐方式",
        "enumValues": [
          "start",
          "center",
          "end",
          "between"
        ]
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "行宽 (0为自适应)"
      }
    },
    "slots": {
      "default": {
        "displayName": "Default",
        "allowedComponents": [
          "form-field",
          "button",
          "text",
          "layout"
        ],
        "required": false,
        "minItems": 0,
        "ordered": true
      }
    },
    "capabilities": {
      "allowChildren": true,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "FRAME",
      "preferredLayoutMode": "HORIZONTAL",
      "renderKey": "form-row"
    },
    "renderNotes": formRowRenderNotes
  },
  "form-field": {
    "id": "form-field",
    "name": "表单字段",
    "category": "Form",
    "description": "带标签的表单字段单元，支持 input/select/checkbox-group/radio-group/button 等原子控件",
    "isRebuilt": true,
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "带标签的表单字段单元，通过 controlType 选择内部控件",
      "usage": "通过 draw_form 的 rows 自动生成，不需要手动创建。controlType 决定控件类型。",
      "examples": [
        "输入框: { componentId: 'input', label: '姓名', required: true, placeholder: '请输入' }",
        "数字输入: { componentId: 'inputnumber', label: '数量', disabled: true }",
        "下拉选: { componentId: 'select', label: '状态', props: { optionsText: '启用,禁用' } }",
        "复选框: { componentId: 'checkbox-group', label: '权限', props: { optionsText: '读,写,删', checkedValues: '读' } }",
        "日期: { componentId: 'datepicker', label: '日期' }",
        "开关: { componentId: 'switch', label: '启用' }"
      ]
    },
    "renderNotes": {
      "actionHint": "表单字段内部控件统一用 Figma 组件 token/key 渲染。",
      "paramRules": [
        "controlType 决定内部控件类型，label/placeholder/value 等参数按控件语义传递",
        "input 控件高度由 size 决定（Default 32px / Small 28px / Mini 24px / Large 36px），渲染引擎自动应用，无需手动传 height",
        "内部 controlColumn wrapper（input + helpText/errorText 的容器）会 clip content，其余容器不 clip"
      ]
    },
    "params": {
      "label": {
        "type": "string",
        "default": "字段",
        "description": "字段标签"
      },
      "required": {
        "type": "boolean",
        "default": false,
        "description": "必填"
      },
      "helpText": {
        "type": "string",
        "default": "",
        "description": "字段说明文案"
      },
      "showHelpIcon": {
        "type": "boolean",
        "default": false,
        "description": "说明 icon"
      },
      "descriptionText": {
        "type": "string",
        "default": "描述文字",
        "description": "字段补充说明，对应 Description 描述"
      },
      "showDescriptionText": {
        "type": "boolean",
        "default": false,
        "description": "描述文字"
      },
      "errorText": {
        "type": "string",
        "default": "",
        "description": "字段错误文案，对应 Error 报错"
      },
      "layout": {
        "type": "select",
        "default": "horizontal",
        "description": "字段布局方式",
        "enumValues": [
          "horizontal",
          "vertical"
        ]
      },
      "labelAlign": {
        "type": "select",
        "default": "left",
        "description": "标签文字对齐方式，对应 Align 左右对齐",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "labelWidthPreset": {
        "type": "select",
        "default": "custom",
        "description": "标签长度预设",
        "enumValues": [
          "fill",
          "default-80",
          "medium-120",
          "large-160",
          "custom"
        ]
      },
      "labelWidth": {
        "type": "number",
        "default": 96,
        "description": "标签宽度（横向生效）"
      },
      "controlWidth": {
        "type": "number",
        "default": 240,
        "description": "输入框类控件宽度"
      },
      "showColon": {
        "type": "boolean",
        "default": false,
        "description": "显示标签冒号"
      },
      "controlType": {
        "type": "select",
        "default": "input",
        "description": "控件类型",
        "enumValues": [
          "input",
          "select",
          "checkbox-group",
          "datepicker",
          "inputnumber",
          "radio-group",
          "segmented-picker",
          "slider",
          "switch",
          "textarea",
          "timepicker",
          "upload"
        ]
      },
      "placeholder": {
        "type": "string",
        "default": "已输入",
        "description": "输入框占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前值/选中值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "输入/选择框尺寸",
        "enumValues": [
          "Mini 24",
          "Small 28",
          "Default 32",
          "Large 36"
        ]
      },
      "state": {
        "type": "select",
        "default": "Default 默认",
        "description": "状态",
        "enumValues": [
          "Default 默认",
          "Hover 悬浮",
          "Active 激活",
          "Error 错误",
          "Disabled 禁用"
        ]
      },
      "showPrefix": {
        "type": "boolean",
        "default": false,
        "description": "显示输入框前缀"
      },
      "prefixText": {
        "type": "string",
        "default": "",
        "description": "输入框前缀文本"
      },
      "showSuffix": {
        "type": "boolean",
        "default": false,
        "description": "显示输入框后缀"
      },
      "suffixText": {
        "type": "string",
        "default": "",
        "description": "输入框后缀文本"
      },
      "multiple": {
        "type": "boolean",
        "default": false,
        "description": "多选"
      },
      "selectType": {
        "type": "boolean",
        "default": false,
        "description": "内置标签"
      },
      "optionsText": {
        "type": "string",
        "default": "选项一,选项二",
        "description": "选项组文案，支持逗号或换行分隔"
      },
      "language": {
        "type": "select",
        "default": "CN",
        "description": "单选组语言变体",
        "enumValues": [
          "CN",
          "EN"
        ]
      },
      "checkedValues": {
        "type": "string",
        "default": "选项一",
        "description": "复选组默认勾选值，支持逗号分隔多个值"
      },
      "checked": {
        "type": "boolean",
        "default": false,
        "description": "开关控件是否开启（仅 controlType=switch 时生效）"
      },

      "buttonLabel": {
        "type": "string",
        "default": "按钮",
        "description": "按钮文案"
      },
      "buttonVariant": {
        "type": "select",
        "default": "secondary",
        "description": "按钮样式",
        "enumValues": [
          "primary",
          "secondary",
          "outline"
        ]
      },
      "componentToken": {
        "type": "string",
        "default": "",
        "description": "设计系统组件 token"
      },
      "componentKey": {
        "type": "string",
        "default": "",
        "description": "设计系统组件 key"
      },
      "variantCriteria": {
        "type": "string",
        "default": "",
        "description": "Figma 组件变体条件 JSON 或 key=value"
      },
      "text": {
        "type": "string",
        "default": "",
        "description": "纯文本内容"
      }
    },
    "slots": {
      "default": {
        "displayName": "Default",
        "allowedComponents": [
          "radio-group",
          "button",
          "text"
        ],
        "required": false,
        "minItems": 0,
        "ordered": true
      }
    },
    "capabilities": {
      "allowChildren": true,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "FRAME",
      "preferredLayoutMode": "VERTICAL",
      "renderKey": "form-field"
    },
    "runtime": {
      "inputLikeControlTypes": [
          "input",
          "select",
          "datepicker",
          "inputnumber",
          "textarea",
          "timepicker"
        ]
    },
    "colorVariableBindings": {
      "form-label-text": {
        "enabled": true,
        "token": "form.label",
        "variableRef": "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562",
        "keyCandidates": [
          "a7442f0ba4f4f027d86e03f335df11c38232c0ce"
        ],
        "idCandidates": [
          "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"
        ]
      },
      "form-help-text": {
        "enabled": true,
        "token": "form.help",
        "variableRef": "VariableID:98bdfd58bdd60974e1fe50bb12cd2c24661e8ded/174345:276",
        "keyCandidates": [
          "98bdfd58bdd60974e1fe50bb12cd2c24661e8ded"
        ],
        "idCandidates": [
          "VariableID:98bdfd58bdd60974e1fe50bb12cd2c24661e8ded/174345:276"
        ],
        "nameCandidates": [
          "text/次要信息 @color-text-3",
          "@color-text-3"
        ]
      },
      "form-required-text": {
        "enabled": true,
        "token": "form.required",
        "variableRef": "VariableID:f60b03f9d134cb4ac3f68fb23b1fda9ba1304745/174345:672",
        "keyCandidates": [
          "f60b03f9d134cb4ac3f68fb23b1fda9ba1304745"
        ],
        "idCandidates": [
          "VariableID:f60b03f9d134cb4ac3f68fb23b1fda9ba1304745/174345:672"
        ]
      }
    },
    "typographyBindings": {
      "form-description-text-style-key": {
        "enabled": true,
        "token": "text.body",
        "textStyleRef": "S:ac8ef12de2cc499e51922d6b5239c26b3645a05a,131052:2",
        "keyCandidates": [
          "ac8ef12de2cc499e51922d6b5239c26b3645a05a"
        ],
        "idCandidates": [
          "S:ac8ef12de2cc499e51922d6b5239c26b3645a05a,131052:2"
        ],
        "nameCandidates": [
          "Body",
          "正文",
          "Text/Body"
        ]
      }
    }
  },
  "checkbox-group": {
    "id": "checkbox-group",
    "name": "复选框组",
    "category": "Form",
    "description": "复选框组控件（自定义包装）",
    "schemaVersion": "2.0.0",
    "renderNotes": {
      "actionHint": "Checkbox/radio 视觉敏感，优先复用真实 Figma 组件；不要用 vector/svg/path/text 手工绘制勾选。",
      "paramRules": [
        "多选行优先使用 checkbox-group；零散多选可组合多个 checkbox"
      ]
    },
    "params": {
      "optionsText": {
        "type": "string",
        "default": "选项一,选项二",
        "description": "选项文案"
      },
      "checkedValues": {
        "type": "string",
        "default": "选项一",
        "description": "默认勾选"
      },
      "direction": {
        "type": "select",
        "default": "horizontal",
        "description": "排列方向",
        "enumValues": [
          "horizontal",
          "vertical"
        ]
      },
      "gap": {
        "type": "number",
        "default": 24,
        "description": "间距"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      }
    },
    "capabilities": {
      "allowChildren": false,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "HORIZONTAL",
      "renderKey": "checkbox-group"
    },
    "runtime": {
      "spacing": {
        "iconHitAreaSize": 16,
        "iconHitAreaThreshold": 24
      },
      "fallback": {
        "width": 120,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-checkbox-group",
      "inspectedAt": "2026-03-22T10:44:34.016Z",
      "source": "discover_component_props",
      "componentSetName": "Checkbox Group 复选框组",
      "properties": [
        {
          "propertyName": "Items 数量",
          "type": "VARIANT",
          "defaultValue": "2",
          "options": [
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8"
          ]
        },
        {
          "propertyName": "Layout 布局",
          "type": "VARIANT",
          "defaultValue": "Horizontal 横向",
          "options": [
            "Vertical 纵向",
            "Horizontal 横向"
          ]
        }
      ]
    }
  },
  "switch": {
    "id": "switch",
    "name": "开关",
    "category": "Form",
    "description": "开关控件",
    "schemaVersion": "2.0.0",
    "params": {
      "checked": {
        "type": "boolean",
        "default": false,
        "description": "是否选中"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "label": {
        "type": "boolean",
        "default": false,
        "description": "显示标签"
      },
      "loading": {
        "type": "boolean",
        "default": false,
        "description": "加载中"
      },
      "size": {
        "type": "select",
        "default": "Default  20",
        "description": "尺寸",
        "enumValues": [
          "Mini 16",
          "Default  20"
        ]
      }
    },
    "capabilities": {
      "allowChildren": false,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "HORIZONTAL",
      "renderKey": "switch"
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-switch",
      "componentKey": "d6017b9a513cbd53d6963d768259bbe0fcb8ddde",
      "inspectedAt": "2026-03-23T11:16:18.783Z",
      "source": "discover_component_props",
      "componentSetName": "Switch 开关",
      "properties": [
        {
          "propertyName": "Checked 开关",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Disabled 禁用",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Label 标签",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Loading 加载中",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Size 尺寸",
          "type": "VARIANT",
          "defaultValue": "Default  20",
          "options": [
            "Mini 16",
            "Default  20"
          ]
        }
      ],
      "propertyMap": {
        "Checked 开关": { "sourceParam": "checked", "transform": "boolean" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" },
        "Label 标签": { "sourceParam": "label", "transform": "boolean" },
        "Loading 加载中": { "sourceParam": "loading", "transform": "boolean" },
        "Size 尺寸": { "sourceParam": "size" }
      }
    },
    "renderNotes": switchRenderNotes
  },
  "textarea": {
    "id": "textarea",
    "name": "多行文本",
    "category": "Form",
    "description": "多行输入框",
    "schemaVersion": "2.0.0",
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请输入内容",
        "description": "占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前值"
      },
      "wordLimit": {
        "type": "boolean",
        "default": true,
        "description": "字数限制"
      },
      "resizable": {
        "type": "boolean",
        "default": true,
        "description": "可拖拽大小"
      },
      "filled": {
        "type": "boolean",
        "default": false,
        "description": "已填"
      },
      "error": {
        "type": "boolean",
        "default": false,
        "description": "错误态"
      },
      "state": {
        "type": "select",
        "default": "Default 默认",
        "description": "状态",
        "enumValues": [
          "Default 默认",
          "Hover 悬浮",
          "Active 激活"
        ]
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "width": {
        "type": "number",
        "default": 240,
        "description": "宽度"
      }
    },
    "capabilities": {
      "allowChildren": false,
      "allowSwapVariant": false,
      "allowSetProps": true,
      "allowSetLayout": true,
      "allowSetStyle": true,
      "allowBindData": false,
      "allowRemove": true
    },
    "figmaBinding": {
      "nodeType": "INSTANCE",
      "preferredLayoutMode": "HORIZONTAL",
      "renderKey": "textarea"
    },
    "runtime": {
      "fallback": {
        "width": 240,
        "height": 52
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-textarea",
      "componentKey": "acba4b2ca240bc5a54672107c78235f4f82fd419",
      "inspectedAt": "2026-03-23T11:15:24.142Z",
      "source": "discover_component_props",
      "componentSetName": "TextArea 文本域",
      "properties": [
        {
          "propertyName": "WordLimit 字数限制",
          "type": "BOOLEAN",
          "defaultValue": true,
          "options": [
            "True",
            "False"
          ]
        },
        {
          "propertyName": "可拖拽大小",
          "type": "BOOLEAN",
          "defaultValue": true,
          "options": [
            "True",
            "False"
          ]
        },
        {
          "propertyName": "placeholder 占位符",
          "type": "TEXT",
          "defaultValue": "This is the contents of the textarea.\n "
        },
        {
          "propertyName": "value",
          "type": "TEXT",
          "defaultValue": "This is the contents of the textarea.\n "
        },
        {
          "propertyName": "Disable 禁用",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Error 错误",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Filled 已填",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "True",
            "False"
          ]
        },
        {
          "propertyName": "State 状态",
          "type": "VARIANT",
          "defaultValue": "Default 默认",
          "options": [
            "Default 默认",
            "Hover 悬浮",
            "Active 激活"
          ]
        }
      ],
      "propertyMap": {
        "WordLimit 字数限制": { "sourceParam": "wordLimit", "transform": "boolean" },
        "可拖拽大小": { "sourceParam": "resizable", "transform": "boolean" },
        "placeholder 占位符": { "sourceParam": "placeholder" },
        "value": { "sourceParam": "value" },
        "Disable 禁用": { "sourceParam": "disabled", "transform": "boolean" },
        "Error 错误": { "sourceParam": "error", "transform": "boolean" },
        "Filled 已填": { "sourceParam": "filled", "transform": "boolean" },
        "State 状态": { "sourceParam": "state" }
      }
    },
    "renderNotes": textareaRenderNotes
  }
};
