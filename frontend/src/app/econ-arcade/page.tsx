import { EconArcadePage } from "@/components/econ-arcade/EconArcadePage";
import { EconArcadeProgressPanel } from "@/components/econ-arcade/EconArcadeProgressPanel";

export default function Page() {
  return <div className="space-y-6">
    <section className="rounded-2xl border border-amber-200/40 bg-emerald-950 p-6 text-amber-50">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-200">One family. One continuing story.</p>
      <h1 className="mt-3 text-4xl font-bold">The Family Business</h1>
      <p className="my-4 max-w-3xl leading-7">Start at the deli. Earn responsibility across six ranks by predicting consequences and adapting to a changing neighborhood. Your earlier businesses and economic lessons stay with you.</p>
      <a className="inline-block rounded border border-amber-200 bg-amber-200 px-5 py-3 font-bold text-emerald-950" href="/legacy-econ-arcade/play/">Enter the neighborhood →</a>
    </section>
    <EconArcadeProgressPanel />
    <EconArcadePage />
  </div>;
}
