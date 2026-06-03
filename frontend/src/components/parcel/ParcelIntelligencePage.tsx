"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { parcelOpportunities, type ParcelOpportunity } from "@/data/parcelOpportunities";
import { ParcelTrustLabelSet } from "@/components/parcel/ParcelTrustLabels";
import { api } from "@/lib/api";
import {
  buildLocalParcelResearchResult,
  buildParcelResearchRequest,
  defaultParcelThesis,
  extractListingLinks,
  formatAcreageRange,
  formatBudgetRange,
  formatCurrency,
  formatNumber,
  getParcelConfidenceStatus,
  getParcelFreshnessStatus,
  getParcelSourceTrustStatus,
  getLocalSuitability,
  normalizeCandidateInputs,
  scoreParcelAgainstThesis,
  sourceTypeLabels,
  suitabilityCategoryLabels,
  splitList,
  type ParcelCandidateInput,
  type ParcelCandidateSuitability,
  type ParcelFitAssessment,
  type ParcelRiskTolerance,
  type ParcelResearchResult,
  type ParcelThesis,
  type ParcelThesisInput,
} from "@/lib/parcel";
import {
  createLocalStorageParcelProjectStore,
  type ParcelMemo,
  type ParcelMemoSourceCaveat,
  type ParcelProject,
  type ParcelProjectDraft,
  type ParcelProjectStore,
  type ParcelRiskFlag,
} from "@/lib/parcelProjects";

type ResearchStatus = "idle" | "loading" | "complete";
type DetailTab = "evidence" | "diligence" | "location" | "memo";

type EvaluationCandidate = {
  opportunity: ParcelOpportunity;
  suitability: ParcelCandidateSuitability;
  rank: number;
  sourceAudit?: ParcelResearchResult["sourceAudit"][number];
  missingProof: string[];
  flagsQuestions: string[];
  fitAssumptions: string[];
  componentScores: ParcelFitAssessment["componentScores"];
  nextQuestions: string[];
};

type LeadDraft = {
  title: string;
  sourceUrl: string;
  notes: string;
};

type ProjectStorageStatus = {
  tone: "neutral" | "success" | "warning";
  message: string;
};

type MemoExportStatus = {
  tone: "neutral" | "success" | "warning";
  message: string;
};

const categoryTone: Record<ParcelCandidateSuitability["category"], string> = {
  strong_fit: "border-[#23724f] bg-[#e5f4ea] text-[#164431]",
  conditional_fit: "border-[#a46b15] bg-[#fff2cf] text-[#593907]",
  weak_fit: "border-[#5d7794] bg-[#e9f1f8] text-[#253d55]",
  disqualified: "border-[#a64435] bg-[#fbe8e3] text-[#61251b]",
  needs_source_review: "border-[#566b64] bg-[#ecf0ee] text-[#263a34]",
};

const coreVerificationItems = [
  "Zoning and allowed use",
  "Title, ownership chain, and easements",
  "Survey, parcel boundary, and legal description",
  "Environmental constraints and wetlands",
  "Floodplain exposure and drainage",
  "Utilities, access, and service capacity",
  "Tax status, assessments, and rollback risk",
];

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function buildEvaluationCandidates(
  opportunities: ParcelOpportunity[],
  result: ParcelResearchResult,
  thesis: ParcelThesisInput,
): EvaluationCandidate[] {
  const sourceMap = new Map(result.sourceAudit.filter((item) => item.candidateId).map((item) => [item.candidateId, item]));

  return [...opportunities]
    .sort((a, b) => scoreParcelAgainstThesis(b, thesis).score - scoreParcelAgainstThesis(a, thesis).score)
    .map((opportunity, index) => {
      const suitability = getLocalSuitability(opportunity, thesis);
      const fitAssessment = scoreParcelAgainstThesis(opportunity, thesis);
      return {
        opportunity,
        suitability,
        rank: index + 1,
        sourceAudit: sourceMap.get(opportunity.id),
        missingProof: opportunity.missingData,
        flagsQuestions: suitability.flagsQuestions?.length
          ? suitability.flagsQuestions
          : suitability.dealKillers.length
            ? suitability.dealKillers
            : opportunity.diligenceConcerns.slice(0, 2),
        fitAssumptions: suitability.fitAssumptions?.length ? suitability.fitAssumptions : fitAssessment.assumptions,
        componentScores: fitAssessment.componentScores,
        nextQuestions: suitability.nextQuestions.length ? suitability.nextQuestions : opportunity.nextDiligence,
      };
    });
}

function getTopReason(candidate: EvaluationCandidate) {
  return candidate.suitability.reasons[0] ?? candidate.opportunity.rationale;
}

function toParcelProjectThesis(thesis: ParcelThesisInput): ParcelThesis {
  return {
    intendedUse: thesis.intendedUse,
    targetCountyOrRegion: thesis.targetCountyOrRegion,
    budgetMin: thesis.budgetMin,
    budgetMax: thesis.budgetMax,
    acreageMin: thesis.acreageMin,
    acreageMax: thesis.acreageMax,
    mustHaves: thesis.mustHaves,
    dealBreakers: thesis.dealBreakers,
    riskTolerance: thesis.riskTolerance,
  };
}

function buildProjectRiskFlags(candidates: EvaluationCandidate[]): ParcelRiskFlag[] {
  const createdAt = new Date().toISOString();
  return candidates
    .flatMap((candidate) =>
      candidate.flagsQuestions.slice(0, 3).map((flag, index) => ({
        id: `${candidate.opportunity.id}-flag-${index}`,
        candidateId: candidate.opportunity.id,
        label: flag.replace(/\.$/, "").slice(0, 80),
        detail: flag,
        severity: /high|not proven|verify|review/i.test(flag) ? "review" : "question",
        source: "candidate",
        createdAt,
      }) satisfies ParcelRiskFlag),
    )
    .slice(0, 24);
}

function sourceTrustLabel(status: ReturnType<typeof getParcelSourceTrustStatus>) {
  const labels = {
    demo: "Demo",
    "user-provided": "User-provided",
    "public-record": "Public record",
    estimated: "Estimated",
    unknown: "Unknown source",
  };
  return labels[status];
}

function freshnessLabel(status: ReturnType<typeof getParcelFreshnessStatus>) {
  const labels = {
    current: "Current",
    stale: "Stale",
    unknown: "Freshness unknown",
  };
  return labels[status];
}

function confidenceLabel(status: ReturnType<typeof getParcelConfidenceStatus>) {
  const labels = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
    "needs-verification": "Needs verification",
  };
  return labels[status];
}

function buildSourceCaveat(candidate: EvaluationCandidate): ParcelMemoSourceCaveat {
  const opportunity = candidate.opportunity;
  return {
    candidateId: opportunity.id,
    title: opportunity.title,
    sourceLabel: opportunity.sourceLabel ?? sourceTypeLabels[opportunity.sourceType],
    sourceStatus: getParcelSourceTrustStatus(opportunity),
    freshnessStatus: getParcelFreshnessStatus(opportunity),
    confidenceStatus: getParcelConfidenceStatus(opportunity),
    caveat: opportunity.verificationNote || opportunity.sourceVerification,
  };
}

function uniqueItems(items: string[], limit: number) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))).slice(0, limit);
}

function buildStructuredParcelMemo({
  thesis,
  candidates,
  riskFlags,
  userNotes,
}: {
  thesis: ParcelThesisInput;
  candidates: EvaluationCandidate[];
  riskFlags: ParcelRiskFlag[];
  userNotes: string;
}): ParcelMemo {
  const memoCandidates = candidates.length ? candidates : [];
  const candidateOverview = memoCandidates.map((candidate) => {
    const opportunity = candidate.opportunity;
    return `${opportunity.title}: ${formatNumber(opportunity.acreage, 1)} acres, ${formatCurrency(opportunity.price)}, ${candidate.suitability.suitabilityScore}/100 thesis fit, ${sourceTrustLabel(getParcelSourceTrustStatus(opportunity))} source status.`;
  });
  const shortlistComparison = memoCandidates.map((candidate) => {
    const scores = candidate.componentScores;
    return `${candidate.opportunity.title}: budget ${scores.budget}/100, acreage ${scores.acreage}/100, must-haves ${scores.mustHaves}/100, risk ${scores.risk}/100. Main review question: ${candidate.flagsQuestions[0] ?? "No review question recorded yet."}`;
  });
  const missingInformation = uniqueItems(
    memoCandidates.flatMap((candidate) => candidate.missingProof.map((item) => `${candidate.opportunity.title}: ${item}`)),
    14,
  );
  const recommendedNextChecks = uniqueItems(
    [
      ...coreVerificationItems,
      ...memoCandidates.flatMap((candidate) => candidate.nextQuestions),
    ],
    14,
  );

  return {
    id: `parcel-memo-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    thesisSummary: `Parcel Intelligence screened ${memoCandidates.length} shortlisted parcel${memoCandidates.length === 1 ? "" : "s"} for a ${thesis.intendedUse.toLowerCase()} thesis in ${thesis.targetCountyOrRegion}. The working range is ${formatAcreageRange(thesis)} and ${formatBudgetRange(thesis)} with ${thesis.riskTolerance} risk tolerance. This memo organizes research questions and caveats; it is not legal, financial, real-estate, tax, survey, zoning, environmental, or title advice.`,
    candidateOverview: candidateOverview.length ? candidateOverview : ["No shortlisted parcels are currently selected for this memo."],
    shortlistComparison: shortlistComparison.length ? shortlistComparison : ["Add parcels to the shortlist before comparing thesis fit."],
    keyRiskFlags: riskFlags.length ? riskFlags : buildProjectRiskFlags(memoCandidates),
    missingInformation: missingInformation.length ? missingInformation : ["No missing information has been recorded yet; verify source records before relying on the screen."],
    recommendedNextChecks,
    sourceCaveatAppendix: memoCandidates.map(buildSourceCaveat),
    userNotes: userNotes.trim(),
  };
}

function parcelMemoToMarkdown(memo: ParcelMemo, projectName: string) {
  const lines = [
    `# ${projectName || "Parcel Diligence Memo"}`,
    "",
    `Generated: ${new Date(memo.generatedAt).toLocaleString()}`,
    "",
    "## Thesis Summary",
    memo.thesisSummary,
    "",
    "## Candidate Overview",
    ...memo.candidateOverview.map((item) => `- ${item}`),
    "",
    "## Shortlist Comparison",
    ...memo.shortlistComparison.map((item) => `- ${item}`),
    "",
    "## Key Risk Flags",
    ...(memo.keyRiskFlags.length ? memo.keyRiskFlags.map((flag) => `- [${flag.severity}] ${flag.detail}`) : ["- No risk flags recorded yet."]),
    "",
    "## Missing Information",
    ...memo.missingInformation.map((item) => `- ${item}`),
    "",
    "## Recommended Next Checks",
    ...memo.recommendedNextChecks.map((item) => `- ${item}`),
    "",
    "## Source/Caveat Appendix",
    ...(memo.sourceCaveatAppendix.length
      ? memo.sourceCaveatAppendix.map(
          (source) =>
            `- ${source.title}: ${source.sourceLabel}; ${sourceTrustLabel(source.sourceStatus)}; ${freshnessLabel(source.freshnessStatus)}; ${confidenceLabel(source.confidenceStatus)}. Caveat: ${source.caveat}`,
        )
      : ["- No source records are attached to this memo yet."]),
    "",
    "## User Notes",
    memo.userNotes || "No user notes added.",
    "",
    "## Caveat",
    "This memo is a research organization artifact. Verify zoning, title, survey, environmental, flood, utilities, tax, source freshness, and parcel facts independently before relying on any item.",
    "",
  ];

  return lines.join("\n");
}

function downloadMarkdownFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(value: string) {
  return `${value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "parcel-memo"}.md`;
}

function WhatToVerifyNextPanel({ candidate }: { candidate?: EvaluationCandidate }) {
  const selectedGaps = candidate?.missingProof.slice(0, 2) ?? [];
  const items = Array.from(new Set([...coreVerificationItems, ...selectedGaps])).slice(0, 8);

  return (
    <section className="rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <h2 className="text-sm font-black uppercase text-[#66796e]">What to verify next</h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#33443c]">
        {items.map((item) => (
          <li key={item} className="border-l-2 border-[#1f6a4a] pl-3">{item}</li>
        ))}
      </ul>
    </section>
  );
}

function WorkflowStateNotice({ title, body, tone }: { title: string; body: string; tone: "blue" | "orange" | "neutral" }) {
  const toneClass =
    tone === "blue"
      ? "border-[#5d7794] bg-[#e9f1f8] text-[#253d55]"
      : tone === "orange"
        ? "border-[#a46b15] bg-[#fff2cf] text-[#593907]"
        : "border-[#c5d0c9] bg-[#f4f7f2] text-[#33443c]";

  return (
    <section className={classNames("rounded-[5px] border p-3", toneClass)}>
      <h3 className="text-xs font-black uppercase">{title}</h3>
      <p className="mt-1 text-sm leading-6">{body}</p>
    </section>
  );
}

function ProjectPersistencePanel({
  projects,
  activeProjectId,
  projectToLoadId,
  projectName,
  status,
  onProjectToLoadChange,
  onProjectNameChange,
  onCreate,
  onRename,
  onSave,
  onLoad,
  onDelete,
}: {
  projects: ParcelProject[];
  activeProjectId?: string;
  projectToLoadId: string;
  projectName: string;
  status: ProjectStorageStatus;
  onProjectToLoadChange: (projectId: string) => void;
  onProjectNameChange: (name: string) => void;
  onCreate: () => void;
  onRename: () => void;
  onSave: () => void;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const statusClass =
    status.tone === "success"
      ? "border-[#23724f] bg-[#e5f4ea] text-[#164431]"
      : status.tone === "warning"
        ? "border-[#a46b15] bg-[#fff2cf] text-[#593907]"
        : "border-[#c5d0c9] bg-[#f4f7f2] text-[#33443c]";

  return (
    <section className="grid gap-3 rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div>
        <p className="text-xs font-black uppercase text-[#66796e]">Project Persistence</p>
        <h2 className="mt-1 text-xl font-black leading-tight text-[#18241e]">Save a local research project.</h2>
      </div>

      <p className="rounded-[5px] border border-[#a46b15] bg-[#fff2cf] p-3 text-xs font-black uppercase leading-5 text-[#593907]">
        Local preview storage only. Production accounts will use secure server-side storage.
      </p>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-project-name">
        Project name
        <input
          id="parcel-project-name"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          className="min-h-10 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="min-h-10 rounded-[4px] border border-[#1f6a4a] bg-[#edf5ef] px-3 text-sm font-black text-[#18241e] hover:bg-[#dceee4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
        >
          Create project
        </button>
        <button
          type="button"
          disabled={!activeProjectId}
          onClick={onRename}
          className="min-h-10 rounded-[4px] border border-[#c5d0c9] bg-white px-3 text-sm font-black text-[#18241e] hover:border-[#1f6a4a] disabled:cursor-not-allowed disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
        >
          Rename project
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="min-h-11 rounded-[4px] bg-[#18241e] px-3 text-sm font-black text-white hover:bg-[#24372e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
      >
        Save current thesis/shortlist
      </button>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-project-load">
        Load existing project
        <select
          id="parcel-project-load"
          value={projectToLoadId}
          onChange={(event) => onProjectToLoadChange(event.target.value)}
          className="min-h-10 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        >
          <option value="">No local projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!projectToLoadId}
          onClick={onLoad}
          className="min-h-10 rounded-[4px] border border-[#1f6a4a] bg-[#edf5ef] px-3 text-sm font-black text-[#18241e] hover:bg-[#dceee4] disabled:cursor-not-allowed disabled:border-[#c5d0c9] disabled:bg-[#f4f7f2] disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
        >
          Load
        </button>
        <button
          type="button"
          disabled={!projectToLoadId}
          onClick={onDelete}
          className="min-h-10 rounded-[4px] border border-[#d3b9af] bg-white px-3 text-sm font-black text-[#703024] hover:border-[#a64435] disabled:cursor-not-allowed disabled:text-[#b59a91] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64435]"
        >
          Delete
        </button>
      </div>

      <p className={classNames("rounded-[5px] border p-3 text-xs font-bold leading-5", statusClass)}>
        {status.message}
      </p>
    </section>
  );
}

function ShortlistComparisonPanel({
  candidates,
  onSelect,
  onRemove,
}: {
  candidates: EvaluationCandidate[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-[#66796e]">Shortlist comparison</h2>
          <p className="mt-1 text-sm leading-6 text-[#52645b]">Compare fit assumptions, open flags/questions, and source readiness.</p>
        </div>
        <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-black text-[#365347]">
          {candidates.length} parcel{candidates.length === 1 ? "" : "s"}
        </span>
      </div>

      {candidates.length ? (
        <div className="mt-4 grid gap-3">
          {candidates.map((candidate) => (
            <article key={candidate.opportunity.id} className="grid gap-3 rounded-[5px] border border-[#dce4df] bg-[#fbfcfa] p-3">
              <button
                type="button"
                onClick={() => onSelect(candidate.opportunity.id)}
                className="text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
              >
                <span className="text-xs font-black uppercase text-[#66796e]">{candidate.suitability.suitabilityScore}/100 thesis fit</span>
                <h3 className="mt-1 text-base font-black leading-tight text-[#18241e]">{candidate.opportunity.title}</h3>
                <p className="mt-1 text-xs font-bold text-[#52645b]">
                  {formatNumber(candidate.opportunity.acreage, 1)} acres / {formatCurrency(candidate.opportunity.price)}
                </p>
              </button>
              <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-[4px] bg-white p-2">
                  <dt className="font-black uppercase text-[#66796e]">Budget</dt>
                  <dd className="font-bold text-[#18241e]">{candidate.componentScores.budget}/100</dd>
                </div>
                <div className="rounded-[4px] bg-white p-2">
                  <dt className="font-black uppercase text-[#66796e]">Acreage</dt>
                  <dd className="font-bold text-[#18241e]">{candidate.componentScores.acreage}/100</dd>
                </div>
                <div className="rounded-[4px] bg-white p-2">
                  <dt className="font-black uppercase text-[#66796e]">Risk</dt>
                  <dd className="font-bold text-[#18241e]">{candidate.componentScores.risk}/100</dd>
                </div>
              </dl>
              <p className="text-sm leading-6 text-[#33443c]">{candidate.flagsQuestions[0] ?? "No flag/question recorded yet."}</p>
              <button
                type="button"
                onClick={() => onRemove(candidate.opportunity.id)}
                className="justify-self-start rounded-[4px] border border-[#d3b9af] bg-white px-3 py-2 text-xs font-black text-[#703024] hover:border-[#a64435] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a64435]"
              >
                Remove from shortlist
              </button>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-[4px] bg-[#f4f7f2] p-3 text-sm leading-6 text-[#52645b]">
          Empty state: add parcels to the shortlist before comparing them.
        </p>
      )}
    </section>
  );
}

function MemoPreviewPanel({
  memo,
  projectName,
  userNotes,
  exportStatus,
  canGenerate,
  onUserNotesChange,
  onGenerate,
  onCopy,
  onDownload,
}: {
  memo?: ParcelMemo;
  projectName: string;
  userNotes: string;
  exportStatus: MemoExportStatus;
  canGenerate: boolean;
  onUserNotesChange: (value: string) => void;
  onGenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
}) {
  const statusClass =
    exportStatus.tone === "success"
      ? "border-[#23724f] bg-[#e5f4ea] text-[#164431]"
      : exportStatus.tone === "warning"
        ? "border-[#a46b15] bg-[#fff2cf] text-[#593907]"
        : "border-[#c5d0c9] bg-[#f4f7f2] text-[#33443c]";

  return (
    <section className="grid gap-4 rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Diligence memo preview</p>
          <h2 className="mt-1 text-xl font-black leading-tight text-[#18241e]">{projectName || "Parcel diligence memo"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canGenerate}
            onClick={onGenerate}
            className="min-h-10 rounded-[4px] border border-[#1f6a4a] bg-[#edf5ef] px-3 text-sm font-black text-[#18241e] hover:bg-[#dceee4] disabled:cursor-not-allowed disabled:border-[#c5d0c9] disabled:bg-[#f4f7f2] disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
          >
            Generate memo
          </button>
          <button
            type="button"
            disabled={!memo}
            onClick={onCopy}
            className="min-h-10 rounded-[4px] border border-[#c5d0c9] bg-white px-3 text-sm font-black text-[#18241e] hover:border-[#1f6a4a] disabled:cursor-not-allowed disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
          >
            Copy markdown
          </button>
          <button
            type="button"
            disabled={!memo}
            onClick={onDownload}
            className="min-h-10 rounded-[4px] border border-[#c5d0c9] bg-white px-3 text-sm font-black text-[#18241e] hover:border-[#1f6a4a] disabled:cursor-not-allowed disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
          >
            Download .md
          </button>
        </div>
      </div>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-memo-notes">
        User notes
        <textarea
          id="parcel-memo-notes"
          rows={4}
          value={userNotes}
          onChange={(event) => onUserNotesChange(event.target.value)}
          placeholder="Add context to include in the memo preview."
          className="rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 py-2 text-[#18241e] outline-none placeholder:text-[#8a9a92] focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <p className={classNames("rounded-[5px] border p-3 text-xs font-bold leading-5", statusClass)}>
        {exportStatus.message}
      </p>

      {memo ? (
        <div className="grid gap-4">
          <EvidenceBlock title="Thesis summary" body={memo.thesisSummary} />
          <ListBlock title="Candidate overview" items={memo.candidateOverview} tone="green" />
          <ListBlock title="Shortlist comparison" items={memo.shortlistComparison} tone="green" />
          <ListBlock title="Key risk flags" items={memo.keyRiskFlags.map((flag) => `[${flag.severity}] ${flag.detail}`)} tone="orange" />
          <ListBlock title="Missing information" items={memo.missingInformation} tone="orange" />
          <ListBlock title="Recommended next checks" items={memo.recommendedNextChecks} tone="green" />
          <section className="rounded-[5px] border border-[#dce4df] bg-white p-4">
            <h3 className="text-sm font-black uppercase text-[#66796e]">Source/caveat appendix</h3>
            <div className="mt-3 grid gap-3">
              {memo.sourceCaveatAppendix.length ? memo.sourceCaveatAppendix.map((source) => (
                <article key={source.candidateId} className="grid gap-2 rounded-[4px] bg-[#f4f7f2] p-3">
                  <h4 className="text-sm font-black text-[#18241e]">{source.title}</h4>
                  <ParcelTrustLabelSet
                    sourceStatus={source.sourceStatus}
                    freshness={source.freshnessStatus}
                    confidence={source.confidenceStatus}
                  />
                  <p className="text-sm leading-6 text-[#33443c]">
                    {source.sourceLabel}. {source.caveat}
                  </p>
                </article>
              )) : (
                <p className="text-sm leading-6 text-[#52645b]">No source records are attached to this memo yet.</p>
              )}
            </div>
          </section>
          <EvidenceBlock title="User notes" body={memo.userNotes || "No user notes added."} />
          <EvidenceBlock
            title="Caveat"
            body="This memo is a research organization artifact. Verify zoning, title, survey, environmental, flood, utilities, tax, source freshness, and parcel facts independently before relying on any item."
          />
        </div>
      ) : (
        <p className="rounded-[5px] bg-[#f4f7f2] p-3 text-sm leading-6 text-[#52645b]">
          Generate a memo from the current thesis and shortlist to preview export-ready markdown.
        </p>
      )}
    </section>
  );
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
  onChange: (field: keyof ParcelThesisInput, value: string | number) => void;
  onRunEvaluation: (event?: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="grid content-start gap-4 rounded-[6px] border border-[#d5ddd3] bg-white p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]"
      onSubmit={onRunEvaluation}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Thesis Setup</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-[#18241e]">Shape the due-diligence screen.</h2>
        </div>
        <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-black text-[#365347]">
          {listingLinks.length ? `${listingLinks.length} URL${listingLinks.length === 1 ? "" : "s"}` : "Seed data"}
        </span>
      </div>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-intended-use">
        Intended use
        <input
          id="parcel-intended-use"
          value={thesis.intendedUse}
          onChange={(event) => onChange("intendedUse", event.target.value)}
          className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-target-region">
        Target county or region
        <input
          id="parcel-target-region"
          value={thesis.targetCountyOrRegion}
          onChange={(event) => onChange("targetCountyOrRegion", event.target.value)}
          className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-budget-min">
          Budget min
          <input
            id="parcel-budget-min"
            type="number"
            min={0}
            step={50000}
            value={thesis.budgetMin}
            onChange={(event) => onChange("budgetMin", Number(event.target.value) || 0)}
            className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-budget-max">
          Budget max
          <input
            id="parcel-budget-max"
            type="number"
            min={0}
            step={50000}
            value={thesis.budgetMax}
            onChange={(event) => onChange("budgetMax", Number(event.target.value) || 0)}
            className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-acreage-min">
          Acreage min
          <input
            id="parcel-acreage-min"
            type="number"
            min={0}
            step={5}
            value={thesis.acreageMin}
            onChange={(event) => onChange("acreageMin", Number(event.target.value) || 0)}
            className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
        <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-acreage-max">
          Acreage max
          <input
            id="parcel-acreage-max"
            type="number"
            min={0}
            step={5}
            value={thesis.acreageMax}
            onChange={(event) => onChange("acreageMax", Number(event.target.value) || 0)}
            className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
          />
        </label>
      </div>

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

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-deal-breakers">
        Deal-breakers / constraints to flag
        <textarea
          id="parcel-deal-breakers"
          rows={3}
          value={thesis.dealBreakers}
          onChange={(event) => onChange("dealBreakers", event.target.value)}
          className="rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 py-2 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        />
      </label>

      <label className="grid gap-1 text-sm font-bold text-[#27362f]" htmlFor="parcel-risk-tolerance">
        Risk tolerance
        <select
          id="parcel-risk-tolerance"
          value={thesis.riskTolerance}
          onChange={(event) => onChange("riskTolerance", event.target.value as ParcelRiskTolerance)}
          className="min-h-11 rounded-[4px] border border-[#c8d2cb] bg-[#fbfcfa] px-3 text-[#18241e] outline-none focus-visible:border-[#1f6a4a] focus-visible:ring-2 focus-visible:ring-[#9ad7bd]"
        >
          <option value="low">Low: surface more review questions</option>
          <option value="medium">Medium: balanced first screen</option>
          <option value="high">High: tolerate more open questions</option>
        </select>
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
        {researchStatus === "loading" ? "Evaluating parcels..." : "Evaluate parcels"}
      </button>

      <p className="text-xs font-bold leading-5 text-[#66796e]">
        Current thesis range: {formatAcreageRange(thesis)} / {formatBudgetRange(thesis)}.
      </p>
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
  researchStatus,
  onSelect,
  onToggleSaved,
  onCompareShortlist,
}: {
  candidates: EvaluationCandidate[];
  selectedId: string;
  savedIds: string[];
  mode: ParcelResearchResult["mode"];
  researchStatus: ResearchStatus;
  onSelect: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onCompareShortlist: () => void;
}) {
  const top = candidates[0];
  const canCompare = savedIds.length >= 2;

  return (
    <section className="grid gap-4 rounded-[6px] border border-[#d5ddd3] bg-[#fdfefd] p-4 shadow-[0_18px_60px_rgba(21,32,26,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-[#66796e]">Research Fit Screen</p>
          <h2 className="mt-1 text-2xl font-black leading-tight text-[#18241e]">
            {top ? `${top.opportunity.title} is first in this research screen.` : "No candidates available."}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#c5d0c9] bg-white px-3 py-1 text-xs font-black uppercase text-[#476156]">
            {mode}
          </span>
          <button
            type="button"
            disabled={!canCompare}
            onClick={onCompareShortlist}
            className="min-h-9 rounded-[4px] border border-[#1f6a4a] bg-white px-3 text-xs font-black uppercase text-[#1f6a4a] hover:bg-[#edf5ef] disabled:cursor-not-allowed disabled:border-[#c5d0c9] disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
          >
            Compare shortlisted parcels
          </button>
        </div>
      </div>

      {researchStatus === "loading" ? (
        <WorkflowStateNotice title="Loading state" body="Scoring parcels against the thesis and refreshing the memo preview." tone="blue" />
      ) : !candidates.length ? (
        <WorkflowStateNotice title="Empty state" body="No candidate parcels are available yet. Add a lead or restore seed data to start the screen." tone="neutral" />
      ) : mode === "fallback" ? (
        <WorkflowStateNotice title="Fallback state" body="Using deterministic local scoring from demo fields and user-provided leads. External provider data is not connected." tone="orange" />
      ) : null}

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
                    <span className="text-xs font-bold uppercase text-[#66796e]">screen score</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={classNames("rounded-full border px-3 py-1 text-xs font-black", categoryTone[candidate.suitability.category])}>
                    {suitabilityCategoryLabels[candidate.suitability.category]}
                  </span>
                </div>
                <ParcelTrustLabelSet
                  sourceStatus={getParcelSourceTrustStatus(opportunity)}
                  freshness={getParcelFreshnessStatus(opportunity)}
                  confidence={getParcelConfidenceStatus(opportunity)}
                />

                <p className="text-sm leading-6 text-[#3e5048]">{getTopReason(candidate)}</p>

                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[4px] bg-[#f4f7f2] p-3">
                    <span className="block text-xs font-black uppercase text-[#66796e]">Missing proof</span>
                    <strong className="mt-1 block text-sm text-[#18241e]">{candidate.missingProof[0] ?? "No gap recorded"}</strong>
                  </div>
                  <div className="rounded-[4px] bg-[#f4f7f2] p-3">
                    <span className="block text-xs font-black uppercase text-[#66796e]">Flags/questions</span>
                    <strong className="mt-1 block text-sm text-[#18241e]">{candidate.flagsQuestions[0] ?? "None flagged"}</strong>
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
                  {saved ? "Remove from shortlist" : "Add to shortlist"}
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
          <p className="text-xs font-black uppercase text-[#66796e]">Selected Parcel</p>
          <h2 className="mt-1 text-3xl font-black leading-tight text-[#18241e]">{opportunity.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52645b]">{opportunity.rationale}</p>
          <ParcelTrustLabelSet
            className="mt-3"
            sourceStatus={getParcelSourceTrustStatus(opportunity)}
            freshness={getParcelFreshnessStatus(opportunity)}
            confidence={getParcelConfidenceStatus(opportunity)}
          />
        </div>
        <span className={classNames("rounded-full border px-3 py-1 text-xs font-black", categoryTone[candidate.suitability.category])}>
          {suitabilityCategoryLabels[candidate.suitability.category]}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Metric label="Suitability" value={`${candidate.suitability.suitabilityScore}/100`} />
        <Metric label="Confidence score" value={`${opportunity.dataConfidence}/100`} />
        <Metric label="Acres" value={formatNumber(opportunity.acreage, 1)} />
        <Metric label="Price" value={formatCurrency(opportunity.price)} />
      </div>

      <div className="flex flex-wrap gap-2 border-y border-[#e5ebe7] py-3" role="tablist" aria-label="Parcel evidence sections">
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
            <ListBlock title="Fit scoring assumptions" items={candidate.fitAssumptions} tone="green" />
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
          <ListBlock title="Flags/questions" items={candidate.flagsQuestions} tone="red" />
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
          <ListBlock title="Founding memo scope" items={result.memo.memoScope} tone="green" />
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
  const [projectStore] = useState<ParcelProjectStore>(() => createLocalStorageParcelProjectStore());
  const [thesis, setThesis] = useState<ParcelThesisInput>(defaultParcelThesis);
  const [seedCandidates, setSeedCandidates] = useState<ParcelOpportunity[]>(parcelOpportunities);
  const [candidateInputs, setCandidateInputs] = useState<ParcelCandidateInput[]>([]);
  const [leadDraft, setLeadDraft] = useState<LeadDraft>({ title: "", sourceUrl: "", notes: "" });
  const [selectedId, setSelectedId] = useState("york-kays-drive");
  const [savedIds, setSavedIds] = useState<string[]>(["york-kays-drive", "chester-humpback-bridge"]);
  const [researchStatus, setResearchStatus] = useState<ResearchStatus>("idle");
  const [researchResult, setResearchResult] = useState<ParcelResearchResult | undefined>();
  const [detailTab, setDetailTab] = useState<DetailTab>("evidence");
  const [showComparison, setShowComparison] = useState(false);
  const [projects, setProjects] = useState<ParcelProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [projectToLoadId, setProjectToLoadId] = useState("");
  const [projectName, setProjectName] = useState("Untitled Parcel Project");
  const [memoNotes, setMemoNotes] = useState("");
  const [generatedMemo, setGeneratedMemo] = useState<ParcelMemo | undefined>();
  const [storageStatus, setStorageStatus] = useState<ProjectStorageStatus>({
    tone: "neutral",
    message: "Local projects are saved in this browser only.",
  });
  const [memoExportStatus, setMemoExportStatus] = useState<MemoExportStatus>({
    tone: "neutral",
    message: "Generate a memo before copying or downloading markdown.",
  });

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

  useEffect(() => {
    let active = true;
    projectStore.listProjects().then((nextProjects) => {
      if (!active) return;
      setProjects(nextProjects);
      setProjectToLoadId((current) => (current || nextProjects[0]?.id || ""));
    });
    return () => {
      active = false;
    };
  }, [projectStore]);

  const listingLinks = extractListingLinks(thesis.listingLinks);
  const dynamicCandidates = useMemo(() => normalizeCandidateInputs(thesis, candidateInputs), [candidateInputs, thesis]);
  const baseCandidateRecords = useMemo(
    () => [...seedCandidates, ...dynamicCandidates],
    [dynamicCandidates, seedCandidates],
  );
  const localResult = useMemo(() => buildLocalParcelResearchResult(thesis, baseCandidateRecords), [baseCandidateRecords, thesis]);
  const result = researchResult ?? localResult;
  const resultCandidateRecords = result.candidateRecords.length ? result.candidateRecords : baseCandidateRecords;
  const candidates = useMemo(() => buildEvaluationCandidates(resultCandidateRecords, result, thesis), [result, resultCandidateRecords, thesis]);
  const selectedCandidate = candidates.find((candidate) => candidate.opportunity.id === selectedId) ?? candidates[0];
  const savedCandidates = candidates.filter((candidate) => savedIds.includes(candidate.opportunity.id));
  const memoCandidates = savedCandidates;
  const topCandidate = candidates[0];
  const mustHaves = splitList(thesis.mustHaves);

  async function refreshProjects() {
    const nextProjects = await projectStore.listProjects();
    setProjects(nextProjects);
    setProjectToLoadId((current) => {
      if (current && nextProjects.some((project) => project.id === current)) return current;
      return nextProjects[0]?.id ?? "";
    });
    return nextProjects;
  }

  function buildCurrentProjectDraft(name: string): ParcelProjectDraft {
    const projectCandidates = candidates.map((candidate) => candidate.opportunity);
    const projectShortlist = savedIds.filter((id) => projectCandidates.some((candidate) => candidate.id === id));
    const flaggedCandidates = candidates.filter((candidate) => projectShortlist.includes(candidate.opportunity.id));
    const riskFlags = buildProjectRiskFlags(flaggedCandidates.length ? flaggedCandidates : candidates.slice(0, 3));

    return {
      name,
      thesis: toParcelProjectThesis(thesis),
      listingLinks: thesis.listingLinks,
      candidates: projectCandidates,
      shortlistedCandidateIds: projectShortlist,
      selectedCandidateId: selectedCandidate?.opportunity.id,
      riskFlags,
      memo: generatedMemo,
      userNotes: memoNotes,
    };
  }

  async function createProject() {
    const name = projectName.trim() || "Untitled Parcel Project";
    try {
      const created = await projectStore.createProject(buildCurrentProjectDraft(name));
      setActiveProjectId(created.id);
      setProjectToLoadId(created.id);
      setProjectName(created.name);
      await refreshProjects();
      setStorageStatus({ tone: "success", message: "Project created in local preview storage." });
    } catch (error) {
      setStorageStatus({ tone: "warning", message: error instanceof Error ? error.message : "Project could not be created locally." });
    }
  }

  async function saveCurrentProject() {
    const name = projectName.trim() || "Untitled Parcel Project";
    try {
      if (activeProjectId) {
        const updated = await projectStore.updateProject(activeProjectId, buildCurrentProjectDraft(name));
        setProjectName(updated.name);
        setProjectToLoadId(updated.id);
        await refreshProjects();
        setStorageStatus({ tone: "success", message: "Current thesis and shortlist saved locally." });
        return;
      }

      const created = await projectStore.createProject(buildCurrentProjectDraft(name));
      setActiveProjectId(created.id);
      setProjectToLoadId(created.id);
      setProjectName(created.name);
      await refreshProjects();
      setStorageStatus({ tone: "success", message: "Project created and saved locally." });
    } catch (error) {
      setStorageStatus({ tone: "warning", message: error instanceof Error ? error.message : "Project could not be saved locally." });
    }
  }

  async function renameProject() {
    if (!activeProjectId) {
      setStorageStatus({ tone: "warning", message: "Create or load a local project before renaming it." });
      return;
    }

    const name = projectName.trim() || "Untitled Parcel Project";
    try {
      const updated = await projectStore.updateProject(activeProjectId, { name });
      setProjectName(updated.name);
      await refreshProjects();
      setStorageStatus({ tone: "success", message: "Project renamed in local preview storage." });
    } catch (error) {
      setStorageStatus({ tone: "warning", message: error instanceof Error ? error.message : "Project could not be renamed locally." });
    }
  }

  function applyProject(project: ParcelProject) {
    setActiveProjectId(project.id);
    setProjectToLoadId(project.id);
    setProjectName(project.name);
    setThesis({ ...project.thesis, listingLinks: project.listingLinks });
    setSeedCandidates(project.candidates.length ? project.candidates : parcelOpportunities);
    setCandidateInputs([]);
    setSavedIds(project.shortlistedCandidateIds);
    setSelectedId(project.selectedCandidateId ?? project.shortlistedCandidateIds[0] ?? project.candidates[0]?.id ?? "york-kays-drive");
    const savedMemo = project.memo?.thesisSummary ? project.memo : undefined;
    setMemoNotes(project.userNotes ?? savedMemo?.userNotes ?? "");
    setGeneratedMemo(savedMemo);
    setMemoExportStatus(
      savedMemo
        ? { tone: "success", message: "Loaded saved memo preview from this local project." }
        : { tone: "neutral", message: "Generate a memo before copying or downloading markdown." },
    );
    setResearchResult(undefined);
    setResearchStatus("idle");
    setDetailTab("evidence");
    setShowComparison(project.shortlistedCandidateIds.length >= 2);
  }

  function loadProject() {
    const project = projects.find((item) => item.id === projectToLoadId);
    if (!project) {
      setStorageStatus({ tone: "warning", message: "Choose a local project to load." });
      return;
    }

    applyProject(project);
    setStorageStatus({ tone: "success", message: "Project loaded from local preview storage." });
  }

  async function deleteProject() {
    if (!projectToLoadId) {
      setStorageStatus({ tone: "warning", message: "Choose a local project to delete." });
      return;
    }

    try {
      await projectStore.deleteProject(projectToLoadId);
      if (activeProjectId === projectToLoadId) {
        setActiveProjectId(undefined);
      }
      const nextProjects = await refreshProjects();
      setProjectToLoadId(nextProjects[0]?.id ?? "");
      setStorageStatus({ tone: "warning", message: "Project deleted from local preview storage." });
    } catch (error) {
      setStorageStatus({ tone: "warning", message: error instanceof Error ? error.message : "Project could not be deleted locally." });
    }
  }

  function updateThesis(field: keyof ParcelThesisInput, value: string | number) {
    setThesis((current) => ({ ...current, [field]: value } as ParcelThesisInput));
    setResearchResult(undefined);
    setResearchStatus("idle");
    setGeneratedMemo(undefined);
    setMemoExportStatus({ tone: "neutral", message: "Thesis changed. Generate a fresh memo preview before exporting." });
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
    setGeneratedMemo(undefined);
    setMemoExportStatus({ tone: "neutral", message: "Candidate list changed. Generate a fresh memo preview before exporting." });
    if (candidate) {
      setSelectedId(candidate.id);
    }
  }

  function removeLead(id: string) {
    setCandidateInputs((current) => current.filter((input) => normalizeCandidateInputs(thesis, [input])[0]?.id !== id));
    setSavedIds((current) => current.filter((item) => item !== id));
    setResearchResult(undefined);
    setResearchStatus("idle");
    setGeneratedMemo(undefined);
    setMemoExportStatus({ tone: "neutral", message: "Candidate list changed. Generate a fresh memo preview before exporting." });
    if (selectedId === id) {
      setSelectedId("york-kays-drive");
    }
  }

  function toggleSaved(id: string) {
    setSavedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    setGeneratedMemo(undefined);
    setMemoExportStatus({ tone: "neutral", message: "Shortlist changed. Generate a fresh memo preview before exporting." });
  }

  function compareShortlist() {
    setShowComparison(true);
  }

  function buildCurrentMemo() {
    const riskFlags = buildProjectRiskFlags(memoCandidates);
    return buildStructuredParcelMemo({ thesis, candidates: memoCandidates, riskFlags, userNotes: memoNotes });
  }

  function updateMemoNotes(value: string) {
    setMemoNotes(value);
    setGeneratedMemo(undefined);
    setMemoExportStatus({ tone: "neutral", message: "User notes changed. Generate a fresh memo preview before exporting." });
  }

  async function generateMemo() {
    if (!memoCandidates.length) {
      setMemoExportStatus({ tone: "warning", message: "Add at least one parcel to the shortlist before generating a memo." });
      return;
    }

    const memo = buildCurrentMemo();
    setGeneratedMemo(memo);
    setDetailTab("memo");
    setMemoExportStatus({ tone: "success", message: "Memo preview generated from the current thesis and shortlist." });

    if (activeProjectId) {
      try {
        const name = projectName.trim() || "Untitled Parcel Project";
        await projectStore.updateProject(activeProjectId, {
          ...buildCurrentProjectDraft(name),
          memo,
          userNotes: memoNotes,
          riskFlags: memo.keyRiskFlags,
        });
        await refreshProjects();
      } catch {
        setStorageStatus({ tone: "warning", message: "Memo generated, but local project storage could not be updated." });
      }
    }
  }

  async function copyMemoMarkdown() {
    if (!generatedMemo) {
      setMemoExportStatus({ tone: "warning", message: "Generate a memo before copying markdown." });
      return;
    }

    try {
      await navigator.clipboard.writeText(parcelMemoToMarkdown(generatedMemo, projectName));
      setMemoExportStatus({ tone: "success", message: "Memo markdown copied to clipboard." });
    } catch {
      setMemoExportStatus({ tone: "warning", message: "Clipboard access was unavailable. Download the markdown file instead." });
    }
  }

  function downloadMemoMarkdown() {
    if (!generatedMemo) {
      setMemoExportStatus({ tone: "warning", message: "Generate a memo before downloading markdown." });
      return;
    }

    downloadMarkdownFile(safeFilename(projectName), parcelMemoToMarkdown(generatedMemo, projectName));
    setMemoExportStatus({ tone: "success", message: "Memo markdown download started." });
  }

  async function runEvaluation(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setResearchStatus("loading");
    setGeneratedMemo(undefined);
    setMemoExportStatus({ tone: "neutral", message: "Evaluation refreshed. Generate a fresh memo preview before exporting." });
    const request = buildParcelResearchRequest(thesis, [selectedId], savedIds, candidateInputs);

    try {
      const nextResult = await api.parcelResearch(request);
      const resultCandidateIds = new Set(nextResult.candidateRecords.map((candidate) => candidate.id));
      const mergedCandidateRecords = [
        ...nextResult.candidateRecords,
        ...baseCandidateRecords.filter((candidate) => !resultCandidateIds.has(candidate.id)),
      ];
      setResearchResult({ ...nextResult, candidateRecords: mergedCandidateRecords });
      setSelectedId(nextResult.rankedCandidateIds[0] ?? selectedId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Backend request was unavailable.";
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
              <p className="text-xs font-black uppercase text-[#66796e]">Parcel Intelligence</p>
              <h1 className="mt-1 text-3xl font-black leading-tight text-[#18241e] md:text-4xl">
                Parcel research, evidence first.
              </h1>
            </div>
            <div className="grid gap-1 rounded-[6px] border border-[#d5ddd3] bg-white px-4 py-3 text-sm shadow-[0_10px_30px_rgba(21,32,26,0.06)]">
              <span className="font-black text-[#18241e]">
                {topCandidate ? `Current screen: ${topCandidate.opportunity.title}` : "No candidate"}
              </span>
              <span className="text-[#52645b]">Research fit, proof gaps, and next diligence are visible before memo scope.</span>
            </div>
          </div>

          <section className="grid gap-3 rounded-[6px] border border-[#c7d4cc] bg-white p-4 shadow-[0_10px_30px_rgba(21,32,26,0.06)] md:grid-cols-[minmax(0,1fr)_minmax(280px,0.5fr)]">
            <div>
              <p className="text-xs font-black uppercase text-[#66796e]">Trust boundary</p>
              <h2 className="mt-1 text-xl font-black leading-tight text-[#18241e]">
                Research workspace, not legal/financial/real-estate advice.
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#52645b]">
                Verify zoning, title, survey, environmental, flood, utilities, and tax details independently.
              </p>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-[#33443c]">
              <p className="border-l-2 border-[#1f6a4a] pl-3">
                Organizes thesis, parcel candidates, source labels, risk flags, shortlist notes, and memo scope.
              </p>
              <p className="border-l-2 border-[#a46b15] pl-3">
                Does not verify parcel facts, replace professionals, or tell you which parcel to pursue.
              </p>
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="grid content-start gap-4">
              <ProjectPersistencePanel
                projects={projects}
                activeProjectId={activeProjectId}
                projectToLoadId={projectToLoadId}
                projectName={projectName}
                status={storageStatus}
                onProjectToLoadChange={setProjectToLoadId}
                onProjectNameChange={setProjectName}
                onCreate={createProject}
                onRename={renameProject}
                onSave={saveCurrentProject}
                onLoad={loadProject}
                onDelete={deleteProject}
              />
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
              researchStatus={researchStatus}
              onSelect={setSelectedId}
              onToggleSaved={toggleSaved}
              onCompareShortlist={compareShortlist}
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
            <WhatToVerifyNextPanel candidate={selectedCandidate} />

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
                )) : <p className="text-sm text-[#52645b]">No saved parcels yet.</p>}
              </div>
              <button
                type="button"
                disabled={savedCandidates.length < 2}
                onClick={compareShortlist}
                className="mt-3 min-h-10 w-full rounded-[4px] border border-[#1f6a4a] bg-[#edf5ef] px-3 text-sm font-black text-[#18241e] hover:bg-[#dceee4] disabled:cursor-not-allowed disabled:border-[#c5d0c9] disabled:bg-[#f4f7f2] disabled:text-[#8a9a92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1f6a4a]"
              >
                Compare shortlisted parcels
              </button>
            </section>

            {showComparison ? (
              <ShortlistComparisonPanel candidates={savedCandidates} onSelect={setSelectedId} onRemove={toggleSaved} />
            ) : null}

            <MemoPreviewPanel
              memo={generatedMemo}
              projectName={projectName}
              userNotes={memoNotes}
              exportStatus={memoExportStatus}
              canGenerate={memoCandidates.length > 0}
              onUserNotesChange={updateMemoNotes}
              onGenerate={generateMemo}
              onCopy={copyMemoMarkdown}
              onDownload={downloadMemoMarkdown}
            />

            <section className="rounded-[6px] border border-[#d5ddd3] bg-[#18241e] p-4 text-white shadow-[0_18px_60px_rgba(21,32,26,0.16)]">
              <h2 className="text-xl font-black">Founding diligence memo</h2>
              <p className="mt-2 text-sm leading-6 text-[#dbe7df]">
                Source-aware triage, verification plan, and human-reviewed memo. Project storage is local preview only in this pass.
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
          <span>Parcel is research support, not brokerage, appraisal, legal, tax, financial, engineering, or real-estate advice.</span>
          <span>{mustHaves.length ? `Current thesis: ${thesis.targetCountyOrRegion}, ${mustHaves.slice(0, 3).join(", ")}` : "Add must-haves to sharpen the screen."}</span>
        </div>
      </section>
    </div>
  );
}
