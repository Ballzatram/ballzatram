import type { GameLayer } from "@/lib/invisible-hands-v2/types";

export function LayerZoomControls({ layer, setLayer }: { layer: GameLayer; setLayer: (l: GameLayer) => void }) {
  return <div className="absolute left-1/2 top-2 flex -translate-x-1/2 gap-2 text-xs"><div className="rounded border border-cyan-300/35 bg-[#0f2b49] p-1">{(["micro", "macro", "global"] as GameLayer[]).map((l) => <button key={l} onClick={() => setLayer(l)} className={`px-4 py-1 font-semibold tracking-wide ${layer === l ? "bg-cyan-300 text-[#06203a]" : "text-cyan-100"}`}>{l.toUpperCase()}</button>)}</div></div>;
}
