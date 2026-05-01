import { Layout } from "@/components/Layout";
import { MetricCard } from "@/components/MetricCard";
import { summary, drivers } from "@/lib/mock";

export default function Page() {
  return (
    <Layout>
      <h2 className="mb-4 text-xl font-semibold capitalize">model compare</h2>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Rates Beta" value={summary.betaToRates.toFixed(2)} sub="Rolling OLS" />
        <MetricCard label="CPI Sensitivity" value={summary.cpiSensitivity.toFixed(2)} sub="Event study" />
        <MetricCard label="Recession Stress" value={`${Math.round(summary.recessionDrawdown*100)}%`} sub="Scenario shock" />
        <MetricCard label="Model Confidence" value={`${Math.round(summary.confidence*100)}%`} sub="Composite" />
      </div>
      <section className="card mt-6">
        <h3 className="font-medium">Top Macro Drivers</h3>
        <ul className="mt-2 space-y-1 text-sm">
          {drivers.map((d) => (
            <li key={d.name} className="flex justify-between">
              <span>{d.name}</span><span>{Math.round(d.importance*100)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="card mt-6 text-sm leading-6">
        <h3 className="font-medium">Model Transparency</h3>
        <p className="mt-2 opacity-90">This view distinguishes correlation from causation, shows confidence intervals, and explains assumptions for each model family. Use Model Classroom for chalkboard explanations.</p>
      </section>
    </Layout>
  );
}
