"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/20">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-2 break-words text-2xl font-semibold text-slate-50 sm:text-3xl">{value}</div>
    </div>
  );
}

export function AssumptionPanel() {
  return (
    <div className="rounded-xl border border-amber-300/20 bg-amber-900/20 p-4 text-sm leading-6 text-amber-50 sm:text-base">
      Correlation is not causation. Results are model-dependent and assume regime stability.
    </div>
  );
}

export function MiniChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-72 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-lg shadow-black/20 sm:h-80 sm:p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: -20 }}>
          <CartesianGrid stroke="#334155" />
          <XAxis dataKey="name" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
          <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} width={36} />
          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12 }} />
          <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={3} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
