"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AIIntakePanel,
  EmptyState,
  ErrorState,
  ExportSaveActionBar,
  LoadingState,
  NextActionPanel,
  RecommendationCard,
  ResultCards,
  RiskCard,
  SourceList,
} from "@/components/ai-tools/ToolPrimitives";
import type { ToolCard, ToolConfidence, ToolRisk, ToolSource, ToolStatus } from "@/lib/toolOutput";

type IntakeQuestion = {
  id: string;
  question: string;
  why?: string;
  placeholder?: string;
};

type IntakeResponse = {
  prompt: string;
  inferred: Record<string, string>;
  clarifyingQuestions: IntakeQuestion[];
  status: ToolStatus;
  summary: string;
  missingData: string[];
  recommendedNextSteps: string[];
};

type WorkspaceVersion = {
  version_id: string;
  created_at: string;
  assumptions: Record<string, unknown>;
  cards: ToolCard[];
  analyst_outputs: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  warnings: ToolCard[];
  data_sources?: string[];
  summary?: string;
  risks?: ToolRisk[];
  missing_data?: string[];
  recommended_next_steps?: string[];
  sources?: ToolSource[];
  confidence?: ToolConfidence;
  status?: ToolStatus;
};

type Workspace = {
  workspace_id: string;
  title: string;
  original_prompt: string;
  assumptions: Record<string, unknown>;
  versions: WorkspaceVersion[];
  updated_at: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === "string" ? payload : payload.detail;
    throw new Error(message || `Request failed with status ${response.status}`);
  }
  return payload as T;
}

function parseAssumptions(value: string, clarifyingAnswers: Record<string, string>) {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  return {
    ...parsed,
    clarifyingAnswers,
  };
}

function versionOutput(version: WorkspaceVersion) {
  return {
    summary: version.summary || "This workspace was created before the standard summary field existed.",
    cards: version.cards ?? [],
    risks: version.risks ?? [],
    missingData: version.missing_data ?? [],
    recommendedNextSteps: version.recommended_next_steps ?? [],
    sources: version.sources ?? [],
    confidence: version.confidence ?? "medium",
    status: version.status ?? "complete",
  };
}

export default function MacroBoardPage() {
  const [prompt, setPrompt] = useState("Find opportunities in markets right now");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [assumptionsText, setAssumptionsText] = useState('{"tickers":["SPY"],"macroSeries":["DGS10","CPI","CREDIT"]}');
  const [intake, setIntake] = useState<IntakeResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"loading" | "intake" | "generate" | "rerun" | null>("loading");
  const [error, setError] = useState<string | null>(null);

  const active = useMemo(() => workspaces.find((workspace) => workspace.workspace_id === activeId) ?? null, [workspaces, activeId]);
  const currentVersion = active?.versions?.[active.versions.length - 1];
  const output = currentVersion ? versionOutput(currentVersion) : null;

  async function load(preferredId?: string) {
    setBusy((state) => state ?? "loading");
    try {
      const data = await fetchJson<{ workspaces: Workspace[] }>("/macro-board/workspaces");
      const rows = data.workspaces ?? [];
      setWorkspaces(rows);
      setActiveId(preferredId ?? rows[0]?.workspace_id ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspaces.");
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runIntake() {
    setBusy("intake");
    setError(null);
    try {
      const data = await fetchJson<IntakeResponse>("/macro-board/intake", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      setIntake(data);
      setAnswers((existing) => {
        const next = { ...existing };
        data.clarifyingQuestions.forEach((question) => {
          if (!(question.id in next)) next[question.id] = "";
        });
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build intake questions.");
    } finally {
      setBusy(null);
    }
  }

  async function createWorkspace() {
    setBusy("generate");
    setError(null);
    try {
      const assumptions = parseAssumptions(assumptionsText, answers);
      const created = await fetchJson<Workspace>("/macro-board/workspaces", {
        method: "POST",
        body: JSON.stringify({ prompt, assumptions }),
      });
      await load(created.workspace_id);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Assumption controls must be valid JSON." : err instanceof Error ? err.message : "Could not generate workspace.");
    } finally {
      setBusy(null);
    }
  }

  async function rerunWorkspace() {
    if (!active) return;
    setBusy("rerun");
    setError(null);
    try {
      const assumptions = parseAssumptions(assumptionsText, answers);
      await fetchJson<Workspace>(`/macro-board/workspaces/${active.workspace_id}/rerun`, {
        method: "POST",
        body: JSON.stringify({ prompt: active.original_prompt, assumptions }),
      });
      await load(active.workspace_id);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Assumption controls must be valid JSON." : err instanceof Error ? err.message : "Could not rerun workspace.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-emerald-300/20 bg-slate-900 p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">Workshop instrument</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">MacroBoard</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Turn a market question into a decision workspace with clarifying questions, evidence cards, assumptions, source quality, risk controls, and next actions.
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Tool audit pick</p>
            <p className="mt-1 leading-6">Closest to valuable: analytics backend, workspaces, and structured evidence already exist.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <AIIntakePanel
          prompt={prompt}
          assumptionsText={assumptionsText}
          questions={intake?.clarifyingQuestions ?? []}
          answers={answers}
          busy={busy !== null}
          error={error}
          onPromptChange={setPrompt}
          onAssumptionsChange={setAssumptionsText}
          onAnswerChange={(id, value) => setAnswers((current) => ({ ...current, [id]: value }))}
          onClarify={runIntake}
          onGenerate={createWorkspace}
        />

        <section className="space-y-4">
          {intake ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Intake readout</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{intake.summary}</h2>
                </div>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-100">{intake.status}</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {Object.entries(intake.inferred).map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="Intake has not run yet" message="Ask clarifying questions before generating the workspace to make the output feel guided instead of form-driven." />
          )}

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Saved workspaces</h2>
                <p className="mt-1 text-sm text-slate-400">Workspace history stays free while the tool quality improves.</p>
              </div>
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
                onClick={rerunWorkspace}
                disabled={!active || busy !== null}
              >
                Rerun active
              </button>
            </div>
            {workspaces.length ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.workspace_id}
                    onClick={() => setActiveId(workspace.workspace_id)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                      workspace.workspace_id === activeId
                        ? "border-emerald-300 bg-emerald-300 text-slate-950"
                        : "border-slate-700 text-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    {workspace.title} v{workspace.versions.length}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">No saved workspaces yet.</p>
            )}
          </section>
        </section>
      </div>

      {busy === "loading" || busy === "generate" || busy === "rerun" ? (
        <LoadingState message={busy === "rerun" ? "Rerunning the active workspace with revised assumptions..." : "Generating structured research cards..."} />
      ) : null}

      {error && !busy ? <ErrorState message={error} /> : null}

      {!currentVersion && !busy ? (
        <EmptyState title="Generate your first research workspace" message="MacroBoard will show card-based output, risks, missing data, sources, and next actions after the first guided run." />
      ) : null}

      {currentVersion && output ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <RecommendationCard output={output} />
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace version</p>
              <p className="mt-2 text-lg font-semibold text-white">{currentVersion.version_id.slice(0, 8)}</p>
              <p className="mt-1 text-sm text-slate-400">{new Date(currentVersion.created_at).toLocaleString()}</p>
            </div>
          </div>

          <ExportSaveActionBar disabled={!currentVersion} />

          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <ResultCards cards={output.cards} />
            <aside className="space-y-5">
              <RiskCard risks={output.risks} missingData={output.missingData} />
              <NextActionPanel actions={output.recommendedNextSteps} />
              <SourceList sources={output.sources} />
            </aside>
          </div>
        </div>
      ) : null}
    </section>
  );
}

