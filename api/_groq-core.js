/**
 * Server-side Groq proxy shared by the Vercel function (api/groq.js) and the Vite
 * dev/preview servers (vite.config.js). The browser never sees the API key.
 *
 * Files in /api starting with "_" are not exposed as Vercel endpoints.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODELS = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
const MAX_PROMPT_CHARS = 40_000;
const MAX_TOKENS = 8192;
const RATE_LIMIT = { windowMs: 60_000, max: 20 };

// Best-effort, per-instance rate limit (serverless instances don't share memory).
const hits = new Map();

function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT.max;
}

const fail = (status, message) => ({ status, json: { error: { message } } });

/**
 * @returns {Promise<{status: number, json: object}>}
 */
export async function proxyGroq({ method, body, apiKey, ip, origin, host, extraModels = [] }) {
  if (method !== "POST") return fail(405, "Method not allowed");
  if (!apiKey) return fail(500, "The server is missing GROQ_API_KEY. Add it to your environment variables.");

  // Only accept requests made by pages on this same site.
  if (origin) {
    try {
      if (new URL(origin).host !== host) return fail(403, "Cross-origin requests are not allowed");
    } catch {
      return fail(403, "Invalid origin");
    }
  }

  if (rateLimited(ip)) return fail(429, "Too many requests — please wait a minute and try again.");

  const allowedModels = new Set([...DEFAULT_MODELS, ...extraModels.filter(Boolean)]);
  const { model, messages, max_tokens, response_format } = body || {};
  if (!allowedModels.has(model)) return fail(400, `Model "${model}" is not allowed`);
  if (
    !Array.isArray(messages) ||
    messages.length === 0 ||
    messages.length > 4 ||
    !messages.every((m) => (m?.role === "system" || m?.role === "user") && typeof m.content === "string")
  ) {
    return fail(400, "Invalid messages");
  }
  if (messages.reduce((n, m) => n + m.content.length, 0) > MAX_PROMPT_CHARS) return fail(413, "Prompt is too long");
  if (response_format && response_format.type !== "json_object") return fail(400, "Unsupported response_format");

  const upstream = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: Math.min(Number(max_tokens) || 4096, MAX_TOKENS),
      ...(response_format ? { response_format } : {}),
    }),
  });
  const json = await upstream.json().catch(() => ({ error: { message: upstream.statusText || "Upstream error" } }));
  return { status: upstream.status, json };
}
