export type ApiError = { detail: string };
const BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error((await res.json() as ApiError).detail || "API error");
  return res.json() as Promise<T>;
}

export const api = {
  demo: () => req<{ rows:number; columns:string[]; start:string; end:string }>("/data/demo"),
  stock: (body: unknown) => req<any>("/analyze/stock", { method:"POST", body: JSON.stringify(body)}),
  scenario: (body: unknown) => req<any>("/analyze/portfolio/scenario", { method:"POST", body: JSON.stringify(body)}),
  eventStudy: (body: unknown) => req<any>("/analyze/event-study", { method:"POST", body: JSON.stringify(body)}),
};
