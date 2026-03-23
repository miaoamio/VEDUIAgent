import type { ComponentRegistry } from "../../registry.types";

const iconRenderNotes = {
  actionHint: "用于表单必填或删除动作的辅助图标。",
  paramRules: [
    "宽高为 0 时保持原始尺寸。",
    "仅用于图标用途，不要当作按钮使用。"
  ],
  commonErrors: [
    "不要用通用图标替代必填星号。"
  ]
};

export const iconComponents: ComponentRegistry["components"] = {
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
    },
    "renderNotes": iconRenderNotes
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
    },
    "renderNotes": iconRenderNotes
  }
};
