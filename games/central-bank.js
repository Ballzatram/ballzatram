const MAX_QUARTERS = 20;
const vars = [
  ["inflation", "Inflation", 2, 0, 15],
  ["unemployment", "Unemployment", 4.8, 1, 20],
  ["gdpGrowth", "GDP Growth", 2.2, -8, 10],
  ["interestRate", "Interest Rate", 3, 0, 12],
  ["confidence", "Consumer Confidence", 58, 0, 100],
  ["currency", "Currency Strength", 52, 0, 100],
  ["debtStress", "Gov Debt Stress", 34, 0, 100],
  ["financialStability", "Financial Stability", 66, 0, 100]
];

const DIFF = {
  easy: { shock: 0.6, lag: 0.5, nonlinear: 0.1, text: "Predictable reactions, smaller shocks, strong hints." },
  normal: { shock: 1, lag: 0.9, nonlinear: 0.25, text: "Delayed effects and sharper inflation-jobs tradeoffs." },
  hard: { shock: 1.35, lag: 1.2, nonlinear: 0.5, text: "Stagflation traps, crisis spirals, and unstable confidence." }
};

const events = [
  { name: "Oil shock", d: { inflation: 1.2, gdpGrowth: -0.8, confidence: -4 } },
  { name: "Tech boom", d: { gdpGrowth: 1.0, unemployment: -0.4, inflation: 0.2 } },
  { name: "Housing bubble", d: { gdpGrowth: 0.6, financialStability: -5, debtStress: 2 } },
  { name: "Banking panic", d: { financialStability: -12, unemployment: 1.0, confidence: -7 } },
  { name: "Crop failure", d: { inflation: 0.9, gdpGrowth: -0.5 } },
  { name: "Foreign capital flight", d: { currency: -9, inflation: 0.7, debtStress: 4 } },
  { name: "Productivity surge", d: { gdpGrowth: 1.1, inflation: -0.4, unemployment: -0.2 } },
  { name: "Political pressure to cut rates", d: { confidence: -2, inflation: 0.4 } }
];

const lessons = [
  "Raising rates can cool inflation, but it may also slow hiring.",
  "QE can support growth, but too much stimulus can weaken currency and raise inflation.",
  "Supply shocks can push prices up even when growth slows.",
  "Expectations matter: belief in inflation can keep inflation sticky.",
  "Financial instability can hit jobs and growth faster than headline inflation suggests."
];

const S = { state: {}, policies: { qe: false, reserve: 0, speech: 0 }, pendingRateEffect: 0, difficulty: "easy" };

const el = (id) => document.getElementById(id);
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function r(min, max) { return min + Math.random() * (max - min); }

function initState() {
  S.state = Object.fromEntries(vars.map(([k, , base]) => [k, base]));
  S.state.quarter = 1;
  S.pendingRateEffect = 0;
  S.policies = { qe: false, reserve: 0, speech: 0 };
}

function pickDifficulty(name) {
  S.difficulty = name;
  document.querySelectorAll(".difficulty-btn").forEach((b) => b.classList.toggle("active", b.dataset.difficulty === name));
  el("difficultyDetails").textContent = DIFF[name].text;
}

function renderDashboard() {
  const box = el("dashboard");
  box.innerHTML = "";
  for (const [k, label, _, min, max] of vars) {
    const v = S.state[k];
    const pct = ((v - min) / (max - min)) * 100;
    box.insertAdjacentHTML("beforeend", `<article class="metric"><p><strong>${label}</strong></p><p>${v.toFixed(2)}</p><div class="bar"><div class="fill" style="width:${clamp(pct,0,100)}%"></div></div></article>`);
  }
  el("quarterLabel").textContent = `Quarter ${S.state.quarter} of ${MAX_QUARTERS}`;
}

function policyFromUI() {
  S.state.interestRate = Number(el("rateControl").value);
}

// Macro model notes:
// 1) Interest rate effect is partially lagged to emulate real-world policy transmission.
// 2) QE and loose reserves stimulate growth and jobs but increase inflation/currency pressure.
// 3) Inflation expectations are proxied by confidence + prior inflation overshoot.
function advanceQuarter() {
  policyFromUI();
  const d = DIFF[S.difficulty];
  const st = S.state;
  const log = [];

  const rateGap = st.interestRate - 2.5;
  const immediateRate = -0.25 * rateGap;
  const lagged = S.pendingRateEffect * d.lag;
  S.pendingRateEffect = immediateRate;

  const qeBoost = S.policies.qe ? 0.7 : -0.1;
  const reserveBoost = S.policies.reserve * 0.4;
  const speechBias = S.policies.speech * 0.25;

  st.gdpGrowth += qeBoost + reserveBoost + lagged + r(-0.25, 0.25) * d.shock;
  st.unemployment += -0.35 * st.gdpGrowth + 0.22 * rateGap + r(-0.2, 0.2) * d.shock;

  const expectations = (st.confidence - 50) / 25 + Math.max(0, st.inflation - 3) * 0.2;
  st.inflation += -0.28 * rateGap + 0.22 * st.gdpGrowth + 0.15 * expectations + speechBias + r(-0.18, 0.18) * d.shock;

  st.currency += 1.8 * rateGap - (S.policies.qe ? 1.6 : 0) + r(-2, 2) * d.shock;
  st.financialStability += -Math.abs(st.gdpGrowth - 2.3) * 0.9 - (S.policies.reserve < 0 ? 1.4 : -0.7) + (S.policies.reserve > 0 ? 1.1 : 0);
  st.debtStress += (st.interestRate > 5 ? 1.6 : -0.5) + (st.gdpGrowth < 1 ? 1.3 : -0.8) + r(-0.6, 0.6) * d.shock;
  st.confidence += 0.7 * st.gdpGrowth - 0.5 * Math.abs(st.inflation - 2) - 0.35 * st.unemployment + r(-1, 1) * d.shock;

  if (Math.random() < (0.35 + d.nonlinear * 0.2)) {
    const ev = events[Math.floor(Math.random() * events.length)];
    for (const k in ev.d) st[k] += ev.d[k] * d.shock;
    log.push(`Event: ${ev.name}`);
  }

  for (const [k, , , min, max] of vars) st[k] = clamp(st[k], min, max);

  const concept = lessons[Math.floor(Math.random() * lessons.length)];
  el("teachingNote").textContent = `${concept} Professor Goblin notes that your ${S.policies.speech === 1 ? "hawkish" : S.policies.speech === -1 ? "dovish" : "neutral"} tone shaped expectations.`;
  log.push(`Policy mix -> Rate ${st.interestRate.toFixed(2)}%, QE ${S.policies.qe ? "On" : "Off"}, Reserves ${S.policies.reserve}, Speech ${S.policies.speech}.`);

  const score = calcScore();
  el("currentScore").textContent = score.toString();
  const best = Math.max(Number(localStorage.getItem("centralBankBest") || 0), score);
  localStorage.setItem("centralBankBest", best);
  el("bestScore").textContent = best.toString();

  const logEl = el("eventLog");
  const item = document.createElement("li");
  item.textContent = `Q${st.quarter}: ${log.join(" ")}`;
  logEl.prepend(item);

  if (st.inflation > 12 || st.unemployment > 16 || st.debtStress > 95 || st.financialStability < 12) {
    alert("Game Over: the economy cracked under pressure.");
    return restartGame();
  }
  if (st.quarter >= MAX_QUARTERS) {
    alert(`You survived 20 quarters. Final score: ${score}`);
    return restartGame();
  }

  st.quarter += 1;
  renderDashboard();
}

function calcScore() {
  const st = S.state;
  const inflationScore = Math.max(0, 100 - Math.abs(st.inflation - 2) * 15);
  const unempScore = Math.max(0, 100 - Math.abs(st.unemployment - 4.5) * 12);
  const growthScore = Math.max(0, 100 - Math.abs(st.gdpGrowth - 2.5) * 16);
  return Math.round((inflationScore + unempScore + growthScore + st.confidence + st.financialStability - st.debtStress) / 5);
}

function restartGame() {
  initState();
  el("eventLog").innerHTML = "";
  el("gamePanel").classList.add("hidden");
  el("setupPanel").classList.remove("hidden");
}

function bind() {
  document.querySelectorAll(".difficulty-btn").forEach((b) => b.addEventListener("click", () => pickDifficulty(b.dataset.difficulty)));
  el("startGame").addEventListener("click", () => {
    initState();
    el("setupPanel").classList.add("hidden");
    el("gamePanel").classList.remove("hidden");
    el("rateControl").value = S.state.interestRate;
    el("rateValue").textContent = S.state.interestRate.toFixed(2);
    renderDashboard();
  });
  el("rateControl").addEventListener("input", (e) => el("rateValue").textContent = Number(e.target.value).toFixed(2));
  el("qeToggle").addEventListener("click", () => {
    S.policies.qe = !S.policies.qe;
    el("qeToggle").textContent = `QE: ${S.policies.qe ? "On" : "Off"}`;
  });

  [["reserveLoosen", -1], ["reserveNeutral", 0], ["reserveTighten", 1]].forEach(([id, v]) => {
    el(id).addEventListener("click", () => {
      S.policies.reserve = v;
      ["reserveLoosen", "reserveNeutral", "reserveTighten"].forEach((x) => el(x).classList.remove("active"));
      el(id).classList.add("active");
    });
  });

  [["speechDovish", -1], ["speechNeutral", 0], ["speechHawkish", 1]].forEach(([id, v]) => {
    el(id).addEventListener("click", () => {
      S.policies.speech = v;
      ["speechDovish", "speechNeutral", "speechHawkish"].forEach((x) => el(x).classList.remove("active"));
      el(id).classList.add("active");
    });
  });

  el("advanceQuarter").addEventListener("click", advanceQuarter);
  el("restartGame").addEventListener("click", restartGame);

  el("bestScore").textContent = localStorage.getItem("centralBankBest") || "0";
  pickDifficulty("easy");
}
bind();
