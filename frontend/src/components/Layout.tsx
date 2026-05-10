import Link from "next/link";
import { AgentWidget } from "@/components/AgentWidget";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Stock Analysis", "/stock"],
  ["Portfolio Analysis", "/portfolio"],
  ["Scenario Lab", "/scenario"],
  ["Event Study", "/event-study"],
  ["Model Comparison", "/model-compare"],
  ["Model Classroom", "/classroom"],
  ["Reports", "/reports"],
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-700/80 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="text-2xl font-bold text-emerald-300 sm:text-3xl">
            MacroBoard
          </Link>
          <nav
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:px-0"
            aria-label="MacroBoard sections"
          >
            {nav.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="min-h-11 shrink-0 rounded-full border border-slate-600 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-300 hover:text-emerald-200"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-28 sm:px-6 lg:px-8">{children}</main>
      <AgentWidget />
    </div>
  );
}
