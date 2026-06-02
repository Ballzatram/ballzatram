import Link from "next/link";
import type { Route } from "next";
import { stoneyLine, stoneyProfile } from "@/config/stoney";

type StoneyTone = "paper" | "dark" | "amber";

const toneClasses: Record<StoneyTone, string> = {
  paper: "border-[#2b1b10] bg-[#f7edcf] text-[#24150b]",
  dark: "border-[#f4e7c8]/25 bg-[#1b1109] text-[#f4e7c8]",
  amber: "border-[#7a5730] bg-[#ead9ad] text-[#24150b]",
};

function roleLabel() {
  return stoneyProfile.titles.slice(0, 2).join(" / ");
}

export function StoneyQuote({
  quote = stoneyLine(0),
  tone = "paper",
}: {
  quote?: string;
  tone?: StoneyTone;
}) {
  return (
    <blockquote className={`border-l-4 px-4 py-3 font-serif text-lg font-black leading-7 ${toneClasses[tone]}`}>
      <p>&quot;{quote}&quot;</p>
      <footer className="mt-2 font-mono text-[0.65rem] font-black uppercase tracking-[0.16em] opacity-75">
        {stoneyProfile.displayName}
      </footer>
    </blockquote>
  );
}

export function StoneyStatusLine({
  label = "Stoney status",
  line = stoneyLine(4),
  tone = "paper",
}: {
  label?: string;
  line?: string;
  tone?: StoneyTone;
}) {
  return (
    <p className={`border px-3 py-2 font-mono text-[0.7rem] font-black uppercase tracking-[0.14em] ${toneClasses[tone]}`}>
      <span className="opacity-70">{label}:</span> {line}
    </p>
  );
}

export function StoneyAside({
  title = "A note from the resident correspondent",
  body = stoneyLine(1),
  tone = "paper",
}: {
  title?: string;
  body?: string;
  tone?: StoneyTone;
}) {
  return (
    <aside className={`border p-4 ${toneClasses[tone]}`}>
      <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] opacity-75">
        {roleLabel()}
      </p>
      <h2 className="mt-2 font-serif text-2xl font-black leading-none">{title}</h2>
      <p className="mt-3 text-sm leading-6 opacity-85">{body}</p>
      <Link
        href={"/stoney-baologna" as Route}
        className="mt-4 inline-flex font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] underline-offset-4 hover:underline"
      >
        Meet Stoney
      </Link>
    </aside>
  );
}

export function StoneyBriefingCard({
  kicker = "Current Events / Stoney desk",
  headline,
  body,
  href = "/stoney-baologna",
  linkLabel = "Open Stoney file",
  tone = "dark",
}: {
  kicker?: string;
  headline: string;
  body: string;
  href?: `/${string}`;
  linkLabel?: string;
  tone?: StoneyTone;
}) {
  return (
    <article className={`border p-5 ${toneClasses[tone]}`}>
      <p className="font-mono text-[0.68rem] font-black uppercase tracking-[0.18em] opacity-75">{kicker}</p>
      <h2 className="mt-2 font-serif text-3xl font-black leading-none">{headline}</h2>
      <p className="mt-3 text-sm leading-6 opacity-85">{body}</p>
      <div className="mt-4">
        <StoneyQuote quote={stoneyLine(3)} tone={tone} />
      </div>
      <Link
        href={href as Route}
        className="mt-4 inline-flex border px-3 py-2 font-mono text-[0.68rem] font-black uppercase tracking-[0.14em] transition hover:-translate-y-0.5"
      >
        {linkLabel}
      </Link>
    </article>
  );
}

export function StoneyErrorMessage({
  message = "The machine coughed, blamed the weather, and asked for a smaller job.",
  action,
}: {
  message?: string;
  action?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-300/35 bg-amber-300/10 p-4 text-amber-50">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">
        Stoney non-critical error note
      </p>
      <p className="mt-2 text-sm leading-6">{message}</p>
      {action ? <p className="mt-2 text-sm leading-6 text-amber-100/80">{action}</p> : null}
    </div>
  );
}
