import Link from "next/link";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Stock", "/stock"],
  ["Portfolio", "/portfolio"],
  ["Scenario", "/scenario"],
  ["Event Study", "/event-study"],
  ["Model Compare", "/model-compare"],
  ["Classroom", "/classroom"],
  ["Reports", "/reports"],
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 p-4">
        <h1 className="text-2xl font-semibold text-accent">MacroBoard</h1>
        <p className="text-sm opacity-80">Investor-grade macro + equity analysis</p>
        <nav className="mt-3 flex flex-wrap gap-3 text-sm">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded border border-white/20 px-2 py-1 hover:border-accent">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}
