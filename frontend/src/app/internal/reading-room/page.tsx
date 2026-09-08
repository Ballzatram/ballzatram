"use client";

import { useEffect, useMemo, useState } from "react";

type Track = "Western History" | "General History" | "Power & Institutions" | "Economics & Markets" | "Fiction";
type Status = "Unread" | "Reading" | "Read";
type Row = [string, string, 1 | 2 | 3];

const TRACKS: Track[] = ["Western History","General History","Power & Institutions","Economics & Markets","Fiction"];

const DATA: Record<Track, Row[]> = {
  "Western History": [
    ["Blood Meridian","Cormac McCarthy",3],["Empire of the Summer Moon","S. C. Gwynne",2],["The Indifferent Stars Above","Daniel James Brown",2],["Undaunted Courage","Stephen E. Ambrose",2],["Bury My Heart at Wounded Knee","Dee Brown",2],["The Heart of Everything That Is","Bob Drury & Tom Clavin",2],["Dreams of El Dorado","H. W. Brands",2],["Cattle Kingdom","Christopher Knowlton",2],["Tombstone","Tom Clavin",1],["The Last Stand","Nathaniel Philbrick",2],["Blood and Thunder","Hampton Sides",2],["The Apache Wars","Paul Andrew Hutton",2],["The Comanche Empire","Pekka Hämäläinen",3],["The Open Range","John H. Davis",2],["The Worst Hard Time","Timothy Egan",2],["The Big Burn","Timothy Egan",2],["Nothing Like It in the World","Stephen E. Ambrose",2],["The Oregon Trail","Rinker Buck",1],["The Earth Is Weeping","Peter Cozzens",3],["Son of the Morning Star","Evan S. Connell",3],["Doc","Mary Doria Russell",2],["The Last Gunfight","Jeff Guinn",2],["The Frontier in American History","Frederick Jackson Turner",3],["The Legacy of Conquest","Patricia Nelson Limerick",3],["A Misplaced Massacre","Ari Kelman",3],["The Captured","Scott Zesch",2],["Arizona: A History","Thomas E. Sheridan",2],["Desert Solitaire","Edward Abbey",2],["The Exploration of the Colorado River and Its Canyons","John Wesley Powell",2],["Angle of Repose","Wallace Stegner",3]
  ],
  "General History": [
    ["The Sleepwalkers","Christopher Clark",3],["The Guns of August","Barbara W. Tuchman",2],["South","Ernest Shackleton",2],["The Rise and Fall of the Third Reich","William L. Shirer",3],["Postwar","Tony Judt",3],["Iron Kingdom","Christopher Clark",3],["The Crusades","Thomas Asbridge",2],["The Silk Roads","Peter Frankopan",2],["1491","Charles C. Mann",2],["1493","Charles C. Mann",2],["The Black Count","Tom Reiss",2],["Destiny of the Republic","Candice Millard",1],["The Warmth of Other Suns","Isabel Wilkerson",3],["The Anarchy","William Dalrymple",3],["The Great Game","Peter Hopkirk",2],["The Pursuit of Power","Richard J. Evans",3],["The Age of Revolution","Eric Hobsbawm",3],["The Age of Extremes","Eric Hobsbawm",3],["Stalingrad","Antony Beevor",2],["The Second World War","Antony Beevor",3],["The Wages of Destruction","Adam Tooze",3],["The Cold War","Odd Arne Westad",3],["Genghis Khan and the Making of the Modern World","Jack Weatherford",2],["SPQR","Mary Beard",2],["The Peloponnesian War","Donald Kagan",3],["The Thirty Years War","C. V. Wedgwood",3],["A Distant Mirror","Barbara W. Tuchman",3],["The Great Sea","David Abulafia",3],["The Fate of Africa","Martin Meredith",3],["The Ottoman Centuries","Lord Kinross",2]
  ],
  "Power & Institutions": [
    ["Manufacturing Consent","Edward S. Herman & Noam Chomsky",3],["Propaganda","Edward Bernays",2],["Public Opinion","Walter Lippmann",3],["The Power Elite","C. Wright Mills",3],["Seeing Like a State","James C. Scott",3],["Why Nations Fail","Daron Acemoglu & James A. Robinson",2],["Political Order and Political Decay","Francis Fukuyama",3],["The Dictator's Handbook","Bruce Bueno de Mesquita & Alastair Smith",2],["On Tyranny","Timothy Snyder",1],["CHAOS","Tom O'Neill",2],["The Origins of Political Order","Francis Fukuyama",3],["The Logic of Collective Action","Mancur Olson",3],["The Righteous Mind","Jonathan Haidt",2],["The True Believer","Eric Hoffer",2],["The Crowd","Gustave Le Bon",2],["Amusing Ourselves to Death","Neil Postman",2],["The Image","Daniel J. Boorstin",3],["Trust Me, I'm Lying","Ryan Holiday",1],["The Attention Merchants","Tim Wu",2],["The Age of Surveillance Capitalism","Shoshana Zuboff",3],["The New Jim Crow","Michelle Alexander",3],["The Color of Law","Richard Rothstein",2],["The Road to Serfdom","F. A. Hayek",3],["Capitalism and Freedom","Milton Friedman",2],["The Great Transformation","Karl Polanyi",3],["The Narrow Corridor","Daron Acemoglu & James A. Robinson",3],["The Strategy of Conflict","Thomas C. Schelling",3],["The Federalist Papers","Hamilton, Madison & Jay",3],["Democracy in America","Alexis de Tocqueville",3],["The Anatomy of Fascism","Robert O. Paxton",3]
  ],
  "Economics & Markets": [
    ["21st Century Monetary Policy","Ben S. Bernanke",3],["Lords of Finance","Liaquat Ahamed",2],["Manias, Panics, and Crashes","Charles P. Kindleberger & Robert Aliber",3],["This Time Is Different","Carmen Reinhart & Kenneth Rogoff",3],["The Great Crash 1929","John Kenneth Galbraith",2],["The Big Short","Michael Lewis",1],["When Genius Failed","Roger Lowenstein",2],["Money Changes Everything","William N. Goetzmann",3],["Capital in the Twenty-First Century","Thomas Piketty",3],["Against the Gods","Peter L. Bernstein",2],["A Monetary History of the United States","Milton Friedman & Anna Schwartz",3],["The Courage to Act","Ben S. Bernanke",2],["Stress Test","Timothy Geithner",2],["Too Big to Fail","Andrew Ross Sorkin",2],["The Alchemists","Neil Irwin",2],["The Price of Time","Edward Chancellor",3],["Devil Take the Hindmost","Edward Chancellor",3],["The Ascent of Money","Niall Ferguson",2],["The Misbehavior of Markets","Benoit Mandelbrot & Richard Hudson",3],["Fooled by Randomness","Nassim Nicholas Taleb",2],["The Black Swan","Nassim Nicholas Taleb",3],["Adaptive Markets","Andrew Lo",3],["Expected Returns","Antti Ilmanen",3],["Capital Returns","Edward Chancellor, ed.",3],["The Most Important Thing","Howard Marks",2],["More Money Than God","Sebastian Mallaby",2],["The Man Who Solved the Market","Gregory Zuckerman",2],["Trillion Dollar Triage","Nick Timiraos",2],["The Lords of Easy Money","Christopher Leonard",2],["The Deficit Myth","Stephanie Kelton",2]
  ],
  "Fiction": [
    ["The Waste Lands","Stephen King",2],["Lonesome Dove","Larry McMurtry",2],["Butcher's Crossing","John Williams",2],["War and Peace","Leo Tolstoy",3],["All the King's Men","Robert Penn Warren",3],["The Grapes of Wrath","John Steinbeck",2],["For Whom the Bell Tolls","Ernest Hemingway",2],["Shōgun","James Clavell",2],["The Count of Monte Cristo","Alexandre Dumas",2],["East of Eden","John Steinbeck",2],["No Country for Old Men","Cormac McCarthy",2],["The Border Trilogy","Cormac McCarthy",3],["True Grit","Charles Portis",1],["The Sisters Brothers","Patrick deWitt",1],["The Son","Philipp Meyer",2],["News of the World","Paulette Jiles",1],["Centennial","James A. Michener",2],["The Killer Angels","Michael Shaara",2],["A Gentleman in Moscow","Amor Towles",1],["The Pillars of the Earth","Ken Follett",2],["I, Claudius","Robert Graves",2],["Wolf Hall","Hilary Mantel",3],["The Name of the Rose","Umberto Eco",3],["The Things They Carried","Tim O'Brien",2],["Catch-22","Joseph Heller",2],["1984","George Orwell",2],["Brave New World","Aldous Huxley",2],["One Hundred Years of Solitude","Gabriel García Márquez",3],["The Brothers Karamazov","Fyodor Dostoevsky",3],["The Remains of the Day","Kazuo Ishiguro",2]
  ]
};

const BLURBS: Record<Track,string> = {
  "Western History":"Cowboys, Arizona, Native nations, borderlands, exploration, cattle, railroads and the competing myths of the American West.",
  "General History":"A broad geopolitical and chronological map: empires, wars, revolutions, states, trade and the forces that built the modern world.",
  "Power & Institutions":"Media, propaganda, elites, state capacity, political incentives, ideology and competing theories of who gets power — and why.",
  "Economics & Markets":"Central banking, monetary history, crises, risk, capital, asset pricing, bubbles and the institutions behind markets.",
  "Fiction":"Great stories that sharpen narrative intelligence, psychology, empathy, historical imagination and intuition about human behavior."
};

const DEFAULTS: Record<string,Status> = {
  "The Sleepwalkers":"Read","The Guns of August":"Read","South":"Read","21st Century Monetary Policy":"Read","The Waste Lands":"Reading"
};
const WEIGHTS: Record<Track,number> = {"Western History":1,"General History":1.15,"Power & Institutions":1.2,"Economics & Markets":1.2,"Fiction":.8};
const levelLabel=(n:number)=>n===1?"Entry":n===2?"Deep Dive":"Heavyweight";
const idFor=(t:string)=>t.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

export default function ReadingRoomPage(){
  const [active,setActive]=useState<Track>("Western History");
  const [status,setStatus]=useState<Record<string,Status>>({});
  const [query,setQuery]=useState("");
  const [mounted,setMounted]=useState(false);

  useEffect(()=>{
    try{ const saved=localStorage.getItem("ballzatram-reading-room-v2"); if(saved) setStatus(JSON.parse(saved)); }catch{}
    setMounted(true);
  },[]);
  useEffect(()=>{ if(mounted) localStorage.setItem("ballzatram-reading-room-v2",JSON.stringify(status)); },[status,mounted]);

  const books=useMemo(()=>TRACKS.flatMap(track=>DATA[track].map(([title,author,level])=>({id:idFor(title),title,author,level,track}))),[]);
  const getStatus=(title:string)=>status[idFor(title)]??DEFAULTS[title]??"Unread";
  const setBookStatus=(title:string,s:Status)=>setStatus(prev=>({...prev,[idFor(title)]:s}));
  const shown=books.filter(b=>b.track===active && `${b.title} ${b.author}`.toLowerCase().includes(query.toLowerCase()));
  const read=books.filter(b=>getStatus(b.title)==="Read");
  const reading=books.filter(b=>getStatus(b.title)==="Reading");
  const earned=books.reduce((sum,b)=>sum+(getStatus(b.title)==="Read"?b.level*WEIGHTS[b.track]:getStatus(b.title)==="Reading"?b.level*WEIGHTS[b.track]*.25:0),0);
  const total=books.reduce((sum,b)=>sum+b.level*WEIGHTS[b.track],0);
  const pct=Math.round((earned/total)*100);
  const archetype=pct<10?"Curious Generalist":pct<25?"Building a World Model":pct<45?"Systems-Minded Reader":pct<70?"Interdisciplinary Operator":pct<90?"Independent Scholar":"Walking Encyclopedia";

  return <main className="min-h-screen bg-[#0b0c0d] text-stone-100">
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 border-b border-amber-200/20 pb-8">
        <p className="text-xs font-bold uppercase tracking-[.28em] text-amber-300">Private curriculum · Ballzatram</p>
        <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div><h1 className="text-5xl font-black tracking-tight sm:text-7xl">The Reading Room</h1><p className="mt-4 max-w-3xl text-base leading-7 text-stone-400">150 books. Five shelves. One evolving map of the knowledge you're deliberately building.</p></div>
          <div className="rounded-2xl border border-amber-200/20 bg-amber-100/[.05] p-5">
            <div className="flex items-end justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-stone-500">Reader profile</p><p className="mt-1 text-xl font-bold text-amber-200">{archetype}</p></div><p className="text-4xl font-black">{pct}<span className="text-lg text-stone-500">%</span></p></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-800"><div className="h-full bg-amber-300 transition-all" style={{width:`${pct}%`}} /></div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div><b className="block text-lg">{read.length}</b><span className="text-stone-500">Read</span></div><div><b className="block text-lg">{reading.length}</b><span className="text-stone-500">Reading</span></div><div><b className="block text-lg">150</b><span className="text-stone-500">Curriculum</span></div></div>
          </div>
        </div>
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-5">
        {TRACKS.map(track=>{const completed=DATA[track].filter(([t])=>getStatus(t)==="Read").length; return <button key={track} onClick={()=>{setActive(track);setQuery("")}} className={`rounded-xl border p-4 text-left transition ${active===track?"border-amber-300/60 bg-amber-300/10":"border-stone-800 bg-stone-900/50 hover:border-stone-600"}`}><span className="block text-sm font-bold">{track}</span><span className="mt-1 block text-xs text-stone-500">{completed}/30 read</span></button>})}
      </section>

      <section className="mb-6 rounded-2xl border border-stone-800 bg-stone-900/40 p-5 sm:flex sm:items-end sm:justify-between sm:gap-6">
        <div><p className="text-xs uppercase tracking-[.2em] text-amber-300">Shelf {TRACKS.indexOf(active)+1} / 5</p><h2 className="mt-1 text-3xl font-black">{active}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-stone-400">{BLURBS[active]}</p></div>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search this shelf…" className="mt-4 w-full rounded-xl border border-stone-700 bg-black/30 px-4 py-3 text-sm outline-none placeholder:text-stone-600 focus:border-amber-300 sm:mt-0 sm:w-72" />
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((b,index)=>{const s=getStatus(b.title); return <article key={b.id} className="rounded-2xl border border-stone-800 bg-stone-900/50 p-5 shadow-lg shadow-black/10">
          <div className="flex items-start justify-between gap-3"><span className="text-xs font-bold tabular-nums text-stone-600">{String(index+1).padStart(2,"0")}</span><span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${b.level===3?"border-rose-300/30 text-rose-200":b.level===2?"border-amber-300/30 text-amber-200":"border-emerald-300/30 text-emerald-200"}`}>{levelLabel(b.level)}</span></div>
          <h3 className="mt-4 text-xl font-bold leading-6">{b.title}</h3><p className="mt-1 text-sm text-stone-500">{b.author}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">{(["Unread","Reading","Read"] as Status[]).map(x=><button key={x} onClick={()=>setBookStatus(b.title,x)} className={`rounded-lg border px-2 py-2 text-xs font-bold transition ${s===x?x==="Read"?"border-emerald-300/60 bg-emerald-300/10 text-emerald-200":x==="Reading"?"border-amber-300/60 bg-amber-300/10 text-amber-200":"border-stone-500 bg-stone-800 text-stone-200":"border-stone-800 text-stone-600 hover:border-stone-600 hover:text-stone-300"}`}>{x}</button>)}</div>
        </article>})}
      </section>

      <section className="mt-10 rounded-2xl border border-stone-800 bg-stone-900/40 p-6">
        <p className="text-xs font-bold uppercase tracking-[.22em] text-amber-300">How the score works</p><h2 className="mt-2 text-2xl font-black">Knowledge profile, not IQ.</h2><p className="mt-3 max-w-4xl text-sm leading-6 text-stone-400">Completion is weighted by reading depth. History, institutions, and economics receive slightly more analytical weight; fiction still contributes because narrative intelligence, psychology, language and cultural range are part of the education. A book marked Reading earns partial credit. The useful signal is your balance across shelves, not a vanity number.</p>
      </section>
    </div>
  </main>;
}
