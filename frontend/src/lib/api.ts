export type ApiError = { detail: string };
export type AgentProcess = { id: string; title: string; outcome: string; starter_prompt: string; steps: string[] };
export type AgentMessage = { role: "user" | "assistant"; content: string; created_at: string };
export type AgentChatResponse = { conversation_id: string; page_id: string; process_id: string; answer: string; history: AgentMessage[]; paid_access: boolean };

const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function parseError(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await res.json()) as Partial<ApiError>;
    return body.detail ?? `API request failed with status ${res.status}`;
  }
  const body = await res.text();
  return body || `API request failed with status ${res.status}`;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export const api = {
  demo: () => req<{ rows: number; columns: string[]; start: string; end: string }>("/data/demo"),
  stock: (body: unknown) => req<unknown>("/analyze/stock", { method: "POST", body: JSON.stringify(body) }),
  scenario: (body: unknown) => req<unknown>("/analyze/portfolio/scenario", { method: "POST", body: JSON.stringify(body) }),
  eventStudy: (body: unknown) => req<unknown>("/analyze/event-study", { method: "POST", body: JSON.stringify(body) }),
  agentProcesses: () => req<{ processes: Record<string, AgentProcess[]> }>("/agent/processes"),
  agentChat: (body: unknown) => req<AgentChatResponse>("/agent/chat", { method: "POST", body: JSON.stringify(body) }),
  agentCheckout: (body: unknown) => req<{ checkout_url: string; session_id: string }>("/agent/billing/checkout", { method: "POST", body: JSON.stringify(body) }),
  agentVerify: (body: unknown) => req<{ paid_access: boolean; reason: string }>("/agent/billing/verify", { method: "POST", body: JSON.stringify(body) }),
};
