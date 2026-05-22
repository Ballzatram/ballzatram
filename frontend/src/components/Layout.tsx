"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { AgentWidget } from "@/components/AgentWidget";
import { SkyLayer } from "@/components/SkyLayer";
import { workflows } from "@/lib/workflows";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "/";
  const macroRoutes = new Set(["/macro-board", ...workflows.map((workflow) => `/${workflow.slug}`)]);
  const isMacroRoute = macroRoutes.has(currentPath);
  const isPenitent = currentPath.startsWith("/penitent");
  const isHome = currentPath === "/";

  if (isPenitent) {
    return <>{children}</>;
  }

  return (
    <div className={`ballzatram-site-shell min-h-dvh ${isHome ? "ballzatram-site-shell--sky" : "text-[#f8ead1]"}`}>
      {isHome ? <SkyLayer /> : null}
      <a className="skip-link" href="#site-content">Skip to content</a>
      <header className={`ballzatram-site-header ${isHome ? "ballzatram-site-header--sky" : ""}`}>
        <div className="ballzatram-site-header__inner">
          <div className="ballzatram-site-header__brand">
            <Link href={"/" as Route} className="ballzatram-logo-link" aria-label="Ballzatram home">
              <img src="/assets/title.png" alt="Ballzatram" />
            </Link>
            <p>Playable archive of games, music, lore, and strange machinery</p>
          </div>
          <nav
            className="ballzatram-main-nav"
            aria-label="Ballzatram sections"
          >
            <Link
              href={"/" as Route}
              aria-current={currentPath === "/" ? "page" : undefined}
            >
              Home
            </Link>
            <Link href={"/#arcade" as Route}>Arcade</Link>
            <Link
              href={"/penitent" as Route}
              aria-current={currentPath.startsWith("/penitent") ? "page" : undefined}
            >
              Archive
            </Link>
            <Link href={"/#music" as Route}>Music</Link>
            <Link href={"/#workshop" as Route}>Workshop</Link>
            <Link href={"/#lore" as Route}>Lore</Link>
            <Link href={"/econ-arcade" as Route} aria-current={currentPath.startsWith("/econ-arcade") ? "page" : undefined}>
              Games
            </Link>
          </nav>
        </div>
        {isMacroRoute ? (
          <nav className="ballzatram-workflow-nav" aria-label="MacroBoard instruments">
            <Link href={"/macro-board" as Route} aria-current={currentPath === "/macro-board" ? "page" : undefined}>
              Macro Board
            </Link>
            {workflows
              .filter((workflow) => workflow.slug !== "dashboard")
              .map((workflow) => {
                const href = `/${workflow.slug}` as Route;
                return (
                  <Link key={href} href={href} aria-current={currentPath === href ? "page" : undefined}>
                    {workflow.navLabel}
                  </Link>
                );
              })}
          </nav>
        ) : null}
      </header>
      <main id="site-content" className={isMacroRoute || currentPath.startsWith("/econ-arcade") ? "mx-auto w-full max-w-7xl px-4 py-5 pb-28 sm:px-6 lg:px-8" : ""}>
        {children}
      </main>
      {isMacroRoute ? <AgentWidget /> : null}
    </div>
  );
}
