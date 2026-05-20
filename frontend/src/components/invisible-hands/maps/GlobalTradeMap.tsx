import { mapRoutes } from "@/lib/invisible-hands-v2/data";
import type { Actor, GameAction } from "@/lib/invisible-hands-v2/types";

const pos: Record<string,[number,number]> = {"global-domestic":[50,50],"global-partner":[20,27],"global-oil":[28,61],"global-food":[27,77],"global-manu-competitor":[77,45],"global-resource":[73,18],"global-chokepoint":[53,82],"global-fx":[74,74]};
const icon: Record<string,string> = {"global-domestic":"🏛","global-partner":"🏳","global-oil":"🛢","global-food":"🌾","global-manu-competitor":"⚙","global-resource":"◈","global-chokepoint":"⚓","global-fx":"$"};
const metrics: Record<string,string[]> = {"global-domestic":["GDP $3.21T","Trade +$218B","Capacity 78%"],"global-partner":["Trade $812B","Balance +$74B","Relations FRIENDLY"],"global-oil":["Oil Flow $91B","Price Influence HIGH","Stability MEDIUM"],"global-food":["Export $48B","Reliability 82%","Relations FRIENDLY"],"global-manu-competitor":["Export Pressure HIGH","Market Share -2.3%","Relations TENSE"],"global-resource":["Resource $68B","Reliability 61%","Leverage HIGH"],"global-chokepoint":["Risk HIGH","Impact $230B","Naval Presence LOW"],"global-fx":["Pressure -2.1%","Volatility ELEVATED","Reserve Impact -1.3%"]};
const path=(a:[number,number],b:[number,number],i:number)=>`M ${a[0]} ${a[1]} Q ${(a[0]+b[0])/2 + (i%2?5:-5)} ${((a[1]+b[1])/2)-10} ${b[0]} ${b[1]}`;

export function GlobalTradeMap({ actors, selectedAction, selectedActorId, onSelect }: { actors: Actor[]; selectedAction?: GameAction; selectedActorId?: string; onSelect:(id:string)=>void }) {
  const preview=selectedAction?.preview;
  return <svg viewBox="0 0 100 100" className="h-full w-full text-[#212121]">
    <rect width="100" height="100" fill="#ececec"/>
    <g stroke="#d8d8d8" fill="none" opacity="0.8">
      <path d="M6 24 Q18 10 34 22 T58 21 T95 28"/><path d="M6 47 Q26 35 40 43 T76 45 T95 52"/><path d="M8 70 Q20 62 34 68 T63 73 T96 76"/><path d="M40 12 Q46 8 53 11 T67 13"/><path d="M15 84 Q20 80 28 83 T43 86"/>
    </g>
    <rect width="100" height="100" fill="url(#grid)" opacity="0.55"/>
    {mapRoutes.filter(r=>r.layer==="global").map((r,i)=>{const a=pos[r.from],b=pos[r.to];const active=!preview||preview.affectedRouteIds.includes(r.id);const dashed=["tariff","sanction","capital","shipping"].includes(r.kind);return <g key={r.id} opacity={active?0.95:0.16}><path d={path(a,b,i)} stroke="#595959" strokeWidth={active?0.35:0.2} strokeDasharray={dashed?"1.2 1.2":undefined} fill="none" markerEnd="url(#arrow)"/><rect x={(a[0]+b[0])/2-2.8} y={(a[1]+b[1])/2-1.6} width="5.8" height="3.2" rx="0.8" fill="#f9f9f9" stroke="#9d9d9d" strokeWidth="0.15"/><text x={(a[0]+b[0])/2} y={(a[1]+b[1])/2+0.6} textAnchor="middle" fontSize="1.2">{r.label}</text></g>;})}
    {actors.map((a)=>{const p=pos[a.id];const selected=selectedActorId===a.id;const active=!preview||preview.affectedActorIds.includes(a.id)||a.id==="global-domestic";const isDomestic=a.id==="global-domestic";const w=isDomestic?18:16;const h=isDomestic?18:12;return <g key={a.id} onClick={()=>onSelect(a.id)} className="cursor-pointer" opacity={active?1:0.25}><rect x={p[0]-w/2} y={p[1]-h/2} rx={isDomestic?9:1.3} width={w} height={h} fill="#f5f5f5" stroke={selected?"#1e1e1e":"#9f9f9f"} strokeWidth={selected?0.35:0.2}/><text x={p[0]-w/2+1.1} y={p[1]-h/2+2.2} fontSize="1.8">{icon[a.id]}</text><text x={p[0]-w/2+3.8} y={p[1]-h/2+2.5} fontSize="1.25" fontWeight="700">{a.name.toUpperCase()}</text>{metrics[a.id].map((m,idx)=><text key={m} x={p[0]-w/2+1.2} y={p[1]-h/2+5.1+(idx*2)} fontSize="1.1">{m}</text>)}</g>;})}
    <defs><marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4" fill="#5d5d5d"/></marker></defs>
  </svg>;
}
