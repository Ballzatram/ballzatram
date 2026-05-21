import { mapRoutes } from "@/lib/invisible-hands-v2/data";
import type { Actor, GameAction } from "@/lib/invisible-hands-v2/types";

const pos: Record<string,[number,number]> = {"global-domestic":[50,50],"global-partner":[21,27],"global-oil":[27,60],"global-food":[25,80],"global-manu-competitor":[80,44],"global-resource":[74,20],"global-chokepoint":[55,84],"global-fx":[75,70],"global-tariff-node":[61,34],"global-retaliation-node":[66,56]};
const icon: Record<string,string> = {"global-domestic":"🏛","global-partner":"🤝","global-oil":"🛢","global-food":"🌾","global-manu-competitor":"🏭","global-resource":"◈","global-chokepoint":"⚓","global-fx":"₣","global-tariff-node":"⚠","global-retaliation-node":"✦"};
const kindColor: Record<string,string> = {exports:"#33d8ff",imports:"#6dc8ff",energy:"#ffa544",food:"#80ff84","strategic-resources":"#2be0d0",shipping:"#b08bff",capital:"#d08cff",tariff:"#ff7a7a",retaliation:"#ff4b64",sanction:"#ff4b64"};
const path=(a:[number,number],b:[number,number],i:number)=>`M ${a[0]} ${a[1]} Q ${(a[0]+b[0])/2 + (i%2?7:-7)} ${((a[1]+b[1])/2)-12} ${b[0]} ${b[1]}`;

export function GlobalTradeMap({ actors, selectedAction, selectedActorId, onSelect }: { actors: Actor[]; selectedAction?: GameAction; selectedActorId?: string; onSelect:(id:string)=>void }) {
  const preview=selectedAction?.preview;
  return <svg viewBox="0 0 100 100" className="h-full w-full">
    <rect width="100" height="100" fill="#051225"/>
    <path d="M8 23 L28 18 L40 24 L45 35 L34 42 L14 34 Z" fill="#123253" opacity="0.65"/>
    <path d="M44 22 L58 18 L71 25 L70 35 L55 38 L46 33 Z" fill="#14395f" opacity="0.7"/>
    <path d="M68 45 L84 44 L92 56 L87 67 L73 67 L65 58 Z" fill="#13365a" opacity="0.68"/>
    <path d="M30 56 L46 54 L55 64 L49 78 L35 82 L24 70 Z" fill="#123559" opacity="0.63"/>
    <rect width="100" height="100" fill="url(#grid)" opacity="0.55"/>
    {mapRoutes.filter(r=>r.layer==="global").map((r,i)=>{const a=pos[r.from],b=pos[r.to];const active=!preview||preview.affectedRouteIds.includes(r.id);const color=kindColor[r.kind]??"#99b8d9";return <g key={r.id} opacity={active?0.95:0.12}><path d={path(a,b,i)} stroke={color} strokeWidth={active?0.58:0.24} strokeDasharray={["shipping","tariff","retaliation","sanction"].includes(r.kind)?"1.8 1.2":undefined} fill="none" markerEnd="url(#arrow)"/><text x={(a[0]+b[0])/2} y={(a[1]+b[1])/2-1.3} textAnchor="middle" fontSize="1.2" fill="#c6e9ff">{r.label}</text></g>;})}
    {actors.map((a)=>{const p=pos[a.id];if(!p)return null;const selected=selectedActorId===a.id;const active=!preview||preview.affectedActorIds.includes(a.id)||a.id==="global-domestic";return <g key={a.id} onClick={()=>onSelect(a.id)} className="cursor-pointer" opacity={active?1:0.22}><rect x={p[0]-8.3} y={p[1]-5.4} width="16.6" height="10.8" rx="1.4" fill="#0f2744" stroke={selected?"#fde68a":"#5ac8ff"} strokeWidth={selected?0.6:0.25}/><text x={p[0]-7.3} y={p[1]-3.6} fontSize="1.7" fill="#def4ff">{icon[a.id]}</text><text x={p[0]-4.8} y={p[1]-3.6} fontSize="1.18" fill="#e7f6ff">{a.name.slice(0,16).toUpperCase()}</text><text x={p[0]-7.3} y={p[1]-1.1} fontSize="0.98" fill="#84d4ff">STRESS {Math.round(a.stress)}</text><text x={p[0]-7.3} y={p[1]+1.2} fontSize="0.98" fill="#c6ebff">{a.id==="global-domestic"?"STATUS STABLE":"STATUS TENSE"}</text></g>;})}
    <defs><marker id="arrow" markerWidth="4" markerHeight="4" refX="3" refY="2" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L4,2 L0,4" fill="#caf0ff"/></marker></defs>
  </svg>;
}
