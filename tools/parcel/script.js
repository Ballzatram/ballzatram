const stages = {
  intake: document.getElementById("stage-intake"),
  processing: document.getElementById("stage-processing"),
  dashboard: document.getElementById("stage-dashboard"),
};

const form = document.getElementById("intake-form");
const processingText = document.getElementById("processing-text");
const summary = document.getElementById("summary");
const metrics = document.getElementById("metrics");
const results = document.getElementById("results");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (r, keys) => keys.map((k) => r[k]).find((v) => v !== undefined && v !== "") ?? "";
const n = (v) => { const x = Number(String(v).replace(/[^0-9.-]/g, "")); return Number.isFinite(x) ? x : NaN; };
const usd = (v) => Number.isFinite(v) ? v.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}) : "—";

function activate(name){ Object.values(stages).forEach((s)=>s.classList.remove("stage-active")); stages[name].classList.add("stage-active"); }

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split("\t").length > lines[0].split(",").length ? lines[0].split("\t") : lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t").length === headers.length ? line.split("\t") : line.split(",");
    const row = {}; headers.forEach((h,i)=>row[h.trim()] = (cols[i] ?? "").trim()); return row;
  });
}

function model(row){
  return {
    name: pick(row,["Property Name","Address / Property"]),
    city: pick(row,["City"]), state: pick(row,["State"]),
    acres: n(pick(row,["Acres"])),
    price: n(pick(row,["List Price"])),
    ppa: n(pick(row,["Price / Acre","Price Per Acre"])),
    drive: n(pick(row,["Est. Drive Min to Charlotte","Drive Time From Charlotte"])),
    score: n(pick(row,["Weighted Polo Score"])),
    notes: `${pick(row,["Listing Notes","Investor Notes","Polo / Investor Notes"])} ${pick(row,["Status"])}`.toLowerCase(),
    map: pick(row,["Map URL"]),
  };
}

function rank(m, q){
  let s = Number.isFinite(m.score) ? m.score : 55;
  if (Number.isFinite(m.acres) && m.acres < q.minAcres) s -= 18;
  if (Number.isFinite(m.price) && m.price > q.maxPrice) s -= 14;
  if (Number.isFinite(m.drive) && m.drive > q.maxDrive) s -= 12;
  if (q.zoning === "ag" && !/(ag|farm|pasture|timber|rural)/.test(m.notes)) s -= 8;
  if (q.zoning === "res" && !/(residential|estate|home)/.test(m.notes)) s -= 8;
  return Math.max(0, Math.min(100, s));
}

function render(rows){
  results.innerHTML = "";
  rows.forEach((m)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m.name||"Untitled"}</td><td>${m.city||""} ${m.state||""}</td><td>${Number.isFinite(m.acres)?m.acres.toFixed(1):"—"}</td><td>${usd(m.price)}</td><td>${usd(m.ppa)}</td><td>${m.custom.toFixed(1)}</td><td>${m.map?`<a href="${m.map}" target="_blank" rel="noreferrer">Map</a>`:"—"}</td>`;
    results.appendChild(tr);
  });
  const avg = rows.length ? rows.reduce((a,b)=>a+b.custom,0)/rows.length : 0;
  metrics.innerHTML = `<div class="metric"><span>Matches</span><b>${rows.length}</b></div><div class="metric"><span>Avg Score</span><b>${avg.toFixed(1)}</b></div><div class="metric"><span>Top Score</span><b>${rows[0]?.custom?.toFixed(1) ?? "—"}</b></div><div class="metric"><span>Mode</span><b>AI Intake</b></div>`;
}

async function runQuery({ showProcessing = true } = {}) {
  if (showProcessing) {
    activate("processing");
    processingText.textContent = "Parsing investor intent..."; await wait(450);
    processingText.textContent = "Compiling local intelligence dataset (CSV source of truth)..."; await wait(600);
    processingText.textContent = "Ranking properties and building dashboard..."; await wait(550);
  }

  const q = {
    minAcres: Number(document.getElementById("min-acres").value) || 0,
    maxPrice: Number(document.getElementById("max-price").value) || Number.MAX_SAFE_INTEGER,
    maxDrive: Number(document.getElementById("max-drive").value) || Number.MAX_SAFE_INTEGER,
    zoning: document.getElementById("zoning").value,
  };

  const text = await fetch("./data/properties.csv", { cache: "no-store" }).then((r) => r.text()).catch(() => "");
  const rows = parseCSV(text).map(model).map((m)=>({ ...m, custom: rank(m,q) }))
    .filter((m)=>(Number.isFinite(m.acres)?m.acres>=q.minAcres:true) && (Number.isFinite(m.price)?m.price<=q.maxPrice:true) && (Number.isFinite(m.drive)?m.drive<=q.maxDrive:true))
    .sort((a,b)=>b.custom-a.custom)
    .slice(0,30);

  summary.textContent = rows.length ? `${rows.length} opportunities matched your intake parameters.` : "No matches found. Relax one or more constraints.";
  render(rows);
  activate("dashboard");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await runQuery({ showProcessing: true });
});

window.addEventListener("DOMContentLoaded", async () => {
  // Auto-populate instantly on return visits so users don't think they must wait.
  await runQuery({ showProcessing: false });
});
