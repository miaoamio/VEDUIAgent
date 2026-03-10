# Debug Session: plugin-env-load-002
- **Status**: [FIXED]
- **Issue**: 插件环境加载时报错（An error occurred while loading the plugin environment）

## Reproduction Steps (Repro Steps)
1. 在 Figma 中重新加载本地插件
2. 出现 “An error occurred while loading the plugin environment”

## Hypotheses & Verification (Hypotheses)
- [x] Hypothesis A: code.js 未正确执行或 showUI 前报错 | Evidence: dist/code.js 不存在，且无任何运行日志写入 .dbg
- [ ] Hypothesis B: UI 入口未运行或 App 挂载失败 | Evidence: Pending
- [x] Hypothesis C: ui.html/构建产物路径或内容异常 | Evidence: build:ui 清空 dist 导致 main 入口丢失
- [ ] Hypothesis D: 插件缓存/环境问题导致加载失败 | Evidence: Pending

## Verification Conclusion (Verification)
日志显示 showUI 与 UI 挂载均执行成功，且用户确认不再复现加载错误。根因是 build:ui 清空 dist 导致 dist/code.js 丢失，已通过保留 outDir 解决。
