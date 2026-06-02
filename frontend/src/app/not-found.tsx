import Link from "next/link";
import type { Route } from "next";

const recoveryRoutes = [
  { label: "Daily", href: "/" as Route },
  { label: "Markets", href: "/markets" as Route },
  { label: "Betting", href: "/bettors-corner" as Route },
  { label: "Arcade", href: "/arcade" as Route },
  { label: "Stoney", href: "/stoney-baologna" as Route },
];

export default function NotFound() {
  return (
    <section className="min-h-dvh bg-[#efe3c2] text-[#24150b]">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-12 sm:px-6 lg:px-8">
        <div className="border-b-[3px] border-double border-[#24150b] pb-6">
          <p className="font-mono text-[0.72rem] font-black uppercase tracking-[0.2em] text-[#7a5730]">
            Ballzatram routing desk / 404
          </p>
          <h1 className="mt-3 font-serif text-[clamp(3rem,8vw,6.5rem)] font-black leading-[0.86] text-[#1b1109]">
            The route exists only in rumor.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#4b2b16]">
            This page is missing, moved, or still waiting for a department to claim it.
          </p>
        </div>
        <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Recovery routes">
          {recoveryRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="border border-[#2b1b10] bg-[#f7edcf] px-3 py-3 text-center font-mono text-[0.72rem] font-black uppercase tracking-[0.14em] hover:bg-[#24150b] hover:text-[#f4e7c8]"
            >
              {route.label}
            </Link>
          ))}
        </nav>
      </div>
    </section>
  );
}
