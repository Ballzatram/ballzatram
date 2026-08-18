(() => {
  // Phase 1 enhancement layer for Central Banker. This intentionally reuses the
  // deterministic economy in central-bank.js instead of forking the simulation.
  const RUNS_KEY = "centralBankRecentRunsV3";
  const CAMPAIGN_KEY = "centralBankCampaignV3";
  const MAX_SAVED_RUNS = 5;
  const canonicalScenarioOrder = scenarios.map((scenario) => scenario.title);
  let campaign = localStorage.getItem(CAMPAIGN_KEY) || "guided";
  let actionMix = {};
  let endingObserved = false;

  function fallbackCoach(scenario) {
    return {
      objective: `Diagnose the dominant risk in ${scenario.title} before reaching for a blunt policy tool.`,
      watch: "Inflation, unemployment, growth, bank stability, volatility, confidence, and political pressure.",
      success: "Use the narrowest policy tool that addresses the dominant risk, then allow lagged effects to arrive."
    };
  }

  // Fix the known title mismatch and make all future scenario additions safe.
  if (scenarioCoaches["Soup-Price Jump Scare"] && !scenarioCoaches["Soup Price Meteor"]) {
    scenarioCoaches["Soup Price Meteor"] = scenarioCoaches["Soup-Price Jump Scare"];
  }
  scenarios.forEach((scenario) => {
    if (!scenarioCoaches[scenario.title]) scenarioCoaches[scenario.title] = fallbackCoach(scenario);
  });

  function shuffle(values) {
    const output = [...values];
    for (let i = output.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [output[i], output[j]] = [output[j], output[i]];
    }
    return output;
  }

  function restoreCanonicalScenarios() {
    const lookup = new Map(scenarios.map((scenario) => [scenario.title, scenario]));
    scenarios.splice(0, scenarios.length, ...canonicalScenarioOrder.map((title) => lookup.get(title)).filter(Boolean));
  }

  function prepareCampaign() {
    restoreCanonicalScenarios();
    if (campaign === "crisis") {
      const shuffled = shuffle(scenarios);
      scenarios.splice(0, scenarios.length, ...shuffled);
    }
    actionMix = {};
    localStorage.setItem(CAMPAIGN_KEY, campaign);
  }

  function getRuns() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RUNS_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRun() {
    const title = document.getElementById("endingTitle")?.textContent || "Completed term";
    const scoreMatch = document.getElementById("endingScore")?.textContent?.match(/Final score:\s*(\d+)/i);
    const finalScore = scoreMatch ? Number(scoreMatch[1]) : calculateScore();
    const run = {
      at: new Date().toISOString(),
      campaign,
      mode: state.mode,
      ending: title,
      score: finalScore,
      inflation: Number(state.metrics.inflation.toFixed(1)),
      unemployment: Number(state.metrics.unemployment.toFixed(1)),
      growth: Number(state.metrics.gdpGrowth.toFixed(1)),
      bankStability: Math.round(state.metrics.bankStability),
      actionMix: { ...actionMix }
    };
    const runs = [run, ...getRuns()].slice(0, MAX_SAVED_RUNS);
    localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    renderRunComparison(run, runs[1]);
  }

  function renderRunComparison(current, previous) {
    let card = document.getElementById("runComparisonV3");
    if (!card) {
      card = document.createElement("div");
      card.id = "runComparisonV3";
      card.className = "ending-debrief";
      document.querySelector(".ending-card .action-row")?.before(card);
    }
    const delta = previous ? current.score - previous.score : null;
    const topActions = Object.entries(current.actionMix)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => `${name} ×${count}`)
      .join(" · ") || "No policy actions recorded";
    card.innerHTML = `
      <h3>Run comparison</h3>
      <p><strong>${current.campaign === "crisis" ? "Shuffled crisis deck" : "Guided curriculum"}</strong> · ${current.mode} mode · ${current.ending}</p>
      <p>Score ${current.score}${delta == null ? " · first recorded V3 run" : ` · ${delta >= 0 ? "+" : ""}${delta} vs previous run`}</p>
      <p>Final: inflation ${current.inflation}% · unemployment ${current.unemployment}% · GDP ${current.growth}% · bank stability ${current.bankStability}/100</p>
      <p>Policy mix: ${topActions}</p>
    `;
  }

  function renderRecentRunPreview() {
    const latest = getRuns()[0];
    let preview = document.getElementById("recentRunPreviewV3");
    if (!preview) {
      preview = document.createElement("div");
      preview.id = "recentRunPreviewV3";
      preview.className = "mode-details";
      document.getElementById("startGame")?.before(preview);
    }
    preview.textContent = latest
      ? `Last run: ${latest.ending} · score ${latest.score} · ${latest.campaign === "crisis" ? "shuffled crisis" : "guided"} · ${latest.mode} mode.`
      : "No V3 term recorded yet. Finish a run to unlock comparison notes.";
  }

  function injectCampaignPicker() {
    const setup = document.getElementById("setupPanel");
    const modeGrid = setup?.querySelector(".mode-grid");
    if (!setup || !modeGrid || document.getElementById("campaignPickerV3")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "campaignPickerV3";
    wrapper.innerHTML = `
      <div style="margin-top:1.25rem">
        <p class="eyebrow">Run structure</p>
        <h3 style="margin:.35rem 0 .65rem">Choose the crisis deck</h3>
        <div class="mode-grid" role="radiogroup" aria-label="Campaign structure">
          <button type="button" class="mode-card ${campaign === "guided" ? "active" : ""}" data-campaign="guided" aria-pressed="${campaign === "guided"}">
            <strong>Guided Curriculum</strong><span>Fixed sequence designed to teach the policy toolkit progressively.</span>
          </button>
          <button type="button" class="mode-card ${campaign === "crisis" ? "active" : ""}" data-campaign="crisis" aria-pressed="${campaign === "crisis"}">
            <strong>Shuffled Crisis Deck</strong><span>Same economics, unpredictable order. Diagnose before acting.</span>
          </button>
        </div>
      </div>`;
    modeGrid.after(wrapper);

    wrapper.querySelectorAll("[data-campaign]").forEach((button) => {
      button.addEventListener("click", () => {
        campaign = button.dataset.campaign;
        wrapper.querySelectorAll("[data-campaign]").forEach((candidate) => {
          const active = candidate.dataset.campaign === campaign;
          candidate.classList.toggle("active", active);
          candidate.setAttribute("aria-pressed", String(active));
        });
      });
    });
  }

  // Capture runs before the original start handler consumes scenario 0.
  document.getElementById("startGame")?.addEventListener("click", prepareCampaign, true);
  document.getElementById("playAgain")?.addEventListener("click", prepareCampaign, true);
  document.getElementById("restartGame")?.addEventListener("click", () => { actionMix = {}; }, true);

  // Count actual policy choices without touching the deterministic action engine.
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.(".action-button");
    if (!button) return;
    const name = button.querySelector("strong")?.textContent || "Unknown action";
    actionMix[name] = (actionMix[name] || 0) + 1;
  });

  const modal = document.getElementById("endingModal");
  if (modal) {
    new MutationObserver(() => {
      const visible = !modal.classList.contains("hidden");
      if (visible && !endingObserved) {
        endingObserved = true;
        saveRun();
      }
      if (!visible) endingObserved = false;
    }).observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  injectCampaignPicker();
  renderRecentRunPreview();
})();
