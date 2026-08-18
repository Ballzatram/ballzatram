"use client";

import { useEffect, useMemo, useState } from "react";
import { renderMarkdownReport } from "@/lib/reportApi";
import { readLatestReportSources, type ReportSourceKind, type ReportableSection } from "@/lib/reporting";

const sourceLabels: Record<ReportSourceKind, string> = {
  stock: "Stock Lab",
  portfolio: "Portfolio Lab",
  scenario: "Scenario Lab",
};

function flattenSection(section: ReportableSection): string[] {
  return [
    `### ${section.title}`,
    ...section.findings,
    ...section.assumptions.map((item) => `Assumption: ${item}`),
    ...section.provenance.map((item) => `Source: ${item}`),
    ...section.warnings.map((item) => `Warning: ${item}`),
  ];
}

export function ReportComposer() {
  const [title, setTitle] = useState("Ballzatram Research Report");
  const [available, setAvailable] = useState<Partial<Record<ReportSourceKind, ReportableSection>>>({});
  const [sections, setSections] = useState<ReportableSection[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const latest = readLatestReportSources();
    setAvailable(latest);
    try {
      const draft = JSON.parse(localStorage.getItem("ballzatram:report-draft:v1") || "null") as { title?: string; sections?: ReportableSection[] } | null;
      if (draft?.title) setTitle(draft.title);
      if (Array.isArray(draft?.sections)) setSections(draft.sections);
    } catch {
      // Ignore stale draft data.
    }
  }, []);

  const scenarioOutcomes = useMemo(() => Object.assign({}, ...sections.map((section) => section.scenarioOutcomes)), [sections]);

  function addSource(kind: ReportSourceKind) {
    const source = available[kind];
    if (!source || sections.some((section) => section.sourceKind === kind)) return;
    setSections((current) => [...current, source]);
  }

  function removeSection(index: number) {
    setSections((current) => current.filter((_, i) => i !== index));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateSection(index: number, patch: Partial<ReportableSection>) {
    setSections((current) => current.map((section, i) => i === index ? { ...section, ...patch } : section));
  }

  async function generate() {
    if (!sections.length) return;
    setBusy(true);
    setError("");
    try {
      const findings = sections.flatMap(flattenSection);
      const response = await renderMarkdownReport({ title: title.trim() || "Ballzatram Research Report", findings, scenario_outcomes: scenarioOutcomes });
      setMarkdown(response.markdown);
      localStorage.setItem("ballzatram:report-draft:v1", JSON.stringify({ title, sections, updatedAt: new Date().toISOString() }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadMarkdown() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(title || "ballzatram-report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ballzatram-report"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <section className="space-y-6">
    <header className="rounded-3xl border border-violet-300/20 bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,.2),transparent_32%),linear-gradient(135deg,#020617,#111827_60%,#2e1065)] p-6 sm:p-8">
      <p className="font-mono text-xs font-black uppercase tracking-[.3em] text-violet-300">Ballzatram V3 · Reports</p>
      <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">Turn real analysis into a reusable artifact.</h1>
      <p className="mt-4 max-w-4xl text-lg leading-8 text-slate-300">Reports only include tool outputs that actually exist in this browser session/history. Provenance, warnings, assumptions, and timestamps travel with each section. Empty demo text is never inserted silently.</p>
    </header>

    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <aside className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-violet-300">Available analysis</p>
          <div className="mt-4 space-y-2">{(["stock","portfolio","scenario"] as ReportSourceKind[]).map((kind) => {
            const source = available[kind];
            const alreadyAdded = sections.some((section) => section.sourceKind === kind);
            return <div key={kind} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-center justify-between gap-3"><div><strong className="text-white">{sourceLabels[kind]}</strong><p className="mt-1 text-xs text-slate-500">{source ? `Latest saved run: ${new Date(source.createdAt).toLocaleString()}` : "No saved run found in this browser."}</p></div><button type="button" disabled={!source || alreadyAdded} onClick={() => addSource(kind)} className="rounded-full border border-violet-300/40 px-3 py-2 text-xs font-bold text-violet-100 disabled:opacity-30">{alreadyAdded ? "Added" : "Add"}</button></div></div>;
          })}</div>
          <p className="mt-4 text-xs leading-5 text-slate-500">Run Stock, Portfolio, or Scenario Lab first if a source is unavailable. Reports intentionally do not fabricate missing analysis.</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <label className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Report title<input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"/></label>
          <button type="button" disabled={!sections.length || busy} onClick={generate} className="mt-5 w-full rounded-xl bg-violet-300 px-4 py-3 font-black uppercase tracking-[.14em] text-slate-950 disabled:opacity-40">{busy ? "Generating…" : "Generate markdown"}</button>
          {error ? <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-300/10 p-3 text-sm text-rose-100">{error}</p> : null}
        </article>
      </aside>

      <div className="space-y-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Report structure</p><h2 className="mt-2 text-xl font-black text-white">{sections.length} section{sections.length === 1 ? "" : "s"}</h2></div></div>
          {!sections.length ? <div className="mt-4 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Add at least one real tool output to start the report.</div> : <div className="mt-4 space-y-3">{sections.map((section, index) => <div key={section.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 text-[.65rem] font-bold uppercase text-cyan-100">{sourceLabels[section.sourceKind]}</span><input value={section.title} onChange={(event) => updateSection(index, { title: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 font-bold text-white"/><button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} className="rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-300 disabled:opacity-30">↑</button><button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} className="rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-300 disabled:opacity-30">↓</button><button type="button" onClick={() => removeSection(index)} className="rounded-lg border border-rose-300/30 px-2 py-2 text-xs text-rose-200">Remove</button></div><label className="mt-3 block text-xs font-bold uppercase tracking-[.16em] text-slate-500">Findings<textarea value={section.findings.join("\n")} onChange={(event) => updateSection(index, { findings: event.target.value.split("\n").filter(Boolean) })} rows={5} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm leading-6 text-slate-200"/></label><details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer font-bold text-slate-300">Provenance, assumptions & warnings</summary><div className="mt-2 space-y-1">{section.provenance.map((item) => <p key={item}>Source · {item}</p>)}{section.assumptions.map((item) => <p key={item}>Assumption · {item}</p>)}{section.warnings.map((item) => <p key={item}>Warning · {item}</p>)}</div></details></div>)}</div>}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-500">Markdown preview</p><p className="mt-1 text-sm text-slate-400">Rendered by the backend report endpoint from the structured sections above.</p></div><button type="button" disabled={!markdown} onClick={downloadMarkdown} className="rounded-full border border-emerald-300/40 px-4 py-2 text-xs font-bold text-emerald-100 disabled:opacity-30">Download .md</button></div>{markdown ? <pre className="mt-4 max-h-[38rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-black/30 p-4 text-xs leading-6 text-slate-300">{markdown}</pre> : <div className="mt-4 rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-600">Generate the report to preview Markdown.</div>}</article>
      </div>
    </div>
  </section>;
}
