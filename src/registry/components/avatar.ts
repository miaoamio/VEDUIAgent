import type { ComponentRegistry } from "../../registry.types";

const avatarRenderNotes = {
  actionHint: "用于头像展示，优先复用 lib-data-display-avataricon 变体。",
  paramRules: [
    "Type 决定头像显示内容（英文/中文/图形/图片等）。",
    "Size 决定尺寸大小，默认为 Mini 16。",
    "Color 决定背景色。"
  ],
  commonErrors: [
    "不要手动绘制圆形背景，优先使用头像组件。"
  ]
};

export const avatarComponents: ComponentRegistry["components"] = {
  "avatar": {
    "id": "avatar",
    "name": "头像",
    "category": "Data",
    "description": "通用头像组件，基于 lib-data-display-avataricon 高保真复刻",
    "isRebuilt": true,
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "通用头像组件，基于 lib-data-display-avataricon 高保真复刻",
      "usage": "用于展示用户头像。支持多种类型（图片、英文、中文、图形、部门等）和尺寸。可以通过 variantCriteria 设置变体属性。",
      "examples": [
        "英文头像: { \"componentId\": \"avatar\", \"params\": { \"type\": \"English 英文\", \"text\": \"JD\" } }",
        "图片头像: { \"componentId\": \"avatar\", \"params\": { \"type\": \"Image 图片\" } }",
        "大尺寸头像: { \"componentId\": \"avatar\", \"params\": { \"size\": \"Large 40\" } }"
      ]
    },
    "renderNotes": avatarRenderNotes,
    "params": {
      "text": {
        "type": "string",
        "default": "A",
        "description": "头像文案（英文/中文类型生效）"
      },
      "type": {
        "type": "select",
        "default": "English 英文",
        "description": "头像类型",
        "enumValues": [
          "Chinese 中文",
          "English 英文",
          "Graphics 图形",
          "Group 部门",
          "Image 图片"
        ]
      },
      "size": {
        "type": "select",
        "default": "Mini 16",
        "description": "头像尺寸",
        "enumValues": [
          "Mini 16",
          "Large 40",
          "Default 20",
          "Medium 24"
        ]
      },
      "color": {
        "type": "select",
        "default": "Red 红色",
        "description": "背景颜色",
        "enumValues": [
          "Beige 褐色",
          "Green 绿色",
          "Grey 灰色",
          "Primary 主色",
          "Purple 紫色",
          "Red 红色",
          "Teal 蓝绿"
        ]
      },
      "showBorder": {
        "type": "boolean",
        "default": false,
        "description": "是否显示描边"
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
      "renderKey": "avatar"
    },
    "figmaPropertySnapshot": {
      "token": "8365ec79313a17f0687ed671a0fde43bc64e8f14",
      "componentKey": "e8cae07d6783736ec763be0c5b474e21842902a3",
      "componentSetName": "AvatarIcon 头像图标",
      "inspectedAt": "2026-03-24T08:17:04.323Z",
      "source": "discover_component_props",
      "properties": [
        {
          "propertyName": "Border 描边",
          "type": "VARIANT",
          "defaultValue": "False",
          "options": [
            "True",
            "False"
          ]
        },
        {
          "propertyName": "Color 颜色",
          "type": "VARIANT",
          "defaultValue": "Red 红色",
          "options": [
            "Beige 褐色",
            "Green 绿色",
            "Grey 灰色",
            "Primary 主色",
            "Purple 紫色",
            "Red 红色",
            "Teal 蓝绿"
          ]
        },
        {
          "propertyName": "Size 尺寸",
          "type": "VARIANT",
          "defaultValue": "Mini 16",
          "options": [
            "Mini 16",
            "Large 40",
            "Default 20",
            "Medium 24"
          ]
        },
        {
          "propertyName": "Type 类型",
          "type": "VARIANT",
          "defaultValue": "English 英文",
          "options": [
            "Chinese 中文",
            "English 英文",
            "Graphics 图形",
            "Group 部门",
            "Image 图片"
          ]
        }
      ]
    }
  }
};
