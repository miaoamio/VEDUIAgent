# 改造计划：renderComponent 拆分（Form 族）

## 背景
renderComponent 集中承载多组件渲染逻辑，体量过大，影响可维护性与扩展性。按 NORTH_STAR 的三层架构原则，将 form 族渲染逻辑拆分到 engine 层，code.ts 仅保留最小入口与 Figma API 边界。

## 目标
1. 将 form / form-row / form-field 相关渲染逻辑迁移到独立 renderer 文件
2. renderComponent 仅做路由与共用流程（参数合并、元数据写入、快照）
3. 保持行为一致，避免渲染结果回退

## 非目标
- 不改变组件协议与参数结构
- 不调整 registry 与 theme 的现有定义
- 不引入新的渲染逻辑或视觉改动

## 文件落位
- 保留入口：src/code.ts
- 新增渲染器目录：src/engine/renderers/form/
  - form.ts
  - formRow.ts
  - formField.ts
  - utils.ts
- 新增 registry：src/engine/renderers/registry.ts
- 需要时新增模板适配：src/engine/figma/formFieldTemplate.ts

## 迁移步骤
1. 建立 renderer 注册表（componentId → renderer），renderComponent 改为查表调用
2. 迁移 form 分支（form 容器渲染与 children 递归）
3. 迁移 form-row 分支（行级布局与参数继承）
4. 迁移 form-field 分支（模板优先逻辑、控件节点渲染）
5. 抽共享逻辑到 utils（参数继承、actionArea 过滤、宽度策略）
6. 逐步验证：每迁移一块就做一次渲染回归验证

## 验收标准
- form / form-row / form-field 的渲染结构与旧实现一致
- 表单控件宽度模式行为一致
- Figma 组件模板优先逻辑保持不变
- renderComponent 可读性提升，form 族逻辑不再出现在 code.ts 中
