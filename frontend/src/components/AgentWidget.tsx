"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { api, AgentProcess } from "@/lib/api";
import OsirisPanel from "../../../assets/ai-panel.js";

export function AgentWidget() {
  const pathname = usePathname();
  const pageId = (pathname ?? "/dashboard").replace(/^\//, "") || "dashboard";
  const [open, setOpen] = useState(false);
  const [processes, setProcesses] = useState<Record<string, AgentProcess[]>>({});
  const [selectedProcess, setSelectedProcess] = useState("");
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Review your question and connect ChatGPT in the Osiris panel. Answers stay on this page.");

  useEffect(() => {
    api.agentProcesses().then(res => setProcesses(res.processes)).catch(() => {
      setStatus("Ask a question about this page. The workflow catalogue is currently unavailable.");
    });
  }, []);
  const pageProcesses = useMemo(() => processes[pageId] ?? processes.dashboard ?? [], [pageId, processes]);
  const activeProcess = pageProcesses.find(p => p.id === selectedProcess) ?? pageProcesses[0];

  function prepare(message = input) {
    try {
      OsirisPanel.open({
        tool: "page-guide", prompt: message,
        context: { page: pageId, workflow: activeProcess ?? null, dataBoundary: "Only this page name and workflow are included. No live metrics or page contents were collected." }
      });
    } catch (error) { setStatus(error instanceof Error ? error.message : "Could not prepare this question."); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); prepare(); }

  return <div className="fixed bottom-4 right-4 z-30 w-[calc(100%-2rem)] max-w-md sm:bottom-6 sm:right-6">
    {open ? <section className="overflow-hidden rounded-2xl border border-emerald-300/40 bg-slate-950 shadow-2xl shadow-black/50" aria-label="Osiris workshop guide">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-900 p-4">
        <div><p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Osiris · Your AI</p><h2 className="mt-1 text-lg font-semibold text-white">{activeProcess?.title ?? "Explore this instrument"}</h2><p className="mt-1 text-xs text-slate-400">Page: {pageId}</p></div>
        <button className="rounded-full border border-slate-700 px-3 py-1 text-sm" onClick={() => setOpen(false)}>Close</button>
      </div>
      <div className="space-y-4 p-4">
        {activeProcess ? <>
          <label className="block text-sm text-slate-300">Workflow outcome<select className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white" value={activeProcess.id} onChange={e => setSelectedProcess(e.target.value)}>{pageProcesses.map(p => <option key={p.id} value={p.id}>{p.outcome}</option>)}</select></label>
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200"><ol className="list-decimal space-y-1 pl-5">{activeProcess.steps.map(step => <li key={step}>{step}</li>)}</ol><button className="mt-3 rounded-lg border border-emerald-300/40 px-3 py-2 text-emerald-200" onClick={() => prepare(activeProcess.starter_prompt)}>Prepare a starting question</button></div>
        </> : null}
        <form onSubmit={submit} className="space-y-3"><label className="block text-sm text-slate-300">Your question<textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" maxLength={4000} placeholder="What should I explore or challenge here?" value={input} onChange={e => setInput(e.target.value)} /></label><p className="text-xs text-slate-400" role="status">{status}</p><button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={!input.trim()}>Open Osiris here</button></form>
        <p className="text-xs leading-5 text-slate-400">Private ChatGPT pilot. Only the page name and selected workflow are shared; the guide cannot see your charts or uploaded data automatically.</p><a className="text-sm text-emerald-200 underline" href="/tools/ai/projects.html">Project AI setup</a>
      </div>
    </section> : <button className="ml-auto flex items-center gap-3 rounded-full border border-emerald-300/40 bg-slate-950 px-5 py-3 text-sm font-semibold text-emerald-200 shadow-xl" onClick={() => setOpen(true)}>Ask Osiris <span aria-hidden="true">↗</span></button>}
  </div>;
}
