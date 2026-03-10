# Figma AI 助手 - 敏捷开发项目计划

本计划专为 4 人研发团队设计，采用 Scrum 敏捷开发模式，旨在高效推进 Figma AI Agent 插件的开发与迭代。

## 1. 团队角色分配 (Team Roles)

针对 4 人团队的技能互补配置建议：

| 角色 ID | 职能方向 | 主要职责 | 对应代码模块 |
| :--- | :--- | :--- | :--- |
| **Member A (TL)** | **架构师/全栈** | 核心架构设计、Agent 循环逻辑、注册表设计、Code Review | `src/registry.ts`, `src/App.tsx` (Logic) |
| **Member B** | **前端开发** | 插件 UI 开发、属性编辑器、聊天界面交互、状态管理 | `src/App.tsx` (UI), `src/styles.css` |
| **Member C** | **Figma 后端** | Figma Canvas 渲染引擎、Scenenode API 操作、性能优化 | `src/code.ts` |
| **Member D** | **AI & 测试** | Prompt 调优、组件 Specs 编写、测试用例设计、QA | `src/registry.ts` (Prompts), `TEST_CASE.md` |

---

## 2. 开发流程 (Agile Process)

采用 **双周迭代 (2-Week Sprints)** 模式。

- **每日站会 (Daily Standup)**: 15分钟，同步昨天进展、今天计划、遇到的阻碍。
- **需求梳理 (Backlog Grooming)**: 每周一次，Member A 和 Member D 整理下周需求。
- **迭代评审 (Sprint Review)**: 迭代结束时演示功能，确保 "Definition of Done" (DoD)。

**DoD 标准**:
1. 代码通过 Lint 检查且无构建错误。
2. 新组件已在 `registry.ts` 定义并在 `code.ts` 实现渲染。
3. AI 能正确理解并调用该组件（通过 Member D 的测试）。

---

## 3. 迭代路线图 (Roadmap)

### 🚀 Sprint 1: 核心稳固与基础建设 (Current Status)
**目标**: 确保 Agent "思考-调用-渲染" 闭环极其稳定，消除基础 Bug。

- **Member A**: 优化 `read_specs` 和 `create_node` 的通信协议，确保 ID 传递无误。完善 `registry.ts` 的类型定义。
- **Member B**: 优化聊天窗口的滚动体验，增加 JSON 树的折叠/展开功能，提升调试体验。
- **Member C**: 修复 `layout` 和 `table` 的边框、圆角渲染 Bug，确保基础容器渲染完美。
- **Member D**: 编写 10 个基础场景的测试 Prompt（如“画一个登录页”），并验证 AI 的拆解逻辑。

### 📦 Sprint 2: 组件库大扩容
**目标**: 将支持的组件数量从目前的 ~8 个扩展到 20+ 个，覆盖主流 B 端场景。

- **Member A**: 定义新组件的 Schema（如 `avatar`, `badge`, `checkbox`, `radio`, `switch`, `modal`, `alert`）。
- **Member B**: 升级属性编辑器，支持更复杂的类型（如 Icon 选择器、嵌套属性编辑）。
- **Member C**: 实现新组件在 Figma 中的渲染逻辑 (AutoLayout 嵌套)。
- **Member D**: 为每个新组件编写 `agentPrompt` 和 `examples`，确保 AI 知道何时使用它们。

### 🧠 Sprint 3: 智能增强与上下文理解
**目标**: 让 AI 更像一个设计师，而不仅仅是绘图员。

- **Member A**: 实现“修改模式” (Modification Mode)，让 Agent 能理解 "把刚才那个按钮变大一点"。
- **Member B**: 增加“选中分析”面板的深度，显示选中节点的层级结构树。
- **Member C**: 增加 `update_node` 接口，支持对已存在节点的增量更新，而不仅仅是重建。
- **Member D**: 调优 System Prompt，增加“设计规范”约束（如统一色板、间距规律）。

### 💅 Sprint 4: 样式系统与发布准备
**目标**: 支持 Figma Variables/Styles，提升设计产出的专业度。

- **Member A**: 设计 Style 映射机制，将 AI 的 `"blue"` 映射为 Figma 本地样式 `Primary/Blue-500`。
- **Member B**: 增加设置面板，允许用户配置 API Key 和模型参数。
- **Member C**: 性能优化，处理大规模节点生成的卡顿问题 (Async Batching)。
- **Member D**: 全面回归测试，编写用户手册，准备发布到 Figma Community。

---

## 4. 任务看板 (Backlog Example)

### 待办 (To Do)
- [ ] (A) 设计 `icon` 组件的注册表定义 (需支持 Iconify 或 SVG)。
- [ ] (C) 实现 `image` 组件的占位符渲染。
- [ ] (B) 给属性编辑器增加 "Undo/Redo" 按钮。
- [ ] (D) 测试 "创建一个复杂的 Dashboard" 场景，记录 AI 的失败步骤。

### 进行中 (In Progress)
- [ ] (A/C) 优化 `layout` 组件的 Padding 逻辑，支持分别设置上下左右。
- [ ] (B) 修复聊天记录过长导致的性能问题。

### 已完成 (Done)
- [x] 基础 Agent 循环架构。
- [x] Table 组件的渲染逻辑。
- [x] 属性编辑器的基础实现。

---

## 5. 协作规范

1.  **Git 分支管理**:
    - `main`: 生产环境稳定代码。
    - `develop`: 日常开发分支。
    - `feature/xxx`: 功能分支 (e.g., `feature/add-switch-component`)。
2.  **代码提交规范**:
    - `feat: 增加 switch 组件渲染逻辑`
    - `fix: 修复 table 边框不显示的问题`
    - `docs: 更新 registry 文档`
3.  **Code Review**:
    - 涉及到 `registry.ts` 修改的 PR 必须由 Member A Review。
    - 涉及到 `code.ts` 渲染逻辑的 PR 必须由 Member C Review。
