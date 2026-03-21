import type { ComponentRegistry } from "./registry.types";

export const COMPONENT_REGISTRY: ComponentRegistry = {
  "version": "2.0",
  "components": {
    "page": {
      "id": "page",
      "name": "页面容器",
      "category": "Layout",
      "description": "标准的页面布局容器，包含顶部导航和左侧导航",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "标准的页面布局容器，包含顶部导航和左侧导航",
        "usage": "当用户需要生成一个完整的页面或屏幕时使用。默认包含顶部导航栏(48px)和左侧导航栏(200px)。页面其余部分为内容区域(Padding 32)。可以通过 title 参数设置页头的文字标题。",
        "examples": [
          "创建标准页面: { \"componentId\": \"page\", \"params\": { \"title\": \"Dashboard\" } }"
        ]
      },
      "params": {
        "title": {
          "type": "string",
          "default": "页面标题",
          "description": "页头显示的文字标题"
        },
        "width": {
          "type": "number",
          "default": 1440,
          "description": "页面宽度"
        },
        "height": {
          "type": "number",
          "default": 900,
          "description": "页面高度"
        }
      },
      "slots": {
        "default": {
          "displayName": "Default",
          "allowedComponents": [
            "layout",
            "card",
            "table",
            "text",
            "tag",
            "figma-component"
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
        "renderKey": "page"
      },
      "typographyBindings": {
        "page-title-text-style-key": {
          "enabled": true,
          "token": "page.title",
          "textStyleRef": "S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3",
          "keyCandidates": [
            "06c98e2c68a38e391190684c4b73e26efcd5d930"
          ],
          "idCandidates": [
            "S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3"
          ],
          "nameCandidates": [
            "Title",
            "标题",
            "Text/Title"
          ]
        }
      }
    },
    "layout": {
      "id": "layout",
      "name": "布局容器",
      "category": "Layout",
      "description": "通用的水平或垂直布局容器",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "通用的水平或垂直布局容器",
        "usage": "使用此组件创建水平或垂直堆叠的项目组。通过 direction 参数控制布局方向 (horizontal/vertical)。支持 padding 和 spacing。如果不确定用什么容器，通常首选此组件。",
        "examples": [
          "创建一行文本: { \"componentId\": \"layout\", \"params\": { \"direction\": \"horizontal\", \"spacing\": 10 } }",
          "创建一列卡片: { \"componentId\": \"layout\", \"params\": { \"direction\": \"vertical\", \"padding\": 20 } }",
          "带边框的容器: { \"componentId\": \"layout\", \"params\": { \"borderWidth\": 1, \"borderColor\": \"#E6E6E6\", \"cornerRadius\": 8 } }"
        ]
      },
      "params": {
        "direction": {
          "type": "select",
          "default": "horizontal",
          "description": "布局方向",
          "enumValues": [
            "horizontal",
            "vertical"
          ]
        },
        "spacing": {
          "type": "number",
          "default": 0,
          "description": "子项间距"
        },
        "padding": {
          "type": "number",
          "default": 0,
          "description": "内边距（统一）"
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
          "default": 0,
          "description": "左内边距"
        },
        "paddingRight": {
          "type": "number",
          "default": 0,
          "description": "右内边距"
        },
        "backgroundColor": {
          "type": "color",
          "default": "",
          "description": "背景颜色"
        },
        "borderColor": {
          "type": "color",
          "default": "",
          "description": "边框颜色"
        },
        "borderWidth": {
          "type": "number",
          "default": 0,
          "description": "边框宽度"
        },
        "borderBottomOnly": {
          "type": "boolean",
          "default": false,
          "description": "仅显示下边框"
        },
        "cornerRadius": {
          "type": "number",
          "default": 0,
          "description": "圆角半径"
        },
        "clipsContent": {
          "type": "boolean",
          "default": false,
          "description": "裁剪超出容器的内容，默认关闭以避免裁掉控件外描边/阴影"
        },
        "width": {
          "type": "number",
          "default": 0,
          "description": "宽度 (0为自适应)"
        }
      },
      "slots": {
        "default": {
          "displayName": "Default",
          "allowedComponents": [
            "layout",
            "table-cell",
            "text",
            "tag",
            "button",
            "input",
            "select",
            "card",
            "figma-component"
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
        "renderKey": "layout"
      },
      "colorVariableBindings": {
        "layout-bg-key": {
          "enabled": true,
          "token": "layout.bg",
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
        "layout-border-key": {
          "enabled": true,
          "token": "layout.border",
          "nameCandidates": [
            "color-border-1"
          ]
        }
      }
    },
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
          "default": "Enter text...",
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
        "usage": "用于创建标准数据表格。它水平排列多个 table-column。如果你需要自定义表头，请通过 children 传入具体的 table-column 节点并设置其 headerText。如果不传 children，将根据 columnCount 自动生成默认表头。重要：如果你传入了 children（即自定义列），请确保传入所有需要的列，不要设置 columnCount，否则可能会导致列重复。这是创建表格的唯一入口，不要使用 layout 拼凑表格。",
        "examples": [
          "创建 3列10行表格: { \"componentId\": \"table\", \"params\": { \"columnCount\": 3, \"rowCount\": 10 } }",
          "创建包含特定表头的表格（必须包含所有列）: { \"componentId\": \"table\", \"children\": [ { \"componentId\": \"table-column\", \"params\": { \"headerText\": \"姓名\", \"width\": 100 } }, { \"componentId\": \"table-column\", \"params\": { \"headerText\": \"年龄\", \"width\": 60 } }, { \"componentId\": \"table-column\", \"params\": { \"headerText\": \"城市\", \"width\": 100 } } ] }"
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
    "input": {
      "id": "input",
      "name": "输入框",
      "category": "Form",
      "description": "单行文本输入框，支持尺寸、状态、禁用、错误、前后缀等能力，按 lib-data-input-input 复刻增强",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "单行文本输入框，支持尺寸、状态、禁用、错误、前后缀等能力，按 lib-data-input-input 复刻增强",
        "usage": "创建文本输入框。支持 placeholder/value、size、state、filled、disabled、error、prefix、suffix 等参数。",
        "examples": [
          "基础输入框: { \"componentId\": \"input\", \"params\": { \"placeholder\": \"请输入\" } }",
          "带前缀和激活态: { \"componentId\": \"input\", \"params\": { \"value\": \"北京\", \"state\": \"Active 激活\", \"showPrefix\": true, \"prefixText\": \"@\" } }"
        ]
      },
      "params": {
        "placeholder": {
          "type": "string",
          "default": "Placeholder",
          "description": "占位符"
        },
        "value": {
          "type": "string",
          "default": "示例文字",
          "description": "当前值"
        },
        "width": {
          "type": "number",
          "default": 240,
          "description": "宽度"
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
            "Hover 悬浮",
            "Active 激活"
          ]
        },
        "filled": {
          "type": "boolean",
          "default": false,
          "description": "已填状态"
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
          "description": "前缀文本；为空时显示占位图标块"
        },
        "showSuffix": {
          "type": "boolean",
          "default": false,
          "description": "显示后缀"
        },
        "suffixText": {
          "type": "string",
          "default": "",
          "description": "后缀文本；为空时显示占位图标块"
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
        "renderKey": "input"
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-input",
        "componentKey": "f04bea11a4ef73f626b7402aac670a94ad32faf0",
        "inspectedAt": "2026-03-06T00:00:00.000Z",
        "source": "discover_component_props",
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
        ]
      },
      "colorVariableBindings": {
        "input-bg": {
          "enabled": true,
          "token": "input.bg",
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
        "input-text": {
          "enabled": true,
          "token": "input.text",
          "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
          "keyCandidates": [
            "178115a8c3bc7983da5bc10e637208895750dbfd"
          ],
          "idCandidates": [
            "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
          ]
        },
        "input-placeholder": {
          "enabled": true,
          "token": "input.placeholder",
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
        "input-border-key": {
          "enabled": true,
          "token": "input.border",
          "nameCandidates": [
            "color-border-1"
          ]
        },
        "input-hover-border-key": {
          "enabled": true,
          "token": "text.secondary",
          "variableRef": "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562",
          "keyCandidates": [
            "a7442f0ba4f4f027d86e03f335df11c38232c0ce"
          ],
          "idCandidates": [
            "VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"
          ],
          "nameCandidates": [
            "Input/Border/Hover",
            "输入框/边框/悬浮"
          ]
        },
        "input-active-border-key": {
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
            "primary-6",
            "Input/Border/Active",
            "输入框/边框/激活"
          ]
        },
        "input-error-border-key": {
          "enabled": true,
          "token": "button.danger.text",
          "variableRef": "VariableID:f60b03f9d134cb4ac3f68fb23b1fda9ba1304745/174345:672",
          "keyCandidates": [
            "f60b03f9d134cb4ac3f68fb23b1fda9ba1304745"
          ],
          "idCandidates": [
            "VariableID:f60b03f9d134cb4ac3f68fb23b1fda9ba1304745/174345:672"
          ],
          "nameCandidates": [
            "Input/Border/Error",
            "输入框/边框/错误"
          ]
        },
        "input-error-bg-key": {
          "enabled": true,
          "token": "input.error.bg",
          "nameCandidates": [
            "red/tag背景色 @danger-2",
            "@danger-2"
          ]
        },
        "input-disabled-bg-key": {
          "enabled": true,
          "token": "input.disabled.bg",
          "variableRef": "VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586",
          "keyCandidates": [
            "0ad927853701159721b6bb95d53b532de24282a7"
          ],
          "idCandidates": [
            "VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586"
          ],
          "nameCandidates": [
            "background/深 灰底 @color-bg-4",
            "@color-bg-4",
            "Input/BG/Disabled",
            "输入框/背景/禁用"
          ]
        },
        "input-disabled-text-key": {
          "enabled": true,
          "token": "input.disabled.text",
          "nameCandidates": [
            "text/置灰信息 @color-text-4",
            "@color-text-4",
            "Input/Text/Disabled",
            "输入框/文本/禁用"
          ]
        },
        "input-affix-key": {
          "enabled": true,
          "token": "input.placeholder",
          "variableRef": "VariableID:98bdfd58bdd60974e1fe50bb12cd2c24661e8ded/174345:276",
          "keyCandidates": [
            "98bdfd58bdd60974e1fe50bb12cd2c24661e8ded"
          ],
          "idCandidates": [
            "VariableID:98bdfd58bdd60974e1fe50bb12cd2c24661e8ded/174345:276"
          ],
          "nameCandidates": [
            "text/次要信息 @color-text-3",
            "@color-text-3",
            "Input/Affix",
            "输入框/前后缀"
          ]
        }
      },
      "typographyBindings": {
        "input-text-style-key": {
          "enabled": true,
          "token": "input.text",
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
    "select": {
      "id": "select",
      "name": "下拉选择框",
      "category": "Form",
      "description": "下拉菜单选择器，支持尺寸、状态、禁用、已填、多选、内置标签和下拉项文案能力，按 lib-data-input-select 高保真复刻增强",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "下拉菜单选择器，支持尺寸、状态、禁用、已填、多选、内置标签和下拉项文案能力，按 lib-data-input-select 高保真复刻增强",
        "usage": "创建下拉选择框。支持 placeholder/value、size、state、filled、disabled、multiple、selectType、optionsText 等参数。",
        "examples": [
          "选择框: { \"componentId\": \"select\", \"params\": { \"placeholder\": \"请选择城市\", \"value\": \"北京\" } }",
          "多选激活态: { \"componentId\": \"select\", \"params\": { \"state\": \"Active 激活\", \"multiple\": true, \"placeholder\": \"请选择城市\", \"optionsText\": \"北京,上海,杭州\" } }"
        ]
      },
      "params": {
        "placeholder": {
          "type": "string",
          "default": "请选择",
          "description": "占位文案"
        },
        "value": {
          "type": "string",
          "default": "示例文字",
          "description": "当前选中值；为空时显示 placeholder"
        },
        "width": {
          "type": "number",
          "default": 240,
          "description": "宽度"
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
            "Hover 悬浮",
            "Active 激活"
          ]
        },
        "filled": {
          "type": "boolean",
          "default": false,
          "description": "已填状态"
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
          "type": "boolean",
          "default": false,
          "description": "内置标签"
        },
        "optionsText": {
          "type": "string",
          "default": "北京,上海,杭州,深圳,广州",
          "description": "下拉项文案，支持逗号或换行分隔；导入原始组件后会替换默认菜单项文本并按数量裁剪/补齐菜单项"
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
        "renderKey": "select"
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-select",
        "componentKey": "d124dbe0576b8dfd900897124bd14e888e4db6f3",
        "inspectedAt": "2026-03-09T11:29:51.599Z",
        "source": "discover_component_props",
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
        ]
      },
      "colorVariableBindings": {
        "select-bg": {
          "enabled": true,
          "token": "select.bg",
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
        "select-text": {
          "enabled": true,
          "token": "select.text",
          "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
          "keyCandidates": [
            "178115a8c3bc7983da5bc10e637208895750dbfd"
          ],
          "idCandidates": [
            "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
          ]
        },
        "select-placeholder": {
          "enabled": true,
          "token": "select.placeholder",
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
        "select-icon": {
          "enabled": true,
          "token": "select.icon",
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
        "select-border-key": {
          "enabled": true,
          "token": "select.border",
          "nameCandidates": [
            "color-border-1"
          ]
        }
      },
      "typographyBindings": {
        "select-text-style-key": {
          "enabled": true,
          "token": "select.text",
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
    "checkbox": {
      "id": "checkbox",
      "name": "复选框",
      "category": "Form",
      "description": "单个复选框控件，支持选中、半选、悬浮、禁用和标签开关，按 lib-data-input-checkbox 高保真复刻增强",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "单个复选框控件，支持选中、半选、悬浮、禁用和标签开关，按 lib-data-input-checkbox 高保真复刻增强",
        "usage": "创建单个复选框。支持 label、showLabel、checked、indeterminate、hover、disabled 等参数。",
        "examples": [
          "基础复选框: { \"componentId\": \"checkbox\", \"params\": { \"label\": \"选项一\", \"checked\": false } }",
          "禁用已选复选框: { \"componentId\": \"checkbox\", \"params\": { \"label\": \"已同意\", \"checked\": true, \"disabled\": true } }"
        ]
      },
      "params": {
        "label": {
          "type": "string",
          "default": "选项一",
          "description": "标签文案"
        },
        "showLabel": {
          "type": "boolean",
          "default": true,
          "description": "显示标签"
        },
        "checked": {
          "type": "boolean",
          "default": false,
          "description": "选中"
        },
        "indeterminate": {
          "type": "boolean",
          "default": false,
          "description": "半选"
        },
        "hover": {
          "type": "boolean",
          "default": false,
          "description": "悬浮态"
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
        "renderKey": "checkbox"
      },
      "figmaPropertySnapshot": {
        "token": "lib-data-input-checkbox",
        "componentKey": "51a9e035c762059b3c592e77aadbbe5b22dcb04e",
        "inspectedAt": "2026-03-09T12:12:29.987Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "label 标签#109762:15",
            "displayName": "label 标签",
            "type": "BOOLEAN",
            "defaultValue": true,
            "options": [
              "True",
              "False"
            ]
          },
          {
            "propertyName": "Checked 已选",
            "displayName": "Checked 已选",
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
            "propertyName": "Hover 悬浮",
            "displayName": "Hover 悬浮",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Indeterminate 半选",
            "displayName": "Indeterminate 半选",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          }
        ]
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
        "checkbox-checkmark": {
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
        "checkbox-label": {
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
    "checkbox-group": {
      "id": "checkbox-group",
      "name": "复选框组",
      "category": "Form",
      "description": "复选框组选项控件，优先复用真实 lib-data-input-checkbox 组件逐项拼组，避免手工绘制勾选 SVG；会根据 optionsText 调整子项数量并覆写勾选状态",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "复选框组选项控件，优先复用真实 lib-data-input-checkbox 组件逐项拼组，避免手工绘制勾选 SVG；会根据 optionsText 调整子项数量并覆写勾选状态",
        "usage": "当表单字段或选项区需要多选能力时使用。通过 optionsText 传入逗号或换行分隔的选项，checkedValues 传入默认勾选值；优先使用真实 checkbox Figma 组件逐项组合，不要自己画勾选框。",
        "examples": [
          "横向复选框组: { \"componentId\": \"checkbox-group\", \"params\": { \"optionsText\": \"选项一,选项二\", \"checkedValues\": \"选项一\" } }"
        ]
      },
      "params": {
        "optionsText": {
          "type": "string",
          "default": "选项一,选项二",
          "description": "选项文案，支持逗号或换行分隔"
        },
        "checkedValues": {
          "type": "string",
          "default": "选项一",
          "description": "默认勾选项，支持逗号分隔多个值"
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
        "renderKey": "checkbox-group"
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
        "checkbox-checkmark": {
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
        "checkbox-label": {
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
      "description": "自定义表单容器，支持横向、纵向布局，也支持对齐方式和标签长度预设，适合复刻和扩展 lib-data-input-form",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "自定义表单容器，支持横向、纵向布局，也支持对齐方式和标签长度预设，适合复刻和扩展 lib-data-input-form",
        "usage": "当用户要创建筛选区、查询表单或编辑表单时使用。优先配合 form-row、form-field、checkbox-group、radio-group 组织结构；如果只是一次性生成，可直接使用 draw_form。",
        "examples": [
          "横向表单: { \"componentId\": \"form\", \"params\": { \"layout\": \"horizontal\", \"width\": 720, \"labelWidth\": 96 } }",
          "横向筛选表单: { \"componentId\": \"form\", \"params\": { \"layout\": \"horizontal\", \"columnSpacing\": 12 } }",
          "复刻 lib-data-input-form 的纵向样式: { \"componentId\": \"form\", \"params\": { \"align\": \"top\", \"labelWidthPreset\": \"fill\", \"width\": 266, \"rowSpacing\": 24, \"controlWidth\": 266 } }"
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
          "default": 720,
          "description": "表单宽度 (0为自适应)"
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
          "default": "fixed",
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
      "figmaPropertySnapshot": {
        "token": "lib-data-input-form",
        "componentKey": "25f071ee2f2569f0fd3744d41ed085020d386b26",
        "inspectedAt": "2026-03-06T00:00:00.000Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "Align 对齐",
            "displayName": "Align 对齐",
            "type": "VARIANT",
            "defaultValue": "Top 顶部对齐",
            "options": [
              "Left 左对齐",
              "Top 顶部对齐",
              "Right 右对齐"
            ]
          },
          {
            "propertyName": "Label 标签长度",
            "displayName": "Label 标签长度",
            "type": "VARIANT",
            "defaultValue": "Fill 跟随输入域",
            "options": [
              "Default 80",
              "Large 160",
              "Medium 120",
              "Fill 跟随输入域"
            ]
          }
        ]
      }
    },
    "form-row": {
      "id": "form-row",
      "name": "表单行",
      "category": "Form",
      "description": "表单内部的一行容器，用于放置多个表单字段或操作按钮",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "表单内部的一行容器，用于放置多个表单字段或操作按钮",
        "usage": "用于组织一行表单内容。通常作为 form 的子节点，内部可放 form-field、button 或辅助文本。",
        "examples": [
          "一行两个字段: { \"componentId\": \"form-row\", \"params\": { \"spacing\": 16 }, \"children\": [ { \"componentId\": \"form-field\" }, { \"componentId\": \"form-field\" } ] }"
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
            "layout",
            "figma-component"
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
        "renderKey": "form-row"
      }
    },
    "form-field": {
      "id": "form-field",
      "name": "表单字段",
      "category": "Form",
      "description": "带标签的表单字段单元，优先按 lib-data-input-vertical-form / lib-data-input-form 高保真复刻字段壳子，再最小替换内部控件；支持 input/select/checkbox-group/radio-group/button 或设计系统控件实例",
      "isRebuilt": true,
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "带标签的表单字段单元，优先按 lib-data-input-vertical-form / lib-data-input-form 高保真复刻字段壳子，再最小替换内部控件；支持 input/select/checkbox-group/radio-group/button 或设计系统控件实例",
        "usage": "用于承载单个表单字段。默认优先复用 Form 表单体系中的原始字段模板；纵向字段优先走 lib-data-input-vertical-form，横向字段会从 lib-data-input-form 样板中抽取 Horizontal Form 壳子，再最小替换控件与文案。",
        "examples": [
          "输入字段: { \"componentId\": \"form-field\", \"params\": { \"label\": \"姓名\", \"controlType\": \"input\", \"placeholder\": \"请输入姓名\" } }",
          "错误态输入字段: { \"componentId\": \"form-field\", \"params\": { \"label\": \"邮箱\", \"controlType\": \"input\", \"placeholder\": \"请输入邮箱\", \"error\": true, \"state\": \"Active 激活\", \"showSuffix\": true } }",
          "选择字段: { \"componentId\": \"form-field\", \"params\": { \"label\": \"状态\", \"controlType\": \"select\", \"value\": \"全部状态\" } }",
          "复选字段: { \"componentId\": \"form-field\", \"params\": { \"label\": \"偏好\", \"layout\": \"vertical\", \"controlType\": \"checkbox-group\", \"optionsText\": \"选项一,选项二\", \"checkedValues\": \"选项一\" } }",
          "设计系统日期选择器: { \"componentId\": \"form-field\", \"params\": { \"label\": \"日期\", \"controlType\": \"figma-component\", \"componentToken\": \"library.data-input.datepicker\" } }"
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
          "default": "请输入",
          "description": "输入框占位文案"
        },
        "value": {
          "type": "string",
          "default": "示例文字",
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
            "input",
            "select",
            "checkbox-group",
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
      "figmaPropertySnapshot": {
        "token": "lib-data-input-vertical-form",
        "componentKey": "0be124134930bd594da9da61af7046c4e442878d",
        "inspectedAt": "2026-03-10T03:54:10.120Z",
        "source": "discover_component_props",
        "properties": [
          {
            "propertyName": "Description 描述",
            "displayName": "Description 描述",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Error 报错",
            "displayName": "Error 报错",
            "type": "VARIANT",
            "defaultValue": "False",
            "options": [
              "False",
              "True"
            ]
          },
          {
            "propertyName": "Type 类型",
            "displayName": "Type 类型",
            "type": "VARIANT",
            "defaultValue": "Input 输入框",
            "options": [
              "Input 输入框",
              "Select 选择框",
              "Checkbox 多选",
              "DatePicker 日期选择",
              "Inputnumber 数字输入",
              "Radio 单选",
              "Slider 滑动",
              "Switch 开关",
              "Textarea 多行文本",
              "TimePicker 时间选择",
              "Upload 上传"
            ]
          }
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
      }
    },
    "card": {
      "id": "card",
      "name": "卡片容器",
      "category": "Layout",
      "description": "通用的卡片容器",
      "schemaVersion": "2.0.0",
      "prompts": {
        "description": "通用的卡片容器",
        "usage": "用于包裹内容的卡片容器，带有默认的白色背景、圆角和阴影效果。通常作为其他组件的父容器。",
        "examples": [
          "基础卡片: { \"componentId\": \"card\", \"params\": { \"padding\": 20 } }"
        ]
      },
      "params": {
        "padding": {
          "type": "number",
          "default": 20,
          "description": "内边距"
        },
        "width": {
          "type": "number",
          "default": 300,
          "description": "宽度"
        },
        "title": {
          "type": "string",
          "default": "",
          "description": "卡片标题"
        }
      },
      "slots": {
        "default": {
          "displayName": "Default",
          "allowedComponents": [
            "layout",
            "text",
            "tag",
            "button",
            "input",
            "select",
            "figma-component"
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
        "renderKey": "card"
      },
      "colorVariableBindings": {
        "card-bg": {
          "enabled": true,
          "token": "card.bg",
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
        "card-title": {
          "enabled": true,
          "token": "card.title",
          "variableRef": "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560",
          "keyCandidates": [
            "178115a8c3bc7983da5bc10e637208895750dbfd"
          ],
          "idCandidates": [
            "VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"
          ]
        },
        "table-border-key": {
          "enabled": true,
          "token": "table.border",
          "nameCandidates": [
            "border-2",
            "color-border-2",
            "@border-2",
            "@color-border-2",
            "Card/Border",
            "卡片/边框"
          ]
        }
      },
      "typographyBindings": {
        "card-title-text-style-key": {
          "enabled": true,
          "token": "card.title",
          "textStyleRef": "S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3",
          "keyCandidates": [
            "06c98e2c68a38e391190684c4b73e26efcd5d930"
          ],
          "idCandidates": [
            "S:06c98e2c68a38e391190684c4b73e26efcd5d930,131052:3"
          ],
          "nameCandidates": [
            "Title",
            "标题",
            "Text/Title"
          ]
        }
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
