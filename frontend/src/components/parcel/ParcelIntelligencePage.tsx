"use client";

import { useMemo, useState } from "react";
import { parcelOpportunities, type ParcelOpportunity, type ParcelSourceStatus } from "@/data/parcelOpportunities";
import {
  defaultParcelThesis,
  formatCurrency,
  formatNumber,
  getBestCandidate,
  sourceStatusLabels,
  sourceTypeLabels,
  splitList,
  summarizeShortlist,
  type ParcelThesisInput,
} from "@/lib/parcel";

type StatusFilter = "all" | ParcelSourceStatus;
type SortKey = "readiness" | "fit" | "risk" | "acreage";

const statusStyles: Record<ParcelSourceStatus, string> = {
  live: "border-[#74d7a0] bg-[#163725] text-[#d8ffe7]",
  partial: "border-[#f0c36a] bg-[#3b2d14] text-[#ffe7aa]",
  unknown: "border-[#83b4d8] bg-[#142f40] text-[#d9f1ff]",
  dead: "border-[#e27b68] bg-[#3b1713] text-[#ffd7cf]",
};

const workflowCards = [
  {
    title: "Define thesis",
    body: "Capture use case, geography, acreage, budget, must-haves, risk factors, notes, and optional parcel links.",
  },
  {
    title: "Score opportunities",
    body: "Review source status, confidence, fit, risk, readiness, rationale, and missing data before a candidate gets momentum.",
  },
  {
    title: "Compare shortlist",
    body: "Shortlist candidates into a side-by-side diligence table with strengths, concerns, and next questions.",
  },
  {
    title: "Generate memo preview",
    body: "Turn the thesis and shortlist into a deterministic memo-style preview with verification steps and caveats.",
  },
] as const;

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function sortOpportunities(opportunities: ParcelOpportunity[], sortKey: SortKey) {
  const sorted = [...opportunities];

  if (sortKey === "fit") {
    return sorted.sort((a, b) => b.fitScore - a.fitScore);
  }

  if (sortKey === "risk") {
    return sorted.sort((a, b) => a.riskScore - b.riskScore);
  }

  if (sortKey === "acreage") {
    return sorted.sort((a, b) => (b.acreage ?? 0) - (a.acreage ?? 0));
  }

  return sorted.sort((a, b) => b.readinessScore - a.readinessScore);
}

function opportunityMatchesSearch(opportunity: ParcelOpportunity, query: string) {
  if (!query) {
    return true;
  }

  const haystack = [
    opportunity.title,
    opportunity.market,
    opportunity.county,
    opportunity.state,
    opportunity.tier,
    opportunity.rationale,
    ...(opportunity.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
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

function SourceBadge({ status }: { status: ParcelSourceStatus }) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-9 items-center border px-3 py-1 text-xs font-black uppercase tracking-normal",
        statusStyles[status],
      )}
    >
      {sourceStatusLabels[status]}
    </span>
  );
}

function OpportunityCard({
  opportunity,
  shortlisted,
  onToggleShortlist,
}: {
  opportunity: ParcelOpportunity;
  shortlisted: boolean;
  onToggleShortlist: (id: string) => void;
}) {
  return (
    <article className="grid gap-5 border border-[#314941] bg-[#0c1714] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-bold uppercase tracking-normal text-[#d7b76d]">
            {opportunity.market ?? "Market TBD"}
          </p>
          <h3 className="text-2xl font-black leading-tight text-[#fff5d8]">{opportunity.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#b9c8bf]">
            {[opportunity.county, opportunity.state].filter(Boolean).join(", ") || "Location requires verification"}
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
          <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Distance</span>
          <strong className="block text-lg text-[#f7f0dc]">{opportunity.distanceLabel ?? "Unknown"}</strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <ScoreChip label="Fit" value={opportunity.fitScore} />
        <ScoreChip label="Risk" value={opportunity.riskScore} note="lower is better" />
        <ScoreChip label="Readiness" value={opportunity.readinessScore} />
        <ScoreChip label="Confidence" value={opportunity.dataConfidence} />
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
          <strong className="text-[#f7f0dc]">Source:</strong> {sourceTypeLabels[opportunity.sourceType]}.{" "}
          {opportunity.verificationNote}
        </p>
        <div className="flex flex-wrap gap-2">
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
          <h2 className="mt-2 text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">Compare candidates before momentum takes over.</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">{summarizeShortlist(opportunities)}</p>
        </div>
        <aside className="border border-[#334a42] bg-[#111f1b] p-5">
          <h3 className="text-xl font-black text-[#fff5d8]">Best-fit summary</h3>
          {best ? (
            <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">
              {best.title} currently leads because it balances fit ({best.fitScore}/100), readiness ({best.readinessScore}
              /100), and a risk index of {best.riskScore}/100. This is still a research ranking, not a purchase recommendation.
            </p>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">
              Add candidates from the opportunity cards to build a comparison table and memo preview.
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
                    <td className="px-4 py-4">{formatNumber(opportunity.acreage, 1)}</td>
                    <td className="px-4 py-4">{formatCurrency(opportunity.price)}</td>
                    <td className="px-4 py-4">{opportunity.fitScore}</td>
                    <td className="px-4 py-4">{opportunity.riskScore}</td>
                    <td className="px-4 py-4">{opportunity.readinessScore}</td>
                    <td className="px-4 py-4">{(opportunity.missingData ?? ["Unknown"]).join(", ")}</td>
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
  shortlisted,
  fallbackCandidates,
}: {
  thesis: ParcelThesisInput;
  shortlisted: ParcelOpportunity[];
  fallbackCandidates: ParcelOpportunity[];
}) {
  const candidates = shortlisted.length ? shortlisted : fallbackCandidates.slice(0, 2);
  const best = candidates.length ? getBestCandidate(candidates) : undefined;
  const mustHaves = splitList(thesis.mustHaves);
  const riskFactors = splitList(thesis.riskFactors);

  return (
    <section id="memo-preview" className="bg-[#101916] py-12">
      <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:px-8">
        <div>
          <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Memo / deck preview</p>
          <h2 className="mt-2 text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">A deterministic diligence memo, not a generated promise.</h2>
          <p className="mt-4 text-base leading-7 text-[#c7d2ca]">
            This preview updates from the intake and shortlist. It is intentionally deterministic tonight, so the workflow works without backend secrets or a live OpenAI call.
          </p>
        </div>

        <article className="grid gap-5 border border-[#3a5149] bg-[#0c1714] p-5">
          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Executive summary</h3>
            <p className="mt-2 text-sm leading-6 text-[#c7d2ca]">
              Parcel Intelligence is reviewing {candidates.length} candidate{candidates.length === 1 ? "" : "s"} against a {thesis.useCase.toLowerCase()} thesis in {thesis.market}.{" "}
              {best ? `${best.title} is the current best-fit candidate, pending source and parcel-level verification.` : "No candidate is ready for a best-fit call yet."}
            </p>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Thesis</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Use case</dt>
                <dd className="text-sm text-[#f0e7d1]">{thesis.useCase}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Market</dt>
                <dd className="text-sm text-[#f0e7d1]">{thesis.market}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Acreage</dt>
                <dd className="text-sm text-[#f0e7d1]">{thesis.acreageRange}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Budget</dt>
                <dd className="text-sm text-[#f0e7d1]">{thesis.budget}</dd>
              </div>
            </dl>
            {thesis.notes ? <p className="mt-3 text-sm leading-6 text-[#c7d2ca]">{thesis.notes}</p> : null}
          </section>

          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Candidate comparison</h3>
            <div className="mt-3 grid gap-3">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="border-l border-[#d7b76d] pl-4">
                  <strong className="block text-[#fff5d8]">{candidate.title}</strong>
                  <span className="text-sm text-[#c7d2ca]">
                    Fit {candidate.fitScore}/100, risk {candidate.riskScore}/100, readiness {candidate.readinessScore}/100, source {sourceStatusLabels[candidate.sourceStatus].toLowerCase()}.
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-xl font-black text-[#fff5d8]">Key risks</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
                {[...riskFactors, ...(best?.diligenceConcerns ?? [])].slice(0, 5).map((risk) => (
                  <li key={risk} className="border-l border-[#c98257] pl-3">
                    {risk}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-black text-[#fff5d8]">Source verification plan</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
                <li className="border-l border-[#2f756d] pl-3">Re-open every listing or broker source and capture date checked.</li>
                <li className="border-l border-[#2f756d] pl-3">Pull county GIS parcel cards, ownership, zoning, access, and floodplain layers.</li>
                <li className="border-l border-[#2f756d] pl-3">Mark stale, blocked, or missing sources before ranking a candidate.</li>
              </ul>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#fff5d8]">Next diligence</h3>
            <ol className="mt-2 grid gap-2 text-sm leading-6 text-[#c7d2ca]">
              <li>1. Confirm the target thesis: {mustHaves.length ? mustHaves.join(", ") : "must-haves not yet specified"}.</li>
              <li>2. Verify active listing status, parcel boundaries, acreage, pricing, and ownership.</li>
              <li>3. Screen zoning, utilities, floodplain, access, easements, and likely development constraints.</li>
              <li>4. Convert verified candidates into a human-reviewed memo before outreach or reliance.</li>
            </ol>
          </section>

          <p className="border-t border-[#2c453d] pt-4 text-sm leading-6 text-[#d8caa8]">
            Parcel Intelligence is a research workflow only. It is not brokerage, appraisal, legal, tax, engineering, or investment advice. All acreage, pricing, zoning, utilities, floodplain, access, ownership, and listing status details must be independently verified before reliance.
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
  const [shortlistIds, setShortlistIds] = useState<string[]>(["richburg-old-catholic-church", "rock-hill-highway-324"]);
  const [shortlistNotice, setShortlistNotice] = useState("Two demo candidates are pre-shortlisted for comparison.");

  const shortlisted = useMemo(
    () => parcelOpportunities.filter((opportunity) => shortlistIds.includes(opportunity.id)),
    [shortlistIds],
  );

  const visibleOpportunities = useMemo(() => {
    const filtered = parcelOpportunities.filter((opportunity) => {
      const acreageMatch = (opportunity.acreage ?? 0) >= minAcreage;
      const statusMatch = statusFilter === "all" || opportunity.sourceStatus === statusFilter;
      const shortlistMatch = !shortlistOnly || shortlistIds.includes(opportunity.id);
      return acreageMatch && statusMatch && shortlistMatch && opportunityMatchesSearch(opportunity, search);
    });

    return sortOpportunities(filtered, sortKey);
  }, [minAcreage, search, shortlistIds, shortlistOnly, sortKey, statusFilter]);

  const bestCandidate = getBestCandidate(visibleOpportunities.length ? visibleOpportunities : parcelOpportunities);
  const listingLinks = splitList(thesis.listingLinks);

  function updateThesis<K extends keyof ParcelThesisInput>(field: K, value: ParcelThesisInput[K]) {
    setThesis((current) => ({ ...current, [field]: value }));
  }

  function toggleShortlist(id: string) {
    const opportunity = parcelOpportunities.find((item) => item.id === id);

    setShortlistIds((current) => {
      const alreadyShortlisted = current.includes(id);
      const next = alreadyShortlisted ? current.filter((item) => item !== id) : [...current, id];
      setShortlistNotice(
        opportunity
          ? `${opportunity.title} ${alreadyShortlisted ? "removed from" : "added to"} shortlist.`
          : "Shortlist updated.",
      );
      return next;
    });
  }

  return (
    <div className="min-h-dvh bg-[#07100e] text-[#f7f0dc]">
      <section className="border-b border-[#263b35] bg-[linear-gradient(180deg,#07100e_0%,#0d1916_72%,#101916_100%)]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)] lg:px-8">
          <header className="grid content-center gap-6">
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">LAND DESK</p>
              <h1 className="mt-3 text-5xl font-black leading-none text-[#fff5d8] md:text-7xl">Parcel Intelligence</h1>
              <p className="mt-5 max-w-3xl text-xl leading-8 text-[#d8e0d9]">
                AI-guided land acquisition research for messy parcel leads, listing links, and development theses.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#b9c8bf]">
                Define a land thesis, review source-checked opportunities, compare fit and risk, and generate a memo-style diligence preview.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {["Research workflow", "Demo/fallback data", "Verification required"].map((badge) => (
                <span key={badge} className="border border-[#49655c] bg-[#0d1b18] px-3 py-2 text-xs font-black uppercase tracking-normal text-[#e5ddc8]">
                  {badge}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#thesis-intake"
                className="inline-flex min-h-12 items-center justify-center border border-[#e4c46f] bg-[#e4c46f] px-5 py-3 text-sm font-black text-[#111714] transition hover:bg-[#f1d985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              >
                Start land thesis
              </a>
              <a
                href="#opportunities"
                className="inline-flex min-h-12 items-center justify-center border border-[#5d746b] px-5 py-3 text-sm font-black text-[#f7f0dc] transition hover:border-[#e4c46f] hover:bg-[#13231e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              >
                View demo opportunities
              </a>
            </div>
          </header>

          <aside className="grid content-start gap-5 border border-[#334a42] bg-[#0c1714] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Research board</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-[#fff5d8]">Source-aware demo mode</h2>
              </div>
              <span className="border border-[#2f756d] px-3 py-1 text-xs font-black uppercase tracking-normal text-[#a8efe3]">No secrets</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-[#263b35] p-4">
                <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Opportunities</span>
                <strong className="text-3xl font-black text-[#fff5d8]">{parcelOpportunities.length}</strong>
              </div>
              <div className="border border-[#263b35] p-4">
                <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">50+ acre screen</span>
                <strong className="text-3xl font-black text-[#fff5d8]">
                  {parcelOpportunities.filter((item) => (item.acreage ?? 0) >= 50).length}
                </strong>
              </div>
              <div className="border border-[#263b35] p-4">
                <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">Best fit</span>
                <strong className="text-lg font-black text-[#fff5d8]">{bestCandidate.title}</strong>
              </div>
              <div className="border border-[#263b35] p-4">
                <span className="block text-xs font-semibold uppercase tracking-normal text-[#8fa69c]">CTA</span>
                <strong className="text-lg font-black text-[#fff5d8]">Founding memo</strong>
              </div>
            </div>
            <p className="text-sm leading-6 text-[#c7d2ca]">
              This page uses committed demo data and deterministic scoring. It does not scrape live listing sites, submit payments, or require an API key.
            </p>
          </aside>
        </div>
      </section>

      <section className="bg-[#101916] py-10" aria-labelledby="what-parcel-does">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Workflow</p>
            <h2 id="what-parcel-does" className="mt-2 text-3xl font-black leading-tight text-[#fff5d8] md:text-4xl">
              Intake to memo, with source quality in the open.
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

      <section id="thesis-intake" className="border-y border-[#263b35] bg-[#0b1311] py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <form className="grid gap-5" aria-describedby="intake-help">
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Thesis intake</p>
              <h2 className="mt-2 text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">Start with the acquisition question.</h2>
              <p id="intake-help" className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
                The intake shapes the memo preview and gives the opportunity list a clear research frame. No backend submission happens here.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-use-case">
                Use case / thesis type
                <input
                  id="parcel-use-case"
                  value={thesis.useCase}
                  onChange={(event) => updateThesis("useCase", event.target.value)}
                  className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-market">
                Target market / geography
                <input
                  id="parcel-market"
                  value={thesis.market}
                  onChange={(event) => updateThesis("market", event.target.value)}
                  className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-acreage-range">
                Acreage range
                <input
                  id="parcel-acreage-range"
                  value={thesis.acreageRange}
                  onChange={(event) => updateThesis("acreageRange", event.target.value)}
                  className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-budget">
                Budget range
                <input
                  id="parcel-budget"
                  value={thesis.budget}
                  onChange={(event) => updateThesis("budget", event.target.value)}
                  className="min-h-12 border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-must-haves">
                Must-haves
                <textarea
                  id="parcel-must-haves"
                  rows={4}
                  value={thesis.mustHaves}
                  onChange={(event) => updateThesis("mustHaves", event.target.value)}
                  className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-risk-factors">
                Risk factors
                <textarea
                  id="parcel-risk-factors"
                  rows={4}
                  value={thesis.riskFactors}
                  onChange={(event) => updateThesis("riskFactors", event.target.value)}
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
                onChange={(event) => updateThesis("notes", event.target.value)}
                className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>

            <label className="grid gap-2 text-sm font-bold text-[#e5ddc8]" htmlFor="parcel-links">
              Optional parcel or listing links
              <textarea
                id="parcel-links"
                rows={3}
                value={thesis.listingLinks}
                onChange={(event) => updateThesis("listingLinks", event.target.value)}
                placeholder="Paste one URL per line or comma-separated."
                className="border border-[#415a52] bg-[#101d19] px-3 py-2 text-[#fff5d8] placeholder:text-[#7c8e86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
              />
            </label>
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
            </dl>
            <p className="border-t border-[#2c453d] pt-4 text-sm leading-6 text-[#c7d2ca]">
              The current page does not store or send this intake. Use the founding memo CTA when a real review is needed.
            </p>
          </aside>
        </div>
      </section>

      <section id="opportunities" className="bg-[#101916] py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Opportunities</p>
              <h2 className="mt-2 text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">Demo candidates, source status first.</h2>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
                Weak, missing, and stale sources stay visible. The point is to know what needs verification before a candidate becomes a memo.
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
      <MemoPreview thesis={thesis} shortlisted={shortlisted} fallbackCandidates={visibleOpportunities} />

      <section className="border-t border-[#263b35] bg-[#07100e] py-12">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-normal text-[#d7b76d]">Founding pilot</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-[#fff5d8] md:text-5xl">Want this reviewed against your actual land thesis?</h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#c7d2ca]">
              Send the market, acreage, budget, use case, and parcel links. The current CTA is email-only because no storage or payment backend was added.
            </p>
          </div>
          <a
            href="mailto:devinmgallemore@gmail.com?subject=Parcel%20Intelligence%20Founding%20Memo&body=Tell%20me%20your%20market,%20acreage,%20budget,%20use%20case,%20and%20parcel%20links."
            className="inline-flex min-h-12 items-center justify-center border border-[#e4c46f] bg-[#e4c46f] px-5 py-3 text-sm font-black text-[#111714] transition hover:bg-[#f1d985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f4c76d]"
          >
            Request a founding parcel memo
          </a>
        </div>
      </section>
    </div>
  );
}
