"use client";

import { useMemo, useState, type FormEvent } from "react";
import { parcelOpportunities, type ParcelOpportunity, type ParcelSourceStatus } from "@/data/parcelOpportunities";
import { api } from "@/lib/api";
import {
  buildLocalParcelResearchResult,
  buildParcelResearchRequest,
  defaultParcelThesis,
  driveTimeBands,
  extractListingLinks,
  formatCurrency,
  formatNumber,
  getLocalSuitability,
  getBestCandidate,
  getDriveBand,
  sourceStatusLabels,
  sourceTypeLabels,
  suitabilityCategoryLabels,
  splitList,
  summarizeShortlist,
  type ParcelCandidateSuitability,
  type ParcelResearchResult,
  type ParcelThesisInput,
} from "@/lib/parcel";

type StatusFilter = "all" | ParcelSourceStatus;
type SortKey = "readiness" | "fit" | "risk" | "acreage" | "drive";
type ResearchStatus = "idle" | "loading" | "complete";
type AnalystMessage = { role: "assistant" | "user"; content: string };

const statusStyles: Record<ParcelSourceStatus, string> = {
  live: "border-[#74d7a0] bg-[#163725] text-[#d8ffe7]",
  partial: "border-[#f0c36a] bg-[#3b2d14] text-[#ffe7aa]",
  unknown: "border-[#83b4d8] bg-[#142f40] text-[#d9f1ff]",
  dead: "border-[#e27b68] bg-[#3b1713] text-[#ffd7cf]",
};

const categoryStyles: Record<ParcelCandidateSuitability["category"], string> = {
  strong_fit: "border-[#74d7a0] bg-[#163725] text-[#d8ffe7]",
  conditional_fit: "border-[#f0c36a] bg-[#3b2d14] text-[#ffe7aa]",
  weak_fit: "border-[#83b4d8] bg-[#142f40] text-[#d9f1ff]",
  disqualified: "border-[#e27b68] bg-[#3b1713] text-[#ffd7cf]",
  needs_source_review: "border-[#a9c9bd] bg-[#1b2a27] text-[#e6f2ed]",
};

const initialAnalystMessages: AnalystMessage[] = [
  {
    role: "assistant",
    content:
      "Tell me the project: property use, market, budget, acreage, constraints, and any listing links. I will rank available candidates by suitability, evidence quality, deal-killers, and the next facts to verify.",
  },
];

const workflowCards = [
  {
    title: "Extract project thesis",
    body: "Turn the conversation into use case, geography, acreage, budget, must-haves, constraints, and assumptions.",
  },
  {
    title: "Score suitability",
    body: "Rank available seed candidates against the thesis with source status, fit, readiness, risk, and confidence visible.",
  },
  {
    title: "Find missing facts",
    body: "Expose zoning, access, utilities, wetlands/floodplain, parcel, ownership, and source-chain gaps before reliance.",
  },
  {
    title: "Generate next questions",
    body: "Produce broker and county-record questions, then downstream memo sections for the paid founding review.",
  },
] as const;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sortOpportunities(opportunities: ParcelOpportunity[], sortKey: SortKey) {
  const sorted = [...opportunities];

  if (sortKey === "fit") return sorted.sort((a, b) => b.fitScore - a.fitScore);
  if (sortKey === "risk") return sorted.sort((a, b) => a.riskScore - b.riskScore);
  if (sortKey === "acreage") return sorted.sort((a, b) => b.acreage - a.acreage);
  if (sortKey === "drive") return sorted.sort((a, b) => (a.driveTimeMinutes ?? 999) - (b.driveTimeMinutes ?? 999));

  return sorted.sort((a, b) => b.readinessScore - a.readinessScore);
}

function opportunityMatchesSearch(opportunity: ParcelOpportunity, query: string) {
  if (!query) return true;

  const haystack = [
    opportunity.title,
    opportunity.market,
    opportunity.county,
    opportunity.state,
    opportunity.tier,
    opportunity.rationale,
    opportunity.sourceLabel,
    ...opportunity.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

function researchOrderedCandidates(candidates: ParcelOpportunity[], result?: ParcelResearchResult) {
  if (!result?.rankedCandidateIds?.length) return candidates;
  const rank = new Map(result.rankedCandidateIds.map((id, index) => [id, index]));
  return [...candidates].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
}

function getCandidateSuitability(opportunity: ParcelOpportunity, result?: ParcelResearchResult) {
  return result?.candidateSuitability.find((item) => item.candidateId === opportunity.id) ?? getLocalSuitability(opportunity);
}

function buildAnalystReply(result: ParcelResearchResult) {
  const topId = result.rankedCandidateIds[0];
  const topCandidate = parcelOpportunities.find((item) => item.id === topId);
  const topSuitability = topCandidate ? getCandidateSuitability(topCandidate, result) : result.candidateSuitability[0];
  const category = topSuitability ? suitabilityCategoryLabels[topSuitability.category].toLowerCase() : "candidate review";
  const missing = result.missingData.slice(0, 3).join(", ") || "source verification, parcel facts, zoning, access, and environmental screens";
  const diligence = result.nextDiligence[0] ?? "Confirm source status, parcel boundary, zoning, access, utilities, and environmental constraints.";

  if (!topCandidate || !topSuitability) {
    return "I need at least one candidate before I can rank suitability. Add listing links or use the seed candidates, then run the analyst review again.";
  }

  return `${topCandidate.title} is the current ${category} at ${topSuitability.suitabilityScore}/100. I would not treat that as verified yet: the next missing facts are ${missing}. First diligence step: ${diligence}`;
}

function SourceBadge({ status }: { status: ParcelSourceStatus }) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-8 items-center border px-3 py-1 text-xs font-black uppercase tracking-normal",
        statusStyles[status],
      )}
    >
      {sourceStatusLabels[status]}
    </span>
  );
}

function ScoreChip({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <span className="inline-flex min-h-10 flex-col justify-center border border-[#344f49] bg-[#0d1b18] px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-normal text-[#a9c9bd]">{label}</span>
      <strong className="text-base font-black text-[#f7f0dc]">
        {value}
        <span className="text-xs font-semibold text-[#a9c9bd]">/100</span>
      </strong>
      {note ? <span className="text-xs text-[#a9c9bd]">{note}</span> : null}
    </span>
  );
}

function AnalystChatWorkspace({
  thesis,
  analystPrompt,
  messages,
  researchStatus,
  researchResult,
  candidates,
  selectedOpportunity,
  shortlistIds,
  onPromptChange,
  onSend,
  onSelect,
  onToggleShortlist,
}: {
  thesis: ParcelThesisInput;
  analystPrompt: string;
  messages: AnalystMessage[];
  researchStatus: ResearchStatus;
  researchResult?: ParcelResearchResult;
  candidates: ParcelOpportunity[];
  selectedOpportunity: ParcelOpportunity;
  shortlistIds: string[];
  onPromptChange: (value: string) => void;
  onSend: (prompt: string) => void;
  onSelect: (id: string) => void;
  onToggleShortlist: (id: string) => void;
}) {
  const fallbackResult = useMemo(
    () => buildLocalParcelResearchResult(thesis, candidates.length ? candidates.slice(0, 4) : parcelOpportunities.slice(0, 4)),
    [candidates, thesis],
  );
  const result = researchResult ?? fallbackResult;
  const rankedCandidates = researchOrderedCandidates(candidates.length ? candidates : parcelOpportunities, result).slice(0, 4);
  const selectedSuitability = getCandidateSuitability(selectedOpportunity, result);
  const topCandidate = rankedCandidates[0] ?? selectedOpportunity;
  const topSuitability = getCandidateSuitability(topCandidate, result);
  const liveSourceCount = candidates.filter((candidate) => candidate.sourceStatus === "live").length;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSend(analystPrompt);
  }

  return (
    <section id="parcel-analyst" className="border-b border-[#263b35] bg-[linear-gradient(180deg,#07100e_0%,#0d1916_70%,#101916_100%)]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.7fr)] lg:px-8">
        <article className="grid min-h-[560px] gap-5 border border-[#334a42] bg-[#0b1512] p-5">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Parcel AI Analyst</p>
            <h1 className="mt-2 text-4xl font-black leading-tight text-[#fff5d8] md:text-6xl">
              Which properties fit this project?
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
              Describe an RV park, self-storage site, church campus, equestrian facility, industrial outdoor storage yard, or another real estate thesis. Parcel ranks suitable available candidates, explains why, and shows what must be verified next.
            </p>
          </div>

          <div className="grid max-h-[360px] content-start gap-3 overflow-y-auto pr-1" aria-live="polite" aria-label="Parcel analyst conversation">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={classNames(
                  "max-w-[92%] border px-4 py-3 text-sm leading-6",
                  message.role === "assistant"
                    ? "justify-self-start border-[#36524a] bg-[#101d19] text-[#dbe9df]"
                    : "justify-self-end border-[#6f5b2f] bg-[#1c1913] text-[#fff5d8]",
                )}
              >
                <span className="mb-1 block text-xs font-black uppercase tracking-normal text-[#d7b76d]">
                  {message.role === "assistant" ? "Parcel" : "You"}
                </span>
                {message.content}
              </div>
            ))}
          </div>

          <form className="mt-auto grid gap-3" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-analyst-prompt">
              Project question, constraints, or listing links
              <textarea
                id="parcel-analyst-prompt"
                rows={5}
                value={analystPrompt}
                onChange={(event) => onPromptChange(event.target.value)}
                placeholder="Example: Which 75-200 acre properties near Charlotte are suitable for an equestrian events facility under $5M, with road frontage and low entitlement risk?"
                className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] placeholder:text-[#71877f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={researchStatus === "loading"}
                className="inline-flex min-h-12 items-center justify-center border border-[#e4c46f] bg-[#e4c46f] px-5 py-3 text-sm font-black text-[#111714] transition hover:bg-[#f1d985] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              >
                {researchStatus === "loading" ? "Analyzing..." : "Ask Parcel Analyst"}
              </button>
              <a
                href="#thesis-intake"
                className="inline-flex min-h-12 items-center justify-center border border-[#5d746b] px-5 py-3 text-sm font-black text-[#f7f0dc] transition hover:border-[#e4c46f] hover:bg-[#13231e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              >
                Edit project brief
              </a>
            </div>
            <p className="text-xs leading-5 text-[#a9c9bd]">
              V1 analyzes committed seed listings and user-pasted URLs as unverified context. It does not scrape live listing sites or make verified-deal claims.
            </p>
          </form>
        </article>

        <aside className="grid content-start gap-4 border border-[#334a42] bg-[#0c1714] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Suitability workspace</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-[#fff5d8]">
                {researchResult?.mode === "ai" ? "AI-assisted analysis" : "Deterministic analyst preview"}
              </h2>
            </div>
            <span className="border border-[#2f756d] px-3 py-1 text-xs font-black uppercase tracking-normal text-[#a8efe3]">
              {result.mode}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[#263b35] p-4">
              <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Top fit</span>
              <strong className="text-2xl font-black text-[#fff5d8]">{topSuitability.suitabilityScore}</strong>
              <span className="ml-1 text-xs text-[#a9c9bd]">/100</span>
              <p className="mt-1 text-xs font-bold text-[#d7b76d]">{suitabilityCategoryLabels[topSuitability.category]}</p>
            </div>
            <div className="border border-[#263b35] p-4">
              <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Source checked</span>
              <strong className="text-2xl font-black text-[#fff5d8]">{liveSourceCount}</strong>
              <span className="ml-1 text-xs text-[#a9c9bd]">candidate(s)</span>
            </div>
            <div className="border border-[#263b35] p-4">
              <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Missing data</span>
              <strong className="text-2xl font-black text-[#fff5d8]">{result.missingData.length}</strong>
              <span className="ml-1 text-xs text-[#a9c9bd]">items</span>
            </div>
            <div className="border border-[#263b35] p-4">
              <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Shortlist</span>
              <strong className="text-2xl font-black text-[#fff5d8]">{shortlistIds.length}</strong>
              <span className="ml-1 text-xs text-[#a9c9bd]">selected</span>
            </div>
          </div>

          <div className="border border-[#314941] bg-[#101d19] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-[#d7b76d]">Selected candidate</p>
                <h3 className="mt-1 text-xl font-black leading-tight text-[#fff5d8]">{selectedOpportunity.title}</h3>
              </div>
              <span className={classNames("inline-flex border px-3 py-1 text-xs font-black", categoryStyles[selectedSuitability.category])}>
                {suitabilityCategoryLabels[selectedSuitability.category]}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Suitability</dt>
                <dd className="text-sm font-bold text-[#f7f0dc]">{selectedSuitability.suitabilityScore}/100</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Drive</dt>
                <dd className="text-sm font-bold text-[#f7f0dc]">{selectedOpportunity.distanceLabel ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Source</dt>
                <dd className="text-sm font-bold text-[#f7f0dc]">{sourceStatusLabels[selectedOpportunity.sourceStatus]}</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-6 text-[#c7d2ca]">{selectedSuitability.reasons[0]}</p>
            {selectedSuitability.dealKillers.length ? (
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#d8caa8]">
                {selectedSuitability.dealKillers.slice(0, 2).map((item) => (
                  <li key={item} className="border-l border-[#c98257] pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              aria-pressed={shortlistIds.includes(selectedOpportunity.id)}
              onClick={() => onToggleShortlist(selectedOpportunity.id)}
              className={classNames(
                "mt-4 inline-flex min-h-10 items-center justify-center border px-4 py-2 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]",
                shortlistIds.includes(selectedOpportunity.id)
                  ? "border-[#e4c46f] bg-[#e4c46f] text-[#111714]"
                  : "border-[#e4c46f] bg-transparent text-[#f7f0dc] hover:bg-[#1e2c24]",
              )}
            >
              {shortlistIds.includes(selectedOpportunity.id) ? "Shortlisted" : "Shortlist"}
            </button>
          </div>

          <div className="grid gap-2" aria-label="Ranked suitability candidates">
            {rankedCandidates.map((candidate) => {
              const suitability = getCandidateSuitability(candidate, result);
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => onSelect(candidate.id)}
                  className={classNames(
                    "grid gap-1 border p-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]",
                    selectedOpportunity.id === candidate.id
                      ? "border-[#e4c46f] bg-[#1c1913]"
                      : "border-[#334a42] bg-[#0c1714] hover:border-[#6f806f]",
                  )}
                >
                  <span className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-normal text-[#d7b76d]">
                    <span>{suitabilityCategoryLabels[suitability.category]}</span>
                    <span>{suitability.suitabilityScore}/100</span>
                  </span>
                  <strong className="text-sm leading-tight text-[#fff5d8]">{candidate.title}</strong>
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#2c453d] pt-4">
            <h3 className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Agent tools used</h3>
            <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#c7d2ca]">
              {result.toolEvents.slice(0, 5).map((tool) => (
                <li key={tool.toolName} className="border-l border-[#2f756d] pl-3">
                  <strong className="text-[#f7f0dc]">{tool.toolName.replaceAll("_", " ")}:</strong> {tool.summary}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ParcelMapBoard({
  opportunities,
  selectedId,
  shortlistIds,
  onSelect,
  onToggleShortlist,
}: {
  opportunities: ParcelOpportunity[];
  selectedId: string;
  shortlistIds: string[];
  onSelect: (id: string) => void;
  onToggleShortlist: (id: string) => void;
}) {
  const selected = opportunities.find((item) => item.id === selectedId) ?? parcelOpportunities.find((item) => item.id === selectedId) ?? opportunities[0];

  return (
    <section id="regional-map" className="border-y border-[#263b35] bg-[#111613] py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Regional view</p>
            <h2 className="mt-2 font-serif text-4xl font-black leading-none text-[#fff5d8] md:text-6xl">
              50+ Acre Source-Checked Map
            </h2>
          </div>
          <p className="text-base leading-7 text-[#c7d2ca]">
            Pins and cards are research aids with source links, verification status, and next diligence attached to each candidate.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="parcel-map-board" aria-label="Charlotte-region parcel candidates">
            <div className="parcel-map-rings" aria-hidden="true" />
            <div className="parcel-map-road parcel-map-road-one" aria-hidden="true" />
            <div className="parcel-map-road parcel-map-road-two" aria-hidden="true" />
            <div className="parcel-map-road parcel-map-road-three" aria-hidden="true" />
            <div className="parcel-map-center" style={{ left: "54%", top: "58%" }} aria-hidden="true">
              CLT
            </div>
            {opportunities.map((opportunity) => {
              const shortlisted = shortlistIds.includes(opportunity.id);
              const selectedPin = selectedId === opportunity.id;
              return (
                <button
                  key={opportunity.id}
                  type="button"
                  aria-pressed={selectedPin}
                  aria-label={`${opportunity.title}, ${opportunity.distanceLabel}, ${sourceStatusLabels[opportunity.sourceStatus]}`}
                  onClick={() => onSelect(opportunity.id)}
                  className={classNames(
                    "parcel-map-pin",
                    shortlisted && "parcel-map-pin--shortlisted",
                    selectedPin && "parcel-map-pin--selected",
                  )}
                  style={{ left: `${opportunity.mapX ?? 50}%`, top: `${opportunity.mapY ?? 50}%` }}
                >
                  <span />
                </button>
              );
            })}
            <div className="parcel-map-legend">
              <span><i className="parcel-legend-dot parcel-legend-dot--shortlisted" /> Shortlisted</span>
              <span><i className="parcel-legend-dot" /> Active research</span>
              <span><i className="parcel-legend-ring" /> Charlotte reference</span>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="border border-[#334a42] bg-[#0c1714] p-5">
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Drive-time lens</p>
              <h3 className="mt-2 text-2xl font-black text-[#fff5d8]">From Uptown Charlotte</h3>
            </div>
            {driveTimeBands.map((band) => (
              <div
                key={band.id}
                className={classNames(
                  "border p-5",
                  band.id === "destination" ? "border-[#6f5b2f] bg-[#1c1913]" : "border-[#334a42] bg-[#0c1714]",
                )}
              >
                <span className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">{band.label}</span>
                <strong className="mt-2 block text-lg font-black text-[#fff5d8]">{band.title}</strong>
                <p className="mt-2 text-sm leading-6 text-[#c7d2ca]">{band.description}</p>
              </div>
            ))}
          </aside>
        </div>

        {selected ? (
          <div className="grid gap-4 border border-[#334a42] bg-[#0c1714] p-5 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Selected candidate</p>
              <h3 className="mt-2 text-2xl font-black leading-tight text-[#fff5d8]">{selected.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#c7d2ca]">{selected.market}</p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Drive band</dt>
                <dd className="text-sm font-bold text-[#f7f0dc]">{getDriveBand(selected).label}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Source</dt>
                <dd className="text-sm font-bold text-[#f7f0dc]">{selected.sourceLabel ?? sourceTypeLabels[selected.sourceType]}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Last researched</dt>
                <dd className="text-sm font-bold text-[#f7f0dc]">{selected.lastResearched ?? "Not recorded"}</dd>
              </div>
            </dl>
            <button
              type="button"
              aria-pressed={shortlistIds.includes(selected.id)}
              onClick={() => onToggleShortlist(selected.id)}
              className={classNames(
                "inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]",
                shortlistIds.includes(selected.id)
                  ? "border-[#e4c46f] bg-[#e4c46f] text-[#111714]"
                  : "border-[#e4c46f] bg-transparent text-[#f7f0dc] hover:bg-[#1e2c24]",
              )}
            >
              {shortlistIds.includes(selected.id) ? "Shortlisted" : "Shortlist"}
            </button>
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3" aria-label="Keyboard candidate selector">
          {opportunities.map((opportunity) => (
            <button
              key={opportunity.id}
              type="button"
              onClick={() => onSelect(opportunity.id)}
              className={classNames(
                "border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]",
                selectedId === opportunity.id
                  ? "border-[#e4c46f] bg-[#1c1913]"
                  : "border-[#334a42] bg-[#0c1714] hover:border-[#6f806f]",
              )}
            >
              <span className="text-xs font-black uppercase tracking-normal text-[#d7b76d]">{opportunity.distanceLabel}</span>
              <strong className="mt-1 block text-base font-black text-[#fff5d8]">{opportunity.title}</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThesisIntake({
  thesis,
  listingLinks,
  researchStatus,
  researchResult,
  onChange,
  onRunResearch,
}: {
  thesis: ParcelThesisInput;
  listingLinks: string[];
  researchStatus: ResearchStatus;
  researchResult?: ParcelResearchResult;
  onChange: (field: keyof ParcelThesisInput, value: string) => void;
  onRunResearch: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRunResearch();
  }

  return (
    <section id="thesis-intake" className="border-y border-[#263b35] bg-[#0b1311] py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <form className="grid gap-5" aria-describedby="intake-help" onSubmit={submit}>
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Project brief</p>
            <h2 className="mt-2 font-serif text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">
              Tune the analyst inputs.
            </h2>
            <p id="intake-help" className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
              The analyst chat uses this brief, selected candidates, and pasted links to produce source-aware suitability analysis.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-use-case">
              Use case / thesis type
              <input
                id="parcel-use-case"
                value={thesis.useCase}
                onChange={(event) => onChange("useCase", event.target.value)}
                className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-market">
              Target market / geography
              <input
                id="parcel-market"
                value={thesis.market}
                onChange={(event) => onChange("market", event.target.value)}
                className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-acreage-range">
              Acreage range
              <input
                id="parcel-acreage-range"
                value={thesis.acreageRange}
                onChange={(event) => onChange("acreageRange", event.target.value)}
                className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-budget">
              Budget range
              <input
                id="parcel-budget"
                value={thesis.budget}
                onChange={(event) => onChange("budget", event.target.value)}
                className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-must-haves">
              Must-haves
              <textarea
                id="parcel-must-haves"
                rows={4}
                value={thesis.mustHaves}
                onChange={(event) => onChange("mustHaves", event.target.value)}
                className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-risk-factors">
              Risk factors
              <textarea
                id="parcel-risk-factors"
                rows={4}
                value={thesis.riskFactors}
                onChange={(event) => onChange("riskFactors", event.target.value)}
                className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-notes">
            Notes
            <textarea
              id="parcel-notes"
              rows={4}
              value={thesis.notes}
              onChange={(event) => onChange("notes", event.target.value)}
              className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-links">
            Optional parcel or listing links
            <textarea
              id="parcel-links"
              rows={3}
              value={thesis.listingLinks}
              onChange={(event) => onChange("listingLinks", event.target.value)}
              placeholder="Paste one URL per line or comma-separated."
              className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] placeholder:text-[#7c8e86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
            />
          </label>

          <button
            type="submit"
            disabled={researchStatus === "loading"}
            className="inline-flex min-h-12 w-fit items-center justify-center border border-[#e4c46f] bg-[#e4c46f] px-5 py-3 text-sm font-black text-[#111714] transition hover:bg-[#f1d985] disabled:cursor-wait disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
          >
            {researchStatus === "loading" ? "Running research synthesis" : "Run research synthesis"}
          </button>
        </form>

        <aside className="grid content-start gap-4 border border-[#334a42] bg-[#101d19] p-5">
          <h3 className="text-2xl font-black text-[#fff5d8]">Intake snapshot</h3>
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="font-semibold uppercase tracking-normal text-[#8fa69c]">Market</dt>
              <dd className="text-[#f0e7d1]">{thesis.market || "Not set"}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-normal text-[#8fa69c]">Acreage</dt>
              <dd className="text-[#f0e7d1]">{thesis.acreageRange || "Not set"}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-normal text-[#8fa69c]">User links</dt>
              <dd className="text-[#f0e7d1]">
                {listingLinks.length ? `${listingLinks.length} link${listingLinks.length === 1 ? "" : "s"} entered` : "Demo data only"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-normal text-[#8fa69c]">Research mode</dt>
              <dd className="text-[#f0e7d1]">{researchResult?.mode ?? "Not run"}</dd>
            </div>
          </dl>
          <p className="border-t border-[#2c453d] pt-4 text-sm leading-6 text-[#c7d2ca]">
            The founding memo gate is manual tonight: customers request a paid human-reviewed diligence memo after using the preview.
          </p>
        </aside>
      </div>
    </section>
  );
}

function ResearchResultPanel({ result }: { result?: ParcelResearchResult }) {
  if (!result) return null;

  return (
    <section className="bg-[#101916] py-8" aria-labelledby="research-output">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Backend research output</p>
          <h2 id="research-output" className="mt-2 font-serif text-3xl font-black leading-tight text-[#fff5d8] md:text-4xl">
            {result.mode === "ai" ? "AI synthesis returned" : "Fallback synthesis returned"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">{result.memo.sourceReadiness}</p>
        </div>
        <div className="grid gap-4">
          <div className="border border-[#334a42] bg-[#0c1714] p-5">
            <h3 className="text-xl font-black text-[#fff5d8]">Warnings</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
              {result.warnings.slice(0, 4).map((warning) => (
                <li key={warning} className="border-l border-[#c98257] pl-3">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-[#334a42] bg-[#0c1714] p-5">
            <h3 className="text-xl font-black text-[#fff5d8]">Suitability outputs</h3>
            <div className="mt-3 grid gap-3">
              {result.candidateSuitability.slice(0, 4).map((item) => {
                const opportunity = parcelOpportunities.find((candidate) => candidate.id === item.candidateId);
                return (
                  <div key={item.candidateId} className="border-l border-[#d7b76d] pl-3">
                    <strong className="block text-sm text-[#f7f0dc]">
                      {opportunity?.title ?? item.candidateId}: {suitabilityCategoryLabels[item.category]} ({item.suitabilityScore}/100)
                    </strong>
                    <span className="text-sm leading-6 text-[#c7d2ca]">{item.nextQuestions[0] ?? item.reasons[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="border border-[#334a42] bg-[#0c1714] p-5">
            <h3 className="text-xl font-black text-[#fff5d8]">Tool trace</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
              {result.toolEvents.slice(0, 6).map((tool) => (
                <li key={tool.toolName} className="border-l border-[#2f756d] pl-3">
                  <strong className="text-[#f7f0dc]">{tool.toolName.replaceAll("_", " ")}:</strong> {tool.summary}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-[#334a42] bg-[#0c1714] p-5">
            <h3 className="text-xl font-black text-[#fff5d8]">Source audit</h3>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
              {result.sourceAudit.slice(0, 5).map((source, index) => (
                <li key={`${source.title}-${index}`} className="border-l border-[#2f756d] pl-3">
                  <strong className="text-[#f7f0dc]">{source.title}:</strong> {source.note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function OpportunityCard({
  opportunity,
  shortlisted,
  selected,
  onSelect,
  onToggleShortlist,
}: {
  opportunity: ParcelOpportunity;
  shortlisted: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleShortlist: (id: string) => void;
}) {
  return (
    <article
      className={classNames(
        "grid gap-5 border bg-[#0c1714] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
        selected ? "border-[#e4c46f]" : "border-[#314941]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-bold uppercase tracking-normal text-[#d7b76d]">{opportunity.market}</p>
          <h3 className="text-2xl font-black leading-tight text-[#fff5d8]">{opportunity.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#b9c8bf]">
            {[opportunity.county, opportunity.state].filter(Boolean).join(", ")}
          </p>
        </div>
        <SourceBadge status={opportunity.sourceStatus} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Acres</span>
          <strong className="block text-lg text-[#f7f0dc]">{formatNumber(opportunity.acreage, 1)}</strong>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Price</span>
          <strong className="block text-lg text-[#f7f0dc]">{formatCurrency(opportunity.price)}</strong>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Price / acre</span>
          <strong className="block text-lg text-[#f7f0dc]">{formatCurrency(opportunity.pricePerAcre)}</strong>
        </div>
        <div>
          <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">From CLT</span>
          <strong className="block text-lg text-[#f7f0dc]">{opportunity.distanceLabel ?? "Unknown"}</strong>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Tier</span>
          <strong className="text-base text-[#fff5d8]">{opportunity.tier}</strong>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScoreChip label="Fit" value={opportunity.fitScore} />
          <ScoreChip label="Risk" value={opportunity.riskScore} note="lower is better" />
          <ScoreChip label="Readiness" value={opportunity.readinessScore} />
          <ScoreChip label="Confidence" value={opportunity.dataConfidence} />
        </div>
      </div>

      <p className="text-base leading-7 text-[#e5ddc8]">{opportunity.rationale}</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h4 className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Diligence concerns</h4>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c8d3cc]">
            {opportunity.diligenceConcerns.map((concern) => (
              <li key={concern} className="border-l border-[#6f5b2f] pl-3">
                {concern}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Next diligence</h4>
          <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c8d3cc]">
            {opportunity.nextDiligence.map((step) => (
              <li key={step} className="border-l border-[#2f756d] pl-3">
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-3 border-t border-[#253b35] pt-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-sm leading-6 text-[#aebdb6]">
          <strong className="text-[#f7f0dc]">Source:</strong> {opportunity.sourceLabel ?? sourceTypeLabels[opportunity.sourceType]}.{" "}
          {opportunity.sourceVerification}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onSelect(opportunity.id)}
            className="inline-flex min-h-11 items-center justify-center border border-[#72887c] px-4 py-2 text-sm font-black text-[#f7f0dc] transition hover:border-[#e4c46f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
          >
            Select
          </button>
          {opportunity.sourceUrl ? (
            <a
              href={opportunity.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center border border-[#72887c] px-4 py-2 text-sm font-black text-[#f7f0dc] transition hover:border-[#e4c46f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
            >
              Open source
            </a>
          ) : null}
          <button
            type="button"
            aria-pressed={shortlisted}
            aria-label={`${shortlisted ? "Remove" : "Add"} ${opportunity.title} ${shortlisted ? "from" : "to"} shortlist`}
            onClick={() => onToggleShortlist(opportunity.id)}
            className={classNames(
              "inline-flex min-h-11 items-center justify-center border px-4 py-2 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]",
              shortlisted
                ? "border-[#e4c46f] bg-[#e4c46f] text-[#111714]"
                : "border-[#e4c46f] bg-transparent text-[#f7f0dc] hover:bg-[#1e2c24]",
            )}
          >
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
        </div>
      </div>
    </article>
  );
}

function ShortlistComparison({ opportunities }: { opportunities: ParcelOpportunity[] }) {
  const best = opportunities.length ? getBestCandidate(opportunities) : undefined;

  return (
    <section id="shortlist" className="border-y border-[#263b35] bg-[#0b1311] py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Shortlist comparison</p>
          <h2 className="mt-2 font-serif text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">
            Compare candidates before momentum takes over.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">{summarizeShortlist(opportunities)}</p>
        </div>
        <aside className="border border-[#334a42] bg-[#111f1b] p-5">
          <h3 className="text-xl font-black text-[#fff5d8]">Best-fit summary</h3>
          {best ? (
            <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">
              {best.title} currently leads because it balances fit ({best.fitScore}/100), readiness ({best.readinessScore}
              /100), and a risk index of {best.riskScore}/100. This is a research ranking, not a purchase recommendation.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">
              Add candidates from the opportunity cards to build the comparison table and memo preview.
            </p>
          )}
        </aside>
      </div>

      <div className="mx-auto mt-7 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {opportunities.length ? (
          <div className="overflow-x-auto border border-[#334a42] bg-[#0c1714]">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="bg-[#15251f] text-xs uppercase tracking-normal text-[#d7b76d]">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Acres</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Fit</th>
                  <th className="px-4 py-3">Risk</th>
                  <th className="px-4 py-3">Readiness</th>
                  <th className="px-4 py-3">Missing data</th>
                  <th className="px-4 py-3">Next question</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opportunity) => (
                  <tr key={opportunity.id} className="border-t border-[#263b35] text-[#e5ddc8]">
                    <td className="px-4 py-4 font-bold text-[#fff5d8]">{opportunity.title}</td>
                    <td className="px-4 py-4">{opportunity.tier}</td>
                    <td className="px-4 py-4">{formatNumber(opportunity.acreage, 1)}</td>
                    <td className="px-4 py-4">{formatCurrency(opportunity.price)}</td>
                    <td className="px-4 py-4">{opportunity.fitScore}</td>
                    <td className="px-4 py-4">{opportunity.riskScore}</td>
                    <td className="px-4 py-4">{opportunity.readinessScore}</td>
                    <td className="px-4 py-4">{opportunity.missingData.join(", ")}</td>
                    <td className="px-4 py-4">{opportunity.nextDiligence[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="border border-dashed border-[#52675d] bg-[#0c1714] p-5 text-[#c7d2ca]">
            No shortlisted opportunities yet. Use the shortlist buttons on opportunity cards to build the comparison.
          </div>
        )}
      </div>
    </section>
  );
}

function MemoPreview({
  thesis,
  candidates,
  researchResult,
}: {
  thesis: ParcelThesisInput;
  candidates: ParcelOpportunity[];
  researchResult?: ParcelResearchResult;
}) {
  const ordered = researchOrderedCandidates(candidates, researchResult).slice(0, 3);
  const fallbackResult = useMemo(() => buildLocalParcelResearchResult(thesis, ordered.length ? ordered : parcelOpportunities.slice(0, 2)), [ordered, thesis]);
  const result = researchResult ?? fallbackResult;
  const mustHaves = splitList(thesis.mustHaves);

  return (
    <section id="memo-preview" className="bg-[#101916] py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Customer deliverable</p>
          <h2 className="mt-2 font-serif text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">
            Source-aware diligence memo preview.
          </h2>
          <p className="mt-4 text-base leading-7 text-[#c7d2ca]">
            The customer gets a ranked candidate readout, source status, missing data, diligence plan, and a manual path to a paid founding memo.
          </p>
        </div>

        <article className="grid gap-5 border border-[#3a5149] bg-[#0c1714] p-5">
          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Executive summary</h3>
            <p className="mt-2 text-sm leading-6 text-[#c7d2ca]">{result.memo.executiveSummary}</p>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Thesis</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Use case</dt>
                <dd className="text-sm text-[#f0e7d1]">{result.normalizedThesis.useCase}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Market</dt>
                <dd className="text-sm text-[#f0e7d1]">{result.normalizedThesis.market}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Acreage</dt>
                <dd className="text-sm text-[#f0e7d1]">{result.normalizedThesis.acreageRange}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Budget</dt>
                <dd className="text-sm text-[#f0e7d1]">{result.normalizedThesis.budget}</dd>
              </div>
            </dl>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Ranked candidates</h3>
            <div className="mt-3 grid gap-3">
              {ordered.map((candidate) => (
                <div key={candidate.id} className="border-l border-[#d7b76d] pl-4">
                  <strong className="block text-[#fff5d8]">{candidate.title}</strong>
                  <span className="text-sm text-[#c7d2ca]">
                    Fit {candidate.fitScore}/100, risk {candidate.riskScore}/100, readiness {candidate.readinessScore}/100, source{" "}
                    {sourceStatusLabels[candidate.sourceStatus].toLowerCase()}.
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-black text-[#fff5d8]">Missing data</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
                {result.missingData.slice(0, 6).map((item) => (
                  <li key={item} className="border-l border-[#c98257] pl-3">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-black text-[#fff5d8]">Next diligence</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
                {(result.memo.diligencePlan.length ? result.memo.diligencePlan : result.nextDiligence).slice(0, 6).map((step) => (
                  <li key={step} className="border-l border-[#2f756d] pl-3">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Paid founding memo scope</h3>
            <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
              {result.memo.paidMemoScope.map((item) => (
                <li key={item} className="border-l border-[#d7b76d] pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <p className="border-t border-[#2c453d] pt-4 text-sm leading-6 text-[#d8caa8]">
            Parcel Intelligence is a research workflow only. It is not brokerage, appraisal, legal, tax, engineering, or investment advice. Target thesis must-haves:{" "}
            {mustHaves.length ? mustHaves.join(", ") : "not specified"}.
          </p>
        </article>
      </div>
    </section>
  );
}

export function ParcelIntelligencePage() {
  const [thesis, setThesis] = useState<ParcelThesisInput>(defaultParcelThesis);
  const [search, setSearch] = useState("");
  const [minAcreage, setMinAcreage] = useState(50);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("readiness");
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [selectedId, setSelectedId] = useState("york-kays-drive");
  const [shortlistIds, setShortlistIds] = useState<string[]>(["york-kays-drive", "chester-humpback-bridge"]);
  const [shortlistNotice, setShortlistNotice] = useState("Two source-checked candidates are pre-shortlisted for comparison.");
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>("idle");
  const [researchResult, setResearchResult] = useState<ParcelResearchResult | undefined>();
  const [analystPrompt, setAnalystPrompt] = useState(
    "Which 50-300 acre properties near Charlotte are suitable for an equestrian events facility under $5M, with road frontage, utility path, defensible access, and manageable entitlement risk?",
  );
  const [analystMessages, setAnalystMessages] = useState<AnalystMessage[]>(initialAnalystMessages);

  const shortlisted = useMemo(
    () => parcelOpportunities.filter((opportunity) => shortlistIds.includes(opportunity.id)),
    [shortlistIds],
  );

  const visibleOpportunities = useMemo(() => {
    const filtered = parcelOpportunities.filter((opportunity) => {
      const acreageMatch = opportunity.acreage >= minAcreage;
      const statusMatch = statusFilter === "all" || opportunity.sourceStatus === statusFilter;
      const shortlistMatch = !shortlistOnly || shortlistIds.includes(opportunity.id);
      return acreageMatch && statusMatch && shortlistMatch && opportunityMatchesSearch(opportunity, search);
    });

    return sortOpportunities(filtered, sortKey);
  }, [minAcreage, search, shortlistIds, shortlistOnly, sortKey, statusFilter]);

  const selectedOpportunity = parcelOpportunities.find((item) => item.id === selectedId) ?? parcelOpportunities[0];
  const listingLinks = extractListingLinks(thesis.listingLinks);
  const memoCandidates = shortlisted.length ? shortlisted : visibleOpportunities.length ? visibleOpportunities.slice(0, 3) : parcelOpportunities.slice(0, 3);

  function updateThesis(field: keyof ParcelThesisInput, value: string) {
    setThesis((current) => ({ ...current, [field]: value }));
  }

  function toggleShortlist(id: string) {
    setShortlistIds((current) => {
      const alreadyShortlisted = current.includes(id);
      const opportunity = parcelOpportunities.find((item) => item.id === id);
      const next = alreadyShortlisted ? current.filter((item) => item !== id) : [...current, id];
      setShortlistNotice(
        opportunity
          ? `${opportunity.title} ${alreadyShortlisted ? "removed from" : "added to"} shortlist.`
          : "Shortlist updated.",
      );
      return next;
    });
  }

  async function runResearch(promptOverride = analystPrompt) {
    setResearchStatus("loading");
    const promptText = promptOverride.trim();
    const requestThesis = promptText
      ? {
          ...thesis,
          notes: `${thesis.notes}\n\nAnalyst chat request: ${promptText}`.trim(),
          listingLinks: [thesis.listingLinks, promptText].filter(Boolean).join("\n"),
        }
      : thesis;
    const request = buildParcelResearchRequest(requestThesis, [selectedId], shortlistIds);
    try {
      const result = await api.parcelResearch(request);
      setResearchResult(result);
      setAnalystMessages((current) => [
        ...current,
        { role: "user", content: promptText || "Run suitability analysis using the current project brief." },
        { role: "assistant", content: buildAnalystReply(result) },
      ]);
    } catch (error) {
      const fallback = buildLocalParcelResearchResult(requestThesis, memoCandidates);
      const message = error instanceof Error ? error.message : "Backend request failed.";
      const result = {
        ...fallback,
        warnings: [`Backend research endpoint was unavailable, so local fallback was used: ${message}`, ...fallback.warnings],
      };
      setResearchResult(result);
      setAnalystMessages((current) => [
        ...current,
        { role: "user", content: promptText || "Run suitability analysis using the current project brief." },
        { role: "assistant", content: buildAnalystReply(result) },
      ]);
    } finally {
      setResearchStatus("complete");
    }
  }

  return (
    <div className="min-h-dvh bg-[#07100e] text-[#f7f0dc]">
      <AnalystChatWorkspace
        thesis={thesis}
        analystPrompt={analystPrompt}
        messages={analystMessages}
        researchStatus={researchStatus}
        researchResult={researchResult}
        candidates={visibleOpportunities.length ? visibleOpportunities : parcelOpportunities}
        selectedOpportunity={selectedOpportunity}
        shortlistIds={shortlistIds}
        onPromptChange={setAnalystPrompt}
        onSend={runResearch}
        onSelect={setSelectedId}
        onToggleShortlist={toggleShortlist}
      />

      <section className="bg-[#101916] py-10" aria-labelledby="what-parcel-does">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Workflow</p>
            <h2 id="what-parcel-does" className="mt-2 font-serif text-3xl font-black leading-tight text-[#fff5d8] md:text-4xl">
              Chat to suitability, with source quality in the open.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowCards.map((card) => (
              <article key={card.title} className="border border-[#314941] bg-[#0c1714] p-5">
                <h3 className="text-xl font-black text-[#fff5d8]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ParcelMapBoard
        opportunities={visibleOpportunities.length ? visibleOpportunities : parcelOpportunities}
        selectedId={selectedOpportunity.id}
        shortlistIds={shortlistIds}
        onSelect={setSelectedId}
        onToggleShortlist={toggleShortlist}
      />

      <ThesisIntake
        thesis={thesis}
        listingLinks={listingLinks}
        researchStatus={researchStatus}
        researchResult={researchResult}
        onChange={updateThesis}
        onRunResearch={runResearch}
      />

      <ResearchResultPanel result={researchResult} />

      <section id="opportunities" className="bg-[#101916] py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Opportunities</p>
              <h2 className="mt-2 font-serif text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">
                Candidate cards, source status first.
              </h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
                Weak, missing, and stale facts stay visible so a candidate cannot outrun its evidence.
              </p>
            </div>
            <p className="text-sm leading-6 text-[#d8caa8]" aria-live="polite">
              {shortlistNotice}
            </p>
          </div>

          <div className="grid gap-3 border border-[#334a42] bg-[#0c1714] p-4 lg:grid-cols-[minmax(220px,1.2fr)_160px_180px_180px_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-search">
              Search
              <input
                id="parcel-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-h-11 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-min-acreage">
              Min acres
              <input
                id="parcel-min-acreage"
                type="number"
                min={0}
                value={minAcreage}
                onChange={(event) => setMinAcreage(Number(event.target.value) || 0)}
                className="min-h-11 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-source-status">
              Source status
              <select
                id="parcel-source-status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="min-h-11 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              >
                <option value="all">All statuses</option>
                <option value="live">Live link present</option>
                <option value="partial">Partial source</option>
                <option value="unknown">Unknown source</option>
                <option value="dead">Dead or stale source</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-sort">
              Sort
              <select
                id="parcel-sort"
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="min-h-11 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              >
                <option value="readiness">Readiness high to low</option>
                <option value="fit">Fit high to low</option>
                <option value="risk">Risk low to high</option>
                <option value="acreage">Acreage high to low</option>
                <option value="drive">Drive time low to high</option>
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-3 border border-[#415a52] px-3 py-2 text-sm font-bold text-[#e5ddc8]">
              <input
                type="checkbox"
                checked={shortlistOnly}
                onChange={(event) => setShortlistOnly(event.target.checked)}
                className="h-5 w-5 accent-[#e4c46f]"
              />
              Shortlist only
            </label>
          </div>

          <div className="grid gap-5">
            {visibleOpportunities.length ? (
              visibleOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  shortlisted={shortlistIds.includes(opportunity.id)}
                  selected={selectedId === opportunity.id}
                  onSelect={setSelectedId}
                  onToggleShortlist={toggleShortlist}
                />
              ))
            ) : (
              <div className="border border-dashed border-[#52675d] bg-[#0c1714] p-5 text-[#c7d2ca]">
                No opportunities match the current filters. Clear search, lower the acreage minimum, or show all source statuses.
              </div>
            )}
          </div>
        </div>
      </section>

      <ShortlistComparison opportunities={shortlisted} />
      <MemoPreview thesis={thesis} candidates={memoCandidates} researchResult={researchResult} />

      <section className="border-t border-[#263b35] bg-[#07100e] py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Manual paid gate</p>
            <h2 className="mt-2 font-serif text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">
              Request a founding diligence memo.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
              Send the market, acreage, budget, use case, and parcel links. Checkout is not live tonight; the paid memo starts as a direct founding review.
            </p>
          </div>
          <a
            href="mailto:devinmgallemore@gmail.com?subject=Parcel%20Intelligence%20Founding%20Memo&body=Tell%20me%20your%20market,%20acreage,%20budget,%20use%20case,%20and%20parcel%20links."
            className="inline-flex min-h-12 items-center justify-center border border-[#e4c46f] bg-[#e4c46f] px-5 py-3 text-sm font-black text-[#111714] transition hover:bg-[#f1d985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
          >
            Request founding memo
          </a>
        </div>
      </section>
    </div>
  );
}
