"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { parcelOpportunities, type ParcelOpportunity, type ParcelSourceStatus } from "@/data/parcelOpportunities";
import { api } from "@/lib/api";
import {
  buildLocalParcelResearchResult,
  buildParcelResearchRequest,
  defaultParcelThesis,
  extractListingLinks,
  formatCurrency,
  formatNumber,
  getLocalSuitability,
  normalizeCandidateInputs,
  sourceStatusLabels,
  sourceTypeLabels,
  suitabilityCategoryLabels,
  splitList,
  type ParcelCandidateInput,
  type ParcelCandidateSuitability,
  type ParcelResearchResult,
  type ParcelThesisInput,
} from "@/lib/parcel";

type ResearchStatus = "idle" | "loading" | "complete";
type DetailTab = "evidence" | "diligence" | "location" | "memo";

type EvaluationCandidate = {
  opportunity: ParcelOpportunity;
  suitability: ParcelCandidateSuitability;
  rank: number;
  sourceAudit?: ParcelResearchResult["sourceAudit"][number];
  missingProof: string[];
  dealKillers: string[];
  nextQuestions: string[];
};

type LeadDraft = {
  title: string;
  sourceUrl: string;
  notes: string;
};

const categoryTone: Record<ParcelCandidateSuitability["category"], string> = {
  strong_fit: "border-[#23724f] bg-[#e5f4ea] text-[#164431]",
  conditional_fit: "border-[#a46b15] bg-[#fff2cf] text-[#593907]",
  weak_fit: "border-[#5d7794] bg-[#e9f1f8] text-[#253d55]",
  disqualified: "border-[#a64435] bg-[#fbe8e3] text-[#61251b]",
  needs_source_review: "border-[#566b64] bg-[#ecf0ee] text-[#263a34]",
};

const sourceTone: Record<ParcelSourceStatus, string> = {
  live: "bg-[#dff3e7] text-[#184d34]",
  partial: "bg-[#fff0c7] text-[#61400b]",
  unknown: "bg-[#e7eef7] text-[#263f5d]",
  dead: "bg-[#f9e2dc] text-[#703024]",
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function buildEvaluationCandidates(
  opportunities: ParcelOpportunity[],
  result: ParcelResearchResult,
): EvaluationCandidate[] {
  const rankMap = new Map(result.rankedCandidateIds.map((id, index) => [id, index]));
  const suitabilityMap = new Map(result.candidateSuitability.map((item) => [item.candidateId, item]));
  const sourceMap = new Map(result.sourceAudit.filter((item) => item.candidateId).map((item) => [item.candidateId, item]));

  return [...opportunities]
    .sort((a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999))
    .map((opportunity, index) => {
      const suitability = suitabilityMap.get(opportunity.id) ?? getLocalSuitability(opportunity);
      return {
        opportunity,
        suitability,
        rank: index + 1,
        sourceAudit: sourceMap.get(opportunity.id),
        missingProof: opportunity.missingData,
        dealKillers: suitability.dealKillers.length ? suitability.dealKillers : opportunity.diligenceConcerns.slice(0, 2),
        nextQuestions: suitability.nextQuestions.length ? suitability.nextQuestions : opportunity.nextDiligence,
      };
    });
}

function getTopReason(candidate: EvaluationCandidate) {
  return candidate.suitability.reasons[0] ?? candidate.opportunity.rationale;
}

function ProjectBriefComposer({
  thesis,
  listingLinks,
  researchStatus,
  onChange,
  onRunEvaluation,
}: {
  thesis: ParcelThesisInput;
  listingLinks: string[];
  researchStatus: ResearchStatus;
  onChange: (field: keyof ParcelThesisInput, value: string) => void;
  onRunEvaluation: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="grid content-start gap-4 rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]"
      onSubmit={onRunEvaluation}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Project Brief</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-[#18241e]">Define the investment question.</h2>
        </div>
        <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-black text-[#365347]">
          {listingLinks.length ? `${listingLinks.length} URL${listingLinks.length === 1 ? "" : "s"}` : "Seed data"}
        </span>
      </div>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-use-case">
        Project type
        <input
          id="parcel-use-case"
          value={thesis.useCase}
          onChange={(event) => onChange("useCase", event.target.value)}
          className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-market">
          Geography
          <input
            id="parcel-market"
            value={thesis.market}
            onChange={(event) => onChange("market", event.target.value)}
            className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-budget">
          Budget
          <input
            id="parcel-budget"
            value={thesis.budget}
            onChange={(event) => onChange("budget", event.target.value)}
            className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
      </div>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-acreage-range">
        Acreage
        <input
          id="parcel-acreage-range"
          value={thesis.acreageRange}
          onChange={(event) => onChange("acreageRange", event.target.value)}
          className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-must-haves">
        Must-haves
        <textarea
          id="parcel-must-haves"
          rows={3}
          value={thesis.mustHaves}
          onChange={(event) => onChange("mustHaves", event.target.value)}
          className="rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 py-2 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-risk-factors">
        Deal-breakers and risks
        <textarea
          id="parcel-risk-factors"
          rows={3}
          value={thesis.riskFactors}
          onChange={(event) => onChange("riskFactors", event.target.value)}
          className="rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 py-2 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-links">
        Listing links
        <textarea
          id="parcel-links"
          rows={3}
          value={thesis.listingLinks}
          onChange={(event) => onChange("listingLinks", event.target.value)}
          placeholder="Paste URLs here"
          className="rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 py-2 text-[#18241e] outline-none placeholder:text-[#8a9a92] focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <button
        type="submit"
        disabled={researchStatus === "loading"}
        className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-[#18241e] px-4 text-sm font-black text-white transition hover:bg-[#24372e] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
      >
        {researchStatus === "loading" ? "Evaluating properties..." : "Evaluate properties"}
      </button>
    </form>
  );
}

function AddLeadComposer({
  draft,
  dynamicCandidates,
  onDraftChange,
  onAddLead,
  onRemoveLead,
  onSelectLead,
}: {
  draft: LeadDraft;
  dynamicCandidates: ParcelOpportunity[];
  onDraftChange: (field: keyof LeadDraft, value: string) => void;
  onAddLead: (event: FormEvent<HTMLFormElement>) => void;
  onRemoveLead: (id: string) => void;
  onSelectLead: (id: string) => void;
}) {
  return (
    <section className="grid gap-3 rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Candidate Inputs</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-[#18241e]">Add a lead to evaluate.</h2>
        </div>
        <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-black text-[#365347]">
          {dynamicCandidates.length} added
        </span>
      </div>

      <form className="grid gap-3" onSubmit={onAddLead}>
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-lead-title">
          Title
          <input
            id="parcel-lead-title"
            value={draft.title}
            onChange={(event) => onDraftChange("title", event.target.value)}
            placeholder="Optional property name"
            className="min-h-10 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none placeholder:text-[#8a9a92] focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-lead-url">
          Source URL
          <input
            id="parcel-lead-url"
            value={draft.sourceUrl}
            onChange={(event) => onDraftChange("sourceUrl", event.target.value)}
            placeholder="Paste listing or broker URL"
            className="min-h-10 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none placeholder:text-[#8a9a92] focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-lead-notes">
          Notes
          <textarea
            id="parcel-lead-notes"
            rows={3}
            value={draft.notes}
            onChange={(event) => onDraftChange("notes", event.target.value)}
            placeholder="Example: 125 acres, $2.4M, road frontage, pasture, unknown zoning"
            className="rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 py-2 text-[#18241e] outline-none placeholder:text-[#8a9a92] focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-[4px] border border-[#1f6a4a] bg-[#edf5ef] px-3 text-sm font-black text-[#18241e] transition hover:bg-[#dceee4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
        >
          Add lead
        </button>
      </form>

      <div className="grid gap-2" aria-live="polite">
        {dynamicCandidates.length ? dynamicCandidates.map((candidate) => (
          <div key={candidate.id} className="grid gap-2 rounded-[4px] border border-[#dce4df] bg-[#fbfcfa] p-3">
            <button
              type="button"
              onClick={() => onSelectLead(candidate.id)}
              className="text-left text-sm font-black text-[#18241e] hover:text-[#1f6a4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
            >
              {candidate.title}
            </button>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-[#66796e]">Session-only; needs source review</span>
              <button
                type="button"
                onClick={() => onRemoveLead(candidate.id)}
                className="rounded-[4px] border border-[#d3b9af] bg-white px-2 py-1 text-xs font-black text-[#703024] hover:border-[#a64435] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64435]"
              >
                Remove
              </button>
            </div>
          </div>
        )) : (
          <p className="rounded-[4px] bg-[#f4f7f2] p-3 text-sm leading-6 text-[#52645b]">
            Added leads become provisional candidates immediately. Parcel will not scrape or verify them.
          </p>
        )}
      </div>
    </section>
  );
}

function RankedResults({
  candidates,
  selectedId,
  savedIds,
  mode,
  onSelect,
  onToggleSaved,
}: {
  candidates: EvaluationCandidate[];
  selectedId: string;
  savedIds: string[];
  mode: ParcelResearchResult["mode"];
  onSelect: (id: string) => void;
  onToggleSaved: (id: string) => void;
}) {
  const top = candidates[0];

  return (
    <section className="grid gap-4 rounded-[6px] border border-[#d5ddd3] bg-[#fdfefd] p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Ranked Suitability</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-[#18241e]">
            {top ? `${top.opportunity.title} leads the screen.` : "No candidates available."}
          </h2>
        </div>
        <span className="rounded-full border border-[#c5d0c9] bg-white px-3 py-1 text-xs font-black uppercase text-[#476156]">
          {mode}
        </span>
      </div>

      <div className="grid gap-3">
        {candidates.map((candidate) => {
          const opportunity = candidate.opportunity;
          const selected = opportunity.id === selectedId;
          const saved = savedIds.includes(opportunity.id);
          return (
            <article
              key={opportunity.id}
              className={classNames(
                "grid gap-3 rounded-[5px] border bg-white p-4 transition",
                selected ? "border-[#1f6a4a] shadow-[0_12px_36px_rgba(31,106,74,0.16)]" : "border-[#dce4df]",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(opportunity.id)}
                className="grid gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase text-[#66796e]">#{candidate.rank}</span>
                    <h3 className="mt-1 text-xl font-black leading-tight text-[#18241e]">{opportunity.title}</h3>
                    <p className="mt-1 text-sm text-[#52645b]">{opportunity.market}</p>
                  </div>
                  <div className="text-right">
                    <strong className="block text-3xl font-black leading-none text-[#18241e]">
                      {candidate.suitability.suitabilityScore}
                    </strong>
                    <span className="text-xs font-bold uppercase text-[#66796e]">score</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={classNames("rounded-full border px-3 py-1 text-xs font-black", categoryTone[candidate.suitability.category])}>
                    {suitabilityCategoryLabels[candidate.suitability.category]}
                  </span>
                  <span className={classNames("rounded-full px-3 py-1 text-xs font-black", sourceTone[opportunity.sourceStatus])}>
                    {sourceStatusLabels[opportunity.sourceStatus]}
                  </span>
                  <span className="rounded-full bg-[#eef2f4] px-3 py-1 text-xs font-black text-[#334550]">
                    {opportunity.dataConfidence}/100 confidence
                  </span>
                </div>

                <p className="text-sm leading-6 text-[#3e5048]">{getTopReason(candidate)}</p>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[4px] bg-[#f4f7f2] p-3">
                    <span className="block text-xs font-black uppercase text-[#66796e]">Missing proof</span>
                    <strong className="mt-1 block text-sm text-[#18241e]">{candidate.missingProof[0] ?? "No gap recorded"}</strong>
                  </div>
                  <div className="rounded-[4px] bg-[#f4f7f2] p-3">
                    <span className="block text-xs font-black uppercase text-[#66796e]">Deal-killer</span>
                    <strong className="mt-1 block text-sm text-[#18241e]">{candidate.dealKillers[0] ?? "None flagged"}</strong>
                  </div>
                  <div className="rounded-[4px] bg-[#f4f7f2] p-3">
                    <span className="block text-xs font-black uppercase text-[#66796e]">Next question</span>
                    <strong className="mt-1 block text-sm text-[#18241e]">{candidate.nextQuestions[0] ?? opportunity.nextDiligence[0]}</strong>
                  </div>
                </div>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6ece8] pt-3">
                <dl className="grid flex-1 gap-2 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-xs font-black uppercase text-[#66796e]">Acres</dt>
                    <dd className="font-bold text-[#18241e]">{formatNumber(opportunity.acreage, 1)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-[#66796e]">Price</dt>
                    <dd className="font-bold text-[#18241e]">{formatCurrency(opportunity.price)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-[#66796e]">$/acre</dt>
                    <dd className="font-bold text-[#18241e]">{formatCurrency(opportunity.pricePerAcre)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-[#66796e]">Drive</dt>
                    <dd className="font-bold text-[#18241e]">{opportunity.driveTimeMinutes ?? "?"} min</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  aria-pressed={saved}
                  onClick={() => onToggleSaved(opportunity.id)}
                  className={classNames(
                    "min-h-10 rounded-[4px] border px-3 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]",
                    saved
                      ? "border-[#1f6a4a] bg-[#1f6a4a] text-white"
                      : "border-[#c5d0c9] bg-white text-[#18241e] hover:border-[#1f6a4a]",
                  )}
                >
                  {saved ? "Saved" : "Save"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function MiniMap({
  candidates,
  selectedId,
  savedIds,
  onSelect,
}: {
  candidates: EvaluationCandidate[];
  selectedId: string;
  savedIds: string[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="parcel-mini-map" aria-label="Compact regional candidate map">
      <div className="parcel-mini-map__rings" aria-hidden="true" />
      <div className="parcel-mini-map__center" aria-hidden="true">CLT</div>
      {candidates.map((candidate) => {
        const opportunity = candidate.opportunity;
        return (
          <button
            key={opportunity.id}
            type="button"
            aria-pressed={opportunity.id === selectedId}
            aria-label={`${opportunity.title}, ${opportunity.distanceLabel ?? "location not verified"}, ${suitabilityCategoryLabels[candidate.suitability.category]}`}
            className={classNames(
              "parcel-mini-map__pin",
              opportunity.id === selectedId && "parcel-mini-map__pin--selected",
              savedIds.includes(opportunity.id) && "parcel-mini-map__pin--saved",
            )}
            style={{ left: `${opportunity.mapX ?? 50}%`, top: `${opportunity.mapY ?? 50}%` }}
            onClick={() => onSelect(opportunity.id)}
          >
            <span />
          </button>
        );
      })}
    </div>
  );
}

function CandidateDetail({
  candidate,
  candidates,
  result,
  tab,
  savedIds,
  onTabChange,
  onSelect,
}: {
  candidate: EvaluationCandidate;
  candidates: EvaluationCandidate[];
  result: ParcelResearchResult;
  tab: DetailTab;
  savedIds: string[];
  onTabChange: (tab: DetailTab) => void;
  onSelect: (id: string) => void;
}) {
  const opportunity = candidate.opportunity;
  const matchedSource = candidate.sourceAudit;
  const userLinks = result.sourceAudit.filter((item) => !item.candidateId && item.url);
  const tabClass = (value: DetailTab) =>
    classNames(
      "min-h-10 rounded-[4px] px-3 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]",
      tab === value ? "bg-[#18241e] text-white" : "bg-[#edf2ef] text-[#26362f] hover:bg-[#dfe8e2]",
    );

  return (
    <section className="grid gap-4 rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Selected Property</p>
          <h2 className="mt-1 text-3xl font-black leading-tight text-[#18241e]">{opportunity.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52645b]">{opportunity.rationale}</p>
        </div>
        <span className={classNames("rounded-full border px-3 py-1 text-xs font-black", categoryTone[candidate.suitability.category])}>
          {suitabilityCategoryLabels[candidate.suitability.category]}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Suitability" value={`${candidate.suitability.suitabilityScore}/100`} />
        <Metric label="Confidence" value={`${opportunity.dataConfidence}/100`} />
        <Metric label="Acres" value={formatNumber(opportunity.acreage, 1)} />
        <Metric label="Price" value={formatCurrency(opportunity.price)} />
      </div>

      <div className="flex flex-wrap gap-2 border-y border-[#e5ebe7] py-3" role="tablist" aria-label="Property evidence sections">
        <button type="button" className={tabClass("evidence")} onClick={() => onTabChange("evidence")}>Evidence</button>
        <button type="button" className={tabClass("diligence")} onClick={() => onTabChange("diligence")}>Diligence</button>
        <button type="button" className={tabClass("location")} onClick={() => onTabChange("location")}>Location</button>
        <button type="button" className={tabClass("memo")} onClick={() => onTabChange("memo")}>Memo</button>
      </div>

      {tab === "evidence" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.68fr)_minmax(280px,0.32fr)]">
          <div className="grid gap-3">
            <EvidenceBlock title="Source status" body={matchedSource?.note ?? opportunity.sourceVerification} />
            <EvidenceBlock title="Source label" body={`${opportunity.sourceLabel ?? sourceTypeLabels[opportunity.sourceType]} / last researched ${opportunity.lastResearched ?? "not recorded"}`} />
            <EvidenceBlock title="Verification boundary" body={opportunity.verificationNote} />
          </div>
          <aside className="grid content-start gap-3 rounded-[5px] bg-[#f4f7f2] p-4">
            <h3 className="text-sm font-black uppercase text-[#66796e]">Warnings</h3>
            <ul className="grid gap-2 text-sm leading-6 text-[#3e5048]">
              {result.warnings.slice(0, 4).map((warning) => (
                <li key={warning} className="border-l-2 border-[#a46b15] pl-3">{warning}</li>
              ))}
            </ul>
            {userLinks.length ? (
              <p className="border-t border-[#d8e1db] pt-3 text-sm leading-6 text-[#3e5048]">
                {userLinks.length} pasted URL{userLinks.length === 1 ? "" : "s"} treated as unverified context.
              </p>
            ) : null}
          </aside>
        </div>
      ) : null}

      {tab === "diligence" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <ListBlock title="Missing proof" items={candidate.missingProof} tone="orange" />
          <ListBlock title="Deal-killers" items={candidate.dealKillers} tone="red" />
          <ListBlock title="Next questions" items={candidate.nextQuestions} tone="green" />
        </div>
      ) : null}

      {tab === "location" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.62fr)_minmax(280px,0.38fr)]">
          <MiniMap candidates={candidates} selectedId={opportunity.id} savedIds={savedIds} onSelect={onSelect} />
          <div className="grid content-start gap-3 rounded-[5px] bg-[#f4f7f2] p-4">
            <Metric label="Market" value={opportunity.market} />
            <Metric label="County" value={[opportunity.county, opportunity.state].filter(Boolean).join(", ") || "Unverified"} />
            <Metric label="Distance" value={opportunity.distanceLabel ?? "Unknown"} />
          </div>
        </div>
      ) : null}

      {tab === "memo" ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.64fr)_minmax(280px,0.36fr)]">
          <div className="rounded-[5px] bg-[#f4f7f2] p-4">
            <h3 className="text-sm font-black uppercase text-[#66796e]">Preview</h3>
            <p className="mt-2 text-sm leading-6 text-[#33443c]">{result.memo.executiveSummary}</p>
          </div>
          <ListBlock title="Founding memo scope" items={result.memo.paidMemoScope} tone="green" />
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-[#dce4df] bg-[#fbfcfa] p-3">
      <span className="block text-xs font-black uppercase text-[#66796e]">{label}</span>
      <strong className="mt-1 block text-sm leading-5 text-[#18241e]">{value}</strong>
    </div>
  );
}

function EvidenceBlock({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-[5px] border border-[#dce4df] bg-white p-4">
      <h3 className="text-sm font-black uppercase text-[#66796e]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#33443c]">{body}</p>
    </section>
  );
}

function ListBlock({ title, items, tone }: { title: string; items: string[]; tone: "green" | "orange" | "red" }) {
  const border = tone === "green" ? "border-[#1f6a4a]" : tone === "orange" ? "border-[#a46b15]" : "border-[#a64435]";
  return (
    <section className="rounded-[5px] border border-[#dce4df] bg-white p-4">
      <h3 className="text-sm font-black uppercase text-[#66796e]">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#33443c]">
        {items.length ? items.slice(0, 6).map((item) => (
          <li key={item} className={classNames("border-l-2 pl-3", border)}>{item}</li>
        )) : <li className="text-[#66796e]">No item recorded.</li>}
      </ul>
    </section>
  );
}

export function ParcelIntelligencePage() {
  const [thesis, setThesis] = useState<ParcelThesisInput>(defaultParcelThesis);
  const [seedCandidates, setSeedCandidates] = useState<ParcelOpportunity[]>(parcelOpportunities);
  const [candidateInputs, setCandidateInputs] = useState<ParcelCandidateInput[]>([]);
  const [leadDraft, setLeadDraft] = useState<LeadDraft>({ title: "", sourceUrl: "", notes: "" });
  const [selectedId, setSelectedId] = useState("york-kays-drive");
  const [savedIds, setSavedIds] = useState<string[]>(["york-kays-drive", "chester-humpback-bridge"]);
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>("idle");
  const [researchResult, setResearchResult] = useState<ParcelResearchResult | undefined>();
  const [detailTab, setDetailTab] = useState<DetailTab>("evidence");

  useEffect(() => {
    let active = true;
    api.parcelCandidates()
      .then((response) => {
        if (active && response.candidateRecords.length) {
          setSeedCandidates(response.candidateRecords);
        }
      })
      .catch(() => {
        // The shared local catalog keeps the workbench usable if the backend is offline.
      });
    return () => {
      active = false;
    };
  }, []);

  const listingLinks = extractListingLinks(thesis.listingLinks);
  const dynamicCandidates = useMemo(() => normalizeCandidateInputs(thesis, candidateInputs), [candidateInputs, thesis]);
  const baseCandidateRecords = useMemo(
    () => [...seedCandidates, ...dynamicCandidates],
    [dynamicCandidates, seedCandidates],
  );
  const localResult = useMemo(() => buildLocalParcelResearchResult(thesis, baseCandidateRecords), [baseCandidateRecords, thesis]);
  const result = researchResult ?? localResult;
  const resultCandidateRecords = result.candidateRecords.length ? result.candidateRecords : baseCandidateRecords;
  const candidates = useMemo(() => buildEvaluationCandidates(resultCandidateRecords, result), [result, resultCandidateRecords]);
  const selectedCandidate = candidates.find((candidate) => candidate.opportunity.id === selectedId) ?? candidates[0];
  const savedCandidates = candidates.filter((candidate) => savedIds.includes(candidate.opportunity.id));
  const topCandidate = candidates[0];
  const mustHaves = splitList(thesis.mustHaves);

  function updateThesis(field: keyof ParcelThesisInput, value: string) {
    setThesis((current) => ({ ...current, [field]: value }));
    setResearchResult(undefined);
    setResearchStatus("idle");
  }

  function updateLeadDraft(field: keyof LeadDraft, value: string) {
    setLeadDraft((current) => ({ ...current, [field]: value }));
  }

  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextInput = {
      title: leadDraft.title.trim() || undefined,
      sourceUrl: leadDraft.sourceUrl.trim() || undefined,
      notes: leadDraft.notes.trim(),
    };
    if (!nextInput.notes) return;

    const [candidate] = normalizeCandidateInputs(thesis, [nextInput]);
    setCandidateInputs((current) => [...current, nextInput]);
    setLeadDraft({ title: "", sourceUrl: "", notes: "" });
    setResearchResult(undefined);
    setResearchStatus("idle");
    if (candidate) {
      setSelectedId(candidate.id);
    }
  }

  function removeLead(id: string) {
    setCandidateInputs((current) => current.filter((input) => normalizeCandidateInputs(thesis, [input])[0]?.id !== id));
    setSavedIds((current) => current.filter((item) => item !== id));
    setResearchResult(undefined);
    setResearchStatus("idle");
    if (selectedId === id) {
      setSelectedId("york-kays-drive");
    }
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function runEvaluation(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setResearchStatus("loading");
    const request = buildParcelResearchRequest(thesis, [selectedId], savedIds, candidateInputs);

    try {
      const nextResult = await api.parcelResearch(request);
      setResearchResult(nextResult);
      setSelectedId(nextResult.rankedCandidateIds[0] ?? selectedId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend request failed.";
      const fallback = buildLocalParcelResearchResult(thesis, baseCandidateRecords);
      setResearchResult({
        ...fallback,
        warnings: [`Backend research endpoint was unavailable, so deterministic local evaluation was used: ${message}`, ...fallback.warnings],
      });
    } finally {
      setResearchStatus("complete");
    }
  }

  return (
    <div className="min-h-dvh bg-[#f4f7f2] text-[#18241e]">
      <section className="border-b border-[#d8e1db] bg-[#eef4ef]">
        <div className="mx-auto grid w-full max-w-[1480px] gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-[#66796e]">Parcel Evaluator</p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#18241e] md:text-4xl">
                Property suitability, evidence first.
              </h1>
            </div>
            <div className="grid gap-1 rounded-[6px] border border-[#d5ddd3] bg-white px-4 py-3 text-sm shadow-[0_10px_30px_rgba(21,32,26,0.06)]">
              <span className="font-black text-[#18241e]">
                {topCandidate ? `${suitabilityCategoryLabels[topCandidate.suitability.category]}: ${topCandidate.opportunity.title}` : "No candidate"}
              </span>
              <span className="text-[#52645b]">Best fit, proof gaps, and next diligence are visible before memo scope.</span>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <ProjectBriefComposer
                thesis={thesis}
                listingLinks={listingLinks}
                researchStatus={researchStatus}
                onChange={updateThesis}
                onRunEvaluation={runEvaluation}
              />
              <AddLeadComposer
                draft={leadDraft}
                dynamicCandidates={dynamicCandidates}
                onDraftChange={updateLeadDraft}
                onAddLead={addLead}
                onRemoveLead={removeLead}
                onSelectLead={setSelectedId}
              />
            </div>
            <RankedResults
              candidates={candidates}
              selectedId={selectedCandidate?.opportunity.id ?? selectedId}
              savedIds={savedIds}
              mode={result.mode}
              onSelect={setSelectedId}
              onToggleSaved={toggleSaved}
            />
          </div>
        </div>
      </section>

      {selectedCandidate ? (
        <section className="mx-auto grid w-full max-w-[1480px] gap-4 px-4 py-5 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <CandidateDetail
            candidate={selectedCandidate}
            candidates={candidates}
            result={result}
            tab={detailTab}
            savedIds={savedIds}
            onTabChange={setDetailTab}
            onSelect={setSelectedId}
          />

          <aside className="grid content-start gap-4">
            <section className="rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
              <h2 className="text-sm font-black uppercase text-[#66796e]">Global proof gaps</h2>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#33443c]">
                {result.missingData.slice(0, 6).map((item) => (
                  <li key={item} className="border-l-2 border-[#a46b15] pl-3">{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
              <h2 className="text-sm font-black uppercase text-[#66796e]">Saved shortlist</h2>
              <div className="mt-3 grid gap-2">
                {savedCandidates.length ? savedCandidates.map((candidate) => (
                  <button
                    key={candidate.opportunity.id}
                    type="button"
                    onClick={() => setSelectedId(candidate.opportunity.id)}
                    className="rounded-[4px] border border-[#dce4df] bg-[#fbfcfa] p-3 text-left text-sm font-bold text-[#18241e] hover:border-[#1f6a4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
                  >
                    {candidate.opportunity.title}
                  </button>
                )) : <p className="text-sm text-[#52645b]">No saved properties yet.</p>}
              </div>
            </section>

            <section className="rounded-[6px] border border-[#d5ddd3] bg-[#18241e] p-4 text-white shadow-[0_18px_60px_rgba(21,32,26,0.16)]">
              <h2 className="text-xl font-black">Founding diligence memo</h2>
              <p className="mt-2 text-sm leading-6 text-[#dbe7df]">
                Source-aware triage, verification plan, and human-reviewed memo. No checkout is wired in this pass.
              </p>
              <a
                href="mailto:devinmgallemore@gmail.com?subject=Parcel%20Intelligence%20Founding%20Memo&body=Tell%20me%20your%20market,%20acreage,%20budget,%20use%20case,%20and%20parcel%20links."
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[4px] bg-white px-4 text-sm font-black text-[#18241e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Request memo
              </a>
            </section>
          </aside>
        </section>
      ) : null}

      <section className="border-t border-[#d8e1db] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center justify-between gap-3 text-xs text-[#52645b]">
          <span>Parcel is research support, not brokerage, appraisal, legal, tax, engineering, or investment advice.</span>
          <span>{mustHaves.length ? `Current must-haves: ${mustHaves.slice(0, 3).join(", ")}` : "Add must-haves to sharpen the screen."}</span>
        </div>
      </section>
    </div>
  );
}
