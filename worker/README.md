# Figma UI Agent — Cloudflare Worker 代理

安全代理层，隐藏 Ark API Key，提供速率限制和 CORS 支持。

## 文件结构

```
worker/
├── src/
│   └── index.ts          # Worker 主逻辑（~160 行）
├── wrangler.toml          # Cloudflare 配置
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd worker
npm install
```

### 2. 设置 API Key（Secret，不会出现在代码中）

```bash
npx wrangler secret put ARK_API_KEY
# 粘贴你的 Ark API Key，回车确认
```

### 3. 本地开发

```bash
npm run dev
# Worker 运行在 http://localhost:8787
```

本地开发时，需要在项目根目录创建 `.dev.vars` 文件存放 secret：

```bash
# worker/.dev.vars（已被 .gitignore 忽略）
ARK_API_KEY=你的-ark-api-key
```

### 4. 部署到 Cloudflare

```bash
# 首次需要登录
npx wrangler login

# 部署
npm run deploy
# 输出类似：https://figma-ui-agent-proxy.<your-subdomain>.workers.dev
```

### 5. 更新前端 Worker URL

部署成功后，将输出的 Worker URL 填入 `src/App.tsx`：

```typescript
const WORKER_URL = (globalThis as any).__FIGMA_AGENT_WORKER_URL__
  || 'https://figma-ui-agent-proxy.<your-subdomain>.workers.dev';
//     ↑ 替换为你的实际 Worker URL
```

## API 接口

### `POST /api/chat`

请求体与 OpenAI 兼容格式一致：

```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "帮我画一个表格" }
  ],
  "stream": true
}
```

- `model` 字段由 Worker 注入，前端可传但会被覆盖
- `Authorization` 头由 Worker 注入，前端**不需要也不应该**传

### 响应

- **流式**（默认）：SSE `text/event-stream`，格式与 OpenAI 一致
- **非流式**（`stream: false`）：标准 JSON

### 错误码

| 状态码 | 含义 |
|--------|------|
| 400 | 请求体缺少 `messages` 或 JSON 格式错误 |
| 404 | 路径不是 `/api/chat` 或方法不是 POST |
| 429 | 超出速率限制（默认 30 次/分钟/IP） |
| 5xx | Ark API 上游错误（透传） |

## 配置项

在 `wrangler.toml` 的 `[vars]` 中：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ARK_MODEL` | Ark 模型 endpoint | `ep-20260129104027-mzlwg` |
| `ARK_BASE_URL` | Ark API 地址 | `https://ark-cn-beijing.bytedance.net/api/v3/chat/completions` |
| `ALLOWED_ORIGINS` | 允许的 CORS 来源（逗号分隔），空=全部允许 | `""` |
| `RATE_LIMIT_PER_MINUTE` | 每 IP 每分钟最大请求数 | `30` |

Secret（通过 `wrangler secret put` 设置）：

| 变量 | 说明 |
|------|------|
| `ARK_API_KEY` | Ark API Key（**必须设置**） |
