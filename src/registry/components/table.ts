import type { ComponentRegistry } from "../../registry.types";

const tableCellRenderNotes = {
  actionHint: "用于表格单元格渲染，仅作为 table-column 子项使用。",
  paramRules: [
    "不要在 table 之外直接使用。",
    "内容来自 params，保持行高与表格一致。"
  ],
  commonErrors: [
    "不要手动拼表格结构，使用 draw_table 渲染。"
  ]
};

const tableHeaderCellRenderNotes = {
  actionHint: "用于表格表头单元格，通常与 table-column 对应。",
  paramRules: [
    "不要在表体中使用。",
    "表头高度与表体高度应一致。"
  ],
  commonErrors: [
    "不要手工绘制表头样式，复用表头组件。"
  ]
};

const tableColumnRenderNotes = {
  actionHint: "表格列容器，承载表头与单元格。",
  paramRules: [
    "只在 table 内使用。",
    "children 必须显式提供表头和单元格。"
  ],
  commonErrors: [
    "不要只传 rowCount 又手动塞 children。"
  ]
};

export const tableComponents: ComponentRegistry["components"] = {
  "table-cell": {
    "id": "table-cell",
    "name": "Text 文字",
    "category": "Table",
    "description": "标准表格单元格",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "标准表格单元格",
      "usage": "用于表格内的普通数据单元格。通常作为 table-column 的子项。支持文本内容、背景色、边框等配置。",
      "examples": [
        "普通单元格: { \"componentId\": \"table-cell\", \"params\": { \"text\": \"Content\" } }",
        "带背景色: { \"componentId\": \"table-cell\", \"params\": { \"backgroundColor\": \"#F9F9F9\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "内容",
        "description": "文本内容"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "textAlign": {
        "type": "select",
        "default": "left",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
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
      "renderKey": "table-cell"
    },
    "colorVariableBindings": {
      "table-cell-bg-key": {
        "enabled": true,
        "token": "table.cell.bg",
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
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      },
      "table-cell-text-key": {
        "enabled": true,
        "token": "table.cell.text",
        "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
        "keyCandidates": [
          "178115a8c3bc7983da5bc10e637208895750dbfd"
        ],
        "idCandidates": [
          "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
        ]
      }
    },
    "typographyBindings": {
      "table-cell-text-style-key": {
        "enabled": true,
        "token": "table.cell.text",
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
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-tag": {
    "id": "table-cell-tag",
    "name": "Tag 标签",
    "category": "Table",
    "description": "包含标签(Tag)的表格单元格（支持 StatusTag/TypeTag；状态标签默认使用 L2 二级标签）",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "包含标签(Tag)的表格单元格（支持 StatusTag/TypeTag；状态标签默认使用 L2 二级标签）",
      "usage": "用于在表格中显示标签，支持两类：1) 状态标签（StatusTag）：设置 `tagKind=status`（或提供 `statusTheme`），默认使用 figma token `lib-data-display-status-tag`，并默认使用 `statusType=L2 二级标签`；用 `statusTheme` 区分不同状态颜色。注意：状态标签不要传 `tagType`（仅类型标签使用），避免与 StatusTag 产生冲突。2) 类型/分类标签（TypeTag）：设置 `tagKind=type`，默认使用 `lib-data-display-tag`，用 `tagType` 控制样式（如 Outline）。仅当 Figma 组件不可用时回退本地渲染。",
      "examples": [
        "状态标签: { \"componentId\": \"table-cell-tag\", \"params\": { \"tagKind\": \"status\", \"tagText\": \"启用\", \"statusTheme\": \"Success 成功\", \"statusType\": \"L2 二级标签\" } }",
        "类型标签: { \"componentId\": \"table-cell-tag\", \"params\": { \"tagKind\": \"type\", \"tagText\": \"企业\", \"tagType\": \"Outline 线型标签\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "内容",
        "description": "文本内容"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "textAlign": {
        "type": "select",
        "default": "left",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
      },
      "tagKind": {
        "type": "select",
        "default": "type",
        "description": "标签类型：status=状态标签，type=类型/分类标签",
        "enumValues": [
          "status",
          "type"
        ]
      },
      "componentToken": {
        "type": "string",
        "default": "lib-data-display-tag",
        "description": "Figma 组件 token；status 默认 Status Tag，type 默认 Tag（可留空由系统按 tagKind 推断）"
      },
      "tagText": {
        "type": "string",
        "default": "Tag",
        "description": "标签文本"
      },
      "statusSemantic": {
        "type": "string",
        "default": "",
        "description": "状态语义标识，优先于标签文案推断主题色；推荐值如 waiting / processing / success / warning / error / pending-review / under-review / approved / rejected"
      },
      "statusTheme": {
        "type": "select",
        "default": "Success 成功",
        "description": "状态标签主题（颜色/语义）",
        "enumValues": [
          "Success 成功",
          "Warning 告警",
          "Error 错误",
          "Stop 停止",
          "Processing 等待中",
          "Loading 加载中",
          "Waiting 待启用"
        ]
      },
      "statusType": {
        "type": "select",
        "default": "L2 二级标签",
        "description": "状态标签层级",
        "enumValues": [
          "L1 一级标签",
          "L2 二级标签",
          "L3 三级标签"
        ]
      },
      "statusState": {
        "type": "select",
        "default": "Default 默认",
        "description": "状态标签交互状态",
        "enumValues": [
          "Default 默认",
          "Hover 悬浮",
          "Active 点击"
        ]
      },
      "tagType": {
        "type": "select",
        "default": "Solid 面型标签",
        "description": "类型/分类标签样式（仅在 tagKind=type 时生效；tagKind=status 时会被忽略）",
        "enumValues": [
          "Default 默认标签",
          "Solid 面型标签",
          "Outline 线型标签",
          "Text 文字标签"
        ]
      },
      "tagColor": {
        "type": "select",
        "default": "green",
        "description": "兼容字段：可作为 statusTheme 的简写或用于 fallback 渲染",
        "enumValues": [
          "blue",
          "green",
          "red",
          "orange",
          "gray"
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
      "nodeType": "FRAME",
      "preferredLayoutMode": "VERTICAL",
      "renderKey": "table-cell-tag"
    },
    "colorVariableBindings": {
      "table-cell-bg-key": {
        "enabled": true,
        "token": "table.cell.bg",
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
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      }
    },
    "typographyBindings": {
      "status-tag-text-medium-style-key": {
        "enabled": true,
        "nameCandidates": [
          "Body/Medium",
          "正文/中",
          "Text/Body Medium"
        ]
      },
      "tag-text-style-key": {
        "enabled": true,
        "token": "tag.text",
        "textStyleRef": "S:ac8ef12de2cc499e51922d6b5239c26b3645a05a,131052:2",
        "keyCandidates": [
          "ac8ef12de2cc499e51922d6b5239c26b3645a05a"
        ],
        "idCandidates": [
          "S:ac8ef12de2cc499e51922d6b5239c26b3645a05a,131052:2"
        ],
        "nameCandidates": [
          "Body/Medium",
          "正文/中",
          "Text/Body Medium",
          "Body",
          "正文",
          "Text/Body"
        ]
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-avatar": {
    "id": "table-cell-avatar",
    "name": "Avatar 头像",
    "category": "Table",
    "description": "包含头像和文本的表格单元格",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "包含头像和文本的表格单元格",
      "usage": "用于在表格中显示用户头像和名称。text 参数为用户名。",
      "examples": [
        "用户列: { \"componentId\": \"table-cell-avatar\", \"params\": { \"text\": \"John Doe\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "内容",
        "description": "文本内容"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "textAlign": {
        "type": "select",
        "default": "left",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
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
      "renderKey": "table-cell-avatar"
    },
    "runtime": {
      "spacing": {
        "avatarSize": 20,
        "avatarTextGap": 4
      }
    },
    "colorVariableBindings": {
      "table-cell-bg-key": {
        "enabled": true,
        "token": "table.cell.bg",
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
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      },
      "table-cell-text-key": {
        "enabled": true,
        "token": "table.cell.text",
        "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
        "keyCandidates": [
          "178115a8c3bc7983da5bc10e637208895750dbfd"
        ],
        "idCandidates": [
          "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
        ]
      }
    },
    "typographyBindings": {
      "table-cell-text-style-key": {
        "enabled": true,
        "token": "table.cell.text",
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
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-input": {
    "id": "table-cell-input",
    "name": "Input 输入",
    "category": "Table",
    "description": "包含输入框的表格单元格",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "包含输入框的表格单元格",
      "usage": "用于在表格中进行行内编辑。",
      "examples": [
        "编辑列: { \"componentId\": \"table-cell-input\", \"params\": { \"value\": \"Editable\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "内容",
        "description": "文本内容"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "textAlign": {
        "type": "select",
        "default": "left",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "输入框值"
      },
      "placeholder": {
        "type": "string",
        "default": "已输入",
        "description": "占位符"
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
      "renderKey": "table-cell-input"
    },
    "colorVariableBindings": {
      "table-cell-bg-key": {
        "enabled": true,
        "token": "table.cell.bg",
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
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      },
      "table-cell-text-key": {
        "enabled": true,
        "token": "table.cell.text",
        "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
        "keyCandidates": [
          "178115a8c3bc7983da5bc10e637208895750dbfd"
        ],
        "idCandidates": [
          "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
        ]
      },
      "text-secondary-key": {
        "enabled": true,
        "token": "table.placeholder.text",
        "variableRef": "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562",
        "keyCandidates": [
          "a7442f0ba4f4f027d86e03f335df11c38232c0ce"
        ],
        "idCandidates": [
          "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"
        ]
      }
    },
    "typographyBindings": {
      "table-cell-text-style-key": {
        "enabled": true,
        "token": "table.cell.text",
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
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-select": {
    "id": "table-cell-select",
    "name": "Select 选择器",
    "category": "Table",
    "description": "包含选择器(Select)的表格单元格",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "包含选择器(Select)的表格单元格",
      "usage": "用于在表格中显示下拉选择器，通常用于允许用户在表格内直接修改某些状态或选项。",
      "examples": [
        "选择器单元格: { \"componentId\": \"table-cell-select\", \"params\": { \"text\": \"选项一\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "请选择",
        "description": "选择器显示文本"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
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
      "renderKey": "table-cell-select"
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-action-text": {
    "id": "table-cell-action-text",
    "name": "ActionText 操作文字",
    "category": "Table",
    "description": "以文字形式承载操作（如“编辑 删除 …”），默认右对齐；支持自动折叠并在末尾展示更多图标。",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "以文字形式承载操作（如“编辑 删除 …”），默认右对齐；支持自动折叠并在末尾展示更多图标。",
      "usage": "用于表格“操作/Action”列：用文字链接样式展示多个操作。`text` 参数支持用空格分隔多个操作词（例如“编辑 删除 …”），**严禁使用斜杠/分割**。当包含“…”/“...”/“更多”或操作数 > 3 时，默认只显示前 2 个操作并在末尾追加更多图标。包含“删除/Delete”的操作使用 danger 色，其余使用 link 主色；整体默认右对齐。",
      "examples": [
        "操作列(文字): { \"componentId\": \"table-cell-action-text\", \"params\": { \"text\": \"编辑 删除 …\", \"width\": 0 } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "编辑 删除 …",
        "description": "操作文案（空格分隔，严禁使用/）；包含“…”/“...”/“更多”会触发更多图标"
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "textAlign": {
        "type": "select",
        "default": "right",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
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
      "renderKey": "table-cell-action-text"
    },
    "colorVariableBindings": {
      "table-cell-bg-key": {
        "enabled": true,
        "token": "table.cell.bg",
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
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      },
      "table-action-primary-key": {
        "enabled": true,
        "token": "link-6",
        "variableRef": "VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300",
        "keyCandidates": [
          "75f358d76d414f045a47f128470fcbbde49888dc"
        ],
        "idCandidates": [
          "VariableID:75f358d76d414f045a47f128470fcbbde49888dc/174345:300"
        ],
        "nameCandidates": [
          "primary-6"
        ]
      },
      "table-action-danger-key": {
        "enabled": true,
        "token": "danger-6",
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
      "table-cell-text-style-key": {
        "enabled": true,
        "token": "table.cell.text",
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
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-action-icon": {
    "id": "table-cell-action-icon",
    "name": "ActionIcon 操作图标",
    "category": "Table",
    "description": "以图标形式承载操作（编辑 / 删除 / 更多），默认右对齐。",
    "schemaVersion": "2.0.0",
    "family": "table-cell",
    "prompts": {
      "description": "以图标形式承载操作（编辑 / 删除 / 更多），默认右对齐。",
      "usage": "用于表格“操作/Action”列：用 3 个图标（编辑、删除、更多）展示操作，图标默认 16px，图标间距 24px，整体默认右对齐。优先复用 Figma token：`table-cell-icon-edit`、`table-cell-icon-delete`、`table-cell-icon-action-more`。",
      "examples": [
        "操作列(图标): { \"componentId\": \"table-cell-action-icon\", \"params\": { \"width\": 0 } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "",
        "description": "操作说明文本（可选；不影响图标渲染）"
      },
      "width": {
        "type": "number",
        "default": 0,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "textAlign": {
        "type": "select",
        "default": "right",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "backgroundColor": {
        "type": "color",
        "default": "#FFFFFF",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
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
      "renderKey": "table-cell-action-icon"
    },
    "colorVariableBindings": {
      "table-cell-bg-key": {
        "enabled": true,
        "token": "table.cell.bg",
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
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      },
      "table-action-icon-key": {
        "enabled": true,
        "token": "text.secondary",
        "variableRef": "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562",
        "keyCandidates": [
          "a7442f0ba4f4f027d86e03f335df11c38232c0ce"
        ],
        "idCandidates": [
          "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"
        ]
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-header-cell": {
    "id": "table-header-cell",
    "name": "Header 表头",
    "category": "Table",
    "description": "加粗文本的表头单元格",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "加粗文本的表头单元格",
      "usage": "用于表格的表头单元格，文本默认为加粗。通常作为 table-column 的第一个子项。",
      "examples": [
        "标准表头: { \"componentId\": \"table-header-cell\", \"params\": { \"text\": \"Header\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "表头",
        "description": "表头文本"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "宽度 (0为自适应)"
      },
      "height": {
        "type": "number",
        "default": 40,
        "description": "单元格高度"
      },
      "paddingTop": {
        "type": "number",
        "default": 0,
        "description": "上内边距"
      },
      "paddingBottom": {
        "type": "number",
        "default": 0,
        "description": "下内边距"
      },
      "paddingLeft": {
        "type": "number",
        "default": 16,
        "description": "左内边距"
      },
      "paddingRight": {
        "type": "number",
        "default": 16,
        "description": "右内边距"
      },
      "backgroundColor": {
        "type": "color",
        "default": "#F5F5F5",
        "description": "背景颜色"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "边框宽度"
      },
      "borderBottomOnly": {
        "type": "boolean",
        "default": true,
        "description": "仅显示下边框"
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
      "renderKey": "table-header-cell"
    },
    "colorVariableBindings": {
      "table-header-bg-key": {
        "enabled": true,
        "token": "table.header.bg",
        "variableRef": "VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586",
        "keyCandidates": [
          "0ad927853701159721b6bb95d53b532de24282a7"
        ],
        "idCandidates": [
          "VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586"
        ],
        "nameCandidates": [
          "background/深 灰底 @color-bg-4",
          "@color-bg-4"
        ]
      },
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      },
      "table-header-text-key": {
        "enabled": true,
        "token": "table.header.text",
        "variableRef": "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562",
        "keyCandidates": [
          "a7442f0ba4f4f027d86e03f335df11c38232c0ce"
        ],
        "idCandidates": [
          "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"
        ]
      }
    },
    "typographyBindings": {
      "table-header-text-style-key": {
        "enabled": true,
        "token": "table.header.text",
        "textStyleRef": "S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3",
        "keyCandidates": [
          "06c98e2c68a38e391190684c4b73e26efcd5d930"
        ],
        "idCandidates": [
          "S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3"
        ],
        "nameCandidates": [
          "Header",
          "表头",
          "Text/Header"
        ]
      }
    },
    "renderNotes": tableHeaderCellRenderNotes
  },
  "table-column": {
    "id": "table-column",
    "name": "Column 列",
    "category": "Table",
    "description": "包含表头和多个单元格的列容器",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "包含表头和多个单元格的列容器",
      "usage": "表格的列容器。它垂直排列一个表头单元格和多个普通单元格。请设置 rowCount 来控制行数。如果需要填充具体数据，请务必通过 children 传入 table-header-cell 和多个 table-cell。注意：如果传入了 children，请不要传入任何默认的占位符单元格，只传入你需要的数据。必须显式提供表头(第一个子节点)和所有数据单元格。",
      "examples": [
        "创建一列自动数据: { \"componentId\": \"table-column\", \"params\": { \"headerText\": \"Name\", \"rowCount\": 10 } }",
        "创建一列具体数据(禁止包含额外占位符): { \"componentId\": \"table-column\", \"params\": { \"headerText\": \"ID\" }, \"children\": [ { \"componentId\": \"table-header-cell\", \"params\": { \"text\": \"ID\" } }, { \"componentId\": \"table-cell\", \"params\": { \"text\": \"001\" } }, { \"componentId\": \"table-cell\", \"params\": { \"text\": \"002\" } } ] }"
      ]
    },
    "params": {
      "headerText": {
        "type": "string",
        "default": "表头",
        "description": "表头文本"
      },
      "headerType": {
        "type": "select",
        "default": "None",
        "description": "表头元素",
        "enumValues": [
          "None",
          "Filter",
          "Sort",
          "Search",
          "Info"
        ]
      },
      "rowCount": {
        "type": "number",
        "default": 10,
        "description": "数据行数"
      },
      "width": {
        "type": "number",
        "default": 150,
        "description": "列宽"
      },
      "columnWidthMode": {
        "type": "select",
        "default": "FILL",
        "description": "列宽模式",
        "enumValues": [
          "FIXED",
          "HUG",
          "FILL"
        ]
      },
      "textAlign": {
        "type": "select",
        "default": "left",
        "description": "对齐方式",
        "enumValues": [
          "left",
          "right"
        ]
      },
      "textDisplay": {
        "type": "select",
        "default": "ellipsis",
        "description": "文本显示",
        "enumValues": [
          "ellipsis",
          "lineBreak"
        ]
      },
      "headerHeight": {
        "type": "number",
        "default": 40,
        "description": "表头行高"
      },
      "bodyHeight": {
        "type": "number",
        "default": 40,
        "description": "内容行高"
      }
    },
    "slots": {
      "default": {
        "displayName": "Default",
        "allowedComponents": [
          "table-cell",
          "table-header-cell",
          "table-cell-tag",
          "table-cell-avatar",
          "table-cell-input",
          "table-cell-select",
          "table-cell-action-text",
          "table-cell-action-icon"
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
      "renderKey": "table-column"
    },
    "renderNotes": tableColumnRenderNotes
  },
  "table": {
    "id": "table",
    "name": "表格",
    "category": "Table",
    "description": "由多个列组成的完整表格",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "由多个列组成的完整表格",
      "usage": "表格创建优先走 draw_table(payload)（不要输出冗长 table 子树）。\n- 当目标是创建新表格时，直接调用 draw_table。\n- 如果是“新建表格”，禁止输出 apply_scene(table-root)。\n- draw_table payload 必须是紧凑数据结构，禁止包含 nodeId/componentId/props/children。\n- 支持直接定义表格工具栏与分页：\n  - 若需标签页，请在 payload 中添加 \"tabs\": [\"全部\", \"进行中\"] 或 \"hasTabs\": true。\n  - 若需筛选器，请在 payload 中添加 \"filters\": [\"状态\", \"城市\", \"关键词\"] 或字符串。\n  - 若需按钮组，请在 payload 中添加 \"buttonGroup\": { \"primaryText\": \"新建\", \"secondaryText\": \"导出\" } 或 \"hasButtonGroup\": true。\n  - 分页器默认启用；若需关闭，请显式设置 \"pagination\": false。\n  - 不要为此拆分任务，直接在一个 draw_table 动作中完成。\n- 若表格存在“多选/勾选/选择列”（如左侧复选框列），在 payload 顶层加入 \"rowAction\": \"multiple\"。\n- 单选列请使用 \"rowAction\": \"single\"。\n- 不要把勾选列写进 headers/rows/columnTypes。\n- 标签列（Tag）请显式区分两类：\n  - StatusTag：状态标签（默认使用状态标签的 L2 二级标签）。单元格优先输出结构化语义：{ \"text\": \"待审核\", \"statusSemantic\": \"pending-review\" }、{ \"text\": \"审核中\", \"statusSemantic\": \"under-review\" }、{ \"text\": \"已通过\", \"statusSemantic\": \"approved\" }、{ \"text\": \"已驳回\", \"statusSemantic\": \"rejected\" }。也可补充 statusTheme，但优先由 statusSemantic 决定主题色。\n  - TypeTag：类型/分类标签。单元格建议用对象表示文案+样式，例如：{ \"text\": \"企业\", \"tagType\": \"Outline 线型标签\" }\n- 兼容：旧的 columnTypes \"Tag\" 视为 \"StatusTag\"。\n- 若表格包含操作列特征（表头为“操作/Action/Actions/Operation”，或单元格包含编辑/删除/查看/详情/更多/启用/禁用/配置/设置/授权/分配/下载/导出/复制/重置等动词），必须保留该列并将 headers 对应项写为“操作”，columnTypes 设为 \"ActionText\" 或 \"ActionIcon\"。\n- 当需要流式绘制表格时，先按行输出事件（每行一个 JSON），每行必须以 @@table_stream 开头：\n @@table_stream {\"event\":\"table_start\",\"headers\":[\"姓名\",\"年龄\"],\"rows\":[[\"陈默\",28]],\"columnTypes\":[\"Text\",\"Text\"],\"rowHeight\":{\"header\":40,\"body\":40}}\n @@table_stream {\"event\":\"table_row\",\"row\":[\"林晓\",32]}\n @@table_stream {\"event\":\"table_done\"}\n- 流式事件行不要出现在最终动作 JSON 中，但最终仍需输出标准 action JSON。",
      "examples": [
        "标准表格: { \"headers\": [\"姓名\", \"年龄\", \"城市\"], \"rows\": [[\"陈默\", \"28\", \"北京\"], [\"林晓\", \"32\", \"上海\"]], \"columnTypes\": [\"Text\", \"Text\", \"Text\"], \"tabs\": [\"全部\", \"进行中\"], \"filters\": [\"状态\", \"城市\", \"关键词\"], \"buttonGroup\": { \"primaryText\": \"新建\", \"secondaryText\": \"导出\" }, \"pagination\": true, \"rowHeight\": { \"header\": 40, \"body\": 40 } }"
      ]
    },
    "renderNotes": {
      "actionHint": "新建表格必须使用 draw_table payload { headers, rows, columnTypes?, columnWidths? }，避免输出 apply_scene 的表格子树。",
      "paramRules": [
        "若消息里出现 \"表格结构(JSON)\"，优先使用其中的 headers/rows 生成表格，不要忽略已上传表格。",
        "若用户目标是'根据上传图片/表格生成'，直接 draw_tabl / draw_form / create_node 落地（表格/表单无需读取 spec）。",
        "rows 必须提供 2–3 行具体数据，每个单元格必须填入贴合业务场景的真实内容（如人名、日期、金额、状态词），严禁输出空字符串或空数组。"
      ],
      "commonErrors": [
        "新建表格时不要使用 apply_scene，直接 draw_table/draw_tabl。",
        "rows 为空数组 [] 会导致所有单元格显示占位符（Cell/Tag/User），必须提供真实数据行。"
      ]
    },
    "params": {
      "size": {
        "type": "select",
        "default": "default",
        "description": "表格尺寸",
        "enumValues": [
          "mini",
          "default",
          "medium",
          "large"
        ]
      },
      "columnCount": {
        "type": "number",
        "default": 3,
        "description": "列数"
      },
      "rowCount": {
        "type": "number",
        "default": 10,
        "description": "行数 (不含表头)"
      },
      "rowAction": {
        "type": "select",
        "default": "none",
        "description": "表格行操作",
        "enumValues": [
          "none",
          "multiple",
          "single",
          "drag",
          "expand",
          "switch"
        ]
      },
      "hasPagination": {
        "type": "boolean",
        "default": false,
        "description": "分页器"
      },
      "hasFilter": {
        "type": "boolean",
        "default": false,
        "description": "筛选器"
      },
      "hasTabs": {
        "type": "boolean",
        "default": false,
        "description": "标签页"
      },
      "hasButtonGroup": {
        "type": "boolean",
        "default": false,
        "description": "按钮组"
      },
      "headerHeight": {
        "type": "number",
        "default": 40,
        "description": "表头行高"
      },
      "bodyHeight": {
        "type": "number",
        "default": 40,
        "description": "内容行高"
      },
      "borderColor": {
        "type": "color",
        "default": "#EAEDF1",
        "description": "表格外边框颜色"
      },
      "borderWidth": {
        "type": "number",
        "default": 1,
        "description": "表格外边框宽度"
      },
      "cornerRadius": {
        "type": "number",
        "default": 4,
        "description": "表格圆角"
      }
    },
    "slots": {
      "default": {
        "displayName": "Default",
        "allowedComponents": [
          "table-column"
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
      "renderKey": "table"
    },
    "runtime": {
      "sizeMetrics": {
        "mini": {
          "height": 32,
          "paddingX": 12,
          "paddingY": 8,
          "fontSize": 13,
          "cornerRadius": 4
        },
        "default": {
          "height": 40,
          "paddingX": 12,
          "paddingY": 8,
          "fontSize": 13,
          "cornerRadius": 4
        },
        "medium": {
          "height": 48,
          "paddingX": 12,
          "paddingY": 8,
          "fontSize": 13,
          "cornerRadius": 4
        },
        "large": {
          "height": 56,
          "paddingX": 12,
          "paddingY": 8,
          "fontSize": 13,
          "cornerRadius": 4
        }
      },
      "spacing": {
        "paginationRowPaddingTop": 16,
        "toolbarPaddingBottom": 20,
        "rowActionPaddingLeft": 16,
        "rowActionPaddingRight": 8,
        "rowActionWidth": 35,
        "rowActionSwitchWidth": 60,
        "rowActionIconSize": 14,
        "headerIconSize": 12
      }
    },
    "colorVariableBindings": {
      "table-border-key": {
        "enabled": true,
        "token": "table.border",
        "nameCandidates": [
          "border-2",
          "color-border-2",
          "@border-2",
          "@color-border-2"
        ]
      }
    }
  }
};
