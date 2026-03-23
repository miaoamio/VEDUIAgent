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
    "文本或图标优先用 params 控制。"
  ],
  commonErrors: [
    "表头与表体高度不一致会导致错位。"
  ]
};

const tableColumnRenderNotes = {
  actionHint: "表格列容器，承载表头与单元格。",
  paramRules: [
    "只在 table 内使用。",
    "子节点应为 table-header-cell 与 table-cell 变体。"
  ],
  commonErrors: [
    "列宽未设置会导致布局抖动。"
  ]
};

export const tableComponents: ComponentRegistry["components"] = {
  "table-cell": {
    "id": "table-cell",
    "name": "表格单元格",
    "category": "Table",
    "description": "表格单元格, 文本内容",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于表格中的文本内容展示",
      "usage": "适用于表格中的文本字段，如姓名、标题等",
      "examples": [
        "单元格文本: { \"componentId\": \"table-cell\", \"params\": { \"text\": \"张三\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "单元格",
        "description": "单元格文本内容"
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-tag": {
    "id": "table-cell-tag",
    "name": "表格标签单元格",
    "category": "Table",
    "description": "表格单元格, 标签内容",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于显示标签",
      "usage": "适用于表格中的状态标签",
      "examples": [
        "状态标签: { \"componentId\": \"table-cell-tag\", \"params\": { \"text\": \"已完成\", \"tagType\": \"default\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "标签",
        "description": "标签文本"
      },
      "tagType": {
        "type": "string",
        "enum": ["default", "outline", "solid"],
        "default": "default",
        "description": "标签样式类型"
      }
    },
    "colorVariableBindings": [
      {
        "token": "tag.text.success",
        "keyCandidates": ["tag-text-success-key"],
        "idCandidates": ["VariableID:461f81c5b91b69cce7b91610ae14e5f10ee555cc/298:7"]
      },
      {
        "token": "tag.bg.success",
        "keyCandidates": ["tag-bg-success-key"],
        "idCandidates": ["VariableID:1429f95224ac7f6f899d8887413fc1d8437af71d/298:6"]
      }
    ],
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-avatar": {
    "id": "table-cell-avatar",
    "name": "表格头像单元格",
    "category": "Table",
    "description": "表格单元格, 头像+文本",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于显示头像和文本",
      "usage": "适用于表格中的用户信息列",
      "examples": [
        "用户信息: { \"componentId\": \"table-cell-avatar\", \"params\": { \"name\": \"李四\", \"avatar\": \"avatar.png\" } }"
      ]
    },
    "params": {
      "name": {
        "type": "string",
        "default": "用户名",
        "description": "用户名称"
      },
      "avatar": {
        "type": "string",
        "default": "",
        "description": "头像图片URL"
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-input": {
    "id": "table-cell-input",
    "name": "表格输入单元格",
    "category": "Table",
    "description": "表格单元格, 输入框",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于显示输入框",
      "usage": "适用于表格中的可编辑字段",
      "examples": [
        "可编辑字段: { \"componentId\": \"table-cell-input\", \"params\": { \"placeholder\": \"请输入\" } }"
      ]
    },
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请输入",
        "description": "占位符文本"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "输入值"
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-select": {
    "id": "table-cell-select",
    "name": "表格选择单元格",
    "category": "Table",
    "description": "表格单元格, 下拉选择",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于显示下拉选择器",
      "usage": "适用于表格中的选择字段",
      "examples": [
        "选择字段: { \"componentId\": \"table-cell-select\", \"params\": { \"value\": \"选项1\" } }"
      ]
    },
    "params": {
      "placeholder": {
        "type": "string",
        "default": "请选择",
        "description": "占位符文本"
      },
      "value": {
        "type": "string",
        "default": "",
        "description": "当前选中值"
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-action-text": {
    "id": "table-cell-action-text",
    "name": "表格操作文本单元格",
    "category": "Table",
    "description": "表格单元格, 操作文本按钮",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于显示操作文本按钮",
      "usage": "适用于表格中的操作列",
      "examples": [
        "操作按钮: { \"componentId\": \"table-cell-action-text\", \"params\": { \"text\": \"编辑\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "编辑",
        "description": "操作文本"
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-cell-action-icon": {
    "id": "table-cell-action-icon",
    "name": "表格操作图标单元格",
    "category": "Table",
    "description": "表格单元格, 操作图标按钮",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格单元格, 用于显示操作图标按钮",
      "usage": "适用于表格中的操作列",
      "examples": [
        "操作图标: { \"componentId\": \"table-cell-action-icon\", \"params\": { \"icon\": \"more\" } }"
      ]
    },
    "params": {
      "icon": {
        "type": "string",
        "default": "more",
        "description": "图标类型"
      }
    },
    "renderNotes": tableCellRenderNotes
  },
  "table-header-cell": {
    "id": "table-header-cell",
    "name": "表格表头单元格",
    "category": "Table",
    "description": "表格表头单元格",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格表头单元格, 用于表格列标题",
      "usage": "适用于表格表头",
      "examples": [
        "表头: { \"componentId\": \"table-header-cell\", \"params\": { \"text\": \"姓名\" } }"
      ]
    },
    "params": {
      "text": {
        "type": "string",
        "default": "表头",
        "description": "表头文本"
      },
      "sortable": {
        "type": "boolean",
        "default": false,
        "description": "是否可排序"
      }
    },
    "renderNotes": tableHeaderCellRenderNotes
  },
  "table-column": {
    "id": "table-column",
    "name": "表格列",
    "category": "Table",
    "description": "表格列容器",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "表格列容器，包含表头和单元格",
      "usage": "用于表格列的组合",
      "examples": [
        "表格列: { \"componentId\": \"table-column\", \"params\": { \"header\": \"姓名\", \"cells\": [\"张三\", \"李四\"] } }"
      ]
    },
    "params": {
      "header": {
        "type": "string",
        "default": "列标题",
        "description": "列标题"
      },
      "cells": {
        "type": "array",
        "default": [],
        "description": "列单元格数据"
      }
    },
    "renderNotes": tableColumnRenderNotes
  },
  "table": {
    "id": "table",
    "name": "表格",
    "category": "Table",
    "description": "表格容器",
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "用于展示表格数据",
      "usage": "包含表头和表体，支持自定义列和数据",
      "examples": [
        "简单表格: { \"componentId\": \"table\", \"params\": { \"columns\": [\"姓名\", \"年龄\"], \"data\": [[\"张三\", 25], [\"李四\", 30]] } }"
      ]
    },
    "params": {
      "size": {
        "type": "string",
        "enum": ["mini", "default", "medium", "large"],
        "default": "default",
        "description": "表格尺寸"
      },
      "columns": {
        "type": "array",
        "default": [],
        "description": "表格列标题"
      },
      "data": {
        "type": "array",
        "default": [],
        "description": "表格数据"
      }
    },
    "colorVariableBindings": [
      {
        "token": "table.border",
        "keyCandidates": ["table-border-key"],
        "idCandidates": ["VariableID:1cf6b7d649a4c0b7fd8d25cb11a0a73e0a6b59f5/174345:286"],
        "nameCandidates": ["border/分割线 @color-border-2", "@color-border-2"]
      },
      {
        "token": "table.header.bg",
        "keyCandidates": ["table-header-bg-key"],
        "idCandidates": ["VariableID:0ad927853701159721b6bb95d53b532de24282a7/174345:586"],
        "nameCandidates": ["background/深 灰底 @color-bg-4", "@color-bg-4"]
      },
      {
        "token": "table.header.text",
        "keyCandidates": ["table-header-text-key"],
        "idCandidates": ["VariableID:a7442f0ba4f4f027d86e03f335df11c38232c0ce/174345:562"]
      },
      {
        "token": "table.cell.text",
        "keyCandidates": ["table-cell-text-key"],
        "idCandidates": ["VariableID:178115a8c3bc7983da5bc10e637208895750dbfd/174345:560"]
      },
      {
        "token": "table.cell.bg",
        "keyCandidates": ["table-cell-bg-key"],
        "idCandidates": ["VariableID:3b36108b1612c5eeaf85b5f30ae6cb5bcf12e042/174382:780"]
      }
    ],
    "renderNotes": {
      "actionHint": "使用 draw_table 渲染表格，交由表格引擎处理列宽、滚动与固定列。",
      "paramRules": [
        "columns 数组是表头列表；data 是二维数组，每行对应一条数据。",
        "size 决定行高与字号，尽量使用默认值。",
        "不要在 table 的 children 中手动拼 table-cell。"
      ],
      "commonErrors": [
        "不要把 table 当作普通容器来拼装表头或表体。",
        "不要在没有 columns 的情况下传 data。"
      ]
    },
    "runtime": {
      "sizeMetrics": {
        "Mini 32": { "height": 32, "paddingX": 12, "paddingY": 6, "fontSize": 12, "cornerRadius": 6 },
        "Default 40": { "height": 40, "paddingX": 12, "paddingY": 6, "fontSize": 12, "cornerRadius": 6 },
        "Medium 48": { "height": 48, "paddingX": 12, "paddingY": 6, "fontSize": 12, "cornerRadius": 6 },
        "Large 56": { "height": 56, "paddingX": 12, "paddingY": 6, "fontSize": 12, "cornerRadius": 6 }
      }
    }
  }
};
