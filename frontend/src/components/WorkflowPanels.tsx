"use client";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
export function KPI({label,value}:{label:string;value:string}){return <div className="rounded bg-slate-900 p-3"><div className="text-xs opacity-70">{label}</div><div className="text-xl">{value}</div></div>}
export function AssumptionPanel(){return <div className="rounded bg-amber-900/20 p-3 text-sm">Correlation is not causation. Results are model-dependent and assume regime stability.</div>}
export function MiniChart({data}:{data:{name:string;value:number}[]}){return <div className="h-64 rounded bg-slate-900 p-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid stroke="#334155"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Line type="monotone" dataKey="value" stroke="#34d399"/></LineChart></ResponsiveContainer></div>}
