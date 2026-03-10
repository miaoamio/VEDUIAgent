# 给开发 AI 读的文档（Skill / 工程规范）

> **读者：** Cursor、Trae、Aime 等编程助手
> **用途：** 辅助开发者写插件代码时使用，约束开发 AI 的行为和实现方式

---

## 🚨 必读规范（开始任何改动前先读）

根目录下的两个文件是最高优先级：

1. [`AGENTS.md`](../../AGENTS.md) — 开发 AI 行为约束、必读文档清单、高保真复刻规则
2. [`.trae/rules/project.md`](../../.trae/rules/project.md) — Trae IDE 项目规则

---

## 📦 工程实现规范

按需查阅，遇到具体实现问题时参考：

| 文档 | 内容 |
|------|------|
| [Spec Coding 全文指南](coding-specs/SPEC_CODING_GUIDE_CN.md) | 代码规范、实现约定 |
| [注册表规范 v2](coding-specs/SPEC_REGISTRY_V2_CN.md) | 组件 Registry 数据结构和扩展方式 |
| [渲染引擎规范](coding-specs/SPEC_RENDER_ENGINE_CN.md) | Figma 节点渲染、patch 执行器细节 |
| [组件快照登记流程](coding-specs/COMPONENT_SNAPSHOT_REGISTRATION_WORKFLOW_CN.md) | 如何批量维护组件属性快照（含 npm 命令） |
| [组件快照登记用例](coding-specs/COMPONENT_SNAPSHOT_REGISTRATION_CASES_CN.md) | 逐组件的登记测试用例 |
| [测试策略规范](coding-specs/SPEC_TEST_STRATEGY_CN.md) | 单元/集成/回归测试分层策略 |
| [测试用例清单](coding-specs/intermediate/TEST_CASE.md) | 手工测试用例（中间文档） |

---

## 🛠️ Skill 技能包

插件附带的 AI 技能包（独立技能，供 AI 工具直接加载）：

- [`skills/figma-plugin-attachments/SKILL.md`](../../skills/figma-plugin-attachments/SKILL.md)
  - [attachment-flow.md](../../skills/figma-plugin-attachments/references/attachment-flow.md)
  - [table-parsing.md](../../skills/figma-plugin-attachments/references/table-parsing.md)

---

## 🔗 相关文档入口

- [文档总入口](../README_CN.md)
- [给人读的文档](../for-humans/README_CN.md)
- [给运行时 AI 读的文档](../for-runtime-ai/README_CN.md)
