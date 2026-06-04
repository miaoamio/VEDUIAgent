# Debug Session: merged-table-panel
- **Status**: [OPEN]
- **Issue**: AI 生成合并单元格表格的属性面板开关无效，禁用项 hover 无 tooltip，且无失败提示
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-merged-table-panel.ndjson

## Reproduction Steps
1. 生成一个 AI 合并单元格表格。
2. 选中该表格，观察图层最外层节点是否为 `Table Content`。
3. 在属性面板尝试切换 `分页器 / 筛选器 / 标签页 / 按钮组`。
4. hover `表格尺寸 / 表格行数 / 表格行操作`。

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | 选中根节点识别错误，UI 实际绑定到内层 `Table Content` 而不是完整表格 wrapper | High | Med | Pending |
| B | `selection-update` 到 UI 后被覆盖，导致 `isAiGeneratedMergedCell` 和提示状态丢失 | High | Low | Pending |
| C | `update-component` 发出后没有命中正确的 table/wrapper 更新分支 | High | Med | Pending |
| D | tooltip 实际没有挂到 hover 命中区域，禁用控件外层 hover 事件未触发 | Med | Low | Pending |
| E | Figma 当前加载的是旧构建，导致新增提示条、tooltip 和埋点都没有执行 | High | Low | Confirmed |

## Log Evidence
- `.dbg/merged-table-panel.env` 已生成，但 `.dbg/trae-debug-log-merged-table-panel.ndjson` 不存在，说明复现操作没有打到新埋点。
- `package.json` 显示插件入口为 `dist/code.js`，UI/主线程都依赖重新构建后加载。
- 已执行 `npm run build`，构建成功。

## Verification Conclusion
- 已修复两处高概率根因，待用户验证：
  1. `detectTableActualState()` 现在先归一化到真实表格 chrome root，避免把 AI 合并表格的外层 `Table Content` 误判成没有 toolbar/pagination。
  2. `figma.ui.onmessage` 增加统一异常回传，若开关更新过程中抛错，UI 会直接看到失败提示。
