const STORAGE_KEYS = {
  scenario: "ballzatram:scenario-pages-last-run:v1",
  supplyDemand: "ballzatram:supply-demand-last-run:v1",
  draft: "ballzatram:pages-report-draft:v1"
};

const sourceMeta = {
  scenario: { label: "Scenario Stress Lab", color: "violet" },
  supplyDemand: { label: "Supply & Demand Lab", color: "green" }
};

let availableSources = {};
let sections = [];
let markdown = "";

const $ = (id) => document.getElementById(id);
const pct = (value, digits = 1) => `${(Number(value) * 100).toFixed(digits)}%`;
const num = (value, digits = 1) => Number(value).toFixed(digits);

function safeParse(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function readSources() {
  const scenario = safeParse(localStorage.getItem(STORAGE_KEYS.scenario));
  const supplyDemand = safeParse(localStorage.getItem(STORAGE_KEYS.supplyDemand));
  availableSources = {};
  if (scenario?.portfolio_return_shock != null) availableSources.scenario = scenarioToSection(scenario);
  if (supplyDemand?.result) availableSources.supplyDemand = supplyDemandToSection(supplyDemand);
}

function scenarioToSection(run) {
  const contributions = Array.isArray(run.factor_contributions) ? run.factor_contributions : [];
  const drivers = contributions.slice().sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  return {
    id: `scenario-${run.savedAt || Date.now()}`,
    sourceKind: "scenario",
    title: "Scenario Stress Lab",
    createdAt: run.savedAt || new Date().toISOString(),
    findings: [
      `Incremental stressed portfolio return: ${pct(run.portfolio_return_shock)}.`,
      Array.isArray(run.confidence_band) ? `Illustrative confidence band: ${pct(run.confidence_band[0])} to ${pct(run.confidence_band[1])}.` : null,
      ...drivers.map((item) => `${item.factor}: shock ${num(item.shock, 2)}, modeled impact ${pct(item.impact)}.`)
    ].filter(Boolean),
    assumptions: [
      "Fixed portfolio-level factor sensitivities are used for rates, CPI, growth, oil, and credit.",
      "The confidence band is illustrative and fixed at +/-3 percentage points around the modeled shock.",
      "The model does not estimate security-specific exposures, forecast prices, or calculate VaR."
    ],
    provenance: [
      `Saved browser run: ${run.savedAt || "unknown time"}.`,
      `Shocks: ${Object.entries(run.shocks || {}).map(([key, value]) => `${key}=${value}`).join(", ") || "not recorded"}.`
    ],
    warnings: ["Scenario output is a teaching/sensitivity illustration, not investment advice or a forecast."]
  };
}

function supplyDemandToSection(run) {
  const result = run.result || {};
  const history = Array.isArray(result.history) ? result.history : [];
  return {
    id: `supply-demand-${run.savedAt || Date.now()}`,
    sourceKind: "supplyDemand",
    title: "Supply & Demand Lab",
    createdAt: run.savedAt || new Date().toISOString(),
    findings: [
      `Final price: $${result.price ?? "n/a"}; final quantity: ${result.quantity ?? "n/a"}.`,
      `Market balance: ${result.shortageSurplus || "unknown"}${result.gap ? ` with gap ${result.gap}` : ""}.`,
      `Consumer surplus: $${result.consumerSurplus ?? "n/a"}; producer surplus: $${result.producerSurplus ?? "n/a"}.`,
      `Deadweight loss: $${result.deadweightLoss ?? "n/a"}; market stability: ${result.marketStability ?? "n/a"}/100.`,
      history.length ? `Action path: ${history.map((item) => item.label).join(" → ")}.` : null
    ].filter(Boolean),
    assumptions: [
      "The model uses deliberately simplified linear directional coefficients for demand and supply shifts.",
      "Price-control and tax effects are stylized teaching mechanics rather than calibrated real-market estimates."
    ],
    provenance: [
      `Saved browser run: ${run.savedAt || "unknown time"}.`,
      `Mode: ${run.mode || "unknown"}; scenario: ${run.scenarioId || "unknown"}; challenge: ${run.challengeId || "n/a"}; moves: ${run.moves ?? "n/a"}.`
    ],
    warnings: ["This lab demonstrates economic intuition and policy tradeoffs; it does not estimate a real market."]
  };
}

function restoreDraft() {
  const draft = safeParse(localStorage.getItem(STORAGE_KEYS.draft));
  if (!draft) return;
  if (draft.title) $("reportTitle").value = draft.title;
  if (draft.openingNote) $("openingNote").value = draft.openingNote;
  if (Array.isArray(draft.sections)) sections = draft.sections;
}

function saveDraft() {
  try {
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify({
      title: $("reportTitle").value,
      openingNote: $("openingNote").value,
      sections,
      updatedAt: new Date().toISOString()
    }));
  } catch {}
}

function renderSources() {
  const kinds = ["scenario", "supplyDemand"];
  $("sourceList").innerHTML = kinds.map((kind) => {
    const source = availableSources[kind];
    const added = sections.some((section) => section.sourceKind === kind);
    return `<article class="source-card ${source ? "available" : "missing"}">
      <div><span class="source-dot ${sourceMeta[kind].color}"></span><strong>${sourceMeta[kind].label}</strong></div>
      <small>${source ? `Saved ${new Date(source.createdAt).toLocaleString()}` : "No saved run in this browser"}</small>
      <button data-add-source="${kind}" ${!source || added ? "disabled" : ""}>${added ? "Added" : source ? "Add to report" : "Run lab first"}</button>
    </article>`;
  }).join("");
  $("sourceList").querySelectorAll("[data-add-source]").forEach((button) => button.addEventListener("click", () => addSource(button.dataset.addSource)));
}

function addSource(kind) {
  const source = availableSources[kind];
  if (!source || sections.some((section) => section.sourceKind === kind)) return;
  sections.push(structuredClone(source));
  saveDraft();
  renderAll();
}

function renderSections() {
  $("sectionCount").textContent = `${sections.length} section${sections.length === 1 ? "" : "s"}`;
  if (!sections.length) {
    $("sectionList").innerHTML = `<div class="empty-state">Add one of the saved browser lab runs to start building the report.</div>`;
    return;
  }
  $("sectionList").innerHTML = sections.map((section, index) => `
    <article class="report-section" data-index="${index}">
      <div class="section-toolbar">
        <span class="source-chip">${sourceMeta[section.sourceKind]?.label || section.sourceKind}</span>
        <div class="move-buttons">
          <button data-move="up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button data-move="down" ${index === sections.length - 1 ? "disabled" : ""}>↓</button>
          <button data-remove>Remove</button>
        </div>
      </div>
      <label class="field">Section title<input data-field="title" value="${escapeAttr(section.title)}" /></label>
      <label class="field">Findings<textarea data-field="findings" rows="6">${escapeText(section.findings.join("\n"))}</textarea></label>
      <details><summary>Provenance, assumptions & warnings</summary>
        <div class="context-list">${section.provenance.map((item) => `<p><strong>Source:</strong> ${escapeText(item)}</p>`).join("")}${section.assumptions.map((item) => `<p><strong>Assumption:</strong> ${escapeText(item)}</p>`).join("")}${section.warnings.map((item) => `<p><strong>Warning:</strong> ${escapeText(item)}</p>`).join("")}</div>
      </details>
    </article>`).join("");

  $("sectionList").querySelectorAll(".report-section").forEach((node) => {
    const index = Number(node.dataset.index);
    node.querySelector("[data-remove]").addEventListener("click", () => { sections.splice(index, 1); saveDraft(); renderAll(); });
    node.querySelector("[data-move='up']")?.addEventListener("click", () => moveSection(index, -1));
    node.querySelector("[data-move='down']")?.addEventListener("click", () => moveSection(index, 1));
    node.querySelector("[data-field='title']").addEventListener("input", (event) => { sections[index].title = event.target.value; saveDraft(); });
    node.querySelector("[data-field='findings']").addEventListener("input", (event) => { sections[index].findings = event.target.value.split("\n").map((line) => line.trim()).filter(Boolean); saveDraft(); });
  });
}

function moveSection(index, direction) {
  const target = index + direction;
  if (target < 0 || target >= sections.length) return;
  [sections[index], sections[target]] = [sections[target], sections[index]];
  saveDraft();
  renderAll();
}

function buildMarkdown() {
  const title = $("reportTitle").value.trim() || "Ballzatram Research Report";
  const opening = $("openingNote").value.trim();
  const lines = [`# ${title}`, "", `Generated locally: ${new Date().toISOString()}`, ""];
  if (opening) lines.push("## Purpose", "", opening, "");
  sections.forEach((section) => {
    lines.push(`## ${section.title}`, "");
    section.findings.forEach((item) => lines.push(`- ${item}`));
    if (section.provenance.length) {
      lines.push("", "### Provenance");
      section.provenance.forEach((item) => lines.push(`- ${item}`));
    }
    if (section.assumptions.length) {
      lines.push("", "### Assumptions");
      section.assumptions.forEach((item) => lines.push(`- ${item}`));
    }
    if (section.warnings.length) {
      lines.push("", "### Warnings");
      section.warnings.forEach((item) => lines.push(`- ${item}`));
    }
    lines.push("");
  });
  lines.push("## Report Boundary", "", "This artifact was composed locally from saved Ballzatram browser-lab outputs and user edits. It does not add external facts, AI-generated conclusions, or new market data.");
  return lines.join("\n");
}

function generate() {
  if (!sections.length) {
    $("markdownPreview").textContent = "Add at least one saved lab run before generating the report.";
    return;
  }
  markdown = buildMarkdown();
  $("markdownPreview").textContent = markdown;
  $("copyButton").disabled = false;
  $("downloadButton").disabled = false;
  saveDraft();
}

async function copyMarkdown() {
  if (!markdown) return;
  try {
    await navigator.clipboard.writeText(markdown);
    $("copyButton").textContent = "Copied";
    setTimeout(() => { $("copyButton").textContent = "Copy"; }, 1200);
  } catch {
    $("copyButton").textContent = "Copy failed";
  }
}

function downloadMarkdown() {
  if (!markdown) return;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const slug = ($("reportTitle").value || "ballzatram-report").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "ballzatram-report";
  anchor.download = `${slug}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function clearDraft() {
  sections = [];
  markdown = "";
  $("reportTitle").value = "Ballzatram Research Report";
  $("openingNote").value = "";
  $("markdownPreview").textContent = "Add at least one saved lab run, then generate the report.";
  $("copyButton").disabled = true;
  $("downloadButton").disabled = true;
  try { localStorage.removeItem(STORAGE_KEYS.draft); } catch {}
  renderAll();
}

function escapeText(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, "&quot;");
}

function renderAll() {
  renderSources();
  renderSections();
}

readSources();
restoreDraft();
renderAll();
$("generateButton").addEventListener("click", generate);
$("copyButton").addEventListener("click", copyMarkdown);
$("downloadButton").addEventListener("click", downloadMarkdown);
$("clearDraftButton").addEventListener("click", clearDraft);
$("reportTitle").addEventListener("input", saveDraft);
$("openingNote").addEventListener("input", saveDraft);
