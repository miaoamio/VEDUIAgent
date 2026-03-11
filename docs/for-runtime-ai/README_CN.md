# 给插件运行时 AI 读的文档（System Prompt / 规范）

> **读者：** 插件调用的大模型（OpenAI / 豆包等）
> **用途：** 拼装为 system prompt，约束模型的输出行为和结构

---

## 🎯 主规范（唯一入口，默认只喂这一个）

- [AI 运行时主规范](AI_RUNTIME_SPEC_CODING_CN.md) — 模型的核心行为规则，与其他文档冲突时以此为准

---

## 📎 子规范（按需补充，遇到协议细节争议时参考）

| 文档 | 内容 |
|------|------|
| [Agent 计划系统规范](specs/SPEC_AGENT_PLANNER_CN.md) | 多步骤任务拆解与计划执行逻辑 |
| [场景协议规范（Scene Envelope）](specs/SPEC_PROTOCOL_SCENE_CN.md) | create/edit 操作的协议格式 |
| [元数据规范](specs/SPEC_METADATA_CN.md) | 节点元数据的读写与兼容规则 |

---

## 💡 使用建议

1. 默认只把 `AI_RUNTIME_SPEC_CODING_CN.md` 喂给模型
2. 只有遇到协议细节争议时，再按需补充子规范
3. 如需修改运行时规则，检查 `src/App.tsx` 中实际拼装给模型的 prompt：
   - `generateMasterPrompt()`：基础 system prompt（包含 draw_form/draw_tabl 等动作建议）
   - `read_specs` 的 `specsInfo/ActionHint`：会写入对话历史并影响后续轮行为，修改默认策略时要与基础 prompt 保持一致
   - 搜索关键词：`generateMasterPrompt`、`标准表单/筛选表单创建优先走 draw_form`、`ActionHint: New form creation`

---

## 🔗 相关文档入口

- [文档总入口](../README_CN.md)
- [给人读的文档](../for-humans/README_CN.md)
- [给开发 AI 读的文档](../for-dev-ai/README_CN.md)
