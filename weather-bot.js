const BANKROLL = 500;
const MAX_POSITION_PCT = 0.025;
const MIN_EDGE_POINTS = 6;

const weatherForm = document.getElementById("weather-form");
const alertOutput = document.getElementById("alert-output");
const reviewList = document.getElementById("review-list");
const decisionStatus = document.getElementById("decision-status");

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(99, Math.max(1, value));
}

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
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

if (weatherForm) {
  document.getElementById("bankroll-label").textContent = currency(BANKROLL);
  document.getElementById("position-label").textContent = currency(BANKROLL * MAX_POSITION_PCT);
  document.getElementById("threshold-label").textContent = `${MIN_EDGE_POINTS.toFixed(1)} pts`;
  weatherForm.addEventListener("submit", evaluateWeatherMarket);
}
