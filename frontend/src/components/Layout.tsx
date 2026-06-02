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
            <Link href={"/markets" as Route} aria-current={currentPath === "/markets" ? "page" : undefined}>Markets</Link>
            <Link href={"/tools/parcel/index.html" as Route}>Parcel</Link>
            <Link href={"/laboratory" as Route} aria-current={currentPath === "/laboratory" ? "page" : undefined}>Lab</Link>
            <Link href={"/culture" as Route} aria-current={currentPath === "/culture" ? "page" : undefined}>Culture</Link>
            <Link href={"/arcade" as Route} aria-current={currentPath === "/arcade" || currentPath.startsWith("/econ-arcade") ? "page" : undefined}>Arcade</Link>
            <Link href={"/games/stoney-bologna/index.html" as Route}>Blotter</Link>
            <Link href={"/quant-library" as Route} aria-current={currentPath === "/quant-library" ? "page" : undefined}>Quant Library</Link>
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
