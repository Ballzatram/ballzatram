"use client";

import { useEffect, useMemo, useState } from "react";

type Track = "Western History" | "General History" | "Power & Institutions" | "Economics & Markets" | "Fiction";
type Status = "Unread" | "Reading" | "Read";

type Book = {
  id: string;
  title: string;
  author: string;
  track: Track;
  level: 1 | 2 | 3;
  why: string;
  tags: string[];
  defaultStatus?: Status;
};

const TRACKS: Track[] = [
  "Western History",
  "General History",
  "Power & Institutions",
  "Economics & Markets",
  "Fiction",
];

const BOOKS: Book[] = [
  // WESTERN HISTORY
  { id:"blood-meridian", title:"Blood Meridian", author:"Cormac McCarthy", track:"Western History", level:3, why:"A brutal literary counter-myth of the borderlands and westward violence.", tags:["borderlands","myth","violence"] },
  { id:"empire-summer-moon", title:"Empire of the Summer Moon", author:"S. C. Gwynne", track:"Western History", level:2, why:"The rise and fall of the Comanches and the violent transformation of the southern Plains.", tags:["Comanche","Texas","Plains"] },
  { id:"indifferent-stars", title:"The Indifferent Stars Above", author:"Daniel James Brown", track:"Western History", level:2, why:"The Donner Party as human-scale western history: migration, survival, logistics and catastrophe.", tags:["Donner Party","migration","survival"] },
  { id:"undauted-courage", title:"Undaunted Courage", author:"Stephen E. Ambrose", track:"Western History", level:2, why:"Lewis and Clark, continental exploration, geography, diplomacy and the early American West.", tags:["Lewis & Clark","exploration","expansion"] },
  { id:"bury-my-heart", title:"Bury My Heart at Wounded Knee", author:"Dee Brown", track:"Western History", level:2, why:"A foundational Native-centered narrative of U.S. expansion across the West.", tags:["Native nations","expansion","conflict"] },
  { id:"heart-west", title:"The Heart of Everything That Is", author:"Bob Drury & Tom Clavin", track:"Western History", level:2, why:"Red Cloud, Lakota power and the military struggle over the Bozeman Trail.", tags:["Lakota","Red Cloud","frontier war"] },
  { id:"dreams-el-dorado", title:"Dreams of El Dorado", author:"H. W. Brands", track:"Western History", level:2, why:"A sweeping synthesis of the American West from exploration through settlement and myth-making.", tags:["survey","frontier","West"] },
  { id:"virginians", title:"The Virginian", author:"Owen Wister", track:"Western History", level:1, why:"A key source for the cultural invention of the cowboy hero.", tags:["cowboy","myth","classic"] },
  { id:"cattle-kingdom", title:"Cattle Kingdom", author:"Christopher Knowlton", track:"Western History", level:2, why:"Cowboys through an economic lens: cattle, capital, railroads, speculation and boom-bust cycles.", tags:["cowboys","capitalism","cattle"] },
  { id:"tombstone", title:"Tombstone", author:"Tom Clavin", track:"Western History", level:1, why:"A highly readable account of Wyatt Earp, Doc Holliday and the world around the O.K. Corral.", tags:["Arizona","Earp","lawmen"] },

  // GENERAL HISTORY
  { id:"sleepwalkers", title:"The Sleepwalkers", author:"Christopher Clark", track:"General History", level:3, why:"A multi-actor explanation of how Europe drifted into World War I.", tags:["WWI","diplomacy","systems"], defaultStatus:"Read" },
  { id:"guns-august", title:"The Guns of August", author:"Barbara W. Tuchman", track:"General History", level:2, why:"The opening month of WWI told through planning failures, personalities and battlefield momentum.", tags:["WWI","strategy","1914"], defaultStatus:"Read" },
  { id:"rise-fall-third-reich", title:"The Rise and Fall of the Third Reich", author:"William L. Shirer", track:"General History", level:3, why:"A monumental narrative history of Nazi Germany from rise to collapse.", tags:["WWII","Germany","totalitarianism"] },
  { id:"postwar", title:"Postwar", author:"Tony Judt", track:"General History", level:3, why:"The best single-volume map of Europe after 1945 and the political order that followed.", tags:["Europe","Cold War","postwar"] },
  { id:"iron-kingdom", title:"Iron Kingdom", author:"Christopher Clark", track:"General History", level:3, why:"Prussia as a case study in state-building, military power and German political development.", tags:["Prussia","Germany","state formation"] },
  { id:"crusades", title:"The Crusades", author:"Thomas Asbridge", track:"General History", level:2, why:"A balanced narrative of the Crusading era from Christian and Muslim perspectives.", tags:["medieval","religion","war"] },
  { id:"silk-roads", title:"The Silk Roads", author:"Peter Frankopan", track:"General History", level:2, why:"Reorients world history around the Eurasian connective tissue linking empires and trade.", tags:["global history","trade","Eurasia"] },
  { id:"1491", title:"1491", author:"Charles C. Mann", track:"General History", level:2, why:"Reconstructs the scale, complexity and diversity of the Americas before Columbus.", tags:["Americas","pre-Columbian","anthropology"] },
  { id:"black-count", title:"The Black Count", author:"Tom Reiss", track:"General History", level:2, why:"The remarkable life of Alexandre Dumas's father set against revolution, race and empire.", tags:["France","revolution","biography"] },
  { id:"destiny-republic", title:"Destiny of the Republic", author:"Candice Millard", track:"General History", level:1, why:"James Garfield's assassination as political, medical and social history.", tags:["U.S.","presidency","Gilded Age"] },

  // POWER / MEDIA / INSTITUTIONS
  { id:"manufacturing-consent", title:"Manufacturing Consent", author:"Edward S. Herman & Noam Chomsky", track:"Power & Institutions", level:3, why:"A structural model for thinking about media incentives, ownership, sourcing and elite consensus.", tags:["media","propaganda","institutions"] },
  { id:"propaganda", title:"Propaganda", author:"Edward Bernays", track:"Power & Institutions", level:2, why:"A primary text from the architect of modern public relations and mass persuasion.", tags:["PR","persuasion","mass society"] },
  { id:"public-opinion", title:"Public Opinion", author:"Walter Lippmann", track:"Power & Institutions", level:3, why:"A foundational argument about perception, democracy, stereotypes and mediated reality.", tags:["democracy","media","opinion"] },
  { id:"power-elite", title:"The Power Elite", author:"C. Wright Mills", track:"Power & Institutions", level:3, why:"A classic sociological map of overlapping political, military and corporate power.", tags:["elites","institutions","sociology"] },
  { id:"seeing-like-state", title:"Seeing Like a State", author:"James C. Scott", track:"Power & Institutions", level:3, why:"Why top-down schemes fail when institutions simplify complex local realities.", tags:["state capacity","planning","systems"] },
  { id:"why-nations-fail", title:"Why Nations Fail", author:"Daron Acemoglu & James A. Robinson", track:"Power & Institutions", level:2, why:"An influential institutions-first framework for long-run prosperity and political order.", tags:["institutions","development","political economy"] },
  { id:"political-order", title:"Political Order and Political Decay", author:"Francis Fukuyama", track:"Power & Institutions", level:3, why:"A broad theory of state capacity, rule of law and democratic accountability.", tags:["state","democracy","governance"] },
  { id:"dictators-handbook", title:"The Dictator's Handbook", author:"Bruce Bueno de Mesquita & Alastair Smith", track:"Power & Institutions", level:2, why:"Selectorate theory turned into a practical lens for incentives in political survival.", tags:["incentives","politics","power"] },
  { id:"on-tyranny", title:"On Tyranny", author:"Timothy Snyder", track:"Power & Institutions", level:1, why:"A compact entry point into institutional erosion and lessons from twentieth-century authoritarianism.", tags:["authoritarianism","institutions","civics"] },
  { id:"chaos", title:"CHAOS", author:"Tom O'Neill", track:"Power & Institutions", level:2, why:"A case study in investigative skepticism, archival digging and competing narratives around the Manson era.", tags:["investigation","CIA","counterculture"] },

  // ECONOMICS / MARKETS
  { id:"21st-monetary-policy", title:"21st Century Monetary Policy", author:"Ben S. Bernanke", track:"Economics & Markets", level:3, why:"A modern institutional history of the Federal Reserve and the evolution of monetary policy.", tags:["Fed","monetary policy","macro"], defaultStatus:"Read" },
  { id:"lords-finance", title:"Lords of Finance", author:"Liaquat Ahamed", track:"Economics & Markets", level:2, why:"Central bankers, the gold standard and the monetary mistakes surrounding the Great Depression.", tags:["central banking","Great Depression","gold"] },
  { id:"manias-panics-crashes", title:"Manias, Panics, and Crashes", author:"Charles P. Kindleberger & Robert Aliber", track:"Economics & Markets", level:3, why:"The classic framework for recurring patterns in financial bubbles and crises.", tags:["crises","bubbles","markets"] },
  { id:"this-time-different", title:"This Time Is Different", author:"Carmen Reinhart & Kenneth Rogoff", track:"Economics & Markets", level:3, why:"Centuries of empirical evidence on debt, default, banking crises and financial folly.", tags:["debt","crises","data"] },
  { id:"great-crash", title:"The Great Crash 1929", author:"John Kenneth Galbraith", track:"Economics & Markets", level:2, why:"A sharp narrative of speculation, leverage and institutional failure before the Depression.", tags:["1929","markets","speculation"] },
  { id:"big-short", title:"The Big Short", author:"Michael Lewis", track:"Economics & Markets", level:1, why:"A readable bridge between structured credit, incentives and the 2008 financial crisis.", tags:["credit","2008","MBS"] },
  { id:"when-genius-failed", title:"When Genius Failed", author:"Roger Lowenstein", track:"Economics & Markets", level:2, why:"LTCM as a lesson in leverage, model risk, liquidity and market structure.", tags:["hedge funds","risk","LTCM"] },
  { id:"money-changes-everything", title:"Money Changes Everything", author:"William N. Goetzmann", track:"Economics & Markets", level:3, why:"A long-run history of financial innovation and how finance shaped civilization.", tags:["finance history","innovation","capital"] },
  { id:"capital-21", title:"Capital in the Twenty-First Century", author:"Thomas Piketty", track:"Economics & Markets", level:3, why:"A data-heavy argument about wealth concentration, capital returns and inequality.", tags:["inequality","capital","data"] },
  { id:"against-gods", title:"Against the Gods", author:"Peter L. Bernstein", track:"Economics & Markets", level:2, why:"The intellectual history of probability, uncertainty and modern risk management.", tags:["risk","probability","finance"] },

  // FICTION
  { id:"waste-lands", title:"The Waste Lands", author:"Stephen King", track:"Fiction", level:2, why:"Your current Dark Tower lane: mythic quest, world-building and genre synthesis.", tags:["Dark Tower","fantasy","horror"], defaultStatus:"Reading" },
  { id:"lonesome-dove", title:"Lonesome Dove", author:"Larry McMurtry", track:"Fiction", level:2, why:"The definitive western epic: friendship, aging, violence, cattle drives and the myth of the frontier.", tags:["western","cowboys","epic"] },
  { id:"butchers-crossing", title:"Butcher's Crossing", author:"John Williams", track:"Fiction", level:2, why:"A darker anti-romantic western about obsession, wilderness and the buffalo economy.", tags:["western","buffalo","wilderness"] },
  { id:"war-peace", title:"War and Peace", author:"Leo Tolstoy", track:"Fiction", level:3, why:"Historical fiction operating at the scale of individuals, armies, societies and historical causation.", tags:["Russia","Napoleon","history"] },
  { id:"all-kings-men", title:"All the King's Men", author:"Robert Penn Warren", track:"Fiction", level:3, why:"Political ambition, populism and corruption through one of America's great political novels.", tags:["politics","power","South"] },
  { id:"grapes-wrath", title:"The Grapes of Wrath", author:"John Steinbeck", track:"Fiction", level:2, why:"Migration, labor, poverty and American political economy embodied in a family story.", tags:["Depression","labor","migration"] },
  { id:"for-whom-bell", title:"For Whom the Bell Tolls", author:"Ernest Hemingway", track:"Fiction", level:2, why:"War, ideology, sacrifice and moral ambiguity during the Spanish Civil War.", tags:["Spain","war","Hemingway"] },
  { id:"shogun", title:"Shōgun", author:"James Clavell", track:"Fiction", level:2, why:"Immersive political and cultural world-building in early seventeenth-century Japan.", tags:["Japan","politics","historical fiction"] },
  { id:"count-monte-cristo", title:"The Count of Monte Cristo", author:"Alexandre Dumas", track:"Fiction", level:2, why:"A huge, propulsive novel about justice, patience, revenge and identity.", tags:["France","revenge","classic"] },
  { id:"east-eden", title:"East of Eden", author:"John Steinbeck", track:"Fiction", level:2, why:"An American family epic about inheritance, moral choice and the mythology of the West.", tags:["California","family","American epic"] },

  // Cross-track anchor already read
  { id:"south", title:"South", author:"Ernest Shackleton", track:"General History", level:2, why:"First-person expedition history and a masterclass in endurance, logistics and leadership under extreme uncertainty.", tags:["exploration","leadership","Antarctica"], defaultStatus:"Read" },
];

const TRACK_BLURBS: Record<Track,string> = {
  "Western History":"The people, wars, migrations, economies and myths that made the American West — with extra weight on cowboys, Arizona, borderlands and Native history.",
  "General History":"Build a broad chronological and geopolitical map so specific events sit inside a larger world model.",
  "Power & Institutions":"Learn to interrogate media, governments, elites, incentives, propaganda, institutions and competing explanations of who gets power and why.",
  "Economics & Markets":"Monetary history, crises, risk, capital, institutions and market structure — the research-heavy economics lane.",
  "Fiction":"Keep the imagination sharp. Great fiction builds empathy, narrative intelligence, cultural range and intuition about human behavior.",
};

const WEIGHTS: Record<Track, number> = {
  "Western History": 1,
  "General History": 1.15,
  "Power & Institutions": 1.2,
  "Economics & Markets": 1.2,
  "Fiction": .8,
};

function levelLabel(level:number){ return level===1?"Entry":level===2?"Deep Dive":"Heavyweight"; }

export default function ReadingRoomPage(){
  const [active,setActive]=useState<Track>("Western History");
  const [status,setStatus]=useState<Record<string,Status>>({});
  const [query,setQuery]=useState("");
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{
    const defaults = Object.fromEntries(BOOKS.map(b=>[b.id,b.defaultStatus??"Unread"]));
    try{
      const saved=localStorage.getItem("ballzatram-reading-room-v1");
      setStatus(saved?{...defaults,...JSON.parse(saved)}:defaults);
    }catch{ setStatus(defaults); }
    setMounted(true);
  },[]);

  useEffect(()=>{
    if(mounted) localStorage.setItem("ballzatram-reading-room-v1",JSON.stringify(status));
  },[status,mounted]);

  const setBookStatus=(id:string,next:Status)=>setStatus(s=>({...s,[id]:next}));

  const stats=useMemo(()=>{
    const read=BOOKS.filter(b=>status[b.id]==="Read");
    const reading=BOOKS.filter(b=>status[b.id]==="Reading");
    const points=read.reduce((sum,b)=>sum+(b.level*10*WEIGHTS[b.track]),0);
    const max=BOOKS.reduce((sum,b)=>sum+(b.level*10*WEIGHTS[b.track]),0);
    const trackScores=TRACKS.map(track=>{
      const books=BOOKS.filter(b=>b.track===track);
      const earned=books.filter(b=>status[b.id]==="Read").reduce((s,b)=>s+b.level*10,0);
      const possible=books.reduce((s,b)=>s+b.level*10,0);
      return {track, pct: possible?Math.round(earned/possible*100):0};
    });
    const breadth=trackScores.filter(x=>x.pct>0).length;
    const normalized=max?Math.round(points/max*100):0;
    const identity = normalized<10 ? "Curious Generalist" : normalized<25 ? "Building a World Model" : normalized<45 ? "Systems-Minded Reader" : normalized<70 ? "Interdisciplinary Operator" : "Independent Scholar";
    const strongest=[...trackScores].sort((a,b)=>b.pct-a.pct)[0];
    return {read:read.length,reading:reading.length,points:Math.round(points),normalized,breadth,identity,strongest,trackScores};
  },[status]);

  const visible=BOOKS.filter(b=>b.track===active && (!query || `${b.title} ${b.author} ${b.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())));

  return <main className="min-h-screen bg-[#0a0d0b] text-[#f2eadb]">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="overflow-hidden rounded-[28px] border border-amber-200/15 bg-[radial-gradient(circle_at_top_right,rgba(146,94,35,.22),transparent_34%),linear-gradient(135deg,#111711,#090b0a)] p-6 shadow-2xl shadow-black/40 sm:p-9">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.28em] text-amber-300/80">Ballzatram Internal · The Reading Room</p>
            <h1 className="mt-4 font-serif text-5xl font-semibold tracking-[-.04em] text-[#fff8e8] sm:text-7xl">Build the mind,<br/>not just the shelf.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">A personal curriculum across the American West, world history, power, economics and fiction. Mark books as you go; the room tracks what kind of intellectual toolkit you are building.</p>
          </div>
          <div className="grid min-w-[290px] grid-cols-2 gap-3">
            <Stat label="Books read" value={stats.read}/><Stat label="In progress" value={stats.reading}/><Stat label="Knowledge XP" value={stats.points}/><Stat label="Domains touched" value={`${stats.breadth}/5`}/>
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-300/70">Reader profile</p><h2 className="mt-2 text-2xl font-semibold text-white">{stats.identity}</h2></div><div className="text-right"><div className="text-4xl font-bold text-amber-200">{stats.normalized}</div><div className="text-xs uppercase tracking-widest text-stone-500">curriculum %</div></div></div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all" style={{width:`${stats.normalized}%`}}/></div>
          <p className="mt-4 text-sm leading-6 text-stone-400">Right now your strongest developed lane is <strong className="text-stone-200">{stats.strongest.track}</strong>. The score rewards harder books and slightly favors analytical nonfiction, while still giving fiction real weight.</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-sky-300/70">Knowledge map</p>
          <div className="mt-4 space-y-3">{stats.trackScores.map(x=><div key={x.track}><div className="mb-1.5 flex justify-between text-xs"><span className="text-stone-300">{x.track}</span><span className="text-stone-500">{x.pct}%</span></div><div className="h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-white/70 transition-all" style={{width:`${x.pct}%`}}/></div></div>)}</div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex gap-2 overflow-x-auto pb-3">{TRACKS.map(track=><button key={track} onClick={()=>setActive(track)} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${active===track?"border-amber-300/50 bg-amber-300/15 text-amber-100":"border-white/10 bg-white/[.03] text-stone-400 hover:text-white"}`}>{track}</button>)}</div>
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs uppercase tracking-[.2em] text-stone-500">Current emphasis</p><h2 className="mt-1 text-3xl font-semibold text-white">{active}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">{TRACK_BLURBS[active]}</p></div>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this shelf…" className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-stone-600 focus:border-amber-300/40 sm:w-64" />
        </div>

        <div className="mt-4 grid gap-3">{visible.map((b,i)=><article key={b.id} className="group rounded-2xl border border-white/10 bg-[#111411] p-4 transition hover:border-amber-200/25 hover:bg-[#141814] sm:p-5">
          <div className="grid gap-4 sm:grid-cols-[44px_1fr_auto] sm:items-center">
            <div className="hidden h-11 w-11 items-center justify-center rounded-full border border-white/10 text-sm font-bold text-stone-500 sm:flex">{String(i+1).padStart(2,"0")}</div>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-[#fff7e6] sm:text-xl">{b.title}</h3>{b.defaultStatus==="Read"&&<span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Known read</span>}</div>
              <p className="mt-1 text-sm text-stone-500">{b.author} · {levelLabel(b.level)} · {b.level*10} base XP</p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">{b.why}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{b.tags.map(t=><span key={t} className="rounded-md bg-white/[.05] px-2 py-1 text-[11px] text-stone-500">{t}</span>)}</div>
            </div>
            <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1 sm:flex-col">{(["Unread","Reading","Read"] as Status[]).map(s=><button key={s} onClick={()=>setBookStatus(b.id,s)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:min-w-24 ${status[b.id]===s?(s==="Read"?"bg-emerald-300/15 text-emerald-200":s==="Reading"?"bg-amber-300/15 text-amber-200":"bg-white/10 text-white"):"text-stone-600 hover:text-stone-300"}`}>{s}</button>)}</div>
          </div>
        </article>)}</div>
      </section>

      <section className="mt-10 rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-6">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-amber-300/70">How the score works</p>
        <div className="mt-4 grid gap-5 text-sm leading-6 text-stone-400 md:grid-cols-3"><p><strong className="text-stone-200">Depth.</strong> Entry books earn 10 XP, deep dives 20, and heavyweights 30.</p><p><strong className="text-stone-200">Range.</strong> Your profile gets more interesting as you build across all five shelves instead of optimizing one lane.</p><p><strong className="text-stone-200">Interpretation.</strong> The score is not an IQ meter. It is a visualization of the intellectual terrain you have deliberately covered.</p></div>
      </section>
    </div>
  </main>
}

function Stat({label,value}:{label:string;value:string|number}){
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-2xl font-bold text-white">{value}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-[.16em] text-stone-500">{label}</div></div>
}
