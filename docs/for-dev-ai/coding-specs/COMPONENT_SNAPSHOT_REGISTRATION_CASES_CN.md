# 组件属性快照登记人工测试用例（逐组件）

## 1. 通用前置
1. 打开插件 `组件库` 页签。
2. 能使用 `定向反查`、`复制 Spec Patch JSON`。
3. 本地可执行 `npm run spec:snapshot:apply`、`npm run build` 与 `npm run spec:snapshot:status`。

## 2. 通用验证动作（每个组件登记后都执行）
1. 定向反查 token，确认 `success=1` 且 `failed=0`。
2. 复制 `Spec Patch JSON`，确认 `patches[].componentId` 命中目标组件。
3. 执行 `npm run spec:snapshot:apply -- <Spec Patch JSON 路径>` 回填 `src/registry.ts`。
4. 执行 `npm run build`。
5. 在聊天中触发 `read_specs(["<componentId>"])`，确认返回包含：
- `FigmaPropertySnapshotMeta`
- `FigmaPropertySnapshotProperties`
6. 运行 `npm run spec:snapshot:status`，确认该组件 `hasSnapshot=yes`。

## 3. 逐组件用例矩阵

| 组件ID | token（建议/占位） | 预期映射状态 | 备注 |
| --- | --- | --- | --- |
| `page` | 待确认 | 初期可为 `no` | 本地布局组件，通常无直接 1:1 Figma 组件 |
| `layout` | 待确认 | 初期可为 `no` | 本地布局组件，通常无直接 1:1 Figma 组件 |
| `table-cell` | 待确认 | 初期可为 `no` | 本地表格子单元 |
| `table-cell-tag` | `lib-data-display-status-tag` | 应为 `yes` | 已在映射表 |
| `table-cell-avatar` | 待确认 | 初期可为 `no` | 本地复合单元 |
| `table-cell-input` | 待确认 | 初期可为 `no` | 本地复合单元 |
| `table-header-cell` | 待确认 | 初期可为 `no` | 本地表头单元 |
| `table-column` | 待确认 | 初期可为 `no` | 本地结构组件 |
| `table` | `lib-data-display-table` | 建议登记为 `yes` | 已在映射表 |
| `figma-component` | 不固定（按目标 token） | 视场景 | 该组件是通用实例入口 |
| `text` | 待确认 | 初期可为 `no` | 本地文本组件 |
| `button` | `lib-basic-button` | 应为 `yes` | 已登记快照 |
| `input` | `lib-data-input-input` | 建议登记为 `yes` | 已在映射表 |
| `select` | `lib-data-input-select` | 建议登记为 `yes` | 已在映射表 |
| `card` | `lib-data-display-card` | 建议登记为 `yes` | 已在映射表 |

## 4. 单组件执行模板（复制后替换）
1. 在 `定向反查` 输入：`<token>`。
2. 点击 `复制 Spec Patch JSON`，检查 `patches[].componentId` 包含：`<componentId>`。
3. 若未命中，在 `src/spec.component-token-map.ts` 添加 `<token> -> <componentId>` 后重试。
4. 执行 `npm run spec:snapshot:apply -- <Spec Patch JSON 路径>`。
5. 执行 `npm run build`。
6. 在聊天中触发 `read_specs(["<componentId>"])`，确认含快照字段。
7. 执行 `npm run spec:snapshot:status`，确认 `<componentId>` 行 `hasSnapshot=yes`。
