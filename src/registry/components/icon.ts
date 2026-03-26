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
      "nodeType": "INSTANCE"
    },
    "figmaPropertySnapshot": {
      "token": "lib-basic-icon-required"
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
      "nodeType": "INSTANCE"
    },
    "figmaPropertySnapshot": {
      "token": "lib-basic-icon-delete"
    },
    "renderNotes": iconRenderNotes
  },
  "icon-info": {
    "id": "icon-info",
    "name": "说明图标",
    "category": "Icon",
    "description": "说明提示图标",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "说明提示图标",
      "usage": "用于表单字段的说明提示。",
      "examples": [
        "说明图标: { \"componentId\": \"icon-info\" }"
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
      "nodeType": "INSTANCE"
    },
    "figmaPropertySnapshot": {
      "token": "lib-basic-icon-info"
    },
    "renderNotes": iconRenderNotes
  }
};
