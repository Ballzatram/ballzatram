import type { GameLayer } from "@/lib/invisible-hands-v2/types";

export function LayerZoomControls({ layer, setLayer }: { layer: GameLayer; setLayer: (l: GameLayer) => void }) {
  return <div className="absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950/80 p-1">
    {(["micro", "macro", "global"] as GameLayer[]).map((l) => <button key={l} onClick={() => setLayer(l)} className={`px-4 py-1 text-xs ${layer === l ? "bg-cyan-300 text-black" : "text-slate-300"}`}>{l.toUpperCase()}</button>)}
  </div>;
}
