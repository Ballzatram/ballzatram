"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentWidget } from "@/components/AgentWidget";
import { SkyLayer } from "@/components/SkyLayer";
import { workflows } from "@/lib/workflows";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentPath = pathname ?? "/";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const macroRoutes = new Set(["/quant-library", "/macro-board", ...workflows.map((workflow) => `/${workflow.slug}`)]);
  const isMacroRoute = macroRoutes.has(currentPath);
  const isPenitent = currentPath.startsWith("/penitent");
  const isHome = currentPath === "/";
  const isMarketsRoute = currentPath === "/markets" || isMacroRoute;
  const isBettingRoute = currentPath === "/bettors-corner" || currentPath === "/betting";
  const isLandRoute = currentPath === "/land" || currentPath.startsWith("/tools/parcel");
  const isLaboratoryRoute = currentPath === "/laboratory" || currentPath.startsWith("/ai-edit-factory");
  const isCultureRoute = currentPath === "/culture" || currentPath.startsWith("/penitent");
  const isStoneyRoute = currentPath === "/stoney-baologna" || currentPath.startsWith("/games/stoney-bologna");

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentPath]);

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
            <p>Work Shop of games, relics, and strange machinery</p>
          </div>
          <button
            type="button"
            className="ballzatram-mobile-nav-toggle"
            aria-expanded={mobileNavOpen}
            aria-controls="ballzatram-main-nav"
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            <span>{mobileNavOpen ? "Close menu" : "Open menu"}</span>
          </button>
          <nav
            id="ballzatram-main-nav"
            className={`ballzatram-main-nav ${mobileNavOpen ? "is-open" : ""}`}
            aria-label="Ballzatram sections"
          >
            <Link href={"/" as Route} aria-current={currentPath === "/" || currentPath === "/daily" ? "page" : undefined}>Daily</Link>
            <Link href={"/markets" as Route} aria-current={isMarketsRoute ? "page" : undefined}>Markets</Link>
            <Link href={"/bettors-corner" as Route} aria-current={isBettingRoute ? "page" : undefined}>Betting</Link>
            <Link href={"/land" as Route} aria-current={isLandRoute ? "page" : undefined}>Land</Link>
            <Link href={"/laboratory" as Route} aria-current={isLaboratoryRoute ? "page" : undefined}>Laboratory</Link>
            <Link href={"/culture" as Route} aria-current={isCultureRoute ? "page" : undefined}>Culture</Link>
            <Link href={"/arcade" as Route} aria-current={currentPath.startsWith("/arcade") || currentPath.startsWith("/econ-arcade") ? "page" : undefined}>Arcade</Link>
            <Link href={"/stoney-baologna" as Route} aria-current={isStoneyRoute ? "page" : undefined}>Stoney</Link>
          </nav>
        </div>
        {isMacroRoute ? (
          <nav className="ballzatram-workflow-nav" aria-label="Quant Library instruments">
            <Link href={"/quant-library" as Route} aria-current={currentPath === "/quant-library" ? "page" : undefined}>
              Quant Library
            </Link>
            {workflows.filter((workflow) => workflow.slug !== "dashboard").map((workflow) => {
              const href = `/${workflow.slug}` as Route;
              return <Link key={href} href={href} aria-current={currentPath === href ? "page" : undefined}>{workflow.navLabel}</Link>;
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
