"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ResultCards } from "@/components/ai-tools/ToolPrimitives";
import { api, AgentMessage, AgentProcess } from "@/lib/api";
import type { ToolOutput } from "@/lib/toolOutput";

function pageFromPath(pathname: string | null) {
  return (pathname ?? "/dashboard").replace(/^\//, "") || "dashboard";
}

export function AgentWidget() {
  const pathname = usePathname();
  const pageId = pageFromPath(pathname);
  const [open, setOpen] = useState(false);
  const [processes, setProcesses] = useState<Record<string, AgentProcess[]>>({});
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [latestOutput, setLatestOutput] = useState<ToolOutput | null>(null);
  const [conversationId, setConversationId] = useState<string>();
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("Ready to guide this instrument.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.agentProcesses()
      .then((res) => setProcesses(res.processes))
      .catch((err) => setStatus(err.message));
  }, []);

  const pageProcesses = useMemo(() => processes[pageId] ?? processes.dashboard ?? [], [pageId, processes]);
  const activeProcess = pageProcesses.find((process) => process.id === selectedProcess) ?? pageProcesses[0];

  useEffect(() => {
    if (activeProcess) setSelectedProcess(activeProcess.id);
  }, [activeProcess?.id]);

  async function send(message = input) {
    if (!message.trim() || !activeProcess) return;
    setBusy(true);
    setStatus("Reading the instrument...");
    setInput("");
    try {
      const res = await api.agentChat({
        message,
        page_id: pageId,
        process_id: activeProcess.id,
        conversation_id: conversationId,
        // TODO: Add plan or entitlement context here after paid-tool packaging exists.
      });
      setConversationId(res.conversation_id);
      setMessages(res.history);
      setLatestOutput(res.structured_output ?? null);
      setStatus("Guidance ready.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Agent request failed");
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send();
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 w-[calc(100%-2rem)] max-w-md sm:bottom-6 sm:right-6">
      {open ? (
        <section className="overflow-hidden rounded-2xl border border-emerald-300/40 bg-slate-950 shadow-2xl shadow-black/50" aria-label="Ballzatram workshop guide">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-900 p-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">Workshop guide</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{activeProcess?.title ?? "Ballzatram Guide"}</h2>
              <p className="mt-1 text-xs text-slate-400">Page: {pageId}</p>
            </div>
            <button className="rounded-full border border-slate-700 px-3 py-1 text-sm hover:border-emerald-300" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>

          <div className="space-y-3 p-4">
            <label className="block text-sm text-slate-300">
              Workflow outcome
              <select
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-white"
                value={activeProcess?.id ?? ""}
                onChange={(event) => setSelectedProcess(event.target.value)}
              >
                {pageProcesses.map((process) => (
                  <option key={process.id} value={process.id}>{process.outcome}</option>
                ))}
              </select>
            </label>

            {activeProcess ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-200">
                <p className="font-medium text-emerald-200">Process steps</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5">
                  {activeProcess.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60"
                    disabled={busy}
                    onClick={() => void send(activeProcess.starter_prompt)}
                  >
                    Start this process
                  </button>
                  <span className="rounded-full border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400">
                    Free while workflow quality is refined
                  </span>
                </div>
              </div>
            ) : null}

            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? <p className="text-sm text-slate-400">Ask the guide to help complete this instrument's process.</p> : null}
              {messages.map((message, index) => (
                <div key={`${message.created_at}-${index}`} className={message.role === "assistant" ? "rounded-xl bg-emerald-400/10 p-3 text-sm text-emerald-50" : "rounded-xl bg-slate-800 p-3 text-sm text-slate-50"}>
                  <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">{message.role}</p>
                  <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                </div>
              ))}
            </div>

            {latestOutput?.cards?.length ? (
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Structured output</p>
                <ResultCards cards={latestOutput.cards.slice(0, 2)} />
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-2">
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white placeholder:text-slate-500"
                placeholder="Tell the agent what you want to accomplish..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">{status}</p>
                <button className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:opacity-60" disabled={busy || !input.trim()}>
                  Send
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : (
        <button
          className="ml-auto flex rounded-full border border-emerald-300/60 bg-emerald-400 px-5 py-3 font-semibold text-slate-950 shadow-xl shadow-black/30 hover:bg-emerald-300"
          onClick={() => setOpen(true)}
        >
          Ask the workshop guide
        </button>
      )}
    </div>
  );
}
