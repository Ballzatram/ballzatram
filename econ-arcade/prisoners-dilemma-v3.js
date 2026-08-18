(() => {
  const SEED_KEY = "pd-seed-v3";
  const PROGRESS_KEY = "ballzatram:econ-progress:v1";
  let seed = Number(localStorage.getItem(SEED_KEY) || 424242) >>> 0;
  let rngState = seed || 1;
  let attemptRecorded = false;
  let completionRecorded = false;

  function recordArcadeProgress(completed, score, outcome) {
    let store;
    try {
      store = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "null");
    } catch {
      store = null;
    }
    if (!store || store.version !== 1 || typeof store.games !== "object") store = { version: 1, games: {} };
    const gameId = "prisoners-dilemma-arena";
    const previous = store.games[gameId];
    const concepts = Array.from(new Set([...(previous?.concepts || []), "repeated games", "cooperation", "retaliation", "continuation value"]));
    store.games[gameId] = {
      status: completed || previous?.status === "completed" ? "completed" : "attempted",
      attempts: (previous?.attempts || 0) + (!attemptRecorded ? 1 : 0),
      completions: (previous?.completions || 0) + (completed ? 1 : 0),
      bestScore: Number.isFinite(score) ? Math.max(previous?.bestScore ?? score, score) : previous?.bestScore,
      lastScore: Number.isFinite(score) ? score : previous?.lastScore,
      lastOutcome: outcome || previous?.lastOutcome,
      concepts,
      achievements: previous?.achievements || [],
      masteryTier: previous?.masteryTier,
      mastery: previous?.mastery || {},
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent("ballzatram:econ-progress", { detail: store }));
    attemptRecorded = true;
  }

  function seededRandom() {
    rngState += 0x6D2B79F5;
    let value = rngState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  Math.random = seededRandom;

  function resetSeed(nextSeed = seed) {
    seed = (Number(nextSeed) || 1) >>> 0;
    rngState = seed;
    localStorage.setItem(SEED_KEY, String(seed));
    completionRecorded = false;
  }

  function discountedTotals() {
    return state.history.reduce((totals, round, index) => {
      const weight = Math.pow(state.discount, index);
      totals.user += round.userPayoff * weight;
      totals.ai += round.aiPayoff * weight;
      return totals;
    }, { user: 0, ai: 0 });
  }

  function strategicMetrics() {
    const history = state.history;
    const mutual = history.filter((round) => round.user === "C" && round.ai === "C").length;
    const userExploits = history.filter((round) => round.user === "D" && round.ai === "C").length;
    const aiExploits = history.filter((round) => round.user === "C" && round.ai === "D").length;
    let retaliation = 0;
    let forgiveness = 0;
    for (let index = 1; index < history.length; index += 1) {
      if (history[index - 1].ai === "D" && history[index].user === "D") retaliation += 1;
      if (history[index - 1].ai === "D" && history[index].user === "C") forgiveness += 1;
    }
    return { mutual, userExploits, aiExploits, retaliation, forgiveness };
  }

  function ensureV3Panel() {
    if (document.getElementById("pdV3Panel")) return;
    const scorePanel = document.querySelector(".score-panel");
    const panel = document.createElement("article");
    panel.id = "pdV3Panel";
    panel.className = "feedback-panel";
    panel.innerHTML = `
      <div class="panel-heading"><p class="kicker">Repeated-game value</p><h2>Continuation economics</h2></div>
      <div class="stat-grid">
        <div><span>Your discounted value</span><strong id="discountedUser">0.00</strong></div>
        <div><span>AI discounted value</span><strong id="discountedAi">0.00</strong></div>
        <div><span>Mutual cooperation</span><strong id="mutualRounds">0</strong></div>
        <div><span>Exploit gap</span><strong id="exploitGap">0</strong></div>
      </div>
      <p id="continuationExplanation" class="matrix-note"></p>
      <div style="margin-top:1rem;display:grid;gap:.5rem;grid-template-columns:1fr auto auto">
        <label style="display:grid;gap:.3rem">Replay seed<input id="seedInputV3" type="number" min="1" value="${seed}" /></label>
        <button id="sameSeedV3" type="button">Replay seed</button>
        <button id="newSeedV3" type="button">New seed</button>
      </div>`;
    scorePanel?.after(panel);

    document.getElementById("sameSeedV3")?.addEventListener("click", () => {
      resetSeed(Number(document.getElementById("seedInputV3").value));
      resetMatch();
      renderV3();
    });
    document.getElementById("newSeedV3")?.addEventListener("click", () => {
      const next = Math.floor((Date.now() % 2147483647) + 1);
      resetSeed(next);
      document.getElementById("seedInputV3").value = String(next);
      resetMatch();
      renderV3();
    });
  }

  function renderV3() {
    ensureV3Panel();
    const discounted = discountedTotals();
    const metrics = strategicMetrics();
    const exploitGap = metrics.userExploits - metrics.aiExploits;
    document.getElementById("discountedUser").textContent = discounted.user.toFixed(2);
    document.getElementById("discountedAi").textContent = discounted.ai.toFixed(2);
    document.getElementById("mutualRounds").textContent = String(metrics.mutual);
    document.getElementById("exploitGap").textContent = `${exploitGap >= 0 ? "+" : ""}${exploitGap}`;
    const horizon = state.discount >= 0.8 ? "long" : state.discount >= 0.5 ? "medium" : "short";
    document.getElementById("continuationExplanation").textContent =
      `δ=${state.discount.toFixed(2)} creates a ${horizon} effective horizon. Later-round payoffs are weighted by δ^t: ` +
      `a payoff in round ${Math.max(2, state.history.length || 2)} is worth ${Math.pow(state.discount, Math.max(1, (state.history.length || 2) - 1)).toFixed(2)} times its immediate value. ` +
      `Retaliations observed: ${metrics.retaliation}; forgiveness moves: ${metrics.forgiveness}.`;

    if (state.history.length > 0 && !attemptRecorded) recordArcadeProgress(false, discounted.user, `Match vs ${state.agent.name}`);
    if (state.history.length >= state.maxRounds && !completionRecorded) {
      completionRecorded = true;
      recordArcadeProgress(true, discounted.user, `Completed vs ${state.agent.name}`);
    }
  }

  [el.cooperateButton, el.defectButton].forEach((button) => button?.addEventListener("click", () => queueMicrotask(renderV3)));
  el.resetButton?.addEventListener("click", () => { resetSeed(seed); queueMicrotask(renderV3); });
  el.agentSelect?.addEventListener("change", () => { resetSeed(seed); queueMicrotask(renderV3); });
  el.roundInput?.addEventListener("change", () => { resetSeed(seed); queueMicrotask(renderV3); });
  el.discountInput?.addEventListener("input", () => queueMicrotask(renderV3));

  resetSeed(seed);
  renderV3();
})();
