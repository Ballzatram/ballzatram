"use client";
import { useEffect, useMemo, useState } from "react";

type ResearchCard = {
  id: string; type: string; title: string; subtitle?: string; thesis?: string; metrics?: Record<string, number | string>; chartData?: unknown; tableData?: unknown; interpretation?: string; confidence?: string; caveats?: string[]; methodology?: string; sources?: string[]; followUpActions?: string[];
};
type WorkspaceVersion = { version_id: string; created_at: string; assumptions: Record<string, unknown>; cards: ResearchCard[]; analyst_outputs: any[]; recommendations: any[]; warnings: any[] };
type Workspace = { workspace_id: string; title: string; original_prompt: string; assumptions: Record<string, unknown>; versions: WorkspaceVersion[]; updated_at: string };

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

function CardRenderer({ card }: { card: ResearchCard }) {
  return <article className="rounded-xl border border-slate-700 bg-slate-900 p-3"><h3 className="font-semibold text-white">{card.title}</h3><p className="text-xs text-slate-400">{card.type}</p>{card.thesis && <p className="mt-2 text-sm text-slate-200">{card.thesis}</p>}{card.metrics && <pre className="mt-2 text-xs text-emerald-200">{JSON.stringify(card.metrics, null, 2)}</pre>}{card.tableData && <details className="mt-2"><summary className="text-xs text-slate-300">Table data</summary><pre className="text-xs text-slate-300">{JSON.stringify(card.tableData, null, 2)}</pre></details>}{card.chartData && <details className="mt-2"><summary className="text-xs text-slate-300">Chart data</summary><pre className="text-xs text-slate-300">{JSON.stringify(card.chartData, null, 2)}</pre></details>}</article>;
}

export default function MacroBoardPage() {
  const [prompt, setPrompt] = useState("Find opportunities in markets right now");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assumptionsText, setAssumptionsText] = useState('{"tickers":["SPY"],"macroSeries":["DGS10","CPI","CREDIT"]}');
  const active = useMemo(() => workspaces.find((w) => w.workspace_id === activeId) ?? null, [workspaces, activeId]);
  const currentVersion = active?.versions?.[active.versions.length - 1];

  const load = async () => {
    const r = await fetch(`${API}/macro-board/workspaces`);
    const data = await r.json();
    setWorkspaces(data.workspaces ?? []);
    setActiveId((data.workspaces ?? [])[0]?.workspace_id ?? null);
  };
  useEffect(() => { load(); }, []);

  const createWorkspace = async () => {
    const assumptions = JSON.parse(assumptionsText);
    await fetch(`${API}/macro-board/workspaces`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, assumptions }) });
    await load();
  };
  const rerunWorkspace = async () => {
    if (!active) return;
    const assumptions = JSON.parse(assumptionsText);
    await fetch(`${API}/macro-board/workspaces/${active.workspace_id}/rerun`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: active.original_prompt, assumptions }) });
    await load();
  };

  return <section className="space-y-4"><div className="rounded-2xl border border-emerald-400/30 bg-slate-950 p-4"><h1 className="text-3xl font-semibold text-white">AI-guided Macro Board</h1></div><div className="rounded-2xl border border-slate-700 bg-slate-900 p-4"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-20 w-full rounded bg-slate-950 p-2" /><textarea value={assumptionsText} onChange={(e) => setAssumptionsText(e.target.value)} className="mt-2 min-h-20 w-full rounded bg-slate-950 p-2 text-xs" /><div className="mt-2 flex gap-2"><button onClick={createWorkspace} className="rounded bg-emerald-500 px-3 py-2 text-sm text-slate-950">Create workspace</button>{active && <button onClick={rerunWorkspace} className="rounded bg-slate-700 px-3 py-2 text-sm">Rerun new version</button>}</div></div><div className="flex gap-2 overflow-auto">{workspaces.map((w) => <button key={w.workspace_id} onClick={() => setActiveId(w.workspace_id)} className="rounded-full border border-slate-700 px-3 py-1 text-xs">{w.title} v{w.versions.length}</button>)}</div>{active && <div className="grid gap-4 lg:grid-cols-[260px_1fr]"><aside className="rounded border border-slate-800 p-3 text-xs text-slate-300"><p>Current version: {currentVersion?.version_id?.slice(0, 8)}</p><p>Updated: {active.updated_at}</p><p className="mt-2">Version history</p><ul>{active.versions.map((v) => <li key={v.version_id}>{v.version_id.slice(0, 8)} · {new Date(v.created_at).toLocaleString()}</li>)}</ul></aside><main className="space-y-3">{(currentVersion?.cards ?? []).map((card) => <CardRenderer key={card.id} card={card} />)}</main></div>}</section>;
}
