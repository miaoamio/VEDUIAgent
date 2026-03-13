# Spec Coding 指南（理论版）

## 1. 文档定位
本文件只回答三个问题：
1. 为什么要用 Spec Coding。
2. Spec Coding 的核心工作方法是什么。
3. 文档与实现应该如何分责，避免重复和混乱。

不包含：协议字段明细、执行器算法、错误码表、测试细则。
这些内容统一在对应“规范真源”中维护。

## 2. 从历史表格工程继承的关键经验
1. 协议先行：LLM 产出协议对象，不直接“操作代码”。
2. 专用动作：高频复杂组件（如表格）必须有 compact action（`draw_tabl`），避免冗长树。
3. 可修复输出：运行时必须具备 normalize/validate/retry，不能假设模型永远输出完美 JSON。
4. 可恢复执行：节点需要保留稳定语义元数据，支持增量编辑与多轮会话。
5. 外部状态机：复杂页面生成不能靠模型记忆，必须靠计划队列追踪待办。

## 3. Spec Coding 的最小闭环
1. 定义契约：组件/场景/动作的输入输出与约束。
2. 机器可校验：每条规则都能在运行时或测试中验证。
3. 执行与回写：动作执行后产出状态（成功/失败/阻塞/重试）。
4. 持续演进：新增能力优先扩展注册表、执行器、任务类型，而非改主循环策略。

## 4. 设计原则（落地时必须满足）
1. 单一真源：同一规则只在一个规范文档定义。
2. 分层解耦：
协议层定义“能说什么”；
执行层定义“怎么做”；
计划层定义“先做什么”。
3. 兼容优先：旧格式可归一化，新格式有明确推荐。
4. 幂等优先：已完成任务默认跳过，强制重跑需显式声明。
5. 错误可行动：错误信息必须能指导下一步修复，而不是笼统失败。

## 5. 反模式（导致文档膨胀与实现漂移）
1. 在多个文档重复同一字段定义。
2. 在“总览文档”里写执行细节。
3. 在“案例文档”里写规范条款。
4. 把阶段性方案长期放在主入口。
5. 新增能力时绕过注册表，靠 prompt 硬编码。

## 6. 文档分工（当前项目）
1. AI 运行规则真源：
[AI_RUNTIME_SPEC_CODING_CN.md](../../for-runtime-ai/AI_RUNTIME_SPEC_CODING_CN.md)
2. 计划系统真源：
[SPEC_AGENT_PLANNER_CN.md](../../for-runtime-ai/specs/SPEC_AGENT_PLANNER_CN.md)
3. Scene 协议真源：
[SPEC_PROTOCOL_SCENE_CN.md](../../for-runtime-ai/specs/SPEC_PROTOCOL_SCENE_CN.md)
4. Registry 真源：
[SPEC_REGISTRY_CN.md](SPEC_REGISTRY_CN.md)
5. Render Engine 真源：
[SPEC_RENDER_ENGINE_CN.md](SPEC_RENDER_ENGINE_CN.md)
6. Metadata 真源：
[SPEC_METADATA_CN.md](../../for-runtime-ai/specs/SPEC_METADATA_CN.md)
7. 设计师 Spec 写作真源：
[SPEC_AUTHORING_AI_CN.md](docs/designer/SPEC_AUTHORING_AI_CN.md)
8. 文档关系与边界：
[DOCS_LOGIC_CN.md](docs/overview/DOCS_LOGIC_CN.md)

## 7. 新能力接入检查表
新增一个组件能力（如图表变体/新表单控件）时，按顺序检查：
1. Registry 是否声明了能力与约束。
2. AI 主规范是否需要新增运行规则。
3. Planner 是否需要新 task type 或 payload 约定。
4. Render/Metadata 是否支持该能力执行与恢复。
5. 测试是否覆盖创建、编辑、失败恢复三类路径。

## 8. Definition of Done（理论层）
以下条件满足，才算“Spec Coding 方案清晰”：
1. 入口文档能在 3 分钟内告诉新成员“先读什么”。
2. 同一规则只在一个真源出现。
3. 运行时主规范可单文件喂给模型。
4. 设计师路径不要求阅读工程实现文档。
5. 测试中间文档与规范文档分离。
