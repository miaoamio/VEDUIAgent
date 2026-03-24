import type { ComponentRegistry } from "../../registry.types";

const inputRenderNotes = {
  actionHint: "优先复用设计系统 Input 组件，不要手工绘制输入框。",
  paramRules: [
    "size 控制高度，避免直接传 height。",
    "placeholder/value 按需设置即可。"
  ],
  commonErrors: [
    "不要用普通矩形+文本模拟输入框。"
  ]
};

const selectRenderNotes = {
  actionHint: "优先复用设计系统 Select 组件，optionsText 用逗号/换行分隔。",
  paramRules: [
    "selectType 用于控制内部标签/普通样式。",
    "multiple 为 true 时注意传 optionsText。"
  ],
  commonErrors: [
    "不要用 input 冒充 select。"
  ]
};


const datepickerRenderNotes = {
  actionHint: "日期选择器优先复用 Datepicker 组件。",
  paramRules: [
    "placeholder/value 仅影响展示文本。",
    "size 控制高度。"
  ],
  commonErrors: [
    "不要用普通 input 冒充日期选择器。"
  ]
};

const timepickerRenderNotes = {
  actionHint: "时间选择器优先复用 Timepicker 组件。",
  paramRules: [
    "placeholder/value 仅影响展示文本。",
    "size 控制高度。"
  ],
  commonErrors: [
    "不要用普通 input 冒充时间选择器。"
  ]
};

const inputNumberRenderNotes = {
  actionHint: "数字输入框使用 InputNumber 组件。",
  paramRules: [
    "value 为字符串或数字均可。",
    "size 控制高度。"
  ],
  commonErrors: [
    "不要用普通 input 代替数字输入框。"
  ]
};

const sliderRenderNotes = {
  actionHint: "滑动输入使用 Slider 组件。",
  paramRules: [
    "value 在 0-100 之间。",
    "showLabel 控制标签显示。"
  ],
  commonErrors: [
    "不要用线条手绘滑块。"
  ]
};


const uploadRenderNotes = {
  actionHint: "上传区域使用 Upload 组件。",
  paramRules: [
    "uploadType 决定拖拽/按钮样式。",
    "disabled 控制禁用态。"
  ],
  commonErrors: [
    "不要用卡片组件伪造上传区域。"
  ]
};

const segmentedPickerRenderNotes = {
  actionHint: "分段选择器使用 Segmented Picker 组件。",
  paramRules: [
    "optionsText 逗号/换行分隔。",
    "value 为当前选中项文本。"
  ],
  commonErrors: [
    "不要用 button 组替代 segmented-picker。"
  ]
};

export const inputComponents: ComponentRegistry["components"] = {
  "input": {
    "id": "input",
    "name": "输入框",
    "category": "Form",
    "description": "输入框控件（自定义包装）",
    "schemaVersion": "2.0.0",
    "params": {
      "placeholder": {
        "type": "string",
        "default": "已输入",
        "description": "占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "输入值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸",
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
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "showPrefix": {
        "type": "boolean",
        "default": false,
        "description": "显示前缀"
      },
      "prefixText": {
        "type": "string",
        "default": "",
        "description": "前缀文本"
      },
      "showSuffix": {
        "type": "boolean",
        "default": false,
        "description": "显示后缀"
      },
      "suffixText": {
        "type": "string",
        "default": "",
        "description": "后缀文本"
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "宽度"
      },
      "controlWidthMode": {
        "type": "select",
        "default": "fill",
        "description": "宽度模式",
        "enumValues": [
          "fixed",
          "fill"
        ]
      },
      "controlWidth": {
        "type": "number",
        "default": 0,
        "description": "控件宽度"
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
      "renderKey": "input"
    },
    "runtime": {
      "sizeMetrics": {
        "Mini 24": {
          "height": 24,
          "paddingX": 8,
          "paddingY": 3,
          "fontSize": 12,
          "cornerRadius": 4
        },
        "Small 28": {
          "height": 28,
          "paddingX": 10,
          "paddingY": 4,
          "fontSize": 12,
          "cornerRadius": 4
        },
        "Default 32": {
          "height": 32,
          "paddingX": 12,
          "paddingY": 5,
          "fontSize": 13,
          "cornerRadius": 4
        },
        "Large 36": {
          "height": 36,
          "paddingX": 12,
          "paddingY": 7,
          "fontSize": 14,
          "cornerRadius": 4
        }
      },
      "spacing": {
        "affixIconSize": 12,
        "affixCornerRadius": 6
      },
      "fallback": {
        "width": 120,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-input",
      "inspectedAt": "2026-03-22T10:31:28.107Z",
      "source": "discover_component_props",
      "componentSetName": "Input 输入框",
      "properties": [
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
            "True",
            "False"
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
          "propertyName": "Prefix 前缀",
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
          "defaultValue": "Default 32",
          "options": [
            "Mini 24",
            "Small 28",
            "Default 32",
            "Large 36"
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
        },
        {
          "propertyName": "Suffix 后缀",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        }
      ],
      "propertyMap": {
        "Disable 禁用": { "sourceParam": "disabled", "transform": "boolean" },
        "Error 错误": { "sourceParam": "error", "transform": "boolean" },
        "Filled 已填": { "sourceParam": "filled", "transform": "boolean" },
        "Prefix 前缀": { "sourceParam": "showPrefix", "transform": "boolean" },
        "Size 尺寸": { "sourceParam": "size" },
        "State 状态": { "sourceParam": "state" },
        "Suffix 后缀": { "sourceParam": "showSuffix", "transform": "boolean" }
      }
    },
    "renderNotes": inputRenderNotes
  },
  "select": {
    "id": "select",
    "name": "选择框",
    "category": "Form",
    "description": "选择框控件（自定义包装）",
    "schemaVersion": "2.0.0",
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请选择",
        "description": "占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸",
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
      "filled": {
        "type": "boolean",
        "default": false,
        "description": "已填"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "multiple": {
        "type": "boolean",
        "default": false,
        "description": "多选"
      },
      "selectType": {
        "type": "string",
        "default": "Default 默认",
        "description": "选择器类型"
      },
      "optionsText": {
        "type": "string",
        "default": "选项一,选项二",
        "description": "选项文案"
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "宽度"
      },
      "controlWidthMode": {
        "type": "select",
        "default": "fill",
        "description": "宽度模式",
        "enumValues": [
          "fixed",
          "fill"
        ]
      },
      "controlWidth": {
        "type": "number",
        "default": 0,
        "description": "控件宽度"
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
      "renderKey": "select"
    },
    "runtime": {
      "sizeMetricsRef": "input",
      "fallback": {
        "width": 120,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-select",
      "inspectedAt": "2026-03-22T10:48:03.940Z",
      "source": "discover_component_props",
      "componentSetName": "Select 选择器",
      "properties": [
        {
          "propertyName": "Placeholder 占位符#115960:0",
          "type": "TEXT",
          "defaultValue": "请选择"
        },
        {
          "propertyName": "Value#115960:55",
          "type": "TEXT",
          "defaultValue": "北京"
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
          "propertyName": "Filled 填写",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "Multiple 多选",
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
          "defaultValue": "Default 32",
          "options": [
            "Mini 24",
            "Small 28",
            "Default 32",
            "Large 36"
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
        },
        {
          "propertyName": "Type 类型",
          "type": "VARIANT",
          "defaultValue": "Default 默认",
          "options": [
            "Default 默认",
            "Label 内置标签",
            "Search 搜索"
          ]
        }
      ],
      "propertyMap": {
        "Placeholder 占位符#115960:0": { "sourceParam": "placeholder" },
        "Value#115960:55": { "sourceParam": "value" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" },
        "Filled 填写": { "sourceParam": "filled", "transform": "boolean" },
        "Multiple 多选": { "sourceParam": "multiple", "transform": "boolean" },
        "Size 尺寸": { "sourceParam": "size" },
        "State 状态": { "sourceParam": "state" },
        "Type 类型": { "sourceParam": "selectType" }
      }
    },
    "renderNotes": selectRenderNotes
  },
  "checkbox": {
    "id": "checkbox",
    "name": "单个复选框",
    "category": "Form",
    "description": "单个复选框控件（自定义包装）",
    "schemaVersion": "2.0.0",
    "renderNotes": {
      "actionHint": "Checkbox/radio 视觉敏感，优先复用真实 Figma 组件；不要用 vector/svg/path/text 手工绘制勾选。",
      "paramRules": [
        "单选用 radio-group；多选用 checkbox-group"
      ]
    },
    "params": {
      "label": {
        "type": "string",
        "default": "选项",
        "description": "选项文案"
      },
      "checked": {
        "type": "boolean",
        "default": false,
        "description": "是否选中"
      },
      "indeterminate": {
        "type": "boolean",
        "default": false,
        "description": "部分选中"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "hover": {
        "type": "boolean",
        "default": false,
        "description": "悬浮状态"
      },
      "showLabel": {
        "type": "boolean",
        "default": true,
        "description": "显示标签"
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
      "renderKey": "checkbox"
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
      "token": "lib-data-input-checkbox",
      "inspectedAt": "2026-03-22T10:50:16.017Z",
      "source": "discover_component_props",
      "componentSetName": "Checkbox 复选框",
      "properties": [
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
          "propertyName": "Indeterminate 中间态",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        },
        {
          "propertyName": "State 状态",
          "type": "VARIANT",
          "defaultValue": "Default 默认",
          "options": [
            "Default 默认",
            "Hover 悬浮"
          ]
        }
      ],
      "propertyMap": {
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" },
        "Indeterminate 中间态": { "sourceParam": "indeterminate", "transform": "boolean" },
        "State 状态": { "sourceParam": "hover", "transform": "variant:Hover?Default" }
      }
    },
    "colorVariableBindings": {
      "checkbox-bg": {
        "enabled": true,
        "token": "checkbox.bg",
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
      "checkbox-border": {
        "enabled": true,
        "token": "checkbox.border",
        "nameCandidates": [
          "color-border-1"
        ]
      },
      "checkbox-checked-bg": {
        "enabled": true,
        "token": "checkbox.checked.bg",
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
      "checkbox-indicator": {
        "enabled": true,
        "token": "checkbox.indicator",
        "variableRef": "VariableID:6dfd5b2f49dd7c8c889305f4514144af3b9f4b1f/174345:272",
        "keyCandidates": [
          "6dfd5b2f49dd7c8c889305f4514144af3b9f4b1f"
        ],
        "idCandidates": [
          "VariableID:6dfd5b2f49dd7c8c889305f4514144af3b9f4b1f/174345:272"
        ],
        "nameCandidates": [
          "text-inverse",
          "text-on-primary",
          "text/纯白文字 @color-white",
          "@color-white"
        ]
      },
      "checkbox-text": {
        "enabled": true,
        "token": "checkbox.text",
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
  "datepicker": {
    "id": "datepicker",
    "name": "日期选择",
    "category": "Form",
    "description": "日期选择器",
    "schemaVersion": "2.0.0",
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请选择日期",
        "description": "占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸",
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
      "renderKey": "datepicker"
    },
    "runtime": {
      "sizeMetricsRef": "input",
      "fallback": {
        "width": 120,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-datepicker",
      "inspectedAt": "2026-03-22T10:51:23.062Z",
      "source": "discover_component_props",
      "componentSetName": "Datepicker 日期选择器",
      "properties": [
        {
          "propertyName": "Filled 填写",
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
          "defaultValue": "Default 32",
          "options": [
            "Mini 24",
            "Small 28",
            "Default 32",
            "Large 36"
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
          "propertyName": "Format 格式",
          "type": "VARIANT",
          "defaultValue": "YYYY-MM-DD",
          "options": [
            "YYYY-MM-DD",
            "YYYY/MM/DD"
          ]
        }
      ],
      "propertyMap": {
        "Filled 填写": { "sourceParam": "value", "transform": "string:boolean" },
        "Size 尺寸": { "sourceParam": "size" },
        "State 状态": { "sourceParam": "state" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" }
      }
    },
    "renderNotes": datepickerRenderNotes
  },
  "timepicker": {
    "id": "timepicker",
    "name": "时间选择",
    "category": "Form",
    "description": "时间选择器",
    "schemaVersion": "2.0.0",
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请选择时间",
        "description": "占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸",
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
      "renderKey": "timepicker"
    },
    "runtime": {
      "sizeMetricsRef": "input",
      "fallback": {
        "width": 120,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-timepicker",
      "inspectedAt": "2026-03-22T10:52:05.217Z",
      "source": "discover_component_props",
      "componentSetName": "Timepicker 时间选择器",
      "properties": [
        {
          "propertyName": "Size 尺寸",
          "type": "VARIANT",
          "defaultValue": "Default 32",
          "options": [
            "Mini 24",
            "Small 28",
            "Default 32",
            "Large 36"
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
          "propertyName": "Filled 填写",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        }
      ],
      "propertyMap": {
        "Filled 填写": { "sourceParam": "value", "transform": "string:boolean" },
        "Size 尺寸": { "sourceParam": "size" },
        "State 状态": { "sourceParam": "state" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" }
      }
    },
    "renderNotes": timepickerRenderNotes
  },
  "inputnumber": {
    "id": "inputnumber",
    "name": "数字输入",
    "category": "Form",
    "description": "数字输入框",
    "schemaVersion": "2.0.0",
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请输入数字",
        "description": "占位文案"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸",
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
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "width": {
        "type": "number",
        "default": 0,
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
      "renderKey": "inputnumber"
    },
    "runtime": {
      "sizeMetricsRef": "input",
      "fallback": {
        "width": 120,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-inputnumber",
      "inspectedAt": "2026-03-22T10:52:48.671Z",
      "source": "discover_component_props",
      "componentSetName": "InputNumber 数字输入框",
      "properties": [
        {
          "propertyName": "Size 尺寸",
          "type": "VARIANT",
          "defaultValue": "Default 32",
          "options": [
            "Mini 24",
            "Small 28",
            "Default 32",
            "Large 36"
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
        },
        {
          "propertyName": "Filled 填写",
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
        }
      ],
      "propertyMap": {
        "Filled 填写": { "sourceParam": "value", "transform": "string:boolean" },
        "Size 尺寸": { "sourceParam": "size" },
        "State 状态": { "sourceParam": "state" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" }
      }
    },
    "renderNotes": inputNumberRenderNotes
  },
  "slider": {
    "id": "slider",
    "name": "滑动输入",
    "category": "Form",
    "description": "滑动输入条",
    "schemaVersion": "2.0.0",
    "params": {
      "value": {
        "type": "number",
        "default": 50,
        "description": "当前值"
      },
      "min": {
        "type": "number",
        "default": 0,
        "description": "最小值"
      },
      "max": {
        "type": "number",
        "default": 100,
        "description": "最大值"
      },
      "showLabel": {
        "type": "boolean",
        "default": false,
        "description": "显示数值"
      },
      "disabled": {
        "type": "boolean",
        "default": false,
        "description": "禁用"
      },
      "width": {
        "type": "number",
        "default": 180,
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
      "renderKey": "slider"
    },
    "runtime": {
      "fallback": {
        "width": 180,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-slider",
      "inspectedAt": "2026-03-22T10:54:06.255Z",
      "source": "discover_component_props",
      "componentSetName": "Slider 滑动输入",
      "properties": [
        {
          "propertyName": "Value 数值",
          "type": "TEXT",
          "defaultValue": "50"
        },
        {
          "propertyName": "ShowLabel 展示数值",
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
        }
      ],
      "propertyMap": {
        "Value 数值": { "sourceParam": "value" },
        "ShowLabel 展示数值": { "sourceParam": "showLabel", "transform": "boolean" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" }
      }
    },
    "renderNotes": sliderRenderNotes
  },
  "upload": {
    "id": "upload",
    "name": "上传",
    "category": "Form",
    "description": "上传控件",
    "schemaVersion": "2.0.0",
    "params": {
      "uploadType": {
        "type": "select",
        "default": "button",
        "description": "上传类型",
        "enumValues": [
          "button",
          "drag"
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
      "renderKey": "upload"
    },
    "runtime": {
      "fallback": {
        "width": 240,
        "height": 120
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-image",
      "inspectedAt": "2026-03-22T10:56:06.057Z",
      "source": "discover_component_props",
      "componentSetName": "Image 图片上传",
      "properties": [
        {
          "propertyName": "Type 类型",
          "type": "VARIANT",
          "defaultValue": "Button 按钮上传",
          "options": [
            "Button 按钮上传",
            "Drag 拖拽上传"
          ]
        },
        {
          "propertyName": "State 状态",
          "type": "VARIANT",
          "defaultValue": "Default 默认",
          "options": [
            "Default 默认",
            "Hover 悬浮",
            "Disabled 禁用"
          ]
        }
      ],
      "propertyMap": {
        "Type 类型": { "sourceParam": "uploadType" },
        "State 状态": { "sourceParam": "disabled", "transform": "boolean:Disabled?Default" }
      }
    },
    "renderNotes": uploadRenderNotes
  },
  "segmented-picker": {
    "id": "segmented-picker",
    "name": "分段选择",
    "category": "Form",
    "description": "分段选择器",
    "schemaVersion": "2.0.0",
    "params": {
      "optionsText": {
        "type": "string",
        "default": "选项一,选项二",
        "description": "选项文案"
      },
      "value": {
        "type": "string",
        "default": "选项一",
        "description": "当前值"
      },
      "size": {
        "type": "select",
        "default": "Default 32",
        "description": "尺寸",
        "enumValues": [
          "Mini 24",
          "Small 28",
          "Default 32",
          "Large 36"
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
      "renderKey": "segmented-picker"
    },
    "runtime": {
      "fallback": {
        "width": 240,
        "height": 32
      }
    },
    "figmaPropertySnapshot": {
      "token": "lib-data-input-segmented-picker",
      "inspectedAt": "2026-03-22T10:56:59.417Z",
      "source": "discover_component_props",
      "componentSetName": "Segmented Picker 分段选择器",
      "properties": [
        {
          "propertyName": "Items 数量",
          "type": "VARIANT",
          "defaultValue": "2",
          "options": [
            "2",
            "3",
            "4",
            "5"
          ]
        },
        {
          "propertyName": "Size 尺寸",
          "type": "VARIANT",
          "defaultValue": "Default 32",
          "options": [
            "Mini 24",
            "Small 28",
            "Default 32",
            "Large 36"
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
        },
        {
          "propertyName": "Disabled 禁用",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "False",
            "True"
          ]
        }
      ],
      "propertyMap": {
        "Items 数量": { "sourceParam": "optionsText", "transform": "list:length" },
        "Size 尺寸": { "sourceParam": "size" },
        "State 状态": { "sourceParam": "state" },
        "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" }
      }
    },
    "renderNotes": segmentedPickerRenderNotes
  }
};
