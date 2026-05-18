"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { AgentWidget } from "@/components/AgentWidget";
import { workflows } from "@/lib/workflows";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800/90 bg-slate-950/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link href="/dashboard" className="text-2xl font-bold text-emerald-300 sm:text-3xl">
              MacroBoard
            </Link>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Macro risk intelligence</p>
          </div>
          <nav
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:px-0"
            aria-label="MacroBoard sections"
          >
            <Link
              href={"/econ-arcade" as Route}
              aria-current={pathname.startsWith("/econ-arcade") ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                pathname.startsWith("/econ-arcade")
                  ? "border-emerald-200 bg-emerald-300 text-slate-950"
                  : "border-emerald-300/50 text-emerald-100 hover:border-emerald-200 hover:text-white"
              }`}
            >
              Econ Arcade
            </Link>
            <Link
              href={"/invisible-hands" as Route}
              aria-current={pathname === "/invisible-hands" ? "page" : undefined}
              className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                pathname === "/invisible-hands"
                  ? "border-cyan-200 bg-cyan-300 text-slate-950"
                  : "border-cyan-300/50 text-cyan-100 hover:border-cyan-200 hover:text-white"
              }`}
            >
              Invisible Hands
            </Link>
            {workflows.map((workflow) => {
              const href = `/${workflow.slug}` as Route;
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-950 ${
                    active
                      ? "border-emerald-300 bg-emerald-300 text-slate-950"
                      : "border-slate-700 text-slate-100 hover:border-emerald-300 hover:text-emerald-200"
                  }`}
                >
                  {workflow.navLabel}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 pb-28 sm:px-6 lg:px-8">{children}</main>
      <AgentWidget />
    </div>
  );
}
