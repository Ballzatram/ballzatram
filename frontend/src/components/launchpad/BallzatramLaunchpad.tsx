import Link from "next/link";
import type { Route } from "next";
import {
  categoryLabels,
  getToolsForCategory,
  launchpadSections,
  routeInventory,
} from "@/config/toolCatalog";
import { ToolCard } from "@/components/launchpad/ToolCard";

const primaryRoutes = [
  { label: "Land", href: "/land" },
  { label: "Markets", href: "/markets" },
  { label: "Games", href: "/arcade" },
  { label: "AI Lab", href: "/laboratory" },
  { label: "Archive", href: "/archive" },
] as const;

const summaryNotes = [
  "No checkout",
  "No auth gates",
  "No live trading",
  "Human review required",
] as const;

function sectionHref(sectionId: string) {
  return `#${sectionId}-section`;
}

export function BallzatramLaunchpad() {
  return (
    <div className="relative z-10 min-h-dvh bg-[#f7f9f3] text-[#121a16]">
      <section id="featured-section" className="border-b border-[#22342c] bg-[#f7f9f3]/95">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] lg:px-8">
          <div className="grid content-center gap-5">
            <div className="flex flex-wrap gap-2">
              {summaryNotes.map((note) => (
                <span key={note} className="border border-[#98a596] bg-white px-2 py-1 text-[0.68rem] font-black uppercase tracking-normal text-[#24332c]">
                  {note}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-normal text-[#4f6b5f]">
                Useful workbenches, simulations, and odd experiments
              </p>
              <h1 className="mt-3 text-[clamp(3rem,8vw,6.6rem)] font-black leading-[0.86] tracking-normal text-[#111816]">
                Ballzatram
              </h1>
              <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#314139]">
                A lab of useful AI-guided workbenches, simulations, and strange little tools.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Launchpad sections">
              {primaryRoutes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href as Route}
                  className="border border-[#16241e] bg-[#16241e] px-4 py-2 text-sm font-black text-white transition hover:bg-[#2d4a3b]"
                >
                  {route.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {getToolsForCategory("featured").map((tool) => (
              <ToolCard key={tool.id} tool={tool} compact />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#c7d0c3] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-5 sm:px-6 md:grid-cols-3 lg:grid-cols-6 lg:px-8">
          {launchpadSections.map((section) => (
            <a
              key={section.id}
              href={sectionHref(section.id)}
              className="border-l-2 border-[#d09b2c] pl-3 text-sm font-black text-[#17221d] hover:text-[#2d6b4f]"
            >
              <span className="block text-[0.65rem] uppercase tracking-normal text-[#65736a]">{section.eyebrow}</span>
              {section.title}
            </a>
          ))}
        </div>
      </section>

      {launchpadSections.slice(1).map((section) => {
        const tools = getToolsForCategory(section.id);

        return (
          <section key={section.id} id={`${section.id}-section`} className="border-b border-[#d4dbd0] py-10">
            <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
              <header className="content-start">
                <p className="text-xs font-black uppercase tracking-normal text-[#647168]">{section.eyebrow}</p>
                <h2 className="mt-2 text-3xl font-black leading-9 text-[#111816]">{section.title}</h2>
                <p className="mt-3 text-sm leading-6 text-[#405149]">{section.description}</p>
                <Link
                  href={(section.id === "land"
                    ? "/land"
                    : section.id === "markets"
                      ? "/markets"
                      : section.id === "games"
                        ? "/arcade"
                        : section.id === "creative"
                          ? "/laboratory"
                          : "/archive") as Route}
                  className="mt-5 inline-flex border border-[#aeb9ad] px-3 py-2 text-sm font-black text-[#24332c] transition hover:border-[#16241e] hover:bg-white"
                >
                  Open {categoryLabels[section.id]}
                </Link>
              </header>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {tools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section id="route-inventory" className="bg-[#16241e] py-10 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
          <header>
            <p className="text-xs font-black uppercase tracking-normal text-[#a7c9b7]">Route inventory</p>
            <h2 className="mt-2 text-3xl font-black leading-9">Simple public map</h2>
            <p className="mt-3 text-sm leading-6 text-[#cbd8d1]">
              The homepage stays small; deeper tools remain available from their own routes.
            </p>
          </header>
          <div className="grid gap-3 md:grid-cols-2">
            {routeInventory.map((route) => (
              <Link
                key={route.href}
                href={route.href as Route}
                className="grid gap-2 border border-[#617568] bg-[#1f342b] p-4 transition hover:border-[#d09b2c] hover:bg-[#284236]"
              >
                <span className="text-[0.68rem] font-black uppercase tracking-normal text-[#b7c6bd]">{route.section}</span>
                <strong className="text-xl leading-6">{route.label}</strong>
                <span className="text-sm leading-6 text-[#dbe6df]">{route.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
