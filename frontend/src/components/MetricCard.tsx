export function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs opacity-70">{sub}</p>
    </div>
  );
}
