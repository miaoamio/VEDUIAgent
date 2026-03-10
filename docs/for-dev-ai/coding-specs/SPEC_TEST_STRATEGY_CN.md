# 测试策略规范（Spec Coding）

## 1. 目标
建立覆盖协议层、执行层、兼容层的测试体系，确保“可扩展 + 可回归 + 可发布”。

## 2. 测试分层

### 2.1 L0 单元测试（必跑）
覆盖范围：

1. `parse/normalize/validate`
2. Registry 校验
3. Metadata 读写与兼容迁移
4. Patch 单操作执行器

### 2.2 L1 集成测试（必跑）
覆盖范围：

1. `applyEnvelope(create)` 端到端
2. `applyEnvelope(edit)` 多操作链路
3. strict/best_effort 模式差异

### 2.3 L2 回归场景（发布前必跑）
覆盖范围：

1. 页面级复杂嵌套生成
2. 多轮编辑（新增/删除/变体切换/布局修改）
3. 旧格式输入兼容
4. 大规模节点性能与中断恢复

## 3. 测试维度矩阵

核心维度：

1. 输入合法性：合法 / 非法 / 截断 / 历史格式
2. 结构复杂度：浅层 / 深层 / 跨 slot
3. 操作类型：create / add / move / remove / swap / bind
4. 模式：strict / best_effort
5. 状态：空白画布 / 已有结构 / 部分损坏 metadata

## 4. 协议层测试用例（最小集）

1. `create` 缺少 `scene` -> `INVALID_ENVELOPE`
2. `edit` 缺少 `patch.operations` -> `INVALID_ENVELOPE`
3. `version` 非 `1.0` -> `UNSUPPORTED_VERSION`
4. `nodeId` 重复 -> `NODE_ID_CONFLICT`
5. `slot` 非法 -> `INVALID_SLOT`
6. `move_node` 形成环 -> `CYCLE_DETECTED`

## 5. Registry 层测试用例（最小集）

1. 组件 `id` 冲突
2. `params.default` 类型不匹配
3. `slot.allowedComponents` 包含未知组件
4. `minItems > maxItems`
5. v1 -> v2 normalize 语义一致

## 6. Render Engine 层测试用例（最小集）

1. create 深层树渲染成功并写入 metadata
2. patch 连续 20 条操作执行一致
3. strict 模式遇 fatal 自动回滚
4. best_effort 模式跳过 recoverable 错误继续执行
5. cancel 中断后无半成品污染

## 7. Metadata 层测试用例（最小集）

1. 节点写入后可完整读取并反序列化
2. 旧键（`component-id/params`）可迁移到 `uia.*`
3. 损坏 JSON 返回 `METADATA_INVALID_JSON`
4. `path` 变化后对账修复生效

## 8. 端到端回归场景（建议）

### 场景 A：整页创建
输入：创建包含导航、统计卡、图表、表格页面。  
断言：

1. 节点总数符合预期范围
2. 每个语义节点有 `uia.nodeId`
3. 无 `UNKNOWN_COMPONENT` 错误

### 场景 B：多轮编辑
步骤：改标题 -> 新增卡片 -> 表格列切换标签单元格 -> 删除区块。  
断言：

1. 每一步操作结果可追踪
2. 最终结构与期望一致
3. metadata 不丢失

### 场景 C：兼容输入
输入：历史 JSON 格式（无 version、headers/rows 结构）。  
断言：

1. normalize 成功
2. 执行结果与新协议一致

## 9. 非功能测试

1. 性能：500+ 节点 create 完成时间与 UI 可响应性
2. 稳定性：连续执行 50 次 patch 不崩溃
3. 资源：缓存命中率与内存增长可控

## 10. 准入标准（Release Gate）

发布前必须满足：

1. L0 通过率 100%
2. L1 通过率 100%
3. L2 关键回归场景全部通过
4. 无 P0/P1 缺陷遗留

## 11. 缺陷分级

1. P0：数据损坏、节点丢失、崩溃
2. P1：核心功能错误（协议执行错误、不可编辑）
3. P2：可绕过问题（局部样式、局部布局异常）
4. P3：文案与体验问题

## 12. CI 建议

1. `unit`：协议/registry/metadata 快速校验
2. `integration`：applyCreate/applyPatch 集成
3. `e2e`：核心回归场景
4. 每次 PR 必跑 `unit + integration`
5. 合并到主分支前补跑 `e2e`

## 13. 测试产物规范

每次回归输出：

1. 版本与提交信息
2. 通过/失败用例统计
3. 失败用例错误码分布
4. 风险评估与发布建议

## 14. 验收标准（Test Strategy DoD）

1. 测试矩阵覆盖协议、执行器、metadata、兼容四大域。
2. 能稳定复现并定位至少 90% 的历史缺陷类型。
3. 新增组件时仅需新增用例数据，不需要改测试框架主逻辑。
