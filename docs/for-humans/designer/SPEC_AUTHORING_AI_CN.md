# AI Spec 编写规范（Spec-as-Code）

## 1. 目标
用“AI 直接编写 spec + 自动校验 + 生成测试”的方式扩展组件库，不依赖低代码编辑器。

## 2. 交付格式（强约束）
AI 产出必须是一个 `AiComponentSpecPackage` JSON 对象：

```json
{
  "registryVersion": "2.0",
  "component": {
    "id": "form-field",
    "name": "表单字段",
    "category": "Form",
    "description": "标准字段容器",
    "schemaVersion": "2.0.0",
    "params": {
      "label": {
        "type": "string",
        "default": "字段名",
        "description": "字段标签"
      }
    },
    "slots": {
      "control": {
        "allowedComponents": ["input", "select"],
        "required": true,
        "minItems": 1,
        "maxItems": 1
      }
    },
    "capabilities": {
      "allowChildren": true,
      "allowSetProps": true
    },
    "colorVariableBindings": {
      "field-border-key": {
        "enabled": true,
        "variableRef": "field-border-key",
        "nameCandidates": ["border-base", "Field/Border"]
      }
    },
    "figmaBinding": {
      "nodeType": "FRAME",
      "renderKey": "form-field",
      "preferredLayoutMode": "VERTICAL"
    }
  },
  "tests": [
    {
      "name": "smoke_create",
      "expected": "success",
      "envelope": {
        "version": "1.0",
        "intent": "create",
        "scene": {
          "root": {
            "nodeId": "form_field_root",
            "componentId": "form-field",
            "props": { "label": "字段名" }
          }
        }
      }
    }
  ]
}
```

## 3. 必须满足的规则
1. `registryVersion` 只能是 `"2.0"`。
2. `component.id`、`name`、`description` 必填。
3. `params.default` 必须与 `type` 匹配。
4. `type=select/enum` 时，必须提供 `enumValues`。
5. `slots.allowedComponents` 不能为空数组。
6. `tests` 必须包含至少 1 条 `success` 和 1 条 `fail`。
7. `tests[].envelope` 必须是可解析的 Scene Envelope（预期失败用错误样例）。
8. 若组件需要颜色变量，必须声明 `colorVariableBindings`，禁止把变量规则写死在渲染代码里。

## 4. 自动校验入口
代码入口：
[specAuthoring.ts](/Users/bytedance/Desktop/figmaUIagent/src/specAuthoring.ts)

核心函数：
1. `validateAiComponentSpecPackage(pkg)`
2. `buildRegistryFromSpecPackage(pkg)`
3. `generateSmokeTestsForComponent(component)`

## 5. 推荐流水线
1. AI 生成 `AiComponentSpecPackage` JSON。
2. 运行 `validateAiComponentSpecPackage`。
3. 若失败，把 `issues` 原样回喂 AI 修复。
4. 通过后写入 registry 仓库并进入渲染回归测试。

## 6. 给 AI 的提示模板（可直接用）
```text
你是组件规范生成器。请只输出一个 JSON 对象，结构必须是 AiComponentSpecPackage。
硬性要求：
1) registryVersion 固定为 "2.0"
2) component 必须符合 ComponentDefinition
3) tests 至少 3 条：smoke_create(success), smoke_edit(success), negative_case(fail)
4) 不允许输出解释文字、markdown、注释
```

## 7. Agent Workflow 基线（沿用早期成功经验）
1. 需求分析：先判断需要哪些组件类型。
2. 读取规范：调用 `read_specs(ids[])`，禁止在未读 spec 时猜参数。
3. 构建执行：
   - 优先一次性嵌套创建（`children`）。
   - 有父子依赖时再分步 `create_node`。
4. 自我修正：根据系统返回的 `nodeId` / 错误码继续下一步。

说明：这套流程仍然有效，且与 Scene Envelope 执行链兼容。复杂结构建议优先走 `apply_scene`，简单结构可继续 `create_node`。

## 8. 组件 Spec 最小写作单元（给 AI 的写作框架）
每个组件 spec 必须覆盖以下 3 层：

1. 组件身份（Identity）
   - `id`, `name`, `description`
2. 参数 Schema（Parameters）
   - `type`, `default`, `description`, `required`
3. AI 交互规则（Interaction Rules）
   - `prompts.description`（L1 Selection）
   - `prompts.usage` + `prompts.examples`（L2 Usage）
   - `slots` / `allowedComponents`（嵌套合法性）

这 3 层分别对应：
1. AI 选型（选哪个组件）
2. AI 出参（能改哪些属性）
3. 引擎执行（能否通过结构校验并稳定渲染）
