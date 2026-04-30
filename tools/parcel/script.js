const STORAGE_KEY = "parcel_custom_dataset";
const stages = { intake: document.getElementById("stage-intake"), processing: document.getElementById("stage-processing"), dashboard: document.getElementById("stage-dashboard") };
const form = document.getElementById("intake-form");
const processingText = document.getElementById("processing-text");
const summary = document.getElementById("summary");
const metrics = document.getElementById("metrics");
const results = document.getElementById("results");
const dataStatus = document.getElementById("data-status");
const dataPaste = document.getElementById("data-paste");
const saveDataBtn = document.getElementById("save-data");
const clearDataBtn = document.getElementById("clear-data");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (r, keys) => keys.map((k) => r[k]).find((v) => v !== undefined && v !== "") ?? "";
const n = (v) => { const x = Number(String(v).replace(/[^0-9.-]/g, "")); return Number.isFinite(x) ? x : NaN; };
const usd = (v) => Number.isFinite(v) ? v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }) : "—";
const activate = (name) => { Object.values(stages).forEach((s) => s.classList.remove("stage-active")); stages[name].classList.add("stage-active"); };

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const sep = lines[0].split("\t").length > lines[0].split(",").length ? "\t" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(sep);
    const row = {}; headers.forEach((h, i) => { row[h] = (cols[i] ?? "").trim(); });
    return row;
  });
}

function model(row) {
  return {
    name: pick(row, ["Property Name", "Address / Property", "Property", "name"]),
    city: pick(row, ["City", "city"]), state: pick(row, ["State", "state"]),
    acres: n(pick(row, ["Acres", "acres"])),
    price: n(pick(row, ["List Price", "price"])),
    ppa: n(pick(row, ["Price / Acre", "Price Per Acre", "price_per_acre"])),
    drive: n(pick(row, ["Est. Drive Min to Charlotte", "Drive Time From Charlotte", "drive_minutes"])),
    score: n(pick(row, ["Weighted Polo Score", "score_total"])),
    notes: `${pick(row, ["Listing Notes", "Investor Notes", "Polo / Investor Notes", "notes"])} ${pick(row, ["Status", "status"])}`.toLowerCase(),
    map: pick(row, ["Map URL", "map_url"]),
  };
}

function rank(m, q) { let s = Number.isFinite(m.score) ? m.score : 55; if (Number.isFinite(m.acres) && m.acres < q.minAcres) s -= 18; if (Number.isFinite(m.price) && m.price > q.maxPrice) s -= 14; if (Number.isFinite(m.drive) && m.drive > q.maxDrive) s -= 12; if (q.zoning === "ag" && !/(ag|farm|pasture|timber|rural)/.test(m.notes)) s -= 8; if (q.zoning === "res" && !/(residential|estate|home)/.test(m.notes)) s -= 8; return Math.max(0, Math.min(100, s)); }

function render(rows) {
  results.innerHTML = "";
  rows.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m.name || "Untitled"}</td><td>${m.city || ""} ${m.state || ""}</td><td>${Number.isFinite(m.acres) ? m.acres.toFixed(1) : "—"}</td><td>${usd(m.price)}</td><td>${usd(m.ppa)}</td><td>${m.custom.toFixed(1)}</td><td>${m.map ? `<a href="${m.map}" target="_blank" rel="noreferrer">Map</a>` : "—"}</td>`;
    results.appendChild(tr);
  });
  const avg = rows.length ? rows.reduce((a, b) => a + b.custom, 0) / rows.length : 0;
  metrics.innerHTML = `<div class="metric"><span>Matches</span><b>${rows.length}</b></div><div class="metric"><span>Avg Score</span><b>${avg.toFixed(1)}</b></div><div class="metric"><span>Top Score</span><b>${rows[0]?.custom?.toFixed(1) ?? "—"}</b></div><div class="metric"><span>Mode</span><b>AI Intake</b></div>`;
}

async function loadRawData() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) return { text: local, source: "local pasted dataset" };
  const text = await fetch("./data/properties.csv", { cache: "no-store" }).then((r) => r.text()).catch(() => "");
  return { text, source: "repo CSV" };
}

async function runQuery(showProcessing = true) {
  if (showProcessing) { activate("processing"); processingText.textContent = "Compiling intelligence dataset..."; await wait(700); }
  const q = { minAcres: Number(document.getElementById("min-acres").value) || 0, maxPrice: Number(document.getElementById("max-price").value) || Number.MAX_SAFE_INTEGER, maxDrive: Number(document.getElementById("max-drive").value) || Number.MAX_SAFE_INTEGER, zoning: document.getElementById("zoning").value };
  const { text, source } = await loadRawData();
  const rows = parseCSV(text).map(model).map((m) => ({ ...m, custom: rank(m, q) })).filter((m) => (Number.isFinite(m.acres) ? m.acres >= q.minAcres : true) && (Number.isFinite(m.price) ? m.price <= q.maxPrice : true) && (Number.isFinite(m.drive) ? m.drive <= q.maxDrive : true)).sort((a, b) => b.custom - a.custom).slice(0, 30);
  summary.textContent = rows.length ? `${rows.length} opportunities matched your intake parameters (${source}).` : `No matches found from ${source}.`;
  render(rows); activate("dashboard");
}

saveDataBtn.addEventListener("click", () => { const txt = dataPaste.value.trim(); if (!txt) return; localStorage.setItem(STORAGE_KEY, txt); dataStatus.textContent = "Saved pasted dataset to browser storage. Running query..."; runQuery(false); });
clearDataBtn.addEventListener("click", () => { localStorage.removeItem(STORAGE_KEY); dataStatus.textContent = "Cleared local dataset. Using repo CSV."; runQuery(false); });
form.addEventListener("submit", (e) => { e.preventDefault(); runQuery(true); });

window.addEventListener("DOMContentLoaded", async () => {
  const repoText = await fetch("./data/properties.csv", { cache: "no-store" }).then((r) => r.text()).catch(() => "");
  const repoRows = parseCSV(repoText).length;
  const hasLocal = Boolean(localStorage.getItem(STORAGE_KEY));
  dataStatus.textContent = hasLocal ? "Using saved local dataset in this browser." : `Repo dataset rows detected: ${repoRows}.`;
  runQuery(false);
});
