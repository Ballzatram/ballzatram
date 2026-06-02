import Link from "next/link";
import type { Route } from "next";
import {
  categoryLabels,
  dataModeLabels,
  statusLabels,
  type ToolCatalogItem,
} from "@/config/toolCatalog";

function badgeClass(status: ToolCatalogItem["status"]) {
  switch (status) {
    case "live":
      return "border-emerald-700 bg-emerald-50 text-emerald-900";
    case "prototype":
      return "border-sky-700 bg-sky-50 text-sky-950";
    case "demo":
      return "border-indigo-700 bg-indigo-50 text-indigo-950";
    case "static":
      return "border-zinc-600 bg-zinc-50 text-zinc-900";
    case "experimental":
      return "border-amber-700 bg-amber-50 text-amber-950";
    case "archived":
      return "border-stone-500 bg-stone-100 text-stone-800";
  }
}

function routeLabel(href: string) {
  return href.replace(/\/$/, "") || "/";
}

export function ToolCard({ tool, compact = false }: { tool: ToolCatalogItem; compact?: boolean }) {
  const facts = [
    categoryLabels[tool.category],
    tool.backendRequired ? "Needs backend" : "No backend required",
    tool.dataMode ? dataModeLabels[tool.dataMode] : undefined,
  ].filter(Boolean);

  return (
    <article className="grid min-h-full gap-4 border border-[#21312a] bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.08)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`border px-2 py-1 text-[0.68rem] font-black uppercase tracking-normal ${badgeClass(tool.status)}`}>
          {statusLabels[tool.status]}
        </span>
        {facts.map((fact) => (
          <span
            key={fact}
            className="border border-[#d3d8cf] bg-[#f6f8f3] px-2 py-1 text-[0.68rem] font-bold uppercase tracking-normal text-[#35443b]"
          >
            {fact}
          </span>
        ))}
      </div>

      <div className="grid gap-2">
        <h3 className={compact ? "text-xl font-black leading-6 text-[#121a16]" : "text-2xl font-black leading-7 text-[#121a16]"}>
          {tool.name}
        </h3>
        <p className="text-sm leading-6 text-[#3c4942]">{tool.description}</p>
      </div>

      {tool.readinessNote ? (
        <p className="border-l-2 border-[#d09b2c] pl-3 text-xs font-semibold leading-5 text-[#60420e]">
          {tool.readinessNote}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-sm font-bold">
        <Link
          href={tool.href as Route}
          className="border border-[#111816] bg-[#111816] px-3 py-2 text-white transition hover:bg-[#284236]"
        >
          Open {routeLabel(tool.href)}
        </Link>
        {tool.secondaryHref ? (
          <Link
            href={tool.secondaryHref as Route}
            className="border border-[#96a097] px-3 py-2 text-[#1d2b25] transition hover:border-[#111816] hover:bg-[#eff5ec]"
          >
            Also {routeLabel(tool.secondaryHref)}
          </Link>
        ) : null}
        {tool.docsHref ? (
          <Link
            href={tool.docsHref as Route}
            className="border border-transparent px-2 py-2 text-[#355f82] transition hover:border-[#9fb6c9] hover:bg-[#edf6fb]"
          >
            Docs
          </Link>
        ) : null}
      </div>
    </article>
  );
}
