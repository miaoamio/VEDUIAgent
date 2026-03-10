# 文档逻辑与边界（去重版）

## 1. 这份文档解决什么问题
1. 明确每份文档的职责，避免“同一内容到处写”。
2. 明确不同读者的阅读路径。
3. 明确哪些文档是“规范真源”，哪些只是说明/示例/归档。

## 2. 文档分层
1. `L0 入口层`：告诉你先看什么。
2. `L1 规范层`：可执行、可校验、可实现的规则（真源）。
3. `L2 参考层`：背景、案例、阶段性材料（不作为规则真源）。

## 3. 读者路径
1. AI 运行时：
`docs/ai/AI_RUNTIME_SPEC_CODING_CN.md` -> 按需查 `SPEC_AGENT_PLANNER/SPEC_PROTOCOL_SCENE/SPEC_REGISTRY_V2`
2. 设计师（借助 AI 写 spec）：
`docs/designer/DESIGNER_SPEC_WORKFLOW_CN.md` -> `docs/designer/SPEC_AUTHORING_AI_CN.md`
3. 工程实现：
`docs/overview/IMPLEMENTATION_SUMMARY_CN.md` -> `docs/ai/README_CN.md`
4. 测试执行：
`docs/testing/MANUAL_TEST_FLOW_CN.md` -> `docs/testing/SPEC_TEST_STRATEGY_CN.md`

## 4. 规范真源（Source of Truth）
1. AI 运行规则真源：
[AI_RUNTIME_SPEC_CODING_CN.md](../../for-runtime-ai/AI_RUNTIME_SPEC_CODING_CN.md)
2. 计划系统真源：
[SPEC_AGENT_PLANNER_CN.md](../../for-runtime-ai/specs/SPEC_AGENT_PLANNER_CN.md)
3. 协议真源：
[SPEC_PROTOCOL_SCENE_CN.md](../../for-runtime-ai/specs/SPEC_PROTOCOL_SCENE_CN.md)
4. 注册表真源：
[SPEC_REGISTRY_V2_CN.md](../../for-dev-ai/coding-specs/SPEC_REGISTRY_V2_CN.md)
5. 渲染执行真源：
[SPEC_RENDER_ENGINE_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/ai/SPEC_RENDER_ENGINE_CN.md)
6. 元数据真源：
[SPEC_METADATA_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/ai/SPEC_METADATA_CN.md)
7. 设计师 Spec 交付真源：
[SPEC_AUTHORING_AI_CN.md](../designer/SPEC_AUTHORING_AI_CN.md)

## 5. 非真源文档（参考/归档）
1. 高层总览：
[IMPLEMENTATION_SUMMARY_CN.md](IMPLEMENTATION_SUMMARY_CN.md)
2. Spec Coding 理论与经验：
[SPEC_CODING_GUIDE_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/ai/SPEC_CODING_GUIDE_CN.md)
3. 测试中间案例：
[intermediate/TEST_CASE.md](/Users/bytedance/Desktop/figmaUIagent/docs/testing/intermediate/TEST_CASE.md)
4. 历史计划：
[PROJECT_PLAN_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/archive/PROJECT_PLAN_CN.md)

## 6. 去重维护规则（以后按这个改文档）
1. 同一规则只在一个“真源文档”落地，其他文档只链接不复制。
2. 入口文档不写详细规则，只写“去哪看”。
3. 案例文档不写规范措辞，只写“示例与观察”。
4. 历史材料统一进 `docs/archive/` 或 `docs/testing/intermediate/`。
