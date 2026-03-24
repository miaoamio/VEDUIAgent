# 已知问题（未修复）

## 1. 表格头像字母未居中

- **现象**：表格 `table-cell-avatar`（头像圆形）内的字母/首字，渲染后未在圆形内居中。
- **影响范围**：通过插件生成表格时，姓名列头像样式可能出现偏移。
- **当前状态**：未修复（已尝试对 `lib-data-display-avataricon` 做文字居中与 overlay 修正，但在部分组件结构下仍无法对齐）。
- **代码位置**：
  - 头像单元格渲染分支：[code.ts](file:///Users/bytedance/VEDUIAgent/src/code.ts#L8235-L8285)
  - 尝试的居中逻辑（overlay/定位）：[code.ts](file:///Users/bytedance/VEDUIAgent/src/code.ts#L6860-L7010)
- **临时建议**：在 Figma 中手动调整头像字母的位置，或替换为静态图形/组件后再微调。

