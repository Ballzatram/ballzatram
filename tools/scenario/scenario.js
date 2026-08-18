const FACTORS = [
  { id: "rates", label: "Rates", sensitivity: -0.24, help: "Positive shock = tighter/higher rates." },
  { id: "cpi", label: "Inflation / CPI", sensitivity: -0.11, help: "Positive shock = more inflation pressure." },
  { id: "growth", label: "Growth", sensitivity: 0.19, help: "Positive shock = stronger growth." },
  { id: "oil", label: "Oil", sensitivity: -0.07, help: "Positive shock = higher oil pressure." },
  { id: "credit", label: "Credit stress", sensitivity: -0.21, help: "Positive shock = tighter credit conditions." },
];

const PRESETS = {
  rates: { rates: 0.5, cpi: 0, growth: -0.1, oil: 0, credit: 0.25 },
  inflation: { rates: 0.3, cpi: 0.6, growth: -0.15, oil: 0.15, credit: 0.1 },
  growth: { rates: -0.1, cpi: -0.1, growth: -0.7, oil: -0.1, credit: 0.35 },
  oil: { rates: 0.1, cpi: 0.2, growth: -0.1, oil: 0.8, credit: 0.05 },
  clear: { rates: 0, cpi: 0, growth: 0, oil: 0, credit: 0 },
};

const factorInputs = document.querySelector("#factorInputs");
const stressReturn = document.querySelector("#stressReturn");
const bandLow = document.querySelector("#bandLow");
const bandHigh = document.querySelector("#bandHigh");
const drivers = document.querySelector("#drivers");

function pct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderInputs() {
  factorInputs.innerHTML = FACTORS.map((factor) => `
    <div class="factor-row">
      <label for="factor-${factor.id}">${factor.label}<small style="display:block;font-weight:700;opacity:.7">${factor.help}</small></label>
      <input id="factor-${factor.id}" data-factor="${factor.id}" type="number" min="-5" max="5" step="0.05" value="0" inputmode="decimal">
    </div>
  `).join("");
}

function readShocks() {
  return Object.fromEntries(
    [...document.querySelectorAll("[data-factor]")].map((input) => [input.dataset.factor, Number(input.value)])
  );
}

function setPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  Object.entries(preset).forEach(([factor, value]) => {
    const input = document.querySelector(`[data-factor="${factor}"]`);
    if (input) input.value = String(value);
  });
  if (name !== "clear") runScenario();
  else clearResults();
}

function clearResults() {
  stressReturn.textContent = "—";
  bandLow.textContent = "—";
  bandHigh.textContent = "—";
  drivers.innerHTML = "<p>Choose a preset or enter shocks, then run the scenario.</p>";
}

function runScenario() {
  const shocks = readShocks();
  const invalid = Object.values(shocks).some((value) => !Number.isFinite(value) || value < -5 || value > 5);
  if (invalid) {
    drivers.innerHTML = "<p><strong>Check the inputs:</strong> every shock must be numeric and between -5 and +5.</p>";
    return;
  }

  const contributions = FACTORS.map((factor) => ({
    ...factor,
    shock: shocks[factor.id],
    impact: factor.sensitivity * shocks[factor.id],
  }));
  const total = contributions.reduce((sum, item) => sum + item.impact, 0);

  stressReturn.textContent = pct(total);
  bandLow.textContent = pct(total - 0.03);
  bandHigh.textContent = pct(total + 0.03);

  const maxImpact = Math.max(0.001, ...contributions.map((item) => Math.abs(item.impact)));
  drivers.innerHTML = contributions.map((item) => {
    const width = Math.max(4, Math.round(Math.abs(item.impact) / maxImpact * 100));
    return `<div class="driver"><span>${item.label}</span><span class="driver-bar"><i style="width:${width}%"></i></span><span>${pct(item.impact)}</span></div>`;
  }).join("");

  try {
    localStorage.setItem("ballzatram:scenario-pages-last-run:v1", JSON.stringify({
      savedAt: new Date().toISOString(),
      shocks,
      portfolio_return_shock: total,
      confidence_band: [total - 0.03, total + 0.03],
      factor_contributions: contributions.map(({ id, shock, impact }) => ({ factor: id, shock, impact })),
    }));
  } catch {
    // The tool remains fully usable even when storage is unavailable.
  }
}

renderInputs();
document.querySelectorAll("[data-preset]").forEach((button) => button.addEventListener("click", () => setPreset(button.dataset.preset)));
document.querySelector("#runScenario").addEventListener("click", runScenario);
