const STORAGE_KEY = "ballzatram:portfolio-pages-last-run:v1";
let holdings = [
  { symbol: "QQQ", weight: 45 },
  { symbol: "TLT", weight: 35 },
  { symbol: "GLD", weight: 20 }
];
let sourceMode = "csv";

const $ = (id) => document.getElementById(id);
const pct = (value, digits = 1) => value == null || !Number.isFinite(value) ? "—" : `${(value * 100).toFixed(digits)}%`;
const num = (value, digits = 2) => value == null || !Number.isFinite(value) ? "—" : Number(value).toFixed(digits);

function renderHoldings() {
  $("holdingsList").innerHTML = holdings.map((holding, index) => `
    <div class="holding-row" data-index="${index}">
      <input data-field="symbol" value="${escapeAttr(holding.symbol)}" aria-label="Holding symbol ${index + 1}" />
      <input data-field="weight" type="number" min="0.01" step="0.01" value="${holding.weight}" aria-label="Holding weight ${index + 1}" />
      <button data-remove aria-label="Remove ${escapeAttr(holding.symbol)}">×</button>
    </div>`).join("");
  $("holdingsList").querySelectorAll(".holding-row").forEach((row) => {
    const index = Number(row.dataset.index);
    row.querySelector("[data-field='symbol']").addEventListener("input", (event) => { holdings[index].symbol = event.target.value.trim().toUpperCase(); invalidateResult(); });
    row.querySelector("[data-field='weight']").addEventListener("input", (event) => { holdings[index].weight = Number(event.target.value); invalidateResult(); });
    row.querySelector("[data-remove]").addEventListener("click", () => { if (holdings.length > 1) { holdings.splice(index, 1); renderHoldings(); invalidateResult(); } });
  });
}

function escapeAttr(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

function normalizeHoldings() {
  const cleaned = holdings.map((holding) => ({ symbol: holding.symbol.trim().toUpperCase(), weight: Number(holding.weight) }));
  if (cleaned.some((holding) => !holding.symbol || !Number.isFinite(holding.weight) || holding.weight <= 0)) throw new Error("Each holding needs a symbol and a positive weight.");
  const symbols = cleaned.map((holding) => holding.symbol);
  if (new Set(symbols).size !== symbols.length) throw new Error("Holding symbols must be unique.");
  const total = cleaned.reduce((sum, holding) => sum + holding.weight, 0);
  return cleaned.map((holding) => ({ ...holding, normalizedWeight: holding.weight / total }));
}

function parseCsv(text) {
  // Never silently bridge malformed observations: that creates fictional returns.
  if (typeof text !== "string" || text.length > 2_000_000) {
    throw new Error("Please use a price CSV smaller than 2 MB.");
  }
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 4) throw new Error("CSV needs a header and at least three price rows.");
  if (lines.length > 5001) throw new Error("Please use at most 5,000 price observations.");
  const parseLine = (line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
  const headers = parseLine(lines[0]).map((header) => header.trim());
  if (headers.length < 2 || headers.length > 50 || headers[0].toLowerCase() !== "date") {
    throw new Error("The first CSV column must be date, followed by up to 49 price columns.");
  }
  if (headers.some((header) => !header)) throw new Error("Every CSV column needs a name.");
  if (new Set(headers.map((header) => header.toUpperCase())).size !== headers.length) {
    throw new Error("CSV column names must be unique.");
  }
  let previousTime = -Infinity;
  const rows = lines.slice(1).map((line, index) => {
    const values = parseLine(line);
    const rowNumber = index + 2;
    if (values.length !== headers.length) {
      throw new Error("CSV row " + rowNumber + " has " + values.length + " columns; expected " + headers.length + ".");
    }
    const date = values[0];
    const timestamp = Date.parse(date + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(timestamp) ||
        new Date(timestamp).toISOString().slice(0, 10) !== date) {
      throw new Error("CSV row " + rowNumber + " needs a real date in YYYY-MM-DD format.");
    }
    if (timestamp <= previousTime) {
      throw new Error("Price dates must be strictly increasing without duplicates (row " + rowNumber + ").");
    }
    previousTime = timestamp;
    const row = Object.assign(Object.create(null), { date });
    headers.slice(1).forEach((header, column) => {
      const price = values[column + 1];
      row[header.toUpperCase()] = price === "" ? NaN : Number(price);
    });
    return row;
  });
  return { headers: headers.map((header) => header.toUpperCase()), rows };
}

function validateSeries(parsed, normalizedHoldings, benchmark) {
  const needed = normalizedHoldings.map((holding) => holding.symbol);
  const missing = needed.filter((symbol) => !parsed.headers.includes(symbol));
  if (missing.length) throw new Error("CSV is missing price columns: " + missing.join(", ") + ".");
  if (parsed.rows.length < 3) throw new Error("Need at least three valid price observations.");
  const bad = parsed.rows.find((row) => needed.some((symbol) => !Number.isFinite(row[symbol]) || row[symbol] <= 0));
  if (bad) {
    const symbols = needed.filter((symbol) => !Number.isFinite(bad[symbol]) || bad[symbol] <= 0);
    throw new Error("Missing or nonpositive price on " + bad.date + " for " + symbols.join(", ") + ". Correct the CSV; rows are never silently dropped.");
  }
  const benchmarkAvailable = Boolean(benchmark && parsed.headers.includes(benchmark) &&
    parsed.rows.every((row) => Number.isFinite(row[benchmark]) && row[benchmark] > 0));
  return { rows: parsed.rows, benchmarkAvailable };
}

function annualizationInfo(rows) {
  const days = (Date.parse(rows[rows.length - 1].date + "T00:00:00Z") -
    Date.parse(rows[0].date + "T00:00:00Z")) / 86_400_000;
  const intervals = rows.length - 1;
  const periods = intervals * 365.2425 / days;
  let largestGap = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const current = Date.parse(rows[i].date + "T00:00:00Z");
    const prior = Date.parse(rows[i - 1].date + "T00:00:00Z");
    largestGap = Math.max(largestGap, (current - prior) / 86_400_000);
  }
  return { periods, largestGap, intervals, calendarDays: days };
}

function priceReturns(rows, symbol) {
  const returns = [];
  for (let i = 1; i < rows.length; i += 1) returns.push(rows[i][symbol] / rows[i - 1][symbol] - 1);
  return returns;
}

function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length; }
function variance(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}
function covariance(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aa = a.slice(0, n); const bb = b.slice(0, n);
  const ma = mean(aa); const mb = mean(bb);
  return aa.reduce((sum, value, index) => sum + (value - ma) * (bb[index] - mb), 0) / (n - 1);
}
function stddev(values) { return Math.sqrt(Math.max(0, variance(values))); }
function cumulativeReturn(returns) { return returns.reduce((wealth, value) => wealth * (1 + value), 1) - 1; }
function annualizedGeometric(cumulative, periods, periodsPerYear) {
  if (!periods || 1 + cumulative <= 0) return null;
  return (1 + cumulative) ** (periodsPerYear / periods) - 1;
}
function maxDrawdown(returns) {
  let wealth = 1; let peak = 1; let worst = 0;
  returns.forEach((value) => { wealth *= 1 + value; peak = Math.max(peak, wealth); worst = Math.min(worst, wealth / peak - 1); });
  return worst;
}
function correlation(a, b) {
  const denom = stddev(a) * stddev(b);
  return denom ? covariance(a, b) / denom : null;
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function analyze(parsed) {
  const normalizedHoldings = normalizeHoldings();
  const benchmark = $("benchmarkInput").value.trim().toUpperCase();
  const validated = validateSeries(parsed, normalizedHoldings, benchmark);
  const rows = validated.rows;
  const frequency = annualizationInfo(rows);
  const series = normalizedHoldings.map((holding) => priceReturns(rows, holding.symbol));
  const n = series[0].length;
  const weights = normalizedHoldings.map((holding) => holding.normalizedWeight);
  const portfolioReturns = Array.from({ length: n }, (_, day) => series.reduce((sum, returns, index) => sum + returns[day] * weights[index], 0));

  const covarianceMatrix = series.map((left) => series.map((right) => covariance(left, right) * frequency.periods));
  const marginal = multiplyMatrixVector(covarianceMatrix, weights);
  const rawRisk = weights.map((weight, index) => weight * marginal[index]);
  const totalRisk = rawRisk.reduce((sum, value) => sum + value, 0);
  const riskContributions = rawRisk.map((value) => totalRisk ? value / totalRisk : 0);

  const correlations = series.map((left) => series.map((right) => correlation(left, right)));
  const cumulative = cumulativeReturn(portfolioReturns);
  const annualizedReturn = annualizedGeometric(cumulative, n, frequency.periods);
  const annualizedVolatility = Math.sqrt(Math.max(0, weights.reduce((sum, weight, i) => sum + weight * marginal[i], 0)));

  let benchmarkReturns = null; let benchmarkCumulative = null; let beta = null; let benchmarkCorrelation = null;
  if (validated.benchmarkAvailable) {
    benchmarkReturns = priceReturns(rows, benchmark);
    benchmarkCumulative = cumulativeReturn(benchmarkReturns);
    const benchmarkVariance = variance(benchmarkReturns);
    beta = benchmarkVariance ? covariance(portfolioReturns, benchmarkReturns) / benchmarkVariance : null;
    benchmarkCorrelation = correlation(portfolioReturns, benchmarkReturns);
  }

  const holdingStats = normalizedHoldings.map((holding, index) => ({
    symbol: holding.symbol,
    requestedWeight: holding.weight,
    normalizedWeight: holding.normalizedWeight,
    cumulativeReturn: cumulativeReturn(series[index]),
    annualizedVolatility: stddev(series[index]) * Math.sqrt(frequency.periods),
    riskContribution: riskContributions[index]
  }));

  const result = {
    savedAt: new Date().toISOString(),
    sourceMode,
    request: { holdings: normalizedHoldings.map(({ symbol, weight }) => ({ symbol, weight })), benchmark: benchmark || null },
    metrics: {
      cumulativeReturn: cumulative,
      annualizedReturn,
      annualizedVolatility,
      maxDrawdown: maxDrawdown(portfolioReturns),
      betaVsBenchmark: beta,
      correlationVsBenchmark: benchmarkCorrelation,
      benchmarkCumulativeReturn: benchmarkCumulative,
      topHoldingWeight: Math.max(...weights),
      effectivePositions: 1 / weights.reduce((sum, weight) => sum + weight ** 2, 0)
    },
    holdings: holdingStats,
    correlationMatrix: { columns: normalizedHoldings.map((holding) => holding.symbol), matrix: correlations },
    observations: n,
    annualizationPeriods: frequency.periods,
    startDate: rows[0].date,
    endDate: rows[rows.length - 1].date,
    benchmarkAvailable: validated.benchmarkAvailable,
    warnings: [
      sourceMode === "demo" ? "Demo price history is synthetic and only illustrates the analytics workflow." : "Price history was supplied locally by the user and is not independently verified by Ballzatram.",
      "All risk and return statistics are historical/descriptive and are not forecasts or investment advice.",
      validated.benchmarkAvailable ? `Benchmark statistics use the ${benchmark} CSV column.` : (benchmark ? `Benchmark ${benchmark} was not available as a complete CSV price column, so beta/correlation were omitted.` : "No benchmark was requested."),
      "Annualization infers " + frequency.periods.toFixed(1) + " return intervals per calendar year from the supplied dates, rather than assuming daily prices.",
      "Portfolio returns assume constant weights reset at each observation and exclude transaction costs, taxes and dividends not reflected in prices.",
      ...(n < 30 ? ["Only " + n + " returns are available; annualized estimates are particularly unstable."] : []),
      ...(frequency.largestGap > 7 ? ["Largest observed gap is " + frequency.largestGap + " days. Check the input cadence before interpreting annualized risk."] : [])
    ]
  };

  const saved = BallzatramStorage.write(STORAGE_KEY, result);
  renderResult(result, saved);
}

function renderResult(result, saved) {
  $("emptyState").hidden = true; $("resultsContent").hidden = false;
  $("sourceBadge").textContent = result.sourceMode === "demo" ? "Synthetic demo data" : "Local CSV";
  $("windowBadge").textContent = `${result.startDate} → ${result.endDate}`;
  $("cumReturn").textContent = pct(result.metrics.cumulativeReturn);
  $("annReturn").textContent = pct(result.metrics.annualizedReturn);
  $("volatility").textContent = pct(result.metrics.annualizedVolatility);
  $("drawdown").textContent = pct(result.metrics.maxDrawdown);
  $("beta").textContent = num(result.metrics.betaVsBenchmark, 3);
  $("correlation").textContent = num(result.metrics.correlationVsBenchmark, 3);
  $("topHolding").textContent = pct(result.metrics.topHoldingWeight);
  $("effectivePositions").textContent = num(result.metrics.effectivePositions, 1);
  $("benchmarkReturn").textContent = pct(result.metrics.benchmarkCumulativeReturn);
  $("observations").textContent = result.observations;
  $("startDate").textContent = result.startDate;
  $("endDate").textContent = result.endDate;
  $("holdingRows").innerHTML = result.holdings.map((holding) => `<tr><td><strong>${escapeAttr(holding.symbol)}</strong></td><td>${pct(holding.normalizedWeight)}</td><td>${pct(holding.cumulativeReturn)}</td><td>${pct(holding.annualizedVolatility)}</td><td>${pct(holding.riskContribution)}</td></tr>`).join("");
  const cols = result.correlationMatrix.columns;
  $("correlationTable").innerHTML = `<thead><tr><th></th>${cols.map((col) => `<th>${escapeAttr(col)}</th>`).join("")}</tr></thead><tbody>${cols.map((rowName, i) => `<tr><th>${escapeAttr(rowName)}</th>${result.correlationMatrix.matrix[i].map((value) => `<td>${num(value, 2)}</td>`).join("")}</tr>`).join("")}</tbody>`;
  $("warnings").innerHTML = result.warnings.map((warning) => `• ${escapeAttr(warning)}`).join("<br>");
  $("inputStatus").textContent = `Analyzed ${result.observations} return intervals. ${saved ? "Saved locally for Reports." : "Storage is unavailable; this run is not saved."}`;
}

function invalidateResult() {
  if (!$("resultsContent").hidden) {
    $("resultsContent").hidden = true;
    $("emptyState").hidden = false;
    $("emptyState").textContent = "Inputs changed. Run Analyze again before using these results. A previous completed run may still be saved in Reports.";
  }
}

function makeDemoCsv(days = 260) {
  const headers = ["date", "QQQ", "TLT", "GLD", "SPY"];
  const prices = { QQQ: 450, TLT: 92, GLD: 190, SPY: 520 };
  const rows = [headers.join(",")];
  const start = new Date("2025-08-01T00:00:00Z");
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start); date.setUTCDate(start.getUTCDate() + i);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
    const cycle = Math.sin(i / 13) * 0.0018 + Math.cos(i / 29) * 0.0012;
    prices.QQQ *= 1 + 0.00055 + cycle + Math.sin(i * 1.7) * 0.0026;
    prices.TLT *= 1 + 0.00008 - cycle * 0.65 + Math.cos(i * 1.1) * 0.0013;
    prices.GLD *= 1 + 0.0003 + Math.sin(i / 17) * 0.0012 + Math.cos(i * 0.8) * 0.001;
    prices.SPY *= 1 + 0.00042 + cycle * 0.72 + Math.sin(i * 1.35) * 0.0019;
    rows.push([date.toISOString().slice(0, 10), prices.QQQ, prices.TLT, prices.GLD, prices.SPY].map((value, index) => index ? Number(value).toFixed(3) : value).join(","));
  }
  return rows.join("\n");
}

$("addHolding").addEventListener("click", () => { holdings.push({ symbol: "", weight: 10 }); renderHoldings(); invalidateResult(); });
$("fileInput").addEventListener("change", async (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  if (file.size > 2_000_000) { $("inputStatus").textContent = "File exceeds the 2 MB limit."; invalidateResult(); return; }
  $("csvInput").value = await file.text(); sourceMode = "csv"; invalidateResult(); $("inputStatus").textContent = `Loaded ${file.name} locally.`;
});
$("csvInput").addEventListener("input", () => { sourceMode = "csv"; invalidateResult(); });
$("benchmarkInput").addEventListener("input", invalidateResult);
$("demoButton").addEventListener("click", () => { $("csvInput").value = makeDemoCsv(); sourceMode = "demo"; invalidateResult(); $("inputStatus").textContent = "Loaded deterministic synthetic demo price history."; });
$("analyzeButton").addEventListener("click", () => {
  try { analyze(parseCsv($("csvInput").value)); }
  catch (error) { invalidateResult(); $("inputStatus").textContent = error instanceof Error ? error.message : "Portfolio analysis failed."; }
});

renderHoldings();
