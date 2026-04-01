# Debug Session

- Status: OPEN
- Symptom: 表格、表单、图表请求长时间停留在“思考中 / 读取规范中”，不开始绘制
- Scope: Chat 生成链路（疑似影响 draw_table / draw_form / draw_chart 及 create_node）
- Recent Changes:
  - 状态 Tag fallback / Typography 绑定
  - 表格状态语义映射
  - 状态 Tag 变体匹配与 fallback

## Hypotheses

1. 主进程在启动或处理消息时抛出运行时异常，导致绘制消息未被消费。
2. UI 侧等待的 LLM / agent 响应未完成，卡在生成协议阶段，与渲染逻辑无关。
3. 最近对 `code.ts` 的修改引入了通用函数级异常，影响所有组件绘制路径而不只 Tag。
4. 某个 registry / typography 绑定改动让运行期索引构建异常，阻塞后续创建流程。
5. 插件未崩溃，但 draw_* 消息发送后没有进入实际 create/render 分支。
