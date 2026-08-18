(() => {
  const DIFFICULTY_KEY = "centralBankMasteryDifficultyV3";
  const PROGRESS_KEY = "ballzatram:econ-progress:v1";
  const thresholds = { bronze: 55, silver: 62, gold: 70 };
  const tierRank = { bronze: 1, silver: 2, gold: 3 };
  let difficulty = localStorage.getItem(DIFFICULTY_KEY) || "bronze";
  let actionMix = {};
  let endingRecorded = false;

  function recordProgress(update) {
    let store;
    try { store = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null"); } catch { store = null; }
    if (!store || store.version !== 1 || typeof store.games !== "object") store = { version: 1, games: {} };
    const gameId = "central-bank-simulator";
    const previous = store.games[gameId];
    const score = Number.isFinite(update.score) ? Number(update.score) : undefined;
    const achievements = Array.from(new Set([...(previous?.achievements || []), ...(update.achievements || [])]));
    const concepts = Array.from(new Set([...(previous?.concepts || []), ...(update.concepts || [])]));
    const masteryTier = update.masteryTier && (!previous?.masteryTier || tierRank[update.masteryTier] > tierRank[previous.masteryTier]) ? update.masteryTier : previous?.masteryTier;
    store.games[gameId] = {
      status: update.completed || previous?.status === "completed" ? "completed" : "attempted",
      attempts: (previous?.attempts || 0) + (update.countAttempt === false ? 0 : 1),
      completions: (previous?.completions || 0) + (update.completed ? 1 : 0),
      bestScore: score == null ? previous?.bestScore : Math.max(previous?.bestScore ?? score, score),
      lastScore: score ?? previous?.lastScore,
      lastOutcome: update.outcome ?? previous?.lastOutcome,
      concepts,
      achievements,
      masteryTier,
      mastery: { ...(previous?.mastery || {}), ...(update.mastery || {}) },
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("ballzatram:econ-progress", { detail: store }));
  }

  const baseResetMetrics = resetMetrics;
  resetMetrics = function masteryResetMetrics() {
    baseResetMetrics();
    const modifiers = difficulty === "gold"
      ? { inflation: 1.5, unemployment: 0.8, gdpGrowth: -0.6, confidence: -10, bankStability: -10, volatility: 12, politicalPressure: 10 }
      : difficulty === "silver"
        ? { inflation: 0.8, unemployment: 0.3, gdpGrowth: -0.2, confidence: -5, bankStability: -5, volatility: 6, politicalPressure: 5 }
        : {};
    applyDelta(modifiers);
    clampMetrics();
  };

  const baseApplyScenarioShock = applyScenarioShock;
  applyScenarioShock = function masteryScenarioShock() {
    baseApplyScenarioShock();
    const multiplier = difficulty === "gold" ? 0.22 : difficulty === "silver" ? 0.10 : 0;
    if (multiplier > 0) applyDelta(scenarios[state.scenarioIndex].shock, multiplier);
    clampMetrics();
  };

  function injectDifficultyPicker() {
    const setup = document.getElementById("setupPanel");
    if (!setup || document.getElementById("masteryDifficultyV3")) return;
    const anchor = document.getElementById("campaignPickerV3") || setup.querySelector(".mode-grid");
    const wrapper = document.createElement("div");
    wrapper.id = "masteryDifficultyV3";
    wrapper.innerHTML = `
      <div style="margin-top:1.25rem">
        <p class="eyebrow">Mastery difficulty</p>
        <h3 style="margin:.35rem 0 .65rem">How hostile is the starting economy?</h3>
        <div class="mode-grid" role="radiogroup" aria-label="Mastery difficulty">
          ${[
            ["bronze","Bronze","Baseline economy. Finish a full term with score 55+."],
            ["silver","Silver","Hotter inflation, weaker confidence/banks, stronger shocks. Score 62+."],
            ["gold","Gold","Stagflation/financial stress from day one and amplified shocks. Soft Landing + score 70+."],
          ].map(([id,label,copy])=>`<button type="button" class="mode-card ${difficulty===id?"active":""}" data-mastery-difficulty="${id}" aria-pressed="${difficulty===id}"><strong>${label}</strong><span>${copy}</span></button>`).join("")}
        </div>
      </div>`;
    anchor?.after(wrapper);
    wrapper.querySelectorAll("[data-mastery-difficulty]").forEach((button) => button.addEventListener("click", () => {
      difficulty = button.dataset.masteryDifficulty;
      localStorage.setItem(DIFFICULTY_KEY, difficulty);
      wrapper.querySelectorAll("[data-mastery-difficulty]").forEach((candidate) => {
        const active = candidate.dataset.masteryDifficulty === difficulty;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
    }));
  }

  function endingAchievements(title) {
    const m = state.metrics;
    const totalActions = Object.values(actionMix).reduce((sum, count) => sum + count, 0);
    const achievements = [];
    if (title === "Soft Landing") achievements.push("Soft Landing Architect");
    if (m.inflation >= 1.3 && m.inflation <= 3.0) achievements.push("Price Stability");
    if (m.unemployment <= 5.5 && m.gdpGrowth >= 1) achievements.push("Full Employment Steward");
    if (m.politicalPressure <= 35) achievements.push("Independence Keeper");
    if (m.bankStability >= 70) achievements.push("Bank Guardian");
    if ((actionMix["Hold rates steady"] || 0) + (actionMix["Forward guidance / calming speech"] || 0) >= 4) achievements.push("Patient Policymaker");
    if (localStorage.getItem("centralBankCampaignV3") === "crisis" && state.quarter >= MAX_QUARTERS) achievements.push("Crisis Deck Survivor");
    if (difficulty === "gold" && title === "Soft Landing") achievements.push("Gold Chair");
    if (totalActions <= MAX_QUARTERS) achievements.push("One Tool At A Time");
    return achievements;
  }

  function recordEnding() {
    if (endingRecorded) return;
    endingRecorded = true;
    const title = document.getElementById("endingTitle")?.textContent || "Completed term";
    const score = calculateScore();
    const fullTerm = state.quarter >= MAX_QUARTERS;
    const masterySuccess = fullTerm && score >= thresholds[difficulty] && (difficulty !== "gold" || title === "Soft Landing");
    const achievements = endingAchievements(title);
    recordProgress({
      completed: fullTerm,
      countAttempt: false,
      score,
      outcome: `${title} · ${difficulty.toUpperCase()} ${masterySuccess ? "mastered" : "attempted"}`,
      concepts: ["inflation targeting","policy lags","credibility","financial stability","central bank independence"],
      achievements,
      masteryTier: masterySuccess ? difficulty : undefined,
      mastery: { difficulty, ending: title, finalInflation: Number(state.metrics.inflation.toFixed(1)), finalUnemployment: Number(state.metrics.unemployment.toFixed(1)), finalBankStability: Math.round(state.metrics.bankStability) },
    });

    let card = document.getElementById("centralBankMasteryResultV3");
    if (!card) {
      card = document.createElement("div");
      card.id = "centralBankMasteryResultV3";
      card.className = "ending-debrief";
      document.querySelector(".ending-card .action-row")?.before(card);
    }
    card.innerHTML = `<h3>Mastery result</h3><p><strong>${difficulty.toUpperCase()}</strong> · score ${score}/${thresholds[difficulty]} required · ${masterySuccess ? "MASTERED" : "not mastered"}</p><p>${fullTerm ? "Full term completed." : `Term ended early in Q${state.quarter}.`} ${difficulty === "gold" ? "Gold also requires a Soft Landing." : ""}</p><p>Achievements: ${achievements.join(" · ") || "None this run"}</p>`;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".action-button");
    if (!button) return;
    const name = button.querySelector("strong")?.textContent || "Unknown action";
    actionMix[name] = (actionMix[name] || 0) + 1;
  });
  document.getElementById("startGame")?.addEventListener("click", () => { actionMix = {}; endingRecorded = false; recordProgress({ outcome: `${difficulty.toUpperCase()} term started`, concepts: ["inflation targeting","policy lags"], countAttempt: true }); });
  document.getElementById("playAgain")?.addEventListener("click", () => { actionMix = {}; endingRecorded = false; });

  const modal = document.getElementById("endingModal");
  if (modal) new MutationObserver(() => {
    if (!modal.classList.contains("hidden")) recordEnding();
    else endingRecorded = false;
  }).observe(modal, { attributes: true, attributeFilter: ["class"] });

  injectDifficultyPicker();
})();
