# 图表组件登记与使用流程（饼图示例）

## 1. 目标
将图表类 Figma 组件（如饼图）稳定登记到 Registry 生态中，确保：
- LLM 通过组件 token 正确定位到 `figma-component`
- `discover_component_props` 结果可回填为 `figmaPropertySnapshotCatalog`
- 运行时不再“未读 spec 就猜参数”

## 2. 适用范围
- 图表来自 Figma 组件库（`figma-component` 统一入口）
- 需要通过 `componentToken` + `variantCriteria` 控制变体
- 需要可追溯的属性快照与回填

## 3. 核心文件与职责
- Registry 数据源：`src/registry.ts`
- token → componentId 映射补丁：`src/spec.component-token-map.ts`
- 组件 token 清单：`src/theme.component-library-tokens.ts`
- 快照回填脚本：`npm run spec:snapshot:apply`

## 4. 图表组件登记流程（通用）
1. 确认 token 是否存在  
   在 `src/theme.component-library-tokens.ts` 查到目标 token 与 `componentKey`。

2. 确认 token 是否能映射到 componentId  
   若 `Spec Patch JSON` 的 `patches[].componentId` 为空，在 `src/spec.component-token-map.ts` 新增：  
   `'<token>': ['figma-component']`。

3. 反查组件属性  
   在插件组件库页执行定向反查（`discover_component_props`），得到属性列表与默认值。

4. 回填快照  
   `npm run spec:snapshot:apply -- <Spec Patch JSON 路径>`  
   目标是把对应 token 的快照写入 `src/registry.ts` 的 `figma-component.figmaPropertySnapshotCatalog`。

5. 验证  
   - `npm run build`  
   - 在聊天中执行 `read_specs(["figma-component"])`，确认返回包含快照字段  
   - `npm run spec:snapshot:status` 中该组件 `hasSnapshot=yes` 且 `snapshotCatalogCount` 增长

## 5. 运行时使用规范（避免“未读 spec”）
1. 必须先读 `figma-component` 规范  
   `read_specs(["figma-component"])` 获取 `ComponentTokenCatalog`。

2. 需要 `variantCriteria` 时，必须先探测  
   `discover_component_props` 指向该 token，只有拿到真实属性后才设置变体字段。

3. token 不可用时才回退 `componentKey`  
   否则一律用 `componentToken`。

## 6. 饼图登记示例
- token：`lib-data-display-component-piechart`
- componentId：`figma-component`
- componentKey：`ce1607d6b31f82f34fc33fe342bdcfd04eb33b9e`
- 变体属性：类型、分类数量、数值标注、色彩模式、悬浮、总数值、放大比率

登记要点：
1. 在 `src/spec.component-token-map.ts` 添加  
   `lib-data-display-component-piechart -> ['figma-component']`
2. 定向反查该 token，获取属性快照  
3. 回填快照并验证 `read_specs(["figma-component"])`

## 7. 常见问题
- 反查结果 success=0：检查 token 是否写错或未在组件库发布
- `patches[].componentId` 为空：先补 `spec.component-token-map.ts` 再重试
- 运行时提示“未读 spec”：确认已执行 `read_specs(["figma-component"])`
