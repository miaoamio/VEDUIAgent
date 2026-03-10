# 组件属性快照登记流程（批量维护）

## 1. 目标
把 Figma `discover_component_props` 结果稳定回填到组件 spec 的 `figmaPropertySnapshot`，并让后续生成阶段可通过 `read_specs` 直接读取。

## 2. 当前已补齐能力
1. spec 字段已支持：`figmaPropertySnapshot`（`src/types.ts` + `src/registry.v2.types.ts`）。
2. v1 -> v2 归一化已支持：`figmaPropertySnapshot` 会被带入 `loadRegistryV2()`。
3. `read_specs` 已输出快照信息：`FigmaPropertySnapshotMeta/Properties`。
4. Patch 映射补齐：`src/spec.component-token-map.ts` 可配置 `token -> componentId[]`。
5. 回填脚本：`npm run spec:snapshot:apply -- <Spec Patch JSON 路径>`。
6. 进度巡检脚本：`npm run spec:snapshot:status`。

## 3. 标准登记步骤（每个组件）
1. 在插件 `组件库` 页执行 `定向反查`（输入目标 token）。
2. 复制 `Spec Patch JSON`。
3. 检查 `patches[].componentId`：
- 若有：可直接用于回填。
- 若无：先在 `src/spec.component-token-map.ts` 增加 token 映射，再重新反查。
4. 优先用脚本回填 `src/registry.ts`：
- 下载 JSON 后执行：`npm run spec:snapshot:apply -- /absolute/path/to/FIGMA_COMPONENT_SPEC_PATCH_xxx.json`
- 若已复制到剪贴板（macOS）：`pbpaste | npm run spec:snapshot:apply -- --stdin`
5. 若脚本提示某条 patch 缺少 `componentId`，先补 `src/spec.component-token-map.ts` 后重试。
6. 运行 `npm run build`。
7. 在聊天中触发 `read_specs(["组件ID"])`，确认返回包含 `FigmaPropertySnapshotMeta/Properties`。

## 4. token 映射维护规则
1. 一条 token 可映射多个组件：`'token': ['component-a', 'component-b']`。
2. 同时登记 base token 与 semantic token（例如 `lib-basic-button` + `library.basic.button`）。
3. 没有稳定 1:1 对应时，不强行映射；先留空并记录为待确认。

## 5. 验收标准
1. `figmaPropertySnapshot.componentKey` 与反查结果一致。
2. `properties` 字段数量与反查结果一致。
3. `read_specs` 可读到快照内容。
4. `npm run spec:snapshot:status` 中该组件 `hasSnapshot=yes`。
