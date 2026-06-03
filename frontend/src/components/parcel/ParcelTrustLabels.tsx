import type {
  ParcelConfidenceStatus,
  ParcelFreshnessStatus,
  ParcelSourceTrustStatus,
} from "@/data/parcelOpportunities";

type LabelConfig<TStatus extends string> = Record<
  TStatus,
  {
    label: string;
    description: string;
    className: string;
  }
>;

const baseClass =
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase leading-none";

const sourceStatusConfig: LabelConfig<ParcelSourceTrustStatus> = {
  demo: {
    label: "Demo",
    description: "Committed demo record; use as research context only.",
    className: "border-[#5f766e] bg-[#eef4ef] text-[#2b463a]",
  },
  "user-provided": {
    label: "User-provided",
    description: "Entered by the user and not independently checked by Parcel.",
    className: "border-[#816322] bg-[#fff3c9] text-[#5b3c06]",
  },
  "public-record": {
    label: "Public record",
    description: "Sourced from a public-record context that still needs independent review.",
    className: "border-[#2f6d93] bg-[#e6f2fa] text-[#214761]",
  },
  estimated: {
    label: "Estimated",
    description: "Derived or inferred value that needs supporting documentation.",
    className: "border-[#7a6894] bg-[#f0ebf7] text-[#473b5d]",
  },
  unknown: {
    label: "Unknown source",
    description: "Source status has not been established.",
    className: "border-[#89948f] bg-[#f2f4f3] text-[#47544e]",
  },
};

const freshnessStatusConfig: LabelConfig<ParcelFreshnessStatus> = {
  current: {
    label: "Current",
    description: "Recently researched or explicitly marked current.",
    className: "border-[#23724f] bg-[#e5f4ea] text-[#164431]",
  },
  stale: {
    label: "Stale",
    description: "Research date is old enough to require a fresh check.",
    className: "border-[#a46b15] bg-[#fff2cf] text-[#593907]",
  },
  unknown: {
    label: "Freshness unknown",
    description: "No reliable research date is available.",
    className: "border-[#89948f] bg-[#f2f4f3] text-[#47544e]",
  },
};

const confidenceStatusConfig: LabelConfig<ParcelConfidenceStatus> = {
  high: {
    label: "High confidence",
    description: "Enough supporting context for screening, not final reliance.",
    className: "border-[#23724f] bg-[#e5f4ea] text-[#164431]",
  },
  medium: {
    label: "Medium confidence",
    description: "Useful for comparison, with material verification still open.",
    className: "border-[#5d7794] bg-[#e9f1f8] text-[#253d55]",
  },
  low: {
    label: "Low confidence",
    description: "Treat as tentative until stronger source material is collected.",
    className: "border-[#a46b15] bg-[#fff2cf] text-[#593907]",
  },
  "needs-verification": {
    label: "Needs verification",
    description: "Do not rely on this without independent review.",
    className: "border-[#a64435] bg-[#fbe8e3] text-[#61251b]",
  },
};

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ParcelSourceStatusLabel({ status }: { status: ParcelSourceTrustStatus }) {
  const config = sourceStatusConfig[status];
  return (
    <span className={classNames(baseClass, config.className)} title={config.description}>
      {config.label}
    </span>
  );
}

export function ParcelFreshnessLabel({ status }: { status: ParcelFreshnessStatus }) {
  const config = freshnessStatusConfig[status];
  return (
    <span className={classNames(baseClass, config.className)} title={config.description}>
      {config.label}
    </span>
  );
}

export function ParcelConfidenceLabel({ status }: { status: ParcelConfidenceStatus }) {
  const config = confidenceStatusConfig[status];
  return (
    <span className={classNames(baseClass, config.className)} title={config.description}>
      {config.label}
    </span>
  );
}

export function ParcelTrustLabelSet({
  sourceStatus,
  freshness,
  confidence,
  className,
}: {
  sourceStatus: ParcelSourceTrustStatus;
  freshness: ParcelFreshnessStatus;
  confidence: ParcelConfidenceStatus;
  className?: string;
}) {
  return (
    <div className={classNames("flex flex-wrap gap-2", className)} aria-label="Parcel source, freshness, and confidence labels">
      <ParcelSourceStatusLabel status={sourceStatus} />
      <ParcelFreshnessLabel status={freshness} />
      <ParcelConfidenceLabel status={confidence} />
    </div>
  );
}
