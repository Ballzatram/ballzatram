import Link from "next/link";
import type { Route } from "next";
import {
  categoryLabels,
  getToolById,
  getToolsForCategory,
  routeInventory,
  statusLabels,
  type ToolCategory,
} from "@/config/toolCatalog";
import { ToolCard } from "@/components/launchpad/ToolCard";

type ToolSectionPageProps = {
  category: Exclude<ToolCategory, "featured">;
  title: string;
  eyebrow: string;
  description: string;
  positioning: string;
  primaryToolId?: string;
};

export function ToolSectionPage({
  category,
  title,
  eyebrow,
  description,
  positioning,
  primaryToolId,
}: ToolSectionPageProps) {
  const tools = getToolsForCategory(category);
  const primaryTool = primaryToolId ? getToolById(primaryToolId) : tools[0];
  const inventory = routeInventory.filter((route) => route.section === categoryLabels[category]);

  return (
    <section className="min-h-dvh bg-[#f7f9f3] text-[#121a16]">
      <div className="border-b border-[#22342c] bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-7 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
          <header>
            <p className="text-sm font-black uppercase tracking-normal text-[#4f6b5f]">{eyebrow}</p>
            <h1 className="mt-3 text-[clamp(2.8rem,7vw,5.5rem)] font-black leading-[0.9] tracking-normal text-[#111816]">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg font-semibold leading-8 text-[#314139]">{description}</p>
            <p className="mt-4 max-w-3xl border-l-2 border-[#d09b2c] pl-3 text-sm font-semibold leading-6 text-[#5a4315]">
              {positioning}
            </p>
          </header>

          {primaryTool ? (
            <aside className="grid content-start gap-4 border border-[#22342c] bg-[#16241e] p-5 text-white">
              <div>
                <p className="text-[0.68rem] font-black uppercase tracking-normal text-[#a7c9b7]">Primary tool</p>
                <h2 className="mt-2 text-2xl font-black leading-7">{primaryTool.name}</h2>
                <p className="mt-3 text-sm leading-6 text-[#dbe6df]">{primaryTool.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-[0.68rem] font-black uppercase tracking-normal">
                <span className="border border-[#7d9587] px-2 py-1">{statusLabels[primaryTool.status]}</span>
                {primaryTool.backendRequired ? <span className="border border-[#7d9587] px-2 py-1">Needs backend</span> : null}
              </div>
              <Link
                href={primaryTool.href as Route}
                className="inline-flex justify-center border border-white bg-white px-3 py-2 text-sm font-black text-[#16241e] transition hover:bg-[#dff0e6]"
              >
                Open primary route
              </Link>
            </aside>
          ) : null}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#c6d0c5] pb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-[#66746c]">{categoryLabels[category]}</p>
              <h2 className="text-3xl font-black leading-9">Current public tools</h2>
            </div>
            <Link href={"/" as Route} className="text-sm font-black text-[#2f6b50] hover:text-[#16241e]">
              Back to launchpad
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <section className="border border-[#c6d0c5] bg-white p-4">
            <p className="text-xs font-black uppercase tracking-normal text-[#66746c]">Readiness</p>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-[#3d4a43]">
              <p>Statuses are descriptive, not guarantees.</p>
              <p>Research workflows keep caveats visible and require human review.</p>
              <p>No checkout, billing, auth, entitlement, or live execution was added in this reset.</p>
            </div>
          </section>

          {inventory.length ? (
            <section className="border border-[#c6d0c5] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-normal text-[#66746c]">Routes</p>
              <div className="mt-3 grid gap-2">
                {inventory.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href as Route}
                    className="border-l-2 border-[#d09b2c] pl-3 text-sm font-bold leading-5 text-[#17221d] hover:text-[#2f6b50]"
                  >
                    <span className="block">{route.label}</span>
                    <span className="font-normal text-[#607068]">{route.href}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
