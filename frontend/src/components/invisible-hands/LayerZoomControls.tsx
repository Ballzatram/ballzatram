import type { GameLayer } from "@/lib/invisible-hands-v2/types";

export function LayerZoomControls({ layer, setLayer }: { layer: GameLayer; setLayer: (l: GameLayer) => void }) {
  return <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-4 text-xs"><div className="rounded border border-[#c0c0c0] bg-[#f5f5f5] p-1">{(["micro", "macro", "global"] as GameLayer[]).map((l) => <button key={l} onClick={() => setLayer(l)} className={`px-4 py-1 ${layer === l ? "bg-[#595959] text-white" : "text-[#2e2e2e]"}`}>{l.toUpperCase()}</button>)}</div><div className="rounded border border-[#c0c0c0] bg-[#f5f5f5] px-3 py-2">ZOOM IN · ZOOM OUT · FOCUS</div></div>;
}
