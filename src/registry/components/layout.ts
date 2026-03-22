import type { ComponentRegistry } from "../../registry.types";

export const layoutComponents: ComponentRegistry["components"] = {
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
    "runtime": {
      "spacing": {
        "topNavHeight": 48,
        "sideNavWidth": 200,
        "contentPadding": 32,
        "contentSpacing": 20,
        "topNavPadding": 20
      }
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
      "size": {
        "type": "select",
        "default": "default",
        "description": "尺寸",
        "enumValues": [
          "default"
        ]
      },
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
    "runtime": {
      "sizeMetrics": {
        "default": {
          "height": 40,
          "paddingX": 20,
          "paddingY": 20,
          "fontSize": 13,
          "cornerRadius": 8
        }
      }
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
  }
};
