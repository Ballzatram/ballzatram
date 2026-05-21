"use client";
import { useEffect, useMemo, useState } from "react";

type Workspace = { id: string; title: string; prompt: string; assumptions: Record<string, unknown>; cards: any[]; analystTeam: any[]; recommendations: any[]; warnings: any[] };
const STORAGE_KEY = "macroboard.workspaces.v1";

export default function MacroBoardPage() {
  const [prompt, setPrompt] = useState("Find opportunities in markets right now");
  const [intake, setIntake] = useState<any>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY); if (saved) { const parsed = JSON.parse(saved) as Workspace[]; setWorkspaces(parsed); setActiveId(parsed[0]?.id ?? null);} }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces)); }, [workspaces]);
  const active = useMemo(() => workspaces.find((w) => w.id === activeId) ?? null, [workspaces, activeId]);

  const runIntake = async () => { const r = await fetch("/api/macro-board/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) }); setIntake(await r.json()); };
  const runResearch = async () => {
    const assumptions = { tickers: ["SPY"], macroSeries: ["DGS10", "CPI", "CREDIT"], objective: intake?.inferred?.objective ?? "identify opportunity" };
    const r = await fetch("/api/macro-board/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, assumptions }) });
    const data = await r.json();
    const ws: Workspace = { id: crypto.randomUUID(), title: prompt.slice(0, 48), prompt, assumptions, cards: data.cards ?? [], analystTeam: data.analystTeam ?? [], recommendations: data.recommendations ?? [], warnings: data.warnings ?? [] };
    setWorkspaces((prev) => [ws, ...prev]); setActiveId(ws.id);
  };

  return <section className="space-y-4"><div className="rounded-2xl border border-emerald-400/30 bg-slate-950 p-4"><p className="text-xs uppercase tracking-[0.22em] text-emerald-300">Institutional Research Command Center</p><h1 className="mt-2 text-3xl font-semibold text-white">AI-guided Macro Board</h1><p className="mt-2 text-sm text-slate-300">Research outputs are for educational and analytical purposes only and are not financial advice.</p></div><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><label className="text-sm text-slate-300">Research command bar</label><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="mt-2 min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm" /><div className="mt-3 flex gap-2"><button onClick={runIntake} className="rounded bg-slate-800 px-3 py-2 text-sm">AI intake</button><button onClick={runResearch} className="rounded bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950">Create research workspace</button></div>{intake && <div className="mt-3 rounded border border-slate-700 p-3 text-sm text-slate-200">{intake.clarifyingQuestions?.length ? intake.clarifyingQuestions.join(" ") : "Question is specific enough. Proceeding with analysis."}</div>}</div><div className="flex gap-2 overflow-auto">{workspaces.map((w) => <button key={w.id} onClick={() => setActiveId(w.id)} className={`rounded-full border px-3 py-1 text-xs ${w.id === activeId ? "border-emerald-300 text-emerald-200" : "border-slate-700 text-slate-300"}`}>{w.title}</button>)}</div>{active && <div className="grid gap-4 lg:grid-cols-[220px_1fr_320px]"><aside className="rounded-2xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">Universes, watchlists, saved research, and scenarios rail (MVP scaffold).</aside><main className="space-y-3">{active.cards.map((card, i) => <article key={i} className="rounded-xl border border-slate-700 bg-slate-900 p-3"><h3 className="font-semibold text-white">{card.title ?? card.type}</h3><pre className="mt-2 overflow-auto text-xs text-slate-300">{JSON.stringify(card, null, 2)}</pre></article>)}</main><aside className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-3"><h3 className="text-sm font-semibold text-white">Analyst Team</h3>{active.analystTeam.map((a, i) => <div key={i} className="rounded border border-slate-700 p-2 text-xs"><p className="text-emerald-200">{a.role}</p><p className="text-slate-300">{a.summary}</p></div>)}</aside></div>}</section>;
}
