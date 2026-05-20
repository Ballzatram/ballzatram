import { mapRoutes } from "@/lib/invisible-hands-v2/data";
import type { Actor, GameAction } from "@/lib/invisible-hands-v2/types";

const positions: Record<string,[number,number]> = {"global-domestic":[50,50],"global-partner":[24,28],"global-oil":[28,60],"global-food":[32,76],"global-manu-competitor":[75,48],"global-resource":[73,25],"global-chokepoint":[60,78],"global-fx":[76,74]};
const routeColor: Record<string,string> = {exports:"#38bdf8",imports:"#60a5fa","strategic-resources":"#22d3ee",energy:"#fb923c",shipping:"#a78bfa",capital:"#c084fc",tariff:"#ef4444",sanction:"#f43f5e"};
const path=(a:[number,number],b:[number,number])=>`M ${a[0]} ${a[1]} Q ${(a[0]+b[0])/2} ${Math.min(a[1],b[1])-8} ${b[0]} ${b[1]}`;

export function GlobalTradeMap({ actors, selectedAction, selectedActorId, onSelect }: { actors: Actor[]; selectedAction?: GameAction; selectedActorId?: string; onSelect:(id:string)=>void }) {
  const preview=selectedAction?.preview;
  return <svg viewBox="0 0 100 92" className="h-full w-full">
    <rect width="100" height="92" fill="#020617"/>
    <rect width="100" height="92" fill="url(#grid)" opacity="0.35"/>
    {mapRoutes.filter(r=>r.layer==="global").map((r)=>{const a=positions[r.from],b=positions[r.to]; const active=!preview || preview.affectedRouteIds.includes(r.id); return <g key={r.id} opacity={active?1:0.16}><path d={path(a,b)} stroke={routeColor[r.kind]} strokeWidth={active?1.4:0.8} fill="none"/><text x={(a[0]+b[0])/2} y={(a[1]+b[1])/2} fill="#cbd5e1" fontSize="2.2">{r.label}</text></g>})}
    {actors.map((a)=>{const p=positions[a.id]; const active=!preview || preview.affectedActorIds.includes(a.id); const selected=selectedActorId===a.id; return <g key={a.id} onClick={()=>onSelect(a.id)} className="cursor-pointer" opacity={active?1:0.35}><rect x={p[0]-9} y={p[1]-5} rx={2} width={18} height={10} fill="rgba(2,6,23,.85)" stroke={selected?"#f8fafc":"#334155"}/><text x={p[0]} y={p[1]-1} textAnchor="middle" fontSize="2" fill="#e2e8f0">{a.name}</text></g>})}
  </svg>;
}
