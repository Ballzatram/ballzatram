const BANKROLL = 500;
const MAX_POSITION_PCT = 0.025;
const MIN_EDGE_POINTS = 6;
const DEFAULT_BACKEND_BASE_URL = "http://127.0.0.1:8787";
const BACKEND_TIMEOUT_MS = 2500;

const weatherForm = document.getElementById("weather-form");
const alertOutput = document.getElementById("alert-output");
const reviewList = document.getElementById("review-list");
const decisionStatus = document.getElementById("decision-status");

const backendRefresh = document.getElementById("backend-refresh");
const backendRunOnce = document.getElementById("backend-run-once");
const backendConnection = document.getElementById("backend-connection");
const backendConsoleStatus = document.getElementById("backend-console-status");
const backendMode = document.getElementById("backend-mode");
const backendNote = document.getElementById("backend-note");
const latestScanTime = document.getElementById("latest-scan-time");
const candidateTradesCount = document.getElementById("candidate-trades-count");
const blockedTradesCount = document.getElementById("blocked-trades-count");
const paperExposureLabel = document.getElementById("paper-exposure-label");
const openPaperTradesLabel = document.getElementById("open-paper-trades-label");
const candidateTradesList = document.getElementById("candidate-trades-list");
const blockedTradesList = document.getElementById("blocked-trades-list");
const recentDecisionsList = document.getElementById("recent-decisions-list");
const liveModeLocked = document.getElementById("live-mode-locked");
const liveLockStatus = document.getElementById("live-lock-status");

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(1, value));
}

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatCents(cents) {
  return currency((Number(cents) || 0) / 100);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function formatDateTime(value) {
  if (!value) return "Not run this session";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function getBackendBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("weatherBackend") || DEFAULT_BACKEND_BASE_URL).replace(/\/$/, "");
}

function renderReviewItems(items) {
  reviewList.replaceChildren();
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    reviewList.appendChild(li);
  });
}

function evaluateWeatherMarket(event) {
  event.preventDefault();

  const marketName = document.getElementById("market-name").value.trim();
  const marketPrice = clampPercent(Number(document.getElementById("market-price").value));
  const fairProbability = clampPercent(Number(document.getElementById("fair-probability").value));
  const haircut = Math.max(0, Number(document.getElementById("confidence-haircut").value) || 0);
  const adjustedFair = clampPercent(fairProbability - haircut);
  const edge = adjustedFair - marketPrice;
  const maxPosition = BANKROLL * MAX_POSITION_PCT;
  const edgeMultiplier = Math.min(1, Math.max(0, edge / 20));
  const paperSize = edge >= MIN_EDGE_POINTS ? maxPosition * edgeMultiplier : 0;
  const status = edge >= MIN_EDGE_POINTS ? "Review paper YES alert" : "No paper alert";

  decisionStatus.textContent = status;
  decisionStatus.className = edge >= MIN_EDGE_POINTS ? "status-positive" : "status-neutral";

  const statusNode = document.createElement("strong");
  statusNode.textContent = status;
  const marketNode = document.createElement("span");
  marketNode.textContent = marketName || "Selected weather market";
  const edgeNode = document.createElement("span");
  edgeNode.textContent = `Market price: ${marketPrice.toFixed(1)}¢ · Risk-adjusted fair: ${adjustedFair.toFixed(1)}% · Edge: ${edge.toFixed(1)} pts`;
  const sizeNode = document.createElement("span");
  sizeNode.textContent = `Suggested paper size: ${currency(paperSize)} of ${currency(BANKROLL)} bankroll`;
  alertOutput.replaceChildren(statusNode, marketNode, edgeNode, sizeNode);

  renderReviewItems([
    "Verify settlement station, data source, timezone, and observation window before trusting the estimate.",
    "Compare at least two independent weather sources when confidence haircut is below five points.",
    edge >= MIN_EDGE_POINTS
      ? "Paper alert qualifies for review; live execution remains blocked on this hosted page."
      : "Edge is below the alert threshold; log the setup but do not paper-enter.",
    "After settlement, record final outcome and calibration error for backtesting.",
  ]);
}

function setBackendConnectionState(state, detail) {
  const labels = {
    connected: "Connected",
    offline: "Offline calculator",
    checking: "Checking…",
    error: "Offline calculator",
  };
  const label = labels[state] || labels.offline;

  if (backendConnection) {
    backendConnection.textContent = label;
    backendConnection.className = state === "connected" ? "status-positive" : "status-neutral";
  }

  if (backendConsoleStatus) {
    backendConsoleStatus.textContent = label;
  }

  if (backendNote) {
    backendNote.textContent = detail || "Optional local backend unavailable. Offline calculator remains fully usable.";
  }
}

async function fetchBackendJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${getBackendBaseUrl()}${path}`, {
      ...options,
      headers: { accept: "application/json", ...(options.headers || {}) },
      credentials: "omit",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Local backend returned HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function checkBackendStatus() {
  setBackendConnectionState("checking", `Checking ${getBackendBaseUrl()}…`);

  try {
    const status = await fetchBackendJson("/api/weather-bot/status");
    renderBackendStatus(status);
    return status;
  } catch (error) {
    setBackendConnectionState("offline", `Local backend not connected (${error.message}). Offline calculator remains active.`);
    renderBackendStatus(null);
    return null;
  }
}

async function runBackendScan() {
  if (backendRunOnce) {
    backendRunOnce.disabled = true;
    backendRunOnce.textContent = "Running Paper Scan…";
  }

  try {
    await checkBackendStatus();
    const result = await fetchBackendJson("/api/weather-bot/run-once", { method: "POST" });
    renderRunOnceResult(result);
  } catch (error) {
    setBackendConnectionState("error", `Paper scan unavailable: ${error.message}. Offline calculator remains active.`);
  } finally {
    if (backendRunOnce) {
      backendRunOnce.disabled = false;
      backendRunOnce.textContent = "Run Paper Scan";
    }
  }
}

function renderBackendStatus(status) {
  if (!status) {
    if (backendMode) backendMode.textContent = "Paper worksheet";
    if (liveModeLocked) liveModeLocked.textContent = "Locked in browser";
    if (liveLockStatus) liveLockStatus.textContent = "Locked";
    return;
  }

  setBackendConnectionState("connected", "Local weather-trader backend connected. Browser remains paper/read-only.");
  if (backendMode) backendMode.textContent = status.mode || "paper";
  const liveLabel = status.liveTradingEnabled ? "Unexpected live flag" : "Locked in browser";
  if (liveModeLocked) liveModeLocked.textContent = liveLabel;
  if (liveLockStatus) liveLockStatus.textContent = status.liveTradingEnabled ? "Blocked by UI" : "Locked";
}

function renderRunOnceResult(result) {
  const decisions = Array.isArray(result.decisions) ? result.decisions : [];
  const candidateTrades = decisions.filter((decision) => decision.action === "PAPER_TRADE");
  const blockedTrades = decisions.filter((decision) => decision.action !== "PAPER_TRADE");
  const exposureCents = candidateTrades.reduce((sum, decision) => sum + (Number(decision.stakeCents) || 0), 0);
  const now = new Date();

  setBackendConnectionState("connected", `Latest local scan fetched ${result.activeMarkets || 0} active markets and ${result.weatherMarkets || 0} weather-like markets.`);

  if (latestScanTime) latestScanTime.textContent = formatDateTime(now.toISOString());
  if (candidateTradesCount) candidateTradesCount.textContent = String(candidateTrades.length);
  if (blockedTradesCount) blockedTradesCount.textContent = String(blockedTrades.length);
  if (paperExposureLabel) paperExposureLabel.textContent = formatCents(exposureCents);
  if (openPaperTradesLabel) openPaperTradesLabel.textContent = String(candidateTrades.length);

  renderDecisionList(candidateTradesList, candidateTrades, "No candidate paper trades from the latest scan.");
  renderDecisionList(blockedTradesList, blockedTrades, "No blocked trades from the latest scan.");
  renderDecisionList(recentDecisionsList, decisions.slice(0, 8), "No recent decisions returned by the backend.");
}

function renderDecisionList(container, decisions, emptyText) {
  if (!container) return;
  container.replaceChildren();

  if (!decisions.length) {
    const empty = document.createElement("p");
    empty.className = "decision-empty";
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  decisions.forEach((decision) => {
    const card = document.createElement("article");
    card.className = `decision-item ${decision.action === "PAPER_TRADE" ? "decision-item-positive" : "decision-item-blocked"}`;

    const heading = document.createElement("strong");
    heading.textContent = `${decision.action || "NO_TRADE"} · ${decision.side || "skip"}`;

    const market = document.createElement("span");
    market.textContent = decision.question || decision.marketId || "Weather market";

    const metrics = document.createElement("span");
    metrics.textContent = `Edge ${formatPercent(Number(decision.edge))} · Confidence ${formatPercent(Number(decision.confidence))} · Size ${formatCents(decision.stakeCents)}`;

    const reason = document.createElement("p");
    reason.textContent = decision.reason || "Decision returned without a reason; treat as blocked.";

    card.append(heading, market, metrics, reason);
    container.appendChild(card);
  });
}

if (weatherForm) {
  document.getElementById("bankroll-label").textContent = currency(BANKROLL);
  document.getElementById("position-label").textContent = currency(BANKROLL * MAX_POSITION_PCT);
  document.getElementById("threshold-label").textContent = `${MIN_EDGE_POINTS.toFixed(1)} pts`;
  weatherForm.addEventListener("submit", evaluateWeatherMarket);
}

if (backendRefresh) {
  backendRefresh.addEventListener("click", checkBackendStatus);
}

if (backendRunOnce) {
  backendRunOnce.addEventListener("click", runBackendScan);
}

checkBackendStatus();
