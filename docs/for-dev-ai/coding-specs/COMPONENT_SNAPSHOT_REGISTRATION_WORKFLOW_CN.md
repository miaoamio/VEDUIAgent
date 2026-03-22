# 组件属性快照登记流程（批量维护）

## 1. 目标
把 Figma `discover_component_props` 结果稳定回填到组件 spec 的 `figmaPropertySnapshot`，并让后续生成阶段可通过 `read_specs` 直接读取。

## 2. 当前已补齐能力
1. spec 字段已支持：`figmaPropertySnapshot`（`src/registry.types.ts`）。
2. Registry 已统一：`figmaPropertySnapshot` 直接写入 `src/registry.ts`。
3. `read_specs` 已输出快照信息：`FigmaPropertySnapshotMeta/Properties`。
4. Patch 映射补齐：`src/spec.component-token-map.ts` 可配置 `token -> componentId[]`。
5. 回填脚本：`npm run spec:snapshot:apply -- <Spec Patch JSON 路径>`。
6. 进度巡检脚本：`npm run spec:snapshot:status`。

## 3. 标准登记步骤（每个组件）

获取组件的 `figmaPropertySnapshot`（属性快照）只需要轻量的**属性探测**（获取接口和参数），不需要获取包含样式的冗长节点树结构。你有两种操作方式：

### 方式一：通过 AI 助手探测（推荐，最轻量）
1. 在聊天框中告诉 AI 助手：“请帮我探测一下 `[组件名]` 的属性，它的 token 是 `[目标 token]`”。
2. AI 会调用底层的 `discover_component_props`（属性探测）工具。
3. 探测完成后，AI 会拿到一份干净的、仅包含属性映射的数据结构，你可以直接让 AI 帮你把这个结构更新到 `src/registry.ts` 的 `figmaPropertySnapshot` 中。

### 方式二：通过插件 UI 获取“学习快照”
1. 打开插件的 `组件库` 标签页。
2. 在“Figma 属性反查自动化”面板中，输入目标 token，点击 `自动反查`。
   > **注**：虽然这个按钮底层也会获取结构，但我们不需要看它的全量 JSON。
3. 等待完成后，向下滚动到 **“已学习组件知识”** 面板。
4. 点击 **`复制学习快照给 AI`**（这也就是 Spec Patch JSON）。这个快照已经被系统自动“瘦身”，里面**只包含**我们需要的 `figmaPropertySnapshot`，没有冗余的样式信息。

### 拿到快照后的回填步骤
1. 检查快照中的 `componentId`：
   - 若有：可直接用于回填。
   - 若无：先在 `src/spec.component-token-map.ts` 增加 token 映射，再重新探测。
2. 优先用脚本回填 `src/registry.ts`：
   - 若快照 JSON 已复制到剪贴板（macOS），在终端执行：`pbpaste | npm run spec:snapshot:apply -- --stdin`
   - 或者把内容存成文件执行：`npm run spec:snapshot:apply -- /absolute/path/to/patch.json`
3. 若脚本提示某条 patch 缺少 `componentId`，先补 `src/spec.component-token-map.ts` 后重试。
4. 运行 `npm run build`。
5. 在聊天中触发 `read_specs(["组件ID"])`，确认返回包含 `FigmaPropertySnapshotMeta/Properties`。

## 4. token 映射维护规则
1. 一条 token 可映射多个组件：`'token': ['component-a', 'component-b']`。
2. 同时登记 base token 与 semantic token（例如 `lib-basic-button` + `library.basic.button`）。
3. 没有稳定 1:1 对应时，不强行映射；先留空并记录为待确认。

## 5. 验收标准
1. `figmaPropertySnapshot.componentKey` 与反查结果一致。
2. `properties` 字段数量与反查结果一致。
3. `read_specs` 可读到快照内容。
4. `npm run spec:snapshot:status` 中该组件 `hasSnapshot=yes`。
