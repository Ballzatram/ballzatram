(() => {
  const TOURNAMENT_KEY = "pd-tournament-v3";

  const benchmarkStrategies = [
    {
      id: "always-cooperate",
      name: "Always Cooperate",
      move: () => "C",
    },
    {
      id: "always-defect",
      name: "Always Defect",
      move: () => "D",
    },
    {
      id: "tit-for-tat",
      name: "Tit for Tat",
      move: (history) => history.length ? history[history.length - 1].ai : "C",
    },
    {
      id: "grim-trigger",
      name: "Grim Trigger",
      move: (history) => history.some((round) => round.ai === "D") ? "D" : "C",
    },
    {
      id: "pavlov",
      name: "Pavlov / Win-Stay",
      move: (history) => {
        if (!history.length) return "C";
        const last = history[history.length - 1];
        const payoff = PAYOFFS[`${last.user}${last.ai}`][0];
        return payoff >= 3 ? last.user : last.user === "C" ? "D" : "C";
      },
    },
  ];

  function mulberry32(seed) {
    let value = seed >>> 0 || 1;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function playMatch(strategy, agent, rounds, discount, seed) {
    const history = [];
    let userValue = 0;
    let agentValue = 0;
    let mutual = 0;
    let userExploits = 0;
    let agentExploits = 0;
    const oldRandom = Math.random;
    Math.random = mulberry32(seed);
    try {
      for (let round = 0; round < rounds; round += 1) {
        const user = strategy.move(history);
        const ai = agent.move([...history]);
        const [userPayoff, aiPayoff] = PAYOFFS[`${user}${ai}`];
        const weight = Math.pow(discount, round);
        userValue += userPayoff * weight;
        agentValue += aiPayoff * weight;
        if (user === "C" && ai === "C") mutual += 1;
        if (user === "D" && ai === "C") userExploits += 1;
        if (user === "C" && ai === "D") agentExploits += 1;
        history.push({ user, ai, userPayoff, aiPayoff });
      }
    } finally {
      Math.random = oldRandom;
    }
    return { userValue, agentValue, mutual, userExploits, agentExploits };
  }

  function runTournament() {
    const seed = Number(document.getElementById("tournamentSeedV3")?.value || localStorage.getItem("pd-seed-v3") || 424242) >>> 0;
    const rounds = Math.max(4, Math.min(30, Number(document.getElementById("tournamentRoundsV3")?.value || state.maxRounds || 12)));
    const discount = Math.max(0, Math.min(1, Number(document.getElementById("tournamentDiscountV3")?.value || state.discount || 0.82)));

    const rows = benchmarkStrategies.map((strategy, strategyIndex) => {
      const aggregate = { value: 0, opponentValue: 0, mutual: 0, exploits: 0, exploited: 0, matches: 0 };
      AGENTS.forEach((agent, agentIndex) => {
        const result = playMatch(strategy, agent, rounds, discount, seed + strategyIndex * 1009 + agentIndex * 7919);
        aggregate.value += result.userValue;
        aggregate.opponentValue += result.agentValue;
        aggregate.mutual += result.mutual;
        aggregate.exploits += result.userExploits;
        aggregate.exploited += result.agentExploits;
        aggregate.matches += 1;
      });
      const possibleRounds = rounds * aggregate.matches;
      return {
        id: strategy.id,
        name: strategy.name,
        avgValue: aggregate.value / aggregate.matches,
        avgOpponentValue: aggregate.opponentValue / aggregate.matches,
        cooperationRate: possibleRounds ? aggregate.mutual / possibleRounds : 0,
        exploitGap: aggregate.exploits - aggregate.exploited,
      };
    }).sort((a, b) => b.avgValue - a.avgValue);

    const opponentRows = AGENTS.map((agent, agentIndex) => {
      let value = 0;
      let opponentValue = 0;
      benchmarkStrategies.forEach((strategy, strategyIndex) => {
        const result = playMatch(strategy, agent, rounds, discount, seed + 500000 + agentIndex * 7919 + strategyIndex * 1009);
        value += result.agentValue;
        opponentValue += result.userValue;
      });
      return { name: agent.name, avgValue: value / benchmarkStrategies.length, avgOpponentValue: opponentValue / benchmarkStrategies.length };
    }).sort((a, b) => b.avgValue - a.avgValue);

    const winner = rows[0];
    const tier = rounds >= 20 && discount >= 0.75 ? "gold" : rounds >= 12 ? "silver" : "bronze";
    const achievements = [
      "Tournament Analyst",
      ...(winner.cooperationRate >= 0.6 ? ["Cooperation Architect"] : []),
      ...(winner.exploitGap >= 0 ? ["Exploit Resistant"] : []),
      ...(tier === "gold" ? ["Long-Horizon Strategist"] : []),
    ];

    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify({ at: new Date().toISOString(), seed, rounds, discount, winner: winner.name, tier, rows }));
    if (window.BallzatramEconProgress) {
      window.BallzatramEconProgress.record("prisoners-dilemma-arena", {
        completed: true,
        countAttempt: false,
        score: winner.avgValue,
        outcome: `Tournament: ${winner.name} won · ${tier.toUpperCase()}`,
        concepts: ["repeated games", "strategy tournaments", "cooperation", "retaliation", "continuation value", "exploitability"],
        achievements,
        masteryTier: tier,
        mastery: { tournamentWinner: winner.name, tournamentRounds: rounds, tournamentDiscount: discount, tournamentSeed: seed },
      });
    }

    renderResults(rows, opponentRows, { seed, rounds, discount, winner, tier, achievements });
  }

  function renderResults(rows, opponents, meta) {
    const output = document.getElementById("tournamentResultsV3");
    if (!output) return;
    output.innerHTML = `
      <div class="panel-heading"><p class="kicker">Tournament result</p><h2>${meta.tier.toUpperCase()} mastery · ${meta.winner.name}</h2></div>
      <p class="matrix-note">Seed ${meta.seed} · ${meta.rounds} rounds per matchup · δ=${meta.discount.toFixed(2)}. Each benchmark strategy played every existing opponent archetype under identical settings.</p>
      <div style="overflow-x:auto;margin-top:1rem"><table style="width:100%;border-collapse:collapse;font-size:.85rem"><thead><tr><th style="text-align:left;padding:.5rem">Rank</th><th style="text-align:left;padding:.5rem">Strategy</th><th style="text-align:right;padding:.5rem">Disc. value</th><th style="text-align:right;padding:.5rem">Mutual coop</th><th style="text-align:right;padding:.5rem">Exploit gap</th></tr></thead><tbody>${rows.map((row,index)=>`<tr><td style="padding:.5rem">${index+1}</td><td style="padding:.5rem"><strong>${row.name}</strong></td><td style="padding:.5rem;text-align:right">${row.avgValue.toFixed(2)}</td><td style="padding:.5rem;text-align:right">${Math.round(row.cooperationRate*100)}%</td><td style="padding:.5rem;text-align:right">${row.exploitGap>=0?"+":""}${row.exploitGap}</td></tr>`).join("")}</tbody></table></div>
      <div class="insight-stack" style="margin-top:1rem"><article><h3>Opponent power ranking</h3><p>${opponents.map((row,index)=>`${index+1}. ${row.name} (${row.avgValue.toFixed(1)})`).join(" · ")}</p></article><article><h3>Achievements</h3><p>${meta.achievements.join(" · ")}</p></article><article><h3>Interpretation</h3><p>A strategy can win through cooperation, exploitation, or resilience depending on δ and the opponent mix. Change the seed, horizon, or continuation value and compare how the ranking changes.</p></article></div>`;
  }

  function ensureTournamentPanel() {
    if (document.getElementById("pdTournamentV3")) return;
    const lab = document.querySelector(".lab-grid");
    if (!lab) return;
    const panel = document.createElement("article");
    panel.id = "pdTournamentV3";
    panel.className = "feedback-panel";
    panel.style.gridColumn = "1 / -1";
    const seed = Number(localStorage.getItem("pd-seed-v3") || 424242) >>> 0;
    panel.innerHTML = `
      <div class="panel-heading"><p class="kicker">Axelrod-style gauntlet</p><h2>Strategy Tournament</h2></div>
      <p>Run five benchmark strategies against every existing opponent archetype. All stochastic play is seeded so rankings are reproducible.</p>
      <div style="display:grid;gap:.75rem;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:1rem">
        <label>Seed<input id="tournamentSeedV3" type="number" min="1" value="${seed}" /></label>
        <label>Rounds<input id="tournamentRoundsV3" type="number" min="4" max="30" value="${state.maxRounds}" /></label>
        <label>Continuation δ<input id="tournamentDiscountV3" type="number" min="0" max="1" step="0.01" value="${state.discount}" /></label>
        <button id="runTournamentV3" type="button">Run tournament</button>
      </div>`;
    const results = document.createElement("article");
    results.id = "tournamentResultsV3";
    results.className = "feedback-panel";
    results.style.gridColumn = "1 / -1";
    results.innerHTML = `<div class="panel-heading"><p class="kicker">Tournament result</p><h2>Awaiting simulation</h2></div><p>Run the gauntlet to rank strategies by discounted value, cooperation, and exploitability.</p>`;
    lab.append(panel, results);
    document.getElementById("runTournamentV3")?.addEventListener("click", runTournament);
  }

  ensureTournamentPanel();
})();
