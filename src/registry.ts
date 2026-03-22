import type { ComponentRegistry } from "./registry.types";
import { layoutComponents } from "./registry/components/layout";

export const COMPONENT_REGISTRY: ComponentRegistry = {
  "components": {
    ...layoutComponents,
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
      }
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
        "usage": "用于在表格中显示标签，支持两类：1) 状态标签（StatusTag）：默认复用 figma token `lib-data-display-status-tag`，并默认使用 `statusType=L2 二级标签`；建议用 `statusTheme` 区分不同状态颜色。2) 类型/分类标签（TypeTag）：默认使用 `lib-data-display-tag`，用 `tagType` 控制样式（如 Outline）。仅当 Figma 组件不可用时回退本地渲染。",
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
          "description": "类型/分类标签样式",
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
        },
        "tag-bg-key": {
          "enabled": true,
          "token": "tag.bg.success",
          "nameCandidates": [
            "green-1",
            "success-1"
          ]
        },
        "tag-text-key": {
          "enabled": true,
          "token": "tag.text.success",
          "nameCandidates": [
            "green-6",
            "success-6"
          ]
        }
      },
      "typographyBindings": {
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
            "Body",
            "正文",
            "Text/Body"
          ]
        }
      }
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
          "avatarSize": 20
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
      }
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
      }
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
    }
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
      }
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
        "usage": "用于表格“操作/Action”列：用 3 个图标（编辑、删除、更多）展示操作，图标默认 16px，图标间距 24px，整体默认右对齐。优先复用 Figma token：`table.cell.icon.edit`、`table.cell.icon.delete`、`table.cell.icon.actionMore`。",
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
      }
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
      }
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
      }
    },
    "table": {
      "id": "table",
      "name": "表格",
      "category": "Table",
      "description": "由多个列组成的完整表格",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "由多个列组成的完整表格",
        "usage": "表格创建优先走 draw_table(payload)（不要输出冗长 table 子树）。\n- 当目标是创建新表格时，直接调用 draw_table。\n- 如果是“新建表格”，禁止输出 apply_scene(table-root)。\n- draw_table payload 必须是紧凑数据结构，禁止包含 nodeId/componentId/props/children。\n- 支持直接定义表格工具栏与分页：\n  - 若需标签页，请在 payload 中添加 \"tabs\": [\"全部\", \"进行中\"] 或 \"hasTabs\": true。\n  - 若需筛选器，请在 payload 中添加 \"filters\": [\"状态\", \"城市\", \"关键词\"] 或字符串。\n  - 若需按钮组，请在 payload 中添加 \"buttonGroup\": { \"primaryText\": \"新建\", \"secondaryText\": \"导出\" } 或 \"hasButtonGroup\": true。\n  - 分页器默认启用；若需关闭，请显式设置 \"pagination\": false。\n  - 不要为此拆分任务，直接在一个 draw_table 动作中完成。\n- 若表格存在“多选/勾选/选择列”（如左侧复选框列），在 payload 顶层加入 \"rowAction\": \"multiple\"。\n- 单选列请使用 \"rowAction\": \"single\"。\n- 不要把勾选列写进 headers/rows/columnTypes。\n- 标签列（Tag）请显式区分两类：\n  - StatusTag：状态标签（默认使用状态标签的 L2 二级标签）。单元格建议用对象表示状态文案+颜色/主题，例如：{ \"text\": \"启用\", \"statusTheme\": \"Success 成功\" } 或 { \"statusText\": \"禁用\", \"statusColor\": \"red\" }\n  - TypeTag：类型/分类标签。单元格建议用对象表示文案+样式，例如：{ \"text\": \"企业\", \"tagType\": \"Outline 线型标签\" }\n- 兼容：旧的 columnTypes \"Tag\" 视为 \"StatusTag\"。\n- 若表格包含操作列特征（表头为“操作/Action/Actions/Operation”，或单元格包含编辑/删除/查看/详情/更多/启用/禁用/配置/设置/授权/分配/下载/导出/复制/重置等动词），必须保留该列并将 headers 对应项写为“操作”，columnTypes 设为 \"ActionText\" 或 \"ActionIcon\"。\n- 当需要流式绘制表格时，先按行输出事件（每行一个 JSON），每行必须以 @@table_stream 开头：\n @@table_stream {\"event\":\"table_start\",\"headers\":[\"姓名\",\"年龄\"],\"rows\":[[\"张三\",28]],\"columnTypes\":[\"Text\",\"Text\"],\"rowHeight\":{\"header\":40,\"body\":40}}\n @@table_stream {\"event\":\"table_row\",\"row\":[\"李四\",32]}\n @@table_stream {\"event\":\"table_done\"}\n- 流式事件行不要出现在最终动作 JSON 中，但最终仍需输出标准 action JSON。",
        "examples": [
          "标准表格: { \"headers\": [\"姓名\", \"年龄\", \"城市\"], \"rows\": [[\"张三\", \"28\", \"北京\"], [\"李四\", \"32\", \"上海\"]], \"columnTypes\": [\"Text\", \"Text\", \"Text\"], \"tabs\": [\"全部\", \"进行中\"], \"filters\": [\"状态\", \"城市\", \"关键词\"], \"buttonGroup\": { \"primaryText\": \"新建\", \"secondaryText\": \"导出\" }, \"pagination\": true, \"rowHeight\": { \"header\": 40, \"body\": 40 } }"
        ]
      },
      "renderNotes": {
        "actionHint": "新建表格必须使用 draw_table payload { headers, rows, columnTypes?, columnWidths? }，避免输出 apply_scene 的表格子树。",
        "paramRules": [
          "若消息里出现 \"表格结构(JSON)\"，优先使用其中的 headers/rows 生成表格，不要忽略已上传表格。",
          "若用户目标是“根据上传图片/表格生成”，直接 draw_tabl / draw_form / create_node 落地（表格/表单无需读取 spec）。"
        ],
        "commonErrors": [
          "新建表格时不要使用 apply_scene，直接 draw_table/draw_tabl。"
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
          "default": 8,
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
            "cornerRadius": 8
          },
          "default": {
            "height": 40,
            "paddingX": 12,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 8
          },
          "medium": {
            "height": 48,
            "paddingX": 12,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 8
          },
          "large": {
            "height": 56,
            "paddingX": 12,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 8
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
    },
    "figma-component": {
      "id": "figma-component",
      "name": "Figma 组件实例",
      "category": "Basic",
      "description": "通过 componentToken 或 componentKey 导入并创建指定的 Figma 组件或变体",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "通过 componentToken 或 componentKey 导入并创建指定的 Figma 组件或变体",
        "usage": "当你需要直接复用设计系统中的已发布 Figma 组件时使用。优先传入 componentToken（来自 theme.component-tokens），也可直接传 componentKey。可选 fallbackName 和 variantCriteria（JSON 字符串或 key=value 形式）。",
        "examples": [
          "按 token 导入表头组件: { \"componentId\": \"figma-component\", \"params\": { \"componentToken\": \"table.header.main\" } }",
          "按 key 导入指定变体: { \"componentId\": \"figma-component\", \"params\": { \"componentKey\": \"YOUR_COMPONENT_SET_KEY\", \"variantCriteria\": \"{\\\"Size\\\":\\\"Large\\\",\\\"State\\\":\\\"Default\\\"}\" } }"
        ]
      },
      "renderNotes": {
        "actionHint": "优先使用 RegisteredFigmaPropertySnapshotCatalog 中已有的属性快照；仅在目标 token 缺失或属性不足时调用 discover_component_props。",
        "paramRules": [
          "优先使用 params.componentToken，componentKey 仅作为 fallback",
          "除非用户明确要求尺寸，不要输出 width/height"
        ],
        "commonErrors": [
          "属性探测失败时不要猜测属性名"
        ],
        "agentHints": [
          "探测失败时仅用 componentToken 创建，不要补写 properties"
        ]
      },
      "params": {
        "componentToken": {
          "type": "string",
          "default": "",
          "description": "组件 token（推荐，来自 theme.component-tokens）"
        },
        "componentKey": {
          "type": "string",
          "default": "",
          "description": "Figma 组件 Key（与 componentToken 二选一）"
        },
        "fallbackName": {
          "type": "string",
          "default": "",
          "description": "导入失败时的本地名称回退查找"
        },
        "variantCriteria": {
          "type": "string",
          "default": "",
          "description": "变体条件：JSON 或 key=value"
        },
        "width": {
          "type": "number",
          "default": 0,
          "description": "宽度覆盖（0 表示不覆盖）"
        },
        "height": {
          "type": "number",
          "default": 0,
          "description": "高度覆盖（0 表示不覆盖）"
        },
        "clipsContent": {
          "type": "boolean",
          "default": false,
          "description": "裁剪超出组件的内容"
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
        "preferredLayoutMode": "VERTICAL"
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-display-toplist",
        "componentKey": "6acea515cbcd1ae970ef5627425bd55cbda137ff",
        "inspectedAt": "2026-03-13T14:17:22.987Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "Show Legend",
            "displayName": "Show Legend",
            "type": "BOOLEAN",
            "defaultValue": true,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "数量 ",
            "displayName": "数量 ",
            "type": "VARIANT",
            "defaultValue": "1",
            "options": [
              "1",
              "2",
              "3",
              "4"
            ]
          },
          {
            "propertyName": "状态 state",
            "displayName": "状态 state",
            "type": "VARIANT",
            "defaultValue": "默认 Default",
            "options": [
              "默认 Default",
              "悬浮 Hover",
              "聚焦 Focus"
            ]
          },
          {
            "propertyName": "类型 type",
            "displayName": "类型 type",
            "type": "VARIANT",
            "defaultValue": "基础/分组柱 default",
            "options": [
              "基础/分组柱 default",
              "堆叠 stacked",
              "百分比堆叠 stacked part to whole",
              "特殊 special case",
              "特殊 special case 2"
            ]
          },
          {
            "propertyName": "适配方式 responsive",
            "displayName": "适配方式 responsive",
            "type": "VARIANT",
            "defaultValue": "固定柱宽 fixed width",
            "options": [
              "固定柱宽 fixed width",
              "固定间距 fixed gap"
            ]
          }
        ]
      },
      "figmaPropertySnapshotCatalog": {
        "token:lib-data-display-toplist": {
          "token": "lib-data-display-toplist",
          "componentKey": "6acea515cbcd1ae970ef5627425bd55cbda137ff",
          "inspectedAt": "2026-03-13T14:17:22.987Z",
          "source": "discover_component_props",
          "componentName": "Toplist 条形图",
          "componentSetName": "Toplist 条形图",
          "properties": [
            {
              "propertyName": "Show Legend",
              "displayName": "Show Legend",
              "type": "BOOLEAN",
              "defaultValue": true,
              "options": [
                "True",
                "False"
              ]
            },
            {
              "propertyName": "数量 ",
              "displayName": "数量 ",
              "type": "VARIANT",
              "defaultValue": "1",
              "options": [
                "1",
                "2",
                "3",
                "4"
              ]
            },
            {
              "propertyName": "状态 state",
              "displayName": "状态 state",
              "type": "VARIANT",
              "defaultValue": "默认 Default",
              "options": [
                "默认 Default",
                "悬浮 Hover",
                "聚焦 Focus"
              ]
            },
            {
              "propertyName": "类型 type",
              "displayName": "类型 type",
              "type": "VARIANT",
              "defaultValue": "基础/分组柱 default",
              "options": [
                "基础/分组柱 default",
                "堆叠 stacked",
                "百分比堆叠 stacked part to whole",
                "特殊 special case",
                "特殊 special case 2"
              ]
            },
            {
              "propertyName": "适配方式 responsive",
              "displayName": "适配方式 responsive",
              "type": "VARIANT",
              "defaultValue": "固定柱宽 fixed width",
              "options": [
                "固定柱宽 fixed width",
                "固定间距 fixed gap"
              ]
            }
          ]
        }
      }
    },
    "text": {
      "id": "text",
      "name": "文本",
      "category": "Basic",
      "description": "基础文本组件",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "基础文本组件",
        "usage": "用于显示简单的文本内容。可以配置字号、颜色和字重。",
        "examples": [
          "普通文本: { \"componentId\": \"text\", \"params\": { \"text\": \"Hello\" } }",
          "红色大号文本: { \"componentId\": \"text\", \"params\": { \"text\": \"Warning\", \"fontSize\": 20, \"color\": \"#FF0000\" } }"
        ]
      },
      "params": {
        "text": {
          "type": "string",
          "default": "Text",
          "description": "内容"
        },
        "fontSize": {
          "type": "number",
          "default": 13,
          "description": "字号 (px)"
        },
        "lineHeight": {
          "type": "number",
          "default": 22,
          "description": "行高 (px)"
        },
        "color": {
          "type": "color",
          "default": "#0C0D0E",
          "description": "文本颜色"
        },
        "fontWeight": {
          "type": "select",
          "default": "Regular",
          "description": "字重",
          "enumValues": [
            "Regular",
            "Medium",
            "Bold"
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
        "nodeType": "TEXT",
        "preferredLayoutMode": "VERTICAL",
        "renderKey": "text"
      },
      "colorVariableBindings": {
        "text-primary-key": {
          "enabled": true,
          "token": "text.primary",
          "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
          "keyCandidates": [
            "178115a8c3bc7983da5bc10e637208895750dbfd"
          ],
          "idCandidates": [
            "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
          ]
        },
        "text-custom-key": {
          "enabled": true,
          "variableRef": "text-custom-key",
          "nameCandidates": [
            "text-1",
            "text-primary",
            "Text/Custom",
            "文本/自定义"
          ]
        }
      },
      "typographyBindings": {
        "text-style-key": {
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
    "tag": {
      "id": "tag",
      "name": "标签",
      "category": "Data",
      "description": "通用标签组件，统一覆盖 lib-data-display-tag、lib-data-display-other-tag、lib-data-display-status-tag 三套标签族；默认优先导入原始 Figma 组件做高保真复刻，支持默认/营销/标签组/状态标签样式",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "通用标签组件，统一覆盖 lib-data-display-tag、lib-data-display-other-tag、lib-data-display-status-tag 三套标签族；默认优先导入原始 Figma 组件做高保真复刻，支持默认/营销/标签组/状态标签样式",
        "usage": "用于展示轻量状态、分类、营销标记、一组短标签或状态标签。`tagType` 统一选择默认/营销/标签组/状态类型；当选择 MarketingTag/TagGroup 时会自动切换 `componentToken` 到 `lib-data-display-other-tag`（或语义别名 `library.data-display.other-tag`），当选择 StatusTag 时切换到 `lib-data-display-status-tag`（或语义别名 `library.data-display.status-tag`），再配合 colorScheme/groupTexts/statusTheme/statusType/statusState。默认标签仍使用 size/state/showIcon/showDot/showDropdown/closable/disabled 控制变体。仅在原始 Figma 组件不可用时回退本地渲染。",
        "examples": [
          "基础标签: { \"componentId\": \"tag\", \"params\": { \"text\": \"标签\" } }",
          "可关闭标签: { \"componentId\": \"tag\", \"params\": { \"text\": \"处理中\", \"closable\": true } }",
          "带圆点的描边标签: { \"componentId\": \"tag\", \"params\": { \"text\": \"草稿\", \"showDot\": true, \"tagType\": \"Outline 线型标签\" } }",
          "营销标签: { \"componentId\": \"tag\", \"params\": { \"tagType\": \"MarketingTag 营销标签\", \"colorScheme\": \"Yellow 黄\", \"text\": \"自定义\" } }",
          "标签组: { \"componentId\": \"tag\", \"params\": { \"tagType\": \"TagGroup 标签组\", \"groupTexts\": \"内,荐\" } }",
          "状态标签: { \"componentId\": \"tag\", \"params\": { \"tagType\": \"StatusTag 状态标签\", \"statusTheme\": \"Warning 告警\", \"statusType\": \"L2 二级标签\" } }"
        ]
      },
      "params": {
        "text": {
          "type": "string",
          "default": "标签",
          "description": "标签文案"
        },
        "groupTexts": {
          "type": "string",
          "default": "",
          "description": "标签组文案，逗号/顿号/换行分隔"
        },
        "componentToken": {
          "type": "string",
          "default": "lib-data-display-tag",
          "description": "Figma 组件 token；未手动指定时会根据 tagType 自动切换"
        },
        "tagType": {
          "type": "select",
          "default": "Default 默认标签",
          "description": "标签类型；默认类对应 lib-data-display-tag，营销/标签组对应 lib-data-display-other-tag，状态标签对应 lib-data-display-status-tag",
          "enumValues": [
            "Default 默认标签",
            "Solid 面型标签",
            "Outline 线型标签",
            "Text 文字标签",
            "MarketingTag 营销标签",
            "TagGroup 标签组",
            "StatusTag 状态标签"
          ]
        },
        "statusTheme": {
          "type": "select",
          "default": "Success 成功",
          "description": "状态标签主题",
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
          "default": "L1 一级标签",
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
        "colorScheme": {
          "type": "select",
          "default": "Default 默认",
          "description": "Other Tag 颜色，对应 lib-data-display-other-tag 的 Color 变体",
          "enumValues": [
            "Default 默认",
            "Red 红",
            "Yellow 黄",
            "Grey 灰"
          ]
        },
        "size": {
          "type": "select",
          "default": "Default 20",
          "description": "标签尺寸；三套标签族共用 Size 变体名",
          "enumValues": [
            "Mini 16",
            "Small 18",
            "Default 20",
            "Large 24"
          ]
        },
        "state": {
          "type": "select",
          "default": "Default 默认",
          "description": "默认标签交互状态；Other Tag/Status Tag 不使用该变体",
          "enumValues": [
            "Default 默认",
            "Hover 悬停",
            "Active 激活"
          ]
        },
        "showIcon": {
          "type": "boolean",
          "default": false,
          "description": "显示左侧图标；默认标签/状态标签生效"
        },
        "showDot": {
          "type": "boolean",
          "default": false,
          "description": "显示左侧圆点"
        },
        "showDropdown": {
          "type": "boolean",
          "default": false,
          "description": "显示下拉箭头；默认标签/状态标签生效"
        },
        "closable": {
          "type": "boolean",
          "default": false,
          "description": "显示关闭按钮"
        },
        "disabled": {
          "type": "boolean",
          "default": false,
          "description": "禁用；默认标签/状态标签生效"
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
        "renderKey": "tag"
      },
      "runtime": {
        "sizeMetrics": {
          "Mini 16": {
            "height": 16,
            "paddingX": 6,
            "paddingY": 1,
            "fontSize": 10,
            "cornerRadius": 4,
            "lineHeight": 16,
            "gap": 4,
            "iconSize": 10,
            "dotSize": 4,
            "glyphSize": 9
          },
          "Small 18": {
            "height": 18,
            "paddingX": 6,
            "paddingY": 1,
            "fontSize": 10,
            "cornerRadius": 4,
            "lineHeight": 18,
            "gap": 4,
            "iconSize": 10,
            "dotSize": 4,
            "glyphSize": 10
          },
          "Default 20": {
            "height": 20,
            "paddingX": 6,
            "paddingY": 1,
            "fontSize": 12,
            "cornerRadius": 4,
            "lineHeight": 20,
            "gap": 4,
            "iconSize": 12,
            "dotSize": 6,
            "glyphSize": 10
          },
          "Large 24": {
            "height": 24,
            "paddingX": 6,
            "paddingY": 1,
            "fontSize": 12,
            "cornerRadius": 4,
            "lineHeight": 24,
            "gap": 4,
            "iconSize": 12,
            "dotSize": 6,
            "glyphSize": 12
          }
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-display-tag",
        "componentKey": "19089a80333c317accdfb64ccd31736c7fef9dbd",
        "inspectedAt": "2026-03-09T12:55:10.925Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "Close 关闭",
            "displayName": "Close 关闭",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Disabled 禁用",
            "displayName": "Disabled 禁用",
            "type": "VARIANT",
            "defaultValue": "Off",
            "options": [
              "On",
              "Off"
            ]
          },
          {
            "propertyName": "Dot 点",
            "displayName": "Dot 点",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Dropdown 下拉",
            "displayName": "Dropdown 下拉",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Icon 图标",
            "displayName": "Icon 图标",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
            "type": "VARIANT",
            "defaultValue": "Default 20",
            "options": [
              "Mini 16",
              "Small 18",
              "Default 20",
              "Large 24"
            ]
          },
          {
            "propertyName": "State 状态",
            "displayName": "State 状态",
            "type": "VARIANT",
            "defaultValue": "Default 默认",
            "options": [
              "Default 默认",
              "Hover 悬停",
              "Active 激活"
            ]
          },
          {
            "propertyName": "Type 类型",
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Default 默认标签",
            "options": [
              "Default 默认标签",
              "Solid 面型标签",
              "Outline 线型标签",
              "Text 文字标签"
            ]
          }
        ]
      },
      "colorVariableBindings": {
        "tag-neutral-bg-key": {
          "enabled": true,
          "token": "color-bg-4",
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
        "tag-neutral-text-key": {
          "enabled": true,
          "token": "text.secondary",
          "variableRef": "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562",
          "keyCandidates": [
            "a7442f0ba4f4f027d86e03f335df11c38232c0ce"
          ],
          "idCandidates": [
            "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"
          ]
        },
        "tag-disabled-bg-key": {
          "enabled": true,
          "token": "color-bg-4",
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
        "tag-disabled-text-key": {
          "enabled": true,
          "token": "text-4",
          "nameCandidates": [
            "text/置灰信息 @color-text-4",
            "@color-text-4"
          ]
        },
        "tag-border-key": {
          "enabled": true,
          "token": "border-base",
          "nameCandidates": [
            "color-border-1"
          ]
        },
        "tag-solid-bg-key": {
          "enabled": true,
          "token": "primary-6",
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
        "tag-solid-text-key": {
          "enabled": true,
          "token": "text-on-brand",
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
        }
      },
      "typographyBindings": {
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
            "Body",
            "正文",
            "Text/Body"
          ]
        }
      }
    },
    "icon-asterisk": {
      "id": "icon-asterisk",
      "name": "必填星号",
      "category": "Icon",
      "description": "表单必填星号图标",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "表单必填星号图标",
        "usage": "用于表单字段的必填标识。",
        "examples": [
          "必填星号: { \"componentId\": \"icon-asterisk\" }"
        ]
      },
      "params": {
        "width": {
          "type": "number",
          "default": 0,
          "description": "宽度覆盖（0 表示不覆盖）"
        },
        "height": {
          "type": "number",
          "default": 0,
          "description": "高度覆盖（0 表示不覆盖）"
        },
        "clipsContent": {
          "type": "boolean",
          "default": false,
          "description": "裁剪超出组件的内容"
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
        "renderKey": "eaaaf6bb82b8bdb2fc20b81407ba862cea786d2c"
      }
    },
    "icon-delete": {
      "id": "icon-delete",
      "name": "删除图标",
      "category": "Icon",
      "description": "删除动作图标",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "删除动作图标",
        "usage": "用于表示删除/移除动作。",
        "examples": [
          "删除图标: { \"componentId\": \"icon-delete\" }"
        ]
      },
      "params": {
        "width": {
          "type": "number",
          "default": 0,
          "description": "宽度覆盖（0 表示不覆盖）"
        },
        "height": {
          "type": "number",
          "default": 0,
          "description": "高度覆盖（0 表示不覆盖）"
        },
        "clipsContent": {
          "type": "boolean",
          "default": false,
          "description": "裁剪超出组件的内容"
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
        "renderKey": "3cf68ee183ff9840dffb8e4ba760dfea519e4a8d"
      }
    },
    "button": {
      "id": "button",
      "name": "按钮",
      "category": "Basic",
      "description": "标准交互按钮，按 lib-basic-button 高保真复刻，支持类型、主题、尺寸、状态、禁用、图标和语言变体",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "标准交互按钮，按 lib-basic-button 高保真复刻，支持类型、主题、尺寸、状态、禁用、图标和语言变体",
        "usage": "创建设计系统按钮。优先复用 lib-basic-button 原始组件变体，再最小替换文案和宽度；兼容旧参数 variant/label/width。",
        "examples": [
          "主要按钮: { \"componentId\": \"button\", \"params\": { \"label\": \"Confirm\", \"variant\": \"primary\" } }",
          "次要按钮: { \"componentId\": \"button\", \"params\": { \"label\": \"Cancel\", \"variant\": \"secondary\" } }",
          "危险线框按钮: { \"componentId\": \"button\", \"params\": { \"label\": \"删除\", \"variant\": \"outline\", \"theme\": \"danger\" } }",
          "仅图标按钮: { \"componentId\": \"button\", \"params\": { \"iconOnly\": true, \"showPrefixIcon\": true } }"
        ]
      },
      "params": {
        "label": {
          "type": "string",
          "default": "Button",
          "description": "按钮文本"
        },
        "variant": {
          "type": "select",
          "default": "primary",
          "description": "样式变体",
          "enumValues": [
            "primary",
            "secondary",
            "outline",
            "text"
          ]
        },
        "theme": {
          "type": "select",
          "default": "default",
          "description": "主题色",
          "enumValues": [
            "default",
            "danger",
            "success",
            "warning"
          ]
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
          "description": "交互状态",
          "enumValues": [
            "Default 默认",
            "Hover 悬停",
            "Active 激活",
            "Disabled 禁用"
          ]
        },
        "disabled": {
          "type": "boolean",
          "default": false,
          "description": "禁用；开启后会强制走 Disabled 变体"
        },
        "iconOnly": {
          "type": "boolean",
          "default": false,
          "description": "仅图标"
        },
        "showPrefixIcon": {
          "type": "boolean",
          "default": false,
          "description": "前置图标"
        },
        "showSuffixIcon": {
          "type": "boolean",
          "default": false,
          "description": "后置图标"
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
        "width": {
          "type": "number",
          "default": 0,
          "description": "宽度 (0为自适应)"
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
        "renderKey": "button"
      },
      "runtime": {
        "sizeMetrics": {
          "Mini 24": {
            "height": 24,
            "paddingX": 16,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 6
          },
          "Small 28": {
            "height": 28,
            "paddingX": 16,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 6
          },
          "Default 32": {
            "height": 32,
            "paddingX": 16,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 6
          },
          "Large 36": {
            "height": 36,
            "paddingX": 16,
            "paddingY": 8,
            "fontSize": 13,
            "cornerRadius": 6
          }
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-basic-button",
        "componentKey": "a539f78c79dc3ab8df6c18d806b0666f64fae1ab",
        "inspectedAt": "2026-03-05T11:21:17.019Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "PrefixIcon 前置图标#118251:241",
            "displayName": "PrefixIcon 前置图标",
            "type": "BOOLEAN",
            "defaultValue": false,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "SuffixIcon 后置图标#118251:964",
            "displayName": "SuffixIcon 后置图标",
            "type": "BOOLEAN",
            "defaultValue": false,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "prefixIcon 前置图标#118251:0",
            "displayName": "prefixIcon 前置图标",
            "type": "INSTANCE_SWAP",
            "defaultValue": "13:8327"
          },
          {
            "propertyName": "suffixIcon 后置图标#118251:482",
            "displayName": "suffixIcon 后置图标",
            "type": "INSTANCE_SWAP",
            "defaultValue": "13:1867"
          },
          {
            "propertyName": "Disable 禁用",
            "displayName": "Disable 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "IconOnly 仅图标",
            "displayName": "IconOnly 仅图标",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Language",
            "displayName": "Language",
            "type": "VARIANT",
            "defaultValue": "CN",
            "options": [
              "CN",
              "EN"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
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
            "displayName": "State 状态",
            "type": "VARIANT",
            "defaultValue": "Default 默认",
            "options": [
              "Default 默认",
              "Hover 悬停",
              "Active 激活",
              "Disabled 禁用"
            ]
          },
          {
            "propertyName": "Theme 主题",
            "displayName": "Theme 主题",
            "type": "VARIANT",
            "defaultValue": "Default 默认",
            "options": [
              "Default 默认",
              "Danger 危险",
              "Success 成功",
              "Warning 警示"
            ]
          },
          {
            "propertyName": "Type 类型",
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Primary 主要",
            "options": [
              "Primary 主要",
              "Secondary 次要",
              "Outline 线框",
              "Text 文字"
            ]
          }
        ]
      },
      "colorVariableBindings": {
        "btn-primary-bg": {
          "enabled": true,
          "token": "button.primary.bg",
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
        "btn-secondary-bg": {
          "enabled": true,
          "token": "button.secondary.bg",
          "nameCandidates": [
            "color-bg-2"
          ]
        },
        "btn-primary-text": {
          "enabled": true,
          "token": "button.primary.text",
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
        "btn-secondary-text": {
          "enabled": true,
          "token": "button.secondary.text",
          "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
          "keyCandidates": [
            "178115a8c3bc7983da5bc10e637208895750dbfd"
          ],
          "idCandidates": [
            "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
          ]
        },
        "btn-outline-text": {
          "enabled": true,
          "token": "button.outline.text",
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
        }
      },
      "typographyBindings": {
        "button-text-style-key": {
          "enabled": true,
          "token": "button.text",
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
            "Text/Body Medium"
          ]
        }
      }
    },
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
        "componentKey": "360abf928135cb51b513e27732dfc609c0dffe14",
        "inspectedAt": "2026-03-09T12:22:45.030Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "Items 数量",
            "displayName": "Items 数量",
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
            "displayName": "Language",
            "type": "VARIANT",
            "defaultValue": "CN",
            "options": [
              "CN",
              "EN"
            ]
          },
          {
            "propertyName": "Layout 布局",
            "displayName": "Layout 布局",
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
          "## 示例2：带下拉/复选的纵向编辑表单\n```json\n{ \"layout\": \"vertical\", \"align\": \"top\",\n  \"rows\": [\n    [{ \"componentId\": \"input\", \"label\": \"姓名\", \"required\": true }],\n    [{ \"componentId\": \"select\", \"label\": \"部门\", \"props\": { \"optionsText\": \"产品,研发,设计,运营\" } }],\n    [{ \"componentId\": \"radio-group\", \"label\": \"性别\", \"props\": { \"optionsText\": \"男,女\", \"checkedValues\": \"男\" } }],\n    [{ \"componentId\": \"datepicker\", \"label\": \"入职日期\" }],\n    [{ \"componentId\": \"textarea\", \"label\": \"备注\", \"placeholder\": \"请输入备注\" }]\n  ],\n  \"footer\": { \"actions\": [{ \"label\": \"保存\", \"variant\": \"primary\" }, { \"label\": \"取消\" }], \"align\": \"end\" }\n}```",
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
          "rows 里直接放 figma-component → 必须用 componentId 指定控件类型",
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
          "default": "fill",
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
          "description": "控件宽度"
        },
        "controlWidthMode": {
          "type": "select",
          "default": "fill",
          "description": "控件宽度模式",
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
      }
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
          "下拉选: { componentId: 'select', label: '状态', props: { optionsText: '启用,禁用' } }",
          "复选框: { componentId: 'checkbox-group', label: '权限', props: { optionsText: '读,写,删', checkedValues: '读' } }",
          "日期: { componentId: 'datepicker', label: '日期' }",
          "开关: { componentId: 'switch', label: '启用' }"
        ]
      },
      "renderNotes": {
        "actionHint": "表单字段必须通过 controlType 选择原子控件，不要在 form-row/rows 中直接放 figma-component。",
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
        "descriptionText": {
          "type": "string",
          "default": "",
          "description": "字段补充说明，对应 Description 描述"
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
          "description": "控件宽度"
        },
        "showColon": {
          "type": "boolean",
          "default": false,
          "description": "显示标签冒号"
        },
        "controlType": {
          "type": "select",
          "default": "Input 输入框",
          "description": "控件类型",
          "enumValues": [
            "Input 输入框",
            "Select 选择框",
            "Checkbox 多选",
            "DatePicker 日期选择",
            "Inputnumber 数字输入",
            "Radio 单选",
            "Segmented Picker 分段选择器",
            "Slider 滑动",
            "Switch 开关",
            "Textarea 多行文本",
            "TimePicker 时间选择",
            "Upload 上传"
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
        "disabled": {
          "type": "boolean",
          "default": false,
          "description": "是否禁用（适用于 input/select/checkbox-group/radio-group/button/switch）"
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
            "figma-component",
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
      }
    },
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
        "componentKey": "f04bea11a4ef73f626b7402aac670a94ad32faf0",
        "inspectedAt": "2026-03-22T10:31:28.107Z",
        "source": "discover_component_props",
        "sourceNodeId": "78:32025",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "State 状态=Default 默认, Size 尺寸=Default 32, Filled 已填=False, Error 错误=False, Disable 禁用=False, Prefix 前缀=False, Suffix 后缀=False",
        "componentSetName": "Input 输入框",
        "properties": [
          {
            "propertyName": "Disable 禁用",
            "displayName": "Disable 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Error 错误",
            "displayName": "Error 错误",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Filled 已填",
            "displayName": "Filled 已填",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Prefix 前缀",
            "displayName": "Prefix 前缀",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
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
            "displayName": "State 状态",
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
            "displayName": "Suffix 后缀",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          }
        ],
        "propertyMap": {
          "Disable 禁用":  { "sourceParam": "disabled",   "transform": "boolean" },
          "Error 错误":    { "sourceParam": "error",      "transform": "boolean" },
          "Filled 已填":   { "sourceParam": "filled",     "transform": "boolean" },
          "Prefix 前缀":   { "sourceParam": "showPrefix", "transform": "boolean" },
          "Size 尺寸":     { "sourceParam": "size" },
          "State 状态":    { "sourceParam": "state" },
          "Suffix 后缀":   { "sourceParam": "showSuffix", "transform": "boolean" }
        }
      }
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
        "componentKey": "d124dbe0576b8dfd900897124bd14e888e4db6f3",
        "inspectedAt": "2026-03-22T10:48:03.940Z",
        "source": "discover_component_props",
        "sourceNodeId": "111:33695",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Type 类型=Default 默认, Size 尺寸=Default 32, State 状态=Default 默认, Filled 填写=False, Multiple 多选=False, Disabled 禁用=False",
        "componentSetName": "Select 选择器",
        "properties": [
          {
            "propertyName": "Placeholder 占位符#115960:0",
            "displayName": "Placeholder 占位符",
            "type": "TEXT",
            "defaultValue": "请选择"
          },
          {
            "propertyName": "Value#115960:55",
            "displayName": "Value",
            "type": "TEXT",
            "defaultValue": "北京"
          },
          {
            "propertyName": "Disabled 禁用",
            "displayName": "Disabled 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Filled 填写",
            "displayName": "Filled 填写",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Multiple 多选",
            "displayName": "Multiple 多选",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
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
            "displayName": "State 状态",
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
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Default 默认",
            "options": [
              "Default 默认",
              "Label 内置标签"
            ]
          }
        ],
        "propertyMap": {
          "Disabled 禁用": { "sourceParam": "disabled",    "transform": "boolean" },
          "Filled 填写":   { "sourceParam": "filled",      "transform": "boolean" },
          "Multiple 多选": { "sourceParam": "multiple",    "transform": "boolean" },
          "Size 尺寸":     { "sourceParam": "size" },
          "State 状态":    { "sourceParam": "state" },
          "Type 类型":     { "sourceParam": "selectType" }
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
        "componentKey": "ca3d2f097d5c3a695f6b4b8c8d7455b03d6dcafd",
        "inspectedAt": "2026-03-22T10:44:34.016Z",
        "source": "discover_component_props",
        "sourceNodeId": "120:46849",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Layout 布局=Horizontal 横向, Items 数量=2",
        "componentSetName": "Checkbox Group 复选框组",
        "properties": [
          {
            "propertyName": "Items 数量",
            "displayName": "Items 数量",
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
            "displayName": "Layout 布局",
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
      "description": "开关控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
        "checked": {
          "type": "boolean",
          "default": false,
          "description": "是否开启"
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
        "renderKey": "switch"
      },
      "runtime": {
        "fallback": {
          "width": 44,
          "height": 24
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-switch",
        "componentKey": "d6017b9a513cbd53d6963d768259bbe0fcb8ddde",
        "inspectedAt": "2026-03-22T10:41:57.296Z",
        "source": "discover_component_props",
        "sourceNodeId": "30:47485",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Checked 开关=False, Size 尺寸=Default  20, Label 标签=False, Disabled 禁用=False, Loading 加载中=False",
        "componentSetName": "Switch 开关",
        "properties": [
          {
            "propertyName": "Checked 开关",
            "displayName": "Checked 开关",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Disabled 禁用",
            "displayName": "Disabled 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Label 标签",
            "displayName": "Label 标签",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Loading 加载中",
            "displayName": "Loading 加载中",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
            "type": "VARIANT",
            "defaultValue": "Default  20",
            "options": [
              "Mini 16",
              "Default  20"
            ]
          }
        ],
        "propertyMap": {
          "Checked 开关":  { "sourceParam": "checked",  "transform": "boolean" },
          "Disabled 禁用": { "sourceParam": "disabled", "transform": "boolean" }
        }
      }
    },
    "datepicker": {
      "id": "datepicker",
      "name": "日期选择",
      "category": "Form",
      "description": "日期选择控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
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
        "renderKey": "datepicker"
      },
      "runtime": {
        "fallback": {
          "width": 120,
          "height": 32
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-datepicker",
        "componentKey": "75d61442da83762c096571de0f34f56012bea78d",
        "inspectedAt": "2026-03-22T10:51:01.430Z",
        "source": "discover_component_props",
        "sourceNodeId": "14:97181",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Type 类型=Date 日期, State 状态=Default 默认, Size 尺寸=Default 32, Filled 已填=False, Disabled 禁用=False",
        "componentSetName": "Datepicker 日期选择器",
        "properties": [
          {
            "propertyName": "Disabled 禁用",
            "displayName": "Disabled 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Filled 已填",
            "displayName": "Filled 已填",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
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
            "displayName": "State 状态",
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
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Date 日期",
            "options": [
              "Date 日期",
              "DateRange 日期范围",
              "DateTimeRange 日期时间范围",
              "RelativeDate 相对时间",
              "RelativeDateRange 相对时间范围",
              "RelativeDateTimeRang 相对日期时间范围"
            ]
          }
        ]
      }
    },
    "timepicker": {
      "id": "timepicker",
      "name": "时间选择",
      "category": "Form",
      "description": "时间选择控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
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
        "renderKey": "timepicker"
      },
      "runtime": {
        "fallback": {
          "width": 120,
          "height": 32
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-timepicker",
        "componentKey": "b6eadcc611e8d23cea25b9799bc317154a718322",
        "inspectedAt": "2026-03-22T10:50:49.338Z",
        "source": "discover_component_props",
        "sourceNodeId": "120:46644",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Type 类型=Time 时间, State 状态=Default 默认, Size 尺寸=Default 32, Filled 已填=False, Disable 禁用=False",
        "componentSetName": "Timepicker 时间选择器",
        "properties": [
          {
            "propertyName": "Disable 禁用",
            "displayName": "Disable 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Filled 已填",
            "displayName": "Filled 已填",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
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
            "displayName": "State 状态",
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
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Time 时间",
            "options": [
              "Time 时间",
              "TimeRange 时间范围"
            ]
          }
        ]
      }
    },
    "inputnumber": {
      "id": "inputnumber",
      "name": "数字输入",
      "category": "Form",
      "description": "数字输入控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
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
        "fallback": {
          "width": 120,
          "height": 32
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-inputnumber",
        "componentKey": "207e734d854bc8d664b0218f431761c985ecccf1",
        "inspectedAt": "2026-03-22T10:41:02.972Z",
        "source": "discover_component_props",
        "sourceNodeId": "120:45440",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Type 类型=Row 双侧调整, Size 尺寸=Default 32, State 状态=Default 默认, Filled 已填=True, Disabled 禁用=False",
        "componentSetName": "InputNumber 数字输入框",
        "properties": [
          {
            "propertyName": "Prefix 前缀#129313:0",
            "displayName": "Prefix 前缀",
            "type": "BOOLEAN",
            "defaultValue": false,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Suffix后缀#129313:45",
            "displayName": "Suffix后缀",
            "type": "BOOLEAN",
            "defaultValue": false,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Disabled 禁用",
            "displayName": "Disabled 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Filled 已填",
            "displayName": "Filled 已填",
            "type": "VARIANT",
            "defaultValue": "True",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
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
            "displayName": "State 状态",
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
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Row 双侧调整",
            "options": [
              "Right 右侧调整",
              "Row 双侧调整"
            ]
          }
        ]
      }
    },
    "slider": {
      "id": "slider",
      "name": "滑动条",
      "category": "Form",
      "description": "滑动条控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
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
        "renderKey": "slider"
      },
      "runtime": {
        "fallback": {
          "width": 120,
          "height": 32
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-slider",
        "componentKey": "cc707c07037cc48e0551dcd72feae6dabe9ed484",
        "inspectedAt": "2026-03-22T10:51:40.476Z",
        "source": "discover_component_props",
        "sourceNodeId": "120:45784",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Layout 布局=Horizontal 水平, State 状态=Default 默认, Rang 双游标=False, Icon 图标=False, Tooltip 提示=False, Inputnumber 数字输入=False, Marks 刻度=False, Disabled 禁用=False",
        "componentSetName": "Slider 滑动输入",
        "properties": [
          {
            "propertyName": "Disabled 禁用",
            "displayName": "Disabled 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Icon 图标",
            "displayName": "Icon 图标",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Inputnumber 数字输入",
            "displayName": "Inputnumber 数字输入",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Layout 布局",
            "displayName": "Layout 布局",
            "type": "VARIANT",
            "defaultValue": "Horizontal 水平",
            "options": [
              "Horizontal 水平",
              "Vertical 垂直"
            ]
          },
          {
            "propertyName": "Marks 刻度",
            "displayName": "Marks 刻度",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Rang 双游标",
            "displayName": "Rang 双游标",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "State 状态",
            "displayName": "State 状态",
            "type": "VARIANT",
            "defaultValue": "Default 默认",
            "options": [
              "Default 默认",
              "Hover 悬停",
              "Active 激活",
              "Disabled 禁用"
            ]
          },
          {
            "propertyName": "Tooltip 提示",
            "displayName": "Tooltip 提示",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          }
        ]
      }
    },
    "textarea": {
      "id": "textarea",
      "name": "多行文本",
      "category": "Form",
      "description": "多行文本控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
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
        "renderKey": "textarea"
      },
      "runtime": {
        "fallback": {
          "width": 160,
          "height": 80
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-textarea",
        "componentKey": "acba4b2ca240bc5a54672107c78235f4f82fd419",
        "inspectedAt": "2026-03-22T10:47:51.921Z",
        "source": "discover_component_props",
        "sourceNodeId": "1165:6570",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "State 状态=Defalult 默认, Filled 已填=False, Error 错误=False, Disable 禁用=False",
        "componentSetName": "TextArea 文本域",
        "properties": [
          {
            "propertyName": "WordLimit 字数限制#148819:29",
            "displayName": "WordLimit 字数限制",
            "type": "BOOLEAN",
            "defaultValue": true,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "可拖拽大小#148819:0",
            "displayName": "可拖拽大小",
            "type": "BOOLEAN",
            "defaultValue": true,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "placeholder 占位符#89418:13",
            "displayName": "placeholder 占位符",
            "type": "TEXT",
            "defaultValue": "This is the contents of the textarea. \n"
          },
          {
            "propertyName": "value#111345:434",
            "displayName": "value",
            "type": "TEXT",
            "defaultValue": "This is the contents of the textarea. \n"
          },
          {
            "propertyName": "Disable 禁用",
            "displayName": "Disable 禁用",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Error 错误",
            "displayName": "Error 错误",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Filled 已填",
            "displayName": "Filled 已填",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "State 状态",
            "displayName": "State 状态",
            "type": "VARIANT",
            "defaultValue": "Defalult 默认",
            "options": [
              "Defalult 默认",
              "Hover 悬浮",
              "Active 激活"
            ]
          }
        ]
      }
    },
    "upload": {
      "id": "upload",
      "name": "上传按钮",
      "category": "Form",
      "description": "上传控件（自定义包装）",
      "schemaVersion": "2.0.0",
      "params": {
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
        "renderKey": "upload"
      },
      "runtime": {
        "fallback": {
          "width": 160,
          "height": 32
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-button",
        "componentKey": "d93abfb10eb04a5723ba8016b9147c131b54dc6d",
        "inspectedAt": "2026-03-22T10:44:08.434Z",
        "source": "discover_component_props",
        "sourceNodeId": "120:45309",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Theme 主题=Default 默认, State 状态=Before 上传前",
        "componentSetName": "Button 按钮上传",
        "properties": [
          {
            "propertyName": "State 状态",
            "displayName": "State 状态",
            "type": "VARIANT",
            "defaultValue": "Before 上传前",
            "options": [
              "Before 上传前",
              "After 上传后"
            ]
          },
          {
            "propertyName": "Theme 主题",
            "displayName": "Theme 主题",
            "type": "VARIANT",
            "defaultValue": "Default 默认",
            "options": [
              "Default 默认",
              "Primary 强调"
            ]
          }
        ]
      }
    },
    "segmented-picker": {
      "id": "segmented-picker",
      "name": "分段选择器",
      "category": "Form",
      "description": "分段选择器控件（自定义包装）",
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
          "description": "选中值"
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
        "renderKey": "segmented-picker"
      },
      "runtime": {
        "fallback": {
          "width": 160,
          "height": 32
        }
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-segmented-picker",
        "componentKey": "94125fa758354931512313d1bb6ce37aae02b8c7",
        "inspectedAt": "2026-03-22T10:41:27.872Z",
        "source": "discover_component_props",
        "sourceNodeId": "4151:53302",
        "sourceNodeType": "COMPONENT_SET",
        "componentName": "Size 尺寸=Default 32, Items 数量=2",
        "componentSetName": "Segmented Picker 分段选择器",
        "properties": [
          {
            "propertyName": "Items 数量",
            "displayName": "Items 数量",
            "type": "VARIANT",
            "defaultValue": "4",
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
            "propertyName": "Size 尺寸",
            "displayName": "Size 尺寸",
            "type": "VARIANT",
            "defaultValue": "Default 32",
            "options": [
              "Mini 24",
              "Small 28",
              "Default 32",
              "Large 36"
            ]
          }
        ]
      }
    },

  },
  "meta": {
    "updatedAt": "2026-03-13T12:51:33.898Z",
    "owner": "figma-ui-agent",
    "description": "Normalized from legacy registry"
  }
}
;
