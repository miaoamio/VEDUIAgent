import type { ComponentRegistry } from "../../registry.types";

const textRenderNotes = {
  actionHint: "用于纯文本展示，优先用 text 组件而非手绘文本。",
  paramRules: [
    "text 为空时不生成节点。",
    "字号/行高/字重优先使用 params 控制。"
  ],
  commonErrors: [
    "不要把 text 当作容器使用。"
  ]
};

const tagRenderNotes = {
  actionHint: "用于状态/分类/营销标签展示，优先复用设计系统标签。",
  paramRules: [
    "tagType 决定具体标签族，必要时配合 componentToken。",
    "标签组文案使用 groupTexts 分隔。"
  ],
  commonErrors: [
    "不要手动拼标签样式，优先调用标签组件。"
  ]
};

const buttonRenderNotes = {
  actionHint: "用于交互按钮，优先复用 lib-basic-button 变体。",
  paramRules: [
    "variant/theme/size/state 优先使用默认值。",
    "iconOnly 与 showPrefixIcon/showSuffixIcon 需匹配。"
  ],
  commonErrors: [
    "不要用 text + frame 自绘按钮。"
  ]
};

export const basicComponents: ComponentRegistry["components"] = {
  "figma-component": {
    "id": "figma-component",
    "name": "Figma 组件实例",
    "category": "Basic",
    "description": "通过 componentToken 或 componentKey 导入并创建指定的 Figma 组件或变体",
    "isRebuilt": true,
    "schemaVersion": "2.0.0",
    "prompts": {
      "description": "通过 componentToken 或 componentKey 导入并创建指定的 Figma 组件或变体",
      "usage": "当你需要直接复用设计系统中的已发布 Figma 组件时使用。优先传入 componentToken（来自 theme/volcengine-design/component-tokens），也可直接传 componentKey。可选 fallbackName 和 variantCriteria（JSON 字符串或 key=value 形式）。",
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
        "description": "组件 token（推荐，来自 theme/volcengine-design/component-tokens）"
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
    "renderNotes": textRenderNotes,
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
      "usage": "用于展示轻量状态、分类、营销标记、一组短标签或状态标签。`tagType` 统一选择默认/营销/标签组/状态类型；当选择 MarketingTag/TagGroup 时会自动切换 `componentToken` 到 `lib-data-display-other-tag`，当选择 StatusTag 时切换到 `lib-data-display-status-tag`，再配合 colorScheme/groupTexts/statusTheme/statusType/statusState。默认标签仍使用 size/state/showIcon/showDot/showDropdown/closable/disabled 控制变体。仅在原始 Figma 组件不可用时回退本地渲染。",
      "examples": [
        "基础标签: { \"componentId\": \"tag\", \"params\": { \"text\": \"标签\" } }",
        "可关闭标签: { \"componentId\": \"tag\", \"params\": { \"text\": \"处理中\", \"closable\": true } }",
        "带圆点的描边标签: { \"componentId\": \"tag\", \"params\": { \"text\": \"草稿\", \"showDot\": true, \"tagType\": \"Outline 线型标签\" } }",
        "营销标签: { \"componentId\": \"tag\", \"params\": { \"tagType\": \"MarketingTag 营销标签\", \"colorScheme\": \"Yellow 黄\", \"text\": \"自定义\" } }",
        "标签组: { \"componentId\": \"tag\", \"params\": { \"tagType\": \"TagGroup 标签组\", \"groupTexts\": \"内,荐\" } }",
        "状态标签: { \"componentId\": \"tag\", \"params\": { \"tagType\": \"StatusTag 状态标签\", \"statusTheme\": \"Warning 告警\", \"statusType\": \"L2 二级标签\" } }"
      ]
    },
    "renderNotes": tagRenderNotes,
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
    "renderNotes": buttonRenderNotes,
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
  }
};
