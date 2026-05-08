const workflows = {
  dashboard: {
    label: "Dashboard",
    title: "Macro dashboard",
    description: "A quick-read cockpit for market returns, inflation, policy, labor, dollar, energy, credit, and manufacturing signals.",
    chartTitle: "Asset return, CPI, and policy rate",
    metrics: [
      ["Asset return", "asset_ret", "Latest monthly total return"],
      ["CPI YoY", "cpi_yoy", "Inflation pressure"],
      ["Fed funds", "ffr", "Policy stance"],
      ["Credit spread", "credit_spread", "Risk premium"]
    ],
    chartKeys: ["asset_ret", "cpi_yoy", "ffr"],
    insights: [
      "Use this view as the launch checklist before going deeper into single-stock, portfolio, or event workflows.",
      "Credit spreads and ISM new orders are paired as risk appetite and growth pulse proxies.",
      "Demo data loads directly from the repository, with a built-in fallback so the board still populates offline."
    ]
  },
  stock: {
    label: "Stock Analysis",
    title: "Stock analysis",
    description: "Frame a single asset against market beta, inflation, rates, dollar strength, oil, and credit stress.",
    chartTitle: "Asset return vs market return",
    metrics: [
      ["Asset return", "asset_ret", "Target behavior"],
      ["Market return", "market_ret", "Benchmark move"],
      ["Dollar index", "dxy", "FX headwind"],
      ["Oil", "oil", "Input-cost proxy"]
    ],
    chartKeys: ["asset_ret", "market_ret", "dxy"],
    insights: [
      "Compare target returns with market returns to spot benchmark-relative periods worth investigating.",
      "Dollar and oil are directional macro proxies; validate sector exposure before making conclusions.",
      "The static board is intentionally deterministic, so it works from the homepage without a local Next server."
    ]
  },
  portfolio: {
    label: "Portfolio",
    title: "Portfolio analysis",
    description: "Summarize portfolio-sensitive macro regimes and highlight stress variables for allocation reviews.",
    chartTitle: "Rates, unemployment, and credit stress",
    metrics: [
      ["Unemployment", "unemployment", "Labor slack"],
      ["Fed funds", "ffr", "Discount-rate pressure"],
      ["Credit spread", "credit_spread", "Financing stress"],
      ["ISM orders", "ism_new_orders", "Growth impulse"]
    ],
    chartKeys: ["unemployment", "ffr", "credit_spread"],
    insights: [
      "Portfolio risk tends to cluster when policy, labor, and credit conditions move together.",
      "Use the table below to copy recent observations into allocation notes or a model worksheet.",
      "Scenario work should treat these signals as assumptions, not forecasts."
    ]
  },
  scenario: {
    label: "Scenario Lab",
    title: "Scenario lab",
    description: "Prototype macro stress cases and inspect the variables that would define tighter or easier regimes.",
    chartTitle: "Inflation and policy path",
    metrics: [
      ["CPI YoY", "cpi_yoy", "Inflation case"],
      ["Fed funds", "ffr", "Policy case"],
      ["Dollar index", "dxy", "Global liquidity"],
      ["Oil", "oil", "Commodity shock"]
    ],
    chartKeys: ["cpi_yoy", "ffr", "oil"],
    insights: [
      "Start each scenario by naming the macro shock, transmission channel, and expected portfolio sensitivity.",
      "Oil and dollar moves can affect both growth and inflation assumptions, so avoid double counting.",
      "Document upside, baseline, and downside assumptions before comparing model outputs."
    ]
  },
  events: {
    label: "Event Study",
    title: "Event study",
    description: "Review event-window context and identify whether macro conditions were already changing before a catalyst.",
    chartTitle: "Market and asset returns around observations",
    metrics: [
      ["Asset return", "asset_ret", "Event-window target"],
      ["Market return", "market_ret", "Control series"],
      ["Credit spread", "credit_spread", "Risk backdrop"],
      ["ISM orders", "ism_new_orders", "Growth backdrop"]
    ],
    chartKeys: ["asset_ret", "market_ret", "credit_spread"],
    insights: [
      "Separate event impact from the macro tape by checking benchmark and credit conditions first.",
      "The recent-observations table is sorted newest first for fast event-window sampling.",
      "Correlation is not causation; use event studies as evidence, not proof."
    ]
  },
  models: {
    label: "Model Compare",
    title: "Model comparison",
    description: "Line up candidate explanatory variables before running deterministic or statistical model comparisons.",
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
    ]
  },
  classroom: {
    label: "Classroom",
    title: "Model classroom",
    description: "Explain model inputs and economic intuition in a board-friendly teaching view.",
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
      "Use this page to explain why a signal matters before using it in a decision workflow."
    ]
  },
  reports: {
    label: "Reports",
    title: "Reports",
    description: "Collect the latest signals, model notes, and recent rows for quick investment memo drafts.",
    chartTitle: "Report snapshot signals",
    metrics: [
      ["Asset return", "asset_ret", "Return snapshot"],
      ["CPI YoY", "cpi_yoy", "Inflation snapshot"],
      ["Fed funds", "ffr", "Policy snapshot"],
      ["ISM orders", "ism_new_orders", "Growth snapshot"]
    ],
    chartKeys: ["asset_ret", "cpi_yoy", "ism_new_orders"],
    insights: [
      "Reports should include the date range, data source, and assumptions that shaped the conclusion.",
      "Use the download link to attach the raw demo data behind this static workspace.",
      "A good memo separates observed data from analyst interpretation."
    ]
  }
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

const state = { rows: [], active: "dashboard" };

function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    return headers.reduce((row, header, index) => {
      const value = values[index];
      row[header] = header === "date" ? value : Number(value);
      return row;
    }, {});
  });
}

function formatValue(key, value) {
  if (key.includes("ret")) return `${(value * 100).toFixed(1)}%`;
  if (["cpi_yoy", "ffr", "unemployment", "credit_spread"].includes(key)) return `${value.toFixed(1)}%`;
  return value.toFixed(1);
}

function metricTrend(key) {
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
  const latest = state.rows.at(-1) ?? {};
  document.querySelector("#metric-grid").innerHTML = workflow.metrics.map(([label, key, caption]) => `
    <article class="metric-card">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${formatValue(key, latest[key] ?? 0)}</div>
      <div class="metric-caption">${caption} · ${metricTrend(key)}</div>
    </article>
  `).join("");
}

function renderInsights(workflow) {
  document.querySelector("#insight-list").innerHTML = workflow.insights.map((insight) => `<li>${insight}</li>`).join("");
}

function renderTable() {
  const headers = ["date", "asset_ret", "market_ret", "cpi_yoy", "ffr", "unemployment", "dxy", "oil", "credit_spread", "ism_new_orders"];
  document.querySelector("#table-head").innerHTML = headers.map((header) => `<th>${header.replaceAll("_", " ")}</th>`).join("");
  document.querySelector("#table-body").innerHTML = state.rows.slice(-8).reverse().map((row) => `
    <tr>${headers.map((header) => `<td>${header === "date" ? row[header] : formatValue(header, row[header])}</td>`).join("")}</tr>
  `).join("");
}

function scaleSeries(rows, key, height, padding) {
  const values = rows.map((row) => row[key]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (value) => height - padding - ((value - min) / range) * (height - padding * 2);
}

function drawChart(workflow) {
  const canvas = document.querySelector("#macro-chart");
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const padding = 48;
  const rows = state.rows;
  const colors = ["#5ef0a5", "#70a7ff", "#ffd166"];

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(238, 251, 243, 0.09)";
  ctx.lineWidth = 1;
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
    ctx.lineWidth = 3;
    ctx.stroke();

    const legendX = padding + seriesIndex * 180;
    ctx.fillStyle = colors[seriesIndex];
    ctx.fillRect(legendX, 20, 12, 12);
    ctx.fillStyle = "#eefbf3";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText(key.replaceAll("_", " "), legendX + 18, 31);
  });

  ctx.fillStyle = "#9fc2ae";
  ctx.font = "12px Inter, sans-serif";
  ctx.fillText(rows[0]?.date ?? "", padding, height - 16);
  ctx.fillText(rows.at(-1)?.date ?? "", width - padding - 78, height - 16);
}

function render() {
  const workflow = workflows[state.active];
  document.querySelector("#workflow-title").textContent = workflow.title;
  document.querySelector("#workflow-description").textContent = workflow.description;
  document.querySelector("#chart-title").textContent = workflow.chartTitle;
  document.querySelector("#date-range").textContent = `${state.rows[0]?.date ?? ""} → ${state.rows.at(-1)?.date ?? ""}`;
  renderNav();
  renderMetrics(workflow);
  renderInsights(workflow);
  renderTable();
  drawChart(workflow);
}

async function loadData() {
  const status = document.querySelector("#data-status");
  try {
    const response = await fetch("../../demo_data/macro_timeseries.csv", { cache: "no-store" });
    if (!response.ok) throw new Error("CSV unavailable");
    state.rows = parseCsv(await response.text());
    status.textContent = `${state.rows.length} demo rows loaded`;
  } catch (error) {
    state.rows = parseCsv(fallbackCsv);
    status.textContent = `${state.rows.length} fallback rows loaded`;
  }
}

window.addEventListener("hashchange", () => {
  const next = window.location.hash.replace("#", "");
  if (workflows[next]) {
    state.active = next;
    render();
  }
});

loadData().then(() => {
  const initial = window.location.hash.replace("#", "");
  state.active = workflows[initial] ? initial : "dashboard";
  render();
});
