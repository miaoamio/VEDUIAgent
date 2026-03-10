# 设计师用 AI 写组件 Spec：最短流程

## 1. 目标
你只要提供设计意图，AI 负责产出可校验的 Spec JSON；通过校验后就能进入组件库和生成链路。

## 2. 一次完整流程（5 步）
1. 描述组件目标：
`组件名称 + 使用场景 + 必填属性 + 可选样式 + 是否允许嵌套子组件`。
2. 让 AI 按固定格式输出：
只输出 `AiComponentSpecPackage` JSON，不要解释文本。
3. 运行校验：
用项目里的校验函数检查类型、默认值、slot 规则、测试样例。
4. 把校验错误回喂 AI：
让 AI 只修复错误项，不重写整个 spec。
5. 校验通过后入库：
加入 registry，然后跑 smoke 测试。

## 3. 你给 AI 的输入模板
```text
请为下面组件生成 AiComponentSpecPackage JSON（只输出 JSON，不要解释）：
- 组件名：
- 用途：
- 关键参数：
- 可选参数：
- 允许子组件：
- 不允许出现的参数：
- 需要的测试场景（成功/失败）：
```

## 4. 你验收时只看这 6 件事
1. `component.id/name/description` 是否清晰且唯一。
2. `params` 的类型和默认值是否符合设计稿。
3. `slots.allowedComponents` 是否限制了非法嵌套。
4. `prompts.examples` 是否能覆盖真实使用场景。
5. `tests` 是否同时有成功与失败样例。
6. 是否声明 `colorVariableBindings`（需要变量绑定时必须写明 enabled + variableRef/candidates）。
7. 校验是否通过（无 issues）。

## 5. 常见错误
1. 参数默认值类型不匹配（如 `number` 给了字符串）。
2. slot 允许范围过宽，导致 AI 乱嵌套。
3. examples 太少，导致模型生成参数漂移。
4. 没有失败样例，导致规则回归不稳定。

## 6. 进一步阅读
完整规范见：
[SPEC_AUTHORING_AI_CN.md](SPEC_AUTHORING_AI_CN.md)
