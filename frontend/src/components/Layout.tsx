"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";

const navigation = [
  { label: "Desktop", href: "/" },
  { label: "Parcel", href: "/land" },
  { label: "Quant Library", href: "/quant-library" },
  { label: "Games", href: "/arcade" },
  { label: "AI Lab", href: "/laboratory" },
  { label: "Archive", href: "/archive" },
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname() ?? "/";
  return currentPath === "/" ? <DesktopLayout>{children}</DesktopLayout> : <AppLayout>{children}</AppLayout>;
}

function DesktopLayout({ children }: { children: React.ReactNode }) {
  const currentPath = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const startRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node) && !startRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", closeOutside);
    return () => document.removeEventListener("click", closeOutside);
  }, []);
  useEffect(() => { setMenuOpen(false); }, [currentPath]);

  return (
    <div className="retro-next min-h-dvh">
      <a className="skip-link" href="#site-content">Skip to content</a>
      <header className="next-header95 window95">
        <div className="title95"><span className="window-label">Ballzatram 95 — Personal laboratory</span></div>
        <nav className="next-nav95" aria-label="Ballzatram sections">
          {navigation.map(item => <Link key={item.href} href={item.href as Route} aria-current={currentPath === item.href ? "page" : undefined}>{item.label}</Link>)}
        </nav>
      </header>
      <main id="site-content" className="next-main95">{children}</main>
      <nav className="taskbar95" aria-label="Desktop taskbar">
        <button ref={startRef} className="btn95 start95" type="button" aria-expanded={menuOpen} aria-controls="next-start95" onClick={() => setMenuOpen(!menuOpen)} onKeyDown={event => { if (event.key === "Escape") setMenuOpen(false); }}>Start</button>
        <Link className="btn95 task95" href={"/" as Route}>Ballzatram</Link><span className="tray95">Personal laboratory</span>
      </nav>
      <nav ref={menuRef} hidden={!menuOpen} id="next-start95" className="start-menu95" aria-label="Start menu" onKeyDown={event => { if (event.key === "Escape") { setMenuOpen(false); startRef.current?.focus(); } }}>
        {navigation.map(item => <Link key={item.href} href={item.href as Route} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
      </nav>
    </div>
  );
}
