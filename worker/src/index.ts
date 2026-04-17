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
  
  // D1 Database Binding
  DB: D1Database;
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

    const url = new URL(request.url);

    // ── 埋点数据查询接口 GET /api/metrics ──
    if (url.pathname === "/api/metrics" && request.method === "GET") {
      try {
        if (!env.DB) {
          throw new Error("DB binding not found");
        }

        // 1. 获取总计数据
        const totalResult = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_events,
            COUNT(DISTINCT user_id) as total_uv,
            SUM(session_count) as total_sessions,
            SUM(gen_count) as total_generations,
            SUM(token_count) as total_tokens,
            SUM(prompt_tokens) as total_prompt_tokens,
            SUM(completion_tokens) as total_completion_tokens
          FROM user_metrics
        `).first();

        // 2. 获取按天统计的趋势 (最近30天)
        const dailyResult = await env.DB.prepare(`
          SELECT 
            date(datetime(created_at / 1000, 'unixepoch')) as date,
            COUNT(DISTINCT user_id) as daily_uv,
            SUM(session_count) as daily_sessions,
            SUM(gen_count) as daily_generations,
            SUM(token_count) as daily_tokens,
            SUM(prompt_tokens) as daily_prompt_tokens,
            SUM(completion_tokens) as daily_completion_tokens
          FROM user_metrics
          GROUP BY date
          ORDER BY date DESC
          LIMIT 30
        `).all();

        // 3. 获取最近的事件流
        const recentResult = await env.DB.prepare(`
          SELECT * FROM user_metrics 
          ORDER BY created_at DESC 
          LIMIT 50
        `).all();

        return new Response(JSON.stringify({
          totals: totalResult || { total_events: 0, total_sessions: 0, total_generations: 0, total_tokens: 0 },
          daily: dailyResult.results || [],
          recent: recentResult.results || []
        }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    }

    // ── 埋点记录接口 POST /api/track ──
    if (url.pathname === "/api/track" && request.method === "POST") {
      try {
        const body = await request.json() as {
          userId?: string;
          eventType?: string;      // 例如 "chat_start", "ai_generation", "token_usage"
          sessionCount?: number;   // 累加对话次数
          genCount?: number;       // 累加生成次数
          tokenCount?: number;     // 累加消耗 token
          promptTokens?: number;   // 输入 tokens
          completionTokens?: number; // 输出 tokens
          details?: string;        // 其他 JSON 信息
        };

        const userId = body.userId || "anonymous";
        const eventType = body.eventType || "unknown";
        const sessionCount = body.sessionCount || 0;
        const genCount = body.genCount || 0;
        const tokenCount = body.tokenCount || 0;
        const promptTokens = body.promptTokens || 0;
        const completionTokens = body.completionTokens || 0;
        const details = body.details || "{}";
        const timestamp = Date.now();

        if (env.DB) {
          // 插入数据到 D1
          await env.DB.prepare(
            `INSERT INTO user_metrics (user_id, event_type, session_count, gen_count, token_count, prompt_tokens, completion_tokens, details, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(userId, eventType, sessionCount, genCount, tokenCount, promptTokens, completionTokens, details, timestamp).run();
        } else {
          console.warn("DB binding not found, logging track event: ", body);
        }

        return new Response(JSON.stringify({ success: true, logged: true }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" }
        });
      }
    }

    // ── 只接受 POST /api/chat ──
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
    let body: { messages?: unknown; model?: string; stream?: boolean; thinking?: unknown };
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
      stream_options: body.stream !== false ? { include_usage: true } : undefined,
      ...(body.thinking ? { thinking: body.thinking } : {}),
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
