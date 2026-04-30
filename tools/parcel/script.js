const CSV_PATH = "./data/properties.csv";
const form = document.getElementById("query-form");
const tbody = document.getElementById("results-body");
const summary = document.getElementById("summary");
const metrics = document.getElementById("metrics");

const pick = (row, keys) => keys.map((k) => row[k]).find((v) => v !== undefined && v !== "") ?? "";
const num = (v) => { const n = Number(String(v).replace(/[^0-9.-]/g, "")); return Number.isFinite(n) ? n : NaN; };
const fmt = (n) => Number.isFinite(n) ? n.toLocaleString() : "—";
const usd = (n) => Number.isFinite(n) ? n.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:0}) : "—";

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split("\t").length > lines[0].split(",").length ? lines[0].split("\t") : lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cols = line.split("\t").length === headers.length ? line.split("\t") : line.split(",");
    const row = {}; headers.forEach((h,i)=>row[h.trim()] = (cols[i] ?? "").trim()); return row;
  });
}

function buildModel(row) {
  const acres = num(pick(row,["Acres","acres"]));
  const ppa = num(pick(row,["Price / Acre","Price Per Acre","price_per_acre"]));
  const price = num(pick(row,["List Price","price"]));
  const drive = num(pick(row,["Est. Drive Min to Charlotte","Drive Time From Charlotte","drive_minutes"]));
  const score = num(pick(row,["Weighted Polo Score","score_total"]));
  return {
    raw: row,
    name: pick(row,["Property Name","Address / Property","title","name"]) || "Untitled",
    location: `${pick(row,["City","city"])} ${pick(row,["State","state"])}`.trim(),
    acres, ppa, price, drive, score,
    zoningText: `${pick(row,["Listing Notes","Polo / Investor Notes","Investor Notes","notes"])} ${pick(row,["Status","status"])} `.toLowerCase(),
    mapUrl: pick(row,["Map URL","map_url"])
  };
}

function scoreFit(m, query) {
  let s = Number.isFinite(m.score) ? m.score : 50;
  if (Number.isFinite(m.acres) && m.acres < query.minAcres) s -= 20;
  if (Number.isFinite(m.ppa) && m.ppa > query.maxPpa) s -= 18;
  if (Number.isFinite(m.drive) && m.drive > query.maxDrive) s -= 15;
  if (query.zoning === "ag" && !/(ag|agric|pasture|rural|timber|farm)/.test(m.zoningText)) s -= 8;
  if (query.zoning === "res" && !/(residential|estate|home)/.test(m.zoningText)) s -= 8;
  return Math.max(0, Math.min(100, s));
}

function render(rows) {
  tbody.innerHTML = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.name}</td><td>${r.location || "Unknown"}</td><td>${fmt(r.acres)}</td><td>${usd(r.price)}</td><td>${usd(r.ppa)}</td><td>${fmt(r.customScore)}</td><td>${r.mapUrl ? `<a href="${r.mapUrl}" target="_blank" rel="noreferrer">Open map</a>` : "—"}</td>`;
    tbody.appendChild(tr);
  });
}

function renderMetrics(rows) {
  const avgScore = rows.length ? rows.reduce((a,r)=>a+r.customScore,0)/rows.length : 0;
  const avgAcres = rows.length ? rows.reduce((a,r)=>a+(Number.isFinite(r.acres)?r.acres:0),0)/rows.length : 0;
  metrics.innerHTML = `
    <div class="metric"><span>Matches</span><b>${rows.length}</b></div>
    <div class="metric"><span>Avg Fit Score</span><b>${avgScore.toFixed(1)}</b></div>
    <div class="metric"><span>Avg Acres</span><b>${avgAcres.toFixed(1)}</b></div>`;
}

let dataset = [];
fetch(CSV_PATH).then(r=>r.text()).then((txt)=>{ dataset = parseCSV(txt).map(buildModel); summary.textContent = `Loaded ${dataset.length} properties. Configure your query.`; }).catch(()=>{ summary.textContent = "Data source unavailable. Add data/properties.csv to continue."; });

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = {
    minAcres: Number(document.getElementById("min-acres").value) || 0,
    maxPpa: Number(document.getElementById("max-ppa").value) || Number.MAX_SAFE_INTEGER,
    maxDrive: Number(document.getElementById("max-drive").value) || Number.MAX_SAFE_INTEGER,
    limit: Number(document.getElementById("max-results").value) || 20,
    zoning: document.getElementById("zoning").value,
  };
  const filtered = dataset.map((m)=>({ ...m, customScore: scoreFit(m,q) }))
    .filter((m)=> (Number.isFinite(m.acres) ? m.acres >= q.minAcres : true) && (Number.isFinite(m.ppa) ? m.ppa <= q.maxPpa : true) && (Number.isFinite(m.drive) ? m.drive <= q.maxDrive : true))
    .sort((a,b)=>b.customScore-a.customScore)
    .slice(0,q.limit);

  render(filtered);
  renderMetrics(filtered);
  summary.textContent = filtered.length ? `Query complete: ${filtered.length} properties match your parameters.` : "No properties matched. Broaden acreage/price/drive filters.";
});
