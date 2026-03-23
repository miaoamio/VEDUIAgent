# 文档总入口

> ⭐ **唯一指导思想：** [NORTH_STAR.md](NORTH_STAR.md) — 架构决策、设计原则、所有文档的元规则。遇到"应该怎么做"、"规范放哪里"、"哪个文档对"时，先看这里。

这里是 Figma UI Agent 插件的所有文档。根据你的身份选择入口：

---

## 🤖 我是开发 AI（Claude Code / Cursor / Trae 等编程助手）
→ [docs/for-dev-ai/README_CN.md](for-dev-ai/README_CN.md)

工程实现规范、注册表、渲染引擎、协议细节、测试策略、技能包。

> 注意：`AGENTS.md`（根目录）和 `.trae/rules/project.md` 也是给开发 AI 读的，且路径固定不可移动。

---

## 👤 我是人类（设计师 / 开发者）
→ [docs/for-humans/README_CN.md](for-humans/README_CN.md)

项目说明、工作流程、测试指引。

---

## 💬 关于运行时 AI

**插件运行时 AI 无法读取文件系统**，它的全部上下文来自 `App.tsx` 的 `generateMasterPrompt()` 动态拼装。

修改运行时 AI 行为 = 修改 `src/App.tsx generateMasterPrompt()` 或各组件的 `renderNotes`，不是修改这里的文档。
