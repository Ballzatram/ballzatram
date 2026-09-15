"use client";

import { usePathname } from "next/navigation";
import { AppLayout } from "@/components/AppLayout";

export function Layout({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname() ?? "/";
  if (currentPath !== "/") return <AppLayout>{children}</AppLayout>;
  return (
    <div className="frontier-home">
      <a className="frontier-skip" href="#site-content">Skip to content</a>
      <header className="frontier-header frontier-width">
        <a className="frontier-brand" href="/" aria-label="Devin Gallemore home">
          <svg className="pixel-icon" aria-hidden="true"><use href="/assets/frontier/icons.svg#hat" /></svg>
          <span>DEVIN GALLEMORE<small>ARIZONA ROOTS. DIGITAL FRONTIERS.</small></span>
        </a>
        <nav className="frontier-nav" aria-label="Main navigation">
          <a href="#programs">The projects</a><a href="/devin/">About Devin</a>
          <a href="https://github.com/Ballzatram/ballzatram">GitHub ↗</a>
          <a className="nav-resume" href="/devin/resume.html">Resume ↗</a>
        </nav>
      </header>
      <main id="site-content" className="frontier-width">{children}</main>
    </div>
  );
}
