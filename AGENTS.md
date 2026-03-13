# Repo Instructions

> 📚 **文档导航：** 本份文件是开发 AI 的行为规范入口。完整的工程规范文档在 [`docs/for-dev-ai/README_CN.md`](docs/for-dev-ai/README_CN.md)，运行时 AI 规范在 [`docs/for-runtime-ai/README_CN.md`](docs/for-runtime-ai/README_CN.md)。

## Working Style
- 请使用第一性原理思考。不要假设用户已经给出了最短路径或完整约束。
- 如果目标不清晰，先澄清目标；如果目标清晰但路径不是最短，直接指出并采用更短路径。
- 先理解现有实现，再改代码；不要靠猜测补设计系统细节。

## Must-Read Docs
- 涉及 AI 运行时决策、组件复刻、Figma 组件复用、渲染协议时，先读 `docs/for-runtime-ai/AI_RUNTIME_SPEC_CODING_CN.md`。
- `docs/for-runtime-ai/AI_RUNTIME_SPEC_CODING_CN.md` 是运行时主规范；如果与其他说明冲突，以它为准。
- 需要协议/执行细节时，再按需补读：
  - `docs/for-dev-ai/coding-specs/SPEC_RENDER_ENGINE_CN.md`
  - `docs/for-dev-ai/coding-specs/SPEC_REGISTRY_CN.md`
  - `docs/for-runtime-ai/specs/SPEC_PROTOCOL_SCENE_CN.md`
- 涉及图表组件登记与变体探测时，补读：
  - `docs/for-dev-ai/coding-specs/CHART_COMPONENT_REGISTRATION_WORKFLOW_CN.md`

## High-Fidelity Rebuild
- 用户要求"复刻设计系统组件"时，默认按高保真复刻处理，不优先自绘。
- 必须遵守这个顺序：
  1. `read_specs`
  2. `inspect_component_structure` 或 `discover_component_props`
  3. 创建原始 Figma 组件正确变体
  4. `detach`
  5. 只做最小编辑
- `minimal edit` 只允许改文案、宽高、少量实例开关、必要的子文本替换。
- 不要先手工重画背景、边框、effect、圆角、内边距。
- 只有原始组件无法导入时，才允许回退自绘。
- 如果只是拿到语义 token、没有拿到真实样式引用，不得宣称"1:1 复刻"；那只是近似实现。

## Prompt / Runtime Changes
- 如果任务是"让运行时 AI 稳定遵守某条规则"，不要只改文档链接；要检查 `src/App.tsx` 中实际拼装给模型的 prompt。
- `AGENTS.md` 约束的是开发助手；`src/App.tsx` 里的 system prompt 约束的是插件运行时 AI。两者不要混淆。

## 属性面板控件与样式索引
- 属性控件组件（统一输入/选择/颜色/胶囊）：[PropertyControls.tsx](file:///Users/bytedance/Desktop/figmaUIagent/src/ui/PropertyControls.tsx)
- Selection 面板渲染入口（使用上述控件）：[App.tsx](file:///Users/bytedance/Desktop/figmaUIagent/src/App.tsx#L5600-L6050)
- 控件样式与布局（输入框/选择框/胶囊/对齐按钮等）：[styles.css](file:///Users/bytedance/Desktop/figmaUIagent/src/styles.css#L632-L742)
