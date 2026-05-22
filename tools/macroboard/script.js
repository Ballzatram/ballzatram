// Browser-delivered files must not include private provider keys. Use the FastAPI MacroBoard backend for live FRED data.
const FRED_API_KEY = "";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const workflows = {
  dashboard: {
    label: "Dashboard",
    title: "Portfolio cockpit",
    description: "A guided macro + portfolio command center that turns holdings into allocation, risk, macro, and learning prompts.",
    chartTitle: "Portfolio proxy return, CPI, and policy rate",
    metrics: [
      ["Portfolio return", "asset_ret", "Latest monthly portfolio proxy"],
      ["CPI YoY", "cpi_yoy", "Inflation pressure"],
      ["Fed funds", "ffr", "Policy stance"],
      ["Credit spread", "credit_spread", "Risk premium"]
    ],
    chartKeys: ["asset_ret", "cpi_yoy", "ffr"],
    insights: [
      "Start with the data source badge: uploaded holdings and live macro data are more decision-useful than demo data.",
      "Use the concentration, volatility, drawdown, and beta cards as a triage checklist before reviewing single positions.",
      "MacroBoard is an education-first decision assistant: it highlights risks and questions, not personalized investment advice."
    ],
    lessons: ["macro", "risk", "workflow"]
  },
  stock: {
    label: "Stock Analysis",
    title: "Stock analysis",
    description: "Frame portfolio holdings or a single ticker against market beta, inflation, rates, dollar strength, oil, and credit stress.",
    chartTitle: "Portfolio proxy return vs market return",
    metrics: [
      ["Portfolio return", "asset_ret", "Target behavior"],
      ["Market return", "market_ret", "Benchmark move"],
      ["Dollar index", "dxy", "FX headwind"],
      ["Oil", "oil", "Input-cost proxy"]
    ],
    chartKeys: ["asset_ret", "market_ret", "dxy"],
    insights: [
      "Compare portfolio returns with benchmark returns to spot periods where idiosyncratic exposure mattered.",
      "Dollar and oil are directional macro proxies; validate sector and revenue exposure before making conclusions.",
      "Single-stock work should connect valuation, earnings revisions, balance sheet risk, and macro sensitivity."
    ],
    lessons: ["beta", "dollar", "oil"]
  },
  portfolio: {
    label: "Portfolio",
    title: "Portfolio analysis",
    description: "Convert a holdings CSV into a portfolio manager review: concentration, market sensitivity, stress variables, and next actions.",
    chartTitle: "Rates, unemployment, and credit stress",
    metrics: [
      ["Top holding", "top_weight", "Concentration"],
      ["Volatility", "portfolio_vol", "Annualized proxy"],
      ["Max drawdown", "max_drawdown", "Recent stress"],
      ["Beta", "portfolio_beta", "Market sensitivity"]
    ],
    chartKeys: ["unemployment", "ffr", "credit_spread"],
    insights: [
      "Portfolio risk tends to cluster when policy, labor, and credit conditions move together.",
      "If top-weight concentration is high, ask whether position sizing is intentional, accidental, or tax-driven.",
      "A good allocation review separates known exposures, unknown exposures, and specific decisions to revisit."
    ],
    lessons: ["concentration", "drawdown", "beta"]
  },
  scenario: {
    label: "Scenario Lab",
    title: "Scenario lab",
    description: "Prototype macro stress cases and translate them into portfolio questions: rates up, growth down, credit wider, dollar stronger.",
    chartTitle: "Inflation and policy path",
    metrics: [
      ["CPI YoY", "cpi_yoy", "Inflation case"],
      ["Fed funds", "ffr", "Policy case"],
      ["Dollar index", "dxy", "Global liquidity"],
      ["Oil", "oil", "Commodity shock"]
    ],
    chartKeys: ["cpi_yoy", "ffr", "oil"],
    insights: [
      "Start each scenario by naming the shock, transmission channel, exposed holdings, and expected time horizon.",
      "Oil and dollar moves can affect both growth and inflation assumptions, so avoid double counting.",
      "Document upside, baseline, and downside assumptions before comparing model outputs."
    ],
    lessons: ["scenario", "rates", "inflation"]
  },
  events: {
    label: "Event Study",
    title: "Event study",
    description: "Review event-window context and identify whether macro conditions were already changing before a catalyst.",
    chartTitle: "Market and portfolio returns around observations",
    metrics: [
      ["Portfolio return", "asset_ret", "Event-window target"],
      ["Market return", "market_ret", "Control series"],
      ["Credit spread", "credit_spread", "Risk backdrop"],
      ["ISM orders", "ism_new_orders", "Growth backdrop"]
    ],
    chartKeys: ["asset_ret", "market_ret", "credit_spread"],
    insights: [
      "Separate event impact from the macro tape by checking benchmark and credit conditions first.",
      "Use uploaded holdings to identify which tickers deserve a tighter pre/post catalyst review.",
      "Correlation is not causation; event studies are evidence, not proof."
    ],
    lessons: ["event", "credit", "causation"]
  },
  models: {
    label: "Model Compare",
    title: "Model comparison",
    description: "Line up candidate explanatory variables before running deterministic, factor, or statistical model comparisons.",
    chartTitle: "Growth, inflation, and risk variables",
    metrics: [
      ["ISM orders", "ism_new_orders", "Growth feature"],
      ["CPI YoY", "cpi_yoy", "Inflation feature"],
      ["Credit spread", "credit_spread", "Risk feature"],
      ["Dollar index", "dxy", "Liquidity feature"]
    ],
    chartKeys: ["ism_new_orders", "cpi_yoy", "credit_spread"],
    insights: [
      "Prefer simple, documented baselines before adding more complex model families.",
      "Watch for regime shifts: a feature can be useful in one period and misleading in another.",
      "Keep model assumptions visible to avoid false precision."
    ],
    lessons: ["features", "regime", "precision"]
  },
  classroom: {
    label: "Classroom",
    title: "Model classroom",
    description: "Learn what each signal means while you explore your portfolio, from drawdown math to FRED series interpretation.",
    chartTitle: "Teaching view: CPI, rates, and unemployment",
    metrics: [
      ["CPI YoY", "cpi_yoy", "Prices"],
      ["Fed funds", "ffr", "Central bank response"],
      ["Unemployment", "unemployment", "Labor market"],
      ["ISM orders", "ism_new_orders", "Business cycle"]
    ],
    chartKeys: ["cpi_yoy", "ffr", "unemployment"],
    insights: [
      "Macro models are simplified maps; they are most useful when their assumptions are explicit.",
      "Rates, inflation, and labor data often move with lags that a single chart cannot fully capture.",
      "Use the learning cards below to turn every dashboard observation into a testable question."
    ],
    lessons: ["macro", "rates", "labor"]
  },
  reports: {
    label: "Reports",
    title: "Reports",
    description: "Collect source status, model notes, portfolio diagnostics, and recent rows for quick investment memo drafts.",
    chartTitle: "Report snapshot signals",
    metrics: [
      ["Portfolio return", "asset_ret", "Return snapshot"],
      ["CPI YoY", "cpi_yoy", "Inflation snapshot"],
      ["Fed funds", "ffr", "Policy snapshot"],
      ["ISM orders", "ism_new_orders", "Growth snapshot"]
    ],
    chartKeys: ["asset_ret", "cpi_yoy", "ism_new_orders"],
    insights: [
      "Reports should include the date range, data source, and assumptions that shaped the conclusion.",
      "Attach the holdings source and macro source so readers can reproduce your dashboard state.",
      "A good memo separates observed data from analyst interpretation."
    ],
    lessons: ["memo", "source", "workflow"]
  }
};

const learningDatabase = {
  macro: ["Macro pulse", "Inflation, policy rates, labor, credit, dollar, and oil are state variables that influence discount rates, earnings, and risk appetite."],
  risk: ["Risk budget", "Volatility shows typical movement, drawdown shows pain already experienced, and concentration shows how much one name can dominate outcomes."],
  workflow: ["AI workflow", "A durable process is ingest → validate → analyze → question → decide → monitor. MacroBoard mirrors that loop on one screen."],
  beta: ["Beta", "Beta estimates how sensitive a portfolio is to benchmark moves. A beta above 1 usually amplifies market direction."],
  dollar: ["Dollar exposure", "A stronger dollar can pressure foreign earnings translations and global liquidity while helping importers."],
  oil: ["Oil as signal", "Oil can be an inflation input, a growth signal, or a sector-specific revenue driver depending on the holding."],
  concentration: ["Concentration", "High top weights are not automatically bad, but they should be intentional and paired with a reason to own that much."],
  drawdown: ["Drawdown", "Maximum drawdown measures peak-to-trough loss. It helps translate abstract volatility into investor behavior risk."],
  scenario: ["Scenario design", "Name the shock, estimate the transmission channel, list affected holdings, then define what evidence would change your mind."],
  rates: ["Rates", "Higher rates can compress valuation multiples and lift interest income; balance sheet duration determines which effect dominates."],
  inflation: ["Inflation", "Inflation matters through input costs, pricing power, wages, discount rates, and consumer demand."],
  event: ["Event windows", "Compare pre-event and post-event moves against a benchmark to avoid attributing broad market moves to one catalyst."],
  credit: ["Credit spreads", "Wider spreads usually indicate rising default or liquidity stress and can precede equity risk-off periods."],
  causation: ["Causation check", "A chart can suggest relationships. A decision needs mechanism, timing, alternative explanations, and position sizing."],
  features: ["Feature hygiene", "Good model features are available at decision time, economically explainable, and tested across regimes."],
  regime: ["Regimes", "Relationships can change when inflation, policy, or growth regimes change. Avoid over-trusting a single backtest window."],
  precision: ["False precision", "More decimal places do not mean more truth. Prefer ranges, scenarios, and error bars for decisions."],
  labor: ["Labor data", "Unemployment is often lagging, but rapid changes can signal demand weakness or policy stress."],
  memo: ["Investment memo", "A strong memo states thesis, evidence, risks, valuation, catalyst, sizing, time horizon, and kill criteria."],
  source: ["Source audit", "Always record whether data is uploaded, demo, FRED, or public market API so conclusions stay reproducible."]
};

const fallbackCsv = `date,asset_ret,market_ret,cpi_yoy,ffr,unemployment,dxy,oil,credit_spread,ism_new_orders
2021-01-31,0.022,0.018,1.4,0.08,6.3,90.1,52.1,3.8,57.8
2021-02-28,0.011,0.013,1.7,0.08,6.2,90.4,59.0,3.6,60.0
2021-03-31,0.032,0.028,2.6,0.09,6.0,92.3,63.5,3.4,64.1
2021-04-30,0.019,0.015,4.2,0.10,6.1,91.5,61.7,3.2,62.7
2021-05-31,0.006,0.006,5.0,0.10,5.8,89.8,66.3,3.0,63.4
2021-06-30,0.014,0.019,5.4,0.08,5.9,92.4,73.5,2.8,66.0
2021-07-31,-0.004,0.004,5.4,0.10,5.4,92.2,73.9,2.7,64.9
2021-08-31,0.021,0.029,5.3,0.09,5.2,92.7,68.5,2.6,62.0
2021-09-30,-0.030,-0.047,5.4,0.08,4.8,94.2,75.0,2.9,61.1
2021-10-31,0.041,0.069,6.2,0.08,4.5,94.1,83.6,2.7,59.8
2021-11-30,-0.012,-0.008,6.8,0.08,4.2,96.0,66.2,3.1,61.5
2021-12-31,0.028,0.043,7.0,0.08,3.9,95.7,75.2,2.9,62.5`;

const demoPortfolioCsv = `ticker,weight
AAPL,0.22
MSFT,0.20
XLF,0.16
XLE,0.12
TLT,0.20
GLD,0.10`;

const state = {
  rows: [],
  active: "dashboard",
  holdings: [],
  marketData: {},
  portfolioStats: {},
  sourceLabel: "demo"
};

function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift()).map((header) => header.trim().toLowerCase());
  return lines.map((line) => {
    const values = splitCsvLine(line);
    return headers.reduce((row, header, index) => {
      const rawValue = values[index]?.trim() ?? "";
      const numericValue = Number(rawValue.replaceAll("$", "").replaceAll("%", ""));
      row[header] = header === "date" || header === "ticker" || Number.isNaN(numericValue) ? rawValue.toUpperCase() : numericValue;
      return row;
    }, {});
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else current += char;
  }
  values.push(current);
  return values;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[character]));
}

function normalizeHoldings(rows) {
  const prepared = rows
    .map((row) => ({
      ticker: String(row.ticker || row.symbol || "").trim().toUpperCase(),
      weight: Number(row.weight ?? row.allocation ?? 0),
      shares: Number(row.shares ?? row.quantity ?? 0),
      price: Number(row.price ?? row.last ?? row.market_price ?? 0),
      costBasis: Number(row.cost_basis ?? row.cost ?? row.average_cost ?? 0)
    }))
    .filter((row) => row.ticker);

  const valueTotal = prepared.reduce((sum, row) => sum + (row.weight > 0 ? 0 : row.shares * row.price), 0);
  const rawWeightTotal = prepared.reduce((sum, row) => sum + Math.max(row.weight, 0), 0);

  return prepared.map((row) => {
    let weight = row.weight;
    if (!weight && valueTotal > 0) weight = (row.shares * row.price) / valueTotal;
    if (rawWeightTotal > 1.5) weight /= 100;
    return { ...row, weight };
  }).filter((row) => row.weight > 0);
}

function formatValue(key, value) {
  if (!Number.isFinite(value)) return "--";
  if (["asset_ret", "market_ret", "portfolio_vol", "max_drawdown", "top_weight"].includes(key) || key.includes("ret")) return `${(value * 100).toFixed(1)}%`;
  if (["cpi_yoy", "ffr", "unemployment", "credit_spread"].includes(key)) return `${value.toFixed(1)}%`;
  if (["portfolio_beta"].includes(key)) return value.toFixed(2);
  return value.toFixed(1);
}

function metricValue(key) {
  const latest = state.rows.at(-1) ?? {};
  return state.portfolioStats[key] ?? latest[key] ?? 0;
}

function metricTrend(key) {
  if (state.portfolioStats[key] !== undefined) return state.portfolioStats[`${key}_caption`] ?? "Portfolio diagnostic";
  const latest = state.rows.at(-1)?.[key] ?? 0;
  const prior = state.rows.at(-2)?.[key] ?? latest;
  const delta = latest - prior;
  const prefix = delta >= 0 ? "+" : "";
  return `${prefix}${formatValue(key, delta)} vs prior month`;
}

function setActiveWorkflow(id) {
  state.active = workflows[id] ? id : "dashboard";
  window.location.hash = state.active;
  render();
}

function renderNav() {
  const nav = document.querySelector("#workflow-nav");
  nav.innerHTML = Object.entries(workflows).map(([id, workflow]) => (
    `<button type="button" class="${id === state.active ? "active" : ""}" data-workflow="${id}">${workflow.label}</button>`
  )).join("");
  nav.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => setActiveWorkflow(button.dataset.workflow));
  });
}

function renderMetrics(workflow) {
  document.querySelector("#metric-grid").innerHTML = workflow.metrics.map(([label, key, caption]) => `
    <article class="metric-card">
      <div class="metric-label">${escapeHtml(label)}</div>
      <div class="metric-value">${escapeHtml(formatValue(key, metricValue(key)))}</div>
      <div class="metric-caption">${escapeHtml(caption)} - ${escapeHtml(metricTrend(key))}</div>
    </article>
  `).join("");
}

function renderInsights(workflow) {
  document.querySelector("#insight-list").innerHTML = workflow.insights.map((insight) => `<li>${escapeHtml(insight)}</li>`).join("");
}

function renderLessons(workflow) {
  document.querySelector("#lesson-list").innerHTML = workflow.lessons.map((lessonKey) => {
    const [title, body] = learningDatabase[lessonKey];
    return `<article class="lesson-card"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></article>`;
  }).join("");
}

function renderTable() {
  const headers = ["date", "asset_ret", "market_ret", "cpi_yoy", "ffr", "unemployment", "dxy", "oil", "credit_spread", "ism_new_orders"];
  document.querySelector("#table-head").innerHTML = headers.map((header) => `<th>${escapeHtml(header.replaceAll("_", " "))}</th>`).join("");
  document.querySelector("#table-body").innerHTML = state.rows.slice(-8).reverse().map((row) => `
    <tr>${headers.map((header) => `<td>${escapeHtml(header === "date" ? row[header] : formatValue(header, row[header]))}</td>`).join("")}</tr>
  `).join("");
}

function renderPortfolioTable() {
  const headers = ["ticker", "weight", "price", "1m", "vol"];
  document.querySelector("#portfolio-head").innerHTML = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  document.querySelector("#portfolio-body").innerHTML = state.holdings.map((holding) => {
    const data = state.marketData[holding.ticker] ?? {};
    return `<tr>
      <td>${escapeHtml(holding.ticker)}</td>
      <td>${escapeHtml(formatValue("top_weight", holding.weight))}</td>
      <td>${escapeHtml(data.price ? `$${data.price.toFixed(2)}` : "--")}</td>
      <td>${escapeHtml(formatValue("asset_ret", data.monthReturn ?? 0))}</td>
      <td>${escapeHtml(formatValue("portfolio_vol", data.volatility ?? 0))}</td>
    </tr>`;
  }).join("");
  document.querySelector("#portfolio-updated").textContent = `${state.sourceLabel} - ${state.holdings.length} holdings`;
}

function renderDecisionBrief() {
  const stats = state.portfolioStats;
  const topHolding = [...state.holdings].sort((a, b) => b.weight - a.weight)[0];
  const macro = state.rows.at(-1) ?? {};
  const items = [
    `Data check: ${state.sourceLabel} portfolio with ${state.holdings.length} holdings; macro range ${state.rows[0]?.date ?? "--"} to ${state.rows.at(-1)?.date ?? "--"}.`,
    topHolding ? `Sizing question: ${topHolding.ticker} is the largest position at ${formatValue("top_weight", topHolding.weight)}.` : "Sizing question: upload holdings to identify concentration risk.",
    `Risk lens: estimated beta ${formatValue("portfolio_beta", stats.portfolio_beta ?? 0)} and max drawdown ${formatValue("max_drawdown", stats.max_drawdown ?? 0)} from available price history/demo proxy.`,
    `Macro lens: CPI ${formatValue("cpi_yoy", macro.cpi_yoy ?? 0)}, Fed funds ${formatValue("ffr", macro.ffr ?? 0)}, credit spread ${formatValue("credit_spread", macro.credit_spread ?? 0)}.`,
    "Next action: choose a workflow tab, read the teaching cards, and write one decision plus one disconfirming signal."
  ];
  document.querySelector("#decision-brief").innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function scaleSeries(rows, key, height, padding) {
  const values = rows.map((row) => row[key]).filter(Number.isFinite);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (value) => height - padding - ((value - min) / range) * (height - padding * 2);
}

function drawChart(workflow) {
  const canvas = document.querySelector("#macro-chart");
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(640, Math.floor(rect.width * window.devicePixelRatio));
  canvas.height = Math.floor(Math.min(460, Math.max(320, rect.width * 0.46)) * window.devicePixelRatio);

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 52 * window.devicePixelRatio;
  const rows = state.rows;
  const colors = ["#5ef0a5", "#70a7ff", "#ffd166"];

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(238, 251, 243, 0.09)";
  ctx.lineWidth = window.devicePixelRatio;
  for (let i = 0; i <= 5; i += 1) {
    const y = padding + ((height - padding * 2) / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  workflow.chartKeys.forEach((key, seriesIndex) => {
    const yFor = scaleSeries(rows, key, height, padding);
    ctx.beginPath();
    rows.forEach((row, index) => {
      const x = padding + ((width - padding * 2) / (rows.length - 1 || 1)) * index;
      const y = yFor(row[key]);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = colors[seriesIndex];
    ctx.lineWidth = 3 * window.devicePixelRatio;
    ctx.stroke();

    const legendX = padding + seriesIndex * 190 * window.devicePixelRatio;
    ctx.fillStyle = colors[seriesIndex];
    ctx.fillRect(legendX, 20 * window.devicePixelRatio, 12 * window.devicePixelRatio, 12 * window.devicePixelRatio);
    ctx.fillStyle = "#eefbf3";
    ctx.font = `${14 * window.devicePixelRatio}px Inter, sans-serif`;
    ctx.fillText(key.replaceAll("_", " "), legendX + 18 * window.devicePixelRatio, 31 * window.devicePixelRatio);
  });

  ctx.fillStyle = "#9fc2ae";
  ctx.font = `${12 * window.devicePixelRatio}px Inter, sans-serif`;
  ctx.fillText(rows[0]?.date ?? "", padding, height - 16 * window.devicePixelRatio);
  ctx.fillText(rows.at(-1)?.date ?? "", width - padding - 82 * window.devicePixelRatio, height - 16 * window.devicePixelRatio);
}

function calculatePortfolioStats() {
  const topWeight = Math.max(...state.holdings.map((holding) => holding.weight), 0);
  const returnSeries = getPortfolioReturnSeries();
  const marketSeries = state.rows.map((row) => row.market_ret).slice(-returnSeries.length);
  const volatility = standardDeviation(returnSeries) * Math.sqrt(12);
  const beta = covariance(returnSeries, marketSeries) / (variance(marketSeries) || 1);
  const drawdown = calculateMaxDrawdown(returnSeries);
  state.portfolioStats = {
    top_weight: topWeight,
    portfolio_vol: volatility || 0,
    max_drawdown: drawdown || 0,
    portfolio_beta: Number.isFinite(beta) ? beta : 0,
    top_weight_caption: topWeight > 0.25 ? "High concentration" : "Diversified top weight",
    portfolio_vol_caption: volatility > 0.22 ? "Elevated movement" : "Moderate movement",
    max_drawdown_caption: drawdown < -0.12 ? "Stress period visible" : "Limited recent stress",
    portfolio_beta_caption: beta > 1.1 ? "Market amplifier" : "Near/under market beta"
  };

  if (returnSeries.length) {
    const alignedRows = state.rows.slice(-returnSeries.length);
    alignedRows.forEach((row, index) => {
      row.asset_ret = returnSeries[index];
    });
  }
}

function getPortfolioReturnSeries() {
  const series = state.holdings
    .map((holding) => (state.marketData[holding.ticker]?.returns ?? []).map((value) => value * holding.weight));
  const length = Math.min(...series.map((values) => values.length).filter(Boolean), state.rows.length);
  if (!Number.isFinite(length) || length <= 1) return state.rows.map((row) => row.asset_ret);
  return Array.from({ length }, (_, index) => series.reduce((sum, values) => sum + values.at(index - length), 0));
}

function standardDeviation(values) {
  const mean = values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length || 1));
}

function variance(values) {
  return standardDeviation(values) ** 2;
}

function covariance(a, b) {
  const length = Math.min(a.length, b.length);
  const left = a.slice(-length);
  const right = b.slice(-length);
  const leftMean = left.reduce((sum, value) => sum + value, 0) / (length || 1);
  const rightMean = right.reduce((sum, value) => sum + value, 0) / (length || 1);
  return left.reduce((sum, value, index) => sum + (value - leftMean) * (right[index] - rightMean), 0) / (length || 1);
}

function calculateMaxDrawdown(returns) {
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  returns.forEach((monthlyReturn) => {
    equity *= 1 + monthlyReturn;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.min(maxDrawdown, (equity - peak) / peak);
  });
  return maxDrawdown;
}

function render() {
  const workflow = workflows[state.active];
  document.querySelector("#workflow-title").textContent = workflow.title;
  document.querySelector("#workflow-description").textContent = workflow.description;
  document.querySelector("#chart-title").textContent = workflow.chartTitle;
  document.querySelector("#date-range").textContent = `${state.rows[0]?.date ?? ""} -> ${state.rows.at(-1)?.date ?? ""}`;
  renderNav();
  renderMetrics(workflow);
  renderInsights(workflow);
  renderLessons(workflow);
  renderTable();
  renderPortfolioTable();
  renderDecisionBrief();
  drawChart(workflow);
}

async function loadData() {
  const status = document.querySelector("#data-status");
  try {
    const response = await fetch("../../demo_data/macro_timeseries.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("CSV unavailable");
    state.rows = parseCsv(await response.text());
    status.textContent = `${state.rows.length} demo macro rows loaded`;
  } catch (error) {
    state.rows = parseCsv(fallbackCsv);
    status.textContent = `${state.rows.length} fallback macro rows loaded`;
  }
  loadPortfolioFromText(demoPortfolioCsv, "demo");
}

function loadPortfolioFromText(csvText, sourceLabel = "uploaded") {
  state.holdings = normalizeHoldings(parseCsv(csvText));
  state.sourceLabel = sourceLabel;
  seedDemoMarketData();
  calculatePortfolioStats();
  document.querySelector("#portfolio-status").textContent = `${state.holdings.length} ${sourceLabel} holdings loaded`;
  render();
}

function seedDemoMarketData() {
  state.holdings.forEach((holding, index) => {
    if (state.marketData[holding.ticker]) return;
    const returns = state.rows.map((row, rowIndex) => row.market_ret * (0.65 + index * 0.09) + Math.sin(rowIndex + index) * 0.008);
    state.marketData[holding.ticker] = {
      price: holding.price || 50 + index * 23.5,
      monthReturn: returns.at(-1),
      volatility: standardDeviation(returns) * Math.sqrt(12),
      returns
    };
  });
}

async function fetchYahooHistory(ticker) {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 60 * 60 * 24 * 370;
  const response = await fetch(`${YAHOO_CHART_URL}/${encodeURIComponent(ticker)}?period1=${start}&period2=${end}&interval=1mo&events=history`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Market data unavailable for ${ticker}`);
  const payload = await response.json();
  const result = payload.chart?.result?.[0];
  const closes = result?.indicators?.quote?.[0]?.close?.filter(Number.isFinite) ?? [];
  if (closes.length < 2) throw new Error(`Not enough prices for ${ticker}`);
  const returns = closes.slice(1).map((close, index) => (close / closes[index]) - 1);
  return {
    price: closes.at(-1),
    monthReturn: returns.at(-1),
    volatility: standardDeviation(returns) * Math.sqrt(12),
    returns
  };
}

async function refreshMarketData() {
  const status = document.querySelector("#portfolio-status");
  status.textContent = "Pulling public market prices…";
  const results = await Promise.allSettled(state.holdings.map((holding) => fetchYahooHistory(holding.ticker)));
  results.forEach((result, index) => {
    if (result.status === "fulfilled") state.marketData[state.holdings[index].ticker] = result.value;
  });
  const successes = results.filter((result) => result.status === "fulfilled").length;
  calculatePortfolioStats();
  status.textContent = successes ? `${successes}/${state.holdings.length} tickers refreshed from market API` : "Market API blocked; using demo price curves";
  render();
}

async function refreshFredData() {
  const status = document.querySelector("#data-status");
  if (!FRED_API_KEY) {
    status.textContent = "FRED refresh requires a server-side key; keeping local macro data";
    return;
  }
  status.textContent = "Refreshing FRED macro series...";
  const seriesMap = {
    cpi_yoy: ["CPIAUCSL", percentChangeYearOverYear],
    ffr: ["DFF", latestValue],
    unemployment: ["UNRATE", latestValue],
    credit_spread: ["BAMLH0A0HYM2", latestValue]
  };

  const entries = await Promise.allSettled(Object.entries(seriesMap).map(async ([key, [seriesId, transform]]) => {
    const observations = await fetchFredSeries(seriesId);
    return [key, transform(observations)];
  }));

  const latest = state.rows.at(-1);
  let successes = 0;
  entries.forEach((entry) => {
    if (entry.status === "fulfilled" && Number.isFinite(entry.value[1])) {
      latest[entry.value[0]] = entry.value[1];
      successes += 1;
    }
  });
  status.textContent = successes ? `${successes} FRED series refreshed with API key` : "FRED request blocked; keeping local macro data";
  render();
}

async function fetchFredSeries(seriesId) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", FRED_API_KEY);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", "2020-01-01");
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`FRED unavailable for ${seriesId}`);
  const payload = await response.json();
  return payload.observations.map((observation) => ({
    date: observation.date,
    value: Number(observation.value)
  })).filter((observation) => Number.isFinite(observation.value));
}

function latestValue(observations) {
  return observations.at(-1)?.value;
}

function percentChangeYearOverYear(observations) {
  const latest = observations.at(-1)?.value;
  const prior = observations.at(-13)?.value;
  return ((latest / prior) - 1) * 100;
}

function bindEvents() {
  document.querySelector("#portfolio-upload").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadPortfolioFromText(await file.text(), "uploaded");
  });
  document.querySelector("#load-demo").addEventListener("click", () => loadPortfolioFromText(demoPortfolioCsv, "demo"));
  document.querySelector("#refresh-market").addEventListener("click", refreshMarketData);
  document.querySelector("#refresh-fred").addEventListener("click", refreshFredData);
  window.addEventListener("resize", () => drawChart(workflows[state.active]));
}

window.addEventListener("hashchange", () => {
  const next = window.location.hash.replace("#", "");
  if (workflows[next]) {
    state.active = next;
    render();
  }
});

bindEvents();
loadData().then(() => {
  const initial = window.location.hash.replace("#", "");
  state.active = workflows[initial] ? initial : "dashboard";
  render();
});
