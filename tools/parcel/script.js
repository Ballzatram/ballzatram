const stages = {
  intake: document.getElementById("stage-intake"),
  processing: document.getElementById("stage-processing"),
  results: document.getElementById("stage-results"),
  shortlist: document.getElementById("stage-shortlist"),
  deck: document.getElementById("stage-deck"),
};
const form = document.getElementById("search-form");
const processingText = document.getElementById("processing-text");
const summary = document.getElementById("summary");
const metricsEl = document.getElementById("metrics");
const aiNoteEl = document.getElementById("ai-note");
const resultsEl = document.getElementById("results");
const resultsEmpty = document.getElementById("results-empty");
const thesisBlock = document.getElementById("thesis-block");
const shortlistTable = document.getElementById("shortlist-table");
const shortlistEmpty = document.getElementById("shortlist-empty");
const compareSummary = document.getElementById("compare-summary");
const deckPreview = document.getElementById("deck-preview");

let shortlist = [];
let latestThesis = null;
let latestResults = [];

const SOURCES = ["landsearch.com", "land.com", "loopnet.com", "zillow.com", "realtor.com", "landwatch.com"];
const activate = (stageName) => {
  Object.entries(stages).forEach(([name, stage]) => {
    const shouldShow = name === stageName || (stageName === "results" && ["results", "shortlist", "deck"].includes(name));
    stage.classList.toggle("stage-active", shouldShow);
  });
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const splitCsv = (value) => value.split(",").map((item) => item.trim()).filter(Boolean);
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

function safeUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "#";
  } catch {
    return "#";
  }
}

function money(value, fallback = "unknown/inferred") {
  return Number(value) ? `$${Number(value).toLocaleString()}` : fallback;
}

function stableId(row) {
  const text = String(row.url || row.title || Math.random()).slice(0, 80);
  let hash = 0;
  for (const char of text) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  return `parcel_${Math.abs(hash)}`;
}

function generateInvestmentThesis() {
  const thesis = {
    targetUse: document.getElementById("target-use").value,
    location: document.getElementById("location").value.trim(),
    radiusMiles: Number(document.getElementById("radius").value) || null,
    acreageMin: Number(document.getElementById("acreage-min").value) || null,
    acreageMax: Number(document.getElementById("acreage-max").value) || null,
    budgetMax: Number(document.getElementById("budget-max").value) || null,
    mustHaveFactors: splitCsv(document.getElementById("must-have").value),
    riskFactors: splitCsv(document.getElementById("risk-factors").value),
    notes: document.getElementById("notes").value.trim(),
    scoringWeights: {
      locationFit: 18,
      acreageFit: 14,
      priceFit: 14,
      accessFit: 10,
      zoningFit: 10,
      utilityFit: 9,
      floodRisk: 8,
      demographicSupport: 7,
      competitionGap: 5,
      developmentComplexity: 5,
    },
  };
  thesis.generatedSearchSummary = `${thesis.targetUse} strategy in ${thesis.location} within ${thesis.radiusMiles || "any"} miles; target ${thesis.acreageMin || "any"}-${thesis.acreageMax || "any"} acres and max budget ${money(thesis.budgetMax, "not set")}.`;
  return thesis;
}

function parseJina(text) {
  return text.split("\n")
    .map((line) => line.match(/\[(.*?)\]\((https?:\/\/[^)]+)\)/))
    .filter(Boolean)
    .map((match) => ({ title: match[1], url: match[2] }))
    .filter((row) => SOURCES.some((domain) => row.url.includes(domain)))
    .map((row) => ({ ...row, source: new URL(row.url).hostname.replace("www.", "") }));
}

async function fallbackRows() {
  try {
    const response = await fetch("./output/seed_listings.json", { cache: "no-store" });
    return response.ok ? response.json() : [];
  } catch {
    return [];
  }
}

async function validateSource(url) {
  if (!url) return "source search required";
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors" });
    return "manual verification needed";
  } catch {
    return "manual verification needed";
  }
}

function scoreOpportunity(opportunity, thesis) {
  const dims = {
    locationFit: 45,
    acreageFit: 50,
    priceFit: 50,
    accessFit: 55,
    zoningFit: 50,
    utilityFit: 50,
    floodRisk: 50,
    demographicSupport: 55,
    competitionGap: 50,
    developmentComplexity: 50,
  };
  const text = (opportunity.title || "").toLowerCase();
  if (text.includes(thesis.location.toLowerCase())) dims.locationFit = 92;
  if (/acre|land|tract|ranch|farm/.test(text)) dims.acreageFit = 80;
  if (/highway|road|frontage/.test(text)) dims.accessFit = 75;
  if (/utility|electric|water|sewer/.test(text)) dims.utilityFit = 76;
  if (/flood/.test(text)) dims.floodRisk = 25;

  const weighted = Object.entries(dims).reduce((total, [key, value]) => total + value * (thesis.scoringWeights[key] || 0), 0) / 100;
  const overallFitScore = Math.round(weighted);
  const developmentRisk = overallFitScore > 75 ? "low" : overallFitScore > 58 ? "medium" : "high";
  const pitchReadinessScore = Math.max(35, Math.round(overallFitScore - (opportunity.dataConfidence === "low" ? 18 : opportunity.dataConfidence === "medium" ? 8 : 0)));

  return {
    overallFitScore,
    developmentRisk,
    pitchReadinessScore,
    scoreBreakdown: dims,
    scoreExplanation: [
      `Location fit ${dims.locationFit}/100 based on title/source match.`,
      `Acreage and land-type signal ${dims.acreageFit}/100 from listing context.`,
      "Price fit is conservative due to sparse verified asking data.",
    ],
  };
}

function summarizeOpportunity(opportunity, thesis) {
  return `Potential ${thesis.targetUse.toLowerCase()} candidate in ${opportunity.location}. Fit is driven by location and parcel-use signals. Validate zoning, utilities, and title chain before an LOI.`;
}

function normalizeOpportunity(row, thesis) {
  const askingPrice = row.price || null;
  const acreage = row.acreage || null;
  const pricePerAcre = askingPrice && acreage ? Math.round(askingPrice / acreage) : null;
  const fieldCount = ["title", "url", "source"].filter((key) => row[key]).length;
  const dataConfidence = fieldCount >= 3 ? "medium" : "low";
  const opportunity = {
    id: stableId(row),
    title: row.title || "Untitled opportunity",
    location: thesis.location,
    acreage,
    askingPrice,
    pricePerAcre,
    sourceUrl: row.url || null,
    sourceStatus: row.url ? "manual verification needed" : "source search required",
    sourceType: row.source?.includes("county") ? "county/GIS" : "listing",
    dataConfidence,
    aiSummary: "",
    fitReason: "",
    redFlags: "Unknown acreage/price; verify with broker or county records.",
    nextQuestions: "What is current zoning, utility tie-in cost, and floodplain status?",
  };
  const score = scoreOpportunity(opportunity, thesis);
  opportunity.aiSummary = summarizeOpportunity(opportunity, thesis);
  opportunity.fitReason = score.scoreExplanation[0];
  return { ...opportunity, ...score };
}

function createCard(opportunity) {
  const sourceUrl = safeUrl(opportunity.sourceUrl);
  const sourceLabel = opportunity.sourceUrl ? "View source" : "Source search required";
  const card = document.createElement("article");
  card.className = "opp-card";
  card.innerHTML = `
    <h3>${escapeHtml(opportunity.title)}</h3>
    <p>${escapeHtml(opportunity.aiSummary)}</p>
    <div class="badges">
      <span>Fit ${escapeHtml(opportunity.overallFitScore)}/100</span>
      <span>Risk ${escapeHtml(opportunity.developmentRisk)}</span>
      <span>Confidence ${escapeHtml(opportunity.dataConfidence)}</span>
      <span>Source ${escapeHtml(opportunity.sourceStatus)}</span>
    </div>
    <ul>
      <li><strong>Location:</strong> ${escapeHtml(opportunity.location)}</li>
      <li><strong>Acreage:</strong> ${escapeHtml(opportunity.acreage ?? "unknown/inferred")}</li>
      <li><strong>Asking:</strong> ${escapeHtml(money(opportunity.askingPrice))}</li>
      <li><strong>$/Acre:</strong> ${escapeHtml(money(opportunity.pricePerAcre))}</li>
      <li><strong>Why it fits:</strong> ${escapeHtml(opportunity.fitReason)}</li>
      <li><strong>Red flags:</strong> ${escapeHtml(opportunity.redFlags)}</li>
      <li><strong>Next questions:</strong> ${escapeHtml(opportunity.nextQuestions)}</li>
    </ul>
    <div class="actions">
      <a class="ghost" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${sourceLabel}</a>
      <button class="ghost" data-save="${escapeHtml(opportunity.id)}">Save to Shortlist</button>
      <button class="ghost" data-compare="${escapeHtml(opportunity.id)}">Compare</button>
      <button class="ghost" disabled>Generate Slide</button>
      <button class="ghost" disabled>Ask AI</button>
    </div>`;
  return card;
}

function renderMetrics(rows) {
  const average = rows.length ? (rows.reduce((total, row) => total + row.overallFitScore, 0) / rows.length).toFixed(1) : "0.0";
  metricsEl.innerHTML = [
    ["Total opportunities", rows.length],
    ["Shortlisted", shortlist.length],
    ["Avg fit", average],
    ["Workflow", "Thesis -> Score -> Pitch"],
  ].map(([label, value]) => `<div class="metric"><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong></div>`).join("");
}

function generateComparisonSummary(list, thesis) {
  if (!list.length) return "Add at least one opportunity to generate a comparison summary.";
  const best = [...list].sort((a, b) => b.overallFitScore - a.overallFitScore)[0];
  return `Based on the current thesis for ${thesis.targetUse} in ${thesis.location}, ${best.title} is currently the strongest pitch candidate due to composite fit score and readiness. Lower-ranked parcels may still offer upside but require more diligence on zoning, utilities, and environmental risk.`;
}

function renderShortlist() {
  shortlistTable.innerHTML = "";
  shortlist.forEach((opportunity) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(opportunity.title)}</td>
      <td>${escapeHtml(opportunity.location)}</td>
      <td>${escapeHtml(opportunity.acreage ?? "unknown")}</td>
      <td>${escapeHtml(opportunity.askingPrice ? money(opportunity.askingPrice) : "unknown")}</td>
      <td>${escapeHtml(opportunity.pricePerAcre ? money(opportunity.pricePerAcre) : "unknown")}</td>
      <td>${escapeHtml(opportunity.overallFitScore)}</td>
      <td>${escapeHtml(opportunity.developmentRisk)}</td>
      <td>${escapeHtml(opportunity.dataConfidence)}</td>
      <td>${escapeHtml(opportunity.pitchReadinessScore)}</td>
      <td>${escapeHtml(opportunity.aiSummary)}</td>`;
    shortlistTable.appendChild(row);
  });
  shortlistEmpty.hidden = shortlist.length > 0;
  compareSummary.textContent = generateComparisonSummary(shortlist, latestThesis);
}

function generatePitchDeck(list, thesis) {
  if (!list.length) {
    deckPreview.innerHTML = '<p class="empty">Deck cannot be generated until at least one parcel is shortlisted.</p>';
    return;
  }
  const slides = [
    ["Title slide", `Parcel Intelligence acquisition pitch: ${thesis.targetUse} in ${thesis.location}`],
    ["Investment thesis", thesis.generatedSearchSummary],
    ["Market/search criteria", `Radius ${thesis.radiusMiles || "any"} mi - Acres ${thesis.acreageMin || "any"}-${thesis.acreageMax || "any"} - Budget ceiling ${money(thesis.budgetMax, "not set")}`],
    ["Shortlist summary", generateComparisonSummary(list, thesis)],
    ["Opportunity map placeholder", "Map preview coming soon; integrate GIS layer in the next release."],
    ...list.map((opportunity, index) => [`Opportunity ${index + 1}`, `${opportunity.title} - Fit ${opportunity.overallFitScore}/100 - Risk ${opportunity.developmentRisk}`]),
    ["Risk matrix", "Primary risks: zoning uncertainty, utility tie-in cost, floodplain, entitlement complexity."],
    ["Financial assumptions placeholder", "IRR model, capex assumptions, and hold/sell scenarios coming soon."],
    ["Recommended next steps", "Validate title/zoning, request utility letters, site visit, broker interviews, and investment committee memo."],
  ];
  deckPreview.innerHTML = slides.map(([title, body]) => `<article class="slide"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`).join("");
}

async function executeSearch() {
  activate("processing");
  latestThesis = generateInvestmentThesis();
  thesisBlock.textContent = `Thesis: ${latestThesis.generatedSearchSummary}`;
  processingText.textContent = "Building thesis object, checking source coverage, and scoring opportunities...";
  await wait(300);

  const source = document.getElementById("source").value;
  const selectedSources = source === "all" ? SOURCES : SOURCES.filter((item) => item.includes(source));
  const clause = selectedSources.map((item) => `site:${item}`).join(" OR ");
  const query = `land for sale ${latestThesis.location} ${latestThesis.targetUse} ${clause}`;
  let rows = [];

  try {
    const proxy = `https://r.jina.ai/http://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const text = await fetch(proxy, { cache: "no-store" }).then((response) => response.text());
    rows = parseJina(text);
  } catch {
    rows = [];
  }

  if (!rows.length) {
    processingText.textContent = "Live source coverage is sparse. Loading known inventory and marking links for manual verification.";
    await wait(200);
    rows = await fallbackRows();
  }

  const normalized = await Promise.all(rows.slice(0, 30).map(async (row) => {
    const opportunity = normalizeOpportunity(row, latestThesis);
    opportunity.sourceStatus = await validateSource(opportunity.sourceUrl);
    if (opportunity.sourceStatus === "manual verification needed" && opportunity.dataConfidence === "medium") opportunity.dataConfidence = "medium";
    return opportunity;
  }));

  latestResults = normalized.sort((a, b) => b.overallFitScore - a.overallFitScore);
  resultsEl.replaceChildren();
  latestResults.forEach((opportunity) => resultsEl.appendChild(createCard(opportunity)));
  resultsEmpty.hidden = latestResults.length > 0;
  summary.textContent = latestResults.length
    ? `Found ${latestResults.length} normalized opportunities. Source status is explicit so weak or missing links do not masquerade as evidence.`
    : "No opportunities found. Broaden geography, budget, acreage, or source coverage.";
  aiNoteEl.textContent = "Guided workflow: deterministic scoring is active. Live AI enrichment can plug into this same card schema later without changing the user experience.";
  renderMetrics(latestResults);
  renderShortlist();
  generatePitchDeck(shortlist, latestThesis);
  activate("results");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await executeSearch();
});
document.getElementById("refresh-btn").addEventListener("click", executeSearch);
document.getElementById("generate-deck").addEventListener("click", () => generatePitchDeck(shortlist, latestThesis));
resultsEl.addEventListener("click", (event) => {
  const target = event.target instanceof HTMLElement ? event.target : null;
  const id = target?.dataset?.save || target?.dataset?.compare;
  if (!id) return;
  const pick = latestResults.find((result) => result.id === id);
  if (!pick) return;
  if (!shortlist.some((item) => item.id === id)) shortlist.push(pick);
  renderMetrics(latestResults);
  renderShortlist();
});
