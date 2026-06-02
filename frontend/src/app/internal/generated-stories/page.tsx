import type { Metadata } from "next";
import { getDepartment } from "@/config/departments";
import { generatedStoryPreviewDrafts, type GeneratedStoryDraft } from "@/lib/story-engine";
import { StoneyAside } from "@/components/stoney/StoneyPrimitives";
import type { StoryBodySection } from "@/types/story";

export const metadata: Metadata = {
  title: "Generated Stories Preview | Ballzatram",
  description: "Internal preview for deterministic tool-insight to Ballzatram Daily story generation.",
};

function SectionPreview({ section }: { section: StoryBodySection }) {
  if (section.type === "bullet-list") {
    return (
      <section className="border-t border-slate-800 pt-4">
        {section.heading ? <h4 className="text-lg font-semibold text-white">{section.heading}</h4> : null}
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
          {(section.items ?? []).map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section className={section.type === "callout" || section.type === "data-note" ? "rounded-xl border border-amber-300/20 bg-amber-300/10 p-4" : "border-t border-slate-800 pt-4"}>
      {section.heading ? <h4 className="text-lg font-semibold text-white">{section.heading}</h4> : null}
      {section.content ? <p className="mt-2 text-sm leading-6 text-slate-300">{section.content}</p> : null}
    </section>
  );
}

function DraftPreview({ draft }: { draft: GeneratedStoryDraft }) {
  const department = getDepartment(draft.story.departmentId);
  return (
    <article className="grid gap-5 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2.5 py-1 text-xs font-semibold text-emerald-100">
          {department.shortTitle}
        </span>
        <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1 text-xs font-semibold text-cyan-100">
          {draft.source.toolName}
        </span>
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300">
          {draft.readyToPublish ? "ready draft" : "review draft"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Input insight</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{draft.insight.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{draft.insight.summary}</p>
          <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-black/50 p-3 text-xs leading-5 text-slate-300">
            {JSON.stringify(draft.insight, null, 2)}
          </pre>
        </section>

        <section className="grid gap-4">
          <div className="rounded-xl border border-emerald-300/30 bg-emerald-300/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Generated story card</p>
            <h3 className="mt-2 text-2xl font-semibold leading-8 text-white">{draft.story.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{draft.story.dek}</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">{draft.story.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
              <span>{draft.story.sourceType}</span>
              <span>Confidence: {draft.story.confidence}</span>
              {draft.story.dataAsOf ? <span>Data as of: {draft.story.dataAsOf}</span> : null}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Generated article page preview</p>
            <div className="mt-4 grid gap-4">
              {draft.story.body.map((section) => (
                <SectionPreview key={section.id} section={section} />
              ))}
            </div>
            {draft.story.caveats?.length ? (
              <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">Caveats</p>
                <ul className="mt-2 grid gap-1 text-sm leading-6 text-amber-50/90">
                  {draft.story.caveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
                </ul>
              </div>
            ) : null}
            {draft.generationWarnings.length ? (
              <div className="mt-5 rounded-xl border border-rose-300/30 bg-rose-300/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-100">Generation warnings</p>
                <ul className="mt-2 grid gap-1 text-sm leading-6 text-rose-50/90">
                  {draft.generationWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </article>
  );
}

export default function GeneratedStoriesPreviewPage() {
  const drafts = generatedStoryPreviewDrafts();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-amber-300/25 bg-slate-950 p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
          Internal preview
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">
          Generated Stories Preview
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-300 sm:text-base">
          Deterministic tool insights can now become Ballzatram Daily story drafts.
          This route does not publish content or call an AI model; it only shows
          the input insight, generated story card, and generated article body.
        </p>
      </div>

      <StoneyAside
        title="Margin correspondent admitted to preview room"
        body="Stoney is allowed to heckle the machinery here because this is an internal preview, not a caveat, source label, or publication decision."
        tone="dark"
      />

      <div className="grid gap-5">
        {drafts.map((draft) => <DraftPreview key={draft.id} draft={draft} />)}
      </div>
    </section>
  );
}
