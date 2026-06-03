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
  const isLandRoute = currentPath === "/land" || currentPath.startsWith("/tools/parcel");
  const isGamesRoute = currentPath.startsWith("/arcade") || currentPath.startsWith("/econ-arcade") || currentPath.startsWith("/games");
  const isLaboratoryRoute =
    currentPath === "/laboratory" ||
    currentPath.startsWith("/ai-edit-factory") ||
    currentPath.startsWith("/internal/generated-stories");
  const isArchiveRoute =
    currentPath === "/archive" ||
    currentPath === "/daily" ||
    currentPath === "/culture" ||
    currentPath.startsWith("/penitent") ||
    currentPath.startsWith("/pntnt2") ||
    currentPath.startsWith("/stoney-baologna") ||
    currentPath.startsWith("/bettors-corner") ||
    currentPath.startsWith("/betting") ||
    currentPath.startsWith("/internal/product-architecture");
  const primaryNav = [
    { label: "Home", href: "/" as Route, active: currentPath === "/" },
    { label: "Parcel", href: "/land" as Route, active: isLandRoute },
    { label: "Quant Library", href: "/quant-library" as Route, active: isMarketsRoute },
    { label: "Games", href: "/arcade" as Route, active: isGamesRoute },
    { label: "AI Lab", href: "/laboratory" as Route, active: isLaboratoryRoute },
    { label: "Archive", href: "/archive" as Route, active: isArchiveRoute },
  ];

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentPath]);

  if (isPenitent) {
    return <>{children}</>;
  }

  return (
    <div
      className={`ballzatram-site-shell min-h-dvh ${isHome ? "ballzatram-site-shell--sky" : "text-[#f8ead1]"} ${isLandRoute ? "ballzatram-site-shell--land" : ""}`}
    >
      {isHome ? <SkyLayer /> : null}
      <a className="skip-link" href="#site-content">Skip to content</a>
      <header className={`ballzatram-site-header ${isHome ? "ballzatram-site-header--sky" : ""} ${isLandRoute ? "ballzatram-site-header--land" : ""}`}>
        <div className="ballzatram-site-header__inner">
          <div className="ballzatram-site-header__brand">
            {isLandRoute ? (
              <Link href={"/land" as Route} className="ballzatram-product-mark" aria-label="Parcel home">
                Parcel
              </Link>
            ) : (
              <Link href={"/" as Route} className="ballzatram-logo-link" aria-label="Ballzatram home">
                <img src="/assets/title.png" alt="Ballzatram" />
              </Link>
            )}
            {isLandRoute ? (
              <div className="ballzatram-site-header__product">
                <span>Evaluator Workspace</span>
                <b>Ballzatram</b>
              </div>
            ) : (
              <p>AI-guided workbenches, simulations, games, and odd tools</p>
            )}
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
            {primaryNav.map((item) => (
              <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
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
