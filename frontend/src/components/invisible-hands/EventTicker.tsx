import type { GameEvent } from "@/lib/invisible-hands-v2/types";

export function EventTicker({ events, pending }: { events: GameEvent[]; pending: string[] }) {
  return <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-slate-700 bg-slate-950/90 p-2 text-xs text-slate-200">
    <p className="mb-1 uppercase tracking-[0.2em] text-cyan-200">Event Feed</p>
    <div className="flex gap-2 overflow-auto">{pending.map((p) => <span key={p} className="rounded border border-amber-400/50 px-2 py-1 text-amber-200">Pending: {p}</span>)}{events.slice(0,4).map((e) => <span key={e.id} className="rounded border border-slate-700 px-2 py-1">{e.title}</span>)}</div>
  </div>;
}
