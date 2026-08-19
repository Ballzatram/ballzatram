const DEFAULT_ORIGINS = [
  "https://ballzatram.com",
  "https://www.ballzatram.com",
];

const MAX_BODY_BYTES = 32_000;
const MAX_PROMPT_CHARS = 4_000;
const MAX_CONTEXT_CHARS = 24_000;

function corsHeaders(origin, allowedOrigins) {
  const allowed =
    allowedOrigins.includes(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

  return {
    "Access-Control-Allow-Origin": allowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
  });
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") return payload.output_text;

  const pieces = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") pieces.push(content.text);
    }
  }
  return pieces.join("\n").trim();
}

function equalText(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = (
      env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(",")
    )
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const cors = corsHeaders(origin, allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json(
        {
          ok: true,
          service: "ballzatram-ai-bridge",
          model: env.OPENAI_MODEL || "gpt-5-mini",
        },
        200,
        cors,
      );
    }

    if (url.pathname !== "/v1/assist" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, cors);
    }

    const auth = request.headers.get("Authorization") || "";
    const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (
      !env.BALLZATRAM_ACCESS_TOKEN ||
      !equalText(supplied, env.BALLZATRAM_ACCESS_TOKEN)
    ) {
      return json({ error: "Unauthorized" }, 401, cors);
    }

    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BODY_BYTES) {
      return json({ error: "Request too large" }, 413, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400, cors);
    }

    const tool = String(body?.tool || "general").slice(0, 80);
    const prompt = String(body?.prompt || "").trim();
    const context = body?.context ?? {};

    if (!prompt) return json({ error: "Prompt is required" }, 400, cors);
    if (prompt.length > MAX_PROMPT_CHARS) {
      return json({ error: "Prompt is too long" }, 400, cors);
    }

    let contextText;
    try {
      contextText = JSON.stringify(context);
    } catch {
      return json({ error: "Context must be JSON-serializable" }, 400, cors);
    }

    if (contextText.length > MAX_CONTEXT_CHARS) {
      return json({ error: "Context is too large" }, 413, cors);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "OPENAI_API_KEY is not configured" }, 503, cors);
    }

    const instructions =
      "You are Ballzatram AI, a tool-aware analytical guide for an experimental personal lab. " +
      "Ground every answer in supplied tool context. Distinguish computed facts from interpretation. " +
      "Never invent market data, sources, holdings, calculations, or completed actions. " +
      "Say what is missing when context is incomplete. Preserve warnings and model boundaries. " +
      "For finance tools, provide educational analysis rather than personalized investment instructions. " +
      "Be concise and technically useful.";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "gpt-5-mini",
        instructions,
        input: `Tool: ${tool}\n\nUser request:\n${prompt}\n\nStructured tool context:\n${contextText}`,
        max_output_tokens: 900,
        store: false,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json(
        {
          error:
            payload?.error?.message ||
            `OpenAI request failed (${response.status})`,
        },
        response.status >= 500 ? 502 : 400,
        cors,
      );
    }

    const answer = extractOutputText(payload);
    if (!answer) {
      return json({ error: "OpenAI returned no text output" }, 502, cors);
    }

    return json(
      {
        answer,
        model: payload?.model || env.OPENAI_MODEL || "gpt-5-mini",
        response_id: payload?.id || null,
      },
      200,
      cors,
    );
  },
};
