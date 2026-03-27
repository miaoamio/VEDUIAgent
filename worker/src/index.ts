/**
 * Figma UI Agent — Cloudflare Worker Proxy
 *
 * 职责：
 * 1. 隐藏 Ark API Key（存在 Cloudflare Secret 中，前端不可见）
 * 2. CORS 处理（Figma 插件 iframe 需要）
 * 3. 基于 IP 的速率限制
 * 4. 请求校验与日志
 * 5. SSE 流式透传
 */

export interface Env {
  // wrangler secret put ARK_API_KEY
  ARK_API_KEY: string;

  // wrangler.toml [vars]
  ARK_MODEL: string;
  ARK_BASE_URL: string;
  ALLOWED_ORIGINS: string;
  RATE_LIMIT_PER_MINUTE: string;
}

// ─── 简易内存速率限制（每个 Worker 实例独立，适合轻量场景） ────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(clientIp);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) {
    return false;
  }

  entry.count++;
  return true;
}

// ─── 定期清理过期条目，防止内存膨胀 ──────────────────────────────────────
let lastCleanup = 0;
function cleanupRateLimitMap() {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // 每分钟最多清理一次
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// ─── CORS Headers ────────────────────────────────────────────────────────
function corsHeaders(origin: string | null, allowedOrigins: string): HeadersInit {
  const allowed = allowedOrigins
    ? allowedOrigins.split(",").map((s) => s.trim())
    : [];

  // 空列表 = 允许所有来源（开发/内部使用场景）
  const effectiveOrigin =
    allowed.length === 0
      ? origin || "*"
      : allowed.includes(origin || "")
        ? origin!
        : allowed[0];

  return {
    "Access-Control-Allow-Origin": effectiveOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Request-Id",
    "Access-Control-Max-Age": "86400",
  };
}

// ─── 主处理函数 ──────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    cleanupRateLimitMap();

    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    // ── Preflight ──
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // ── 只接受 POST /api/chat ──
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Not Found. Use POST /api/chat" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ── 速率限制 ──
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const maxPerMinute = parseInt(env.RATE_LIMIT_PER_MINUTE, 10) || 30;
    if (!checkRateLimit(clientIp, maxPerMinute)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please retry later." }),
        {
          status: 429,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Retry-After": "10",
          },
        }
      );
    }

    // ── 解析请求体 ──
    let body: { messages?: unknown; model?: string; stream?: boolean };
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "Missing 'messages' array in request body" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // ── 构造 Ark API 请求 ──
    const arkPayload = {
      model: env.ARK_MODEL,
      messages: body.messages,
      stream: body.stream !== false, // 默认 stream
    };

    const arkResponse = await fetch(env.ARK_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ARK_API_KEY}`,
      },
      body: JSON.stringify(arkPayload),
    });

    // ── 错误透传 ──
    if (!arkResponse.ok) {
      const errorText = await arkResponse.text();
      console.error(`Ark API error: ${arkResponse.status} — ${errorText}`);
      return new Response(errorText, {
        status: arkResponse.status,
        headers: {
          ...cors,
          "Content-Type": arkResponse.headers.get("Content-Type") || "application/json",
        },
      });
    }

    // ── 流式透传 SSE ──
    if (arkPayload.stream && arkResponse.body) {
      return new Response(arkResponse.body, {
        status: 200,
        headers: {
          ...cors,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // ── 非流式：直接返回 JSON ──
    const result = await arkResponse.text();
    return new Response(result, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/json",
      },
    });
  },
};
