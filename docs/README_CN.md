# 文档总入口

> ⭐ **唯一指导思想：** [NORTH_STAR.md](NORTH_STAR.md) — 架构决策、设计原则、所有文档的元规则。遇到"应该怎么做"、"规范放哪里"、"哪个文档对"时，先看这里。

这里是 Figma UI Agent 插件的所有文档。根据你的身份选择入口：

---

## 👤 我是人类（设计师 / 开发者）
→ [docs/for-humans/README_CN.md](for-humans/README_CN.md)

项目说明、工作流程、测试指引、历史计划。

---

## 🤖 我是开发 AI（Cursor / Trae / Aime 等编程助手）
→ [docs/for-dev-ai/README_CN.md](for-dev-ai/README_CN.md)

工程实现规范、注册表、渲染引擎、测试策略、技能包。

> 注意：`AGENTS.md`（根目录）和 `.trae/rules/project.md` 也是给开发 AI 读的，且路径固定不可移动。

---

## 💬 我是插件运行时 AI（OpenAI / 大模型）
→ [docs/for-runtime-ai/README_CN.md](for-runtime-ai/README_CN.md)

System Prompt 主规范和子规范，直接喂给模型使用。
